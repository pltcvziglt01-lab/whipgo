#!/usr/bin/env python3
"""ADIM KONTROL — uretim defteri + adim kapisi ("skill maddesi atlanamaz" garantisi).

Her video klasorunde `uretim-defteri.json` tutulur: faz basina kayit
  {"faz", "durum": "yapildi", "kanit": [dosya yollari], "kim": "ana"|"alt-model"|"betik",
   "zaman", "sekme"?, "yabanci_arayuz"?, "not"?}

KURAL (kullanici karari): tam video uretiminde HICBIR faz atlanamaz; defterde "atlandi" kaydi
gorulmesi basli basina FAIL'dir ve teslimi durdurur. Is turu kapsami atlama degildir: --is kapak
yalniz kapak fazlarini icerir ama kapsam icindeki her faz zorunludur ve kanitsiz gecilemez.
Tek esneklik: fazin kosulu nesnel olarak yoksa (ornek: videoda hic gercek dis kaynak goruntusu yok
-> kaynak lisans/atif) bunu BETIK dosyalardan kendisi tespit eder ve `kapsam_disi` sayar; insan ya
da model beyaniyla kapsam disi yapilamaz. Kaniti diskte olmayan "yapildi" kaydi gecersizdir.
Yerel AI triyaji (yerel_ai.py qc_triyaj) yalniz siralama onerir; hicbir fazi "yanlis alarm" diye
kapatamaz, defterdeki kapi sonuclari esastir.

Kullanim:
  py adim_kontrol.py <video klasoru> [--is tam|kapak|metin]          # denetim; FAIL varsa cikis 1
  py adim_kontrol.py <video klasoru> --ozet-json                     # makine okur ozet (yerel_ai.py icin)
  py adim_kontrol.py <klasor> --kaydet <faz> --kanit <dosya...> [--kim alt-model] [--sekme N] [--not "..."]
  py adim_kontrol.py --fazlar                                        # FAZLAR tablosunu yazdir

Faz listesinin tek kaynagi asagidaki FAZLAR tablosudur (SKILL.md Bolum 2 faz haritasi + Bolum 1
dokunulmaz kurallarin denetim karsiligi); SKILL.md'den elle kopyalanmaz. Kurallar:
references/uretim-defteri.md. Teslimden once PASS zorunlu (references/teslim.md, references/kalite-kapilari.md).
"""
import argparse, fnmatch, json, os, re, sys, time
from datetime import datetime

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

DEFTER_AD = 'uretim-defteri.json'
KIMLER = ('ana', 'alt-model', 'betik')
ISLER = ('tam', 'kapak', 'metin')
KAPAK_DOSYA = re.compile(r'kapak[-_]?\d+.*\.(png|jpe?g|webp)$', re.I)
RISK_GUN = 30                       # risk raporu tazeligi (ayni kanalin sonraki videosunda)
LISANS_TEMIZ = re.compile(r'\b(cc[ -]?by(-sa)?(\s*\d)?|cc0|public domain|pd|pdm)\b', re.I)

