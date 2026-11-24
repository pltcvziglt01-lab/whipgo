#!/usr/bin/env python3
"""SFX paketlerini (zip) ortak klasore acar, adlari temizler, sfx-katalog.json yazar.

Kullanim:
  py sfx_kur.py "SFX_Pack_Mini.zip" "Ultimate_500_Preset_Pack.zip" --hedef C:\\otomasyon\\ortak\\sfx

- Yalniz .wav/.mp3 alinir; __MACOSX ve bozuk (ffprobe okuyamayan) dosyalar atlanir.
- Ad: '@adobebasics', 'Sound Effect', 'By Techno' atilir, kucuk harf, bosluk->'-'.
- Lisans: dosyalar yalniz bitmis videonun parcasi olarak kullanilir; paylasma/yeniden dagitma yok.
"""
import argparse, json, os, re, subprocess, sys, zipfile

KATEGORI = [
    ('gecis', r'whoosh|woosh|swoosh|zhwoop|fly-by|transition|turbulance'),
    ('darbe', r'impact|boom|thump|light-medium-heavy|dada|dodo|whip|slash|shatter'),
    ('yukselme', r'riser|buildup|cinematic-sounds'),
    ('pop-bildirim', r'pop|bing|ding|boop|notification|receive|icons|home|user|^ui|this-one|enter'),
    ('tik-klavye', r'click|klick|tick|typing|tik|drop-down'),
    ('kamera', r'camera|shutter|shot|projecter'),
    ('kagit', r'paper|flip|crumble|ripping|tearing|rustling'),
    ('saat', r'clock'),
    ('para', r'money'),
    ('ortam', r'fire'),
    ('glitch', r'glitch'),
    ('kalabalik', r'applause'),
    ('mizah', r'anime|laush|laugh|slap|discord|minecraft|ringtone'),
]


def temiz_ad(ad):
    kok, uz = os.path.splitext(os.path.basename(ad))
    kok = re.sub(r'@adobebasics|sound effect|by techno', '', kok, flags=re.I)
    kok = re.sub(r"[^\w\[\]]+", '-', kok.lower()).strip('-')
    kok = re.sub(r'-+', '-', kok)
    return kok + uz.lower()


def sure(yol):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', yol],
                       capture_output=True, text=True)
    try:
        return round(float(r.stdout.strip()), 2)
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zipler', nargs='+')
    ap.add_argument('--hedef', required=True)
    a = ap.parse_args()
    os.makedirs(a.hedef, exist_ok=True)
    katalog = {}
    for z in a.zipler:
        with zipfile.ZipFile(z) as zf:
            for bilgi in zf.infolist():
                n = bilgi.filename
                if '__MACOSX' in n or bilgi.is_dir() or not n.lower().endswith(('.wav', '.mp3')):
                    continue
                ad = temiz_ad(n)
                if ad in katalog:
                    k, u = os.path.splitext(ad)
                    ad = f'{k}-2{u}'
                yol = os.path.join(a.hedef, ad)
                with zf.open(bilgi) as kaynak, open(yol, 'wb') as h:
                    h.write(kaynak.read())
                d = sure(yol)
                if not d:
                    os.remove(yol)
                    print(f'atlandi (bozuk): {n}')
                    continue
                kat = next((k for k, desen in KATEGORI if re.search(desen, ad)), 'diger')
                katalog[ad] = {'sure': d, 'kategori': kat, 'kaynak': os.path.basename(z)}
    with open(os.path.join(a.hedef, 'sfx-katalog.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(katalog.items())), f, ensure_ascii=False, indent=1)
    sayim = {}
    for v in katalog.values():
        sayim[v['kategori']] = sayim.get(v['kategori'], 0) + 1
    print(f'{len(katalog)} SFX -> {a.hedef}')
    print(', '.join(f'{k}:{v}' for k, v in sorted(sayim.items())))


if __name__ == '__main__':
    main()
