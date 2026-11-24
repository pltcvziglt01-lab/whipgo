#!/usr/bin/env python3
"""Bir videoyu 0,1 sn aralikla (10 fps) tarar: kesimler, cekim sureleri, kamera hareketi (zoom/kaydirma),
gecis tipi, parlaklik; ilk 30 sn, ilk %30 ve sonrasi icin ayri istatistik; altyaziyla kelime/cekim.
Kareler diske yazilmaz (ffmpeg borusu), yalniz kontakt sayfalari ve rapor kalir.

Kullanim:
  py kare_analiz.py video-1.mp4 [--vtt video-1.en.vtt] [--fps 10] [--cikti analiz-1]
  py kare_analiz.py --birlestir analiz-1/analiz.json analiz-2/analiz.json analiz-3/analiz.json --cikti OLCUM.md
Cikti klasoru: analiz.json, analiz.md, ilk3sn-0.1.jpg, ilk30-0.5.jpg, ilk30-cekimler.jpg,
  yuzde30-cekimler-*.jpg, sonrasi-ornek.jpg   -> sayfalari Read ile AC ve BAK.
Gerekli: ffmpeg, numpy, opencv-python-headless, pillow.
"""
import argparse, json, math, os, re, statistics, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

W, H = 320, 180
IC_ESIK = 2.5  # ic hareket esigi (0-255 ortalama fark); --ic-esik ile degistir


def ffprobe_sure(yol):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', yol],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def lufs(yol):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', yol, '-vn', '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else None


def kareler(yol, fps):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', yol, '-vf', f'fps={fps},scale={W}:{H}',
                          '-pix_fmt', 'bgr24', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    boy = W * H * 3
    while True:
        b = p.stdout.read(boy)
        if len(b) < boy:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.wait()


ORB = cv2.ORB_create(400)
BF = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)


def hareket(g0, g1):
    """iki gri kare arasi benzerlik donusumu: (olcek, dx, dy) normalize; bulunamazsa None"""
    k0, d0 = ORB.detectAndCompute(g0, None)
    k1, d1 = ORB.detectAndCompute(g1, None)
    if d0 is None or d1 is None or len(k0) < 12 or len(k1) < 12:
        return None
    m = BF.match(d0, d1)
    if len(m) < 12:
        return None
    a = np.float32([k0[x.queryIdx].pt for x in m])
    b = np.float32([k1[x.trainIdx].pt for x in m])
    M, ic = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=2.0)
    if M is None or ic is None or ic.sum() < 10:
        return None
    s = math.hypot(M[0, 0], M[1, 0])
    return s, M[0, 2] / W, M[1, 2] / H, artik(g0, g1, M)


def artik(g0, g1, M=None):
    """kuresel kamera hareketi cikarildiktan sonra kalan ic hareket (0-255). Duragan gorsel + Ken Burns ~<2,
    gercek/stok/AI video (insan, su, duman, yapraklar) belirgin sekilde yuksek."""
    if M is not None:
        g0 = cv2.warpAffine(g0, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    y0, y1, x0, x1 = int(H * .12), int(H * .88), int(W * .12), int(W * .88)
    a = cv2.GaussianBlur(g0[y0:y1, x0:x1], (3, 3), 0).astype(np.int16)
    b = cv2.GaussianBlur(g1[y0:y1, x0:x1], (3, 3), 0).astype(np.int16)
    return float(np.abs(a - b).mean())


def hist(k):
    hsv = cv2.cvtColor(k, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1], None, [32, 16], [0, 180, 0, 256])
    return cv2.normalize(h, h).flatten(), hsv


