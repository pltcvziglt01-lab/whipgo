#!/usr/bin/env python3
"""Acik bir otomasyon Chrome'undan (CDP portu) YouTube/Google cerezlerini yt-dlp icin Netscape cookies.txt'ye yazar.

Neden: YouTube IP'yi "Sign in to confirm you're not a bot" ile isaretleyince yt-dlp yalniz giris yapilmis cerezle indirir.
Ana Chrome profilleri otomasyona baglanamaz; --remote-debugging-port ile acilmis otomasyon profili kullanilir
(bu makinede: 9334 = chrome-hund, bkz. Masaustu\\CHROME-PORT-GIRISLERI.txt). Cerez dosyasi yerelde kalir, Drive'a KONMAZ.
Tarayici cerezleri dondurdugu icin her kanaldan once yeniden alinir (kanal_isle.py --cerez-port).

Kullanim: py cerez_al.py --port 9334 --cikti C:\\...\\cookies.txt
Gerekli: websocket-client (py -m pip install websocket-client)
"""
import argparse, json, sys, urllib.request

ALAN = ('youtube.com', 'google.com', 'youtu.be', 'googlevideo.com')


def cerezler(port):
    import websocket
    ws_url = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/version', timeout=10))['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=20, suppress_origin=True)
    try:
        ws.send(json.dumps({'id': 1, 'method': 'Storage.getCookies'}))
        while True:
            m = json.loads(ws.recv())
            if m.get('id') == 1:
                if 'error' in m:
                    raise RuntimeError(m['error'])
                return m['result']['cookies']
    finally:
        ws.close()


def yaz(liste, yol):
    satir = ['# Netscape HTTP Cookie File']
    n = 0
    for c in liste:
        d = c['domain']
        if not any(d.lstrip('.').endswith(a) for a in ALAN):
            continue
        son = int(c['expires']) if c.get('expires', -1) > 0 else 0
        satir.append('\t'.join([d, 'TRUE' if d.startswith('.') else 'FALSE', c['path'],
                                'TRUE' if c.get('secure') else 'FALSE', str(son), c['name'], c['value']]))
        n += 1
    open(yol, 'w', encoding='utf-8', newline='\n').write('\n'.join(satir) + '\n')
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=9334)
    ap.add_argument('--cikti', required=True)
    a = ap.parse_args()
    liste = cerezler(a.port)
    n = yaz(liste, a.cikti)
    giris = any(c['name'] in ('SAPISID', '__Secure-3PAPISID', 'LOGIN_INFO') for c in liste)
    print(f'{n} cerez yazildi; giris {"VAR" if giris else "YOK"}')
    sys.exit(0 if n and giris else 2)


if __name__ == '__main__':
    main()
