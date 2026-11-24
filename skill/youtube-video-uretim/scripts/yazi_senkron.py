#!/usr/bin/env python3
"""YAZI-SES SENKRONU — ekran yazilarinin seslendirmeyle zamanlamasini olcer (rakip videosu ya da bizim render/final).

Her ekran yazisi icin: ne zaman belirdi/kayboldu (0,25 sn adim), kac kelime, okumak icin ne kadar sure gerekir
(kurgu_denetim.py ile AYNI formul), seslendirmede karsiligi var mi (eslesme orani), seslendirmeciye gore gecikme
(yazi_bas - soylenme_bas; eksi = yazi once geliyor) ve seslendirmeci bitirmeden ekrandan cikiyor mu.

Kullanim:
  py yazi_senkron.py video.mp4 [--kelimeler altyazi.vtt | whisperx.json | props.json | kelimeler.json]
                     [--yuzde 30 | --bas 0 --son 0] [--adim 0.25] [--dil en] [--cikti klasor] [--ornek 12]
--kelimeler : YouTube altyazi.vtt (<00:00:01.230><c> kelime zamanlari; elle yazilmis vtt'de kelimeler ipucuna yayilir),
              WhisperX json (segments[].words / word_segments), bizim [{k,bas,son}] ya da VideoDna props.json (veri.kelimeler).
              Verilmezse videonun yanindaki <ad>*.vtt / altyazi.vtt aranir; o da yoksa faster-whisper (kelime zamanli) calisir.
--yuzde     : videonun yalniz ilk %N'i (varsayilan 30; hiz icin). --yuzde 100 = tamami. --bas/--son verilirse onlar gecerli.
--onbellek  : ham OCR (varsayilan <cikti>/yazi-senkron-ocr.json; 0 = yazma): ayni video + aralikta yeniden okunmaz
--ornek     : N ogenin orta karesi kutusu ve zamanlariyla yazi-senkron-ornek.jpg'ye (gozle kontrol; 0 = yazma)
Cikti (--cikti klasoru, varsayilan videonun klasoru): yazi-senkron.json {"ozet": {...}, "ogeler": [...]}, YAZI-SENKRON.md
  oge alanlari kurgu_denetim.py --yazi ile ayni: metin, bas, bit, sure, kelime, ihtiyac, eslesme, soylenme_bas/son,
  gecikme (yalniz seste karsiligi varsa), ses_bitmeden, tur (altyazi | baslik/kart_yazisi | kucuk_yazi/etiket/kaynak |
  goruntu_ici | kalici | sayac | anlik), okunmadan (sure < ihtiyac - adim: OCR giris animasyonunu saymaz, bir ornek pay),
  yer, boyut_yuzde, n (kac ornekte goruldu), kalabalik (ayni anda ekrandaki diger yazi). Hiz: 4 kare/sn OCR, 20 cekirdekte
  ~1,6 x gercek zaman (215 sn -> ~6 dk); siniflandirma degisince --onbellek'ten saniyeler.
  ozet: yazi (kart + etiket = kurgu yazilari), kart, sesli (yazidan seslendirmede gecenler: gecikme / ses bitmeden burada
  anlamli), altyazi; her grupta ekran suresi medyan/p25/p75, okunmadan kaybolan, gecikme medyan/p25/p75, ses bitmeden ...
Goruntu ici yazi (sponsor duvari, tabela, skor tabelasi) sezgiyle ayrilir: kayan, ayni anda 5+ yazi olan karede kopya /
bulanik ya da seste gecmeyen. Kalabalik karenin ustundeki kucuk, sessiz kurgu yazisi (alt bant) goruntu ici sayilabilir.
OCR: rapidocr (yazi_kontrol.py / edit_dili.py ile ayni motor; `py -m pip install rapidocr`). Degismeyen kare yeniden okunmaz.
Zaman cozunurlugu: +-adim/2 (bas/bit ornek araliginin ortasina konur). OCR yaziyi okunur hale geldiginde yakalar (giris
animasyonunun ilk kareleri sayilmaz) — "okunabilir oldugu an" olcumu.
"""
import argparse, difflib, json, math, os, re, statistics as st, subprocess, sys, tempfile
from collections import Counter
import numpy as np

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)   # py -I komsu modulleri yola koymaz
import kurgu_denetim as KD   # tokenler, icerik, ses_eslestir, okuma sabitleri: denetimle AYNI formul

ESIK_SKOR = 0.7       # OCR guveni bunun altindaki satirlar atilir (goruntu icindeki bulanik yazi, gurultu)
ASGARI_BOY = 0.015    # kare yuksekliginin %1,5'inden kucuk satir (telefonda okunmaz; uzak tabela, forma yazisi) atilir
OCR_SURUM = 1         # _ocr_parca / bloklar degisince artir: eski --onbellek dosyasi kullanilmaz
BOSLUK = 0.5          # bir iz bu kadar sn gorulmezse kapanir (hareket/blur'da OCR'in kacirdigi kareler)


# ---------------------------------------------------------------- kelime zamanlari
def _zaman(s):
    p = s.replace(',', '.').split(':')
    return sum(float(x) * 60 ** i for i, x in enumerate(reversed(p)))


