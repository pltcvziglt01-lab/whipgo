#!/usr/bin/env python3
"""KAPAK KUTUPHANESI — edit kutuphanesindeki (ya da verilen) kanallarin en populer kapaklarini toplar, olcer, profillenecek hale getirir.
Amac: Claude'a kapak DILI ogretmek (yazi miktari/yeri, ozne, renk, grafik oge, tiklama psikolojisi) -> ozgun kapak uretimi.
Kapaklar yalniz incelemek icindir; hicbir kapak kopyalanmaz ya da videoda kullanilmaz.

Kullanim:
  py kapak_kutuphane.py kanal @Handle [--adet 12]          # tek kanal: kapaklar + olcum + KAPAK-SAYFA.jpg
  py kapak_kutuphane.py parti --adet-kanal 10 [--adet 12]   # edit kutuphanesinden siradaki 10 kanal (durum.txt olmayanlar)
  py kapak_kutuphane.py parti --adet-kanal 0 --parca 2/4    # HEPSI, 4 paralel iscinin 2'ncisi (kanal kilidi: durum.txt 'isleniyor')
  py kapak_kutuphane.py indeks                              # tum profilli kanallardan _indeks/kapak-dili.json (konu/etiket bazinda)
  py kapak_kutuphane.py durum                               # kac kanal: olculdu / profilli (bitti) / bekliyor

Klasor (Drive): <KAPAK>/kanallar/@X/
  kapak-01.jpg ...      en populer N videonun kapagi (maxres > sd > hq), izlenmeye gore sirali
  kapaklar.json         kanal (ad, url, etiket, ortalama izlenme) + her kapak: id, baslik, izlenme, oran (kanal medyanina), tarih,
                        olcum (kapak_metrik: parlaklik, kontrast, doygunluk, renklilik, sicak/soguk, baskin renkler, 3x3 ayrinti,
                        sol/orta/sag agirlik) + yazi (OCR: metin, kelime, yazi alani %, en buyuk harf yuksekligi %, 3x3 konum)
  KAPAK-SAYFA.jpg       4x3 kontakt sayfasi (izlenme, oran, baslik) — profil yazan alt model YALNIZ bunu + kapaklar.json'u okur
  KAPAK-DILI.md         profil (alt model yazar; sablon: <KAPAK>/README.md)
  durum.txt             olculdu <tarih> | bitti <tarih> <kim>
<KAPAK> = G:/Drive'im/kapak kutuphanesi (ya da KAPAK_KUTUPHANE ortam degiskeni). Kanal listesi edit kutuphanesinden okunur.
Gerekli: yt-dlp, numpy, pillow, rapidocr.
"""
import argparse, datetime, glob, json, os, re, statistics, sys

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
import rakip_indir as RI      # ytdlp, kanal_url, kapak_indir
import kapak_metrik as KM     # olc

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass


def kapak_kok():
    for a in [os.environ.get('KAPAK_KUTUPHANE'), r"G:\Drive'ım\kapak kutuphanesi", r"G:\My Drive\kapak kutuphanesi",
              *glob.glob(r"G:\.shortcut-targets-by-id\*\kapak kutuphanesi")]:
        if a and os.path.isdir(a):
            return a
    sys.exit('kapak kutuphanesi bulunamadi (KAPAK_KUTUPHANE ayarla)')


def edit_kok():
    for a in [os.environ.get('EDIT_KUTUPHANE'), r"G:\Drive'ım\edit kutuphane", r"G:\My Drive\edit kutuphane"]:
        if a and os.path.isdir(os.path.join(a, 'kanallar')):
            return a
    return None


def jy(y, vars=None):
    try:
        return json.load(open(y, encoding='utf-8'))
    except Exception:
        return vars


def bugun():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M')


# ---------------------------------------------------------------- OCR
_MOTOR = None


