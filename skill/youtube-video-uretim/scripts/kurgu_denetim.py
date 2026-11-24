#!/usr/bin/env python3
"""KURGU DENETIMI — izleyicinin fark ettigi kurgu hatalarini render'dan ONCE (kurgu verisinden) ve SONRA (olcumden) yakalar.
Kullanim:
  py kurgu_denetim.py --plan motion/src/v04/props.json [--rakip <kanal>/video-1 ...] [--duzelt props-duzeltilmis.json] [--cikti KURGU-DENETIM.md]
  py kurgu_denetim.py --analiz bizim-analiz/analiz.json [--yazi yazi-senkron.json] --rakip <kanal>/video-1 ...   # render sonrasi
  py kurgu_denetim.py --yazi yazi-senkron.json [--rakip ...]       # yalniz ekran yazisi (yazi_senkron.py final.mp4 --kelimeler props.json)
--plan  : VideoDna props'u ({dna, veri:{fps, cekimler[{kare,tag,kb,kart,etiket,flas}], kelimeler[{k,bas,son}]}}). Zamanlar kesin.
--rakip : kutuphanedeki rakip video klasoru (ritim/analiz.json + varsa yazi-senkron.json); hedefler rakiplerin medyanindan.
          yazi-senkron.json (kanal_isle.py yazar) varsa rakibin tipik yazi suresi / gecikmesi raporda; bizimki belirgin
          saparsa UYARI (ekranda < rakibin %70'i; gecikme > rakip + 0,4 sn). Okuma suresi esikleri sabit kalir.
--sablon : kanal-sablon.json (yoksa plan klasorunden yukari aranir): KAYNAK KARISIMI — video / gorsel / kart sure payi rakipten
          olculen hedefe (kaynak.hedef) uymali; grup sapmasi > max(8 puan, tek cekim payi) FAIL, AI payi sapmasi UYARI.
--duzelt: cozulebilen hatalari (yazi suresi, gec gelen yazi, yazi seslendirmeden once kayboluyor) komsu cekimlerden kare
          odunc alarak duzeltir, toplam sure DEGISMEZ; sonucu yeniden denetler.
Kontroller (FAIL = teslim yok; UYARI = bak, gerekceyle birak):
  YAZI  okunmadan kayboluyor: ekranda kalma < okuma ihtiyaci (giris 0,4 sn + kelime/okuma hizi + 0,3 sn tutma; en az 1,3 sn)
        seslendirmeci bitirmeden kayboluyor: yazi, metindeki kelimeler soylenmeden ekrandan cikiyor
        gec geliyor: yazi, seslendirmeci o kelimeyi soyledikten > 0,6 sn sonra beliriyor (> 1,5 sn FAIL)
        erken (spoiler): yazi, soylenmeden > 2 sn once beliriyor · seste karsiligi yok (bilgi kartinda normal, kelime kartinda supheli)
        kalabalik: iki yazi arasinda < 1,5 sn bos ekran
  KLIP  cekim suresi dagilimi rakipten sapmis (medyan ±%30, p90, <0,8 sn oran, en uzun) · ayni kaynak parcasi tekrar gosteriliyor
  SAHNE DILI (plan) her 60 sn pencerede farkli sahne turu < 3 (goruntu + en az 2 kart/duzen turu) -> UYARI;
        ayni kart turu + ayni cizilen varyant (VideoDna kartAnahtar) 2 dk icinde 3'ten fazla -> FAIL; sahne turu dagilimi
        ve tam ekran kart payi rakibin grafik/kart sure payiyla (ritim/analiz.json tum.kaynak_yuzde_sure) ozette
  TEKRAR ayni kart turu 3+ kez art arda · flas/vurgu duzenli aralikla (dongu) · hareket etiketleri dongusel (A-B-C-A-B-C):
        lag-2/3 eslesme orani tesadufi beklentiden > 0,25 fazla · tek hareket payi rakipten > 0,2 fazla
  EFEKT BUTCESI (plan) Dna.tsx EFEKT_BUTCE: letterbox girisi (bolum durumu + cekim), cerceve girisi (ayni cerceve art arda =
        tek giris), vurus paketi (flas + sayi), imza gecis (VideoDna gecisPlaniVideo birebir), zoom-darbe kamera: sayi ya da
        aralik asimi FAIL. Yumusak gecis araligi: < 1,5 sn FAIL, < YUMUSAK_ARA_SN (2 sn) UYARI
  CERCEVE (plan) gerceklesen cerceveli cekim orani: DnaMedya secimi birebir taklit (temel.ts `rastgele` portu,
        cerceveSec: kotali, son 8 cekimde kullanilan tip secilmez); adet ya da sure payi hedeften ±%5 disi -> UYARI
  KAYNAK YAZISI (plan) alt bant / altyazi / kelime karti gelen cekimin kaynak penceresinde (kb, kb + sure) alt ucte birde
        gomulu yazi (kaynak videonun kendi altyazisi, haber bandi) -> UYARI "kaynak yazisiyla cakisma". Olcum:
        py kaynak_yazi.py <motion>/public/<klasor> --plan props.json  (yazmazsa kontrol atlanir, ozet satiri soyler)
        --duzelt: cekimi ayni kaynagin yazisiz penceresine kaydirir (kb); yoksa alt bantli cekime etiket_ust: true
        (alt bandi / kelime kartini / altyaziyi ust ucte bire alma isareti; VideoDna.tsx uygular)
Cikis kodu: FAIL varsa 1.
"""
import argparse, json, math, os, re, statistics as st, sys
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from collections import Counter

OKUMA_DUYULAN, OKUMA_SESSIZ = 3.2, 2.8   # kelime/sn: seste de geciyorsa daha hizli okunur
GIRIS, TUTMA, ASGARI = 0.4, 0.3, 1.3
DUR = set('the a an of to in on at for and or but is are was were be been it its this that these those with by from as into than then so not no yes i you he she we they his her their our my your me him them us do did does have has had will would can could just also very more most about over after before up down out off what which who whom how why when where there here all any some such only own same too s t der die das und ein eine ist im in den dem des zu mit von het een en van de dat op'.split())


REP = os.environ.get('REPERTUAR') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'repertuar'))


def jyukle(y):
    return json.load(open(y, encoding='utf-8'))


def tokenler(s):
    s = (s or '').lower().replace('’', "'")
    s = re.sub(r'(?<=\d)[,.](?=\d{3}\b)', '', s)            # 1,185 -> 1185
    s = re.sub(r'(\d)([a-z€$£%]+)', r'\1 \2', s)             # 85m -> 85 m
    out = []
    for w in re.findall(r"[a-zà-ÿ0-9äöüßğışç']+", s):
        w = w.strip("'")
        if w.endswith("'s"):
            w = w[:-2]
        if not w:
            continue
        out.append(w)
    return out


def icerik(ts):
    return [w for w in ts if w.isdigit() or (len(w) >= 3 and w not in DUR)]


def yuzdelik(xs, p):
    xs = sorted(xs)
    if not xs:
        return 0
    k = (len(xs) - 1) * p
    a, b = math.floor(k), math.ceil(k)
    return xs[a] + (xs[b] - xs[a]) * (k - a)


# ---------------------------------------------------------------- plan -> yazi ogeleri
# bilgi kartlari (liste, zaman, grafik...) anlatimi OZETLER: okuma suresi denetlenir, kelime-ses senkronu (gec geliyor /
# ses bitmeden kayboluyor) denetlenmez — maddeler anlatimda kartin oncesine/sonrasina yayilir.
BILGI_TURLERI = {'liste', 'zaman', 'yil', 'grafik', 'karsilastirma', 'bolum', 'harita'}
# kartin gorunur bilgisini tamamlamasi icin animasyon payi (sn): zaman tipi adim basina (Kart.tsx ZamanCizelgesi)
ZAMAN_ADIM_SN = {'buyuk-yil': 1.6, 'dikey-serit': 0.8, 'merdiven': 0.4, 'yatay-dugum': 0.3, 'yil-tarama': 0.25}
YIL_TARAMA = {'uc': 0.5, 'ara': 0.25, 'enCokAra': 8}   # Kart.tsx YIL_TARAMA


def yil_tarama_adet(adimlar):
    """Kart.tsx yilTaramaAdimlari uzunlugu (ara yillar dahil)"""
    sayi = lambda y: int(y) if re.fullmatch(r'\s*-?\d{1,5}\s*', str(y)) else None
    n = 0
    for i, a in enumerate(adimlar):
        if i > 0:
            y0, y1 = sayi(adimlar[i - 1].get('yil', '')), sayi(a.get('yil', ''))
            if y0 is not None and y1 is not None and abs(y1 - y0) > 1:
                n += min(YIL_TARAMA['enCokAra'], abs(y1 - y0) - 1)
        n += 1
    return n


def _varyant(dna, eksen, sira):
    v2 = (dna or {}).get(eksen + '2')
    return v2 if (sira % 2 and v2 and v2 != (dna or {}).get(eksen)) else (dna or {}).get(eksen)


def kart_anahtar(dna, k, sira):
    """VideoDna.tsx kartAnahtar birebir: tur + cizilen varyant (sira = o turun kacinci karti)"""
    t, dna = k.get('tur'), dna or {}
    if t == 'kelime':
        b = dna.get('baslik2') if (sira % 2 and dna.get('baslik2')) else dna.get('baslik')
        return f"kelime:{b}:{'zemin' if k.get('yerlesim') == 'zemin' else 'medya'}"
    if t in ('sayi', 'alinti', 'liste', 'zaman'):
        return f"{t}:{_varyant(dna, t, sira)}"
    if t == 'grafik':
        if k.get('seriler'):
            return 'grafik:yaris'
        g = _varyant(dna, 'grafik', sira)
        return f"grafik:{g if g and g != 'eleme-izgara' else 'cizgi-isik'}"
    if t == 'yil':
        return 'yil:yil-tarama'
    if t == 'bolum':
        return f"bolum:{'hayalet-yil' if sira % 2 else 'bolum-numarasi'}"
    if t == 'coklu':
        d = k.get('duzen') or (('kolaj', 'odak-karartma')[sira % 2] if k.get('m3') else ('bolunmus', 'odak-karartma')[sira % 2] if k.get('m2') else 'odak-karartma')
        return f"coklu:{d}"
    if t == 'harita':
        return f"harita:{dna.get('harita') or 'isik-rota'}"
    return f"{t}:tek"


