#!/usr/bin/env python3
"""ChatGPT'de her kapak istemini AYRI SEKMEDE calistirir, uretilen gorselleri indirir.
Otomasyon Chrome profili (CDP portu) kullanilir; ChatGPT'ye girisi kullanici bir kez kendisi yapar.

Kullanim:
  py chatgpt_kapak.py istemler.json --port 9334 --cikti kapak-uretim [--bekle 600] [--aralik 8]
  py chatgpt_kapak.py --topla --port 9334 --cikti kapak-uretim   # yalniz acik sekmelerden gorselleri indir

istemler.json:
  [{"ad": "kapak-1", "istem": "....", "referans": ["C:/.../karakter.png"]}, ... 5 adet]
Her sekme icin: <cikti>/<ad>.png, <ad>-ekran.png (son durum ekran goruntusu), sonuc.json.
Cikis kodu: 0 hepsi indi, 2 giris gerekli, 3 limit/hata, 1 diger.
Gerekli: py -m pip install websocket-client
"""
import argparse, base64, itertools, json, os, sys, time, urllib.request

try:
    import websocket
except ImportError:
    sys.exit('py -m pip install websocket-client')

CHATGPT = 'https://chatgpt.com/'


class Sekme:
    _id = itertools.count(1)

    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=60, suppress_origin=True, max_size=None)

    def gonder(self, metod, **p):
        i = next(self._id)
        self.ws.send(json.dumps({'id': i, 'method': metod, 'params': p}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == i:
                if 'error' in m:
                    raise RuntimeError(f"{metod}: {m['error']}")
                return m.get('result', {})

    def js(self, ifade, bekle_promise=True):
        r = self.gonder('Runtime.evaluate', expression=ifade, returnByValue=True, awaitPromise=bekle_promise)
        return r.get('result', {}).get('value')

    def tikla(self, x, y):
        for t in ('mouseMoved', 'mousePressed', 'mouseReleased'):
            self.gonder('Input.dispatchMouseEvent', type=t, x=x, y=y, button='left', clickCount=1)

    def tus(self, ad, kod):
        for t in ('keyDown', 'keyUp'):
            self.gonder('Input.dispatchKeyEvent', type=t, key=ad, code=ad, windowsVirtualKeyCode=kod, nativeVirtualKeyCode=kod)

    def ekran(self, yol):
        veri = self.gonder('Page.captureScreenshot', format='png')['data']
        open(yol, 'wb').write(base64.b64decode(veri))


def http(port, yol, metod='GET'):
    req = urllib.request.Request(f'http://127.0.0.1:{port}{yol}', method=metod)
    return json.loads(urllib.request.urlopen(req, timeout=20).read())


def yeni_sekme(port, url):
    try:
        return http(port, '/json/new?' + url, 'PUT')
    except Exception:
        return http(port, '/json/new?' + url)


JS_DURUM = r"""(() => {
  const q = s => document.querySelector(s);
  const kutu = q('#prompt-textarea') || q('div[contenteditable="true"]') || q('textarea');
  const giris = !kutu && /log in|sign up|giriş yap|oturum aç/i.test(document.body.innerText.slice(0, 3000));
  const dur = !!(q('[data-testid="stop-button"]') || q('button[aria-label*="Stop"]') || q('button[aria-label*="Durdur"]'));
  const asist = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
  const imgs = [...document.querySelectorAll('main img')].filter(i => i.naturalWidth >= 512 && !/avatar|profile/i.test(i.alt||'') && !i.closest('[data-message-author-role="user"]'))
     .map(i => ({src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight}));
  const metin = document.body.innerText;
  const limit = /(limit|sınır|try again later|daha sonra tekrar|can't generate|oluşturamıyorum|content policy|içerik politika)/i.test(metin.slice(-4000));
  let r = null; if (kutu) { const b = kutu.getBoundingClientRect(); r = [b.x + b.width/2, b.y + b.height/2]; }
  return {kutu: r, giris, dur, imgs, asistan: asist.length, limit, son: (asist.at(-1)?.innerText||'').slice(-300)};
})()"""

JS_GONDER_BUTON = r"""(() => { const b = document.querySelector('[data-testid="send-button"]') || document.querySelector('button[aria-label*="Send"]') || document.querySelector('button[aria-label*="Gönder"]');
  if (!b || b.disabled) return null; const r = b.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()"""

JS_INDIR = r"""(async (src) => { const r = await fetch(src, {credentials: 'include'}); const b = await r.blob();
  return await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result.split(',')[1]); f.readAsDataURL(b); }); })"""


def bekle_durum(s, sure=45):
    son = None
    for _ in range(sure):
        son = s.js(JS_DURUM)
        if son and (son['kutu'] or son['giris']):
            return son
        time.sleep(1)
    return son


def referans_yukle(s, yollar):
    s.gonder('DOM.enable')
    ids = []
    for _ in range(20):   # sayfa gec yuklenince dosya girisi henuz yok -> bekle
        kok = s.gonder('DOM.getDocument', depth=-1, pierce=True)['root']['nodeId']
        ids = s.gonder('DOM.querySelectorAll', nodeId=kok, selector='input[type=file]')['nodeIds']
        if ids: break
        time.sleep(1.5)
    if not ids:
        raise RuntimeError('dosya girisi bulunamadi')
    s.gonder('DOM.setFileInputFiles', nodeId=ids[0], files=[os.path.abspath(y) for y in yollar])
    time.sleep(6 + 2 * len(yollar))


def gonder(port, istem, cikti):
    t = yeni_sekme(port, CHATGPT)
    s = Sekme(t['webSocketDebuggerUrl'])
    s.gonder('Page.enable')
    s.gonder('Page.bringToFront')
    time.sleep(4)
    d = bekle_durum(s)
    if not d or d['giris'] or not d['kutu']:
        s.ekran(os.path.join(cikti, f"{istem['ad']}-ekran.png"))
        return {'ad': istem['ad'], 'sekme': t['id'], 'durum': 'GIRIS_GEREKLI' if d and d['giris'] else 'KUTU_YOK'}
    if istem.get('referans'):
        referans_yukle(s, istem['referans'])
    s.tikla(*d['kutu'])
    time.sleep(0.5)
    s.gonder('Input.insertText', text=istem['istem'])
    time.sleep(1.5)
    b = None
    for _ in range(20):  # referans yuklemesi bitene kadar buton pasif olabilir
        b = s.js(JS_GONDER_BUTON)
        if b:
            break
        time.sleep(1)
    if b:
        s.tikla(*b)
    else:
        s.tus('Enter', 13)
    time.sleep(3)
    s.ekran(os.path.join(cikti, f"{istem['ad']}-gonderildi.png"))
    return {'ad': istem['ad'], 'sekme': t['id'], 'durum': 'GONDERILDI', 'ws': t['webSocketDebuggerUrl'], 'istem_on': istem['istem'][:60]}


def topla(port, kayitlar, cikti, bekle):
    acik = {x['id']: x for x in http(port, '/json') if x.get('type') == 'page'}
    bitis = time.time() + bekle
    onceki = {}
    while time.time() < bitis:
        kalan = [k for k in kayitlar if k['durum'] == 'GONDERILDI']
        if not kalan:
            break
        for k in kalan:
            t = acik.get(k['sekme'])
            if not t:
                k['durum'] = 'SEKME_KAPANDI'; continue
            s = Sekme(t['webSocketDebuggerUrl'])
            d = s.js(JS_DURUM)
            if not d:
                continue
            if d['imgs'] and not d['dur']:
                en = max(d['imgs'], key=lambda i: i['w'] * i['h'])
                if onceki.get(k['ad']) == en['src']:  # iki tur ayni kaldi -> bitti
                    veri = s.js(f"({JS_INDIR})({json.dumps(en['src'])})")
                    if not isinstance(veri, str):   # fetch hatasi (dict) -> sonraki turda tekrar dene
                        onceki.pop(k['ad'], None); continue
                    yol = os.path.join(cikti, f"{k['ad']}.png")
                    open(yol, 'wb').write(base64.b64decode(veri))
                    s.gonder('Page.bringToFront'); time.sleep(1)
                    s.ekran(os.path.join(cikti, f"{k['ad']}-ekran.png"))
                    k.update(durum='INDI', dosya=yol, boyut=f"{en['w']}x{en['h']}")
                    print(f"{k['ad']}: indi {en['w']}x{en['h']}")
                onceki[k['ad']] = en['src']
            elif d['limit'] and not d['dur']:
                s.ekran(os.path.join(cikti, f"{k['ad']}-ekran.png"))
                k.update(durum='LIMIT_YA_DA_RET', mesaj=d['son'])
                print(f"{k['ad']}: LIMIT/RET -> {d['son'][-120:]}")
            s.ws.close()
        time.sleep(10)
    for k in kayitlar:
        if k['durum'] == 'GONDERILDI':
            k['durum'] = 'ZAMAN_ASIMI'
    return kayitlar


_KILIT = None


def port_kilidi(port, bekle=3600):
    """Ayni CDP portunu iki oturum ayni anda surerse istemler birbirinin sohbetine duser (yasandi: 2026-11-27).
    Port basina dosya kilidi; surec kapaninca isletim sistemi kilidi kendiliginden birakir (bayat kilit olmaz)."""
    global _KILIT
    import tempfile
    _KILIT = open(os.path.join(tempfile.gettempdir(), f'chatgpt_kapak_{port}.kilit'), 'a+')
    bas = time.time()
    while True:
        try:
            if os.name == 'nt':
                import msvcrt
                _KILIT.seek(0)
                msvcrt.locking(_KILIT.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(_KILIT, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return
        except OSError:
            if time.time() - bas > bekle:
                sys.exit(f'port {port} baska bir chatgpt_kapak calistirmasinda ({bekle} sn beklendi); sonra yeniden dene')
            if int(time.time() - bas) % 60 < 10:
                print(f'port {port} baska bir oturumda kullaniliyor, bekleniyor...', flush=True)
            time.sleep(10)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('istemler', nargs='?')
    ap.add_argument('--port', type=int, required=True)
    ap.add_argument('--cikti', default='kapak-uretim')
    ap.add_argument('--bekle', type=int, default=600)
    ap.add_argument('--aralik', type=int, default=8)
    ap.add_argument('--topla', action='store_true')
    a = ap.parse_args()
    port_kilidi(a.port)
    os.makedirs(a.cikti, exist_ok=True)
    sj = os.path.join(a.cikti, 'sonuc.json')

    if a.topla:
        kayitlar = json.load(open(sj, encoding='utf-8'))
        for k in kayitlar:
            if k['durum'] in ('ZAMAN_ASIMI', 'GONDERILDI'):
                k['durum'] = 'GONDERILDI'
    else:
        istemler = json.load(open(a.istemler, encoding='utf-8'))
        kayitlar = []
        for i, ist in enumerate(istemler):
            try:
                r = gonder(a.port, ist, a.cikti)
            except Exception as e:   # tek sekmenin CDP zaman asimi digerlerini ve gonderilmislerin toplanmasini dusurmesin
                r = {'ad': ist['ad'], 'durum': 'HATA', 'mesaj': f'{type(e).__name__}: {e}'[:300]}
            print(f"{r['ad']}: {r['durum']}" + (f" ({r['mesaj']})" if r.get('mesaj') else ''))
            kayitlar.append(r)
            if r['durum'] == 'GIRIS_GEREKLI':
                json.dump(kayitlar, open(sj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                print('ChatGPT girisi gerekli: kullanici otomasyon Chrome profilinde giris yapmali.')
                sys.exit(2)
            if i < len(istemler) - 1:
                time.sleep(a.aralik)
    kayitlar = topla(a.port, kayitlar, a.cikti, a.bekle)
    json.dump(kayitlar, open(sj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ozet = {}
    for k in kayitlar:
        ozet[k['durum']] = ozet.get(k['durum'], 0) + 1
    print('Ozet:', ozet, '| ekran goruntuleri:', a.cikti)
    sys.exit(0 if ozet.get('INDI', 0) == len(kayitlar) else 3 if ozet.get('LIMIT_YA_DA_RET') else 1)


if __name__ == '__main__':
    main()
