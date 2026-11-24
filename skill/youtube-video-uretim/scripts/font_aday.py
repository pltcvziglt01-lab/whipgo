#!/usr/bin/env python3
"""Rakibin ekran yazisinin FONTUNU bulmak icin aday karsilastirma sayfasi.

edit_dili.py her videoda en buyuk yazilari kirpintilar/NN.png olarak kaydeder. Bu betik bir kirpintiyi
alir, ayni metni ~45 aday fontla (Google Fonts + Windows) ayni yukseklikte cizer, sekil olcutleriyle
(genislik/yukseklik, cizgi kalinligi, dolu alan) siralar ve en yakin 12'yi kirpintinin altina dizer.
Son karar GOZLE verilir: sayfayi Read ile ac, serif/sans, harf genisligi, 'R','G','a' bicimine bak.

Kullanim:
  py font_aday.py --indir [--font-dir <kutuphane>/fontlar]          # aday fontlari bir kez indir (OFL lisansli)
  py font_aday.py <editdili_klasoru> [--adet 3] [--font-dir ...]   # en buyuk 3 kirpinti icin sayfa
  py font_aday.py --kirp yazi.png --metin "CLEAN THE TRACK"          # tek kirpinti
Cikti: <klasor>/font-aday-NN.jpg + font-aday.json (sirali adaylar ve skorlar)
"""
import argparse, json, os, sys, urllib.request
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

VARSAYILAN_DIR = os.environ.get('EDIT_KUTUPHANE', r"G:\Drive'ım\edit kutuphane") + os.sep + 'fontlar'
GF = 'https://github.com/google/fonts/raw/main/'
FONTLAR = {  # ad: (yol adaylari, kategori)
    'Montserrat': (['ofl/montserrat/Montserrat[wght].ttf'], 'sans geometrik'),
    'Bebas Neue': (['ofl/bebasneue/BebasNeue-Regular.ttf'], 'sans dar buyuk harf'),
    'Anton': (['ofl/anton/Anton-Regular.ttf'], 'sans dar kalin'),
    'Oswald': (['ofl/oswald/Oswald[wght].ttf'], 'sans dar'),
    'Inter': (['ofl/inter/Inter[opsz,wght].ttf'], 'sans grotesk'),
    'Roboto': (['ofl/roboto/Roboto[wdth,wght].ttf', 'apache/roboto/Roboto[wdth,wght].ttf'], 'sans grotesk'),
    'Roboto Condensed': (['ofl/robotocondensed/RobotoCondensed[wght].ttf'], 'sans dar'),
    'Poppins': (['ofl/poppins/Poppins-Bold.ttf'], 'sans geometrik'),
    'Open Sans': (['ofl/opensans/OpenSans[wdth,wght].ttf'], 'sans hümanist'),
    'Lato': (['ofl/lato/Lato-Bold.ttf'], 'sans hümanist'),
    'Raleway': (['ofl/raleway/Raleway[wght].ttf'], 'sans zarif'),
    'Nunito': (['ofl/nunito/Nunito[wght].ttf'], 'sans yuvarlak'),
    'Work Sans': (['ofl/worksans/WorkSans[wght].ttf'], 'sans grotesk'),
    'DM Sans': (['ofl/dmsans/DMSans[opsz,wght].ttf'], 'sans geometrik'),
    'Space Grotesk': (['ofl/spacegrotesk/SpaceGrotesk[wght].ttf'], 'sans teknik'),
    'League Spartan': (['ofl/leaguespartan/LeagueSpartan[wght].ttf'], 'sans geometrik kalin'),
    'Archivo Black': (['ofl/archivoblack/ArchivoBlack-Regular.ttf'], 'sans cok kalin'),
    'Barlow Condensed': (['ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf'], 'sans dar'),
    'Fjalla One': (['ofl/fjallaone/FjallaOne-Regular.ttf'], 'sans dar'),
    'Teko': (['ofl/teko/Teko[wght].ttf'], 'sans cok dar'),
    'Kanit': (['ofl/kanit/Kanit-Bold.ttf'], 'sans kalin'),
    'Rubik': (['ofl/rubik/Rubik[wght].ttf'], 'sans yuvarlak'),
    'Staatliches': (['ofl/staatliches/Staatliches-Regular.ttf'], 'sans dar buyuk harf'),
    'Black Ops One': (['ofl/blackopsone/BlackOpsOne-Regular.ttf'], 'askeri stencil'),
    'Bangers': (['ofl/bangers/Bangers-Regular.ttf'], 'cizgi roman'),
    'Permanent Marker': (['ofl/permanentmarker/PermanentMarker-Regular.ttf'], 'el yazisi marker'),
    'Playfair Display': (['ofl/playfairdisplay/PlayfairDisplay[wght].ttf'], 'serif yuksek kontrast'),
    'DM Serif Display': (['ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf'], 'serif baslik'),
    'Abril Fatface': (['ofl/abrilfatface/AbrilFatface-Regular.ttf'], 'serif cok kalin'),
    'Libre Baskerville': (['ofl/librebaskerville/LibreBaskerville-Regular.ttf'], 'serif klasik'),
    'EB Garamond': (['ofl/ebgaramond/EBGaramond[wght].ttf'], 'serif klasik'),
    'Cormorant Garamond': (['ofl/cormorantgaramond/CormorantGaramond[wght].ttf'], 'serif zarif'),
    'Cinzel': (['ofl/cinzel/Cinzel[wght].ttf'], 'serif roma buyuk harf'),
    'Merriweather': (['ofl/merriweather/Merriweather[opsz,wdth,wght].ttf'], 'serif okuma'),
    'Lora': (['ofl/lora/Lora[wght].ttf'], 'serif okuma'),
    'Source Serif 4': (['ofl/sourceserif4/SourceSerif4[opsz,wght].ttf'], 'serif okuma'),
    'Alfa Slab One': (['ofl/alfaslabone/AlfaSlabOne-Regular.ttf'], 'slab kalin'),
    'Special Elite': (['ofl/specialelite/SpecialElite-Regular.ttf'], 'daktilo eskitilmis'),
    'Courier Prime': (['ofl/courierprime/CourierPrime-Regular.ttf'], 'daktilo'),
    'Noto Sans JP': (['ofl/notosansjp/NotoSansJP[wght].ttf'], 'japonca sans'),
    'Noto Serif JP': (['ofl/notoserifjp/NotoSerifJP[wght].ttf'], 'japonca serif'),
}
WINDOWS = {'Impact': 'impact.ttf', 'Arial Black': 'ariblk.ttf', 'Arial Bold': 'arialbd.ttf', 'Arial': 'arial.ttf',
           'Georgia Bold': 'georgiab.ttf', 'Times New Roman': 'times.ttf', 'Trebuchet Bold': 'trebucbd.ttf',
           'Segoe UI Bold': 'segoeuib.ttf', 'Verdana Bold': 'verdanab.ttf', 'Tahoma Bold': 'tahomabd.ttf'}


