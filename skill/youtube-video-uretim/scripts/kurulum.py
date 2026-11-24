#!/usr/bin/env python3
"""KURULUM — repo yardimcisi.
  py kurulum.py kontrol            # python/ffmpeg/node/git/gh, repo, kutuphane, varlik durumu
  py kurulum.py ayna [--deneme]    # repo -> Drive kutuphanesi aynasi (_araclar/ betikleri, remotion/repertuar/ bilesenleri). Lisansli varlik GITMEZ.
  py kurulum.py paketle [--hedef <klasor>]   # skill/ -> dist/youtube-video-uretim-<tarih>.skill (claude.ai'ye yuklenir)
  py kurulum.py kanal C:/otomasyon/<kanal>   # kanal projesini sisteme bagla: repertuar/varlik/fontlar baglantisi + ortak VideoDna sarmalayicisi
  py kurulum.py kancalar                     # git kancalari: pre-commit = dogrula.py --hizli, post-commit = ayna
"""
import argparse, datetime, filecmp, glob, os, shutil, subprocess, sys, zipfile

BURASI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(BURASI, '..'))
KOK = os.path.abspath(os.path.join(SKILL, '..', '..'))
GH = shutil.which('gh') or r'C:\Program Files\GitHub CLI\gh.exe'
# kutuphanenin _araclar/ aynasina giden betikler (kutuphane isini yapanlar)
KUTUPHANE_BETIKLERI = ['kanal_isle.py', 'rakip_indir.py', 'kare_analiz.py', 'edit_dili.py', 'edit_dili_test.py', 'font_aday.py',
                       'temizle.py', 'cerez_al.py', 'kutuphane_ara.py', 'profil_kontrol.py', 'stil_dna.py', 'preset_ogren.py',
                       'yazi_senkron.py', 'yazi_kontrol.py', 'youtube_dili.py', 'kurgu_denetim.py']


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
    n += ayna_cc0(k, a.deneme)
    print(f'{n} dosya guncellendi (lisansli varliklar aynaya girmez).')


def ayna_cc0(k, deneme):
    """SFX kutuphanesinin (repertuar/sfx-kutuphane.json) kullandigi CC0 sesler + paket lisanslari -> remotion/varlik/sfx-cc0/.
    YALNIZ sfx-cc0/: lisansli Adobe paketi (varlik/sfx) asla kopyalanmaz."""
    import json
    kj = os.path.join(KOK, 'repertuar', 'sfx-kutuphane.json')
    if not os.path.isfile(kj):
        return 0
    j = json.load(open(kj, encoding='utf-8'))
    yollar = set()
    for d, s in j.get('sesler', {}).items():
        yollar.update([d] + list(s.get('seri') or []))
    yollar = {d for d in yollar if d.startswith('sfx-cc0/')}
    for p in glob.glob(os.path.join(KOK, 'varlik', 'sfx-cc0', '*', 'LICENSE*')) + glob.glob(os.path.join(KOK, 'varlik', 'sfx-cc0', '*', 'kaynak.json')):
        yollar.add(os.path.relpath(p, os.path.join(KOK, 'varlik')).replace(os.sep, '/'))
    n = 0
    for d in sorted(yollar):
        assert d.startswith('sfx-cc0/'), d
        kaynak = os.path.join(KOK, 'varlik', d)
        if os.path.isfile(kaynak):
            n += kopyala(kaynak, os.path.join(k, 'remotion', 'varlik', d), deneme)
    return n


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


SARMALAYICI = """import React from 'react';
import presetler from '../public/varlik/preset-dili-remotion.json';
import { VideoDna as OrtakVideoDna } from './repertuar/VideoDna';

// Kurgu sablonu ortak repertuarda (repertuar/VideoDna.tsx: Dna* + SFX + vurus + bitis). Kanal yalniz presetlerini verir.
// Kayit (Root.tsx): <Composition id="VideoDna" component={VideoDna as any} durationInFrames={300} fps={30} width={1920} height={1080}
//   defaultProps={{ dna: {} as any, veri: { klasor: '', fps: 30, toplam: 30, cekimler: [], kelimeler: [] } }}
//   calculateMetadata={({ props }: any) => ({ durationInFrames: Math.max(30, props.veri.toplam) })} />
export type { Kart, Cekim, SahneVeri } from './repertuar/VideoDna';
export const VideoDna: React.FC<any> = (p) => <OrtakVideoDna presetler={presetler as any} {...p} />;
"""


