#!/usr/bin/env python3
"""Bizim finalimiz ile rakip (referans) olcumunu yan yana karsilastirir: puan tablosu + duzeltme eylemleri
+ yan yana goruntu sayfasi.

Kullanim:
  py karsilastir.py --biz bizim-analiz/analiz.json --ref rakip-1/ritim/analiz.json [rakip-2/... rakip-3/...]
                    [--biz-video final.mp4 --ref-video rakip.mp4] [--tolerans 0.2] [--cikti KARSILASTIRMA.md]
Iki taraf da kare_analiz.py ciktisi (analiz.json). Birden cok --ref verilirse hedef = medyan.
--biz-video/--ref-video verilirse ilk 30 sn'den ayni anlarda 8'er kare yan yana (REFERANS ust / BIZ alt);
verilmezse iki tarafin ilk30-0.5.jpg kontakt sayfasi alt alta birlestirilir.
Cikis kodu: tolerans disi satir varsa 1.
"""
import argparse, json, os, statistics, subprocess, sys

OLCULER = [  # anahtar, ad, cok yuksekse eylem, cok dusukse eylem
    ('cekim', 'cekim sayisi', 'cekimleri birlestir / bazi kesimleri kaldir', 'cumle icine kesim ekle, gorsel sayisini artir'),
    ('dakikada_kesim', 'kesim/dk', 'kesimleri seyrelt', 'kesim sikligini artir (cumle ici kesim, ts:)'),
    ('sure_medyan', 'medyan cekim sn', 'cekimleri kisalt (gorsel basina sure dusur)', 'cekimleri uzat, daha az gorsel'),
    ('kelime_dk', 'kelime/dk', 'metin yogun; cumle kisalt (ses hizina DOKUNMA)', 'metin seyrek; bosluk/duraklamalari kisalt (ses hizina DOKUNMA)'),
    ('cekim_basi_kelime', 'kelime/cekim', 'her cumleye daha cok gorsel', 'gorsel basina daha cok kelime'),
    ('zoom_hizi_medyan', 'zoom %/sn', 'Ken Burns yavaslat', 'Ken Burns hizlandir'),
    ('parlaklik_ort', 'parlaklik', 'grade koyulastir', 'grade aydinlat'),
]
KAYNAK = ['duragan-gorsel', 'hareketli-video', 'grafik/kart']


def yukle(y):
    return json.load(open(y, encoding='utf-8'))


def deger(r, bolum, k):
    return (r.get('istatistik', {}).get(bolum) or {}).get(k)


