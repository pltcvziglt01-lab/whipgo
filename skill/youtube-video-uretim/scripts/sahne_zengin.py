#!/usr/bin/env python3
"""SAHNE ZENGINLESTIRICI — anlatim metni + kelime zamanlari + mevcut plan (props.json) -> sahne turu firsatlari -> uygulanmis plan.
Video 12 dk boyunca ayni 4-5 kalibi (goruntu, kelime karti, sayi karti, alt bant) tekrar etmesin diye, metnin YAPISINDAN
gelen sahne turlerini (liste, zaman, yil, karsilastirma, grafik, bolum, degisim, coklu medya, kalici HUD) VideoDna'ya yazar.

Kullanim:
  py sahne_zengin.py --plan motion/src/v05/props.json --metin metin.txt [--rakip <kutuphane>/kanallar/@R/video-1 ...]
                     [--cikti props-zengin.json] [--rapor SAHNE-ZENGIN.md] [--yil 2026] [--hud bolum-cetveli|tarih-rozeti|yok] [--hud-sn 0]
  sahne_kur.py sonrasi, render'dan once; ardindan kurgu_denetim.py --plan <cikti> (0 FAIL).
--metin : sahne_kur'un kurgu.json'unu ureten metin (# bolum basliklari, @kelime/@sayi/@etiket yonergeleri); bolumler buradan.
--rakip : ritim/analiz.json -> rakibin grafik/kart sure payi (tum.kaynak_yuzde_sure); yoksa hedef %15-25.

Firsatlar (metin + kart/etiket yazilari + kelime zamanlari):
  bolum         metinde '# N BASLIK' (kanca / CTA haric) -> bolum karti (bolum-numarasi / hayalet numara) + bolum-cetveli HUD
                (bolum basindan --hud-sn sn; 0 = bolum boyunca)
  yil           kart yazisinda 'SINCE 2012' / 'LAST TIME ... 2019' / tek yil sayi karti -> yil-tarama (bugunun yilindan hedef yila)
  zaman         45 sn icinde >= 3 kartta farkli yillar -> serinin son karti zaman cizelgesi
  liste         '#1/#2/#3' ya da FIRST/SECOND/THIRD kart serisi, ayni bicimli (AD · ROL) >= 3 alt bant, '·' ile >= 3 ad
                -> serinin son karti liste; >= 3 skor karti (2-1, 3-0) -> sonuc zaman cizelgesi (skor + rakip/yer)
  karsilastirma 'AD N | AD M' kelime karti, 'N | AD BIRIM · AD2 M' sayi karti, 40 sn icinde ayni birimde iki sayi karti
  grafik        30 sn icinde ayni para/birimde >= 3 deger (sayi karti + alt bant) -> kategorik: cubuk yarisi; yillara yayilan: DNA grafik
  degisim       'X → Y' yazisi; "don't need X. They need Y" / "used to be X ... now Y" -> ustu-cizili-degisim
  coklu         "look at / notice / listen to" -> odak-karartma; "same ... different / opposite / vs" -> bolunmus (yandaki cekimle)
  harita        yer adi + 'to/from' -> YALNIZ RAPOR (koordinatli harita zemini yok; elle noktalar verilirse kart.tur 'harita')
Kurallar: ayni tur 2 dk icinde en cok 3 kez; yeni kart ile komsu kart arasi >= 6 sn goruntu; kart suresi okuma suresine uyar
  (kurgu_denetim formulu: kisaysa sonraki duz cekimleri yutar, uzunsa bolunur, kalan goruntu olarak devam eder); yogunluk
  hedefi rakibin grafik/kart payi (+%5 tolerans). Sonra TEKRAR SEYRELTME: ayni tur + ayni varyant (kartAnahtar) 2 dk icinde
  3'ten fazla ise fazlalik kelime kartlari 'zemin' yerlesimine, gerekirse alt banda cevrilir (kurgu_denetim FAIL'i kalmaz).
Eski DNA'da tur ici varyant yoksa (sayi2, liste2...) stil_dna.varyant_tamamla ile tamamlanir (birincil eksenler degismez).
Cikti: props (cikti), SAHNE-ZENGIN.md (uygulanan / reddedilen firsatlar, harita onerileri, once/sonra tur dagilimi) + .json.
"""
import argparse, copy, datetime, json, math, os, re, sys
from collections import Counter

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
import kurgu_denetim as KD   # noqa: E402

GAP = 6.0              # yeni kart ile komsu kart arasi en az (sn) goruntu
TUR_TAVAN, TUR_PENCERE = 3, 120.0
TAM_EKRAN_DISI = {'coklu'}           # medya duzeni: kart sayilmaz
ATLA_BOLUM = re.compile(r'\b(KANCA|HOOK|INTRO|CTA|SUBSCRIBE|ABONE|OUTRO|END ?SCREEN)\b', re.I)
YIL = re.compile(r'\b(1[89]\d{2}|20\d{2})\b')
SKOR = re.compile(r'\b\d{1,2}-\d{1,2}\b')
PARA = re.compile(r'([£$€])\s?(\d[\d,.]*)\s?([MBK]|BN|MN)?\b', re.I)
SIRA_NO = re.compile(r'(?:#\s?(\d)|\b(FIRST|SECOND|THIRD|FOURTH|FIFTH)\b|^\s*(\d)[.)]\s)', re.I)
DIKKAT = re.compile(r"\b(look at|notice|listen to|watch (?:how|what)|read that)\b", re.I)
ZIT = re.compile(r"\b(same [\w ]{0,20}(?:different|opposite)|did the opposite|versus|vs\.?|on the other hand|whereas)\b", re.I)
DEGISIM_RE = [
    re.compile(r"(?:do(?:n't| not)|doesn't|does not|did(?:n't| not)) need (?:a |an |the )?([\w' -]{3,30}?)[.,;].{0,40}?\bneed(?:s|ed)? (?:a |an |the )?([\w'-]+(?: [\w'-]+)?)", re.I),
    re.compile(r"\bused to be (?:a |an |the )?([\w' -]{3,30}?)[.,;].{0,60}?\bnow (?:it's |he's |they're |is |are )?(?:a |an |the )?([\w'-]+(?: [\w'-]+)?)", re.I),
]
YER = {'manchester', 'london', 'liverpool', 'barcelona', 'madrid', 'paris', 'milan', 'munich', 'turin', 'lisbon', 'lille', 'nottingham',
       'everton', 'brighton', 'newcastle', 'birmingham', 'leeds', 'rome', 'naples', 'napoli', 'berlin', 'dortmund', 'amsterdam', 'spain',
       'england', 'italy', 'germany', 'france', 'portugal', 'brazil', 'argentina', 'saudi arabia', 'riyadh', 'istanbul', 'leipzig'}
OLUMSUZ = re.compile(r'^\s*(?:NO|NOT|WITHOUT|\+)\s+', re.I)
NOKTA = re.compile(r'\s*[·•|]\s*')


def jy(y):
    return json.load(open(y, encoding='utf-8'))


def norm(s):
    return re.findall(r"[a-z0-9à-ÿ']+", (s or '').lower().replace('’', "'"))


def ust(s):
    return re.sub(r'\s+', ' ', (s or '').strip()).upper()


# ---------------------------------------------------------------- zaman cizelgesi / metin
def zamanla(veri):
    fps, t, out = veri['fps'], 0, []
    for i, c in enumerate(veri['cekimler']):
        out.append((t / fps, (t + c['kare']) / fps))
        t += c['kare']
    return out


def cumleler(kel):
    out, bas = [], 0
    for i, w in enumerate(kel):
        if re.search(r'[.?!]["”’)]*$', w['k']) or i == len(kel) - 1:
            out.append({'metin': ' '.join(x['k'] for x in kel[bas:i + 1]), 'bas': kel[bas]['bas'], 'son': w['son'], 'i0': bas, 'i1': i})
            bas = i + 1
    return out


