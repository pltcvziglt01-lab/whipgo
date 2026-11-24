#!/usr/bin/env python3
"""STIL DNA — rakibin olculmus edit dilinden, her bilesen ekseninde FARKLI ve kanalin onceki videolarindan da farkli
bir yuzey secer. Iskelet (ritim, gecis suresi/sikligi, SFX orani) rakipten alinir; yuzey repertuardan secilir.
Klasik "Claude gorunumu" (gece-kirmizi palet + asagidan-yay giris + yay-yumusak hareket + her karede gren+vinyet +
her fotoda ken-burns-ice) hicbir zaman secilmez.

Kullanim:
  py stil_dna.py --rakip @Handle                         # kutuphanedeki kanal.json'dan (en hizli)
  py stil_dna.py --rakip-json a/edit-dili.json b/edit-dili.json
  py stil_dna.py --rakip @Handle --gecmis v01/stil-dna.json v02/stil-dna.json v03/stil-dna.json --cikti v04/
  py stil_dna.py --rakip @Handle --kilit palet,font --gecmis ...   # kanal kimligi: palet+font son videodan sabit
  py stil_dna.py --rakip @Handle --secenek 2 --tohum v04          # A/B iki secenek (varsayilan 2)
Ciktilar: <cikti>/stil-dna-A.json (B...), <cikti>/STIL-DNA.md (rakip vs secenekler tablosu + kanit).
Videonun TSX'i stil-dna.json'u okur: repertuar/Dna.tsx (DnaDizi, DnaMedya, DnaBaslik, DnaAltyazi, DnaKart...).
"""
import argparse, glob, hashlib, json, os, random, re, sys

BURASI = os.path.dirname(os.path.abspath(__file__))

# ---------------- yol bulma ----------------
def kutuphane_bul(arg=None):
    aday = [arg, os.environ.get('EDIT_KUTUPHANE'),
            r"G:\Drive'ım\edit kutuphane", r"G:\My Drive\edit kutuphane",
            os.path.expanduser(r"~\Google Drive\edit kutuphane"), os.path.expanduser(r"~\My Drive\edit kutuphane"),
            os.path.dirname(BURASI)]
    aday += glob.glob(r"G:\.shortcut-targets-by-id\*\edit kutuphane")
    for a in aday:
        if a and os.path.isdir(os.path.join(a, 'kanallar')):
            return a
    return None

def varlik_bul(arg=None):
    """repo varlik/ klasoru (katalog.json + preset-dili-remotion.json). Yoksa paket ogeleri atlanir."""
    for a in [arg, os.environ.get('YT_URETIM') and os.path.join(os.environ['YT_URETIM'], 'varlik'),
              os.path.join(BURASI, '..', '..', '..', 'varlik'), r'C:\otomasyon\yt-uretim\varlik']:
        if a and os.path.isdir(a):
            a = os.path.abspath(a)
            kj, pj = os.path.join(a, 'katalog.json'), os.path.join(a, 'preset-dili-remotion.json')
            kat = json.load(open(kj, encoding='utf-8')) if os.path.isfile(kj) else {}
            pre = json.load(open(pj, encoding='utf-8')) if os.path.isfile(pj) else []
            # yalniz diskte gercekten var olan (release'den indirilmis) ve olculmus videolar
            for tur in ('arkaplan', 'filmburn'):
                kat[tur] = {k: v for k, v in (kat.get(tur) or {}).items()
                            if os.path.isfile(os.path.join(a, tur, k + '.mp4')) and v.get('parlaklik') is not None and not v.get('kullanma')}
            return {'yol': a, 'katalog': kat, 'presetler': pre}
    return {'yol': None, 'katalog': {'arkaplan': {}, 'filmburn': {}}, 'presetler': []}

def repertuar_bul(arg, kut):
    aday = [arg, os.environ.get('REPERTUAR'),
            os.path.join(BURASI, '..', '..', '..', 'repertuar'), r'C:\otomasyon\yt-uretim\repertuar',
            kut and os.path.join(kut, 'remotion', 'repertuar'),
            os.path.join(os.path.dirname(BURASI), 'remotion', 'repertuar'),
            os.path.join(os.path.dirname(BURASI), 'assets', 'repertuar'),
            os.path.join(os.path.dirname(BURASI), 'src', 'repertuar')]
    for a in aday:
        if a and os.path.isfile(os.path.join(a, 'Arkaplan.tsx')):
            return a
    sys.exit('HATA: repertuar klasoru bulunamadi (Arkaplan.tsx). --repertuar ver.')

def tsx_liste(rep, dosya, ad):
    s = open(os.path.join(rep, dosya), encoding='utf-8').read()
    m = re.search(r'export const %s = \[(.*?)\] as const' % ad, s, re.S)
    if not m:
        sys.exit(f'HATA: {dosya} icinde {ad} yok')
    return re.findall(r"'([^']+)'", m.group(1))

def tsx_sozluk_anahtar(rep, dosya, ad):
    s = open(os.path.join(rep, dosya), encoding='utf-8').read()
    m = re.search(r'export const %s[^=]*= \{(.*?)\n\};' % ad, s, re.S)
    return re.findall(r"^\s*'([^']+)':", m.group(1), re.M)

# ---------------- kanallar arasi hafiza ----------------
ATLA_KLASOR = {'node_modules', '.git', 'arsiv', 'public', 'out', 'kaynak', 'dvids', 'foto', 'yt-uretim', 'dist', '__pycache__', 'kontakt'}

def kanallar_koku(arg=None):
    """kanal klasorlerinin koku (C:/otomasyon). Repo kokunun bir ustu."""
    for a in [arg, os.environ.get('YT_KANALLAR'), os.path.join(BURASI, '..', '..', '..', '..'), r'C:\otomasyon']:
        if a and os.path.isdir(a):
            return os.path.abspath(a)
    return None

def kanal_adi(kok, yol):
    try:
        rel = os.path.relpath(os.path.abspath(yol), kok)
    except ValueError:
        return None
    if rel.startswith('..'):
        return None
    return rel.split(os.sep)[0]

def secilmis_dnalar(kok):
    """kanal -> [(mtime, yol, dna)] eskiden yeniye. Yalniz secilmis DNA'lar (stil-dna.json / vNN-stil-dna.json), -A/-B secenekleri haric."""
    out = {}
    if not kok:
        return out
    for kanal in sorted(os.listdir(kok)):
        kk = os.path.join(kok, kanal)
        if kanal in ATLA_KLASOR or kanal.startswith(('.', '_')) or not os.path.isdir(kk):
            continue
        gorulen = set()
        for yol, dirs, files in os.walk(kk):
            if yol[len(kk):].count(os.sep) >= 5:
                dirs[:] = []
            dirs[:] = [d for d in dirs if d not in ATLA_KLASOR and not d.startswith('.')]
            for fn in files:
                if not fn.endswith('stil-dna.json') or re.search(r'stil-dna-[A-Z]\.json$', fn):
                    continue
                fp = os.path.join(yol, fn)
                try:
                    d = json.load(open(fp, encoding='utf-8'))
                except Exception:
                    continue
                if not isinstance(d, dict) or 'palet' not in d:
                    continue
                anahtar = json.dumps({k: d.get(k) for k in ('palet', 'arkaplan', 'gecis', 'tohum')}, sort_keys=True)
                if anahtar in gorulen:  # ayni DNA'nin kopyasi (ornek: motion/src/v09-stil-dna.json)
                    continue
                gorulen.add(anahtar)
                out.setdefault(kanal, []).append((os.path.getmtime(fp), fp, d))
        if kanal in out:
            out[kanal].sort(key=lambda x: x[0])
    return out