def kart_yazi(k, anahtar=''):
    """kart -> (okunacak kelime sayisi, seste aranacak metin, animasyon payi sn, ekranda gorunen metin). coklu: yazi yok (None)"""
    t = k.get('tur')
    a, b = k.get('a') or '', k.get('b') or ''
    if t == 'alinti':
        return len(tokenler(a)) + 0.5 * len(tokenler(b)), a, 0, (a + ' / ' + b).strip(' /')
    if t == 'sayi':
        return 1 + len(tokenler(b)), a + ' ' + b, 1.0, (a + ' / ' + b).strip(' /')   # sayac sayma animasyonu ~1 sn
    if t == 'kelime':
        return len(tokenler(a + ' ' + b)), a + ' ' + b, 0, (a + ' / ' + b).strip(' /')
    if t == 'liste':
        m = k.get('maddeler') or []
        metin = ' '.join([k.get('baslik') or ''] + m)
        return len(tokenler(metin)), metin, 0.35 * len(m) + 0.2, ((k.get('baslik') or '') + ': ' + ' · '.join(m)).strip(': ')
    if t in ('zaman', 'yil'):
        ad = k.get('adimlar') or []
        if t == 'yil':
            son = ad[-1] if ad else {}
            n = yil_tarama_adet(ad)
            metin = f"{son.get('yil', '')} {son.get('yazi', '')}"
            return 1 + len(tokenler(son.get('yazi', ''))), metin, YIL_TARAMA['uc'] * 2 + YIL_TARAMA['ara'] * max(0, n - 2), ' > '.join(x.get('yil', '') for x in ad) + ' ' + son.get('yazi', '')
        tip = anahtar.split(':', 1)[1] if ':' in anahtar else ''
        metin = ' '.join(f"{x.get('yil', '')} {x.get('yazi', '')}" for x in ad)
        n = len(ad) + len(tokenler(' '.join(x.get('yazi', '') for x in ad)))   # yil/skor tek goz hareketi ('2-1' iki kelime degil)
        return n, metin, ZAMAN_ADIM_SN.get(tip, 0.4) * len(ad) + 0.3, ' · '.join(f"{x.get('yil', '')} {x.get('yazi', '')}".strip() for x in ad)
    if t == 'grafik':
        v = k.get('veriler') or [x for s in (k.get('seriler') or []) for x in s.get('degerler', [])[:1]]
        metin = ' '.join([k.get('baslik') or ''] + list(k.get('etiketler') or []))
        return len(tokenler(k.get('baslik') or '')) + len(v), metin, 2.0, (k.get('baslik') or '') + ' ' + ' '.join(str(x) for x in v)
    if t == 'karsilastirma':
        sol, sag = k.get('sol') or {}, k.get('sag') or {}
        metin = f"{k.get('baslik') or ''} {sol.get('ad', '')} {sol.get('deger', '')} {sag.get('ad', '')} {sag.get('deger', '')}"
        return len(tokenler(f"{k.get('baslik') or ''} {sol.get('ad', '')} {sag.get('ad', '')}")) + 2, metin, 1.2, metin.strip()
    if t == 'bolum':
        metin = f"{k.get('baslik') or ''} {k.get('alt') or ''}"
        return 1 + len(tokenler(metin)), metin, 0.5, f"{k.get('no', '')} {metin}".strip()
    if t == 'degisim':
        metin = f"{k.get('ust') or ''} {k.get('eski') or ''} {k.get('yeni') or ''}"
        return len(tokenler(metin)), f"{k.get('eski') or ''} {k.get('yeni') or ''}", 0.8, f"{k.get('eski') or ''} -> {k.get('yeni') or ''}"
    if t == 'harita':
        metin = ' '.join([k.get('etiket') or ''] + [x.get('ad', '') for x in (k.get('noktalar') or [])])
        return len(tokenler(metin)), metin, 2.0, metin
    return None


def sahne_turu(c):
    """zaman cizelgesi icin cekimin sahne turu: goruntu (kartsiz medya) ya da kart turu (coklu = medya duzeni)"""
    k = c.get('kart')
    return (k.get('tur') or 'kart') if k else 'goruntu'


def plan_ogeleri(veri, dna=None):
    fps = veri['fps']
    t, cek, yazilar, sira = 0, [], [], {}
    for i, c in enumerate(veri['cekimler']):
        bas, son = t / fps, (t + c['kare']) / fps
        k = c.get('kart')
        anahtar = None
        if k:
            sr = sira[k.get('tur')] = sira.get(k.get('tur'), -1) + 1
            anahtar = kart_anahtar(dna, k, sr)
        cek.append({'i': i, 'bas': bas, 'son': son, 'sure': son - bas, 'tag': c.get('tag'), 'kb': c.get('kb', 0),
                    'kart': (k or {}).get('tur'), 'anahtar': anahtar, 'tur': sahne_turu(c), 'etiket': bool(c.get('etiket')), 'flas': bool(c.get('flas'))})
        ky = kart_yazi(k, anahtar or '') if k else None
        if ky:
            n, ses, ek, metin = ky
            yazilar.append({'cekim': i, 'tur': 'kart-' + k['tur'], 'metin': metin, 'bas': bas, 'son': son, 'kelime': n, 'ses_metni': ses, 'ek': ek,
                            'bilgi': k['tur'] in BILGI_TURLERI})
        if c.get('etiket'):
            e = c['etiket']
            yazilar.append({'cekim': i, 'tur': 'altbant', 'metin': e, 'bas': bas, 'son': son, 'kelime': len(tokenler(e)), 'ses_metni': e, 'ek': 0})
        t += c['kare']
    return cek, yazilar


def ses_eslestir(y, kelimeler, pencere=6.0):
    """yazinin icerik kelimelerini seslendirmede, yazinin cevresinde arar -> (eslesme orani, soylenme bas, son)"""
    hedef = icerik(tokenler(y['ses_metni']))
    if not hedef:
        return 0.0, None, None
    aday = [(w, tokenler(w['k'])) for w in kelimeler if y['bas'] - pencere <= w['bas'] <= y['son'] + pencere]
    bulunan = []
    for h in dict.fromkeys(hedef):
        en = None
        for w, ts in aday:
            if h in ts or (len(h) >= 5 and any(x.startswith(h[:5]) for x in ts)):
                d = abs(w['bas'] - y['bas'])
                if en is None or d < en[0]:
                    en = (d, w)
        if en:
            bulunan.append(en[1])
    oran = len(bulunan) / len(set(hedef))
    if not bulunan:
        return 0.0, None, None
    # tutarli kume: medyana 4 sn'den uzak eslesmeleri at
    m = st.median(w['bas'] for w in bulunan)
    bulunan = [w for w in bulunan if abs(w['bas'] - m) <= 4] or bulunan
    return oran, min(w['bas'] for w in bulunan), max(w['son'] for w in bulunan)


def yazi_denetle(yazilar, kelimeler):
    bulgular = []
    for y in yazilar:
        oran, sb, ss = ses_eslestir(y, kelimeler) if kelimeler else (0.0, None, None)
        duyulan = oran >= 0.5
        ihtiyac = max(ASGARI, GIRIS + y['ek'] + y['kelime'] / (OKUMA_DUYULAN if duyulan else OKUMA_SESSIZ) + TUTMA)
        sure = y['son'] - y['bas']
        y.update({'eslesme': round(oran, 2), 'soylenme_bas': sb, 'soylenme_son': ss, 'ihtiyac': round(ihtiyac, 2), 'sure': round(sure, 2)})
        yer = f"#{y['cekim']} {y['bas']:.1f}s {y['tur']} \"{y['metin'][:48]}\""
        if sure < ihtiyac:
            bulgular.append(('FAIL' if sure < 0.75 * ihtiyac else 'UYARI', 'okunmadan-kayboluyor', yer,
                             f"ekranda {sure:.1f} sn, okumak icin {ihtiyac:.1f} sn gerekir ({y['kelime']:.0f} kelime)", y))
        if duyulan and not y.get('bilgi'):
            lead = y['bas'] - sb
            y['gecikme'] = round(lead, 2)
            if lead > 0.6:
                bulgular.append(('FAIL' if lead > 1.5 else 'UYARI', 'gec-geliyor', yer, f"seslendirmeci {lead:.1f} sn once soyledi; yazi kelimeyle birlikte (en gec +0,3 sn) gelmeli", y))
            elif lead < -2.0:
                bulgular.append(('UYARI', 'erken-spoiler', yer, f"yazi soylenmeden {-lead:.1f} sn once ekranda", y))
            if y['son'] < ss + 0.3:
                bulgular.append(('FAIL', 'ses-bitmeden-kayboluyor', yer, f"yazi {y['son']:.1f}s'de cikiyor, seslendirmeci {ss:.1f}s'de bitiriyor", y))
        elif kelimeler and not duyulan and y['tur'] in ('kart-kelime',):
            bulgular.append(('UYARI', 'seste-yok', yer, 'kelime kartinin metni seslendirmede gecmiyor (yazi-ses kopuk)', y))
    s = sorted(yazilar, key=lambda y: y['bas'])
    for a, b in zip(s, s[1:]):
        if a['cekim'] != b['cekim'] and 0 <= b['bas'] - a['son'] < 1.5 and a['tur'] != 'altbant' and b['tur'] != 'altbant':
            bulgular.append(('UYARI', 'kalabalik', f"#{a['cekim']}->#{b['cekim']} {a['son']:.1f}s", f"iki yazi karti arasi {b['bas'] - a['son']:.1f} sn (goz dinlenmiyor)", b))
    return bulgular


