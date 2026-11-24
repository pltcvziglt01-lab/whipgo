# YOUTUBE VİDEO OTOMASYON SİSTEMİ — Sıfırdan Kurulum ve Çalışma Kılavuzu

> **Bu belgeyi okuyan Claude Code'a:** Bu dosya, bir Windows bilgisayarda Claude Code ile uçtan uca YouTube videosu üreten sistemin tamamını anlatır. Görevin:
> 1) Bölüm 2–5'teki kurulumu yap (programlar, paketler, klasörler, ortak kütüphaneler, `kit/`),
> 2) Bölüm 3'teki hesapları kullanıcıya açtır (şifreyi asla sen girme),
> 3) Bölüm 6'daki referans hattı bir deneme videosuyla uçtan uca sına,
> 4) Her kanal için `DEVAM.md` tut (Bölüm 13).
> Kullanıcıyla **Türkçe** konuş, her küçük adımı anlatma; sonucu ve gereken kararı söyle.
> Bu klasördeki diğer dosyalar: `kit/` (çalışan kod paketi), `kanal-raporlari/` (6 farklı kanal hattının ayrıntılı raporu ve Japon kanalının anayasası).

---

## İÇİNDEKİLER
0. Sistem bir bakışta
1. Donanım
2. Yazılım kurulumu (komutlarla)
3. Hesaplar ve abonelikler
4. Tarayıcı otomasyon katmanı (CDP)
5. Ortak kütüphaneler ve `kit/` paketi
6. REFERANS HAT — HeyGen sunuculu, Remotion kurgulu kanal (adım adım)
7. Diğer hat tipleri (faceless slayt, tahta+stok, gerçek footage, hikâye, dikey reels, CapCut)
8. İçerik anayasası (bütün kanallar için)
9. Kurgu ve teknik standartlar
10. Teslim
11. Claude Code ile uzun işleri yönetme
12. Bilinen tuzaklar (ana liste)
13. DEVAM.md şablonu ve yeni kanal açma listesi
14. İlk çalıştırma promptu

---

## 0. SİSTEM BİR BAKIŞTA

```
Konu seçimi (rakip analizi, AskUserQuestion ile 3-4 başlık)
   │
Araştırma (kaynaklı: Wikipedia/FCI/resmî kaynak) → ARASTIRMA-NN.md
   │
Metin (bölümlü, # başlıklar) → metin.txt
   │
Ses (TTS: ai33.pro ElevenLabs sesleri / edge-tts) → vo.mp3
   │
STT kontrol + kelime zamanları (faster-whisper / transformers.js whisper) → cumleler.json
   │
   ├─► Sunucu videosu (HeyGen Avatar III, ses dosyası yüklenir) → host.mp4
   ├─► Görseller (Google Flow – Nano Banana Pro) / stok (Magnific) / gerçek footage
   │
Kurgu (Remotion kart sistemi, cümle zamanlarına göre) + ffmpeg son işlem (−14 LUFS, bt709)
   │
QC (18 karelik ızgara, LUFS, süre) → Teslim (Google Drive masaüstü klasörü) → DEVAM.md güncelle
```

Bütün tarayıcı işleri (HeyGen, Flow, Magnific, Drive, ai33 arayüzü) **Claude Code'un kendisinin değil, ayrı bir Chrome profilinin** CDP (uzaktan hata ayıklama) portu üzerinden, Python/Node betikleriyle sürülür. Kullanıcı bu Chrome'da hesaplarına bir kez kendisi giriş yapar.

Bu sistemle çalışan kanallar (ayrıntı: `kanal-raporlari/`):

| Hat | Format | Ses | Görüntü | Kurgu |
|---|---|---|---|---|
| Hund (Almanca köpek) — **referans** | HeyGen sunucu + B-roll, 10→1 geri sayım | ai33 / ElevenLabs Mirko 1.10 | Flow Nano Banana Pro | Remotion (tam) |
| Sağlık (Dr. Martin Ebeling, DE) | Faceless tahta + stok | ai33 / George 1.00 | Flow tahta + Magnific stok | ffmpeg + Remotion kartları |
| Akiya Japonya | Faceless ilan slaytı, 10→1 | ai33 / Minimax "Dominant Man" | gerçek ilan foto + harita | ffmpeg + Remotion |
| Silah (EN + ES) | Gerçek footage geri sayım | ai33 / Brian 0.92, Jaime 1.03 | YouTube klipleri (kredili) | Remotion (parçalı render) |
| POW belgeseli | Flow görselleri + müzik | ai33 / Brian | Flow + Real-ESRGAN | Remotion |
| Kanada, Arcturian | Anlatı/hikâye | ai33 | Magnific + Flow | Remotion / ffmpeg |
| Cozy Reels | Dikey 12 sn reel/Shorts | edge-tts Ava | Flow Video | Remotion |
| Hayalet-Ajan | Belgesel klonu → CapCut | – | Pinterest/YouTube/Flow | CapCut taslağı |

---

## 1. DONANIM

- Windows 10/11, ≥32 GB RAM önerilir (STT + render + tarayıcı aynı anda bellek tüketir; "x264 malloc failed" görülürse ağır işler sıraya konur).
- NVIDIA GPU (referans makine: RTX 5060 8 GB, sürücü 591.86, CUDA 13.1) — faster-whisper large-v3'ü CUDA ile çalıştırmak için. GPU yoksa whisper `device='cpu', compute_type='int8'` ile çalışır (yavaş).
- Disk: video başına 5–15 GB ara dosya (gerçek footage hatlarında ~50 GB). Teslimden sonra yerel videolar Geri Dönüşüm Kutusu'na gider.
- NVENC kullanılmıyor; render x264 ile CPU'da.

---

## 2. YAZILIM KURULUMU

