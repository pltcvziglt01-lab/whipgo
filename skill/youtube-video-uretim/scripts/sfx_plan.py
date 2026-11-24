#!/usr/bin/env python3
"""SFX PLANI (ffmpeg hatti) — VideoDna'nin Remotion icinde caldigi otomatik SFX'i `ses_miks.py --sfx` json'una cevirir.
Remotion disi (ffmpeg ile kurgulanan) kanalda ya da `<VideoDna sfx={false}>` ile render edilip ses ayri miks edilen videoda
ayni SFX dili: ayni video paleti, sahne davranislari (sayac/yazma/liste/cubuk/rota/bolum/doruk/...), oncelik, ton tavani, tepe
otelemesi, kirpma, seviye (konusma referansina gore), doruk sessizligi.

Kullanim:
  py sfx_plan.py --plan motion/src/v04/props.json [--dna stil-dna.json] [--vo vo.mp3] [--klasor motion/public/varlik] [--cikti sfx.json]
  py ses_miks.py --vo vo.mp3 --sfx sfx.json --video ham.mp4 --cikti final.mp4
--plan  : VideoDna props'u ({dna, veri:{fps, cekimler[...]}}); dna props'ta yoksa --dna stil-dna.json.
--klasor: varlik koku (varsayilan: props'un ustundeki public/varlik); dosya yollari sfx/... (Adobe) ve sfx-cc0/... (CC0).
--vo    : seslendirme olculur (600 ms K-yukseklik medyani); SFX dB'leri ayar.vo_ref_db farkina gore TEK SABITLE kaydirilir — yalniz
          onizleme. TESLIMDE --yatak (her ses yerel seslendirme+muzik yuksekligine gore) + sfx_kontrol.py (references/teslim.md).
Cikti: [{"dosya", "t": sn, "db", "kirp": sn, "sure": sn, "giris": sn, "rol", "havuz"}]  (ses_miks: atrim + giris / 0,25 sn cikis
  yumusamasi). t = dosyanin (kirpilmis) caldigi an; tepe olay karesine oturur.

Tek kaynak: kutuphane/ayar/olcu repertuar/sfx-kutuphane.json (Sfx.tsx de onu import eder). Plan VARSAYILAN olarak GERCEK TS'ten
(gecisPlani + sfxOlaylari + sfxPlani, node+esbuild) hesaplanir -> Remotion ile ayni ses, ayni kare. node/esbuild yoksa (ya da
--python) Python portu kullanilir; rastgelelik temel.ts `rastgele` (mulberry32) birebir portu. --karsilastir portu TS ile kiyaslar
(port edilen TS fonksiyonunun metni degisirse imza UYARISI verir).
"""
import argparse, ast, hashlib, json, math, os, re, subprocess, sys

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
from kurgu_denetim import rastgele   # noqa: E402  (temel.ts birebir portu)

REPO = os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
# port edilen TS fonksiyonlarinin normalize metin imzasi (sha1 ilk 12). Degisirse UYARI.
PORT_IMZA = {'Sfx.tsx:sfxPlani': None}   # None: imza karsilastirmasi yok, esitlik --karsilastir/--esitlik ile node'a karsi


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
    """SFX kutuphanesi/ayar/olcu: repertuar/sfx-kutuphane.json (Sfx.tsx de onu import eder -> tek kaynak)"""
    oku = lambda a: open(os.path.join(rep, a), encoding='utf-8').read()
    j = json.load(open(os.path.join(rep, 'sfx-kutuphane.json'), encoding='utf-8'))
    t = {'ayar': j['ayar'], 'sesler': j['sesler'], 'olcu': j.get('olcu') or {}}
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


def js_round(x):
    return math.floor(x + 0.5)       # Math.round: .5 yukari (Python round bankaci)


# ---------------------------------------------------------------- port: Sfx.tsx sfxPaleti / sfxKazanc / yerlestir / sfxPlani
TONLAR = ('ciddi', 'gizem', 'enerjik', 'sakin')
HAVUZLAR = ['gecis', 'kart', 'sayi', 'alinti', 'vurgu', 'altbant', 'yukselme', 'tik', 'yazma', 'liste', 'cubuk',
            'suzulme', 'varis', 'bolum', 'doruk', 'cizik', 'belge', 'foto', 'glitch']
DAVRANIS = {'gecis': ['gecis'], 'kart': ['kart'], 'sayi': ['sayi'], 'alinti': ['alinti'], 'vurgu': ['vurgu'], 'altbant': ['altbant'],
            'yukselme': ['yukselme'], 'sayac': ['tik', 'sayi'], 'yazma': ['yazma'], 'liste-madde': ['liste'], 'grafik-cubuk': ['cubuk'],
            'harita-rota': ['suzulme', 'varis'], 'bolum': ['yukselme', 'bolum'], 'doruk': ['doruk'], 'degisim': ['cizik'],
            'belge': ['belge'], 'foto': ['foto'], 'glitch': ['glitch']}