# ---------------------------------------------------------------- tekrar / dongu
def dongu(seq):
    """etiket dizisinde lag-1..3 eslesme orani ve tesadufi beklenti (sum p^2)"""
    seq = [x for x in seq if x and x not in ('belirsiz',)]
    if len(seq) < 8:
        return {}
    n = len(seq)
    c = Counter(seq)
    bek = sum((v / n) ** 2 for v in c.values())
    lag = {k: sum(seq[i] == seq[i - k] for i in range(k, n)) / (n - k) for k in (1, 2, 3)}
    return {'n': n, 'baskin': c.most_common(1)[0][0], 'baskin_pay': round(c.most_common(1)[0][1] / n, 2), 'beklenti': round(bek, 2),
            'lag': {k: round(v, 2) for k, v in lag.items()}, 'cesit': len(c)}


def tekrar_denetle(cek, ref_dongu=None, ad='hareket'):
    bulgular = []
    # kart turu art arda
    kartlar = [c for c in cek if c.get('kart')]
    for a, b, d in zip(kartlar, kartlar[1:], kartlar[2:]):
        if a['kart'] == b['kart'] == d['kart'] and d['bas'] - a['bas'] < 25:
            bulgular.append(('UYARI', 'ayni-kart-art-arda', f"#{a['i']}-#{d['i']} {a['bas']:.1f}s", f"3 '{a['kart']}' karti 25 sn icinde art arda (kart turunu degistir ya da birini medyaya cevir)", None))
    # flas duzenli aralik
    fl = [c['i'] for c in cek if c.get('flas')]
    if len(fl) >= 5:
        ara = [b - a for a, b in zip(fl, fl[1:])]
        if st.pstdev(ara) < 0.6:
            bulgular.append(('UYARI', 'vurgu-dongusu', f"{len(fl)} vurgu", f"vurgular her {st.median(ara):.0f} cekimde bir — mekanik ritim; vurguyu anlama (sayi, isim, donum) bagla", None))
    # ayni kaynak parcasi yeniden
    gorulen = {}
    for c in cek:
        if not c.get('tag') or (c.get('kart') and c.get('kart') not in ('kelime', 'coklu')):
            continue
        a, b = c['kb'], c['kb'] + c['sure']
        for (pa, pb, pi) in gorulen.get(c['tag'], []):
            if min(b, pb) - max(a, pa) > 0.5 and c['i'] - pi > 1:
                bulgular.append(('UYARI', 'ayni-goruntu-tekrar', f"#{pi} ve #{c['i']} {c['bas']:.1f}s", f"'{c['tag']}' kaynaginin ayni {min(b, pb) - max(a, pa):.1f} sn'lik parcasi iki kez", None))
                break
        gorulen.setdefault(c['tag'], []).append((a, b, c['i']))
    return bulgular


CESIT_PENCERE, CESIT_ASGARI = 60.0, 3      # her 60 sn: goruntu + en az 2 kart/duzen turu
VARYANT_PENCERE, VARYANT_TAVAN = 120.0, 3  # ayni tur + ayni varyant 2 dk icinde en cok 3 kez


def cesit_denetle(cek):
    """60 sn pencerelerde farkli sahne turu sayisi (>= 0,5 sn gorunen); < 3 -> UYARI. Son pencere 30 sn'den kisaysa atlanir."""
    out, pen = [], []
    if not cek:
        return out, pen
    son = cek[-1]['son']
    t = 0.0
    while t < son:
        b = min(son, t + CESIT_PENCERE)
        if b - t >= 30:
            tur = Counter()
            for c in cek:
                ort = min(b, c['son']) - max(t, c['bas'])
                if ort > 0:
                    tur[c['tur']] += ort
            tur = {k: v for k, v in tur.items() if v >= 0.5}
            pen.append((t, b, tur))
            if len(tur) < CESIT_ASGARI:
                out.append(('UYARI', 'tekduze-dakika', f"{t / 60:.0f}. dk ({t:.0f}-{b:.0f} s)",
                            f"{len(tur)} sahne turu ({', '.join(sorted(tur)) or '-'}): goruntu + en az 2 kart/duzen turu olmali (sahne_zengin.py)", None))
        t += CESIT_PENCERE
    return out, pen


def varyant_denetle(cek):
    """ayni kart anahtari (tur + cizilen varyant) 120 sn icinde 3'ten fazla -> FAIL (izleyici ayni sablonu goruyor)"""
    out = []
    by = {}
    for c in cek:
        if c.get('anahtar'):
            by.setdefault(c['anahtar'], []).append(c)
    for an, cs in by.items():
        j, son_rapor = 0, -1
        for i in range(len(cs)):
            while cs[i]['bas'] - cs[j]['bas'] > VARYANT_PENCERE:
                j += 1
            if i - j + 1 > VARYANT_TAVAN and cs[j]['i'] > son_rapor:
                grup = [x for x in cs if cs[j]['bas'] <= x['bas'] <= cs[j]['bas'] + VARYANT_PENCERE]
                out.append(('FAIL', 'ayni-varyant-tekrar', f"#{grup[0]['i']}-#{grup[-1]['i']} {grup[0]['bas']:.0f}-{grup[-1]['bas']:.0f}s",
                            f"'{an}' 2 dk icinde {len(grup)} kez (tavan {VARYANT_TAVAN}): kart turunu ya da varyantini degistir (sahne_zengin.py seyreltir)", None))
                son_rapor = grup[-1]['i']
    return out


def tur_dagilimi(cek):
    """sahne turu -> (adet, sure sn); toplam"""
    d, top = {}, 0.0
    for c in cek:
        x = d.setdefault(c['tur'], [0, 0.0])
        x[0] += 1
        x[1] += c['sure']
        top += c['sure']
    return d, top


def kart_payi(cek):
    """tam ekran kart (goruntu ve coklu disi) sure payi"""
    d, top = tur_dagilimi(cek)
    return sum(v[1] for k, v in d.items() if k not in ('goruntu', 'coklu')) / max(1e-9, top)


def dagilim_ozet(cek, ref=None):
    d, top = tur_dagilimi(cek)
    s = ' · '.join(f"{k} {v[0]} (%{v[1] * 100 / max(1e-9, top):.0f})" for k, v in sorted(d.items(), key=lambda x: -x[1][1]))
    kp = kart_payi(cek)
    s += f" | kart payi %{kp * 100:.0f}"
    if ref and ref.get('kart_pay') is not None:
        s += f" (rakip grafik/kart %{ref['kart_pay'] * 100:.0f})"
    return s


def dongu_bulgu(d, ref, ad):
    out = []
    if not d:
        return out
    for k in (2, 3):
        fazla = d['lag'][k] - d['beklenti']
        if fazla > 0.25:
            out.append(('FAIL', f'{ad}-dongusu', f'lag-{k}', f"{ad} dizisi {k} cekimde bir kendini tekrar ediyor (eslesme {d['lag'][k]:.2f}, tesadufi {d['beklenti']:.2f}) — A-B-C-A-B-C mekanik dongu", None))
            break
    if ref and d['baskin_pay'] - ref['baskin_pay'] > 0.2 and d['baskin'] == ref.get('baskin'):
        out.append(('UYARI', f'{ad}-tekduze', d['baskin'], f"'{d['baskin']}' payi %{d['baskin_pay'] * 100:.0f} (rakip %{ref['baskin_pay'] * 100:.0f})", None))
    if d['lag'][1] - d['beklenti'] > 0.25:
        out.append(('UYARI', f'{ad}-art-arda', 'lag-1', f"ayni {ad} art arda cok (eslesme {d['lag'][1]:.2f}, tesadufi {d['beklenti']:.2f})", None))
    return out


# ---------------------------------------------------------------- repertuar/temel.ts `rastgele` birebir portu
M32 = 0xFFFFFFFF


def _imul(a, b):
    return (a * b) & M32


def hash_str(s):
    """temel.ts hashStr: FNV-1a, JS charCodeAt (UTF-16 kod birimi) uzerinden"""
    h = 2166136261
    b = s.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = _imul(h, 16777619)
    return h


def rastgele(tohum):
    """temel.ts rastgele (mulberry32): ayni tohum -> JS ile ayni dizi (0 <= x < 1). Bitler mod 2^32 ayni; JS'in isaretli
    int32 ara degerleri sonucu degistirmez (yalniz XOR/imul/toplama, hepsi mod 2^32)."""
    a = [hash_str(tohum) if isinstance(tohum, str) else int(tohum) & M32]

    def r():
        a[0] = (a[0] + 0x6D2B79F5) & M32
        x = a[0]
        t = _imul(x ^ (x >> 15), 1 | x)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return r


# ---------------------------------------------------------------- cerceve orani (Dna.tsx DnaMedya taklidi)
CERCEVE_YAKIN = 8       # Dna.tsx CERCEVE_YAKIN (CERCEVE_PAY = 0.6 tavani secimde dogrudan kullanilmaz, denge kuralindan cikar)


