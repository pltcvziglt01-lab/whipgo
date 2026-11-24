#!/usr/bin/env python3
"""YOUTUBE EDIT DILI DIZINI — kutuphanedeki olculmus kanallardan "YouTube'da gercekte ne kullaniliyor?" (genel + konuya gore).
Secim motoru (stil_dna.py) bunu KANIT agirligi olarak kullanir; kanal_sablon.py rakip->biz ceviri tablosunun gerekcesini buradan yazar.
Ornek: rakip Montserrat (sans geometrik) kullaniyor; nisteki basarili kanallarda 'sans dar kalin' (Anton/Bebas/Oswald) yaygin ->
biz Anton'lu font setini seceriz: ayni islev, YouTube'da kanitli, rakipten farkli, konuya uygun.

Kullanim:
  py youtube_dili.py [--kok <kutuphane>]            # dizini yeniden uret -> repertuar/youtube-dili.json (kanal eklendikce)
  py youtube_dili.py --goster font --konu askeri    # bir eksenin dagilimi
Import:
  from youtube_dili import YoutubeDili
  yt = YoutubeDili.yukle(); yt.konu(kp)             # kp: konu agirliklari (stil_dna.konu_bul)
  yt.kanit('font', 'poster-dar') -> 0..1 | yt.carpan(eksen, oge) -> 0.6..1.4 (eslenemeyen oge 1.0) | yt.neden(eksen, oge)
Eksenler: font (baslik fontunun kategorisi), gecis (aile), kamera, cerceve, altyazi (aile), palet (sinif).
Basari agirligi: kanalin en iyi outlier orani (log) — basarili kanallarin dili daha cok sayilir.
"""
import argparse, datetime, glob, json, math, os, re, statistics, sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.abspath(os.path.join(BURASI, '..', '..', '..'))
DIZIN = os.path.join(KOK, 'repertuar', 'youtube-dili.json')
EKSENLER = ['font', 'gecis', 'kamera', 'cerceve', 'altyazi', 'palet']
SECILEMEZ = {'tam', 'sert'}
HAREKET_KAMERA = {'zoom-ici': 'ken-burns-ice', 'zoom-disi': 'ken-burns-disa', 'kaydirma-sol': 'pan-sol', 'kaydirma-sag': 'pan-sag',
                  'kaydirma-yukari': 'pan-yukari', 'kaydirma-asagi': 'pan-yukari', 'sabit': 'sabit'}


def font_aile(kat):
    """ince font kategorisi (kirpintidan tespit, gurultulu) -> saglam aile. None = bilinmiyor"""
    k = (kat or '').lower()
    if not k or k in ('windows', '?'):
        return None
    if 'dar' in k:
        return 'sans-dar'
    if k.startswith('serif'):
        return 'serif'
    if k.startswith('slab'):
        return 'slab'
    if 'daktilo' in k:
        return 'daktilo'
    if 'japonca' in k:
        return 'japonca'
    if k in ('cizgi roman', 'askeri stencil', 'el yazisi marker'):
        return 'gosteri'
    return 'sans'


def _sd():
    if BURASI not in sys.path:
        sys.path.insert(0, BURASI)
    import stil_dna
    return stil_dna


def font_katalog():
    """font_aday.py katalogu: 'Bebas Neue' -> 'sans dar buyuk harf'; dosya adi (BebasNeue) -> kategori"""
    s = open(os.path.join(BURASI, 'font_aday.py'), encoding='utf-8').read()
    a = s.index('FONTLAR = {')
    kat = {m.group(1): m.group(2) for m in re.finditer(r"'([^']+)': \(\[.*?\], '([^']+)'\)", s[a:s.index('\n}', a)])}
    return kat, {k.replace(' ', ''): v for k, v in kat.items()}


def font_setleri():
    t = open(os.path.join(KOK, 'repertuar', 'temel.ts'), encoding='utf-8').read()
    b = t[t.index('export const FONTLAR'):t.index('};', t.index('export const FONTLAR'))]
    return dict(re.findall(r"'([a-z-]+)':\s+\{\s*ad: '[a-z-]+',\s+baslik: '(\w+)'", b))