def analiz(yol, fps, vtt):
    sure = ffprobe_sure(yol)
    dt = 1.0 / fps
    jpg, skor, hds, hdist3, parlak, doygun, mot, ic, duz, keskin = [], [], [], [], [], [], [], [], [], []
    onceki = None
    hgecmis = []
    for i, k in enumerate(kareler(yol, fps)):
        h, hsv = hist(k)
        g = cv2.cvtColor(k, cv2.COLOR_BGR2GRAY)
        parlak.append(float(hsv[..., 2].mean()))
        doygun.append(float(hsv[..., 1].mean()))
        lap = np.abs(cv2.Laplacian(g, cv2.CV_16S))
        duz.append(float((lap < 3).mean()))
        keskin.append(float((lap > 60).mean()))
        jpg.append(cv2.imencode('.jpg', cv2.resize(k, (192, 108)), [cv2.IMWRITE_JPEG_QUALITY, 80])[1].tobytes())
        if onceki is None:
            skor.append(0.0); hds.append(0.0); hdist3.append(0.0); mot.append(None); ic.append(None)
        else:
            hd = cv2.compareHist(onceki[0], h, cv2.HISTCMP_BHATTACHARYYA)
            pd = float(np.abs(g.astype(np.int16) - onceki[1].astype(np.int16)).mean()) / 255.0
            skor.append(0.6 * hd + 0.4 * min(pd * 4, 1.0)); hds.append(hd)
            hdist3.append(cv2.compareHist(hgecmis[-3], h, cv2.HISTCMP_BHATTACHARYYA) if len(hgecmis) >= 3 else 0.0)
            mh = hareket(onceki[1], g)
            mot.append(mh)
            ic.append(mh[3] if mh else artik(onceki[1], g))
        onceki = (h, g)
        hgecmis.append(h)
    n = len(skor)
    if n == 0:
        sys.exit('kare okunamadi')

    # --- kesim tespiti (uyarlanir esik + yerel tepe) ---
    s = np.array(skor)
    taban = np.median(s) + 3 * (np.median(np.abs(s - np.median(s))) + 1e-3)
    esik = max(0.28, taban)
    kesim = []
    for i in range(1, n):
        sol = s[max(1, i - 2):i]
        sag = s[i + 1:i + 3]
        if s[i] >= esik and hds[i] >= 0.18 and s[i] >= (sol.max() if len(sol) else 0) and s[i] >= (sag.max() if len(sag) else 0):
            if not kesim or i - kesim[-1][0] >= 2:
                kesim.append((i, 'sert'))
    # yumusak gecis: tek karede kucuk ama 3 karede buyuk degisim
    for i in range(3, n):
        if hdist3[i] > 0.45 and s[i] < esik and all(abs(i - k[0]) > 4 for k in kesim):
            yakin = [k for k in kesim if abs(k[0] - i) <= 4]
            if not yakin:
                kesim.append((i, 'yumusak'))
    # flas / siyah kare
    for i in range(1, n - 1):
        if parlak[i] > 235 and parlak[i - 1] < 200:
            for j, k in enumerate(kesim):
                if abs(k[0] - i) <= 2:
                    kesim[j] = (k[0], 'flas')
        if parlak[i] < 12 and parlak[i - 1] > 40:
            for j, k in enumerate(kesim):
                if abs(k[0] - i) <= 3:
                    kesim[j] = (k[0], 'siyah')
    kesim.sort()

    sinir = [0] + [k[0] for k in kesim] + [n]
    tipler = ['basla'] + [k[1] for k in kesim]
    cekimler = []
    for j in range(len(sinir) - 1):
        a, b = sinir[j], sinir[j + 1]
        if b - a < 1:
            continue
        olcek, dx, dy, gecerli = 1.0, 0.0, 0.0, 0
        for i in range(a + 1, b):
            m = mot[i]
            if m:
                olcek *= m[0]; dx += m[1]; dy += m[2]; gecerli += 1
        dur = (b - a) * dt
        lz = math.log(olcek) if olcek > 0 else 0
        if gecerli < max(1, (b - a - 1) * 0.3):
            tur = 'belirsiz'
        elif lz > 0.02:
            tur = 'zoom-ici'
        elif lz < -0.02:
            tur = 'zoom-disi'
        elif abs(dx) > 0.03 or abs(dy) > 0.03:
            tur = ('kaydirma-' + ('sag' if dx < 0 else 'sol')) if abs(dx) >= abs(dy) else ('kaydirma-' + ('asagi' if dy < 0 else 'yukari'))
        else:
            tur = 'sabit'
        icler = [ic[i] for i in range(a + 2, b - 1) if ic[i] is not None]  # kesim komsulugunu at
        ic_hareket = round(statistics.median(icler), 2) if icler else None
        duz_oran = round(float(np.mean(duz[a:b])), 2)
        renk_oyna = float(np.std(doygun[a:b]))
        if ic_hareket is None:
            kaynak = 'cok-kisa'
        elif duz_oran > 0.55 and float(np.mean(keskin[a:b])) > 0.015 and ic_hareket < IC_ESIK:  # duz alan + keskin kenar = yazi/grafik (bokeh degil)
            kaynak = 'grafik/kart'
        elif ic_hareket < IC_ESIK:
            kaynak = 'duragan-gorsel'
        else:
            kaynak = 'hareketli-video'
        cekimler.append({'no': len(cekimler) + 1, 'kaynak_tahmini': kaynak, 'ic_hareket': ic_hareket, 'duz_oran': duz_oran, 'bas': round(a * dt, 2), 'bit': round(b * dt, 2), 'sure': round(dur, 2),
                         'giris': tipler[j], 'hareket': tur, 'zoom_yuzde_sn': round((olcek - 1) * 100 / dur, 2) if dur else 0,
                         'kaydirma': [round(dx, 3), round(dy, 3)],
                         'parlaklik': round(float(np.mean(parlak[a:b])), 1), 'doygunluk': round(float(np.mean(doygun[a:b])), 1),
                         'kare': a})

    kelimeler = vtt_kelimeler(vtt) if vtt else []
    for c in cekimler:
        c['kelime'] = sum(1 for t, _ in kelimeler if c['bas'] <= t < c['bit']) if kelimeler else None

    bolum = {'ilk30': (0, min(30, sure)), 'yuzde30': (0, sure * 0.3), 'sonrasi': (sure * 0.3, sure), 'tum': (0, sure)}
    ist = {}
    for ad, (b0, b1) in bolum.items():
        cs = [c for c in cekimler if c['bas'] >= b0 - 1e-6 and c['bas'] < b1]
        ist[ad] = istatistik(cs, b1 - b0, [t for t, _ in kelimeler if b0 <= t < b1] if kelimeler else None)
    return {'video': os.path.basename(yol), 'sure': round(sure, 2), 'fps_analiz': fps, 'lufs': lufs(yol),
            'kesim_esigi': round(float(esik), 3), 'istatistik': ist, 'cekimler': cekimler}, jpg