# gorunur eksenler: izleyicinin ilk bakista tanidigi yuzey (kartlar, zemin, cerceve, yazi). Kanallar arasi karsilastirma bunlarla.
GORUNUR = ['palet', 'arkaplan', 'cerceve', 'baslik', 'altyazi', 'altbant', 'sayi', 'alinti', 'liste', 'zaman']
ESIK_KANAL_AYNI = 2  # baska bir kanalin son DNA'siyla en fazla 2 gorunur eksen ayni olabilir
# kagit gorunumu: bir DNA'da en fazla bir kagit ogesi (yoksa her video "kagit" kokar)
KAGIT = {'arkaplan': {'kagit', 'kareli-defter'}, 'doku': {'kagit-ust'}, 'alinti': {'kagit-not', 'daktilo-belge'}}

def _set(v):
    return {(':'.join(x.split(':')[:2]) if ':' in x else x) for x in (v if isinstance(v, list) else [v]) if isinstance(x, str)}

def ayni_gorunur(a, b):
    """iki DNA'da ayni olan gorunur eksenler (liste eksenlerinde ortak oge varsa ayni sayilir)."""
    return [e for e in GORUNUR if a.get(e) is not None and _set(a.get(e)) & _set(b.get(e))]

def kagit_sayisi(d):
    n = 0
    for e, xs in KAGIT.items():
        n += len(_set(d.get(e)) & xs)
    return n

# ---------------- aileler ve kutuphane teknik eslemesi ----------------
GECIS_AILE = {'sert': 'sert', 'cozunme': 'karartma', 'bulaniklik': 'karartma', 'isik-patlamasi': 'flas', 'film-yanigi': 'flas',
              'glitch-rgb': 'glitch', 'whip-sol': 'hareket', 'whip-yukari': 'hareket', 'kaydirma-itme': 'hareket', 'zoom-darbe': 'zoom',
              'maske-daire': 'maske', 'maske-capraz': 'maske', 'maske-seritler': 'maske', 'perde': 'maske', 'kart-cevirme': '3b', 'tv-kapanma': 'tv'}
RAKIP_GECIS_AILE = [('siyaha', 'karartma'), ('cozunme', 'karartma'), ('beyaza', 'flas'), ('isik', 'flas'), ('flas', 'flas'), ('glitch', 'glitch'),
                    ('kaydirma', 'hareket'), ('whip', 'hareket'), ('itme', 'hareket'), ('zoom_gecis', 'zoom'), ('wipe', 'maske'), ('maske', 'maske')]
CERCEVE_RAKIP = {'cerceveli_bulanik': 'bulanik-kopya', 'cerceveli_duz_renk': 'inset-golge', 'letterbox': 'letterbox', 'bolunmus': 'bolunmus',
                 'cerceveli_doku': 'inset-golge'}
ALTYAZI_AILE = {'kelime-pop': 'kelime', 'tek-kelime': 'kelime', 'vurgu-kalem': 'vurgulu', 'renkli-aktif': 'vurgulu', 'karaoke': 'vurgulu',
                'kutulu': 'kutulu', 'sinema': 'sinema', 'yok': 'yok'}
PALET_SINIF = {'kum-terrakota': 'acik', 'gazete-sepya': 'acik', 'buz-kobalt': 'acik', 'nane-krem': 'acik', 'pastel-lila': 'acik', 'beton-sari': 'acik',
               'synth-mor': 'koyu-renkli', 'orman-altin': 'koyu-renkli', 'okyanus-mercan': 'koyu-renkli', 'bordo-krem': 'koyu-renkli', 'kahve-turuncu': 'koyu-renkli',
               'zeytin-askeri': 'koyu-notr', 'grafit-neon': 'koyu-notr', 'gece-turkuaz': 'koyu-notr',
               'kirmizi-zemin': 'doygun-zemin', 'mavi-zemin': 'doygun-zemin', 'gece-kirmizi': 'koyu-notr'}
# repertuar ogesi -> kutuphane teknikler/<ad> (kanit sayimi icin)
TEKNIK = {
    'gecis': {'cozunme': 'cozunme', 'bulaniklik': 'cozunme', 'isik-patlamasi': 'isik-patlamasi-flas', 'film-yanigi': 'film-yanigi-light-leak', 'glitch-rgb': 'glitch-rgb',
              'whip-sol': 'whip-pan', 'whip-yukari': 'whip-pan', 'kaydirma-itme': 'kaydirma-itme', 'zoom-darbe': 'zoom-gecis', 'maske-daire': 'maske-wipe',
              'maske-capraz': 'maske-wipe', 'maske-seritler': 'maske-wipe', 'perde': 'maske-wipe', 'kart-cevirme': None, 'tv-kapanma': None, 'sert': 'sert-kesim'},
    'cerceve': {'bulanik-kopya': 'cerceveli-bulanik-arka-plan', 'inset-golge': 'kosesiz-yuvarlak-kare', 'letterbox': 'letterbox-sinematik', 'bolunmus': 'bolunmus-ekran',
                'kolaj': 'kolaj-izgara', 'polaroid': 'cerceveli-doku', 'tv-crt': None, 'pencere': None, 'film-seridi': 'arsiv-film-greni', 'yuvarlak-yan': 'kosesiz-yuvarlak-kare', 'tam': 'tam-ekran'},
    'altyazi': {'kelime-pop': 'kelime-kelime-altyazi', 'tek-kelime': 'kelime-kelime-altyazi', 'vurgu-kalem': 'vurgulu-kelime-altyazi', 'renkli-aktif': 'vurgulu-kelime-altyazi',
                'karaoke': 'vurgulu-kelime-altyazi', 'kutulu': 'kutulu-altyazi', 'sinema': 'kisa-ifade-altyazi'},
    'baslik': {'daktilo': 'daktilo-yazi', 'harf-aralik': 'harf-aralikli-baslik'},
    'kamera': {'ken-burns-ice': 'ken-burns-ice', 'ken-burns-disa': 'ken-burns-disa', 'pan-sol': 'yatay-kaydirma', 'pan-sag': 'yatay-kaydirma', 'paralaks-cift': 'paralaks-2-5d',
               'el-kamerasi': 'ekran-sarsintisi', 'sabit': 'sabit-kare'},
    'doku': {'gren': 'arsiv-film-greni', 'vinyet': 'vinyet', 'film-cizik': 'arsiv-film-greni', 'isik-sizintisi': 'film-yanigi-light-leak'},
    'altbant': {'*': 'alt-bant-lower-third'}, 'sayi': {'*': 'sayi-karti'}, 'alinti': {'*': 'alinti-karti'}, 'liste': {'*': 'madde-listesi-karti'}, 'zaman': {'*': 'zaman-cizelgesi'},
}
KLASIK = {'palet': 'gece-kirmizi', 'baslik': 'asagidan-yay', 'hareket': 'yay-yumusak'}
# --ton: nise uygun olmayan yuzeyi eler (savas belgeseline pastel lila, saglik kanalina CRT tarama gelmesin)
TON = {
    'ciddi': {'palet': ['gazete-sepya', 'zeytin-askeri', 'bordo-krem', 'gece-turkuaz', 'grafit-neon', 'kahve-turuncu', 'okyanus-mercan', 'beton-sari', 'kum-terrakota', 'buz-kobalt', 'orman-altin'],
              'font': ['editoryal-serif', 'klasik-serif', 'antik-baslik', 'teknik-dar', 'damga-stencil', 'gazete', 'poster-dar', 'grotesk-modern'],
              'arkaplan_disi': ['bokeh', 'sekil-yuzen', 'seritler', 'izgara-perspektif', 'kareli-defter', 'dama-kayan', 'aurora'],
              'hareket_disi': ['yay-esnek', 'geri-sekme']},
    'enerjik': {'palet': None, 'font': ['poster-dar', 'sport-teko', 'geometrik-kalin', 'grotesk-modern', 'retro-slab', 'damga-stencil', 'teknik-dar'],
                'arkaplan_disi': ['kagit', 'kareli-defter'], 'hareket_disi': ['dogrusal-mekanik']},
    'sakin': {'palet': ['kum-terrakota', 'gazete-sepya', 'buz-kobalt', 'nane-krem', 'pastel-lila', 'orman-altin', 'okyanus-mercan', 'bordo-krem'],
              'font': ['yumusak-sans', 'editoryal-serif', 'grotesk-modern', 'klasik-serif', 'geometrik-kalin'],
              'arkaplan_disi': ['crt-tarama', 'radar-halka', 'hiz-cizgileri', 'izgara-perspektif', 'seritler', 'altigen', 'spot-isik'],
              'hareket_disi': ['ustel-sert', 'adim-stop', 'dogrusal-mekanik']},
}