def _pay(sayac):
    t = sum(sayac.values())
    return {k: v / t for k, v in sayac.items()} if t else {}


def kanal_ozellik(kd, sd, katalog):
    """bir kutuphane kanalinin olculmus yuzeyi -> eksen basina paylar"""
    oz = {e: {} for e in EKSENLER}
    ek = lambda e, k, w=1.0: oz[e].__setitem__(k, oz[e].get(k, 0) + w)
    tempo = {'kesim_dk': [], 'medyan': [], 'sfx': []}
    for vd in sorted(glob.glob(os.path.join(kd, 'video-*'))):
        fa = os.path.join(vd, 'editdili', 'font-aday.json')
        if os.path.isfile(fa):
            try:
                ls = json.load(open(fa, encoding='utf-8'))
                for x in ls if isinstance(ls, list) else []:
                    ad = sorted(x.get('adaylar') or [], key=lambda c: c.get('skor', 99))
                    if ad:
                        kat = ad[0].get('kategori') or katalog.get(ad[0].get('font'), '?')
                        if font_aile(kat):
                            ek('font', font_aile(kat), 1 / max(1, len(ls)))
            except (ValueError, OSError):
                pass
        ej = os.path.join(vd, 'editdili', 'edit-dili.json')
        if os.path.isfile(ej):
            try:
                e = json.load(open(ej, encoding='utf-8'))
            except (ValueError, OSError):
                e = {}
            for g, o in ((e.get('gecis_ozet') or {}).get('dagilim') or {}).items():
                if g.endswith('?'):
                    continue
                aile = 'sert' if g.startswith('sert') else next((a for an, a in sd.RAKIP_GECIS_AILE if an in g), None)
                if aile:
                    ek('gecis', aile, o)
            for k, o in ((e.get('duzen') or {}).get('duzen_dagilimi') or {}).items():
                ek('cerceve', 'tam' if k == 'tam_ekran' else sd.CERCEVE_RAKIP.get(k, k), o)
            y = e.get('yazi') or {}
            a = e.get('analiz_aralik_sn') or [0, 600]
            dk = max(0.5, (a[1] - a[0]) / 60)
            alt = y.get('altyazi') or {}
            if (y.get('altyazi_ogesi') or 0) / dk >= 8:
                aile = ('kutulu' if (alt.get('kutulu_olasi') or 0) > 0.5 else 'vurgulu' if (alt.get('vurgulu_kelime_olasi') or 0) > 0.3
                        else 'kelime' if (alt.get('kelime_ekran_medyan') or 9) <= 2 else 'sinema')
                ek('altyazi', aile)
            else:
                ek('altyazi', 'yok')
            r = e.get('renk') or {}
            if r:
                sinif = 'acik' if (r.get('parlaklik') or 0) > 0.55 else 'koyu-renkli' if (r.get('doygunluk') or 0) > 0.3 else 'koyu-notr'
                ek('palet', sinif)
            s = (e.get('ses') or {}).get('kesimde_ses_vurgusu_orani')
            if s is not None:
                tempo['sfx'].append(s)
        aj = os.path.join(vd, 'ritim', 'analiz.json')
        if os.path.isfile(aj):
            try:
                d = json.load(open(aj, encoding='utf-8'))
            except (ValueError, OSError):
                d = {}
            cs = d.get('cekimler') or []
            for c in cs:
                k = HAREKET_KAMERA.get(c.get('hareket'))
                if k:
                    ek('kamera', k, 1 / max(1, len(cs)))
            i30 = (d.get('istatistik') or {}).get('ilk30') or {}
            if i30.get('dakikada_kesim'):
                tempo['kesim_dk'].append(i30['dakikada_kesim'])
            if i30.get('sure_medyan'):
                tempo['medyan'].append(i30['sure_medyan'])
    oz = {e: _pay(v) for e, v in oz.items()}
    oz['tempo'] = {k: round(statistics.median(v), 2) for k, v in tempo.items() if v}
    return oz