def istatistik(cs, uzunluk, kel):
    if not cs:
        return {}
    d = [c['sure'] for c in cs]
    kova = {'<1': 0, '1-2': 0, '2-3': 0, '3-5': 0, '5-8': 0, '>8': 0}
    for x in d:
        k = '<1' if x < 1 else '1-2' if x < 2 else '2-3' if x < 3 else '3-5' if x < 5 else '5-8' if x < 8 else '>8'
        kova[k] += 1
    har, gir, kay, kay_sn = {}, {}, {}, {}
    for c in cs:
        kay[c['kaynak_tahmini']] = kay.get(c['kaynak_tahmini'], 0) + 1
        kay_sn[c['kaynak_tahmini']] = round(kay_sn.get(c['kaynak_tahmini'], 0) + c['sure'], 1)
        har[c['hareket']] = har.get(c['hareket'], 0) + 1
        gir[c['giris']] = gir.get(c['giris'], 0) + 1
    r = {'cekim': len(cs), 'dakikada_kesim': round(len(cs) / uzunluk * 60, 1),
         'sure_medyan': round(statistics.median(d), 2), 'sure_ort': round(statistics.mean(d), 2),
         'sure_min': min(d), 'sure_max': max(d), 'dagilim': kova, 'hareket': har, 'gecis': gir,
         'kaynak_adet': kay, 'kaynak_yuzde_sure': {k: round(v * 100 / sum(d), 1) for k, v in kay_sn.items()},
         'zoom_hizi_medyan': round(statistics.median([abs(c['zoom_yuzde_sn']) for c in cs if c['hareket'].startswith('zoom')] or [0]), 2),
         'parlaklik_ort': round(statistics.mean(c['parlaklik'] for c in cs), 1)}
    if kel is not None:
        r['kelime_dk'] = round(len(kel) / uzunluk * 60, 1)
        r['cekim_basi_kelime'] = round(len(kel) / len(cs), 1)
    return r