DIZI = ('sayac', 'yazma', 'liste-madde', 'grafik-cubuk', 'harita-rota')
VARSAYILAN_OLCU = [0, 0.05, -6, -20, 1, 1]


def sfx_adaylari(havuz, ton, T):
    out = []
    for d, k in T['sesler'].items():
        if havuz not in k['rol'] or ton not in k['ton'] or k.get('mizah'):
            continue
        if ton in ('ciddi', 'gizem') and 'pop' in k['kar']:
            continue
        if havuz == 'glitch' and ton != 'enerjik':
            continue
        out.append(d)
    return out


def sfx_paleti(ton, tohum, T, his=()):
    A = T['ayar']
    r = rastgele(tohum + 'sfxpalet')
    doku = A['doku'][ton][math.floor(r() * 2)]
    aile = 'adobe-basics' if r() < 0.5 else 'CC0-1.0'
    amin, amax = A['palet_adet']
    palet = {}
    for h in HAVUZLAR:
        aday = sfx_adaylari(h, ton, T)
        n0 = amin + math.floor(r() * (amax - amin + 1))
        hedef = min(len(aday), amax if h in A.get('sik_havuz', []) else n0)
        w = []
        for d in aday:
            k = T['sesler'][d]
            w.append((2 if doku in k['kar'] else 1) * (1.5 if k['lisans'] == aile else 1) * (1.5 if any(x in k['his'] for x in his) else 1))
        kalan = list(range(len(aday)))
        sec = []
        while len(sec) < hedef:
            top = 0
            for i in kalan:
                top += w[i]
            x = r() * top
            j = 0
            while j < len(kalan) - 1 and x >= w[kalan[j]]:
                x -= w[kalan[j]]
                j += 1
            sec.append(aday[kalan[j]])
            kalan.pop(j)
        palet[h] = sec
    return palet, doku, aile


def sfx_kazanc(dosya, havuz, ton, T, db_ek=0.0, ref=None):
    A = T['ayar']
    o = T['olcu'].get(dosya, VARSAYILAN_OLCU)
    mono = 3.01 if o[5] == 1 else 0
    ref = A['vo_ref_db'] if ref is None else ref
    g = min(ref + A['seviye'][havuz] + A['ton_ofset'].get(ton, 0) + db_ek - o[3], A['tepe_tavan_db'] - o[2] + mono, A['kazanc_tavan_db'])
    return math.pow(10, g / 20)


def yerlestir(dosya, havuz, rol, an, hiza, fps, ses, sn, T, azami_on=None, azami_sure=None):
    bas, tepe, _, _, dsure = T['olcu'].get(dosya, VARSAYILAN_OLCU)[:5]
    son = min(dsure if sn is None else sn, dsure or (1 if sn is None else sn))
    kirp = max(0, bas - 0.04)
    if hiza == 'tepe' and azami_on is not None and tepe - kirp > azami_on:
        kirp = max(kirp, tepe - azami_on)
    kirp_k = js_round(kirp * fps)
    vurus_k = (js_round(tepe * fps) if hiza == 'tepe' else js_round(bas * fps)) - kirp_k
    sure = js_round(min(son - kirp_k / fps, (tepe - kirp_k / fps) + T['ayar']['kuyruk'][havuz], 1e9 if azami_sure is None else azami_sure) * fps)
    kare = an - max(0, vurus_k)
    if kare < 0:
        kirp_k -= kare
        sure += kare
        kare = 0
    return {'kare': kare, 'dosya': dosya, 'sure': max(4, sure), 'ses': ses, 'rol': rol, 'havuz': havuz, 'kirp': kirp_k, 'an': an, 'hiza': hiza}


def kapsam(o, fps, ton, T):
    on = arka = 0
    rol, adet, aralik, sure = o['rol'], o.get('adet'), o.get('aralik'), o.get('sure')
    if rol == 'sayac':
        arka = sure if sure is not None else (adet * aralik if adet and aralik else js_round(fps * 1.2))
    elif rol == 'yazma':
        arka = (12 if adet is None else adet) * (2 if aralik is None else aralik)
    elif rol in ('liste-madde', 'grafik-cubuk'):
        arka = (adet - 1) * (aralik if aralik is not None else js_round(fps * (0.5 if rol == 'liste-madde' else 0.25))) if adet and adet > 1 else 0
    elif rol == 'harita-rota':
        arka = sure if sure is not None else js_round(fps * 1.5)
    elif rol == 'bolum':
        on = js_round(fps * T['ayar']['bolum_yukselme'][ton])
    elif rol == 'doruk':
        on = js_round(fps * T['ayar']['doruk_sessizlik'])
    return on, arka


def sfx_sessizlikleri(olaylar, fps, T):
    return [{'bas': max(0, o['kare'] - js_round(fps * T['ayar']['doruk_sessizlik'])), 'son': o['kare']} for o in olaylar if o['rol'] == 'doruk']


