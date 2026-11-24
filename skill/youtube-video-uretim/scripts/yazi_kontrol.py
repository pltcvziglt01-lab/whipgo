#!/usr/bin/env python3
"""Ekrandaki yazilarin kontrolu (OCR, varsayilan 2 sn arayla, 960 px; 10 dk video ~10-15 dk, arka planda calistir; degismeyen kare yeniden okunmaz).

Kullanim:
  py yazi_kontrol.py final.mp4 [--aralik 2.0] [--bas 0 --son 0] [--plan props.json] [--cikti YAZI.md]
Gerekli: py -m pip install rapidocr  (edit_dili.py ile ayni OCR)

FAIL  yazi kadrajin kenarina degiyor/kesik (kenar payi %1)
UYARI guvenli alan disi (16:9: kenarlardan %5; 9:16 Shorts: ust %8, alt %22, sag %14 telefon arayuzu)
      ust uste binen farkli yazilar · dusuk guvenli okuma (bozuk/yarim kelime)
      yazi/zemin kontrasti: ana metin < 4,5:1, buyuk baslik (buyuk harf >= 56 px @1080p) < 3:1 (Opus galerisi A-4)
      boy kapisi (yalniz --plan ile, bizim yazimiz): tahmini buyuk harf yuksekligi 1080p'de < 24 px (telefonda okunmaz)
--plan props.json: planin kart/etiket/altyazi metinleriyle (veri.cekimler[].kart.a/b, .etiket, veri.kelimeler) o anda
      bulanik eslesen OCR kutulari "bizim yazimiz" sayilir; kenar/kesik/guvenli alan/kontrast/boy/ust uste kontrolleri (FAIL dahil)
      yalniz bunlara uygulanir. Eslesmeyen kutular KAYNAK GORUNTU yazisidir (sponsor panosu, gomulu altyazi): tek satirlik
      ozet UYARI ("kaynak goruntude N yazi"). Plan verilmezse her yazi bizimmis gibi denetlenir (eski davranis; boy kapisi yok).
Buyuk harf yuksekligi OCR kutusundan tahmin edilir: kutu ic bosluklu, olculen oran (7 font, 32-64 px) karisik harfte ~0,45,
      tumu buyuk harfte ~0,55 (sapma +-0,1; esige yakin uyarida kareyi ac).
Not: animasyon ortasinda yakalanan yarim yazi uyari uretebilir; uyarinin oldugu ani acip bak.
"""
import argparse, difflib, json, os, re, subprocess, sys
import numpy as np

KONTRAST_ANA, KONTRAST_BUYUK = 4.5, 3.0   # WCAG AA: ana metin / buyuk baslik
BUYUK_CAP = 56                            # 1080p buyuk harf yuksekligi (px) bunun ustundeyse "buyuk baslik" (~80 px font)
BOY_ENAZ_CAP = 24                         # 1080p buyuk harf yuksekligi alt siniri (px): altinda UYARI
CAP_ORAN_KARISIK, CAP_ORAN_BUYUK = 0.45, 0.55   # OCR kutu yuksekligi -> buyuk harf yuksekligi (olculdu, bkz. ust not)


def cap_tahmin(kutu, metin, h):
    """OCR kutusu (h yukseklikli karede) -> 1080p'ye olcekli tahmini buyuk harf yuksekligi (px)"""
    oran = CAP_ORAN_BUYUK if not re.search(r'[a-zà-ÿğışçöü]', metin) else CAP_ORAN_KARISIK
    return float(np.ptp(kutu[:, 1])) * 1080.0 / h * oran


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


def norm(t):
    return re.sub(r'[^0-9A-Z]', '', t.upper())


def plan_yukle(yol):
    """props.json -> [(t0, t1, [normalize metinler])]. Kart/etiket pencereleri cekim suresi, altyazi kelimeleri bas/son."""
    d = json.load(open(yol, encoding='utf-8-sig'))
    v = d.get('veri', d)
    fps = float(v.get('fps') or 30)
    oge, kare = [], 0
    for c in v.get('cekimler', []):
        t0, t1 = kare / fps, (kare + c.get('kare', 0)) / fps
        kare += c.get('kare', 0)
        m = []
        k = c.get('kart')
        if k:
            a, b = str(k.get('a') or ''), str(k.get('b') or '')
            m += [a, b, a + b]
        if c.get('etiket'):
            m.append(str(c['etiket']))
        m = [x for x in (norm(x) for x in m) if x]
        if m:
            oge.append((t0, t1, m, 1.5))
    kel = v.get('kelimeler') or []
    for i in range(len(kel)):                      # altyazi: kelime + komsu ciftleri (cok kelimeli satir olabilir); dar zaman payi
        w = [norm(str(x.get('k', ''))) for x in kel[max(0, i - 1):i + 2]]
        ms = [m for m in (w[1 if i else 0] if len(w) > 1 else w[0], ''.join(w)) if m]
        if ms:
            oge.append((kel[i].get('bas', 0), kel[i].get('son', 0), ms, 0.5))
    return oge


