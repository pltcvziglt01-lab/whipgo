#!/usr/bin/env python3
"""SFX OLCUMU — repertuar/sfx-kutuphane.json'daki HER sesin (Adobe varlik/sfx + CC0 varlik/sfx-cc0, seri/turev dosyalari dahil)
baslangic / tepe ani / ornek tepesi / 100 ms RMS tepesi / sure / kanal sayisi olculur ve json'un `olcu` tablosu yeniden yazilir.
Sfx.tsx bu tabloyu SFX_OLCU olarak disa verir; dogrula.py olcusuz sesi FAIL sayar. Kutuphaneye ses ekleyince ya da paket
degisince calistir.
Kullanim:
  py sfx_olc.py [--varlik C:/otomasyon/yt-uretim/varlik] [--turev] [--deneme]
  --turev : `turev` tanimlarindan (CC0 kaynak + yari ton listesi) perde kaydirmali dosyalari uretir (sfx-cc0/turev/<ad>-pN.wav).
            Eksik turev dosyasi varsa bayraksiz da uretilir.
Olculenler (sesin kullanilan bolumu: dosya basindan min(sn, 20 sn); kanal ORTALAMASI, 16 kHz):
  bas   = zarf (10 ms) tepenin %10'unu ilk astigi an  -> Sfx.tsx bastaki sessizligi kirpar
  tepe  = zarfin en yuksek ani                        -> bu an olay karesine oturur (whoosh tepesi kesimde)
  db    = ORNEK tepesi dBFS                           -> kazanc tavani: tepe kirpilmaz (ayar.tepe_tavan_db)
  yuks  = en gur 100 ms pencerenin BS.1770 K-agirlikli yuksekligi (LUFS olcegi, kanallar TOPLANIR; 100 ms'den kisa seste
          enerji/100 ms) -> SEVIYE bununla: ses, konusma (ya da yatak) yuksekliginin havuz kadar altina oturur. Kanal toplami
          sayesinde mono dosya ile onun stereoya -3 dB acilmis hali ayni olculur (Remotion/ffmpeg upmix).
  sure  = dosya suresi sn; kanal = 1|2
Eski surum yalniz ilk 4 sn'yi okuyordu: tepesi 4 sn'den sonra olan uzun riser'lar yanlis tepe aliyordu.
"""
import argparse, json, os, subprocess, sys
import numpy as np
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
KUTUPHANE = os.path.join(KOK, 'repertuar', 'sfx-kutuphane.json')
SR = 16000


def bilgi(yol):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels,sample_rate:format=duration',
                        '-of', 'json', yol], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}')
    s = (j.get('streams') or [{}])[0]
    return int(s.get('channels') or 1), int(s.get('sample_rate') or 48000), float((j.get('format') or {}).get('duration') or 0)


