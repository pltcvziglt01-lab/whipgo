#!/usr/bin/env python3
"""Render sonrasi KALITE KAPISI: olculen sorunlar teslimi durdurur (FAIL varsa cikis kodu 1).

Kullanim:
  py kalite_kapisi.py final.mp4 [--metin metin.txt --dil de] [--brief brief.json] [--cikti KAPI.md]
                      [--hedef-lufs -14] [--ilk 0]

Kontroller (videonun kendi fps'inde, kucuk gri karelerle):
  FAIL  goruntu sesten kisa/uzun (>0,5 sn) · ilk 2 sn'de hareket/kesim yok (kanca olu)
        tam siyah bolum (>=0,5 sn, piksellerin %99,8'i siyah; ilk/son 0,3 sn haric; koyu tasarim/altyazili kare sayilmaz) · donmus goruntu (>=2 sn tam durgun)
        tek karelik sicrama (bir kare oncesinden ve sonrasindan farkli, ikisi birbirine benzer)
        3 sn'den uzun sessizlik (son 2 sn haric) · LUFS hedef±1 disi · gercek tepe > -1 dBTP
        metin verildiyse: konusmada okunmayan cumle orani > %5 (faster-whisper gerekir)
        brief verildiyse: sure / en-boy / duragan pay / zorunlu satir
  UYARI duragan (Ken Burns'suz) kare payi > %35 · 8 sn'den uzun hareketsiz cekim
        arka arkaya ayni kadraj (kesimden once/sonra cok benzer) · ayni gorselin baska yerde tekrari
        1,5-3 sn sessizlik · cozunurluk 1080p alti
brief.json ornegi: {"sure_min": 480, "sure_max": 720, "en_boy": "16:9", "duragan_max": 0.35,
                    "satirlar": ["Quellen in der Beschreibung"]}
"""
import argparse, difflib, json, os, re, statistics, subprocess, sys
import numpy as np

GW, GH = 96, 54


