#!/usr/bin/env python3
"""Rakip kanallari GUNLUK takip eder: ne yayinladilar, ne tutuyor, neyi degistirdiler.

Kullanim:
  py rakip_takip.py --liste takip.txt [--klasor "C:/Users/<ad>/Documents/RAKIP-TAKIP"] [--adet 30] [--cerez cookies.txt]
  py rakip_takip.py @KanalA @KanalB ...
takip.txt: her satir "@handle<TAB>not" (# ile baslayan satir yorum).

Her calismada (gunde 1 kez yeterli; zamanlama: references/rakip-takip.md):
  - uzun video + Shorts sekmesinden son N video (duz liste: id, baslik, izlenme, sure)
  - yeni videolar icin tam bilgi: yayin zamani, aciklama, etiket, kapak
  - son 10 videonun kapagi indirilip md5 ile kiyaslanir -> KAPAK DEGISTI (A/B testi)
  - baslik degisimi -> BASLIK DEGISTI (A/B testi; eski ve yeni baslik yazilir)
  - izlenme gecmisi -> son calismadan beri artis, saatlik hiz, kanal medyanina oran (outlier)
  - yayin temposu ve saati, uzun/Shorts orani
Cikti: <klasor>/<handle>/durum.json (gecmis), <klasor>/<handle>/kapaklar/, <klasor>/RAPOR-YYYY-AA-GG.md
"""
import argparse, datetime as dt, hashlib, json, os, statistics, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rakip_indir as R


def utc(x):
    return dt.datetime.fromtimestamp(x, dt.timezone.utc)


def simdi():
    return int(time.time())


def duz_liste(kanal, sekme, adet):
    taban = R.kanal_url(kanal)
    if taban.endswith('/videos'):
        taban = taban[:-len('/videos')]
    url = f'{taban}/{sekme}'
    try:
        out = R.ytdlp('--flat-playlist', '--dump-json', '--playlist-end', str(adet), url)
    except RuntimeError as e:
        if 'does not have a' in str(e) or 'This channel does not have' in str(e):
            return []
        raise
    vs = []
    for s in out.splitlines():
        try:
            j = json.loads(s)
        except json.JSONDecodeError:
            continue
        vs.append({'id': j['id'], 'baslik': j.get('title') or '', 'izlenme': j.get('view_count'),
                   'sure': j.get('duration'), 'tur': 'short' if sekme == 'shorts' else 'uzun'})
    return vs


def tam_bilgi(vid):
    try:
        j = json.loads(R.ytdlp('--skip-download', '--dump-json', 'https://www.youtube.com/watch?v=' + vid))
    except Exception:
        return {}
    return {'yayin': j.get('timestamp'), 'aciklama': (j.get('description') or '')[:1500],
            'etiketler': j.get('tags') or [], 'dil': j.get('language'), 'sure': j.get('duration'),
            'begeni': j.get('like_count'), 'yorum': j.get('comment_count')}


def kapak_md5(vid, klasor):
    os.makedirs(klasor, exist_ok=True)
    for ad in ('maxresdefault', 'hqdefault'):
        try:
            with urllib.request.urlopen(f'https://i.ytimg.com/vi/{vid}/{ad}.jpg', timeout=20) as r:
                veri = r.read()
        except Exception:
            continue
        if len(veri) > 5000:
            md5 = hashlib.md5(veri).hexdigest()
            yol = os.path.join(klasor, f'{vid}-{md5[:8]}.jpg')
            if not os.path.exists(yol):
                with open(yol, 'wb') as f:
                    f.write(veri)
            return md5
    return None


BOS = set('the a an and or of to in on for with is are was how why what this that your you my i it its at by from vs '
          'der die das und ist ein eine mit von zu im den des'.split())


def anahtar(baslik):
    import re
    return {w for w in re.findall(r"[^\W\d_]{3,}", baslik.lower()) if w not in BOS and not w.startswith('#')}


def sure_yaz(s):
    if not s:
        return '?'
    s = int(s)
    return f'{s // 60}:{s % 60:02d}'


