#!/usr/bin/env python3
"""YouTube'dan GERCEK video / gorsel kaynagi: lisansi kontrol ederek arar, parca indirir, kare ceker, kaynakca yazar.

Kullanim:
  py youtube_kaynak.py ara "Panzer IV museum footage" [--adet 20] [--hepsi] [--cikti adaylar.tsv]
      varsayilan: YouTube'un "Creative Commons" filtresiyle arar ve her videonun lisansini tek tek dogrular.
      --hepsi: lisans filtresi olmadan arar (yalniz ARASTIRMA/fikir icin; videoya konmaz).
  py youtube_kaynak.py indir <id|url> --bas 12.5 --son 21 --klasor kaynak/ [--izinli "aciklama"] [--cerez cookies.txt]
      yalniz o araligi (en fazla 1080p) indirir; lisans CC-BY degilse --izinli olmadan REDDEDER.
  py youtube_kaynak.py kare <id|url> --anlar 10,22.5,40 --klasor kaynak/ [--izinli "..."]
      verilen anlardan tam cozunurluk PNG kare (gorsel olarak kullanmak icin), ayni lisans kurali.
Her indirme/kare `kaynak/KAYNAKCA.tsv`'ye yazilir: dosya, baslik, kanal, url, lisans, aralik, izin notu.
Aciklamaya "Footage: <kanal> (<url>), CC BY" satirlari bu dosyadan cikar.

Kurallar (references/youtube-kaynak.md): CC BY = atifla kullanilir. Standart YouTube lisansli video
kullanilmaz; istisna yalniz kullanicinin acik izni (sahibinden yazili izin, kendi kanali, kamu malı resmi kayit)
ve bu izin --izinli ile kayda gecer. Rakibin videosu kaynak olarak ASLA kullanilmaz.
"""
import argparse, csv, glob, json, os, re, subprocess, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rakip_indir as R

CC_FILTRE = 'EgIwAQ%3D%3D'  # YouTube arama filtresi: Creative Commons


def bilgi(vid):
    url = vid if vid.startswith('http') else f'https://www.youtube.com/watch?v={vid}'
    j = json.loads(R.ytdlp('--skip-download', '--dump-json', url))
    return {'id': j['id'], 'url': f'https://www.youtube.com/watch?v={j["id"]}', 'baslik': j.get('title', ''),
            'kanal': j.get('channel') or j.get('uploader', ''), 'kanal_id': j.get('uploader_id') or '', 'lisans': j.get('license') or 'Standard YouTube License',
            'sure': j.get('duration'), 'izlenme': j.get('view_count'), 'genislik': j.get('width'), 'yukseklik': j.get('height'),
            'aciklama': (j.get('description') or '')[:1500]}


def cc_mi(lisans):
    return 'creative commons' in (lisans or '').lower()


# CC BY isareti yukleyenin hakki oldugunu kanitlamaz: baskasinin belgeselini "CC BY" diye yeniden yukleyen (lisans aklama)
# ve kendisi baska kaynaktan derleyen anlatim kanallari telif talebi / demonetizasyon riskidir. Ozgun cekim yapan (safari
# rehberi, arastirma kurumu, vakif, hayvanat bahcesi, bireysel cekimci) tercih edilir.
MARKA = ['national geographic', 'nat geo', 'natgeo', 'bbc', 'discovery channel', 'animal planet', 'netflix', 'our planet', 'planet earth',
         'smithsonian channel', 'pbs nature', 'love nature', 'free documentary', 'disneynature', 'david attenborough', 'attenborough']
TAM_BELGESEL = ['full episode', 'full documentary', 'documentary hd', 'documentary 4k', 'full movie', 'complete series', 'episode ']
IKINCI_EL = ['facts', 'top 10', 'top 5', 'description, characteristics', 'explained', 'why ', 'what makes', 'shocking', 'you won',
             'epic showdown', ' vs ', 'compilation', 'ai generated', 'ai-generated', '#ai', 'animal attack']
OZGUN = ['safari', 'guide', 'lodge', 'wildlife trust', 'fund', 'foundation', 'research', 'university', 'institute', 'zoo', 'aquarium',
         'national park', 'conservation', 'plos', 'nasa', 'noaa', 'usfws', 'fish and wildlife', 'sighting', 'spotted', 'encounter',
         'kruger', 'masai mara', 'serengeti', 'filmed', 'drone', 'trail cam', 'camera trap', 'whale watching', 'expedition']