### 2.1 Programlar (PowerShell, yönetici gerekmez çoğu için)
```powershell
winget install Python.Python.3.14
winget install OpenJS.NodeJS            # v24.x
winget install Gyan.FFmpeg              # full build (ffmpeg + ffprobe PATH'e)
winget install Git.Git                  # Git Bash: betiklerin çoğu bash
winget install Google.Chrome
winget install Google.GoogleDrive       # G:\Drive'ım (teslim klasörü)
winget install GitHub.cli               # isteğe bağlı
```
NVIDIA sürücüsü: güncel sürüm (NVIDIA App).
Python `Scripts` klasörünü PATH'e ekle: `%LOCALAPPDATA%\Python\pythoncore-3.14-64\Scripts` (yt-dlp.exe, edge-tts.exe için).

### 2.2 Python paketleri
```powershell
py -m pip install faster-whisper==1.2.1 ctranslate2==4.8.2 nvidia-cublas-cu12 nvidia-cuda-nvrtc-cu12 nvidia-cudnn-cu12 ^
  websocket-client requests pillow numpy opencv-python-headless soundfile edge-tts playwright yt-dlp
py -m playwright install chromium        # yalnız Playwright kullanan eski betikler için
```
Referans sürümler: Python 3.14.5, faster-whisper 1.2.1, ctranslate2 4.8.2, websocket-client 1.9.2, numpy 2.5.2, pillow 12.2.0, edge-tts 7.2.8, playwright 1.62.0, yt-dlp 2026.8.19.

**CUDA DLL notu:** faster-whisper, pip ile gelen nvidia DLL'lerini bulamazsa betiğin başına şu eklenir (kit'teki `zamanla.py`/`kontrol.py`'de var):
```python
import os, glob, nvidia
for _p in nvidia.__path__:
    for _d in glob.glob(os.path.join(_p, '*', 'bin')):
        os.add_dll_directory(_d); os.environ['PATH'] = _d + os.pathsep + os.environ['PATH']
```

### 2.3 Node / Remotion
Tek bir paylaşılan Remotion kurulumu yapılır, projeler buna **junction** ile bağlanır (her projede tekrar `npm i` yok):
```powershell
mkdir C:\otomasyon\remotion-ortak; cd C:\otomasyon\remotion-ortak
npm init -y
npm i remotion@4.0.522 @remotion/cli@4.0.522 @remotion/renderer@4.0.522 react@^19.2.8 react-dom@^19.2.8
# Her proje için:
cmd /c mklink /J C:\otomasyon\hund\motion\node_modules C:\otomasyon\remotion-ortak\node_modules
```
İlk render'da Remotion kendi Chrome Headless Shell'ini indirir.
Transformers.js STT kullanan hatlar için (sağlık/akiya/silah): `npm i @huggingface/transformers@^4.2.0` (stt klasöründe), model `onnx-community/whisper-small`.

### 2.4 Klasör düzeni (önerilen)
```
C:\otomasyon\
  ortak\            ← cdp.py, ai33.py, sekme.py, drive-yukle.py (+ .ai33key, ASLA paylaşma)
  remotion-ortak\   ← tek node_modules
  hund\             ← referans kanal (kit/ içeriği buraya)
     heygen\  flow\  motion\  arastirma\  video01\ video02\ ...
  <diğer-kanal>\
Documents\<KANAL ADI>\DEVAM.md   ← devir dosyası (Bölüm 13)
```
⚠ Projeleri `AppData` altına koyma (paketli Python orayı göremiyor).

### 2.5 kit/'i kurma
```powershell
xcopy /E /I "<bu klasör>\kit" C:\otomasyon\hund
move C:\otomasyon\hund\ortak C:\otomasyon\ortak
py C:\otomasyon\hund\yol-duzelt.py "C:/otomasyon/hund"   # sabit yolları yeni köke çevirir
```
`yol-duzelt.py` sonrası `ortak` yolu `C:/otomasyon/hund/ortak` olur; ortak'ı `C:\otomasyon\ortak`'a taşıdıysan betiklerdeki `sys.path.insert(0, '.../ortak')` satırlarını buna göre düzelt (grep ile kontrol et).
Sonra yer tutucuları doldur (Bölüm 3'teki hesaplar açıldıktan sonra):
- `<FLOW_PROJE_ID>` / `<FLOW_PROJE_ID_ILK8>` / `<HESAP_NO>` → `flow/ayarla.py`, `sablon-video/uret.py`
- `<HEYGEN_AVATAR_GROUP_ID>` → `heygen/gonder.py`
- `<DRIVE_KLASOR_ID>` → `ortak/drive-yukle.py` (yalnız yedek yükleme için)
- `ortak/.ai33key` → ai33 API anahtarı (kullanıcı kendisi yazar)

---

## 3. HESAPLAR VE ABONELİKLER

| Hizmet | Ne için | Not |
|---|---|---|
| **Google AI Ultra / Pro** (Flow) | Görsel üretimi: Flow, model **Nano Banana Pro**, 16:9, x2 | Ultra hesapta ~10.000 kredi; ama Pro modelin ayrıca **kullanım sınırı** var ("Kullanım sınırınıza ulaştınız… ödeme alınmadı") → sınır kalkana kadar bekle ya da Nano Banana 2'ye geç (kullanıcı onayıyla). Flow **Video** modu kredi yer → sadece kullanıcı isterse. Flow'da bir **proje** açılır, URL sabitlenir. Sunucu karakteri "Karakterler" bölümüne kaydedilir. |
| **HeyGen** | Konuşan sunucu (photo avatar) | **Avatar III** motoru (abonelik içinde) — **Avatar IV kredi harcar, ASLA gönderme.** Avatar → "Görünüm ekle → Yükle" ile kıyafet görünümleri eklenir. Ses klonlama yok; hazır ses dosyası yüklenir, "Ses Yansıtma" kapalı. |
| **ai33.pro** | TTS (ElevenLabs/Minimax sesleri) REST API | Anahtar `ortak/.ai33key`. Arayüzü koordinatla sürmek binlerce kredi yaktı → **REST API kullan** (`ai33.py`). Hesap birden fazla oturumda paylaşılıyorsa ses/hız her bölümde doğrulanır. |
| **edge-tts** | Ücretsiz TTS (Microsoft) | Anahtar gerekmez. `en-US-AvaNeural`, `en-US-AndrewNeural`, `ja-JP-KeitaNeural`… |
| **Magnific** (magnific.com) | Stok video/görsel, SFX | Günlük ~100 indirme kotası, 24 sa "downloading streak" duraklaması olabilir |
| **Google Drive masaüstü** | Teslim (`G:\Drive'ım\...`) | Kurulup oturum açılır |
| **YouTube** | Yükleme (kullanıcı yapar) | Çok kanallı çalışmada MoreLogin profili + proxy (girişi kullanıcı yapar) |
| Nexlev / YouTube MCP | Rakip analizi | Ücretsiz planda kanal analitiği kapalı; yt-dlp `extract_flat` ile çalışılır |

**Kurallar:** Şifreyi, kart bilgisini, API anahtarını Claude girmez; kullanıcı girer. Satın alma/kredi yükleme Claude'un işi değil. Hesap/proje kimlikleri (Flow proje URL'si, HeyGen avatarGroup) betiklere yazılır, anahtarlar dosyada durur.