def indir(d):
    os.makedirs(d, exist_ok=True)
    for ad, (yollar, _) in FONTLAR.items():
        hedef = os.path.join(d, ad.replace(' ', '') + '.ttf')
        if os.path.exists(hedef) and os.path.getsize(hedef) > 10000:
            continue
        for y in yollar:
            try:
                with urllib.request.urlopen(GF + urllib.request.quote(y), timeout=60) as r:
                    veri = r.read()
                open(hedef, 'wb').write(veri)
                print('ok', ad)
                break
            except Exception as h:
                print('yok', ad, y, h)


def adaylar(d):
    sonuc = []
    for ad, (_, kat) in FONTLAR.items():
        f = os.path.join(d, ad.replace(' ', '') + '.ttf')
        if os.path.exists(f):
            sonuc.append((ad, f, kat))
    for ad, dosya in WINDOWS.items():
        f = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', dosya)
        if os.path.exists(f):
            sonuc.append((ad, f, 'windows'))
    return sonuc


def font_ac(yol, boy, agirlik):
    f = ImageFont.truetype(yol, boy)
    try:
        adlar = [n.decode() if isinstance(n, bytes) else n for n in f.get_variation_names()]
        for hedef in ([agirlik] + (['ExtraBold', 'Black'] if agirlik == 'Bold' else [])):
            if hedef in adlar:
                f.set_variation_by_name(hedef)
                break
    except Exception:
        pass
    return f


