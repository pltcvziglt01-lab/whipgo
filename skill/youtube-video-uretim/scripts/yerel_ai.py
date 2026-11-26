#!/usr/bin/env python3
"""YEREL AI — Ollama (localhost:11434) ustunden yerel "zevk/yorum" katmani.

Bagimsiz kutuphane: yalniz stdlib (urllib), requests yok. Ollama kapaliysa her fonksiyon
None doner ve sistem AI'siz calismaya devam eder. Kural bekcisi degildir: konu/ton/his
cikarimi ve oneriler verir, son karar secim motoru (stil_dna) ve kullanicinindir.

Desenler (odysseus incelemesinden fikir olarak alindi, kod kopyasi yok):
- Hakem ayristirici: <think> bloklari silinir, metindeki son gecerli {...} alinir,
  sondaki virgul onarilir, JSON cikmazsa duzyazidan kaba puan yakalanir.
- GPU slot kilidi: tum cagrilar tek siradan gecer (kilit dosyasi, surecler arasi);
  on plan istekleri arka plan toplu islerin onune gecer (oncelik='arka' yol verir).
- Iki orneklemeli juri: kare_juri ayni kareyi 2 kez puanlar (sicaklik 0.2 ve 0.8);
  puanlar ayrisirsa guven 'dusuk' + insan_baksin=True.
- Emin degil -> soru: guven dusukse sonuc None, SON_SORU'da motora/kullaniciya tek
  somut soru birakilir. Model "yaptim/duzelttim" diyemez: oyle anlatan oneri atilir.

Modeller: metin qwen3:8b, gorsel qwen2.5vl:7b. GPU 8 GB: ayni anda tek model VRAM'de
kalir (_tek_model oteki modeli bosaltir); render ile ayni anda degil, sirayla kullan.

CLI:
  py -I scripts/yerel_ai.py durum
  py -I scripts/yerel_ai.py konu-ton --metin "..." | --dosya metin.txt
  py -I scripts/yerel_ai.py sahne --dosya metin.txt [--kelimeler kelimeler.json]
  py -I scripts/yerel_ai.py stil-adi --dosya dna-ozet.json
  py -I scripts/yerel_ai.py kare-juri --resim KARE.jpg --baglam "askeri belgesel"
  py -I scripts/yerel_ai.py kurgu-oneri --rapor KURGU-DENETIM.md [--plan "40 sahne, 3 harita"]
  (toplu iste hepsine --arka: on plandaki cagrilara yol verir)
"""
import argparse
import base64
import contextlib
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request

OLLAMA = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
METIN_MODEL = os.environ.get('YEREL_AI_METIN', 'qwen3:8b')
GORSEL_MODEL = os.environ.get('YEREL_AI_GORSEL', 'qwen2.5vl:7b')
ZAMAN = 120  # sn
SON_SORU = None  # son cagri 'emin degil' ile None dondurduyse motora/kullaniciya soru

# Sozlukler stil_dna.py ile ayni kalmali: once oradan al, olmazsa yedek kopya.
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from stil_dna import HISLER, KONULAR, TON_KELIME
    TONLAR = sorted(TON_KELIME)
except Exception:  # stil_dna tasinmis/bozuksa kutuphane yine calissin
    KONULAR = ['askeri', 'bilim', 'biyografi', 'deniz', 'doga', 'egitim', 'eglence', 'felsefe', 'finans', 'gizem', 'haber', 'korku', 'liste',
               'muhendislik', 'otomotiv', 'oyun', 'saglik', 'seyahat', 'spor', 'suc', 'tarih', 'teknoloji', 'yasam']
    TONLAR = ['ciddi', 'enerjik', 'gizem', 'sakin']
    HISLER = ['belgesel', 'arsiv', 'resmi', 'teknik', 'sinematik', 'karanlik', 'retro', 'neon', 'modern', 'temiz', 'sicak', 'yumusak', 'oyunbaz', 'dinamik']

SAHNE_TURLERI = ['liste', 'zaman', 'karsilastirma', 'grafik', 'bolum', 'degisim', 'harita']
# "yaptim/duzelttim" gibi uygulanmis anlatan oneri metni atilir (oneri her zaman oneridir)
_YAPTIM = re.compile(r'\b(yapt[iı]m|yap[iı]ld[iı]|d[uü]zelt(tim|ildi)|uygula(d[iı]m|nd[iı])|de[gğ]i[sş]tirdim|g[uü]ncelle(dim|ndi)|'
                     r'fixed|applied|updated|changed|i have|i\'ve|already (fixed|done)|is now)\b', re.I)


# ------------------------------------------------------------------ hakem ayristirici
def _dusunce_sil(s):
    """<think>...</think> bloklarini sil; kapanmamis <think> varsa oradan sonrasini at."""
    s = re.sub(r'<think>.*?</think>', ' ', s or '', flags=re.S)
    i = s.find('<think>')
    return s[:i] if i >= 0 else s


def _govdeler(s):
    """metindeki dengeli {...} adaylari (ic iceler disariyla birlikte, soldan saga)"""
    out, yigin = [], []
    for i, c in enumerate(s):
        if c == '{':
            yigin.append(i)
        elif c == '}' and yigin:
            b = yigin.pop()
            if not yigin:
                out.append(s[b:i + 1])
    return out


