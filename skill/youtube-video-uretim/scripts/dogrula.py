#!/usr/bin/env python3
"""SISTEM DOGRULAMA — her eklemeden sonra "her sey hala birlikte calisiyor mu?" sorusunu olcer. FAIL varsa cikis kodu 1.
Kullanim:
  py dogrula.py --hizli      # ~30 sn: etiket/tablo butunlugu, betik derleme, TS derleme (sablon + kanallar), secim motoru, belgeler, kanal baglantilari
  py dogrula.py --tam        # + uctan uca duman testi: sahne_kur -> kurgu_denetim -> 4 sn render (SFX, vurus, font) -> kusur_kontrol + ses tepe olcumu
Git pre-commit kancasi --hizli calistirir (kurulum.py kancalar): kirik ekleme commit edilmez.
Yeni bilesen/teknik eklerken bu dosyadaki KURALLAR'a uyulmazsa burada FAIL verir; kurali gevsetmek yerine eklemeyi tamamla.
"""
import argparse, glob, json, os, py_compile, re, shutil, subprocess, sys, tempfile, time
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BURASI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(BURASI, '..'))
KOK = os.path.abspath(os.path.join(SKILL, '..', '..'))
REP = os.path.join(KOK, 'repertuar')
SABLON = os.path.join(KOK, 'sablon-proje')
OTOMASYON = os.path.dirname(KOK)
CHROME = r'C:\otomasyon\ranks\motion\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe'
# *_TIPLERI -> etiketler.json ekseni
EKSEN = {'ARKAPLAN': 'arkaplan', 'GECIS': 'gecis', 'BASLIK': 'baslik', 'ALTYAZI': 'altyazi', 'ALTBANT': 'altbant', 'SAYI': 'sayi', 'ALINTI': 'alinti',
         'LISTE': 'liste', 'ZAMAN': 'zaman', 'KAMERA': 'kamera', 'CERCEVE': 'cerceve', 'DOKU': 'doku', 'BITIS': 'bitis', 'HARITA': 'harita',
         'GRAFIK': 'grafik', 'HUD': 'hud', 'SAHNE': 'sahne', 'VURUS': 'vurus'}
ETIKETSIZ_SERBEST = {('gecis', 'sert'), ('kamera', 'sabit'), ('cerceve', 'tam')}          # notr ogeler
SAHTE_ETIKET = {('gecis', 'filmburn'), ('altyazi', 'yok')}                                 # tipte olmayan ama secilebilen
TONLAR = {'ciddi', 'gizem', 'enerjik', 'sakin'}

sonuc = []   # (seviye, alan, mesaj)


def ekle(sev, alan, msg):
    sonuc.append((sev, alan, msg))


def oku(p):
    return open(p, encoding='utf-8').read()


# ------------------------------------------------------------------ 1. repertuar tipleri <-> etiketler
def tipler():
    out = {}
    for p in glob.glob(os.path.join(REP, '*.tsx')):
        for m in re.finditer(r'export const ([A-Z]+)_TIPLERI\s*=\s*\[(.*?)\]\s*as const', oku(p), re.S):
            if m.group(1) in EKSEN:
                out[EKSEN[m.group(1)]] = re.findall(r"'([^']+)'", m.group(2))
    return out


def stil_sozluk():
    s = oku(os.path.join(BURASI, 'stil_dna.py'))
    konu = set(re.findall(r"^\s*'([a-z]+)':\s*\[", s[s.index('KONU_KELIME = {'):s.index('}', s.index('KONU_KELIME = {'))], re.M))
    his = set(re.findall(r"'([a-z]+)'", re.search(r'HISLER = \[(.*?)\]', s).group(1)))
    return konu, his


