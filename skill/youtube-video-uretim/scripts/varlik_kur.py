#!/usr/bin/env python3
"""VARLIK KUR — lisansli edit paketlerini (animasyonlu arka plan, filmburn, SFX, Premiere preset) repoda yonetir.

Yerlesim (repo kokunde, ornek C:\\otomasyon\\yt-uretim):
  varlik/arkaplan/ab-NN.mp4      1080p30 calisma kopyasi (Remotion bunu kullanir)   -> GitHub Release
  varlik/filmburn/fb-NN.mp4      1080p30 calisma kopyasi                              -> GitHub Release
  arsiv/orijinal/*.mp4           4K orijinaller (varlik/ DISINDA: Remotion public kopyasina girmesin) -> GitHub Release
  varlik/onizleme/*.jpg          kucuk resimler + katalog sayfalari                   -> git
  varlik/katalog.json            her video: sure, parlaklik, doygunluk, sicaklik, baskin renkler, hareket, dongu, tepe an
  varlik/sfx/ + sfx-katalog.json (sfx_kur.py)                                         -> git
  varlik/presetler/*.prfpset  +  varlik/preset-dili-remotion.json (preset_ogren.py)   -> git

Komutlar:
  py varlik_kur.py katalog [--ham <klasor>]   # ham mp4'leri adlandir, 1080p kopya uret, olc, katalogla
  py varlik_kur.py presetler                  # tum .prfpset -> preset-dili-remotion.json
  py varlik_kur.py yukle                      # mp4'leri GitHub Release 'varlik-v1'e yukler (gh gerekli)
  py varlik_kur.py indir [--orijinal]         # yeni makinede: release'den indirir
  py varlik_kur.py kanal <motion klasoru>     # kanal projesine repertuar/fontlar/varlik baglantilari (junction)
Lisans: paketler yalniz bitmis videonun parcasi olarak kullanilir; repo OZEL kalir, baskasina acilmaz.
"""
import argparse, glob, json, os, re, shutil, subprocess, sys

BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.environ.get('YT_URETIM') or os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
V = os.path.join(KOK, 'varlik')
ARSIV = os.path.join(KOK, 'arsiv', 'orijinal')  # Remotion her render'da public/'i kopyalar: 4K'lar burada
ETIKET = 'varlik-v1'
GH = shutil.which('gh') or r'C:\Program Files\GitHub CLI\gh.exe'


def calis(k, **kw):
    return subprocess.run(k, capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)


def sure(yol):
    r = calis(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', yol])
    try:
        return round(float(r.stdout.strip()), 3)
    except ValueError:
        return 0.0


def kareler(yol, n=12, olcek=160):
    """videodan n esit aralikli kucuk kare (numpy BGR)."""
    import numpy as np
    s = sure(yol)
    out = []
    for i in range(n):
        t = s * (i + 0.5) / n
        r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', yol, '-frames:v', '1', '-vf', f'scale={olcek}:-2',
                            '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True)
        h = len(r.stdout) // (olcek * 3)
        if h:
            out.append((t, np.frombuffer(r.stdout, np.uint8).reshape(h, olcek, 3)))
    return out


def olc(yol, filmburn=False):
    import cv2, numpy as np
    ks = kareler(yol, 16 if filmburn else 12)
    if not ks:
        return None
    hsv = [cv2.cvtColor(k, cv2.COLOR_BGR2HSV).astype(float) for _, k in ks]
    parl = [h[..., 2].mean() / 255 for h in hsv]
    doy = [h[..., 1].mean() / 255 for h in hsv]
    sic = [float(k[..., 2].mean() - k[..., 0].mean()) for _, k in ks]
    har = [float(np.abs(ks[i][1].astype(float) - ks[i - 1][1].astype(float)).mean() / 255) for i in range(1, len(ks))]
    dongu = float(np.abs(ks[0][1].astype(float) - ks[-1][1].astype(float)).mean() / 255)
    # baskin renkler (k-means, 4)
    piks = np.concatenate([k.reshape(-1, 3) for _, k in ks]).astype(np.float32)
    piks = piks[np.random.default_rng(1).choice(len(piks), min(6000, len(piks)), replace=False)]
    _, et, mer = cv2.kmeans(piks, 4, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0), 3, cv2.KMEANS_PP_CENTERS)
    say = np.bincount(et.flatten(), minlength=4)
    renk = ['#%02x%02x%02x' % (int(c[2]), int(c[1]), int(c[0])) for c in mer[np.argsort(-say)]]
    d = {'parlaklik': round(float(np.mean(parl)), 3), 'doygunluk': round(float(np.mean(doy)), 3), 'sicaklik': round(float(np.mean(sic)), 1),
         'renkler': renk, 'hareket': round(float(np.mean(har)), 4) if har else 0, 'dongu_farki': round(dongu, 4)}
    d['sinif'] = 'acik' if d['parlaklik'] > 0.55 else 'koyu' if d['parlaklik'] < 0.3 else 'orta'
    if filmburn:
        i = int(np.argmax(parl))
        d['tepe_sn'] = round(ks[i][0], 2)
        d['siyah_orani'] = round(float(np.mean([(h[..., 2] < 25).mean() for h in hsv])), 3)
    return d