def bizim_mi(plan, an, metin):
    """OCR metni, an +-pay icinde aktif plan metinlerinden biriyle (kesik/bozuk okuma dahil) eslesiyor mu.
    Eslesen parca plan metninin en az yarisi olmali: kaynak panosundaki 'ETIHAD' etiketin 'MAN CITY 1-1 FULHAM - ETIHAD' parcasi sayilmaz."""
    nb = norm(metin)
    if len(nb) < 3:
        return False
    gerek = max(4, int(np.ceil(0.8 * len(nb))))
    for t0, t1, ms, pay in plan:
        if t1 < an - pay or t0 > an + pay:
            continue
        for m in ms:
            if nb in m and len(nb) >= 0.5 * len(m):
                return True
            if len(nb) >= 4:
                z = difflib.SequenceMatcher(None, nb, m, autojunk=False).find_longest_match(0, len(nb), 0, len(m)).size
                if z >= gerek and z >= 0.5 * len(m):
                    return True
    return False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--aralik', type=float, default=2.0)
    ap.add_argument('--bas', type=float, default=0)
    ap.add_argument('--son', type=float, default=0)
    ap.add_argument('--plan', help='props.json: kart/etiket metinleriyle eslesen OCR kutulari "bizim yazimiz" sayilir')
    ap.add_argument('--cikti')
    a = ap.parse_args()
    import logging
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
    plan = plan_yukle(a.plan) if a.plan else None
    sorun = {}  # (tur, metin) -> [ilk an, adet, FAIL mi]
    kaynak = {}  # plan verildiyse bizim olmayan (kaynak goruntu) yazilar: (tur, metin) -> [ilk an, adet]
    kaynak_metin = set()

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
        bizim = [plan is None or bizim_mi(plan, an, tx) for b, tx, sc in kutular]
        for (b, tx, sc), biz in zip(kutular, bizim):
            if plan is not None and not biz:
                kaynak_metin.add(norm(tx))
            ekle_ = ekle if biz else (lambda tur, an_, metin, fail=False: kaynak.setdefault((tur, metin), [an_, 0]).__setitem__(1, kaynak[(tur, metin)][1] + 1))
            x0, y0 = b.min(0)
            x1, y1 = b.max(0)
            if x0 <= 0.01 * w or y0 <= 0.01 * h or x1 >= 0.99 * w or y1 >= 0.99 * h:
                ekle_('yazi kenarda/kesik', an, tx[:40], True)
            elif x0 < guv[0] or y0 < guv[1] or x1 > guv[2] or y1 > guv[3]:
                ekle_('guvenli alan disi', an, tx[:40])
            c = kontrast(img, b)
            cap = cap_tahmin(b, tx, h)
            ke = KONTRAST_BUYUK if cap >= BUYUK_CAP else KONTRAST_ANA
            if c is not None and c < ke and (y1 - y0) > 0.025 * h:
                ekle_(f'kontrast <{ke:g}:1 ({c:.1f}:1)', an, tx[:40])
            if plan is not None and biz and cap < BOY_ENAZ_CAP and sc >= 0.6 and len(norm(tx)) >= 3:
                ekle_(f'kucuk yazi (buyuk harf ~{cap:.0f} px < {BOY_ENAZ_CAP} px @1080p)', an, tx[:40])
            if sc < 0.6 and len(tx) > 3:
                ekle_('zor okunuyor', an, tx[:40])
        for i in range(len(kutular)):
            for k in range(i + 1, len(kutular)):
                A, B = kutular[i][0], kutular[k][0]
                ix = max(0, min(A[:, 0].max(), B[:, 0].max()) - max(A[:, 0].min(), B[:, 0].min()))
                iy = max(0, min(A[:, 1].max(), B[:, 1].max()) - max(A[:, 1].min(), B[:, 1].min()))
                kc = min(np.ptp(A[:, 0]) * np.ptp(A[:, 1]), np.ptp(B[:, 0]) * np.ptp(B[:, 1])) or 1
                if ix * iy / kc > 0.2 and (plan is None or (bizim[i] and bizim[k]) or
                                           (bizim[i] != bizim[k] and (kutular[k] if bizim[i] else kutular[i])[2] >= 0.6 and
                                            len(norm((kutular[k] if bizim[i] else kutular[i])[1])) >= 4)):   # bizim yazi + kaynak yazisi cakismasi da gercek sorun (okunur kaynak yazisi)
                    ekle('ust uste yazi', an, f'{kutular[i][1][:25]} / {kutular[k][1][:25]}')
    F = [f'{v[0]:.1f} sn ({v[1]} kare): {t} "{m}"' for (t, m), v in sorun.items() if v[2]]
    U = [f'{v[0]:.1f} sn ({v[1]} kare): {t} "{m}"' for (t, m), v in sorted(sorun.items(), key=lambda x: x[1][0]) if not v[2]]
    if plan is not None:
        kt = {}
        for (t, _m) in kaynak:
            kt[t.split(' (')[0]] = kt.get(t.split(' (')[0], 0) + 1
        if kaynak_metin:
            U.append(f'kaynak goruntude {len(kaynak_metin)} yazi (sponsor/gomulu altyazi; bizim degil, denetlenmedi): ' +
                     ', '.join(f'{n} {t}' for t, n in sorted(kt.items(), key=lambda x: -x[1])))
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