def k_etiketler():
    T = tipler()
    if not T:
        ekle('FAIL', 'etiket', '*_TIPLERI okunamadi')
        return T
    E = json.load(open(os.path.join(REP, 'etiketler.json'), encoding='utf-8'))
    konu, his = stil_sozluk()
    eksik, yetim, bozuk = [], [], []
    for eksen, liste in T.items():
        et = E.get(eksen) or {}
        for x in liste:
            if x not in et and (eksen, x) not in ETIKETSIZ_SERBEST:
                eksik.append(f'{eksen}:{x}')
        for x, v in et.items():
            if x.startswith('_'):
                continue
            if x not in liste and (eksen, x) not in SAHTE_ETIKET:
                yetim.append(f'{eksen}:{x}')
            if not isinstance(v, dict):
                continue
            if 'klasik' in (v.get('his') or []):      # bilerek secilmeyen klasik Claude gorunumu (stil_dna KLASIK)
                continue
            if not set(v.get('ton') or []) <= TONLAR or not v.get('ton'):
                bozuk.append(f'{eksen}:{x} ton={v.get("ton")}')
            if not set(v.get('konu') or []) <= konu:
                bozuk.append(f'{eksen}:{x} bilinmeyen konu {sorted(set(v.get("konu") or []) - konu)}')
            if not set(v.get('his') or []) <= set(his):
                bozuk.append(f'{eksen}:{x} bilinmeyen his {sorted(set(v.get("his") or []) - set(his))}')
            if not isinstance(v.get('enerji'), (int, float)) or not 1 <= v['enerji'] <= 5:
                bozuk.append(f'{eksen}:{x} enerji={v.get("enerji")}')
    for e in E:
        if e in EKSEN.values() and e not in T:
            ekle('UYARI', 'etiket', f'etiketler.json ekseni {e} icin *_TIPLERI bulunamadi')
    # her gecis tipinin stil_dna GECIS_AILE'de ailesi olmali (rakip farki + YouTube kaniti aileden hesaplanir)
    sdk = oku(os.path.join(BURASI, 'stil_dna.py'))
    ga = sdk[sdk.index('GECIS_AILE = {'):sdk.index('}', sdk.index('GECIS_AILE = {'))]
    ailesiz = [g for g in T.get('gecis', []) if g != 'sert' and f"'{g}':" not in ga]
    if ailesiz:
        ekle('FAIL', 'etiket', f'stil_dna.py GECIS_AILE tablosunda ailesi olmayan gecis: {ailesiz}')
    ekle('FAIL' if eksik else 'OK', 'etiket', f'etiketsiz oge: {", ".join(eksik)}' if eksik else f'{sum(map(len, T.values()))} oge etiketli')
    if yetim:
        ekle('UYARI', 'etiket', f'tipte olmayan etiket (silinmis/yeniden adlandirilmis?): {", ".join(yetim)}')
    if bozuk:
        ekle('FAIL', 'etiket', 'gecersiz etiket degeri: ' + '; '.join(bozuk[:12]))
    return T


