#!/usr/bin/env python3
"""Kapak gorsellerinin olculebilir ozellikleri + karsilastirma sayfasi (rakip veya bizim kapaklar).

Kullanim:
  py kapak_metrik.py kapak-1.jpg kapak-2.jpg kapak-3.jpg [--cikti kapak-analiz] [--etiket "R1,R2,R3"]

Olcer: cozunurluk, parlaklik, doygunluk, kontrast, renklilik (Hasler-Susstrunk), sicak/soguk orani,
baskin 6 renk (hex + %), 3x3 izgarada kenar/ayrinti yogunlugu (yazi ve ozne nerede), sol/orta/sag agirlik.
Sayfa: buyuk gorunum + palet seritleri + YouTube ana sayfa boyutu (360x202) + mobil kucuk (168x94).
Yazi icerigi, font, gercekcilik, tema, duygu gibi seyler OLCULEMEZ -> sayfayi Read ile ac, sen analiz et.
"""
import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def font(b):
    for f in ('arial.ttf', 'DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, b)
        except OSError:
            pass
    return ImageFont.load_default()


def olc(yol):
    im = Image.open(yol).convert('RGB')
    w, h = im.size
    k = im.resize((480, int(480 * h / w)))
    a = np.asarray(k).astype(np.float32)
    hsv = np.asarray(k.convert('HSV')).astype(np.float32)
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    rg = a[..., 0] - a[..., 1]
    yb = 0.5 * (a[..., 0] + a[..., 1]) - a[..., 2]
    renkli = float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2))
    hue, sat = hsv[..., 0] * 360 / 255, hsv[..., 1]
    doy = sat > 60
    sicak = ((hue < 70) | (hue > 300)) & doy
    soguk = ((hue > 160) & (hue < 280)) & doy
    q = k.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[:18]
    say = sorted(q.getcolors(), reverse=True)
    toplam = sum(c for c, _ in say)
    baskin = [{'hex': '#%02X%02X%02X' % tuple(pal[i * 3:i * 3 + 3]), 'yuzde': round(c * 100 / toplam, 1)} for c, i in say]
    ken = np.asarray(k.convert('L').filter(ImageFilter.FIND_EDGES)).astype(np.float32)
    gh, gw = ken.shape[0] // 3, ken.shape[1] // 3
    izgara = [[round(float(ken[r * gh:(r + 1) * gh, c * gw:(c + 1) * gw].mean()), 1) for c in range(3)] for r in range(3)]
    sutun = [sum(izgara[r][c] for r in range(3)) for c in range(3)]
    return {'dosya': os.path.basename(yol), 'boyut': f'{w}x{h}', 'oran': round(w / h, 3),
            'parlaklik': round(float(L.mean()), 1), 'kontrast': round(float(L.std()), 1),
            'doygunluk': round(float(sat.mean()), 1), 'renklilik': round(renkli, 1),
            'sicak_yuzde': round(float(sicak.mean() * 100), 1), 'soguk_yuzde': round(float(soguk.mean() * 100), 1),
            'baskin_renkler': baskin, 'ayrinti_izgara_3x3': izgara,
            'agirlik_sol_orta_sag': [round(x / sum(sutun) * 100) for x in sutun]}


def sayfa(yollar, etiketler, metr, cikti):
    G, P = 640, 360
    satir_h = P + 40 + 110
    img = Image.new('RGB', (len(yollar) * (G + 20) + 20, satir_h + 40), (245, 245, 245))
    d = ImageDraw.Draw(img)
    fb, fk = font(20), font(14)
    for i, (y, e, m) in enumerate(zip(yollar, etiketler, metr)):
        x = 20 + i * (G + 20)
        im = Image.open(y).convert('RGB')
        img.paste(im.resize((G, P), Image.LANCZOS), (x, 20))
        d.text((x, P + 26), f"{e}  {m['boyut']}  L{m['parlaklik']} S{m['doygunluk']} C{m['kontrast']}", fill=(0, 0, 0), font=fb)
        px = x
        for r in m['baskin_renkler']:
            ww = int(G * 0.55 * r['yuzde'] / 100) + 2
            d.rectangle([px, P + 54, px + ww, P + 78], fill=r['hex'])
            px += ww
        d.text((x, P + 82), ' '.join(r['hex'] for r in m['baskin_renkler'][:4]), fill=(60, 60, 60), font=fk)
        img.paste(im.resize((168, 94), Image.LANCZOS), (x + G - 168, P + 54))
        d.text((x + G - 168, P + 150), 'mobil 168x94', fill=(90, 90, 90), font=fk)
    img.save(cikti, quality=90)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('kapaklar', nargs='+')
    ap.add_argument('--cikti', default='kapak-analiz')
    ap.add_argument('--etiket')
    a = ap.parse_args()
    os.makedirs(a.cikti, exist_ok=True)
    et = a.etiket.split(',') if a.etiket else [f'#{i + 1}' for i in range(len(a.kapaklar))]
    m = [olc(y) for y in a.kapaklar]
    json.dump(m, open(os.path.join(a.cikti, 'metrik.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sayfa(a.kapaklar, et, m, os.path.join(a.cikti, 'karsilastirma.jpg'))
    # ana sayfa simulasyonu: YouTube akisi boyutunda yan yana
    akis = Image.new('RGB', (len(a.kapaklar) * 376 + 16, 230), (15, 15, 15))
    for i, y in enumerate(a.kapaklar):
        akis.paste(Image.open(y).convert('RGB').resize((360, 202), Image.LANCZOS), (16 + i * 376, 14))
    akis.save(os.path.join(a.cikti, 'akis-onizleme.jpg'), quality=90)
    print('| Kapak | Boyut | Parlaklik | Kontrast | Doygunluk | Renklilik | Sicak% | Soguk% | Agirlik S/O/S | Baskin renkler |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for e, x in zip(et, m):
        print(f"| {e} | {x['boyut']} | {x['parlaklik']} | {x['kontrast']} | {x['doygunluk']} | {x['renklilik']} | {x['sicak_yuzde']} | {x['soguk_yuzde']} | "
              f"{x['agirlik_sol_orta_sag']} | {' '.join(r['hex'] + '(' + str(r['yuzde']) + ')' for r in x['baskin_renkler'][:4])} |")
    print(f'Sayfalar: {a.cikti}/karsilastirma.jpg, akis-onizleme.jpg')


if __name__ == '__main__':
    main()