def sfx_plani(olaylar, ton, tohum, fps, sfx_orani, T, his=()):
    A = T['ayar']
    if ton not in TONLAR:
        ton = 'ciddi'
    r = rastgele(tohum + 'sfx')
    palet, _, _ = sfx_paleti(ton, tohum, T, his)
    ON = A['oncelik']
    esik = max(0.15, min(0.9, sfx_orani))
    aday = []
    for o in olaylar:                       # r() yalniz gecislerde, olay sirasiyla (TS filter kisa devresi)
        if o['rol'] not in ON or (o['rol'] == 'glitch' and ton != 'enerjik'):
            continue
        if o['rol'] == 'gecis' and not r() < esik:
            continue
        aday.append(o)
    aday = [o for _, o in sorted(enumerate(aday), key=lambda x: (x[1]['kare'], -ON[x[1]['rol']], x[0]))]
    bosluk = js_round(fps * A['bosluk'][ton])
    kalan = []
    for o in aday:
        on, arka = kapsam(o, fps, ton, T)
        a0, a1 = o['kare'] - on, o['kare'] + max(bosluk, arka)
        at = False
        j = len(kalan) - 1
        while j >= 0 and not at:
            k = kalan[j]
            if k['kare'] < o['kare'] - fps * 90:
                break
            kon, karka = kapsam(k, fps, ton, T)
            b0, b1 = k['kare'] - kon, k['kare'] + max(bosluk, karka)
            if not (a0 >= b1 or b0 >= a1) and not ((ON[o['rol']] >= 5 and k['rol'] in DIZI) or (ON[k['rol']] >= 5 and o['rol'] in DIZI)):
                if ON[o['rol']] > ON[k['rol']]:
                    kalan.pop(j)
                else:
                    at = True
            j -= 1
        if not at:
            kalan.append(o)
    pencere, tavan = fps * 60, A['tavan'][ton]
    sonuc = []
    p = 0
    son_kare = kalan[-1]['kare'] if kalan else 0
    while p <= son_kare:
        g = [o for o in kalan if p <= o['kare'] < p + pencere]
        tut = {id(o) for o in sorted(g, key=lambda o: -ON[o['rol']])[:tavan]}
        sonuc += [o for o in g if id(o) in tut]
        p += pencere
    sira, son_havuz, son_genel, kullanim = {}, {}, [''], {}

    def sec(h, kare):
        liste = palet.get(h) or []
        s0 = sira.get(h, 0)
        for d in range(len(liste)):
            s = liste[(s0 + d) % len(liste)]
            if len(liste) > 1 and (s == son_havuz.get(h) or s == son_genel[0]):
                continue
            if len([x for x in kullanim.get(s, []) if kare - x < pencere]) >= A['dakika_ayni_ses']:
                continue
            sira[h] = (s0 + d + 1) % len(liste)
            son_havuz[h] = s
            son_genel[0] = s
            kullanim.setdefault(s, []).append(kare)
            return s
        return None

    out = []
    jit = lambda: (r() - 0.5) * 2 * A['oynama_db']

    def ekle(d, h, rol, an, db_ek=0.0, hiza='tepe', sn=None, azami_on=None, azami_sure=None):
        if not d:
            return
        ses = sfx_kazanc(d, h, ton, T, db_ek + jit())
        out.append(yerlestir(d, h, rol, an, hiza, fps, ses, sn if sn is not None else T['sesler'].get(d, {}).get('sn'), T, azami_on, azami_sure))

    for o in sonuc:
        rol = o['rol']
        if rol == 'sayac':
            sure = kapsam(o, fps, ton, T)[1]
            adet, aralik = o.get('adet'), o.get('aralik')
            n = max(2, min(24, adet if adet is not None else js_round(sure / (fps * 0.12))))
            t = [o['kare'] + (i * aralik if aralik else js_round(sure * (1 - math.pow(1 - i / n, 1 / 3)))) for i in range(n)]
            tk = []
            for x in t:
                if not tk or x - tk[-1] >= 2:
                    tk.append(x)
            a = sec('tik', o['kare'])
            b = sec('tik', o['kare'])
            for i, x in enumerate(tk):
                ekle(b if (i % 2 and b) else a, 'tik', rol, x, -2 + (2 * i) / max(1, len(tk) - 1))
            ekle(sec('sayi', o['kare'] + sure), 'sayi', rol, o['kare'] + sure)
        elif rol == 'yazma':
            n = min(60, 12 if o.get('adet') is None else o['adet'])
            ar = 2 if o.get('aralik') is None else o['aralik']
            adim = max(1, math.ceil(2 / ar))
            ss = [x for x in (sec('yazma', o['kare']), sec('yazma', o['kare']), sec('yazma', o['kare'])) if x]
            i = m = 0
            while i < n and m < 40:
                d = ss[m % len(ss)] if ss else None
                kare = o['kare'] + js_round(i * ar)
                ek = jit()
                ekle(d, 'yazma', rol, kare, ek)
                i += adim
                m += 1
        elif rol == 'liste-madde':
            n = max(1, o.get('adet') or 1)
            ar = o['aralik'] if o.get('aralik') is not None else js_round(fps * 0.5)
            for i in range(n):
                ekle(sec('liste', o['kare'] + i * ar), 'liste', rol, o['kare'] + i * ar)
        elif rol == 'grafik-cubuk':
            n = max(1, o.get('adet') or 1)
            ar = o['aralik'] if o.get('aralik') is not None else js_round(fps * 0.25)
            taban = sec('cubuk', o['kare'])
            if taban:
                seri = T['sesler'][taban].get('seri') or [taban]
                for i in range(n):
                    ekle(seri[min(i, len(seri) - 1)], 'cubuk', rol, o['kare'] + i * ar, 0.4 * i, 'tepe', T['sesler'][taban].get('sn'))
        elif rol == 'harita-rota':
            sure = kapsam(o, fps, ton, T)[1]
            varis = o['kare'] + sure
            ekle(sec('suzulme', o['kare']), 'suzulme', rol, varis, 0, 'tepe', None, sure / fps)
            ekle(sec('varis', varis), 'varis', rol, varis)
        elif rol == 'bolum':
            ekle(sec('yukselme', o['kare']), 'yukselme', rol, o['kare'], 0, 'tepe', None, A['bolum_yukselme'][ton])
            ekle(sec('bolum', o['kare']), 'bolum', rol, o['kare'])
        elif rol == 'degisim':
            ekle(sec('cizik', o['kare']), 'cizik', rol, o['kare'], 0, 'bas', None, None, o['sure'] / fps + 0.3 if o.get('sure') else None)
        else:
            h = DAVRANIS[rol][0]
            ekle(sec(h, o['kare']), h, rol, o['kare'])
    for w in sfx_sessizlikleri(sonuc, fps, T):
        for i in range(len(out) - 1, -1, -1):
            p = out[i]
            if p['rol'] == 'doruk' or p['kare'] >= w['son'] or p['kare'] + p['sure'] <= w['bas']:
                continue
            if p['kare'] >= w['bas']:
                out.pop(i)
            else:
                p['sure'] = max(4, w['bas'] - p['kare'])
                p['kes'] = True
    return sorted(out, key=lambda p: p['kare'])