# ------------------------------------------------------------------ 2. SFX + font tablolari
def k_sfx():
    """iki bicimi tanir: yeni repertuar/sfx-kutuphane.json (sesler + olcu; Adobe sfx/ + CC0 sfx-cc0/) ya da eski Sfx.tsx SFX_PALET/SFX_OLCU"""
    kj = os.path.join(REP, 'sfx-kutuphane.json')
    varlik = os.path.join(KOK, 'varlik')
    if os.path.isfile(kj):
        try:
            j = json.load(open(kj, encoding='utf-8'))
        except ValueError as e:
            ekle('FAIL', 'sfx', f'sfx-kutuphane.json bozuk: {e}')
            return
        sesler = set()
        for d, k in (j.get('sesler') or {}).items():
            sesler.add(d)
            sesler.update(k.get('seri') or [])
        olcu = set(j.get('olcu') or {})
        if not os.path.isdir(os.path.join(varlik, 'sfx')):
            ekle('UYARI', 'sfx', 'varlik/sfx yok (bu makinede SFX paketi kurulmamis: varlik_kur.py) — render sessiz kalir')
            return
        yok = sorted(d for d in sesler if not os.path.exists(os.path.join(varlik, d)))
        olcusuz = sorted(sesler - olcu)[:8]
        if yok:
            ekle('FAIL', 'sfx', f'kutuphanede olup diskte olmayan ses: {yok[:8]}' + (' (turev: sfx_olc.py --turev)' if any('/turev/' in d for d in yok) else ''))
        ekle('FAIL' if olcusuz else 'OK', 'sfx', f'olcusu olmayan ses (sfx_olc.py calistir): {olcusuz}' if olcusuz else f'{len(sesler)} kutuphane sesi olculu')
        # ton kurali: ciddi/gizem paletine pop ya da mizah giremez (Sfx.tsx sfxAdaylari da eler; etiket hatasini burada yakala)
        kotu = sorted(d for d, k in j['sesler'].items() if (k.get('mizah') or 'pop' in k.get('kar', [])) and {'ciddi', 'gizem'} & set(k.get('ton', [])))
        if kotu:
            ekle('UYARI', 'sfx', f'ciddi/gizem etiketli pop/mizah ses (secilmez, etiketi duzelt): {kotu[:6]}')
        # her havuz x ton: en az 3 aday (glitch yalniz enerjik)
        ayar = j.get('ayar') or {}
        az = []
        for h in (ayar.get('seviye') or {}):
            for t in ('ciddi', 'gizem', 'enerjik', 'sakin'):
                if h == 'glitch' and t != 'enerjik':
                    continue
                n = sum(1 for k in j['sesler'].values() if h in k['rol'] and t in k['ton'] and not k.get('mizah')
                        and not (t in ('ciddi', 'gizem') and 'pop' in k.get('kar', [])))
                if n < 3:
                    az.append(f'{h}/{t}:{n}')
        ekle('UYARI' if az else 'OK', 'sfx', f'3 adaydan az havuz: {az}' if az else 'her havuz x ton >= 3 aday')
        return
    s = oku(os.path.join(REP, 'Sfx.tsx'))
    if 'SFX_PALET' not in s:
        ekle('FAIL', 'sfx', 'ne sfx-kutuphane.json ne Sfx.tsx SFX_PALET var')
        return
    palet = set(re.findall(r"\['([^']+\.(?:wav|mp3))'", s[s.index('SFX_PALET'):]))
    olcu = set(re.findall(r"'([^']+\.(?:wav|mp3))': \[", s[s.index('SFX_OLCU'):s.index('SFX_PALET')])) if 'SFX_OLCU' in s else set()
    kok = os.path.join(varlik, 'sfx')
    yok = sorted(f for f in palet if not os.path.exists(os.path.join(kok, f)))
    olcusuz = sorted(palet - olcu)
    if not os.path.isdir(kok):
        ekle('UYARI', 'sfx', 'varlik/sfx yok (bu makinede SFX paketi kurulmamis: varlik_kur.py) — render sessiz kalir')
    elif yok:
        ekle('FAIL', 'sfx', f'palette olup klasorde olmayan ses: {yok}')
    ekle('FAIL' if olcusuz else 'OK', 'sfx', f'tepe olcumu olmayan ses (SFX_OLCU): {olcusuz}' if olcusuz else f'{len(palet)} palet sesi olculu')