def en_oran(kd):
    try:
        k = json.load(open(os.path.join(kd, 'kanal.json'), encoding='utf-8'))
        return max([float(v.get('oran') or 0) for v in k.get('videolar') or []] or [0])
    except (ValueError, OSError):
        return 0.0


def basari(kd):
    return 1 + math.log1p(max(0, en_oran(kd)))


def dizin_uret(kut):
    sd = _sd()
    kat, _ = font_katalog()
    kanallar = {}
    for kd in sorted(glob.glob(os.path.join(kut, 'kanallar', '*'))):
        if not os.path.isfile(os.path.join(kd, 'kanal.json')):
            continue
        oz = kanal_ozellik(kd, sd, kat)
        if not any(oz[e] for e in EKSENLER):
            continue
        kp, _ = sd.konu_bul(sd.kanal_metni(kd))
        kanallar[os.path.basename(kd)] = {'konu': {k: round(v, 3) for k, v in kp.items()}, 'ton': sd.ton_bul(sd.kanal_metni(kd))[0], 'agirlik': round(basari(kd), 3), 'oran': round(en_oran(kd), 2),
                                          **{e: {k: round(v, 4) for k, v in oz[e].items()} for e in EKSENLER}, 'tempo': oz['tempo']}
    eksen = {}
    for e in EKSENLER:
        genel, gw, konu, kw = {}, 0.0, {}, {}
        for h, k in kanallar.items():
            if not k[e]:
                continue
            w = k['agirlik']
            gw += w
            for x, p in k[e].items():
                genel[x] = genel.get(x, 0) + w * p
            for c, kv in k['konu'].items():
                kw[c] = kw.get(c, 0) + w * kv
                for x, p in k[e].items():
                    konu.setdefault(c, {})[x] = konu.setdefault(c, {}).get(x, 0) + w * kv * p
        eksen[e] = {'genel': {x: round(v / gw, 4) for x, v in sorted(genel.items(), key=lambda t: -t[1])} if gw else {},
                    'konu': {c: {x: round(v / kw[c], 4) for x, v in sorted(d.items(), key=lambda t: -t[1])} for c, d in konu.items() if kw.get(c)}}
    return {'olusturma': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'kanal_sayisi': len(kanallar), 'eksen': eksen, 'kanallar': kanallar}