# ---------------------------------------------------------------- FAZLAR (tek kaynak)
# ad, baslik, isler (hangi is turunun kapsaminda), ayak_isi (olcum/toplu is: kim=ana ise UYARI,
# SKILL Bolum 7 model dagilimi), kaliplar (beklenen kanit dosyasi kaliplari; herhangi biri yeter;
# bos = kayit yeter, kanit dis dunyada), gruplar (HER grubu >=1 kanit karsilamali), kapsam (nesnel
# kapsam-disi tespiti yapan denetim adi; yalniz kosulu dosyadan olculebilen fazda), referans (eksikse ne okunacak).
# Tam videoda HER faz zorunludur; "atlandi" kaydi FAIL.
FAZLAR = [
    dict(ad='rakip-analizi',      baslik='Rakip analizi (Faz 1)',            isler=('tam',),               ayak_isi=True,
         kaliplar=('*rakip*', '*olcum*', '*spec-*', '*edit-dili*'),          referans='references/rakip-kare-analizi.md'),
    dict(ad='risk-denetimi',      baslik='Demonetizasyon risk denetimi',     isler=('tam',),               ayak_isi=True,
         kaliplar=('*risk*', '*devam*'),                                     referans='references/demonetizasyon-riski.md (kanal_risk.py)'),
    dict(ad='stil-dna',           baslik='Stil DNA (Faz 1a)',                isler=('tam',),               ayak_isi=False,
         kaliplar=('*stil-dna*',),                                           referans='references/repertuar.md'),
    dict(ad='baslik',             baslik='Konu + baslik (Faz 2)',            isler=('tam', 'metin'),       ayak_isi=False,
         kaliplar=(),                                                        referans='references/rakip-analizi-ve-baslik.md'),
    dict(ad='metin',              baslik='Arastirma + metin (Faz 3)',        isler=('tam', 'metin'),       ayak_isi=False,
         kaliplar=('*metin*', '*arastirma*', '*skript*'),                    referans='references/metin.md'),
    dict(ad='metin-temizligi',    baslik='Metin temizligi (kalip + makine izi)', isler=('tam', 'metin'),   ayak_isi=False,
         kaliplar=('*kalip*', '*metin*'),
         gruplar=(('*kalip*',), ('*metin*',)),                               referans='references/ozgunluk.md (kalip_kontrol.py + metin_kontrol.py)'),
    dict(ad='ses',                baslik='Ses / TTS (Faz 4)',                isler=('tam',),               ayak_isi=False,
         kaliplar=('*vo*', '*cumleler*', '*ses*'),                           referans='references/ses.md'),
    dict(ad='gorsel-kaynak',      baslik='Gorsel + kaynak avi (Faz 5/5a)',   isler=('tam',),               ayak_isi=True,
         kaliplar=('*foto*', '*kaynak*', '*img*', '*credits*'),              referans='references/kaynak-avi.md'),
    dict(ad='gorsel-kurallar',    baslik='Gorsel kurallari (yuz/cocuk/yazi-logo, SKILL Bolum 1)', isler=('tam',), ayak_isi=False,
         kaliplar=('*istemler*', '*onay*', '*metin*'),                       referans='SKILL.md Bolum 1 (metin_kontrol.py --istemler)'),
    dict(ad='kaynak-lisans',      baslik='Kaynak lisans/atif (yalniz CC BY/CC0/PD; rakip asla)', isler=('tam',), ayak_isi=False,
         kaliplar=('*kaynakca*', '*credits*', '*atif*'),
         kapsam='gercek_kaynak',                                             referans='references/youtube-kaynak.md + references/kaynak-avi.md'),
    dict(ad='kurgu',              baslik='Kurgu verisi (Faz 6)',             isler=('tam',),               ayak_isi=False,
         kaliplar=('*props*.json',),                                         referans='references/repertuar.md'),
    dict(ad='sahne-zengin',       baslik='Sahne turu zenginlestirme',        isler=('tam',),               ayak_isi=False,
         kaliplar=('*sahne-zengin*',),                                       referans='SKILL.md Bolum 6 (sahne_zengin.py)'),
    dict(ad='kurgu-denetimi',     baslik='Kurgu denetimi (render ONCESI)',   isler=('tam',),               ayak_isi=False,
         kaliplar=('*kurgu-denetim*', '*kurgu*.md'),                         referans='references/kalite-kapilari.md Bolum 0'),
    dict(ad='sfx',                baslik='SFX plani + ses miksi',            isler=('tam',),               ayak_isi=False,
         kaliplar=('*sfx*', '*ses_miks*', '*ses*.log', '*miks*'),            referans='references/sfx.md'),
    dict(ad='render',             baslik='Render (Faz 7)',                   isler=('tam',),               ayak_isi=False,
         kaliplar=('*.mp4',),                                                referans='references/kurgu-render-qc.md'),
    dict(ad='kalite-kapilari',    baslik='Kalite kapilari (render SONRASI)', isler=('tam',),               ayak_isi=False,
         kaliplar=('*kapi*', '*kalite*', '*kusur*', '*yazi*', '*karsilastirma*'), referans='references/kalite-kapilari.md'),
    dict(ad='ozgunluk',           baslik='Ozgunluk >= %20 (rakipten + son 3 videodan)', isler=('tam',),    ayak_isi=False,
         kaliplar=('*stil-dna*', '*varyasyon*'),
         gruplar=(('*stil-dna*',), ('*varyasyon*',)),                        referans='references/ozgunluk.md (varyasyon_kontrol.py)'),
    dict(ad='izleyici-incelemesi', baslik='Izleyici gibi izleme',            isler=('tam',),               ayak_isi=True,
         kaliplar=('*izle*', '*her20*', '*bolum-*'),                         referans='SKILL.md Bolum 8 (izleyici gibi izle)'),
    dict(ad='kapak',              baslik='Kapak: analiz + 6 sekme + 6 dosya (Faz 8)', isler=('tam', 'kapak'), ayak_isi=False,
         kaliplar=('*kapak*',),                                              referans='references/kapak-analizi-ve-uretim.md'),
    dict(ad='baslik-aciklama',    baslik='Baslik/aciklama dosyasi (Faz 8b)', isler=('tam',),               ayak_isi=False,
         kaliplar=('*aciklama*',),                                           referans='references/teslim.md'),
    dict(ad='teslim',             baslik='Drive teslimi (Faz 9)',            isler=('tam',),               ayak_isi=False,
         kaliplar=(),                                                        referans='references/teslim.md'),
    dict(ad='temizlik',           baslik='Disk temizligi (video_temizle)',   isler=('tam',),               ayak_isi=False,
         kaliplar=(),                                                        referans='references/teslim.md Bolum Temizlik'),
    dict(ad='devam-guncelle',     baslik='DEVAM.md guncelle',                isler=('tam', 'kapak', 'metin'), ayak_isi=False,
         kaliplar=(),                                                        referans='references/devam-sablonu.md'),
]
FAZ = {f['ad']: f for f in FAZLAR}


