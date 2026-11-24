#!/usr/bin/env python3
"""Her video teslim edildikten sonra diskte yer acar: yeniden uretilebilir ara dosyalari siler.

Kullanim:
  py video_temizle.py <video klasoru> [<baska klasor> ...] [--drive "G:/Drive'ım/money printer/<KANAL>"]
                      [--final] [--temp] [--sil]
  Varsayilan DENEME: ne silinecegini ve toplam boyutu listeler, hicbir sey silmez. --sil ile siler.

Silinenler (yeniden uretilebilir):
  ham render (*-ham.mp4, *_ham.mp4, *raw*.mp4, parca/part render), onizleme*.mp4, *-mixham.wav, kare/frames/tmp/cache
  klasorleri, __pycache__, rakip/kaynak klasorundeki indirilmis videolar (KAYNAKCA.tsv ve raporlar kalir),
  Remotion public/<vNN>/ altindaki kopya gorseller ve host videosu (asillari img/ ve heygen/ altinda duruyorsa)
--final: final mp4'u de siler; YALNIZ --drive klasorunde ayni ad ve AYNI BOYUTTA dosya gorulurse.
--temp:  %TEMP% altindaki remotion-*, react-motion-*, yt-dlp ve ffmpeg artiklarini da temizler (6 saatten eski;
         makinede calisan bir Remotion render varsa hic dokunmaz: baska oturumun render'i bozulmasin).
Kalanlar: metin.txt, vo.mp3/wav, cumleler.json, img/ (secilmis gorseller), istemler, kapaklar, raporlar, DEVAM.
"""
import argparse, fnmatch, os, shutil, sys, tempfile, time

DOSYA_DESEN = ['*-ham.mp4', '*_ham.mp4', '*-raw.mp4', '*_raw.mp4', '*-parca-*.mp4', '*_part*.mp4', 'part-*.mp4', 'onizleme*.mp4',
               '*-onizleme.mp4', '*-mixham.wav', '*.tmp', '*.part', '*.ytdl', 'concat*.txt']
KLASOR_DESEN = ['kare', 'kareler', 'frames', 'tmp', 'temp', 'cache', '.cache', '__pycache__', 'parcalar', 'parts',
                'render-tmp', 'remotion-tmp']
VIDEO_UZANTI = ('.mp4', '.mkv', '.webm', '.mov')
KAYNAK_KLASOR = ('rakip', 'rakip-analiz', 'kaynak-indir', 'indirilen', 'referans')


def boyut(yol):
    if os.path.isfile(yol):
        return os.path.getsize(yol)
    t = 0
    for k, _, fs in os.walk(yol):
        for f in fs:
            try:
                t += os.path.getsize(os.path.join(k, f))
            except OSError:
                pass
    return t


def tara(kok):
    adaylar = []
    for k, dirs, fs in os.walk(kok):
        if 'node_modules' in k.split(os.sep):
            dirs[:] = []
            continue
        for d in list(dirs):
            if d.lower() in KLASOR_DESEN:
                adaylar.append(os.path.join(k, d))
                dirs.remove(d)
        parca = [p.lower() for p in k.split(os.sep)]
        for f in fs:
            yol = os.path.join(k, f)
            if any(fnmatch.fnmatch(f.lower(), d) for d in DOSYA_DESEN):
                adaylar.append(yol)
            elif f.lower().endswith(VIDEO_UZANTI) and any(p in KAYNAK_KLASOR for p in parca):
                adaylar.append(yol)
            elif os.sep + 'public' + os.sep in yol and f.lower().endswith(('.jpg', '.png', '.mp4', '.wav', '.mp3')) \
                    and 'node_modules' not in yol:
                asil = os.path.join(kok, 'img', f)
                if os.path.exists(asil) or f.lower() in ('host.mp4',):
                    adaylar.append(yol)
    return adaylar


def finaller(kok):
    out = []
    for k, _, fs in os.walk(kok):
        if 'node_modules' in k:
            continue
        for f in fs:
            if f.lower().endswith('.mp4') and not any(fnmatch.fnmatch(f.lower(), d) for d in DOSYA_DESEN):
                out.append(os.path.join(k, f))
    return out


def remotion_calisiyor():
    import subprocess
    r = subprocess.run(['powershell', '-NoProfile', '-Command',
                        "(Get-CimInstance Win32_Process -Filter \"Name='node.exe' or Name='remotion.exe' or Name='chrome-headless-shell.exe'\" | "
                        "Where-Object { $_.CommandLine -match 'remotion' }).Count"], capture_output=True, text=True)
    try:
        return int((r.stdout or '0').strip() or 0) > 0
    except ValueError:
        return True


def temp_adaylar():
    if remotion_calisiyor():
        print('TEMP ATLANDI: su an calisan bir Remotion render var (baska oturumun olabilir); onun dosyalarina dokunulmaz')
        return []
    t = tempfile.gettempdir()
    out = []
    for f in os.listdir(t):
        yol = os.path.join(t, f)
        if f.lower().startswith(('remotion-', 'react-motion', 'yt-dlp', 'ffmpeg')) and time.time() - os.path.getmtime(yol) > 6 * 3600:
            out.append(yol)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('klasorler', nargs='+')
    ap.add_argument('--drive')
    ap.add_argument('--final', action='store_true')
    ap.add_argument('--temp', action='store_true')
    ap.add_argument('--sil', action='store_true')
    a = ap.parse_args()
    sil = []
    for k in a.klasorler:
        sil += tara(k)
        if a.final:
            if not a.drive or not os.path.isdir(a.drive):
                sys.exit('--final icin --drive klasoru gerekli (Drive\'da ayni boyut gorulmeden final silinmez)')
            for f in finaller(k):
                d = os.path.join(a.drive, os.path.basename(f))
                if os.path.exists(d) and os.path.getsize(d) == os.path.getsize(f):
                    sil.append(f)
                else:
                    print(f'KORUNDU (Drive\'da ayni boyutta yok): {f}')
    if a.temp:
        sil += temp_adaylar()
    sil = sorted(set(sil))
    toplam = 0
    for y in sil:
        b = boyut(y)
        toplam += b
        print(f'{b / 1e6:9.1f} MB  {y}')
    print(f'TOPLAM {toplam / 1e9:.2f} GB, {len(sil)} oge' + ('' if a.sil else '  (DENEME: silmek icin --sil)'))
    if not a.sil:
        return
    hata = 0
    for y in sil:
        try:
            shutil.rmtree(y) if os.path.isdir(y) else os.remove(y)
        except OSError as e:
            hata += 1
            print('silinemedi', y, e)
    print(f'SILINDI {toplam / 1e9:.2f} GB acildi' + (f', {hata} hata' if hata else ''))


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