def bolumler(metin_yolu, kel):
    """'# N BASLIK' bolumleri -> [{no_metin, baslik, bas (sn)}]; baslangic = bolumun ilk anlatim satirinin kelime zamani"""
    if not metin_yolu or not os.path.isfile(metin_yolu):
        return []
    satir = open(metin_yolu, encoding='utf-8', errors='replace').read().splitlines()
    flat = [(norm(w['k']) or [''])[0] for w in kel]
    out, ara_i, akt = [], 0, None
    for s in satir:
        m = re.match(r'^#\s*(\d+)?\s*(.+?)\s*$', s)
        if m:
            akt = {'sira': m.group(1), 'baslik': m.group(2).strip(), 'bas': None}
            out.append(akt)
            continue
        if akt and akt['bas'] is None and s.strip() and not s.lstrip().startswith('@'):
            h = norm(s)[:4]
            for n in (len(h), 3, 2):
                if n <= 0:
                    continue
                bul = next((i for i in range(ara_i, len(flat) - n + 1) if flat[i:i + n] == h[:n]), None)
                if bul is not None:
                    akt['bas'] = kel[bul]['bas']
                    ara_i = bul + 1
                    break
    return [b for b in out if b['bas'] is not None]


def kart_metin(c):
    k = c.get('kart') or {}
    return ust(' '.join(x for x in [k.get('a'), k.get('b')] if x))


# ---------------------------------------------------------------- okuma suresi (kurgu_denetim formulu)
def ihtiyac(k, dna, sira=0):
    an = KD.kart_anahtar(dna, k, sira)
    ky = KD.kart_yazi(k, an)
    if not ky:
        return 1.5
    n, _ses, ek, _m = ky
    hiz = KD.OKUMA_SESSIZ if k['tur'] in KD.BILGI_TURLERI else KD.OKUMA_DUYULAN
    return max(KD.ASGARI, KD.GIRIS + ek + n / hiz + KD.TUTMA)


# ---------------------------------------------------------------- firsat dedektorleri
def yil_sec(s):
    ys = YIL.findall(s or '')
    return ys[-1] if ys else None


def etiket_temizle(s, yil=None):
    s = ust(s)
    if yil:
        s = s.replace(yil, '')
    s = re.sub(r'\b(FIRST TIME SINCE|SINCE|LAST TIME|IN)\b\s*$', '', s.strip()).strip(' ·|,-')
    return re.sub(r'\s+', ' ', s)


def d_yil(veri, tz, simdi):
    """tek kartta 'SINCE <yil>' / 'LAST TIME ... <yil>' ya da yalniz yil olan sayi karti -> yil-tarama"""
    out = []
    for i, c in enumerate(veri['cekimler']):
        k = c.get('kart') or {}
        if k.get('tur') not in ('kelime', 'sayi'):
            continue
        a, b = ust(k.get('a')), ust(k.get('b'))
        yil = None
        if k['tur'] == 'sayi' and re.fullmatch(r'(1[89]\d{2}|20\d{2})', a):
            yil, yazi = a, b
        elif re.search(r'\b(SINCE|LAST TIME)\b', a + ' ' + b) and yil_sec(a + ' ' + b):
            yil = yil_sec(a + ' ' + b)
            yazi = etiket_temizle(a + ' ' + b, yil)
        if not yil or int(yil) >= simdi or simdi - int(yil) < 2:
            continue
        out.append({'tur': 'yil', 'op': 'donustur', 'i': i, 'skor': 4, 'neden': f"'{a} {b}': {simdi} -> {yil} geri sayim",
                    'kart': {'tur': 'yil', 'adimlar': [{'yil': str(simdi), 'yazi': ''}, {'yil': yil, 'yazi': yazi[:42]}]}})
    return out


def d_zaman(veri, tz):
    """45 sn icinde >= 3 kart/alt bantta farkli yillar -> son ogeye zaman cizelgesi"""
    og = []
    for i, c in enumerate(veri['cekimler']):
        k = c.get('kart') or {}
        if k.get('tur') in ('kelime', 'sayi') or (not k and c.get('etiket')):
            s = kart_metin(c) if k else ust(c['etiket'])
            y = yil_sec(s)
            if y:
                og.append((i, y, c))
    out = []
    for j in range(len(og)):
        seri = [og[j]]
        for x in og[j + 1:]:
            if tz[x[0]][0] - tz[og[j][0]][0] > 45:
                break
            if x[1] not in {s[1] for s in seri}:
                seri.append(x)
        if len(seri) < 3:
            continue
        son = seri[-1]
        adim = []
        for i, y, c in sorted(seri, key=lambda s: int(s[1])):
            k = c.get('kart') or {}
            a = ust(k.get('a') or c.get('etiket') or '')
            ad = etiket_temizle(OLUMSUZ.sub('', a), y)
            if re.search(r'\b(GONE|LEFT|OUT|SOLD)\b', ust(k.get('b'))) and not re.search(r'\b(GONE|LEFT|OUT|SOLD)\b', ad):
                ad += ' ' + re.search(r'\b(GONE|LEFT|OUT|SOLD)\b', ust(k.get('b'))).group(1)
            adim.append({'yil': y, 'yazi': ad[:28]})
        out.append({'tur': 'zaman', 'op': 'donustur' if son[2].get('kart') else 'etiket', 'i': son[0], 'skor': 4.5, 'tuketir': [s[0] for s in seri],
                    'birlestir': birlestir_mi(veri['cekimler'], tz, [s[0] for s in seri]),
                    'neden': f"{len(seri)} yil {tz[seri[0][0]][0]:.0f}-{tz[son[0]][0]:.0f} s: " + ', '.join(s[1] for s in seri),
                    'kart': {'tur': 'zaman', 'adimlar': adim}})
    return out


def d_liste(veri, tz):
    out = []
    C = veri['cekimler']
    # (a) numarali kart serisi: '#1', FIRST...
    nums = []
    for i, c in enumerate(C):
        k = c.get('kart') or {}
        if k.get('tur') == 'kelime':
            m = SIRA_NO.search(ust(k.get('a')))
            if m:
                nums.append((i, ust(k.get('a')), ust(k.get('b'))))
    if len(nums) >= 3:
        for j in range(len(nums) - 2):
            seri = [x for x in nums[j:] if tz[x[0]][0] - tz[nums[j][0]][0] <= 150]
            if len(seri) >= 3:
                onek = os.path.commonprefix([s[1] for s in seri]).strip(' #-:0123456789')
                baslik = (onek + ('S' if onek and not onek.endswith('S') else '')) if onek else None
                out.append({'tur': 'liste', 'op': 'donustur', 'i': seri[-1][0], 'skor': 4.5, 'tuketir': [s[0] for s in seri], 'birlestir': birlestir_mi(C, tz, [s[0] for s in seri]),
                            'neden': f"numarali seri ({len(seri)}): " + ' / '.join(s[2] for s in seri),
                            'kart': {'tur': 'liste', 'baslik': baslik, 'maddeler': [s[2] or s[1] for s in seri]}})
                break
    # (b) ayni bicimli alt bantlar (AD · ROL) >= 3, 25 sn icinde
    et = [(i, ust(c['etiket'])) for i, c in enumerate(C) if c.get('etiket') and not c.get('kart') and len(NOKTA.split(ust(c['etiket']))) == 2]
    j = 0
    while j < len(et):
        seri = [et[j]]
        for x in et[j + 1:]:
            if tz[x[0]][0] - tz[seri[-1][0]][0] > 12:
                break
            seri.append(x)
        if len(seri) >= 3 and all(len(NOKTA.split(s[1])[0].split()) <= 3 for s in seri):
            mad = [' — '.join(NOKTA.split(s[1])) for s in seri]
            out.append({'tur': 'liste', 'op': 'etiket', 'i': seri[-1][0], 'skor': 4, 'tuketir': [s[0] for s in seri],
                        'neden': f"ayni bicimli {len(seri)} alt bant {tz[seri[0][0]][0]:.0f}-{tz[seri[-1][0]][0]:.0f} s", 'kart': {'tur': 'liste', 'maddeler': mad}})
            j += len(seri)
        else:
            j += 1
    # (c) tek kartta '·' ile >= 3 ad (XAVI · INIESTA | BUSQUETS · MESSI)
    for i, c in enumerate(C):
        k = c.get('kart') or {}
        if k.get('tur') == 'kelime':
            parca = [p for p in NOKTA.split(kart_metin(c)) if p]
            if len(parca) >= 3 and all(len(p.split()) <= 3 and not re.search(r'\d', p) for p in parca):
                out.append({'tur': 'liste', 'op': 'donustur', 'i': i, 'skor': 3.5, 'neden': f"{len(parca)} ad tek kartta", 'kart': {'tur': 'liste', 'maddeler': parca}})
    # (d) >= 3 skor karti (2-1) 75 sn icinde -> sonuncusu sonuc zaman cizelgesi (skor buyuk, rakip/yer altta; tarih yazilmaz).
    #     Liste degil: isaretli liste onay kutusu cizer, yenilgiye 'tik' yanlis anlam verir; sonuclar kronolojik bir dizi.
    sk =[(i, c) for i, c in enumerate(C) if (c.get('kart') or {}).get('tur') == 'kelime' and SKOR.search(ust((c['kart'].get('a') or '')))]
    j = 0
    while j < len(sk):
        seri = [sk[j]]
        for x in sk[j + 1:]:
            if tz[x[0]][0] - tz[seri[0][0]][0] > 75:
                break
            seri.append(x)
        if len(seri) >= 3:
            adim = []
            for i, c in seri:
                a, b = ust(c['kart'].get('a')), ust(c['kart'].get('b'))
                for satir in ([a, b] if SKOR.search(b) else [a]):
                    m = SKOR.search(satir)
                    ad = re.sub(r'\s+', ' ', SKOR.sub('', satir)).strip(' ·-')
                    adim.append({'yil': m.group(0), 'yazi': ad[:22]})   # tarih yazilmaz: dar dugum altinda satir kirar
            out.append({'tur': 'zaman', 'op': 'donustur', 'i': seri[-1][0], 'skor': 4, 'tuketir': [s[0] for s in seri], 'birlestir': birlestir_mi(C, tz, [s[0] for s in seri]),
                        'neden': f"{len(seri)} skor karti {tz[seri[0][0]][0]:.0f}-{tz[seri[-1][0]][0]:.0f} s (sonuc dizisi)", 'kart': {'tur': 'zaman', 'adimlar': adim[-4:]}})
            j += len(seri)
        else:
            j += 1
    return out