# ---------------------------------------------------------------- defter
def defter_oku(klasor):
    p = os.path.join(klasor, DEFTER_AD)
    if not os.path.isfile(p):
        return {'video': os.path.basename(os.path.abspath(klasor)), 'is': 'tam', 'kayitlar': []}
    try:
        d = json.load(open(p, encoding='utf-8'))
    except ValueError as e:
        sys.exit(f'FAIL  {DEFTER_AD} bozuk JSON: {e}')
    d.setdefault('kayitlar', [])
    d.setdefault('is', 'tam')
    return d


def defter_yaz(klasor, d):
    p = os.path.join(klasor, DEFTER_AD)
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return p


def yol_coz(klasor, yol):
    return os.path.normpath(yol if os.path.isabs(yol) else os.path.join(klasor, yol))


def n(yol):
    return yol.replace('\\', '/').lower()


def kalip_uyar(kaliplar, yollar):
    return any(fnmatch.fnmatch(n(y), kalip) or fnmatch.fnmatch(os.path.basename(n(y)), kalip)
               for y in yollar for kalip in kaliplar)


def oku(p):
    try:
        return open(p, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''


# ---------------------------------------------------------------- klasor taramasi
def tarama_kokleri(klasor):
    kokler = [klasor]
    ust2 = os.path.normpath(os.path.join(klasor, '..', '..'))        # motion/src/vNN -> motion
    for aday in (os.path.join(ust2, 'out'), os.path.join(ust2, 'public', os.path.basename(os.path.abspath(klasor)))):
        if os.path.isdir(aday):
            kokler.append(aday)
    return kokler


def dosya_tara(klasor, derinlik=3, tavan=4000):
    dosyalar = []
    for kok in tarama_kokleri(klasor):
        kok = os.path.abspath(kok)
        for dizin, altlar, adlar in os.walk(kok):
            if os.path.relpath(dizin, kok).count(os.sep) >= derinlik:
                altlar[:] = []
            altlar[:] = [a for a in altlar if a not in ('node_modules', '.git', '__pycache__')]
            for ad in adlar:
                dosyalar.append(os.path.join(dizin, ad))
                if len(dosyalar) >= tavan:
                    return dosyalar
    return dosyalar


# ---------------------------------------------------------------- nesnel kapsam-disi tespitleri
MEDYA = ('.mp4', '.mov', '.webm', '.mkv', '.jpg', '.jpeg', '.png', '.webp')


def kapsam_gercek_kaynak(klasor, tum_dosyalar):
    """kaynak-lisans fazi: videoda hic gercek dis kaynak goruntusu yoksa (public/vNN/kaynak bos,
    credits/KAYNAKCA yok) faz nesnel olarak kapsam disidir. Beyanla degil, dosyadan olculur."""
    for y in tum_dosyalar:
        ny = n(y)
        if '/kaynak/' in ny and ny.endswith(MEDYA):
            return None
        if 'credits' in os.path.basename(ny) or 'kaynakca' in os.path.basename(ny):
            return None
    return 'diskte gercek dis kaynak goruntusu yok (public/*/kaynak bos, credits/KAYNAKCA yok)'


KAPSAM = {'gercek_kaynak': kapsam_gercek_kaynak}


# ---------------------------------------------------------------- faz ozel denetimleri (sayilabilir kurallar)
def d_kapak(klasor, kayit, var):
    """6 AYRI SEKME kuralinin kaniti: KAPAK-ANALIZ.md + >= 6 kapak dosyasi + defterde sekme kaydi."""
    eksik = []
    if not any('kapak-analiz' in n(y) for y in var):
        eksik.append('KAPAK-ANALIZ.md kanitlarda yok')
    kapaklar = {os.path.basename(y) for y in var if KAPAK_DOSYA.search(os.path.basename(y))}
    for kok in (klasor, os.path.join(klasor, 'kapaklar')):
        if os.path.isdir(kok):
            kapaklar.update(a for a in os.listdir(kok) if KAPAK_DOSYA.search(a))
    if len(kapaklar) < 6:
        eksik.append(f'kapak dosyasi {len(kapaklar)}/6 (kapak-1..6)')
    sekme = kayit.get('sekme')
    if not (isinstance(sekme, int) and sekme >= 6):
        eksik.append('defterde sekme kaydi yok/eksik ("sekme": 6 — ChatGPT 6 AYRI SEKMEDE uretildi kaniti)')
    return eksik, []


def d_risk(klasor, kayit, var):
    """RISK-RAPORU.md ya da DEVAM'daki tarihli risk bolumu; ayni kanalin sonraki videosunda rapor <= 30 gun."""
    raporlar = [y for y in var if 'risk' in n(os.path.basename(y)) or 'devam' in n(os.path.basename(y))]
    if not raporlar:
        return ['risk kaniti yok (RISK-RAPORU.md ya da DEVAM tarihli risk bolumu)'], []
    yas = min((time.time() - os.path.getmtime(y)) / 86400 for y in raporlar)
    if yas > RISK_GUN:
        return [f'risk raporu {yas:.0f} gun eski (> {RISK_GUN} gun): kanal_risk.py yeniden calistirilmali'], []
    return [], []


def d_ozgunluk(klasor, kayit, var):
    """STIL-DNA.md'de TAMAM satiri + varyasyon_kontrol ciktisi."""
    eksik = []
    dna = [y for y in var if 'stil-dna' in n(os.path.basename(y)) and y.lower().endswith('.md')]
    if not dna:
        eksik.append('STIL-DNA.md kanitlarda yok')
    elif not any(re.search(r'\bTAMAM\b', oku(y)) for y in dna):
        eksik.append('STIL-DNA.md kontrol satirinda TAMAM yok (rakipten ve son 3 videodan >= %20 saglanmamis)')
    return eksik, []


def d_kaynak_lisans(klasor, kayit, var):
    """credits.json / KAYNAKCA icinde yalniz CC BY / CC BY-SA / CC0 / PD; yabanci arayuz taramasi (kaynak_yazi)."""
    eksik, uyari = [], []
    kirli, izinli = [], []
    for y in var:
        ad = os.path.basename(y).lower()
        if ad.endswith('.json') and 'credits' in ad:
            try:
                j = json.load(open(y, encoding='utf-8'))
            except ValueError:
                eksik.append(f'{os.path.basename(y)} bozuk JSON')
                continue
            kayitlar = j if isinstance(j, list) else (j.get('kaynaklar') or j.get('items') or list(j.values()))
            for k in kayitlar:
                lis = (k.get('lisans') or k.get('license') or '') if isinstance(k, dict) else str(k)
                if lis and 'izni' in str(lis).lower():   # SKILL §1: standart lisans yalniz kullanicinin acik izniyle (youtube_kaynak --izinli)
                    izinli.append(str(k.get('dosya') or lis)[:40])
                elif lis and not LISANS_TEMIZ.search(str(lis)):
                    kirli.append(str(lis)[:40])
        elif 'kaynakca' in ad:
            for satir in oku(y).splitlines()[:400]:
                if satir.strip() and not satir.lower().startswith(('kaynak', 'url', '#')) and 'cc' in satir.lower() \
                        and not LISANS_TEMIZ.search(satir):
                    kirli.append(satir.strip()[:40])
    if izinli:
        uyari.append(f'kullanici izinli standart lisans {len(izinli)} kayit ({izinli[:4]}) - izin DEVAM.md icinde yazili olmali, claim riski kullaniciya soylenmis olmali')
    if kirli:
        eksik.append(f'izinsiz lisans satiri: {kirli[:3]} (yalniz CC BY / CC BY-SA / CC0 / PD; rakip videosu asla)')
    ya = kayit.get('yabanci_arayuz')
    if ya is None:
        uyari.append('yabanci arayuz sayimi defterde yok ("yabanci_arayuz": 0 — kaynak_yazi taramasi; GOREVLER #0e)')
    elif ya > 0:
        eksik.append(f'kaynak listesinde yabanci arayuzlu klip {ya} (Subscribe/imlec/logo) — 0 olmali, klip reddedilir/kirpilir')
    return eksik, uyari


def d_gorsel_kurallar(klasor, kayit, var):
    """insan yuzu / cocuk yuzu / yazi-logo kurallari: metin_kontrol --istemler ciktisi ya da acik onay kaydi."""
    if any(('istemler' in n(os.path.basename(y))) or ('onay' in n(os.path.basename(y))) for y in var):
        return [], []
    if 'onay' in (kayit.get('not') or '').lower():
        return [], []
    return ['kanit yok: metin_kontrol.py --istemler ciktisi ya da defterde acik onay notu ("not": "... onay ...")'], []


OZEL = {'kapak': d_kapak, 'risk-denetimi': d_risk, 'ozgunluk': d_ozgunluk,
        'kaynak-lisans': d_kaynak_lisans, 'gorsel-kurallar': d_gorsel_kurallar}


# ---------------------------------------------------------------- denetim
def denetle(klasor, is_turu=None):
    d = defter_oku(klasor)
    is_turu = is_turu or d.get('is') or 'tam'
    if is_turu not in ISLER:
        sys.exit(f'FAIL  bilinmeyen is turu: {is_turu} (secenekler: {", ".join(ISLER)})')
    son = {}                                       # faz -> son kayit
    for k in d['kayitlar']:
        son[k.get('faz')] = k
    tum_dosyalar = None                            # tembel tarama
    satirlar, fail, uyari = [], [], []

    def tara():
        nonlocal tum_dosyalar
        if tum_dosyalar is None:
            tum_dosyalar = dosya_tara(klasor)
        return tum_dosyalar

    for f in FAZLAR:
        if is_turu not in f['isler']:
            continue
        ad, kayit = f['ad'], son.get(f['ad'])
        satir = dict(faz=ad, baslik=f['baslik'], durum='kayitsiz', kim='', kanit=[],
                     eksik=[], uyari=[], referans=f['referans'])
        if kayit is None:
            neden = KAPSAM[f['kapsam']](klasor, tara()) if f.get('kapsam') else None
            if neden:
                satir['durum'] = 'kapsam_disi'
                satir['uyari'].append(f'kapsam disi (nesnel tespit): {neden}')
            else:
                msg = f'{ad}: defterde kayit yok'
                if f['kaliplar']:
                    bulunan = [y for y in tara() if kalip_uyar(f['kaliplar'], [y])]
                    if bulunan:
                        msg += f' (diskte {len(bulunan)} uyan dosya var; --kaydet {ad} --kanit ... ile kaydet)'
                satir['eksik'].append(msg)
                fail.append((ad, msg + f' -> oku: {f["referans"]}'))
        elif kayit.get('durum') == 'atlandi':
            satir['durum'] = 'atlandi'
            satir['kim'] = kayit.get('kim', '')
            m = f'{ad}: "atlandi" kaydi — hicbir faz atlanamaz, teslim durur (gerekce kabul edilmez)'
            satir['eksik'].append(m)
            fail.append((ad, m + f' -> oku: {f["referans"]}'))
        elif kayit.get('durum') == 'yapildi':
            satir['durum'] = 'yapildi'
            satir['kim'] = kayit.get('kim', '')
            satir['kanit'] = kayit.get('kanit') or []
            yollar = [yol_coz(klasor, y) for y in satir['kanit']]
            yok = [y for y in yollar if not os.path.exists(y)]
            var = [y for y in yollar if os.path.exists(y)]
            if yok:
                m = f'{ad}: kanit diskte yok ({", ".join(os.path.basename(y) for y in yok[:4])}) — yapildi kaydi gecersiz'
                satir['eksik'].append(m)
                fail.append((ad, m + f' -> oku: {f["referans"]}'))
            if f['kaliplar'] and not kalip_uyar(f['kaliplar'], var):
                m = f'{ad}: kanitlar beklenen kaliba uymuyor (beklenen: {", ".join(f["kaliplar"][:3])})'
                satir['eksik'].append(m)
                fail.append((ad, m + f' -> oku: {f["referans"]}'))
            for grup in f.get('gruplar') or ():
                if not kalip_uyar(grup, var):
                    m = f'{ad}: {" / ".join(grup)} kanitlarda yok (her kanit grubu zorunlu)'
                    satir['eksik'].append(m)
                    fail.append((ad, m + f' -> oku: {f["referans"]}'))
            if ad in OZEL:
                o_eksik, o_uyari = OZEL[ad](klasor, kayit, var)
                for m in o_eksik:
                    satir['eksik'].append(f'{ad}: {m}')
                    fail.append((ad, f'{ad}: {m} -> oku: {f["referans"]}'))
                for m in o_uyari:
                    satir['uyari'].append(m)
                    uyari.append(f'{ad}: {m}')
            if f['ayak_isi'] and kayit.get('kim') == 'ana':
                m = 'olcum/toplu is ana modelde yapilmis; alt modele verilmeliydi (SKILL Bolum 7 model dagilimi)'
                satir['uyari'].append(m)
                uyari.append(f'{ad}: {m}')
            if kayit.get('kim') not in KIMLER:
                m = f'kim={kayit.get("kim")!r} taninmiyor ({"/".join(KIMLER)})'
                satir['uyari'].append(m)
                uyari.append(f'{ad}: {m}')
        else:
            satir['durum'] = str(kayit.get('durum'))
            m = f'{ad}: durum={kayit.get("durum")!r} taninmiyor (tek gecerli durum: yapildi)'
            satir['eksik'].append(m)
            fail.append((ad, m))
        satirlar.append(satir)

    for ad in son:
        if ad not in FAZ:
            uyari.append(f'defterde bilinmeyen faz: {ad} (FAZLAR tablosunda yok)')
    return d, is_turu, satirlar, fail, uyari


def yazdir(klasor, d, is_turu, satirlar, fail, uyari):
    print(f'ADIM KONTROL  {os.path.abspath(klasor)}  (video: {d.get("video")}, is: {is_turu})')
    print(f'{"FAZ":22} {"DURUM":12} {"KIM":10} {"":5} KANIT / SORUN')
    for s in satirlar:
        isaret = 'FAIL' if s['eksik'] else ('UYARI' if s['uyari'] else 'OK')
        kanit = f'{len(s["kanit"])} kanit' if s['kanit'] else ''
        sorun = '; '.join(s['eksik'] + s['uyari'])
        print(f'{s["faz"]:22} {s["durum"]:12} {s["kim"]:10} {isaret:5} {kanit} {sorun}'.rstrip())
    print()
    for ad, m in fail:
        print(f'FAIL  {m}')
    for m in uyari:
        print(f'UYARI {m}')
    print(f'\n{"FAIL" if fail else "PASS"} — {len(fail)} FAIL, {len(uyari)} UYARI'
          + ('' if not fail else '  (FAIL varken teslim yok: references/uretim-defteri.md)'))


# ---------------------------------------------------------------- kayit
def kaydet(klasor, args):
    if args.kaydet not in FAZ:
        sys.exit(f'FAIL  bilinmeyen faz: {args.kaydet}\n      fazlar: {", ".join(FAZ)}')
    f = FAZ[args.kaydet]
    kanit = args.kanit or []
    yok = [y for y in kanit if not os.path.exists(yol_coz(klasor, y))]
    if yok:
        sys.exit(f'FAIL  kanit diskte yok, kaydedilmedi: {", ".join(yok)}')
    if not kanit and f['kaliplar']:
        sys.exit(f'FAIL  {f["ad"]} kanitsiz "yapildi" olmaz: --kanit <dosya...> (beklenen: {", ".join(f["kaliplar"][:3])})')
    d = defter_oku(klasor)
    if args.is_turu:
        d['is'] = args.is_turu
    kayit = {'faz': f['ad'], 'durum': 'yapildi', 'kanit': kanit, 'kim': args.kim,
             'zaman': datetime.now().isoformat(timespec='minutes')}
    if args.sekme:
        kayit['sekme'] = args.sekme
    if args.yabanci_arayuz is not None:
        kayit['yabanci_arayuz'] = args.yabanci_arayuz
    if args.notu:
        kayit['not'] = args.notu
    d['kayitlar'].append(kayit)
    p = defter_yaz(klasor, d)
    print(f'OK    {f["ad"]}: yapildi ({len(kanit)} kanit, kim={args.kim}) -> {p}')


def fazlar_yazdir():
    print('Tam videoda HER faz zorunludur; "atlandi" kaydi FAIL (kullanici karari). kapsam = nesnel kapsam-disi tespiti.')
    print(f'{"FAZ":22} {"ISLER":14} {"AYAK ISI":9} {"KAPSAM":15} BEKLENEN KANIT -> REFERANS')
    for f in FAZLAR:
        print(f'{f["ad"]:22} {"/".join(f["isler"]):14} {"evet" if f["ayak_isi"] else "hayir":9} '
              f'{f.get("kapsam") or "-":15} {", ".join(f["kaliplar"]) or "(kayit yeter)"} -> {f["referans"]}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('klasor', nargs='?', help='video klasoru (uretim-defteri.json burada)')
    ap.add_argument('--is', dest='is_turu', choices=ISLER, help='is turu (varsayilan: defterdeki, yoksa tam)')
    ap.add_argument('--kaydet', metavar='FAZ', help='deftere "yapildi" kaydi ekle')
    ap.add_argument('--kanit', nargs='*', default=None, help='kanit dosyalari (klasore gore ya da mutlak)')
    ap.add_argument('--kim', default='ana', choices=KIMLER, help='isi kim yapti (varsayilan ana)')
    ap.add_argument('--sekme', type=int, help='kapak fazi: kac ayri sekmede uretildi (kural: 6)')
    ap.add_argument('--yabanci-arayuz', type=int, default=None, help='kaynak-lisans: yabanci arayuzlu klip sayisi (0 olmali)')
    ap.add_argument('--not', dest='notu', help='serbest not')
    ap.add_argument('--ozet-json', action='store_true', help='makine okur ozet (yerel_ai.py arayuzu)')
    ap.add_argument('--fazlar', action='store_true', help='FAZLAR tablosunu yazdir')
    args = ap.parse_args()

    if args.fazlar:
        fazlar_yazdir()
        return
    if not args.klasor:
        ap.error('video klasoru gerekli (ya da --fazlar)')
    if not os.path.isdir(args.klasor):
        sys.exit(f'FAIL  klasor yok: {args.klasor}')
    if args.kaydet:
        kaydet(args.klasor, args)
        return
    d, is_turu, satirlar, fail, uyari = denetle(args.klasor, args.is_turu)
    if args.ozet_json:
        print(json.dumps({'video': d.get('video'), 'is': is_turu, 'sonuc': 'FAIL' if fail else 'PASS',
                          'fail': [m for _, m in fail], 'uyari': uyari, 'fazlar': satirlar},
                         ensure_ascii=False, indent=1))
    else:
        yazdir(klasor=args.klasor, d=d, is_turu=is_turu, satirlar=satirlar, fail=fail, uyari=uyari)
    sys.exit(1 if fail else 0)


if __name__ == '__main__':
    main()
