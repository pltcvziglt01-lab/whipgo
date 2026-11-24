#!/usr/bin/env python3
"""KAYNAK YAZI — kaynak kliplerde GOMULU yazi (kendi altyazisi, haber bandi, "BREAKING NEWS", skor tabelasi) nerede ve ne zaman.
Kurgu bu bolgelerin ustune alt bant / altyazi koymasin diye: kurgu_denetim.py --plan bu dosyalari okur ("kaynak yazisiyla cakisma").

Kullanim:
  py kaynak_yazi.py <motion>/public/v04 --plan src/v04/props.json [--pay 20]   # yalniz kurgunun kullandigi pencereler +- pay (hizli)
  py kaynak_yazi.py <motion>/public/v04 [--aralik 1.0] [--zorla]              # tum klipler bastan sona (400 sn klip ~3 dk)
  (klasor yerine .../public/v04/kaynak ya da tek .mp4 de verilebilir)
Cikti: her klip icin yanina <tag>.yazi.json:
  {"kaynak": "x.mp4", "aralik": 1.0, "sure": 92.4, "imza": "<boyut>-<mtime>", "olculen": [[bas, son], ...],
   "bolgeler": [{"bas": 79.0, "bit": 81.0, "kutu": [x, y, w, h], "metin": "Good morning.", "skor": 0.93}], "ham": [...]}
  kutu kare boyuna ORAN (0-1, sol-ust koseden). bas/bit kaynak saniyesi: ilk goruldugu ornek - aralik/2 .. son + aralik/2.
  tur: "kaplama" (sonradan bindirilmis: kaynagin altyazisi, haber bandi, baslik, abone dugmesi) ya da "sahne" (pano, sponsor
  duvari, tabela; cogu kez klipte bircok konumda tekrar eder). kurgu_denetim yalniz "kaplama"yi cakisma sayar.
  "olculen" disindaki kaynak zamani BILINMIYOR (kurgu_denetim orayi temiz saymaz).
OCR: rapidocr (yazi_kontrol.py ile ayni motor), 960 px; degismeyen kare yeniden okunmaz (onceki sonuc kullanilir).
Onbellek: klip degismediyse (boyut + mtime + aralik ayni) olculmus parcalari yeniden okumaz; yalniz eksik pencereler taranir.
  --zorla: bastan olc.
Gerekli: py -m pip install rapidocr ; ffmpeg/ffprobe.
"""
import argparse, glob, json, math, os, re, subprocess, sys
import numpy as np

ASGARI_SKOR = 0.5         # bunun altindaki okumalar gurultu (doku, kalabalik)
ALT_UCTE_BIR = 0.62       # kutu merkezi bu yukseklik oraninin altindaysa alt bant / altyazi alaniyla cakisir (kurgu_denetim ayni esik)
ASGARI_YUKSEKLIK = 0.018  # kare yuksekliginin orani: daha kucuk yazi (mikro logo, forma numarasi) bant icin sorun degil


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


def norm(t):
    return re.sub(r'[^0-9A-Z]', '', (t or '').upper())


def imza(yol):
    s = os.stat(yol)
    return f'{s.st_size}-{int(s.st_mtime)}'


def bilgi(yol):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                   'stream=width,height:format=duration', '-of', 'json', yol],
                                  capture_output=True, text=True).stdout or '{}')
    if not j.get('streams'):
        return None
    return j['streams'][0]['width'], j['streams'][0]['height'], float(j['format']['duration'])


