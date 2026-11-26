#!/usr/bin/env python3
"""SAHNE KURUCU — kurgu plani + kelime zamanlari -> props.json (ortak repertuar/VideoDna.tsx'in girdisi). Elle props yazilmaz.
Kullanim:
  py sahne_kur.py kurgu.json [--cikti motion/src/v05/props.json] [--rakip <kutuphane>/kanallar/@Rakip/video-1 ...] [--denetimsiz]
Akis: capalar kelimelere oturur -> kesimler kelime basina yapisir (0,06 sn once) -> uzun medya bolumleri rakibin medyan
cekim suresine gore bolunur (kesim yine kelime basinda) -> kareler kaymasiz yuvarlanir -> kaynak klip suresi asilmaz ->
props-ham.json -> kurgu_denetim.py --duzelt (yazi okuma suresi, yazi-ses senkronu; toplam sure sabit) -> props.json.
Cikis kodu: denetim FAIL birakirsa 1 (props.json yine yazilir; KURGU-DENETIM.md'deki kalan maddeleri metinle coz).

kurgu.json:
{
 "klasor": "v05", "fps": 30,
 "dna": "stil-dna.json",                       # stil_dna.py ciktisi (kurgu.json'a gore goreli ya da mutlak)
 "kelimeler": "kelimeler.json",                # [{k,bas,son}] | {"kelimeler":[...]} | WhisperX {"segments":[{"words":[{word,start,end}]}]}
 "ses_sure": 512.3,                            # istege bagli; yoksa son kelime + 0,6 sn
 "public": "../../public",                     # istege bagli: kaynak klip surelerini olcmek icin public klasoru
 "bolumler": [                                 # anlati sirasiyla; her bolum bir sonrakinin capasina kadar surer
   {"capa": "we start four months ago",        # metindeki ifade (ya da "bas_kelime": 12 / "bas": 4.2 sn)
    "tag": "mar_fulpost", "kb": 3.0,           # kaynak: public/<klasor>/kaynak/<tag>.mp4, kb = klipte baslangic sn
    "tags": ["a", "b"],                        # istege bagli: uzun bolum bolunurken sirayla kullanilacak kaynaklar
    "src": "v05/foto/x.jpg", "video": false,   # istege bagli: dogrudan dosya (foto/klip)
    "kart": {"tur": "kelime|sayi|alinti", "a": "...", "b": "..."}, "etiket": "ALT BANT", "flas": false,
    "ai": true,                                # AI gorsel -> kosede AI etiketi (ILLUSTRATION / SYMBOLBILD / TEMSILI)
    "kunye": "Video : X (CC BY)",              # istege bagli elle kunye; false = bu bolumde kunye yok
    "odak": [0.3, 0.2, 0.3, 0.6]}              # istege bagli: konunun kutusu (0..1) -> alt bant kisi-karti penceresi konuya oturur
 ],
 "dil": "fr",                                  # istege bagli: videonun dili -> dna.dil (sayi bicimi 4 000 / 1,5) + kunye dili
 "kunye": {"dil": "fr", "ai": "ILLUSTRATION"}  # istege bagli: her medya cekiminin sag alt kosesine kaynak kunyesi
}                                              # (KAYNAKCA.tsv: YouTube kanal + lisans; credits.json: yazar + lisans) ve AI etiketi
Kunye yalniz plan "kunye" verirse yazilir (eski kanallarin plani degismez). AI gorsel: bolumde "ai": true ya da src yolunda /ai/.
"""
import argparse, json, math, os, re, subprocess, sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
BURASI = os.path.dirname(os.path.abspath(__file__))
ONCE = 0.06       # kesim kelimenin baslangicindan bu kadar once
EN_AZ = 0.6       # bolunmus cekim en az (sn)


def jy(y):
    return json.load(open(y, encoding='utf-8'))


def kelimeleri_oku(d):
    if isinstance(d, dict) and 'segments' in d:
        out = []
        for s in d['segments']:
            for w in s.get('words') or []:
                if 'start' in w and 'end' in w:
                    out.append({'k': w.get('word', '').strip(), 'bas': float(w['start']), 'son': float(w['end'])})
        return out
    if isinstance(d, dict):
        d = d.get('kelimeler') or d.get('words') or []
    return [{'k': w.get('k') or w.get('word') or w.get('text') or '', 'bas': float(w.get('bas', w.get('start'))), 'son': float(w.get('son', w.get('end')))} for w in d]