def vtt_kelimeler(yol):
    """YouTube otomatik altyazisindaki <00:00:01.234><c> kelime</c> zamanlarini, yoksa ipucu basini kullanir."""
    if not yol or not os.path.exists(yol):
        return []
    metin = open(yol, encoding='utf-8', errors='replace').read()
    zt = lambda s: sum(float(x) * 60 ** i for i, x in enumerate(reversed(s.replace(',', '.').split(':'))))
    sonuc, gorulen = [], set()
    # YouTube otomatik altyazisi: her etiketli blogun ardindan ayni metnin etiketsiz (10 ms) tekrari gelir -> iki kat sayim.
    # Dosyada kelime etiketi varsa etiketsiz bloklar atlanir (HATA-BILDIRIM 2026-11-19).
    etiketli = '<c>' in metin or re.search(r'<\d\d:\d\d', metin) is not None
    for blok in re.split(r'\n\n+', metin):
        m = re.search(r'(\d[\d:.,]+)\s+-->\s+(\d[\d:.,]+)', blok)
        if not m:
            continue
        bas = zt(m.group(1))
        govde = blok[m.end():].strip()
        if '<c>' in govde or re.search(r'<\d\d:', govde):
            satir = [s for s in govde.splitlines() if '<' in s]
            for s in satir:
                ilk = re.split(r'<\d', s)[0]
                for w in ilk.split():
                    sonuc.append((bas, w))
                for t, w in re.findall(r'<(\d[\d:.]+)><c>\s*([^<]+)</c>', s):
                    sonuc.append((zt(t), w.strip()))
        elif not etiketli:
            for satir in govde.splitlines():
                satir = re.sub(r'<[^>]+>', '', satir).strip()
                if satir and (bas, satir) not in gorulen and satir not in {x[1] for x in list(gorulen)[-3:]}:
                    gorulen.add((bas, satir))
                    for w in satir.split():
                        sonuc.append((bas, w))
    sonuc.sort()
    tekil, son = [], None
    for t, w in sonuc:
        if son and abs(t - son[0]) < 0.01 and w == son[1]:
            continue
        tekil.append((t, w)); son = (t, w)
    return tekil


