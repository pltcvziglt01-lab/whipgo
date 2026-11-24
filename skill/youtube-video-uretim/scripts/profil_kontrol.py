#!/usr/bin/env python3
"""EDIT-DILI.md profil kontrolu (token harcamaz). Her 'olculdu' kanal icin:
  - EDIT-DILI.md var mi, sablonun 6 bolumu (## 1. .. ## 6.) var mi
  - kanal.json'daki ana sayilar metinde geciyor mu (ilk30 cekim, kesim/dk, medyan sn, oran, yumusak gecis medyan ms)
  - teknikler/*/gozlem-<@handle>.md en az 1 dosya
Gecerse --bitir ile durum.txt = 'bitti <tarih> <kim>' yazar. Kalanlari listeler.

Kullanim:
  py profil_kontrol.py --liste            # olculdu (profil bekleyen) kanallar, satir basina bir ad
  py profil_kontrol.py --kontrol [--bitir --kim polat-claude]
"""
import sys, argparse, datetime, glob, json, os, re

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


def durum(k):
    p = os.path.join(KOK, 'kanallar', k, 'durum.txt')
    return open(p, encoding='utf-8').read().strip() if os.path.exists(p) else ''


def sayi_var(metin, x):
    if x is None:
        return True
    adaylar = {f'{x}', f'{x:g}' if isinstance(x, float) else f'{x}'}
    if isinstance(x, float):
        adaylar |= {f'{x:.1f}', f'{x:.2f}', f'{x:.0f}', f'{x:.1f}'.replace('.', ','), f'{x:.2f}'.replace('.', ',')}
    return any(re.search(r'(?<![\d.,])' + re.escape(a) + r'(?![\d])', metin) for a in adaylar)


def kontrol(k):
    d = os.path.join(KOK, 'kanallar', k)
    md = os.path.join(d, 'EDIT-DILI.md')
    if not os.path.exists(md):
        return ['EDIT-DILI.md yok']
    t = open(md, encoding='utf-8').read()
    eksik = [f'bolum {i}' for i in range(1, 7) if not re.search(rf'^## {i}\.', t, re.M)]
    try:
        kj = json.load(open(os.path.join(d, 'kanal.json'), encoding='utf-8'))
        v = kj['videolar'][0]
        i30 = v.get('ilk30') or {}
        # kucuk tamsayilar metinde baska yerde de gecer: cekim sayisi 'N cekim', sert orani '%N'/'N%' olarak aranir
        n = i30.get('cekim')
        if n is not None and not re.search(rf'(?<![\d.,]){n}\s*(çekim|cekim)', t):
            eksik.append(f'ilk30 "{n} çekim" metinde yok')
        sert = ((v.get('gecis') or {}).get('dagilim') or {}).get('sert')
        if sert is not None:
            p = round(sert * 100)
            if not re.search(rf'(%\s*{p}(?![\d])|(?<![\d.,]){p}\s*%)', t):
                eksik.append(f'sert %{p} metinde yok')
        for ad, x in (('kesim/dk', i30.get('kesim_dk')), ('medyan sn', i30.get('medyan_sn')),
                      ('oran', v.get('oran')), ('yumusak ms', (v.get('gecis') or {}).get('yumusak_medyan_ms'))):
            if not sayi_var(t, x):
                eksik.append(f'{ad}={x} metinde yok')
    except Exception as h:
        eksik.append(f'kanal.json okunamadi: {h}')
    if not glob.glob(os.path.join(KOK, 'teknikler', '*', f'gozlem-{k}.md')):
        eksik.append('teknik gozlem dosyasi yok')
    return eksik


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--liste', action='store_true')
    ap.add_argument('--kontrol', action='store_true')
    ap.add_argument('--bitir', action='store_true')
    ap.add_argument('--kim', default='polat-claude')
    a = ap.parse_args()
    bekleyen = sorted(k for k in os.listdir(os.path.join(KOK, 'kanallar')) if durum(k).startswith('olculdu'))
    if a.liste:
        print('\n'.join(bekleyen))
        return
    if a.kontrol:
        for k in bekleyen:
            if not os.path.exists(os.path.join(KOK, 'kanallar', k, 'EDIT-DILI.md')):
                continue
            e = kontrol(k)
            if not e and a.bitir:
                open(os.path.join(KOK, 'kanallar', k, 'durum.txt'), 'w', encoding='utf-8').write(
                    f"bitti {datetime.datetime.now():%Y-%m-%d %H:%M} {a.kim}\n")
            print(f"{k}: {'TAMAM' + (' -> bitti' if a.bitir else '') if not e else 'EKSIK: ' + '; '.join(e)}")


if __name__ == '__main__':
    main()