def baglanti(hedef, kaynak, deneme=False):
    """Windows junction (yoksa). Var olan gercek klasore dokunmaz."""
    if os.path.lexists(hedef):
        return 'var'
    if deneme:
        return 'olusturulacak'
    os.makedirs(os.path.dirname(hedef), exist_ok=True)
    r = subprocess.run(['cmd', '/c', 'mklink', '/J', hedef, kaynak], capture_output=True, text=True)
    return 'olusturuldu' if r.returncode == 0 else 'HATA ' + (r.stderr or r.stdout).strip()


def kanal(a):
    kk = os.path.abspath(a.klasor)
    m = os.path.join(kk, 'motion')
    if not os.path.isdir(m):
        sys.exit(f'HATA: {m} yok (Remotion projesi motion/ altinda olmali)')
    for hedef, kaynak in [(os.path.join(m, 'src', 'repertuar'), os.path.join(KOK, 'repertuar')),
                          (os.path.join(m, 'public', 'varlik'), os.path.join(KOK, 'varlik')),
                          (os.path.join(m, 'public', 'fontlar'), os.path.join(KOK, 'fontlar'))]:
        print(f'{os.path.relpath(hedef, kk):24}', baglanti(hedef, kaynak, a.deneme))
    vd = os.path.join(m, 'src', 'VideoDna.tsx')
    if os.path.exists(vd):
        print('src/VideoDna.tsx        ', 'var' if 'repertuar/VideoDna' in open(vd, encoding='utf-8').read() else 'VAR AMA ESKI (ortak sablona baglanmali)')
    elif not a.deneme:
        open(vd, 'w', encoding='utf-8').write(SARMALAYICI)
        print('src/VideoDna.tsx         olusturuldu')
    root = os.path.join(m, 'src', 'Root.tsx')
    kayitli = os.path.exists(root) and 'id="VideoDna"' in open(root, encoding='utf-8').read()
    if not kayitli and os.path.exists(root) and not a.deneme:
        b0 = open(root, 'rb').read()
        crlf = b'\r\n' in b0
        s = b0.decode('utf-8').replace('\r\n', '\n')
        son = s.rfind('</>')
        ithal = [m for m in range(len(s)) if s.startswith('import ', m) and (m == 0 or s[m - 1] == '\n')]
        if son > 0 and ithal:
            sat = s.index('\n', ithal[-1]) + 1
            kayit = ('    <Composition id="VideoDna" component={VideoDna as any} durationInFrames={300} fps={30} width={1920} height={1080}\n'
                     "      defaultProps={{ dna: {} as any, veri: { klasor: '', fps: 30, toplam: 30, cekimler: [], kelimeler: [] } }}\n"
                     '      calculateMetadata={({ props }: any) => ({ durationInFrames: Math.max(30, props.veri.toplam) })} />\n  ')
            s = s[:son] + kayit + s[son:]
            s = s[:sat] + "import { VideoDna } from './VideoDna';\n" + s[sat:]
            if crlf:
                s = s.replace('\n', '\r\n')
            open(root, 'wb').write(s.encode('utf-8'))
            kayitli = True
            print('Root.tsx VideoDna kaydi   eklendi')
    if not kayitli:
        print('Root.tsx VideoDna kaydi  ', 'YOK -> src/VideoDna.tsx basindaki kayit satirini Root.tsx dosyasina ekle')


def kancalar(a):
    hk = os.path.join(KOK, '.git', 'hooks')
    NL = chr(10)
    on = NL.join(['#!/bin/sh', '# sistem dogrulamasi: kirik ekleme commit edilmez (atlamak icin degil, duzeltmek icin)',
                  'py -I skill/youtube-video-uretim/scripts/dogrula.py --hizli || exit 1', ''])
    son = NL.join(['#!/bin/sh', 'py skill/youtube-video-uretim/scripts/kurulum.py ayna >/dev/null 2>&1 &', 'exit 0', ''])
    for ad, icerik in [('pre-commit', on), ('post-commit', son)]:
        open(os.path.join(hk, ad), 'w', encoding='utf-8', newline=NL).write(icerik)
        print(ad, 'yazildi')


def main():
    ap = argparse.ArgumentParser()
    alt = ap.add_subparsers(dest='k', required=True)
    alt.add_parser('kontrol')
    y = alt.add_parser('ayna'); y.add_argument('--deneme', action='store_true')
    p = alt.add_parser('paketle'); p.add_argument('--hedef')
    k = alt.add_parser('kanal'); k.add_argument('klasor'); k.add_argument('--deneme', action='store_true')
    alt.add_parser('kancalar')
    a = ap.parse_args()
    {'kontrol': kontrol, 'ayna': ayna, 'paketle': paketle, 'kanal': kanal, 'kancalar': kancalar}[a.k](a)


if __name__ == '__main__':
    main()