def kanit(kut, eksen, oge):
    if not kut:
        return {'teknik': None, 'kanal_sayisi': 0, 'ornek': []}
    m = TEKNIK.get(eksen, {})
    t = m.get(oge, m.get('*'))
    if not t:
        return {'teknik': None, 'kanal_sayisi': 0, 'ornek': []}
    d = os.path.join(kut, 'teknikler', t)
    g = sorted(glob.glob(os.path.join(d, 'gozlem-*.md')))
    return {'teknik': t, 'kanal_sayisi': len(g), 'ornek': [os.path.basename(x)[7:-3] for x in g[:3]]}

# ---------------- rakip imzasi ----------------
TON['gizem'] = {
    'palet': ['gece-turkuaz', 'grafit-neon', 'bordo-krem', 'zeytin-askeri', 'okyanus-mercan', 'kahve-turuncu', 'gazete-sepya'],
    'font': ['editoryal-serif', 'klasik-serif', 'antik-baslik', 'damga-stencil', 'gazete', 'teknik-dar', 'grotesk-modern'],
    'arkaplan_disi': ['bokeh', 'sekil-yuzen', 'seritler', 'izgara-perspektif', 'kareli-defter', 'dama-kayan', 'aurora', 'gradyan-akis', 'hiz-cizgileri'],
    'hareket_disi': ['yay-esnek', 'geri-sekme', 'adim-stop']}
# konu -> ton anahtar kelimeleri (EN/DE/TR/ES). Konuya uymayan edit dili secilmez (askeri konu + neseli edit = YOK)
TON_KELIME = {
    'ciddi': ['war', 'military', 'army', 'soldier', 'ww2', 'wwii', 'ww1', 'battle', 'weapon', 'rifle', 'gun', 'pistol', 'tank', 'navy', 'marine',
              'history', 'historic', 'empire', 'documentary', 'politic', 'economy', 'finance', 'inflation', 'recession', 'crisis', 'veteran',
              'krieg', 'soldat', 'waffe', 'armee', 'geschichte', 'savas', 'savaş', 'asker', 'ordu', 'silah', 'tarih', 'guerra', 'ejercito',
              'ejército', 'arma', 'historia', 'militar', 'pow', 'prisoner', 'nuclear', 'missile', 'fighter', 'bomber', 'warship'],
    'gizem': ['crime', 'murder', 'killer', 'mystery', 'unsolved', 'haunted', 'ghost', 'cryptid', 'paranormal', 'disappear', 'vanish', 'cold case',
              'conspiracy', 'creepy', 'horror', 'dark', 'secret', 'forbidden', 'abandoned', 'cinayet', 'gizem', 'korku', 'kayıp', 'kayip',
              'misterio', 'crimen', 'verbrechen', 'mord', 'geheimnis', 'unexplained', 'ufo', 'alien'],
    'sakin': ['health', 'doctor', 'senior', 'retire', 'garden', 'travel', 'cozy', 'relax', 'farm', 'recipe', 'cooking', 'nature', 'dog', 'cat',
              'hund', 'katze', 'house', 'home', 'akiya', 'village', 'countryside', 'sleep', 'meditation', 'gesundheit', 'garten', 'sağlık',
              'saglik', 'bahçe', 'bahce', 'köy', 'koy', 'salud', 'jardín', 'jardin', 'mascota', 'wellness', 'vitamin', 'diet'],
    'enerjik': ['tech', 'gadget', 'car', 'cars', 'sport', 'football', 'soccer', 'gaming', 'game', 'top 10', 'top10', 'ranking', 'ranked',
                'cheapest', 'fastest', 'biggest', 'vs', 'challenge', 'viral', 'hack', 'auto', 'spor', 'futbol', 'oyun', 'teknoloji', 'araba',
                'deportes', 'coche', 'technik', 'machine', 'engineering', 'build', 'diy', 'satisfying'],
}


def ton_bul(metin):
    """metin (konu + rakip nisi + basliklar) -> (ton, puanlar, eslesenler). Esitlik/yoksa 'ciddi' (en guvenli)."""
    m = ' ' + (metin or '').lower() + ' '
    puan, esl = {}, {}
    for t, ks in TON_KELIME.items():
        bul = [k for k in ks if (' ' + k) in m or (k + 's ') in m]
        puan[t], esl[t] = len(bul), bul
    sira = sorted(puan, key=lambda t: (-puan[t], ['ciddi', 'gizem', 'enerjik', 'sakin'].index(t)))
    return (sira[0] if puan[sira[0]] else 'ciddi'), puan, esl


def kanal_metni(kd):
    """kutuphane kanal klasoru -> nis satiri + video basliklari + etiket/not (ton ve nis eslestirmesi icin)"""
    par = []
    ed = os.path.join(kd, 'EDIT-DILI.md')
    if os.path.isfile(ed):
        bas = open(ed, encoding='utf-8', errors='replace').read().splitlines()[:4]
        par += [x for x in bas if 'Niş' in x or 'Nis' in x or 'nis' in x.lower() or x.startswith('#')]
    kj = os.path.join(kd, 'kanal.json')
    if os.path.isfile(kj):
        try:
            k = json.load(open(kj, encoding='utf-8'))
            par += [v.get('baslik') or '' for v in k.get('videolar') or []] + [str(k.get('etiket') or ''), str(k.get('not') or '')]
        except ValueError:
            pass
    return ' | '.join(par)