def kanal_ortalama(yol, kanal, ss=0.0, t=None, sr=SR):
    """dosyayi kanal ortalamasi (L+R)/2 olarak okur: mono dosya ile stereo stem ayni olcekte (kanal basina) olculur"""
    k = ['ffmpeg', '-v', 'error', '-ss', f'{ss:.3f}'] + (['-t', f'{t:.3f}'] if t else []) + ['-i', yol, '-vn', '-ar', str(sr), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.run(k, capture_output=True).stdout, dtype=np.float32)
    if kanal > 1 and len(x):
        x = x[: len(x) // kanal * kanal].reshape(-1, kanal).mean(axis=1)
    return x


def rms_pencere(x, sr=SR, w=0.1, adim=0.01):
    n, a = int(sr * w), int(sr * adim)
    if len(x) < n:   # 100 ms'den kisa ses: enerji 100 ms'ye yayilir (render olcumuyle ayni pencere; kisa tik sisirilmez)
        return np.array([10 * np.log10(float(np.sum(x.astype(np.float64) ** 2)) / n + 1e-12)]) if len(x) else np.array([-120.0])
    c = np.cumsum(np.concatenate([[0.0], x.astype(np.float64) ** 2]))
    i = np.arange(0, len(x) - n + 1, a)
    return 10 * np.log10((c[i + n] - c[i]) / n + 1e-12)


# BS.1770 K-agirligi (48 kHz katsayilari): on filtre (yuksek raf) + RLB (yuksek geciren)
K_B1, K_A1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
K_B2, K_A2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
KSR = 48000


def kanallar(yol, ss=0.0, t=None, kanal=None):
    """dosyayi 48 kHz, KANALLARIYLA okur -> (n, kanal) float64"""
    kanal = kanal or bilgi(yol)[0]
    k = ['ffmpeg', '-v', 'error', '-ss', f'{ss:.3f}'] + (['-t', f'{t:.3f}'] if t else []) + ['-i', yol, '-vn', '-ar', str(KSR), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.run(k, capture_output=True).stdout, dtype=np.float32).astype(np.float64)
    return x[: len(x) // kanal * kanal].reshape(-1, kanal)


def k_guc(x2):
    """K-agirlikli anlik guc (kanallar toplami): (n, kanal) -> (n,)"""
    from scipy.signal import lfilter
    y = lfilter(K_B2, K_A2, lfilter(K_B1, K_A1, x2, axis=0), axis=0)
    return (y ** 2).sum(axis=1)


def yukseklik(g, w=0.1, adim=0.01, sr=KSR):
    """K gucunden pencere yukseklikleri (LUFS olcegi): -0.691 + 10 log10(ortalama). Pencereden kisa sinyal: enerji/pencere"""
    n, a = int(sr * w), int(sr * adim)
    if len(g) < n:
        return np.array([-0.691 + 10 * np.log10(float(g.sum()) / n + 1e-12)])
    c = np.cumsum(np.concatenate([[0.0], g]))
    i = np.arange(0, len(g) - n + 1, a)
    return -0.691 + 10 * np.log10((c[i + n] - c[i]) / n + 1e-12)


def olc(yol, sn=None):
    kanal, _, sure = bilgi(yol)
    pencere = min(sn or 20.0, sure or 20.0)
    x = kanal_ortalama(yol, kanal, 0, pencere)
    if not len(x):
        return None
    ax = np.abs(x)
    z = np.convolve(ax, np.ones(160) / 160, mode='same')
    tepe = int(np.argmax(z))
    bas = int(np.argmax(z > z[tepe] * 0.1))
    yuks = float(yukseklik(k_guc(kanallar(yol, 0, pencere, kanal))).max())
    return [round(bas / SR, 3), round(tepe / SR, 3), round(20 * np.log10(float(ax.max()) + 1e-9), 1), round(yuks, 1), round(sure, 3), kanal]


def turev_uret(j, varlik, zorla):
    n = 0
    for ad, t in (j.get('turev') or {}).items():
        kaynak = os.path.join(varlik, t['kaynak'])
        _, sr, _ = bilgi(kaynak)
        for i, yt in enumerate(t['yari_ton']):
            hedef = os.path.join(varlik, 'sfx-cc0', 'turev', f'{ad}-p{i}.wav')
            if os.path.exists(hedef) and not zorla:
                continue
            os.makedirs(os.path.dirname(hedef), exist_ok=True)
            oran = 2 ** (yt / 12)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', kaynak, '-af', f'asetrate={sr * oran:.0f},aresample=48000', '-ar', '48000',
                            '-c:a', 'pcm_s16le', hedef], check=True)
            n += 1
    if n:
        print(f'turev: {n} dosya uretildi -> {os.path.join(varlik, "sfx-cc0", "turev")}')


def kaydet(j, yol):
    """okunur json: her ses / olcu tek satir"""
    d = lambda v: json.dumps(v, ensure_ascii=False)
    s = ['{']
    for i, (k, v) in enumerate(j.items()):
        son = ',' if i < len(j) - 1 else ''
        if k in ('sesler', 'olcu', 'turev', 'ayar') and isinstance(v, dict):
            s.append(f' {d(k)}: {{')
            s += [f'  {d(a)}: {d(b)}' + (',' if m < len(v) - 1 else '') for m, (a, b) in enumerate(v.items())]
            s.append(' }' + son)
        else:
            s.append(f' {d(k)}: {d(v)}{son}')
    s.append('}')
    open(yol, 'w', encoding='utf-8', newline='\n').write('\n'.join(s) + '\n')