def k_font():
    t = oku(os.path.join(REP, 'temel.ts'))
    blok = t[t.index('export const FONTLAR'):t.index('};', t.index('export const FONTLAR'))]
    setler = re.findall(r"'([a-z-]+)':\s+\{\s*ad: '[a-z-]+',\s+baslik: '(\w+)',\s+govde: '(\w+)',\s+mono: '(\w+)',\s+baslikAgirlik: (\d+)[^}]*govdeAgirlik: (\d+),\s+monoAgirlik: (\d+)", blok)
    n_set = len(re.findall(r"^\s+'[a-z-]+':\s+\{ ad:", blok, re.M))
    if len(setler) != n_set:
        ekle('FAIL', 'font', f'{n_set} font setinden {len(setler)} tanesi tam (govdeAgirlik/monoAgirlik eksik)')
    ag = dict(re.findall(r"'?([\w-]+)'?: '([\d ]+)'", t[t.index('FONT_AGIRLIK'):t.index('};', t.index('FONT_AGIRLIK'))]))
    dosya = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(KOK, 'fontlar'))}
    hata = []
    for ad, b, g, m, bw, gw, mw in setler:
        for f, w, rol in ((b, int(bw), 'baslik'), (g, int(gw), 'govde'), (m, int(mw), 'mono')):
            if f not in dosya:
                hata.append(f'{ad}: {f}.ttf yok')
                continue
            if f not in ag:
                hata.append(f'{ad}: {f} FONT_AGIRLIK tablosunda yok (yuklenince ince cizilir)')
                continue
            r = [int(x) for x in ag[f].split()]
            if len(r) == 2 and not r[0] <= w <= r[1]:
                hata.append(f'{ad}/{rol}: {f} {w} istenmis, dosya araligi {r[0]}-{r[1]}')
            if rol != 'baslik' and w < 600:
                hata.append(f'{ad}/{rol}: kalinlik {w} < 600 (video ustunde ince)')
    eksik_tablo = sorted(dosya - set(ag))
    if eksik_tablo:
        hata.append(f'FONT_AGIRLIK tablosunda olmayan font dosyasi: {eksik_tablo}')
    ekle('FAIL' if hata else 'OK', 'font', '; '.join(hata) if hata else f'{len(setler)} font seti, {len(ag)} font kalinlik tablolu')


# ------------------------------------------------------------------ 3. betikler + TS derleme
def k_betik():
    bozuk = []
    for p in glob.glob(os.path.join(BURASI, '*.py')):
        try:
            py_compile.compile(p, doraise=True, cfile=os.path.join(tempfile.gettempdir(), 'dogrula.pyc'))
        except py_compile.PyCompileError as e:
            bozuk.append(f'{os.path.basename(p)}: {str(e).splitlines()[-1][:120]}')
    ekle('FAIL' if bozuk else 'OK', 'betik', '; '.join(bozuk) if bozuk else f'{len(glob.glob(os.path.join(BURASI, "*.py")))} betik derleniyor')


def esbuild():
    for k in (SABLON, r'C:\otomasyon\futbol-en\motion'):
        e = os.path.join(k, 'node_modules', '.bin', 'esbuild.cmd')
        if os.path.exists(e):
            return e
    return None


def kanal_projeleri():
    out = []
    for k in sorted(os.listdir(OTOMASYON)):
        m = os.path.join(OTOMASYON, k, 'motion')
        if os.path.isfile(os.path.join(m, 'src', 'Root.tsx')) and os.path.isdir(os.path.join(m, 'node_modules')):
            out.append((k, m))
    return out


def k_ts(projeler):
    eb = esbuild()
    if not eb:
        ekle('UYARI', 'ts', 'esbuild bulunamadi (sablon-proje npm install) — TS derleme kontrolu atlandi')
        return
    for ad, m in projeler:
        giris = os.path.join(m, 'src', 'index.ts')
        if not os.path.exists(giris):
            continue
        r = subprocess.run([eb, giris, '--bundle', '--outfile=' + os.path.join(tempfile.gettempdir(), f'dogrula-{ad}.js'), '--platform=browser', '--log-level=error',
                            '--loader:.ttf=file', '--loader:.png=file', '--loader:.jpg=file', '--loader:.mp4=file', '--jsx=automatic', '--packages=external', '--define:process.env.NODE_ENV="production"'],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=m, shell=False)
        if r.returncode:
            satir = [x for x in r.stderr.splitlines() if 'ERROR' in x or 'error' in x][:4]
            ekle('FAIL', 'ts', f'{ad}: derlenmiyor -> ' + ' | '.join(satir or [r.stderr[-300:]]))
        else:
            ekle('OK', 'ts', f'{ad}: derleniyor')


