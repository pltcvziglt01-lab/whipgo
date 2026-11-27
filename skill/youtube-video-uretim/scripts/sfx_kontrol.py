#!/usr/bin/env python3
"""SFX KAPISI — ses efektleri DOGRU YERDE ve DOGRU SEVIYEDE mi (her video, teslimden once). Iki tablo + PASS/FAIL (cikis kodu 1).

Kullanim:
  py sfx_kontrol.py --plan motion/src/vNN/props.json --video final.mp4 [--yatak vo_muzik.wav] [--sfx sfx.json] [--cikti SFX-KONTROL.md]
  --plan   : VideoDna props'u (dna + veri: cekimler, kelimeler). Plan GERCEK TS'ten hesaplanir (sfx_plan.py, node).
  --sfx    : ffmpeg hattinda kullanilan sfx.json (sfx_plan.py ciktisi; ya da eski bicim) — verilirse plan yerine o denetlenir.
  --video  : denetlenen dosya (teslim: seslendirme + muzik + SFX).
  --yatak  : ayni videonun SFX'SIZ sesi (seslendirme + muzik; ses_miks.py --yatak-cikti). SFX katmani = video - yatak (hizalama +
             kazanc otomatik), yatak yuksekligi temiz olculur. ZORUNLU (ya da --stem / --yalniz-sfx): yataksiz olcumde konusma
             altindaki SFX ayrilamiyor (v04 testi: 15 sesten 12'si belirsiz).
  --yalniz-sfx : videonun sesi yalniz SFX (Remotion render'i, KatSes). Seviye o zaman sabit konusma referansina (vo_ref_db) gore.
             Remotion MP4'u (AAC) sesi ~45 ms GEC yazar: SFX katmanini --separate-audio-to=sfx.wav ile al ya da ffmpeg ile muxla.
  --stem   : yalniz SFX katmani dosyasi (ayni zaman cizgisi).
  --aralik A B : yalniz [A, B] sn (zaman cizgisi); --video-bas S: video dosyasi zaman cizgisinin S. saniyesinden basliyorsa (kismi render).

1) YERLESIM: her SFX plandaki dalga bicimiyle (dosya + kirpma + zarf + kazanc) videoda +-150 ms aranir (normalize capraz iliski);
   bulunan yerde SAB LONUN tepesi (hiza 'bas' ise ses basi) gorsel olayin karesiyle (plan `an`: kesim, kart girisi, sayinin durdugu
   kare, harf/madde girisi, vurus) karsilastirilir. Tolerans ayar.yerlesim_tolerans_kare (1 kare). ANLAM: ses havuzu rolun havuzu mu,
   dosyanin kutuphane etiketi o havuzu tasiyor mu, olayin karesindeki gorsel rolle uyusuyor mu (alintiya whoosh / kesimsiz yere gecis yok).
2) SEVIYE: SFX'in 100 ms K-yukseklik tepesi (BS.1770, LUFS olcegi) - yatagin olay penceresindeki (+-ayar.yatak_pencere sn) K-yuksekligi.
   Sinif araliklari (ayar.sinif): darbe/bolum/vurus 6-10, gecis 12-16, tik/pop/yazma 16-22 dB altinda. Konusma varken (kelimeler)
   tavan ayar.konusma_tavan (6 dB alti): SFX seslendirmeyi bastiramaz. Konusma yoksa referans muzik (yatak).
"""
import argparse, json, math, os, sys
import numpy as np

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
import sfx_plan as P   # noqa: E402
from sfx_olc import bilgi, kanallar, k_guc, zarf   # noqa: E402

SR = 48000
REPO = P.REPO
GORSEL = {   # olay rolu -> o karedeki cekimde beklenen gorsel (None: denetlenmez)
    'alinti': lambda c: (c.get('kart') or {}).get('tur') == 'alinti',
    'sayi': lambda c: (c.get('kart') or {}).get('tur') in ('sayi', 'karsilastirma'),
    'sayac': lambda c: (c.get('kart') or {}).get('tur') in ('sayi', 'karsilastirma'),
    'kart': lambda c: bool(c.get('kart')),
    'altbant': lambda c: bool(c.get('etiket')),
    'vurgu': lambda c: bool(c.get('flas') or c.get('kart')),
}


