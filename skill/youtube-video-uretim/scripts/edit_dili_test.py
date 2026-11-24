#!/usr/bin/env python3
"""edit_dili.py DOGRULAMA TESTI — dogrusu bilinen sentetik video uretir, analizi calistirir, puanlar.

Video: --kaynak videodan alinmis 14 farkli kare (gercek doku) -> her biri 2,5 sn'lik klip, bilinen kamera hareketiyle
(zoom ice/disa %/sn, yatay pan, sabit) + bilinen gecislerle (ffmpeg xfade: sert, cozunme 0,5 / 0,2 sn, siyaha, beyaza,
kaydirma sola/saga, zoom gecis, wipe) + cerceveli-bulanik arka plan klibi + letterbox klibi + bilinen yazilar
(Anton fontuyla buyuk baslik, alt bantta degisen altyazi). Sonra edit_dili.py calisir ve sonuc dogru cevapla karsilastirilir.

Kullanim: py edit_dili_test.py --kaynak herhangi_video.mp4 [--cikti test-klasoru] [--font <kutuphane>/fontlar/Anton.ttf]
Cikti: TEST-SONUC.md (gecis bulma orani, tip dogrulugu, sure hatasi, kamera, duzen, OCR, font sirasi). Kalibrasyon bozulursa
(edit_dili.py degistiginde) bu test tekrar calistirilir; skor dusmemeli.
"""
import argparse, json, os, subprocess, sys
import numpy as np

BURASI = os.path.dirname(os.path.abspath(__file__))
FPS, WW, HH, D = 30, 1280, 720, 2.5

# (gecis adi ffmpeg xfade, sure sn, beklenen edit_dili tipi kokleri)
GECISLER = [
    ('kesim', 0.0, ['sert']),
    ('fade', 0.5, ['cozunme']),
    ('fadeblack', 0.6, ['siyaha_gecis']),
    ('slideleft', 0.4, ['itme_sola', 'whip_sola']),
    ('kesim', 0.0, ['sert']),
    ('fadewhite', 0.4, ['beyaz_flas', 'beyaza_gecis']),
    ('zoomin', 0.5, ['zoom_gecis_ice', 'diger_efekt']),
    ('fade', 0.2, ['cozunme']),
    ('slideright', 0.3, ['itme_saga', 'whip_saga']),
    ('wipeleft', 0.4, ['wipe_sola']),
    ('kesim', 0.0, ['sert']),
    ('fade', 0.5, ['cozunme']),
    ('kesim', 0.0, ['sert']),
]
# klip hareketleri: (tip, deger)  zoom: %/sn olcek degisimi, pan: % genislik/sn
HAREKET = [('zoom', 2.0), ('sabit', 0), ('pan', 4.0), ('zoom', -2.0), ('sabit', 0), ('zoom', 1.0), ('pan', -4.0),
           ('sabit', 0), ('zoom', 3.0), ('sabit', 0), ('inset', 0), ('letterbox', 0), ('baslik', 0), ('altyazi', 0)]


def ff(args):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-1500:])