def cerceve_dizisi(dna, n):
    """Dna.tsx cerceveSec birebir: sira 0..n-1 icin cerceve tipi ('tam' = tam ekran). Kotali dagitim: son CERCEVE_YAKIN cekimde
    kullanilan tip secilmez, yalniz en az kullanilanin en fazla 1 fazlasi aday, adaylar arasi eksige gore agirlikli tohumlu secim."""
    oran = dna['iskelet']['cerceveli_oran']
    K = [t for t in dict.fromkeys(dna.get('cerceve') or []) if t != 'tam']
    say, p = {}, []
    for i in range(n):
        r = rastgele(f"{dna['tohum']}md{i}")
        if not K or r() >= oran:
            p.append('tam')
            continue
        yakin = {t for t in p[max(0, i - CERCEVE_YAKIN):] if t != 'tam'}
        enaz = min(say.get(t, 0) for t in K)
        aday = [t for t in K if t not in yakin and say.get(t, 0) <= enaz + 1]
        if not aday:
            def son(t):
                return len(p) - 1 - p[::-1].index(t) if t in p else -1      # lastIndexOf
            onceki = p[i - 1] if i > 0 else None
            denge = [t for t in K if say.get(t, 0) <= enaz + 1 and onceki != t]
            digerleri = [t for t in K if onceki != t]
            havuz = denge or digerleri or K
            eski = min(son(t) for t in havuz)
            aday = [t for t in havuz if son(t) == eski]
        w = [enaz + 2 - say.get(t, 0) for t in aday]
        u = r() * sum(w)
        t = aday[-1]
        for k in range(len(aday)):
            u -= w[k]
            if u < 0:
                t = aday[k]
                break
        say[t] = say.get(t, 0) + 1
        p.append(t)
    return p


# ---------------------------------------------------------------- efekt butcesi + gecis araligi (VideoDna/Dna/Gecis birebir)
def _ts(dosya):
    return open(os.path.join(REP, dosya), encoding='utf-8').read()


def ts_sabitleri():
    """Dna.tsx EFEKT_BUTCE / IMZA_GECIS / YUMUSAK_ARA_SN, Gecis.tsx GECIS_PAY / GECIS_ARDISIK — tek kaynak TS"""
    d, g = _ts('Dna.tsx'), _ts('Gecis.tsx')
    gov = d[d.index('export const EFEKT_BUTCE'):]
    gov = gov[:gov.index('};')]
    butce = {m.group(1): {k: float(v) for k, v in re.findall(r'(\w+):\s*([\d.]+)', m.group(2))}
             for m in re.finditer(r'(\w+):\s*\{([^}]*)\}', gov)}
    imza = re.findall(r"'([a-z0-9-]+)'", re.search(r'export const IMZA_GECIS = \[(.*?)\];', d, re.S).group(1))
    return {'butce': butce, 'imza': imza, 'ara': float(re.search(r'export const YUMUSAK_ARA_SN = ([\d.]+)', d).group(1)),
            'pay': float(re.search(r'export const GECIS_PAY = ([\d.]+)', g).group(1)), 'ardisik': int(re.search(r'export const GECIS_ARDISIK = (\d+)', g).group(1))}


def imza_gecis_mi(t, T):
    return t.startswith('filmburn') or t in T['imza']


def gecis_plani(n, gecis, tohum, yumusak_oran, T):
    """Gecis.tsx gecisPlani birebir (rastgele = mulberry32 portu)"""
    r = rastgele(tohum + 'gp')
    liste = list(dict.fromkeys(gecis if isinstance(gecis, list) else [gecis]))
    yum = [r() <= yumusak_oran for _ in range(n)]
    if len(liste) <= 1:
        return [liste[0] if (y and liste) else 'sert' for y in yum]
    ny = sum(yum)
    kota = max(math.floor(T['pay'] * ny + 1e-9), math.ceil(ny / len(liste)))
    say, son, out = {}, [], []
    for y in yum:
        if not y:
            out.append('sert')
            continue
        dolu = lambda t: len(son) >= T['ardisik'] and all(x == t for x in son[-T['ardisik']:])
        kotada = lambda t: say.get(t, 0) < kota
        aday = [t for t in liste if (not son or t != son[-1]) and kotada(t)]
        if not aday:
            aday = [t for t in liste if not dolu(t) and kotada(t)]
        if not aday:
            aday = [t for t in liste if not dolu(t)]
        w = [max(0.5, kota - say.get(t, 0)) for t in aday]
        u = r() * sum(w)
        t = aday[-1]
        for k in range(len(aday)):
            u -= w[k]
            if u < 0:
                t = aday[k]
                break
        say[t] = say.get(t, 0) + 1
        son.append(t)
        out.append(t)
    return out


def imza_noktasi(veri, c):
    return bool(c) and (bool(c.get('imza')) if veri.get('bolumler') is not None else bool(c.get('flas')))


def gecis_plani_video(props, T=None):
    """VideoDna.tsx gecisPlaniVideo birebir: gecisPlani + imza gecis butcesi (yalniz imza noktasinda) + yumusak gecis araligi"""
    T = T or ts_sabitleri()
    dna, veri = props['dna'], props['veri']
    C, fps = veri['cekimler'], veri['fps']
    gecis = dna.get('gecis') or []
    gecis = gecis if isinstance(gecis, list) else [gecis]
    p0 = gecis_plani(len(C) - 1, gecis, dna.get('tohum') or 'g', (dna.get('iskelet') or {}).get('yumusak_oran', 1), T)
    liste = list(dict.fromkeys(gecis))
    sade = [t for t in liste if t != 'sert' and not imza_gecis_mi(t, T)]
    imzalar = [t for t in liste if imza_gecis_mi(t, T)]
    toplam = sum(c['kare'] for c in C)
    B = T['butce']['imzaGecis']
    butce = max(1, math.ceil((toplam / fps / 60) * B['dakikada']))
    sonY = sonI = -1e9
    imza_say, t, out = 0, 0, []
    for i, g in enumerate(p0):
        t += C[i]['kare']
        x = g
        bosY = t - sonY >= T['ara'] * fps
        if imzalar and imza_noktasi(veri, C[i + 1]) and imza_say < butce and t - sonI >= B['araSn'] * fps and bosY:
            x = imzalar[imza_say % len(imzalar)]
        elif x != 'sert' and imza_gecis_mi(x, T):
            x = sade[i % len(sade)] if sade else 'sert'
        if x != 'sert' and not bosY:
            x = 'sert'
        if x != 'sert':
            sonY = t
            if imza_gecis_mi(x, T):
                sonI = t
                imza_say += 1
        out.append(x)
    return out


def kamera_dizisi(dna, n):
    """Dna.tsx kameraSec birebir (tip dizisi)"""
    kam = dna.get('kamera') or []
    K = kam or ['ken-burns-ice']
    anahtar = f"{dna.get('tohum')}|{','.join(kam)}"
    p = []
    for i in range(n):
        r = rastgele(anahtar + 'km' + str(i))
        aday = [k for k in K if not (i >= 1 and k == p[i - 1])] or list(K)
        if len(aday) > 1 and i >= 2 and r() > 0.35:
            aday = [k for k in aday if k != p[i - 2]] or aday
        p.append(aday[math.floor(r() * len(aday))])
        r()
    return p


def medya_gorunur(c):
    k = c.get('kart')
    return not k or k.get('tur') == 'coklu' or (k.get('tur') == 'kelime' and k.get('yerlesim') != 'zemin')


RESIM_UZ = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp')
KARISIM_GRUP = {'video': ('ai_video', 'stok_video', 'gercek_video'), 'gorsel': ('ai_gorsel', 'gercek_gorsel'), 'kart': ('kart',)}


def sablon_bul(plan_yolu, acik=None):
    """kanal-sablon.json: --sablon verilmediyse plan klasorunden yukari 4 seviye ara (C:/otomasyon/<kanal>/vNN/props.json)"""
    if acik:
        return acik if os.path.exists(acik) else None
    d = os.path.dirname(os.path.abspath(plan_yolu))
    for _ in range(5):
        y = os.path.join(d, 'kanal-sablon.json')
        if os.path.exists(y):
            return y
        d = os.path.dirname(d)
    return None


def cekim_kaynak_turu(c, klasor=''):
    """VideoDna ile ayni karar: medyasi gorunmeyen kart -> kart; yoksa video/gorsel (ai: c.ai ya da yolda /ai/ | ai- oneki)"""
    if c.get('kart') and not medya_gorunur(c):
        return 'kart'
    src = c.get('src') or (f"{klasor}/kaynak/{c['tag']}.mp4" if c.get('tag') else '')
    if not src:
        return 'kart'
    video = c['video'] if c.get('video') is not None else not src.lower().endswith(RESIM_UZ)
    s = src.replace('\\', '/').lower()
    ai = bool(c.get('ai')) or '/ai/' in s or os.path.basename(s).startswith('ai-')
    stok = bool(c.get('stok'))
    if video:
        return 'ai_video' if ai else 'stok_video' if stok else 'gercek_video'
    return 'ai_gorsel' if ai else 'gercek_gorsel'