def zarf_esik(rep):
    m = re.search(r'SFX_ZARF_ESIK\s*=\s*([\d.]+)', open(os.path.join(rep, 'Sfx.tsx'), encoding='utf-8').read())
    return float(m.group(1)) if m else 0.12


def cikis_suresi(s, sure, fps):
    """Sfx.tsx SfxKatmani kapanis (sn): <= 0,25 sn, surenin %30'u, tepeden en az 2 kare sonra baslar"""
    tepe_k = s.get('an', s['kare']) - s['kare'] if s.get('hiza', 'tepe') == 'tepe' else 0
    return max(1, min(js_round(fps * 0.25), math.floor(sure * 0.3), sure - 2, sure - tepe_k - 2)) / fps


def calma_suresi(s, fps, T, esik):
    """Sfx.tsx sfxCalmaSuresi: dusuk kazancli ses (Remotion'da zarfsiz) dogal kuyruguyla calar"""
    if s.get('kes') or s['ses'] >= esik:
        return s['sure']
    dsure = T['olcu'].get(s['dosya'], [0, 0, 0, 0, s['sure'] / fps, 1])[4]
    sn = T['sesler'].get(s['dosya'], {}).get('sn')
    sn = dsure if sn is None else sn
    return max(s['sure'], js_round(min(sn, dsure) * fps - s['kirp']))