---

## 4. TARAYICI OTOMASYON KATMANI (CDP)

### 4.1 Ayrı Chrome profilleri
Kullanıcının günlük Chrome'una dokunulmaz. Her iş grubu için ayrı profil + ayrı port:
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9334 --user-data-dir=C:\Users\<kullanici>\chrome-hund `
  --disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows `
  --disable-renderer-backgrounding --disable-background-timer-throttling `
  https://flow.google.com https://app.heygen.com/projects https://drive.google.com
```
Arka plan bayrakları ŞART: yoksa pencere küçültülünce HeyGen yüklemesi "Uploading audio"da donar.
Referans makinedeki dağılım: 9222 (varsayılan profil / hayalet), 9333 (`chrome-magnific`: Magnific+Flow, sağlık/kanada), **9334 (`chrome-hund`: Hund — HeyGen+Flow+Drive)**, 9335 (`chrome-ff`). **Aynı profili iki oturum aynı anda sürmesin** — bir oturum başka kanalın Flow/HeyGen sekmesini açarsa üretim bozulur; böyle bir durumda yeni profil + yeni port açılır (çerezler kopyalanamıyor → kullanıcı yeniden giriş yapar).
⚠ Bütün Chrome'ları öldüren betikleri (`chrome_cdp.ps1` vb.) çalıştırma. Chrome'u kapatmadan önce `Get-CimInstance Win32_Process` ile başka işlerin onu kullanıp kullanmadığına bak.