def kaynak_guveni(b):
    """-> (sinif, neden): 'riskli' | 'ikinci-el' | 'ozgun' | 'belirsiz'. Sezgisel; karar kontakt + kanal sayfasina bakilarak verilir."""
    m = f" {b.get('baslik', '')} | {b.get('kanal', '')} | {(b.get('aciklama') or '')[:400]} ".lower()
    k = f" {b.get('kanal', '')} ".lower()
    marka = [x for x in MARKA if x in m]
    if marka:
        return 'riskli', 'marka icerigi: ' + ', '.join(marka[:2])
    if any(x in m for x in TAM_BELGESEL) or ((b.get('sure') or 0) > 1500 and 'documentary' in m):
        return 'riskli', 'tam belgesel (yeniden yukleme izi)'
    ozgun = [x for x in OZGUN if x in m]
    ikinci = [x.strip() for x in IKINCI_EL if x in m]
    if ozgun and not ikinci:
        return 'ozgun', 'ozgun cekim izi: ' + ', '.join(ozgun[:2])
    if ikinci and not any(x in k for x in OZGUN):
        return 'ikinci-el', 'anlatim/derleme kanali: ' + ', '.join(ikinci[:2])
    return 'belirsiz', 'kanal sayfasina bak'


def ara(a):
    q = urllib.parse.quote_plus(a.sorgu)
    url = f'https://www.youtube.com/results?search_query={q}' + ('' if a.hepsi else f'&sp={CC_FILTRE}')
    out = R.ytdlp('--flat-playlist', '--dump-json', '--playlist-end', str(a.adet), url)
    ids = [json.loads(s)['id'] for s in out.splitlines() if s.strip().startswith('{')]
    satir = []
    for v in ids:
        try:
            b = bilgi(v)
        except Exception as e:
            print('atlandi', v, str(e)[-120:], file=sys.stderr)
            continue
        b['guven'], b['guven_neden'] = kaynak_guveni(b)
        if not cc_mi(b['lisans']):
            b['kullanilabilir'] = 'HAYIR (yalniz arastirma)'
        elif b['guven'] == 'riskli':
            b['kullanilabilir'] = 'RISKLI (CC BY ama yeniden yukleme izi)'
        else:
            b['kullanilabilir'] = 'EVET (CC BY, atifla)'
        satir.append(b)
        print(f"{b['kullanilabilir'][:6]:6} {b['guven']:9} {b['id']} {b['sure']}s {b['yukseklik']}p  {b['kanal']} | {b['baslik'][:60]}")
    sira = {'ozgun': 0, 'belirsiz': 1, 'ikinci-el': 2, 'riskli': 3}
    satir.sort(key=lambda s: (not cc_mi(s['lisans']), sira.get(s['guven'], 9)))
    with open(a.cikti, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['kullanilabilir', 'guven', 'guven_neden', 'id', 'baslik', 'kanal', 'lisans', 'sure', 'izlenme', 'yukseklik', 'url'],
                           delimiter='\t', extrasaction='ignore')
        w.writeheader()
        w.writerows(satir)
    say = {g: sum(1 for s in satir if cc_mi(s['lisans']) and s['guven'] == g) for g in sira}
    print(f"{sum(1 for s in satir if s['kullanilabilir'].startswith('EVET'))}/{len(satir)} kullanilabilir "
          f"(ozgun {say['ozgun']}, belirsiz {say['belirsiz']}, ikinci-el {say['ikinci-el']}, riskli {say['riskli']}) -> {a.cikti}")


def rakip_mi(b):
    """kanal edit kutuphanesinde olculmus bir rakip mi (kanallar/@Handle) -> handle | None. Rakibin videosu kaynak olarak ASLA kullanilmaz."""
    try:
        from stil_dna import kutuphane_bul
        kut = kutuphane_bul()
    except Exception:
        return None
    if not kut:
        return None
    adlar = {re.sub(r'[^a-z0-9]', '', x.lower()) for x in (b.get('kanal_id'), b.get('kanal')) if x}
    for d in glob.glob(os.path.join(kut, 'kanallar', '@*')):
        h = os.path.basename(d)
        if re.sub(r'[^a-z0-9]', '', re.sub(r'\s*\(\d+\)$', '', h).lower()) in adlar:
            return h
    return None