def yan_yana(a, cikti):
    from PIL import Image, ImageDraw
    if a.biz_video and a.ref_video:
        anlar = [i * 30 / 8 + 0.5 for i in range(8)]
        satirlar = []
        for etiket, v in (('REFERANS', a.ref_video), ('BIZ', a.biz_video)):
            kareler = []
            for t in anlar:
                r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', v, '-frames:v', '1', '-vf', 'scale=240:135',
                                    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
                kareler.append(Image.frombytes('RGB', (240, 135), r.stdout[:240 * 135 * 3]) if len(r.stdout) >= 240 * 135 * 3
                               else Image.new('RGB', (240, 135)))
            satirlar.append((etiket, kareler))
        img = Image.new('RGB', (240 * 8, 2 * (135 + 18)), (20, 20, 20))
        d = ImageDraw.Draw(img)
        for s, (etiket, kareler) in enumerate(satirlar):
            for i, k in enumerate(kareler):
                img.paste(k, (i * 240, s * 153 + 18))
                d.text((i * 240 + 4, s * 153 + 3), f'{etiket} {anlar[i]:.1f}s', fill=(255, 220, 80))
        img.save(cikti, quality=85)
        return cikti
    sayfalar = []
    for etiket, y in (('REFERANS', a.ref[0]), ('BIZ', a.biz)):
        p = os.path.join(os.path.dirname(y), 'ilk30-0.5.jpg')
        if os.path.exists(p):
            sayfalar.append((etiket, Image.open(p).convert('RGB')))
    if len(sayfalar) < 2:
        return None
    w = max(s.width for _, s in sayfalar)
    img = Image.new('RGB', (w, sum(s.height + 20 for _, s in sayfalar)), (20, 20, 20))
    d = ImageDraw.Draw(img)
    y = 0
    for etiket, s in sayfalar:
        d.text((4, y + 3), etiket, fill=(255, 220, 80))
        img.paste(s, (0, y + 20))
        y += s.height + 20
    if img.width > 2000:
        img = img.resize((2000, int(img.height * 2000 / img.width)))
    img.save(cikti, quality=85)
    return cikti


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--biz', required=True)
    ap.add_argument('--ref', required=True, nargs='+')
    ap.add_argument('--biz-video')
    ap.add_argument('--ref-video')
    ap.add_argument('--tolerans', type=float, default=0.2)
    ap.add_argument('--cikti', default='KARSILASTIRMA.md')
    a = ap.parse_args()
    biz = yukle(a.biz)
    refs = [yukle(y) for y in a.ref]
    s = ['# Karsilastirma — bizim final vs referans', f'Tolerans ±%{a.tolerans * 100:.0f} (iskelet sayilari, SKILL §8)', '']
    fark_say, eylemler = 0, []
    for bolum in ('ilk30', 'yuzde30', 'sonrasi'):
        s += [f'## {bolum}', '| Olcu | Referans (hedef) | Biz | Fark | Durum |', '|---|---|---|---|---|']
        for k, ad, yuksek, dusuk in OLCULER:
            rv = [deger(r, bolum, k) for r in refs]
            rv = [x for x in rv if isinstance(x, (int, float))]
            bv = deger(biz, bolum, k)
            if not rv or not isinstance(bv, (int, float)):
                s.append(f'| {ad} | {rv[0] if rv else "-"} | {bv if bv is not None else "-"} | - | olculemedi |')
                continue
            h = statistics.median(rv)
            oran = (bv - h) / h if h else 0
            ok = abs(oran) <= a.tolerans or (k == 'parlaklik_ort' and abs(bv - h) <= 15)
            if not ok:
                fark_say += 1
                eylemler.append(f'- {bolum} {ad}: {bv} vs hedef {round(h, 2)} ({oran:+.0%}) -> {yuksek if oran > 0 else dusuk}')
            s.append(f'| {ad} | {round(h, 2)} | {bv} | {oran:+.0%} | {"tamam" if ok else "**FARK**"} |')
        for kt in KAYNAK:
            rv = [((r.get('istatistik', {}).get(bolum) or {}).get('kaynak_yuzde_sure') or {}).get(kt, 0) for r in refs]
            bv = ((biz.get('istatistik', {}).get(bolum) or {}).get('kaynak_yuzde_sure') or {}).get(kt, 0)
            h = statistics.median(rv)
            ok = abs(bv - h) <= 15
            if not ok:
                fark_say += 1
                eylemler.append(f'- {bolum} kaynak %{kt}: {bv} vs hedef {h} -> kaynak karisimini rakibe yaklastir')
            s.append(f'| kaynak % {kt} | {h} | {bv} | {bv - h:+.0f} puan | {"tamam" if ok else "**FARK**"} |')
        s.append('')
    s += ['## Duzeltme eylemleri (en fazla 5; once ilk30)'] + (eylemler[:5] or ['- yok: iskelet tolerans icinde'])
    s += ['', f'LUFS: biz {biz.get("lufs")} / referans ' + ', '.join(str(r.get('lufs')) for r in refs)]
    gorsel = yan_yana(a, os.path.splitext(a.cikti)[0] + '-yanyana.jpg')
    if gorsel:
        s += ['', f'Yan yana sayfa: `{gorsel}` (ac ve BAK: kadraj, yazi, renk, tempo)']
    open(a.cikti, 'w', encoding='utf-8').write('\n'.join(s) + '\n')
    print(f'KARSILASTIRMA fark={fark_say} -> {a.cikti}' + (f' + {gorsel}' if gorsel else ''))
    sys.exit(1 if fark_say else 0)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
