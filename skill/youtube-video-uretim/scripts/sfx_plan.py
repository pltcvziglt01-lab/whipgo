#!/usr/bin/env python3
"""SFX PLANI (ffmpeg hatti) — VideoDna'nin Remotion icinde caldigi otomatik SFX'i `ses_miks.py --sfx` json'una cevirir.
Remotion disi (ffmpeg ile kurgulanan) kanalda ya da `<VideoDna sfx={false}>` ile render edilip ses ayri miks edilen videoda
ayni SFX dili: ayni palet, oncelik, aralik (0,8 sn), dakika tavani, tepe otelemesi, kirpma, seviye.

Kullanim:
  py sfx_plan.py --plan motion/src/v04/props.json [--dna stil-dna.json] [--klasor motion/public/varlik/sfx] [--cikti sfx.json]
  py ses_miks.py --vo vo.mp3 --sfx sfx.json --video ham.mp4 --cikti final.mp4
--plan  : VideoDna props'u ({dna, veri:{fps, cekimler[{kare,kart,etiket,flas}]}}); dna props'ta yoksa --dna stil-dna.json.
--klasor: SFX dosyalarinin klasoru (varsayilan: props'un ustundeki public/varlik/sfx). Eksik dosya UYARI.
Cikti: [{"dosya": mutlak yol, "t": sn, "db": dB, "kirp": sn, "sure": sn, "rol": ...}]  (ses_miks: kirp/sure varsa atrim + 2 kare
  giris / 0,25 sn cikis yumusamasi, Remotion SfxKatmani ile ayni zarf). t = dosyanin (kirpilmis) caldigi an; tepe olay karesine oturur.

Tek kaynak: palet (SFX_PALET), olcum (SFX_OLCU), ONCELIK, KUYRUK, TAVAN her calismada repertuar/Sfx.tsx'ten OKUNUR (kopya yok).
Mantik (Gecis.tsx gecisPlani, VideoDna.tsx sfxOlaylari, Sfx.tsx sfxPlani) Python'a port edildi; rastgelelik temel.ts `rastgele`
(mulberry32) birebir portu ile AYNI tohumdan uretilir -> Remotion ile ayni ses, ayni kare (dogrulama: --karsilastir node ile).
Port edilen fonksiyonlarin TS metni degisirse betik UYARI verir (imza farki): portu gozden gecir.
"""
import argparse, ast, hashlib, json, math, os, re, subprocess, sys

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
from kurgu_denetim import rastgele   # noqa: E402  (temel.ts birebir portu)

REPO = os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
# port edilen TS fonksiyonlarinin normalize metin imzasi (sha1 ilk 12). Degisirse UYARI.
PORT_IMZA = {'Sfx.tsx:sfxPlani': '12332b7b2da1', 'Gecis.tsx:gecisPlani': '4a32b5b63f60', 'VideoDna.tsx:sfxOlaylari': '6a7afc7f1377'}


# ---------------------------------------------------------------- TS'ten okuma
def blok(metin, bas):
    """metin[bas:]'taki ilk { ... } blogunu (dengeli) dondurur"""
    i = metin.index('{', bas)
    d = 0
    q = None
    for j in range(i, len(metin)):
        ch = metin[j]
        if q:
            if ch == q and metin[j - 1] != '\\':
                q = None
            continue
        if ch in '\'"`':
            q = ch
        elif ch == '{':
            d += 1
        elif ch == '}':
            d -= 1
            if d == 0:
                return metin[i:j + 1]
    raise ValueError('blok kapanmadi')


def ts_literal(s):
    """TS nesne literali (tirnaksiz anahtar, // yorum, sondaki virgul) -> Python"""
    s = re.sub(r'//[^\n]*', '', s)
    s = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r"\1'\2':", s)
    return ast.literal_eval(s)


def sabit(metin, ad):
    m = re.search(r'(?:export\s+)?const\s+' + ad + r'\b[^=]*=', metin)
    if not m:
        raise SystemExit(f'Sfx.tsx icinde {ad} bulunamadi')
    return ts_literal(blok(metin, m.end()))


def fonksiyon_imza(metin, ad):
    m = re.search(r'export\s+const\s+' + ad + r'\b', metin)
    if not m:
        return None
    g = blok(metin, metin.index('=>', m.end()))
    return hashlib.sha1(re.sub(r'\s+', '', g).encode('utf-8')).hexdigest()[:12]