def kaynak_karisimi(props, sablon_yolu):
    """KAYNAK KARISIMI (kullanici kurali 2026-11-25: rakip ne kadar video / gorsel / kart kullaniyorsa ona gore ayarla).
    Hedef kanal-sablon.json -> kaynak.hedef (rakibin 3 videosundan olculen pay, ozgunluk icin video en az %5). Sure payi
    gruplar halinde karsilastirilir (video / gorsel / kart); tolerans max(8 puan, tek cekimin payi) — kisa planda bir cekim
    kadar sapma kacinilmaz. Grup sapmasi FAIL; AI/gercek ayrimi UYARI (AI gorsel Flow ile uretilir, kullanici hesabinda)."""
    if not sablon_yolu:
        return [], {'kaynak karisimi': 'kanal-sablon.json yok: rakip video/gorsel/kart orani denetlenmedi (kanal_sablon.py ile sablon cikar)'}
    k = (jyukle(sablon_yolu).get('kaynak') or {})
    hedef = k.get('hedef')
    if not hedef:
        return [], {'kaynak karisimi': f'{sablon_yolu}: kaynak.hedef yok (kanal_sablon.py --zorla ile yeniden olc)'}
    veri = props['veri']
    fps = veri.get('fps', 30)
    C = veri['cekimler']
    sure = {}
    for c in C:
        t = cekim_kaynak_turu(c, veri.get('klasor', ''))
        sure[t] = sure.get(t, 0) + c['kare'] / fps
    T = sum(sure.values()) or 1
    pay = {t: sure.get(t, 0) / T for t in ('ai_gorsel', 'gercek_gorsel', 'kart', 'ai_video', 'stok_video', 'gercek_video')}
    tol = max(0.08, 1.0 / max(1, len(C)))
    out, satir = [], []
    for g, uyeler in KARISIM_GRUP.items():
        biz, hd = sum(pay[u] for u in uyeler), sum(hedef.get(u, 0) for u in uyeler) / 100
        satir.append(f'{g} %{biz * 100:.0f} (hedef %{hd * 100:.0f})')
        if abs(biz - hd) > tol:
            ne = {'video': 'gercek/arsiv video klibi ekle (youtube_kaynak.py, stok_ara.py --tur video)' if biz < hd else 'video cekimlerini gorsele cevir',
                  'gorsel': 'gorsel cekim ekle' if biz < hd else 'gorsel cekimlerin bir kismini video/kart yap',
                  'kart': 'sayi/kelime/zaman karti ekle (sahne_zengin.py)' if biz < hd else 'kartlari seyrelt'}[g]
            out.append(('FAIL', 'kaynak-karisimi', g, f"{g} sure payi %{biz * 100:.0f}, rakipten olculen hedef %{hd * 100:.0f} (tolerans ±{tol * 100:.0f} puan) — {ne}", None))
    ai_biz = pay['ai_gorsel'] + pay['ai_video']
    ai_hd = (hedef.get('ai_gorsel', 0) + hedef.get('ai_video', 0)) / 100
    if abs(ai_biz - ai_hd) > max(0.15, tol):
        out.append(('UYARI', 'kaynak-ai-payi', 'ai', f"AI kaynak payi %{ai_biz * 100:.0f}, hedef %{ai_hd * 100:.0f} — "
                    + ('Flow ile AI gorsel uret (cekime "ai": true)' if ai_biz < ai_hd else 'AI payini gercek kaynakla dengele'), None))
    oz = ' · '.join(satir) + f" · AI %{ai_biz * 100:.0f} (hedef %{ai_hd * 100:.0f}) · rakip olcum guveni {k.get('rakip') and next(iter(k['rakip'].values())).get('guven', '?')}"
    return out, {'kaynak karisimi': oz + f' · {os.path.basename(os.path.dirname(sablon_yolu))}/kanal-sablon.json'}


def cekim_cerceveleri(props):
    """VideoDna cerceveBloklari: bolumlu planda c.cerceve (yoksa 'tam'), eski planda cerceveSec; coklu kendi duzeni"""
    veri = props['veri']
    C = veri['cekimler']
    eski = cerceve_dizisi(props['dna'], len(C)) if veri.get('bolumler') is None else None
    sira, out = {}, []
    for i, c in enumerate(C):
        k = c.get('kart')
        s = 0
        if k:
            s = sira[k.get('tur')] = sira.get(k.get('tur'), -1) + 1
        if k and k.get('tur') == 'coklu':
            out.append('coklu:' + kart_anahtar(props['dna'], k, s).split(':', 1)[1])
        else:
            out.append(c.get('cerceve') or 'tam' if eski is None else eski[i])
    return out


def _sayim(olaylar, B, dakika, ad, birim='giris'):
    """olay sn listesi -> (FAIL bulgulari, ozet) butceye gore"""
    out = []
    tavan = int(B['enCok']) if 'enCok' in B else max(1, math.ceil(dakika * B['dakikada']))
    yakin = [(a, b) for a, b in zip(olaylar, olaylar[1:]) if b - a < B['araSn']]
    if len(olaylar) > tavan:
        out.append(('FAIL', 'efekt-butcesi', ad, f"{len(olaylar)} {birim} (butce {tavan}{' / video' if 'enCok' in B else f', dakikada {B[chr(100) + 'akikada']:g}'}) — imza efekt kalip gibi tekrar ediyor; anlama bagla (bolum acilisi, doruk, sayi)", None))
    if yakin:
        out.append(('FAIL', 'efekt-araligi', ad, f"{len(yakin)} kez {B['araSn']:g} sn'den yakin (ilk {yakin[0][0]:.0f}s -> {yakin[0][1]:.0f}s)", None))
    return out, f"{len(olaylar)}/{tavan}" + (f" ({len(yakin)} yakin)" if yakin else '')


def efekt_denetle(props):
    """EFEKT BUTCESI (Dna.tsx EFEKT_BUTCE): letterbox girisi, cerceve girisi, vurus paketi, imza gecis, zoom-darbe kamera
    + yumusak gecis araligi (< 1,5 sn FAIL, < YUMUSAK_ARA_SN UYARI). Plan verisinden, render'siz."""
    T = ts_sabitleri()
    veri, dna = props['veri'], props['dna']
    C, fps = veri['cekimler'], veri['fps']
    bas = []
    t = 0
    for c in C:
        bas.append(t)
        t += c['kare']
    dakika = t / fps / 60
    B = T['butce']
    bul, oz = [], {}
    # cerceve girisleri: ayni cerceve art arda gelirse blok (giris bir kez)
    cer = cekim_cerceveleri(props)
    giris, lb_giris, eski_giris, eski_lb = [], [], 0, 0
    for i, c in enumerate(C):
        tip = cer[i]
        if tip == 'tam' or tip.startswith('coklu') or not medya_gorunur(c):
            continue
        eski_giris += 1                               # eski VideoDna: her cerceveli cekimde giris
        eski_lb += tip == 'letterbox'
        if i > 0 and cer[i - 1] == tip and medya_gorunur(C[i - 1]):
            continue
        giris.append(bas[i] / fps)
        if tip == 'letterbox':
            lb_giris.append(bas[i] / fps)
    for b in veri.get('bolumler') or []:
        if (b.get('muamele') or {}).get('letterbox'):
            gor = [bas[i] for i, c in enumerate(C) if b['bas'] <= bas[i] < b['son'] and medya_gorunur(c)]
            if gor:
                lb_giris.append(gor[0] / fps)
    lb_giris.sort()
    for ad, ol, bb in (('letterbox', lb_giris, B['letterbox']), ('cerceve', [x for x in giris if x not in lb_giris], B['cerceveGiris'])):
        b2, o = _sayim(ol, bb, dakika, ad)
        bul += b2
        oz[ad] = o
    oz['eski davranis (her cerceveli cekimde giris)'] = f"{eski_giris} cerceve girisi, {eski_lb} letterbox girisi"
    # vurus paketi: flas + sayi karti (vurus != false)
    vur = sorted(bas[i] / fps for i, c in enumerate(C) if c.get('flas') or ((c.get('kart') or {}).get('tur') == 'sayi' and (c['kart'].get('vurus') is not False)))
    b2, oz['vurus'] = _sayim(vur, B['vurus'], dakika, 'vurus', 'vurus')
    bul += b2
    # gecisler
    plan = gecis_plani_video(props, T)
    imz = [bas[i + 1] / fps for i, g in enumerate(plan) if g != 'sert' and imza_gecis_mi(g, T)]
    b2, oz['imza gecis'] = _sayim(imz, B['imzaGecis'], dakika, 'imza-gecis', 'gecis')
    bul += b2
    kam = kamera_dizisi(dna, len(C))
    bolumlu = veri.get('bolumler') is not None
    zd = [bas[i] / fps for i, c in enumerate(C) if kam[i] == 'zoom-darbe' and medya_gorunur(c) and (c.get('imza') if bolumlu else True)]
    b2, oz['zoom-darbe'] = _sayim(zd, B['zoomDarbe'], dakika, 'zoom-darbe', 'kamera')
    bul += b2
    yum = [bas[i + 1] / fps for i, g in enumerate(plan) if g != 'sert']
    ara = [(a, b) for a, b in zip(yum, yum[1:])]
    kisa = [x for x in ara if x[1] - x[0] < 1.5]
    yakin = [x for x in ara if 1.5 <= x[1] - x[0] < T['ara']]
    if kisa:
        bul.append(('FAIL', 'gecis-kumesi', f"{len(kisa)} cift", f"iki yumusak gecis 1,5 sn'den yakin (ilk {kisa[0][0]:.1f}s -> {kisa[0][1]:.1f}s): araya sert kesim (VideoDna gecisPlaniVideo)", None))
    if yakin:
        bul.append(('UYARI', 'gecis-araligi', f"{len(yakin)} cift", f"iki yumusak gecis {T['ara']:g} sn'den yakin", None))
    oz['yumusak gecis'] = f"{len(yum)} (aralik < 1,5 sn: {len(kisa)}, < {T['ara']:g} sn: {len(yakin)}) · imza tipleri: {', '.join(sorted({g for g in plan if imza_gecis_mi(g, T)})) or '-'}"
    return bul, oz


def cerceve_olc(props):
    """DnaMedya: tip = cerceveSec(dna, sira) (cerceve_dizisi). VideoDna her cekime sira = cekim indeksi verir (kartli cekimler de
    diziyi ilerletir); medya gorunen cekimler: kart yok ya da kelime karti (sayi/alinti medya gostermez)."""
    dna = props.get('dna') or {}
    oran = (dna.get('iskelet') or {}).get('cerceveli_oran')
    if oran is None or not dna.get('tohum'):
        return None
    fps = props['veri']['fps']
    cekimler = props['veri']['cekimler']
    dizi = cekim_cerceveleri(props)
    n = cer = 0
    sure_top = sure_cer = 0.0
    tur = Counter()
    for i, c in enumerate(cekimler):
        if (c.get('kart') or {}).get('tur') in ('sayi', 'alinti'):
            continue
        s = c['kare'] / fps
        n += 1
        sure_top += s
        if dizi[i] != 'tam':
            cer += 1
            sure_cer += s
            tur[dizi[i]] += 1
    if not n:
        return None
    return {'hedef': oran, 'adet': n, 'cerceveli': cer, 'oran': cer / n, 'sure_oran': sure_cer / sure_top if sure_top else 0, 'tur': dict(tur),
            'bolumlu': props['veri'].get('bolumler') is not None}


