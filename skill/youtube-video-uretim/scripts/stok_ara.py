#!/usr/bin/env python3
"""STOK ARA — lisansli GERCEK gorsel/video avi: Wikimedia Commons + Openverse (anahtarsiz API) + web sayfasi.
Yalniz ticari kullanima uygun lisans: kamu mali (PD / PDM / "no known restrictions"), CC0, CC BY, CC BY-SA. NC, ND, GFDL-yalniz YOK.
Akis: ara (onizleme indirir, tekrar eler, en kucuk genislik suzgeci) -> kontakt (numarali sayfa; Claude bakar) -> sec (tam boy indirir,
credits.json + ATIF.txt) -> kurgu.json'da "src": "<vNN>/kaynak/<ad>.jpg" ya da "tag": "<ad>" (video).

Kullanim (--klasor = Remotion public/<vNN>; ciktilar <klasor>/kaynak/):
  py stok_ara.py ara "<sorgu>" [--sorgu "<ikinci sorgu>" ...] --klasor motion/public/v05 [--tur gorsel|video] [--adet 24]
        [--min-genislik 1280] [--kaynak commons,openverse]
  py stok_ara.py sayfa <url> [<url> ...] --klasor ... [--cdp 9334]   web arastirmasinda bulunan sayfadaki medya; lisans sayfada
        acikca yazmiyorsa INDIRILMEZ (listelenir). --cdp: JS ile yuklenen sayfa otomasyon Chrome'unda (ayri profil) acilip okunur
  py stok_ara.py kontakt --klasor ...                      numarali kontakt sayfalari: kaynak/_aday/KONTAKT-N.jpg (YUZ? = yuz algilandi)
  py stok_ara.py sec 3,7,12 --klasor ... [--ad kazi,migfer,ucak] [--bas 4 --son 14]   (video: aralik; yoksa ilk --en-uzun sn)
  py stok_ara.py atif --klasor ... [--dil en|de|tr]        credits.json + YouTube KAYNAKCA.tsv -> ATIF.txt (aciklamaya)
  py stok_ara.py temizle --klasor ...                      kaynak/_aday/ (onizlemeler) silinir; secilenler ve credits kalir
Kurallar: references/kaynak-avi.md. Insan yuzu / yazi / logo kurali kontakt sayfasinda gozle uygulanir (YUZ? isareti yardimcidir).
Fikir kaynagi: vidbucks media_hunt.py (MIT); kod bizim.
"""
import argparse, datetime, glob, html, io, json, os, re, shutil, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
from PIL import Image, ImageDraw, ImageFont, ImageOps

Image.MAX_IMAGE_PIXELS = 400_000_000
UA = 'stok-ara/1.0 (licensed media research for video production; python-urllib)'
COMMONS = 'https://commons.wikimedia.org/w/api.php'
OPENVERSE = 'https://api.openverse.org/v1/images/'
EN_BUYUK_BAYT = 80 * 1024 * 1024
GORSEL_UZ = ('.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff')
VIDEO_UZ = ('.mp4', '.webm', '.ogv', '.mov', '.m4v')
LISANS_AD = {'pd': 'Public domain', 'cc0': 'CC0', 'by': 'CC BY', 'by-sa': 'CC BY-SA'}


# ---------------------------------------------------------------- ag
_SON_ISTEK = {}
ARALIK = {'upload.wikimedia.org': 1.2, 'thumb.wikimedia.org': 1.2, 'commons.wikimedia.org': 0.5, 'api.openverse.org': 0.5}


def al(url, json_mi=False, deneme=4, sinir=EN_BUYUK_BAYT):
    host = urllib.parse.urlparse(url).netloc
    for i in range(deneme):
        # Wikimedia ani yuklemede 429 verir (olculdu: ~40 kucuk resim art arda) -> host basina en az ARALIK sn
        bekle = ARALIK.get(host, 0) - (time.time() - _SON_ISTEK.get(host, 0))
        if bekle > 0:
            time.sleep(bekle)
        _SON_ISTEK[host] = time.time()
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60)
            uzun = int(r.headers.get('Content-Length') or 0)
            if uzun > sinir:
                raise ValueError(f'dosya cok buyuk ({uzun / 1e6:.0f} MB)')
            veri = r.read(sinir + 1)
            if len(veri) > sinir:
                raise ValueError('dosya cok buyuk')
            return json.loads(veri) if json_mi else veri
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < deneme - 1:
                try:
                    ra = float(e.headers.get('Retry-After') or 0)
                except (TypeError, ValueError):
                    ra = 0
                time.sleep(min(60, max(ra, (10 if e.code == 429 else 4) * (i + 1))))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if i < deneme - 1:
                time.sleep(2 * (i + 1))
                continue
            raise