def _json_ayikla(s, alanlar=()):
    """model metni -> dict | None. Dogrudan parse; olmazsa SON gecerli {...} (beklenen alani
    tasiyan), sondaki virgul onarilir."""
    s = _dusunce_sil(s)
    adaylar = [s.strip()] + _govdeler(s)[::-1]
    for aday in adaylar:
        for t in (aday, re.sub(r',\s*([}\]])', r'\1', aday)):
            try:
                d = json.loads(t)
            except (json.JSONDecodeError, ValueError):
                continue
            if isinstance(d, dict) and (not alanlar or any(a in d for a in alanlar)):
                return d
    return None


# ------------------------------------------------------------------ GPU slot kilidi
_KILIT = os.path.join(tempfile.gettempdir(), 'yerel-ai-gpu.kilit')
_ON_ISARET = _KILIT + '.on'
_BAYAT = 600  # sn: bu yastan eski kilit/isaret terk edilmis sayilir


def _bayatsa_sil(yol):
    try:
        if os.path.exists(yol) and time.time() - os.path.getmtime(yol) > _BAYAT:
            os.remove(yol)
    except OSError:
        pass


@contextlib.contextmanager
def _gpu_kilidi(oncelik='on', bekle=900):
    """Yerel AI cagrilarini tek siraya sokar (8 GB VRAM: ayni anda tek istek).
    oncelik='on': kullanici bekliyor, isaret birakir; 'arka': on plan isareti varken yol verir."""
    aldim = False
    if oncelik == 'on':
        try:
            open(_ON_ISARET, 'w').close()
        except OSError:
            pass
    try:
        bas = time.time()
        while time.time() - bas < bekle:
            _bayatsa_sil(_KILIT)
            _bayatsa_sil(_ON_ISARET)
            if oncelik == 'arka' and os.path.exists(_ON_ISARET):
                time.sleep(1.0)
                continue
            try:
                fd = os.open(_KILIT, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                aldim = True
                break
            except FileExistsError:
                time.sleep(0.5)
        yield  # kilit alinamadiysa da calis (kilitli kalmaktan iyidir)
    finally:
        if aldim:
            try:
                os.remove(_KILIT)
            except OSError:
                pass
        if oncelik == 'on':
            try:
                os.remove(_ON_ISARET)
            except OSError:
                pass


# ------------------------------------------------------------------ Ollama HTTP
def _post(yol, govde, zaman=ZAMAN):
    """POST -> dict | None (Ollama kapali/zaman asimi: sessiz None)"""
    try:
        r = urllib.request.Request(OLLAMA + yol, data=json.dumps(govde).encode('utf-8'),
                                   headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(r, timeout=zaman) as y:
            return json.loads(y.read().decode('utf-8'))
    except (urllib.error.URLError, OSError, TimeoutError, json.JSONDecodeError):
        return None


def hazir():
    """Ollama ayakta mi?"""
    try:
        with urllib.request.urlopen(OLLAMA + '/api/tags', timeout=3) as y:
            return y.status == 200
    except (urllib.error.URLError, OSError, TimeoutError):
        return False


def _yuklu():
    try:
        with urllib.request.urlopen(OLLAMA + '/api/ps', timeout=5) as y:
            return [m.get('name', '') for m in (json.loads(y.read().decode('utf-8')).get('models') or [])]
    except (urllib.error.URLError, OSError, TimeoutError, json.JSONDecodeError):
        return []


def _tek_model(istenen):
    """8 GB VRAM: istenen modelden once digerlerini bosalt (bos prompt + keep_alive 0 = bosaltma)."""
    for m in _yuklu():
        if not m.startswith(istenen.split(':')[0]):
            _post('/api/generate', {'model': m, 'keep_alive': 0}, zaman=30)


def _uret(model, istem, sema, sistem=None, resimler=None, sicaklik=0.2, alanlar=(), kaba=None):
    """1 deneme: /api/generate (stream yok, format=JSON sema) -> dict | None.
    Yanit hakem ayristiricidan gecer; JSON cikmazsa 'kaba' (duzyazi yakalayici) denenir."""
    govde = {'model': model, 'prompt': istem, 'stream': False, 'format': sema, 'keep_alive': '5m',
             'options': {'temperature': sicaklik, 'num_ctx': 8192}}
    if sistem:
        govde['system'] = sistem
    if resimler:
        govde['images'] = resimler
    if 'qwen3' in model:
        govde['think'] = False  # dusunme kipini kapat (JSON cikti icin)
    y = _post('/api/generate', govde)
    if not y or not y.get('response'):
        return None
    d = _json_ayikla(y['response'], alanlar)
    if d is None and kaba:
        d = kaba(_dusunce_sil(y['response']))
    return d


def _sor(model, istem, sema, dogrula, sistem=None, resimler=None, sicakliklar=(0.2, 0.5), kaba=None):
    """Semali uretim + dogrulama; uymayan yanitta 1 kez yeniden dener. -> dict | None"""
    alanlar = tuple((sema.get('properties') or {}).keys())
    for sicaklik in sicakliklar:
        d = _uret(model, istem, sema, sistem=sistem, resimler=resimler, sicaklik=sicaklik, alanlar=alanlar, kaba=kaba)
        if d is not None:
            t = dogrula(d)
            if t is not None:
                return t
    return None


# ------------------------------------------------------------------ konu_ton
_KT_SEMA = {
    'type': 'object',
    'properties': {
        'konu': {'type': 'array', 'maxItems': 3, 'items': {
            'type': 'object',
            'properties': {'ad': {'type': 'string', 'enum': KONULAR}, 'pay': {'type': 'number'}},
            'required': ['ad', 'pay']}},
        'ton': {'type': 'string', 'enum': TONLAR},
        'his': {'type': 'array', 'minItems': 2, 'maxItems': 4, 'items': {'type': 'string', 'enum': HISLER}},
        'guven': {'type': 'number'},
    },
    'required': ['konu', 'ton', 'his', 'guven'],
}

_KT_SISTEM = (
    'Sen YouTube video konseptlerini siniflandiran bir editorsun. Metnin YUZEYINE degil ANLAMINA bak: '
    '"investigative ship stories" denizcilik/gizemdir, finans degil; "paycheck" gecen her sey finans degildir. '
    'konu: en fazla 3 konu, paylar toplami 1. ton: videonun kurgu tonu (ciddi=belgesel/agir, gizem=karanlik/merak, '
    'sakin=yumusak/huzurlu, enerjik=hizli/eglenceli). his: edit dilinin gorsel hissi, 2-4 adet. '
    'guven: 0-1 arasi, metin belirsizse dusuk.')


def _kt_dogrula(d):
    try:
        konu = {x['ad']: float(x['pay']) for x in d.get('konu', []) if x.get('ad') in KONULAR and float(x.get('pay', 0)) > 0}
        if not konu or d.get('ton') not in TONLAR:
            return None
        top = sum(konu.values())
        konu = {k: round(v / top, 3) for k, v in sorted(konu.items(), key=lambda x: -x[1])}
        his = list(dict.fromkeys(h for h in (d.get('his') or []) if h in HISLER))
        return {'konu': konu, 'ton': d['ton'], 'his': his, 'guven': max(0.0, min(1.0, float(d.get('guven', 0.5))))}
    except (TypeError, ValueError, KeyError):
        return None


def konu_ton(metin, oncelik='on'):
    """metin -> {'konu': {ad: pay}, 'ton': str, 'his': [..], 'guven': 0-1} | None (Ollama yok / emin degil).

    guven < 0.5 ise None doner ve SON_SORU'ya motora/kullaniciya sorulacak tek somut soru yazilir:
    motor deterministik yola (kelime yontemi) duser."""
    global SON_SORU
    SON_SORU = None
    if not metin or not hazir():
        return None
    with _gpu_kilidi(oncelik):
        _tek_model(METIN_MODEL)
        istem = f'Su YouTube video konseptini siniflandir:\n\n{metin[:6000]}'
        y = _sor(METIN_MODEL, istem, _KT_SEMA, _kt_dogrula, sistem=_KT_SISTEM)
    if y is None:
        return None
    if y['guven'] < 0.5:
        adaylar = list(y['konu'])[:2] + ['?']
        SON_SORU = f"Konsept belirsiz (guven {y['guven']:.2f}): konu {adaylar[0]} mi, {adaylar[1]} mi? Basligin anlattigi olayi bir cumleyle netlestir."
        return None
    return y


# ------------------------------------------------------------------ sahne_firsatlari
_SF_SEMA = {
    'type': 'object',
    'properties': {'firsatlar': {'type': 'array', 'maxItems': 12, 'items': {
        'type': 'object',
        'properties': {
            'tur': {'type': 'string', 'enum': SAHNE_TURLERI},
            'kanit': {'type': 'string'},
            'veri': {'type': 'object'},
        },
        'required': ['tur', 'kanit', 'veri']}}},
    'required': ['firsatlar'],
}

_SF_SISTEM = (
    'Sen bir kurgu yonetmenisin. Video metnini oku ve gorsel sahneye donusebilecek anlari bul. Turler: '
    'liste (sayilabilir maddeler), zaman (tarih sirasi/kronoloji), karsilastirma (A ile B kiyasi), '
    'grafik (sayisal buyume/dusus), bolum (konu degisimi, yeni perde), degisim (once/sonra), '
    'harita (yer adlari, rota, cografya). Her firsat icin: tur; kanit = metinden BIREBIR kopyalanan cumle '
    '(uydurma, kisaltma); veri = sahneyi kuracak somut degerler (orn. liste maddeleri, yillar ve olaylar, '
    'karsilastirilan iki sey, sayilar, yer adlari). Yalniz metinde gercekten olan verileri yaz.')


def _kelimeleri_oku(d):
    """[{k,bas,son}] | {'kelimeler':[...]} | WhisperX {'segments':[{'words':[...]}]} -> [kelime]"""
    if isinstance(d, dict):
        if 'segments' in d:
            return [w.get('word', '').strip() for s in d['segments'] for w in (s.get('words') or [])]
        d = d.get('kelimeler') or d.get('words') or []
    out = []
    for w in d or []:
        out.append(w if isinstance(w, str) else (w.get('k') or w.get('word') or w.get('text') or ''))
    return out


def _temiz(s):
    return re.sub(r'[^a-z0-9çğıöşüäß]+', '', (s or '').lower())


def _kelime_index(kanit, kelimeler):
    """kanitin ilk 1-4 kelimesini kelime listesinde ara -> indeks | -1"""
    hedef = [t for t in (_temiz(x) for x in (kanit or '').split()) if t][:4]
    if not hedef or not kelimeler:
        return -1
    kel = [_temiz(k) for k in kelimeler]
    for n in (len(hedef), 2, 1):
        if n > len(hedef):
            continue
        for i in range(len(kel) - n + 1):
            if kel[i:i + n] == hedef[:n]:
                return i
    return -1


def sahne_firsatlari(metin, kelimeler=None, oncelik='on'):
    """metin (+ kelime zamanlari) -> [{'tur','kanit','veri','kelime_index'}] | None (Ollama yoksa)

    kelime_index kanit cumlesinin ilk kelimesinin indeksidir (eslesme yoksa -1); zamani
    kelimeler[i]['bas'] verir. Oneri niteligindedir: sahneyi kuran motor dogrular."""
    if not metin or not hazir():
        return None
    with _gpu_kilidi(oncelik):
        _tek_model(METIN_MODEL)
        istem = f'Su video metnindeki sahne firsatlarini bul:\n\n{metin[:12000]}'
        d = _sor(METIN_MODEL, istem, _SF_SEMA, lambda x: x if isinstance(x.get('firsatlar'), list) else None, sistem=_SF_SISTEM)
    if d is None:
        return None
    kel = _kelimeleri_oku(kelimeler)
    out = []
    for f in d['firsatlar']:
        if f.get('tur') in SAHNE_TURLERI and f.get('kanit'):
            out.append({'tur': f['tur'], 'kanit': f['kanit'], 'veri': f.get('veri') or {},
                        'kelime_index': _kelime_index(f['kanit'], kel)})
    return out


# ------------------------------------------------------------------ stil_adi
_SA_SEMA = {
    'type': 'object',
    'properties': {'ad': {'type': 'string'}, 'gerekce': {'type': 'string'}},
    'required': ['ad', 'gerekce'],
}


def stil_adi(dna_ozet, oncelik='on'):
    """DNA ozeti (dict | str) -> {'ad': '2-3 kelimelik Turkce ad', 'gerekce': '1 cumle'} | None"""
    if not dna_ozet or not hazir():
        return None
    ozet = json.dumps(dna_ozet, ensure_ascii=False) if isinstance(dna_ozet, (dict, list)) else str(dna_ozet)
    istem = (f'Su edit stili DNA ozetine 2-3 kelimelik Turkce bir karakter adi ver (orn. "Gece Arsivcisi", '
             f'"Sicak Gazete"), gerekceyi 1 cumleyle yaz. Marka/kanal adi kullanma:\n\n{ozet[:3000]}')

    def dogrula(d):
        ad = (d.get('ad') or '').strip()
        return {'ad': ad, 'gerekce': (d.get('gerekce') or '').strip()} if 1 <= len(ad.split()) <= 4 else None

    with _gpu_kilidi(oncelik):
        _tek_model(METIN_MODEL)
        return _sor(METIN_MODEL, istem, _SA_SEMA, dogrula, sistem='Sen edit stillerine akilda kalici Turkce adlar veren bir sanat yonetmenisin.')


# ------------------------------------------------------------------ kare_juri
_KJ_SEMA = {
    'type': 'object',
    'properties': {
        'puan': {'type': 'integer', 'minimum': 1, 'maximum': 5},
        'sorunlar': {'type': 'array', 'maxItems': 6, 'items': {'type': 'string'}},
        'powerpoint_hissi': {'type': 'boolean'},
        'okunurluk': {'type': 'integer', 'minimum': 1, 'maximum': 5},
    },
    'required': ['puan', 'sorunlar', 'powerpoint_hissi', 'okunurluk'],
}

_KJ_SISTEM = (
    'Sen YouTube kurgu kalitesini degerlendiren bir juri uyesisin. Olcut: video After Effects ile kurulmus '
    'profesyonel bir belgesel gibi mi, yoksa duz bir sunum (PowerPoint) gibi mi? '
    'puan: 1 (kotu) - 5 (yayinlanabilir). powerpoint_hissi: bos duz zemin, ortalanmis tek yazi, slayt maddeleri, '
    'derinliksiz/dokusuz kompozisyon varsa true. okunurluk: yazi boyutu/kontrasti telefonda okunur mu, 1-5. '
    'sorunlar: somut ve kisa (orn. "alt bant yazisi ince", "arka plan bos"). Sorun yoksa bos liste.')


def _kj_dogrula(d):
    try:
        return {'puan': max(1, min(5, int(d['puan']))), 'sorunlar': [str(s)[:200] for s in (d.get('sorunlar') or [])],
                'powerpoint_hissi': bool(d['powerpoint_hissi']), 'okunurluk': max(1, min(5, int(d['okunurluk'])))}
    except (TypeError, ValueError, KeyError):
        return None


def _kj_kaba(s):
    """JSON hic cikmazsa duzyazidan kaba yakalama: 'puan: 3' / 'score 4' gibi."""
    p = re.search(r'(?:puan|score|rating)\D{0,10}([1-5])', s, re.I)
    o = re.search(r'(?:okunurluk|readab\w*)\D{0,10}([1-5])', s, re.I)
    if not p:
        return None
    return {'puan': int(p.group(1)), 'sorunlar': [], 'okunurluk': int(o.group(1)) if o else int(p.group(1)),
            'powerpoint_hissi': bool(re.search(r'powerpoint|slide|slayt', s, re.I))}


def kare_juri(resim_yolu, baglam='', oncelik='on'):
    """kare (jpg/png) -> {'puan','sorunlar','powerpoint_hissi','okunurluk','guven','insan_baksin','puanlar'} | None

    Iki orneklemeli juri: ayni kare sicaklik 0.2 ve 0.8 ile 2 kez puanlanir (sirali; VRAM tek model).
    Puan farki <=1: ortalama, guven 'yuksek'. Ayrisirsa guven 'dusuk' + insan_baksin=True.
    A/B karsilastirmada cagiran taraf jurinin hangi karenin hangisi oldugunu BILMEMESINI saglar
    (baglam'a "A rakip / B bizim" yazma: kor puanlama)."""
    if not resim_yolu or not os.path.isfile(resim_yolu) or not hazir():
        return None
    with open(resim_yolu, 'rb') as f:
        resim = base64.b64encode(f.read()).decode('ascii')
    istem = 'Bu YouTube video karesini degerlendir.' + (f' Baglam: {baglam[:500]}' if baglam else '')
    with _gpu_kilidi(oncelik):
        _tek_model(GORSEL_MODEL)
        a = _sor(GORSEL_MODEL, istem, _KJ_SEMA, _kj_dogrula, sistem=_KJ_SISTEM, resimler=[resim], sicakliklar=(0.2, 0.3), kaba=_kj_kaba)
        b = _sor(GORSEL_MODEL, istem, _KJ_SEMA, _kj_dogrula, sistem=_KJ_SISTEM, resimler=[resim], sicakliklar=(0.8, 0.7), kaba=_kj_kaba)
    if a is None and b is None:
        return None
    if a is None or b is None:
        t = a or b
        return {**t, 'guven': 'dusuk', 'insan_baksin': True, 'puanlar': [t['puan']]}
    sorunlar = list(dict.fromkeys(a['sorunlar'] + b['sorunlar']))[:8]
    if abs(a['puan'] - b['puan']) <= 1:
        return {'puan': round((a['puan'] + b['puan']) / 2), 'sorunlar': sorunlar,
                'powerpoint_hissi': a['powerpoint_hissi'] or b['powerpoint_hissi'],
                'okunurluk': round((a['okunurluk'] + b['okunurluk']) / 2),
                'guven': 'yuksek', 'insan_baksin': False, 'puanlar': [a['puan'], b['puan']]}
    return {'puan': min(a['puan'], b['puan']), 'sorunlar': sorunlar,
            'powerpoint_hissi': a['powerpoint_hissi'] or b['powerpoint_hissi'],
            'okunurluk': min(a['okunurluk'], b['okunurluk']),
            'guven': 'dusuk', 'insan_baksin': True, 'puanlar': [a['puan'], b['puan']]}


def video_juri(video, baglam='', adet=6, cikti=None, oncelik='on'):
    """render edilmis video -> esit aralikli `adet` kare (ilk/son 0,5 sn haric) -> kare_juri (2 orneklemeli) -> ozet | None.
    Kapi DEGILDIR (kusur_kontrol / kalite_kapisi yerine gecmez): izleyici bakisini onceliklendirir. cikti verilirse JURI.md yazar.
    -> {'ortalama','en_dusuk','powerpoint','insan_baksin','kareler':[{t,resim,...kare_juri}]}"""
    import subprocess
    import tempfile
    if not video or not os.path.isfile(video) or not hazir():
        return None
    try:
        sure = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video],
                                    capture_output=True, text=True, timeout=60).stdout.strip())
    except (ValueError, OSError, subprocess.SubprocessError):
        return None
    kl = tempfile.mkdtemp(prefix='juri-')
    kareler = []
    for k in range(adet):
        t = 0.5 + (sure - 1.0) * (k + 0.5) / adet
        y = os.path.join(kl, f'kare-{k + 1:02d}.jpg')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', 'scale=1280:-2', y],
                       capture_output=True, timeout=120)
        if not os.path.isfile(y):
            continue
        j = kare_juri(y, baglam, oncelik=oncelik)
        if j:
            kareler.append({'t': round(t, 1), 'resim': y, **j})
    if not kareler:
        return None
    puan = [x['puan'] for x in kareler]
    oz = {'ortalama': round(sum(puan) / len(puan), 2), 'en_dusuk': min(puan),
          'powerpoint': sum(1 for x in kareler if x.get('powerpoint_hissi')),
          'insan_baksin': [x['t'] for x in kareler if x.get('insan_baksin') or x['puan'] <= 2], 'kareler': kareler}
    if cikti:
        L = [f'# Yerel AI jurisi — {os.path.basename(video)}', '',
             f"Ortalama **{oz['ortalama']}/5** · en dusuk {oz['en_dusuk']} · PowerPoint hissi {oz['powerpoint']}/{len(kareler)} kare"
             f" · insan baksin: {', '.join(f'{t}s' for t in oz['insan_baksin']) or '-'}", '',
             'Kapi degildir; kusur_kontrol / kalite_kapisi kararini degistirmez. Kareler 2 orneklemeli kor puanlandi.', '',
             '| sn | puan | okunurluk | PowerPoint | guven | sorunlar |', '|---|---|---|---|---|---|']
        L += [f"| {x['t']} | {x['puan']} | {x.get('okunurluk', '-')} | {'evet' if x.get('powerpoint_hissi') else '-'} | {x.get('guven', '-')} | "
              f"{'; '.join(x.get('sorunlar') or [])[:160]} |" for x in kareler]
        open(cikti, 'w', encoding='utf-8').write(chr(10).join(L) + chr(10))
    return oz


