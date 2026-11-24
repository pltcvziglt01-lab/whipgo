#!/usr/bin/env python3
"""KANAL SABLONU — bir konsept (ve istege bagli rakip kanal linki) -> BIZE OZGU kanal sunus stili.
Rakibin edit dili olculur, her eksen YouTube'da gercekte kullanilanlara (kutuphane: youtube_dili.py) ve konuya (etiketler)
gore "cevrilir": rakip Montserrat -> biz Anton'lu set (nisteki basarili kanallarda dar kalin sans yaygin, konuya uygun, rakipten farkli).
Iskelet (tempo, kesim, gecis sikligi, SFX orani) rakipten/nisten korunur; yuzey bizimdir ve diger kanallarimizdan ayridir.

Kullanim:
  py kanal_sablon.py --kanal <ad> --konsept "<kanalin konusu, hedef kitle, ornek video basliklari>" [--rakip <link|@Handle> ...] [--onizle]
Ciktilar (C:/otomasyon/<ad>/):
  kanal-sablon.json   kimlik (her videoda sabit) + degisken eksenler + iskelet + ceviri tablosu  -> stil_dna.py --sablon
  KANAL-SABLONU.md    insan okur: rakip -> biz ceviri tablosu ve gerekceler, kimlik karti, KAYNAK STRATEJISI (rakip AI mi gercek mi -> bizim kaynak plani)
Var olan sablona yalniz kaynak stratejisi: py kanal_sablon.py --kanal <ad> --kaynak-guncelle [--dil en]
  sablon/             secim motoru ciktilari (STIL-DNA.md, A/B/C secenekleri), onizleme kareleri (--onizle)
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
KIMLIK = ['palet', 'font', 'hareket', 'bitis', 'baslik', 'baslik2', 'altyazi', 'altbant', 'sayi', 'hud', 'harita', 'grafik']
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
AI_ETIKET = {'en': 'ILLUSTRATION', 'de': 'SYMBOLBILD', 'tr': 'TEMSİLÎ', 'ja': 'イメージ'}


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
           'liste': ['Die erste Warnung', 'Der zweite Fehler', 'Die letzte Entscheidung'], 'altyazi': 'Niemand hat erwartet dass sich alles ändert'},
    'tr': {'bolum': 'Bölüm 1', 'baslik2': 'Gerçekte Ne Oldu', 'yer': 'Yer', 'tarih': 'Tarih', 'sayiUst': 'Kilit sayı', 'sayiAlt': 'hikâyenin arkasındaki sayı',
           'alinti': 'Bunun olmaması gerekiyordu.', 'kim': 'Görgü tanığı', 'listeBaslik': 'Üç neden',
           'liste': ['İlk uyarı', 'İkinci hata', 'Son karar'], 'altyazi': 'Kimse her şeyin değişeceğini beklemiyordu'},
}


def onizle(dna, hedef, konsept='', foto=None, dil='en'):
    """Onizleme kompozisyonu: kimligin tum eksenleri (11 esit sahne); kareler sahne oturdugu anda (Onizleme.tsx ONIZLEME_S/OTURMA)"""
    for eski in glob.glob(os.path.join(hedef, 'onizleme-*.jpg')) + glob.glob(os.path.join(hedef, 'ONIZLEME.jpg')):
        os.remove(eski)
    if not os.path.exists(CHROME):
        print('UYARI onizleme atlandi: chrome-headless-shell yok')
        return []
    # ornek baslik: tirnak icindeki ifade; acilis tirnagindan once bosluk/bas (Tesla's kesme isareti acilis sayilmaz)
    m = re.search(r"(?:(?<=\s)|^)[\"“‘']([^\"”]{8,90}?)[\"”’'](?=[\s,.;:)]|$)", konsept or '')
    baslik = m.group(1) if m else ' '.join((konsept or 'The Story Nobody Told').split()[:6]).strip(' .,:;')
    pj = os.path.join(hedef, 'onizleme-props.json')
    metin = dict(ONIZLEME_METIN.get(dil, ONIZLEME_METIN['en']), baslik=baslik)
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
    return cikti


def md_yaz(yol, s):
    L = [f"# Kanal sablonu — {s['kanal']}", '', f"**Konsept:** {s['konsept']}", '',
         f"Ton **{s['ton']}** · konu {', '.join(f'{k} {v:.2f}' for k, v in sorted(s['konu'].items(), key=lambda t: -t[1])[:4]) or '-'} · "
         f"rakip/nis: {', '.join(s['rakip'])} ({s['rakip_kaynak']}) · olusturma {s['olusturma']}", '',
         '## Kimlik (her videoda ayni — kanal bununla taninir)', '', '| eksen | secim |', '|---|---|']
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
    ap.add_argument('--onizle', action='store_true')
    ap.add_argument('--foto', nargs='*', default=[], help='onizleme icin konuya uygun 1-3 gorsel (mutlak yol ya da sablon-proje/public altina goreli)')
    ap.add_argument('--dil', default='en', choices=['en', 'de', 'tr'], help='onizleme metinlerinin dili (kitlenin dili)')
    ap.add_argument('--zorla', action='store_true', help='var olan kanal-sablon.json uzerine yaz')
    ap.add_argument('--kaynak-guncelle', action='store_true', help='var olan sablona yalniz "kaynak" (kaynak stratejisi) alanini ekle/yenile; kimlik degismez')
    a = ap.parse_args()
    if a.kaynak_guncelle:
        import stil_dna as sd
        kut = sd.kutuphane_bul(a.kok)
        yol = os.path.join(a.kanallar, a.kanal, 'kanal-sablon.json')
        s = json.load(open(yol, encoding='utf-8'))
        s['kaynak'] = kaynak_stratejisi(s.get('rakip') or [], kut, s.get('iskelet'), a.dil)
        if not s['kaynak']:
            sys.exit('HATA: rakiplerin ritim/analiz.json olcumu yok (kanal_isle.py ile olc)')
        json.dump(s, open(yol, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        md_yaz(os.path.join(a.kanallar, a.kanal, 'KANAL-SABLONU.md'), s)
        k = s['kaynak']
        print(f"kaynak: baskin {k['baskin']} | hedef " + ', '.join(f'{x} %{v:.0f}' for x, v in k['hedef'].items() if v) + f" -> {yol}")
        return
    if not a.konsept:
        ap.error('--konsept gerekli')
    import stil_dna as sd
    import youtube_dili as Y
    kut = sd.kutuphane_bul(a.kok)
    if not kut:
        sys.exit('HATA: edit kutuphanesi bulunamadi')
    kd = os.path.join(a.kanallar, a.kanal)
    yol = os.path.join(kd, 'kanal-sablon.json')
    if os.path.exists(yol) and not a.zorla:
        sys.exit(f'HATA: {yol} var. Kanal kimligi degismemeli; bilincli yenilemek icin --zorla')
    hedef = os.path.join(kd, 'sablon')
    os.makedirs(hedef, exist_ok=True)
    rakipler = rakip_hazirla(a.rakip, kut) if a.rakip else []
    # secim motoru: konsept + rakip (yoksa nis); 6 secenek -> en uygunu, kanal adi -> diger kanallarla ayni gorunum yok
    cmd = [sys.executable, '-I', os.path.join(BURASI, 'stil_dna.py'), '--konu', a.konsept, '--cikti', hedef, '--kanal', a.kanal, '--kanallar', a.kanallar,
           '--secenek', '6', '--kimlik-uret', '--tohum', 'sablon-' + a.kanal]
    if rakipler:
        cmd += ['--rakip', ','.join(rakipler)]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    print('\n'.join(x for x in r.stdout.splitlines() if x.startswith(('rakip verilmedi', 'ton:', 'A:', 'B:', 'C:', 'UYARI'))))
    if r.returncode:
        sys.exit('HATA stil_dna: ' + (r.stderr or r.stdout)[-1500:])
    if not rakipler:
        m = re.search(r'nis kanallari \(kutuphane, konsepte gore\): (\S+)', r.stdout)
        rakipler = m.group(1).split(',') if m else []
        kaynak = 'nis (kutuphane, konsepte gore)'
    else:
        kaynak = 'verilen rakip'
    # secenekler arasindan konsepte en uygun olani (goreli uyum) sec
    secenek = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(hedef, 'stil-dna-[A-Z].json')))]
    kp, _ = sd.konu_bul(a.konsept)
    ton = secenek[0].get('ton')
    sd.ETK = sd.Etiket(sd.etiket_yukle(sd.repertuar_bul(None, kut)), ton, kp, sd.TON_ENERJI.get(ton, 2.5),
                       {h: v for k, v in kp.items() for h in sd.KONU_HIS.get(k, [])})
    sd.YT = Y.YoutubeDili.yukle().konu(kp)
    if sd.YT.bos:
        sd.YT = None
    puan = [(sd.uyum_puani(d), i) for i, d in enumerate(secenek)]
    en = max(puan)[1]
    dna = secenek[en]
    print('secenek uyumu: ' + ', '.join(f'{chr(65 + i)} {p:+.2f}' for p, i in puan) + f' -> {chr(65 + en)}')
    shutil.copy(os.path.join(hedef, f'stil-dna-{chr(65 + en)}.json'), os.path.join(hedef, 'stil-dna.json'))
    s = {'kanal': a.kanal, 'konsept': a.konsept, 'olusturma': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'yol': yol.replace('\\', '/'),
         'rakip': rakipler, 'rakip_kaynak': kaynak, 'ton': ton, 'konu': {k: round(v, 3) for k, v in kp.items()},
         'kimlik': {e: dna[e] for e in KIMLIK if dna.get(e) is not None}, 'degisken': DEGISKEN, 'iskelet': dna['iskelet'],
         'ceviri': ceviri_tablosu(dna, rakipler, kut, sd.YT, sd), 'uyum': round(max(puan)[0], 3)}
    s['kaynak'] = kaynak_stratejisi(rakipler, kut, dna['iskelet'], a.dil)
    if a.onizle:
        s['onizleme'] = onizle(dna, hedef, a.konsept, a.foto, a.dil)
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
