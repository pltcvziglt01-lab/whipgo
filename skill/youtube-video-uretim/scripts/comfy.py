#!/usr/bin/env python3
"""Yerel ComfyUI istemcisi (yalniz standart kutuphane). Ayrinti: references/comfy.md

Kullanim:
  py comfy.py durum                                   # sunucu acik mi, GPU/VRAM, kuyruk, yuklu modeller
  py comfy.py baslat                                  # C:\\otomasyon\\ComfyUI\\baslat.bat'i ayri pencerede acar, hazir olmasini bekler
  py comfy.py modeller [klasor]                       # checkpoints, diffusion_models, loras, vae ... listesi
  py comfy.py calistir <workflow.json> --cikti <klasor> [--ayar anahtar=deger ...] [--zaman-asimi 900]
  py comfy.py yukle <gorsel> [--ad dosya.png]         # girdi gorselini ComfyUI input/ klasorune yukler

Workflow API formatinda olmali (ComfyUI arayuzu: Workflow > Export (API)). Arayuz formati
("nodes": [...]) verilirse hata verir.

--ayar bicimleri (deger JSON olarak okunur: 30 -> int, 7.5 -> float, "metin" -> str):
  6.text="bir kedi"        dugum kimligi 6'nin 'text' girdisi
  "Pozitif.text=bir kedi"  _meta.title'i 'Pozitif' olan dugumun 'text' girdisi (buyuk/kucuk harf fark etmez)
  seed=123                 nokta yoksa: o girdiye sahip TUM dugumler (seed, steps, cfg, width ...)
  seed=rastgele            seed / noise_seed icin rastgele sayi
Ornek workflow'larda konum tutucu: {"prompt": "..."} yerine "text": "$PROMPT" -> --ayar PROMPT="..."
($ ile baslayan tum dizgeler degisken olarak doldurulabilir).
"""
import argparse, json, os, random, subprocess, sys, time, uuid
import urllib.error, urllib.parse, urllib.request

SUNUCU = os.environ.get('COMFY_URL', 'http://127.0.0.1:8188').rstrip('/')
KOK = os.environ.get('COMFY_KOK', r'C:\otomasyon\ComfyUI')
BASLATICI = os.path.join(KOK, 'baslat.bat')

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass


def istek(yol, veri=None, zaman=30, ham=False, basliklar=None):
    url = SUNUCU + yol
    if veri is not None and not isinstance(veri, (bytes, bytearray)):
        veri = json.dumps(veri).encode('utf-8')
        basliklar = {'Content-Type': 'application/json', **(basliklar or {})}
    r = urllib.request.Request(url, data=veri, headers=basliklar or {})
    with urllib.request.urlopen(r, timeout=zaman) as y:
        b = y.read()
    return b if ham else json.loads(b.decode('utf-8') or 'null')


def acik_mi():
    try:
        return istek('/system_stats', zaman=3)
    except Exception:
        return None


def kapali_cik():
    sys.exit(f'ComfyUI kapali ({SUNUCU}). Baslat: py comfy.py baslat   (ya da cift tikla: {BASLATICI})')


def gerekli():
    s = acik_mi()
    if not s:
        kapali_cik()
    return s


# ---------------------------------------------------------------- durum / modeller
def gb(x):
    return f'{x / 1024**3:.1f} GB'


def cmd_durum(a):
    s = acik_mi()
    if not s:
        print(f'KAPALI: {SUNUCU} yanit vermiyor.')
        print(f'  Baslat: py comfy.py baslat   (ya da {BASLATICI})')
        sys.exit(1)
    sis = s.get('system', {})
    print(f"ACIK: {SUNUCU}  ComfyUI {sis.get('comfyui_version', '?')}  Python {sis.get('python_version', '?').split()[0]}"
          f"  torch {sis.get('pytorch_version', '?')}")
    print(f"  RAM bos {gb(sis.get('ram_free', 0))} / {gb(sis.get('ram_total', 0))}")
    for d in s.get('devices', []):
        print(f"  {d.get('name')}: VRAM bos {gb(d.get('vram_free', 0))} / {gb(d.get('vram_total', 0))}")
    q = istek('/queue')
    print(f"  kuyruk: calisan {len(q.get('queue_running', []))}, bekleyen {len(q.get('queue_pending', []))}")
    modeller_yaz(None, kisa=True)


