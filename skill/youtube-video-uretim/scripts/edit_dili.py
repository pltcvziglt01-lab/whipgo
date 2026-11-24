#!/usr/bin/env python3
"""EDIT DILI cikarici — bir videonun kurgu dilini KARE KARE (videonun kendi fps'i) olcer.

kare_analiz.py ritmi olcer (0,1 sn: cekim suresi, kelime/cekim, kaynak turu).
edit_dili.py kurgunun "nasil yapildigini" olcer:
  - kesimler kare hassasiyetinde (30 fps'te 33 ms; 0,01 sn'den hassas olcum fiziksel olarak yok)
  - gecis tipi + suresi (kare ve ms): sert kesim / cozunme (crossfade) / siyaha-beyaza gecis / flas /
    kaydirma-itme / whip (bulanik hizli kaydirma) / zoom gecis / diger-efekt
  - cekim ici kamera: zoom %/sn, pan %/sn (optik akis), bulaniklik
  - DUZEN: tam ekran / cerceveli (inset) + arka plan turu (duz renk / bulanik kopya / doku) / letterbox / bolunmus ekran
  - kalici katmanlar: logo/filigran, alt bant, ilerleme cubugu, sabit cerceve (zamanla degismeyen pikseller)
  - EKRAN YAZISI (OCR): ne yazdigi, ne kadar kaldigi, nerede, boyutu (% yukseklik), yazi rengi / zemin rengi,
    altyazi mi baslik/kart mi; altyazi stili (kelime/ekran, buyuk harf orani, vurgulu kelime, kutulu mu)
  - font tespiti icin yazi kirpintilari sayfasi (font_aday.py ile adaylarla yan yana konur)
  - renk/grade: parlaklik, kontrast, doygunluk, sicaklik, vinyet, siyah-beyaz orani
  - ses: kesimlerin kacinda ses vurgusu (whoosh/hit SFX) var
Cikti: edit-dili.json, EDIT-DILI-olcum.md, edit-dili-sayfa.jpg (<=1920 px, tek bakista edit dili),
       gecis-seritleri.jpg, yazi-kirpinti.jpg, kalici-katman.jpg

Kullanim:
  py edit_dili.py video.mp4 [--vtt video.en.vtt] [--bas 0] [--sure 0] [--cikti klasor] [--ocr-fps 2] [--ocr-yok]
Gerekli: ffmpeg/ffprobe, numpy, opencv-python, pillow; OCR icin `py -m pip install rapidocr` (yoksa OCR atlanir).
"""
import argparse, json, math, os, re, statistics, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

W, H = 192, 108      # analiz cozunurlugu
SW, SH = 96, 54      # akis / fark cozunurlugu


def ffprobe(yol):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=avg_frame_rate,r_frame_rate,width,height:format=duration', '-of', 'json', yol],
                       capture_output=True, text=True)
    d = json.loads(r.stdout)
    s = d['streams'][0]
    def oran(x):
        a, b = x.split('/')
        return float(a) / float(b) if float(b) else 0
    fps = oran(s.get('avg_frame_rate', '0/1')) or oran(s.get('r_frame_rate', '30/1'))
    return fps, float(d['format']['duration']), s.get('width'), s.get('height')


def kare_akisi(yol, bas, sure, w, h, fps=None):
    vf = f'scale={w}:{h}:flags=area,format=rgb24'
    if fps:
        vf = f'fps={fps},' + vf
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(bas)] + (['-t', str(sure)] if sure else []) + \
          ['-i', yol, '-vf', vf, '-fps_mode', 'passthrough' if not fps else 'cfr', '-f', 'rawvideo', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=10 ** 7)
    n = w * h * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)
    p.wait()


def hist(k):
    hsv = cv2.cvtColor(k, cv2.COLOR_RGB2HSV)
    h = cv2.calcHist([hsv], [0, 1, 2], None, [12, 4, 4], [0, 180, 0, 256, 0, 256])
    return cv2.normalize(h, h).flatten()


def hd(a, b):
    return float(cv2.compareHist(a, b, cv2.HISTCMP_BHATTACHARYYA))