def sayi_oku(s):
    m = re.match(r'^\s*([£$€]?)(\d[\d,.]*)\s*([A-Z%]*)\s*$', s or '')
    if not m:
        return None
    try:
        return m.group(1), float(m.group(2).replace(',', '')), m.group(3)
    except ValueError:
        return None


def d_karsilastirma(veri, tz):
    out, C = [], veri['cekimler']
    sayilar = []
    for i, c in enumerate(C):
        k = c.get('kart') or {}
        a, b = ust(k.get('a')), ust(k.get('b'))
        if k.get('tur') == 'kelime':
            ma, mb = re.match(r'^(.+?)\s+(\d+)$', a), re.match(r'^(.+?)\s+(\d+)$', b)
            if ma and mb and not SKOR.search(a + b):
                out.append({'tur': 'karsilastirma', 'op': 'donustur', 'i': i, 'skor': 4.5, 'neden': f"'{a} | {b}' iki deger",
                            'kart': {'tur': 'karsilastirma', 'sol': {'ad': ma.group(1), 'deger': int(ma.group(2))}, 'sag': {'ad': mb.group(1), 'deger': int(mb.group(2))}}})
        if k.get('tur') == 'sayi':
            v = sayi_oku(a)
            if not v or YIL.fullmatch(a):
                continue
            parca = [p for p in NOKTA.split(b) if p]
            m2 = re.match(r'^(.+?)\s+([£$€]?\d[\d,.]*)$', parca[1]) if len(parca) >= 2 else None
            if m2 and len(parca) == 2 and sayi_oku(m2.group(2)):
                ad1 = parca[0].split()
                birim = ad1[-1] if len(ad1) >= 2 else ''
                out.append({'tur': 'karsilastirma', 'op': 'donustur', 'i': i, 'skor': 4.5, 'neden': f"'{a} | {b}' ayni birimde iki sayi",
                            'kart': {'tur': 'karsilastirma', 'baslik': birim or None, 'onEk': v[0],
                                     'sol': {'ad': ' '.join(ad1[:-1]) if birim else parca[0], 'deger': v[1]},
                                     'sag': {'ad': m2.group(1), 'deger': sayi_oku(m2.group(2))[1]}}})
                continue
            if len(parca) >= 2:
                sayilar.append((i, v, parca[0], parca[1]))
    # iki sayi karti 40 sn icinde ayni birim kelimesiyle (POINTS) -> ikincisi karsilastirma
    for x, y in zip(sayilar, sayilar[1:]):
        if x[2] == y[2] and x[1][0] == y[1][0] and tz[y[0]][0] - tz[x[0]][0] <= 40:
            out.append({'tur': 'karsilastirma', 'op': 'donustur', 'i': y[0], 'skor': 4.5, 'neden': f"iki '{x[2]}' sayisi {tz[y[0]][0] - tz[x[0]][0]:.0f} sn arayla",
                        'kart': {'tur': 'karsilastirma', 'baslik': x[2], 'onEk': x[1][0] or None,
                                 'sol': {'ad': x[3], 'deger': x[1][1]}, 'sag': {'ad': y[3], 'deger': y[1][1]}}})
    return out


GENEL_AD = re.compile(r'\b(RECORD|TOTAL|FEE|FEES|PLAYERS|SUMMER|SPENT|COMBINED|ALL|SIGNINGS)\b')


def _soyad(s):
    w = [x for x in re.split(r'\s+', ust(s)) if x and not re.search(r'\d|[£$€]', x)]
    return w[-1] if w else ''


def d_grafik(veri, tz, bol):
    """30 sn icinde ayni para biriminde >= 3 adli deger (sayi karti + alt bant 'AD · £85M' / 'AD £85M') -> cubuk yarisi.
    Ad: sayi kartinin alt yazisi; genelse ('CLUB RECORD') 6 sn onceki alt banttaki ad. Digerlerinin toplami olan deger (±%6)
    seriye girmez: grafik O karta (anlatici toplarken) konur, basligi toplam kartin yazisi."""
    C = veri['cekimler']
    og = []
    for i, c in enumerate(C):
        k = c.get('kart') or {}
        if k.get('tur') == 'sayi':
            v = sayi_oku(ust(k.get('a')))
            if v and v[0]:
                b = ust(k.get('b'))
                ad = _soyad(NOKTA.split(b)[0]) if b and not GENEL_AD.search(b) else ''
                if not ad:
                    onc = [j for j in range(i - 1, -1, -1) if tz[i][0] - tz[j][0] <= 6 and C[j].get('etiket') and not C[j].get('kart')]
                    ad = _soyad(NOKTA.split(ust(C[onc[0]]['etiket']))[0]) if onc else ''
                og.append({'i': i, 'para': v[0], 'deger': v[1], 'ad': ad, 'yazi': b, 'kaynak': 'sayi'})
        elif c.get('etiket') and not k:
            e = ust(c['etiket'])
            parca = [p for p in NOKTA.split(e) if p]
            for pi, p in enumerate(parca):
                for m in PARA.finditer(p):
                    once = SKOR.sub('', p[:m.start()]).strip()
                    ad = _soyad(once) if once else (_soyad(parca[pi - 1]) if pi > 0 and not PARA.search(parca[pi - 1]) else '')
                    og.append({'i': i, 'para': m.group(1), 'deger': float(m.group(2).replace(',', '')), 'ad': ad, 'yazi': e, 'kaynak': 'etiket'})
    out = []
    j = 0
    while j < len(og):
        seri = [x for x in og[j:] if x['para'] == og[j]['para'] and tz[x['i']][0] - tz[og[j]['i']][0] <= 30]
        toplam = None
        for x in seri:
            digr = sum(y['deger'] for y in seri if y is not x)
            if len(seri) >= 4 and digr and abs(x['deger'] - digr) / digr <= 0.06:
                toplam = x
        deg = [x for x in seri if x is not toplam and x['ad']]
        ad_gor = {}
        for x in deg:
            ad_gor.setdefault(x['ad'], x['deger'])
        if len(ad_gor) >= 3:
            hedef = toplam['i'] if toplam else next((x['i'] for x in reversed(seri) if x['kaynak'] == 'etiket'), seri[-1]['i'])
            if toplam:
                baslik = f"{toplam['para']}{toplam['deger']:g}M" + (' · ' + NOKTA.split(toplam['yazi'])[0] if toplam['yazi'] else '')
            else:
                b = next((b for b in reversed(bol) if b['bas'] <= tz[hedef][0] + 0.01), None)
                baslik = f"{re.sub(r'^THE ', '', ust(b['baslik']))} · {seri[0]['para']}M" if b else f"{seri[0]['para']} M"
            out.append({'tur': 'grafik', 'op': 'donustur' if C[hedef].get('kart') else 'etiket', 'i': hedef, 'skor': 4.5,
                        'tuketir': sorted({x['i'] for x in seri if x['kaynak'] == 'etiket'}),
                        'neden': f"{len(ad_gor)} {seri[0]['para']} degeri {tz[seri[0]['i']][0]:.0f}-{tz[seri[-1]['i']][0]:.0f} s" + (' + toplam karti' if toplam else '') + ' (kategorik -> cubuk yarisi)',
                        'kart': {'tur': 'grafik', 'baslik': baslik, 'birim': 'M', 'seriler': [{'ad': a, 'degerler': [v]} for a, v in ad_gor.items()]}})
            j += len(seri)
        else:
            j += 1
    return out


