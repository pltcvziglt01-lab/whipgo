#!/usr/bin/env python3
"""Son ses miksi: konusma (hafif sikistirma) + muzik (konusurken otomatik kisilir) + SFX (zamanli) -> -14 LUFS.
Ses HIZINA DOKUNMAZ (atempo yok; ses orijinal hizinda kalir).

Kullanim:
  py ses_miks.py --vo vo.mp3 [--muzik muzik.mp3 --muzik-db -20] [--sfx sfx.json] [--video ham.mp4]
                 [--hedef -14] --cikti final.mp4|mix.wav
  py ses_miks.py --vurus muzik.mp3 [--cikti vurus.json]     (librosa ile vurus/tempo haritasi)
sfx.json: [{"dosya": "C:/.../whoosh.wav", "t": 12.34, "db": -6}, ...]  (t = saniye; kesim anlari icin)
  istege bagli "kirp" (dosya basindan atlanan sn) + "sure" (calma suresi sn): atrim + 2 kare giris / 0,25 sn cikis yumusamasi.
  VideoDna kurgusunun SFX'i icin json'u elle yazma: py sfx_plan.py --plan props.json (Remotion sfxPlani ile birebir).
--video verilirse goruntu kopyalanir (-c:v copy), ses yeni miksle degisir.
Muzik: konusma varken sidechain ile ~-12 dB daha kisilir; konusma yokken muzik-db seviyesinde.
"""
import argparse, json, os, re, subprocess, sys


def calis(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        sys.exit(r.stderr[-1500:])
    return r


def vurus(yol, cikti):
    try:
        import librosa
    except ImportError:
        sys.exit('librosa yok: py -m pip install librosa')
    y, sr = librosa.load(yol, sr=22050, mono=True)
    tempo, kareler = librosa.beat.beat_track(y=y, sr=sr)
    t = librosa.frames_to_time(kareler, sr=sr).round(3).tolist()
    onset = librosa.onset.onset_detect(y=y, sr=sr, units='time').round(3).tolist()
    tempo = float(tempo if not hasattr(tempo, '__len__') else tempo[0])
    json.dump({'bpm': round(tempo, 2), 'vuruslar': t, 'olaylar': onset}, open(cikti, 'w'), indent=1)
    print(f'BPM {tempo:.1f}, {len(t)} vurus, {len(onset)} olay -> {cikti}  (buyuk kesimleri en yakin vurusa oturt)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--vo')
    ap.add_argument('--muzik')
    ap.add_argument('--muzik-db', type=float, default=-20)
    ap.add_argument('--sfx')
    ap.add_argument('--video')
    ap.add_argument('--hedef', type=float, default=-14)
    ap.add_argument('--vurus')
    ap.add_argument('--cikti')
    a = ap.parse_args()
    if a.vurus:
        return vurus(a.vurus, a.cikti or 'vurus.json')
    if not (a.vo and a.cikti):
        sys.exit('--vo ve --cikti gerekli')
    girdiler = ['-i', a.vo]
    filtre = ['[0:a]aformat=sample_rates=48000:channel_layouts=stereo,'
              'acompressor=threshold=-20dB:ratio=3:attack=10:release=200:makeup=2[vo]']
    karisim = ['[vo]']
    n = 1
    if a.muzik:
        girdiler += ['-stream_loop', '-1', '-i', a.muzik]
        filtre.append(f'[{n}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={a.muzik_db}dB[m0]')
        filtre.append('[vo]asplit=2[vo1][vok]')
        karisim = ['[vo1]']
        filtre.append('[m0][vok]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[m]')
        karisim.append('[m]')
        n += 1
    if a.sfx:
        for i, e in enumerate(json.load(open(a.sfx, encoding='utf-8-sig'))):
            girdiler += ['-i', e['dosya']]
            ms = int(round(float(e['t']) * 1000))
            zarf = ''
            if e.get('kirp') is not None or e.get('sure') is not None:   # sfx_plan.py: Remotion SfxKatmani ile ayni kirpma + zarf
                k, s = float(e.get('kirp') or 0), e.get('sure')
                zarf = f'atrim=start={k:.4f}' + (f':duration={float(s):.4f}' if s else '') + ',asetpts=PTS-STARTPTS,afade=t=in:d=0.066,'
                if s:
                    zarf += f'afade=t=out:st={max(0.1, float(s) - 0.25):.4f}:d={min(0.25, float(s)):.4f},'
            filtre.append(f'[{n}:a]aformat=sample_rates=48000:channel_layouts=stereo,{zarf}volume={e.get("db", -6)}dB,'
                          f'adelay={ms}|{ms}[s{i}]')
            karisim.append(f'[s{i}]')
            n += 1
    filtre.append(f'{"".join(karisim)}amix=inputs={len(karisim)}:duration=first:normalize=0[mx]')
    fc = ';'.join(filtre)
    gecici = os.path.splitext(a.cikti)[0] + '-mixham.wav'
    calis(['ffmpeg', '-y', '-v', 'error', *girdiler, '-filter_complex', fc, '-map', '[mx]', '-ar', '48000', gecici])
    # iki gecisli loudnorm
    r = calis(['ffmpeg', '-hide_banner', '-nostats', '-i', gecici, '-af',
               f'loudnorm=I={a.hedef}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    j = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr, re.S).group(0))
    ln = (f'loudnorm=I={a.hedef}:TP=-1.5:LRA=11:measured_I={j["input_i"]}:measured_TP={j["input_tp"]}:'
          f'measured_LRA={j["input_lra"]}:measured_thresh={j["input_thresh"]}:offset={j["target_offset"]}:linear=true')
    if a.video:
        calis(['ffmpeg', '-y', '-v', 'error', '-i', a.video, '-i', gecici, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
               '-af', ln, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', a.cikti])
    else:
        calis(['ffmpeg', '-y', '-v', 'error', '-i', gecici, '-af', ln, '-ar', '48000', a.cikti])
    os.remove(gecici)
    r = calis(['ffmpeg', '-hide_banner', '-nostats', '-i', a.cikti, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)
    print(f'MIKS -> {a.cikti}  LUFS {I[-1] if I else "?"}  tepe {tp[-1] if tp else "?"} dBTP')


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