def font(boy):
    for f in ('arial.ttf', 'DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, boy)
        except OSError:
            continue
    return ImageFont.load_default()


def sayfa(ogeler, jpg, yol, kolon=6):
    """ogeler: [(kare_index, etiket)]"""
    if not ogeler:
        return None
    w, h, eh = 192, 108, 18
    satir = math.ceil(len(ogeler) / kolon)
    img = Image.new('RGB', (kolon * w, satir * (h + eh)), (20, 20, 20))
    d = ImageDraw.Draw(img)
    fn = font(12)
    for k, (idx, etiket) in enumerate(ogeler):
        idx = min(idx, len(jpg) - 1)
        kare = Image.open(__import__('io').BytesIO(jpg[idx]))
        x, y = (k % kolon) * w, (k // kolon) * (h + eh)
        img.paste(kare, (x, y))
        d.text((x + 3, y + h + 2), etiket, fill=(255, 220, 80), font=fn)
    img.save(yol, quality=85)
    return yol


def md_rapor(r):
    s = [f"# Kare analizi — {r['video']}", f"Sure {r['sure']} sn · analiz {r['fps_analiz']} fps (0,{int(10 / r['fps_analiz'])} sn) · LUFS {r['lufs']} · kesim esigi {r['kesim_esigi']}", '',
         '| Bolum | Cekim | Kesim/dk | Medyan sn | Ort sn | Min-Max | Kelime/dk | Kelime/cekim | Zoom %/sn |', '|---|---|---|---|---|---|---|---|---|']
    for ad in ('ilk30', 'yuzde30', 'sonrasi', 'tum'):
        x = r['istatistik'].get(ad) or {}
        if x:
            s.append(f"| {ad} | {x['cekim']} | {x['dakikada_kesim']} | {x['sure_medyan']} | {x['sure_ort']} | {x['sure_min']}-{x['sure_max']} | "
                     f"{x.get('kelime_dk', '-')} | {x.get('cekim_basi_kelime', '-')} | {x['zoom_hizi_medyan']} |")
    for ad in ('ilk30', 'yuzde30', 'sonrasi'):
        x = r['istatistik'].get(ad) or {}
        if x:
            s.append(f"\n**{ad}** sure dagilimi {x['dagilim']} · hareket {x['hareket']} · gecis {x['gecis']}"
                     f"\n  kaynak tahmini (sure %) {x['kaynak_yuzde_sure']} · adet {x['kaynak_adet']}")
    s += ['', '## Ilk 30 saniye — cekim cekim', '| # | Bas | Sure | Giris | Hareket | Zoom %/sn | Kaynak tahmini | Ic hareket | Kelime | Parlaklik |', '|---|---|---|---|---|---|---|---|---|---|']
    for c in r['cekimler']:
        if c['bas'] >= 30:
            break
        s.append(f"| {c['no']} | {c['bas']:.1f} | {c['sure']:.1f} | {c['giris']} | {c['hareket']} | {c['zoom_yuzde_sn']} | {c['kaynak_tahmini']} | {c['ic_hareket']} | {c['kelime'] if c['kelime'] is not None else '-'} | {c['parlaklik']} |")
    s += ['', 'Kaynak tahmini: duragan-gorsel = foto veya AI gorsel (+Ken Burns); hareketli-video = gercek/stok/AI video; '
          'grafik/kart = duz alanli tasarim. Foto mu AI mi, stok mu gercek mi ayrimini sayfalardan ve aciklamadan SEN yap (references/rakip-kaynak-analizi.md).',
          'Not: hareket/gecis tespiti otomatiktir; kontakt sayfalariyla gozle dogrula, icerik turunu (foto/kart/harita/sunucu/stok) sayfalardan sen yaz.']
    return '\n'.join(s) + '\n'


def birlestir(yollar, cikti):
    rs = [json.load(open(y, encoding='utf-8')) for y in yollar]
    s = ['# Rakip olcumu — birlesik hedefler', '', 'Hedef = videolarin medyani. Kurgu ve metin bu sayilara gore kurulur.', '']
    for ad in ('ilk30', 'yuzde30', 'sonrasi', 'tum'):
        s += [f'## {ad}', '| Olcu | ' + ' | '.join(r['video'] for r in rs) + ' | HEDEF |', '|---|' + '---|' * (len(rs) + 1)]
        for kt in ('duragan-gorsel', 'hareketli-video', 'grafik/kart'):
            v = [((r['istatistik'].get(ad) or {}).get('kaynak_yuzde_sure') or {}).get(kt, 0) for r in rs]
            s.append(f'| kaynak % {kt} | ' + ' | '.join(str(x) for x in v) + f' | **{round(statistics.median(v), 1)}** |')
        for k in ('cekim', 'dakikada_kesim', 'sure_medyan', 'sure_ort', 'kelime_dk', 'cekim_basi_kelime', 'zoom_hizi_medyan', 'parlaklik_ort'):
            v = [(r['istatistik'].get(ad) or {}).get(k) for r in rs]
            sayi = [x for x in v if isinstance(x, (int, float))]
            s.append(f'| {k} | ' + ' | '.join('-' if x is None else str(x) for x in v) + f" | **{round(statistics.median(sayi), 2) if sayi else '-'}** |")
        s.append('')
    s.append('LUFS: ' + ', '.join(f"{r['video']} {r['lufs']}" for r in rs))
    open(cikti, 'w', encoding='utf-8').write('\n'.join(s) + '\n')
    print('\n'.join(s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video', nargs='?')
    ap.add_argument('--vtt')
    ap.add_argument('--fps', type=float, default=10)
    ap.add_argument('--cikti')
    ap.add_argument('--birlestir', nargs='*')
    ap.add_argument('--ic-esik', type=float)
    a = ap.parse_args()
    global IC_ESIK
    if a.ic_esik:
        IC_ESIK = a.ic_esik
    if a.birlestir:
        return birlestir(a.birlestir, a.cikti or 'RAKIP-OLCUM.md')
    if not a.video:
        ap.error('video gerekli')
    if not a.vtt:
        kok = os.path.splitext(a.video)[0]
        aday = [f for f in os.listdir(os.path.dirname(os.path.abspath(a.video))) if f.startswith(os.path.basename(kok) + '.') and f.endswith('.vtt')]
        a.vtt = os.path.join(os.path.dirname(os.path.abspath(a.video)), aday[0]) if aday else None
    out = a.cikti or os.path.splitext(a.video)[0] + '-analiz'
    os.makedirs(out, exist_ok=True)
    r, jpg = analiz(a.video, a.fps, a.vtt)
    r['altyazi'] = os.path.basename(a.vtt) if a.vtt else None
    fps = a.fps
    cs = r['cekimler']
    kisa = {'zoom-ici': 'zoom+', 'zoom-disi': 'zoom-', 'kaydirma-sag': 'pan>', 'kaydirma-sol': 'pan<',
            'kaydirma-yukari': 'pan^', 'kaydirma-asagi': 'panv', 'sabit': 'sabit', 'belirsiz': '?'}
    kk = {'duragan-gorsel': 'GRS', 'hareketli-video': 'VID', 'grafik/kart': 'KRT', 'cok-kisa': '-'}
    et = lambda c: f"{c['bas']:.1f}s {c['sure']:.1f}s {kisa.get(c['hareket'], c['hareket'])} {kk[c['kaynak_tahmini']]}{'' if c['giris'] in ('sert', 'basla') else ' ' + c['giris']}"
    sayfa([(i, f'{i / fps:.1f}s') for i in range(min(int(3 * fps), len(jpg)))], jpg, os.path.join(out, 'ilk3sn-0.1.jpg'), kolon=10)
    sayfa([(int(t * fps), f'{t:.1f}s') for t in np.arange(0, min(30, r['sure']), 0.5)], jpg, os.path.join(out, 'ilk30-0.5.jpg'), kolon=10)
    sayfa([(c['kare'], et(c)) for c in cs if c['bas'] < 30], jpg, os.path.join(out, 'ilk30-cekimler.jpg'))
    y30 = [c for c in cs if c['bas'] < r['sure'] * 0.3]
    for p in range(0, len(y30), 48):
        sayfa([(c['kare'], et(c)) for c in y30[p:p + 48]], jpg, os.path.join(out, f'yuzde30-cekimler-{p // 48 + 1}.jpg'))
    sonra = [c for c in cs if c['bas'] >= r['sure'] * 0.3]
    if sonra:
        adim = max(1, len(sonra) // 36)
        sayfa([(c['kare'], et(c)) for c in sonra[::adim][:36]], jpg, os.path.join(out, 'sonrasi-ornek.jpg'))
    json.dump(r, open(os.path.join(out, 'analiz.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    md = md_rapor(r)
    open(os.path.join(out, 'analiz.md'), 'w', encoding='utf-8').write(md)
    print(md.split('## Ilk 30')[0])
    print(f'Klasor: {out}')


if __name__ == '__main__':
    main()
