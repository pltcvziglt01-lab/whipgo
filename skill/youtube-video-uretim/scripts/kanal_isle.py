#!/usr/bin/env python3
"""EDIT KUTUPHANESI — bir (ya da birden cok) kanali uctan uca olcer ve kutuphaneye yazar. Token harcamaz.

Her kanal icin:
  1. kanallar/<ad>/durum.txt'ye bakar: 'bitti' ya da baska birinin 24 saatten yeni 'isleniyor' kaydi varsa ATLAR.
  2. 'isleniyor <tarih> <kim>' yazar (kilit).
  3. Yerel is klasorunde (C: — Drive'a degil): en populer 3 uzun video (Shorts haric), her birinin ilk %30'u
     (en az 60 sn, en cok 600 sn) <=720p + altyazi + kapak + aciklama  (rakip_indir.py --yuzde 30)
  4. Her video: kare_analiz.py (ritim, 0,1 sn) + edit_dili.py (kare kare edit dili) + font_aday.py (2 yazi)
     + yazi_senkron.py (ekran yazisi-ses senkronu, 0,25 sn; kelime zamanlari altyazi.vtt'den). Basarisizsa kanal DURMAZ, uyari yazilir.
  5. Sonuclari kutuphaneye tasir: kanallar/<ad>/video-N/{altyazi.vtt, ritim/, editdili/, yazi-senkron.json, YAZI-SENKRON.md,
     yazi-senkron-ornek.jpg} (video SAKLANMAZ, is klasoruyle silinir),
     kapak-N.jpg, aciklama-N.txt, secim.md/json, kanal.json (ozet sayilar)
  6. durum.txt = 'olculdu <tarih> <kim>'  → sonra Claude EDIT-DILI.md profilini yazar ve 'bitti' yapar.

Kullanim:
  py kanal_isle.py @Handle --kim <adin> [--etiket konsept|edit|hikaye|evergreen] [--not "..."]
  py kanal_isle.py --liste kanallar.txt --kim <adin> [--paralel 2]     # satir basina bir URL/@handle (# yorum)
  [--kok "<kutuphane yolu>"]  (varsayilan: bu betigin bir ust klasoru)
  [--zorla]  durum.txt'yi yok say
"""
import argparse, datetime, json, os, re, shutil, subprocess, sys, tempfile, threading, urllib.parse
from concurrent.futures import ThreadPoolExecutor

BURASI = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
# YouTube "Sign in to confirm you're not a bot" (IP isaretlendi): toplu isi DURDUR, kalan kanallara dokunma.
# Devam etmek IP'yi daha cok isaretler ve 226 kanali bos 'hata' ile doldurur.
BOT_DUR = threading.Event()
# --cerez-port: indirmeler TEK TEK (kilit), her kanaldan once cerez tazelenir; olcum (analiz) paralel kalir.
INDIR_KILIT = threading.Lock()
# Kanal basina olculen video sayisi (en cok izlenenden baslayarak). Kullanici karari 2026-11-17: 1 yeterli.
ADET = 1


def indir(giris, is_dir, log, cerez_port):
    hedef_url = kanal_url(giris)
    kaynak = ['--videolar', hedef_url] if '/watch' in hedef_url else [hedef_url]  # listede kanal yerine video linki: o videoyu olc
    args = [os.path.join(BURASI, 'rakip_indir.py'), *kaynak, '--adet', str(ADET), '--video', '--yuzde', '30',
            '--altyazi', 'en', '--cikti', is_dir]
    if not cerez_port:
        return calistir(args, log)
    with INDIR_KILIT:
        if BOT_DUR.is_set():
            return False
        cerez = os.path.join(os.path.dirname(is_dir), '_cookies.txt')  # yerel; Drive'a konmaz
        if not calistir([os.path.join(BURASI, 'cerez_al.py'), '--port', str(cerez_port), '--cikti', cerez], log):
            BOT_DUR.set()  # Chrome kapali ya da giris yok: kalanlari bos 'hata' ile doldurma
            raise RuntimeError(f'cerez alinamadi (Chrome {cerez_port} kapali ya da YouTube girisi yok)')
        return calistir(args + ['--cerez', cerez], log)