def ocr(yol):
    """kapakta yazi: metin, kelime sayisi, yazi alani (% goruntu), en buyuk harf yuksekligi (% goruntu yuksekligi), 3x3 konum"""
    global _MOTOR
    import numpy as np
    from PIL import Image
    if _MOTOR is None:
        try:
            from rapidocr import RapidOCR
            try:
                _MOTOR = RapidOCR(params={'Global.use_cls': False})
            except Exception:
                _MOTOR = RapidOCR()
        except ImportError:
            from rapidocr_onnxruntime import RapidOCR
            _MOTOR = RapidOCR()
    im = Image.open(yol).convert('RGB')
    w, h = im.size
    if w > 1280:
        im = im.resize((1280, int(1280 * h / w)))
        w, h = im.size
    r = _MOTOR(np.asarray(im)[:, :, ::-1])
    if isinstance(r, tuple):
        kutular = [(np.array(b), t, float(s)) for b, t, s in (r[0] or [])]
    elif r is None or getattr(r, 'boxes', None) is None:
        kutular = []
    else:
        kutular = [(np.array(b), t, float(s)) for b, t, s in zip(r.boxes, r.txts, r.scores)]
    kutular = [(b, t.strip(), s) for b, t, s in kutular if s >= 0.6 and len(t.strip()) >= 2]
    alan, yuk, izgara, satir = 0.0, 0.0, [[0] * 3 for _ in range(3)], []
    for b, t, s in kutular:
        x0, y0 = b.min(0)
        x1, y1 = b.max(0)
        alan += (x1 - x0) * (y1 - y0)
        yuk = max(yuk, (y1 - y0) / h)
        cx, cy = (x0 + x1) / 2 / w, (y0 + y1) / 2 / h
        izgara[min(2, int(cy * 3))][min(2, int(cx * 3))] += 1
        satir.append(t)
    metin = ' | '.join(satir)
    return {'metin': metin, 'kelime': len(re.findall(r'\w+', metin)), 'satir': len(satir),
            'alan_yuzde': round(float(100 * alan / (w * h)), 1), 'en_buyuk_harf_yuzde': round(float(100 * yuk), 1), 'konum_3x3': izgara}