def d_degisim(veri, tz, cum):
    out, C = [], veri['cekimler']
    for i, c in enumerate(C):
        s = c.get('etiket') if not c.get('kart') else None
        if s and re.search(r'→|->', s):
            p = NOKTA.split(ust(s))
            ok = p[-1] if p else ust(s)
            e, y = [x.strip() for x in re.split(r'→|->', ok, maxsplit=1)]
            out.append({'tur': 'degisim', 'op': 'etiket', 'i': i, 'skor': 3.5, 'neden': f"'{s}' donusum oku",
                        'kart': {'tur': 'degisim', 'eski': e, 'yeni': y, 'ust': p[0] if len(p) > 1 else None}})
    for k, cm in enumerate(cum):
        ikili = cm['metin'] + ' ' + (cum[k + 1]['metin'] if k + 1 < len(cum) else '')
        for rx in DEGISIM_RE:
            m = rx.search(ikili)
            if not m:
                continue
            e, y = ust(m.group(1)), ust(m.group(2))
            # hedef: o cumleler sirasinda baslayan kelime karti (yazida yeni ifade geciyor) ya da duz cekim
            aday = [i for i, (a, b) in enumerate(tz) if cm['bas'] - 0.3 <= a <= (cum[k + 1]['son'] if k + 1 < len(cum) else cm['son'])]
            kk = [i for i in aday if (C[i].get('kart') or {}).get('tur') == 'kelime' and y.split()[0] in kart_metin(C[i])]
            if kk:
                out.append({'tur': 'degisim', 'op': 'donustur', 'i': kk[0], 'skor': 4, 'neden': f"anlatim: '{m.group(0)[:60]}'",
                            'kart': {'tur': 'degisim', 'eski': ('A ' if not e.startswith(('A ', 'THE ')) else '') + e, 'yeni': y}})
            break
    return out


def d_coklu(veri, tz, cum):
    out, C = [], veri['cekimler']
    duz = lambda i: not C[i].get('kart') and not C[i].get('etiket') and tz[i][1] - tz[i][0] >= 1.8
    for cm in cum:
        hedef = [i for i, (a, b) in enumerate(tz) if a <= cm['bas'] + 0.2 < b]
        if not hedef:
            continue
        i = hedef[0]
        if DIKKAT.search(cm['metin']) and duz(i):
            out.append({'tur': 'coklu', 'op': 'ekle', 'i': i, 'skor': 2.5, 'neden': f"dikkat cagrisi: '{cm['metin'][:50]}'", 'kart': {'tur': 'coklu', 'duzen': 'odak-karartma'}})
        elif ZIT.search(cm['metin']) and duz(i):
            diger = [j for j in range(max(0, i - 4), min(len(C), i + 5)) if j != i and C[j].get('tag') != C[i].get('tag') and not C[j].get('src')]
            if diger:
                j = min(diger, key=lambda j: abs(j - i))
                out.append({'tur': 'coklu', 'op': 'ekle', 'i': i, 'skor': 2.5, 'neden': f"karsitlik: '{cm['metin'][:50]}'",
                            'kart': {'tur': 'coklu', 'duzen': 'bolunmus', 'm2': C[j]['tag'], 'kb2': C[j].get('kb', 0)}})
    return out


def d_harita(cum):
    out = []
    for cm in cum:
        for m in re.finditer(r"\b(to|from|in)\s+([A-Z][a-zé]+(?: [A-Z][a-z]+)?)", cm['metin']):
            if m.group(2).lower() in YER:
                out.append({'t': round(cm['bas'], 1), 'yer': m.group(2), 'yon': m.group(1), 'cumle': cm['metin'][:90]})
    return out


BIRLESTIR_SN = 25.0   # >= 3 ardisik benzer kart bu sure icindeyse TEK zengin sahne olur (digerleri goruntuye doner)


def birlestir_mi(C, tz, idx):
    """seri kartlari ardisik mi (aralarinda baska tam ekran kart yok) ve BIRLESTIR_SN icinde mi"""
    idx = sorted(idx)
    if len(idx) < 3 or not all(C[i].get('kart') for i in idx) or tz[idx[-1]][0] - tz[idx[0]][0] > BIRLESTIR_SN:
        return False
    return not any(kart_tam(C[j]) for j in range(idx[0], idx[-1]) if j not in idx)


def d_kart_dizisi(veri, tz):
    """25 sn icinde >= 3 ardisik kelime karti (baska bir zengin firsatin almadigi) -> tek liste sahnesi, son kartin yerinde"""
    C = veri['cekimler']
    kartlar = [i for i, c in enumerate(C) if kart_tam(c)]
    out, j = [], 0
    while j < len(kartlar):
        seri = [kartlar[j]]
        for x in kartlar[j + 1:]:
            if (C[x]['kart'].get('tur') != 'kelime') or tz[x][0] - tz[seri[0]][0] > BIRLESTIR_SN:
                break
            seri.append(x)
        if C[seri[0]]['kart'].get('tur') == 'kelime' and len(seri) >= 3:
            mad = []
            for i in seri:
                k = C[i]['kart']
                a, b = ust(k.get('a')).strip('"“” '), ust(k.get('b')).strip('"“” ')
                m = a if not b or len((a + ' ' + b).split()) > 5 else f"{a} {b}"
                mad.append(m[:30])
            out.append({'tur': 'liste', 'op': 'donustur', 'i': seri[-1], 'skor': 3, 'tuketir': seri, 'birlestir': True,
                        'neden': f"{len(seri)} ardisik kelime karti {tz[seri[0]][0]:.0f}-{tz[seri[-1]][0]:.0f} s -> tek liste", 'kart': {'tur': 'liste', 'maddeler': mad}})
            j += len(seri)
        else:
            j += 1
    return out


# ---------------------------------------------------------------- dramaturji (video duzeyinde kurgu plani)
DORUK_RE = re.compile(r'\b(REAL REASON|THE REASON|TRUTH|THE ANSWER|SECRET|REVEAL|TURNING POINT|WHY IT|WHAT REALLY)\b', re.I)
COKLU_DUZEN = {'tam', 'letterbox', 'odak-karartma', 'bolunmus', 'kolaj'}
TS_BUTCE = None


ZAMAN_SICRAMA = re.compile(r'^(DECADES|YEARS|MONTHS|CENTURIES|\d+\s+YEARS|[A-Z]+\s+YEARS|TODAY|NOW|SINCE THEN|AFTER THE WAR)\b')