def ornekler(yol, aralik, motor, araliklar=None):
    """araliklar [[bas, son], ...] (None = tum klip) -> (sure, [(an, [[kutu_oran[x,y,w,h], metin, skor]])], ocr sayisi)"""
    b = bilgi(yol)
    if not b:
        return None, [], 0
    W0, H0, sure = b
    olcek = min(1.0, 960 / max(W0, H0))
    w, h = int(W0 * olcek) // 2 * 2, int(H0 * olcek) // 2 * 2
    boy = w * h * 3
    out, ocr = [], 0
    for a0, a1 in (araliklar or [[0, sure]]):
        p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{a0:.3f}', '-to', f'{a1:.3f}', '-i', yol, '-vf', f'fps=1/{aralik},scale={w}:{h}',
                              '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
        onceki, son, i = None, [], 0
        while True:
            veri = p.stdout.read(boy)
            if len(veri) < boy:
                break
            img = np.frombuffer(veri, np.uint8).reshape(h, w, 3)
            an = round(a0 + i * aralik, 3)     # -ss girdiden once: zaman 0'dan; fps=1/aralik -> i. kare ~ a0 + i*aralik
            i += 1
            kucuk = img[::8, ::8].mean(2)
            if onceki is None or np.abs(kucuk - onceki).mean() >= 1.5:   # degismeyen kare: onceki OCR sonucu
                onceki = kucuk
                ocr += 1
                son = []
                for kutu, tx, sc in oku(motor, img):
                    tx = tx.strip()
                    if sc < ASGARI_SKOR or len(norm(tx)) < 2:
                        continue
                    x0, y0 = (float(v) for v in kutu.min(0))
                    x1, y1 = (float(v) for v in kutu.max(0))
                    if (y1 - y0) / h < ASGARI_YUKSEKLIK:
                        continue
                    son.append([[round(x0 / w, 4), round(y0 / h, 4), round((x1 - x0) / w, 4), round((y1 - y0) / h, 4)], tx, round(sc, 3)])
            out.append((an, son))
        p.wait()
    return sure, out, ocr


def kesisim(a, b):
    ix = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
    k = min(a[2] * a[3], b[2] * b[3]) or 1e-9
    return ix * iy / k


def birlestir(orn, aralik):
    """ardisik orneklerde ayni yerde (kesisim > %40) duran kutulari tek bolgeye topla; araya en fazla 1 bos ornek girebilir.
    orn yalniz yazili ornekleri icerir (bos ornek yazilmaz): zaman boslugu bolgeyi kapatir."""
    acik, kapali = [], []
    for an, kutular in sorted(orn, key=lambda x: x[0]):
        kal = []
        for b in acik:
            (kal if an - b['bit'] <= aralik * 1.01 else kapali).append(b)
        acik = kal
        kullanilan = set()
        for kutu, tx, sc in kutular:
            en = next((j for j, b in enumerate(acik) if j not in kullanilan and kesisim(kutu, b['son_kutu']) > 0.4), None)
            if en is None:
                acik.append({'bas': an, 'bit': an + aralik, 'kutu': list(kutu), 'son_kutu': kutu, 'metin': [tx], 'skor': sc, 'kalabalik': len(kutular), 'tek_w': kutu[2], 'tek_h': kutu[3]})
                kullanilan.add(len(acik) - 1)
                continue
            b = acik[en]
            x0, y0 = min(b['kutu'][0], kutu[0]), min(b['kutu'][1], kutu[1])
            x1 = max(b['kutu'][0] + b['kutu'][2], kutu[0] + kutu[2])
            y1 = max(b['kutu'][1] + b['kutu'][3], kutu[1] + kutu[3])
            b.update(kutu=[x0, y0, x1 - x0, y1 - y0], son_kutu=kutu, bit=an + aralik, skor=max(b['skor'], sc), kalabalik=max(b['kalabalik'], len(kutular)),
                     tek_w=max(b['tek_w'], kutu[2]), tek_h=max(b['tek_h'], kutu[3]))
            if tx not in b['metin']:
                b['metin'].append(tx)
            kullanilan.add(en)
    kapali += acik
    tekrar = konum_tekrari(orn)
    yarim = aralik / 2   # yazi ilk/son goruldugu ornekten en fazla bir aralik once/sonra da ekranda olabilir: orta tahmin
    return [{'bas': round(max(0.0, b['bas'] - yarim), 2), 'bit': round(b['bit'] - yarim, 2), 'kutu': [round(v, 4) for v in b['kutu']],
             'metin': ' | '.join(b['metin'][:4])[:120], 'skor': b['skor'], 'tur': siniflandir(b, tekrar)}
            for b in sorted(kapali, key=lambda b: (b['bas'], b['kutu'][1]))]