def miks_json(plan, fps, klasor, T, esik, db_kaydir=0.0, yatak=None):
    """ses_miks.py --sfx json'u. klasor = varlik koku (dosya yollari sfx/..., sfx-cc0/...). giris: kirpilmis seste 1 karelik giris.
    an: sesin oturdugu gorsel an (sn; hiza 'tepe' tepe, 'bas' ses basi). yatak (Yatak): her ses YEREL yatak yuksekligine gore
    (+-ayar.yatak_pencere sn) kurulur: seviye = yatak + havuz seviyesi (konusma yoksa muzige gore); tepe tavani korunur."""
    A = T['ayar']
    out = []
    for s in plan:
        sure = calma_suresi(s, fps, T, esik)
        o = T['olcu'].get(s['dosya'], VARSAYILAN_OLCU)
        dogal = not s.get('kes') and (s['kirp'] + sure) / fps >= o[4] - 0.05   # Sfx.tsx sfxDogalSon: kesik yoksa cikis yumusamasi yok
        db = 20 * math.log10(max(s['ses'], 1e-6)) + db_kaydir
        an = s.get('an', s['kare']) / fps
        yerel = None
        if yatak is not None:
            yerel = yatak.yukseklik(an - A['yatak_pencere'], an + A['yatak_pencere'])
            tavan = A['tepe_tavan_db'] - o[2] + (3.01 if o[5] == 1 else 0)   # ornek tepesi kanal basina -3 dBFS'i asmaz
            # dosyanin en gur 100 ms'si (olcu) yerine GERCEKTE calinan kesitin yuksekligi (kirpma + sure + yumusamalar)
            duz = o[3] - calinan_yukseklik(os.path.join(klasor, s['dosya']), s['kirp'] / fps, sure / fps,
                                           1 / fps if s['kirp'] > 0 else 0, 0 if dogal else 0.25)
            if yerel > -45:   # sessiz yatakta (ne konusma ne muzik) sabit referans kalir
                db = min(db - db_kaydir + (yerel - A['vo_ref_db']) + duz, tavan)
            else:
                db = min(db + duz, tavan)
        e = {'dosya': os.path.join(klasor, s['dosya']).replace(os.sep, '/'), 't': round(s['kare'] / fps, 4), 'db': round(db, 2),
             'kirp': round(s['kirp'] / fps, 4), 'sure': round(sure / fps, 4), 'giris': round(1 / fps, 4) if s['kirp'] > 0 else 0,
             'cikis': 0 if dogal else cikis_suresi(s, sure, fps), 'rol': s['rol'], 'havuz': s['havuz'], 'an': round(an, 4), 'hiza': s.get('hiza', 'tepe'),
             'kutuphane': s['dosya']}
        if yerel is not None:
            e['yatak_lufs'] = round(yerel, 1)
        out.append(e)
    return out


_CAL = {}


def calinan_yukseklik(yol, kirp, sure, giris, cikis):
    """kesitin (kirp..kirp+sure, giris/cikis yumusamali, 0 dB, mono -> stereo -3 dB) 100 ms K-yukseklik tepesi; sfx_kontrol ile ayni olcu"""
    import numpy as np
    from sfx_olc import kanallar, k_guc, yukseklik
    k = (yol, round(kirp, 4), round(sure, 4), giris, cikis)
    if k not in _CAL:
        if yol not in _CAL:
            x = kanallar(yol)
            _CAL[yol] = np.repeat(x, 2, axis=1) * 10 ** (-3.01 / 20) if x.shape[1] == 1 else x[:, :2]
        x = _CAL[yol]
        p = x[int(round(kirp * 48000)):int(round((kirp + sure) * 48000))].copy()
        if not len(p):
            _CAL[k] = -120.0
            return -120.0
        z = np.ones(len(p))
        g, c = min(int(giris * 48000), len(p)), min(int(cikis * 48000), len(p))
        if g > 0:
            z[:g] *= np.linspace(0, 1, g, endpoint=False)
        if c > 0:
            z[-c:] *= np.linspace(1, 0, c)
        _CAL[k] = float(yukseklik(k_guc(p * z[:, None])).max())
    return _CAL[k]


class Yatak:
    """seslendirme + muzik (SFX'siz) dosyasinin K-yukseklik zarfi; bas_sn: dosyanin video zaman cizgisindeki baslangici"""
    def __init__(self, yol, bas_sn=0.0, gecikme=0.0):
        from sfx_olc import kanallar, k_guc
        self.g = k_guc(kanallar(yol))
        self.c = __import__('numpy').concatenate([[0.0], __import__('numpy').cumsum(self.g)])
        self.bas = bas_sn - gecikme

    def yukseklik(self, a, b):
        i, j = int(max(0, (a - self.bas) * 48000)), int(max(0, (b - self.bas) * 48000))
        j = min(j, len(self.g))
        if j - i < 480:
            return -120.0
        return -0.691 + 10 * math.log10((self.c[j] - self.c[i]) / (j - i) + 1e-12)