def nis_kanallari(kut, rakip, ton, anahtar, n=12):
    """kutuphanede ayni tondaki (tercihen ayni konudaki) kanallarin olculmus yuzeyi -> secime agirlik + STIL-DNA kaniti"""
    if not kut:
        return []
    akel = {w for w in re.findall(r'[a-zçğıöşü0-9]{4,}', (anahtar or '').lower())} - {'with', 'that', 'this', 'from', 'video', 'kanal', 'edit', 'format'}
    out = []
    for kd in glob.glob(os.path.join(kut, 'kanallar', '*')):
        ad = os.path.basename(kd)
        if rakip and ad.lower() == rakip.lower():
            continue
        mt = kanal_metni(kd)
        if not mt:
            continue
        t, _, _ = ton_bul(mt)
        if t != ton:
            continue
        ortak = len(akel & set(re.findall(r'[a-zçğıöşü0-9]{4,}', mt.lower())))
        try:
            v = (json.load(open(os.path.join(kd, 'kanal.json'), encoding='utf-8')).get('videolar') or [{}])[0]
        except (ValueError, OSError):
            continue
        gec = (v.get('gecis') or {}).get('dagilim') or {}
        aile = set()
        for g, o in gec.items():
            if g.endswith('?') or o < 0.03 or g.startswith('sert'):
                continue
            for an, ai in RAKIP_GECIS_AILE:
                if an in g:
                    aile.add(ai)
        renk = v.get('renk') or {}
        parl, doy = renk.get('parlaklik', 0.4), renk.get('doygunluk', 0.3)
        ps = 'acik' if parl > 0.55 else ('koyu-notr' if doy < 0.4 else 'koyu-renkli')
        cer = {CERCEVE_RAKIP[k] for k, o in (v.get('duzen') or {}).items() if k in CERCEVE_RAKIP and o >= 0.04}
        out.append({'kanal': ad, 'ortak': ortak, 'oran': v.get('oran'), 'gecis_aileleri': sorted(aile), 'palet_sinif': ps, 'cerceve': sorted(cer)})
    out.sort(key=lambda x: (-x['ortak'], -(x['oran'] or 0)))
    return out[:n]


def nis_agirlik(nis):
    """nis kanallarinda gorulme sikligi -> carpan (1 + 2*oran). Rakibin kendi ailesi zaten yasak; bu yalniz nise uygun olani one cikarir."""
    if not nis:
        return {}, {}, {}
    n = len(nis)
    pa, ga, ca = {}, {}, {}
    for x in nis:
        pa[x['palet_sinif']] = pa.get(x['palet_sinif'], 0) + 1 / n
        for a in x['gecis_aileleri']:
            ga[a] = ga.get(a, 0) + 1 / n
        for c in x['cerceve']:
            ca[c] = ca.get(c, 0) + 1 / n
    return pa, ga, ca


def rakip_oku(kut, handle, jsonlar):
    vids = []
    if handle:
        h = handle if handle.startswith('@') or handle.startswith('UC') else '@' + handle
        kj = os.path.join(kut or '', 'kanallar', h, 'kanal.json')
        if not os.path.isfile(kj):
            sys.exit(f'HATA: {kj} yok. Once kanal_isle.py {h} --adet 3 calistir.')
        k = json.load(open(kj, encoding='utf-8'))
        for v in k.get('videolar') or []:
            ej = os.path.join(kut, 'kanallar', h, f"video-{v.get('video')}", 'editdili', 'edit-dili.json')
            vids.append(('kanal', v, json.load(open(ej, encoding='utf-8')) if os.path.isfile(ej) else None))
    for j in jsonlar or []:
        e = json.load(open(j, encoding='utf-8'))
        vids.append(('json', None, e))
    if not vids:
        sys.exit('HATA: rakip verisi yok (--rakip @Handle ya da --rakip-json).')

    def topla(alan_kanal, alan_json):
        top, n = {}, 0
        for _, v, e in vids:
            d = (v or {}).get(alan_kanal) if v else None
            if d is None and e:
                d = alan_json(e)
            if isinstance(d, dict) and isinstance(d.get('dagilim'), dict):
                d = d['dagilim']
            if d:
                n += 1
                for a, b in d.items():
                    if isinstance(b, (int, float)):
                        top[a] = top.get(a, 0) + b
        return {a: round(b / max(1, n), 3) for a, b in top.items()}

    gec = topla('gecis', lambda e: (e.get('gecis_ozet') or {}).get('dagilim'))
    duz = topla('duzen', lambda e: (e.get('duzen') or {}).get('duzen_dagilimi'))
    renk = topla('renk', lambda e: e.get('renk'))
    oz = [((e or {}).get('gecis_ozet') or (v or {}).get('gecis') or {}) for _, v, e in vids]
    yum_oran = med([o.get('yumusak_gecis_orani') for o in oz])
    yum_ms = med([o.get('yumusak_medyan_ms') for o in oz])
    ilk30 = [((v or {}).get('ilk30') or ((e or {}).get('ozet') or {}).get('ilk30') or {}) for _, v, e in vids]
    tum = [(((e or {}).get('ozet') or {}).get('analiz_tum') or {}) for _, v, e in vids]
    sfx = med([((e or {}).get('ses') or (v or {}).get('ses') or {}).get('kesimde_ses_vurgusu_orani') for _, v, e in vids])
    # altyazi: yakilmis altyazi = dakikada >= 8 oge (kutuphane_ara.py ile ayni esik)
    hiz, alt = [], {}
    for _, v, e in vids:
        if not e:
            continue
        a = e.get('analiz_aralik_sn') or [0, 600]
        dk = max(0.5, (a[1] - a[0]) / 60)
        hiz.append((((e.get('yazi') or {}).get('altyazi_ogesi')) or 0) / dk)
        alt = (e.get('yazi') or {}).get('altyazi') or alt
    alt_var = bool(hiz) and med(hiz) >= 8
    if not alt_var:
        alt_aile = 'yok'
    elif (alt.get('kutulu_olasi') or 0) > 0.5:
        alt_aile = 'kutulu'
    elif (alt.get('vurgulu_kelime_olasi') or 0) > 0.3:
        alt_aile = 'vurgulu'
    elif (alt.get('kelime_ekran_medyan') or 9) <= 2:
        alt_aile = 'kelime'
    else:
        alt_aile = 'sinema'
    # gecis aileleri (>= %3, belirsiz '?' haric)
    gaile = set()
    for t, o in gec.items():
        if t.endswith('?') or o < 0.03 or t.startswith('sert') or t in ('ilk',):
            continue
        for anahtar, aile in RAKIP_GECIS_AILE:
            if anahtar in t:
                gaile.add(aile)
    # duzen -> bizim cerceve
    rc = {CERCEVE_RAKIP[k] for k, o in duz.items() if k in CERCEVE_RAKIP and o >= 0.04}
    parl, doy = renk.get('parlaklik', 0.4), renk.get('doygunluk', 0.3)
    psinif = 'acik' if parl > 0.55 else ('koyu-notr' if doy < 0.4 else 'koyu-renkli')
    if doy > 0.6 and parl > 0.35:
        psinif = 'doygun-zemin'
    doku = set()
    if (renk.get('vinyet_merkez_kose') or 1) > 1.4:
        doku.add('vinyet')
    if (renk.get('siyah_beyaz_orani') or 0) > 0.3:
        doku.update({'gren', 'film-cizik'})
    hareket = {}
    for i in ilk30:
        for a, b in (i.get('hareket_dagilimi') or {}).items():
            hareket[a] = hareket.get(a, 0) + b / max(1, len(ilk30))
    kam = set()
    if sum(b for a, b in hareket.items() if a.startswith('zoom+')) >= 0.2:
        kam.add('ken-burns-ice')
    if sum(b for a, b in hareket.items() if a.startswith('zoom-')) >= 0.2:
        kam.add('ken-burns-disa')
    return {
        'video_sayisi': len(vids),
        'iskelet': {'ilk30_medyan_sn': med([i.get('medyan_sn') for i in ilk30]), 'ilk30_kesim_dk': med([i.get('kesim_dk') for i in ilk30]),
                    'genel_medyan_sn': med([t.get('medyan_sn') for t in tum]), 'yumusak_gecis_orani': yum_oran, 'yumusak_medyan_ms': yum_ms, 'sfx_orani': sfx},
        'yuzey': {'gecis_dagilim': dict(sorted(gec.items(), key=lambda x: -x[1])[:6]), 'gecis_aileleri': sorted(gaile), 'duzen': duz, 'cerceve': sorted(rc),
                  'altyazi_aile': alt_aile, 'palet_sinif': psinif, 'parlaklik': parl, 'doygunluk': doy, 'doku': sorted(doku), 'kamera': sorted(kam)},
    }