def vtt_oku(yol):
    """YouTube otomatik altyazi: kelime zamanlari satir ici etiketlerde; tekrar eden (kayan) satirlar atlanir.
    Elle yazilmis altyazi (etiketsiz): ipucu metni sure boyunca harf sayisina gore yayilir."""
    metin = open(yol, encoding='utf-8', errors='replace').read()
    ipuclari = []
    for blok in re.split(r'\n\n+', metin.replace('\r', '')):   # YouTube ipucunun icinde ' ' satiri var: \s* ile bolunmez
        m = re.search(r'(\d[\d:.,]*)\s*-->\s*(\d[\d:.,]*)', blok)
        if not m:
            continue
        satirlar = blok[m.end():].split('\n')[1:]
        ipuclari.append((_zaman(m[1]), _zaman(m[2]), [s for s in satirlar if s.strip()]))
    otomatik = '<c>' in metin or re.search(r'<\d+:\d+[\d:.]*>', metin)
    out = []
    if otomatik:
        for bas, son, satirlar in ipuclari:
            for s in satirlar:
                if not re.search(r'<\d+:\d+[\d:.]*>', s):
                    continue          # onceki ipucunun tekrari (kayan satir)
                parca = re.split(r'<(\d+:\d+[\d:.]*)>', s)
                t = bas
                for i, p in enumerate(parca):
                    if i % 2:
                        t = _zaman(p)
                        continue
                    for w in re.sub(r'<[^>]+>', '', p).split():
                        out.append({'k': w, 'bas': round(t, 3), 'son': None, '_ipucu_son': son})
        for a, b in zip(out, out[1:]):
            a['son'] = round(min(b['bas'], a['bas'] + 1.0), 3) if b['bas'] > a['bas'] else round(a['bas'] + 0.2, 3)
        if out:
            out[-1]['son'] = round(min(out[-1]['_ipucu_son'], out[-1]['bas'] + 1.0), 3)
        for w in out:
            w.pop('_ipucu_son', None)
        return out
    onceki = None
    for bas, son, satirlar in ipuclari:
        txt = ' '.join(re.sub(r'<[^>]+>', '', s).strip() for s in satirlar).strip()
        if not txt or txt == onceki:
            continue
        onceki = txt
        ws = txt.split()
        toplam = sum(len(w) + 1 for w in ws)
        t = bas
        for w in ws:
            d = (son - bas) * (len(w) + 1) / toplam
            out.append({'k': w, 'bas': round(t, 3), 'son': round(t + d, 3)})
            t += d
    return out


def json_kelimeler(d):
    if isinstance(d, dict):
        if isinstance(d.get('veri'), dict) and d['veri'].get('kelimeler'):
            return json_kelimeler(d['veri']['kelimeler'])
        if d.get('kelimeler'):
            return json_kelimeler(d['kelimeler'])
        if d.get('word_segments'):
            return json_kelimeler(d['word_segments'])
        if d.get('segments'):
            return json_kelimeler([w for s in d['segments'] for w in (s.get('words') or [])])
        return []
    out = []
    for w in d or []:
        k = w.get('k', w.get('word', w.get('text')))
        b = w.get('bas', w.get('start'))
        s = w.get('son', w.get('end'))
        if k is None or b is None:
            continue                  # WhisperX hizalayamadigi kelimede start yok
        out.append({'k': str(k).strip(), 'bas': float(b), 'son': float(s if s is not None else b + 0.3)})
    return out


def whisper_kelimeler(video, bas, son, dil):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None, 'faster-whisper yok (py -m pip install faster-whisper)'
    try:  # pip ile gelen nvidia DLL'leri Windows'ta yola eklenmezse CUDA acilmaz (kalite_kapisi.py ile ayni)
        import glob, nvidia
        for _p in nvidia.__path__:
            for _d in glob.glob(os.path.join(_p, '*', 'bin')):
                os.add_dll_directory(_d)
                os.environ['PATH'] = _d + os.pathsep + os.environ['PATH']
    except Exception:
        pass
    wav = os.path.join(tempfile.gettempdir(), f'yazi_senkron_{os.getpid()}.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{bas:.3f}', '-to', f'{son:.3f}', '-i', video, '-vn', '-ac', '1', '-ar', '16000', wav], check=True)

    def coz(cihaz, tur):
        m = WhisperModel('small', device=cihaz, compute_type=tur)
        segs, _ = m.transcribe(wav, language=dil, vad_filter=True, word_timestamps=True)
        return [{'k': w.word.strip(), 'bas': round(w.start + bas, 3), 'son': round(w.end + bas, 3)} for s in segs for w in (s.words or [])]
    try:
        try:
            return coz('cuda', 'float16'), 'faster-whisper (cuda)'
        except Exception:
            return coz('cpu', 'int8'), 'faster-whisper (cpu)'
    finally:
        try:
            os.remove(wav)
        except OSError:
            pass


def kelime_yukle(yol, video, bas, son, dil):
    if not yol:
        d = os.path.dirname(os.path.abspath(video))
        kok = os.path.splitext(os.path.basename(video))[0]
        aday = sorted(f for f in os.listdir(d) if f.endswith('.vtt') and (f.startswith(kok + '.') or f == 'altyazi.vtt'))
        yol = os.path.join(d, aday[0]) if aday else None
    if yol:
        if yol.lower().endswith('.vtt'):
            return vtt_oku(yol), f'vtt ({os.path.basename(yol)})'
        return json_kelimeler(json.load(open(yol, encoding='utf-8'))), f'json ({os.path.basename(yol)})'
    k, kaynak = whisper_kelimeler(video, bas, son, dil)
    return k or [], kaynak


# ---------------------------------------------------------------- OCR
def ocr_motor(is_parcacik=0):
    import logging
    logging.disable(logging.WARNING)
    try:
        from rapidocr import RapidOCR
        p = {'Global.use_cls': False,                           # aci siniflandirma kapali: yatay yazida ayni sonuc, 2 kat hizli
             'Det.limit_type': 'max', 'Det.limit_side_len': 960}  # varsayilan kisa kenari 736'ya BUYUTUR: 960x540'ta 1,7 kat yavas
        if is_parcacik:
            p['EngineConfig.onnxruntime.intra_op_num_threads'] = is_parcacik
        for q in (p, {'Global.use_cls': False}, None):
            try:
                return RapidOCR(params=q) if q else RapidOCR()
            except Exception:
                continue
    except ImportError:
        try:
            from rapidocr_onnxruntime import RapidOCR
            return RapidOCR()
        except ImportError:
            sys.exit('rapidocr yok: py -m pip install rapidocr')


