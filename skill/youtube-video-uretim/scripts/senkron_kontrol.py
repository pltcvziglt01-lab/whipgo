#!/usr/bin/env python3
"""Ses ana saattir: cumleler.json zamanlari ile gercek konusma ve (varsa) video uyusuyor mu?

Kullanim:
  py senkron_kontrol.py vo.mp3 cumleler.json [--video final.mp4] [--esik 0.25]
Her yeniden seslendirme, yeniden zamanlama ya da yeniden render sonrasi calistir.

Kontroller:
  FAIL  zamanlar geri gidiyor / cumle bitisi baslangicindan once · son cumle sesin bitisinden sonra
        video ile ses suresi farki > 0,5 sn
  UYARI ilk cumle, konusmanin gercekten basladigi andan > esik farkli (duz whisper ilk kelimeyi ~0,4 sn
        ERKEN baslatir; cozum: WhisperX ya da stable-ts ile zorlamali hizalama, references/ses.md)
        son cumle bitisi ile son konusma farki > 1 sn · cumleler arasi > 2 sn bosluk
cumleler.json: liste (ya da {"cumleler":[...]}); baslangic t/start/bas, bitis bitis/end/son (yoksa sonrakinin t'si).
"""
import argparse, json, re, subprocess, sys


def sure(yol, akis):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', akis, '-show_entries', 'stream=duration:format=duration',
                        '-of', 'json', yol], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}')
    s = j.get('streams') or [{}]
    return float(s[0].get('duration') or j.get('format', {}).get('duration') or 0)


def konusma_sinirlari(yol):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', yol, '-vn', '-af', 'silencedetect=noise=-40dB:d=0.15',
                        '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    bas = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', r.stderr)]
    son = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    toplam = sure(yol, 'a:0')
    ilk = son[0] if bas and bas[0] <= 0.05 and son else 0.0
    sonkon = bas[-1] if bas and (len(son) < len(bas)) else toplam
    return ilk, sonkon, toplam


def al(c, *adlar):
    for a in adlar:
        if a in c and c[a] is not None:
            return float(c[a])
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('vo')
    ap.add_argument('cumleler')
    ap.add_argument('--video')
    ap.add_argument('--esik', type=float, default=0.25)
    a = ap.parse_args()
    j = json.load(open(a.cumleler, encoding='utf-8-sig'))
    if isinstance(j, dict):
        j = j.get('cumleler') or j.get('sentences') or list(j.values())[0]
    F, U = [], []
    ts = []
    for i, c in enumerate(j):
        t = al(c, 't', 'start', 'bas')
        b = al(c, 'bitis', 'end', 'son')
        ts.append((t, b))
    for i in range(len(ts)):
        t, b = ts[i]
        if b is None and i + 1 < len(ts):
            ts[i] = (t, ts[i + 1][0])
    for i, (t, b) in enumerate(ts):
        if t is None:
            F.append(f'cumle {i}: baslangic yok')
            continue
        if b is not None and b < t:
            F.append(f'cumle {i}: bitis {b:.2f} < baslangic {t:.2f}')
        if i and ts[i - 1][0] is not None and t < ts[i - 1][0]:
            F.append(f'cumle {i}: zaman geri gidiyor ({ts[i - 1][0]:.2f} -> {t:.2f})')
        if i and ts[i - 1][1] is not None and t - ts[i - 1][1] > 2:
            U.append(f'cumle {i - 1}->{i}: {t - ts[i - 1][1]:.1f} sn bosluk')
    ilk, sonkon, toplam = konusma_sinirlari(a.vo)
    t0 = ts[0][0] if ts and ts[0][0] is not None else None
    sonb = next((b for _, b in reversed(ts) if b is not None), None)
    print(f'ses {toplam:.2f} sn, konusma {ilk:.2f}-{sonkon:.2f} sn; cumle 0 baslangic {t0}, son bitis {sonb}')
    if t0 is not None and abs(t0 - ilk) > a.esik:
        U.append(f'ilk cumle {t0:.2f} sn, konusma {ilk:.2f} sn basliyor (fark {t0 - ilk:+.2f}); '
                 'whisper erken basladiysa zorlamali hizalama kullan')
    if sonb is not None:
        if sonb > toplam + 0.1:
            F.append(f'son cumle bitisi {sonb:.2f} > ses suresi {toplam:.2f}')
        elif abs(sonb - sonkon) > 1:
            U.append(f'son cumle bitisi {sonb:.2f}, son konusma {sonkon:.2f} (fark {sonb - sonkon:+.2f})')
    if a.video:
        vs, as_ = sure(a.video, 'v:0'), sure(a.video, 'a:0')
        print(f'video: goruntu {vs:.2f} sn, ses {as_:.2f} sn')
        if abs(vs - as_) > 0.5:
            F.append(f'videoda goruntu {vs:.2f} / ses {as_:.2f} sn')
        if abs(as_ - toplam) > 1.0:
            U.append(f'videodaki ses {as_:.2f} sn, vo {toplam:.2f} sn (fark {as_ - toplam:+.2f})')
    for x in F:
        print('FAIL ', x)
    for x in U:
        print('UYARI', x)
    print(f'SENKRON {"PASS" if not F else "FAIL"} fail={len(F)} uyari={len(U)}')
    sys.exit(1 if F else 0)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