def konum_tekrari(orn):
    """normalize metin -> klipte goruldugu farkli konum (0,1 izgara) sayisi; benzer okumalar (OCR bozuklugu: MANCHESTER /
    MANGHESTER / MANONESTER, oran >= 0,6) birlikte sayilir. Pano/sponsor duvari ayni markayi bircok yerde tekrarlar."""
    import difflib
    poz = {}
    for _an, kutular in orn:
        for k, tx, _sc in kutular:
            poz.setdefault(norm(tx), set()).add((round((k[0] + k[2] / 2) / 0.1), round((k[1] + k[3] / 2) / 0.1)))
    anahtar = [t for t in poz if len(t) >= 2]
    out = {}
    for t in anahtar:
        hep = set(poz[t])
        sm = difflib.SequenceMatcher(None, t, autojunk=False)
        for u in anahtar:
            if u is t or abs(len(u) - len(t)) > max(len(u), len(t)) * 0.5:
                continue
            sm.set_seq1(u)
            if sm.real_quick_ratio() >= 0.6 and sm.quick_ratio() >= 0.6 and sm.ratio() >= 0.6:
                hep |= poz[u]
        out[t] = len(hep)
    return out


KALABALIK = 8   # bir karede bu kadar cok kutu: sponsor duvari / tabela dolu sahne -> yalniz cumle kaplama sayilir


def siniflandir(b, tekrar):
    """'kaplama' (sonradan bindirilmis: altyazi, haber bandi, baslik, abone ol dugmesi) ya da 'sahne' (pano, sponsor duvari, forma, tabela).
    Olcut (v04 kaynaklarinda ayarlandi): kaplama cumledir ya da tek basina duran uzun kelimedir; sahne yazisi tek/iki kelimelik marka,
    cogu kez ayni klipte bircok konumda tekrar eder. Emin olunmayan durum 'sahne' (yanlis alarm uretmez)."""
    x, y, w, h = b['kutu']
    cx = x + w / 2
    tw, th = b.get('tek_w', w), b.get('tek_h', h)   # tek okumanin en buyuk boyu (bolge kutusu zamanla birlesir, genisler)
    kal = b.get('kalabalik', 0) >= KALABALIK
    for t in b['metin']:
        kel = re.findall(r"[A-Za-zÀ-ɏ']{2,}", t)
        rep = tekrar.get(norm(t), 1)
        if len(kel) >= 3 and rep <= 2:
            return 'kaplama'                                   # cumle: altyazi, bant, baslik
        karisik = any(c.islower() for c in t) and any(c.isupper() for c in t)   # "Good morning.", "Elliot Anderson"; tabela cogu kez BUYUK
        if len(kel) == 2 and min(map(len, kel)) >= 3 and rep <= 2 and th <= 0.12 and                 ((karisik and (0.3 <= cx <= 0.7 or kal)) or tw >= 0.3):
            return 'kaplama'                                   # ortali iki kelime, isim bandi, genis bant
        if kal:
            continue                                           # sponsor duvari onunde kisa okuma: sahne
        if len(kel) == 1 and len(kel[0]) >= 9 and rep <= 1 and 0.03 <= th <= 0.12:
            return 'kaplama'                                   # SUBSCRIBE, BREAKING gibi tek uzun kelime
    return 'sahne'


def aralik_birlestir(xs):
    out = []
    for a, b in sorted(xs):
        if out and a <= out[-1][1] + 1e-6:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def eksik(istenen, olculen):
    """istenen araliklarin olculmemis parcalari"""
    out = []
    for a, b in istenen:
        p = a
        for c, d in olculen:
            if d <= p or c >= b:
                continue
            if c > p:
                out.append([p, c])
            p = max(p, d)
        if p < b - 1e-6:
            out.append([p, b])
    return [x for x in out if x[1] - x[0] > 0.5]