def miks_numpy(sfx, cikti, yatak_yol=None, bas_sn=0.0, sure=None, video=None):
    """SFX'leri (miks_json ciktisi) yatagin (ya da sessizligin) ustune numpy ile karistirir -> wav/flac (video verilirse mp4, goruntu kopya).
    ses_miks.py'nin SFX zinciriyle ayni: atrim kirp..kirp+sure, giris/cikis yumusamasi, dB, gecikme; mono -> stereo -3 dB (ffmpeg/Remotion).
    ffmpeg'e yuzlerce girdi vermez (Windows komut satiri 32 bin karakter sinirini asmaz)."""
    import numpy as np
    from sfx_olc import kanallar
    SR = 48000
    if yatak_yol:
        y = kanallar(yatak_yol, bas_sn, sure)
        if y.shape[1] == 1:
            y = np.repeat(y, 2, axis=1) * 10 ** (-3.01 / 20)
    else:
        n = int(round((sure or (max(e['t'] + e['sure'] for e in sfx) - bas_sn + 1)) * SR))
        y = np.zeros((n, 2))
    on = {}
    for e in sfx:
        t0 = e['t'] - bas_sn
        if t0 + e['sure'] <= 0 or t0 >= len(y) / SR:
            continue
        if e['dosya'] not in on:
            x = kanallar(e['dosya'])
            on[e['dosya']] = np.repeat(x, 2, axis=1) * 10 ** (-3.01 / 20) if x.shape[1] == 1 else x[:, :2]
        x = on[e['dosya']]
        a = int(round(e['kirp'] * SR))
        p = x[a:a + int(round(e['sure'] * SR))].copy()
        if not len(p):
            continue
        z = np.ones(len(p))
        g = int(e.get('giris', 0.066) * SR)
        if g > 0:
            z[:g] *= np.linspace(0, 1, min(g, len(p)), endpoint=False)[:len(z[:g])]
        c = int(e.get('cikis', 0.25) * SR)
        if c > 0:
            c = min(c, len(p))
            z[-c:] *= np.linspace(1, 0, c)
        p *= (z * 10 ** (e['db'] / 20))[:, None]
        i = int(round(t0 * SR))
        if i < 0:
            p, i = p[-i:], 0
        k = min(len(p), len(y) - i)
        if k > 0:
            y[i:i + k] += p[:k]
    tepe = float(np.abs(y).max()) if len(y) else 0
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-']
                       + (['-i', video, '-map', '1:v', '-map', '0:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest'] if video else [])
                       + [cikti], input=y.astype(np.float64).tobytes(), capture_output=True)
    if r.returncode:
        sys.exit('miks yazilamadi: ' + r.stderr.decode('utf-8', 'replace')[-300:])
    return 20 * math.log10(tepe + 1e-12)


def public_bul(yol):
    d = os.path.dirname(os.path.abspath(yol))
    for _ in range(6):
        if os.path.isdir(os.path.join(d, 'public')):
            return os.path.join(d, 'public')
        d = os.path.dirname(d)
    return None


def esbuild_bul(props_yol):
    for m in (os.path.dirname(public_bul(props_yol) or props_yol), os.path.join(REPO, 'sablon-proje')):
        if os.path.isdir(os.path.join(m, 'node_modules', 'esbuild')):
            return m
    return None