def med(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)))
    if not xs:
        return None
    n = len(xs)
    return round(xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2, 3)

# ---------------- secim ----------------
def sec(r, havuz, yasak=(), gecmis=(), kullanim=None, n=1, aile=None, yasak_aile=(), agirlik=None, kacin=()):
    """havuzdan n oge: yasak/rakip ailesi disi; once kanalin son 3 videosunda VE diger kanallarin son DNA'sinda olmayanlar,
    sonra yalniz kanal gecmisinde olmayanlar, en son hepsi; az kullanilan agirlikli."""
    def uygun(x, kademe):
        if x in yasak:
            return False
        if aile and aile.get(x) in yasak_aile:
            return False
        if kademe <= 1 and x in gecmis:
            return False
        return not (kademe == 0 and x in kacin)
    for kademe in (0, 1, 2):
        aday = [x for x in havuz if uygun(x, kademe)]
        if len(aday) >= n:
            break
    if not aday:
        aday = [x for x in havuz if x not in yasak] or list(havuz)
    out = []
    while aday and len(out) < n:
        w = [(agirlik or {}).get(x, 1.0) / (1 + (kullanim or {}).get(x, 0)) for x in aday]
        x = r.choices(aday, weights=w)[0]
        out.append(x)
        aday = [y for y in aday if y != x and (not aile or aile.get(y) != aile.get(x) or len(aday) <= n)]
    return out