def isle(yol, aralik, motor, istenen=None, zorla=False):
    """istenen: [[bas, son]] kaynak saniyesi (None = tum klip). Onbellek: ayni klip + aralik; yalniz olculmemis parcalar taranir."""
    hedef = os.path.splitext(yol)[0] + '.yazi.json'
    im = imza(yol)
    eski = None
    if not zorla and os.path.exists(hedef):
        try:
            eski = json.load(open(hedef, encoding='utf-8'))
            if eski.get('imza') != im or abs(float(eski.get('aralik', 0)) - aralik) > 1e-6 or 'ham' not in eski:
                eski = None
        except Exception:
            eski = None
    olculen = eski['olculen'] if eski else []
    ham = [tuple(x) for x in eski['ham']] if eski else []
    sure = eski['sure'] if eski else (bilgi(yol) or (0, 0, 0))[2]
    istenen = aralik_birlestir([[max(0.0, a), min(sure, b)] for a, b in (istenen or [[0, sure]]) if min(sure, b) > max(0.0, a)])
    yeni = [[math.floor(a / aralik) * aralik, b] for a, b in eksik(istenen, olculen)]   # ornek izgarasi aralik katlarina hizali
    ocr = 0
    if yeni:
        _, orn, ocr = ornekler(yol, aralik, motor, yeni)
        ham = sorted({x[0]: x for x in ham + [(an, k) for an, k in orn if k]}.values(), key=lambda x: x[0])
        olculen = aralik_birlestir(olculen + yeni)
    d = {'kaynak': os.path.basename(yol), 'aralik': aralik, 'sure': round(sure, 3), 'imza': im,
         'olculen': [[round(a, 2), round(b, 2)] for a, b in olculen],
         'bolgeler': birlestir(ham, aralik), 'ham': [list(x) for x in ham]}
    if yeni or eski is None or eski.get('bolgeler') != d['bolgeler']:   # siniflandirma degistiyse OCR'siz yeniden yaz
        gecici = hedef + '.yaziliyor'
        json.dump(d, open(gecici, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        os.replace(gecici, hedef)      # okuyan (kurgu_denetim) yarim dosya gormesin
    return hedef, d, ocr, not yeni


def plan_araliklari(plan, pay):
    """props.json -> {kaynak yolu (public'e gore): [[bas, son]]} : cekimin kaynak penceresi +- pay (duzeltme icin yedek pencere)"""
    p = json.load(open(plan, encoding='utf-8-sig'))
    v = p.get('veri', p)
    fps = float(v.get('fps') or 30)
    out = {}
    for c in v.get('cekimler', []):
        if not c.get('tag'):
            continue
        src = c.get('src') or f"{v.get('klasor', '')}/kaynak/{c['tag']}.mp4"
        kb = float(c.get('kb') or 0)
        out.setdefault(os.path.normpath(src), []).append([kb - pay, kb + c['kare'] / fps + pay])
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('klasor', help='public/<klasor> ya da public/<klasor>/kaynak ya da tek .mp4')
    ap.add_argument('--aralik', type=float, default=1.0)
    ap.add_argument('--plan', help='props.json: yalniz kurgunun kullandigi pencereler (+- --pay sn) taranir (hizli)')
    ap.add_argument('--pay', type=float, default=20.0)
    ap.add_argument('--zorla', action='store_true')
    a = ap.parse_args()
    import logging
    logging.disable(logging.WARNING)
    if os.path.isfile(a.klasor):
        dosyalar = [a.klasor]
    else:
        k = os.path.join(a.klasor, 'kaynak') if os.path.isdir(os.path.join(a.klasor, 'kaynak')) else a.klasor
        dosyalar = sorted(glob.glob(os.path.join(k, '*.mp4')) + glob.glob(os.path.join(k, '*.webm')) + glob.glob(os.path.join(k, '*.mov')))
    if not dosyalar:
        sys.exit(f'klip yok: {a.klasor}')
    plan = plan_araliklari(a.plan, a.pay) if a.plan else None
    motor = None
    toplam_b = alt = 0
    for y in dosyalar:
        istenen = None
        if plan is not None:
            yn = os.path.normpath(os.path.abspath(y))
            istenen = next((v for k, v in plan.items() if yn.endswith(os.sep + k)), None)
            if istenen is None:
                continue                      # kurguda kullanilmiyor
        if motor is None:
            motor = ocr_motor()
        hedef, d, ocr, onb = isle(y, a.aralik, motor, istenen, a.zorla)
        b = d['bolgeler']
        altb = [x for x in b if x['kutu'][1] + x['kutu'][3] / 2 >= ALT_UCTE_BIR and x['tur'] == 'kaplama']
        toplam_b += len(b)
        alt += len(altb)
        ornek = '; '.join(f"{x['bas']:.0f}-{x['bit']:.0f}s \"{x['metin'][:28]}\"" for x in altb[:3])
        kap = sum(q - p for p, q in d['olculen'])
        print(f"{os.path.basename(y)}: {len(b)} bolge ({sum(x['tur'] == 'kaplama' for x in b)} kaplama), alt ucte birde kaplama {len(altb)} · olculen {kap:.0f}/{d['sure']:.0f} sn"
              f"{' (onbellek)' if onb else f' ({ocr} OCR)'}{' — ' + ornek if ornek else ''}", flush=True)
    print(f'TOPLAM {toplam_b} yazi bolgesi ({alt} alt ucte birde kaplama) -> <tag>.yazi.json')


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