### 4.2 Sekmeye bağlanma — `ortak/cdp.py`
Playwright `connect_over_cdp` kullanılmaz (ölü blob worker'lara takılıp 180 sn zaman aşımına düşüyor). Ham websocket:
```python
import sys; sys.path.insert(0, 'C:/otomasyon/ortak')
from cdp import Sayfa
s = Sayfa('flow.google.com', port=9334)      # URL'sinde bu parça geçen ilk sekme
s.gonder('Page.bringToFront'); s.gonder('Page.navigate', url='...')
s.js("document.body.innerText")              # Runtime.evaluate
```
`suppress_origin=True` (yoksa Chrome 403 verir). Sekme listesi: `curl -s localhost:9334/json`. Yeni sekme: `curl -X PUT "localhost:9334/json/new?<url>"`. Kapat: `curl localhost:9334/json/close/<id>`.

### 4.3 Donan sekmeye karşı — `ortak/sekme.py`
Arka planda kalan sekme bazen yanıt vermez (`Runtime.enable` zaman aşımı). `baglan(parca, yedek_url)` bağlanamazsa sekmeyi kapatıp aynı/yedek URL ile yeniden açar. HeyGen için `heygen/hg.py → sayfa()` aynı mantıkla kendini iyileştirir.

### 4.4 Tıklama ve yazma kuralları
- Koordinat **tahmin edilmez**: öğe görünen yazısından bulunur (`innerText`), `getBoundingClientRect()` merkezine `Input.dispatchMouseEvent` (mouseMoved → mousePressed → mouseReleased). JS `click()` çoğu sitede işe yaramaz → gerçek fare olayı.
- İkon butonlarının yazısı ikon adıdır: `add`, `more_vert`, `arrow_drop_down`.
- Yazı: kutuya tıkla → `Input.insertText`. Tuş: `Input.dispatchKeyEvent` (Enter 13, Escape 27, Ctrl=modifiers 2).
- Öğe yoksa hemen tıklama (`NoneType` hatası) — 10–15 kez 1 sn arayla dene, sonra ekran görüntüsü al (`Page.captureScreenshot` → dosya → Read ile BAK).
- Dosya yükleme: Windows dosya penceresi açılırsa otomasyon kilitlenir → `Page.setInterceptFileChooserDialog` + `Page.fileChooserOpened` → `DOM.setFileInputFiles(backendNodeId, [mutlak yol])`.
- Kritik her adımdan sonra (ayar, gönder, yükleme bitti) ekran görüntüsüyle doğrula.

---

## 5. ORTAK KÜTÜPHANELER VE `kit/` PAKETİ

`kit/` içeriği (çalışan, referans Hund hattından alınmış kod; hesap kimlikleri yer tutucu):

| Dosya | Görev |
|---|---|
| `ortak/cdp.py` | Ham CDP istemcisi (`Sayfa`, `gonder`, `js`, `tus`) |
| `ortak/ai33.py` | ai33 TTS: `uret(metin, voice_id, hedef, speed)` → iş aç, durum sorgula (poll ucu adaylardan bulunur, 429/5xx tekrar), indir. Anahtar `.ai33key`'den |
| `ortak/sekme.py` | Donan sekmeyi kapatıp yeniden açarak bağlanma |
| `ortak/drive-yukle.py` | Drive web klasörüne tarayıcıyla yükleme (yedek yöntem; asıl yöntem Drive masaüstü) |
| `heygen/hg.py` | HeyGen sekmesi yardımcıları (kendini iyileştiren `sayfa()`) |
| `heygen/gonder.py <mp3> <başlık> [yerinde]` | Stüdyoyu açar, sesi yükler, Ses Yansıtma kapalı mı bakar, **hareket motorunu Avatar III yapar**, başlığı yazar, kredi/Avatar IV uyarısı varsa GÖNDERMEZ, gönderir. `yerinde` = avatar elle seçildiyse gezinmeden devam |
| `heygen/durum.py <başlık>` | Projeler listesinde video bitti mi (HAZIR/BEKLIYOR/YOK) |
| `heygen/bul-indir.py <başlık> <hedef>` | Proje kartını tıklar, video sayfasındaki `<video>` kaynağını indirir |
| `heygen/bekle-indir.py` | durum döngüsü + bul-indir |
| `flow/fl.py`, `flow/bul.py` | Flow yardımcıları, yazıya göre öğe bulma |
| `flow/ayarla.py` | Modeli Nano Banana Pro + x2 yapar ve doğrular |
| `sablon-video/ses.py` | metin.txt bölümlerini ai33 ile seslendirir, aralara 0,5/0,8 sn sessizlik, `vo.mp3` + `bolumler.json`; `AUSSPRACHE` sözlüğü yalnız seslendirmeye giden yazımı düzeltir |
| `sablon-video/kontrol.py [bölümler]` | Her bölümü whisper'la yazıya döküp metinle karşılaştırır (yalnız rakam/yazım farkı kabul) |
| `sablon-video/zamanla.py` | Bölüm bölüm whisper (uzun dosyada halüsinasyon olmasın) → `cumleler.json` (cümle + kelime zamanları) |
| `sablon-video/istemler.py` | Flow istemleri: `r()` sahne, `k()` karakterli sahne; stil blokları |
| `sablon-video/uret.py [ad1,ad2]` | Flow'da istemleri sırayla üretir, her istemin 2 görselini `img/<ad>_a/_b.jpg` indirir; karakteri "Karakterler → kart ⋮ → İsteme ekle" ile ekler; ızgara boşalmadan sonrakine geçmez |
| `sablon-video/surekli.sh` | ayarla + uret döngüsü (15 deneme), bitince `BITTI2` |
| `sablon-video/kontakt.py` | Görselleri etiketli kontakt sayfalarına dizer (gözle kontrol için) |
| `sablon-video/bitir.sh` | Remotion render + loudnorm |
| `motion/src/Video10.tsx` | Kurgu şablonu (kart sistemi, facecam, altyazı, `ts` ile cümle içi kesim) |
| `motion/src/Karte.tsx` + `geo/ulkeler50-ince.json` | Hareketli harita kartı (Natural Earth, Almanca ülke adları) |
| `motion/src/Fontlar2.tsx`, `public/font/` | Yerel fontlar (Montserrat='Mont', Playfair Italic='Play') |
| `yol-duzelt.py` | Sabit yolları yeni köke çevirir |

---

## 6. REFERANS HAT — HeyGen sunuculu, Remotion kurgulu kanal (adım adım)

Örnek kanal: "Hannes Brückner" — Almanca köpek/ev güvenliği, 50+ yaş, "Sie" hitabı, 10–12 dk, "10 Hunderassen, die …" geri sayımı.
`NN` = yeni video, `MM` = önceki. Her video `C:\otomasyon\hund\videoNN\`.

### 6.1 Konu
- Rakip kanallarda tutan kalıplar + kendi analitiğin. **Ölçülen gerçek:** "10 Hunderassen + belirli kitle/durum" (yalnız yaşayan 5,3B, kurt 2,3B, hırsız 2,1B, torun 1B, çiftlik 988/14 saat) tutuyor; "7 Dinge nachts" (31) ve "niemals als Wachhund" (48) tutmadı → **olumsuz başlık ve 10'dan az liste yok.**
- AskUserQuestion ile 3–4 başlık; önerin ilk sırada "(Önerilen)".
- Önceki videolarda kullanılan ırkları (ARASTIRMA dosyalarından) tekrar etme.

### 6.2 Araştırma → `arastirma\ARASTIRMA-NN.md`
WebFetch ile de.wikipedia + en.wikipedia ırk makaleleri (FCI numarası, boy/kilo, tarihçe, standarttaki mizaç cümleleri). Her iddia bir kaynağa dayanır; mizaç bilgisi bulunamayan ırk listeden çıkar. Yasal konular (Rasseliste, Anbindehaltung vb.) resmî kaynaktan.

### 6.3 Metin → `videoNN\metin.txt`
- Bölüm başlıkları `# 0 KANCA`, `# 1 NUMMER 10 …` (seslendirilmez).
- 1.550–1.950 kelime (≈10,5–12,5 dk @ ~150 kelime/dk).
- **GİRİŞ KURALI (analitikten):** 0:30'da izlenme %60–65'e düşüyordu. Sebep: ilk 24 sn'de durağan sunucu çekimi + "Warum, das erzähle ich am Ende… Bevor wir anfangen" + 45–75 sn kriter bölümü (liste 1:15–1:58'de başlıyordu). Şimdi:
  - Kanca ≤25–30 sn (~60–75 kelime). 1. cümle = başlığın vaadi + çarpıcı görüntü.
  - "am Ende erzähle ich…", "Bevor wir anfangen" YASAK. Açık döngüler somut ("Einer davon…", "Die Nummer eins…").
  - Kancadan hemen sonra "Nummer zehn" (en geç 0:40). Ayrı kriter/bağlam bölümü yok.
- Yapı: kanca → 10…6 → ortada sunucunun dürüst uyarısı ("Wir sind bei der Hälfte") → 5…1 → pratik 3 madde → 10'lu özet → yorum sorusu + önceki videoya yönlendirme (kanalda VAR olan video) → "Jeder Hund ist anders".
- Sayılar yazıyla ("achtzig Kilometer"). Kısaltmalar açık. Sunucuya sahte unvan yok. Kaynaksız sayı yok.