def kareler_al(kaynak, n, cikti):
    """Kaynaktan orta parlaklikli, detayli ve birbirinden farkli n kare secer (test gecerli olsun diye)."""
    import cv2
    sure = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', kaynak],
                                capture_output=True, text=True).stdout)
    adaylar = []
    for i in range(n * 5):
        t = sure * (0.03 + 0.94 * i / (n * 5))
        y = os.path.join(cikti, f'aday{i:03d}.png')
        ff(['-ss', f'{t:.2f}', '-i', kaynak, '-frames:v', '1', '-vf', f'scale={WW * 2}:{HH * 2}', y])
        im = cv2.imread(y)
        g = cv2.cvtColor(cv2.resize(im, (320, 180)), cv2.COLOR_BGR2GRAY)
        lum, det = g.mean() / 255, cv2.Laplacian(g, cv2.CV_64F).var()
        lp = np.abs(cv2.Laplacian(g.astype(np.float32), cv2.CV_32F))
        kenar_detay = min(lp[:, :26].mean(), lp[:, -26:].mean(), lp[:18].mean(), lp[-18:].mean())
        if kenar_detay < 0.4 * lp[45:135, 100:220].mean():
            continue   # kaynak karenin kendisi cerceveli/inset ya da kenarlari bos: dogru cevap belirsiz olur
        h = cv2.calcHist([cv2.resize(im, (160, 90))], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
        adaylar.append((y, lum, det, cv2.normalize(h, h).flatten()))
    iyi = sorted([a for a in adaylar if 0.25 < a[1] < 0.75], key=lambda a: -a[2])
    secilen = []
    for a in iyi:
        if all(cv2.compareHist(a[3], b[3], cv2.HISTCMP_BHATTACHARYYA) > 0.35 for b in secilen):
            secilen.append(a)
        if len(secilen) == n:
            break
    for a in iyi:
        if len(secilen) == n:
            break
        if a not in secilen:
            secilen.append(a)
    if len(secilen) < n:
        sys.exit('kaynak videoda yeterli uygun kare yok; daha uzun/cesitli bir video ver')
    return [a[0] for a in secilen]


def klip(src, hareket, deger, y, font):
    n = int(D * FPS)
    if hareket == 'zoom':
        z0, z1 = (1.0, 1 + deger / 100 * D) if deger > 0 else (1 - deger / 100 * D, 1.0)
        vf = (f"scale={WW * 2}:{HH * 2},zoompan=z='{z0}+({z1}-{z0})*on/{n - 1}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
              f":d={n}:s={WW}x{HH}:fps={FPS}")
    elif hareket == 'pan':
        kay = abs(deger) / 100 * D * WW  # piksel
        x0, x1 = (0, kay) if deger > 0 else (kay, 0)
        vf = (f"scale={int(WW * 1.3)}:{int(HH * 1.3)},crop={WW}:{HH}:x='{x0}+({x1}-{x0})*n/{n - 1}':y=(ih-{HH})/2")
    elif hareket == 'inset':
        vf = (f"scale={WW}:{HH},split[a][b];[a]boxblur=25:5[bg];[b]scale={int(WW * 0.7)}:{int(HH * 0.7)}[fg];"
              f"[bg][fg]overlay=(W-w)/2:(H-h)/2")
    elif hareket == 'letterbox':
        vf = f"scale={WW}:{HH},drawbox=x=0:y=0:w={WW}:h={int(HH * 0.12)}:color=black:t=fill,drawbox=x=0:y={int(HH * 0.88)}:w={WW}:h={int(HH * 0.12)}:color=black:t=fill"
    elif hareket == 'baslik':
        f = font.replace('\\', '/').replace(':', '\\:')
        vf = (f"scale={WW}:{HH},drawtext=fontfile='{f}':text='HIDDEN COST':fontsize=110:fontcolor=white:"
              f"borderw=4:bordercolor=black:x=(w-tw)/2:y=(h-th)/2-40:enable='between(t\,0.3\,2.3)'")
    elif hareket == 'altyazi':
        f = font.replace('\\', '/').replace(':', '\\:')
        vf = (f"scale={WW}:{HH},drawtext=fontfile='{f}':text='EVERY WINTER':fontsize=54:fontcolor=yellow:box=1:boxcolor=black@0.8:"
              f"boxborderw=12:x=(w-tw)/2:y=h*0.80:enable='between(t\,0\,1.2)',"
              f"drawtext=fontfile='{f}':text='THE ROOF LEAKS':fontsize=54:fontcolor=yellow:box=1:boxcolor=black@0.8:"
              f"boxborderw=12:x=(w-tw)/2:y=h*0.80:enable='between(t\,1.25\,2.5)'")
    else:
        vf = f'scale={WW}:{HH}'
    giris = ['-loop', '1', '-framerate', str(FPS), '-t', str(D), '-i', src]
    if hareket in ('zoom',):
        giris = ['-i', src]
    ff([*giris, '-filter_complex' if ';' in vf else '-vf', vf, '-frames:v', str(n), '-r', str(FPS),
        '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', y])


def birlestir(klipler, cikti):
    args, fc, son, uzunluk, dogru = [], [], '[0:v]', D, []
    for i, k in enumerate(klipler):
        args += ['-i', k]
        fc.append(f'[{i}:v]settb=AVTB,setpts=PTS-STARTPTS,fps={FPS},format=yuv420p[n{i}]')
    son = '[n0]'
    for i, (ad, d, bek) in enumerate(GECISLER):
        dd = d if d > 0 else 1 / FPS
        tip = ad if d > 0 else 'fade'
        ofs = uzunluk - dd
        etiket = f'[x{i}]'
        fc.append(f"{son}[n{i + 1}]xfade=transition={tip}:duration={dd:.4f}:offset={ofs:.4f}{etiket}")
        dogru.append({'ad': ad, 'bas': round(ofs, 3), 'bit': round(ofs + dd, 3), 'sure': d, 'beklenen': bek})
        son = etiket
        uzunluk = uzunluk + D - dd
    ff([*args, '-filter_complex', ';'.join(fc), '-map', son, '-r', str(FPS), '-c:v', 'libx264', '-crf', '16',
        '-pix_fmt', 'yuv420p', cikti])
    return dogru, uzunluk


def klip_baslari(dogru):
    bas = [0.0] + [g['bit'] if g['sure'] else g['bas'] + 1 / FPS for g in dogru]
    return bas


def puanla(dogru, sonuc, toplam):
    gec = sonuc['gecisler']
    rapor, bulunan, tip_ok, sure_hata, eslesen = [], 0, 0, [], set()
    for g in dogru:
        orta = (g['bas'] + g['bit']) / 2
        tol = max(g['sure'] / 2, 0) + 3 / FPS
        aday = [x for x in gec if abs(x['ms'] / 1000 - orta) <= tol + 0.05]
        if aday:
            x = min(aday, key=lambda x: abs(x['ms'] / 1000 - orta))
            eslesen.add(id(x))
            bulunan += 1
            ok = any(x['tip'].startswith(b) for b in g['beklenen'])
            tip_ok += ok
            if g['sure']:
                sure_hata.append(abs(x['sure_ms'] / 1000 - g['sure']) * FPS)
            rapor.append(f"| {g['ad']} {g['sure']}s | {orta:.3f} | {x['tip']} | {x['ms'] / 1000:.3f} | {x['kare_sayisi']} k ({x['sure_ms']} ms) | {'OK' if ok else 'TIP YANLIS'} |")
        else:
            rapor.append(f"| {g['ad']} {g['sure']}s | {orta:.3f} | — | — | — | BULUNAMADI |")
    yanlis = [x for x in gec if id(x) not in eslesen]
    return rapor, bulunan, tip_ok, sure_hata, yanlis


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kaynak', required=True)
    ap.add_argument('--cikti', default='edit-dili-test')
    ap.add_argument('--font', default=os.path.join(os.environ.get('EDIT_KUTUPHANE', r"G:\Drive'ım\edit kutuphane"), 'fontlar', 'Anton.ttf'))
    a = ap.parse_args()
    os.makedirs(a.cikti, exist_ok=True)
    import shutil
    yerel_font = os.path.abspath(os.path.join(a.cikti, 'test-font.ttf'))   # yolda ' ya da : olmasin (drawtext kacisi)
    shutil.copy2(a.font, yerel_font)
    os.chdir(a.cikti)
    yerel_font = os.path.basename(yerel_font)
    a.cikti = '.'
    srcs = kareler_al(a.kaynak, len(HAREKET), a.cikti)
    klipler = []
    for i, ((h, v), s) in enumerate(zip(HAREKET, srcs)):
        y = os.path.join(a.cikti, f'k{i:02d}.mp4')
        klip(s, h, v, y, yerel_font)
        klipler.append(y)
    video = os.path.join(a.cikti, 'test.mp4')
    dogru, toplam = birlestir(klipler, video)
    json.dump({'gecisler': dogru, 'hareket': HAREKET, 'klip_bas': klip_baslari(dogru)},
              open(os.path.join(a.cikti, 'dogru.json'), 'w', encoding='utf-8'), indent=1)
    ed = os.path.join(a.cikti, 'editdili')
    r = subprocess.run([sys.executable, '-I', os.path.join(BURASI, 'edit_dili.py'), video, '--cikti', ed], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])
    sonuc = json.load(open(os.path.join(ed, 'edit-dili.json'), encoding='utf-8'))
    rapor, bulunan, tip_ok, sure_hata, yanlis = puanla(dogru, sonuc, toplam)
    n = len(dogru)
    s = ['# edit_dili.py dogrulama testi', '',
         f'Gecis bulma: {bulunan}/{n} · tip dogru: {tip_ok}/{n} · yanlis alarm: {len(yanlis)} · '
         f"yumusak gecis sure hatasi medyan {np.median(sure_hata) if sure_hata else 0:.1f} kare", '',
         '| dogru | merkez sn | bulunan tip | bulunan sn | sure | sonuc |', '|---|---|---|---|---|---|', *rapor, '']
    if yanlis:
        s += ['Yanlis alarmlar: ' + ', '.join(f"{x['tip']}@{x['ms'] / 1000:.2f}" for x in yanlis), '']
    # kamera hareketi: her klibin ortasindaki cekim
    bas = klip_baslari(dogru)
    s += ['## Kamera (klip ortasi)', '| klip | dogru | bulunan hareket | zoom %/sn | pan x %/sn |', '|---|---|---|---|---|']
    for i, ((h, v), b) in enumerate(zip(HAREKET, bas)):
        orta = (b + D / 2) * 1000
        c = next((c for c in sonuc['cekimler'] if c['bas_ms'] <= orta < c['bas_ms'] + c['sure_ms']), None)
        if c:
            bek = {'zoom': f'zoom {v:+}', 'pan': f'pan_x {-v:+}', 'sabit': 'sabit'}.get(h, h)
            s.append(f"| {i} | {bek} | {c['hareket']} | {c['zoom_yuzde_sn']} | {c['pan_x_yuzde_sn']} |")
    s += ['', '## Duzen (klip ortasindaki ornek)', '| klip | dogru | bulunan |', '|---|---|---|']
    dz_ok = 0
    for i, ((h, v), b) in enumerate(zip(HAREKET, bas)):
        orta = b + D / 2
        tip = next((z[2] for z in sonuc['duzen'].get('duzen_zaman', []) if z[0] <= orta < z[1]), '?')
        bek = {'inset': 'cerceveli_bulanik', 'letterbox': 'letterbox'}.get(h, 'tam_ekran')
        dz_ok += tip == bek
        s.append(f'| {i} | {bek} | {tip} |')
    s += [f'duzen dogru: {dz_ok}/{len(HAREKET)}', '',
          '## Yazi (OCR)']
    for o in sonuc.get('yazi_ogeleri', []):
        s.append(f"- {o['txt']} @ {o['bas']} sn, {o['sure_sn']} sn, boyut %{o['boyut_yuzde']}, {o['yer']}, tur {o['tur']}, renk {o['yazi_rengi']}")
    fa = subprocess.run([sys.executable, '-I', os.path.join(BURASI, 'font_aday.py'), ed, '--adet', '2',
                         '--font-dir', os.path.dirname(os.path.abspath(a.font))], capture_output=True, text=True)
    s += ['', '## Font (dogru: Anton)', '```', fa.stdout.strip(), '```']
    open(os.path.join(a.cikti, 'TEST-SONUC.md'), 'w', encoding='utf-8').write('\n'.join(s) + '\n')
    print('\n'.join(s[:4]))


if __name__ == '__main__':
    main()
