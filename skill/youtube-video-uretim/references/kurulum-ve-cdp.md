# Kurulum ve tarayıcı otomasyonu (CDP)

Tam kurulum kılavuzu, komutlar ve `kit/` dosya tablosu: `kaynak/YOUTUBE-OTOMASYON-SISTEMI.md` §1–5 ve §14 (ilk çalıştırma promptu). Bu dosya özet ve kurallardır.

## Ortam
- Windows 10/11, ≥32 GB RAM, NVIDIA GPU (faster-whisper large-v3 CUDA; GPU yoksa `device='cpu', compute_type='int8'`).
- Programlar: Python 3.14, Node 24, ffmpeg (full), Git Bash, Chrome, Google Drive masaüstü.
- Rakip/kapak betikleri için: `py -m pip install -U yt-dlp websocket-client opencv-python-headless numpy pillow`.
- Python: faster-whisper 1.2.1, ctranslate2 4.8.2, nvidia-cublas/nvrtc/cudnn-cu12, websocket-client, requests, pillow, numpy, opencv-python-headless, soundfile, edge-tts, yt-dlp.
- CUDA DLL bulunamazsa betik başına `nvidia.__path__` altındaki `*/bin` klasörlerini `os.add_dll_directory` ile ekle.
- Remotion 4.0.522 tek yerde (`C:\otomasyon\remotion-ortak`), projelere **junction** ile bağlanır: `cmd /c mklink /J <proje>\motion\node_modules C:\otomasyon\remotion-ortak\node_modules`. Her projede `npm i` yapma.
- Klasör: `C:\otomasyon\ortak\` (cdp.py, ai33.py, sekme.py, drive-yukle.py, `.ai33key` — asla paylaşma), `C:\otomasyon\<kanal>\videoNN\`. Projeleri `AppData` altına koyma.

## Hesaplar (kimlik betikte, anahtar dosyada, şifreyi kullanıcı girer)
| Hizmet | Kullanım | Kritik not |
|---|---|---|
| Google Flow (AI Ultra/Pro) | görsel: Nano Banana Pro, 16:9, x2 | Pro'nun ayrı kullanım sınırı var → dur, kullanıcıya sor. Video modu kredi yer, sadece istenirse. Doğru Google hesabıyla üret (URL'deki `u/N`). |
| HeyGen | photo avatar sunucu | Yalnız Avatar III. Ses dosyası yüklenir. |
| ai33.pro | TTS (ElevenLabs/Minimax sesleri) | **REST API** (`ai33.py`); arayüzü koordinatla sürmek binlerce kredi yaktı. |
| edge-tts | ücretsiz TTS | anahtar yok |
| Magnific | stok video/görsel/SFX | günlük ~100 indirme |
| Nexlev / TubeLab MCP | rakip analizi, outlier, transkript | kota biterse yt-dlp `extract_flat` |
| ChatGPT (chatgpt.com) | kapak üretimi, 5 sekme | otomasyon Chrome profilinde kullanıcı giriş yapar; plan görsel limitine takılırsa dur, söyle |

## Ayrı Chrome profili + CDP
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=<PORT> --user-data-dir=C:\Users\<k>\chrome-<kanal> --disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling
```
- Arka plan bayrakları ŞART (yoksa küçültülen pencerede HeyGen "Uploading audio"da donar, menüler açılmaz).
- Port/profil kanal başına DEVAM.md §2'de yazılıdır (ör. 9333 chrome-magnific, 9334 chrome-hund). **Aynı profili iki oturum aynı anda sürmesin.** Çakışırsa yeni profil + yeni port; kullanıcı yeniden giriş yapar.
- Chrome'u kapatmadan önce `Get-CimInstance Win32_Process` ile başka işin kullanıp kullanmadığına bak. Bütün Chrome'ları öldüren betik çalıştırma.

### Sekmeler
- Liste: `curl -s localhost:<PORT>/json` (yalnız `type=page`). Yeni: `curl -s -X PUT "localhost:<PORT>/json/new?<url>"` + 10–15 sn bekle. Kapat: `/json/close/<id>`.
- Bağlan: **Playwright değil** (worker/iframe'lere takılıp 180 sn asılıyor) → ham CDP: `from cdp import Sayfa; s = Sayfa('<url parçası>', port=<PORT>)` (`suppress_origin=True`, yoksa 403). Donan sekme: `sekme.baglan(parca, yedek_url)` kapatıp yeniden açar.

### Tıklama / yazma / yükleme
1. Öğeyi **görünen yazısından** bul (`innerText`), `getBoundingClientRect()` merkezini al. Birden çok eşleşmede en kısa metinli (en içteki) öğe; konuma göre süz (`y>600` alt çubuk, `x<240` sol menü). İkon butonlarının metni ikon adıdır: `add`, `more_vert`, `arrow_drop_down`, `close`.
2. `Input.dispatchMouseEvent` mouseMoved → mousePressed → mouseReleased. JS `click()` çoğu sitede çalışmaz. Hover menüsü için yalnız mouseMoved.
3. Yazı: kutuya tıkla → `Input.insertText`. Tuş: `Input.dispatchKeyEvent` keyDown/keyUp (Enter 13, Escape 27, Ctrl `modifiers=2`).
4. Öğe `null` ise hemen tıklama (`NoneType` hatası) → 1 sn arayla 10–15 deneme → yoksa ekran görüntüsü al ve bak.
5. Önce `Page.bringToFront` (gizli sekmede menü açılmaz).
6. Dosya yükleme: `Page.setInterceptFileChooserDialog enabled=True` + `DOM.enable` → yükle düğmesi → `Page.fileChooserOpened` → `DOM.setFileInputFiles(backendNodeId, [MUTLAK yol])`. Alternatif: `DOM.querySelectorAll(pierce=True)` ile `input[type=file]`.
7. Okuma amaçlı (kaynak avı): `stok_ara.py sayfa <url> --cdp <PORT>` yeni sekme açar, DOM'u okur, sekmeyi kapatır; tıklama/giriş yok (`kaynak-avi.md` §5).
8. Kritik her adımdan sonra (ayar, karakter ekleme, gönder, yükleme bitti) `Page.captureScreenshot` → dosya → Read ile **bak**.

## Uzun işler
- Harness arka plan görevleri zaman sınırında öldürülür → Flow/render/HeyGen beklemesi **bağımsız süreç**:
  `Start-Process -FilePath "C:\Program Files\Git\bin\bash.exe" -ArgumentList '-lc','"bash /c/otomasyon/<kanal>/videoNN/bitir.sh"' -RedirectStandardOutput <..>\render.log -RedirectStandardError <..>\render.log.err -WindowStyle Hidden`
- İzleme: `until grep -q BITTI render.log || grep -qi error render.log.err; do sleep 20; done`. Süreç ararken komutun kendisini eşleştirme.
- Durdururken alt süreçleri de öldür: `taskkill //F //T //PID <pid>`.
- `py -u` (tamponsuz). Kod yamasını heredoc ile yapma (Windows yollarını, `\n` ve `\b`'yi bozar) → Write/Edit.
- Türkçe karakterli yollarda (`Masaüstü`, `Drive'ım`) PowerShell veya tırnaklı bash.
- Kullanıcı kapanış saati verirse `shutdown /s /t <sn>`; render kapanıştan ≥45 dk önce başlamalı; iptal `shutdown /a`.