def repertuar_oku(rep):
    oku = lambda a: open(os.path.join(rep, a), encoding='utf-8').read()
    sfx = oku('Sfx.tsx')
    t = {'palet': sabit(sfx, 'SFX_PALET'), 'olcu': sabit(sfx, 'SFX_OLCU'), 'oncelik': sabit(sfx, 'ONCELIK'),
         'kuyruk': sabit(sfx, 'KUYRUK'), 'tavan': sabit(sfx, 'TAVAN')}
    uyari = []
    for anahtar, beklenen in PORT_IMZA.items():
        dosya, fn = anahtar.split(':')
        try:
            im = fonksiyon_imza(oku(dosya), fn)
        except (OSError, ValueError):
            im = None
        t.setdefault('imza', {})[anahtar] = im
        if beklenen and im != beklenen:
            uyari.append(f'{anahtar} degismis (imza {im}, port {beklenen}): sfx_plan.py portunu gozden gecir')
    return t, uyari


# ---------------------------------------------------------------- port: Gecis.tsx gecisPlani
def gecis_plani(n, gecis, tohum='g', yumusak_oran=1.0):
    r = rastgele(tohum + 'gp')
    liste = gecis if isinstance(gecis, list) else [gecis]
    out = []
    for i in range(n):
        if r() > yumusak_oran:
            out.append('sert')
            continue
        t = liste[math.floor(r() * len(liste))]
        if len(liste) > 1 and i > 0 and t == out[i - 1]:
            t = liste[(liste.index(t) + 1) % len(liste)]
        out.append(t)
    return out


# ---------------------------------------------------------------- port: VideoDna.tsx sfxOlaylari (sahne suresi = kare + gecis)
def sfx_olaylari(cekimler, plan, gecis_kare):
    d = lambda i: gecis_kare if 0 <= i < len(plan) and plan[i] != 'sert' else 0
    sureler = [c['kare'] + d(i) for i, c in enumerate(cekimler)]
    out, bas = [], 0
    for i, c in enumerate(cekimler):
        if i > 0:
            bas += sureler[i - 1] - d(i - 1)
        if i > 0 and plan[i - 1] and plan[i - 1] != 'sert':
            out.append({'kare': bas, 'rol': 'gecis'})
        k = c.get('kart')
        if k:
            out.append({'kare': bas, 'rol': 'alinti' if k.get('tur') == 'alinti' else 'sayi' if k.get('tur') == 'sayi' else 'kart'})
        elif c.get('etiket'):
            out.append({'kare': bas + 4, 'rol': 'altbant'})
        if c.get('flas'):
            out.append({'kare': bas, 'rol': 'vurgu'})
    return out


def js_round(x):
    return math.floor(x + 0.5)       # Math.round: .5 yukari (Python round bankaci)


# ---------------------------------------------------------------- port: Sfx.tsx sfxPlani
def sfx_plani(olaylar, ton, tohum, fps, sfx_orani, T):
    r = rastgele(tohum + 'sfx')
    palet = T['palet'].get(ton) or T['palet']['ciddi']
    secili = {}
    for rol in palet:                                   # Object.keys sirasi = literal sirasi
        a = list(palet[rol])
        for i in range(len(a) - 1, 0, -1):
            j = math.floor(r() * (i + 1))
            a[i], a[j] = a[j], a[i]
        secili[rol] = a[:min(2, len(a))]
    esik = max(0.15, min(0.9, sfx_orani))
    aday = [o for o in olaylar if o['rol'] != 'gecis' or r() < esik]   # r() yalniz gecislerde, olay sirasiyla
    aday = sorted(aday, key=lambda o: o['kare'])                     # JS sort kararli
    ON = T['oncelik']
    bosluk = js_round(fps * 0.8)
    kalan = []
    for o in aday:
        if kalan and o['kare'] - kalan[-1]['kare'] < bosluk:
            if ON[o['rol']] > ON[kalan[-1]['rol']]:
                kalan[-1] = o
            continue
        kalan.append(o)
    pencere, tavan = fps * 60, T['tavan'].get(ton) or 12
    sonuc = []
    p = 0
    son_kare = kalan[-1]['kare'] if kalan else 0
    while p <= son_kare:
        g = [o for o in kalan if p <= o['kare'] < p + pencere]
        tut = {id(o) for o in sorted(g, key=lambda o: -ON[o['rol']])[:tavan]}
        sonuc += [o for o in g if id(o) in tut]
        p += pencere
    sayac = {}
    out = []
    for o in sonuc:
        liste = secili[o['rol']]
        k = sayac[o['rol']] = sayac.get(o['rol'], -1) + 1
        dosya, sn, ses = liste[k % len(liste)]
        bas, tepe, db = T['olcu'].get(dosya, [0, 0.05, -6])
        kirp = max(0, bas - 0.04)
        vurus = js_round((tepe - kirp) * fps)
        kazanc = min(6, math.pow(10, (-3 - db) / 20))
        sure = max(4, js_round(min(sn + 2, tepe - kirp + T['kuyruk'][o['rol']]) * fps))
        out.append({'kare': max(0, o['kare'] - vurus), 'dosya': dosya, 'sure': sure, 'ses': ses * kazanc * (0.9 + r() * 0.2),
                    'rol': o['rol'], 'kirp': js_round(kirp * fps)})
    return out


