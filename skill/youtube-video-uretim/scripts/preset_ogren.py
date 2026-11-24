#!/usr/bin/env python3
"""PRESET OGREN — Premiere Pro .prfpset (XML) dosyasindaki hareket presetlerinin "dilini" cikarir:
hangi parametre (olcek, konum, donme, opaklik, bulaniklik...), hangi degerler arasinda, kac sn'de, hangi egriyle.
Cikti Remotion'da `PresetHareket` bileseniyle oynatilir (repertuar/Preset.tsx). Premiere gerekmez.

Kullanim:
  py preset_ogren.py "<paket>.prfpset" --cikti preset-dili.json [--filtre Zoom Shake Slide]
Not: cikti, paketin turetilmis hali sayilir -> lisans geregi YALNIZ kullanicinin makinesinde kalir
(GitHub'a / paylasilan Drive'a konmaz). Kod (bu betik + Preset.tsx) serbesttir.
"""
import argparse, json, re, sys
import xml.etree.ElementTree as ET

TICK = 254016000000  # Premiere: 1 sn = 254016000000 tick

def oku(yol):
    kok = ET.parse(yol).getroot()
    nesne = {el.get('ObjectID'): el for el in kok if el.get('ObjectID')}
    return kok, nesne

def ref(el, yol):
    x = el.find(yol)
    return x.get('ObjectRef') if x is not None else None

def kf_coz(s):
    """'tick,deger,interp,...;...' -> [(sn, deger, egri)]  deger 'x:y' ise [x, y]"""
    out = []
    for p in s.strip().strip(';').split(';'):
        a = p.split(',')
        if len(a) < 2:
            continue
        t = int(a[0]) / TICK
        v = a[1]
        v = [float(x) for x in v.split(':')] if ':' in v else float(v.rstrip('.') or 0) if re.match(r'^-?[\d.e+-]+$', v) else v
        # alan 2-7: enterpolasyon tipi ve bezier etkileri (in/out); egriyi kaba siniflandir
        tip = a[2] if len(a) > 2 else '0'
        etk = [float(x) for x in a[5:8] if re.match(r'^-?[\d.]+$', x)] if len(a) > 7 else []
        out.append([round(t, 4), v, {'tip': tip, 'etki': etk}])
    if out:
        t0 = out[0][0]
        for o in out:
            o[0] = round(o[0] - t0, 4)
    return out

def parametreler(nesne, comp_id):
    c = nesne.get(comp_id)
    if c is None:
        return None, {}
    ad = (c.findtext('Component/InstanceName') or c.findtext('Component/DisplayName') or '').strip()
    mn = c.findtext('MatchName') or ''
    ps = {}
    for pr in c.findall('Component/Params/Param'):
        p = nesne.get(pr.get('ObjectRef'))
        if p is None:
            continue
        isim = (p.findtext('Name') or '').strip()
        k = p.findtext('Keyframes') or ''
        if k.strip() and (p.findtext('IsTimeVarying') or '') == 'true':
            ps[isim] = kf_coz(k)
        elif p.findtext('StartKeyframeValue') and k.strip():
            ps[isim] = kf_coz(k)
    return {'efekt': mn, 'ad': ad}, ps

def gez(nesne, oid, yol, out):
    el = nesne.get(oid)
    if el is None:
        return
    tag = el.tag
    if tag == 'BinTreeItem':
        ad = el.findtext('TreeItemBase/Name') or ''
        for it in el.findall('Items/Item'):
            gez(nesne, it.get('ObjectRef'), yol + [ad], out)
        return
    # yaprak: ad TreeItemBase'te, preset FilterPresetItem uzerinden
    ad = el.findtext('TreeItemBase/Name') or el.findtext('Name') or ''
    fpi = ref(el, 'FilterPresetItem') or ref(el, 'Item')
    hedef = nesne.get(fpi) if fpi else el
    if hedef is None or hedef.tag != 'FilterPresetItem':
        hedef = el if el.tag == 'FilterPresetItem' else None
        if hedef is None:
            for ch in el.iter():
                r = ch.get('ObjectRef')
                if r and nesne.get(r) is not None and nesne[r].tag == 'FilterPresetItem':
                    hedef = nesne[r]
                    break
    if hedef is None:
        return
    efektler = []
    sure = 0
    for fp in hedef.findall('FilterPresets/FilterPreset'):
        f = nesne.get(fp.get('ObjectRef'))
        if f is None:
            continue
        out_pt = int(f.findtext('AnchorOutPoint') or 0) / TICK
        sure = max(sure, out_pt)
        bil, ps = parametreler(nesne, ref(f, 'Component'))
        if ps:
            efektler.append({**bil, 'param': ps})
    if efektler:
        out.append({'yol': ' / '.join(x for x in yol[3:] if x), 'ad': ad, 'sure_sn': round(sure, 3), 'efektler': efektler})