def cerceve_bulgu(o):
    if not o or o.get('bolumlu'):          # bolumlu planda oran bolum muamelesinden gelir (efekt butcesi denetler)
        return []
    sap = max(abs(o['oran'] - o['hedef']), abs(o['sure_oran'] - o['hedef']))
    if sap <= 0.05:
        return []
    return [('UYARI', 'cerceve-orani', f"%{o['oran'] * 100:.0f}",
             f"cerceveli cekim %{o['oran'] * 100:.0f} (sure payi %{o['sure_oran'] * 100:.0f}), hedef iskelet.cerceveli_oran %{o['hedef'] * 100:.0f} ±5 "
             f"({', '.join(f'{k} {v}' for k, v in o['tur'].items())}) — tohum bu videoda orani saptiriyor; tohumu degistir ya da DnaMedya'da kotali secim", None)]


# ---------------------------------------------------------------- kaynak videodaki gomulu yazi (kaynak_yazi.py ciktisi)
ALT_UCTE_BIR = 0.62     # kaynak_yazi.py ile ayni: kutu merkezi bunun altinda -> alt bant / altyazi / kelime karti alani
RESIM = re.compile(r'\.(jpe?g|png|webp|avif)$', re.I)


def public_bul(plan_yolu):
    d = os.path.dirname(os.path.abspath(plan_yolu))
    for _ in range(6):
        if os.path.isdir(os.path.join(d, 'public')):
            return os.path.join(d, 'public')
        d = os.path.dirname(d)
    return None


def kaynak_yazi_yukle(props, public):
    """cekim indeksi -> (src, yazi.json icerigi ya da None). Resim kaynaklar atlanir."""
    v = props['veri']
    out = {}
    onb = {}
    for i, c in enumerate(v['cekimler']):
        if not c.get('tag') and not c.get('src'):
            continue
        src = c.get('src') or f"{v.get('klasor', '')}/kaynak/{c['tag']}.mp4"
        if RESIM.search(src) or c.get('video') is False:
            continue
        if src not in onb:
            y = os.path.join(public, os.path.splitext(src)[0] + '.yazi.json') if public else ''
            try:
                onb[src] = jyukle(y) if y and os.path.exists(y) else None
            except ValueError:
                onb[src] = None          # yazilirken okundu / bozuk: olculmemis say
        out[i] = (src, onb[src])
    return out


def alt_yazi_turu(c, cek, kelimeler, altyazi_var):
    """cekimde alt ucte birde BIZIM hangi yazimiz var: altbant / kart-kelime / altyazi / None"""
    k = (c.get('kart') or {}).get('tur')
    if k == 'kelime':
        return None if (c.get('kart') or {}).get('yerlesim') == 'zemin' else 'kart-kelime'   # zemin yerlesimi: bulanik kaynak
    if k and k != 'coklu':
        return None          # tam ekran kart (sayi, alinti, liste...): altyazi gizli, medya alt bolgesi kartin altinda
    if c.get('etiket'):
        return 'altbant'
    if altyazi_var and any(w['bas'] < cek['son'] and w['son'] > cek['bas'] for w in kelimeler):
        return 'altyazi'
    return None


def kaynak_cakisma(yj, a, b, tum_kare=False):
    """[a, b] kaynak penceresinde alt ucte birdeki (tum_kare: karenin herhangi bir yerindeki) gomulu yazi bolgeleri; None = olculmemis"""
    if not yj:
        return None
    ol = yj.get('olculen') or [[0, yj.get('sure', 0)]]
    if not any(p - 0.01 <= a and b <= q + yj.get('aralik', 1) for p, q in ol):
        return None
    return [g for g in yj.get('bolgeler', []) if g.get('tur', 'kaplama') == 'kaplama'          # sahne yazisi (pano, sponsor duvari) sayilmaz
            and (tum_kare or g['kutu'][1] + g['kutu'][3] / 2 >= ALT_UCTE_BIR) and min(b, g['bit']) - max(a, g['bas']) > 0.05]


def kaynak_denetle(props, cek, ky):
    """alt bant / altyazi / kelime karti gelen cekimin kaynak penceresinde (kb, kb + sure) alt ucte birde gomulu yazi -> UYARI"""
    v = props['veri']
    dna = props.get('dna') or {}
    altyazi_var = (dna.get('altyazi') or 'yok') != 'yok'
    kel = v.get('kelimeler') or []
    bulgular, ozet = [], {'denetlenen': 0, 'olculmemis': 0, 'cakisma': 0, 'ust_alinan': 0}
    for i, c in enumerate(v['cekimler']):
        if i not in ky:
            continue
        tur = alt_yazi_turu(c, cek[i], kel, altyazi_var)
        if not tur:
            continue
        src, yj = ky[i]
        a, b = float(c.get('kb') or 0), float(c.get('kb') or 0) + cek[i]['sure']
        g = kaynak_cakisma(yj, a, b)
        if g is None:
            ozet['olculmemis'] += 1
            continue
        ozet['denetlenen'] += 1
        if not g:
            continue
        yer = f"#{i} {cek[i]['bas']:.1f}s {tur}"
        gm = '; '.join(f"\"{x['metin'][:32]}\" ({x['bas']:.0f}-{x['bit']:.0f}s)" for x in g[:2])
        bilgi = {'i': i, 'tur': tur, 'src': src}
        if c.get('etiket_ust'):
            ozet['ust_alinan'] += 1      # VideoDna.tsx uyguluyor: alt bant / kelime karti / altyazi ust ucte birde cizilir
            continue
        ozet['cakisma'] += 1
        bulgular.append(('UYARI', 'kaynak-yazisi-cakisma', yer, f"kaynak '{os.path.basename(src)}' {a:.1f}-{b:.1f}s alt ucte birde gomulu yazi: {gm}", bilgi))
    return bulgular, ozet


def kaynak_duzelt(props, ky, asgari_kare=18):
    """cakisan cekimi ayni kaynagin yazisiz (olculmus) penceresine kaydir (kb degisir, en yakin pencere, ayni parca baska cekimde
    kullanilmiyor); bulunamazsa cekime etiket_ust: true (alt bant / kelime karti / altyazi ust ucte bire alinir; VideoDna.tsx uygular)."""
    v = props['veri']
    fps = v['fps']
    cek, _ = plan_ogeleri(v)
    bul, _ = kaynak_denetle(props, cek, ky)
    islem = []
    for _s, kod, _y, _m, bi in bul:
        if kod != 'kaynak-yazisi-cakisma':
            continue
        i = bi['i']
        c = v['cekimler'][i]
        src, yj = ky[i]
        sure = c['kare'] / fps
        kb0 = float(c.get('kb') or 0)
        diger = [(float(x.get('kb') or 0), float(x.get('kb') or 0) + x['kare'] / fps) for j, x in enumerate(v['cekimler'])
                 if j != i and j in ky and ky[j][0] == src]
        adim = 0.25
        aday = []          # (temiz_kare, s): hic kaplama yazisi olmayan pencere (ortada baslik da yok) tercih, alt ucte biri temiz yeter
        for p, q in yj.get('olculen') or []:
            s = math.ceil(p / adim) * adim
            while s + sure <= min(q, yj.get('sure', q) - 0.1):
                if kaynak_cakisma(yj, s, s + sure) == [] and all(min(s + sure, y) - max(s, x) <= 0.5 for x, y in diger):
                    aday.append((kaynak_cakisma(yj, s, s + sure, tum_kare=True) == [], s))
                s += adim
        if aday:
            temiz, s = min(aday, key=lambda x: abs(x[1] - kb0) + (0 if x[0] else 10))   # kaplamasiz pencere 10 sn'ye kadar daha uzakta olabilir
            c['kb'] = round(s, 3)
            islem.append(f"#{i} ({bi['tur']}): kb {kb0:.2f} -> {s:.2f} sn ('{os.path.basename(src)}' {'kaplama yazisiz' if temiz else 'alt ucte biri yazisiz'} pencere, {s - kb0:+.1f} sn)")
        else:
            c['etiket_ust'] = True
            islem.append(f"#{i} ({bi['tur']}): '{os.path.basename(src)}' icinde yazisiz {sure:.1f} sn pencere yok -> etiket_ust: true (yazi ust ucte bire alinir)")
    return props, islem


# ---------------------------------------------------------------- rakip hedefleri
def rakip_hedef(klasorler):
    sureler, hareket, yazi, kart = [], [], [], []
    for k in klasorler:
        a = os.path.join(k, 'ritim', 'analiz.json') if os.path.isdir(k) else k
        if os.path.exists(a):
            d = jyukle(a)
            ks = (((d.get('istatistik') or {}).get('tum') or {}).get('kaynak_yuzde_sure') or {}).get('grafik/kart')
            if ks is not None:
                kart.append(ks / 100)
            cs = d.get('cekimler') or []
            sureler.append([c['sure'] for c in cs if c.get('sure')])
            hareket.append(dongu([c.get('hareket') for c in cs]))
        ys = os.path.join(k, 'yazi-senkron.json') if os.path.isdir(k) else ''
        if ys and os.path.exists(ys):
            yazi.append(jyukle(ys).get('ozet', {}))
    if not sureler:
        return None
    def med(f, xs):
        xs = [f(x) for x in xs if x]
        return st.median(xs) if xs else None
    h = [x for x in hareket if x]
    return {'adet': len(sureler), 'medyan': med(st.median, sureler), 'p90': med(lambda x: yuzdelik(x, 0.9), sureler),
            'kisa_oran': med(lambda x: sum(s < 0.8 for s in x) / len(x), sureler), 'en_uzun': med(max, sureler),
            'hareket': {'baskin': Counter(x['baskin'] for x in h).most_common(1)[0][0], 'baskin_pay': st.median(x['baskin_pay'] for x in h)} if h else None,
            'yazi': yazi_hedef(yazi), 'kart_pay': st.median(kart) if kart else None}


