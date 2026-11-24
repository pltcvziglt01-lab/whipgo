#!/usr/bin/env python3
"""SFX OLCUMU — repertuar/Sfx.tsx'teki SFX_PALET seslerinin baslangic / tepe ani / ornek tepesi olculur ve SFX_OLCU tablosu
yeniden yazilir. Yeni ses paletine eklenince ya da paket degisince calistir (dogrula.py olcusuz sesi FAIL sayar).
Kullanim:
  py sfx_olc.py [--sfx C:/otomasyon/yt-uretim/varlik/sfx] [--deneme]
Olculenler (ilk 4 sn, mono 8 kHz):
  bas  = zarf (10 ms) tepenin %10'unu ilk astigi an  -> Sfx.tsx bastaki sessizligi kirpar
  tepe = zarfin en yuksek ani                        -> bu an olay karesine oturur (whoosh tepesi kesimde)
  db   = ORNEK tepesi dBFS (zarf degil)              -> seviye normalizasyonu bununla: kirpilma olmaz
"""
import argparse, os, re, subprocess, sys
import numpy as np
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
SFX_TSX = os.path.join(KOK, 'repertuar', 'Sfx.tsx')


def olc(yol):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', yol, '-t', '4', '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], capture_output=True)
    x = np.abs(np.frombuffer(r.stdout, dtype=np.float32))
    if not len(x):
        return None
    z = np.convolve(x, np.ones(80) / 80, mode='same')
    tepe = int(np.argmax(z))
    bas = int(np.argmax(z > z[tepe] * 0.1))
    return round(bas / 8000, 3), round(tepe / 8000, 3), round(20 * np.log10(float(x.max()) + 1e-9), 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--sfx', default=os.path.join(KOK, 'varlik', 'sfx'))
    ap.add_argument('--deneme', action='store_true')
    a = ap.parse_args()
    s = open(SFX_TSX, encoding='utf-8').read()
    palet = sorted(set(re.findall(r"\['([^']+\.(?:wav|mp3))'", s[s.index('export const SFX_PALET'):])))
    tablo, yok = [], []
    for d in palet:
        p = os.path.join(a.sfx, d)
        o = olc(p) if os.path.exists(p) else None
        if o is None:
            yok.append(d)
            continue
        tablo.append(f"'{d}': [{o[0]}, {o[1]}, {o[2]}]")
    if yok:
        print('UYARI olculemedi (dosya yok/bos):', yok)
    satir = 'export const SFX_OLCU: Record<string, [bas: number, tepe: number, db: number]> = {' + ', '.join(tablo) + '};'
    yeni = re.sub(r'export const SFX_OLCU: Record<string, \[bas: number, tepe: number, db: number\]> = \{.*?\};', lambda m: satir, s, count=1, flags=re.S)
    if yeni == s:
        print('degisiklik yok')
    elif a.deneme:
        print(satir[:400] + ' ...')
    else:
        open(SFX_TSX, 'w', encoding='utf-8', newline='\n').write(yeni)
        print(f'SFX_OLCU yazildi: {len(tablo)} ses -> {SFX_TSX}')


if __name__ == '__main__':
    main()