### 6.4 Ses
```bash
cd videoNN && cp ../videoMM/{ses.py,zamanla.py,kontrol.py,uret.py,kontakt.py,surekli.sh} .
# ses.py: AUSSPRACHE sözlüğünü yeni zor kelimelerle güncelle (örn. Groenendael → Gruhnendahl)
py ses.py                      # ses/NN.mp3 (önbellek: var olan bölüm yeniden üretilmez → değişen bölümün mp3/wav'ını sil)
py -W ignore kontrol.py        # her bölüm STT ile metin karşılaştırması
py -W ignore zamanla.py        # cumleler.json
```
Ses: ai33 `elevenlabs_FHUR0i1dH4dqNNOZj5D0` (Mirko Ziegert), hız **1.10**. Süre kısa kalırsa (≤10 dk) her ırka 1–2 kaynaklı cümle eklenip yalnız değişen bölümler yeniden seslendirilir.
GPU belleği başka işlerle doluysa whisper `MemoryError` verir → `kontrol.py 11 12 13` ile kalan bölümleri ayrı çalıştır.

### 6.5 HeyGen (sunucu videosu)
```bash
ffmpeg -i vo.mp3 -ac 1 -b:a 96k hund_vNN_hg.mp3
cd ../heygen && py -W ignore gonder.py "C:\otomasyon\hund\videoNN\hund_vNN_hg.mp3" hund-vNN-tam yerinde
```
- Stüdyo `create-v4/draft?vt=l&avatarGroup=<ID>` ile açılır ama **son kullanılan avatar gelir** (avatarGroup parametresi artık seçmiyor). Önce sağ panel "Avatar Ve Ses" satırında doğru avatar + görünüm var mı bak; değilse: Avatar satırı → ⇄ → Avatarlarım → avatar → görünüm kartı → ← geri; sonra `gonder.py … yerinde`.
- gonder.py motoru Avatar III yapamazsa veya "Avatar IV/kredi" uyarısı görürse göndermez.
- 10–11 dk video ~40–60 dk sürer. **Flow üretimiyle aynı anda HeyGen indirme döngüsü çalıştırma** (sekme yeniden açılınca Flow sekmesi arka plana düşüp donuyor). Önce Flow'u bitir; sonra `py durum.py hund-vNN-tam` → HAZIR → `py bul-indir.py hund-vNN-tam <hedef.mp4>`.
- `ffmpeg -i hund-vNN-tam.mp4 -an -c:v copy ../motion/public/vNN/host.mp4` — süresi vo.mp3 ile aynı olmalı.

### 6.6 Flow görselleri
- `istemler.py` (≈55–67 istem): ırk tanımları değişken (`AFF = "a healthy adult Affenpinscher (...)"`) → aynı köpek her sahnede aynı; insan yüzü yok (arkadan/eller), çocuk yüzü asla; yazı/tabela/logo yok; tarihî sahne `TARIH`, tablo `GEMAELDE` stili. Karakterli 3 sahne: `S_intro`, `S_haelfte`, `S_schluss` (`k()` → karakter referansı eklenir).
- Ön koşul: Flow sekmesi açık, proje açık, `py ../flow/ayarla.py` (Pro + x2).
- Çalıştırma uzun sürer → **bağımsız süreç** olarak başlat (Bölüm 11):
  `Start-Process bash -ArgumentList '-lc','"cd /c/otomasyon/hund/videoNN && bash surekli.sh"' -WindowStyle Hidden`
- `uret.log` izlenir; `BITTI2` → `py kontakt.py` → `kontakt-*.jpg` dosyalarının **her birine Read ile bak**: yanlış ırk, yazı, çerçeve/parşömen kenar, kolaj, deforme el, yüzü görünen insan, sahneyle ilgisiz hayvan, farklı sunucu yüzü → diğer varyant (`_b`) ya da istemi düzeltip `py uret.py ad1,ad2`.
- Seçim: `B="ad1 ad2"` → `img/<ad>_a|_b.jpg` → `motion/public/vNN/<ad>.jpg`; `vo.mp3` da oraya.
- Karakter ekleme yolu (2026-10): "+" penceresinin Karakterler filtresi proje bazlı ve boş dönüyor → sol menü **Karakterler → kartın ⋮ → İsteme ekle → Tüm medya**.
- Kullanım sınırı ("Kullanım sınırınıza ulaştınız") → üretimi durdur, kullanıcıya sor.

### 6.7 Kurgu (Remotion)
- `motion/src/VideoMM.tsx` → `VideoNN.tsx` kopyala; `vMM`→`vNN`, `VideoMM`→`VideoNN`; `cumleler.json` → `motion/src/vNN-cumleler.json`; `Root.tsx`'e `<Composition id="VideoNN" …>`.
- Değiştirilecek bloklar:
  - `IRKLAR`: `{ n, ad, koken, boy, a: ilk cümle no, b: sonraki bölümün ilk cümlesi }`
  - `RECAP_ILK`: özetin ilk maddesinin cümle no'su
  - `PLAN`: cümle no'suna göre sıralı sahneler
- Kart sözlüğü:
  - `H(n)` tam ekran sunucu · `R(n,'gorsel',{etiket, ort, odak, an: wt(n,'kelime')})` görsel (amber etiket / konum çipi) · `S(n,'S_x')` karakterli sahne (facecam gizlenir) · `RASSE(n,'gorsel')` ırk kimlik kartı · `{c, tip:'SAYI', sayi, bicim:'tam'|'bin', alt, kaynak, on}` · `{c, tip:'ZITAT', metin, kaynak}` · `{c, tip:'TIPPS', baslik, ogeler:[{yazi,c}]}` · `{c, tip:'RECAP'}` · `{c, tip:'KARTE', baslik, kutu:[lon0,lat0,lon1,lat1], vurgu:['Schweiz'], noktalar:[{ad,lon,lat,an,not}], rota:{yol,an,bit}, kaynak}`
  - **Cümle içi kesim:** `{ ...R(6,'gorsel'), ts: wt(6,'kelime') }` (kancadaki 10 ırk montajı böyle yapılır).