class YoutubeDili:
    def __init__(self, d):
        self.d = d or {'eksen': {}, 'kanallar': {}, 'kanal_sayisi': 0}
        self.kp = {}
        self._setler = None
        self._fkat = None
        self._sd = None
        self._en, self._kanit = {}, {}

    @classmethod
    def yukle(cls, yol=DIZIN):
        try:
            return cls(json.load(open(yol, encoding='utf-8')))
        except (OSError, ValueError):
            return cls(None)

    @property
    def bos(self):
        return not self.d.get('kanal_sayisi')

    def konu(self, kp):
        self.kp = dict(kp or {})
        self._en, self._kanit = {}, {}
        return self

    def esle(self, eksen, oge):
        """repertuar ogesi -> olculen deger (eslenemezse None)"""
        if self._sd is None:
            self._sd = _sd()
        sd = self._sd
        if eksen == 'font':
            if self._setler is None:
                self._setler, self._fkat = font_setleri(), font_katalog()[1]
            return font_aile(self._fkat.get(self._setler.get(oge, '')))
        if eksen == 'gecis':
            return 'sert' if oge == 'sert' else ('flas' if str(oge).startswith('filmburn') else sd.GECIS_AILE.get(oge))
        if eksen == 'kamera':
            return oge if oge in set(HAREKET_KAMERA.values()) else None
        if eksen == 'cerceve':
            return oge if oge in set(sd.CERCEVE_RAKIP.values()) | {'tam'} else None
        if eksen == 'altyazi':
            return sd.ALTYAZI_AILE.get(oge)
        if eksen == 'palet':
            return sd.PALET_SINIF.get(oge)
        return None

    def pay(self, eksen, deger):
        E = (self.d.get('eksen') or {}).get(eksen) or {}
        g = (E.get('genel') or {}).get(deger, 0.0)
        kon = E.get('konu') or {}
        tw = sum(v for c, v in self.kp.items() if c in kon)
        if not tw:
            return g, None
        n = sum(v * kon[c].get(deger, 0.0) for c, v in self.kp.items() if c in kon) / tw
        return 0.65 * n + 0.35 * g, n

    def kanit(self, eksen, oge):
        """0..1: bu ogenin (eslendigi degerin) nis+genel YouTube kullanimi, eksendeki en yaygina gore"""
        if self.bos:
            return None
        anahtar = (eksen, oge)
        if anahtar in self._kanit:
            return self._kanit[anahtar]
        v = self.esle(eksen, oge)
        if v is None:
            self._kanit[anahtar] = None
            return None
        if eksen not in self._en:
            E = (self.d.get('eksen') or {}).get(eksen) or {}
            # secilemeyen degerler (tam ekran, sert kesim: oranlari iskeletten gelir) normalizasyona girmez
            hepsi = (set((E.get('genel') or {})) | {x for d in (E.get('konu') or {}).values() for x in d}) - SECILEMEZ
            self._en[eksen] = max([self.pay(eksen, x)[0] for x in hepsi] or [0]) or 1
        k = min(1.0, self.pay(eksen, v)[0] / self._en[eksen])
        self._kanit[anahtar] = k
        return k

    def carpan(self, eksen, oge):
        k = self.kanit(eksen, oge)
        if k is None:
            # olculemeyen oge: kanitli eksende hafif geri (0.85) — ozgunluk icin yasak degil; font/palet hep eslenir
            return 0.85 if (eksen in EKSENLER and not self.bos) else 1.0
        return 0.6 + 0.8 * k

    def neden(self, eksen, oge):
        v = self.esle(eksen, oge)
        if v is None or self.bos:
            return ''
        p, n = self.pay(eksen, v)
        return f"{v}: nis %{(n if n is not None else p) * 100:.0f}, genel %{self.pay_genel(eksen, v) * 100:.0f}"

    def pay_genel(self, eksen, v):
        return (((self.d.get('eksen') or {}).get(eksen) or {}).get('genel') or {}).get(v, 0.0)

    def en_yaygin(self, eksen, n=3):
        E = (self.d.get('eksen') or {}).get(eksen) or {}
        hepsi = set((E.get('genel') or {})) | {x for d in (E.get('konu') or {}).values() for x in d}
        return sorted(((x, self.pay(eksen, x)[0]) for x in hepsi), key=lambda t: -t[1])[:n]


def kutuphane(kok=None):
    for k in ([kok] if kok else []) + [os.environ.get('EDIT_KUTUPHANE'), r"G:\Drive'ım\edit kutuphane", r'G:\My Drive\edit kutuphane']:
        if k and os.path.isdir(os.path.join(k, 'kanallar')):
            return k
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--kok')
    ap.add_argument('--goster', choices=EKSENLER)
    ap.add_argument('--konu', default='')
    a = ap.parse_args()
    if a.goster:
        yt = YoutubeDili.yukle()
        kp = {k: 1.0 for k in a.konu.split(',') if k} if a.konu else {}
        yt.konu(kp)
        print(f"{a.goster} (kanal {yt.d.get('kanal_sayisi')}, konu {kp or 'genel'}):")
        for x, p in yt.en_yaygin(a.goster, 12):
            print(f'  {x:28} %{p * 100:.1f}')
        return
    kut = kutuphane(a.kok)
    if not kut:
        sys.exit('HATA: kutuphane bulunamadi (--kok)')
    d = dizin_uret(kut)
    json.dump(d, open(DIZIN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{d['kanal_sayisi']} kanal -> {DIZIN}")
    for e in EKSENLER:
        g = list(d['eksen'][e]['genel'].items())[:4]
        print(f"  {e:8} " + ', '.join(f'{x} %{p * 100:.0f}' for x, p in g))


if __name__ == '__main__':
    main()