def calis(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')


def akislar(yol):
    j = json.loads(calis(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', yol]).stdout)
    v = next((s for s in j['streams'] if s['codec_type'] == 'video'), None)
    a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
    fps = 30.0
    if v and v.get('avg_frame_rate', '0/0') != '0/0':
        p, q = v['avg_frame_rate'].split('/')
        fps = float(p) / float(q) if float(q) else 30.0
    vs = float(v.get('duration') or j['format']['duration']) if v else 0
    as_ = float(a.get('duration') or j['format']['duration']) if a else 0
    return {'fps': fps, 'w': int(v['width']) if v else 0, 'h': int(v['height']) if v else 0,
            'video_sn': vs, 'ses_sn': as_, 'sure': float(j['format']['duration']), 'ses_var': a is not None}


def kareler(yol):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', yol, '-vf', f'scale={GW}:{GH}', '-f', 'rawvideo',
                          '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    boy = GW * GH
    out = []
    while True:
        b = p.stdout.read(boy)
        if len(b) < boy:
            break
        out.append(np.frombuffer(b, np.uint8))
    p.wait()
    return np.array(out, dtype=np.uint8)


def bolgeler(maske, fps, min_sn):
    r, bas = [], None
    for i, m in enumerate(list(maske) + [False]):
        if m and bas is None:
            bas = i
        elif not m and bas is not None:
            if (i - bas) / fps >= min_sn:
                r.append((bas / fps, i / fps))
            bas = None
    return r


def dhash(k):
    im = k.reshape(GH, GW)
    ys = np.linspace(0, GH - 1, 8).astype(int)
    xs = np.linspace(0, GW - 1, 9).astype(int)
    m = im[np.ix_(ys, xs)].astype(np.int16)
    return (m[:, 1:] > m[:, :-1]).flatten()


def ses_olc(yol, hedef):
    r = calis(['ffmpeg', '-hide_banner', '-nostats', '-i', yol, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)
    s = calis(['ffmpeg', '-hide_banner', '-nostats', '-i', yol, '-vn', '-af', 'silencedetect=noise=-45dB:d=1.5', '-f', 'null', '-'])
    bas = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', s.stderr)]
    son = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', s.stderr)]
    return (float(I[-1]) if I else None), (float(tp[-1]) if tp else None), list(zip(bas, son))


def konusma_kontrol(yol, metin_yol, dil):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None, 'faster-whisper yok (py -m pip install faster-whisper) -> metin kontrolu atlandi'
    metin = open(metin_yol, encoding='utf-8-sig').read()
    metin = '\n'.join(s for s in metin.splitlines() if not s.lstrip().startswith('#'))
    cumleler = [c.strip() for c in re.split(r'(?<=[.!?…。！？])\s+', metin) if len(c.split()) >= 3]
    try:  # pip ile gelen nvidia DLL'leri (cublas/cudnn) Windows'ta yol'a eklenmezse CUDA acilmaz
        import glob, nvidia
        for _p in nvidia.__path__:
            for _d in glob.glob(os.path.join(_p, '*', 'bin')):
                os.add_dll_directory(_d)
                os.environ['PATH'] = _d + os.pathsep + os.environ['PATH']
    except Exception:
        pass

    def coz(cihaz, tur):
        m = WhisperModel('small', device=cihaz, compute_type=tur)
        segs, _ = m.transcribe(yol, language=dil, vad_filter=True)
        return ' '.join(s.text for s in segs)
    try:
        duyulan = coz('cuda', 'float16')
    except Exception:
        duyulan = coz('cpu', 'int8')
    dk = re.findall(r'\w+', duyulan.lower())
    uclu = {tuple(dk[i:i + 3]) for i in range(len(dk) - 2)}
    ikili = {tuple(dk[i:i + 2]) for i in range(len(dk) - 1)}
    eksik = []
    for c in cumleler:
        ck = re.findall(r'\w+', c.lower())
        if len(ck) < 3:
            continue
        # cumlenin kelime uclulerinin kaci duyulan metinde var (ikili ile yumusatilir: tek kelime STT hatasi cezalanmasin)
        u = [tuple(ck[i:i + 3]) in uclu for i in range(len(ck) - 2)]
        k = [tuple(ck[i:i + 2]) in ikili for i in range(len(ck) - 1)]
        if max(sum(u) / len(u), sum(k) / len(k)) < 0.5:
            eksik.append(c)
    return (len(eksik) / max(len(cumleler), 1), eksik), None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--metin')
    ap.add_argument('--dil', default=None)
    ap.add_argument('--brief')
    ap.add_argument('--hedef-lufs', type=float, default=-14.0)
    ap.add_argument('--cikti')
    a = ap.parse_args()
    F, U, bilgi = [], [], []
    A = akislar(a.video)
    fps = A['fps']
    bilgi.append(f"{A['w']}x{A['h']} {fps:.2f} fps, sure {A['sure']:.1f} sn (goruntu {A['video_sn']:.2f}, ses {A['ses_sn']:.2f})")
    if not A['ses_var']:
        F.append('ses akisi yok')
    elif abs(A['video_sn'] - A['ses_sn']) > 0.5:
        F.append(f"goruntu ve ses suresi farkli: {A['video_sn']:.2f} / {A['ses_sn']:.2f} sn")
    if min(A['w'], A['h']) < 1080:
        U.append(f"cozunurluk {A['w']}x{A['h']} (1080p alti)")

    K = kareler(a.video)
    n = len(K)
    d = np.array([np.abs(K[i + 1].astype(np.int16) - K[i]).mean() for i in range(n - 1)]) if n > 1 else np.zeros(0)
    lum = K.mean(1)
    yerel = np.array([np.median(d[max(0, i - 15):i + 16]) for i in range(0, len(d))]) if len(d) else d
    kesim = np.where((d > 18) & (d > 4 * (yerel + 1)))[0] + 1
    # kanca
    k2 = int(2 * fps)
    kanca_hareket = float(d[:k2].mean()) if len(d) >= 2 else 0
    kanca_kesim = int((kesim < k2).sum())
    bilgi.append(f'kanca (0-2 sn): ort fark {kanca_hareket:.2f}, kesim {kanca_kesim}')
    if kanca_hareket < 0.35 and kanca_kesim == 0:
        F.append(f'ilk 2 sn neredeyse durgun (ort fark {kanca_hareket:.2f}, kesim yok): kancaya hareket/kesim koy')
    # siyah ve donma
    kenar = int(0.3 * fps)
    bd = calis(['ffmpeg', '-hide_banner', '-nostats', '-i', a.video, '-an', '-vf',
                'blackdetect=d=0.5:pic_th=0.998:pix_th=0.06', '-f', 'null', '-']).stderr
    siyah = [(float(x), float(y)) for x, y in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bd)]
    siyah = [(b, s) for b, s in siyah if b > kenar / fps and s < (n - kenar) / fps]
    for b, s in siyah:
        F.append(f'siyah bolum {b:.1f}-{s:.1f} sn')
    don = bolgeler(np.concatenate([[False], d < 0.12]), fps, 2.0)
    for b, s in don:
        F.append(f'donmus goruntu {b:.1f}-{s:.1f} sn ({s - b:.1f} sn tam durgun)')
    # tek karelik sicrama
    pops = []
    for i in range(1, n - 1):
        once, sonra, kopru = d[i - 1], d[i], np.abs(K[i + 1].astype(np.int16) - K[i - 1]).mean()
        if once > 20 and sonra > 20 and kopru < 0.35 * min(once, sonra):
            pops.append(i / fps)
    for t in pops[:10]:
        F.append(f'tek karelik sicrama {t:.2f} sn')
    # duragan pay ve uzun hareketsiz cekim
    duragan = float((d < 0.4).mean()) if len(d) else 0
    bilgi.append(f'duragan kare payi %{duragan * 100:.0f}, kesim {len(kesim)}')
    sinirlar = [0] + list(kesim) + [n]
    cekimler = [(sinirlar[i], sinirlar[i + 1]) for i in range(len(sinirlar) - 1) if sinirlar[i + 1] - sinirlar[i] > 2]
    for b, s in cekimler:
        if (s - b) / fps > 8 and d[b:s - 1].mean() < 0.4:
            U.append(f'{b / fps:.1f}-{s / fps:.1f} sn: {(s - b) / fps:.1f} sn hareketsiz cekim (Ken Burns/kesim ekle)')
    # arka arkaya ayni kadraj ve tekrar eden gorsel
    hs = [dhash(K[(b + s) // 2]) for b, s in cekimler]
    for i in range(1, len(cekimler)):
        if (hs[i] != hs[i - 1]).sum() <= 4:
            U.append(f'{cekimler[i][0] / fps:.1f} sn: kesimden once/sonra ayni kadraj (atlama kesimi gibi)')
    tekrar = []
    for i in range(len(hs)):
        for j in range(i + 2, len(hs)):
            if (hs[i] != hs[j]).sum() <= 3:
                tekrar.append((cekimler[i][0] / fps, cekimler[j][0] / fps))
    for x, y in tekrar[:8]:
        U.append(f'ayni gorsel tekrar: {x:.1f} sn ve {y:.1f} sn')
    # ses
    I, tp, sessiz = ses_olc(a.video, a.hedef_lufs)
    bilgi.append(f'LUFS {I}, tepe {tp} dBTP')
    if I is None or abs(I - a.hedef_lufs) > 1.0:
        F.append(f'LUFS {I} (hedef {a.hedef_lufs}±1)')
    if tp is not None and tp > -1.0:
        F.append(f'gercek tepe {tp} dBTP (> -1)')
    for b, s in sessiz:
        if s > A['sure'] - 2:
            continue
        (F if s - b > 3 else U).append(f'sessizlik {b:.1f}-{s:.1f} sn ({s - b:.1f} sn)')
    # metin
    if a.metin:
        sonuc, not_ = konusma_kontrol(a.video, a.metin, a.dil)
        if not_:
            U.append(not_)
        else:
            oran, eksik = sonuc
            bilgi.append(f'okunmayan/bozuk cumle orani %{oran * 100:.1f}')
            if oran > 0.05:
                F.append(f'metindeki cumlelerin %{oran * 100:.0f}\'i konusmada yok/bozuk: ' + ' | '.join(e[:60] for e in eksik[:5]))
            elif eksik:
                U.append('konusmada zayif eslesen cumle: ' + ' | '.join(e[:60] for e in eksik[:3]))
    # brief
    if a.brief:
        b = json.load(open(a.brief, encoding='utf-8-sig'))
        if 'sure_min' in b and A['sure'] < b['sure_min']:
            F.append(f"sure {A['sure']:.0f} sn < brief {b['sure_min']}")
        if 'sure_max' in b and A['sure'] > b['sure_max']:
            F.append(f"sure {A['sure']:.0f} sn > brief {b['sure_max']}")
        if 'en_boy' in b:
            p, q = map(float, b['en_boy'].split(':'))
            if abs(A['w'] / max(A['h'], 1) - p / q) > 0.02:
                F.append(f"en-boy {A['w']}x{A['h']} brief {b['en_boy']} degil")
        if 'duragan_max' in b and duragan > b['duragan_max']:
            F.append(f"duragan pay %{duragan * 100:.0f} > brief %{b['duragan_max'] * 100:.0f}")
        if b.get('satirlar') and a.metin:
            m = open(a.metin, encoding='utf-8-sig').read().lower()
            for s in b['satirlar']:
                if s.lower() not in m:
                    F.append(f'brief zorunlu satiri metinde yok: "{s}"')
    elif duragan > 0.35:
        U.append(f'duragan kare payi %{duragan * 100:.0f} (> %35): Ken Burns / hareket ekle')

    durum = 'PASS' if not F else 'FAIL'
    rapor = [f'# KALITE KAPISI: {durum}  (fail={len(F)} uyari={len(U)})', f'Video: {a.video}', '']
    rapor += ['## Olculen'] + [f'- {x}' for x in bilgi] + ['']
    rapor += ['## FAIL (teslim edilmez)'] + ([f'- [ ] {x}' for x in F] or ['- yok']) + ['']
    rapor += ['## Uyari (gozle bak, karar ver)'] + ([f'- {x}' for x in U] or ['- yok']) + ['']
    rapor.append('Sayi temiz cikmasi bakmanin yerine gecmez: qc.py izgarasini ve ilk 2,5 sn\'yi ayrica ac.')
    cikti = a.cikti or os.path.splitext(a.video)[0] + '-KAPI.md'
    open(cikti, 'w', encoding='utf-8').write('\n'.join(rapor) + '\n')
    print(f'KAPI {durum} fail={len(F)} uyari={len(U)} duragan=%{duragan * 100:.0f} lufs={I} -> {cikti}')
    sys.exit(1 if F else 0)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
