#!/usr/bin/env python3
"""KANAL SABLONU — bir konsept (ve istege bagli rakip kanal linki) -> BIZE OZGU kanal sunus stili.
Rakibin edit dili olculur, her eksen YouTube'da gercekte kullanilanlara (kutuphane: youtube_dili.py) ve konuya (etiketler)
gore "cevrilir": rakip Montserrat -> biz Anton'lu set (nisteki basarili kanallarda dar kalin sans yaygin, konuya uygun, rakipten farkli).
Iskelet (tempo, kesim, gecis sikligi, SFX orani) rakipten/nisten korunur; yuzey bizimdir ve diger kanallarimizdan ayridir.

Kullanim (iki adim — kullanici secmeden kanal kimligi OLUSMAZ):
  1) py kanal_sablon.py --kanal <ad> --konsept "<kanalin konusu, hedef kitle, ornek video basliklari>" [--rakip <link|@Handle> ...] [--dil en]
     -> 3 edit stili secenegi (A/B/C): konuya uygun (uyum > -0.6), birbirinden belirgin farkli (her cift >= 6 gorunur eksen,
        palet sinifi ya da font ailesi farkli), her biri karakter adli; kare sayfasi + ~12 sn mp4 + SECENEKLER.jpg + SECENEKLER.md
  2) py kanal_sablon.py --kanal <ad> --sec B [--onizle] [--zorla]   -> secilen secenekten kanal-sablon.json + KANAL-SABLONU.md
Ciktilar (C:/otomasyon/<ad>/):
  kanal-sablon.json   kimlik (her videoda sabit) + degisken eksenler + iskelet + ceviri tablosu  -> stil_dna.py --sablon
  KANAL-SABLONU.md    insan okur: rakip -> biz ceviri tablosu ve gerekceler, kimlik karti, KAYNAK STRATEJISI (rakip AI mi gercek mi -> bizim kaynak plani)
Var olan sablona yalniz kaynak stratejisi: py kanal_sablon.py --kanal <ad> --kaynak-guncelle [--dil en]
  sablon/             SECENEKLER.md/.jpg, secenekler.json, secenek-A|B|C/ (stil-dna-X.json, ONIZLEME.jpg, onizleme.mp4),
                      aday/ (secim motoru: 6 aday, STIL-DNA.md), stil-dna.json (secilen kimlik; --sec yazar), onizleme kareleri (--sec --onizle)
Video basina: py stil_dna.py --sablon C:/otomasyon/<ad>/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/<ad>/vNN
Rakip kutuphanede yoksa kanal_isle.py ile en populer 3 videosu olculur (indirir, olcer, siler).
"""
import argparse, datetime, glob, json, os, re, shutil, subprocess, sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
KOK = os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
SABLON_PROJE = os.path.join(KOK, 'sablon-proje')
CHROME = r'C:\otomasyon\ranks\motion\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe'
# kanal kimligi: izleyicinin kanali tanidigi eksenler — her videoda ayni. Geri kalanlar videodan videoya degisir (>= %20 ozgunluk).
KIMLIK = ['palet', 'font', 'hareket', 'bitis', 'baslik', 'baslik2', 'altyazi', 'altbant', 'sayi', 'sayi2', 'hud', 'harita', 'grafik', 'grafik2']
DEGISKEN = ['arkaplan', 'gecis', 'kamera', 'cerceve', 'doku', 'alinti', 'liste', 'zaman', 'vurgu', 'kayma']


def handle_coz(x):
    import kanal_isle
    return kanal_isle.kanal_ad(x)


def rakip_hazirla(rakipler, kut):
    """link/@ -> kutuphanede olculmus @Handle; yoksa kanal_isle.py --adet 3 ile olcer"""
    out = []
    for x in rakipler:
        h = handle_coz(x)
        kd = os.path.join(kut, 'kanallar', h)
        olculmus = glob.glob(os.path.join(kd, 'video-*', 'editdili', 'edit-dili.json'))
        if len(olculmus) < 3:
            ne = 'kutuphanede yok' if not olculmus else f'kutuphanede {len(olculmus)} videoyla olculmus (profil icin yeterli, sablon icin degil)'
            print(f'{h}: {ne} -> en populer 3 video olculuyor (kanal_isle.py --adet 3; indir-olc-sil)...')
            r = subprocess.run([sys.executable, '-I', os.path.join(BURASI, 'kanal_isle.py'), x, '--kim', 'polat-claude', '--kok', kut, '--adet', '3']
                               + (['--zorla'] if olculmus else []), capture_output=True, text=True, encoding='utf-8', errors='replace')
            if olculmus:
                print(f'  UYARI {h}: yeni 2 video olculdu; kutuphane profili (EDIT-DILI.md) 1 videoya gore — sonraki kutuphane turunda guncelle')
            print('  ' + (r.stdout.strip().splitlines() or [''])[-1])
            if not glob.glob(os.path.join(kd, 'video-*', 'editdili', 'edit-dili.json')):
                sys.exit(f'HATA: {h} olculemedi: {(r.stderr or r.stdout)[-600:]}')
        out.append(h)
    return out


def en_cok(d, n=2):
    return [(k, v) for k, v in sorted((d or {}).items(), key=lambda t: -t[1]) if v > 0][:n]


def ceviri_tablosu(dna, rakipler, kut, yt, sd):
    """eksen basina: rakibin olculen kullanimi -> bizim secim + gerekce (YouTube kaniti, konu uyumu, rakipten fark)"""
    import youtube_dili as Y
    kat, _ = Y.font_katalog()
    oz = {}
    for h in rakipler:
        o = Y.kanal_ozellik(os.path.join(kut, 'kanallar', h), sd, kat)
        for e, d in o.items():
            if e == 'tempo':
                continue
            for k, v in d.items():
                oz.setdefault(e, {})[k] = oz.setdefault(e, {}).get(k, 0) + v / len(rakipler)
    # rakibin font adi (en sik ilk aday) — ceviride "rakip Montserrat" diyebilmek icin
    font_adi = {}
    for h in rakipler:
        for fa in glob.glob(os.path.join(kut, 'kanallar', h, 'video-*', 'editdili', 'font-aday.json')):
            try:
                for x in json.load(open(fa, encoding='utf-8')):
                    ad = sorted(x.get('adaylar') or [], key=lambda c: c.get('skor', 99))
                    if ad:
                        font_adi[ad[0]['font']] = font_adi.get(ad[0]['font'], 0) + 1
            except (ValueError, OSError, TypeError):
                pass
    setler = Y.font_setleri()
    satirlar = []

    def neden(eksen, oge):
        parca = []
        k = yt.kanit(eksen, oge) if yt else None
        if k is not None:
            parca.append(f"YouTube kaniti {k:.2f} ({yt.neden(eksen, oge)})")
        u = sd.ETK.uyum(eksen, oge) if sd.ETK.et else None
        if u is not None:
            parca.append(f"konu uyumu {u:.2f} ({sd.ETK.neden(eksen, oge)})")
        return '; '.join(parca)

    # font
    rf = ', '.join(f'{a} ({n})' for a, n in sorted(font_adi.items(), key=lambda t: -t[1])[:2]) or '-'
    bf = setler.get(dna['font'], '?')
    satirlar.append({'eksen': 'font', 'rakip': f"{rf} · aile: {', '.join(f'{k} %{v * 100:.0f}' for k, v in en_cok(oz.get('font')))}",
                     'biz': f"{dna['font']} (baslik {bf}, aile {yt.esle('font', dna['font']) if yt else '?'})", 'neden': neden('font', dna['font'])})
    # gecis
    satirlar.append({'eksen': 'gecis', 'rakip': ', '.join(f'{k} %{v * 100:.0f}' for k, v in en_cok(oz.get('gecis'), 3)),
                     'biz': ', '.join(x.split(':')[0] for x in dna['gecis']) + f" (yumusak oran {dna['iskelet']['yumusak_oran']} — iskelet rakipten)",
                     'neden': '; '.join(f"{x.split(':')[0]}: {neden('gecis', x.split(':')[0]) or 'olcum yok'}" for x in dna['gecis'][:3])})
    for e in ('kamera', 'cerceve'):
        satirlar.append({'eksen': e, 'rakip': ', '.join(f'{k} %{v * 100:.0f}' for k, v in en_cok(oz.get(e), 3)) or '-',
                         'biz': ', '.join(dna.get(e) or []), 'neden': '; '.join(f"{x}: {neden(e, x) or 'olcum yok'}" for x in (dna.get(e) or [])[:3])})
    satirlar.append({'eksen': 'altyazi', 'rakip': ', '.join(f'{k} %{v * 100:.0f}' for k, v in en_cok(oz.get('altyazi'))) or '-', 'biz': dna['altyazi'], 'neden': neden('altyazi', dna['altyazi'])})
    satirlar.append({'eksen': 'palet', 'rakip': ', '.join(f'{k} %{v * 100:.0f}' for k, v in en_cok(oz.get('palet'))) or '-',
                     'biz': f"{dna['palet']} ({sd.PALET_SINIF.get(dna['palet'], '?')})", 'neden': neden('palet', dna['palet'])})
    # ayirt edici yuzeyde rakiple ayni kalan oge: uyari (font adi, altyazi ailesi)
    en_f = max(font_adi.values()) if font_adi else 0
    rakip_f = {k.replace(' ', '') for k, n in font_adi.items() if n >= max(2, en_f * 0.5)}
    if bf.replace(' ', '') in rakip_f:
        satirlar[0]['neden'] = 'UYARI rakiple ayni baslik fontu! ' + satirlar[0]['neden']
    rk_alt = max(oz.get('altyazi') or {'-': 0}, key=(oz.get('altyazi') or {'-': 0}).get)
    if sd.ALTYAZI_AILE.get(dna['altyazi']) == rk_alt and rk_alt != 'yok':
        satirlar.append({'eksen': 'UYARI', 'rakip': f'altyazi ailesi {rk_alt}', 'biz': dna['altyazi'], 'neden': 'rakiple ayni altyazi ailesi (ayirt edici yuzey)'})
    for e in ('baslik', 'altbant', 'sayi', 'bitis', 'hud', 'harita', 'grafik'):
        if dna.get(e):
            satirlar.append({'eksen': e, 'rakip': '(olculmez; EDIT-DILI.md gozlemi)', 'biz': dna[e] + (f" + {dna['baslik2']}" if e == 'baslik' and dna.get('baslik2') else ''), 'neden': neden(e, dna[e])})
    return satirlar


