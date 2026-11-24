#!/usr/bin/env python3
"""Planlanan videonun son 3 videoya gore kac eksende farkli oldugunu sayar.

Kullanim:
  py varyasyon_kontrol.py sistem/varyasyon.tsv --yeni "12<TAB>soru+vaat<TAB>tek irk<TAB>..."
  py varyasyon_kontrol.py sistem/varyasyon.tsv --yeni-dosya plan.tsv   (tek satir)
  [--esik 8] [--zorunlu "baslik kalibi,format,kanca tipi,1 numara"] [--ekle]

TSV ilk satiri sutun basliklaridir; ilk sutun video no. Bir sutun, yeni deger son 3 videonun
HICBIRINDE yoksa "farkli" sayilir. --ekle: kontrol gecerse satiri dosyaya ekler.
"""
import argparse, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tsv')
    ap.add_argument('--yeni')
    ap.add_argument('--yeni-dosya')
    ap.add_argument('--esik', type=int, default=8)
    ap.add_argument('--zorunlu', default='')
    ap.add_argument('--son', type=int, default=3)
    ap.add_argument('--ekle', action='store_true')
    a = ap.parse_args()

    with open(a.tsv, encoding='utf-8-sig') as f:
        satirlar = [s.rstrip('\n').split('\t') for s in f if s.strip()]
    baslik, veri = satirlar[0], satirlar[1:]
    if a.yeni_dosya:
        with open(a.yeni_dosya, encoding='utf-8-sig') as f:
            yeni_satir = f.read().strip()
    else:
        yeni_satir = a.yeni or ''
    yeni = yeni_satir.split('\t')
    if len(yeni) != len(baslik):
        sys.exit(f'Sutun sayisi tutmuyor: yeni {len(yeni)}, baslik {len(baslik)}')

    son = veri[-a.son:]
    zorunlu = [z.strip().lower() for z in a.zorunlu.split(',') if z.strip()]
    farkli, ayni = [], []
    for i, ad in enumerate(baslik[1:], start=1):
        eskiler = {r[i].strip().lower() for r in son if i < len(r)}
        (ayni if yeni[i].strip().lower() in eskiler else farkli).append(ad)

    print(f'Farkli eksen: {len(farkli)}/{len(baslik) - 1} (esik {a.esik})')
    if ayni:
        print('Tekrar eden: ' + ', '.join(ayni))
    eksik_zorunlu = [z for z in zorunlu if z in [x.lower() for x in ayni]]
    if eksik_zorunlu:
        print('ZORUNLU EKSEN TEKRAR EDIYOR: ' + ', '.join(eksik_zorunlu))
    gecti = len(farkli) >= a.esik and not eksik_zorunlu
    print('GECTI' if gecti else 'GECMEDI -> plani degistir')
    if gecti and a.ekle:
        with open(a.tsv, 'a', encoding='utf-8') as f:
            f.write(yeni_satir + '\n')
        print('Satir eklendi.')
    sys.exit(0 if gecti else 1)


if __name__ == '__main__':
    main()
