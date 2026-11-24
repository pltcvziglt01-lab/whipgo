#!/usr/bin/env python3
"""Ekrandaki yazilarin kontrolu (OCR, varsayilan 2 sn arayla, 960 px; 10 dk video ~10-15 dk, arka planda calistir; degismeyen kare yeniden okunmaz).

Kullanim:
  py yazi_kontrol.py final.mp4 [--aralik 2.0] [--bas 0 --son 0] [--cikti YAZI.md]
Gerekli: py -m pip install rapidocr  (edit_dili.py ile ayni OCR)

FAIL  yazi kadrajin kenarina degiyor/kesik (kenar payi %1)
UYARI guvenli alan disi (16:9: kenarlardan %5; 9:16 Shorts: ust %8, alt %22, sag %14 telefon arayuzu)
      ust uste binen farkli yazilar · yazi/zemin kontrasti < 3:1 · dusuk guvenli okuma (bozuk/yarim kelime)
Not: animasyon ortasinda yakalanan yarim yazi uyari uretebilir; uyarinin oldugu ani acip bak.
"""
import argparse, os, subprocess, sys
import numpy as np


def ocr_motor():
    try:
        from rapidocr import RapidOCR
        try:
            return RapidOCR(params={'Global.use_cls': False})
        except Exception:
            return RapidOCR()
    except ImportError:
        try:
            from rapidocr_onnxruntime import RapidOCR
            return RapidOCR()
        except ImportError:
            sys.exit('rapidocr yok: py -m pip install rapidocr')


def oku(motor, img):
    r = motor(img)
    if isinstance(r, tuple):
        r = r[0] or []
        return [(np.array(b), t, float(s)) for b, t, s in r]
    if r is None or r.boxes is None:
        return []
    return [(np.array(b), t, float(s)) for b, t, s in zip(r.boxes, r.txts, r.scores)]


def kare_al(yol, t, w, h):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', yol, '-frames:v', '1', '-f', 'rawvideo',
                        '-pix_fmt', 'bgr24', '-'], capture_output=True)
    if len(r.stdout) < w * h * 3:
        return None
    return np.frombuffer(r.stdout[:w * h * 3], np.uint8).reshape(h, w, 3)


def kontrast(img, kutu):
    x0, y0 = np.maximum(kutu.min(0).astype(int), 0)
    x1, y1 = kutu.max(0).astype(int)
    k = img[y0:y1, x0:x1]
    if k.size < 50:
        return None
    g = ((0.2126 * k[..., 2] + 0.7152 * k[..., 1] + 0.0722 * k[..., 0]) / 255.0).flatten()

    def lin(v):
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    acik, koyu = lin(np.percentile(g, 97)), lin(np.percentile(g, 10))
    return (acik + 0.05) / (koyu + 0.05)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--aralik', type=float, default=2.0)
    ap.add_argument('--bas', type=float, default=0)
    ap.add_argument('--son', type=float, default=0)
    ap.add_argument('--cikti')
    a = ap.parse_args()
    import json, logging
    logging.disable(logging.WARNING)
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                   'stream=width,height:format=duration', '-of', 'json', a.video],
                                  capture_output=True, text=True).stdout)
    W0, H0 = j['streams'][0]['width'], j['streams'][0]['height']
    sure = float(j['format']['duration'])
    olcek = min(1.0, 960 / max(W0, H0))
    w, h = int(W0 * olcek) // 2 * 2, int(H0 * olcek) // 2 * 2
    dikey = h > w
    guv = (0.04 * w, 0.08 * h, w - 0.14 * w, h - 0.22 * h) if dikey else (0.05 * w, 0.05 * h, 0.95 * w, 0.95 * h)
    motor = ocr_motor()
    sorun = {}  # (tur, metin) -> [ilk an, adet, FAIL mi]

    def ekle(tur, an, metin, fail=False):
        k = (tur, metin)
        if k in sorun:
            sorun[k][1] += 1
        else:
            sorun[k] = [an, 1, fail]
    son = a.son or sure
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{a.bas:.3f}', '-to', f'{son:.3f}', '-i', a.video,
                          '-vf', f'fps=1/{a.aralik},scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                         stdout=subprocess.PIPE)
    boy = w * h * 3
    sayac = ocr_say = 0
    onceki, kutular = None, []
    while True:
        veri = p.stdout.read(boy)
        if len(veri) < boy:
            break
        img = np.frombuffer(veri, np.uint8).reshape(h, w, 3)
        an = a.bas + sayac * a.aralik
        sayac += 1
        kucuk = img[::8, ::8].mean(2)
        if onceki is not None and np.abs(kucuk - onceki).mean() < 1.5:
            continue  # kare onceki OCR'dan beri degismedi: ayni sonuc
        onceki = kucuk
        ocr_say += 1
        kutular = [(b, tx.strip(), sc) for b, tx, sc in oku(motor, img) if len(tx.strip()) >= 2]
        for b, tx, sc in kutular:
            x0, y0 = b.min(0)
            x1, y1 = b.max(0)
            if x0 <= 0.01 * w or y0 <= 0.01 * h or x1 >= 0.99 * w or y1 >= 0.99 * h:
                ekle('yazi kenarda/kesik', an, tx[:40], True)
            elif x0 < guv[0] or y0 < guv[1] or x1 > guv[2] or y1 > guv[3]:
                ekle('guvenli alan disi', an, tx[:40])
            c = kontrast(img, b)
            if c is not None and c < 3.0 and (y1 - y0) > 0.025 * h:
                ekle(f'kontrast <3:1 ({c:.1f}:1)', an, tx[:40])
            if sc < 0.6 and len(tx) > 3:
                ekle('zor okunuyor', an, tx[:40])
        for i in range(len(kutular)):
            for k in range(i + 1, len(kutular)):
                A, B = kutular[i][0], kutular[k][0]
                ix = max(0, min(A[:, 0].max(), B[:, 0].max()) - max(A[:, 0].min(), B[:, 0].min()))
                iy = max(0, min(A[:, 1].max(), B[:, 1].max()) - max(A[:, 1].min(), B[:, 1].min()))
                kc = min(np.ptp(A[:, 0]) * np.ptp(A[:, 1]), np.ptp(B[:, 0]) * np.ptp(B[:, 1])) or 1
                if ix * iy / kc > 0.2:
                    ekle('ust uste yazi', an, f'{kutular[i][1][:25]} / {kutular[k][1][:25]}')
    F = [f'{v[0]:.1f} sn ({v[1]} kare): {t} "{m}"' for (t, m), v in sorun.items() if v[2]]
    U = [f'{v[0]:.1f} sn ({v[1]} kare): {t} "{m}"' for (t, m), v in sorted(sorun.items(), key=lambda x: x[1][0]) if not v[2]]
    rapor = [f'# YAZI KONTROLU: {"PASS" if not F else "FAIL"} (fail={len(F)} uyari={len(U)}; {sayac} kare, {ocr_say} OCR, {W0}x{H0})',
             'Ayni sorun ayni yazida tekrar ediyorsa tek satir (ilk an + kac karede).', '',
             '## FAIL'] + ([f'- [ ] {x}' for x in F] or ['- yok']) + ['', '## Uyari'] + ([f'- {x}' for x in U] or ['- yok'])
    cikti = a.cikti or os.path.splitext(a.video)[0] + '-YAZI.md'
    open(cikti, 'w', encoding='utf-8').write(chr(10).join(rapor) + chr(10))
    print(f'YAZI {"PASS" if not F else "FAIL"} fail={len(F)} uyari={len(U)} ({ocr_say} OCR) -> {cikti}')
    sys.exit(1 if F else 0)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
