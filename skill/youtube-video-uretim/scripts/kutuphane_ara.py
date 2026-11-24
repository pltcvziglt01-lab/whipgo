#!/usr/bin/env python3
"""Kutuphane indeksi ve arama — token harcamadan "hangi kanal ne yapiyor" sorusu.

Butun kanallar/*/kanal.json dosyalarini okur; her kanal icin 3 videonun medyanini cikarir:
  ilk30 medyan cekim sn, kesim/dk, yumusak gecis orani, en sik 3 gecis, baskin duzen, altyazi (var/kelime/ekran,
  buyuk harf, vurgulu), SFX orani, parlaklik/doygunluk, etiket, en iyi oran (outlier), durum.
Ciktilar: _indeks/INDEKS.md (insan) + _indeks/indeks.tsv (filtre icin). Ortak dosya kurali: _indeks/ yalniz bu betikle
yazilir ve her calismada bastan uretilir (elle duzenlenmez).

Kullanim:
  py kutuphane_ara.py                                  # indeksi yeniden uret
  py kutuphane_ara.py --ritim 2.5 --tolerans 0.3       # ilk 30 sn medyan cekimi 2,5 sn +-%30 olan kanallar
  py kutuphane_ara.py --gecis cozunme --duzen cerceveli --altyazi var --etiket edit
"""
import sys, argparse, glob, json, os, statistics

def _kok_bul():
    """kutuphane kok klasoru: EDIT_KUTUPHANE > betigin ust klasoru (kutuphane/_araclar) > bilinen Drive yollari."""
    import glob as _g
    ust = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for a in [os.environ.get('EDIT_KUTUPHANE'), ust, r"G:\Drive'ım\edit kutuphane", r"G:\My Drive\edit kutuphane",
              *_g.glob(r"G:\.shortcut-targets-by-id\*\edit kutuphane")]:
        if a and os.path.isdir(os.path.join(a, 'kanallar')):
            return a
    sys.exit('HATA: edit kutuphanesi bulunamadi. EDIT_KUTUPHANE ortam degiskenini ayarla.')


KOK = _kok_bul()