def ocr_oku(m, img):
    r = m(img)
    if isinstance(r, tuple):
        r = r[0] or []
        return [(np.array(b), t, float(s)) for b, t, s in r]
    if getattr(r, 'boxes', None) is None:
        return []
    return [(np.array(b), t, float(s)) for b, t, s in zip(r.boxes, r.txts, r.scores)]


def bloklar(satirlar, k=16 / 9):
    """ayni karede yan yana / alt alta duran satirlari tek yazi blogunda topla (iki satirlik kart = tek oge)"""
    n = len(satirlar)
    ata = list(range(n))

    def bul(i):
        while ata[i] != i:
            ata[i] = ata[ata[i]]
            i = ata[i]
        return i
    for i in range(n):
        a = satirlar[i]
        for j in range(i + 1, n):
            b = satirlar[j]
            # koordinatlar kare oranina gore (x/W, y/H): 16:9'da yatay mesafe x1,78 ile piksele cevrilir
            ha, hb = a['y1'] - a['y0'], b['y1'] - b['y0']
            hmax, hmin = max(ha, hb), max(1e-6, min(ha, hb))
            dik_ort = min(a['y1'], b['y1']) - max(a['y0'], b['y0'])
            yat_bos = (max(a['x0'], b['x0']) - min(a['x1'], b['x1'])) * k
            ayni_sira = dik_ort > 0.5 * hmin and yat_bos < 0.5 * hmax and hmax / hmin < 1.5
            hizali = min(abs(a['x0'] - b['x0']), abs(a['x1'] - b['x1']), abs(a['x0'] + a['x1'] - b['x0'] - b['x1']) / 2) * k < hmax
            ust_alt = hizali and yat_bos < 0 and -dik_ort < 0.9 * hmax and hmax / hmin < 1.8
            if ayni_sira or ust_alt:
                ata[bul(i)] = bul(j)
    gr = {}
    for i in range(n):
        gr.setdefault(bul(i), []).append(satirlar[i])
    out = []
    for g in gr.values():
        g.sort(key=lambda s: (s['y0'] + s['y1']) / 2)
        siralar, sira = [], [g[0]]
        for s in g[1:]:
            o = sira[-1]
            if min(o['y1'], s['y1']) - max(o['y0'], s['y0']) > 0.5 * min(o['y1'] - o['y0'], s['y1'] - s['y0']):
                sira.append(s)
            else:
                siralar.append(sira)
                sira = [s]
        siralar.append(sira)
        metin = ' / '.join(' '.join(s['txt'] for s in sorted(r, key=lambda s: s['x0'])) for r in siralar)
        out.append({'x0': min(s['x0'] for s in g), 'y0': min(s['y0'] for s in g), 'x1': max(s['x1'] for s in g),
                    'y1': max(s['y1'] for s in g), 'txt': metin, 'skor': min(s['skor'] for s in g),
                    'satir_h': float(st.median(s['y1'] - s['y0'] for s in g))})
    return out


def norm(s):
    return re.sub(r'\W+', '', s.lower())


def ortusme(a, b):
    ix = max(0.0, min(a['x1'], b['x1']) - max(a['x0'], b['x0']))
    iy = max(0.0, min(a['y1'], b['y1']) - max(a['y0'], b['y0']))
    alan = min((a['x1'] - a['x0']) * (a['y1'] - a['y0']), (b['x1'] - b['x0']) * (b['y1'] - b['y0'])) or 1e-6
    return ix * iy / alan