def d_yerel_ai(veri, tz, kel, metin_yolu, kapali=False):
    """YEREL AI ADAYLARI (yerel_ai.sahne_firsatlari): AI yalniz ANI ve TURU aday gosterir; ekrana giden yazi motorca
    SESLENDIRME METNINDEN birebir kurulur (AI'nin 'veri'si kullanilmaz: olcumde Turkce/uydurma yaziyordu).
    Kurulabilen: degisim (onceki yil -> 'DECADES LATER' gibi zaman sicramasi). Kurulamayanlar raporda 'insan baksin'.
    Ollama yoksa / kapaliysa ([], durum notu) — davranis aynen. -> (firsatlar, oneriler[{t,tur,kanit,neden}], not)"""
    if kapali:
        return [], [], 'kapali (--yerel-ai-yok)'
    try:
        import yerel_ai
        if not yerel_ai.hazir():
            return [], [], 'Ollama yok: yalniz kural dedektorleri'
        metin = open(metin_yolu, encoding='utf-8').read() if metin_yolu and os.path.isfile(metin_yolu) else ' '.join(w['k'] for w in kel)
        oner = yerel_ai.sahne_firsatlari(metin, [{'k': w['k'], 'bas': w['bas'], 'son': w['son']} for w in kel])
    except Exception as h:
        return [], [], f'hata ({h.__class__.__name__}): yalniz kural dedektorleri'
    if not oner:
        return [], [], 'oneri yok'
    C, out, rap = veri['cekimler'], [], []
    for o in oner:
        ix = o.get('kelime_index', -1)
        if ix is None or ix < 0 or ix >= len(kel):
            rap.append({'t': -1, 'tur': o['tur'], 'kanit': o['kanit'][:80], 'neden': 'kanit metinde birebir yok (uydurma) -> atildi'})
            continue
        t = kel[ix]['bas']
        i = next((j for j, (a, b) in enumerate(tz) if a - 0.05 <= t < b), None)
        kart = None
        if o['tur'] == 'degisim':
            # kanit cumlesinin icinde zaman sicramasi ("Decades later,") ara; once gecen son yil eski deger
            n_kanit = max(1, len(o['kanit'].split()))
            for bas in range(ix, min(len(kel), ix + n_kanit)):
                ifade = []
                for w in kel[bas:bas + 6]:
                    ifade.append(re.sub(r"[^\w']", '', w['k']))
                    if re.search(r'[,.;:!?]$', w['k']):
                        break
                yeni = ust(' '.join(x for x in ifade if x))
                if not (ZAMAN_SICRAMA.match(yeni) and len(yeni) <= 24):
                    continue
                yil = next((m.group(1) for w in reversed(kel[max(0, bas - 120):bas]) for m in [YIL.search(w['k'])] if m), None)
                if yil:
                    kart = {'tur': 'degisim', 'eski': yil, 'yeni': yeni}
                    t = kel[bas]['bas']
                    i = next((j for j, (a, b) in enumerate(tz) if a - 0.05 <= t < b), None)
                break
        if kart and i is not None:
            out.append({'tur': kart['tur'], 'op': 'ekle', 'i': i, 'skor': 3.2, 'neden': f"yerel AI adayi, yazi metinden: '{kart['eski']} -> {kart['yeni']}'", 'kart': kart})
        else:
            rap.append({'t': round(t, 1), 'tur': o['tur'], 'kanit': o['kanit'][:80],
                        'neden': 'yazi seslendirme metninden kurulamadi (insan baksin)' if i is not None else 'zaman cekime oturmadi'})
    return out, rap, f'{len(oner)} aday: {len(out)} kurulabilir, {len(rap)} raporda'


def butce():
    global TS_BUTCE
    if TS_BUTCE is None:
        TS_BUTCE = KD.ts_sabitleri()['butce']
    return TS_BUTCE