# ------------------------------------------------------------------ kurgu_onerisi
_KO_SEMA = {
    'type': 'object',
    'properties': {'oneriler': {'type': 'array', 'maxItems': 10, 'items': {
        'type': 'object',
        'properties': {'sorun': {'type': 'string'}, 'oneri': {'type': 'string'}},
        'required': ['sorun', 'oneri']}}},
    'required': ['oneriler'],
}

_KO_SISTEM = (
    'Sen deneyimli bir kurgu danismanisin. Sana bir kurgu denetim raporu ve plan ozeti verilecek. '
    'Rapordaki her onemli soruna SOMUT bir cozum ONER: hangi sahne/saniye, hangi repertuar teknigi '
    '(gecis, kart, harita, grafik, zaman cizelgesi, alt bant...), nasil degisecek. Kod yazma, dosya adi '
    'uydurma, "yaptim/duzelttim" deme — sen yalniz oneri verirsin, uygulayan motor ve kullanicidir. '
    'En onemli 10 oneriyle sinirli kal.')


def kurgu_onerisi(denetim_raporu_md, plan_ozeti='', oncelik='on'):
    """denetim raporu (md metni) + plan ozeti -> [{'sorun','oneri'}] | None. Yalniz oneri; uygulama motorun isi.
    'Yaptim/duzelttim' gibi uygulanmis anlatan maddeler atilir."""
    if not denetim_raporu_md or not hazir():
        return None
    istem = (f'Kurgu denetim raporu:\n\n{denetim_raporu_md[:10000]}\n\n'
             + (f'Plan ozeti: {plan_ozeti[:2000]}\n\n' if plan_ozeti else '')
             + 'Rapordaki sorunlara somut kurgu onerileri ver.')
    with _gpu_kilidi(oncelik):
        _tek_model(METIN_MODEL)
        d = _sor(METIN_MODEL, istem, _KO_SEMA, lambda x: x if isinstance(x.get('oneriler'), list) else None, sistem=_KO_SISTEM)
    if d is None:
        return None
    out = [{'sorun': o.get('sorun', ''), 'oneri': o.get('oneri', '')}
           for o in d['oneriler'] if o.get('oneri') and not _YAPTIM.search(str(o.get('oneri')) + ' ' + str(o.get('sorun')))]
    return out or None