def benzer(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    k, u = (a, b) if len(a) <= len(b) else (b, a)
    if len(k) >= 3 and k in u:
        return 1.0                  # yazi kelime kelime aciliyor / bir satiri ortulu
    if sum(c.isdigit() for c in a) >= 0.6 * len(a) and sum(c.isdigit() for c in b) >= 0.6 * len(b):
        return 0.8                  # sayac animasyonu (0 -> 7, 1.200 -> 85.000): ayni yerde rakamlar degisiyor
    return difflib.SequenceMatcher(None, a, b).ratio()


def _ocr_parca(is_):
    """isci: [i0, i1) ornek karelerini OCR eder -> [(kare no, [blok])]. Degismeyen kare yeniden okunmaz."""
    video, bas, adim, i0, i1, w, h, iplik = is_
    motor = ocr_motor(iplik)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{bas + i0 * adim:.3f}', '-i', video, '-frames:v', str(i1 - i0),
                          '-vf', f'fps={1 / adim:g},scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
    boy = w * h * 3
    out, onceki, sonuc, cagri, i = [], None, [], 0, i0
    while i < i1:
        veri = p.stdout.read(boy)
        if len(veri) < boy:
            break
        img = np.frombuffer(veri, np.uint8).reshape(h, w, 3)
        kucuk = img[::6, ::6].mean(2)
        if onceki is None or np.abs(kucuk - onceki).mean() >= 1.5:
            onceki = kucuk
            cagri += 1
            sat = []
            for b, tx, sc in ocr_oku(motor, img):
                tx = tx.strip()
                y0, y1 = b[:, 1].min() / h, b[:, 1].max() / h
                if sc < ESIK_SKOR or (len(norm(tx)) < 2 and not tx.isdigit()) or y1 - y0 < ASGARI_BOY:   # tek hane: sayac karti
                    continue
                sat.append({'x0': float(b[:, 0].min() / w), 'y0': float(y0), 'x1': float(b[:, 0].max() / w), 'y1': float(y1), 'txt': tx, 'skor': float(sc)})
            sonuc = bloklar(sat, w / h)
        out.append((i, sonuc))
        i += 1
    p.stdout.close()
    p.wait()
    return out, cagri


def tara(video, bas, son, adim, W0, H0, isci=0, onbellek=None):
    olcek = min(1.0, 960 / max(W0, H0))
    w, h = int(W0 * olcek) // 2 * 2, int(H0 * olcek) // 2 * 2
    n = int((son - bas) / adim + 1e-6)
    st_ = os.stat(video)
    kimlik = {'surum': OCR_SURUM, 'video': os.path.abspath(video), 'boyut': st_.st_size, 'mtime': int(st_.st_mtime),
              'bas': round(bas, 3), 'son': round(son, 3), 'adim': adim, 'w': w, 'h': h}
    if onbellek and os.path.exists(onbellek):
        try:
            ob = json.load(open(onbellek, encoding='utf-8'))
            if ob.get('kimlik') == kimlik:
                kareler, cagri = [tuple(x) for x in ob['kareler']], ob['cagri']
                print(f'OCR onbellekten: {onbellek}')
                return iz_kur(kareler, bas, adim), len(kareler), cagri
        except Exception:
            pass
    cpu = os.cpu_count() or 4
    isci = isci or max(1, min(6, cpu // 4, n // 40 or 1))
    parca = [(video, bas, adim, n * j // isci, n * (j + 1) // isci, w, h, max(1, cpu // isci)) for j in range(isci)]
    if isci == 1:
        sonuclar = [_ocr_parca(parca[0])]
    else:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(isci) as ex:
            sonuclar = list(ex.map(_ocr_parca, parca))
    kareler = sorted(x for r, _ in sonuclar for x in r)
    cagri = sum(c for _, c in sonuclar)
    if onbellek:   # ham OCR: siniflandirma/eslestirme degisince video yeniden okunmaz (--onbellek)
        json.dump({'kimlik': kimlik, 'cagri': cagri, 'kareler': kareler}, open(onbellek, 'w', encoding='utf-8'), ensure_ascii=False)
    return iz_kur(kareler, bas, adim), len(kareler), cagri


def iz_kur(kareler, bas, adim):
    # iz eslestirme: kutu ortusmesi + metin surekliligi (sirali; isciler yalniz OCR yapar)
    izler, acik = [], []
    for i, sonuc in kareler:
        t = bas + i * adim
        kullanilan = set()
        for bl in sorted(sonuc, key=lambda x: -(x['x1'] - x['x0']) * (x['y1'] - x['y0'])):
            en, en_p = None, 0
            for iz in acik:
                if id(iz) in kullanilan or t - iz['son'] > BOSLUK + 1e-6:
                    continue
                o = ortusme(bl, iz['kutu'])
                if max(bl['satir_h'], iz['kutu']['satir_h']) > 1.6 * min(bl['satir_h'], iz['kutu']['satir_h']):
                    continue        # yazi boyu farkli: ayni yerdeki baska yazi (kart alt satiri <-> buyuk altyazi kelimesi)
                bz = max(benzer(bl['txt'], iz['son_txt']), benzer(bl['txt'], iz['en_txt']))
                if o > 0.3 and bz >= 0.6 and o + bz > en_p:
                    en, en_p = iz, o + bz
            if en is None:
                en = {'ilk': t, 'son': t, 'metinler': Counter(), 'skor': [], 'kutular': [], 'kutu': bl, 'son_txt': bl['txt'], 'en_txt': bl['txt']}
                acik.append(en)
            en['son'] = t
            en['metinler'][bl['txt']] += 1
            en['skor'].append(bl['skor'])
            en['kutular'].append((t, bl['x0'], bl['y0'], bl['x1'], bl['y1'], bl['satir_h']))
            en['kutu'], en['son_txt'] = bl, bl['txt']
            uzun = max(len(norm(x)) for x in en['metinler'])
            en['en_txt'] = max(en['metinler'].items(), key=lambda kv: (len(norm(kv[0])) >= 0.8 * uzun, kv[1], len(kv[0])))[0]
            kullanilan.add(id(en))
        kalan = []
        for iz in acik:
            (kalan if t - iz['son'] <= BOSLUK + 1e-6 else izler).append(iz)
        acik = kalan
    izler += acik
    return iz_birlestir(izler)


def iz_birlestir(izler):
    """ayni yazinin parca izlerini ana ize kat: daktilo / kelime kelime acilan satir, bazi karelerde ayri blok olarak okunan
    alt satir. Parca: zamani ana izin icinde, kutusu ana izin kutusunun icinde, metni ana metnin parcasi."""
    def kutu(iz):
        k = np.array([x[1:5] for x in iz['kutular']])
        return {'x0': k[:, 0].min(), 'y0': k[:, 1].min(), 'x1': k[:, 2].max(), 'y1': k[:, 3].max()}
    izler = sorted(izler, key=lambda z: -len(norm(z['en_txt'])))
    kalan = []
    for z in izler:
        zk, zn = kutu(z), norm(z['en_txt'])
        for ana in kalan:
            if z['ilk'] >= ana['ilk'] - BOSLUK and z['son'] <= ana['son'] + BOSLUK and len(zn) >= 2 and zn in norm(ana['en_txt'])                     and ortusme(zk, ana['_kutu']) > 0.6:
                ana['ilk'], ana['son'] = min(ana['ilk'], z['ilk']), max(ana['son'], z['son'])
                break
        else:
            z['_kutu'] = zk
            kalan.append(z)
    return kalan


# ---------------------------------------------------------------- oge, tur, senkron
def yer_ad(x0, y0, x1, y1):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return ('ust' if cy < 0.33 else 'alt' if cy > 0.62 else 'orta') + ('-orta' if abs(cx - 0.5) < 0.12 else '-sol' if cx < 0.5 else '-sag')


def ogeler_kur(izler, kelimeler, adim, bas0, son0):
    og = []
    for iz in izler:
        n = len(iz['kutular'])
        if n < 2 and max(iz['skor']) < 0.85:
            continue                       # tek karede, dusuk guvenli: OCR gurultusu
        metin = iz['en_txt']
        k = np.array([x[1:5] for x in iz['kutular']])
        x0, y0, x1, y1 = np.median(k, axis=0)
        bas = max(bas0, iz['ilk'] - adim / 2)
        bit = min(son0, iz['son'] + adim / 2)
        # goruntu ici yazi (Ken Burns / kaydirma ile kayan): merkezin ilk ucte biri -> son ucte biri kaymasi
        surukle = 0.0
        if n >= 4:
            u = max(1, n // 3)
            c = (k[:, 0:2] + k[:, 2:4]) / 2
            surukle = float(np.linalg.norm(np.median(c[-u:], 0) - np.median(c[:u], 0))) / max(adim, iz['son'] - iz['ilk'])
        e = {'metin': metin, 'bas': round(bas, 2), 'bit': round(bit, 2), 'sure': round(bit - bas, 2), 'n': n,
             'skor': round(float(np.median(iz['skor'])), 2), 'kutu': [round(float(v), 3) for v in (x0, y0, x1 - x0, y1 - y0)],
             'yer': yer_ad(x0, y0, x1, y1), 'boyut_yuzde': round(float(np.median([x[5] for x in iz['kutular']])) * 100, 1),
             'kayma_sn': round(surukle, 3), 'son': bit, 'ses_metni': metin}
        e['kelime'] = len(KD.tokenler(metin))
        if kelimeler:
            oran, sb, ss = KD.ses_eslestir(e, kelimeler)
            satirlar = metin.split(' / ')
            if len(satirlar) > 1:
                # cok satirli blok (alinti + kaynak satiri, ust baslik + kart): senkronu yalniz SESTE GECEN satirlar belirler
                sesli = [x for x in satirlar if KD.ses_eslestir(dict(e, ses_metni=x), kelimeler)[0] >= 0.5]
                if sesli and len(sesli) < len(satirlar):
                    o2, sb2, ss2 = KD.ses_eslestir(dict(e, ses_metni=' '.join(sesli)), kelimeler)
                    if o2 >= 0.5:
                        oran, sb, ss = o2, sb2, ss2
        else:
            oran, sb, ss = 0.0, None, None
        e['eslesme'] = round(oran, 2)
        duyulan = oran >= 0.5
        e['ihtiyac'] = round(max(KD.ASGARI, KD.GIRIS + e['kelime'] / (KD.OKUMA_DUYULAN if duyulan else KD.OKUMA_SESSIZ) + KD.TUTMA), 2)
        e['soylenme_bas'] = None if sb is None else round(sb, 2)
        e['soylenme_son'] = None if ss is None else round(ss, 2)
        e['gecikme'] = round(bas - sb, 2) if duyulan else None
        # kurgu_denetim esigi (yazi, son kelimeden en az 0,3 sn sonra cikmali) eksi bir ornek araligi: OCR bitisi +-adim/2
        # oynar ve cikis animasyonunda yazi okunmaz hale erken gelir; olcumde yanlis FAIL uretmesin. Analiz sinirinda kesilen sayilmaz.
        e['ses_bitmeden'] = bool(duyulan and bit < ss + 0.3 - adim and bit < son0 - adim)
        # ihtiyac kurgu_denetim formulu (0,4 sn giris animasyonu dahil); OCR ise yaziyi giris animasyonu bitince yakalar ve
        # bas/bit +-adim/2 oynar -> bir ornek araligi pay: sinirdaki yazi yanlis "okunmadan kayboluyor" olmasin
        e['okunmadan'] = e['sure'] < e['ihtiyac'] - adim
        e['_n'] = norm(metin)
        og.append(e)
    # tur: edit_dili.py mantigi (altyazi = konusmayla eslesen, ortalanmis; buyuk ya da uzun = baslik/kart; gerisi kucuk yazi)
    # + altyazi serisi: ayni yukseklik bandinda, seste karsiligi olan, birbirini izleyen 4+ oge (kelime kelime altyazi dahil)
    # + goruntu ici yazi: kurgunun degil cekilen goruntunun yazisi (sponsor duvari, tabela, gazete, skor tabelasi)
    span = son0 - bas0

    def bant_no(e):
        return round((e['kutu'][1] + e['kutu'][3] / 2) / 0.05)
    # altyazi ZINCIRI: ayni yukseklik bandinda (+-1 bant: kelime altyazisinin boyu kelimeye gore oynar) ortalanmis kisa
    # ogeler birbirini 0,6 sn'den kisa araliklarla izliyor; zincir 4+ oge ve yarisindan fazlasi seste geciyorsa altyazi.
    # Tek basina duran (ya da 2-3'lu) ortalanmis kart, sesle eslesse de altyazi degil.
    aday = sorted([e for e in og if e['yer'].endswith('orta') and e['sure'] <= 4], key=lambda e: e['bas'])
    ata = {id(e): id(e) for e in aday}

    def kok(i):
        while ata[i] != i:
            i = ata[i]
        return i
    for i, a_ in enumerate(aday):
        for b_ in aday[i + 1:]:
            if b_['bas'] - a_['bit'] > 0.6:
                break
            if abs(bant_no(a_) - bant_no(b_)) <= 1 and b_['bas'] - a_['bit'] > -0.3 and                     max(a_['boyut_yuzde'], b_['boyut_yuzde']) <= 1.6 * min(a_['boyut_yuzde'], b_['boyut_yuzde']):
                ata[kok(id(b_))] = kok(id(a_))
    zincir = {}
    for e in aday:
        zincir.setdefault(kok(id(e)), []).append(e)
    altyazi_id, stil = set(), []
    for z in zincir.values():
        if len(z) >= 4 and sum(x['eslesme'] >= 0.5 or not KD.icerik(KD.tokenler(x['metin'])) for x in z) > len(z) / 2:
            altyazi_id |= {id(x) for x in z}
            stil.append((st.median(bant_no(x) for x in z), st.median(x['boyut_yuzde'] for x in z), KD.yuzdelik([x['sure'] for x in z], 0.9)))
    # cumle arasinda kopan kisa zincirler: altyazi stilindeki (ayni bant, ayni yazi boyu, altyazi kadar kisa) ogeler de altyazi
    for e in aday:
        if id(e) not in altyazi_id and any(abs(bant_no(e) - b) <= 1 and max(e['boyut_yuzde'], y) <= 1.3 * min(e['boyut_yuzde'], y)
                                           and e['sure'] <= max(1.5, 1.5 * p90) for b, y, p90 in stil):
            altyazi_id.add(id(e))
    for e in og:
        m = (e['bas'] + e['bit']) / 2
        es = [x for x in og if x is not e and x['bas'] <= m <= x['bit']]
        e['_kalabalik'] = len(es)
        e['_kopya'] = any(x['_n'] == e['_n'] or (len(e['_n']) >= 4 and (e['_n'] in x['_n'] or x['_n'] in e['_n'])) or
                          (len(e['_n']) >= 6 and difflib.SequenceMatcher(None, e['_n'], x['_n']).ratio() >= 0.6) for x in es)
        # titreyen: ayni metin 8 sn icinde 3+ kez kisa parca halinde (goruntudeki tabela OCR'da gidip geliyor; kurgu yazisi kararli)
        e['_titrek'] = e['sure'] < 1.0 and len(e['_n']) >= 3 and sum(
            1 for x in og if x is not e and x['sure'] < 1.0 and abs(x['bas'] - e['bas']) <= 8 and
            difflib.SequenceMatcher(None, e['_n'], x['_n']).ratio() >= 0.8) >= 2
    for e in og:
        sesli = e['eslesme'] >= 0.5
        if e['sure'] >= max(20, 0.5 * span):
            e['tur'] = 'kalici'                       # logo, filigran, sabit HUD
        elif id(e) in altyazi_id:
            e['tur'] = 'altyazi'                      # zincirdeki baglac/edat ("ON", "THE") da: eslesecek icerik kelimesi yok
        elif e['_kopya'] or e['_titrek'] or (not sesli and (e['kayma_sn'] > 0.03 or e['_kalabalik'] >= 5 or e['skor'] < 0.8)) or \
                (sesli and e['_kalabalik'] >= 5 and (e['boyut_yuzde'] < 5 or
                                                     (abs(e['gecikme']) > 3 and len(set(KD.icerik(KD.tokenler(e['metin'])))) <= 1))):
            # ayni yazi ayni anda iki yerde (sponsor duvari: seste gecse bile) / kayan / 5+ yazili karede sessiz / bulanik;
            # seste gecen yazi kalabalik karede ancak kucukse ya da TEK kelimesi sesle 3 sn'den uzaksa (tesadufi: "Etihad")
            e['tur'] = 'goruntu_ici'
        elif not sesli and e['_n'].isdigit():
            e['tur'] = 'sayac'                        # sayi karti rakami (sayma animasyonu: 0 -> 7); okuma suresi olcusune girmez
        elif not sesli and e['n'] < 2:
            e['tur'] = 'anlik'                        # tek ornekte (<0,5 sn) gorulen sessiz yazi: gecis karesi, OCR gurultusu
        elif not kelimeler and e['yer'] == 'alt-orta' and e['sure'] < 5 and e['boyut_yuzde'] < 6:
            e['tur'] = 'altyazi'
        elif e['boyut_yuzde'] >= 5 or e['sure'] >= 3:
            e['tur'] = 'baslik/kart_yazisi'
        else:
            e['tur'] = 'kucuk_yazi/etiket/kaynak'
    for e in og:
        if e['tur'] == 'altyazi':     # konusmayla akar: kelime kelime altyazi "kisa" ve "ses bitmeden gidiyor" sayilmaz
            e['okunmadan'] = e['ses_bitmeden'] = False
        for k in ('son', 'ses_metni', '_n', '_kopya', '_titrek'):
            e.pop(k, None)
        e['kalabalik'] = e.pop('_kalabalik')
    og.sort(key=lambda e: e['bas'])
    return og


def ozetle(og, span):
    def yuz(xs, p):
        return round(KD.yuzdelik(xs, p), 2) if xs else None

    def grup(es):
        if not es:
            return None
        sure = [e['sure'] for e in es]
        g = [e['gecikme'] for e in es if e['gecikme'] is not None]
        duy = [e for e in es if e['eslesme'] >= 0.5]
        o = {'adet': len(es), 'dakikada': round(len(es) / span * 60, 1),
             'ekran_sure_medyan': round(st.median(sure), 2), 'ekran_sure_p25': yuz(sure, 0.25), 'ekran_sure_p75': yuz(sure, 0.75),
             'kelime_medyan': st.median(e['kelime'] for e in es), 'ihtiyac_medyan': round(st.median(e['ihtiyac'] for e in es), 2),
             'okunmadan_kaybolan': sum(e['okunmadan'] for e in es), 'okunmadan_oran': round(sum(e['okunmadan'] for e in es) / len(es), 2),
             'seste_karsilik_oran': round(len(duy) / len(es), 2),
             'gecikme_medyan': round(st.median(g), 2) if g else None, 'gecikme_p25': yuz(g, 0.25), 'gecikme_p75': yuz(g, 0.75),
             'gec_gelen_oran': round(sum(x > 0.6 for x in g) / len(g), 2) if g else None,
             'ses_bitmeden': sum(e['ses_bitmeden'] for e in es),
             'ses_bitmeden_oran': round(sum(e['ses_bitmeden'] for e in duy) / len(duy), 2) if duy else None}
        ss = sorted(es, key=lambda e: e['bas'])
        bos = [b['bas'] - a['bit'] for a, b in zip(ss, ss[1:]) if b['bas'] - a['bit'] > 0]
        o['bos_ekran_medyan'] = round(st.median(bos), 2) if bos else None
        return o
    yazi = [e for e in og if e['tur'] in ('baslik/kart_yazisi', 'kucuk_yazi/etiket/kaynak')]
    alt = grup([e for e in og if e['tur'] == 'altyazi'])
    if alt:   # altyazi konusmayla birlikte akar: okuma suresi / ses bitmeden olcusu anlamsiz (tek kelimelik altyazi hep "kisa")
        for k in ('okunmadan_kaybolan', 'okunmadan_oran', 'ses_bitmeden', 'ses_bitmeden_oran', 'ihtiyac_medyan'):
            alt.pop(k, None)
    # yazi = kurgu yazilari (kart + etiket; goruntu ici, altyazi, kalici haric) · sesli = bunlardan seslendirmede gecenler
    # (senkron olculeri: gecikme, ses bitmeden kaybolma yalniz bunlarda anlamli)
    return {'yazi': grup(yazi), 'kart': grup([e for e in yazi if e['tur'] == 'baslik/kart_yazisi']),
            'sesli': grup([e for e in yazi if e['eslesme'] >= 0.5]), 'altyazi': alt,
            'tur_dagilimi': dict(Counter(e['tur'] for e in og))}


# ---------------------------------------------------------------- rapor
def md_yaz(r, yol):
    oz = r['ozet']
    L = [f"# Yazi-ses senkronu — {os.path.basename(oz['video'])}", '',
         f"Aralik {oz['aralik'][0]:.0f}-{oz['aralik'][1]:.0f} sn · adim {oz['adim']} sn · {oz['ornek_kare']} kare, {oz['ocr_cagri']} OCR · "
         f"kelimeler: {oz['kelime_kaynagi']} ({oz['kelime_adet']})", '',
         'Tur dagilimi: ' + ', '.join(f'{k} {v}' for k, v in oz['tur_dagilimi'].items()), '',
         'yazi = kurgu yazilari (kart + etiket; goruntu ici yazi, altyazi, kalici logo haric) · sesli = bunlardan seslendirmede gecenler', '',
         '| olcu | yazi | kart | sesli | altyazi |', '|---|---|---|---|---|']
    alan = [('adet', 'adet'), ('dakikada', 'dakikada'), ('ekran_sure_medyan', 'ekran suresi medyan (sn)'),
            ('ekran_sure_p25', 'ekran suresi p25'), ('ekran_sure_p75', 'ekran suresi p75'), ('kelime_medyan', 'kelime medyan'),
            ('ihtiyac_medyan', 'okuma ihtiyaci medyan'), ('okunmadan_kaybolan', 'okunmadan kaybolan'), ('okunmadan_oran', 'okunmadan oran'),
            ('seste_karsilik_oran', 'seste karsiligi olan'), ('gecikme_medyan', 'gecikme medyan (sn, eksi = yazi once)'),
            ('gecikme_p25', 'gecikme p25'), ('gecikme_p75', 'gecikme p75'), ('gec_gelen_oran', '> 0,6 sn gec gelen'),
            ('ses_bitmeden', 'ses bitmeden kaybolan'), ('ses_bitmeden_oran', 'ses bitmeden oran (sesli icinde)'), ('bos_ekran_medyan', 'yazisiz ara medyan (sn)')]
    for k, ad in alan:
        L.append(f"| {ad} | " + ' | '.join('-' if not oz.get(g) or oz[g].get(k) is None else str(oz[g][k]) for g in ('yazi', 'kart', 'sesli', 'altyazi')) + ' |')
    sorun = [e for e in r['ogeler'] if e['tur'] in ('baslik/kart_yazisi', 'kucuk_yazi/etiket/kaynak') and
             (e['okunmadan'] or e['ses_bitmeden'] or (e['gecikme'] or 0) > 0.6)]
    L += ['', f'## Sorunlu yazilar ({len(sorun)})', '']
    for e in sorun:
        neden = [f"ekranda {e['sure']} sn < {e['ihtiyac']} sn" if e['okunmadan'] else '',
                 f"{e['gecikme']:+.2f} sn gec" if (e['gecikme'] or 0) > 0.6 else '',
                 f"ses {e['soylenme_son']}s'de bitiyor, yazi {e['bit']}s'de cikiyor" if e['ses_bitmeden'] else '']
        L.append(f"- {e['bas']:.2f}s \"{e['metin'][:60]}\" ({e['tur']}) — " + ' · '.join(x for x in neden if x))
    L += ['', '## Ogeler (goruntu ici yazi haric; yalniz json dosyasinda)', '', '| bas | bit | sure | ihtiyac | eslesme | gecikme | tur | yer | boyut % | metin |', '|---|---|---|---|---|---|---|---|---|---|']
    for e in [e for e in r['ogeler'] if e['tur'] != 'goruntu_ici'][:600]:
        g = '' if e['gecikme'] is None else f"{e['gecikme']:+.2f}"
        L.append(f"| {e['bas']:.2f} | {e['bit']:.2f} | {e['sure']} | {e['ihtiyac']} | {e['eslesme']} | {g} | {e['tur']} | {e['yer']} | {e['boyut_yuzde']} | {e['metin'][:60].replace('|', '/')} |")
    open(yol, 'w', encoding='utf-8').write('\n'.join(L) + '\n')


def ornek_sayfa(video, og, adet, yol, W0, H0):
    from PIL import Image, ImageDraw, ImageFont
    asil = [e for e in og if e['tur'] in ('baslik/kart_yazisi', 'kucuk_yazi/etiket/kaynak')]
    alt = [e for e in og if e['tur'] == 'altyazi']
    asil += alt[::max(1, len(alt) // 2)][:2] if alt else []          # altyazidan en cok 2 ornek
    sorun = [e for e in asil if e['okunmadan'] or e['ses_bitmeden'] or (e['gecikme'] or 0) > 0.6]
    sec = sorun[:adet // 2]
    diger = [e for e in asil if e not in sec]
    k = min(len(diger), adet - len(sec))
    sec += [diger[int(i * len(diger) / k)] for i in range(k)] if k > 0 else []
    sec = sorted({id(e): e for e in sec}.values(), key=lambda e: e['bas'])
    if not sec:
        return
    tw, th = 480, int(480 * H0 / W0)
    try:
        f = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
    except OSError:
        f = ImageFont.load_default()
    kol = 3
    satir = math.ceil(len(sec) / kol)
    sayfa = Image.new('RGB', (kol * tw, satir * (th + 58)), (20, 20, 20))
    for i, e in enumerate(sec):
        t = (e['bas'] + e['bit']) / 2
        r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-vf', f'scale={tw}:{th}',
                            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
        if len(r.stdout) < tw * th * 3:
            continue
        im = Image.frombytes('RGB', (tw, th), r.stdout[:tw * th * 3])
        d = ImageDraw.Draw(im)
        x, y, w, h = e['kutu']
        renk = (255, 60, 60) if e in sorun else (60, 220, 90)
        d.rectangle([x * tw, y * th, (x + w) * tw, (y + h) * th], outline=renk, width=2)
        X, Y = (i % kol) * tw, (i // kol) * (th + 58)
        sayfa.paste(im, (X, Y))
        d = ImageDraw.Draw(sayfa)
        g = '-' if e['gecikme'] is None else f"{e['gecikme']:+.2f}"
        d.text((X + 6, Y + th + 4), f"{e['bas']:.2f}-{e['bit']:.2f}s  ekranda {e['sure']}/{e['ihtiyac']} sn  gecikme {g}  {e['tur'][:12]}", fill=renk, font=f)
        d.text((X + 6, Y + th + 24), e['metin'][:52], fill=(230, 230, 230), font=f)
    sayfa.save(yol, quality=85)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--kelimeler')
    ap.add_argument('--yuzde', type=float, default=30)
    ap.add_argument('--bas', type=float, default=0)
    ap.add_argument('--son', type=float, default=0)
    ap.add_argument('--adim', type=float, default=0.25)
    ap.add_argument('--dil')
    ap.add_argument('--cikti')
    ap.add_argument('--ornek', type=int, default=12)
    ap.add_argument('--onbellek', help='ham OCR onbellegi (varsayilan <cikti>/yazi-senkron-ocr.json; 0 = yok). Ayni video+aralikta OCR atlanir')
    ap.add_argument('--isci', type=int, default=0, help='paralel OCR sureci (varsayilan: cekirdek/4, en cok 6)')
    a = ap.parse_args()
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration',
                                   '-of', 'json', a.video], capture_output=True, text=True, encoding='utf-8').stdout)
    W0, H0 = j['streams'][0]['width'], j['streams'][0]['height']
    sure = float(j['format']['duration'])
    bas = a.bas
    son = a.son or (bas + (sure - bas) * min(100, a.yuzde) / 100)
    son = min(son, sure)
    cikti = a.cikti or os.path.dirname(os.path.abspath(a.video))
    os.makedirs(cikti, exist_ok=True)
    kelimeler, kaynak = kelime_yukle(a.kelimeler, a.video, bas, son, a.dil)
    kelimeler = [w for w in kelimeler if bas - 10 <= w['bas'] <= son + 10]
    ob = None if a.onbellek == '0' else (a.onbellek or os.path.join(cikti, 'yazi-senkron-ocr.json'))
    izler, kare, cagri = tara(a.video, bas, son, a.adim, W0, H0, a.isci, ob)
    og = ogeler_kur(izler, kelimeler, a.adim, bas, son)
    oz = {'video': os.path.abspath(a.video), 'aralik': [round(bas, 2), round(son, 2)], 'video_sure': round(sure, 2), 'adim': a.adim,
          'ornek_kare': kare, 'ocr_cagri': cagri, 'kelime_kaynagi': kaynak, 'kelime_adet': len(kelimeler), 'oge': len(og)}
    oz.update(ozetle(og, son - bas))
    r = {'ozet': oz, 'ogeler': og}
    jp = os.path.join(cikti, 'yazi-senkron.json')
    json.dump(r, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    md_yaz(r, os.path.join(cikti, 'YAZI-SENKRON.md'))
    if a.ornek:
        try:
            ornek_sayfa(a.video, og, a.ornek, os.path.join(cikti, 'yazi-senkron-ornek.jpg'), W0, H0)
        except Exception as h:
            print(f'UYARI ornek sayfa yazilamadi: {h}')
    y = oz.get('yazi') or {}
    print(f"YAZI-SENKRON {len(og)} oge ({cagri} OCR / {kare} kare, kelimeler: {kaynak}) -> {jp}")
    if y:
        print(f"  yazi {y['adet']}: ekranda medyan {y['ekran_sure_medyan']} sn · okunmadan kaybolan {y['okunmadan_kaybolan']} "
              f"· gecikme medyan {y['gecikme_medyan']} sn · ses bitmeden kaybolan {y['ses_bitmeden']}")
    if not kelimeler:
        print('  UYARI kelime zamani yok: eslesme/gecikme olculmedi')


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
