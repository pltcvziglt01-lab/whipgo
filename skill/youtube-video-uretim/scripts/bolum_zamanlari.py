#!/usr/bin/env python3
"""metin.txt '# ' bolum basliklari + cumleler.json -> YouTube bolum zamanlari.

Kullanim:
  py bolum_zamanlari.py cumleler.json metin.txt [--adlar "Einleitung,Nummer 10,..."]

cumleler.json: liste; her eleman en az {"t": baslangic_sn} ve "metin"/"text"/"cumle" alani
(ya da {"cumleler":[...]}). Bolum sinirlari, metin.txt'deki her '# ' basliktan sonraki ilk
cumlenin cumleler.json'daki sirasindan bulunur (cumle sayaci metin.txt'deki cumle bolmeyle).
Basliklar '# 3 NUMMER 8 DOBERMANN' gibi ise bastaki numara atilir; --adlar ile ustune yazilir.
Ilk bolum her zaman 0:00. YouTube kurali: en az 3 bolum, her biri >=10 sn.
"""
import argparse, json, re, sys

CUMLE = re.compile(r'(?<=[.!?。！？])\s+|(?<=[。！？])')


def zaman(s):
    s = int(round(s))
    return f'{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}' if s >= 3600 else f'{s // 60}:{s % 60:02d}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cumleler')
    ap.add_argument('metin')
    ap.add_argument('--adlar')
    a = ap.parse_args()

    with open(a.cumleler, encoding='utf-8-sig') as f:
        c = json.load(f)
    if isinstance(c, dict):
        c = c.get('cumleler') or c.get('sentences') or list(c.values())[0]
    t = [float(x.get('t', x.get('start', 0))) for x in c]

    bolumler, sayac = [], 0
    with open(a.metin, encoding='utf-8-sig') as f:
        for satir in f:
            s = satir.strip()
            if s.startswith('#'):
                ad = re.sub(r'^#+\s*\d*\s*', '', s).strip().title()
                bolumler.append([ad, sayac])
            elif s:
                sayac += len([p for p in CUMLE.split(s) if p.strip()])

    if a.adlar:
        for b, ad in zip(bolumler, a.adlar.split(',')):
            b[0] = ad.strip()
    if sayac != len(t):
        print(f'UYARI: metin {sayac} cumle, cumleler.json {len(t)} -> sinirlar kayabilir, kontrol et', file=sys.stderr)

    cikti, onceki = [], -999
    for i, (ad, idx) in enumerate(bolumler):
        bas = 0.0 if i == 0 else t[min(idx, len(t) - 1)]
        if bas - onceki < 10 and i:
            print(f'UYARI: "{ad}" oncekinden <10 sn sonra, birlestir', file=sys.stderr)
        cikti.append(f'{zaman(bas)} {ad}')
        onceki = bas
    print('\n'.join(cikti))


if __name__ == '__main__':
    main()