def yazi_hedef(ozetler):
    """rakiplerin yazi-senkron.json ozetinden (yazi_senkron.py) tipik yazi davranisi. Yalniz bilgi + UYARI esigi:
    okuma hizi sabitleri (OKUMA_*, GIRIS, TUTMA, ASGARI) DEGISMEZ."""
    def topla(grup, alan):
        xs = [(o.get(grup) or {}).get(alan) for o in ozetler]
        xs = [x for x in xs if x is not None]
        return st.median(xs) if xs else None
    if not ozetler:
        return None
    gec = topla('sesli', 'gecikme_medyan')
    return {'adet': len(ozetler), 'ekran_sure_medyan': topla('yazi', 'ekran_sure_medyan'),
            'gecikme_medyan': gec if gec is not None else topla('yazi', 'gecikme_medyan'),
            'okunmadan_oran': topla('yazi', 'okunmadan_oran'), 'dakikada': topla('yazi', 'dakikada'),
            'ses_bitmeden_oran': topla('sesli', 'ses_bitmeden_oran'),
            'altyazi': sum(1 for o in ozetler if (o.get('altyazi') or {}).get('adet', 0) >= 10)}


def yazi_hedef_metin(r):
    f = lambda x, s='': '-' if x is None else f'{x:{s}}'
    return (f"{r['adet']} video · yazi ekranda medyan {f(r['ekran_sure_medyan'], '.1f')} sn · gecikme medyan {f(r['gecikme_medyan'], '+.2f')} sn"
            f" · okunmadan kaybolan %{f(None if r['okunmadan_oran'] is None else r['okunmadan_oran'] * 100, '.0f')}"
            f" · dakikada {f(r['dakikada'], '.0f')} yazi · altyazili {r['altyazi']}/{r['adet']}")


def yazi_rakip_bulgu(ekran_medyan, gecikme_medyan, r):
    """bizim yazi medyanlarimiz rakipten belirgin sapiyorsa UYARI (FAIL degil: hedef okuma suresi sabitlerle belirlenir)"""
    out = []
    if not r:
        return out
    if ekran_medyan is not None and r.get('ekran_sure_medyan') and ekran_medyan < 0.7 * r['ekran_sure_medyan']:
        out.append(('UYARI', 'yazi-rakipten-kisa', 'medyan', f"yazilar ekranda medyan {ekran_medyan:.1f} sn, rakip {r['ekran_sure_medyan']:.1f} sn — izleyici rakipte daha uzun okuyor", None))
    if gecikme_medyan is not None and r.get('gecikme_medyan') is not None and gecikme_medyan > r['gecikme_medyan'] + 0.4:
        out.append(('UYARI', 'yazi-rakipten-gec', 'medyan', f"yazi seslendirmeden medyan {gecikme_medyan:+.2f} sn sonra geliyor, rakip {r['gecikme_medyan']:+.2f} sn", None))
    return out


def klip_denetle(sureler, ref):
    out = []
    if not sureler:
        return out, {}
    o = {'medyan': st.median(sureler), 'p90': yuzdelik(sureler, 0.9), 'kisa_oran': sum(s < 0.8 for s in sureler) / len(sureler), 'en_uzun': max(sureler)}
    if not ref:
        return out, o
    if abs(o['medyan'] - ref['medyan']) > 0.3 * ref['medyan']:
        out.append(('FAIL', 'klip-suresi', 'medyan', f"medyan cekim {o['medyan']:.2f} sn, rakip {ref['medyan']:.2f} sn — {'kesimleri seyrelt' if o['medyan'] < ref['medyan'] else 'cumle icine kesim ekle'}", None))
    if o['p90'] > ref['p90'] * 1.4:
        out.append(('UYARI', 'uzun-klipler', 'p90', f"uzun cekimler (p90 {o['p90']:.1f} sn, rakip {ref['p90']:.1f}) — ekranda fazla kaliyor", None))
    if o['kisa_oran'] > ref['kisa_oran'] + 0.12:
        out.append(('UYARI', 'cok-kisa-klipler', '<0,8 sn', f"<0,8 sn cekim payi %{o['kisa_oran'] * 100:.0f} (rakip %{ref['kisa_oran'] * 100:.0f}) — goz yetismiyor", None))
    if o['en_uzun'] > max(ref['en_uzun'] * 1.3, 8):
        out.append(('UYARI', 'en-uzun-klip', f"{o['en_uzun']:.1f} sn", f"en uzun cekim rakibinkinden ({ref['en_uzun']:.1f} sn) cok uzun", None))
    return out, o


# ---------------------------------------------------------------- duzeltme (plan)
def duzelt(props, bulgular, asgari_kare=18):
    """yazi suresi / gec yazi / erken kaybolma: komsu (yazisiz) cekimlerden kare odunc al. Toplam kare sabit."""
    veri = props['veri']
    fps = veri['fps']
    C = veri['cekimler']
    yazili = lambda j: bool(C[j].get('kart') or C[j].get('etiket'))
    islem = []
    hedefler = {}
    for sev, kod, yer, msg, y in bulgular:
        if not y or 'cekim' not in y:
            continue
        i = y['cekim']
        h = hedefler.setdefault(i, {'uzat': 0.0, 'erken': 0.0})
        if kod == 'okunmadan-kayboluyor':
            h['uzat'] = max(h['uzat'], y['ihtiyac'] - y['sure'])
        elif kod == 'ses-bitmeden-kayboluyor':
            h['uzat'] = max(h['uzat'], y['soylenme_son'] + 0.4 - y['son'])
        elif kod == 'gec-geliyor':
            h['erken'] = max(h['erken'], y['gecikme'] - 0.15)
    for i in sorted(hedefler, reverse=True):     # sondan basa: indeksler kaymasin
        h = hedefler[i]
        if h['erken'] > 0 and i > 0:
            j = i - 1
            al = min(int(round(h['erken'] * fps)), C[j]['kare'] - asgari_kare) if not yazili(j) else 0
            if al > 0:
                C[j]['kare'] -= al
                C[i]['kare'] += al
                C[i]['kb'] = max(0, C[i].get('kb', 0) - al / fps)
                islem.append(f"#{i}: {al / fps:.2f} sn erken basliyor (#{j} kisaldi)")
        if h['uzat'] > 0:
            ihtiyac = int(math.ceil(h['uzat'] * fps))
            j = i + 1
            while ihtiyac > 0 and j < len(C) and not yazili(j):
                al = min(ihtiyac, C[j]['kare'] - asgari_kare)
                if al <= 0:                        # cok kisa kaldi: cekimi tamamen yut
                    al = C[j]['kare']
                    C[i]['kare'] += al
                    ihtiyac -= al
                    islem.append(f"#{i}: #{j} yutuldu (+{al / fps:.2f} sn)")
                    del C[j]
                    continue
                C[j]['kare'] -= al
                C[j]['kb'] = C[j].get('kb', 0) + al / fps
                C[i]['kare'] += al
                ihtiyac -= al
                islem.append(f"#{i}: +{al / fps:.2f} sn (#{j}'den)")
                j += 1
            # ileride yazili cekim var: yaziyi en fazla 1,5 sn ERKEN baslat (onceki yazisiz cekimden)
            geri = int(1.5 * fps) - int(round(max(0, h['erken']) * fps))
            j = i - 1
            while ihtiyac > 0 and geri > 0 and j >= 0 and not yazili(j):
                al = min(ihtiyac, geri, C[j]['kare'] - asgari_kare)
                if al <= 0:
                    break
                C[j]['kare'] -= al
                C[i]['kare'] += al
                C[i]['kb'] = max(0, C[i].get('kb', 0) - al / fps)
                ihtiyac -= al
                geri -= al
                islem.append(f"#{i}: {al / fps:.2f} sn erken basliyor (#{j}'den, sonrasi yazili)")
                j -= 1
            if ihtiyac > 0:
                islem.append(f"#{i}: {ihtiyac / fps:.2f} sn daha gerekiyor ama sonraki cekim de yazili — metni kisalt ya da kartlari ayir")
    return props, islem