def dramaturji(P, bol, dna, fps):
    """bolumler + rol (kanca / giris / bolum / doruk / kapanis) + muamele; cerceve bloklari, imza noktalari, vurus butcesi.
    Muamele bolum boyunca tutarli, bolum sinirinda degisir: kanca yuksek enerji (canli ton, hizli kamera, cercevesiz), bolumler
    DNA cercevesi / cercevesiz donusumlu + arka plan rolu + hafif ton farki, doruk letterbox (bolum durumu) + soguk ton + yavas
    kamera, kapanis sakin. -> islem listesi"""
    C = P['veri']['cekimler']
    tz = zamanla(P['veri'])
    T = sum(c['kare'] for c in C)
    bas_k = [round(a * fps) for a, _ in tz]
    bas_k = [sum(c['kare'] for c in C[:i]) for i in range(len(C))]
    # bolum sinirlari cekim basina oturur
    sinir = []
    for b in bol:
        i = next((i for i, (a, s2) in enumerate(tz) if a <= b['bas'] + 0.15 < s2), None)
        if i is not None and (not sinir or bas_k[i] > sinir[-1][0]):
            sinir.append((bas_k[i], re.sub(r'^\d+[.)]?\s*', '', b['baslik']).strip()))
    if not sinir:   # metinde '#' yok: kanca 30 sn, sonra ~100 sn'lik parcalar (cekim basinda)
        sinir = [(0, 'KANCA')]
        t = 30 * fps
        while t < T - 60 * fps:
            i = next(i for i in range(len(C)) if bas_k[i] >= t)
            sinir.append((bas_k[i], f'BOLUM {len(sinir)}'))
            t = bas_k[i] + 100 * fps
    if sinir[0][0] != 0:
        sinir.insert(0, (0, 'KANCA'))
    n = len(sinir)
    rol = []
    for k, (b0, ad) in enumerate(sinir):
        rol.append('kanca' if k == 0 else 'kapanis' if k == n - 1 and n > 2 else 'giris' if ATLA_BOLUM.search(ad) else 'bolum')
    orta = [k for k in range(n) if rol[k] == 'bolum']
    if orta:
        dk = next((k for k in orta if DORUK_RE.search(sinir[k][1])), None)
        if dk is None:
            dk = min(orta, key=lambda k: abs(sinir[k][0] / T - 0.65))
        rol[dk] = 'doruk'
    K = [t for t in dict.fromkeys(dna.get('cerceve') or []) if t not in COKLU_DUZEN]
    bolumler, j = [], 0
    for k, (b0, ad) in enumerate(sinir):
        b1 = sinir[k + 1][0] if k + 1 < n else T
        r = rol[k]
        if r == 'kanca':
            m = {'cerceve': 'tam', 'ton': {'doygunluk': 1.08, 'kontrast': 1.05}, 'tempo': 1.15, 'arkaplan': 1}
        elif r == 'giris':
            m = {'cerceve': 'tam', 'tempo': 1.0, 'arkaplan': 1}
        elif r == 'doruk':
            m = {'letterbox': True, 'cerceve': 'tam', 'ton': {'doygunluk': 0.82, 'kontrast': 1.08, 'parlaklik': 0.96}, 'tempo': 0.75, 'arkaplan': 2}
        elif r == 'kapanis':
            m = {'cerceve': 'tam', 'ton': {'doygunluk': 0.9, 'kontrast': 0.98}, 'tempo': 0.85, 'arkaplan': 1}
        else:
            m = {'cerceve': (K[(j // 2) % len(K)] if K and j % 2 == 0 else 'tam'), 'tempo': (1.0, 0.92)[j % 2], 'arkaplan': (1, 2)[j % 2]}
            if j % 2:
                m['ton'] = {'doygunluk': 0.94, 'kontrast': 1.03, 'parlaklik': 0.99}
            j += 1
        bolumler.append({'bas': b0, 'son': b1, 'ad': ad, 'rol': r, 'muamele': m})
    P['veri']['bolumler'] = bolumler
    islem = [f"{b['bas'] / fps:.0f}-{b['son'] / fps:.0f}s **{b['rol']}** {b['ad']}: cerceve {b['muamele'].get('cerceve')}"
             + (' + LETTERBOX (bolum durumu)' if b['muamele'].get('letterbox') else '')
             + f", tempo {b['muamele'].get('tempo', 1):g}, ton {b['muamele'].get('ton') or 'notr'}, zemin rolu {b['muamele'].get('arkaplan')}" for b in bolumler]
    # cerceve bloklari: cerceveli bolumde ardisik duz goruntu kosulari; blok basina tek giris, bloklar arasi >= araSn
    B = butce()['cerceveGiris']
    tavan = max(1, math.ceil(T / fps / 60 * B['dakikada']))
    oran = max(0.3, 2 * float((dna.get('iskelet') or {}).get('cerceveli_oran') or 0.15))
    for c in C:
        c.pop('cerceve', None)
        c.pop('imza', None)
    giris, son_g = 0, -1e9
    for b in bolumler:
        tip = b['muamele'].get('cerceve')
        if not tip or tip == 'tam':
            continue
        idx = [i for i in range(len(C)) if b['bas'] <= bas_k[i] < b['son']]
        hedef = oran * sum(C[i]['kare'] for i in idx)
        kos, akt = [], []
        for i in idx:
            if not C[i].get('kart') and not C[i].get('src'):
                akt.append(i)
            elif akt:
                kos.append(akt)
                akt = []
        if akt:
            kos.append(akt)
        alinan = 0
        for ks in kos:
            sure = sum(C[i]['kare'] for i in ks)
            if sure < 3 * fps or alinan >= hedef or giris >= tavan or bas_k[ks[0]] - son_g < B['araSn'] * fps:
                continue
            blok, s2 = [], 0
            for i in ks:
                blok.append(i)
                s2 += C[i]['kare']
                if s2 >= 12 * fps:
                    break
            for i in blok:
                C[i]['cerceve'] = tip
            alinan += s2
            giris += 1
            son_g = bas_k[blok[-1]] + C[blok[-1]]['kare']
            islem.append(f"  {bas_k[blok[0]] / fps:.0f}s {tip} blogu {s2 / fps:.1f} sn ({len(blok)} cekim, tek giris)")
    # imza noktalari: bolum acilisi + doruk acilisi
    for b in bolumler[1:]:
        i = bas_k.index(b['bas'])
        C[i]['imza'] = True
    # vurus butcesi: bolum acilisi > doruk > sayi aciklamasi > diger vurgu; araSn aralik, dakikada tavan
    B = butce()['vurus']
    tavan = max(1, math.ceil(T / fps / 60 * B['dakikada']))
    bul = lambda f: next((b for b in bolumler if b['bas'] <= f < b['son']), bolumler[-1])
    aday = []
    for i, c in enumerate(C):
        k = c.get('kart') or {}
        sayi = k.get('tur') == 'sayi'
        if not (c.get('flas') or sayi):
            continue
        b = bul(bas_k[i])
        oncelik = 3 if bas_k[i] - b['bas'] < 4 * fps else 2.5 if b['rol'] == 'doruk' else 2 if sayi else 1
        aday.append((-oncelik, bas_k[i], i))
    tut = []
    for _o, f, i in sorted(aday):
        if len(tut) < tavan and all(abs(f - x) >= B['araSn'] * fps for x in tut):
            tut.append(f)
            C[i]['imza'] = True
        else:
            if C[i].get('flas'):
                C[i]['flas'] = False
            if (C[i].get('kart') or {}).get('tur') == 'sayi':
                C[i]['kart']['vurus'] = False
    islem.append(f"vurus paketi: {len(aday)} aday -> {len(tut)} (butce {tavan}, aralik >= {B['araSn']:g} sn; bolum acilisi > doruk > sayi > vurgu)")
    return islem


def d_bolum(veri, tz, bol):
    out, n = [], 0
    uygun = [b for b in bol if not ATLA_BOLUM.search(b['baslik'])]
    for b in uygun:
        n += 1
        b['no'] = n
        i = next((i for i, (a, s) in enumerate(tz) if a <= b['bas'] + 0.15 < s), None)
        if i is None:
            continue
        baslik = re.sub(r'^\d+[.)]?\s*', '', b['baslik']).strip()
        out.append({'tur': 'bolum', 'op': 'ekle', 'i': i, 'skor': 5, 'bolum': True, 'neden': f"metin basligi '# {b['baslik']}'",
                    'kart': {'tur': 'bolum', 'no': n, 'baslik': baslik}})
    return out, len(uygun)


# ---------------------------------------------------------------- uygulama
def kart_tam(c):
    k = c.get('kart')
    return bool(k) and k.get('tur') not in TAM_EKRAN_DISI


def tur_sayisi_ok(C, tz, i, tur):
    """ayni tur 2 dk icinde en cok 3 (i'ye konunca)"""
    t = tz[i][0]
    say = sum(1 for j, c in enumerate(C) if j != i and (c.get('kart') or {}).get('tur') == tur and abs(tz[j][0] - t) < TUR_PENCERE)
    # pencere: i'yi iceren her 120 sn pencere icin kontrol (kayan)
    ts = sorted([tz[j][0] for j, c in enumerate(C) if j != i and (c.get('kart') or {}).get('tur') == tur] + [t])
    for a in ts:
        if sum(1 for x in ts if a <= x < a + TUR_PENCERE) > TUR_TAVAN and a <= t < a + TUR_PENCERE:
            return False
    return True


def bosluk_ok(C, tz, i, j_son):
    """[i, j_son] araligina konacak kartin oncesi ve sonrasi en az GAP sn kartsiz"""
    a, b = tz[i][0], tz[j_son][1]
    for j, c in enumerate(C):
        if i <= j <= j_son or not kart_tam(c):
            continue
        if tz[j][1] <= a and a - tz[j][1] < GAP:
            return False
        if tz[j][0] >= b and tz[j][0] - b < GAP:
            return False
    return True


def duz(c):
    return not c.get('kart') and not c.get('etiket') and c.get('hud') in (None,)


def yerlestir(P, i, kart, dna, op, fps, bolum=False):
    """kart'i cekim i'ye koy; sure okuma ihtiyacina uydurulur. -> (ok, aciklama)"""
    kart = {k: v for k, v in kart.items() if v is not None}     # null alan TS varsayilanini ezer (onEk: null -> 'null64')
    C = P['veri']['cekimler']
    tz = zamanla(P['veri'])
    gerek = ihtiyac(kart, dna)
    sure = tz[i][1] - tz[i][0]
    j = i
    # kisaysa: sonraki duz cekimleri yut (bolum sinirini gecmeden; kelime zamanlari degismez)
    while sure < gerek and j + 1 < len(C) and duz(C[j + 1]):
        j += 1
        sure = tz[j][1] - tz[i][0]
    if sure < gerek * 0.92:
        return False, f"sure yetmiyor ({sure:.1f} / {gerek:.1f} sn)"
    if op in ('ekle', 'etiket') and not bolum and kart['tur'] not in TAM_EKRAN_DISI and not bosluk_ok(C, tz, i, j):
        return False, f"komsu karta {GAP:.0f} sn'den yakin"
    if kart['tur'] not in TAM_EKRAN_DISI and not tur_sayisi_ok(C, tz, i, kart['tur']):
        return False, f"'{kart['tur']}' 2 dk icinde zaten {TUR_TAVAN} kez"
    toplam = sum(C[x]['kare'] for x in range(i, j + 1))
    yeni = dict(C[i])
    yeni['kart'] = kart
    if op in ('etiket', 'donustur') or kart['tur'] != 'coklu':
        yeni['etiket'] = None if kart['tur'] != 'coklu' else yeni.get('etiket')
    kare = toplam
    kalan = None
    # uzunsa (yalniz eklemede): kart = ihtiyac + 0,8 sn, geri kalani ayni kaynakta goruntu
    if op == 'ekle' and kart['tur'] != 'coklu' and toplam / fps > gerek + 2.5:
        kare = int(round((gerek + 0.8) * fps))
        kalan = dict(C[i])
        kalan['kart'], kalan['hud'] = None, None
        kalan['kare'] = toplam - kare
        kalan['kb'] = round(float(C[i].get('kb') or 0) + kare / fps, 3)
        kalan.pop('etiket_ust', None)
    yeni['kare'] = kare
    yutulan = j - i
    if yutulan and any(C[x].get('hud') for x in range(i + 1, j + 1)):
        yeni['hud'] = next(C[x]['hud'] for x in range(i + 1, j + 1) if C[x].get('hud'))
    C[i:j + 1] = [yeni] + ([kalan] if kalan else [])
    return True, f"{sure:.1f} sn (gerek {gerek:.1f})" + (f", {yutulan} cekim yutuldu" if yutulan else '') + (f", {kalan['kare'] / fps:.1f} sn goruntu kaldi" if kalan else '')


def kart_payi(P):
    tz = zamanla(P['veri'])
    top = tz[-1][1] if tz else 1
    return sum(b - a for (a, b), c in zip(tz, P['veri']['cekimler']) if kart_tam(c)) / top


def seyrelt(P, dna):
    """ayni kart anahtari 2 dk icinde > 3: fazlaliklar once 'zemin' yerlesimine (kelime), sonra alt banda cevrilir"""
    islem = []
    for _ in range(400):
        cek, _y = KD.plan_ogeleri(P['veri'], dna)
        fails = KD.varyant_denetle(cek)
        if not fails:
            break
        # ilk ihlal: anahtarin 120 sn penceresindeki 4. ogesi
        by = {}
        for c in cek:
            if c.get('anahtar'):
                by.setdefault(c['anahtar'], []).append(c)
        hedef = None
        for an, cs in sorted(by.items(), key=lambda x: min(c['bas'] for c in x[1])):
            for a in range(len(cs)):
                pen = [c for c in cs[a:] if c['bas'] - cs[a]['bas'] <= KD.VARYANT_PENCERE]
                if len(pen) > KD.VARYANT_TAVAN:
                    # pencerenin en az vurgulu karti: flas (anlam vurgusu) olanlar korunur; once yerlesimi degismemis, sonra uzun yazili
                    C0 = P['veri']['cekimler']
                    aday = [c for c in pen if not c.get('flas')] or pen[KD.VARYANT_TAVAN:]
                    hedef = (an, max(aday, key=lambda c: ((C0[c['i']]['kart'] or {}).get('yerlesim') != 'zemin',
                                                           len(KD.tokenler(' '.join(str(C0[c['i']]['kart'].get(x) or '') for x in ('a', 'b')))), c['bas'])))
                    break
            if hedef:
                break
        if not hedef:
            break
        an, c = hedef
        cc = P['veri']['cekimler'][c['i']]
        k = cc['kart']
        if k['tur'] == 'kelime' and k.get('yerlesim') != 'zemin' and not cc.get('etiket_ust'):
            k['yerlesim'] = 'zemin'
            islem.append(f"#{c['i']} {c['bas']:.0f}s kelime '{k.get('a')}': ikinci yerlesim (kaynak zemini, ortada) — '{an}' seyreltme")
            # yerlesim degisikligi baska anahtari tasirirsa bir sonraki turda alt banda iner
            cek2, _ = KD.plan_ogeleri(P['veri'], dna)
            if len(KD.varyant_denetle(cek2)) < len(fails):
                continue
            k.pop('yerlesim', None)
            islem.pop()
        if k['tur'] in ('kelime', 'sayi'):
            metin = ' · '.join(x for x in [k.get('a'), k.get('b')] if x)
            cc['kart'] = None
            cc['etiket'] = metin[:60]
            islem.append(f"#{c['i']} {c['bas']:.0f}s {k['tur']} '{metin[:40]}' -> alt bant ('{an}' 2 dk'da {KD.VARYANT_TAVAN}'ten fazla)")
        else:
            islem.append(f"#{c['i']} {an}: seyreltilemedi (tur {k['tur']})")
            break
    return islem


def cesit_doldur(P, dna, cum):
    """< 3 sahne turlu 60 sn pencere: penceredeki en uygun duz cekime medya duzeni (coklu). Yaninda baska kaynak varsa bolunmus
    (iki goruntu yan yana), yoksa odak-karartma; anlatimda ozel ad gecen cumledeki cekim once."""
    islem = []
    for _ in range(12):
        cek, _y = KD.plan_ogeleri(P['veri'], dna)
        bul, pen = KD.cesit_denetle(cek)
        if not bul:
            break
        C = P['veri']['cekimler']
        tz = zamanla(P['veri'])
        ilerledi = False
        for (t0, t1, tur) in pen:
            if len(tur) >= KD.CESIT_ASGARI:
                continue
            aday = [i for i, (a, b) in enumerate(tz) if t0 <= a and b <= t1 and not C[i].get('kart') and not C[i].get('etiket')
                    and not C[i].get('src') and b - a >= 2.0]
            if not aday:
                islem.append(f"{t0:.0f}-{t1:.0f}s: tekduze, uygun duz cekim (>= 2 sn) yok")
                continue
            ad = lambda i: any(re.search(r"\s[A-Z][a-z]{2,}", cm['metin']) for cm in cum if tz[i][0] - 0.2 <= cm['bas'] < tz[i][1])
            komsu = lambda i: [j for j in (i - 1, i + 1, i - 2, i + 2) if 0 <= j < len(C) and C[j].get('tag') != C[i].get('tag') and not C[j].get('src')]
            i = max(aday, key=lambda i: (bool(komsu(i)), ad(i), tz[i][1] - tz[i][0]))
            if komsu(i):
                j = komsu(i)[0]
                C[i]['kart'] = {'tur': 'coklu', 'duzen': 'bolunmus', 'm2': C[j]['tag'], 'kb2': C[j].get('kb', 0)}
            else:
                C[i]['kart'] = {'tur': 'coklu', 'duzen': 'odak-karartma'}
            islem.append(f"#{i} {tz[i][0]:.0f}s {t0:.0f}-{t1:.0f}s penceresi tekduzeydi ({', '.join(sorted(tur))}) -> coklu {C[i]['kart']['duzen']}")
            ilerledi = True
            break
        if not ilerledi:
            break
    return islem


def hud_ekle(P, bol, n_bolum, tip, sn):
    if tip == 'yok' or not bol:
        return []
    C = P['veri']['cekimler']
    tz = zamanla(P['veri'])
    islem = []
    for b in bol:
        i = next((i for i, (a, s) in enumerate(tz) if a <= b['bas'] + 0.15 < s), None)
        if i is None:
            continue
        if b.get('no'):
            h = {'tip': tip, 'deger': b['no'], 'baslangic': n_bolum, 'etiket': re.sub(r'^\d+[.)]?\s*', '', b['baslik']).strip()}
            if tip == 'tarih-rozeti':
                h = {'tip': tip, 'etiket': h['etiket'], 'ust': f"CHAPTER {b['no']:02d}"}
            if sn:
                h['sn'] = sn
            C[i]['hud'] = h
            islem.append(f"#{i} {tz[i][0]:.0f}s HUD {tip}: {b['no']}/{n_bolum} {h['etiket']}")
        elif i > 0:
            C[i]['hud'] = False
    return islem


def dagilim(P, dna):
    cek, _ = KD.plan_ogeleri(P['veri'], dna)
    d, top = KD.tur_dagilimi(cek)
    return {k: {'adet': v[0], 'sn': round(v[1], 1), 'pay': round(v[1] / top, 3)} for k, v in sorted(d.items(), key=lambda x: -x[1][1])}, cek


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan', required=True)
    ap.add_argument('--metin')
    ap.add_argument('--rakip', nargs='*', default=[])
    ap.add_argument('--cikti')
    ap.add_argument('--rapor')
    ap.add_argument('--yil', type=int, default=datetime.date.today().year)
    ap.add_argument('--hud', default='bolum-cetveli', choices=['bolum-cetveli', 'tarih-rozeti', 'yok'])
    ap.add_argument('--hud-sn', type=float, default=8, help='HUD bolum basindan en cok kac sn (0 = bolum boyunca). Varsayilan 8: '
                    'kalici cetvel parlak goruntude ve coklu/alt bant/altyazi ile birlikte kalabaliklasiyor (v04 gozle kontrol)')
    ap.add_argument('--yerel-ai-yok', action='store_true', help='yerel AI (Ollama) sahne adaylarini kapat (yalniz kural dedektorleri)')
    ap.add_argument('--tamamlama', action='store_true', help='eski DNA\'yi varyantlarla tamamlama (varsayilan: tamamla)')
    a = ap.parse_args()
    P0 = jy(a.plan)
    P = copy.deepcopy(P0)
    dna = P['dna']
    eklenen_dna = []
    if not a.tamamlama:
        import stil_dna
        eklenen_dna = stil_dna.varyant_tamamla(dna, stil_dna.repertuar_bul(None, stil_dna.kutuphane_bul()))
    veri = P['veri']
    fps = veri['fps']
    kel = veri.get('kelimeler') or []
    cum = cumleler(kel)
    bol = bolumler(a.metin, kel)
    ref = KD.rakip_hedef(a.rakip) if a.rakip else None
    hedef_pay = min(0.35, max(0.15, ref['kart_pay'])) if ref and ref.get('kart_pay') else 0.20
    once, _ = dagilim(P0, P0['dna'])        # once: videonun izlenen hali (eski DNA ile)
    once_pay = kart_payi(P0)

    tz = zamanla(veri)
    bolum_f, n_bolum = d_bolum(veri, tz, bol)
    firsat = (bolum_f + d_zaman(veri, tz) + d_liste(veri, tz) + d_karsilastirma(veri, tz) + d_grafik(veri, tz, bol)
              + d_yil(veri, tz, a.yil) + d_degisim(veri, tz, cum) + d_coklu(veri, tz, cum) + d_kart_dizisi(veri, tz))
    ai_f, ai_rap, ai_not = d_yerel_ai(veri, tz, kel, a.metin, a.yerel_ai_yok)
    firsat += ai_f
    harita = d_harita(cum)
    # uygulama sirasi: bolum (yapi) -> donusumler (tekrari azaltir) -> eklemeler; ayni skorda erken olan once.
    # Cekim indeksleri her uygulamada kayar: firsatlar cekimin (tag, kb, baslangic sn) kimligiyle yeniden bulunur.
    kimlik = lambda i: (veri['cekimler'][i].get('tag'), round(float(veri['cekimler'][i].get('kb') or 0), 2), round(tz[i][0], 2))
    for f in firsat:
        f['kimlik'] = kimlik(f['i'])
        f['t'] = round(tz[f['i']][0], 1)
        f['tuketir_k'] = [kimlik(x) for x in f.get('tuketir', [])]
    sira = {'ekle': 2, 'etiket': 1, 'donustur': 1}
    firsat.sort(key=lambda f: (0 if f.get('bolum') else sira[f['op']], -f['skor'], f['t']))
    uygulanan, reddedilen, dolu = [], [], set()
    for f in firsat:
        tz2 = zamanla(P['veri'])
        C = P['veri']['cekimler']
        bul = lambda kk: next((i for i, c in enumerate(C) if (c.get('tag'), round(float(c.get('kb') or 0), 2)) == kk[:2] and abs(tz2[i][0] - kk[2]) < 0.05), None)
        i = bul(f['kimlik'])
        if i is None or f['kimlik'] in dolu or any(k in dolu for k in f.get('tuketir_k', [])):
            reddedilen.append((f, 'cekim baska firsatla degisti'))
            continue
        c = C[i]
        if f['op'] == 'ekle' and (c.get('kart') or c.get('etiket')) and not f.get('bolum'):
            reddedilen.append((f, 'cekim artik duz degil'))
            continue
        if f.get('bolum') and kart_tam(c):
            reddedilen.append((f, 'bolum basinda zaten kart var'))
            continue
        if f['op'] == 'donustur' and not c.get('kart'):
            reddedilen.append((f, 'donusturulecek kart yok'))
            continue
        if f['op'] == 'ekle' and not f.get('bolum') and f['kart']['tur'] != 'coklu' and kart_payi(P) >= hedef_pay + 0.05:
            reddedilen.append((f, f"yogunluk hedefi dolu (kart payi %{kart_payi(P) * 100:.0f} >= %{(hedef_pay + 0.05) * 100:.0f})"))
            continue
        ok, ac = yerlestir(P, i, f['kart'], dna, 'ekle' if f.get('bolum') else f['op'], fps, bolum=bool(f.get('bolum')))
        if ok:
            dolu.add(f['kimlik'])
            dolu.update(f.get('tuketir_k', []))
            if f.get('birlestir'):
                # ardisik kart dizisi tek zengin sahnede: serinin diger kartlari goruntuye doner (altyazi geri gelir)
                tz3 = zamanla(P['veri'])
                C3 = P['veri']['cekimler']
                n0 = 0
                for kk in f.get('tuketir_k', []):
                    j = next((x for x, c in enumerate(C3) if (c.get('tag'), round(float(c.get('kb') or 0), 2)) == kk[:2] and abs(tz3[x][0] - kk[2]) < 0.05), None)
                    if j is not None and kk != f['kimlik'] and (C3[j].get('kart') or {}).get('tur') in ('kelime', 'sayi'):
                        C3[j]['kart'] = None
                        n0 += 1
                ac += f", {n0} kart tek sahnede birlesti"
            uygulanan.append((f, ac))
        else:
            reddedilen.append((f, ac))
    hud_islem = hud_ekle(P, bol, n_bolum, a.hud, a.hud_sn)
    sey = seyrelt(P, dna)
    sey += cesit_doldur(P, dna, cum)
    dram = dramaturji(P, bol, dna, fps)
    P['veri']['toplam'] = sum(c['kare'] for c in P['veri']['cekimler'])
    assert P['veri']['toplam'] == sum(c['kare'] for c in P0['veri']['cekimler']), 'toplam kare degisti'
    sonra, cek2 = dagilim(P, dna)
    sonra_pay = kart_payi(P)
    cikti = a.cikti or re.sub(r'\.json$', '-zengin.json', a.plan)
    json.dump(P, open(cikti, 'w', encoding='utf-8'), ensure_ascii=False)
    cesit_once = KD.cesit_denetle(KD.plan_ogeleri(P0['veri'], P0['dna'])[0])
    cesit_sonra = KD.cesit_denetle(cek2)
    var_once = KD.varyant_denetle(KD.plan_ogeleri(P0['veri'], P0['dna'])[0])
    var_sonra = KD.varyant_denetle(cek2)
    rapor = a.rapor or os.path.join(os.path.dirname(os.path.abspath(cikti)), 'SAHNE-ZENGIN.md')
    L = [f"# Sahne zenginlestirme — {os.path.basename(a.plan)} -> {os.path.basename(cikti)}", '',
         f"- bolum: {len(bol)} metin basligi, {n_bolum} bolum karti adayi · cumle {len(cum)} · rakip grafik/kart payi "
         + (f"%{ref['kart_pay'] * 100:.0f}" if ref and ref.get('kart_pay') else 'olculmemis') + f" -> hedef %{hedef_pay * 100:.0f} (+5 tolerans)",
         f"- tam ekran kart payi: %{once_pay * 100:.0f} -> %{sonra_pay * 100:.0f}",
         f"- ayni tur+varyant FAIL (2 dk > {KD.VARYANT_TAVAN}): {len(var_once)} -> {len(var_sonra)} · tekduze dakika (< {KD.CESIT_ASGARI} tur): {len(cesit_once[0])} -> {len(cesit_sonra[0])}",
         f"- DNA tamamlandi: {', '.join(f'{e}={dna[e]}' for e in eklenen_dna) or '-'}", '',
         '## Sahne turu dagilimi (adet / pay)', '', '| tur | once | sonra |', '|---|---|---|']
    for t in sorted(set(once) | set(sonra), key=lambda t: -(sonra.get(t, {}).get('sn', 0))):
        o, s = once.get(t, {}), sonra.get(t, {})
        L.append(f"| {t} | {o.get('adet', 0)} (%{o.get('pay', 0) * 100:.0f}) | {s.get('adet', 0)} (%{s.get('pay', 0) * 100:.0f}) |")
    L += ['', f'## Uygulanan ({len(uygulanan)})', '']
    L += [f"- {f['t']:.0f}s **{f['tur']}** ({f['op']}) — {f['neden']} · {ac}" for f, ac in sorted(uygulanan, key=lambda x: x[0]['t'])]
    L += ['', '## Kalici HUD', ''] + [f"- {x}" for x in hud_islem]
    L += ['', '## Video kurgu plani (dramaturji: bolum muamelesi, cerceve bloklari, efekt butcesi)', ''] + [f"- {x}" for x in dram]
    L += ['', f'## Tekrar seyreltme + cesitlilik doldurma ({len(sey)})', ''] + [f"- {x}" for x in sey]
    L += ['', f'## Reddedilen ({len(reddedilen)})', '']
    L += [f"- {f['t']:.0f}s {f['tur']} ({f['op']}) — {f['neden']}: {neden}" for f, neden in sorted(reddedilen, key=lambda x: x[0]['t'])]
    L += ['', f'## Harita onerileri (uygulanmadi: koordinatli harita zemini yok) ({len(harita)})', '']
    L += [f"- {h['t']:.0f}s {h['yon']} **{h['yer']}** — \"{h['cumle']}\"" for h in harita]
    L += ['', f'## Yerel AI sahne adaylari ({ai_not})', '']
    L += [f"- {r['t']:.0f}s {r['tur']} — \"{r['kanit']}\" · {r['neden']}" for r in ai_rap]
    open(rapor, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    json.dump({'once': once, 'sonra': sonra, 'kart_payi': [round(once_pay, 3), round(sonra_pay, 3)], 'hedef': hedef_pay,
               'uygulanan': [{k: v for k, v in f.items() if k not in ('kimlik', 'tuketir_k')} | {'sonuc': ac} for f, ac in uygulanan],
               'reddedilen': [{'t': f['t'], 'tur': f['tur'], 'neden': n} for f, n in reddedilen], 'harita': harita, 'seyreltme': sey, 'yerel_ai': {'not': ai_not, 'rapor': ai_rap}},
              open(re.sub(r'\.md$', '.json', rapor), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{len(uygulanan)} firsat uygulandi, {len(reddedilen)} reddedildi, {len(sey)} seyreltme | kart payi %{once_pay * 100:.0f} -> %{sonra_pay * 100:.0f} "
          f"| varyant FAIL {len(var_once)} -> {len(var_sonra)} | tekduze dk {len(cesit_once[0])} -> {len(cesit_sonra[0])} -> {cikti} | rapor {rapor}")
    sys.exit(1 if var_sonra else 0)


if __name__ == '__main__':
    main()