def kimlik(paket, p):
    """kararli kisa kimlik: paket-kisa/kategori/ad -> 'u500/zoom-snappy-zoom-zoom-in/01-center'"""
    def slug(x):
        x = re.sub(r'^\d+\.\s*', '', x.strip().lower())
        x = x.replace('&amp;', 've').replace('&', 've')
        return re.sub(r'[^a-z0-9]+', '-', x).strip('-')
    pk = 'u500' if 'ultimate' in paket.lower() else 'bonus' if 'bonus' in paket.lower() else 'free'
    kat = '-'.join(slug(y) for y in p['yol'].split(' / ') if y)
    return f"{pk}/{kat}/{slug(p['ad'])}"

# ---------------- Remotion'a derleme ----------------
# Premiere anahtar karesi: [sn, deger, {tip, etki:[gelen_etki, hiz, giden_etki]}]  (etki 0..1, hiz deger/sn)
# Iki kare arasi parca -> cubic-bezier(x1,y1,x2,y2): x1 = giden_etki(i), x2 = 1 - gelen_etki(i+1); y hizdan.
IZ = {'Position': 'konum', 'Scale Height': 'olcek', 'Scale': 'olcek', 'Uniform Scale': 'olcek', 'Scale Width': 'olcek_x',
      'Rotation': 'donme', 'Opacity': 'opaklik', 'Blurriness': 'bulanik'}

def bezier(k0, k1):
    dt = max(1e-4, k1[0] - k0[0])
    v0 = k0[1][0] if isinstance(k0[1], list) else k0[1]
    v1 = k1[1][0] if isinstance(k1[1], list) else k1[1]
    if isinstance(k0[1], list) and isinstance(k1[1], list):
        dv0 = max(abs(k1[1][0] - k0[1][0]), abs(k1[1][1] - k0[1][1]))
    else:
        dv0 = abs((v1 or 0) - (v0 or 0))
    e0 = (k0[2]['etki'] + [0.33, 0, 0.33])[:3]
    e1 = (k1[2]['etki'] + [0.33, 0, 0.33])[:3]
    if k0[2]['tip'] in ('0', '4') and not any(e0):  # dogrusal
        return [0, 0, 1, 1]
    x1, x2 = min(1, max(0.01, e0[2])), 1 - min(1, max(0.01, e1[0]))
    y1 = x1 * (e0[1] * dt / dv0) if dv0 > 1e-6 else 0
    y2 = 1 - (1 - x2) * (e1[1] * dt / dv0) if dv0 > 1e-6 else 1
    return [round(x1, 3), round(max(-1.5, min(2.5, y1)), 3), round(x2, 3), round(max(-1.5, min(2.5, y2)), 3)]

def derle(p):
    izler = {}
    for e in p['efektler']:
        for isim, kf in e['param'].items():
            iz = IZ.get(isim)
            if not iz or len(kf) < 2 or not all(isinstance(k[1], (int, float, list)) for k in kf):
                continue
            if iz in izler:  # ayni iz iki efektte: ilkini tut (Motion + Transform nadiren birlikte)
                continue
            izler[iz] = {'k': [[k[0], k[1]] for k in kf], 'e': [bezier(kf[i], kf[i + 1]) for i in range(len(kf) - 1)]}
    if not izler:
        return None
    son = max(v['k'][-1][0] for v in izler.values())
    yol = p['yol'].lower()
    sinif = ('zoom' if 'zoom' in yol else 'sarsinti' if 'shake' in yol else 'kayma' if 'slide' in yol else 'gecis' if 'transition' in yol
             else 'yazi' if 'text' in yol or 'caption' in yol else 'kamera' if 'pan' in yol else 'diger')
    return {'ad': p['ad'], 'yol': p['yol'], 'sinif': sinif, 'sure': round(son, 3), 'iz': izler}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('paket')
    ap.add_argument('--cikti', default='preset-dili.json')
    ap.add_argument('--filtre', nargs='*', default=[])
    a = ap.parse_args()
    kok, nesne = oku(a.paket)
    agac = kok.find('Tree')
    rid = ref(nesne[kok.find('Tree').get('ObjectRef')], 'RootBin') if agac is not None else None
    out = []
    gez(nesne, rid, [], out)
    if a.filtre:
        out = [p for p in out if any(f.lower() in (p['yol'] + ' ' + p['ad']).lower() for f in a.filtre)]
    json.dump(out, open(a.cikti, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    d = [x for x in (derle(p) for p in out) if x]
    yol2 = a.cikti.replace('.json', '-remotion.json')
    json.dump(d, open(yol2, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(d)} preset Remotion bicimine derlendi -> {yol2}')
    from collections import Counter
    print(f'{len(out)} preset (zamanla degisen parametreli) -> {a.cikti}')
    print(Counter(p['yol'] for p in out).most_common(40))

if __name__ == '__main__':
    main()