# ---------------------------------------------------------------- rapor
def rapor(baslik, bulgular, ozet, cikti, islem=None):
    f = [b for b in bulgular if b[0] == 'FAIL']
    u = [b for b in bulgular if b[0] == 'UYARI']
    L = [f'# Kurgu denetimi — {baslik}', '', f"**Sonuc: {'FAIL' if f else 'PASS'}** — {len(f)} FAIL, {len(u)} UYARI", '']
    L += ['## Ozet', '', '| olcu | deger |', '|---|---|'] + [f'| {k} | {v} |' for k, v in ozet.items()] + ['']
    say = Counter((b[0], b[1]) for b in bulgular)
    if say:
        L += ['## Hata turleri', '', '| seviye | tur | adet |', '|---|---|---|'] + [f'| {s} | {k} | {n} |' for (s, k), n in say.most_common()] + ['']
    for ad, grup in (('FAIL', f), ('UYARI', u)):
        if grup:
            L += [f'## {ad}', ''] + [f'- **{b[1]}** · {b[2]} — {b[3]}' for b in grup[:200]] + ([f'- ... {len(grup) - 200} tane daha'] if len(grup) > 200 else []) + ['']
    if islem is not None:
        L += ['## Otomatik duzeltme', ''] + [f'- {x}' for x in islem] + ['']
    open(cikti, 'w', encoding='utf-8').write('\n'.join(L))
    return len(f)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan')
    ap.add_argument('--analiz', help='render sonrasi: kare_analiz.py analiz.json (bizim final)')
    ap.add_argument('--yazi', help='render sonrasi: yazi_senkron.py ciktisi (bizim final)')
    ap.add_argument('--rakip', nargs='*', default=[])
    ap.add_argument('--duzelt')
    ap.add_argument('--cikti')
    ap.add_argument('--sablon', help='kanal-sablon.json (verilmezse plan klasorunden yukari aranir): rakip video/gorsel/kart orani')
    a = ap.parse_args()
    if not a.plan and not a.analiz and not a.yazi:
        ap.error('--plan, --analiz ya da --yazi gerekli')
    ref = rakip_hedef(a.rakip) if a.rakip else None
    yref = ref and ref.get('yazi')
    bulgular, ozet = [], {}
    if ref:
        ozet['rakip'] = f"{ref['adet']} video · medyan {ref['medyan']:.2f} sn · p90 {ref['p90']:.1f} · <0,8 sn %{ref['kisa_oran'] * 100:.0f}"
        ozet['rakip yazi'] = yazi_hedef_metin(yref) if yref else 'olcum yok (rakip klasorunde yazi-senkron.json yok: kanal_isle.py --zorla ile yeniden olc)'
    if a.plan:
        props = jyukle(a.plan)
        veri = props['veri']
        cek, yazilar = plan_ogeleri(veri, props.get('dna'))
        bulgular += yazi_denetle(yazilar, veri.get('kelimeler') or [])
        kb, o = klip_denetle([c['sure'] for c in cek], ref)
        bulgular += kb + tekrar_denetle(cek)
        cb, _ = cesit_denetle(cek)
        bulgular += cb + varyant_denetle(cek)
        ozet['sahne turu dagilimi'] = dagilim_ozet(cek, ref)
        eb, eo = efekt_denetle(props)
        bulgular += eb
        ozet['efekt butcesi'] = ' · '.join(f"{k} {v}" for k, v in eo.items())
        co = cerceve_olc(props)
        bulgular += cerceve_bulgu(co)
        sablon = sablon_bul(a.plan, a.sablon)
        kk, kko = kaynak_karisimi(props, sablon)
        bulgular += kk
        ozet.update(kko)
        if co:
            ozet['cerceveli (DnaMedya taklidi)'] = (f"%{co['oran'] * 100:.0f} cekim ({co['cerceveli']}/{co['adet']}), sure payi %{co['sure_oran'] * 100:.0f}"
                                                    f" · hedef %{co['hedef'] * 100:.0f} · {', '.join(f'{k} {v}' for k, v in co['tur'].items()) or '-'}")
        public = public_bul(a.plan)
        ky = kaynak_yazi_yukle(props, public)
        kbul, kozet = kaynak_denetle(props, cek, ky)
        bulgular += kbul
        olculen_kaynak = sum(1 for s, yj in ky.values() if yj)
        ozet['kaynak gomulu yazi'] = (f"{kozet['denetlenen']} alt yazili cekim denetlendi, {kozet['cakisma']} cakisma"
                                      + (f", {kozet['ust_alinan']} cekimde etiket_ust ile ust ucte bire alinmis" if kozet['ust_alinan'] else '')
                                      + (f", {kozet['olculmemis']} cekimin kaynak penceresi olculmemis" if kozet['olculmemis'] else '')
                                      + ('' if olculen_kaynak else f" — kaynak_yazi.py calistirilmamis: py kaynak_yazi.py {public or '<public>'}/{veri.get('klasor', '')} --plan {a.plan}"))
        kartd = dongu([c['kart'] or 'medya' for c in cek])
        bulgular += [b for b in dongu_bulgu(kartd, None, 'kart') if b[0] == 'FAIL']
        ozet.update({'cekim': len(cek), 'medyan cekim': f"{o['medyan']:.2f} sn", 'p90': f"{o['p90']:.1f} sn", 'en uzun': f"{o['en_uzun']:.1f} sn",
                     'yazi ogesi': len(yazilar), 'seste karsiligi olan yazi': sum(1 for y in yazilar if y.get('eslesme', 0) >= 0.5),
                     'yeterli sure kalan yazi': f"{sum(1 for y in yazilar if y['sure'] >= y['ihtiyac'])}/{len(yazilar)}"})
        g = [y['gecikme'] for y in yazilar if 'gecikme' in y]
        if g:
            ozet['yazi-ses gecikmesi (medyan)'] = f"{st.median(g):+.2f} sn (eksi = yazi once)"
        if yazilar:
            ozet['yazi ekranda (medyan)'] = f"{st.median(y['sure'] for y in yazilar):.1f} sn"
            bulgular += yazi_rakip_bulgu(st.median(y['sure'] for y in yazilar), st.median(g) if g else None, yref)
        cikti = a.cikti or os.path.join(os.path.dirname(os.path.abspath(a.plan)), 'KURGU-DENETIM.md')
        if a.duzelt:
            import copy
            yeni, islem = duzelt(copy.deepcopy(props), bulgular)
            ky2 = kaynak_yazi_yukle(yeni, public)          # yazi duzeltmesi cekim silebilir: indeksler yeniden
            yeni, kislem = kaynak_duzelt(yeni, ky2)
            islem += kislem
            json.dump(yeni, open(a.duzelt, 'w', encoding='utf-8'), ensure_ascii=False)
            cek2, y2 = plan_ogeleri(yeni['veri'], yeni.get('dna'))
            kb2, kozet2 = kaynak_denetle(yeni, cek2, ky2)
            b2 = (yazi_denetle(y2, yeni['veri'].get('kelimeler') or []) + klip_denetle([c['sure'] for c in cek2], ref)[0] + tekrar_denetle(cek2)
                  + cesit_denetle(cek2)[0] + varyant_denetle(cek2) + efekt_denetle(yeni)[0]
                  + cerceve_bulgu(cerceve_olc(yeni)) + kb2 + kaynak_karisimi(yeni, sablon)[0])
            toplam = (sum(c['kare'] for c in veri['cekimler']), sum(c['kare'] for c in yeni['veri']['cekimler']))
            ozet['duzeltme'] = f"{len(islem)} islem · FAIL {sum(b[0] == 'FAIL' for b in bulgular)} -> {sum(b[0] == 'FAIL' for b in b2)} · toplam kare {toplam[0]} -> {toplam[1]}"
            ozet['kaynak gomulu yazi (duzeltme sonrasi)'] = (f"{kozet['cakisma']} -> {kozet2['cakisma']} cakisma"
                                                            + (f", {kozet2['ust_alinan']} cekimde etiket_ust ile ust ucte bire alinmis" if kozet2['ust_alinan'] else ''))
            nf = rapor(os.path.basename(a.duzelt), b2, ozet, cikti, islem)
            print(f'duzeltildi -> {a.duzelt} | {ozet["duzeltme"]} | rapor {cikti}')
            sys.exit(1 if nf else 0)
    else:
        if a.analiz:
            d = jyukle(a.analiz)
            cs = d.get('cekimler') or []
            kb, o = klip_denetle([c['sure'] for c in cs if c.get('sure')], ref)
            bulgular += kb
            hd = dongu([c.get('hareket') for c in cs])
            bulgular += dongu_bulgu(hd, ref and ref.get('hareket'), 'hareket')
            bulgular += dongu_bulgu(dongu([c.get('giris') for c in cs]), None, 'gecis')
            ozet.update({'cekim': len(cs), 'medyan cekim': f"{o['medyan']:.2f} sn", 'hareket': f"baskin {hd.get('baskin')} %{hd.get('baskin_pay', 0) * 100:.0f} · lag2/3 {hd.get('lag', {}).get(2)}/{hd.get('lag', {}).get(3)} (tesadufi {hd.get('beklenti')})" if hd else '-'})
        if a.yazi:
            ys = jyukle(a.yazi)
            yo = ys.get('ozet', {})
            yz, sl = yo.get('yazi') or {}, yo.get('sesli') or {}
            ozet['yazi (final)'] = (f"{yz.get('adet', 0)} yazi ({', '.join(f'{k} {v}' for k, v in (yo.get('tur_dagilimi') or {}).items())}) · "
                                    f"ekranda medyan {yz.get('ekran_sure_medyan')} sn · gecikme medyan {sl.get('gecikme_medyan')} sn · "
                                    f"okunmadan {yz.get('okunmadan_kaybolan')} · ses bitmeden {yz.get('ses_bitmeden')} "
                                    f"(aralik {yo.get('aralik')}, kelimeler: {yo.get('kelime_kaynagi')})")
            bulgular += yazi_rakip_bulgu(yz.get('ekran_sure_medyan'), sl.get('gecikme_medyan'), yref)
            for e in ys.get('ogeler', []):
                if e.get('tur') in ('altyazi', 'goruntu_ici', 'kalici', 'anlik', 'sayac'):
                    continue      # altyazi konusmayla akar; goruntu ici yazi / logo / sayac rakami kurgu yazisi olcusu degil
                yer = f"{e['bas']:.1f}s \"{e['metin'][:48]}\""
                if e.get('okunmadan', e.get('sure', 9) < e.get('ihtiyac', 0)):   # yazi_senkron OCR payini (bir ornek araligi) iceriyor
                    bulgular.append(('FAIL' if e['sure'] < 0.75 * e['ihtiyac'] else 'UYARI', 'okunmadan-kayboluyor', yer, f"ekranda {e['sure']:.1f} sn, gereken {e['ihtiyac']:.1f} sn", None))
                if e.get('gecikme') is not None and e['gecikme'] > 0.6:
                    bulgular.append(('FAIL' if e['gecikme'] > 1.5 else 'UYARI', 'gec-geliyor', yer, f"{e['gecikme']:.1f} sn gec", None))
                if e.get('ses_bitmeden'):
                    bulgular.append(('FAIL', 'ses-bitmeden-kayboluyor', yer, 'seslendirmeci bitirmeden ekrandan cikiyor', None))
        cikti = a.cikti or os.path.join(os.path.dirname(os.path.abspath(a.analiz or a.yazi)), 'KURGU-DENETIM.md')
    nf = rapor(os.path.basename(a.plan or a.analiz or a.yazi), bulgular, ozet, cikti)
    print(f"{'FAIL' if nf else 'PASS'} — {nf} FAIL, {sum(b[0] == 'UYARI' for b in bulgular)} UYARI -> {cikti}")
    for k, v in ozet.items():
        print(f'  {k}: {v}')
    sys.exit(1 if nf else 0)


if __name__ == '__main__':
    main()
