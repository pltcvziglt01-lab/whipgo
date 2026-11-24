#!/usr/bin/env python3
"""Rakip kanalin en populer N videosunu bulur; kapaklarini, (istenirse) videolarini ve altyazilarini indirir.

Kullanim:
  py rakip_indir.py @KanalHandle [--adet 3] [--video] [--altyazi de,en] [--cikti rakip-analiz/<ad>]
  py rakip_indir.py https://www.youtube.com/@Kanal/videos --adet 3 --video
  py rakip_indir.py --videolar URL1 URL2 URL3 [--video]
  [--son 300]  kanal listesinde taranacak en yeni video sayisi
  [--en-az-sn 61]  bu sureden kisa videolari (Shorts) atla

Cikti klasoru:
  secim.json / secim.md   secilen videolar: sira, id, baslik, izlenme, kanal ortalamasi, oran, sure, tarih
  kapak-1.jpg ...         en yuksek cozunurluklu kapak (maxres > sd > hq)
  video-1.mp4 ...         (--video) <=720p analiz kopyasi
  video-1.<dil>.vtt       (--video) altyazi / otomatik altyazi
  indirilenler.json       temizle.py'nin silecegi dosyalarin listesi
Gerekli: yt-dlp (py -m pip install yt-dlp) ve ffmpeg. Ag erisimi gerekir.
"""
import argparse, json, os, shutil, statistics, subprocess, sys, urllib.request


IPUCU = ['Pexels', 'Pixabay', 'Storyblocks', 'Envato', 'Artgrid', 'Shutterstock', 'Getty', 'Pond5', 'Adobe Stock',
         'Videvo', 'Mixkit', 'Magnific', 'Freepik', 'Midjourney', 'DALL', 'Stable Diffusion', 'Runway', 'Kling', 'Veo',
         'Sora', 'Pika', 'Hailuo', 'Flux', 'AI-generated', 'AI generated', 'generated with AI', 'KI-generiert', 'synthetic',
         'archive', 'Archiv', 'courtesy', 'footage', 'Wikimedia', 'Commons', 'public domain', 'Fair Use', 'licensed',
         'stock', 'B-roll', 'reenactment', 'dramatized', 'illustrative', 'イメージ', 'ElevenLabs', 'voice']


# Ek yt-dlp argumanlari: JS calisma ortami (node yoksa video formatlari gelmez, yalniz storyboard) + --cerez
EK = ['--js-runtimes', 'node'] if shutil.which('node') else []


def ytdlp(*args):
    cmd = [sys.executable, '-m', 'yt_dlp', '--no-warnings', *EK, *args]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[-800:])
    return r.stdout


def kanal_url(x):
    if x.startswith('@'):
        return f'https://www.youtube.com/{x}/videos'
    if 'youtube.com' in x and not x.rstrip('/').endswith(('/videos', '/streams', '/shorts')) and '/watch' not in x:
        return x.rstrip('/') + '/videos'
    return x