def modeller_yaz(klasor, kisa=False):
    klasorler = [klasor] if klasor else istek('/models')
    for k in klasorler:
        try:
            l = istek('/models/' + urllib.parse.quote(k))
        except urllib.error.HTTPError:
            print(f'  {k}: bilinmeyen klasor')
            continue
        if kisa and not l:
            continue
        print(f'  {k} ({len(l)}):' + ('' if l else ' -'))
        for m in l:
            print(f'    {m}')


def cmd_modeller(a):
    gerekli()
    modeller_yaz(a.klasor)


# ---------------------------------------------------------------- baslat
def cmd_baslat(a):
    if acik_mi():
        print(f'Zaten acik: {SUNUCU}')
        return
    if not os.path.exists(BASLATICI):
        sys.exit(f'Baslatici yok: {BASLATICI} (kurulum: references/comfy.md)')
    # ayri konsol penceresinde, bu surecten bagimsiz
    subprocess.Popen(['cmd', '/c', 'start', 'ComfyUI', '/min', BASLATICI], cwd=KOK,
                     creationflags=getattr(subprocess, 'CREATE_NEW_PROCESS_GROUP', 0))
    print('Baslatildi, hazir olmasi bekleniyor', end='', flush=True)
    son = time.time() + a.bekle
    while time.time() < son:
        time.sleep(2)
        print('.', end='', flush=True)
        if acik_mi():
            print(f'\nHAZIR: {SUNUCU}')
            return
    sys.exit(f'\n{a.bekle} sn icinde acilmadi. Pencereyi / {os.path.join(KOK, "comfy.log")} dosyasini kontrol et.')


# ---------------------------------------------------------------- yukle
def yukle(yol, ad=None):
    ad = ad or os.path.basename(yol)
    sinir = uuid.uuid4().hex
    with open(yol, 'rb') as f:
        icerik = f.read()
    govde = (f'--{sinir}\r\nContent-Disposition: form-data; name="image"; filename="{ad}"\r\n'
             f'Content-Type: application/octet-stream\r\n\r\n').encode() + icerik + \
            (f'\r\n--{sinir}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue'
             f'\r\n--{sinir}--\r\n').encode()
    return istek('/upload/image', govde, zaman=120,
                 basliklar={'Content-Type': f'multipart/form-data; boundary={sinir}'})


def cmd_yukle(a):
    gerekli()
    r = yukle(a.gorsel, a.ad)
    print(f"Yuklendi: {r.get('name')}  (workflow'da LoadImage.image = \"{r.get('name')}\")")


# ---------------------------------------------------------------- calistir
def deger_oku(d):
    try:
        return json.loads(d)
    except ValueError:
        return d


def ayarlari_uygula(wf, ayarlar):
    for ay in ayarlar:
        if '=' not in ay:
            sys.exit(f'--ayar bicimi anahtar=deger olmali: {ay}')
        anahtar, ham = ay.split('=', 1)
        deger = deger_oku(ham)
        hedefler = []
        if '.' in anahtar:
            dugum, girdi = anahtar.rsplit('.', 1)
            ids = [dugum] if dugum in wf else [i for i, n in wf.items()
                                                 if n.get('_meta', {}).get('title', '').lower() == dugum.lower()]
            if not ids:
                sys.exit(f'dugum bulunamadi: {dugum} (kimlik ya da _meta.title)')
            hedefler = [(i, girdi) for i in ids]
        else:
            # once $DEGISKEN konum tutuculari
            for i, n in wf.items():
                for g, v in n.get('inputs', {}).items():
                    if isinstance(v, str) and v == '$' + anahtar:
                        hedefler.append((i, g))
            if not hedefler:
                hedefler = [(i, anahtar) for i, n in wf.items() if anahtar in n.get('inputs', {})]
            if not hedefler:
                sys.exit(f"'{anahtar}' girdisi / ${anahtar} konum tutucusu hicbir dugumde yok")
        for i, g in hedefler:
            v = deger
            if v == 'rastgele':
                v = random.randint(0, 2**50)
            wf[i].setdefault('inputs', {})[g] = v
            print(f'  ayar: {i}.{g} = {str(v)[:80]}')
    kalan = [f'{i}.{g}={v}' for i, n in wf.items() for g, v in n.get('inputs', {}).items()
             if isinstance(v, str) and v.startswith('$') and len(v) > 1 and v[1:].isupper()]
    if kalan:
        sys.exit('doldurulmamis konum tutucu: ' + ', '.join(kalan) + '  (--ayar AD=deger)')