# ------------------------------------------------------------------ profil_taslak
_PT_SEMA = {
    'type': 'object',
    'properties': {
        'nis': {'type': 'string'},
        'ton': {'type': 'string', 'enum': TONLAR},
        'konu': {'type': 'array', 'maxItems': 3, 'items': {'type': 'string', 'enum': KONULAR}},
        'iskelet': {'type': 'array', 'maxItems': 10, 'items': {'type': 'string'}},
        'yuzey': {'type': 'array', 'maxItems': 10, 'items': {'type': 'string'}},
        'teknikler': {'type': 'array', 'maxItems': 12, 'items': {'type': 'string'}},
        'kime_yakin': {'type': 'string'},
        'durustluk': {'type': 'array', 'maxItems': 6, 'items': {'type': 'string'}},
        'guven': {'type': 'number'},
    },
    'required': ['nis', 'ton', 'konu', 'iskelet', 'yuzey', 'teknikler', 'kime_yakin', 'durustluk', 'guven'],
}

_PT_SISTEM = (
    'Sen rakip YouTube kanallarinin edit dilini profilleyen bir analistsin. Sana olcum dosyalari (kanal bilgisi, '
    'ritim analizi, edit dili olcumu) ve kare sayfalarindan gorsel gozlemler verilecek. EDIT-DILI.md taslagi cikar: '
    'nis (1 cumle), ton, konu; iskelet = SAYILARLA calisan yapi (kesim araligi, cekim suresi, kanca kurgusu — yalniz '
    'olcumde GERCEKTEN olan sayilar, uydurma); yuzey = degistirilebilir imza (renk, font, grafik dili); teknikler = '
    'gozlenen somut teknikler (varsa zaman damgasiyla); kime_yakin = benzer kanal/uslup 1 cumle; durustluk = olcumun '
    'zayif yerleri. guven: veriler yetersizse dusuk.')