def kapak_indir(vid, hedef):
    for ad in ('maxresdefault', 'sddefault', 'hqdefault'):
        url = f'https://i.ytimg.com/vi/{vid}/{ad}.jpg'
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                veri = r.read()
            if len(veri) > 5000:  # YouTube olmayan boyutlar icin 120x90 gri yer tutucu doner
                with open(hedef, 'wb') as f:
                    f.write(veri)
                return ad
        except Exception:
            continue
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('kanal', nargs='?')
    ap.add_argument('--videolar', nargs='*')
    ap.add_argument('--adet', type=int, default=3)
    ap.add_argument('--son', type=int, default=300)
    ap.add_argument('--en-az-sn', type=int, default=61)
    ap.add_argument('--video', action='store_true')
    ap.add_argument('--altyazi', default='orig,en', help="'orig' = videonun kendi dilindeki otomatik altyazi (tek istek, 429 riski dusuk); ornek: orig,en | de | hu. Altyazi hatasi videoyu DURDURMAZ.")
    ap.add_argument('--cikti')
    ap.add_argument('--yuzde', type=float, default=0, help='>0: videonun yalniz ilk %%N kismini indir (en az 60 sn, en cok 600 sn)')
    ap.add_argument('--cerez', help='Netscape cookies.txt (YouTube bot engelinde; cerez_al.py uretir). Istekler yavaslatilir.')
    a = ap.parse_args()
    if a.cerez:
        EK.extend(['--cookies', a.cerez, '--sleep-requests', '1', '--sleep-interval', '3', '--max-sleep-interval', '8'])
    if not a.kanal and not a.videolar:
        ap.error('kanal ya da --videolar gerekli')

    secim, ortalama = [], None
    if a.videolar:
        for u in a.videolar:
            d = json.loads(ytdlp('-J', '--skip-download', u))
            secim.append({'id': d['id'], 'baslik': d.get('title'), 'izlenme': d.get('view_count'),
                          'sure': d.get('duration'), 'tarih': d.get('upload_date'), 'kanal': d.get('channel')})
    else:
        liste = json.loads(ytdlp('--flat-playlist', '-J', '--playlist-end', str(a.son), kanal_url(a.kanal)))
        ogeler = [e for e in liste.get('entries', []) if e and e.get('view_count') is not None
                  and (e.get('duration') or 999) >= a.en_az_sn]
        if not ogeler:
            # yeni kanallarda --flat-playlist izlenmeyi NA verir: ilk 30 videonun sayfasindan tek tek al (HATA-BILDIRIM 2026-11-22)
            ham = [e for e in liste.get('entries', []) if e and e.get('id')][:30]
            for e in ham:
                try:
                    d = json.loads(ytdlp('-J', '--skip-download', f"https://www.youtube.com/watch?v={e['id']}"))
                    e['view_count'], e['duration'] = d.get('view_count'), d.get('duration') or e.get('duration')
                    e['title'], e['upload_date'] = d.get('title') or e.get('title'), d.get('upload_date')
                except RuntimeError:
                    pass
            ogeler = [e for e in ham if e.get('view_count') is not None and (e.get('duration') or 999) >= a.en_az_sn]
        if not ogeler:
            sys.exit('Liste bos ya da izlenme bilgisi gelmedi; --videolar ile URL ver.')
        ortalama = statistics.mean(e['view_count'] for e in ogeler)
        for e in sorted(ogeler, key=lambda e: e['view_count'], reverse=True)[:a.adet]:
            secim.append({'id': e['id'], 'baslik': e.get('title'), 'izlenme': e['view_count'],
                          'sure': e.get('duration'), 'tarih': e.get('upload_date'), 'kanal': liste.get('channel') or liste.get('title')})

    ad = a.cikti or os.path.join('rakip-analiz', (secim[0].get('kanal') or 'rakip').replace(' ', '_'))
    os.makedirs(ad, exist_ok=True)
    indirilen = []
    for i, v in enumerate(secim, 1):
        v['sira'] = i
        v['url'] = f"https://www.youtube.com/watch?v={v['id']}"
        if ortalama:
            v['kanal_ortalama'] = round(ortalama)
            v['oran'] = round(v['izlenme'] / ortalama, 2) if ortalama else None
        try:  # aciklama, etiket, bolumler: kaynak ipuclari (Pexels, Storyblocks, AI, archive, courtesy...)
            m = json.loads(ytdlp('-J', '--skip-download', v['url']))
            acik = m.get('description') or ''
            open(os.path.join(ad, f'aciklama-{i}.txt'), 'w', encoding='utf-8').write(acik)
            v['etiketler'] = m.get('tags') or []
            v['bolumler'] = [(c.get('start_time'), c.get('title')) for c in (m.get('chapters') or [])]
            v['begeni'] = m.get('like_count'); v['yorum'] = m.get('comment_count')
            v['kaynak_ipuclari'] = sorted({k for k in IPUCU if k.lower() in acik.lower()})
        except RuntimeError as h:
            v['meta_hata'] = str(h)[:200]
        v['kapak'] = f'kapak-{i}.jpg'
        v['kapak_kalite'] = kapak_indir(v['id'], os.path.join(ad, v['kapak']))
        if a.video:
            sablon = os.path.join(ad, f'video-{i}.%(ext)s')
            # 'orig' -> '.*-orig' (kendi dilinde otomatik altyazi); diger diller tam ad (en, de): ceviri altyazisi istenmez (429 sebebi)
            diller = ','.join('.*-orig' if d.strip() == 'orig' else d.strip() for d in a.altyazi.split(','))
            try:
                # H.264 (avc1) ZORUNLU tercih: AV1 gelirse OpenCV ~9 kare/sn cozer, kanal basi 30 dk -> 105 dk olur
                ytdlp('-f', 'bv*[height<=720][vcodec^=avc1]+ba[ext=m4a]/b[height<=720][vcodec^=avc1]/'
                      'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]/b', '--merge-output-format', 'mp4',
                      '-o', sablon, v['url'])
            except RuntimeError as h:
                v['video_hata'] = str(h)
            try:  # altyazi AYRI istek: 429 olursa video yine de olculur (HATA-BILDIRIM 2026-11-17/19/22)
                ytdlp('--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', diller, '--sub-format', 'vtt',
                      '-o', sablon, v['url'])
            except RuntimeError as h:
                v['altyazi_hata'] = str(h)[:200]
            mp4 = os.path.join(ad, f'video-{i}.mp4')
            if a.yuzde and os.path.exists(mp4):  # tam indir (hizli), sonra ilk %N'i kayipsiz kes
                kes = min(600, max(60, (v.get('sure') or 600) * a.yuzde / 100))
                gec = mp4 + '.kes.mp4'
                if subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-t', f'{kes:.0f}', '-c', 'copy', gec]).returncode == 0:
                    os.replace(gec, mp4)
                    v['kesit_sn'] = round(kes)
            if os.path.exists(mp4):  # emniyet: H.264 degilse (AV1/VP9) H.264'e cevir — OpenCV AV1'i cok yavas cozer
                kod = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name',
                                      '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout.strip()
                v['codec'] = kod
                if kod and kod != 'h264':
                    gec = mp4 + '.h264.mp4'
                    if subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-c:v', 'libx264', '-preset', 'veryfast',
                                       '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', gec]).returncode == 0:
                        os.replace(gec, mp4)
                        v['codec'] = f'{kod}->h264'
            for f in os.listdir(ad):
                if f.startswith(f'video-{i}.'):
                    indirilen.append(os.path.join(ad, f))
                    if f.endswith('.mp4'):
                        v['video'] = f
                    elif f.endswith('.vtt'):
                        v.setdefault('altyazi', []).append(f)

    with open(os.path.join(ad, 'secim.json'), 'w', encoding='utf-8') as f:
        json.dump(secim, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ad, 'indirilenler.json'), 'w', encoding='utf-8') as f:
        json.dump(sorted(set(indirilen)), f, ensure_ascii=False, indent=1)
    satirlar = ['| # | Baslik | Izlenme | Oran | Sure | Tarih | Kapak |', '|---|---|---|---|---|---|---|']
    for v in secim:
        s = v.get('sure') or 0
        satirlar.append(f"| {v['sira']} | {v['baslik']} | {v['izlenme']:,} | {v.get('oran', '-')} | "
                        f"{int(s) // 60}:{int(s) % 60:02d} | {v.get('tarih') or '-'} | {v['kapak']} ({v['kapak_kalite']}) |")
    with open(os.path.join(ad, 'secim.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(satirlar) + '\n')
    print('\n'.join(satirlar))
    print(f'Klasor: {ad}' + (f' | indirilen video/altyazi: {len(indirilen)}' if a.video else ''))


if __name__ == '__main__':
    main()