def ts_calistir(props, dna, rep, props_yol, tohumlar=()):
    """GERCEK TS'i (VideoDna.tsx gecisPlaniVideo + sfxOlaylari + Sfx.tsx sfxPlani) node+esbuild ile calistirir -> Remotion'la birebir.
    tohumlar: esitlik testi icin ayrica her tohumda Gecis.tsx gecisPlani, gecisPlaniVideo, olaylar ve sfxPlani.
    Donus: ({olaylar, plan, tohum: {...}}, None) ya da (None, hata)."""
    import tempfile
    motion = esbuild_bul(props_yol)
    if not motion:
        return None, 'esbuild yok (motion/ ya da sablon-proje/ node_modules)'
    d = tempfile.mkdtemp(prefix='sfxplan-')
    yol = lambda a: json.dumps(os.path.join(rep, a).replace(chr(92), '/'))
    giris = os.path.join(d, 'g.ts')
    open(giris, 'w', encoding='utf-8').write(
        f"import {{ sfxPlani }} from {yol('Sfx.tsx')};\nimport {{ gecisPlani }} from {yol('Gecis.tsx')};\n"
        f"import * as V from {yol('VideoDna.tsx')};\nimport * as fs from 'fs';\n"
        "const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const v = p.veri, n = v.cekimler.length;\n"
        "const hesap = (dna: any) => {\n"
        "  // VideoDna'nin KENDI gecis plani (efekt butcesi vb.); eski surumde yoksa gecisPlani\n"
        "  const plan = (V as any).gecisPlaniVideo ? (V as any).gecisPlaniVideo(v, dna) : gecisPlani(n - 1, dna.gecis, dna.tohum, dna.iskelet.yumusak_oran);\n"
        "  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? dna.iskelet.gecis_kare : 0);\n"
        "  const ol = (V as any).sfxOlaylari(v, v.cekimler.map((c: any, i: number) => c.kare + d(i)), plan, dna.iskelet.gecis_kare);\n"
        "  const ton = ['ciddi','gizem','enerjik','sakin'].includes(dna.ton || '') ? dna.ton : 'ciddi';\n"
        "  return { olaylar: ol, plan: sfxPlani(ol, ton, dna.tohum, dna.iskelet.fps || 30, dna.iskelet.sfx_orani ?? 0.5), gecis: plan,\n"
        "    gecisPlani: gecisPlani(n - 1, dna.gecis, dna.tohum, dna.iskelet.yumusak_oran) };\n"
        "};\n"
        "const out: any = hesap(p.dna); out.tohum = {};\n"
        "for (const t of p.tohumlar || []) out.tohum[t] = hesap({ ...p.dna, tohum: t });\n"
        "console.log(JSON.stringify(out));\n")
    cikis, kur, girdi = os.path.join(d, 'g.cjs'), os.path.join(d, 'kur.cjs'), os.path.join(d, 'props.json')
    json.dump({'dna': dna, 'veri': props['veri'], 'tohumlar': list(tohumlar)}, open(girdi, 'w', encoding='utf-8'))
    open(kur, 'w', encoding='utf-8').write(
        f"require({json.dumps(os.path.join(motion, 'node_modules', 'esbuild').replace(chr(92), '/'))}).buildSync({{entryPoints: [{json.dumps(giris.replace(chr(92), '/'))}],"
        f" bundle: true, platform: 'node', format: 'cjs', logLevel: 'error', outfile: {json.dumps(cikis.replace(chr(92), '/'))},"
        " external: ['react', 'react/*', 'remotion', '@remotion/*'], jsx: 'automatic'});")
    r = subprocess.run(['node', kur], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        return None, 'esbuild hatasi: ' + r.stderr[-400:]
    env = dict(os.environ, NODE_PATH=os.path.join(motion, 'node_modules'))
    r = subprocess.run(['node', cikis, girdi], capture_output=True, text=True, cwd=motion, encoding='utf-8', env=env)
    if r.returncode:
        return None, 'node hatasi: ' + r.stderr[-400:]
    return json.loads(r.stdout), None


def esitlik_testi(props, dna, rep, props_yol, T, tohumlar):
    """Python portlari = TS mi: her tohumda Gecis.tsx gecisPlani (kurgu_denetim.gecis_plani), VideoDna gecisPlaniVideo
    (kurgu_denetim.gecis_plani_video) ve Sfx.tsx sfxPlani (bu dosyadaki port). Donus: (satirlar, hepsi_ayni)."""
    import kurgu_denetim as KD
    ts, hata = ts_calistir(props, dna, rep, props_yol, tohumlar)
    if not ts:
        return [f'esitlik testi calismadi: {hata}'], False
    KT = KD.ts_sabitleri()
    isk = dna.get('iskelet') or {}
    ton = dna.get('ton') if dna.get('ton') in TONLAR else 'ciddi'
    so = isk.get('sfx_orani')
    n = len(props['veri']['cekimler'])
    satir, hepsi = [], True
    for t in tohumlar:
        j = ts['tohum'][t]
        d2 = dict(dna, tohum=t)
        gp = KD.gecis_plani(n - 1, dna.get('gecis') or [], t, isk.get('yumusak_oran', 1), KT)
        gv = KD.gecis_plani_video({'dna': d2, 'veri': props['veri']}, KT)
        sp = sfx_plani(j['olaylar'], ton, t, isk.get('fps') or 30, 0.5 if so is None else so, T)
        ok = (gp == j['gecisPlani'], gv == j['gecis'], plan_farki(sp, j['plan']).endswith('farkli 0'))
        hepsi &= all(ok)
        satir.append(f"tohum {t!r}: gecisPlani {'AYNI' if ok[0] else 'FARKLI'} ({len(gp)} gecis) · gecisPlaniVideo {'AYNI' if ok[1] else 'FARKLI'} · "
                     f"sfxPlani {'AYNI' if ok[2] else 'FARKLI'} ({len(sp)} ses)")
    return satir, hepsi


def plan_farki(py, js):
    fark = [i for i, (a, b) in enumerate(zip(py, js)) if a['kare'] != b['kare'] or a['dosya'] != b['dosya'] or a['sure'] != b['sure']
            or a['kirp'] != b['kirp'] or abs(a['ses'] - b['ses']) > 1e-9 or a.get('an') != b.get('an') or a.get('hiza') != b.get('hiza')]
    return (f"TS sfxPlani: {len(js)} ses, Python portu: {len(py)} ses, farkli {len(fark) + abs(len(js) - len(py))}"
            + (f" (ilk fark #{fark[0]}: py {py[fark[0]]} / js {js[fark[0]]})" if fark else ''))


def vo_olc(yol):
    """VO'nun 600 ms K-yukseklik medyani (LUFS; konusma pencereleri: en gur pencerenin 20 dB altindan gurler) — ayar.vo_ref_db ile ayni olcek"""
    import numpy as np
    from sfx_olc import kanallar, k_guc, yukseklik
    L = yukseklik(k_guc(kanallar(yol)), 0.6, 0.1)
    a = L[L > max(-50, float(L.max()) - 20)] if len(L) else L
    return float(np.median(a)) if len(a) else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan', required=True, help='props.json (VideoDna)')
    ap.add_argument('--dna', help='stil-dna.json (props.json dna icermiyorsa)')
    ap.add_argument('--klasor', help='varlik koku (varsayilan <public>/varlik; eski "<...>/varlik/sfx" de kabul)')
    ap.add_argument('--repertuar', default=os.path.join(REPO, 'repertuar'))
    ap.add_argument('--vo', help='seslendirme dosyasi: seviyesi olculur, SFX dB\'leri ayar.vo_ref_db farkina gore kaydirilir')
    ap.add_argument('--cikti')
    ap.add_argument('--yatak', help='seslendirme+muzik (SFX icermeyen) ses: her SFX YEREL yatak yuksekligine gore seviyelenir (konusma yoksa muzige gore)')
    ap.add_argument('--yatak-gecikme', type=float, default=0.0, help='yatagin videoya gore gecikmesi sn')
    ap.add_argument('--miks', help='yatak + SFX karisimi (wav/flac; --video ile mp4)')
    ap.add_argument('--stem-cikti', help='yalniz SFX katmani (wav/flac): ses_miks.py --sfx <wav> ile tek girdi olarak verilir')
    ap.add_argument('--video', help='--miks icin goruntu (kopyalanir)')
    ap.add_argument('--bas-sn', type=float, default=0.0, help='--miks/--stem-cikti zaman cizgisinde baslangic (kismi bolum)')
    ap.add_argument('--sure', type=float, help='--miks/--stem-cikti suresi sn')
    ap.add_argument('--karsilastir', action='store_true', help='Python sfxPlani portunu TS ciktisiyla (ayni olaylarla) birebir karsilastir')
    ap.add_argument('--esitlik', nargs='*', metavar='TOHUM', help='portlar = TS mi: gecisPlani, gecisPlaniVideo, sfxPlani (vars. 3 tohum)')
    a = ap.parse_args()
    props = json.load(open(a.plan, encoding='utf-8-sig'))
    dna = json.load(open(a.dna, encoding='utf-8-sig')) if a.dna else props.get('dna')
    if not dna:
        sys.exit('props.json dna icermiyor: --dna stil-dna.json ver')
    if 'veri' not in props:
        props = {'veri': props}
    T, uyari = repertuar_oku(a.repertuar)
    isk = dna.get('iskelet') or {}
    ton = dna.get('ton') if dna.get('ton') in TONLAR else 'ciddi'
    fps = isk.get('fps') or 30
    so = isk.get('sfx_orani')
    ts, hata = ts_calistir(props, dna, a.repertuar, a.plan)
    if not ts:   # Python yedegi yok: olay/gecis kopyalari TS'ten kayar (sahne motoru karari)
        sys.exit(f'HATA plan TS ile hesaplanamadi ({hata}). node + esbuild gerekli (motion/ ya da sablon-proje/ npm install).')
    olay, plan, kaynak = ts['olaylar'], ts['plan'], 'TS (node, Remotion ile birebir)'
    pub = public_bul(a.plan)
    klasor = os.path.abspath(a.klasor or os.path.join(pub or os.path.join(REPO), 'varlik'))
    if os.path.basename(klasor.rstrip('/\\')) == 'sfx':
        klasor = os.path.dirname(klasor.rstrip('/\\'))
    kaydir = 0.0
    if a.vo:
        m = vo_olc(a.vo)
        if m is not None:
            kaydir = m - T['ayar']['vo_ref_db']
            print(f'VO {m:.1f} LUFS (600 ms K-yukseklik medyani), referans {T["ayar"]["vo_ref_db"]} -> SFX {kaydir:+.1f} dB')
    yatak = Yatak(a.yatak, 0.0, a.yatak_gecikme) if a.yatak else None
    out = miks_json(plan, fps, klasor, T, zarf_esik(a.repertuar), kaydir, yatak)
    eksik = sorted({e['dosya'] for e in out if not os.path.exists(e['dosya'])})
    cikti = a.cikti or os.path.join(os.path.dirname(os.path.abspath(a.plan)), 'sfx.json')
    json.dump(out, open(cikti, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    sure = sum(c['kare'] for c in props['veri']['cekimler']) / fps
    print(f"SFX {len(out)} ses ({len(olay)} kurgu olayindan; {kaynak}) · ton {ton} · dakikada {len(out) / max(sure / 60, 1e-9):.1f} · "
          f"farkli ses {len({e['dosya'] for e in out})} · {', '.join(f'{k} {v}' for k, v in Counter(e['rol'] for e in out).most_common())} -> {cikti}")
    for u in uyari:
        print('UYARI', u)
    if eksik:
        print(f'UYARI {len(eksik)} SFX dosyasi yok: {eksik[:4]} (varlik_kur.py kanal)')
    if a.miks:
        tepe = miks_numpy(out, a.miks, a.yatak, a.bas_sn, a.sure, a.video)
        print(f'miks -> {a.miks} (tepe {tepe:.1f} dBFS)')
    if a.stem_cikti:
        tepe = miks_numpy(out, a.stem_cikti, None, a.bas_sn, a.sure)
        print(f'SFX stem -> {a.stem_cikti} (tepe {tepe:.1f} dBFS)')
    if a.karsilastir:
        print(plan_farki(sfx_plani(ts['olaylar'], ton, dna.get('tohum') or '', fps, 0.5 if so is None else so, T), ts['plan']))
    if a.esitlik is not None:
        satir, hepsi = esitlik_testi(props, dna, a.repertuar, a.plan, T, a.esitlik or ['esitlik-a', 'esitlik-b', dna.get('tohum') or 'g'])
        print(chr(10).join(satir))
        print('ESITLIK ' + ('PASS' if hepsi else 'FAIL'))
        if not hepsi:
            sys.exit(1)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