# ------------------------------------------------------------------ kaynak stratejisi
# rakibin goruntusu nereden: AI mi, gercek arsiv/foto mu, stok mu? olcum (ritim/analiz.json kaynak_tahmini, edit-dili renk)
# + gozlem metni (EDIT-DILI.md, aciklama, secim.json kaynak_ipuclari) -> bizim kaynak plani (references/rakip-kaynak-analizi.md, kaynak-avi.md)
KAYNAK_IPUCU = {
    'ai': r'\bAI[- ](?:gerçekçi|gercekci|görsel|gorsel|görünümlü|gorunumlu|generated|üretim|uretim|image|art|realistic)|ai-gorsel|yapay zek|midjourney|nano banana|dall-?e|stable diffusion|altered or synthetic|sentetik',
    'ai_video': r'AI[- ]video|ai-video|\bsora\b|\bveo\b|runway|\bkling\b',
    'arsiv': r'arşiv|arsiv|archive|archiv\b|national archives|library of congress|courtesy|siyah-beyaz|black and white|gercek-arsiv|newsreel',
    'stok': r'\bstok\b|\bstock\b|pexels|storyblocks|envato|shutterstock|getty|pond5|artgrid|magnific|freepik|pixabay',
}
AI_ETIKET = {'en': 'ILLUSTRATION', 'de': 'SYMBOLBILD', 'tr': 'TEMSİLÎ', 'fr': 'ILLUSTRATION', 'ja': 'イメージ'}