def _kisalt(yol, n):
    """dosya -> ilk n karakter ('' yoksa). JSON ise anahtar listesi + bastan kesit."""
    try:
        with open(yol, encoding='utf-8', errors='replace') as f:
            s = f.read(n * 4)
    except OSError:
        return ''
    if yol.endswith('.json'):
        try:
            d = json.loads(s) if len(s) < n * 4 else None
            if isinstance(d, dict):
                s = 'anahtarlar: ' + ', '.join(list(d)[:30]) + '\n' + json.dumps(d, ensure_ascii=False)[:n]
        except (json.JSONDecodeError, ValueError):
            pass
    return s[:n]


def profil_taslak(kanal_klasoru, oncelik='on'):
    """kutuphane kanal klasoru -> EDIT-DILI.md TASLAGI (dict + 'taslak_md') | None.

    Olcum dosyalarini (kanal.json, ritim/analiz.md|json, editdili/EDIT-DILI-olcum.md, edit-dili.json ozeti)
    ve kare sayfalarini (ilk30-cekimler.jpg, edit-dili-sayfa.jpg; qwen2.5vl) okur. Gorsel gozlemler
    "gozlem (yerel AI)" isaretlidir. TASLAKTIR: son kontrol ve dosyaya yazma motor/ana oturumda."""
    global SON_SORU
    SON_SORU = None
    if not kanal_klasoru or not os.path.isdir(kanal_klasoru) or not hazir():
        return None
    # olcum metinleri
    v = os.path.join(kanal_klasoru, 'video-1')
    parcalar = []
    for ad, yol, n in [('kanal.json', os.path.join(kanal_klasoru, 'kanal.json'), 1500),
                       ('aciklama', os.path.join(kanal_klasoru, 'aciklama-1.txt'), 800),
                       ('ritim analizi', os.path.join(v, 'ritim', 'analiz.md'), 2500),
                       ('ritim analiz.json', os.path.join(v, 'ritim', 'analiz.json'), 1500),
                       ('edit dili olcumu', os.path.join(v, 'editdili', 'EDIT-DILI-olcum.md'), 3000),
                       ('edit-dili.json ozeti', os.path.join(v, 'editdili', 'edit-dili.json'), 1500)]:
        s = _kisalt(yol, n)
        if s:
            parcalar.append(f'--- {ad} ---\n{s}')
    if not parcalar:
        SON_SORU = f'{kanal_klasoru} icinde olcum dosyasi yok (kanal.json / ritim / editdili). Once kanal_isle.py calistirilsin mi?'
        return None
    # gorsel gozlemler (kare sayfalari)
    gozlem = []
    with _gpu_kilidi(oncelik):
        _tek_model(GORSEL_MODEL)
        for jpg, etiket in [(os.path.join(v, 'ritim', 'ilk30-cekimler.jpg'), 'ilk 30 sn cekim sayfasi'),
                            (os.path.join(v, 'editdili', 'edit-dili-sayfa.jpg'), 'edit dili kare sayfasi')]:
            if not os.path.isfile(jpg):
                continue
            with open(jpg, 'rb') as f:
                resim = base64.b64encode(f.read()).decode('ascii')
            d = _sor(GORSEL_MODEL, f'Bu {etiket} ({os.path.basename(jpg)}): edit dili acisindan 3-6 somut gozlem yaz '
                     '(renk paleti, yazi/font karakteri, grafik ogeleri, kompozisyon, doku/efekt). Uydurma, yalniz gorunen.',
                     {'type': 'object', 'properties': {'gozlemler': {'type': 'array', 'maxItems': 6, 'items': {'type': 'string'}}},
                      'required': ['gozlemler']},
                     lambda x: x if isinstance(x.get('gozlemler'), list) else None,
                     sistem='Sen video karelerinden edit dili okuyabilen bir sanat yonetmenisin.', resimler=[resim])
            if d:
                gozlem += [f'gozlem (yerel AI, {os.path.basename(jpg)}): {g}' for g in d['gozlemler'][:6]]
        # metin birlestirme
        _tek_model(METIN_MODEL)
        istem = ('Su olcum dosyalarindan EDIT-DILI.md taslagi cikar:\n\n' + '\n\n'.join(parcalar)
                 + ('\n\n--- gorsel gozlemler (kare sayfalarindan) ---\n' + '\n'.join(gozlem) if gozlem else ''))[:24000]
        d = _sor(METIN_MODEL, istem, _PT_SEMA,
                 lambda x: x if x.get('ton') in TONLAR and isinstance(x.get('iskelet'), list) else None, sistem=_PT_SISTEM)
    if d is None:
        return None
    guven = max(0.0, min(1.0, float(d.get('guven') or 0.5)))
    if guven < 0.5:
        SON_SORU = f'Olcum verisi profil icin yetersiz (guven {guven:.2f}): hangi dosya eksik — ritim mi edit dili olcumu mu? Olcum tamamlansin mi?'
        return None
    konu = [k for k in (d.get('konu') or []) if k in KONULAR]
    ad = os.path.basename(os.path.normpath(kanal_klasoru))
    md = [f'# {ad} — edit dili TASLAK (yerel AI; son kontrol ve sayilarin dogrulanmasi ana oturumda)',
          f"\nNis: {d['nis']} | ton: {d['ton']} | konu: {', '.join(konu)}",
          '\n## 1. Calisan iskelet (DOKUNMA — rakipten alinacak)'] + [f'- {x}' for x in d['iskelet']] + [
          '\n## 2. Yuzey (DEGISTIRILEBILIR — bu kanalin imzasi)'] + [f'- {x}' for x in d['yuzey']] + [
          '\n## 3. Teknikler'] + [f'- {x}' for x in d['teknikler']] + (
          ['\n## 3b. Gorsel gozlemler'] + [f'- {x}' for x in gozlem] if gozlem else []) + [
          '\n## 5. Kime yakin / kimden farkli', d['kime_yakin'],
          '\n## 6. Durustluk — olcumun zayif yerleri'] + [f'- {x}' for x in d['durustluk']]
    return {'nis': d['nis'], 'ton': d['ton'], 'konu': konu, 'iskelet': d['iskelet'], 'yuzey': d['yuzey'],
            'teknikler': d['teknikler'], 'gozlem_gorsel': gozlem, 'kime_yakin': d['kime_yakin'],
            'durustluk': d['durustluk'], 'guven': guven, 'taslak_md': '\n'.join(md)}


