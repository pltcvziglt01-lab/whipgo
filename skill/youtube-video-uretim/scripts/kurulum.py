#!/usr/bin/env python3
"""KURULUM — repo yardimcisi.
  py kurulum.py kontrol            # python/ffmpeg/node/git/gh, repo, kutuphane, varlik durumu
  py kurulum.py ayna [--deneme]    # repo -> Drive kutuphanesi aynasi (_araclar/ betikleri, remotion/repertuar/ bilesenleri). Lisansli varlik GITMEZ.
  py kurulum.py paketle [--hedef <klasor>]   # skill/ -> dist/youtube-video-uretim-<tarih>.skill (claude.ai'ye yuklenir)
"""
import argparse, datetime, filecmp, glob, os, shutil, subprocess, sys, zipfile

BURASI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(BURASI, '..'))
KOK = os.path.abspath(os.path.join(SKILL, '..', '..'))
GH = shutil.which('gh') or r'C:\Program Files\GitHub CLI\gh.exe'
# kutuphanenin _araclar/ aynasina giden betikler (kutuphane isini yapanlar)
KUTUPHANE_BETIKLERI = ['kanal_isle.py', 'rakip_indir.py', 'kare_analiz.py', 'edit_dili.py', 'edit_dili_test.py', 'font_aday.py',
                       'temizle.py', 'cerez_al.py', 'kutuphane_ara.py', 'profil_kontrol.py', 'stil_dna.py', 'preset_ogren.py']


def kutuphane():
    for a in [os.environ.get('EDIT_KUTUPHANE'), r"G:\Drive'ım\edit kutuphane", r"G:\My Drive\edit kutuphane",
              *glob.glob(r"G:\.shortcut-targets-by-id\*\edit kutuphane")]:
        if a and os.path.isdir(os.path.join(a, 'kanallar')):
            return a
    return None


def surum(k):
    try:
        r = subprocess.run(k, capture_output=True, text=True, timeout=30)
        return (r.stdout or r.stderr).strip().splitlines()[0][:70]
    except Exception as h:
        return f'YOK ({h.__class__.__name__})'


def kontrol(a):
    print('repo      :', KOK)
    for ad, k in [('python', [sys.executable, '--version']), ('ffmpeg', ['ffmpeg', '-version']), ('node', ['node', '-v']),
                  ('git', ['git', '--version']), ('gh', [GH, '--version'])]:
        print(f'{ad:10}:', surum(k))
    print('gh giris  :', surum([GH, 'auth', 'status']))
    print('kutuphane :', kutuphane() or 'BULUNAMADI (EDIT_KUTUPHANE ayarla)')
    v = os.path.join(KOK, 'varlik')
    import json
    kat = json.load(open(os.path.join(v, 'katalog.json'), encoding='utf-8')) if os.path.isfile(os.path.join(v, 'katalog.json')) else {}
    for t in ('arkaplan', 'filmburn'):
        n = len(glob.glob(os.path.join(v, t, '*.mp4')))
        print(f'{t:10}: diskte {n} / katalogda {len(kat.get(t, {}))}' + ('  -> py varlik_kur.py indir' if n < len(kat.get(t, {})) else ''))
    print('preset    :', 'var' if os.path.isfile(os.path.join(v, 'preset-dili-remotion.json')) else 'YOK -> py varlik_kur.py presetler')
    print('sfx       :', len(glob.glob(os.path.join(v, 'sfx', '*.mp3')) + glob.glob(os.path.join(v, 'sfx', '*.wav'))))


def kopyala(kaynak, hedef, deneme):
    if os.path.isfile(hedef) and filecmp.cmp(kaynak, hedef, shallow=False):
        return False
    if not deneme:
        os.makedirs(os.path.dirname(hedef), exist_ok=True)
        shutil.copy2(kaynak, hedef)
    print(('(deneme) ' if deneme else '') + 'guncel ->', hedef)
    return True


def ayna(a):
    k = kutuphane()
    if not k:
        sys.exit('HATA: kutuphane bulunamadi')
    n = 0
    for b in KUTUPHANE_BETIKLERI:
        n += kopyala(os.path.join(BURASI, b), os.path.join(k, '_araclar', b), a.deneme)
    for f in glob.glob(os.path.join(KOK, 'repertuar', '*')):
        if os.path.isfile(f):
            n += kopyala(f, os.path.join(k, 'remotion', 'repertuar', os.path.basename(f)), a.deneme)
    for f in glob.glob(os.path.join(KOK, 'sablon-proje', 'katalog', '*.jpg')):
        n += kopyala(f, os.path.join(k, 'remotion', 'repertuar', 'katalog', os.path.basename(f)), a.deneme)
    print(f'{n} dosya guncellendi (lisansli varliklar aynaya girmez).')


def paketle(a):
    os.makedirs(os.path.join(KOK, 'dist'), exist_ok=True)
    ad = f"youtube-video-uretim-{datetime.date.today():%Y-%m-%d}.skill"
    yol = os.path.join(KOK, 'dist', ad)
    n = 0
    with zipfile.ZipFile(yol, 'w', zipfile.ZIP_DEFLATED) as z:
        for kok, dirs, files in os.walk(SKILL):
            dirs[:] = [d for d in dirs if d != '__pycache__']
            for f in files:
                if f.endswith('.pyc'):
                    continue
                p = os.path.join(kok, f)
                z.write(p, os.path.join('youtube-video-uretim', os.path.relpath(p, SKILL)))
                n += 1
    print(f'{n} dosya -> {yol} ({os.path.getsize(yol) // 1024} KB)')
    if a.hedef:
        shutil.copy2(yol, os.path.join(a.hedef, ad))
        print('kopya ->', os.path.join(a.hedef, ad))


def main():
    ap = argparse.ArgumentParser()
    alt = ap.add_subparsers(dest='k', required=True)
    alt.add_parser('kontrol')
    y = alt.add_parser('ayna'); y.add_argument('--deneme', action='store_true')
    p = alt.add_parser('paketle'); p.add_argument('--hedef')
    a = ap.parse_args()
    {'kontrol': kontrol, 'ayna': ayna, 'paketle': paketle}[a.k](a)


if __name__ == '__main__':
    main()