# ---------------------------------------------------------------- 1. kare kare tarama
def tara(yol, bas, sure, fps):
    K, D, HS, LUM, SAT, KES = [], [0.0], [], [], [], []
    onceki = None
    for k in kare_akisi(yol, bas, sure, W, H):
        kk = cv2.resize(k, (SW, SH), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(kk, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(kk, cv2.COLOR_RGB2HSV)
        K.append(kk)
        HS.append(hist(kk))
        LUM.append(float(g.mean()) / 255)
        SAT.append(float(hsv[..., 1].mean()) / 255)
        KES.append(float(cv2.Laplacian(cv2.cvtColor(k, cv2.COLOR_RGB2GRAY), cv2.CV_64F).var()))
        if onceki is not None:
            D.append(float(np.abs(kk.astype(np.int16) - onceki.astype(np.int16)).mean()) / 255)
        onceki = kk
    return K, np.array(D), HS, np.array(LUM), np.array(SAT), np.array(KES)


def yapi_benzer(a, b):
    """Iki karenin kenar (gradyan buyuklugu) haritalarinin korelasyonu: isiktan/renkten bagimsiz sahne yapisi benzerligi."""
    def g(x):
        x = cv2.cvtColor(x, cv2.COLOR_RGB2GRAY).astype(np.float32) if x.ndim == 3 else x.astype(np.float32)
        m = cv2.magnitude(cv2.Sobel(x, cv2.CV_32F, 1, 0), cv2.Sobel(x, cv2.CV_32F, 0, 1)).ravel()
        return (m - m.mean()) / (m.std() + 1e-6)
    return float(np.mean(g(a) * g(b)))


def blok_kesimleri(K, D, GY=6, GX=8, taban=0.018, oran=0.3):
    """Bloklara bolunmus kare farkindan sert kesim adaylari (kalici katman/karanlik sahne icin)."""
    n = len(K)
    if n < 60:
        return []
    sh, sw = K[0].shape[0] // GY, K[0].shape[1] // GX
    BD = np.zeros((n, GY * GX), np.float32)
    for i in range(1, n):
        d = np.abs(K[i].astype(np.int16) - K[i - 1].astype(np.int16)).mean(2)[:sh * GY, :sw * GX]
        BD[i] = d.reshape(GY, sh, GX, sw).mean((1, 3)).ravel() / 255
    # her karede blok basina yerel taban (cevre +-6 kare, kendisi ve komsulari haric)
    YER = np.zeros_like(BD)
    for i in range(1, n):
        a, b = max(1, i - 6), min(n, i + 7)
        YER[i] = np.median(np.concatenate([BD[a:i - 1], BD[i + 2:b]]), axis=0)
    SP = (BD > np.maximum(0.035, 4 * YER)).sum(0)          # blok basina sicrama sayisi
    aktif = SP >= 3                                          # hic degismeyen (portre, logo) bloklar disarida
    if aktif.sum() < 6:
        return []
    canli = aktif & (SP <= 3 * np.median(SP[aktif]))       # altyazi/ses dalgasi gibi surekli sicrayanlar disarida
    if canli.sum() < 6:
        return []
    BUY = (BD > np.maximum(taban, 4 * YER)) & canli
    B = BUY.sum(1) / canli.sum()
    sonuc = []
    for i in range(2, n - 1):
        komsu = max(D[i - 1], D[i + 1])
        if B[i] >= oran and B[i] > 2 * max(B[i - 1], B[i + 1]) and D[i] > 1.5 * komsu:
            # degisen bloklarin renk dagilimi de degismeli; yapi da cok benzerse daha cok degismeli
            # (ayni cekimde isik/kamera sicramasi degil). Olcum 2026-11-18: Billy gercek kesimler hist>=0,32;
            # Explorist ayni-cekim sicramalari hist<=0,33 ve yapi>=0,6.
            m = np.kron(BUY[i].reshape(GY, GX), np.ones((sh, sw), bool))
            hm = _hist_maskeli(K[i - 1], K[i], m)
            yb = _yapi_maskeli(K[i - 1], K[i], m)
            # ya da yapi tamamen degisti ve canli bloklarin cogu sicradi (karanlik/gri iki sahne: renk farki az)
            if (hm >= 0.3 and not (hm < 0.4 and yb > 0.8)) or (yb < 0.15 and B[i] >= 0.6):
                sonuc.append(i)
    return sonuc


def _hist_maskeli(a, b, m):
    mm = m.astype(np.uint8)
    def h(x):
        hsv = cv2.cvtColor(x[:m.shape[0], :m.shape[1]], cv2.COLOR_RGB2HSV)
        q = cv2.calcHist([hsv], [0, 1, 2], mm, [12, 4, 4], [0, 180, 0, 256, 0, 256])
        return cv2.normalize(q, q).flatten()
    return hd(h(a), h(b))


def _yapi_maskeli(a, b, m):
    def g(x):
        x = cv2.cvtColor(x, cv2.COLOR_RGB2GRAY).astype(np.float32)[:m.shape[0], :m.shape[1]]
        v = cv2.magnitude(cv2.Sobel(x, cv2.CV_32F, 1, 0), cv2.Sobel(x, cv2.CV_32F, 0, 1))[m]
        return (v - v.mean()) / (v.std() + 1e-6)
    return float(np.mean(g(a) * g(b)))


def gecisler(K, D, HS, LUM, KES, fps):
    """1) sert kesim: tek karelik tepe; 2) parlaklik vadisi/tepesi (siyaha/beyaza gecis) ayri aranir;
    3) yumusak gecis kosulari; her yumusak gecis MODEL UYDURARAK siniflanir (gecis_sinifla)."""
    n = len(K)
    if n < 3:
        return []
    med = float(np.median(D)) or 0.003
    sonuc, sert = [], set()
    for i in range(1, n):
        cevre = np.concatenate([D[max(1, i - 6):i - 1], D[i + 2:i + 7]]) if n > 8 else D
        yerel = float(np.median(cevre)) if len(cevre) else med
        komsu = max(D[i - 1] if i > 1 else 0, D[i + 1] if i + 1 < n else 0)
        h_i = hd(HS[i - 1], HS[i])
        # renk dagilimi farkli sahne (h>0.28) YA DA renkleri benzer iki sahne arasinda cok izole sicrama
        if D[i] > max(0.06, 4 * yerel) and D[i] > 2.0 * komsu and (h_i > 0.28 or (D[i] > 0.08 and D[i] > 8 * max(yerel, 0.002) and D[i] > 4 * komsu)):
            if i - 1 in sert and D[i - 1] >= D[i]:
                continue
            sert.discard(i - 1)
            sert.add(i)
    # BUYUK KALICI KATMANLI videolar (portre/logo/yazi kareyi kaplar, yalniz arka plan kesilir; ya da iki karanlik sahne):
    # tum-kare farki kucuk kalir. Blok bazli ikinci kosul: altyazi/dalga gibi surekli degisen ve hic degismeyen bloklar
    # atilir, kalan "canli" bloklarin >=%30'u ayni karede ani sicrarsa sert kesim (2026-11-18 @TheBillyGrahamLegacy-x1m:
    # 600 sn'de 1 kesim -> ~28; gozle dogrulandi).
    for i in blok_kesimleri(K, D):
        if i in sert or (i - 1) in sert or (i + 1) in sert:
            continue
        sert.add(i)
    # parlaklik vadileri: iki yani da belirgin daha parlak olan siyah an (siyaha gecis) / beyaz an (beyaza gecis)
    kullanildi = np.zeros(n, bool)
    # karanlik videoda (medyan parlaklik < 0,2) esikler oranla kuculur: 2026-11-18 @dayonefilmsofficial (medyan 0,053)
    # siyaha kesim + siyahtan acilmalar hic bulunmuyordu. Medyan >= 0,2 ise esikler eskisiyle ayni.
    olc = min(1.0, float(np.median(LUM)) / 0.2)
    for tur, kosul in (('siyah', LUM < max(0.012, 0.07 * olc)), ('beyaz', LUM > 0.92)):
        adim = 0.004 * olc if tur == 'siyah' else 0.004
        i = 0
        while i < n:
            if not kosul[i]:
                i += 1
                continue
            j = i
            while j + 1 < n and kosul[j + 1]:
                j += 1
            # vadinin iki yanina, parlaklik degisimi durana kadar genislet
            a, b = i, j
            # karanlik videoda yavas acilma + kopya kareler (24->30 fps): 2 kare arayla da bak
            def degisiyor(x, y, z):
                return abs(LUM[x] - LUM[y]) > adim or (olc < 1 and 0 <= z < n and abs(LUM[z] - LUM[y]) > 1.5 * adim)
            while a > 0 and degisiyor(a - 1, a, a - 2) and a > i - int(fps * 1.5):
                a -= 1
            while b < n - 1 and degisiyor(b + 1, b, b + 2) and b < j + int(fps * 1.5):
                b += 1
            uzun = j - i + 1
            fark = (min(LUM[a], LUM[b]) - (LUM[i:j + 1].mean() if olc >= 1 else LUM[i:j + 1].min())) if tur == 'siyah' else (LUM[i:j + 1].mean() - max(LUM[a], LUM[b]))
            if fark > (0.08 * olc if tur == 'siyah' else 0.08) and uzun <= fps * 2 and a > 0 and b < n - 1:
                L = b - a
                tip = 'siyaha_gecis' if tur == 'siyah' else ('beyaz_flas' if L <= 8 else 'beyaza_gecis')
                sonuc.append({'kare': (a + b) // 2, 'bas_kare': a + 1, 'bit_kare': b, 'kare_sayisi': L, 'tip': tip,
                              'model_artik': None, 'sahne_degisti': bool(hd(HS[a], HS[b]) > 0.25)})
                kullanildi[a:b + 1] = True
            i = j + 1
    for i in list(sert):
        if kullanildi[i]:
            sert.discard(i)
    # yumusak gecis adaylari. D2: tekrarlanan kareler (24->30 fps donusumu) komsularla doldurulur, kosu kopmasin
    esik = max(0.010, 2.5 * med)
    D2 = D.copy()
    for i in range(1, n - 1):
        if D[i] < 0.0015:
            D2[i] = min(D[i - 1], D[i + 1])
    ust = (D2 > esik) & ~kullanildi

    def aday(P, Q):
        if Q - P < 3 or P < 0 or Q >= n or kullanildi[P:Q + 1].any():
            return
        fark = float(np.abs(K[P].astype(np.int16) - K[Q].astype(np.int16)).mean())
        if not (hd(HS[P], HS[Q]) > 0.18 and fark > 18):
            return
        # Ayni sahne + yalniz isik/renk degisimi (polis lambasi, flas yanip sonmesi, renk dongusu): P ve Q'nun kenar yapisi
        # neredeyse ayni. Bu gecis degildir (2026-11-17 @Explorist: pembe/mavi lamba 'cozunme' ve 3,9 sn 'glitch' sayilmisti).
        # olcum: gercek gecislerde (sentetik test) <=0,06; ayni cekimde isik degisimi ~0,7 -> esik 0,5
        if yapi_benzer(K[P], K[Q]) > 0.5:
            return
        g = gecis_sinifla(K, KES, P, Q)
        if g:
            sonuc.append(g)
            kullanildi[P:Q + 1] = True

    i = 1
    while i < n:
        if not (ust[i] and i not in sert):
            i += 1
            continue
        j = i
        while j + 1 < n and ust[j + 1] and (j + 1) not in sert:
            j += 1
        L = j - i + 1
        if 3 <= L <= 45:
            aday(i - 1, j)
        elif L > 45:
            # uzun hareketli bolum (pan/zoom cekimi) icinde, tabanin belirgin ustune cikan patlamalar = gecis adayi
            seg = D2[i:j + 1]
            taban = float(np.percentile(seg, 30))
            pes = max(1.6 * taban, taban + 0.006)
            k = 0
            while k < len(seg):
                if seg[k] > pes:
                    m = k
                    while m + 1 < len(seg) and seg[m + 1] > pes:
                        m += 1
                    if 3 <= m - k + 1 <= 45:
                        aday(i + k - 1, i + m)
                    k = m + 1
                else:
                    k += 1
        i = j + 1
    for i in sorted(sert):
        if kullanildi[i]:
            continue
        tip = 'sert'
        if i + 2 < n and LUM[i] - max(LUM[i - 1], LUM[min(n - 1, i + 4)]) > 0.25:
            tip = 'flas_kesim'
        sonuc.append({'kare': i, 'bas_kare': i, 'bit_kare': i, 'kare_sayisi': 1, 'tip': tip})
    sonuc.sort(key=lambda g: g['kare'])
    temiz = []
    for g in sonuc:
        if temiz and g['bas_kare'] <= temiz[-1]['bit_kare']:
            continue
        temiz.append(g)
    # birbirine 8 kareden yakin gecisler TEK bilesik gecistir (glitch, isik patlamasi...): aradaki parcalar cekim degil
    birlesik = []
    for g in temiz:
        if birlesik and g['bas_kare'] - birlesik[-1]['bit_kare'] <= 8 and not (g['tip'] == 'sert' and birlesik[-1]['tip'] == 'sert'
                                                                             and g['bas_kare'] - birlesik[-1]['bit_kare'] > 3):
            o = birlesik[-1]
            o.setdefault('parcalar', [o['tip']]).append(g['tip'])
            o['bit_kare'] = g['bit_kare']
            o['kare_sayisi'] = o['bit_kare'] - o['bas_kare'] + 1
            o['kare'] = (o['bas_kare'] + o['bit_kare']) // 2
            continue
        birlesik.append(dict(g))
    for g in birlesik:
        if 'parcalar' in g:
            p = g['parcalar']
            tur = sorted(set(p), key=p.index)
            if len(tur) == 1 and tur[0] != 'sert':
                g['tip'] = tur[0]          # ayni gecisin parcalari
            elif any(x.startswith('siyaha') for x in tur):
                g['tip'] = 'siyaha_gecis'
            elif any('flas' in x or 'beyaz' in x for x in tur):
                g['tip'] = 'bilesik_isik/flas'
            elif 'diger_efekt' in tur or len(p) >= 3:
                g['tip'] = 'bilesik_glitch/efekt'
            else:
                g['tip'] = 'bilesik_' + '+'.join(tur)
    for g in birlesik:
        g['ms'] = round(g['kare'] / fps * 1000)
        g['sure_ms'] = round(g['kare_sayisi'] / fps * 1000)
    return birlesik


def _kaydir_modelleri(f, P, Q):
    """Itme (push), ortme (cover), acma (uncover), silme (wipe) modelleri; 4 yon; en iyi kayma miktari.
    Donus: {model_adi: (artik, kayma_orani)}"""
    sonuc = {}
    for eksen in (1, 0):  # 1 = yatay (sutun), 0 = dikey (satir)
        N = f.shape[eksen]
        best = {}
        for s in range(1, N):
            def dil(X, a, b):
                return X[:, a:b] if eksen == 1 else X[a:b]
            adaylar = {
                # icerik sola/yukari gider, yeni goruntu sagdan/alttan girer
                'itme_sola': (dil(P, s, N), dil(Q, 0, s)),
                'itme_saga': (dil(Q, N - s, N), dil(P, 0, N - s)),
                'ortu_sola': (dil(P, 0, N - s), dil(Q, 0, s)),
                'ortu_saga': (dil(Q, N - s, N), dil(P, s, N)),
                'wipe_sola': (dil(P, 0, N - s), dil(Q, N - s, N)),
                'wipe_saga': (dil(Q, 0, s), dil(P, s, N)),
            }
            for ad, (sol, sag) in adaylar.items():
                tahmin = np.concatenate([sol, sag], axis=eksen)
                e = float(np.abs(f - tahmin).mean())
                if ad not in best or e < best[ad][0]:
                    best[ad] = (e, s / N)
        for ad, v in best.items():
            if eksen == 0:
                ad = ad.replace('sola', 'yukari').replace('saga', 'asagi')
            sonuc[ad] = v
    return sonuc


def _zoom(X, z):
    h, w = X.shape[:2]
    if z >= 1:
        cw, ch = int(round(w / z)), int(round(h / z))
        x0, y0 = (w - cw) // 2, (h - ch) // 2
        return cv2.resize(X[y0:y0 + ch, x0:x0 + cw], (w, h), interpolation=cv2.INTER_LINEAR)
    k = cv2.resize(X, (max(1, int(w * z)), max(1, int(h * z))), interpolation=cv2.INTER_AREA)
    out = np.zeros_like(X)
    y0, x0 = (h - k.shape[0]) // 2, (w - k.shape[1]) // 2
    out[y0:y0 + k.shape[0], x0:x0 + k.shape[1]] = k
    return out


def _karisim(f, A, B, C=None):
    """f ~ a*A + b*B (+ (1-a-b)*C); en kucuk kareler, sinirli. Donus (artik, a, b)."""
    if C is None:
        M = np.stack([A.ravel(), B.ravel()], 1)
        y = f.ravel()
    else:
        M = np.stack([(A - C).ravel(), (B - C).ravel()], 1)
        y = (f - C).ravel()
    x, *_ = np.linalg.lstsq(M, y, rcond=None)
    a, b = float(np.clip(x[0], 0, 1.2)), float(np.clip(x[1], 0, 1.2))
    t = a * A + b * B + ((1 - a - b) * C if C is not None else 0)
    return float(np.abs(f - t).mean()), a, b


def gecis_sinifla(K, KES, P, Q):
    """Ara karelere modelleri uydurur, en dusuk artikli modeli secer. Artik, |P-Q| ortalamasina bolunur (0 = kusursuz)."""
    A, B = K[P].astype(np.float32), K[Q].astype(np.float32)
    olcek = float(np.abs(A - B).mean()) or 1.0
    ara = [K[k].astype(np.float32) for k in range(P + 1, Q)]
    if not ara:
        return None
    siyah, beyaz = np.zeros_like(A), np.full_like(A, 255)
    puan = {}
    diz = {'cozunme': [], 'siyah': [], 'beyaz': [], 'zoom_ice': [], 'zoom_disa': []}
    kay = {}
    for f in ara:
        e, a, b = _karisim(f, A, B)
        diz['cozunme'].append((e if abs(a + b - 1) < 0.15 else e * 1.5, a))
        e2, a2, b2 = _karisim(f, A, B, siyah)
        diz['siyah'].append((e2, a2 + b2))
        e3, a3, b3 = _karisim(f, A, B, beyaz)
        diz['beyaz'].append((e3, a3 + b3))
        en_i, en_d = 1e9, 1e9
        for z in (1.05, 1.12, 1.2, 1.35, 1.5, 1.8, 2.2):
            en_i = min(en_i, _karisim(f, _zoom(A, z), B)[0], _karisim(f, A, _zoom(B, z))[0])
            en_d = min(en_d, _karisim(f, _zoom(A, 1 / z), B)[0], _karisim(f, A, _zoom(B, 1 / z))[0])
        diz['zoom_ice'].append((en_i, 0))
        diz['zoom_disa'].append((en_d, 0))
        for ad, (e4, s) in _kaydir_modelleri(f, A, B).items():
            kay.setdefault(ad, []).append((e4, s))
    for ad, l in diz.items():
        puan[ad] = statistics.median(x[0] for x in l) / olcek
    for ad, l in kay.items():
        ss = [x[1] for x in l]
        artan = sum(1 for x, y in zip(ss, ss[1:]) if y >= x - 0.02) >= 0.8 * max(1, len(ss) - 1)
        puan[ad] = statistics.median(x[0] for x in l) / olcek * (1 if artan else 1.6)
        # Kaydirma (itme/ortu/wipe) ancak sinir cizgisi ara karelerde GERCEKTEN ilerliyorsa: kayma orani genis bir
        # araliga yayilir ve karelerin cogunda iki goruntu de gorunur. Cekim ici kamera/nesne hareketi (el kamerasi,
        # kadraja giren el/sise) bu modellere 0,2-0,55 artikla 'uyar' ama kayma orani bir yerde takili kalir.
        # (2026-11-17 gercek video gozle kontrol: 12 nadir etiketin 9'u bu yuzden yanlisti; gercek kaydirma artik 0,15)
        orta = sum(1 for s in ss if 0.08 < s < 0.92) / max(1, len(ss))
        # kisa parca (<=5 ara kare, or. uzun bir wipe'in kuyrugu) cok iyi uyuyorsa (<=0,1) yayilma sarti aranmaz
        kisa_iyi = len(ss) <= 5 and puan[ad] <= 0.1
        if puan[ad] > 0.25 or (not kisa_iyi and ((max(ss) - min(ss)) < 0.4 or orta < 0.5)):
            puan[ad] += 1
    # siyah/beyaz model ancak gercekten koyulasma/aydinlanma varsa (a+b belirgin < 1)
    if min(x[1] for x in diz['siyah']) > 0.8:
        puan['siyah'] += 1
    if min(x[1] for x in diz['beyaz']) > 0.8:
        puan['beyaz'] += 1
    # zoom ve cozunme ayni artikta ise basit olan (cozunme) kazanir
    puan['zoom_ice'] *= 1.15
    puan['zoom_disa'] *= 1.15
    en = min(puan, key=puan.get)
    artik = puan[en]
    L = Q - P
    if artik > 0.35:
        # hicbir modele iyi uymuyor (sentetik gercek gecisler <0,1; 2026-11-17 gercek videoda 0,40-0,53 artikli
        # 'cozunme'lerin hepsi el kamerasi/nesne hareketiydi):
        # tek bir kare P->Q degisiminin cogunu tasiyorsa = sert kesim + kamera hareketi
        dk = [float(np.abs(K[k].astype(np.int16) - K[k - 1].astype(np.int16)).mean()) for k in range(P + 1, Q + 1)]
        j = int(np.argmax(dk))
        if dk[j] >= 0.6 * float(np.abs(A - B).mean()) and dk[j] >= 2.5 * float(np.median(dk)):
            k = P + 1 + j
            return {'kare': k, 'bas_kare': k, 'bit_kare': k, 'kare_sayisi': 1, 'tip': 'sert'}
        # ayni sahne: gecis degil, cekim ici hizli kamera/nesne hareketi; farkli sahne: taninmayan efekt (glitch, isik, 3B)
        if hd(hist(K[P]), hist(K[Q])) < 0.35 and L > 6:
            return None
        if artik <= 0.55:
            ad_map0 = {'cozunme': 'cozunme', 'zoom_ice': 'zoom_gecis_ice', 'zoom_disa': 'zoom_gecis_disa'}
            # 0,35-0,55 arasi ve farkli sahne: model adi korunur ama belirsiz isaretlenir
            return {'kare': (P + Q) // 2, 'bas_kare': P + 1, 'bit_kare': Q, 'kare_sayisi': L,
                    'tip': ad_map0.get(en, 'diger_efekt'), 'belirsiz': True,
                    'model_artik': round(artik, 3), 'ikinci': sorted(puan, key=puan.get)[1]}
        tip = 'diger_efekt'
    else:
        ad_map = {'cozunme': 'cozunme', 'siyah': 'siyaha_gecis', 'beyaz': 'beyaza_gecis' if L > 8 else 'beyaz_flas',
                  'zoom_ice': 'zoom_gecis_ice', 'zoom_disa': 'zoom_gecis_disa'}
        tip = ad_map.get(en, en)
        if tip.startswith('itme_'):
            kes_dus = float(np.median(KES[P + 1:Q])) / (max(KES[P], KES[Q]) + 1e-6)
            if kes_dus < 0.45:
                tip = tip.replace('itme_', 'whip_')
    return {'kare': (P + Q) // 2, 'bas_kare': P + 1, 'bit_kare': Q, 'kare_sayisi': L, 'tip': tip,
            'model_artik': round(artik, 3), 'ikinci': sorted(puan, key=puan.get)[1]}


def cekimler(gec, n, fps, LUM, SAT, KES, bas):
    sinir = [0] + [g['kare'] for g in gec] + [n]
    cs = []
    for a, b in zip(sinir, sinir[1:]):
        if b - a < 2:
            continue
        dur = (b - a) / fps
        giris = next((g for g in gec if g['kare'] == a), None)
        cikis = next((g for g in gec if g['kare'] == b), None)
        ic_a = giris['bit_kare'] + 1 if giris else a
        ic_b = cikis['bas_kare'] - 1 if cikis else b
        cs.append({'no': len(cs) + 1, 'ic_bas_kare': ic_a, 'ic_bit_kare': max(ic_a, ic_b), 'bas_ms': round((a / fps + bas) * 1000), 'sure_ms': round(dur * 1000),
                   'bas_kare': a, 'bit_kare': b, 'giris': giris['tip'] if giris else ('ilk' if a == 0 else '?'),
                   'giris_kare': giris['kare_sayisi'] if giris else 0, 'hareket': '?',
                   'zoom_yuzde_sn': None, 'pan_x_yuzde_sn': None, 'pan_y_yuzde_sn': None,
                   'parlaklik': round(float(LUM[a:b].mean()), 3),
                   'doygunluk': round(float(SAT[a:b].mean()), 3), 'keskinlik': round(float(np.median(KES[a:b])), 1)})
    return cs


def kamera_olc(yol, bas, sure, cs, fps, ornek_fps=4, KW=640, KH=360):
    """Cekim ici kamera hareketi: 640 px'te ORB + RANSAC benzerlik donusumu, 0,25 sn arayla, cekim icinde zincirlenir.
    zoom %/sn = olcek degisimi (ice +), pan %/sn = icerigin ekran genisligine gore kaymasi (sola -, saga +)."""
    orb = cv2.ORB_create(1500, fastThreshold=12)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    ozler = []
    for k in kare_akisi(yol, bas, sure, KW, KH, fps=ornek_fps):
        g = cv2.cvtColor(k, cv2.COLOR_RGB2GRAY)
        ozler.append(orb.detectAndCompute(g, None))
    merkez = np.array([KW / 2, KH / 2])

    def donusum(i, j):
        (k1, d1), (k2, d2) = ozler[i], ozler[j]
        if d1 is None or d2 is None or len(k1) < 12 or len(k2) < 12:
            return None
        es = [m for m, n2 in (p for p in bf.knnMatch(d1, d2, k=2) if len(p) == 2) if m.distance < 0.75 * n2.distance]
        if len(es) < 12:
            return None
        a = np.float32([k1[m.queryIdx].pt for m in es])
        b = np.float32([k2[m.trainIdx].pt for m in es])
        M, ic = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=1.5, maxIters=3000)
        if M is None or ic is None or ic.sum() < 10:
            return None
        olc = math.hypot(M[0, 0], M[1, 0])
        if not (0.5 < olc < 2.0) or not np.isfinite(M).all():
            return None   # dejenere donusum (az/tek duze ozellik)
        yeni = M[:, :2] @ merkez + M[:, 2]
        return math.log(olc), (yeni[0] - merkez[0]) / KW, (yeni[1] - merkez[1]) / KH, float(ic.sum()) / len(es)

    for c in cs:
        t0, t1 = c['ic_bas_kare'] / fps + 0.05, c['ic_bit_kare'] / fps - 0.05
        idx = [i for i in range(len(ozler)) if t0 <= i / ornek_fps <= t1]
        if len(idx) < 3:
            c['hareket'] = 'kisa'
            continue
        # uzun taban: her capa kareyi 0,5-1,0 sn sonraki karelerle esle; egim = degisim / sure; medyan al
        egim_z, egim_x, egim_y, guven = [], [], [], []
        adim = max(1, int(ornek_fps * 0.5))
        for ii, i in enumerate(idx):
            for j in idx[ii + adim: ii + int(ornek_fps) + 1]:
                d = donusum(i, j)
                if d is None:
                    continue
                dt = (j - i) / ornek_fps
                egim_z.append(d[0] / dt); egim_x.append(d[1] / dt); egim_y.append(d[2] / dt); guven.append(d[3])
        if not egim_z and len(idx) >= 2:   # cok kisa cekim: ilk-son
            d = donusum(idx[0], idx[-1])
            if d:
                dt = (idx[-1] - idx[0]) / ornek_fps
                egim_z, egim_x, egim_y, guven = [d[0] / dt], [d[1] / dt], [d[2] / dt], [d[3]]
        if not egim_z:
            c['hareket'] = 'olculemedi'
            continue
        logs, dx, dy, dt = statistics.median(egim_z), statistics.median(egim_x), statistics.median(egim_y), 1.0
        zoom = (math.exp(logs / dt) - 1) * 100
        px, py = dx * 100 / dt, dy * 100 / dt
        c['zoom_yuzde_sn'], c['pan_x_yuzde_sn'], c['pan_y_yuzde_sn'] = round(zoom, 2), round(px, 2), round(py, 2)
        c['kamera_guven'] = round(statistics.median(guven), 2)
        h = []
        if abs(zoom) >= 0.4:
            h.append('zoom+' if zoom > 0 else 'zoom-')
        if max(abs(px), abs(py)) >= 0.8:
            h.append(('pan>' if px < 0 else 'pan<') if abs(px) >= abs(py) else ('pan^' if py > 0 else 'panv'))
        c['hareket'] = '+'.join(h) or 'sabit'


# ---------------------------------------------------------------- 2. duzen ve kalici katmanlar
def duzen(yol, bas, sure, cikti, cs):
    ornek = list(kare_akisi(yol, bas, sure, W, H, fps=2))
    if len(ornek) < 4:
        return {}
    arr = np.stack(ornek).astype(np.float32)
    gri = arr.mean(axis=3)
    std = gri.std(axis=0)
    ort = arr.mean(axis=0).astype(np.uint8)
    sabit = std < 7
    sonuc = {'sabit_piksel_orani': round(float(sabit.mean()), 3)}
    # letterbox / cerceve kenarlari
    kol = sabit.mean(axis=0)
    sat = sabit.mean(axis=1)

    def kenar(prof):
        a = 0
        while a < len(prof) // 3 and prof[a] > 0.85:
            a += 1
        b = len(prof)
        while b > len(prof) * 2 // 3 and prof[b - 1] > 0.85:
            b -= 1
        return a, b
    x0, x1 = kenar(kol)
    y0, y1 = kenar(sat)
    sonuc['sabit_kenar'] = {'sol': round(x0 / W, 3), 'sag': round(1 - x1 / W, 3), 'ust': round(y0 / H, 3), 'alt': round(1 - y1 / H, 3)}
    # kalici katman lekeleri (kenar disinda kalan sabit bolgeler: logo, alt bant, ilerleme cubugu)
    ic = sabit.copy()
    ic[:, :x0] = False; ic[:, x1:] = False; ic[:y0, :] = False; ic[y1:, :] = False
    n, et, st, _ = cv2.connectedComponentsWithStats(ic.astype(np.uint8), 8)
    lekeler = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 25 or a > 0.4 * W * H:
            continue
        cx, cy = (x + w / 2) / W, (y + h / 2) / H
        yer = ('ust' if cy < 0.33 else 'alt' if cy > 0.66 else 'orta') + '-' + ('sol' if cx < 0.33 else 'sag' if cx > 0.66 else 'orta')
        tur = 'ilerleme_cubugu/alt_cizgi' if w > 0.6 * W and h < 0.05 * H else ('alt_bant' if w > 0.5 * W and cy > 0.7 else 'logo/filigran/rozet')
        lekeler.append({'yer': yer, 'tur': tur, 'kutu': [round(x / W, 3), round(y / H, 3), round(w / W, 3), round(h / H, 3)]})
    sonuc['kalici_katmanlar'] = sorted(lekeler, key=lambda l: -l['kutu'][2] * l['kutu'][3])[:8]
    # cekim bazli duzen: kenar yogunlugu ile ic kutu (inset) arama
    tipler = []
    for i, k in enumerate(ornek):
        t = kare_duzen(k)
        t['t'] = round(bas + i / 2, 1)
        tipler.append(t)
    # zaman cizelgesi: ayni tipin ardisik orneklerini birlestir
    zc = []
    for t in tipler:
        if zc and zc[-1][2] == t['tip']:
            zc[-1][1] = t['t'] + 0.5
        else:
            zc.append([t['t'], t['t'] + 0.5, t['tip']])
    sonuc['duzen_zaman'] = zc
    sayim = {}
    for t in tipler:
        sayim[t['tip']] = sayim.get(t['tip'], 0) + 1
    sonuc['duzen_dagilimi'] = {k: round(v / len(tipler), 2) for k, v in sorted(sayim.items(), key=lambda x: -x[1])}
    inset = [t for t in tipler if t['tip'].startswith('cerceveli')]
    if inset:
        sonuc['cerceve_ornek'] = inset[len(inset) // 2]
    # gorsel
    maske = np.stack([(sabit * 255).astype(np.uint8)] * 3, axis=2)
    Image.fromarray(np.hstack([ort, maske])).resize((W * 4, H * 2)).save(os.path.join(cikti, 'kalici-katman.jpg'), quality=88)
    return sonuc


def _basamak(dm, eksen):
    """Ayrinti haritasinin satir (eksen=1) / sutun (eksen=0) medyani profilinde, kenardan ice dogru KESKIN basamak arar.
    Donus: (sol/ust konum, oran, sag/alt konum, oran). Oran = ic 4 piksel ayrintisi / dis 4 piksel ayrintisi."""
    X = dm if eksen == 1 else dm.T
    n = X.shape[1]
    P = np.median(X[int(X.shape[0] * 0.15):int(X.shape[0] * 0.85)], axis=0)
    ort = float(np.median(P[int(n * 0.35):int(n * 0.65)])) + 1e-6
    def ara(a, b, ters):
        en, eni = 0.0, None
        for x in range(a, b):
            ic = P[x + 1:x + 5].mean() if not ters else P[x - 4:x].mean()
            dis = P[max(0, x - 4):x].mean() if not ters else P[x + 1:x + 5].mean()
            if dis < 0.3 * ort and ic > 0.5 * ort:
                oran = ic / (dis + 0.05 * ort)
                if oran > en:
                    en, eni = oran, x
        return eni, en
    sl, so = ara(max(4, int(n * 0.03)), int(n * 0.42), False)
    sr, sor = ara(int(n * 0.58), min(n - 5, int(n * 0.97)), True)
    return sl, so, sr, sor


def kare_duzen(k):
    """Duzen tespiti (192x108 kare):
      letterbox            : ust+alt bant tam genislikte koyu (piksellerin >=%95'i koyu), yanlar degil
      cerceveli_bulanik    : ortada ayrintili dikdortgen; disi her yanda ayri ayri az ayrintili ve renkli (bulanik kopya)
      cerceveli_duz_renk   : disi duz renk (pillarbox / kart zemini / koyu zemin uzerinde gorsel)
      cerceveli_doku/gorsel: dort kenarda benzersiz guclu duz cizgi, disi ayrintili
      bolunmus             : ortada tam boy, benzersiz, guclu dikey cizgi; iki yari farkli
    Sinir, ayrinti profilinde KESKIN basamak (>=3 kat, 4 pikselde) olmalidir; alan derinligi bulanikligi yumusak gecer."""
    g = cv2.cvtColor(k, cv2.COLOR_RGB2GRAY).astype(np.float32)
    h, w = g.shape
    gri = g

    def koyu(b):
        return b.size > 0 and float((b.max(axis=-1) < 28).mean()) >= 0.95
    bb, bw = max(2, int(h * 0.04)), max(2, int(w * 0.04))
    if koyu(k[:bb]) and koyu(k[-bb:]) and not (koyu(k[:, :bw]) and koyu(k[:, -bw:])):
        return {'tip': 'letterbox'}
    dm = cv2.GaussianBlur(np.abs(cv2.Laplacian(gri, cv2.CV_32F)), (3, 3), 0)
    xl, ol, xr, orr = _basamak(dm, 1)
    yt, ot, yb, ob = _basamak(dm, 0)
    yan = xl is not None and xr is not None and min(ol, orr) >= 3 and abs(xl - (w - 1 - xr)) < 0.08 * w
    ustalt = yt is not None and yb is not None and min(ot, ob) >= 3 and abs(yt - (h - 1 - yb)) < 0.10 * h
    if yan or ustalt:
        x0, x1 = (xl + 1, xr) if yan else (0, w)
        y0, y1 = (yt + 1, yb) if ustalt else (0, h)
        ic = np.zeros((h, w), bool); ic[y0:y1, x0:x1] = True
        dis = ~ic
        if dis.sum() >= 0.06 * h * w and (x1 - x0) * (y1 - y0) >= 0.25 * h * w:
            ic_d = float(dm[ic].mean()) + 1e-6
            parcalar = ([dm[y0:y1, :x0], dm[y0:y1, x1:]] if yan else []) + ([dm[:y0, x0:x1], dm[y1:, x0:x1]] if ustalt else [])
            if all(p.size and float(p.mean()) < 0.35 * ic_d for p in parcalar):
                kutu = [round(x0 / w, 3), round(y0 / h, 3), round((x1 - x0) / w, 3), round((y1 - y0) / h, 3)]
                dis_renk = [int(x) for x in np.median(k[dis], axis=0)]
                if float(k[dis].std()) < 12:
                    if not yan and max(dis_renk) < 30:
                        return {'tip': 'letterbox'}
                    return {'tip': 'cerceveli_duz_renk', 'ic_kutu': kutu, 'dis_renk': dis_renk}
                return {'tip': 'cerceveli_bulanik', 'ic_kutu': kutu, 'dis_renk': dis_renk}
    gx = np.abs(cv2.Sobel(gri, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(gri, cv2.CV_32F, 0, 1, ksize=3))
    kol, sat = (gx > 30).mean(axis=0), (gy > 30).mean(axis=1)

    def benz(prof, i):
        m = np.ones(len(prof), bool); m[max(0, i - 3):i + 4] = False
        return prof[i] > 0.75 and prof[i] > 2.0 * float(np.percentile(prof[m], 90))

    def en(prof, a, b):
        return int(np.argmax(prof[a:b])) + a
    cl, cr = en(kol, int(w * 0.03), int(w * 0.42)), en(kol, int(w * 0.58), int(w * 0.97))
    rt, rb = en(sat, int(h * 0.03), int(h * 0.42)), en(sat, int(h * 0.58), int(h * 0.97))
    if all([benz(kol, cl), benz(kol, cr), benz(sat, rt), benz(sat, rb)]) and abs(cl - (w - 1 - cr)) < 0.1 * w:
        return {'tip': 'cerceveli_doku/gorsel', 'ic_kutu': [round(cl / w, 3), round(rt / h, 3), round((cr - cl) / w, 3), round((rb - rt) / h, 3)]}
    oi = en(kol, int(w * 0.45), int(w * 0.55))
    if benz(kol, oi) and kol[oi] > 0.85:
        if hd(hist(np.ascontiguousarray(k[:, :oi])), hist(np.ascontiguousarray(k[:, oi + 1:]))) > 0.35:
            return {'tip': 'bolunmus'}
    return {'tip': 'tam_ekran'}


# ---------------------------------------------------------------- 3. ekran yazisi (OCR)
def ocr_motoru():
    import logging
    logging.disable(logging.WARNING)
    try:
        from rapidocr import RapidOCR
        try:
            return RapidOCR(params={'Global.use_cls': False})   # aci siniflandirma kapali: 2 kat hizli, yatay yazida ayni sonuc
        except Exception:
            return RapidOCR()
    except Exception:
        try:
            from rapidocr_onnxruntime import RapidOCR
            return RapidOCR()
        except Exception:
            return None


def ocr_cagir(m, img):
    r = m(img)
    if isinstance(r, tuple):  # eski rapidocr_onnxruntime: (liste, sure)
        r = r[0] or []
        return [(np.array(b), t, float(s)) for b, t, s in r]
    if getattr(r, 'boxes', None) is None:
        return []
    return [(np.array(b), t, float(s)) for b, t, s in zip(r.boxes, r.txts, r.scores)]


def renkler(kirp):
    if kirp.size == 0 or min(kirp.shape[:2]) < 4:
        return None, None, 0
    g = cv2.cvtColor(kirp, cv2.COLOR_RGB2GRAY)
    _, m = cv2.threshold(g, 0, 1, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kenar = np.concatenate([m[0], m[-1], m[:, 0], m[:, -1]])
    arka_sinif = 1 if kenar.mean() > 0.5 else 0
    yazi = kirp[m != arka_sinif]
    arka = kirp[m == arka_sinif]
    if len(yazi) < 5 or len(arka) < 5:
        return None, None, 0
    hsv = cv2.cvtColor(yazi.reshape(-1, 1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
    canli = ((hsv[:, 1] > 100) & (hsv[:, 2] > 120)).mean()
    return [int(x) for x in np.median(yazi, axis=0)], [int(x) for x in np.median(arka, axis=0)], float(canli)


def yazilar(yol, bas, sure, ofps, vtt_kel, cikti):
    m = ocr_motoru()
    if m is None:
        return {'ocr': 'yok (py -m pip install rapidocr)'}, []
    OW, OH = 800, 450
    kayit = []
    son_kucuk, son_sonuc, atlanan = None, [], 0
    for i, k in enumerate(kare_akisi(yol, bas, sure, OW, OH, fps=ofps)):
        t = i / ofps
        if t >= 30 and i % 2:      # ilk 30 sn tam hizda; sonrasi yari hizda (OCR en pahali adim)
            continue
        kucuk = cv2.resize(cv2.cvtColor(k, cv2.COLOR_RGB2GRAY), (160, 90), interpolation=cv2.INTER_AREA).astype(np.int16)
        if son_kucuk is not None and np.abs(kucuk - son_kucuk).mean() < 2.0:
            sonuc = son_sonuc; atlanan += 1      # kare degismedi: onceki OCR sonucunu yeni zamanla kullan
        else:
            sonuc = ocr_cagir(m, k); son_kucuk, son_sonuc = kucuk, sonuc
        for kutu, txt, s in sonuc:
            if s < 0.75 or len(txt.strip()) < 2:
                continue
            xs, ys = kutu[:, 0], kutu[:, 1]
            x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
            kirp = k[max(0, y0):y1, max(0, x0):x1]
            yr, ar, canli = renkler(kirp)
            kayit.append({'t': t, 'txt': txt.strip(), 'kutu': [x0 / OW, y0 / OH, (x1 - x0) / OW, (y1 - y0) / OH],
                          'yazi_rengi': yr, 'zemin_rengi': ar, 'canli': canli, 'kirp': kirp})
    # ardisik orneklerde ayni yazi -> tek oge
    ogeler = []
    for r in kayit:
        an = re.sub(r'\W+', '', r['txt'].lower())
        for o in ogeler:
            if o['_an'] == an and r['t'] - o['bit'] <= (1.5 if r['t'] < 30 else 2.5) / ofps + 0.01 and abs(o['kutu'][1] - r['kutu'][1]) < 0.06:
                o['bit'] = r['t']; o['n'] += 1
                break
        else:
            ogeler.append({'_an': an, 'txt': r['txt'], 'bas': r['t'], 'bit': r['t'], 'n': 1, 'kutu': r['kutu'],
                           'yazi_rengi': r['yazi_rengi'], 'zemin_rengi': r['zemin_rengi'], 'canli': r['canli'], '_kirp': r['kirp']})
    for o in ogeler:
        o['sure_sn'] = round(o['bit'] - o['bas'] + 1 / ofps, 2)
        o['bas'] = round(o['bas'] + bas, 2)
        x, y, w, h = o['kutu']
        o['boyut_yuzde'] = round(h * 100, 1)
        o['yer'] = ('ust' if y + h / 2 < 0.33 else 'alt' if y + h / 2 > 0.62 else 'orta') + \
                   ('-orta' if abs(x + w / 2 - 0.5) < 0.12 else '-sol' if x + w / 2 < 0.5 else '-sag')
        o['buyuk_harf'] = sum(c.isupper() for c in o['txt']) / max(1, sum(c.isalpha() for c in o['txt']))
        kel = re.findall(r'\w+', o['txt'].lower())
        eslesen = 0
        if vtt_kel and kel:
            yakin = {w for (tw, w) in vtt_kel if abs(tw - o['bas']) < 3}
            eslesen = sum(1 for w in kel if w in yakin) / len(kel)
        o['konusma_eslesme'] = round(eslesen, 2)
        if (eslesen >= 0.5 or (not vtt_kel and o['yer'].startswith('alt') and o['sure_sn'] < 5)) and o['yer'].endswith('orta'):
            o['tur'] = 'altyazi'
        elif o['boyut_yuzde'] >= 5 or o['sure_sn'] >= 3:
            o['tur'] = 'baslik/kart_yazisi'
        else:
            o['tur'] = 'kucuk_yazi/etiket/kaynak'
    # kirpinti sayfasi: en buyuk ve farkli 24 yazi
    secilen = sorted([o for o in ogeler if o['_kirp'] is not None and o['_kirp'].size], key=lambda o: -o['boyut_yuzde'])
    goruldu, kirp_liste = set(), []
    for o in secilen:
        if o['_an'] in goruldu:
            continue
        goruldu.add(o['_an']); kirp_liste.append(o)
        if len(kirp_liste) >= 24:
            break
    if kirp_liste:
        kirpinti_sayfasi(kirp_liste, os.path.join(cikti, 'yazi-kirpinti.jpg'))
        kd = os.path.join(cikti, 'kirpintilar')
        os.makedirs(kd, exist_ok=True)
        meta = []
        for j, o in enumerate(kirp_liste, 1):
            Image.fromarray(o['_kirp']).save(os.path.join(kd, f'{j:02d}.png'))
            meta.append({'dosya': f'{j:02d}.png', 'txt': o['txt'], 'boyut_yuzde': o['boyut_yuzde'], 'bas': round(o['bas'], 2),
                         'yazi_rengi': o['yazi_rengi'], 'zemin_rengi': o['zemin_rengi']})
        json.dump(meta, open(os.path.join(kd, 'kirpintilar.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for o in ogeler:
        o.pop('_kirp', None); o.pop('_an', None)
    ozet = altyazi_ozet(ogeler)
    return ozet, ogeler


def altyazi_ozet(og):
    alt = [o for o in og if o['tur'] == 'altyazi']
    bas = [o for o in og if o['tur'] == 'baslik/kart_yazisi']
    oz = {'yazi_ogesi': len(og), 'altyazi_ogesi': len(alt), 'baslik_kart_ogesi': len(bas)}
    if alt:
        kel = [len(re.findall(r'\w+', o['txt'])) for o in alt]
        oz['altyazi'] = {
            'kelime_ekran_medyan': statistics.median(kel), 'sure_medyan_sn': statistics.median(o['sure_sn'] for o in alt),
            'boyut_yuzde_medyan': statistics.median(o['boyut_yuzde'] for o in alt),
            'yer': max(set(o['yer'] for o in alt), key=[o['yer'] for o in alt].count),
            'buyuk_harf_orani': round(statistics.mean(o['buyuk_harf'] for o in alt), 2),
            'vurgulu_kelime_olasi': round(sum(1 for o in alt if 0.08 < o['canli'] < 0.75) / len(alt), 2),
            'yazi_rengi': alt[len(alt) // 2]['yazi_rengi'], 'zemin_rengi': alt[len(alt) // 2]['zemin_rengi'],
            'kutulu_olasi': round(sum(1 for o in alt if o['zemin_rengi'] and max(o['zemin_rengi']) - min(o['zemin_rengi']) < 25
                                      and sum(o['zemin_rengi']) < 150) / len(alt), 2)}
    if bas:
        oz['baslik_kart'] = {'sure_medyan_sn': statistics.median(o['sure_sn'] for o in bas),
                             'boyut_yuzde_medyan': statistics.median(o['boyut_yuzde'] for o in bas),
                             'buyuk_harf_orani': round(statistics.mean(o['buyuk_harf'] for o in bas), 2),
                             'ornekler': [o['txt'] for o in sorted([o for o in bas if o['n'] >= 2 and len(o['txt']) >= 4] or bas,
                                                                    key=lambda o: -o['boyut_yuzde'])[:8]]}
    return oz


# ---------------------------------------------------------------- 4. ses vurgusu, renk
def ses_vurgu(yol, bas, sure, gec, fps):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(bas)] + (['-t', str(sure)] if sure else []) + \
          ['-i', yol, '-ac', '1', '-ar', '16000', '-f', 's16le', '-']
    r = subprocess.run(cmd, capture_output=True)
    x = np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768
    if len(x) < 16000 or not gec:
        return {}
    hop, n = 160, 512
    cer = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    sp = np.abs(np.fft.rfft(cer, axis=1))[:, 64:256]          # ~2-8 kHz
    flux = np.maximum(0, np.diff(sp, axis=0)).sum(axis=1)
    esik = np.percentile(flux, 92)
    vur = 0
    for g in gec:
        i = int(g['kare'] / fps * 100)
        if flux[max(0, i - 12):i + 12].max(initial=0) > esik:
            vur += 1
    return {'kesimde_ses_vurgusu_orani': round(vur / len(gec), 2),
            'not': 'oran > ~0,5 ise kesimlere SFX (whoosh/hit) konuyor demektir; konusmali videoda taban ~0,2-0,3'}


def renk_ozet(LUM, SAT, K):
    orn = K[:: max(1, len(K) // 200)]
    sic, vin, sb = [], [], 0
    for k in orn:
        f = k.astype(np.float32)
        sic.append(float((f[..., 0] - f[..., 2]).mean()))
        g = f.mean(axis=2)
        merkez = g[SH // 4:3 * SH // 4, SW // 4:3 * SW // 4].mean()
        kose = np.concatenate([g[:8, :12].ravel(), g[:8, -12:].ravel(), g[-8:, :12].ravel(), g[-8:, -12:].ravel()]).mean()
        vin.append(merkez / (kose + 1))
        hsv = cv2.cvtColor(k, cv2.COLOR_RGB2HSV)
        sb += hsv[..., 1].mean() < 18
    return {'parlaklik': round(float(np.median(LUM)), 3), 'kontrast': round(float(np.std(LUM)), 3),
            'doygunluk': round(float(np.median(SAT)), 3), 'sicaklik_R_eksi_B': round(statistics.median(sic), 1),
            'vinyet_merkez_kose': round(statistics.median(vin), 2), 'siyah_beyaz_orani': round(sb / len(orn), 2)}


def vtt_kelimeler(yol):
    if not yol or not os.path.exists(yol):
        return []
    sonuc, t = [], 0
    for satir in open(yol, encoding='utf-8', errors='replace'):
        m = re.match(r'(\d+):(\d+):(\d+)\.(\d+) -->', satir)
        if m:
            t = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]) + int(m[4]) / 1000
            continue
        temiz = re.sub(r'<[^>]+>', '', satir).strip()
        if temiz and '-->' not in temiz and not temiz.startswith(('WEBVTT', 'Kind:', 'Language:')):
            for w in re.findall(r'\w+', temiz.lower()):
                sonuc.append((t, w))
    return sonuc


# ---------------------------------------------------------------- 5. sayfalar
def yazitipi(b):
    for f in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, b)
    return ImageFont.load_default()


def kirpinti_sayfasi(ogeler, yol):
    satirlar, gen = [], 0
    for o in ogeler:
        k = o['_kirp']
        h = 64
        w = max(1, int(k.shape[1] * h / max(1, k.shape[0])))
        im = Image.fromarray(k).resize((min(w, 900), h))
        satirlar.append((im, f"{o['txt'][:40]} | {o['boyut_yuzde']}% | {o['sure_sn']}s | renk {o['yazi_rengi']}"))
        gen = max(gen, im.width)
    gen = max(gen, 500)
    sayfa = Image.new('RGB', (gen + 20, len(satirlar) * 92 + 10), (30, 30, 30))
    d = ImageDraw.Draw(sayfa)
    ft = yazitipi(14)
    for i, (im, et) in enumerate(satirlar):
        sayfa.paste(im, (10, 10 + i * 92))
        d.text((10, 10 + i * 92 + 66), et, fill=(255, 220, 90), font=ft)
    sayfa.save(yol, quality=90)


def edit_sayfasi(yol, bas, cs, gec, fps, cikti, ozet):
    """Tek bakista edit dili: ilk 24 cekimin ilk karesi + giris tipi/sure, alti gecis seritleri."""
    secim = cs[:24]
    TW, TH = 320, 180
    kolon = 6
    sat = math.ceil(len(secim) / kolon)
    ft, fb = yazitipi(15), yazitipi(22)
    seritler = [g for g in gec if g['tip'] != 'sert'][:6]
    yuk = 50 + sat * (TH + 44) + len(seritler) * (TH // 2 + 34) + 20
    sayfa = Image.new('RGB', (kolon * TW + 20, yuk), (24, 24, 24))
    d = ImageDraw.Draw(sayfa)
    d.text((10, 12), ozet, fill=(255, 255, 255), font=fb)
    kareler = {}
    istenen = sorted({c['bas_kare'] + 1 for c in secim} | {f for g in seritler for f in
                      np.linspace(max(0, g['bas_kare'] - 2), g['bit_kare'] + 2, 8).astype(int).tolist()})
    if istenen:
        hedef = set(istenen)
        for i, k in enumerate(kare_akisi(yol, bas, (max(istenen) + 2) / fps, TW, TH)):
            if i in hedef:
                kareler[i] = k
            if i > max(istenen):
                break
    for j, c in enumerate(secim):
        x, y = 10 + (j % kolon) * TW, 50 + (j // kolon) * (TH + 44)
        k = kareler.get(c['bas_kare'] + 1)
        if k is not None:
            sayfa.paste(Image.fromarray(k), (x, y))
        d.text((x + 2, y + TH + 2), f"#{c['no']} {c['bas_ms'] / 1000:.3f}s  {c['sure_ms'] / 1000:.2f}s  {c['hareket']}", fill=(255, 220, 90), font=ft)
        d.text((x + 2, y + TH + 20), f"giris: {c['giris']} {c['giris_kare']}k", fill=(150, 210, 255), font=ft)
    y = 50 + sat * (TH + 44)
    for g in seritler:
        fr = np.linspace(max(0, g['bas_kare'] - 2), g['bit_kare'] + 2, 8).astype(int)
        d.text((10, y), f"GECIS {g['tip']}  {g['ms'] / 1000:.3f}s  {g['kare_sayisi']} kare = {g['sure_ms']} ms", fill=(120, 255, 160), font=ft)
        for m, f in enumerate(fr):
            k = kareler.get(int(f))
            if k is not None:
                sayfa.paste(Image.fromarray(k).resize((240, 135)).crop((0, 0, 240, 135)).resize((160, 90)), (10 + m * 245, y + 20))
        y += TH // 2 + 34
    sayfa.save(os.path.join(cikti, 'edit-dili-sayfa.jpg'), quality=88)


# ---------------------------------------------------------------- 6. rapor
def dagilim(liste):
    s = {}
    for x in liste:
        s[x] = s.get(x, 0) + 1
    return {k: round(v / max(1, len(liste)), 2) for k, v in sorted(s.items(), key=lambda kv: -kv[1])}


def bolge(cs, a_ms, b_ms):
    alt = [c for c in cs if a_ms <= c['bas_ms'] < b_ms]
    if not alt:
        return {}
    sur = [c['sure_ms'] / 1000 for c in alt]
    return {'cekim': len(alt), 'kesim_dk': round(len(alt) / max(0.01, (b_ms - a_ms) / 60000), 1),
            'medyan_sn': round(statistics.median(sur), 2), 'min_sn': round(min(sur), 2), 'max_sn': round(max(sur), 2),
            'giris_dagilimi': dagilim([c['giris'] for c in alt]), 'hareket_dagilimi': dagilim([c['hareket'] for c in alt]),
            'zoom_medyan_yuzde_sn': round(statistics.median([abs(c['zoom_yuzde_sn']) for c in alt if c['zoom_yuzde_sn'] is not None] or [0]), 2),
            'pan_medyan_yuzde_sn': round(statistics.median([abs(c['pan_x_yuzde_sn']) for c in alt if c['pan_x_yuzde_sn'] is not None] or [0]), 2),
            'hareketli_cekim_orani': round(sum(1 for c in alt if c['hareket'] not in ('sabit', 'kisa', 'olculemedi', '?')) / len(alt), 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--vtt')
    ap.add_argument('--bas', type=float, default=0)
    ap.add_argument('--sure', type=float, default=0, help='0 = dosyanin tamami')
    ap.add_argument('--cikti')
    ap.add_argument('--ocr-fps', type=float, default=1.0)
    ap.add_argument('--ocr-yok', action='store_true')
    a = ap.parse_args()
    cikti = a.cikti or os.path.splitext(a.video)[0] + '-editdili'
    os.makedirs(cikti, exist_ok=True)
    fps, toplam, vw, vh = ffprobe(a.video)
    sure = a.sure or max(0.0, toplam - a.bas)
    print(f'tara: {sure:.0f} sn, {fps:.3f} fps, kare suresi {1000 / fps:.1f} ms', flush=True)
    import time; t0 = time.time()
    K, D, HS, LUM, SAT, KES = tara(a.video, a.bas, sure, fps)
    print(f'  tarama {time.time() - t0:.0f} sn', flush=True)
    gec = gecisler(K, D, HS, LUM, KES, fps)
    cs = cekimler(gec, len(K), fps, LUM, SAT, KES, a.bas)
    hatalar = {}

    def guvenli(ad, f, *x, varsayilan=None):
        # bir alt sistem cokerse analizin geri kalani surer; hata json'a yazilir
        try:
            return f(*x)
        except Exception as h:
            import traceback
            hatalar[ad] = f'{type(h).__name__}: {h}'
            print(f'  UYARI {ad}: {h}', flush=True)
            traceback.print_exc()
            return varsayilan
    guvenli('kamera', kamera_olc, a.video, a.bas, sure, cs, fps)
    print(f'  gecis+kamera {time.time() - t0:.0f} sn', flush=True)
    print(f'kareler {len(K)} | cekim {len(cs)} | gecis {len(gec)}', flush=True)
    dz = guvenli('duzen', duzen, a.video, a.bas, sure, cikti, cs, varsayilan={})
    vtt = vtt_kelimeler(a.vtt)
    yz, ogeler = ({'ocr': 'atlandi'}, []) if a.ocr_yok else guvenli('ocr', yazilar, a.video, a.bas, sure, a.ocr_fps, vtt, cikti,
                                                                    varsayilan=({'ocr': 'hata'}, []))
    print(f'  duzen+ocr {time.time() - t0:.0f} sn', flush=True)
    ses = guvenli('ses', ses_vurgu, a.video, a.bas, sure, gec, fps, varsayilan={})
    renk = guvenli('renk', renk_ozet, LUM, SAT, K, varsayilan={})
    son_ms = round((a.bas + sure) * 1000)
    yuzde30 = round((a.bas + min(sure, toplam * 0.3 if a.sure == 0 else sure)) * 1000)
    yumusak = [g for g in gec if g['tip'] != 'sert']
    r = {'video': os.path.basename(a.video), 'fps': round(fps, 3), 'kare_ms': round(1000 / fps, 2), 'cozunurluk': [vw, vh],
         'analiz_aralik_sn': [a.bas, round(a.bas + sure, 2)], 'kare_sayisi': len(K),
         'ozet': {'ilk30': bolge(cs, 0, 30000), 'analiz_tum': bolge(cs, 0, son_ms)},
         # belirsiz (model iyi uymadi, 0,35-0,55) gecisler '?' ile ayri sayilir: profil yazari bunlari kanit sayamaz
         'gecis_ozet': {'dagilim': dagilim([g['tip'] + ('?' if g.get('belirsiz') else '') for g in gec]),
                        'yumusak_gecis_orani': round(len(yumusak) / max(1, len(gec)), 2),
                        'yumusak_medyan_kare': statistics.median([g['kare_sayisi'] for g in yumusak]) if yumusak else 0,
                        'yumusak_medyan_ms': statistics.median([g['sure_ms'] for g in yumusak]) if yumusak else 0},
         'hatalar': hatalar, 'duzen': dz, 'yazi': yz, 'renk': renk, 'ses': ses, 'cekimler': cs, 'gecisler': gec, 'yazi_ogeleri': ogeler}
    json.dump(r, open(os.path.join(cikti, 'edit-dili.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1,
              default=lambda o: o.item() if hasattr(o, 'item') else str(o))
    i30 = r['ozet']['ilk30']
    ozet = (f"ilk30: {i30.get('cekim', 0)} cekim, medyan {i30.get('medyan_sn', '-')} sn | gecis: "
            + ', '.join(f'{k} {v:.0%}' for k, v in list(r['gecis_ozet']['dagilim'].items())[:3])
            + f" | duzen: {next(iter(dz.get('duzen_dagilimi', {'?': 0})))}")
    guvenli('sayfa', edit_sayfasi, a.video, a.bas, cs, gec, fps, cikti, ozet)
    md_yaz(r, os.path.join(cikti, 'EDIT-DILI-olcum.md'))
    print('BITTI', cikti)


def md_yaz(r, yol):
    s = [f"# Edit dili olcumu — {r['video']}", '',
         f"fps {r['fps']} (1 kare = {r['kare_ms']} ms) · aralik {r['analiz_aralik_sn']} sn · {r['kare_sayisi']} kare", '',
         '## Ritim', '| bolge | cekim | kesim/dk | medyan sn | min | max | zoom medyan %/sn |', '|---|---|---|---|---|---|---|']
    for ad, b in r['ozet'].items():
        if b:
            s.append(f"| {ad} | {b['cekim']} | {b['kesim_dk']} | {b['medyan_sn']} | {b['min_sn']} | {b['max_sn']} | {b['zoom_medyan_yuzde_sn']} |")
    g = r['gecis_ozet']
    s += ['', '## Gecisler', f"dagilim: {g['dagilim']}",
          f"yumusak gecis orani {g['yumusak_gecis_orani']}, medyan {g['yumusak_medyan_kare']} kare / {g['yumusak_medyan_ms']} ms", '',
          '## Hareket (ilk 30 sn)', str(r['ozet']['ilk30'].get('hareket_dagilimi')), '',
          '## Duzen ve kalici katmanlar', '```', json.dumps(r['duzen'], ensure_ascii=False, indent=1), '```', '',
          '## Ekran yazisi / altyazi', '```', json.dumps(r['yazi'], ensure_ascii=False, indent=1), '```', '',
          '## Renk', str(r['renk']), '', '## Ses', str(r['ses']), '',
          '## Ilk 30 sn cekim cekim', '| # | bas (s) | sure (s) | giris | kare | hareket | zoom %/sn |', '|---|---|---|---|---|---|---|']
    for c in r['cekimler']:
        if c['bas_ms'] >= 30000:
            break
        s.append(f"| {c['no']} | {c['bas_ms'] / 1000:.3f} | {c['sure_ms'] / 1000:.3f} | {c['giris']} | {c['giris_kare']} | {c['hareket']} | {c['zoom_yuzde_sn']} |")
    s += ['', 'Sayfalar: edit-dili-sayfa.jpg (cekimler + gecis seritleri), yazi-kirpinti.jpg (font tespiti icin -> font_aday.py), kalici-katman.jpg (sol: ortalama kare, sag: beyaz = hic degismeyen piksel)']
    open(yol, 'w', encoding='utf-8').write('\n'.join(s) + '\n')


if __name__ == '__main__':
    main()