def kanal_ad(x):
    x = urllib.parse.unquote(x.strip())
    m = re.search(r'@([^/?\s]+)', x)
    if m:
        return '@' + m[1]
    m = re.search(r'channel/(UC[\w-]+)', x)
    if m:
        return m[1]
    m = re.search(r'watch\?v=([\w-]+)', x)
    if m:
        return 'video_' + m[1]
    return re.sub(r'[^\w@.-]+', '_', x)[:60]


def kanal_url(x):
    x = x.strip()
    if x.startswith('@'):
        return f'https://www.youtube.com/{x}/videos'
    if not x.startswith('http'):
        x = 'https://' + x
    if '/watch' in x:
        return x
    x = re.sub(r'/(videos|featured|shorts|streams)?/?(\?.*)?$', '', x)
    return x + '/videos'


def simdi():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M')


def durum_oku(klasor):
    p = os.path.join(klasor, 'durum.txt')
    if not os.path.exists(p):
        return None
    return open(p, encoding='utf-8').read().strip()


def durum_yaz(klasor, metin):
    os.makedirs(klasor, exist_ok=True)
    open(os.path.join(klasor, 'durum.txt'), 'w', encoding='utf-8').write(metin + '\n')


def calistir(args, log):
    r = subprocess.run([PY, '-I', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    log.write(f"\n$ {' '.join(args)}\n{r.stdout[-3000:]}\n{r.stderr[-2000:]}\n")
    log.flush()
    return r.returncode == 0


def isle(giris, kok, kim, etiket, notu, zorla, cerez_port=None):
    ad = kanal_ad(giris)
    hedef = os.path.join(kok, 'kanallar', ad)
    if BOT_DUR.is_set():
        return f'{ad}: atlandi (YouTube bot engeli, toplu is durduruldu)'
    d = durum_oku(hedef)
    if d and not zorla:
        if d.startswith(('bitti', 'olculdu')):
            return f'{ad}: atlandi ({d})'
        if d.startswith('isleniyor'):
            try:
                t = datetime.datetime.strptime(' '.join(d.split()[1:3]), '%Y-%m-%d %H:%M')
                if (datetime.datetime.now() - t).total_seconds() < 86400 and (d.split() + ['', '', '', ''])[3] != kim:  # tam ad (alt dize degil: polat-claude != polat-claude-pilot)
                    return f'{ad}: atlandi (baskasi isliyor: {d})'
            except ValueError:
                pass
    durum_yaz(hedef, f'isleniyor {simdi()} {kim}')
    is_dir = os.path.join(tempfile.gettempdir(), 'edit-kutuphane-is', ad.strip('@'))
    os.makedirs(is_dir, exist_ok=True)
    log = open(os.path.join(is_dir, 'islem.log'), 'a', encoding='utf-8')
    try:
        ok = indir(giris, is_dir, log, cerez_port)
        secim_p = os.path.join(is_dir, 'secim.json')
        if not ok or not os.path.exists(secim_p):
            durum_yaz(hedef, f'hata {simdi()} {kim} indirme (log: {log.name})')
            return f'{ad}: HATA indirme'
        secim = json.load(open(secim_p, encoding='utf-8'))
        ozet, uyarilar = [], []
        for v in secim:
            i = v['sira']
            mp4 = os.path.join(is_dir, f'video-{i}.mp4')
            if not os.path.exists(mp4):
                continue
            vtt = next((os.path.join(is_dir, f) for f in sorted(os.listdir(is_dir))
                        if f.startswith(f'video-{i}.') and f.endswith('.vtt')), None)
            vd = os.path.join(is_dir, f'v{i}')
            calistir([os.path.join(BURASI, 'kare_analiz.py'), mp4, *(['--vtt', vtt] if vtt else []), '--cikti', os.path.join(vd, 'ritim')], log)
            calistir([os.path.join(BURASI, 'edit_dili.py'), mp4, *(['--vtt', vtt] if vtt else []), '--cikti', os.path.join(vd, 'editdili')], log)
            if os.path.exists(os.path.join(vd, 'editdili', 'kirpintilar')):
                calistir([os.path.join(BURASI, 'font_aday.py'), os.path.join(vd, 'editdili'), '--adet', '2',
                          '--font-dir', os.path.join(kok, 'fontlar')], log)
            # yazi-ses senkronu: indirilen parca zaten ilk %30 -> tamamini olc. Video silinmeden ONCE (yeniden olcum = --zorla).
            ysd = os.path.join(vd, 'yazisenkron')
            ys_ok = calistir([os.path.join(BURASI, 'yazi_senkron.py'), mp4, *(['--kelimeler', vtt] if vtt else ['--dil', 'en']),
                              '--yuzde', '100', '--cikti', ysd], log) and os.path.exists(os.path.join(ysd, 'yazi-senkron.json'))
            if not ys_ok:
                uyarilar.append(f'video-{i} yazi-senkron olculemedi')
                log.write(f'\nUYARI video-{i}: yazi_senkron.py basarisiz; kanal islemi suruyor\n')
            hv = os.path.join(hedef, f'video-{i}')
            os.makedirs(hv, exist_ok=True)
            if ys_ok:
                for f in ('yazi-senkron.json', 'YAZI-SENKRON.md', 'yazi-senkron-ornek.jpg'):
                    if os.path.exists(os.path.join(ysd, f)):
                        shutil.copy2(os.path.join(ysd, f), os.path.join(hv, f))
            for alt in ('ritim', 'editdili'):
                if os.path.exists(os.path.join(vd, alt)):
                    shutil.copytree(os.path.join(vd, alt), os.path.join(hv, alt), dirs_exist_ok=True)
            # Video kutuphaneye KOPYALANMAZ (kullanici karari 2026-11-17: analiz edilen videolar silinir). Yeniden olcum = --zorla.
            if vtt:
                shutil.copy2(vtt, os.path.join(hv, 'altyazi.vtt'))
            ej = os.path.join(vd, 'editdili', 'edit-dili.json')
            if os.path.exists(ej):
                e = json.load(open(ej, encoding='utf-8'))
                ozet.append({'video': i, 'baslik': v.get('baslik'), 'izlenme': v.get('izlenme'), 'oran': v.get('oran'),
                             'ilk30': e['ozet'].get('ilk30'), 'gecis': e['gecis_ozet'], 'duzen': e['duzen'].get('duzen_dagilimi'),
                             'altyazi': e['yazi'].get('altyazi'), 'renk': e['renk'], 'ses': e['ses']})
                if ys_ok:
                    yo = json.load(open(os.path.join(ysd, 'yazi-senkron.json'), encoding='utf-8'))['ozet']
                    ozet[-1]['yazi_senkron'] = {k: yo.get(k) for k in ('yazi', 'sesli', 'altyazi', 'tur_dagilimi', 'kelime_kaynagi')}
        if not ozet:  # hic video olculemedi: 'olculdu' YAZMA, kanal.json'u EZME, is klasorunu (log) birak
            hata = ' '.join(str(v.get('video_hata') or v.get('meta_hata') or '') for v in secim)
            bot = 'not a bot' in hata or 'Sign in to confirm' in hata
            if bot:
                BOT_DUR.set()
            neden = 'YouTube bot engeli (IP)' if bot else 'video olculemedi'
            durum_yaz(hedef, f'hata {simdi()} {kim} {neden} (log: {log.name})')
            return f'{ad}: HATA {neden}' + (' -> toplu is DURDURULDU' if bot else '')
        for f in os.listdir(hedef):  # eski cok-videolu olcumden kalan (artik olculmeyen) video-N klasorleri: eski kodun ciktisi
            m = re.match(r'video-(\d+)$', f)
            if m and int(m[1]) > ADET:
                shutil.rmtree(os.path.join(hedef, f), ignore_errors=True)
        for f in os.listdir(hedef):
            if re.match(r'(kapak-\d+\.jpg|aciklama-\d+\.txt)$', f) and int(re.findall(r'\d+', f)[0]) > ADET:
                os.remove(os.path.join(hedef, f))
        for f in os.listdir(is_dir):
            if re.match(r'(kapak-\d+\.jpg|aciklama-\d+\.txt|secim\.(md|json))$', f) and \
                    (f.startswith('secim') or int(re.findall(r'\d+', f)[0]) <= ADET):
                shutil.copy2(os.path.join(is_dir, f), os.path.join(hedef, f))
        kj = os.path.join(hedef, 'kanal.json')
        eski = json.load(open(kj, encoding='utf-8')) if os.path.exists(kj) else {}
        eski.update({'ad': ad, 'url': kanal_url(giris), 'etiket': etiket or eski.get('etiket'), 'not': notu or eski.get('not'),
                     'olcen': kim, 'olcum_tarihi': simdi(), 'kanal_ortalama': secim[0].get('kanal_ortalama') if secim else None,
                     'videolar': ozet})
        json.dump(eski, open(kj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        durum_yaz(hedef, f'olculdu {simdi()} {kim} — EDIT-DILI.md bekliyor')
        shutil.rmtree(is_dir, ignore_errors=True)
        return f'{ad}: olculdu ({len(ozet)} video)' + (f" — UYARI {'; '.join(uyarilar)}" if uyarilar else '')
    except Exception as h:
        durum_yaz(hedef, f'hata {simdi()} {kim} {type(h).__name__}: {h}'[:300])
        return f'{ad}: HATA {h}'
    finally:
        log.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('kanal', nargs='?')
    ap.add_argument('--liste')
    ap.add_argument('--kim', required=True)
    ap.add_argument('--kok', default=None, help='kutuphane koku (varsayilan: EDIT_KUTUPHANE > betigin ust klasoru kutuphaneyse > Drive yollari)')
    ap.add_argument('--etiket')
    ap.add_argument('--not', dest='notu')
    ap.add_argument('--paralel', type=int, default=1)
    ap.add_argument('--zorla', action='store_true')
    ap.add_argument('--cerez-port', type=int, help='YouTube bot engelinde: girisli otomasyon Chrome CDP portu (or. 9334)')
    ap.add_argument('--adet', type=int, default=1, help='kanal basina video (en cok izlenen N). Varsayilan 1')
    a = ap.parse_args()
    if not a.kok:
        # Repo kopyasindan calisinca sonuc repoya (skill/youtube-video-uretim/kanallar) yazilmasin: yalniz 'kanallar/' iceren kok kabul.
        import glob as _g
        for k in [os.environ.get('EDIT_KUTUPHANE'), os.path.dirname(BURASI), r"G:\Drive'ım\edit kutuphane",
                  r"G:\My Drive\edit kutuphane", *_g.glob(r"G:\.shortcut-targets-by-id\*\edit kutuphane")]:
            if k and os.path.isdir(os.path.join(k, 'kanallar')):
                a.kok = k
                break
        else:
            sys.exit('HATA: edit kutuphanesi bulunamadi. --kok ver ya da EDIT_KUTUPHANE ayarla.')
    global ADET
    ADET = a.adet
    girisler = []
    if a.liste:
        ham = open(a.liste, 'rb').read()
        try:
            metin = ham.decode('utf-8-sig')
        except UnicodeDecodeError:  # WhatsApp/Notepad cikisi Windows-1254 olabilir
            metin = ham.decode('cp1254', errors='replace')
        for s in metin.splitlines():
            s = s.strip()
            if s and not s.startswith('#'):
                parca = s.split('\t')
                girisler.append((parca[0], parca[1] if len(parca) > 1 else a.etiket, parca[2] if len(parca) > 2 else a.notu))
    elif a.kanal:
        girisler.append((a.kanal, a.etiket, a.notu))
    else:
        ap.error('kanal ya da --liste gerekli')
    with ThreadPoolExecutor(max_workers=a.paralel) as ex:
        for r in ex.map(lambda g: isle(g[0], a.kok, a.kim, g[1], g[2], a.zorla, a.cerez_port), girisler):
            print(r, flush=True)
    print('BITTI')


if __name__ == '__main__':
    main()