# ------------------------------------------------------------------ qc_triyaj
_QT_SEMA = {
    'type': 'object',
    'properties': {'maddeler': {'type': 'array', 'maxItems': 20, 'items': {
        'type': 'object',
        'properties': {
            'madde': {'type': 'string'},
            'gercek_mi': {'type': 'string', 'enum': ['evet', 'hayir', 'belirsiz']},
            'neden': {'type': 'string'},
            'oncelik': {'type': 'integer', 'minimum': 1, 'maximum': 5},
        },
        'required': ['madde', 'gercek_mi', 'neden', 'oncelik']}}},
    'required': ['maddeler'],
}

_QT_SISTEM = (
    'Sen QC raporlarini triyaj eden bir kurgu supervizorusun. Sana bir kalite kapisi raporunun FAIL/UYARI '
    'maddeleri verilecek. Her madde icin: gercek_mi = izleyicinin gercekten gorecegi bir sorun mu '
    '(evet), olcum yan etkisi / zararsiz mi (hayir), karar icin kareye bakmak sart mi (belirsiz). '
    'neden = 1 cumle gerekce. oncelik = 5 (teslimi durdurur) .. 1 (onemsiz). Kapinin FAIL/PASS sonucunu '
    'SEN DEGISTIREMEZSIN; yalniz insan bakisini siralarsin. Emin olmadiginda belirsiz de.')