def dna_sfx(props, dna, T):
    """DnaSfx: ton (ciddi/gizem/enerjik/sakin, yoksa ciddi), fps = iskelet.fps || 30, sfx_orani ?? 0.5"""
    v = props['veri']
    isk = dna.get('iskelet') or {}
    ton = dna.get('ton') if dna.get('ton') in ('ciddi', 'gizem', 'enerjik', 'sakin') else 'ciddi'
    fps = isk.get('fps') or 30
    plan = gecis_plani(len(v['cekimler']) - 1, dna.get('gecis') or 'kesme', dna.get('tohum') or 'g', isk.get('yumusak_oran', 1))
    olay = sfx_olaylari(v['cekimler'], plan, isk.get('gecis_kare', 12))
    so = isk.get('sfx_orani')
    return sfx_plani(olay, ton, dna.get('tohum') or '', fps, 0.5 if so is None else so, T), olay, ton, fps


def miks_json(plan, fps, klasor):
    out = []
    for s in plan:
        out.append({'dosya': os.path.join(klasor, s['dosya']).replace('\\', '/'), 't': round(s['kare'] / fps, 4),
                    'db': round(20 * math.log10(max(s['ses'], 1e-6)), 2), 'kirp': round(s['kirp'] / fps, 4),
                    'sure': round(s['sure'] / fps, 4), 'rol': s['rol']})
    return out


def public_bul(yol):
    d = os.path.dirname(os.path.abspath(yol))
    for _ in range(6):
        if os.path.isdir(os.path.join(d, 'public')):
            return os.path.join(d, 'public')
        d = os.path.dirname(d)
    return None


