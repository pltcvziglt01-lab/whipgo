#!/usr/bin/env python3
"""Kendi kanal(lar)imizin demonetizasyon / "tekrar eden icerik" / kume (cluster) riskini olcer.

Dayanak: Google'in S-CTS makalesi (references/demonetizasyon-riski.md). YouTube'un gercek esikleri
bilinmez; buradaki esikler BIZIM sezgisel uyari esiklerimizdir, kanit degil, erken uyaridir.

Kullanim:
  py kanal_risk.py @KanalA [@KanalB ...] [--adet 30] [--altyazi] [--metinler klasor1 klasor2 ...]
                   [--cerez cookies.txt] [--cikti RISK-RAPORU.md]

Olcer (her kanal):
  - yukleme temposu: aralik medyani/sapmasi, ayni gun 2+ yukleme, saat sabitligi
  - baslik kalibi: sayilar # yapilip iskelet tekrar orani, ortalama ikili Jaccard, %40+ basliktaki 2-3'lu kelime gruplari
  - aciklama: ilk 2 cumlesi baska videoyla ayni olan video orani
  - sure: degisim katsayisi (hep ayni uzunluk = sablon)
  - metin (--altyazi ile YouTube otomatik altyazisi veya --metinler ile kendi metin.txt'lerimiz):
    videolar arasi 6'li kelime dizisi ortakligi ve kelime-vektor kosinusu
Birden cok kanal verilirse: kanallar ARASI baslik ve metin benzerligi (kume riski).
"""
import argparse, collections, glob, itertools, json, math, os, re, statistics, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rakip_indir as R  # ytdlp(), kanal_url(), EK


def kelimeler(s):
    return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*", s.lower())


def iskelet(baslik):
    s = re.sub(r"\d+", "#", baslik.lower())
    return re.sub(r"\s+", " ", s).strip()


def jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a | b else 0.0


def ngram(ws, n):
    return {tuple(ws[i:i + n]) for i in range(len(ws) - n + 1)}


def kosinus(a, b):
    ca, cb = collections.Counter(a), collections.Counter(b)
    ortak = set(ca) & set(cb)
    pay = sum(ca[k] * cb[k] for k in ortak)
    na = math.sqrt(sum(v * v for v in ca.values()))
    nb = math.sqrt(sum(v * v for v in cb.values()))
    return pay / (na * nb) if na and nb else 0.0


def vtt_metin(yol):
    out, onceki = [], None
    for s in open(yol, encoding='utf-8', errors='replace'):
        s = s.strip()
        if not s or '-->' in s or s.startswith(('WEBVTT', 'Kind:', 'Language:', 'NOTE')) or s.isdigit():
            continue
        s = re.sub(r'<[^>]+>', '', s)
        if s != onceki:
            out.append(s)
        onceki = s
    return ' '.join(out)


def videolar(kanal, adet, altyazi, gecici):
    url = R.kanal_url(kanal)
    satirlar = R.ytdlp('--skip-download', '--dump-json', '--playlist-end', str(adet), url).splitlines()
    vs = []
    for s in satirlar:
        try:
            j = json.loads(s)
        except json.JSONDecodeError:
            continue
        vs.append({'id': j.get('id'), 'baslik': j.get('title') or '', 'aciklama': j.get('description') or '',
                   'tarih': j.get('upload_date'), 'zaman': j.get('timestamp'), 'sure': j.get('duration') or 0,
                   'izlenme': j.get('view_count') or 0, 'dil': j.get('language') or ''})
    if altyazi:
        for v in vs:
            hedef = os.path.join(gecici, v['id'])
            try:
                R.ytdlp('--skip-download', '--write-auto-subs', '--write-subs', '--sub-format', 'vtt',
                        '--sub-langs', (v['dil'] or 'en') + '.*,' + (v['dil'] or 'en'), '-o', hedef + '.%(ext)s',
                        'https://www.youtube.com/watch?v=' + v['id'])
            except RuntimeError:
                pass
            dosyalar = glob.glob(hedef + '*.vtt')
            v['metin'] = vtt_metin(dosyalar[0]) if dosyalar else ''
    return vs


def ikili_ort(liste, f):
    d = [f(a, b) for a, b in itertools.combinations(liste, 2)]
    return (statistics.mean(d), max(d)) if d else (0.0, 0.0)


def ilk2(s):
    c = re.split(r'(?<=[.!?])\s+', s.strip())
    return ' '.join(c[:2]).strip().lower()