def qc_triyaj(rapor_md, baglam='', oncelik='on'):
    """QC raporu (yazi_kontrol/kalite_kapisi/kurgu_denetim .md metni) -> oncelik sirali triyaj | None.

    Donus: [{'madde','gercek_mi','neden','oncelik','insan_baksin'}] (oncelik azalan). Kapi sonucunu
    DEGISTIRMEZ; yalniz insan bakisini hizlandiran siralamadir. 'belirsiz' -> insan_baksin=True."""
    if not rapor_md or not hazir():
        return None
    istem = (f'QC raporu:\n\n{rapor_md[:10000]}\n\n' + (f'Baglam: {baglam[:1000]}\n\n' if baglam else '')
             + 'Rapordaki FAIL ve UYARI maddelerini triyajla (her maddeyi kisaltarak aynen aktar).')
    with _gpu_kilidi(oncelik):
        _tek_model(METIN_MODEL)
        d = _sor(METIN_MODEL, istem, _QT_SEMA, lambda x: x if isinstance(x.get('maddeler'), list) else None, sistem=_QT_SISTEM)
    if d is None:
        return None
    out = []
    for m in d['maddeler']:
        if not m.get('madde') or m.get('gercek_mi') not in ('evet', 'hayir', 'belirsiz'):
            continue
        out.append({'madde': str(m['madde'])[:300], 'gercek_mi': m['gercek_mi'], 'neden': str(m.get('neden', ''))[:300],
                    'oncelik': max(1, min(5, int(m.get('oncelik', 3)))), 'insan_baksin': m['gercek_mi'] == 'belirsiz'})
    return sorted(out, key=lambda x: -x['oncelik']) or None