# ------------------------------------------------------------------ 4. secim motoru
def k_motor(T):
    konular = [('askeri', 'D-Day landing failures at Omaha beach soldiers'), ('futbol', 'Why Man City cannot win without Pep Guardiola football'),
               ('teknoloji', 'The magnet-free electric motor that changes EV engineering'), ('gizem', 'A submarine vanished in 1945 and was found 46 years later'),
               ('sakin', 'Retirement and personal finance explained in a calm, relaxing way')]
    # rakipsiz (yalniz konsept): motor nis iskeletini kutuphaneden bulmali ve tonu konudan dogru cikarmali
    BEKLENEN_TON = {'askeri': {'ciddi'}, 'futbol': {'enerjik'}, 'teknoloji': {'enerjik', 'ciddi'}, 'gizem': {'gizem', 'ciddi'}, 'sakin': {'sakin'}}
    paletler = []
    for ad, konu in konular:
        d = tempfile.mkdtemp(prefix='dogrula-dna-')
        try:
            cmd = [sys.executable, '-I', os.path.join(BURASI, 'stil_dna.py'), '--konu', konu, '--cikti', d, '--tohum', 'dogrula-' + ad, '--secenek', '1']
            r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
            if r.returncode:
                ekle('FAIL', 'motor', f'stil_dna ({ad}) hata: {r.stderr.strip()[-300:]}')
                continue
            dna = json.load(open(os.path.join(d, 'stil-dna.json'), encoding='utf-8'))
            md = oku(os.path.join(d, 'STIL-DNA.md'))
            hata = []
            for eksen, deger in dna.items():
                if eksen not in T:
                    continue
                for v in (deger if isinstance(deger, list) else [deger]):
                    if v is None or (isinstance(v, str) and (':' in v or v == 'yok')):
                        continue
                    if v not in T[eksen] and (eksen, v) not in SAHTE_ETIKET:
                        hata.append(f'{eksen}={v}')
            if dna.get('baslik2') and dna['baslik2'] not in T.get('baslik', []):
                hata.append(f'baslik2={dna["baslik2"]}')
            uymayan = [int(x) for x in re.findall(r'tona uymayan oge: (\d+)', md)]
            if uymayan and max(uymayan) > 0:
                hata.append(f'tona uymayan oge {max(uymayan)}')
            if not dna.get('ton'):
                hata.append('ton yok')
            elif dna['ton'] not in BEKLENEN_TON[ad]:
                hata.append(f"ton {dna['ton']} (beklenen {'/'.join(sorted(BEKLENEN_TON[ad]))})")
            paletler.append(dna.get('palet'))
            ekle('FAIL' if hata else 'OK', 'motor', f'{ad}: ' + (', '.join(hata) if hata else f"ton {dna.get('ton')}, palet {dna.get('palet')}, bitis {dna.get('bitis')}, baslik {dna.get('baslik')}/{dna.get('baslik2')}"))
        except Exception as e:
            ekle('FAIL', 'motor', f'{ad}: {e}')
        finally:
            shutil.rmtree(d, ignore_errors=True)
    if len(paletler) >= 3 and len(set(paletler)) == 1:
        ekle('UYARI', 'motor', f'4 farkli konu ayni paleti aldi ({paletler[0]}): secim konuya yeterince bakmiyor')


def kutuphane():
    for k in (r"G:\Drive'ım\edit kutuphane", r'G:\My Drive\edit kutuphane'):
        if os.path.isdir(k):
            return k
    return None