def zarf_tepe(p, hiza):
    """sablonun (stereo) K-agirlikli guc zarfi tepesi (ornek) — sfx_olc.py olc() ile ayni tanim; hiza 'bas': %1 esigi"""
    z = zarf(k_guc(p))
    i = int(np.argmax(z))
    if hiza == 'bas':
        return int(np.argmax(z > z[i] * 0.01))
    return i


class Sablon:
    def __init__(self):
        self.on = {}

    def __call__(self, e):
        if e['dosya'] not in self.on:
            x = kanallar(e['dosya'])
            self.on[e['dosya']] = np.repeat(x, 2, axis=1) * 10 ** (-3.01 / 20) if x.shape[1] == 1 else x[:, :2]
        x = self.on[e['dosya']]
        a = int(round(e['kirp'] * SR))
        p = x[a:a + int(round(e['sure'] * SR))].copy()
        if not len(p):
            return p
        z = np.ones(len(p))
        g = int(e.get('giris', 0.066) * SR)
        if g > 0:
            g = min(g, len(p))
            z[:g] *= np.linspace(0, 1, g, endpoint=False)
        c = int(e.get('cikis', 0.25) * SR)
        if c > 0:
            c = min(c, len(p))
            z[-c:] *= np.linspace(1, 0, c)
        return p * (z * 10 ** (e['db'] / 20))[:, None]


def lufs(g, a, b):
    a, b = max(0, a), min(len(g), b)
    if b - a < 480:
        return -120.0
    return -0.691 + 10 * math.log10(float(g[a:b].mean()) + 1e-12)


def tepe_lufs(g, a, b, w=4800, adim=480):
    a, b = max(0, a), min(len(g), b)
    if b - a <= w:
        return -0.691 + 10 * math.log10(float(g[a:b].sum()) / w + 1e-12) if b > a else -120.0
    c = np.concatenate([[0.0], np.cumsum(g[a:b])])
    i = np.arange(0, b - a - w + 1, adim)
    return float((-0.691 + 10 * np.log10((c[i + w] - c[i]) / w + 1e-12)).max())