def kanal_raporu(ad, vs, uyari):
    r = [f'## {ad}  ({len(vs)} video)']
    # tempo
    ts = sorted(v['zaman'] for v in vs if v['zaman'])
    if len(ts) >= 3:
        ar = [(b - a) / 86400 for a, b in zip(ts, ts[1:])]
        med = statistics.median(ar)
        sap = statistics.pstdev(ar)
        gun = collections.Counter(v['tarih'] for v in vs if v['tarih'])
        cok = sum(1 for n in gun.values() if n >= 2)
        saat = collections.Counter(int((t % 86400) // 3600) for t in ts)
        saat_oran = saat.most_common(1)[0][1] / len(ts)
        r.append(f'- Yukleme araligi medyan {med:.1f} gun, sapma {sap:.1f} gun; ayni gun 2+ yukleme: {cok} gun; '
                 f'en sik saat payi %{saat_oran*100:.0f}')
        if cok >= 2:
            uyari.append(f'{ad}: ayni gunde 2+ yukleme {cok} kez (makale: yuksek frekansli, insan disi yayin temposu sinyali)')
        if len(ts) >= 8 and saat_oran >= 0.9 and sap < 0.3 * max(med, 0.1):
            uyari.append(f'{ad}: yayin saati ve araligi neredeyse makine gibi sabit; saati/araligi dogal oynat')
    # baslik
    isk = collections.Counter(iskelet(v['baslik']) for v in vs)
    tekrar = sum(n for n in isk.values() if n > 1) / max(len(vs), 1)
    jm, jx = ikili_ort([kelimeler(v['baslik']) for v in vs], jaccard)
    say = collections.Counter()
    for v in vs:
        ws = kelimeler(v['baslik'])
        say.update(ngram(ws, 2) | ngram(ws, 3))
    sik = [(' '.join(k), n) for k, n in say.most_common(30) if n >= max(3, 0.4 * len(vs))]
    r.append(f'- Baslik: iskelet tekrar orani %{tekrar*100:.0f}, ikili Jaccard ort {jm:.2f} / max {jx:.2f}')
    if sik:
        r.append('  - %40+ baslikta gecen kelime gruplari: ' + ', '.join(f'"{k}"({n})' for k, n in sik[:8]))
        uyari.append(f'{ad}: basliklarda sablon kelime grubu: ' + ', '.join(k for k, _ in sik[:4]))
    if tekrar >= 0.3 or jm >= 0.35:
        uyari.append(f'{ad}: baslik kalibi tekrarli (iskelet %{tekrar*100:.0f}, Jaccard {jm:.2f}); kalibi dondur')
    # aciklama
    ilk = collections.Counter(ilk2(v['aciklama']) for v in vs if v['aciklama'].strip())
    ayni = sum(n for k, n in ilk.items() if n > 1 and k) / max(len(vs), 1)
    r.append(f'- Aciklama: ilk 2 cumlesi baska videoyla ayni olan oran %{ayni*100:.0f}')
    if ayni >= 0.3:
        uyari.append(f'{ad}: aciklamalarin ilk 2 cumlesi sablon (%{ayni*100:.0f}); her videoda yeniden yaz')
    # sure
    sureler = [v['sure'] for v in vs if v['sure']]
    if len(sureler) >= 3:
        dk = statistics.pstdev(sureler) / statistics.mean(sureler)
        r.append(f'- Sure: ort {statistics.mean(sureler)/60:.1f} dk, degisim katsayisi {dk:.2f}')
        if dk < 0.08 and len(sureler) >= 6:
            uyari.append(f'{ad}: video sureleri neredeyse ayni (DK {dk:.2f}); sablon uretim gorunumu')
    # metin
    metinler = [kelimeler(v.get('metin', '')) for v in vs if v.get('metin')]
    if len(metinler) >= 2:
        om, ox = ikili_ort([ngram(m, 6) for m in metinler], jaccard)
        km, kx = ikili_ort(metinler, kosinus)
        r.append(f'- Metin ({len(metinler)} video): 6li dizi ortakligi ort {om:.3f} / max {ox:.3f}; kosinus ort {km:.2f} / max {kx:.2f}')
        if ox >= 0.05:
            uyari.append(f'{ad}: iki videonun metni 6li kelime dizilerinin %{ox*100:.0f}\'ini paylasiyor; kalip cumleleri temizle (kalip_kontrol.py)')
        if km >= 0.85:
            uyari.append(f'{ad}: videolarin metinleri anlamca cok benzer (kosinus {km:.2f}); konu/format/anlatim cesitlenmeli')
    elif any('metin' in v for v in vs):
        r.append('- Metin: altyazi alinamadi (otomatik altyazi kapali ya da bot engeli)')
    return r


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kanallar', nargs='+', help='@handle veya kanal URL')
    ap.add_argument('--adet', type=int, default=30)
    ap.add_argument('--altyazi', action='store_true', help='YouTube otomatik altyazisindan metin benzerligi')
    ap.add_argument('--metinler', nargs='*', default=[], help='kanal sirasina gore, icinde */metin.txt olan klasorler')
    ap.add_argument('--cerez', help='Netscape cookies.txt (cerez_al.py)')
    ap.add_argument('--cikti', default='RISK-RAPORU.md')
    a = ap.parse_args()
    if a.cerez:
        R.EK.extend(['--cookies', a.cerez, '--sleep-requests', '1', '--sleep-interval', '2', '--max-sleep-interval', '5'])

    uyari, satir, tum = [], [], {}
    with tempfile.TemporaryDirectory() as gecici:
        for i, k in enumerate(a.kanallar):
            print('okunuyor', k, file=sys.stderr)
            vs = videolar(k, a.adet, a.altyazi, gecici)
            vs_m = []
            if i < len(a.metinler):
                dosyalar = sorted(glob.glob(os.path.join(a.metinler[i], '**', 'metin*.txt'), recursive=True))
                vs_m = [{'metin': open(d, encoding='utf-8-sig', errors='replace').read()} for d in dosyalar]
                if vs_m:
                    satir.append(f'_({k}: metin benzerligi {len(vs_m)} yerel metin.txt dosyasindan)_')
            satir += kanal_raporu(k, [{x: y for x, y in v.items() if x != 'metin'} for v in vs] if vs_m else vs, uyari)
            if vs_m:
                ws = [kelimeler(v['metin']) for v in vs_m]
                om, ox = ikili_ort([ngram(m, 6) for m in ws], jaccard)
                km, kx = ikili_ort(ws, kosinus)
                satir.append(f'- Yerel metin: 6li dizi ortakligi ort {om:.3f} / max {ox:.3f}; kosinus ort {km:.2f} / max {kx:.2f}')
                if ox >= 0.05:
                    uyari.append(f'{k}: yerel metinlerde 6li dizi ortakligi max %{ox*100:.0f}')
            tum[k] = (vs, vs_m)
            satir.append('')

    if len(tum) > 1:
        satir.append('## Kanallar arasi (kume riski)')
        for (k1, (v1, m1)), (k2, (v2, m2)) in itertools.combinations(tum.items(), 2):
            b1 = [kelimeler(v['baslik']) for v in v1]
            b2 = [kelimeler(v['baslik']) for v in v2]
            bj = statistics.mean(jaccard(x, y) for x in b1 for y in b2) if b1 and b2 else 0
            i1 = {iskelet(v['baslik']) for v in v1}
            i2 = {iskelet(v['baslik']) for v in v2}
            t1 = [kelimeler(v.get('metin', '')) for v in (m1 or v1) if v.get('metin')]
            t2 = [kelimeler(v.get('metin', '')) for v in (m2 or v2) if v.get('metin')]
            kos = statistics.mean(kosinus(x, y) for x in t1 for y in t2) if t1 and t2 else None
            ort6 = max((jaccard(ngram(x, 6), ngram(y, 6)) for x in t1 for y in t2), default=None)
            s = f'- {k1} ↔ {k2}: baslik Jaccard ort {bj:.2f}, ortak baslik iskeleti {len(i1 & i2)}'
            if kos is not None:
                s += f', metin kosinus ort {kos:.2f}, 6li dizi max {ort6:.3f}'
            satir.append(s)
            if len(i1 & i2) or bj >= 0.2 or (kos is not None and kos >= 0.8) or (ort6 or 0) >= 0.03:
                uyari.append(f'{k1} ↔ {k2}: iki kanal ayni sablondan cikmis gibi gorunuyor; ayni hesap/IP/cihazdan yonetiliyorsa '
                             'kume riski artar (dil, format, baslik iskeleti, metin dili, gorsel stil ayrilmali)')
        satir.append('')

    with open(a.cikti, 'w', encoding='utf-8-sig') as f:
        f.write('# Kanal risk raporu (kanal_risk.py)\n\n')
        f.write('Esikler sezgiseldir; YouTube esigi degildir. Kaynak ve yorum: references/demonetizasyon-riski.md\n\n')
        f.write('## Uyarilar\n')
        f.write('\n'.join(f'- [ ] {u}' for u in uyari) if uyari else '- Belirgin sablon sinyali yok.')
        f.write('\n\n' + '\n'.join(satir) + '\n')
    print(f'{len(uyari)} uyari -> {a.cikti}')


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