def dna_uret(rk, rep, kut, gecmis, kilit, tohum, onceki_secenekler, ton=None, vk=None, nis=None, diger=()):
    vk = vk or {'katalog': {'arkaplan': {}, 'filmburn': {}}, 'presetler': []}
    T = TON.get(ton or '', {})
    NP, NG, NC = nis_agirlik(nis or [])
    r = random.Random(int(hashlib.md5(tohum.encode()).hexdigest()[:8], 16))
    Y = rk['yuzey']
    L = lambda d, a: tsx_liste(rep, d, a)
    son = gecmis[-3:]
    g = lambda eksen: {x for d in son for x in (d.get(eksen) if isinstance(d.get(eksen), list) else [d.get(eksen)]) if x}
    # diger kanallarin son DNA'lari: ayni gorunumu baska kanalda tekrar etme
    k2 = lambda eksen: {x for d in diger for x in (d.get(eksen) if isinstance(d.get(eksen), list) else [d.get(eksen)]) if isinstance(x, str)}
    kul = {}
    for d in list(gecmis) + list(onceki_secenekler) + list(diger):
        for e, v in d.items():
            for x in (v if isinstance(v, list) else [v]):
                if isinstance(x, str):
                    kul[x] = kul.get(x, 0) + 1
    dna = {}
    # palet: rakibin sinifindan farkli sinif; klasik yasak
    paletler = [p for p in tsx_sozluk_anahtar(rep, 'temel.ts', 'PALETLER') if p != KLASIK['palet'] and (not T.get('palet') or p in T['palet'])]
    if 'palet' in kilit and gecmis:
        dna['palet'] = gecmis[-1]['palet']
    else:
        # renk konuya/nise uyar: nisteki siniflar one cikar; rakibin sinifi yasak degil ama geri planda (x0.35)
        dna['palet'] = sec(r, paletler, gecmis=g('palet'), kullanim=kul, kacin=k2('palet'),
                           agirlik={p: (1 + 2 * NP.get(PALET_SINIF.get(p), 0)) * (0.35 if PALET_SINIF.get(p) == Y['palet_sinif'] else 1) for p in paletler})[0]
    fontlar = [f for f in tsx_sozluk_anahtar(rep, 'temel.ts', 'FONTLAR') if not T.get('font') or f in T['font']]
    dna['font'] = gecmis[-1]['font'] if ('font' in kilit and gecmis) else sec(r, fontlar, gecmis=g('font'), kullanim=kul, kacin=k2('font'))[0]
    hareketler = [h for h in ['yay-esnek', 'kubik-hizli', 'ustel-sert', 'adim-stop', 'geri-sekme', 'dogrusal-mekanik'] if h not in T.get('hareket_disi', [])]
    dna['hareket'] = sec(r, hareketler, gecmis=g('hareket'), kullanim=kul, kacin=k2('hareket'))[0]
    ark = [x for x in L('Arkaplan.tsx', 'ARKAPLAN_TIPLERI') if x not in T.get('arkaplan_disi', [])]
    dna['arkaplan'] = sec(r, ark, gecmis=g('arkaplan'), kullanim=kul, n=3, kacin=k2('arkaplan'))          # [kart, cerceve, bolum]
    # paket videosu: palete uyan parlaklikta, az kullanilmis, iyi donen bir video bir rolu alir
    va = vk['katalog'].get('arkaplan') or {}
    if va and r.random() < 0.65:
        acik = PALET_SINIF.get(dna['palet']) == 'acik'
        uy = [k for k, v in va.items() if v.get('sinif') in (('acik', 'orta') if acik else ('koyu', 'orta'))
              and (not ton or ton in (v.get('ton') or [ton]))]
        once = {x.split(':')[1] for x in g('arkaplan') | k2('arkaplan') if x.startswith('video:')}
        once_aile = {va.get(x, {}).get('aile') for x in once}
        uy = [k for k in uy if k not in once and va[k].get('aile') not in once_aile] or [k for k in uy if k not in once] or uy
        if uy:
            w = [1.0 / (1 + kul.get('video:' + k, 0) + 20 * va[k].get('dongu_farki', 0)) for k in uy]
            k = r.choices(uy, weights=w)[0]
            dna['arkaplan'][r.choice([1, 2])] = 'video:%s:%s' % (k, va[k]['sure'])
    gec = [x for x in L('Gecis.tsx', 'GECIS_TIPLERI') if x != 'sert']
    dna['gecis'] = sec(r, gec, gecmis=g('gecis'), kullanim=kul, n=3, aile=GECIS_AILE, yasak_aile=tuple(Y['gecis_aileleri']),
                       agirlik={x: 1 + 2 * NG.get(GECIS_AILE.get(x), 0) for x in gec}, kacin=k2('gecis'))
    fb = vk['katalog'].get('filmburn') or {}
    if fb and 'flas' not in Y['gecis_aileleri'] and r.random() < 0.5:
        k = r.choice([x for x in fb if fb[x].get('siyah_orani', 0) > 0.2] or list(fb))
        fbk = 'filmburn:%s:%s' % (k, fb[k].get('tepe_sn', 1))
        ayni = [i for i, x in enumerate(dna['gecis']) if GECIS_AILE.get(x) == 'flas']  # kodlu film-yanigi/isik-patlamasi yerine gercek yanik
        dna['gecis'][ayni[0] if ayni else -1] = fbk
    # ogrenilmis presetler: vurgu (anahtar kelimede zoom + sarsinti), kayma (oge girisi)
    pre = vk['presetler']
    dna['vurgu'], dna['kayma'] = [], None
    if pre:
        zoom = [p['id'] for p in pre if p['sinif'] == 'zoom' and 'zoom-in' in p['id'] and any(x in p['id'] for x in ('snappy', 'fast', 'instant', 'smooth'))]
        if ton == 'sakin':
            zoom = [z for z in zoom if 'smooth' in z] or zoom
        sars = [p['id'] for p in pre if p['sinif'] == 'sarsinti' and 'impact' in p['id']]
        kay = [p['id'] for p in pre if p['sinif'] == 'kayma' and 'slide-in' in p['id']]
        v = sec(r, zoom, gecmis=g('vurgu'), kullanim=kul, kacin=k2('vurgu')) if zoom else []
        if sars and ton != 'sakin':
            v += sec(r, sars, gecmis=g('vurgu'), kullanim=kul)
        dna['vurgu'] = v
        dna['kayma'] = sec(r, kay, gecmis=g('kayma'), kullanim=kul, kacin=k2('kayma'))[0] if kay else None
    kam = L('Medya.tsx', 'KAMERA_TIPLERI')
    dna['kamera'] = sec(r, [k for k in kam if k != 'sabit'], yasak=tuple(Y['kamera']), gecmis=g('kamera'), kullanim=kul, n=3, kacin=k2('kamera'))
    cer = [c for c in L('Medya.tsx', 'CERCEVE_TIPLERI') if c != 'tam']
    dna['cerceve'] = sec(r, cer, yasak=tuple(Y['cerceve']), gecmis=g('cerceve'), kullanim=kul, n=2, agirlik={c: 1 + 2 * NC.get(c, 0) for c in cer}, kacin=k2('cerceve'))
    bas = [b for b in L('Yazi.tsx', 'BASLIK_TIPLERI') if b != KLASIK['baslik']]
    dna['baslik'] = sec(r, bas, gecmis=g('baslik'), kullanim=kul, kacin=k2('baslik'))[0]
    alt = list(L('Yazi.tsx', 'ALTYAZI_TIPLERI')) + ['yok']
    if Y['altyazi_aile'] == 'yok':
        alt += ['yok', 'yok']  # rakip altyazisizsa 'yok' da gecerli bir secenek
    dna['altyazi'] = sec(r, alt, gecmis=g('altyazi'), kullanim=kul, kacin=k2('altyazi'), aile=ALTYAZI_AILE, yasak_aile=(Y['altyazi_aile'],) if Y['altyazi_aile'] != 'yok' else ())[0]
    for eksen, dosya, ad in [('altbant', 'Kart.tsx', 'ALTBANT_TIPLERI'), ('sayi', 'Kart.tsx', 'SAYI_TIPLERI'), ('alinti', 'Kart.tsx', 'ALINTI_TIPLERI'),
                             ('liste', 'Kart.tsx', 'LISTE_TIPLERI'), ('zaman', 'Kart.tsx', 'ZAMAN_TIPLERI')]:
        dna[eksen] = sec(r, L(dosya, ad), gecmis=g(eksen), kullanim=kul, kacin=k2(eksen))[0]
    dok = L('Medya.tsx', 'DOKU_TIPLERI')
    nd = r.choice([0, 1, 1, 2])
    d = sec(r, dok, yasak=tuple(Y['doku']), gecmis=g('doku'), kullanim=kul, n=nd, kacin=k2('doku')) if nd else []
    if set(d) == {'gren', 'vinyet'}:
        d = d[:1]
    dna['doku'] = d
    # iskelet (rakipten)
    isk = rk['iskelet']
    fps = 30
    dna['iskelet'] = {
        'fps': fps,
        'gecis_kare': max(6, min(24, round(((isk.get('yumusak_medyan_ms') or 400) / 1000) * fps))),
        'yumusak_oran': round(isk.get('yumusak_gecis_orani') or 0.25, 2),
        'ilk30_medyan_sn': isk.get('ilk30_medyan_sn'), 'genel_medyan_sn': isk.get('genel_medyan_sn'),
        'ilk30_kesim_dk': isk.get('ilk30_kesim_dk'), 'sfx_orani': isk.get('sfx_orani'),
        'cerceveli_oran': round(min(0.45, max(0.15, 1 - (Y['duzen'].get('tam_ekran') or 0.8))), 2),
    }
    dna['tohum'] = tohum
    dna['ton'] = ton or '-'
    return dna

ESIK_DEGISIM = 0.20  # her video rakipten VE kanalin son 3 videosundan en az %20 farkli yuzey (demonetizasyon / AI slop)
EKSENLER = ['palet', 'font', 'hareket', 'arkaplan', 'gecis', 'kamera', 'cerceve', 'baslik', 'altyazi', 'altbant', 'sayi', 'alinti', 'liste', 'zaman', 'doku', 'vurgu', 'kayma']

def fark(a, b):
    n = 0
    for e in EKSENLER:
        x, y = a.get(e), b.get(e)
        if x is None and y is None:
            continue
        if isinstance(x, list):
            n += 0 if set(x) == set(y or []) or (set(x) & set(y or []) and len(set(x) & set(y or [])) >= max(1, len(x) - 1)) else 1
        else:
            n += x != y
    return n

def rakip_fark(dna, rk):
    Y = rk['yuzey']
    k = []
    k.append(('gecis', not ({GECIS_AILE.get(x.split(':')[0], 'flas') for x in dna['gecis']} & set(Y['gecis_aileleri']))))
    k.append(('cerceve', not (set(dna['cerceve']) & set(Y['cerceve']))))
    k.append(('altyazi', ALTYAZI_AILE.get(dna['altyazi']) != Y['altyazi_aile']))
    k.append(('palet/renk', PALET_SINIF.get(dna['palet']) != Y['palet_sinif']))
    k.append(('kamera', not (set(dna['kamera'][:1]) & set(Y['kamera']))))
    k.append(('doku', not (set(dna['doku']) & set(Y['doku']))))
    k.append(('arkaplan (animasyonlu)', True))  # rakip olcumunde animasyonlu zemin yok -> her zaman yeni eksen
    return k

def klasik_skor(d):
    s = 0
    s += d['palet'] == 'gece-kirmizi'
    s += d['baslik'] == 'asagidan-yay'
    s += d['hareket'] == 'yay-yumusak'
    s += set(d['doku']) >= {'gren', 'vinyet'}
    s += d['kamera'] == ['ken-burns-ice']
    return s