def _oku_metin(yol):
    try:
        return open(yol, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''


def rakip_kaynak_olc(kd):
    """bir kutuphane kanal klasoru -> {'grs','vid','krt' (% sure), 'sb' (siyah-beyaz orani), 'ipucu': {tur: sayi}, 'video': n, 'kanit': [...]}"""
    grs = vid = krt = 0.0
    sb, n, kanit = [], 0, []
    for vd in sorted(glob.glob(os.path.join(kd, 'video-*'))):
        try:
            an = json.load(open(os.path.join(vd, 'ritim', 'analiz.json'), encoding='utf-8'))
        except (OSError, ValueError):
            continue
        sn = {'duragan-gorsel': 0.0, 'hareketli-video': 0.0, 'grafik/kart': 0.0}
        for c in an.get('cekimler') or []:
            t = c.get('kaynak_tahmini')
            if t == 'hareketli-video' and c.get('sure', 0) < 1.0:
                t = 'duragan-gorsel'        # <1 sn "video" cogu zaman cozunme/gecis artigi (EDIT-DILI.md §6)
            if t in sn:
                sn[t] += c.get('sure', 0)
        top = sum(sn.values()) or 1
        grs += sn['duragan-gorsel'] * 100 / top
        vid += sn['hareketli-video'] * 100 / top
        krt += sn['grafik/kart'] * 100 / top
        n += 1
        try:
            ed = json.load(open(os.path.join(vd, 'editdili', 'edit-dili.json'), encoding='utf-8'))
            if (ed.get('renk') or {}).get('siyah_beyaz_orani') is not None:
                sb.append(ed['renk']['siyah_beyaz_orani'])
        except (OSError, ValueError):
            pass
    if not n:
        return None
    metin = _oku_metin(os.path.join(kd, 'EDIT-DILI.md'))
    acik = ' '.join(_oku_metin(p) for p in glob.glob(os.path.join(kd, 'aciklama-*.txt')))
    try:
        ipucu_liste = ' '.join(' '.join(x.get('kaynak_ipuclari') or []) for x in json.load(open(os.path.join(kd, 'secim.json'), encoding='utf-8')))
    except (OSError, ValueError, AttributeError):
        ipucu_liste = ''
    ipucu = {}
    for tur, rx in KAYNAK_IPUCU.items():
        say = len(re.findall(rx, metin, re.I)) + 2 * len(re.findall(rx, acik + ' ' + ipucu_liste, re.I))   # aciklama = kanalin kendi beyani
        ipucu[tur] = say
        if say:
            m = re.search(r'[^\n]{0,70}(?:' + rx + r')[^\n]{0,50}', metin + '\n' + acik, re.I)
            if m:
                kanit.append(f"{tur}: \"…{m.group(0).strip()[:120]}…\"")
    return {'grs': grs / n, 'vid': vid / n, 'krt': krt / n, 'sb': round(sum(sb) / len(sb), 2) if sb else None, 'ipucu': ipucu, 'video': n, 'kanit': kanit}


def kaynak_tahmin(o):
    """olcum + ipucu -> tur paylari (% sure) + guven. Ayrim (AI / gercek / stok) gozleme dayanir: 'olasilikla'."""
    sb = o['sb'] if o['sb'] is not None else 0.0
    ip = o['ipucu']
    ai, ar, st = ip.get('ai', 0) > 0, ip.get('arsiv', 0) > 0, ip.get('stok', 0) > 0
    guven = 'orta'
    if ai and ar:
        gercek_pay = min(0.8, max(0.2, 0.25 + 0.6 * sb))      # siyah-beyaz kare payi arsiv fotografinin izidir
    elif ai:
        gercek_pay = min(0.3, sb * 0.5)
    elif ar or st:
        gercek_pay = min(0.95, max(0.6, 0.5 + 0.5 * sb))
    else:
        gercek_pay, guven = 0.5, 'dusuk (gozlem yok: kareye bak, ters gorsel arama — rakip-kaynak-analizi.md §1-2)'
    grs, vid = o['grs'], o['vid']
    t = {'ai_gorsel': grs * (1 - gercek_pay), 'gercek_gorsel': grs * gercek_pay, 'kart': o['krt'],
         'ai_video': vid if ip.get('ai_video') else 0.0}
    kalan = vid - t['ai_video']
    if st and not ar:
        t['stok_video'], t['gercek_video'] = kalan, 0.0
    elif ar and not st:
        t['stok_video'], t['gercek_video'] = 0.0, kalan
    else:
        t['stok_video'] = t['gercek_video'] = kalan / 2
    return {k: round(v, 1) for k, v in t.items()}, guven


def kaynak_stratejisi(rakipler, kut, iskelet=None, dil='en'):
    olc = {}
    for h in rakipler:
        o = rakip_kaynak_olc(os.path.join(kut, 'kanallar', h))
        if o:
            olc[h] = o
    if not olc:
        return None
    tah = {}
    for h, o in olc.items():
        t, g = kaynak_tahmin(o)
        # kareye bakilarak yazilmis gozlem (kutuphane kanal klasoru kaynak-gozlem.json: {"pay": {tur: %}, "not": "..."}) olcumun ustune yazar.
        # Neden: kare_analiz siyah zeminde inset / siyah-beyaz grade'li gercek videoyu 'grafik/kart' sayabiliyor (@spacex_unpacked: %90 kart, gercekte ~%45 video)
        try:
            gz = json.load(open(os.path.join(kut, 'kanallar', h, 'kaynak-gozlem.json'), encoding='utf-8'))
            t = {k: float(gz['pay'].get(k, 0.0)) for k in t}
            g = 'gozlem: kareye bakildi (kaynak-gozlem.json)' + (f" — {gz['not']}" if gz.get('not') else '')
        except (OSError, ValueError, KeyError, AttributeError):
            if (o['sb'] or 0) >= 0.8 and o['krt'] >= 60:
                g = (f"dusuk: siyah-beyaz oran {o['sb']} + kart %{o['krt']:.0f} — gri tonlu gercek video kart sayiliyor olabilir; "
                     "kareye bak, kutuphanedeki kanal klasorune kaynak-gozlem.json yaz, --kaynak-guncelle")
                print(f'  UYARI {h}: {g}')
        tah[h] = {'pay': t, 'guven': g, 'sb': o['sb'], 'olcum': {'duragan': round(o['grs'], 1), 'video': round(o['vid'], 1), 'kart': round(o['krt'], 1)},
                  'ipucu': o['ipucu'], 'kanit': o['kanit'][:6], 'video': o['video']}
    turler = ['ai_gorsel', 'gercek_gorsel', 'kart', 'ai_video', 'stok_video', 'gercek_video']
    ort = {k: round(sum(t['pay'][k] for t in tah.values()) / len(tah), 1) for k in turler}
    ai = ort['ai_gorsel'] + ort['ai_video']
    gercek = ort['gercek_gorsel'] + ort['gercek_video'] + ort['stok_video']
    baskin = 'gercek' if gercek >= ai * 1.25 else 'ai' if ai >= gercek * 1.25 else 'karma'
    # bizim oran: rakibin karisimi korunur (izleyici o dokuya alisik). Gercek olay anlatan kanalda AI payi rakibinkini GECMEZ;
    # durgun pay video ile kirilir (kamera hic durmaz kuralina ek: her ~6 cekimde 1 hareketli kaynak hedefi, rakipte video yoksa en az %5)
    hedef = dict(ort)
    if hedef['gercek_video'] + hedef['stok_video'] + hedef['ai_video'] < 5:
        ek = 5 - (hedef['gercek_video'] + hedef['stok_video'] + hedef['ai_video'])
        hedef['gercek_video'] = round(hedef['gercek_video'] + ek, 1)
        buyuk = 'gercek_gorsel' if hedef['gercek_gorsel'] >= hedef['ai_gorsel'] else 'ai_gorsel'
        hedef[buyuk] = round(hedef[buyuk] - ek, 1)
    medyan = (iskelet or {}).get('genel_medyan_sn') or 5.5
    cekim_10dk = 600 / max(1.5, float(medyan))
    adet = {k: int(round(cekim_10dk * v / 100)) for k, v in hedef.items()}
    etiket = AI_ETIKET.get(dil, AI_ETIKET['en'])
    sahne = [
        {'sahne': 'gercek kisi, belge, kayit, olayin kendisi (tarih, savas, kaza, kesif)', 'kaynak': 'gercek arsiv fotografi / belge taramasi',
         'arac': 'stok_ara.py ara "<olay/kisi/yer> archive photo" (Commons + Openverse: PD/CC0/CC BY/CC BY-SA); kurum sayfasi icin stok_ara.py sayfa <url>', 'oncelik': 1},
        {'sahne': 'yer, bina, nesne, muze esyasi (bugunku hali)', 'kaynak': 'lisansli gercek fotograf (CC BY / CC BY-SA, atifla)',
         'arac': 'stok_ara.py ara "<yer/nesne>"', 'oncelik': 2},
        {'sahne': 'hareketli an (yuruyen birlik, ucak, deniz, sehir)', 'kaynak': 'CC BY YouTube klibi / Commons PD film / lisansli stok video',
         'arac': 'youtube_kaynak.py ara "<konu> archive footage" ; stok_ara.py ara "<konu>" --tur video', 'oncelik': 3},
        {'sahne': 'belgelenmemis an (kazi, bulunus, gece, ic mekan), fotografi olmayan sahne', 'kaynak': f'AI gorsel (Flow Nano Banana Pro) + kosede "{etiket}" etiketi',
         'arac': 'gorsel-ve-kapak.md Flow hatti; istem: donem dogru, yuz yok/uzak, yazi/logo yok', 'oncelik': 4 if baskin != 'ai' else 1},
        {'sahne': 'isim, tarih, sayi, harita, kronoloji', 'kaynak': 'Remotion kart (repertuar; stil-dna)', 'arac': 'sahne_kur.py kart', 'oncelik': 2},
    ]
    if baskin == 'ai':
        sahne[0]['not'] = 'rakip AI agirlikli; gercek arsiv yalniz kanit gereken anlarda (kisi, belge) — AI gercek kisiyi gercek olayda gostermez'
    kural = [
        f'Oran: rakibin karisimi korunur (±10 puan); ilk 30 sn ve ilk %30 ayni oranla. AI payi rakibinkini gecmez ({ai:.0f}%).',
        f'AI gorsel gercek fotograf/belge gibi sunulmaz: her AI karede kosede "{etiket}" etiketi; YouTube Studio "degistirilmis/sentetik icerik" beyani EVET (gercekci AI, gercek olay).',
        'AI gercek kisiyi gercek bir olayda gostermez; gercek kisi yalniz gercek fotografiyla (PD/CC) ya da hic.',
        'Lisans: yalniz PD, CC0, CC BY, CC BY-SA (NC/ND yok); her dosya credits.json/KAYNAKCA.tsv\'de; aciklamaya ATIF.txt (stok_ara.py atif). Rakibin videosu/karesi asla.',
        'Gorsel kurali: yakin, taninabilir yuz (ozellikle sivil, cocuk) secilmez — uzak/arkadan/kalabalik; kaynakta yazi/logo/filigran olan kare kirpilmaz, secilmez (kurgu_denetim kaynak_yazi olcer).',
        'Ayni gorsel/klip iki videoda kullanilmaz (credits.json kanallar arasi hafiza).',
    ]
    return {'rakip': tah, 'ortalama': ort, 'baskin': baskin, 'hedef': hedef, 'adet_10dk': adet, 'cekim_10dk': round(cekim_10dk),
            'sahne': sahne, 'kural': kural, 'ai_etiket': etiket,
            'akis': 'kaynak stratejisi -> kaynak avi: stok_ara.py ara/sayfa -> kontakt -> sec (credits.json) + youtube_kaynak.py (KAYNAKCA.tsv) -> '
                    'Flow (AI pay) -> kurgu.json src/tag -> stok_ara.py atif -> aciklama (references/kaynak-avi.md)'}


def kaynak_md(k):
    ad = {'ai_gorsel': 'AI gorsel', 'gercek_gorsel': 'gercek foto/arsiv', 'kart': 'kart/grafik', 'ai_video': 'AI video', 'stok_video': 'stok video', 'gercek_video': 'gercek/arsiv video'}
    L = ['## Kaynak stratejisi (gorsel kaynak: rakip ne kullaniyor -> biz ne kullanacagiz)', '',
         'Olcum: ritim/analiz.json kaynak_tahmini (<1 sn "video" gecis artigi sayilmaz) + edit-dili siyah-beyaz orani; AI / gercek / stok ayrimi '
         'EDIT-DILI.md + aciklama gozlemine dayanir ("olasilikla"). Supheliyse kareye bak (rakip-kaynak-analizi.md).', '',
         '| rakip | olcum duragan/video/kart % | s-b orani | ' + ' | '.join(ad.values()) + ' | guven |', '|---|---|---|' + '---|' * len(ad) + '---|']
    for h, t in k['rakip'].items():
        o = t['olcum']
        L.append(f"| {h} ({t['video']} video) | {o['duragan']} / {o['video']} / {o['kart']} | {t['sb'] if t['sb'] is not None else '-'} | "
                 + ' | '.join(f"{t['pay'][x]:.0f}" for x in ad) + f" | {t['guven']} |")
    L.append('| **biz (hedef)** | | | ' + ' | '.join(f"**{k['hedef'][x]:.0f}**" for x in ad) + ' | |')
    L += ['', f"Baskin: **{k['baskin']}**. 10 dk video ≈ {k['cekim_10dk']} cekim -> " + ', '.join(f"{ad[x]} {n}" for x, n in k['adet_10dk'].items() if n) + '.', '']
    kan = [f"- {h}: {x}" for h, t in k['rakip'].items() for x in t['kanit']]
    if kan:
        L += ['Kanit (gozlem metni):'] + kan + ['']
    L += ['| sahne turu | kaynak | arac |', '|---|---|---|']
    L += [f"| {s['sahne']} | {s['kaynak']}{' (' + s['not'] + ')' if s.get('not') else ''} | {s['arac']} |" for s in sorted(k['sahne'], key=lambda s: s['oncelik'])]
    L += ['', 'Kurallar:'] + [f'- {x}' for x in k['kural']] + ['', f"Akis: {k['akis']}", '']
    return L


ONIZLEME_METIN = {
    'en': {'bolum': 'Chapter 1', 'baslik2': 'What Really Happened', 'yer': 'Location', 'tarih': 'Date', 'sayiUst': 'Key figure', 'sayiAlt': 'the number behind the story',
           'alinti': 'It was never supposed to happen.', 'kim': 'Eyewitness', 'listeBaslik': 'Three reasons',
           'liste': ['The first warning', 'The second mistake', 'The final decision'], 'altyazi': 'Nobody expected this to change everything'},
    'de': {'bolum': 'Kapitel 1', 'baslik2': 'Was wirklich geschah', 'yer': 'Ort', 'tarih': 'Datum', 'sayiUst': 'Schlüsselzahl', 'sayiAlt': 'die Zahl hinter der Geschichte',
           'alinti': 'Das hätte nie passieren dürfen.', 'kim': 'Augenzeuge', 'listeBaslik': 'Drei Gründe',
           'liste': ['Die erste Warnung', 'Der zweite Fehler', 'Die letzte Entscheidung'], 'altyazi': 'Niemand hat erwartet dass sich alles ändert',
           'bolum2': 'Teil 2', 'grafikBaslik': 'Verlauf', 'zaman': [{'yil': '1939', 'yazi': 'Beginn'}, {'yil': '1942', 'yazi': 'Wendepunkt'}, {'yil': '1945', 'yazi': 'Ende'}]},
    'tr': {'bolum': 'Bölüm 1', 'baslik2': 'Gerçekte Ne Oldu', 'yer': 'Yer', 'tarih': 'Tarih', 'sayiUst': 'Kilit sayı', 'sayiAlt': 'hikâyenin arkasındaki sayı',
           'alinti': 'Bunun olmaması gerekiyordu.', 'kim': 'Görgü tanığı', 'listeBaslik': 'Üç neden',
           'liste': ['İlk uyarı', 'İkinci hata', 'Son karar'], 'altyazi': 'Kimse her şeyin değişeceğini beklemiyordu',
           'bolum2': 'Bölüm 2', 'grafikBaslik': 'Eğilim', 'zaman': [{'yil': '1939', 'yazi': 'Başlangıç'}, {'yil': '1942', 'yazi': 'Dönüm noktası'}, {'yil': '1945', 'yazi': 'Son'}]},
    'fr': {'bolum': 'Chapitre 1', 'baslik2': "Ce qui s'est vraiment passé", 'yer': 'Lieu', 'tarih': 'Date', 'sayiUst': 'Chiffre clé', 'sayiAlt': "le chiffre derrière l'histoire",
           'alinti': "Ça n'aurait jamais dû arriver.", 'kim': 'Témoin', 'listeBaslik': 'Trois raisons',
           'liste': ['Le premier signal', 'La deuxième erreur', 'La décision finale'], 'altyazi': "Personne ne s'attendait à ce que tout change",
           'bolum2': 'Partie 2', 'grafikBaslik': 'Tendance', 'zaman': [{'yil': '1939', 'yazi': 'Début'}, {'yil': '1942', 'yazi': 'Tournant'}, {'yil': '1945', 'yazi': 'Fin'}]},
}


def onizle(dna, hedef, konsept='', foto=None, dil='en', video=False, ornek=None):
    """Onizleme kompozisyonu: kimligin tum eksenleri (11 esit sahne); kareler sahne oturdugu anda (Onizleme.tsx ONIZLEME_S/OTURMA).
    video=True: ilk ~12 sn (7 sahne: baslik, medya+alt bant, sayi, altyazi, alinti, HUD, baslik2) yarim cozunurluk mp4"""
    for eski in glob.glob(os.path.join(hedef, 'onizleme-*.jpg')) + glob.glob(os.path.join(hedef, 'ONIZLEME.jpg')) + glob.glob(os.path.join(hedef, 'onizleme.mp4')):
        os.remove(eski)
    if not os.path.exists(CHROME):
        print('UYARI onizleme atlandi: chrome-headless-shell yok')
        return []
    # ornek baslik: tirnak icindeki ifade; acilis tirnagindan once bosluk/bas (Tesla's kesme isareti acilis sayilmaz)
    m = re.search(r"(?:(?<=\s)|^)[\"“‘']([^\"”]{8,90}?)[\"”’'](?=[\s,.;:)]|$)", konsept or '')
    baslik = m.group(1) if m else ' '.join((konsept or 'The Story Nobody Told').split()[:6]).strip(' .,:;')
    pj = os.path.join(hedef, 'onizleme-props.json')
    # --ornek: konunun kendi ornek icerigi (baslik, sayi, zaman adimlari...) dil varsayilanlarinin ve konsept basliginin ustune yazar
    metin = {**ONIZLEME_METIN.get(dil, ONIZLEME_METIN['en']), 'baslik': baslik, **(ornek or {})}
    # gorseller: --foto (sablon-proje/public altina goreli ya da mutlak yol -> public/sablon-onizleme/ altina kopya); yoksa notr ornek
    fotolar = ['ornek/a.jpg', 'ornek/b.jpg', 'ornek/c.jpg']
    if foto:
        hedef_pub = os.path.join(SABLON_PROJE, 'public', 'sablon-onizleme')
        os.makedirs(hedef_pub, exist_ok=True)
        fotolar = []
        for i, f in enumerate(foto[:3]):
            kaynak = f if os.path.isabs(f) else os.path.join(SABLON_PROJE, 'public', f)
            if os.path.isfile(kaynak):
                ad = f'f{i}{os.path.splitext(kaynak)[1].lower()}'
                shutil.copy(kaynak, os.path.join(hedef_pub, ad))
                fotolar.append(f'sablon-onizleme/{ad}')
        fotolar = (fotolar + ['ornek/a.jpg', 'ornek/b.jpg', 'ornek/c.jpg'])[:3]
    json.dump({'dna': dna, 'foto': fotolar, 'presetler': [], 'metin': metin}, open(pj, 'w', encoding='utf-8'), ensure_ascii=False)
    S, OTUR, n = 60, 40, 11
    d = int((dna.get('iskelet') or {}).get('gecis_kare') or 8)
    kareler = [i * (S - d) + OTUR for i in range(n)]
    cikti = []
    for i, f in enumerate(kareler):
        out = os.path.join(hedef, f'onizleme-{i + 1:02d}.jpg')
        r = subprocess.run(['node', os.path.join('node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'still', 'src/index.ts', 'Onizleme', out, f'--props={pj}',
                            f'--frame={f}', '--scale=0.5', f'--browser-executable={CHROME}', '--log=error'], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=SABLON_PROJE)
        if os.path.exists(out):
            cikti.append(out)
        elif r.returncode:
            print('UYARI onizleme karesi', f, (r.stderr or '')[-300:])
            break
    if len(cikti) >= 2:
        sayfa = os.path.join(hedef, 'ONIZLEME.jpg')
        kol = 4
        girdi = sum((['-i', c] for c in cikti), [])
        yer = '|'.join(f'{(i % kol) * 960}_{(i // kol) * 540}' for i in range(len(cikti)))
        subprocess.run(['ffmpeg', '-v', 'error', '-y'] + girdi + ['-filter_complex', f'xstack=inputs={len(cikti)}:layout={yer}:fill=black', sayfa])
        if os.path.exists(sayfa):
            cikti.append(sayfa)
    if video:
        mp4 = os.path.join(hedef, 'onizleme.mp4')
        r = subprocess.run(['node', os.path.join('node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', 'src/index.ts', 'Onizleme', mp4, f'--props={pj}',
                            f'--frames=0-{ONIZLEME_VIDEO_KARE - 1}', '--scale=0.5', '--codec=h264', '--crf=26', f'--browser-executable={CHROME}', '--log=error'],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=SABLON_PROJE)
        if os.path.exists(mp4):
            cikti.append(mp4)
        else:
            print('UYARI onizleme mp4 uretilemedi:', (r.stderr or r.stdout or '')[-300:])
    return cikti


# ------------------------------------------------------------------ 3 edit stili secenegi (GOREVLER #0c)
ONIZLEME_VIDEO_KARE = 360          # 12 sn @30 fps
SECENEK_UYUM_ALT = -0.6            # her secenek konuya uygun olmali
SECENEK_FARK_ALT = 6               # her cift en az bu kadar gorunur eksende farkli
SECENEK_YENIDEN = 3                # yeterli fark yoksa stil_dna en cok bu kadar kez yeni tohumla yeniden
# izleyicinin ilk bakista gordugu yuzey (liste eksenlerinde ortak oge yoksa "farkli")
FARK_EKSEN = ['palet', 'font', 'baslik', 'altbant', 'sayi', 'arkaplan', 'cerceve', 'bitis', 'altyazi', 'alinti', 'liste', 'zaman', 'harita', 'grafik', 'hud', 'hareket']
# karakter adi: secenegin ogelerinde (etiketler.json his) en ayirt edici his -> ad
HIS_AD = {'arsiv': 'Arşiv belgeseli', 'belgesel': 'Klasik belgesel', 'sinematik': 'Sinematik gerilim', 'modern': 'Modern veri', 'resmi': 'Resmî dosya',
          'temiz': 'Sade editoryal', 'teknik': 'Teknik rapor', 'dinamik': 'Dinamik haber', 'karanlik': 'Karanlık soruşturma', 'retro': 'Retro film',
          'sicak': 'Sıcak anlatı', 'yumusak': 'Yumuşak anlatı', 'neon': 'Neon gece', 'oyunbaz': 'Oyunbaz poster', 'klasik': 'Klasik tarih'}


def _fset(v):
    return {(':'.join(x.split(':')[:2]) if ':' in x else x) for x in (v if isinstance(v, list) else [v]) if isinstance(x, str)}


def gorunur_fark(a, b):
    """iki DNA'nin farkli gorunur eksenleri (ortak oge yoksa farkli; birinde olup digerinde olmayan eksen de farkli)"""
    return [e for e in FARK_EKSEN if (a.get(e) is not None or b.get(e) is not None) and not (_fset(a.get(e)) & _fset(b.get(e)))]


def font_ailesi(font):
    import youtube_dili as Y
    if not hasattr(font_ailesi, 'k'):
        font_ailesi.k = (Y.font_setleri(), Y.font_katalog()[1])
    s, k = font_ailesi.k
    return Y.font_aile(k.get(s.get(font, ''))) or '?'


def palet_renk():
    """temel.ts PALETLER -> {ad: (zemin hex, vurgu hex)}"""
    if not hasattr(palet_renk, 'd'):
        t = open(os.path.join(KOK, 'repertuar', 'temel.ts'), encoding='utf-8').read()
        palet_renk.d = {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(r"'([a-z-]+)':\s*\{\s*ad: '[a-z-]+',\s*zemin: '(#[0-9a-fA-F]{6})'.*?vurgu: '(#[0-9a-fA-F]{6})'", t)}
    return palet_renk.d


def _lab(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c]
    X = (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.9505
    Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    Z = (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.089
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))


def palet_gorsel_fark(p1, p2):
    """iki paletin gozle farki: zemin ya da vurgu renginde CIE76 dE >= 25 (orman-altin ile zeytin-askeri ikisi de 'koyu yesil + altin': ayni gorunur)"""
    r = palet_renk()
    if p1 == p2:
        return False
    if p1 not in r or p2 not in r:
        return True
    de = lambda x, y: sum((u - v) ** 2 for u, v in zip(_lab(x), _lab(y))) ** 0.5
    return de(r[p1][0], r[p2][0]) >= 25 or de(r[p1][1], r[p2][1]) >= 25


def cift_kontrol(a, b, sd):
    f = gorunur_fark(a, b)
    ps = sd.PALET_SINIF.get(a['palet']) != sd.PALET_SINIF.get(b['palet'])
    fa = font_ailesi(a['font']) != font_ailesi(b['font'])
    pg = palet_gorsel_fark(a['palet'], b['palet'])
    return {'fark': f, 'palet_sinif': ps, 'font_aile': fa, 'palet_gorsel': pg, 'tamam': len(f) >= SECENEK_FARK_ALT and (ps or fa) and pg}


def uclu_sec(havuz, sd):
    """havuz: [(uyum, dna)] -> (en iyi 3 index (uyum sirali), gecerli mi, eksikler). Gecerli: hepsi uyum > alt sinir, her cift kontrolden gecer."""
    import itertools
    en, onb = None, {}

    def ck(i, j):
        if (i, j) not in onb:
            onb[(i, j)] = cift_kontrol(havuz[i][1], havuz[j][1], sd)
        return onb[(i, j)]
    for u in itertools.combinations(range(len(havuz)), 3):
        cift = [ck(i, j) for i, j in itertools.combinations(u, 2)]
        uy = [havuz[i][0] for i in u]
        eksik = [f'{chr(65 + k)} uyum {x:+.2f}' for k, x in enumerate(uy) if x <= SECENEK_UYUM_ALT] + [f"cift {len(c['fark'])} eksen farkli" for c in cift if len(c['fark']) < SECENEK_FARK_ALT] \
            + ['cift ayni palet sinifi ve font ailesi' for c in cift if not (c['palet_sinif'] or c['font_aile'])]             + ['cift paletleri gozle ayni (zemin ve vurgu dE < 25)' for c in cift if not c['palet_gorsel']]
        puan = 10 * sum(uy) + sum(min(len(c['fark']), 12) for c in cift) + 3 * len({sd.PALET_SINIF.get(havuz[i][1]['palet']) for i in u}) \
            + 3 * len({font_ailesi(havuz[i][1]['font']) for i in u}) - 25 * len(eksik)
        if en is None or puan > en[0]:
            en = (puan, sorted(u, key=lambda i: -havuz[i][0]), eksik)
    return en[1], not en[2], en[2]


def varyantlar(havuz, sd, kanal, kanallar, rk):
    """yeniden denemeler yetmezse: en uygun adaylarin palet ya da font ekseni, IZINLI baska sinif/aileyle degistirilir
    (ton kapisi + diger kanallarda olmayan + rakibin fontu degil — stil_dna --kimlik-uret ile ayni kesin kurallar)"""
    import youtube_dili as Y
    tum = sd.secilmis_dnalar(sd.kanallar_koku(kanallar))
    diger = [v[-1][2] for k, v in tum.items() if k != kanal and v]
    yasak_f = {d.get('font') for d in diger} | set((rk.get('yuzey') or {}).get('font_yasak') or [])
    yasak_p = {d.get('palet') for d in diger} | {sd.KLASIK['palet']}
    fontlar = [f for f in Y.font_setleri() if f not in yasak_f and sd.ETK.bul('font', f) and sd.ETK.kapi('font', f)]
    paletler = [p for p in sd.PALET_SINIF if p not in yasak_p and sd.ETK.bul('palet', p) and sd.ETK.kapi('palet', p)]
    gorulen = {json.dumps(d, sort_keys=True) for _, d, _ in havuz}
    yeni = []
    for u, d, _ in sorted(havuz, key=lambda t: -t[0])[:6]:
        # font: her baska aileden en uygunu; palet: gozle farkli her paletten (sinif anahtari = palet adi) en uygun 3'u
        for eksen, liste, sinif in (('font', fontlar, font_ailesi), ('palet', [x for x in paletler if palet_gorsel_fark(x, d['palet'])], lambda x: x)):
            en = {}
            for x in liste:
                if sinif(x) == sinif(d[eksen]):
                    continue
                v = dict(d, **{eksen: x})
                pu = sd.uyum_puani(v)
                if sinif(x) not in en or pu > en[sinif(x)][0]:
                    en[sinif(x)] = (pu, v, f'{eksen} {d[eksen]} -> {x} (cesitlendirme)')
            for t in sorted(en.values(), key=lambda t: -t[0])[:3]:
                if json.dumps(t[1], sort_keys=True) not in gorulen:
                    gorulen.add(json.dumps(t[1], sort_keys=True))
                    yeni.append(t)
    return yeni


def secenek_his(dna, sd):
    say = {}
    for e in FARK_EKSEN + ['gecis', 'doku', 'baslik2', 'sayi2', 'grafik2']:
        ek = e[:-1] if e.endswith('2') else e
        for x in _fset(dna.get(e)):
            et = sd.ETK.bul(ek, x.split(':')[0]) or {}
            for h in et.get('his') or []:
                say[h] = say.get(h, 0) + 1
    return say


def karakter_adlari(dnalar, sd):
    """her secenege ayirt edici his -> ad (adlar farkli). Ayirt edicilik: bu secenekteki pay - digerlerinin ortalama payi"""
    hs = [secenek_his(d, sd) for d in dnalar]
    pay = [{h: n / max(1, sum(x.values())) for h, n in x.items()} for x in hs]
    aday = []
    for i, p in enumerate(pay):
        for h, v in p.items():
            if h in HIS_AD:
                digr = [pay[j].get(h, 0) for j in range(len(pay)) if j != i]
                aday.append((v - sum(digr) / max(1, len(digr)) + 0.25 * v, i, h))
    ad, kullan = {}, set()
    for _, i, h in sorted(aday, reverse=True):
        if i not in ad and h not in kullan:
            ad[i] = h
            kullan.add(h)
    out = []
    for i, x in enumerate(hs):
        h = ad.get(i) or next((k for k in HIS_AD if k not in kullan), 'klasik')
        kullan.add(h)
        out.append({'ad': HIS_AD.get(h, h), 'his': [k for k, _ in sorted(x.items(), key=lambda t: -t[1])[:4]], 'ana_his': h})
    return out


def secenek_sayfasi(secenekler, yol):
    """uc secenegin ONIZLEME.jpg sayfasi alt alta, A/B/C etiket bandiyla -> SECENEKLER.jpg"""
    from PIL import Image, ImageDraw, ImageFont
    G, BANT = 1920, 96
    parca = []
    for s in secenekler:
        p = os.path.join(s['klasor'], 'ONIZLEME.jpg')
        if not os.path.isfile(p):
            continue
        im = Image.open(p).convert('RGB')
        im = im.resize((G, round(im.height * G / im.width)))
        parca.append((s, im))
    if not parca:
        return None
    try:
        f1, f2 = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 54), ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 30)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    H = sum(BANT + im.height for _, im in parca)
    out = Image.new('RGB', (G, H), (14, 14, 16))
    y = 0
    for s, im in parca:
        d = ImageDraw.Draw(out)
        d.rectangle([0, y, G, y + BANT], fill=(28, 28, 32))
        d.text((24, y + 14), f"{s['harf']}  {s['ad']}", font=f1, fill=(255, 214, 90))
        alt = f"uyum {s['uyum']:+.2f} · palet {s['dna']['palet']} · font {s['dna']['font']} · başlık {s['dna'].get('baslik')} · altyazı {s['dna'].get('altyazi')}"
        d.text((G - 24 - d.textlength(alt, font=f2), y + 36), alt, font=f2, fill=(200, 200, 205))
        out.paste(im, (0, y + BANT))
        y += BANT + im.height
    out.save(yol, quality=88)
    return yol


def secenek_md(yol, v, sd):
    S = v['secenek']
    harf = [s['harf'] for s in S]
    L = [f"# Edit stili seçenekleri — {v['kanal']}", '', f"**Konsept:** {v['konsept']}", '',
         f"Ton **{v['ton']}** · rakip/niş: {', '.join(v['rakip']) or '-'} ({v['rakip_kaynak']}) · üretim {v['olusturma']} · aday havuzu {v['havuz']} DNA ({v['tur']} stil_dna turu)", '',
         'Üç seçenek konuya uygun (uyum > −0,6) ve birbirinden belirgin farklı (her çift ≥ 6 görünür eksen, palet sınıfı ya da font ailesi farklı, paletler gözle farklı: zemin ya da vurgu ΔE ≥ 25). '
         'İskelet (tempo, kesim, geçiş oranı, SFX oranı) üçünde de rakipten/nişten korunur; yalnız yüzey değişir.', '',
         '![seçenekler](SECENEKLER.jpg)', '', f"Üç sayfa bir arada: `{v['sayfa']}`", '',
         '| | ' + ' | '.join(f"**{s['harf']} — {s['ad']}**" for s in S) + ' |', '|---|' + '---|' * len(S),
         '| his (etiket) | ' + ' | '.join(', '.join(s['his']) for s in S) + ' |',
         '| uyum puanı | ' + ' | '.join(f"{s['uyum']:+.2f}" for s in S) + ' |',
         '| aday kaynağı | ' + ' | '.join(s.get('kaynak') or '-' for s in S) + ' |']
    setler = __import__('youtube_dili').font_setleri()
    for e in KIMLIK + ['arkaplan', 'cerceve', 'gecis', 'kamera', 'doku', 'alinti', 'liste', 'zaman']:
        deg = []
        for s in S:
            x = s['dna'].get(e)
            t = ', '.join(map(str, x)) if isinstance(x, list) else ('-' if x is None else str(x))
            if e == 'palet':
                t += f" ({sd.PALET_SINIF.get(x, '?')})"
            if e == 'font':
                t += f" ({setler.get(x, '?')}, {font_ailesi(x)})"
            deg.append(t)
        if all(d == '-' for d in deg):
            continue
        ayni = len(set(deg)) == 1
        L.append(f"| {e}{' (kimlik)' if e in KIMLIK else ''} | " + ' | '.join(d if ayni else f'**{d}**' for d in deg) + ' |')
    L += ['', '## Fark kontrolü', '']
    for c in v['cift']:
        L.append(f"- {c['ad']}: {len(c['fark'])} görünür eksen farklı ({', '.join(c['fark'])}) · palet sınıfı {'farklı' if c['palet_sinif'] else 'aynı'} · "
                 f"font ailesi {'farklı' if c['font_aile'] else 'aynı'} · palet gözle {'farklı' if c.get('palet_gorsel') else 'AYNI'} -> {'TAMAM' if c['tamam'] else 'TUTMADI'}")
    if v.get('eksik'):
        L += ['', f"UYARI kural tam tutmadı ({SECENEK_YENIDEN} yeniden denemeden sonra en iyi üçlü): " + '; '.join(v['eksik'])]
    # ceviri: eksen -> rakip + her secenek
    sat = {}
    for i, s in enumerate(S):
        for r in s['ceviri']:
            if r['eksen'] == 'UYARI':
                continue
            x = sat.setdefault(r['eksen'], {'rakip': r['rakip'], 'biz': ['-'] * len(S)})
            x['biz'][i] = r['biz']
    L += ['', '## Rakip → biz çeviri (seçeneklere göre)', '', '| eksen | rakip (ölçülen) | ' + ' | '.join(harf) + ' |', '|---|---|' + '---|' * len(S)]
    L += [f"| {e} | {x['rakip']} | " + ' | '.join(x['biz']) + ' |' for e, x in sat.items()]
    uy = [f"- {s['harf']}: {r['rakip']} → {r['biz']} ({r['neden']})" for s in S for r in s['ceviri'] if r['eksen'] == 'UYARI' or 'UYARI' in r['neden']]
    if uy:
        L += ['', 'Ayırt edici yüzey uyarıları:'] + uy
    L += ['', '## Önizleme', '']
    for s in S:
        L.append(f"- **{s['harf']} — {s['ad']}**: kare sayfası `{os.path.join(s['klasor'], 'ONIZLEME.jpg')}` · video `{os.path.join(s['klasor'], 'onizleme.mp4')}`")
    L += ['', '---', '', '**Seçim:** beğendiğin seçeneğin harfiyle çalıştır (kanal kimliği ancak o zaman yazılır):', '',
          f"`py kanal_sablon.py --kanal {v['kanal']} --sec B`" + ('  (bu kanalın kimliği zaten var: `--zorla` ekle)' if v.get('kimlik_var') else ''), '']
    open(yol, 'w', encoding='utf-8').write('\n'.join(L))


def secenekleri_uret(a, kut, kd, hedef, rakipler):
    """stil_dna (6 aday) -> 3 secenek: uygun + belirgin farkli; yeterli degilse tohum degistirip yeniden (en cok SECENEK_YENIDEN)"""
    import stil_dna as sd
    import youtube_dili as Y
    aday_d = os.path.join(hedef, 'aday')
    os.makedirs(aday_d, exist_ok=True)
    # eski tek-secimli akisin sablon/ kokundeki ciktilari (6 aday, eski onizleme) artik aday/ ve secenek-X/ altinda: bayat kopya kalmasin.
    # sablon/stil-dna.json (gecerli kimlik, kanallar arasi hafiza) korunur.
    for eski in glob.glob(os.path.join(hedef, 'stil-dna-[A-Z].json')) + glob.glob(os.path.join(hedef, 'onizleme-*.jpg')) + \
            [os.path.join(hedef, x) for x in ('ONIZLEME.jpg', 'STIL-DNA.md', 'rakip-imza.json', 'onizleme-props.json')]:
        if os.path.isfile(eski):
            os.remove(eski)
    havuz, tur, kp, ton, kaynak = [], 0, None, None, 'verilen rakip' if rakipler else 'nis (kutuphane, konsepte gore)'
    # kimlik yeniden seciliyorsa kanalin ESKI kimligi/videolari secenekleri itmesin (stil_dna'nin otomatik gecmisi): bos gecmis.
    # Diger kanallardan kesin kacinma (--kimlik-uret) aynen gecerli.
    notr = os.path.join(aday_d, 'gecmis-notr.json')
    json.dump({}, open(notr, 'w', encoding='utf-8'))
    for tur in range(SECENEK_YENIDEN + 1):
        tohum = 'sablon-' + a.kanal + (f'-r{tur}' if tur else '')
        cmd = [sys.executable, '-I', os.path.join(BURASI, 'stil_dna.py'), '--konu', a.konsept, '--cikti', aday_d, '--kanal', a.kanal, '--kanallar', a.kanallar,
               '--secenek', '6', '--kimlik-uret', '--tohum', tohum, '--gecmis', notr]
        if rakipler:
            cmd += ['--rakip', ','.join(rakipler)]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if tur == 0:
            print('\n'.join(x for x in r.stdout.splitlines() if x.startswith(('rakip verilmedi', 'ton:', 'UYARI'))))
        if r.returncode:
            sys.exit('HATA stil_dna: ' + (r.stderr or r.stdout)[-1500:])
        # stil_dna varsayilan secimi (aday/stil-dna.json) kanallar arasi hafizaya "secilmis" diye girmesin: kullanici secmedi
        if os.path.exists(os.path.join(aday_d, 'stil-dna.json')):
            os.remove(os.path.join(aday_d, 'stil-dna.json'))
        if not rakipler:
            m = re.search(r'nis kanallari \(kutuphane, konsepte gore\): (\S+)', r.stdout)
            rakipler = m.group(1).split(',') if m else []
        yeni = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(aday_d, 'stil-dna-[A-Z].json')))]
        if kp is None:
            kp, _ = sd.konu_bul(a.konsept)
            ton = yeni[0].get('ton')
            sd.ETK = sd.Etiket(sd.etiket_yukle(sd.repertuar_bul(None, kut)), ton, kp, sd.TON_ENERJI.get(ton, 2.5),
                               {h: v for k, v in kp.items() for h in sd.KONU_HIS.get(k, [])})
            sd.YT = Y.YoutubeDili.yukle().konu(kp)
            if sd.YT.bos:
                sd.YT = None
        gorulen = {json.dumps(d, sort_keys=True) for _, d, _ in havuz}
        havuz += [(sd.uyum_puani(d), d, f'stil_dna tohum {tohum}') for d in yeni if json.dumps(d, sort_keys=True) not in gorulen]
        print(f"tur {tur + 1}: {len(yeni)} aday (tohum {tohum}), uyum " + ', '.join(f'{u:+.2f}' for u, _, _ in havuz[-len(yeni):]))
        sec, gecerli, eksik = uclu_sec(havuz, sd)
        if gecerli:
            break
        print('  yeterli degil: ' + '; '.join(eksik) + (' -> yeni tohumla yeniden' if tur < SECENEK_YENIDEN else ''))
    if not gecerli:
        rk = json.load(open(os.path.join(aday_d, 'rakip-imza.json'), encoding='utf-8'))
        ek = varyantlar(havuz, sd, a.kanal, a.kanallar, rk)
        sec2, gecerli2, eksik2 = uclu_sec(havuz + ek, sd)
        print(f"cesitlendirme: {len(ek)} palet/font varyanti -> " + ('TAMAM' if gecerli2 else 'yine yetmedi: ' + '; '.join(eksik2)))
        if gecerli2 or len(eksik2) < len(eksik):
            havuz, sec, gecerli, eksik = havuz + ek, sec2, gecerli2, eksik2
    dnalar = [havuz[i][1] for i in sec]
    adlar = karakter_adlari(dnalar, sd)
    S = []
    for k, i in enumerate(sec):
        h = chr(65 + k)
        kl = os.path.join(hedef, f'secenek-{h}')
        os.makedirs(kl, exist_ok=True)
        dna = havuz[i][1]
        json.dump(dna, open(os.path.join(kl, f'stil-dna-{h}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        S.append({'harf': h, 'ad': adlar[k]['ad'], 'his': adlar[k]['his'], 'uyum': round(havuz[i][0], 3), 'kaynak': havuz[i][2], 'dna': dna, 'klasor': kl.replace('\\', '/'),
                  'ceviri': ceviri_tablosu(dna, rakipler, kut, sd.YT, sd)})
    import itertools
    cift = [dict(cift_kontrol(S[i]['dna'], S[j]['dna'], sd), ad=f"{S[i]['harf']}–{S[j]['harf']}") for i, j in itertools.combinations(range(len(S)), 2)]
    v = {'kanal': a.kanal, 'konsept': a.konsept, 'olusturma': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'rakip': rakipler, 'rakip_kaynak': kaynak,
         'ton': ton, 'konu': {k: round(x, 3) for k, x in kp.items()}, 'dil': a.dil, 'havuz': len(havuz), 'tur': tur + 1, 'eksik': [] if gecerli else eksik,
         'cift': cift, 'secenek': S, 'kimlik_var': os.path.exists(os.path.join(kd, 'kanal-sablon.json')),
         'kaynak': kaynak_stratejisi(rakipler, kut, dnalar[0]['iskelet'], a.dil), 'ornek': a.ornek_veri}
    for s in S:
        print(f"{s['harf']} — {s['ad']} (uyum {s['uyum']:+.2f}; his {', '.join(s['his'])}): palet {s['dna']['palet']} · font {s['dna']['font']} · "
              f"baslik {s['dna'].get('baslik')} · altyazi {s['dna'].get('altyazi')} · altbant {s['dna'].get('altbant')} · sayi {s['dna'].get('sayi')} · "
              f"cerceve {','.join(s['dna'].get('cerceve') or [])} · arkaplan {s['dna'].get('arkaplan')} · bitis {s['dna'].get('bitis')}")
    for c in cift:
        print(f"  {c['ad']}: {len(c['fark'])} eksen farkli, palet sinifi {'farkli' if c['palet_sinif'] else 'ayni'}, font ailesi {'farkli' if c['font_aile'] else 'ayni'}, "
              f"palet gozle {'farkli' if c['palet_gorsel'] else 'AYNI'}")
    for s in S:
        print(f"onizleme {s['harf']}: kare sayfasi + {ONIZLEME_VIDEO_KARE // 30} sn mp4 ...")
        s['onizleme'] = [p.replace('\\', '/') for p in onizle(s['dna'], s['klasor'], a.konsept, a.foto, a.dil, video=True, ornek=a.ornek_veri)]
    v['sayfa'] = (secenek_sayfasi(S, os.path.join(hedef, 'SECENEKLER.jpg')) or '').replace('\\', '/')
    json.dump(v, open(os.path.join(hedef, 'secenekler.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    secenek_md(os.path.join(hedef, 'SECENEKLER.md'), v, sd)
    print(f"-> {os.path.join(hedef, 'SECENEKLER.md')}\n-> {v['sayfa']}")
    print(f"Kanal kimligi YAZILMADI. Secim: py kanal_sablon.py --kanal {a.kanal} --sec A|B|C" + (' --zorla' if v['kimlik_var'] else ''))


def md_yaz(yol, s):
    L = [f"# Kanal sablonu — {s['kanal']}", '', f"**Konsept:** {s['konsept']}", '',
         f"Ton **{s['ton']}** · konu {', '.join(f'{k} {v:.2f}' for k, v in sorted(s['konu'].items(), key=lambda t: -t[1])[:4]) or '-'} · "
         f"rakip/nis: {', '.join(s['rakip'])} ({s['rakip_kaynak']}) · olusturma {s['olusturma']}", '',
         '## Kimlik (her videoda ayni — kanal bununla taninir)', '']
    if s.get('secim'):
        sc = s['secim']
        L += [f"Secilen edit stili: **{sc['harf']} — {sc['ad']}** (his {', '.join(sc['his'])}; uyum {s.get('uyum', 0):+.2f}) · "
              f"diger secenekler: {', '.join(f'{h} {ad}' for h, ad in sc['digerleri'].items())} · karsilastirma `{sc['secenekler']}`", '']
    L += ['| eksen | secim |', '|---|---|']
    L += [f'| {e} | {v if not isinstance(v, list) else ", ".join(map(str, v))} |' for e, v in s['kimlik'].items()]
    L += ['', f"Videodan videoya degisen eksenler: {', '.join(s['degisken'])} (stil_dna.py --sablon her videoda >= %20 farkli secer).", '',
          '## Rakip -> biz ceviri tablosu', '', 'Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.', '',
          '| eksen | rakip (olculen) | biz | neden |', '|---|---|---|---|']
    L += [f"| {r['eksen']} | {r['rakip']} | {r['biz']} | {r['neden']} |" for r in s['ceviri']]
    isk = s['iskelet']
    L += ['', '## Iskelet (korunan)', '', f"- ilk 30 sn medyan cekim {isk.get('ilk30_medyan_sn')} sn, kesim/dk {isk.get('ilk30_kesim_dk')}, genel medyan {isk.get('genel_medyan_sn')} sn",
          f"- yumusak gecis orani {isk.get('yumusak_oran')}, gecis {isk.get('gecis_kare')} kare, SFX orani {isk.get('sfx_orani')}, cerceveli oran {isk.get('cerceveli_oran')}", '',
          '## Kullanim', '', f"`py stil_dna.py --sablon {s['yol']} --konu \"<video basligi + anlatilan olay>\" --cikti C:/otomasyon/{s['kanal']}/vNN`", '']
    if s.get('kaynak'):
        L += kaynak_md(s['kaynak'])
    if s.get('onizleme'):
        L += ['## Onizleme', ''] + [f'- `{p}`' for p in s['onizleme']] + ['']
    open(yol, 'w', encoding='utf-8').write('\n'.join(L))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--kanal', required=True, help='kanal klasor adi (C:/otomasyon/<ad>)')
    ap.add_argument('--konsept', help='zorunlu (--kaynak-guncelle haric)')
    ap.add_argument('--rakip', nargs='*', default=[], help='rakip kanal linki ya da @Handle (birden cok olabilir); yoksa nis kutuphaneden')
    ap.add_argument('--kanallar', default=r'C:\otomasyon')
    ap.add_argument('--kok', help='edit kutuphanesi')
    ap.add_argument('--onizle', action='store_true', help='--sec ile: secilen kimligin onizleme karelerini sablon/ altina yeniden uret (ornek --foto ile)')
    ap.add_argument('--sec', choices=['A', 'B', 'C'], help='kullanicinin sectigi secenek -> kanal-sablon.json + KANAL-SABLONU.md (once secenekleri uret)')
    ap.add_argument('--foto', nargs='*', default=[], help='onizleme icin konuya uygun 1-3 gorsel (mutlak yol ya da sablon-proje/public altina goreli)')
    ap.add_argument('--dil', choices=['en', 'de', 'tr', 'fr'], help='onizleme metinlerinin dili (kitlenin dili; varsayilan en, --sec ile secenekleri uretirkenki dil)')
    ap.add_argument('--ornek', help='onizleme icin konunun ornek icerigi (JSON: baslik, baslik2, bolum, bolum2, sayi, sayiUst, sayiAlt, alinti, kim, '
                                    'listeBaslik, liste, altyazi, yer, tarih, grafikBaslik, zaman=[{yil, yazi}]); verilmeyen alan dil varsayilanindan')
    ap.add_argument('--zorla', action='store_true', help='var olan kanal-sablon.json uzerine yaz')
    ap.add_argument('--kaynak-guncelle', action='store_true', help='var olan sablona yalniz "kaynak" (kaynak stratejisi) alanini ekle/yenile; kimlik degismez')
    a = ap.parse_args()
    a.ornek_veri = json.load(open(a.ornek, encoding='utf-8-sig')) if a.ornek else None
    if a.kaynak_guncelle:
        import stil_dna as sd
        kut = sd.kutuphane_bul(a.kok)
        yol = os.path.join(a.kanallar, a.kanal, 'kanal-sablon.json')
        s = json.load(open(yol, encoding='utf-8'))
        s['kaynak'] = kaynak_stratejisi(s.get('rakip') or [], kut, s.get('iskelet'), a.dil or 'en')
        if not s['kaynak']:
            sys.exit('HATA: rakiplerin ritim/analiz.json olcumu yok (kanal_isle.py ile olc)')
        json.dump(s, open(yol, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        md_yaz(os.path.join(a.kanallar, a.kanal, 'KANAL-SABLONU.md'), s)
        k = s['kaynak']
        print(f"kaynak: baskin {k['baskin']} | hedef " + ', '.join(f'{x} %{v:.0f}' for x, v in k['hedef'].items() if v) + f" -> {yol}")
        return
    import stil_dna as sd
    kut = sd.kutuphane_bul(a.kok)
    if not kut:
        sys.exit('HATA: edit kutuphanesi bulunamadi')
    kd = os.path.join(a.kanallar, a.kanal)
    yol = os.path.join(kd, 'kanal-sablon.json')
    if os.path.exists(yol) and not a.zorla:
        sys.exit(f'HATA: {yol} var. Kanal kimligi degismemeli; bilincli yenilemek icin --zorla')
    hedef = os.path.join(kd, 'sablon')
    os.makedirs(hedef, exist_ok=True)
    if not a.sec:
        # adim 1: 3 secenek + onizleme; kimlik YAZILMAZ (kullanici secer)
        if not a.konsept:
            ap.error('--konsept gerekli (ya da secenekler hazirsa --sec A|B|C)')
        a.dil = a.dil or 'en'
        rakipler = rakip_hazirla(a.rakip, kut) if a.rakip else []
        secenekleri_uret(a, kut, kd, hedef, rakipler)
        return
    # adim 2: kullanicinin sectigi secenek -> kanal kimligi
    vp = os.path.join(hedef, 'secenekler.json')
    if not os.path.isfile(vp):
        sys.exit(f'HATA: {vp} yok. Once secenekleri uret: py kanal_sablon.py --kanal {a.kanal} --konsept "..."')
    v = json.load(open(vp, encoding='utf-8'))
    if a.konsept and a.konsept.strip() != v['konsept'].strip():
        sys.exit('HATA: --konsept secenekler uretilirken verilenden farkli; once yeni konseptle secenekleri yeniden uret')
    sc = next((x for x in v['secenek'] if x['harf'] == a.sec), None)
    if not sc:
        sys.exit(f"HATA: {a.sec} secenegi yok ({', '.join(x['harf'] for x in v['secenek'])})")
    dna = sc['dna']
    json.dump(dna, open(os.path.join(hedef, 'stil-dna.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)   # kanallar arasi hafiza: secilen kimlik
    s = {'kanal': a.kanal, 'konsept': v['konsept'], 'olusturma': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'yol': yol.replace('\\', '/'),
         'rakip': v['rakip'], 'rakip_kaynak': v['rakip_kaynak'], 'ton': v['ton'], 'konu': v['konu'],
         'secim': {'harf': sc['harf'], 'ad': sc['ad'], 'his': sc['his'], 'secenekler': f"{hedef}/SECENEKLER.md".replace('\\', '/'),
                   'digerleri': {x['harf']: x['ad'] for x in v['secenek'] if x['harf'] != sc['harf']}},
         'kimlik': {e: dna[e] for e in KIMLIK if dna.get(e) is not None}, 'degisken': DEGISKEN, 'iskelet': dna['iskelet'],
         'ceviri': sc['ceviri'], 'uyum': sc['uyum'], 'kaynak': v.get('kaynak')}
    dil = a.dil or v.get('dil', 'en')
    if dil != v.get('dil', 'en') and s['rakip']:
        s['kaynak'] = kaynak_stratejisi(s['rakip'], kut, dna['iskelet'], dil)
    s['onizleme'] = onizle(dna, hedef, v['konsept'], a.foto, dil, ornek=a.ornek_veri or v.get('ornek')) if a.onizle else sc.get('onizleme') or []
    print(f"secilen: {sc['harf']} — {sc['ad']} (uyum {sc['uyum']:+.2f})")
    json.dump(s, open(yol, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    md_yaz(os.path.join(kd, 'KANAL-SABLONU.md'), s)
    print(f"-> {yol}\n-> {os.path.join(kd, 'KANAL-SABLONU.md')}")
    for rr in s['ceviri'][:6]:
        print(f"  {rr['eksen']:8} rakip: {rr['rakip'][:60]:60} -> biz: {rr['biz'][:50]}")
    if s.get('kaynak'):
        k = s['kaynak']
        print(f"  kaynak   baskin {k['baskin']}: " + ', '.join(f'{x} %{v:.0f}' for x, v in k['hedef'].items() if v))


if __name__ == '__main__':
    main()