def karsilastir(props_yol, rep, plan, fps):
    """node ile gercek Sfx.tsx sfxPlani'ni ayni olaylarla calistirip kare/dosya/ses karsilastirir (esbuild gerekir)."""
    import tempfile
    motion = os.path.dirname(public_bul(props_yol) or props_yol)
    if not os.path.isdir(os.path.join(motion, 'node_modules', 'esbuild')):
        return 'esbuild yok (motion/node_modules): karsilastirma atlandi'
    d = tempfile.mkdtemp(prefix='sfxplan-')
    giris = os.path.join(d, 'g.ts')
    open(giris, 'w', encoding='utf-8').write(
        f"import {{ sfxPlani }} from {json.dumps(os.path.join(rep, 'Sfx.tsx').replace(chr(92), '/'))};\n"
        f"import {{ gecisPlani }} from {json.dumps(os.path.join(rep, 'Gecis.tsx').replace(chr(92), '/'))};\n"
        f"import {{ sfxOlaylari }} from {json.dumps(os.path.join(rep, 'VideoDna.tsx').replace(chr(92), '/'))};\n"
        "import * as fs from 'fs';\n"
        "const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const dna = p.dna, v = p.veri, n = v.cekimler.length;\n"
        "const plan = gecisPlani(n - 1, dna.gecis, dna.tohum, dna.iskelet.yumusak_oran);\n"
        "const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? dna.iskelet.gecis_kare : 0);\n"
        "const sureler = v.cekimler.map((c: any, i: number) => c.kare + d(i));\n"
        "const ol = sfxOlaylari(v, sureler, plan, dna.iskelet.gecis_kare);\n"
        "const ton = ['ciddi','gizem','enerjik','sakin'].includes(dna.ton || '') ? dna.ton : 'ciddi';\n"
        "console.log(JSON.stringify(sfxPlani(ol, ton, dna.tohum, dna.iskelet.fps || 30, dna.iskelet.sfx_orani ?? 0.5)));\n")
    cikis = os.path.join(d, 'g.cjs')
    kur = os.path.join(d, 'kur.cjs')
    open(kur, 'w', encoding='utf-8').write(
        f"require({json.dumps(os.path.join(motion, 'node_modules', 'esbuild').replace(chr(92), '/'))}).buildSync({{entryPoints: [{json.dumps(giris.replace(chr(92), '/'))}],"
        f" bundle: true, platform: 'node', format: 'cjs', logLevel: 'error', outfile: {json.dumps(cikis.replace(chr(92), '/'))},"
        " external: ['react', 'react/*', 'remotion', '@remotion/*'], jsx: 'automatic'});")
    r = subprocess.run(['node', kur], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        return 'esbuild hatasi: ' + r.stderr[-400:]
    env = dict(os.environ, NODE_PATH=os.path.join(motion, 'node_modules'))
    r = subprocess.run(['node', cikis, os.path.abspath(props_yol)], capture_output=True, text=True, cwd=motion, encoding='utf-8', env=env)
    if r.returncode:
        return 'node hatasi: ' + r.stderr[-400:]
    js = json.loads(r.stdout)
    fark = [i for i, (a, b) in enumerate(zip(plan, js)) if a['kare'] != b['kare'] or a['dosya'] != b['dosya'] or a['sure'] != b['sure']
            or a['kirp'] != b['kirp'] or abs(a['ses'] - b['ses']) > 1e-9]
    return (f"Remotion sfxPlani: {len(js)} olay, Python: {len(plan)} olay, farkli {len(fark) + abs(len(js) - len(plan))}"
            + (f" (ilk fark #{fark[0]}: py {plan[fark[0]]} / js {js[fark[0]]})" if fark else ''))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan', required=True, help='props.json (VideoDna)')
    ap.add_argument('--dna', help='stil-dna.json (props.json dna icermiyorsa)')
    ap.add_argument('--klasor', help='SFX dosya klasoru (varsayilan <public>/varlik/sfx)')
    ap.add_argument('--repertuar', default=os.path.join(REPO, 'repertuar'))
    ap.add_argument('--cikti')
    ap.add_argument('--karsilastir', action='store_true', help='node+esbuild ile Remotion sfxPlani ciktisiyla birebir karsilastir')
    a = ap.parse_args()
    props = json.load(open(a.plan, encoding='utf-8-sig'))
    dna = json.load(open(a.dna, encoding='utf-8-sig')) if a.dna else props.get('dna')
    if not dna:
        sys.exit('props.json dna icermiyor: --dna stil-dna.json ver')
    if 'veri' not in props:
        props = {'veri': props}
    T, uyari = repertuar_oku(a.repertuar)
    plan, olay, ton, fps = dna_sfx(props, dna, T)
    pub = public_bul(a.plan)
    klasor = os.path.abspath(a.klasor or os.path.join(pub or '.', 'varlik', 'sfx'))
    out = miks_json(plan, fps, klasor)
    eksik = sorted({os.path.basename(e['dosya']) for e in out if not os.path.exists(e['dosya'])})
    cikti = a.cikti or os.path.join(os.path.dirname(os.path.abspath(a.plan)), 'sfx.json')
    json.dump(out, open(cikti, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    sure = sum(c['kare'] for c in props['veri']['cekimler']) / fps
    print(f"SFX {len(out)} olay ({len(olay)} kurgu olayindan) · ton {ton} · dakikada {len(out) / max(sure / 60, 1e-9):.1f} · "
          f"{', '.join(f'{k} {v}' for k, v in Counter(e['rol'] for e in out).most_common())} -> {cikti}")
    for u in uyari:
        print('UYARI', u)
    if eksik:
        print(f'UYARI {len(eksik)} SFX dosyasi {klasor} icinde yok: {eksik[:6]} (varlik_kur.py)')
    if a.karsilastir:
        print(karsilastir(a.plan, a.repertuar, plan, fps))


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
