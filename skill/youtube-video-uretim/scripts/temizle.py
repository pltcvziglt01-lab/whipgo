#!/usr/bin/env python3
"""Rakip analizi bitince indirilen videolari ve ara dosyalari siler; raporlar, kapaklar ve
kontakt sayfalari kalir.

Kullanim:
  py temizle.py rakip-analiz/<kanal>            # indirilenler.json'daki video/ses dosyalarini siler
  py temizle.py rakip-analiz/<kanal> --deneme   # ne silinecegini gosterir, silmez
  py temizle.py rakip-analiz/<kanal> --altyazi  # .vtt dosyalarini da siler

Yalniz bu klasordeki video/ses/yarim indirme uzantili dosyalara dokunur
(.mp4 .webm .mkv .m4a .mp3 .part .ytdl .temp). Baska hicbir yeri silmez.
"""
import argparse, json, os, sys

VIDEO = ('.mp4', '.webm', '.mkv', '.m4a', '.mp3', '.part', '.ytdl', '.temp', '.f137', '.f140')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('klasor')
    ap.add_argument('--deneme', action='store_true')
    ap.add_argument('--altyazi', action='store_true')
    a = ap.parse_args()
    kok = os.path.abspath(a.klasor)
    if not os.path.isdir(kok):
        sys.exit('klasor yok')
    hedef = set()
    liste = os.path.join(kok, 'indirilenler.json')
    if os.path.exists(liste):
        for y in json.load(open(liste, encoding='utf-8')):
            y = os.path.abspath(y if os.path.isabs(y) else os.path.join(os.getcwd(), y))
            if os.path.exists(y) and y.startswith(kok):
                hedef.add(y)
    for kl, _, dosyalar in os.walk(kok):
        for f in dosyalar:
            fl = f.lower()
            if fl.endswith(VIDEO) or (a.altyazi and fl.endswith('.vtt')):
                hedef.add(os.path.join(kl, f))
    hedef = sorted(y for y in hedef if (a.altyazi or not y.lower().endswith('.vtt')))
    toplam = sum(os.path.getsize(y) for y in hedef)
    for y in hedef:
        print(('silinecek: ' if a.deneme else 'silindi: ') + os.path.relpath(y, kok))
        if not a.deneme:
            os.remove(y)
    kalan = sorted(os.path.relpath(os.path.join(k, f), kok) for k, _, fs in os.walk(kok) for f in fs)
    print(f"{len(hedef)} dosya, {toplam / 1e6:.1f} MB {'silinecek' if a.deneme else 'bosaltildi'}. Kalan {len(kalan)} dosya (rapor/kapak/sayfa).")


if __name__ == '__main__':
    main()