def med(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return round(statistics.median(xs), 2) if xs else None


def satir(k):
    v = k.get('videolar') or []
    i30 = [x.get('ilk30') or {} for x in v]
    gec = {}
    for x in v:
        for t, o in ((x.get('gecis') or {}).get('dagilim') or {}).items():
            gec[t] = gec.get(t, 0) + o / max(1, len(v))
    duz = {}
    for x in v:
        for t, o in (x.get('duzen') or {}).items():
            duz[t] = duz.get(t, 0) + o / max(1, len(v))
    # Gercek yakilmis altyazi surekli akar (dakikada onlarca oge). Seyrek 'altyazi' ogeleri (konusmayla eslesen tek kelimelik
    # orta-ekran kartlari) altyazi DEGILDIR (2026-11-17: ilk 9 kanalin hepsi <=6/dk, orta-orta). Esik: 8 oge/dk.
    hiz = []
    for x in v:
        try:
            e = json.load(open(os.path.join(KOK, 'kanallar', k.get('ad', ''), f"video-{x.get('video')}", 'editdili', 'edit-dili.json'),
                               encoding='utf-8'))
            sure = max(1e-6, (e['analiz_aralik_sn'][1] - e['analiz_aralik_sn'][0]) / 60)
            hiz.append(round(e['yazi'].get('altyazi_ogesi', 0) / sure, 1))
        except Exception:
            hiz.append(None)
    alt = [x.get('altyazi') for x, h in zip(v, hiz) if x.get('altyazi') and (h is None or h >= 8)]
    seyrek = [h for x, h in zip(v, hiz) if x.get('altyazi') and h is not None and h < 8]
    durum = ''
    p = os.path.join(KOK, 'kanallar', k.get('ad', ''), 'durum.txt')
    if os.path.exists(p):
        durum = open(p, encoding='utf-8').read().split()[0]
    return {
        'kanal': k.get('ad'), 'etiket': k.get('etiket') or '', 'durum': durum,
        'en_iyi_oran': max([x.get('oran') or 0 for x in v] or [0]),
        'ilk30_medyan_sn': med([x.get('medyan_sn') for x in i30]),
        'ilk30_kesim_dk': med([x.get('kesim_dk') for x in i30]),
        'yumusak_orani': med([(x.get('gecis') or {}).get('yumusak_gecis_orani') for x in v]),
        'gecisler': ', '.join(f'{t} {o:.0%}' for t, o in sorted(gec.items(), key=lambda a: -a[1])[:3]),
        'duzen': ', '.join(f'{t} {o:.0%}' for t, o in sorted(duz.items(), key=lambda a: -a[1])[:2]),
        'altyazi': (f"var {len(alt)}/{len(v)} · {med([a.get('kelime_ekran_medyan') for a in alt])} kel · "
                    f"BH {med([a.get('buyuk_harf_orani') for a in alt])} · vurgu {med([a.get('vurgulu_kelime_olasi') for a in alt])}") if alt
                   else (f"yok (seyrek kelime karti {max(seyrek)}/dk)" if seyrek else 'yok'),
        'sfx': med([(x.get('ses') or {}).get('kesimde_ses_vurgusu_orani') for x in v]),
        'parlaklik': med([(x.get('renk') or {}).get('parlaklik') for x in v]),
        'doygunluk': med([(x.get('renk') or {}).get('doygunluk') for x in v]),
        'not': (k.get('not') or '')[:40],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ritim', type=float)
    ap.add_argument('--tolerans', type=float, default=0.3)
    ap.add_argument('--gecis')
    ap.add_argument('--duzen')
    ap.add_argument('--altyazi', choices=['var', 'yok'])
    ap.add_argument('--etiket')
    a = ap.parse_args()
    satirlar = []
    for p in glob.glob(os.path.join(KOK, 'kanallar', '*', 'kanal.json')):
        try:
            satirlar.append(satir(json.load(open(p, encoding='utf-8'))))
        except Exception as h:
            print('okunamadi', p, h)
    satirlar.sort(key=lambda s: (s['ilk30_medyan_sn'] is None, s['ilk30_medyan_sn'] or 0))
    os.makedirs(os.path.join(KOK, '_indeks'), exist_ok=True)
    alanlar = list(satirlar[0].keys()) if satirlar else []
    with open(os.path.join(KOK, '_indeks', 'indeks.tsv'), 'w', encoding='utf-8') as f:
        f.write('\t'.join(alanlar) + '\n')
        for s in satirlar:
            f.write('\t'.join(str(s[k]) for k in alanlar) + '\n')
    with open(os.path.join(KOK, '_indeks', 'INDEKS.md'), 'w', encoding='utf-8') as f:
        f.write(f'# Kutuphane indeksi ({len(satirlar)} kanal) — kutuphane_ara.py uretir, elle duzenleme\n\n')
        f.write('| ' + ' | '.join(alanlar) + ' |\n|' + '---|' * len(alanlar) + '\n')
        for s in satirlar:
            f.write('| ' + ' | '.join(str(s[k]) for k in alanlar) + ' |\n')
    sec = satirlar
    if a.ritim:
        sec = [s for s in sec if s['ilk30_medyan_sn'] and abs(s['ilk30_medyan_sn'] - a.ritim) <= a.ritim * a.tolerans]
    if a.gecis:
        sec = [s for s in sec if a.gecis in s['gecisler']]
    if a.duzen:
        sec = [s for s in sec if a.duzen in s['duzen']]
    if a.altyazi:
        sec = [s for s in sec if s['altyazi'].startswith(a.altyazi)]
    if a.etiket:
        sec = [s for s in sec if a.etiket in s['etiket']]
    for s in sec:
        print(f"{s['kanal']:32s} ritim {s['ilk30_medyan_sn']}s | {s['gecisler']} | {s['duzen']} | alt {s['altyazi']} | sfx {s['sfx']} | oran {s['en_iyi_oran']}")
    print(f'{len(sec)}/{len(satirlar)} kanal · indeks: _indeks/INDEKS.md')


if __name__ == '__main__':
    main()