def izin_kontrol(b, izinli):
    r = rakip_mi(b)
    if r:
        sys.exit(f"REDDEDILDI: {b['url']} kanali kutuphanede olculmus rakip ({r}). Rakibin videosu kaynak olarak asla kullanilmaz.")
    if cc_mi(b['lisans']):
        g, neden = kaynak_guveni(b)
        if g == 'riskli' and not izinli:
            sys.exit(f"REDDEDILDI: {b['url']} CC BY isaretli ama {neden}. Yukleyenin hakki supheli (lisans aklama). "
                     'Ozgun cekimci sec; kanal sayfasi incelenip kullanici onaylarsa --izinli "inceledim: <neden>".')
        return f'CC BY ({g})' if g != 'riskli' else f'CC BY (riskli, onay: {izinli})'
    if not izinli:
        sys.exit(f"REDDEDILDI: {b['url']} lisansi '{b['lisans']}'. Kullanmak icin kullanicinin acik izni gerekir "
                 '(--izinli "sahibinden yazili izin / kendi kanalim / ..."). Rakibin videosu asla.')
    return f'IZINLI: {izinli}'


def kaynakca(klasor, kayit):
    yol = os.path.join(klasor, 'KAYNAKCA.tsv')
    yeni = not os.path.exists(yol)
    with open(yol, 'a', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter='\t')
        if yeni:
            w.writerow(['dosya', 'baslik', 'kanal', 'url', 'lisans', 'aralik', 'izin'])
        w.writerow(kayit)


def indir(a):
    b = bilgi(a.video)
    izin = izin_kontrol(b, a.izinli)
    os.makedirs(a.klasor, exist_ok=True)
    ad = f"{b['id']}_{a.bas:.1f}-{a.son:.1f}".replace('.', '_')
    hedef = os.path.join(a.klasor, ad + '.%(ext)s')
    R.ytdlp('-f', 'bv*[height<=1080][vcodec^=avc1]+ba/bv*[height<=1080]+ba/b', '--merge-output-format', 'mp4',
            '--download-sections', f'*{a.bas}-{a.son}', '--force-keyframes-at-cuts', '-o', hedef, b['url'])
    dosya = os.path.join(a.klasor, ad + '.mp4')
    kaynakca(a.klasor, [os.path.basename(dosya), b['baslik'], b['kanal'], b['url'], b['lisans'], f'{a.bas}-{a.son}', izin])
    print(f'indi: {dosya} ({izin})')


def kare(a):
    b = bilgi(a.video)
    izin = izin_kontrol(b, a.izinli)
    os.makedirs(a.klasor, exist_ok=True)
    akis = R.ytdlp('-f', 'bv*[height<=2160]/b', '-g', b['url']).strip().splitlines()[0]
    for t in [float(x) for x in a.anlar.split(',')]:
        dosya = os.path.join(a.klasor, f"{b['id']}_{t:.1f}.png".replace('.', '_', 1))
        r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', akis, '-frames:v', '1', dosya],
                           capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(dosya):
            kaynakca(a.klasor, [os.path.basename(dosya), b['baslik'], b['kanal'], b['url'], b['lisans'], f'{t}', izin])
            print('kare:', dosya)
        else:
            print('kare alinamadi', t, r.stderr[-200:], file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    alt = ap.add_subparsers(dest='is_', required=True)
    p = alt.add_parser('ara')
    p.add_argument('sorgu')
    p.add_argument('--adet', type=int, default=20)
    p.add_argument('--hepsi', action='store_true')
    p.add_argument('--cikti', default='adaylar.tsv')
    for ad in ('indir', 'kare'):
        p = alt.add_parser(ad)
        p.add_argument('video')
        p.add_argument('--klasor', default='kaynak')
        p.add_argument('--izinli')
        if ad == 'indir':
            p.add_argument('--bas', type=float, required=True)
            p.add_argument('--son', type=float, required=True)
        else:
            p.add_argument('--anlar', required=True)
    for p in alt.choices.values():
        p.add_argument('--cerez')
    a = ap.parse_args()
    if a.cerez:
        R.EK.extend(['--cookies', a.cerez, '--sleep-requests', '1'])
    {'ara': ara, 'indir': indir, 'kare': kare}[a.is_](a)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