def maske(img):
    g = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2GRAY)
    _, m = cv2.threshold(g, 0, 1, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kenar = np.concatenate([m[0], m[-1], m[:, 0], m[:, -1]])
    if kenar.mean() > 0.5:
        m = 1 - m
    ys, xs = np.where(m > 0)
    if len(xs) < 10:
        return None
    return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def ozellik(m):
    h, w = m.shape
    alan = m.sum()
    cevre = cv2.Canny((m * 255).astype(np.uint8), 50, 150).astype(bool).sum() + 1
    sutun = (m.sum(axis=0) > 0).astype(np.int8)
    bosluk = np.diff(np.concatenate([[0], sutun, [0]]))
    harf = max(1, (bosluk == 1).sum())
    return np.array([w / h, 2 * alan / cevre / h, alan / (w * h), w / h / harf])


def benzerlik(m1, m2):
    """Iki yazi maskesini ayni kutuya olcekleyip ortusmeyi (IoU) olcer; harf araligi farkina karsi
    ayrica her maskeyi bosluklari silinmis (sutunlari sikistirilmis) haliyle de karsilastirir."""
    def sikistir(m):
        dolu = m.sum(axis=0) > 0
        return m[:, dolu] if dolu.sum() > 4 else m
    en = 0.0
    for a, b in ((m1, m2), (sikistir(m1), sikistir(m2))):
        h, w = a.shape
        bb = cv2.resize(b.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST).astype(bool)
        aa = a.astype(bool)
        iou = (aa & bb).sum() / max(1, (aa | bb).sum())
        en = max(en, float(iou))
    return en


def ciz(metin, yol, agirlik, h=90):
    f = font_ac(yol, h, agirlik)
    x0, y0, x1, y1 = f.getbbox(metin)
    im = Image.new('L', (x1 - x0 + 20, y1 - y0 + 20), 0)
    ImageDraw.Draw(im).text((10 - x0, 10 - y0), metin, fill=255, font=f)
    return im


def sayfa(kirp_yol, metin, d, cikti, no):
    kirp = Image.open(kirp_yol).convert('RGB')
    mk = maske(kirp)
    if mk is None:
        return None
    hedef = ozellik(mk)
    sonuc = []
    for ad, yol, kat in adaylar(d):
        for agr in ('Bold', 'Regular'):
            try:
                im = ciz(metin, yol, agr)
            except Exception:
                continue
            m = maske(im.convert('RGB'))
            if m is None:
                continue
            o = ozellik(m)
            sekil = float(np.abs(np.log((o + 1e-3) / (hedef + 1e-3))) @ np.array([1.0, 1.5, 1.0, 0.5]))
            skor = (1 - benzerlik(mk, m)) * 3 + sekil * 0.5
            sonuc.append({'font': ad, 'agirlik': agr, 'kategori': kat, 'skor': round(skor, 3), '_im': im})
            if kat == 'windows' or 'Regular' in yol or 'Bold' in os.path.basename(yol):
                break  # sabit agirlikli dosya: tek cizim yeter
    sonuc.sort(key=lambda s: s['skor'])
    ust = sonuc[:12]
    ft = ImageFont.truetype(os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', 'arial.ttf'), 18)
    gen = 1400
    kh = 110
    im = Image.new('RGB', (gen, 150 + len(ust) * (kh + 30)), (250, 250, 250))
    d2 = ImageDraw.Draw(im)
    k2 = kirp.resize((min(gen - 20, int(kirp.width * 120 / kirp.height)), 120))
    im.paste(k2, (10, 10))
    d2.text((10, 132), f'RAKIP KIRPINTI: "{metin}"  — asagida en yakin {len(ust)} aday (skor kucuk = daha yakin)', fill=(200, 0, 0), font=ft)
    y = 160
    for s in ust:
        a = s.pop('_im')
        a = a.resize((min(gen - 320, int(a.width * kh / a.height)), kh))
        im.paste(Image.merge('RGB', [Image.eval(a, lambda v: 255 - v)] * 3), (300, y))
        d2.text((10, y + 40), f"{s['font']} {s['agirlik']}\n{s['kategori']} · {s['skor']}", fill=(0, 0, 0), font=ft)
        y += kh + 30
    for s in sonuc[12:]:
        s.pop('_im', None)
    yol = os.path.join(cikti, f'font-aday-{no:02d}.jpg')
    im.save(yol, quality=88)
    return {'kirpinti': os.path.basename(kirp_yol), 'metin': metin, 'sayfa': os.path.basename(yol), 'adaylar': ust}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('klasor', nargs='?')
    ap.add_argument('--indir', action='store_true')
    ap.add_argument('--font-dir', default=VARSAYILAN_DIR)
    ap.add_argument('--adet', type=int, default=3)
    ap.add_argument('--kirp')
    ap.add_argument('--metin')
    a = ap.parse_args()
    if a.indir:
        indir(a.font_dir)
        return
    if a.kirp:
        r = sayfa(a.kirp, a.metin, a.font_dir, os.path.dirname(os.path.abspath(a.kirp)), 1)
        print(json.dumps(r, ensure_ascii=False, indent=1))
        return
    kd = os.path.join(a.klasor, 'kirpintilar')
    meta = json.load(open(os.path.join(kd, 'kirpintilar.json'), encoding='utf-8'))
    meta = [m for m in meta if len(m['txt']) >= 3][:a.adet]
    out = []
    for i, m in enumerate(meta, 1):
        r = sayfa(os.path.join(kd, m['dosya']), m['txt'], a.font_dir, a.klasor, i)
        if r:
            out.append(r)
            print(f"{m['txt'][:30]:30s} -> " + ', '.join(f"{s['font']} {s['agirlik']}" for s in r['adaylar'][:4]))
    json.dump(out, open(os.path.join(a.klasor, 'font-aday.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