# ------------------------------------------------------------------ 5. belgeler + kanallar
def k_belge():
    metin = oku(os.path.join(SKILL, 'SKILL.md')) + ''.join(oku(p) for p in glob.glob(os.path.join(SKILL, 'references', '*.md')))
    betik = set(re.findall(r'(?:scripts/|py )([a-z_]+\.py)\b', metin))
    var = {os.path.basename(p) for p in glob.glob(os.path.join(BURASI, '*.py'))}
    disari = {'kontrol.py', 'zamanla.py', 'remotion_sahne.py', 'comfy.py'}   # sunucu/eski hat adlari
    yok = sorted(b for b in betik - var - disari if not b.startswith('test_'))
    ref = set(re.findall(r'references/([a-z0-9-]+\.md)', metin))
    ryok = sorted(r for r in ref if not os.path.exists(os.path.join(SKILL, 'references', r)))
    if yok:
        ekle('UYARI', 'belge', f'belgede adi gecen ama olmayan betik: {yok}')
    ekle('FAIL' if ryok else 'OK', 'belge', f'olmayan referans dosyasi: {ryok}' if ryok else 'referans dosyalari tam')


def k_kanallar(projeler):
    for ad, m in projeler:
        if os.path.abspath(m) == os.path.abspath(SABLON):
            continue
        sorun = []
        if not os.path.exists(os.path.join(m, 'src', 'repertuar', 'VideoDna.tsx')):
            sorun.append('repertuar bagli degil')
        vd = os.path.join(m, 'src', 'VideoDna.tsx')
        if not os.path.exists(vd) or 'repertuar/VideoDna' not in oku(vd):
            sorun.append('ortak VideoDna yok')
        pf = os.path.join(m, 'public', 'fontlar')
        if os.path.isdir(pf):
            eksik_f = sorted({f for f in os.listdir(os.path.join(KOK, 'fontlar')) if f.endswith('.ttf')} - set(os.listdir(pf)))
            if eksik_f:
                sorun.append(f'public/fontlar kopya ve eksik: {eksik_f[:4]} (kurulum.py kanal ile repoya baglanmali)')
        sfx = os.path.join(m, 'public', 'varlik', 'sfx')
        if not os.path.isdir(sfx):
            sorun.append('public/varlik/sfx yok')
        if os.path.isdir(os.path.join(KOK, 'varlik', 'sfx-cc0', 'turev')) and not os.path.isdir(os.path.join(m, 'public', 'varlik', 'sfx-cc0', 'turev')):
            sorun.append('public/varlik/sfx-cc0 eksik (py varlik_kur.py kanal <motion>)')
        if not os.path.isdir(os.path.join(m, 'public', 'fontlar')):
            sorun.append('public/fontlar yok')
        kanal = os.path.dirname(m)
        ekle('UYARI' if sorun else 'OK', 'kanal', f'{ad}: ' + (', '.join(sorun) + f' -> py kurulum.py kanal {kanal}' if sorun else 'bagli (repertuar, VideoDna, sfx, fontlar)'))