# ---------------------------------------------------------------- kontakt sayfasi
def sayfa(klasor, kapaklar, ad):
    from PIL import Image, ImageDraw
    K, W, H, B = 4, 480, 270, 46
    n = len(kapaklar)
    satir = (n + K - 1) // K
    out = Image.new('RGB', (K * W, satir * (H + B) + 50), (18, 18, 22))
    d = ImageDraw.Draw(out)
    f, fb = KM.font(17), KM.font(26)
    d.text((10, 10), f'{ad} — en populer {n} kapak (izlenme, kanal medyanina oran)', fill=(240, 240, 240), font=fb)
    for i, k in enumerate(kapaklar):
        x, y = (i % K) * W, 50 + (i // K) * (H + B)
        try:
            im = Image.open(os.path.join(klasor, k['dosya'])).convert('RGB').resize((W, H))
            out.paste(im, (x, y))
        except Exception:
            continue
        # numara kapagin USTUNE konmaz (yazinin ilk harflerini kapatiyordu): alt bilgi seridinde
        izl = k.get('izlenme') or 0
        d.text((x + 6, y + H + 3), f"{i + 1:02d}", fill=(255, 255, 255), font=f)
        d.text((x + 40, y + H + 3), f"{izl / 1e6:.1f}M" if izl >= 1e6 else f"{izl / 1e3:.0f}K", fill=(255, 220, 0), font=f)
        d.text((x + 104, y + H + 3), f"x{k.get('oran', 0):.1f}", fill=(140, 220, 140), font=f)
        d.text((x + 6, y + H + 23), (k.get('baslik') or '')[:52], fill=(220, 220, 220), font=f)
    out.save(os.path.join(klasor, 'KAPAK-SAYFA.jpg'), quality=88)


# ---------------------------------------------------------------- kanal
def kanal_bilgi(handle):
    """edit kutuphanesindeki kanal.json (url, etiket, not) — yoksa yalniz handle"""
    ek = edit_kok()
    k = jy(os.path.join(ek, 'kanallar', handle, 'kanal.json'), {}) if ek else {}
    return {'ad': k.get('ad') or handle, 'url': k.get('url') or RI.kanal_url(handle), 'etiket': k.get('etiket'), 'not': k.get('not')}


def kanal_isle(handle, adet=12, son=200, en_az_sn=61, zorla=False):
    kok = kapak_kok()
    kl = os.path.join(kok, 'kanallar', handle)
    os.makedirs(kl, exist_ok=True)
    dt = os.path.join(kl, 'durum.txt')
    if os.path.exists(dt) and not zorla and not bayat_kilit(dt):
        print(f'{handle}: atlandi ({open(dt, encoding="utf-8").read().strip()})')
        return True
    open(dt, 'w', encoding='utf-8').write(f'isleniyor {bugun()}\n')    # paralel isciler ayni kanali almasin
    ok = _kanal_isle(handle, kl, dt, adet, son, en_az_sn)
    if not ok:
        open(dt, 'w', encoding='utf-8').write(f'hata {bugun()}\n')       # parti --tekrar ile yeniden denenir
    return ok


def bayat_kilit(dt, saat=2):
    """'isleniyor' kaydi 2 saatten eskiyse (isci coktu) kanal yeniden alinabilir"""
    try:
        w = open(dt, encoding='utf-8').read().split()
        if w and w[0] == 'isleniyor':
            t = datetime.datetime.strptime(' '.join(w[1:3]), '%Y-%m-%d %H:%M')
            return (datetime.datetime.now() - t).total_seconds() > saat * 3600
    except Exception:
        pass
    return False


def _kanal_isle(handle, kl, dt, adet, son, en_az_sn):
    bilgi = kanal_bilgi(handle)
    try:
        liste = json.loads(RI.ytdlp('--flat-playlist', '-J', '--playlist-end', str(son), RI.kanal_url(bilgi['url'])))
    except RuntimeError as h:
        print(f'{handle}: HATA liste: {str(h)[-200:]}')
        return False
    og = [e for e in liste.get('entries', []) if e and e.get('id') and e.get('view_count') is not None
          and (e.get('duration') or 999) >= en_az_sn]
    if len(og) < 3:
        # yeni kanallarda --flat-playlist izlenmeyi bos verir (rakip_indir ile ayni yedek): ilk 30 video tek tek
        ham = [e for e in liste.get('entries', []) if e and e.get('id')][:30]
        for e in ham:
            try:
                dd = json.loads(RI.ytdlp('-J', '--skip-download', f"https://www.youtube.com/watch?v={e['id']}"))
                e['view_count'], e['duration'] = dd.get('view_count'), dd.get('duration') or e.get('duration')
                e['title'], e['upload_date'] = dd.get('title') or e.get('title'), dd.get('upload_date')
            except RuntimeError:
                pass
        og = [e for e in ham if e.get('view_count') is not None and (e.get('duration') or 999) >= en_az_sn]
    if len(og) < 3:
        print(f'{handle}: HATA izlenme bilgisi gelmedi ({len(og)} video)')
        return False
    medyan = statistics.median(e['view_count'] for e in og)
    secim = sorted(og, key=lambda e: e['view_count'], reverse=True)[:adet]
    kapaklar = []
    for i, e in enumerate(secim, 1):
        dosya = f'kapak-{i:02d}.jpg'
        y = os.path.join(kl, dosya)
        boy = RI.kapak_indir(e['id'], y)
        if not boy:
            continue
        k = {'dosya': dosya, 'id': e['id'], 'baslik': e.get('title'), 'izlenme': e['view_count'],
             'oran': round(e['view_count'] / medyan, 2) if medyan else None, 'tarih': e.get('upload_date'), 'cozunurluk': boy}
        try:
            k['olcum'] = {x: v for x, v in KM.olc(y).items() if x != 'dosya'}
        except Exception as h:
            k['olcum_hata'] = str(h)[:120]
        try:
            k['yazi'] = ocr(y)
        except Exception as h:
            k['yazi_hata'] = str(h)[:120]
        kapaklar.append(k)
    if not kapaklar:
        print(f'{handle}: HATA kapak inmedi')
        return False
    ozet = ozet_cikar(kapaklar)
    json.dump({'kanal': {**bilgi, 'handle': handle, 'video_sayisi': len(og), 'medyan_izlenme': medyan},
               'olcum_tarihi': bugun(), 'ozet': ozet, 'kapaklar': kapaklar},
              open(os.path.join(kl, 'kapaklar.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sayfa(kl, kapaklar, handle)
    open(dt, 'w', encoding='utf-8').write(f'olculdu {bugun()}\n')
    print(f"{handle}: {len(kapaklar)} kapak · yazi medyan {ozet['kelime_medyan']} kelime, alan %{ozet['yazi_alan_medyan']} · "
          f"parlaklik {ozet['parlaklik_medyan']} · renklilik {ozet['renklilik_medyan']} · etiket {bilgi.get('etiket') or '-'}")
    return True


def ozet_cikar(kapaklar):
    def med(f):
        x = [f(k) for k in kapaklar]
        x = [v for v in x if v is not None]
        return round(statistics.median(x), 1) if x else None
    yazili = [k for k in kapaklar if (k.get('yazi') or {}).get('kelime', 0) > 0]
    return {'adet': len(kapaklar), 'yazili_oran': round(len(yazili) / len(kapaklar), 2),
            'kelime_medyan': med(lambda k: (k.get('yazi') or {}).get('kelime')),
            'yazi_alan_medyan': med(lambda k: (k.get('yazi') or {}).get('alan_yuzde')),
            'harf_yuksekligi_medyan': med(lambda k: (k.get('yazi') or {}).get('en_buyuk_harf_yuzde')),
            'parlaklik_medyan': med(lambda k: (k.get('olcum') or {}).get('parlaklik')),
            'kontrast_medyan': med(lambda k: (k.get('olcum') or {}).get('kontrast')),
            'doygunluk_medyan': med(lambda k: (k.get('olcum') or {}).get('doygunluk')),
            'renklilik_medyan': med(lambda k: (k.get('olcum') or {}).get('renklilik')),
            'sicak_medyan': med(lambda k: (k.get('olcum') or {}).get('sicak_yuzde'))}


def parti(adet_kanal, adet, parca='1/1', tekrar=False):
    """adet_kanal 0 = hepsi. parca 'i/M': M paralel iscinin i'ncisi (bekleyen listesi i-1, i-1+M, ... ile bolunur; kanal
    basinda 'isleniyor' kilidi yazilir). tekrar: 'hata' durumundaki kanallari da al."""
    ek = edit_kok()
    if not ek:
        sys.exit('edit kutuphanesi yok: kanal listesi okunamadi')
    kok = kapak_kok()

    def bekliyor(h):
        dt = os.path.join(kok, 'kanallar', h, 'durum.txt')
        if not os.path.exists(dt):
            return True
        w = open(dt, encoding='utf-8').read().split()[:1]
        return (tekrar and w == ['hata']) or bayat_kilit(dt)
    bekleyen = [os.path.basename(k) for k in sorted(glob.glob(os.path.join(ek, 'kanallar', '@*'))) if bekliyor(os.path.basename(k))]
    i, m = (int(x) for x in parca.split('/'))
    bekleyen = bekleyen[i - 1::m]
    sec = bekleyen[:adet_kanal] if adet_kanal else bekleyen
    print(f'parti: {len(sec)} kanal (bekleyen {len(bekleyen)}): {", ".join(sec)}')
    tamam = [h for h in sec if kanal_isle(h, adet)]
    print(f'BITTI parti: {len(tamam)}/{len(sec)} olculdu')


# ---------------------------------------------------------------- indeks
TEKNIK_RE = re.compile(r'^\s*[-*]?\s*\**teknikler\**\s*:\s*(.+)$', re.I | re.M)


def konu_cikar(d):
    """kanal konusu: kapak basliklari + edit kutuphanesi etiketi/notu -> stil_dna konu sozlugu (motorla ayni ad: deniz, askeri, finans...)"""
    try:
        import stil_dna
    except Exception:
        return None
    metin = ' '.join((k.get('baslik') or '') for k in d.get('kapaklar', [])) + ' ' + (d['kanal'].get('etiket') or '') + ' ' + (d['kanal'].get('not') or '')
    kp, _ = stil_dna.konu_bul(metin)
    return next(iter(kp), None) if kp else None


def indeks():
    """profilli kanallar (KAPAK-DILI.md 'Teknikler:' satiri) + olcum ozetleri -> _indeks/kapak-dili.json; 'etiket' = konu (basliklardan)
    {kanallar: {@X: {etiket, ozet, teknikler}}, etiket: {etiket: {kanal, teknik_sayim, ozet_medyan}}, teknik: {ad: [kanallar]}}"""
    kok = kapak_kok()
    K, E, T = {}, {}, {}
    for kl in sorted(glob.glob(os.path.join(kok, 'kanallar', '@*'))):
        h = os.path.basename(kl)
        d = jy(os.path.join(kl, 'kapaklar.json'))
        if not d:
            continue
        tek = []
        md = os.path.join(kl, 'KAPAK-DILI.md')
        if os.path.exists(md):
            m = TEKNIK_RE.search(open(md, encoding='utf-8').read())
            if m:
                tek = [x.strip().strip('`').lower() for x in re.split(r'[,;]', m.group(1)) if x.strip()]
        konu = None
        if os.path.exists(md):
            mk = re.search(r'^\s*Konu\s*:\s*([a-z, ]+)$', open(md, encoding='utf-8').read(), re.M)
            konu = mk.group(1).split(',')[0].strip() if mk else None
        konu = konu or konu_cikar(d)
        et = konu or d['kanal'].get('etiket') or 'etiketsiz'
        K[h] = {'etiket': et, 'kanal_etiket': d['kanal'].get('etiket'), 'konu': konu, 'ozet': d['ozet'], 'teknikler': tek, 'profil': os.path.exists(md)}
        e = E.setdefault(et, {'kanal': [], 'teknik_sayim': {}, 'ozetler': []})
        e['kanal'].append(h)
        e['ozetler'].append(d['ozet'])
        for t in tek:
            e['teknik_sayim'][t] = e['teknik_sayim'].get(t, 0) + 1
            T.setdefault(t, []).append(h)
    for e in E.values():
        oz = e.pop('ozetler')
        e['ozet_medyan'] = {x: round(statistics.median([o[x] for o in oz if o.get(x) is not None]), 1)
                            for x in oz[0] if isinstance(oz[0].get(x), (int, float)) and any(o.get(x) is not None for o in oz)}
    os.makedirs(os.path.join(kok, '_indeks'), exist_ok=True)
    yol = os.path.join(kok, '_indeks', 'kapak-dili.json')
    json.dump({'tarih': bugun(), 'kanallar': K, 'etiket': E, 'teknik': T}, open(yol, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'indeks: {len(K)} kanal ({sum(1 for k in K.values() if k["profil"])} profilli), {len(T)} teknik -> {yol}')


def durum():
    kok = kapak_kok()
    s = {'olculdu': 0, 'bitti': 0, 'isleniyor': 0, 'hata': 0}
    for dt in glob.glob(os.path.join(kok, 'kanallar', '@*', 'durum.txt')):
        w = open(dt, encoding='utf-8').read().split()[:1]
        if w and w[0] in s:
            s[w[0]] += 1
    ek = edit_kok()
    top = len(glob.glob(os.path.join(ek, 'kanallar', '@*'))) if ek else 0
    print(f"kapak kutuphanesi: {s['bitti']} profilli, {s['olculdu']} olculdu (profil bekliyor), {s['isleniyor']} isleniyor, "
          f"{s['hata']} hata; edit kutuphanesinde {top} kanal")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    alt = ap.add_subparsers(dest='k', required=True)
    k = alt.add_parser('kanal'); k.add_argument('handle'); k.add_argument('--adet', type=int, default=12); k.add_argument('--zorla', action='store_true')
    p = alt.add_parser('parti'); p.add_argument('--adet-kanal', type=int, default=10, help='0 = hepsi'); p.add_argument('--adet', type=int, default=12)
    p.add_argument('--parca', default='1/1', help='paralel isci: i/M (ornek 4 isci: 1/4 2/4 3/4 4/4)'); p.add_argument('--tekrar', action='store_true', help='hata durumundakileri de al')
    alt.add_parser('indeks')
    alt.add_parser('durum')
    alt.add_parser('sayfa-yenile', help='olculmus tum kanallarin KAPAK-SAYFA.jpg dosyasini kapaklar.json uzerinden yeniden ciz (ag yok)')
    a = ap.parse_args()
    if a.k == 'kanal':
        sys.exit(0 if kanal_isle(a.handle, a.adet, zorla=a.zorla) else 1)
    elif a.k == 'parti':
        parti(a.adet_kanal, a.adet, a.parca, a.tekrar)
    elif a.k == 'indeks':
        indeks()
    elif a.k == 'sayfa-yenile':
        n = 0
        for kl in sorted(glob.glob(os.path.join(kapak_kok(), 'kanallar', '@*'))):
            d = jy(os.path.join(kl, 'kapaklar.json'))
            if d:
                sayfa(kl, d['kapaklar'], os.path.basename(kl))
                n += 1
        print(f'{n} kontakt sayfasi yenilendi')
    else:
        durum()


if __name__ == '__main__':
    main()