def olay_seviyeleri(mp4, plan, fps, j, ton='ciddi'):
    """render'daki (yalniz SFX stemi) her yerlesimin seviyesi: tepe anindaki pencerede ornek tepesi + 100 ms RMS tepesi.
    plan: Sfx.tsx sfxPlani / sfx_plan.py ciktisi (kare, kirp, dosya, havuz, rol). Donus: satirlar (hedef = vo_ref + seviye + ton ofseti)."""
    A = j['ayar']
    kanal, _, _ = bilgi(mp4)
    x = kanal_ortalama(mp4, kanal)
    tepeler = []
    for p in plan:
        o = j['olcu'].get(p['dosya'], [0, 0.05, 0, 0, 0, 1])
        tepeler.append((p['kare'] + max(0, round(o[1] * fps) - p['kirp'])) / fps)
    sira = sorted(range(len(plan)), key=lambda i: tepeler[i])
    satir = []
    for n, i in enumerate(sira):
        tp = tepeler[i]
        son = tp + 0.3
        if n + 1 < len(sira):
            son = min(son, max(tp + 0.04, tepeler[sira[n + 1]] - 0.02))
        a, b = max(0, int((tp - 0.05) * SR)), min(len(x), int(son * SR))
        w = x[a:b]
        if not len(w):
            continue
        p = plan[i]
        hedef = A['vo_ref_db'] + A['seviye'][p['havuz']] + A['ton_ofset'].get(ton, 0)
        satir.append({'t': round(tp, 3), 'rol': p['rol'], 'havuz': p['havuz'], 'dosya': p['dosya'], 'hedef': round(hedef, 1),
                      'rms': round(float(rms_pencere(w).max()), 1), 'tepe': round(20 * np.log10(float(np.abs(w).max()) + 1e-9), 1)})
    return satir


def rapor_yaz(satir, j, baslik=''):
    vo = j['ayar']['vo_ref_db']
    s = [f'### {baslik}', '', f'Konusma referansi (vo_ref_db) {vo} dBFS (kanal basina 100 ms RMS). "VO alti" = olculen 100 ms RMS - referans.', '',
         '| t (sn) | rol | havuz | ses | hedef VO alti | olculen VO alti | fark | ornek tepesi dBFS |', '|---|---|---|---|---|---|---|---|']
    for r in satir:
        s.append(f"| {r['t']:.2f} | {r['rol']} | {r['havuz']} | {r['dosya'].split('/')[-1]} | {r['hedef'] - vo:+.1f} | {r['rms'] - vo:+.1f} | "
                 f"{r['rms'] - r['hedef']:+.1f} | {r['tepe']:.1f} |")
    return '\n'.join(s)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--varlik', default=os.path.join(KOK, 'varlik'))
    ap.add_argument('--turev', action='store_true')
    ap.add_argument('--deneme', action='store_true')
    ap.add_argument('--rapor', help='render (yalniz SFX) mp4: olay basina seviye tablosu (--plan ile)')
    ap.add_argument('--plan', help='--rapor icin yerlesim plani json (Sfx.tsx sfxPlani ciktisi: kare/kirp/dosya/havuz/rol)')
    ap.add_argument('--ton', default='ciddi')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--cikti', help='--rapor markdown cikti')
    a = ap.parse_args()
    j = json.load(open(KUTUPHANE, encoding='utf-8'))
    if a.rapor:
        satir = olay_seviyeleri(a.rapor, json.load(open(a.plan, encoding='utf-8')), a.fps, j, a.ton)
        md = rapor_yaz(satir, j, os.path.basename(a.rapor))
        fark = [r['rms'] - r['hedef'] for r in satir]
        ozet = f'{len(satir)} olay; hedef farki ortalama {np.mean(fark):+.1f} dB, mutlak medyan {np.median(np.abs(fark)):.1f} dB; en gur tepe {max(r["tepe"] for r in satir):.1f} dBFS'
        if a.cikti:
            open(a.cikti, 'w', encoding='utf-8').write(md + '\n\n' + ozet + '\n')
        print(md if not a.cikti else '', ozet, sep='\n')
        return
    if not a.deneme:
        turev_uret(j, a.varlik, a.turev)
    yollar = {}
    for d, k in j['sesler'].items():
        yollar[d] = k.get('sn')
        for s in k.get('seri') or []:
            yollar.setdefault(s, k.get('sn'))
    from concurrent.futures import ThreadPoolExecutor
    def bir(d):
        p = os.path.join(a.varlik, d)
        return d, (olc(p, yollar[d]) if os.path.exists(p) else None)
    olcu, yok = {}, []
    with ThreadPoolExecutor(max_workers=8) as ex:
        for d, o in ex.map(bir, list(yollar)):
            if o is None:
                yok.append(d)
            else:
                olcu[d] = o
    if yok:
        print('UYARI olculemedi (dosya yok/bos):', yok)
    eski = j.get('olcu') or {}
    degisen = sum(1 for d in olcu if eski.get(d) != olcu[d]) + len(set(eski) - set(olcu))
    j['olcu'] = olcu
    adobe = sum(1 for d in olcu if d.startswith('sfx/'))
    print(f'{len(olcu)} ses olculdu (Adobe {adobe}, CC0 {len(olcu) - adobe}); degisen {degisen}')
    if a.deneme:
        return
    kaydet(j, KUTUPHANE)
    print('yazildi ->', KUTUPHANE)


if __name__ == '__main__':
    main()