- Kurallar: kesim cümle başı +0,26 sn; medyan çekim ~5–6 sn; H en geç ~90 sn'de bir; **açılışta H(0) ile aynı cümlede R(0) olmaz** (yüz kapanmaz); ilk 30 sn'de H sadece açılışta, 0:20–0:45 arası tam ekran sunucu yok; her videoda 1–3 KARTE (köken/tarihî rota).
- Doğrulama betiği: sıralı mı, montaj dışında tekrar eden cümle var mı, H aralığı → sonra `npx tsc --noEmit -p .`.

### 6.8 Render ve QC
- `videoNN/bitir.sh` (kopyalarken TÜM `vMM/videoMM/VideoMM` yollarını değiştir):
  `npx remotion render src/index.ts VideoNN ../videoNN/vNN-ham.mp4 --concurrency=4 --crf=18 --timeout=120000 --log=error`
  `ffmpeg -i vNN-ham.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11" -c:a aac -b:a 192k -movflags +faststart <ad>-vNN.mp4`
- Render'ı **bağımsız süreç** olarak başlat, `render.log` izle (Bölüm 11). Başka oturumların render'ı CPU'yu paylaşıyorsa 20 dk'lık render 40+ dk sürer.
- QC: süre = vo süresi; `ffmpeg -i X -af ebur128 -f null -` → I ≈ −14 LUFS, tepe < −1 dB; 18 karelik ızgara (`fps=1/(süre/18),scale=480:-1,tile=3x6`) + ilk 33 sn ızgarası; Read ile bak.
- 60 sn önizleme: `ffmpeg -i X -t 60 -vf scale=960:-2 -c:v libx264 -crf 26 onizleme.mp4` → kullanıcıya gönder.