def hata_yaz(e):
    try:
        g = json.loads(e.read().decode('utf-8'))
    except Exception:
        sys.exit(f'HTTP {e.code}: {e.reason}')
    print('HATA:', g.get('error', {}).get('message', g.get('error')), file=sys.stderr)
    for d, h in (g.get('node_errors') or {}).items():
        for x in h.get('errors', []):
            print(f"  dugum {d} ({h.get('class_type')}): {x.get('message')} - {x.get('details')}", file=sys.stderr)
    sys.exit(1)


def cmd_calistir(a):
    gerekli()
    with open(a.workflow, encoding='utf-8') as f:
        wf = json.load(f)
    if 'nodes' in wf and 'links' in wf:
        sys.exit("Bu arayuz formati. ComfyUI'da Workflow > Export (API) ile kaydedip onu ver.")
    wf.pop('_aciklama', None)
    ayarlari_uygula(wf, a.ayar or [])
    istemci = uuid.uuid4().hex
    try:
        r = istek('/prompt', {'prompt': wf, 'client_id': istemci})
    except urllib.error.HTTPError as e:
        hata_yaz(e)
    pid = r['prompt_id']
    print(f'kuyrukta: {pid}', flush=True)
    t0 = time.time()
    son_yazi = 0
    while True:
        if time.time() - t0 > a.zaman_asimi:
            sys.exit(f'zaman asimi ({a.zaman_asimi} sn). Is kuyrukta kalabilir: {SUNUCU}/queue')
        try:
            h = istek('/history/' + pid)
        except Exception:
            if not acik_mi():
                kapali_cik()
            h = {}
        if pid in h:
            break
        if time.time() - son_yazi > 15:
            print(f'  bekleniyor... {int(time.time() - t0)} sn', flush=True)
            son_yazi = time.time()
        time.sleep(1)
    kayit = h[pid]
    st = kayit.get('status', {})
    if st.get('status_str') == 'error':
        for m in st.get('messages', []):
            if m[0] == 'execution_error':
                d = m[1]
                print(f"HATA dugum {d.get('node_id')} ({d.get('node_type')}): {d.get('exception_message')}",
                      file=sys.stderr)
        sys.exit(1)
    os.makedirs(a.cikti, exist_ok=True)
    kaydedilen = []
    for dugum, cikti in kayit.get('outputs', {}).items():
        for tur, liste in cikti.items():
            if not isinstance(liste, list):
                continue
            for o in liste:
                if not isinstance(o, dict) or 'filename' not in o:
                    continue
                if o.get('type') == 'temp' and not a.gecici:
                    continue
                q = urllib.parse.urlencode({'filename': o['filename'], 'subfolder': o.get('subfolder', ''),
                                            'type': o.get('type', 'output')})
                veri = istek('/view?' + q, zaman=300, ham=True)
                hedef = os.path.join(a.cikti, (a.onek or '') + o['filename'])
                with open(hedef, 'wb') as f:
                    f.write(veri)
                kaydedilen.append(hedef)
    print(f'bitti: {time.time() - t0:.1f} sn, {len(kaydedilen)} dosya')
    for k in kaydedilen:
        print('  ' + os.path.abspath(k))
    if not kaydedilen:
        print('  (cikti yok: workflow SaveImage/SaveVideo gibi bir kayit dugumu iceriyor mu?)')


def main():
    ap = argparse.ArgumentParser(description='Yerel ComfyUI istemcisi')
    alt = ap.add_subparsers(dest='komut', required=True)
    alt.add_parser('durum').set_defaults(f=cmd_durum)
    p = alt.add_parser('baslat')
    p.add_argument('--bekle', type=int, default=180)
    p.set_defaults(f=cmd_baslat)
    p = alt.add_parser('modeller')
    p.add_argument('klasor', nargs='?')
    p.set_defaults(f=cmd_modeller)
    p = alt.add_parser('yukle')
    p.add_argument('gorsel')
    p.add_argument('--ad')
    p.set_defaults(f=cmd_yukle)
    p = alt.add_parser('calistir')
    p.add_argument('workflow')
    p.add_argument('--cikti', required=True)
    p.add_argument('--ayar', action='append', metavar='anahtar=deger')
    p.add_argument('--onek', help='kaydedilen dosya adlarinin onune eklenir')
    p.add_argument('--gecici', action='store_true', help='PreviewImage (temp) ciktilarini da kaydet')
    p.add_argument('--zaman-asimi', type=int, default=900)
    p.set_defaults(f=cmd_calistir)
    a = ap.parse_args()
    a.f(a)


if __name__ == '__main__':
    main()