def md_yaz(yol, rk, secenekler, kut, gecmis, tb=None, nis=None, diger=None):
    Y, I = rk['yuzey'], rk['iskelet']
    s = ['# STIL DNA — rakip vs secenekler', '',
         f"Rakip: {rk['kaynak']} ({rk['video_sayisi']} video). Iskelet rakipten alinir, yuzey degistirilir. Gecmis: {len(gecmis)} DNA (son 3'u tekrar edilmez).", '',
         '## Konu ve ton (edit dili konuya uyar)', '',
         f"- ton: **{(tb or {}).get('ton', '-')}** ({(tb or {}).get('kaynak', '')}) · puanlar: {(tb or {}).get('puan', {})} · eslesen: {', '.join(sum(((tb or {}).get('esl') or {}).values(), [])[:12]) or '-'}",
         f"- tona uymayan yuzey elendi: {', '.join(TON.get((tb or {}).get('ton', ''), {}).get('arkaplan_disi', [])) or '-'} (arka plan); {', '.join(TON.get((tb or {}).get('ton', ''), {}).get('hareket_disi', [])) or '-'} (hareket)",
         f"- nisteki kutuphane kanallari ({len(nis or [])}): " + (', '.join(f"{x['kanal']} ({x['palet_sinif']}; {'/'.join(x['gecis_aileleri']) or 'sert'})" for x in (nis or [])[:8]) or 'yok'),
         '  (secimde agirlik: bu kanallarda gorulen palet sinifi / gecis ailesi / cerceve one cikar; rakibin kendisi haric)', '',
         '## Iskelet (rakipten, DOKUNMA)', '',
         f"- ilk 30 sn medyan cekim: {I.get('ilk30_medyan_sn')} sn · ilk 30 sn kesim/dk: {I.get('ilk30_kesim_dk')} · genel medyan: {I.get('genel_medyan_sn')} sn",
         f"- yumusak gecis orani: {I.get('yumusak_gecis_orani')} · medyan suresi: {I.get('yumusak_medyan_ms')} ms -> gecis_kare {secenekler[0]['iskelet']['gecis_kare']} (30 fps)",
         f"- kesimde SFX orani: {I.get('sfx_orani')} (>0,5 ise biz de kesimlere whoosh/hit koyariz)", '',
         '## Yuzey', '', '| eksen | rakip (olculen) | ' + ' | '.join(f'secenek {chr(65 + i)}' for i in range(len(secenekler))) + ' |',
         '|---|---|' + '---|' * len(secenekler)]
    rakip_sutun = {'palet': f"{Y['palet_sinif']} (parlaklik {Y['parlaklik']}, doygunluk {Y['doygunluk']})",
                   'gecis': ', '.join(f'{a} {round(b * 100)}%' for a, b in list(Y['gecis_dagilim'].items())[:4]) + f" · aileler: {', '.join(Y['gecis_aileleri']) or 'yalniz sert'}",
                   'cerceve': ', '.join(f'{a} {round(b * 100)}%' for a, b in Y['duzen'].items()), 'altyazi': Y['altyazi_aile'],
                   'doku': ', '.join(Y['doku']) or '-', 'kamera': ', '.join(Y['kamera']) or '-', 'arkaplan': 'animasyonlu zemin olculmedi (duz renk / bulanik kopya)'}
    for e in EKSENLER:
        h = []
        for d in secenekler:
            v = d[e]
            v = (', '.join(v) or '-') if isinstance(v, list) else (v or '-')
            kn = [kanit(kut, e, x) for x in (d[e] if isinstance(d[e], list) else [d[e]]) if x]
            kn = [k for k in kn if k['kanal_sayisi']]
            h.append(v + ('' if v == '-' else f" <br><sub>kanit: {kn[0]['teknik']} ({kn[0]['kanal_sayisi']} kanal, or. {', '.join(kn[0]['ornek'][:2])})</sub>" if kn else (' <br><sub>yeni (repertuar)</sub>' if e in TEKNIK else '')))
        s.append(f"| {e} | {rakip_sutun.get(e, 'olculmez (gozle)')} | " + ' | '.join(h) + ' |')
    s += ['', '## Kontrol', '']
    for i, d in enumerate(secenekler):
        rf = rakip_fark(d, rk)
        gf = [fark(d, x) for x in gecmis[-3:]]
        rp = sum(1 for _, b in rf if b) / len(rf)
        op = [round(fark(d, x) / len(EKSENLER) * 100) for x in gecmis[-3:]]
        s.append(f"- **{chr(65 + i)}**: rakipten farkli eksen {sum(1 for _, b in rf if b)}/{len(rf)} = %{round(rp * 100)} ({', '.join(a for a, b in rf if b)}) · "
                 f"son 3 videoya gore degisim: {['%' + str(x) for x in op] or 'gecmis yok'} · esik: her biri en az %{round(ESIK_DEGISIM * 100)} "
                 f"({'TAMAM' if rp >= ESIK_DEGISIM and all(x >= ESIK_DEGISIM * 100 for x in op) else 'TUTMADI -> --tohum degistir'}) · klasik Claude skoru {klasik_skor(d)}/5 (0 olmali)")
    s += ['', '## Diger kanallarla (ayni gorunum baska kanalda olmasin)', '']
    if not diger:
        s.append('- baska kanalin secilmis DNA\'si yok')
    for i, d in enumerate(secenekler):
        sat = []
        for kanal, x in (diger or {}).items():
            ay = ayni_gorunur(d, x)
            sat.append(f"{kanal}: {len(ay)} ayni ({', '.join(ay) or '-'})" + (' **FAZLA**' if len(ay) > ESIK_KANAL_AYNI else ''))
        tamam = all(len(ayni_gorunur(d, x)) <= ESIK_KANAL_AYNI for x in (diger or {}).values()) and kagit_sayisi(d) <= 1
        if diger:
            s.append(f"- **{chr(65 + i)}**: " + ' · '.join(sat) + f" · kagit ogesi {kagit_sayisi(d)} (en fazla 1) · esik: her kanalla en fazla {ESIK_KANAL_AYNI} gorunur eksen ayni ({'TAMAM' if tamam else 'TUTMADI -> --tohum degistir'})")
    if len(secenekler) > 1:
        s.append(f"- A ile B arasi farkli eksen: {fark(secenekler[0], secenekler[1])}")
    s += ['', 'Onizleme: repertuar `Onizleme` kompozisyonu `--props` ile (bkz. repertuar/README.md).']
    open(yol, 'w', encoding='utf-8').write('\n'.join(s) + '\n')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rakip')
    ap.add_argument('--rakip-json', nargs='*')
    ap.add_argument('--gecmis', nargs='*', default=[])
    ap.add_argument('--kilit', default='', help='virgullu: palet,font,hareket — son DNA\'dan sabit tutulur (kanal kimligi)')
    ap.add_argument('--secenek', type=int, default=2)
    ap.add_argument('--ton', choices=sorted(TON), help='verilmezse konudan otomatik: ciddi (tarih/savas/belgesel/ekonomi), gizem (suc/gizem/korku), enerjik (teknoloji/spor/liste), sakin (yasam/saglik/seyahat)')
    ap.add_argument('--konu', default='', help='videonun konusu / anlatilan olay (baslik + 1-2 cumle). Ton ve nis eslesmesi buradan')
    ap.add_argument('--konu-dosya', help='konu metni dosyasi (ornek: metin.txt ya da baslik-aciklama.txt; ilk 3000 karakter)')
    ap.add_argument('--tohum', default='')
    ap.add_argument('--cikti', default='.')
    ap.add_argument('--kok')
    ap.add_argument('--repertuar')
    ap.add_argument('--varlik', help='repo varlik/ klasoru (varsayilan: repo kokunden bulunur)')
    ap.add_argument('--kanallar', help='kanal klasorlerinin koku (varsayilan C:\\otomasyon); diger kanallarin DNA\'lari buradan okunur')
    ap.add_argument('--kanal', help='bu videonun kanali (varsayilan: --cikti yolundan, ornek C:\\otomasyon\\ranks\\video10 -> ranks)')
    a = ap.parse_args()
    kut = kutuphane_bul(a.kok)
    rep = repertuar_bul(a.repertuar, kut)
    vk = varlik_bul(a.varlik)
    rk = rakip_oku(kut, a.rakip, a.rakip_json)
    rk['kaynak'] = a.rakip or ', '.join(a.rakip_json or [])
    konu = a.konu + (' ' + open(a.konu_dosya, encoding='utf-8', errors='replace').read()[:3000] if a.konu_dosya and os.path.isfile(a.konu_dosya) else '')
    rh = a.rakip if not a.rakip or a.rakip.startswith(('@', 'UC')) else '@' + a.rakip
    rmetin = kanal_metni(os.path.join(kut, 'kanallar', rh)) if (kut and rh) else ''
    if a.ton:
        tb = {'ton': a.ton, 'kaynak': 'elle verildi', 'puan': {}, 'esl': {}}
    else:
        # konu (anlatilan olay) agirlikli: konu metni 2 kez sayilir, rakip nisi/basliklari 1 kez
        t, pu, es = ton_bul(konu + ' ' + konu + ' ' + rmetin)
        tb = {'ton': t, 'kaynak': 'konu + rakip nisi/basliklari (otomatik)', 'puan': pu, 'esl': es}
        if not any(pu.values()):
            tb['kaynak'] = 'eslesme yok -> varsayilan ciddi (en guvenli). --konu ver ya da --ton sec'
    a.ton = tb['ton']
    nis = nis_kanallari(kut, rh, a.ton, konu + ' ' + rmetin)
    gecmis = [json.load(open(x, encoding='utf-8')) for x in a.gecmis if os.path.isfile(x)]
    kk = kanallar_koku(a.kanallar)
    kanal = a.kanal or kanal_adi(kk, a.cikti) if kk else a.kanal
    tum = secilmis_dnalar(kk)
    cikti_abs = os.path.abspath(a.cikti)
    kendi = [d for _, fp, d in tum.get(kanal, []) if os.path.dirname(os.path.abspath(fp)) != cikti_abs and not os.path.abspath(fp).startswith(cikti_abs + os.sep)]
    if not gecmis and kendi:
        gecmis = kendi[-3:]  # --gecmis verilmediyse kanalin onceki secilmis DNA'lari otomatik
        print(f"gecmis otomatik: {kanal} kanalinin son {len(gecmis)} DNA'si")
    diger = {k: v[-1][2] for k, v in tum.items() if k != kanal and v}
    print(f"kanal: {kanal or '?'} | diger kanallar ({len(diger)}): {', '.join(diger) or '-'}")
    kilit = {k.strip() for k in a.kilit.split(',') if k.strip()}
    os.makedirs(a.cikti, exist_ok=True)
    tohum = a.tohum or (a.rakip or 'x') + str(len(gecmis))
    secenekler = []
    for i in range(a.secenek):
        en_iyi = None
        for deneme in range(40):
            d = dna_uret(rk, rep, kut, gecmis, kilit, f'{tohum}-{i}-{deneme}', secenekler, a.ton, vk, nis, list(diger.values()))
            rf = sum(1 for _, b in rakip_fark(d, rk) if b)
            gf = min([fark(d, x) for x in gecmis[-3:]] or [99])
            if gecmis and gf / len(EKSENLER) < ESIK_DEGISIM:
                gf = -10  # %20 alti: kabul edilmez
            sf = min([fark(d, x) for x in secenekler] or [99])
            ka = max([len(ayni_gorunur(d, x)) for x in diger.values()] or [0])
            kg = kagit_sayisi(d)
            puan = rf * 3 + min(gf, 12) + min(sf, 10) - klasik_skor(d) * 20 - max(0, ka - ESIK_KANAL_AYNI) * 6 - ka - max(0, kg - 1) * 8
            if en_iyi is None or puan > en_iyi[0]:
                en_iyi = (puan, d)
            if rf >= 6 and gf >= 6 and sf >= 6 and klasik_skor(d) == 0 and ka <= ESIK_KANAL_AYNI and kg <= 1:
                break
        secenekler.append(en_iyi[1])
    for i, d in enumerate(secenekler):
        json.dump(d, open(os.path.join(a.cikti, f'stil-dna-{chr(65 + i)}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # secilmis DNA: varsayilan A. Kullanici B secerse stil-dna-B.json -> stil-dna.json kopyalanir.
    # Bu dosya kanallar arasi hafizadir: diger kanallarin sonraki DNA'lari bunu gorur ve tekrar etmez.
    sec_yol = os.path.join(a.cikti, 'stil-dna.json')
    if not os.path.isfile(sec_yol):
        json.dump(secenekler[0], open(sec_yol, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('secilmis DNA (varsayilan A) ->', sec_yol)
    else:
        print('stil-dna.json zaten var, dokunulmadi (yeni secim icin silip tekrar calistir ya da A/B kopyala):', sec_yol)
    md_yaz(os.path.join(a.cikti, 'STIL-DNA.md'), rk, secenekler, kut, gecmis, tb, nis, diger)
    json.dump(rk, open(os.path.join(a.cikti, 'rakip-imza.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"kutuphane: {kut}\nrepertuar: {rep}")
    print(f"ton: {tb['ton']} ({tb['kaynak']}) puan={tb['puan']} | nis kanali: {len(nis)} ({', '.join(x['kanal'] for x in nis[:5])})")
    print('varlik:', vk['yol'], len(vk['katalog'].get('arkaplan') or {}), 'arka plan,', len(vk['katalog'].get('filmburn') or {}), 'filmburn,', len(vk['presetler']), 'preset')
    for i, d in enumerate(secenekler):
        rf = rakip_fark(d, rk)
        print(f"{chr(65 + i)}: palet={d['palet']} font={d['font']} hareket={d['hareket']} arkaplan={d['arkaplan']} gecis={d['gecis']} "
              f"altyazi={d['altyazi']} cerceve={d['cerceve']} sayi={d['sayi']} alinti={d['alinti']} liste={d['liste']} zaman={d['zaman']} | rakipten farkli {sum(1 for _, b in rf if b)}/{len(rf)} | klasik {klasik_skor(d)} | "
              f"diger kanallarla ayni gorunur: {dict((k, len(ayni_gorunur(d, x))) for k, x in diger.items())} | kagit {kagit_sayisi(d)}")
    print('->', os.path.join(a.cikti, 'STIL-DNA.md'))

if __name__ == '__main__':
    main()
