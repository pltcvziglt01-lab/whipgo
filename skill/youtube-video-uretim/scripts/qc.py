#!/usr/bin/env python3
"""Final video QC: duration vs VO, loudness, contact grids, first frame, optional 60s preview.

Kullanim:
  py qc.py final.mp4 [--vo vo.mp3] [--onizleme] [--hedef-lufs -14] [--cikti qc_klasoru]
Cikti: QC raporu (stdout, kisa) + qc-18.jpg, qc-ilk33.jpg, qc-acilis.jpg (+ onizleme.mp4).
Gorselleri Read araciyla AC ve BAK; betik yalniz olcer.
"""
import argparse, json, os, re, subprocess, sys


def calis(args):
    return subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')


def sure(yol):
    r = calis(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', yol])
    return float(r.stdout.strip())


def akis_bilgisi(yol):
    r = calis(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
               'stream=width,height,r_frame_rate,pix_fmt,color_range,color_space', '-of', 'json', yol])
    s = json.loads(r.stdout or '{}').get('streams', [{}])
    return s[0] if s else {}


def loudness(yol):
    r = calis(['ffmpeg', '-hide_banner', '-nostats', '-i', yol, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    log = r.stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', log)
    p = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', log)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


def izgara(yol, cikti, bas, bit, n=18, kolon=3):
    satir = (n + kolon - 1) // kolon
    aralik = max((bit - bas) / n, 0.04)
    calis(['ffmpeg', '-y', '-v', 'error', '-ss', str(bas), '-t', str(bit - bas), '-i', yol, '-vf',
           f'fps=1/{aralik:.3f},scale=480:-1,tile={kolon}x{satir}', '-frames:v', '1', cikti])
    return os.path.exists(cikti)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--vo')
    ap.add_argument('--onizleme', action='store_true')
    ap.add_argument('--hedef-lufs', type=float, default=-14.0)
    ap.add_argument('--cikti')
    a = ap.parse_args()

    out = a.cikti or os.path.join(os.path.dirname(os.path.abspath(a.video)), 'qc')
    os.makedirs(out, exist_ok=True)
    sorun = []

    d = sure(a.video)
    print(f'Sure: {d:.2f} sn ({int(d // 60)}:{d % 60:05.2f})')
    if a.vo:
        dv = sure(a.vo)
        fark = d - dv
        print(f'VO sure: {dv:.2f} sn, fark {fark:+.2f}')
        if abs(fark) > 1.0:
            sorun.append(f'sure farki {fark:+.2f} sn (>1)')

    v = akis_bilgisi(a.video)
    print(f"Goruntu: {v.get('width')}x{v.get('height')} {v.get('r_frame_rate')} {v.get('pix_fmt')} range={v.get('color_range')} space={v.get('color_space')}")
    if v.get('pix_fmt') == 'yuvj420p' or v.get('color_range') == 'pc':
        sorun.append('pc/yuvj420p renk araligi -> tv/bt709 donustur')

    lufs, tepe = loudness(a.video)
    print(f'Loudness: I={lufs} LUFS, tepe={tepe} dBFS')
    if lufs is None or abs(lufs - a.hedef_lufs) > 0.5:
        sorun.append(f'LUFS {lufs} (hedef {a.hedef_lufs} +-0.5)')
    if tepe is not None and tepe > -1.0:
        sorun.append(f'tepe {tepe} dB (> -1)')

    izgara(a.video, os.path.join(out, 'qc-18.jpg'), 0, d, 18)
    izgara(a.video, os.path.join(out, 'qc-ilk33.jpg'), 0, min(33, d), 12)
    calis(['ffmpeg', '-y', '-v', 'error', '-ss', '0.5', '-i', a.video, '-frames:v', '1',
           '-vf', 'scale=960:-1', os.path.join(out, 'qc-acilis.jpg')])

    if a.onizleme:
        calis(['ffmpeg', '-y', '-v', 'error', '-i', a.video, '-t', '60', '-vf', 'scale=960:-2',
               '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k',
               '-movflags', '+faststart', os.path.join(out, 'onizleme.mp4')])

    print(f'Izgaralar: {out}{os.sep}qc-18.jpg, qc-ilk33.jpg, qc-acilis.jpg' + (', onizleme.mp4' if a.onizleme else ''))
    if sorun:
        print('SORUN: ' + ' | '.join(sorun))
        sys.exit(1)
    print('OLCUMLER TEMIZ (gorselleri yine de Read ile kontrol et)')


if __name__ == '__main__':
    main()
