#!/usr/bin/env python3
"""Kalip cumle sayimi + onceki videolarla ortak kelime dizileri (TTS'ten ONCE calistir).

Kullanim:
  py kalip_kontrol.py videoNN/metin.txt --onceki v1/metin.txt v2/metin.txt v3/metin.txt \
     [--kaliplar sistem/kaliplar.txt] [--n 6] [--cjk]

kaliplar.txt satir bicimi:  <ifade> | <izin verilen en cok sayi>   (sayi yoksa 1)
  Ornek:  Ehrlich gesagt | 3
          Fangen wir an.
'#' ile baslayan satirlar (bolum basliklari) metinden atilir.
--cjk: Japonca/Cince icin kelime yerine karakter n-gram (varsayilan n=15).
Cikis kodu 1 = temiz degil.
"""
import argparse, re, sys
from collections import Counter


def oku(yol):
    with open(yol, encoding='utf-8-sig') as f:
        return '\n'.join(s for s in f.read().splitlines() if not s.lstrip().startswith('#'))


def birimler(metin, cjk):
    if cjk:
        return [c for c in re.sub(r'\s+', '', metin)]
    return re.findall(r"[\w'’-]+", metin.lower())


def ngramlar(b, n):
    return {tuple(b[i:i + n]) for i in range(len(b) - n + 1)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('metin')
    ap.add_argument('--onceki', nargs='*', default=[])
    ap.add_argument('--kaliplar')
    ap.add_argument('--n', type=int)
    ap.add_argument('--cjk', action='store_true')
    a = ap.parse_args()
    n = a.n or (15 if a.cjk else 6)
    metin = oku(a.metin)
    temiz = True

    if a.kaliplar:
        print('== Kalip cumleler')
        with open(a.kaliplar, encoding='utf-8-sig') as f:
            for satir in f:
                satir = satir.strip()
                if not satir or satir.startswith('#'):
                    continue
                ifade, _, sinir = satir.partition('|')
                ifade = ifade.strip()
                sinir = int(sinir.strip()) if sinir.strip() else 1
                adet = metin.lower().count(ifade.lower())
                if adet:
                    durum = 'FAZLA' if adet > sinir else 'ok'
                    if adet > sinir:
                        temiz = False
                    print(f'  {durum:5} {adet}/{sinir}  {ifade}')

    yeni = birimler(metin, a.cjk)
    yeni_ng = ngramlar(yeni, n)
    for yol in a.onceki:
        eski_ng = ngramlar(birimler(oku(yol), a.cjk), n)
        ortak = yeni_ng & eski_ng
        print(f'== {yol}: {len(ortak)} ortak {n}-gram')
        if ortak:
            temiz = False
            # ortak n-gramlari birlesik diziler halinde goster
            isaret = [False] * len(yeni)
            for i in range(len(yeni) - n + 1):
                if tuple(yeni[i:i + n]) in ortak:
                    for j in range(i, i + n):
                        isaret[j] = True
            dizi, diziler = [], []
            for w, m in zip(yeni, isaret):
                if m:
                    dizi.append(w)
                elif dizi:
                    diziler.append(dizi); dizi = []
            if dizi:
                diziler.append(dizi)
            ayr = '' if a.cjk else ' '
            for d in Counter(ayr.join(d) for d in diziler).most_common(15):
                print(f'   - "{d[0]}"' + (f' x{d[1]}' if d[1] > 1 else ''))

    print('TEMIZ' if temiz else 'TEMIZ DEGIL -> metni duzelt, sonra seslendir')
    sys.exit(0 if temiz else 1)


if __name__ == '__main__':
    main()