def kanal_isle(kanal, not_, kok, adet, bugun):
    ad = kanal.strip('/').split('/')[-1]
    kd = os.path.join(kok, ad)
    os.makedirs(kd, exist_ok=True)
    yol = os.path.join(kd, 'durum.json')
    d = json.load(open(yol, encoding='utf-8')) if os.path.exists(yol) else {'videolar': {}, 'calismalar': []}
    ilk_calisma = not d['calismalar']
    t = simdi()
    liste = duz_liste(kanal, 'videos', adet) + duz_liste(kanal, 'shorts', min(adet, 20))
    olay = {'yeni': [], 'baslik': [], 'kapak': [], 'hizli': []}
    for sira, v in enumerate(liste):
        k = d['videolar'].get(v['id'])
        if k is None:
            k = {'baslik': v['baslik'], 'tur': v['tur'], 'ilk_gorulme': t, 'izlenme': [], 'baslik_gecmis': [],
                 'kapak_md5': None, 'kapak_gecmis': []}
            k.update({x: y for x, y in tam_bilgi(v['id']).items() if y is not None})
            d['videolar'][v['id']] = k
            if not ilk_calisma:
                olay['yeni'].append(v['id'])
        elif v['baslik'] and v['baslik'] != k['baslik']:
            k['baslik_gecmis'].append([t, k['baslik']])
            olay['baslik'].append((v['id'], k['baslik'], v['baslik']))
            k['baslik'] = v['baslik']
        if v.get('sure') and not k.get('sure'):
            k['sure'] = v['sure']
        if v.get('izlenme') is not None:
            k['izlenme'].append([t, v['izlenme']])
        if v['tur'] == 'uzun' and sira < 10 or v['tur'] == 'short' and sira - len([x for x in liste if x['tur'] == 'uzun']) < 5:
            md5 = kapak_md5(v['id'], os.path.join(kd, 'kapaklar'))
            if md5 and k['kapak_md5'] and md5 != k['kapak_md5']:
                k['kapak_gecmis'].append([t, k['kapak_md5']])
                olay['kapak'].append(v['id'])
            if md5:
                k['kapak_md5'] = md5
    d['calismalar'].append(t)
    json.dump(d, open(yol, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return rapor(ad, kanal, not_, d, liste, olay, ilk_calisma, t)


def son_izlenme(k):
    return k['izlenme'][-1][1] if k['izlenme'] else None


def rapor(ad, kanal, not_, d, liste, olay, ilk, t):
    V = d['videolar']
    uzun = [x['id'] for x in liste if x['tur'] == 'uzun']
    short = [x['id'] for x in liste if x['tur'] == 'short']
    r = [f'## {kanal}' + (f' — {not_}' if not_ else '')]
    med = statistics.median([son_izlenme(V[i]) or 0 for i in uzun]) if uzun else 0
    r.append(f'- Son {len(uzun)} uzun video izlenme medyani {med:,.0f}; Shorts sekmesinde {len(short)} video')
    # tempo
    yay = sorted(V[i]['yayin'] for i in uzun if V[i].get('yayin'))
    if len(yay) >= 3:
        ar = [(b - a) / 86400 for a, b in zip(yay, yay[1:])]
        saat = [utc(x).hour for x in yay]
        r.append(f'- Yayin araligi medyan {statistics.median(ar):.1f} gun; son yayin '
                 f'{utc(yay[-1]):%Y-%m-%d %H:%M} UTC; en sik saat {max(set(saat), key=saat.count)}:00 UTC')
    if ilk:
        r.append('- Ilk calisma: taban kaydedildi (yarin degisimler gorunur).')
    for i in olay['yeni']:
        k = V[i]
        zaman = utc(k['yayin']).strftime('%Y-%m-%d %H:%M UTC') if k.get('yayin') else '?'
        r.append(f'- **YENI {k["tur"].upper()}**: "{k["baslik"]}" ({sure_yaz(k.get("sure"))}, {zaman}) '
                 f'https://youtu.be/{i}' + (f'\n  - etiketler: {", ".join(k["etiketler"][:12])}' if k.get('etiketler') else ''))
        # Short'ta test edilmis konu mu? (uzun videonun basligi, daha once yayinlanan bir Short'la kelime paylasiyor)
        if k['tur'] == 'uzun':
            kw = anahtar(k['baslik'])
            for j, s in V.items():
                if s['tur'] == 'short' and j != i and s.get('ilk_gorulme', 0) <= k.get('ilk_gorulme', 0):
                    o = len(kw & anahtar(s['baslik'])) / max(len(kw | anahtar(s['baslik'])), 1)
                    if o >= 0.25:
                        r.append(f'  - Once Short\'ta denenmis konu: "{s["baslik"]}" https://youtu.be/{j}')
        else:
            r.append('  - Yeni Short: rakipler konuyu cogu zaman once Short\'ta dener; 3-10 gun icinde uzun video gelirse rapor baglar')
    for i, eski, yeni in olay['baslik']:
        r.append(f'- **BASLIK DEGISTI** https://youtu.be/{i}: "{eski}" → "{yeni}"')
    for i in olay['kapak']:
        r.append(f'- **KAPAK DEGISTI** "{V[i]["baslik"]}" https://youtu.be/{i} (eski/yeni kapak: {ad}/kapaklar/{i}-*.jpg)')
    # hiz ve outlier
    hiz = []
    for i in uzun + short:
        k = V[i]
        iz = k['izlenme']
        if len(iz) >= 2 and iz[-1][0] > iz[-2][0]:
            artis = iz[-1][1] - iz[-2][1]
            if artis <= 0:
                continue
            saat = (iz[-1][0] - iz[-2][0]) / 3600
            hiz.append((artis / saat, artis, i))
    hiz.sort(reverse=True)
    for h, artis, i in hiz[:5]:
        k = V[i]
        oran = (son_izlenme(k) or 0) / med if med else 0
        r.append(f'- Hiz: "{k["baslik"]}" +{artis:,} ({h:,.0f}/saat), toplam {son_izlenme(k):,}'
                 + (f', medyanin {oran:.1f}x' if k['tur'] == 'uzun' else ' (Short)'))
    out = [(son_izlenme(V[i]) or 0) / med for i in uzun] if med else []
    adaylar = [(o, i) for o, i in zip(out, uzun) if o >= 2]
    for o, i in sorted(adaylar, reverse=True)[:3]:
        r.append(f'- Outlier {o:.1f}x: "{V[i]["baslik"]}" https://youtu.be/{i}')
    return r, hiz


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kanallar', nargs='*')
    ap.add_argument('--liste')
    ap.add_argument('--klasor', default=os.path.join(os.path.expanduser('~'), 'Documents', 'RAKIP-TAKIP'))
    ap.add_argument('--adet', type=int, default=30)
    ap.add_argument('--cerez')
    a = ap.parse_args()
    if a.cerez:
        R.EK.extend(['--cookies', a.cerez, '--sleep-requests', '1'])
    giris = [(k, '') for k in a.kanallar]
    if a.liste:
        for s in open(a.liste, encoding='utf-8-sig'):
            s = s.strip()
            if s and not s.startswith('#'):
                p = s.split('\t')
                giris.append((p[0].strip(), p[1].strip() if len(p) > 1 else ''))
    if not giris:
        sys.exit('kanal yok: @handle ver ya da --liste')
    os.makedirs(a.klasor, exist_ok=True)
    bugun = dt.date.today().isoformat()
    bolum, tum_hiz, hata = [], [], []
    for k, n in giris:
        print('takip', k, file=sys.stderr)
        try:
            r, hiz = kanal_isle(k, n, a.klasor, a.adet, bugun)
            bolum += r + ['']
            tum_hiz += [(h, k, i) for h, _, i in hiz]
        except Exception as e:
            hata.append(f'- {k}: {str(e)[-300:]}')
    yol = os.path.join(a.klasor, f'RAPOR-{bugun}.md')
    with open(yol, 'w', encoding='utf-8-sig') as f:
        f.write(f'# Rakip takip raporu {bugun}\n\n')
        if tum_hiz:
            f.write('## Bugun en hizli yukselenler (konu fikri havuzu)\n')
            for h, k, i in sorted(tum_hiz, reverse=True)[:8]:
                f.write(f'- {k}: {h:,.0f}/saat https://youtu.be/{i}\n')
            f.write('\n')
        f.write('\n'.join(bolum))
        if hata:
            f.write('\n## Hatalar\n' + '\n'.join(hata) + '\n')
    print(yol)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