def norm(s):
    s = (s or '').lower().replace('’', "'")
    s = re.sub(r'(?<=\d)[,.](?=\d{3}\b)', '', s)
    return re.findall(r"[a-zà-ÿ0-9äöüßğışç']+", s)


def capa_bul(capa, kel, bas_i):
    """ifadenin ilk 1-4 kelimesini bas_i'den itibaren ara -> kelime indeksi"""
    hedef = norm(capa)
    if not hedef:
        return None
    toks = [norm(w['k']) for w in kel]
    flat = [(t[0] if t else '') for t in toks]
    for n in (min(4, len(hedef)), 3, 2, 1):
        h = hedef[:n]
        for i in range(bas_i, len(flat) - n + 1):
            if flat[i:i + n] == h:
                return i
    return None


def klip_suresi(yol):
    if not yol or not os.path.exists(yol):
        return None
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', yol], capture_output=True, text=True)
    try:
        return float(r.stdout.strip().split(',')[0])
    except ValueError:
        return None


def hedef_medyan(rakip, dna):
    xs = []
    for k in rakip or []:
        a = os.path.join(k, 'ritim', 'analiz.json') if os.path.isdir(k) else k
        if os.path.exists(a):
            cs = [c['sure'] for c in jy(a).get('cekimler') or [] if c.get('sure')]
            if cs:
                xs.append(sorted(cs)[len(cs) // 2])
    if xs:
        return sorted(xs)[len(xs) // 2], 'rakip'
    isk = (dna or {}).get('iskelet') or {}
    if isk.get('genel_medyan_sn'):
        return float(isk['genel_medyan_sn']), 'dna'
    return 2.6, 'varsayilan'


AI_ETIKET = {'fr': 'ILLUSTRATION', 'en': 'ILLUSTRATION', 'de': 'SYMBOLBILD', 'tr': 'TEMSİLÎ', 'ja': 'イメージ', 'es': 'ILUSTRACIÓN'}
KUNYE_SOZ = {'fr': ('Vidéo : ', 'Photo : '), 'en': ('Video: ', 'Photo: '), 'de': ('Video: ', 'Foto: '), 'tr': ('Video: ', 'Fotoğraf: '),
             'es': ('Vídeo: ', 'Foto: '), 'ja': ('映像：', '写真：')}


def kunye_haritasi(kaynak_dir, klasor, dil):
    """public/<klasor>/kaynak/ altindaki KAYNAKCA.tsv (YouTube) + credits.json (Commons/Openverse/web) -> {tag|src: kunye}"""
    v, f = KUNYE_SOZ.get(dil, KUNYE_SOZ['en'])
    out = {}
    tsv = os.path.join(kaynak_dir, 'KAYNAKCA.tsv')
    if os.path.exists(tsv):
        import csv
        for r in csv.DictReader(open(tsv, encoding='utf-8-sig', newline=''), delimiter='\t'):
            ad, kanal = (r.get('dosya') or '').strip(), (r.get('kanal') or '').strip()
            if not ad or not kanal:
                continue
            lis = 'CC BY' if (r.get('lisans') or '').upper().startswith('CC BY') else ''
            metin = (v if not re.search(r'\.(jpe?g|png|webp)$', ad, re.I) else f) + kanal + (f' ({lis})' if lis else '')
            kok_ad = os.path.splitext(os.path.basename(ad))[0]
            out[kok_ad] = out[f'{klasor}/kaynak/{os.path.basename(ad)}'] = metin
    cj = os.path.join(kaynak_dir, 'credits.json')
    if os.path.exists(cj):
        for c in jy(cj):
            yazar = re.sub(r'\s+', ' ', str(c.get('yazar') or '')).strip()
            if not yazar or yazar == 'bilinmiyor':
                yazar = c.get('kaynak') or ''
            yer = 'Wikimedia Commons' if 'ikimedia' in str(c.get('kaynak', '')) else ''
            lis = c.get('lisans') or ''
            metin = (v if c.get('tur') == 'video' else f) + yazar[:48] + (f' / {yer}' if yer and yer not in yazar else '') + (f' ({lis})' if lis and lis != 'Public domain' else '')
            if c.get('src'):
                out[c['src']] = metin
            if c.get('tag'):
                out[c['tag']] = metin
    return out


def kur(plan, kok, rakip):
    uyar = []
    fps = int(plan.get('fps', 30))
    yol = lambda p: p if os.path.isabs(p) else os.path.normpath(os.path.join(kok, p))
    dna = jy(yol(plan['dna'])) if isinstance(plan.get('dna'), str) else plan.get('dna')
    if not dna:
        raise SystemExit('HATA: dna yok (stil_dna.py ciktisi gerekli)')
    if plan.get('dil') and not dna.get('dil'):
        dna = dict(dna, dil=plan['dil'])   # sayi kartlari videonun dilinde (fr: 4 000 / 1,5)
    kel = kelimeleri_oku(jy(yol(plan['kelimeler'])) if isinstance(plan.get('kelimeler'), str) else plan.get('kelimeler') or [])
    if not kel:
        raise SystemExit('HATA: kelime zamanlari yok (WhisperX ciktisi gerekli)')
    kel.sort(key=lambda w: w['bas'])
    ses_sure = float(plan.get('ses_sure') or (kel[-1]['son'] + 0.6))
    med, kaynak = hedef_medyan(rakip, dna)
    bol = plan['bolumler']
    # 1) capalar -> baslangic zamanlari
    bas_t, son_i = [], 0
    for j, b in enumerate(bol):
        if j == 0:
            bas_t.append(0.0)
            continue
        if 'bas' in b:
            t = float(b['bas'])
        else:
            i = b.get('bas_kelime')
            if i is None:
                i = capa_bul(b.get('capa', ''), kel, son_i)
                if i is None:
                    raise SystemExit(f"HATA: bolum {j} capasi bulunamadi: \"{b.get('capa')}\" (kelime #{son_i}'den sonra)")
            son_i = i
            t = kel[i]['bas'] - ONCE
        if t <= bas_t[-1] + 0.2:
            raise SystemExit(f'HATA: bolum {j} bir oncekinden once/ayni anda basliyor ({t:.2f} sn) — capa sirasini kontrol et')
        bas_t.append(t)
    bitis = bas_t[1:] + [ses_sure]
    # 2) uzun medya bolumlerini kelime sinirlarinda bol
    starts = [w['bas'] - ONCE for w in kel]
    cekim = []   # (bas, son, bolum, alt_sira)
    for j, (a, z) in enumerate(zip(bas_t, bitis)):
        b = bol[j]
        uzun = max(3.0, med * 1.8)
        if b.get('kart') or z - a <= uzun:
            cekim.append((a, z, j, 0))
            continue
        n = max(2, round((z - a) / med))
        kesim = [a]
        for k in range(1, n):
            ideal = a + (z - a) * k / n
            aday = [s for s in starts if kesim[-1] + EN_AZ <= s <= z - EN_AZ]
            if not aday:
                break
            s = min(aday, key=lambda x: abs(x - ideal))
            if abs(s - ideal) < (z - a) / n * 0.5:
                kesim.append(s)
        kesim.append(z)
        for k, (x, y) in enumerate(zip(kesim, kesim[1:])):
            cekim.append((x, y, j, k))
    # 3) kareler (kaymasiz) + kaynak
    pub = yol(plan['public']) if plan.get('public') else None
    kun = None
    if plan.get('kunye'):
        ka = plan['kunye'] if isinstance(plan['kunye'], dict) else {}
        dil = ka.get('dil') or plan.get('dil') or 'en'
        kun = {'ai': ka.get('ai') or AI_ETIKET.get(dil, 'ILLUSTRATION'),
               'harita': kunye_haritasi(os.path.join(pub, plan['klasor'], 'kaynak'), plan['klasor'], dil) if pub else {}}
        if not pub:
            uyar.append('kunye: "public" yok -> yalniz AI etiketi ve elle kunye yazilir')
    sure_onbellek = {}
    out = []
    for (a, z, j, k) in cekim:
        b = bol[j]
        kare = round(z * fps) - round(a * fps)
        if kare <= 0:
            continue
        tags = b.get('tags') or [b.get('tag')]
        tag = tags[k % len(tags)]
        # ayni kaynak bolunduyse kb ileri atlar (gorunur jump cut); farkli kaynakta bastan
        kb = float(b.get('kb', 0)) + (sum(y - x for (x, y, jj, kk) in cekim if jj == j and kk < k) + 1.0 * k if len(tags) == 1 else 0)
        c = {'kare': kare, 'tag': tag, 'kb': round(kb, 3), 'kart': b.get('kart') if k == 0 else None, 'etiket': b.get('etiket') if k == 0 else None, 'flas': bool(b.get('flas')) and k == 0}
        if b.get('src'):
            c['src'] = b['src']
        if b.get('odak') and k == 0:
            c['odak'] = b['odak']   # [x, y, w, h] 0..1: konu (kisi-karti penceresi, odak-karartma, nesne-dalisi)
        if kun is not None and b.get('kunye') is not False:
            kn = b.get('kunye') or (kun['ai'] if b.get('ai') or '/ai/' in str(b.get('src') or '') else kun['harita'].get(b.get('src') or tag))
            if kn:
                c['kunye'] = kn
        if 'video' in b:
            c['video'] = bool(b['video'])
        if pub and not b.get('src') and tag:
            yk = os.path.join(pub, plan['klasor'], 'kaynak', f'{tag}.mp4')
            if yk not in sure_onbellek:
                sure_onbellek[yk] = klip_suresi(yk)
            ks = sure_onbellek[yk]
            if ks is None:
                uyar.append(f"kaynak yok: {yk}")
            elif c['kb'] + kare / fps > ks:
                yeni = max(0.0, ks - kare / fps)
                uyar.append(f"#{len(out)} '{tag}': kb {c['kb']:.1f} + {kare / fps:.1f} sn > klip {ks:.1f} sn -> kb {yeni:.1f}" + (' (klip cekimden kisa: son kare donar)' if ks < kare / fps else ''))
                c['kb'] = round(yeni, 3)
        out.append(c)
    toplam = sum(c['kare'] for c in out)
    props = {'dna': dna, 'veri': {'klasor': plan['klasor'], 'fps': fps, 'toplam': toplam, 'cekimler': out, 'kelimeler': kel}}
    return props, uyar, (med, kaynak)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kurgu')
    ap.add_argument('--cikti')
    ap.add_argument('--rakip', nargs='*', default=[])
    ap.add_argument('--denetimsiz', action='store_true')
    a = ap.parse_args()
    plan = jy(a.kurgu)
    kok = os.path.dirname(os.path.abspath(a.kurgu))
    props, uyar, (med, kaynak) = kur(plan, kok, a.rakip)
    cikti = a.cikti or os.path.join(kok, 'props.json')
    ham = os.path.splitext(cikti)[0] + '-ham.json'
    json.dump(props, open(ham, 'w', encoding='utf-8'), ensure_ascii=False)
    v = props['veri']
    print(f"sahne: {len(plan['bolumler'])} bolum -> {len(v['cekimler'])} cekim, {v['toplam']} kare ({v['toplam'] / v['fps']:.1f} sn); hedef medyan {med:.2f} sn ({kaynak})")
    for u in uyar:
        print('  UYARI', u)
    if a.denetimsiz:
        json.dump(props, open(cikti, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'-> {cikti} (denetimsiz)')
        return
    rapor = os.path.join(os.path.dirname(cikti), 'KURGU-DENETIM.md')
    cmd = [sys.executable, '-I', os.path.join(BURASI, 'kurgu_denetim.py'), '--plan', ham, '--duzelt', cikti, '--cikti', rapor] + (['--rakip'] + a.rakip if a.rakip else [])
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    print(r.stdout.strip())
    if r.returncode not in (0, 1):
        print(r.stderr[-1500:])
        sys.exit(2)
    print(f'-> {cikti} | denetim raporu {rapor}')
    sys.exit(r.returncode)


if __name__ == '__main__':
    main()