def no(ad):
    m = re.search(r'\((\d+)\)', ad)
    return int(m.group(1)) if m else 0


def katalog(a):
    ham = a.ham or V
    os.makedirs(ARSIV, exist_ok=True)
    os.makedirs(os.path.join(V, 'onizleme'), exist_ok=True)
    kat = json.load(open(os.path.join(V, 'katalog.json'), encoding='utf-8')) if os.path.isfile(os.path.join(V, 'katalog.json')) else {'arkaplan': {}, 'filmburn': {}}
    for tur, onek, fb in (('arkaplan', 'ab', False), ('filmburn', 'fb', True)):
        os.makedirs(os.path.join(V, tur), exist_ok=True)
        hamlar = sorted([p for p in glob.glob(os.path.join(ham, tur, '*.mp4')) if not re.match(r'^(ab|fb)-\d+\.mp4$', os.path.basename(p))], key=lambda p: no(os.path.basename(p)))
        for p in hamlar:  # orijinali arsive tasi, 1080p30 sessiz calisma kopyasi uret
            ad = f'{onek}-{no(os.path.basename(p)):02d}'
            ori = os.path.join(ARSIV, f'{ad}-4k.mp4')
            if not os.path.isfile(ori):
                shutil.move(p, ori)
            hedef = os.path.join(V, tur, ad + '.mp4')
            if not os.path.isfile(hedef):
                r = calis(['ffmpeg', '-v', 'error', '-y', '-i', ori, '-vf', 'scale=1920:1080:flags=lanczos,fps=30', '-an', '-c:v', 'libx264',
                           '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', hedef])
                if r.returncode:
                    print('HATA', ad, r.stderr[-300:])
                    continue
            kat[tur].setdefault(ad, {})['kaynak_ad'] = kat[tur].get(ad, {}).get('kaynak_ad') or os.path.basename(p)
            print('kopya', ad)
        for yol in sorted(glob.glob(os.path.join(V, tur, f'{onek}-*.mp4'))):
            ad = os.path.basename(yol)[:-4]
            if kat[tur].get(ad, {}).get('parlaklik') is not None and not a.yeniden:
                continue
            d = olc(yol, fb) or {}
            d['sure'] = sure(yol)
            kat[tur][ad] = {**kat[tur].get(ad, {}), **d}
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(round(d['sure'] * (d.get('tepe_sn', d['sure'] / 2) / max(0.01, d['sure'])), 2)),
                            '-i', yol, '-frames:v', '1', '-vf', 'scale=320:-2', os.path.join(V, 'onizleme', ad + '.jpg')])
            print('olcu', ad, d.get('sinif'), d.get('parlaklik'), d.get('hareket'))
        # katalog sayfasi
        resim = sorted(glob.glob(os.path.join(V, 'onizleme', f'{onek}-*.jpg')))
        if resim:
            sayfa(resim, os.path.join(V, 'onizleme', f'{tur}-sayfa.jpg'))
    json.dump(kat, open(os.path.join(V, 'katalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('katalog ->', os.path.join(V, 'katalog.json'), {k: len(v) for k, v in kat.items()})


def sayfa(resimler, cikti, sutun=6):
    from PIL import Image, ImageDraw
    w, h = 320, 180
    S = Image.new('RGB', (w * sutun, h * ((len(resimler) + sutun - 1) // sutun)), (40, 40, 40))
    d = ImageDraw.Draw(S)
    for i, r in enumerate(resimler):
        im = Image.open(r).convert('RGB').resize((w, h))
        x, y = (i % sutun) * w, (i // sutun) * h
        S.paste(im, (x, y))
        d.rectangle([x, y, x + 52, y + 18], fill=(0, 0, 0))
        d.text((x + 4, y + 3), os.path.basename(r)[:-4], fill=(255, 255, 255))
    S.save(cikti, quality=85)


def presetler(a):
    sys.path.insert(0, BURASI)
    import preset_ogren as po
    tum = []
    for p in sorted(glob.glob(os.path.join(V, 'presetler', '*.prfpset'))):
        kok, nesne = po.oku(p)
        rid = po.ref(nesne[kok.find('Tree').get('ObjectRef')], 'RootBin')
        out = []
        po.gez(nesne, rid, [], out)
        paket = os.path.splitext(os.path.basename(p))[0]
        for x in out:
            d = po.derle(x)
            if d:
                d['paket'] = paket
                d['id'] = po.kimlik(paket, x)
                tum.append(d)
        print(paket, len(out))
    # ayni id'yi tekillestir
    gor, son = set(), []
    for d in tum:
        if d['id'] not in gor:
            gor.add(d['id'])
            son.append(d)
    json.dump(son, open(os.path.join(V, 'preset-dili-remotion.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    from collections import Counter
    print(len(son), 'preset ->', os.path.join(V, 'preset-dili-remotion.json'), dict(Counter(d['sinif'] for d in son)))


def gh(*k):
    r = calis([GH, *k], cwd=KOK)
    if r.returncode:
        print(r.stderr.strip()[-500:])
    return r


def yukle(a):
    if gh('release', 'view', ETIKET).returncode:
        gh('release', 'create', ETIKET, '--title', 'Edit varliklari v1', '--notes', 'Lisansli paketler (ozel kullanim). Dagitma.')
    dosyalar = sorted(glob.glob(os.path.join(V, 'arkaplan', '*.mp4')) + glob.glob(os.path.join(V, 'filmburn', '*.mp4')))
    if a.orijinal:
        dosyalar += sorted(glob.glob(os.path.join(ARSIV, '*.mp4')))
    for i in range(0, len(dosyalar), 10):
        r = gh('release', 'upload', ETIKET, *dosyalar[i:i + 10], '--clobber')
        print(f'{min(i + 10, len(dosyalar))}/{len(dosyalar)}', 'tamam' if not r.returncode else 'HATA')


def indir(a):
    for tur, desen in (('arkaplan', 'ab-*.mp4'), ('filmburn', 'fb-*.mp4')):
        os.makedirs(os.path.join(V, tur), exist_ok=True)
        gh('release', 'download', ETIKET, '-p', desen, '-D', os.path.join(V, tur), '--skip-existing')
    if a.orijinal:
        gh('release', 'download', ETIKET, '-p', '*-4k.mp4', '-D', ARSIV, '--skip-existing')
    print('indirildi:', {t: len(glob.glob(os.path.join(V, t, '*.mp4'))) for t in ('arkaplan', 'filmburn')})


def baglanti(hedef, kaynak):
    if os.path.exists(hedef):
        print('var, dokunulmadi:', hedef)
        return
    os.makedirs(os.path.dirname(hedef), exist_ok=True)
    r = calis(['cmd', '/c', 'mklink', '/J', hedef, kaynak])
    print(r.stdout.strip() or r.stderr.strip())


def sert_bag(kaynak_desen, hedef_klasor):
    """public/ altina dosya basina hard link: Remotion render oncesi public/'i kopyalarken klasor baglantisini (junction)
    symlink olarak kurmaya calisir ve Windows'ta EPERM verir; hard link normal dosya gibi kopyalanir, disk yeri harcamaz.
    Ayni disk (C:) gerekir; degilse kopyalar. Tekrar calistirmak guvenlidir (yeni/degisen dosyalari ekler)."""
    os.makedirs(hedef_klasor, exist_ok=True)
    n = 0
    for f in glob.glob(kaynak_desen):
        if not os.path.isfile(f):
            continue
        h = os.path.join(hedef_klasor, os.path.basename(f))
        if os.path.exists(h):
            if os.path.samefile(h, f):
                continue
            os.remove(h)
        try:
            os.link(f, h)
        except OSError:
            shutil.copy2(f, h)
        n += 1
    return n


def kanal(a):
    m = os.path.abspath(a.motion)
    if not os.path.isfile(os.path.join(m, 'package.json')):
        sys.exit(f'HATA: {m} bir Remotion projesi degil (package.json yok). Yeni kanal icin sablon-proje/ klasorunu kopyala.')
    # src/: junction sorunsuz (webpack izler); public/: hard link (yukaridaki not)
    baglanti(os.path.join(m, 'src', 'repertuar'), os.path.join(KOK, 'repertuar'))
    pub = os.path.join(m, 'public')
    for eski in ('fontlar', 'varlik'):  # eski surumun junction'lari: yalniz baglanti kaldirilir, hedef silinmez
        y = os.path.join(pub, eski)
        if os.path.isdir(y) and os.path.realpath(y) != os.path.abspath(y):
            calis(['cmd', '/c', 'rmdir', y])
    n = sert_bag(os.path.join(KOK, 'fontlar', '*.ttf'), os.path.join(pub, 'fontlar'))
    for alt, desen in (('arkaplan', '*.mp4'), ('filmburn', '*.mp4'), ('sfx', '*'), ('', '*.json')):
        n += sert_bag(os.path.join(V, alt, desen), os.path.join(pub, 'varlik', alt))
    # CC0 SFX kutuphanesi (alt klasorleriyle: sfx-kit, uisfx, opus-sound-directory, turev)
    for alt in sorted({os.path.relpath(os.path.dirname(f), V) for f in glob.glob(os.path.join(V, 'sfx-cc0', '**', '*'), recursive=True) if os.path.isfile(f)}):
        n += sert_bag(os.path.join(V, alt, '*'), os.path.join(pub, 'varlik', alt))
    print(f'{n} dosya baglandi -> {pub}')
    print('Kanal bagli. VideoNN.tsx: import dna from "./vNN/stil-dna.json"; bilesenler: ./repertuar/Dna. Varlik guncellenince bu komutu tekrar calistir.')


def main():
    ap = argparse.ArgumentParser()
    alt = ap.add_subparsers(dest='k', required=True)
    k = alt.add_parser('katalog'); k.add_argument('--ham'); k.add_argument('--yeniden', action='store_true')
    alt.add_parser('presetler')
    y = alt.add_parser('yukle'); y.add_argument('--orijinal', action='store_true')
    i = alt.add_parser('indir'); i.add_argument('--orijinal', action='store_true')
    c = alt.add_parser('kanal'); c.add_argument('motion')
    a = ap.parse_args()
    {'katalog': katalog, 'presetler': presetler, 'yukle': yukle, 'indir': indir, 'kanal': kanal}[a.k](a)


if __name__ == '__main__':
    main()