# ------------------------------------------------------------------ 6. uctan uca duman testi
def k_duman():
    d = tempfile.mkdtemp(prefix='dogrula-duman-')
    try:
        # kelimeler: 4 sn'lik sahte anlati; kurgu: foto + sayi karti + alt bant + vurgu
        soz = 'In nineteen forty five a submarine vanished and forty six crew were never seen again until divers found it'.split()
        kel = [{'k': w, 'bas': round(0.25 + i * 0.19, 2), 'son': round(0.25 + i * 0.19 + 0.16, 2)} for i, w in enumerate(soz)]
        dna = json.load(open(os.path.join(SABLON, 'src', 'ornek-dna.json'), encoding='utf-8'))
        dna.update({'ton': 'enerjik', 'bitis': dna.get('bitis') or 'sinema-film'})
        json.dump(dna, open(os.path.join(d, 'dna.json'), 'w', encoding='utf-8'))
        json.dump(kel, open(os.path.join(d, 'kelimeler.json'), 'w', encoding='utf-8'))
        kurgu = {'klasor': 'ornek', 'fps': 30, 'dna': 'dna.json', 'kelimeler': 'kelimeler.json', 'ses_sure': 4.2, 'bolumler': [
            {'tag': 'a', 'src': 'ornek/a.jpg', 'etiket': 'NORTH ATLANTIC · 1945'},
            {'capa': 'forty six crew', 'tag': 'b', 'src': 'ornek/b.jpg', 'kart': {'tur': 'sayi', 'a': '46', 'b': 'crew never seen again'}},
            {'capa': 'until divers', 'tag': 'c', 'src': 'ornek/c.jpg', 'flas': True}]}
        json.dump(kurgu, open(os.path.join(d, 'kurgu.json'), 'w', encoding='utf-8'))
        props = os.path.join(d, 'props.json')
        r = subprocess.run([sys.executable, '-I', os.path.join(BURASI, 'sahne_kur.py'), os.path.join(d, 'kurgu.json'), '--cikti', props],
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        if not os.path.exists(props):
            ekle('FAIL', 'duman', f'sahne_kur props uretmedi: {(r.stdout + r.stderr)[-400:]}')
            return
        ekle('OK', 'duman', 'sahne_kur + kurgu_denetim calisti (' + (r.stdout.strip().splitlines() or [''])[0][:90] + ')')
        if not os.path.exists(CHROME):
            ekle('UYARI', 'duman', 'chrome-headless-shell yok, render atlandi')
            return
        mp4 = os.path.join(d, 'duman.mp4')
        t0 = time.time()
        r = subprocess.run(['node', os.path.join('node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', 'src/index.ts', 'VideoDna', mp4, '--props=' + props,
                            '--browser-executable=' + CHROME, '--log=error'], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=SABLON, timeout=600)
        if r.returncode or not os.path.exists(mp4):
            ekle('FAIL', 'duman', 'render hatasi: ' + ' | '.join([x for x in r.stderr.splitlines() if x.strip() and not x.strip().startswith('at ')][:4]))
            return
        ekle('OK', 'duman', f'4 sn render {time.time() - t0:.0f} sn')
        # ses: SFX gercekten caliyor mu (anlati yok, duyulan her sey SFX)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], capture_output=True)
        import numpy as np
        x = np.abs(np.frombuffer(r.stdout, np.float32))
        tepe = 0
        if len(x):
            z = np.convolve(x, np.ones(80) / 80, 'same')
            i, esik = 0, 10 ** (-32 / 20)
            while i < len(z):
                if z[i] > esik:
                    tepe += 1
                    i += 4000
                else:
                    i += 1
        ekle('OK' if tepe >= 2 else 'FAIL', 'duman', f'SFX: {tepe} ses olayi duyuluyor' + ('' if tepe >= 2 else ' — SFX katmani calismiyor (DnaSfx / public/varlik/sfx)'))
        r = subprocess.run([sys.executable, '-I', os.path.join(BURASI, 'kusur_kontrol.py'), mp4, '--cikti', os.path.join(d, 'KUSUR.md')], capture_output=True, text=True, encoding='utf-8', errors='replace')
        ekle('OK' if r.returncode == 0 else 'FAIL', 'duman', 'kusur_kontrol: ' + r.stdout.strip()[:120])
    finally:
        shutil.rmtree(d, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--hizli', action='store_true')
    ap.add_argument('--tam', action='store_true')
    ap.add_argument('--kanalsiz', action='store_true', help='kanal projelerini derleme')
    a = ap.parse_args()
    t0 = time.time()
    T = k_etiketler()
    k_sfx()
    k_font()
    k_betik()
    projeler = [('sablon-proje', SABLON)] + ([] if a.kanalsiz else kanal_projeleri())
    k_ts(projeler)
    k_motor(T)
    k_belge()
    k_kanallar(projeler)
    if a.tam:
        k_duman()
    f = [x for x in sonuc if x[0] == 'FAIL']
    u = [x for x in sonuc if x[0] == 'UYARI']
    for sev, alan, msg in sonuc:
        print(f'{sev:5} {alan:7} {msg}')
    print(f"\n{'FAIL' if f else 'PASS'} — {len(f)} FAIL, {len(u)} UYARI ({time.time() - t0:.0f} sn)")
    sys.exit(1 if f else 0)


if __name__ == '__main__':
    main()