def hizala(v, y, ofs=0, ara=0.2):
    """y'nin v'ye gore konumu (ornek; ofs = beklenen: v[i] ~ y[i + ofs]) + kazanci; 8 kHz kaba, 48 kHz ince"""
    from scipy.signal import correlate
    vm, ym = v.mean(axis=1), y.mean(axis=1)
    W = int(ara * SR)
    n = min(len(vm), len(ym) - 2 * W, SR * 20)
    o = max(W, min(len(vm), len(ym)) // 2 - n // 2)
    n = min(n, len(vm) - o, len(ym) - o - W - ofs)
    a = vm[o:o + n]
    seg = ym[o + ofs - W:o + ofs + n + W]            # c[j]: a[i] ile ym[o - W + j + i] -> gecikme l = j - W
    c = correlate(seg[::6], a[::6], mode='valid', method='fft')
    kaba = (int(np.argmax(c)) * 6) - W + ofs
    best, bl = -1e30, kaba
    for l in range(kaba - 8, kaba + 9):
        i0 = o + l
        if i0 < 0 or i0 + n > len(ym):
            continue
        v_ = float(np.dot(a, ym[i0:i0 + n]))
        if v_ > best:
            best, bl = v_, l
    ys = ym[o + bl:o + bl + n]
    g = float(np.dot(a, ys) / (np.dot(ys, ys) + 1e-12))
    return bl, g


def plan_girdileri(a, props, dna, T):
    klasor = os.path.join(REPO, 'varlik')
    fps = (dna.get('iskelet') or {}).get('fps') or 30
    if a.sfx:
        sfx = json.load(open(a.sfx, encoding='utf-8-sig'))
        for e in sfx:   # eski bicim: an / havuz / kutuphane yok -> tepe olcusunden
            if 'kutuphane' not in e:
                d = e['dosya'].replace('\\', '/')
                e['kutuphane'] = d.split('/varlik/', 1)[1] if '/varlik/' in d else 'sfx/' + os.path.basename(d)
            e.setdefault('havuz', e.get('rol'))
            e.setdefault('hiza', 'tepe')
            if 'an' not in e:
                o = T['olcu'].get(e['kutuphane'], P.VARSAYILAN_OLCU)
                e['an'] = round(e['t'] + max(0.0, o[1] - e['kirp']), 4)
        return sfx, fps, 'sfx.json (' + os.path.basename(a.sfx) + ')'
    ts, hata = P.ts_calistir(props, dna, a.repertuar, a.plan)
    if not ts:
        sys.exit(f'HATA plan hesaplanamadi: {hata}')
    return P.miks_json(ts['plan'], fps, klasor, T, P.zarf_esik(a.repertuar)), fps, 'TS plani (Remotion SFX)'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan', required=True)
    ap.add_argument('--dna')
    ap.add_argument('--video', required=True)
    ap.add_argument('--sfx')
    ap.add_argument('--yatak')
    ap.add_argument('--stem')
    ap.add_argument('--yalniz-sfx', action='store_true')
    ap.add_argument('--aralik', nargs=2, type=float)
    ap.add_argument('--video-bas', type=float, default=0.0, help='video dosyasinin zaman cizgisindeki baslangici (sn)')
    ap.add_argument('--yatak-bas', type=float, default=0.0, help='yatak dosyasinin zaman cizgisindeki baslangici (sn)')
    ap.add_argument('--repertuar', default=os.path.join(REPO, 'repertuar'))
    ap.add_argument('--cikti')
    ap.add_argument('--baslik', default='')
    a = ap.parse_args()
    if not (a.yatak or a.stem or a.yalniz_sfx):
        sys.exit('HATA --yatak (SFX icermeyen seslendirme+muzik; ses_miks.py --yatak-cikti) ya da --stem / --yalniz-sfx gerekli: '
                 'yataksiz olcumde konusma altindaki SFX ayrilamaz (v04 testi: 15 sesten 12 belirsiz)')
    props = json.load(open(a.plan, encoding='utf-8-sig'))
    dna = json.load(open(a.dna, encoding='utf-8-sig')) if a.dna else props.get('dna')
    T, _ = P.repertuar_oku(a.repertuar)
    A = T['ayar']
    ton = dna.get('ton') if dna.get('ton') in P.TONLAR else 'ciddi'
    girdi, fps, kaynak = plan_girdileri(a, props, dna, T)
    tol = A.get('yerlesim_tolerans_kare', 1) / fps
    pen = A.get('yatak_pencere', 0.3)
    sinif = {h: (k, tuple(v['aralik'])) for k, v in A['sinif'].items() for h in v['havuz']}

    vk, _, vsure = bilgi(a.video)
    A0, B0 = (a.aralik if a.aralik else (a.video_bas, a.video_bas + vsure))
    oku_bas = max(a.video_bas, A0 - 2)
    V = kanallar(a.video, oku_bas - a.video_bas, (B0 + 2) - oku_bas, vk)
    t0 = oku_bas                     # V[0] zaman cizgisinde t0
    if not len(V):
        print('SFX KAPISI FAIL — videoda ses akisi yok (Remotion --separate-audio-to ile render edildiyse sesi muxla)')
        sys.exit(1)
    Y = S = None
    gy = 1.0
    if a.stem:
        S = kanallar(a.stem, oku_bas - a.video_bas, (B0 + 2) - oku_bas)
    elif a.yalniz_sfx:
        S = V
    if a.yatak and not a.yalniz_sfx:
        yb = max(a.yatak_bas, oku_bas - 1)          # yatagi zaman cizgisinde yb'den oku
        Yh = kanallar(a.yatak, yb - a.yatak_bas, (B0 + 3) - yb)
        ofs = int(round((oku_bas - yb) * SR))
        bas, gy = hizala(V, Yh, ofs)
        Y = np.zeros_like(V)
        k = min(len(V), len(Yh) - bas) if bas >= 0 else 0
        Y[:k] = Yh[bas:bas + k] * gy
        if S is None:
            S = V - Y
        print(f'yatak hizalama: {(bas - ofs) / SR * 1000:+.1f} ms, kazanc {20 * math.log10(max(gy, 1e-9)):+.2f} dB')
    gV = k_guc(V)
    gS = k_guc(S) if S is not None else None
    gY = k_guc(Y) if Y is not None else None
    kel = (props.get('veri') or {}).get('kelimeler') or []
    cek = (props.get('veri') or {}).get('cekimler') or []
    baslar = np.cumsum([0] + [c['kare'] for c in cek])
    X = (S if S is not None else V).mean(axis=1)
    sab = Sablon()
    seri_taban = {u: d for d, k in T['sesler'].items() for u in (k.get('seri') or [])}   # perde serisi dosyasi -> taban kaydi
    from scipy.signal import correlate

    secili = [e for e in girdi if A0 + 0.3 <= e['an'] <= B0 - 0.3]
    anlar = sorted(e['an'] for e in secili)
    # plandaki TUM seslerin sablonlari planli yerlerinde: her ses aranirken digerleri katmandan cikarilir (ayni anda tepe yapan
    # suzulme + varis vurusu, sik tik dizileri birbirini sasirtmasin)
    Pm = np.zeros(len(X))
    sabm = {}
    for k, e in enumerate(girdi):
        if A0 - 3 <= e['t'] <= B0 + 1:
            mm_ = sab(e).mean(axis=1) if len(sab(e)) else np.zeros(0)
            j0 = int(round((e['t'] - t0) * SR))
            a_, b_ = max(0, j0), min(len(X), j0 + len(mm_))
            if b_ > a_:
                Pm[a_:b_] += mm_[a_ - j0:b_ - j0]
            sabm[id(e)] = (j0, mm_)
    yer, sev = [], []
    for e in sorted(secili, key=lambda e: e['an']):
        p = sab(e)
        if not len(p):
            continue
        m = p.mean(axis=1)
        j0, _ = sabm.get(id(e), (int(round((e['t'] - t0) * SR)), m))
        Xi = X - Pm                      # artik: digerleri cikmis, bu sesin planli kopyasi geri eklenir
        a_, b_ = max(0, j0), min(len(X), j0 + len(m))
        if b_ > a_:
            Xi[a_:b_] += m[a_ - j0:b_ - j0]
        komsu = [abs(x - e['an']) for x in anlar if x != e['an']]
        W = int(SR * max(0.04, min(0.15, 0.45 * min(komsu) if komsu else 0.15)))
        i0 = int(round((e['t'] - t0) * SR))
        a0, b0 = i0 - W, i0 + len(m) + W
        ok_ara = a0 >= 0 and b0 <= len(X)
        lag, guven = 0, 0.0
        if ok_ara and float(np.dot(m, m)) > 1e-12:
            seg = Xi[a0:b0]
            c = correlate(seg, m, mode='valid', method='fft')
            e2 = np.concatenate([[0.0], np.cumsum(seg.astype(np.float64) ** 2)])
            mm2 = float(np.dot(m, m))
            # sessiz bolgede payda sifira gitmesin (sahte tepe): segment enerjisine sablon enerjisinin %10'u taban
            en = np.sqrt(np.maximum(e2[len(m):] - e2[:-len(m)], 0.1 * mm2) + 1e-12) * math.sqrt(mm2)
            ncc = c / en
            j = int(np.argmax(ncc))
            lag, guven = j - W, float(ncc[j])
        tp = zarf_tepe(p, e.get('hiza', 'tepe')) / SR
        olc = e['t'] + lag / SR + tp
        sapma = olc - e['an']
        # anlam
        neden = []
        if e['havuz'] not in P.DAVRANIS.get(e['rol'], [e['havuz']]):
            neden.append(f"havuz {e['havuz']} rol {e['rol']}'e ait degil")
        kay = T['sesler'].get(e['kutuphane']) or T['sesler'].get(seri_taban.get(e['kutuphane'], ''))
        if kay is None:
            neden.append('ses kutuphanede etiketsiz')
        elif e['havuz'] not in kay['rol']:
            neden.append(f"ses {e['havuz']} etiketli degil ({'/'.join(kay['rol'])})")
        kare = int(round(e['an'] * fps))
        ci = int(np.searchsorted(baslar, kare, side='right')) - 1
        if 0 <= ci < len(cek):
            if e['rol'] == 'gecis' and min(abs(kare - baslar[ci]), abs(kare - baslar[min(ci + 1, len(baslar) - 1)])) > 2:
                neden.append('kesim yok')
            elif e['rol'] in GORSEL and not GORSEL[e['rol']](cek[ci]):
                neden.append(f"gorsel {(cek[ci].get('kart') or {}).get('tur') or ('etiket' if cek[ci].get('etiket') else 'medya')}")
        durum = 'PASS'
        if guven < 0.2:
            durum = 'BELIRSIZ'
        elif abs(sapma) > tol + 1e-9:
            durum = 'FAIL'
        if neden:
            durum = 'FAIL'
        yer.append({'an': e['an'], 'rol': e['rol'], 'havuz': e['havuz'], 'ses': os.path.basename(e['dosya']), 'olc': olc,
                    'sapma': sapma, 'guven': guven, 'anlam': '; '.join(neden) or 'uygun', 'durum': durum})
        # seviye
        # SFX'in KENDI seviyesi: sablonun bulundugu yerde SFX katmanina (yoksa videoya) izdusumu = gercek kazanc; sik dizilerde
        # (66-100 ms arayla tik) komsu sesler pencereye girse de ilisiksiz oldugu icin olcumu sisirmez
        ia = i0 + lag                    # xcorr'un sectigi TAM ornek (yeniden yuvarlama gurultulu seste kazanci dusurur)
        seg = Xi[max(0, ia):max(0, ia) + len(m)]
        mm = m[max(0, -ia):max(0, -ia) + len(seg)]
        kk = float(np.dot(seg, mm) / (np.dot(mm, mm) + 1e-12)) if len(seg) else 0.0
        Ls = tepe_lufs(k_guc(p), 0, len(p)) + 20 * math.log10(max(kk, 1e-6))
        wa, wb = int((e['an'] - pen - t0) * SR), int((e['an'] + pen - t0) * SR)
        if gY is not None:
            Lb = lufs(gY, wa, wb)
        elif gS is not None and not a.yalniz_sfx:
            pv, ps = 10 ** ((lufs(gV, wa, wb) + 0.691) / 10), 10 ** ((lufs(gS, wa, wb) + 0.691) / 10)
            Lb = -0.691 + 10 * math.log10(max(pv - ps, 1e-12))
        elif a.yalniz_sfx:
            Lb = A['vo_ref_db']
        else:
            Lb = lufs(gV, wa, wb)
        referans = 'sabit vo_ref' if a.yalniz_sfx else 'yatak'
        if Lb < min(-40.0, A['vo_ref_db'] - 25) and not a.yalniz_sfx:   # konusmanin 25 dB alti = bolum arasi sessizlik (-45 sabiti bolum arasi duraklari kacirdi, uzay-en v01)
            Lb, referans = A['vo_ref_db'], 'sessiz -> vo_ref'
        konusma = any(w['son'] >= e['an'] - pen and w['bas'] <= e['an'] + pen for w in kel)
        fark = Ls - Lb
        sk, (lo, hi) = sinif.get(e['havuz'], ('?', (-99, 99)))
        d2 = []
        if not (lo - 1e-9 <= fark <= hi + 1e-9):
            d2.append(f'{sk} araligi {lo}..{hi} disi')
        if konusma and fark > A['konusma_tavan'] + 1e-9:
            d2.append('konusmayi bastiriyor')
        sev.append({'an': e['an'], 'rol': e['rol'], 'sinif': sk, 'ses': os.path.basename(e['dosya']), 'Ls': Ls, 'Lb': Lb, 'konusma': konusma,
                    'fark': fark, 'aralik': f'{lo}..{hi}', 'ref': referans, 'durum': 'FAIL' if d2 else 'PASS', 'neden': '; '.join(d2)})

    fy = sum(1 for r in yer if r['durum'] == 'FAIL')
    fb = sum(1 for r in yer if r['durum'] == 'BELIRSIZ')
    fs = sum(1 for r in sev if r['durum'] == 'FAIL')
    sap = np.array([r['sapma'] * 1000 for r in yer if r['durum'] != 'BELIRSIZ']) if yer else np.array([0.0])
    md = [f'# SFX kapisi {a.baslik}'.rstrip(), '',
          f'Video: `{a.video}` · plan: {kaynak} · ton {ton} · aralik {A0:.1f}-{B0:.1f} sn · {len(yer)} ses', '',
          f'## 1. Yerlesim (tolerans +-{A.get("yerlesim_tolerans_kare", 1)} kare = {tol * 1000:.0f} ms)', '',
          f'Sapma medyani {np.median(sap):+.0f} ms, mutlak en buyuk {np.abs(sap).max():.0f} ms · FAIL {fy} · belirsiz (guven < 0,2) {fb}', '',
          '| gorsel an (sn) | rol | havuz | ses | olculen tepe (sn) | sapma ms (kare) | guven | anlam | durum |', '|---|---|---|---|---|---|---|---|---|']
    for r in yer:
        md.append(f"| {r['an']:.3f} | {r['rol']} | {r['havuz']} | {r['ses']} | {r['olc']:.3f} | {r['sapma'] * 1000:+.0f} ({r['sapma'] * fps:+.1f}) | "
                  f"{r['guven']:.2f} | {r['anlam']} | {r['durum']} |")
    fk = [r['fark'] for r in sev]
    md += ['', '## 2. Seviye (SFX 100 ms K-yukseklik tepesi - yatak +-%.1f sn K-yuksekligi)' % pen, '',
           f'FAIL {fs} / {len(sev)} · fark medyani {np.median(fk) if fk else 0:+.1f} dB · konusma anindaki en gur {max([r["fark"] for r in sev if r["konusma"]] or [-99]):+.1f} dB', '',
           '| gorsel an (sn) | rol | sinif | ses | SFX LUFS | yatak LUFS | konusma | fark dB | hedef | durum |', '|---|---|---|---|---|---|---|---|---|---|']
    for r in sev:
        md.append(f"| {r['an']:.3f} | {r['rol']} | {r['sinif']} | {r['ses']} | {r['Ls']:.1f} | {r['Lb']:.1f}{'' if r['ref'] == 'yatak' else ' (' + r['ref'] + ')'} | "
                  f"{'var' if r['konusma'] else 'yok'} | {r['fark']:+.1f} | {r['aralik']} | {r['durum']}{(' — ' + r['neden']) if r['neden'] else ''} |")
    sonuc = 'FAIL' if (fy or fs) else 'PASS'
    ozet = f'SFX KAPISI {sonuc} — yerlesim FAIL {fy}/{len(yer)} (belirsiz {fb}), seviye FAIL {fs}/{len(sev)}, sapma medyani {np.median(sap):+.0f} ms'
    md += ['', ozet]
    if a.cikti:
        open(a.cikti, 'w', encoding='utf-8').write('\n'.join(md) + '\n')
        print(ozet, '->', a.cikti)
    else:
        print('\n'.join(md))
    sys.exit(1 if sonuc == 'FAIL' else 0)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
