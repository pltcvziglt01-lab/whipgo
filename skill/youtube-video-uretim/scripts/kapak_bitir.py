#!/usr/bin/env python3
"""ChatGPT ciktisi kapaklari YouTube'a hazirlar: 16:9 kirp, 1280x720, JPEG <2 MB; numarali 5'li sayfa,
mobil boyut seridi ve (istenirse) rakip kapaklarla ana sayfa akisi simulasyonu.

Kullanim:
  py kapak_bitir.py kapak-uretim/kapak-*.png --cikti teslim-kapak [--odak orta|sol|sag|ust|alt]
                    [--rakip rakip-analiz/X/kapak-1.jpg rakip-analiz/X/kapak-2.jpg ...]
Cikti: <ad>-1280x720.jpg her biri, kapaklar-sayfa.jpg, akis-karsilastirma.jpg (rakip verildiyse).
"""
import argparse, glob, io, os
from PIL import Image, ImageDraw, ImageFont


def font(b):
    for f in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(f, b)
        except OSError:
            pass
    return ImageFont.load_default()


def kirp169(im, odak):
    w, h = im.size
    hedef = 16 / 9
    if abs(w / h - hedef) < 0.01:
        return im
    if w / h > hedef:
        nw = int(h * hedef)
        x = {'sol': 0, 'sag': w - nw}.get(odak, (w - nw) // 2)
        return im.crop((x, 0, x + nw, h))
    nh = int(w / hedef)
    y = {'ust': 0, 'alt': h - nh}.get(odak, (h - nh) // 2)
    return im.crop((0, y, w, y + nh))


def kaydet(im, yol):
    for q in (95, 92, 88, 84, 80, 75):
        b = io.BytesIO()
        im.save(b, 'JPEG', quality=q, optimize=True, progressive=True)
        if b.tell() < 2_000_000:
            break
    open(yol, 'wb').write(b.getvalue())
    return q, b.tell()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('girdi', nargs='+')
    ap.add_argument('--cikti', default='teslim-kapak')
    ap.add_argument('--odak', default='orta')
    ap.add_argument('--rakip', nargs='*', default=[])
    a = ap.parse_args()
    dosyalar = sorted(f for g in a.girdi for f in glob.glob(g) if not f.endswith('-ekran.png') and not f.endswith('-gonderildi.png'))
    os.makedirs(a.cikti, exist_ok=True)
    hazir = []
    for f in dosyalar:
        im = kirp169(Image.open(f).convert('RGB'), a.odak).resize((1280, 720), Image.LANCZOS)
        ad = os.path.splitext(os.path.basename(f))[0]
        yol = os.path.join(a.cikti, f'{ad}-1280x720.jpg')
        q, boy = kaydet(im, yol)
        hazir.append((ad, im, yol))
        print(f'{yol}  q{q}  {boy / 1e6:.2f} MB')
    if not hazir:
        raise SystemExit('girdi bulunamadi')
    # sayfa: buyuk + mobil boyut
    G, P = 640, 360
    sayfa = Image.new('RGB', (len(hazir) * (G + 16) + 16, P + 160), (18, 18, 18))
    d = ImageDraw.Draw(sayfa)
    for i, (ad, im, _) in enumerate(hazir):
        x = 16 + i * (G + 16)
        sayfa.paste(im.resize((G, P), Image.LANCZOS), (x, 16))
        d.text((x + 8, 22), str(i + 1), fill=(255, 230, 0), font=font(44))
        sayfa.paste(im.resize((168, 94), Image.LANCZOS), (x, P + 32))
        sayfa.paste(im.resize((246, 138), Image.LANCZOS), (x + 184, P + 32 - 22))
        d.text((x, P + 132), f'{ad}  (mobil 168x94 / akis 246x138)', fill=(200, 200, 200), font=font(16))
    sayfa.save(os.path.join(a.cikti, 'kapaklar-sayfa.jpg'), quality=90)
    if a.rakip:
        hepsi = [('BIZ ' + str(i + 1), im) for i, (_, im, _) in enumerate(hazir)] + \
                [('RAKIP ' + str(i + 1), Image.open(r).convert('RGB')) for i, r in enumerate(a.rakip)]
        kol = 4
        sat = (len(hepsi) + kol - 1) // kol
        akis = Image.new('RGB', (kol * 376 + 16, sat * 240 + 16), (15, 15, 15))
        dd = ImageDraw.Draw(akis)
        for i, (et, im) in enumerate(hepsi):
            x, y = 16 + (i % kol) * 376, 16 + (i // kol) * 240
            akis.paste(kirp169(im, 'orta').resize((360, 202), Image.LANCZOS), (x, y))
            dd.text((x, y + 206), et, fill=(220, 220, 220), font=font(16))
        akis.save(os.path.join(a.cikti, 'akis-karsilastirma.jpg'), quality=90)
    print(f'Sayfa: {a.cikti}/kapaklar-sayfa.jpg' + (' + akis-karsilastirma.jpg' if a.rakip else ''))


if __name__ == '__main__':
    main()