# ------------------------------------------------------------------ CLI
def _oku(yol):
    with open(yol, encoding='utf-8') as f:
        return f.read()


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # Windows konsolu cp1254: model ciktisi dusurmesin
    except (AttributeError, OSError):
        pass
    p = argparse.ArgumentParser(description='Yerel AI katmani (Ollama). Ollama kapaliysa null basar, kod 2.')
    p.add_argument('--arka', action='store_true', help='arka plan toplu is: on plan cagrilarina yol ver')
    alt = p.add_subparsers(dest='komut', required=True)
    alt.add_parser('durum', help='Ollama ayakta mi, hangi modeller yuklu')
    a = alt.add_parser('konu-ton')
    a.add_argument('--metin')
    a.add_argument('--dosya')
    a = alt.add_parser('sahne')
    a.add_argument('--metin')
    a.add_argument('--dosya')
    a.add_argument('--kelimeler', help='kelimeler.json (sahne_kur formati / WhisperX)')
    a = alt.add_parser('stil-adi')
    a.add_argument('--metin', help='DNA ozeti (JSON ya da duz metin)')
    a.add_argument('--dosya')
    a = alt.add_parser('kare-juri')
    a.add_argument('--resim', required=True)
    a.add_argument('--baglam', default='')
    a = alt.add_parser('video-juri', help='render edilmis videodan esit aralikli kareler -> kare jurisi -> JURI.md (kapi degil)')
    a.add_argument('--video', required=True)
    a.add_argument('--baglam', default='')
    a.add_argument('--adet', type=int, default=6)
    a.add_argument('--cikti', help='JURI.md yolu')
    a = alt.add_parser('kurgu-oneri')
    a.add_argument('--rapor', required=True, help='kurgu denetim raporu .md')
    a.add_argument('--plan', default='')
    a = alt.add_parser('profil-taslak')
    a.add_argument('--kanal', required=True, help='kutuphane kanal klasoru (…\\kanallar\\@X)')
    a = alt.add_parser('qc-triyaj')
    a.add_argument('--rapor', required=True, help='QC raporu .md (yazi/kalite/kurgu denetim)')
    a.add_argument('--baglam', default='')
    s = p.parse_args()
    onc = 'arka' if s.arka else 'on'

    if s.komut == 'durum':
        h = hazir()
        print(json.dumps({'hazir': h, 'yuklu': _yuklu() if h else [], 'metin_model': METIN_MODEL, 'gorsel_model': GORSEL_MODEL}, ensure_ascii=False))
        sys.exit(0 if h else 2)

    metin = getattr(s, 'metin', None) or (_oku(s.dosya) if getattr(s, 'dosya', None) else None)
    if s.komut == 'konu-ton':
        y = konu_ton(metin, oncelik=onc)
    elif s.komut == 'sahne':
        kel = json.loads(_oku(s.kelimeler)) if s.kelimeler else None
        y = sahne_firsatlari(metin, kel, oncelik=onc)
    elif s.komut == 'stil-adi':
        try:
            metin = json.loads(metin)
        except (json.JSONDecodeError, TypeError):
            pass
        y = stil_adi(metin, oncelik=onc)
    elif s.komut == 'video-juri':
        y = video_juri(s.video, s.baglam, s.adet, s.cikti, oncelik=onc)
        if y:
            y = {k: v for k, v in y.items() if k != 'kareler'} | {'kare': len(y['kareler'])}
    elif s.komut == 'kare-juri':
        y = kare_juri(s.resim, s.baglam, oncelik=onc)
    elif s.komut == 'profil-taslak':
        y = profil_taslak(s.kanal, oncelik=onc)
    elif s.komut == 'qc-triyaj':
        y = qc_triyaj(_oku(s.rapor), s.baglam, oncelik=onc)
    else:
        y = kurgu_onerisi(_oku(s.rapor), s.plan, oncelik=onc)
    if y is None and SON_SORU:
        print(json.dumps({'sonuc': None, 'soru': SON_SORU}, ensure_ascii=False))
    else:
        print(json.dumps(y, ensure_ascii=False, indent=1))
    sys.exit(2 if y is None else 0)


if __name__ == '__main__':
    main()
