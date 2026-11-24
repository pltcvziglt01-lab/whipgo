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
--duzelt: cozulebilen hatalari (yazi suresi, gec gelen yazi, yazi seslendirmeden once kayboluyor) komsu cekimlerden kare
          odunc alarak duzeltir, toplam sure DEGISMEZ; sonucu yeniden denetler.
Kontroller (FAIL = teslim yok; UYARI = bak, gerekceyle birak):
  YAZI  okunmadan kayboluyor: ekranda kalma < okuma ihtiyaci (giris 0,4 sn + kelime/okuma hizi + 0,3 sn tutma; en az 1,3 sn)
        seslendirmeci bitirmeden kayboluyor: yazi, metindeki kelimeler soylenmeden ekrandan cikiyor
        gec geliyor: yazi, seslendirmeci o kelimeyi soyledikten > 0,6 sn sonra beliriyor (> 1,5 sn FAIL)
        erken (spoiler): yazi, soylenmeden > 2 sn once beliriyor · seste karsiligi yok (bilgi kartinda normal, kelime kartinda supheli)
        kalabalik: iki yazi arasinda < 1,5 sn bos ekran
  KLIP  cekim suresi dagilimi rakipten sapmis (medyan ±%30, p90, <0,8 sn oran, en uzun) · ayni kaynak parcasi tekrar gosteriliyor
  TEKRAR ayni kart turu 3+ kez art arda · flas/vurgu duzenli aralikla (dongu) · hareket etiketleri dongusel (A-B-C-A-B-C):
        lag-2/3 eslesme orani tesadufi beklentiden > 0,25 fazla · tek hareket payi rakipten > 0,2 fazla
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
def plan_ogeleri(veri):
    fps = veri['fps']
    t, cek, yazilar = 0, [], []
    for i, c in enumerate(veri['cekimler']):
        bas, son = t / fps, (t + c['kare']) / fps
        cek.append({'i': i, 'bas': bas, 'son': son, 'sure': son - bas, 'tag': c.get('tag'), 'kb': c.get('kb', 0),
                    'kart': (c.get('kart') or {}).get('tur'), 'etiket': bool(c.get('etiket')), 'flas': bool(c.get('flas'))})
        k = c.get('kart')
        if k:
            a, b = k.get('a') or '', k.get('b') or ''
            if k['tur'] == 'alinti':
                n, ses, ek = len(tokenler(a)) + 0.5 * len(tokenler(b)), a, 0
            elif k['tur'] == 'sayi':
                n, ses, ek = 1 + len(tokenler(b)), a + ' ' + b, 1.0   # sayac sayma animasyonu ~1 sn
            else:
                n, ses, ek = len(tokenler(a + ' ' + b)), a + ' ' + b, 0
            yazilar.append({'cekim': i, 'tur': 'kart-' + k['tur'], 'metin': (a + ' / ' + b).strip(' /'), 'bas': bas, 'son': son, 'kelime': n, 'ses_metni': ses, 'ek': ek})
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
        if duyulan:
            lead = y['bas'] - sb
            y['gecikme'] = round(lead, 2)
            if lead > 0.6:
                bulgular.append(('FAIL' if lead > 1.5 else 'UYARI', 'gec-geliyor', yer, f"seslendirmeci {lead:.1f} sn once soyledi; yazi kelimeyle birlikte (en gec +0,3 sn) gelmeli", y))
            elif lead < -2.0:
                bulgular.append(('UYARI', 'erken-spoiler', yer, f"yazi soylenmeden {-lead:.1f} sn once ekranda", y))
            if y['son'] < ss + 0.3:
                bulgular.append(('FAIL', 'ses-bitmeden-kayboluyor', yer, f"yazi {y['son']:.1f}s'de cikiyor, seslendirmeci {ss:.1f}s'de bitiriyor", y))
        elif kelimeler and y['tur'] in ('kart-kelime',):
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
        if not c.get('tag') or c.get('kart') in ('alinti', 'sayi'):
            continue
        a, b = c['kb'], c['kb'] + c['sure']
        for (pa, pb, pi) in gorulen.get(c['tag'], []):
            if min(b, pb) - max(a, pa) > 0.5 and c['i'] - pi > 1:
                bulgular.append(('UYARI', 'ayni-goruntu-tekrar', f"#{pi} ve #{c['i']} {c['bas']:.1f}s", f"'{c['tag']}' kaynaginin ayni {min(b, pb) - max(a, pa):.1f} sn'lik parcasi iki kez", None))
                break
        gorulen.setdefault(c['tag'], []).append((a, b, c['i']))
    return bulgular


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


# ---------------------------------------------------------------- rakip hedefleri
def rakip_hedef(klasorler):
    sureler, hareket, yazi = [], [], []
    for k in klasorler:
        a = os.path.join(k, 'ritim', 'analiz.json') if os.path.isdir(k) else k
        if os.path.exists(a):
            d = jyukle(a)
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
            'yazi': yazi_hedef(yazi)}


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
        cek, yazilar = plan_ogeleri(veri)
        bulgular += yazi_denetle(yazilar, veri.get('kelimeler') or [])
        kb, o = klip_denetle([c['sure'] for c in cek], ref)
        bulgular += kb + tekrar_denetle(cek)
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
            json.dump(yeni, open(a.duzelt, 'w', encoding='utf-8'), ensure_ascii=False)
            cek2, y2 = plan_ogeleri(yeni['veri'])
            b2 = yazi_denetle(y2, yeni['veri'].get('kelimeler') or []) + klip_denetle([c['sure'] for c in cek2], ref)[0] + tekrar_denetle(cek2)
            toplam = (sum(c['kare'] for c in veri['cekimler']), sum(c['kare'] for c in yeni['veri']['cekimler']))
            ozet['duzeltme'] = f"{len(islem)} islem · FAIL {sum(b[0] == 'FAIL' for b in bulgular)} -> {sum(b[0] == 'FAIL' for b in b2)} · toplam kare {toplam[0]} -> {toplam[1]}"
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