### 6.9 Başlık/açıklama/kapak → `videoNN/baslik-aciklama.txt`
- BAŞLIK · AÇIKLAMA (2 paragraf, bölüm zamanları `cumleler.json`'dan her bölümün ilk cümlesinin `t` değeri, Quellen listesi FCI numaralarıyla, Hinweis/dürüstlük notu, yorum sorusu, 3 hashtag) · ETİKETLER · KAPAK İSTEMİ.
- Kapak: kanalda TUTAN şablon (kullanıcının kendi kapakları): sunucu kameraya bakıp köpeği işaret eder, 2 satır kısa bağıran yazı (beyaz + sarı), kırmızı ok, kırmızı kesik halka (hırsız/tehlike), sıcak akşam ışığı, sunucunun güncel kıyafeti.

### 6.10 Teslim (Bölüm 10) ve DEVAM.md güncellemesi.

### 6.11 Sunucu kıyafet döngüsü (tekrar eden içerik riskine karşı)
Yüz/sakal/kasket/karakter tanımı birebir aynı; üst giysi 2–3 videoda bir minimal değişir. Uygulama: Flow'da aynı masa/oda kadrajında yeni kıyafetli görsel (karakter ekli, "NEW OUTFIT ONLY: …") → HeyGen avatar → "Görünüm ekle → Yükle" (kredi uyarısında DUR) → istemler.py `KAR` metni + kapak istemindeki kıyafet güncellenir → DEVAM'da hangi videoda hangi kıyafet tablosu.

---

## 7. DİĞER HAT TİPLERİ (özet — ayrıntı `kanal-raporlari/`)

| Hat | Özü | Rapor |
|---|---|---|
| Faceless tahta + stok (sağlık, Elias şablonu) | ai33 ses → whisper → cümle başına kart → Flow tahta görselleri (style-lock, 2 satır büyük harf) + Magnific stok (≥%35–40) + ~15 Remotion animasyonu → ffmpeg montaj (Ken Burns içe %0,47/sn, 0,12 sn xfade) | `02-SAGLIK-KANALI.md`, `05` §5 |
| Faceless ilan slaytı (Akiya Japonya) | belediye ilan künyeleri (備考 birebir) → 10→1 teşhis senaryosu → ai33 Minimax → gerçek foto + ESRI/GSI harita → Remotion kartlar + ffmpeg paralel build → finish (disclaimer/QR) | `03-AKIYA-JAPONYA.md` + `KANAL-ANAYASASI-akiya.md` |
| Gerçek footage geri sayım (silah EN/ES) | araştırma (fiyat+kaynak) → ai33 (ses kimliği + STT doğrulama) → YouTube klipleri (kaynak tsv, kredi) → transcode (CFR, bt709, HDR tonemap) → filigran kırpma → `kur.py` zaman çizelgesi → parçalı Remotion render | `04-SILAH-POW-SAFETYOFF.md` |
| Belgesel (POW) | Flow Nano Banana Pro görselleri + Real-ESRGAN (%55/%45) + özgün müzik (CC0 sampler) + sidechain miks | `04` §B |
| Hikâye (Kanada, Arcturian) | 1.350–1.450 kelime anlatı → ai33 → whisper+difflib hizalama → Magnific/Flow → Remotion / ffmpeg; "dramatized" notu | `05` §2–3 |
| Dikey reels (Cozy) | Flow Video A+B klip (son kare devamı) → edge-tts → Remotion 12 sn, güvenli alan → Gumroad | `05` §1 |
| CapCut teslimli hat (Hayalet) | ölçülmüş belgesel profili → medya kapısı → CapCut taslağı | `05` §4 |

Yeni bir kanal kurarken: rakip videoyu kare kare ölç (kesim ritmi, çekim süresi, palet, LUFS, modül sıklığı) → `SPEC-<kanal>.md` → kuralları sayıya bağla → referans hattı uyarla.

---

## 8. İÇERİK ANAYASASI (bütün kanallar)

1. **Kaynaklı bilgi.** Her sayı/tarih/alıntı bir kaynağa dayanır (ARASTIRMA dosyası). Kaynaksız iddia çıkarılır. Uydurma ekran verisi yok.
2. **Dürüstlük notları** açıklamada ve metinde (sağlıkta "ilacı kendi başınıza bırakmayın", güvenlikte "köpek kilit yerine geçmez", emlakta "bilgi amaçlıdır" feragati, hikâyede "dramatized").
3. **Sahte unvan yok** (sunucu "veteriner/doktor" değilse öyle sunulmaz). Gerçek kişi/kurum taklidi yok.
4. **Kanalda olmayan videoya "kanalda var" denmez.**
5. **Başlık:** kanalda ölçülen kazanan kalıp (Hund: "10 Hunderassen + kitle/durum"; sağlık: belirti + sürpriz sebep + "fast niemand"; akiya: 【tuzak】il + 10選 + tarih). Olumsuz/negatif çerçeve ve kısa liste tutmadı.
6. **Giriş tutma:** ≤30 sn kanca, ilk liste maddesi ≤0:40, "en sonda anlatacağım/başlamadan önce" yok, ilk 30 sn hızlı görsel değişimi (1–3 sn).
7. **Tekrar eden içerik cezasına karşı:** kart/animasyon çeşitliliği, sunucu kıyafet döngüsü, her yeni videoda yapının bir kısmını değiştir (akiya: 5 eksenden ≥3).
8. **Görsel kuralları:** insan yüzü gösterme (arkadan/kırpılmış), çocuk yüzü asla, görselde yazı/logo yok, AI görselde gerekiyorsa "イメージ" vb. etiket (akiya), gerçek footage'ta kredi.
9. **Yasal:** ülkeye göre (Rasseliste/Listenhund Almanya'da eyalete göre; LFAFE Meksika; 宅建業法 Japonya). Şiddet olayları monetizasyon için metne alınmaz.
10. **Ton:** hedef kitleye göre (50+ Almanca → "Sie", sakin, abartısız).

---

## 9. KURGU VE TEKNİK STANDARTLAR

- 1920×1080, 30 fps, yuv420p **tv/bt709** (`yuvj420p` Windows oynatıcılarda açılmaz: `scale=in_range=pc:out_range=tv`, `-color_range tv`).
- Ses: loudnorm **−14 LUFS**, TP −1 (CheapFix tipi kanalda −18,5 referans).
- Remotion: kompozisyon id yalnız `a-zA-Z0-9-`; `staticFile` yolunun başında `/` yok; yerel fontlar; bileşene çıkış fade'i koyma; render çıktısını `| tail`'e borulama (sessizce düşüyor); render.log'a yaz.
- Uzun/ağır render'da `--timeout=120000`, `--concurrency=4`; `@remotion/media` decoding error'larına karşı parçalı render (5000 kare) + concat.
- ffmpeg montaj hatlarında Ken Burns yalnız içe, xfade 0,1–0,2 sn (veya şablona göre sert kesim).
- QC: tam kare tarama (yeşil/siyah/beyaz kare), 18–32 kare kontakt, LUFS, süre, açılış karesi (yüz açık mı).
- Harita kartı (`Karte.tsx`): Natural Earth 1:50m (public domain), ülke vurgusu, "pop + dalga" nokta, zamanla çizilen rota, yavaş kamera; fikir lemo-opuscar "dataviz" stilinden (MIT), kod sıfırdan.

---

## 10. TESLİM

- **Google Drive masaüstü** kurulu: teslim klasörü örn. `G:\Drive'ım\money printer\<Kanal klasörü>\`.
- Dosya adları: `YYYY-AA-GG_VNN_<Kısa-Ad>.mp4` + `.txt` (başlık + açıklama + kapak istemi + "METİN" + Almanca metin) + `_METIN.txt` (yalnız metin). (Diğer kanallar: `YYYY-AA-GG - Video N.mp4` + `... - baslik ve aciklama.txt` + `... - Skript.txt`.)
- txt'ler UTF-8 (Not Defteri'nde bozuk görünmemesi için gerekiyorsa BOM'lu).
- Son ffmpeg çıktısı doğrudan G: klasörüne kopyalanır; **masaüstü kopyası yok**.
- Drive web'de dosya tam boyutta görünce (`sekme.baglan('drive.google.com', klasör)` + `innerText` içinde ad ve boyut) yerel video dosyaları (final, ham render, önizleme) **Geri Dönüşüm Kutusu'na** taşınır (kalıcı silme yok; kutuyu kullanıcı boşaltır):
  ```powershell
  Add-Type -AssemblyName Microsoft.VisualBasic
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($yol,'OnlyErrorDialogs','SendToRecycleBin')
  ```
  Yeniden render kaynakları (HeyGen host videosu, görseller, vo) kalır.
- Kullanıcıya: kısa Türkçe özet (süre, LUFS, nereye kondu, dikkat edilecekler) + 60 sn önizleme + istenirse metnin tamamı.

---

## 11. CLAUDE CODE İLE UZUN İŞLERİ YÖNETME

- Harness'in arka plan görevleri (`run_in_background`) zaman sınırında **öldürülür**; uzun Flow/render işleri bu yüzden yarıda kalabilir. Uzun işler **bağımsız süreç** olarak başlatılır:
  ```powershell
  Start-Process -FilePath "C:\Program Files\Git\bin\bash.exe" -ArgumentList '-lc','"bash /c/otomasyon/hund/videoNN/bitir.sh"' `
    -RedirectStandardOutput C:\otomasyon\hund\videoNN\render.log -RedirectStandardError C:\otomasyon\hund\videoNN\render.log.err -WindowStyle Hidden
  ```
- İzleme: Monitor + `until grep -q BITTI render.log || grep -qi error render.log.err; do sleep 20; done`. Süreç kontrolünde arama komutunun **kendisini eşleştirmemesine** dikkat (filtre: `Name -eq 'node.exe' -and CommandLine -match 'index.ts VideoNN '`).
- Kısa aralıklı yoklama yapma; durum sorulunca bak.
- `py -u` (tamponsuz), heredoc ile kod yaması yapma (Windows yollarını/`\n`'i bozuyor) → dosyayı Write/Edit ile yaz.
- Türkçe karakterli yollarda (`Masaüstü`, `Drive'ım`) PowerShell ya da tırnaklı bash kullan.
- Başka oturumların süreçlerine (render, Chrome) dokunma.
- Kullanıcı bilgisayarı kapatma saati verirse: `shutdown /s /t <saniye>`; render kapanıştan ≥45 dk önce başlamalı. İptal: `shutdown /a`.

---

## 12. BİLİNEN TUZAKLAR (ANA LİSTE)

| Belirti | Çözüm |
|---|---|
| `sayfa bulunamadi` | Sekme kapalı → `json/new?<url>` |
| CDP `Runtime.enable` zaman aşımı | Sekme donmuş → `sekme.baglan()` kapatıp yeniden açar |
| HeyGen yükleme "Uploading audio"da | Chrome arka plan bayraklarıyla başlat |
| HeyGen yanlış avatar (son kullanılan) | Panelden avatar/görünüm seç, `gonder.py … yerinde` |
| HeyGen Avatar IV'e dönmüş | gonder.py III yapar; yapamazsa göndermez |
| HeyGen kartları `<a>` değil | `bul-indir.py` kartı tıklar, URL `/videos/<başlık>-<id>` |
| Flow "Nano Banana 2 / x1"e döndü (sayfa yenilenince) | `flow/ayarla.py` |
| Flow karakter bulunamıyor | Karakterler → kart ⋮ → İsteme ekle |
| Flow "Kullanım sınırınıza ulaştınız" | Durdur; kredi varsa bile Pro sınırı → bekle / Nano Banana 2 (onayla) |
| Flow hata kartları ızgarada kalıyor | Hata ancak sayı ARTARSA yeni |
| Geç gelen çıktı sonraki isme yazıldı | Izgara boşalmadan gönderme (uret.py yapıyor) |
| Aynı anda iki uret.py | Dosya adları kayar → yapma |
| Whisper uzun dosyada halüsinasyon | Bölüm bölüm çöz (zamanla.py) |
| Whisper `MemoryError` | GPU dolu → bölümleri ayrı çalıştır / CPU int8 |
| Remotion "waiting for frame … timeout" | `--timeout=120000`, concurrency düşür |
| Arka plan görevi öldürüldü | Start-Process ile bağımsız başlat |
| Drive "tamam" ama dosya yok | Klasör satırında ad + boyutu doğrula |
| Drive "Yeni" menüsü açılmıyor | Sekmeyi öne getir, 5 deneme |
| Yanlış klasöre render | bitir.sh kopyalarken eski yollar kalmış |
| `H(0)` + `R(0)` aynı cümlede | Açılışta yüz kapanır → R(0)'ı sil |
| `yuvj420p` açılmıyor | tv/bt709 dönüşümü |
| ai33 eski metinden üretim / yanlış ses | STT ile doğrula, ses kimliği kontrolü |
| TTS rakamı yanlış okuyor | Sayıyı yazıyla yaz, AUSSPRACHE sözlüğü |
| Rakip/analitik MCP kotası | yt-dlp `extract_flat` |

---

## 13. DEVAM.md ŞABLONU VE YENİ KANAL AÇMA LİSTESİ

Her kanal için `Documents\<KANAL>\DEVAM.md` — her video bittiğinde ve her önemli kararda güncellenir; başka bir Claude oturumu bu dosyayla kaldığı yerden devam edebilmeli. Bölümler:
```
# <KANAL> — DEVAM
> Son güncelleme: <tarih>
0. Kısaca proje (kanal adı, dil, kitle, format, fark)
1. Klasörler (tablo: ne → yol)
2. Hesaplar ve araçlar (kilitli kararlar: ses+hız, avatar+motor, Flow hesabı+proje+model, Drive klasörü, CDP port/profil)
3. İçerik kuralları
3b. Giriş/izleyici tutma kuralları
4. Görsel/kurgu kuralları (+ kıyafet döngüsü tablosu)
5. Kapak kuralları
6. Bir videonun üretim hattı (komutlarla)
7. Bilinen tuzaklar
8. Videolar — DURUM (tablo: # | başlık | süre | klasör | teslim)
9. Konu havuzu (henüz yapılmadı)
10. SIRADAKİ İŞ
```
Yeni kanal: rakip seç → kare kare ölç → SPEC → anayasa (ton, başlık, yasaklar) → ses seç (F0 + kelime/dk ölçümü, örnek okutup kullanıcıya dinlet) → sunucu/karakter (Flow karakter + HeyGen photo avatar) → referans hattı kopyala → pilot video → kullanıcı onayı → seri.
Kullanıcı tercihleri hafızaya (`memory/`) yazılır: çalışma biçimi, teslim kuralı, giriş kuralı, kıyafet döngüsü, kapak şablonu.

---

## 14. İLK ÇALIŞTIRMA PROMPTU (yeni Claude Code oturumuna yapıştır)

```
Bu klasördeki YOUTUBE-OTOMASYON-SISTEMI.md dosyasını baştan sona oku, ardından:
1) Bölüm 2'deki programları ve paketleri kontrol et, eksikleri kur (her kurulumdan önce bana tek satırla söyle).
2) kit/ klasörünü C:\otomasyon\hund altına kur, yol-duzelt.py'yi çalıştır, ortak kütüphaneyi C:\otomasyon\ortak'a koy,
   remotion-ortak kurulumunu yapıp motion\node_modules junction'ını bağla, `npx remotion still src/index.ts KarteTest test.png --frame=200` ile Remotion'ı sına.
3) chrome-hund profilini 9334 portunda bayraklarla aç; HeyGen, Flow ve Drive'a benim giriş yapmamı bekle.
4) Bölüm 3'teki yer tutucuları (Flow proje ID, HeyGen avatarGroup ID, ai33 anahtarı) benimle birlikte doldur — anahtarı ben yazacağım.
5) Bölüm 6'daki referans hattı kısa bir deneme videosuyla (3 ırk, ~2 dk) uçtan uca çalıştır ve her adımın sonucunu raporla.
6) Documents\<KANAL>\DEVAM.md oluştur ve her adımda güncelle.
Benimle Türkçe konuş; şifre/kart/anahtar girme, satın alma yapma; Avatar IV asla gönderme.
```
