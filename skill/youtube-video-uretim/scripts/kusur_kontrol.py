#!/usr/bin/env python3
"""KUSUR KONTROLU (render sonrasi): fotosensitif flas (WCAG 2.3.1) + ses kirpilmasi + ani ses dusmesi.
Fikir kaynagi: vidbucks defects.py (MIT); kod bizim.
Kullanim:
  py kusur_kontrol.py final.mp4 [--cikti KUSUR.md]
FAIL  herhangi bir 1 sn pencerede ekranin dortte birinden buyuk bolgede > 3 flas (flas = parlaklikta >= %10'luk
      karsit iki degisim ve koyu taraf < 0,8 goreli parlaklik; kirmizi doygun flas da sayilir) — glitch / flas /
      isik-patlamasi gecisleri art arda gelince olur; nobet riski, YouTube isaretleyebilir
      ses kirpilmasi: |ornek| >= 0,999 en az 3 ardisik ornek (tepe kirpik)
UYARI ani ses dusmesi: konusma ortasinda 30 ms'den kisa tam sessizlik (kesik/dropout)
Cikis kodu: FAIL varsa 1.
"""
import argparse, os, subprocess, sys
import numpy as np
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

GW, GH = 64, 36


def fps_al(yol):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', yol], capture_output=True, text=True)
    a, b = (r.stdout.strip().strip(',').splitlines() or ['30/1'])[0].strip(',').split('/')
    return float(a) / float(b or 1)


def lineer(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def flas_say(yol):
    fps = fps_al(yol)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', yol, '-vf', f'scale={GW}:{GH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    L, R = [], []
    while True:
        b = p.stdout.read(GW * GH * 3)
        if len(b) < GW * GH * 3:
            break
        f = np.frombuffer(b, np.uint8).reshape(GH, GW, 3).astype(np.float32)
        lin = lineer(f)
        lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
        kirmizi = np.clip(lin[..., 0] - np.maximum(lin[..., 1], lin[..., 2]), 0, 1)   # doygun kirmizi
        q = []
        for y0 in (0, GH // 2):
            for x0 in (0, GW // 2):
                q.append((lum[y0:y0 + GH // 2, x0:x0 + GW // 2].mean(), kirmizi[y0:y0 + GH // 2, x0:x0 + GW // 2].mean()))
        q.append((lum[GH // 4:3 * GH // 4, GW // 4:3 * GW // 4].mean(), kirmizi[GH // 4:3 * GH // 4, GW // 4:3 * GW // 4].mean()))  # merkez
        L.append([x[0] for x in q])
        R.append([x[1] for x in q])
    p.wait()
    L, R = np.array(L), np.array(R)
    olaylar = []
    for k in range(L.shape[1] if len(L) else 0):
        for seri, esik, ad in ((L[:, k], 0.10, 'parlaklik'), (R[:, k], 0.20, 'kirmizi')):
            # karsit yonlu buyuk degisimler (tepe-cukur) — yerel ekstremumlar arasi fark
            d = np.diff(seri)
            isaret = np.sign(d)
            uc = [0] + [i for i in range(1, len(isaret)) if isaret[i] != 0 and isaret[i] != isaret[i - 1]] + [len(seri) - 1]
            gecis = []
            for a, b in zip(uc, uc[1:]):
                ust, alt = max(seri[a], seri[b]), min(seri[a], seri[b])
                if ust - alt >= esik and (ad == 'kirmizi' or alt < 0.8):
                    gecis.append(b)
            g = np.array(gecis)
            for i, t in enumerate(gecis):
                pencere = g[(g >= t) & (g < t + fps)]
                if len(pencere) >= 7:        # 7 gecis = > 3 flas (flas = iki karsit gecis)
                    olaylar.append((t / fps, len(pencere) // 2, ad, k))
                    break
    return fps, olaylar


def ses_kontrol(yol):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', yol, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True)
    x = np.frombuffer(r.stdout, np.float32)
    if not len(x):
        return [], []
    tepe = np.abs(x) >= 0.999
    kirpik = []
    if tepe.any():
        idx = np.flatnonzero(tepe)
        bas = idx[np.r_[True, np.diff(idx) > 1]]
        son = idx[np.r_[np.diff(idx) > 1, True]]
        kirpik = [(b / 48000, e - b + 1) for b, e in zip(bas, son) if e - b + 1 >= 3]
    # dropout: enerjili iki bolge arasinda < 30 ms tam sessizlik
    w = 480  # 10 ms
    n = len(x) // w
    e = np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(e)
    dus = []
    for i in range(2, n - 3):
        if db[i] < -70 and db[i - 2] > -30 and db[i + 3] > -30 and (db[i:i + 3] < -70).sum() <= 2:
            dus.append(i * 0.01)
    return kirpik, dus


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--cikti')
    a = ap.parse_args()
    fps, fl = flas_say(a.video)
    kirpik, dus = ses_kontrol(a.video)
    fail = bool(fl or kirpik)
    L = [f'# Kusur kontrolu — {os.path.basename(a.video)}', '', f"**Sonuc: {'FAIL' if fail else 'PASS'}**", '']
    bol = ['sol-ust', 'sag-ust', 'sol-alt', 'sag-alt', 'merkez']
    L += ['## Flas (WCAG 2.3.1)', ''] + ([f'- FAIL {t:.2f} sn: {n} flas/sn ({ad}, {bol[k]}) — bu gecis/vurgu dizisini seyrelt ya da flas siddetini dusur' for t, n, ad, k in fl] or ['- temiz']) + ['']
    L += ['## Ses kirpilmasi', ''] + ([f'- FAIL {t:.2f} sn: {n} ornek tepe kirpik' for t, n in kirpik[:50]] or ['- temiz']) + ['']
    L += ['## Ani ses dusmesi', ''] + ([f'- UYARI {t:.2f} sn' for t in dus[:50]] or ['- temiz']) + ['']
    cikti = a.cikti or os.path.splitext(a.video)[0] + '-KUSUR.md'
    open(cikti, 'w', encoding='utf-8').write('\n'.join(L))
    print(f"{'FAIL' if fail else 'PASS'} — flas {len(fl)}, kirpik {len(kirpik)}, dusme {len(dus)} -> {cikti}")
    sys.exit(1 if fail else 0)


if __name__ == '__main__':
    main()