def temiz_html(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def lisans_coz(*parca):
    """serbest metin/kod/url -> 'pd' | 'cc0' | 'by' | 'by-sa' | None (NC/ND/GFDL-yalniz/belirsiz)"""
    s = ' '.join(p for p in parca if p).lower()
    if not s.strip():
        return None
    if re.search(r'(\bnc\b|-nc\b|non-?commercial|\bnd\b|-nd\b|no-?deriv|noderiv)', s):
        return None
    if re.search(r'\bcc0\b|publicdomain/zero', s):
        return 'cc0'
    if re.search(r'by-sa|by sa|attribution-share ?alike|sharealike', s):
        return 'by-sa'
    if re.search(r'cc[- ]by\b|cc-by-\d|/licenses/by/|creative commons attribution(?! non)', s):
        return 'by'
    if re.search(r'public ?domain|\bpdm\b|publicdomain/mark|(^|[\s|])pd($|[\s\-|])|no known (copyright )?restrictions', s):
        return 'pd'
    return None


WM_ADIM = (500, 960, 1280, 1920, 3840)   # Wikimedia yalniz bu kucuk resim genisliklerini verir (mediawiki.org/wiki/Common_thumbnail_sizes)


def wm_kucuk(url, w):
    """upload.wikimedia.org orijinal -> standart <w>px kucuk resim (thumb.wikimedia.org). Orijinal dosya istegi ve standart disi
    genislik 429 alir (olculdu 2026-11-24: "use thumbnail images in sizes listed on w.wiki/GHai")"""
    m = re.match(r'https://upload\.wikimedia\.org/wikipedia/commons/(\w/\w\w)/([^/?#]+)', url or '')
    if not m:
        return None
    ad = m.group(2)
    son = f'{w}px-{ad}' + ('.jpg' if ad.lower().endswith(('.tif', '.tiff', '.pdf')) else '')
    return f'https://thumb.wikimedia.org/wikipedia/commons/thumb/{m.group(1)}/{ad}/{son}'


# ---------------------------------------------------------------- aday deposu
def yollar(klasor):
    k = os.path.abspath(klasor)
    return {'klasor': k, 'kaynak': os.path.join(k, 'kaynak'), 'aday': os.path.join(k, 'kaynak', '_aday'),
            'on': os.path.join(k, 'kaynak', '_aday', 'on'), 'liste': os.path.join(k, 'kaynak', '_aday', 'adaylar.json'),
            'credits': os.path.join(k, 'kaynak', 'credits.json'), 'atif': os.path.join(k, 'kaynak', 'ATIF.txt')}


def oku(yol, bos):
    try:
        return json.load(open(yol, encoding='utf-8'))
    except (OSError, ValueError):
        return bos


def yaz(yol, veri):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    tmp = yol + '.tmp'
    json.dump(veri, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    os.replace(tmp, yol)


def dhash(img):
    g = img.convert('L').resize((9, 8), Image.LANCZOS)
    p = list(g.tobytes())
    return sum(1 << i for i in range(64) if p[(i // 8) * 9 + i % 8] > p[(i // 8) * 9 + i % 8 + 1])


def yuz_say(img):
    try:
        import cv2, numpy as np
    except ImportError:
        return None
    # OpenCV 5'te Haar cascade cekirdekten cikti (contrib); yoksa algilama atlanir, kural kontakt sayfasinda gozle uygulanir
    if not hasattr(cv2, 'CascadeClassifier') or not hasattr(cv2, 'data'):
        return None
    g = np.array(img.convert('L'))
    yol = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
    c = cv2.CascadeClassifier(yol)
    en = max(24, int(min(g.shape) * 0.07))
    return len(c.detectMultiScale(g, scaleFactor=1.1, minNeighbors=6, minSize=(en, en)))


def anahtar(a):
    """ayni dosyayi farkli kaynaktan tanimak icin: commons pageid / curid, normalize url, baslik"""
    k = set()
    if a.get('pageid'):
        k.add(f"wm:{a['pageid']}")
    m = re.search(r'curid=(\d+)', a.get('sayfa') or '')
    if m:
        k.add(f'wm:{m.group(1)}')
    # web sayfasindan gelen adaylarda sayfa adresi anahtar degil (bir sayfada birden cok medya)
    for u in (a.get('indir_url'), None if str(a.get('sorgu', '')).startswith('sayfa:') else a.get('sayfa')):
        if u:
            k.add(urllib.parse.unquote(u).split('?')[0].lower().replace('http://', 'https://'))
    return k


def aday_ekle(depo, y, yeni, min_genislik):
    """onizleme indir, boyut/lisans/tekrar suz, numara ver -> eklenen sayi"""
    os.makedirs(y['on'], exist_ok=True)
    gorulen = set()
    hashler = []
    for a in depo['adaylar'] + depo.get('elenen_secilmis', []):
        gorulen |= anahtar(a) if a.get('no') else set(a.get('anahtar') or [])
        if a.get('hash') is not None:
            hashler.append((a['hash'], a.get('tur', 'gorsel'), a if a.get('no') else None))
    eklenen = 0
    sayac = {'lisans': 0, 'boyut': 0, 'tekrar': 0, 'onizleme': 0}
    for a in yeni:
        if a.get('lisans') not in LISANS_AD:
            sayac['lisans'] += 1
            continue
        if a.get('genislik') and a['genislik'] < min_genislik:
            sayac['boyut'] += 1
            continue
        if not a.get('genislik') and a.get('tur') == 'gorsel':
            sayac['boyut'] += 1          # boyutu bilinmeyen gorsel: indirilmeden dogrulanamaz
            continue
        k = anahtar(a)
        if k & gorulen:
            sayac['tekrar'] += 1
            continue
        img, hata = None, ''
        # onizleme: kaynagin kucuk resmi -> (Openverse thumb bazen 424) Commons 500px -> orijinal (<=25 MB)
        for u, sinir in ((a.get('on_url'), 8), (wm_kucuk(a.get('indir_url'), 500), 8), (a.get('indir_url') if a.get('tur') == 'gorsel' else None, 25)):
            if not u:
                continue
            try:
                img = Image.open(io.BytesIO(al(u, sinir=sinir * 1024 * 1024, deneme=3)))
                img.load()
                img = ImageOps.exif_transpose(img).convert('RGB')
                break
            except Exception as e:
                img, hata = None, str(e)[:60]
        if img is None:
            sayac['onizleme'] += 1
            print(f"  onizleme alinamadi: {a.get('baslik', '')[:50]} ({hata})", file=sys.stderr)
            continue
        h = dhash(img)
        es = next((r for x, t, r in hashler if t == a.get('tur') and bin(h ^ x).count('1') <= 6), False)   # video kendi poster karesiyle cakismaz
        if es is not False:
            sayac['tekrar'] += 1
            # ayni icerik baska kaynakta: yedek indirme yolu (birincil 429/erisilemez olursa sec bunu dener; atif yedegin sayfasina gore)
            if es and a.get('indir_url') and a['indir_url'] != es.get('indir_url') and a['indir_url'] not in [x['indir_url'] for x in es.get('yedek', [])]:
                es.setdefault('yedek', []).append({k2: a.get(k2) for k2 in ('indir_url', 'sayfa', 'kaynak', 'lisans', 'lisans_ham', 'lisans_url', 'yazar', 'baslik', 'genislik', 'yukseklik', 'sure')})
                print(f"  #{es['no']}: ayni icerik {a['kaynak']} kaynaginda da var -> yedek indirme yolu eklendi")
            continue
        no = depo['sonraki']
        depo['sonraki'] += 1
        img.thumbnail((640, 640))
        img.save(os.path.join(y['on'], f'{no:03d}.jpg'), quality=85)
        a.update({'no': no, 'hash': h, 'anahtar': sorted(k), 'yuz': yuz_say(img)})
        depo['adaylar'].append(a)
        hashler.append((h, a.get('tur'), a))
        gorulen |= k
        eklenen += 1

    print(f"  +{eklenen} aday (elenen: lisans {sayac['lisans']}, boyut<{min_genislik} {sayac['boyut']}, tekrar {sayac['tekrar']}, onizleme hatasi {sayac['onizleme']})")
    return eklenen


# ---------------------------------------------------------------- kaynaklar
def commons_ara(sorgu, tur, adet, min_genislik):
    ft = 'filetype:video' if tur == 'video' else 'filetype:bitmap'
    q = f'{sorgu} {ft} filew:>{max(0, min_genislik - 1)}'
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': q, 'gsrlimit': min(50, adet),
         'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata', 'iiurlwidth': 500,
         'iiextmetadatafilter': 'LicenseShortName|License|LicenseUrl|Artist|Credit|ObjectName|Restrictions|UsageTerms'}
    j = al(COMMONS + '?' + urllib.parse.urlencode(p), json_mi=True)
    sayfalar = sorted((j.get('query') or {}).get('pages', {}).values(), key=lambda s: s.get('index', 0))
    out = []
    for s in sayfalar:
        ii = (s.get('imageinfo') or [{}])[0]
        em = {k: (v or {}).get('value', '') for k, v in (ii.get('extmetadata') or {}).items()}
        out.append(commons_kayit(s, ii, em, sorgu))
    return out


def commons_kayit(s, ii, em, sorgu):
    ham = em.get('LicenseShortName') or em.get('UsageTerms') or ''
    kod = em.get('License', '')
    return {'kaynak': 'Wikimedia Commons', 'tur': 'video' if (ii.get('mime') or '').startswith(('video', 'application/ogg')) else 'gorsel',
            'baslik': temiz_html(em.get('ObjectName')) or s.get('title', '').replace('File:', '').rsplit('.', 1)[0],
            'yazar': temiz_html(em.get('Artist')) or temiz_html(em.get('Credit')) or 'bilinmiyor',
            'lisans': lisans_coz(kod, ham, em.get('LicenseUrl')), 'lisans_ham': ham or kod, 'lisans_url': em.get('LicenseUrl', ''),
            'sayfa': ii.get('descriptionurl') or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(s.get('title', ''))}",
            'indir_url': ii.get('url'), 'on_url': ii.get('thumburl'), 'genislik': ii.get('width'), 'yukseklik': ii.get('height'),
            'sure': round(ii['duration'], 1) if ii.get('duration') else None, 'bayt': ii.get('size'), 'pageid': s.get('pageid'),
            'kisit': em.get('Restrictions', ''), 'sorgu': sorgu}


def openverse_ara(sorgu, adet, min_genislik):
    out, sayfa = [], 1
    while len(out) < adet and sayfa <= 3:
        p = {'q': sorgu, 'license': 'pdm,cc0,by,by-sa', 'page_size': 20, 'page': sayfa, 'size': 'large', 'mature': 'false'}
        try:
            j = al(OPENVERSE + '?' + urllib.parse.urlencode(p), json_mi=True)
        except urllib.error.HTTPError as e:
            print(f'  openverse: HTTP {e.code} (anonim kota olabilir) — atlandi', file=sys.stderr)
            break
        for r in j.get('results') or []:
            lis = lisans_coz(r.get('license'), r.get('license_url'))
            if r.get('license') == 'pdm':
                lis = 'pd'
            out.append({'kaynak': f"Openverse/{r.get('provider') or r.get('source')}", 'tur': 'gorsel',
                        'baslik': r.get('title') or 'adsiz', 'yazar': r.get('creator') or 'bilinmiyor',
                        'lisans': lis, 'lisans_ham': f"{r.get('license', '')} {r.get('license_version') or ''}".strip(), 'lisans_url': r.get('license_url', ''),
                        'sayfa': r.get('foreign_landing_url') or '', 'indir_url': r.get('url'), 'on_url': r.get('thumbnail'),
                        'genislik': r.get('width'), 'yukseklik': r.get('height'), 'sure': None, 'bayt': r.get('filesize'),
                        'kisit': '', 'sorgu': sorgu, 'openverse_id': r.get('id'), 'atif_hazir': r.get('attribution')})
        if sayfa >= (j.get('page_count') or 1):
            break
        sayfa += 1
    return out[:adet]


# ---------------------------------------------------------------- web sayfasi
def cdp_html(url, port):
    """otomasyon Chrome'unda (ayri profil, kullanicinin gunluk Chrome'u DEGIL) yeni sekme ac, DOM'u oku, sekmeyi kapat"""
    import websocket
    t = json.load(urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}/json/new?{url}', method='PUT'), timeout=15))
    try:
        ws = websocket.create_connection(t['webSocketDebuggerUrl'], timeout=30, max_size=None, suppress_origin=True)
        n = [0]

        def gonder(m, **p):
            n[0] += 1
            ws.send(json.dumps({'id': n[0], 'method': m, 'params': p}))
            while True:
                r = json.loads(ws.recv())
                if r.get('id') == n[0]:
                    return r.get('result', {})
        for _ in range(40):
            v = gonder('Runtime.evaluate', expression='document.readyState', returnByValue=True)
            if (v.get('result') or {}).get('value') == 'complete':
                break
            time.sleep(0.5)
        time.sleep(3)
        v = gonder('Runtime.evaluate', expression='document.documentElement.outerHTML', returnByValue=True)
        ws.close()
        return (v.get('result') or {}).get('value') or ''
    finally:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/json/close/{t['id']}", timeout=10)
        except Exception:
            pass


def sayfa_cozumle(url, h):
    """sayfadaki lisans isaretleri + indirilebilir medya. Lisans tek ve acik degilse medya 'belirsiz' kalir."""
    isaret = set()
    for m in re.finditer(r'<a[^>]+rel=["\'][^"\']*license[^"\']*["\'][^>]*href=["\']([^"\']+)|<a[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\'][^"\']*license', h, re.I):
        isaret.add(m.group(1) or m.group(2))
    isaret |= set(re.findall(r'https?://creativecommons\.org/(?:licenses|publicdomain)/[a-z\-]+/?[\d.]*/?', h, re.I))
    for m in re.finditer(r'"license"\s*:\s*"([^"]+)"', h):
        isaret.add(m.group(1))
    metin = temiz_html(re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I))
    for m in re.finditer(r'(public domain|no known (?:copyright )?restrictions|CC0|CC BY(?:-SA)?(?: \d\.\d)?|CC BY-NC[\w\- .]*|CC BY-ND[\w\- .]*|all rights reserved|©)', metin, re.I):
        isaret.add(m.group(1))
    kodlar = {lisans_coz(i) for i in isaret}
    yasak = any(re.search(r'nc|nd|all rights|©', i, re.I) for i in isaret)
    lis = None
    if len(kodlar - {None}) == 1 and not yasak:
        lis = (kodlar - {None}).pop()
    medya = []
    for m in re.finditer(r'<meta[^>]+property=["\']og:(image|video)(?::url)?["\'][^>]+content=["\']([^"\']+)', h, re.I):
        medya.append(m.group(2))
    medya += re.findall(r'<(?:video|source)[^>]+src=["\']([^"\']+)', h, re.I)
    for m in re.finditer(r'<img[^>]+(?:srcset|data-srcset)=["\']([^"\']+)', h, re.I):
        parca = [p.strip().split(' ')[0] for p in m.group(1).split(',') if p.strip()]
        if parca:
            medya.append(parca[-1])
    medya += re.findall(r'<img[^>]+src=["\']([^"\']+)', h, re.I)
    medya += [u for u in re.findall(r'href=["\']([^"\']+)', h, re.I) if urllib.parse.urlparse(u).path.lower().endswith(GORSEL_UZ + VIDEO_UZ)]
    # sayfanin icinde (data-*, JSON, script) gecen dogrudan dosya adresleri: buyuk surum cogu zaman yalniz orada (ör. DVIDS 2000w)
    medya += re.findall(r'https?://[^\s"\'<>()\\]+?\.(?:jpe?g|png|webp|tiff?|mp4|webm)(?=[?"\'\s<>)\\]|$)', h, re.I)

    def boy(u):
        """adresteki genislik ipucu (2000w, 1920px, 1280x720) — buyuk once: ayni gorselin kucugu dHash ile tekrar sayilir"""
        m = re.findall(r'(\d{2,4})(?:w|px|x\d{2,4})(?=[_./\-]|$)', urllib.parse.urlparse(u).path)
        return max(int(x) for x in m) if m else 900
    tek, out = set(), []
    for u in sorted(medya, key=lambda u: -boy(urllib.parse.urljoin(url, html.unescape(u)))):
        u = urllib.parse.urljoin(url, html.unescape(u))
        if not u.startswith('http') or u in tek or re.search(r'(logo|icon|sprite|avatar|badge|favicon|\.svg|\.gif)', u, re.I):
            continue
        tek.add(u)
        out.append(u)
    baslik = re.search(r'<title[^>]*>(.*?)</title>', h, re.S | re.I)
    yazar = re.search(r'<meta[^>]+name=["\'](?:author|dc\.creator)["\'][^>]+content=["\']([^"\']+)', h, re.I)
    return {'lisans': lis, 'isaret': sorted(isaret)[:12], 'medya': out[:40], 'baslik': temiz_html(baslik.group(1)) if baslik else url,
            'yazar': yazar.group(1) if yazar else ''}


def sayfa(a):
    y = yollar(a.klasor)
    depo = oku(y['liste'], {'sonraki': 1, 'adaylar': []})
    for url in a.url:
        print(f'sayfa: {url}')
        m = re.search(r'commons\.wikimedia\.org/wiki/(File:[^?#]+)', url)
        if m:
            p = {'action': 'query', 'format': 'json', 'titles': urllib.parse.unquote(m.group(1)), 'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata', 'iiurlwidth': 500}
            j = al(COMMONS + '?' + urllib.parse.urlencode(p), json_mi=True)
            yeni = []
            for s in j['query']['pages'].values():
                ii = (s.get('imageinfo') or [{}])[0]
                em = {k: (v or {}).get('value', '') for k, v in (ii.get('extmetadata') or {}).items()}
                yeni.append(commons_kayit(s, ii, em, 'sayfa: ' + url))
            aday_ekle(depo, y, yeni, a.min_genislik)
            continue
        try:
            h = cdp_html(url, a.cdp) if a.cdp else al(url, sinir=6 * 1024 * 1024).decode('utf-8', 'replace')
        except Exception as e:
            print(f'  okunamadi: {e}' + ('' if a.cdp else ' (JS ile yuklenen sayfa ise --cdp <otomasyon portu>)'))
            continue
        c = sayfa_cozumle(url, h)
        print(f"  lisans isaretleri: {', '.join(c['isaret']) or 'yok'} -> {LISANS_AD.get(c['lisans'], 'BELIRSIZ (indirilmez)')}")
        if not c['lisans']:
            for u in c['medya'][:15]:
                print(f'   - {u}')
            print('  lisans acik degil: medya listelendi, indirilmedi. Sayfada lisans/kullanim kosulunu bul, kullanici onayi olmadan kullanma.')
            continue
        yeni = []
        for u in c['medya']:
            uz = os.path.splitext(urllib.parse.urlparse(u).path.lower())[1]
            if uz in VIDEO_UZ:
                bilgi = ffprobe(u)
                if not bilgi:
                    continue
                on = os.path.join(y['on'], f'_gecici{len(yeni)}.jpg')
                os.makedirs(y['on'], exist_ok=True)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-user_agent', UA, '-ss', '1', '-i', u, '-frames:v', '1', '-vf', 'scale=640:-2', on])
                if not os.path.exists(on):
                    continue
                yeni.append({'kaynak': urllib.parse.urlparse(url).netloc, 'tur': 'video', 'baslik': c['baslik'], 'yazar': c['yazar'] or urllib.parse.urlparse(url).netloc,
                             'lisans': c['lisans'], 'lisans_ham': '; '.join(c['isaret'][:3]), 'lisans_url': next((i for i in c['isaret'] if i.startswith('http')), ''),
                             'sayfa': url, 'indir_url': u, 'on_url': 'file:' + urllib.request.pathname2url(on), 'genislik': bilgi[0], 'yukseklik': bilgi[1],
                             'sure': bilgi[2], 'kisit': '', 'sorgu': 'sayfa: ' + url})
                continue
            try:
                veri = al(u, sinir=40 * 1024 * 1024)
                img = Image.open(io.BytesIO(veri))
                w, hh = img.size
            except Exception:
                continue
            if w < a.min_genislik:
                continue
            yeni.append({'kaynak': urllib.parse.urlparse(url).netloc, 'tur': 'gorsel', 'baslik': c['baslik'], 'yazar': c['yazar'] or urllib.parse.urlparse(url).netloc,
                         'lisans': c['lisans'], 'lisans_ham': '; '.join(c['isaret'][:3]), 'lisans_url': next((i for i in c['isaret'] if i.startswith('http')), ''),
                         'sayfa': url, 'indir_url': u, 'on_url': u, 'genislik': w, 'yukseklik': hh, 'sure': None, 'kisit': '', 'sorgu': 'sayfa: ' + url})
        aday_ekle(depo, y, yeni, a.min_genislik)
    yaz(y['liste'], depo)
    kontakt_yap(y, depo)


def ffprobe(u):
    r = subprocess.run(['ffprobe', '-v', 'error', '-user_agent', UA, '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', u],
                       capture_output=True, text=True, timeout=60)
    try:
        j = json.loads(r.stdout)
        s = j['streams'][0]
        return s['width'], s['height'], round(float(j['format'].get('duration') or 0), 1)
    except (ValueError, KeyError, IndexError):
        return None


# ---------------------------------------------------------------- komutlar
def ara(a):
    y = yollar(a.klasor)
    depo = oku(y['liste'], {'sonraki': 1, 'adaylar': []})
    depo['elenen_secilmis'] = [{'anahtar': c.get('anahtar', []), 'hash': c.get('hash'), 'tur': c.get('tur')} for c in oku(y['credits'], [])]
    kaynaklar = [k.strip() for k in a.kaynak.split(',')]
    for s in [a.sorgu] + (a.ek_sorgu or []):
        print(f'sorgu: "{s}" ({a.tur}, >= {a.min_genislik} px)')
        yeni = []
        if 'commons' in kaynaklar:
            try:
                r = commons_ara(s, a.tur, a.adet, a.min_genislik)
                print(f'  commons: {len(r)} sonuc')
                yeni += r
            except Exception as e:
                print(f'  commons hata: {e}', file=sys.stderr)
        if 'openverse' in kaynaklar and a.tur == 'gorsel':
            try:
                r = openverse_ara(s, a.adet, a.min_genislik)
                print(f'  openverse: {len(r)} sonuc')
                yeni += r
            except Exception as e:
                print(f'  openverse hata: {e}', file=sys.stderr)
        aday_ekle(depo, y, yeni, a.min_genislik)
    depo.pop('elenen_secilmis', None)
    yaz(y['liste'], depo)
    if a.tur == 'video' and not any(c['tur'] == 'video' for c in depo['adaylar']):
        print('video adayi yok: --min-genislik 960 ya da youtube_kaynak.py ara "<sorgu>" (CC BY) dene')
    kontakt_yap(y, depo)


def font(boy):
    for f in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, boy)
    return ImageFont.load_default()


def kontakt_yap(y, depo=None):
    depo = depo or oku(y['liste'], {'sonraki': 1, 'adaylar': []})
    for eski in glob.glob(os.path.join(y['aday'], 'KONTAKT-*.jpg')):
        os.remove(eski)
    ad = [c for c in depo['adaylar'] if not c.get('secildi')]
    if not ad:
        print('kontakt: aday yok')
        return []
    KOL, SAT, W, H, ET = 5, 4, 396, 223, 46
    f1, f2 = font(30), font(15)
    sayfalar = []
    for p in range(0, len(ad), KOL * SAT):
        grup = ad[p:p + KOL * SAT]
        sat = (len(grup) + KOL - 1) // KOL
        tuval = Image.new('RGB', (KOL * (W + 4), sat * (H + ET + 4)), (18, 18, 18))
        d = ImageDraw.Draw(tuval)
        for i, c in enumerate(grup):
            x, yy = (i % KOL) * (W + 4), (i // KOL) * (H + ET + 4)
            try:
                im = Image.open(os.path.join(y['on'], f"{c['no']:03d}.jpg")).convert('RGB')
                im.thumbnail((W, H))
                tuval.paste(im, (x + (W - im.width) // 2, yy + (H - im.height) // 2))
            except OSError:
                pass
            d.rectangle([x, yy, x + 62, yy + 36], fill=(0, 0, 0))
            d.text((x + 6, yy + 2), str(c['no']), font=f1, fill=(255, 220, 0))
            if c.get('tur') == 'video':
                d.rectangle([x + W - 70, yy, x + W, yy + 24], fill=(200, 30, 30))
                d.text((x + W - 64, yy + 4), f"{c.get('sure') or '?'} sn", font=f2, fill=(255, 255, 255))
            uyari = ' '.join(t for t in ['YUZ?' if c.get('yuz') else '', 'KISIT' if c.get('kisit') else ''] if t)
            k = 'C' if c['kaynak'].startswith('Wikimedia') else 'O' if c['kaynak'].startswith('Openverse') else 'W'
            d.text((x + 4, yy + H + 3), f"{k} {LISANS_AD[c['lisans']]} {(re.search(r'\d\.\d', c['lisans_ham'] or '') or [''])[0] if c['lisans'] in ('by', 'by-sa') else ''}  {c.get('genislik')}x{c.get('yukseklik')}",
                   font=f2, fill=(220, 220, 220))
            d.text((x + 4, yy + H + 23), (f'{uyari}  ' if uyari else '') + c['baslik'][:46], font=f2, fill=(255, 120, 90) if uyari else (150, 150, 150))
        yol = os.path.join(y['aday'], f'KONTAKT-{p // (KOL * SAT) + 1}.jpg')
        tuval.save(yol, quality=88)
        sayfalar.append(yol)
    print(f'kontakt: {len(ad)} aday -> ' + ', '.join(sayfalar))
    return sayfalar


def kontakt(a):
    kontakt_yap(yollar(a.klasor))


def ad_uret(c, mevcut):
    taban = re.sub(r'[^a-z0-9]+', '-', c['baslik'].lower()).strip('-')[:32] or f"kaynak-{c['no']}"
    ad, i = taban, 2
    while ad in mevcut:
        ad, i = f'{taban}-{i}', i + 1
    return ad


def indir_gorsel(c, hedef, en_genis):
    url = c['indir_url']
    if wm_kucuk(url, 500):
        # en buyuk standart adim (< orijinal genislik; esit/buyuk adim orijinali dondurmez); hedef en_genis'i asan ilk adim yeter
        adim = [w for w in WM_ADIM if w < (c.get('genislik') or 0)]
        ust = [w for w in adim if w >= en_genis]
        if adim:
            url = wm_kucuk(url, ust[0] if ust else adim[-1])
    veri = al(url)
    img = Image.open(io.BytesIO(veri))
    img.load()
    img = ImageOps.exif_transpose(img).convert('RGB')
    if img.width > en_genis:
        img = img.resize((en_genis, round(img.height * en_genis / img.width)), Image.LANCZOS)
    img.save(hedef, quality=92, optimize=True)   # yeniden kayit: meta veri ve gomulu icerik atilir
    return img.size


def indir_video(c, hedef, bas, son, en_uzun):
    sure = (son - bas) if son else min(en_uzun, (c.get('sure') or en_uzun) - bas)
    if sure <= 0:
        raise ValueError('aralik bos')
    cmd = ['ffmpeg', '-v', 'error', '-y', '-user_agent', UA, '-ss', str(bas), '-i', c['indir_url'], '-t', f'{sure:.2f}',
           '-vf', "scale='min(1920,iw)':-2:flags=lanczos,fps=30,format=yuv420p", '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
           '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-an', '-movflags', '+faststart', hedef]
    for deneme in range(3):  # upload.wikimedia.org cok istekte 429 verir: bekle, yeniden dene
        r = subprocess.run(cmd, capture_output=True, text=True)
        if '429' in r.stderr and deneme < 2:
            time.sleep(30 * (deneme + 1))
            continue
        break
    if r.returncode or not os.path.exists(hedef):
        raise RuntimeError(r.stderr[-300:])
    p = ffprobe(hedef)
    if not p:  # ffmpeg 0 dondu ama dosya bos/bozuk (yarim indirme): kaydetme, yedek yolu dene
        os.remove(hedef)
        raise RuntimeError('indirilen video okunamadi (bos/bozuk)')
    return p


def sec(a):
    y = yollar(a.klasor)
    depo = oku(y['liste'], {'sonraki': 1, 'adaylar': []})
    credits = oku(y['credits'], [])
    nolar = [int(x) for x in re.split(r'[,\s]+', a.nolar.strip()) if x]
    adlar = [x.strip() for x in a.ad.split(',')] if a.ad else []
    if adlar and len(adlar) != len(nolar):
        sys.exit('HATA: --ad sayisi numara sayisiyla ayni olmali')
    os.makedirs(y['kaynak'], exist_ok=True)
    klasor_adi = os.path.basename(y['klasor'])
    mevcut = {os.path.splitext(c['dosya'])[0] for c in credits}
    for i, no in enumerate(nolar):
        c = next((x for x in depo['adaylar'] if x['no'] == no), None)
        if not c:
            print(f'#{no}: yok')
            continue
        if c.get('lisans') not in LISANS_AD:
            print(f'#{no}: lisans uygun degil, atlandi')
            continue
        ad = re.sub(r'[^a-z0-9\-_]+', '-', adlar[i].lower()) if adlar else ad_uret(c, mevcut)
        mevcut.add(ad)
        hata, orj = None, c
        for yol_ in [c] + [dict(c, **yd) for yd in c.get('yedek', [])]:
            try:
                if yol_['tur'] == 'video':
                    dosya = ad + '.mp4'
                    w, h, sure = indir_video(yol_, os.path.join(y['kaynak'], dosya), a.bas, a.son, a.en_uzun)
                    aralik = f'{a.bas}-{a.bas + sure:.1f}'
                else:
                    dosya = ad + '.jpg'
                    w, h = indir_gorsel(yol_, os.path.join(y['kaynak'], dosya), a.en_genis)
                    aralik = None
                if yol_ is not c:
                    print(f"#{no}: birincil kaynak alinamadi ({hata}) -> yedek {yol_['kaynak']}")
                    c = yol_
                hata = None
                break
            except Exception as e:
                hata = str(e)[:120]
        if hata:
            print(f'#{no}: indirilemedi ({hata})')
            continue
        if w < a.min_genislik:
            os.remove(os.path.join(y['kaynak'], dosya))
            print(f'#{no}: indirilen {w} px < {a.min_genislik}, silindi')
            continue
        boyut = os.path.getsize(os.path.join(y['kaynak'], dosya))
        kayit = {'dosya': dosya, 'src': f'{klasor_adi}/kaynak/{dosya}', 'tag': ad if c['tur'] == 'video' else None, 'tur': c['tur'],
                 'baslik': c['baslik'], 'yazar': c['yazar'], 'lisans': LISANS_AD[c['lisans']], 'lisans_kod': c['lisans'], 'lisans_ham': c['lisans_ham'],
                 'lisans_url': c['lisans_url'], 'kaynak_url': c['sayfa'], 'kaynak': c['kaynak'], 'aralik': aralik,
                 'degisiklik': 'cropped, resized, color graded, animated' if c['lisans'] in ('by', 'by-sa') else '',
                 'genislik': w, 'yukseklik': h, 'bayt': boyut, 'sorgu': c.get('sorgu'), 'yuz_algilandi': c.get('yuz'),
                 'kisit': c.get('kisit'), 'tarih': datetime.date.today().isoformat(), 'anahtar': c.get('anahtar'), 'hash': c.get('hash')}
        credits = [x for x in credits if x['dosya'] != dosya] + [kayit]
        orj['secildi'] = dosya
        print(f"#{no} -> kaynak/{dosya}  {w}x{h}  {boyut / 1e6:.1f} MB  {kayit['lisans']} {c['lisans_ham']}  ({c['kaynak']})"
              + (f"  UYARI kisit: {c['kisit']}" if c.get('kisit') else ''))
        yaz(y['credits'], credits)
    yaz(y['liste'], depo)
    atif_yaz(y, a.dil)
    kontakt_yap(y, depo)


ATIF_BASLIK = {'en': 'Image & footage credits', 'de': 'Bild- und Filmnachweise', 'tr': 'Görsel ve video kaynakları'}
ATIF_DEGISIKLIK = {'en': 'Changes: cropped, resized, color graded, animated.', 'de': 'Änderungen: zugeschnitten, skaliert, farbkorrigiert, animiert.',
                   'tr': 'Değişiklikler: kırpıldı, boyutlandı, renk düzeltildi, hareket eklendi.'}


def atif_yaz(y, dil='en'):
    credits = oku(y['credits'], [])
    satir = []
    for c in credits:
        yazar = re.sub(r'\s+', ' ', c.get('yazar') or '').strip()
        if c['lisans_kod'] in ('pd', 'cc0'):
            satir.append(f"- \"{c['baslik']}\" — {yazar + ', ' if yazar and yazar != 'bilinmiyor' else ''}{c['lisans']} — {c['kaynak_url']}")
        else:
            ver = re.search(r'\d\.\d', c.get('lisans_ham') or '')
            satir.append(f"- \"{c['baslik']}\" by {yazar}, {c['lisans']}{' ' + ver.group(0) if ver else ''} ({c['lisans_url']}) — {c['kaynak_url']}")
    yt = os.path.join(y['kaynak'], 'KAYNAKCA.tsv')
    if os.path.exists(yt):
        import csv
        gor = set()
        for r in csv.DictReader(open(yt, encoding='utf-8-sig'), delimiter='\t'):
            if r.get('url') in gor:
                continue
            gor.add(r.get('url'))
            satir.append(f"- Footage: \"{r.get('baslik')}\" by {r.get('kanal')} ({r.get('url')}), {'CC BY' if 'CC' in (r.get('izin') or '') else r.get('izin')}")
    if not satir:
        return
    metin = [ATIF_BASLIK.get(dil, ATIF_BASLIK['en']) + ':'] + satir
    if any(c['lisans_kod'] in ('by', 'by-sa') for c in credits):
        metin.append(ATIF_DEGISIKLIK.get(dil, ATIF_DEGISIKLIK['en']))
    open(y['atif'], 'w', encoding='utf-8-sig').write('\n'.join(metin) + '\n')
    print(f"atif: {len(satir)} satir -> {y['atif']}")


def atif(a):
    atif_yaz(yollar(a.klasor), a.dil)


def temizle(a):
    y = yollar(a.klasor)
    if os.path.isdir(y['aday']):
        n = sum(os.path.getsize(p) for p in glob.glob(os.path.join(y['aday'], '**', '*'), recursive=True) if os.path.isfile(p))
        shutil.rmtree(y['aday'])
        print(f"silindi: {y['aday']} ({n / 1e6:.1f} MB)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    alt = ap.add_subparsers(dest='is_', required=True)
    p = alt.add_parser('ara')
    p.add_argument('sorgu')
    p.add_argument('--sorgu', dest='ek_sorgu', action='append', help='ek sorgu (cesitlendir: yer, nesne, donem, "archive photo")')
    p.add_argument('--tur', default='gorsel', choices=['gorsel', 'video'])
    p.add_argument('--adet', type=int, default=24, help='kaynak ve sorgu basina en fazla sonuc')
    p.add_argument('--kaynak', default='commons,openverse')
    p = alt.add_parser('sayfa')
    p.add_argument('url', nargs='+')
    p.add_argument('--cdp', type=int, help='otomasyon Chrome CDP portu (JS ile yuklenen sayfalar); kullanicinin gunluk Chrome u degil')
    alt.add_parser('kontakt')
    p = alt.add_parser('sec')
    p.add_argument('nolar', help='kontakt numaralari: 3,7,12')
    p.add_argument('--ad', help='dosya adlari (virgulle, numara sirasiyla); kurgu.json da tag/src olur')
    p.add_argument('--bas', type=float, default=0.0, help='video: baslangic sn')
    p.add_argument('--son', type=float, help='video: bitis sn')
    p.add_argument('--en-uzun', type=float, default=30.0, help='video: --son yoksa en fazla bu kadar sn')
    p.add_argument('--en-genis', type=int, default=2880, help='gorsel: kaydedilen en buyuk genislik (Ken Burns payi)')
    p = alt.add_parser('atif')
    alt.add_parser('temizle')
    for p in alt.choices.values():
        p.add_argument('--klasor', required=True, help='Remotion public/<vNN> klasoru; ciktilar <klasor>/kaynak/')
        p.add_argument('--min-genislik', type=int, default=1280)
        p.add_argument('--dil', default='en', choices=['en', 'de', 'tr'])
    a = ap.parse_args()
    {'ara': ara, 'sayfa': sayfa, 'kontakt': kontakt, 'sec': sec, 'atif': atif, 'temizle': temizle}[a.is_](a)


if __name__ == '__main__':
    main()
