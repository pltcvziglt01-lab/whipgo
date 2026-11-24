# Akiya (空き家) kanalı — üretim hattı

Japonca "空き家 10選" geri sayım videoları, 1920×1080 30fps. İlk videolar 28–31 dk; kanal anayasası
(`KANAL-ANAYASASI.md`, Ek A) 10 dk formatına geçti, 限界集落 formatı iptal, saf ilan kanalı.
Referans stil: PropertyScope (rakibin ritmi + bizim Remotion motion graphics). Genel kurallar: `../dersler-akiya-medical.md`.

## 1. Kullanıcının verdikleri
- Başlık + ham seslendirme (mp3) + ilan veri dosyası (md): ör. `akiya_<il>_bukken_data.md`
  (ilan verileri + 概要欄 taslağı + tuzak tablosu), `akiya_<il>_title_daihon.txt` (tam metin). `C:\Users\polat\Downloads\` altına düşer.
- Kullanıcı ilan sahipleriyle yayın öncesi kendisi iletişime geçer; kredi/link açıklamada → gerçek ilan görselleri kullanılabilir.
- İletişim Türkçe, madde madde, kısa. Video içeriği Japonca.

## 2. Teslimat
Klasör `C:\Users\polat\Desktop\youtube\V2\` (yönlendirilmiş olabilir: `Documents\Masaüstü Dosyalarım\youtube\V2`; önce doğrula,
yoksa `Get-ChildItem -Filter 'youtube' -Recurse -Depth 3`; PowerShell ile kopyala).
- `video N.mp4` — h264 yuv420p tv/bt709, AAC 48k stereo
- `video N - aciklama.txt` — UTF-8 BOM'lu; zaman damgaları ölçülen sınırlardan; 10 ilan sırayla linkli
- `video N - sabit yorum (gorsel kredileri).txt` — Commons künyeleri, BOM'lu
- Shorts: `V2\shorts\short N.mp4` + `short N - aciklama.txt`

## 3. Yeni il iskelesi
- En güncel projeyi şablon al; `render/`, `motion/src/`, `motion/gen-intro.js` kopyala; `img*`, `raw`, `stt`, `qc`, `flow/klip` boşalt.
- `motion/node_modules` → junction: `ps-analiz\render\remotion-test\node_modules` (Remotion 4.0.522).
- **İskeleden taşınan il adlarını denetle:** `render/cards/disclaimer.html`
  (`grep -o "[一-龠]\{2,3\}県" render/cards/disclaimer.html`), `assemble.js` `PLACE` tablosu ve `output` adı,
  `harita-uret.js` UA satırı, `onizleme.json`, `intro-zaman.json`, `gen-intro.js` preview metinleri.
  (Video 9 ve 10 yayında 富山 artığı uyarı kartı + Toyama önizleme kartları taşıyor.)

## 4. Boru hattı
```
0) mkdir akiya-<il>/{raw,audio,img,img/extra,img/harita,render,flow,motion/src,motion/public,stt,qc}
   ses → raw/vo.mp3
   ffmpeg -i raw/vo.mp3 -ac 1 -ar 16000 audio/vo16.wav
   ffmpeg -i raw/vo.mp3 -ac 2 -ar 48000 audio/vo48.wav
   ⚠ raw/vo.mp3 her değiştiğinde iki wav'ı DERHAL yeniden üret (assemble sesi vo48.wav'dan alır)
1) STT        cd stt && node run.js ../audio/vo16.wav vo.stt.json --model onnx-community/whisper-small
              (q8, language:'japanese', chunk 30 / stride 5, return_timestamps; ~2,5× gerçek zaman)
              Ara çıktı yok; bitti mi diye önce vo.stt.json'a bak.
2) SINIRLAR   「第N位」+ yer adı ara → render/boundaries.json (onay, s10..s01, matome, total)
              Chunk içi karakter oranıyla interpole et; total = ses süresi.
3) KÜNYE      %TEMP%\claude\cdp\iwate-topla.js — liste sayfaları (?page=N, 30/sayfa) → detay sayfaları;
              Node'da ham HTML: <th>K</th><td>V</td> + mod-bukkenSetsubi <dt>/<dd>. 567 ilan / 0 hata / ~10 dk.
              Yeni il: yalnız bölge/il yolunu değiştir (ör. tohoku/iwate). Kategori <h1>'deki 売買居住用/売買土地'dan.
4) FOTOĞRAF   2 ajan: LIFULL (data-image-url, en büyük varyant resized-bukken-1124x836)
              + belediye/aracı/SUUMO (3 katına kadar foto) → img/rNN, img/extra/rNN, manifest-*.json
              Her parti kontakt sayfasıyla gözle incelenir. Ek ajana "güncel listede var mı" kontrolü.
5) HAZIRLIK   node render/prep-img.js          → img-prep/ (cover / blur-pad; 間取り図 asla kırpılmaz;
                                                 beyaz kenar kırpma → "beyaz kenar kirpilan: N kare" satırına bak)
              node render/prep-img.js --dedup  → 16x16 gri average-hash, Hamming ≤14
6) HARİTA     ajan: Nominatim doğrula → ESRI 1920x1080 yakın/orta → 39x52 px iğne @(940,487)
              → GSI 5 katman: seamlessphoto (.jpg z17), std/pale/relief/hillshademap (.png z13)
              relief/hill harmanla (format=gbrp; uydu [0]; relief×photo overlay, hill×std multiply 0.7)
              Kapalı orman → -ortapin sürümü. Opener haritası parlaklığı ~50 ise eq=brightness=0.10:contrast=1.06
              Dosyalar rNN üretilir, assemble sNN bekler → img/harita/ içinde kopyala; icerik.json elle.
              motion/public'e kopyalamadan önce: ls img/harita/r*-pin.jpg | wc -l = 10
7) HAVUZ      node render/collect-commons.js --terms <il>-terms.json --out ../img/pool2 --limit 400
              (terim dosyası [["terim","grup"],...] — önce doğrula)
              → 2-3 ajanla gözle denetim (denetim-a.json / -b.json; KULLAN|KULLANMA + sebep)
              → node render/build-pool.js → pool-onayli.json (1920x1080, künye taşınır; `file`/`f` ikisi de kabul)
              Parlaklık <48 olanları at. Havuz opsiyonel (北海道'da hiç kullanılmadı).
8) FLOW       powershell -ExecutionPolicy Bypass -File hayalet-ajan/hayalet/chrome_baslat.ps1
              py flow/flow2.py promptlar-giris.json klip/giris   — GÜVENME, gelirse bonus
9) MOTION     gen-intro.js / gen-kart.js / gen-montaj.js / gen-bg.js → JSON → bas.js ile op-* / st-* / pc-* / intro → motion/out/*.mp4
10) MONTAJ    node render/assemble.js            → render/manifest-akiya.json
              node render/build.js render/manifest-akiya.json --jobs 5   (tam yol ver)
              node render/finish2.js --in akiya-<il>.mp4 --out akiya-<il>-final.mp4 \
                   --card cards/disclaimer.png --card-dur 0.78 --labels bos-etiket.json
              (ürün dönemi: --badge cards/bant.png --badge-from 60 --qr cards/qrkart.png --qr-at 200,380,530
               --qr-dur 8 --band cards/uyari.png --band-at 250 --band-dur 7)
11) QC        genel QC listesi + GSI/harita/havuz/ilan dağılımı sayımı
12) TESLİM    mp4 + aciklama.txt + sabit yorum txt (BOM'lu)
```

## 5. assemble.js ayarları
- Bölüm şablonu (Niigata): Opener → bölge havuzu → GSI → ilan (dış yarı) → harita → kartlar (1. yarı) → StatCard →
  ilan (iç yarı) → kartlar (2. yarı) → havuz → kalan GSI. §14 sonrası: **her bölüm evle açılır**.
- Havuz dağıtımı iki geçişli: önce kendi grubu (max %50), sonra `tur` alanına göre round-robin. `mapMinSec: 5.0`.
- GSI sayısı: `yuva = (span - sabitKlipler) / 4.1`, `gsi = clamp(yuva - ilanFoto - harita, 2, 5)`; 10 dk formatta `GSI_MAX=2`.
- GSI sırası: `photo, relief, hill, std, pale` (ova illerinde std/relief ölü ekran verir).
- Kart: tam ekran eşiği ×2,5; tavan bölüme göre — yüksek çözünürlüklü kalan kare ≥4 ise 2, değilse 4.
  `gen-kart.js` ZORUNLU/YASAK listeleri (tezin karesi boyuta yenilmesin).
- Montaj: bölümde ≥8 kare ve medyan büyütme >3,0 → tüm kareler montaja, o bölümde kart tavanı 2; süre `montajlar.json`'dan.
- `cekirdek`: `tedzukiler.json → taihiler.json → bunsholar.json → st-*` sırasıyla okunur.
- 10 dk format: bölüm ~50 sn, sabit giderler 16 sn (Opener 5 + StatCard 6 + harita 5).
- Uzun bölüm: `ekHaritalar` (-orta/-yakin), `matomeKareleri` (s01 sonunda 10 ilanın dışı).
- `gen-bg.js` slot→kare tablosu elle (4 kare × 10 bölüm kontakt sayfasından); `img-prep/`'ten okur.

## 6. Süre ve seslendirme
- Ses: ai33.pro → Minimax → Japanese → **"Dominant Man"** ≈ 5,85 karakter/sn → 10:xx için 3.780–3.830 karakter.
  (Eski ElevenLabs "George" 5,7 c/s — İngilizce sesti, izleyici yakaladı.)
- George ölçümü (5,67 c/s): 10:00 ≈ 3.400 · 10:30 ≈ 3.570 · 11:00 ≈ 3.740 · 13:00 ≈ 4.420.
  Anayasanın 4.300–4.700 bandı 10 değil ~13 dk verir — kullanıcı süre söylerse tabloya bak.
- TTS tahminden ~%10 yavaş: giriş ≤240 karakter (第10位 ≤0:45 kuralı için).
- Süre taşarsa girişi değil まとめ'yi kısalt (0:30 yapısı korunur).

## 7. ai33.pro CDP sürücüsü
- Chrome: ayrı profil + `--remote-debugging-port=9222 --remote-allow-origins=*`; giriş kullanıcıda.
- Betikler: `%TEMP%\claude\cdp\{drive,cdp,tts,shot}.js`, `tts3.js`, `kart-cek.js`, `iller.js`, `gum-*.js`, `png-cek.js`, `pdf-goster.js`.
- "Üret" butonu koordinatla bulunmaz: 8 ikon buton var; doğrusu textarea'nın sağ altındaki 48×48 —
  seçici: metinsiz + `width>=44 && height>=44` + textarea kutusunun içinde.
- Ses seçimi `Use` butonuyla (satıra tıklamak modalı kapatır).
- En yeni kayıt `document.querySelectorAll('audio')[0]`; "Doing" durumunda `<audio>` yok, bekle
  (465 karakter 40 dk sürebildi, 3.611 karakter 2 dk).
- Metni native setter ile yaz, uzunluğu doğrula, sonra üret (`tts3.js`).
- ai33'te Imagen API'si yok (404).
- Kapak kartı: `node render/cards/srv.js &` (port 8744) → CDP `http://127.0.0.1:8744/disclaimer.html` →
  `Emulation.setDeviceMetricsOverride 1920x1080` → `Page.captureScreenshot`.
- Flow: profil `~/.hayalet/chrome-profil`; prompt `div.ProseMirror`, gönder `button[aria-label="Oluşturmaya başla"]`,
  ayar `Video · 720p · 8 sn. crop_16_9 x2`.

## 8. Kullanılmış iller
Kural (K12): aynı il üst üste iki videoda işlenmez, bir tur bekler. Tez her videoda farklı.
| # | İl | Tez |
|---|---|---|
| 1 | 長野 | belgeler mevcut durumu yakalayamamış |
| 2 | 新潟 | her yıl ödenen masraf ve her gün katedilen mesafe fiyata gömülü |
| 3 | 和歌山 (kuzey; 南紀 yok) | şehre yakın, fiyat düşmüyor; yerine şart ekleniyor |
| 4 | 山梨 | aynı ilde fiyat ikiye ayrılıyor |
| 5 | 大分 | fiyatı belirleyen uzaklık değil, çizginin hangi tarafında olduğun |
| 6 | 岐阜 | fiyatı belirleyen ev değil, ona giden yol |
| 7 | 徳島 | satıcı neyi garanti etmediğini fiyatın yanına yazıyor |
| 8 | 富山 | 掲載欄に設備の項目が無い; ne bilinebileceğini belediye belirliyor |
| 9 | 大分 (2. tur) | 備考'da ne zaman boşaldığı + 浸水想定区域; eksen zaman |
| — | 福井 | (video 9; tez kayıtta yok) |
| — | 山口 | (video 10) |
| — | 佐賀 | 「要補修」と書く市と書かない市 — karşılaştırma omurgası |
| 12 | 岩手 | 備考 = alıcının sonra yapacağı işler listesi (sayaç 2→6→7→8→10/11) |
| 13 | 北海道 | 建物面積 yalnız %10 dolu — "yazılmayan" (KuranCard) |
| 14 | 兵庫 | 228 dolu 備考'dan 171 benzersiz — 10 ilan = 10 farklı yazar (BikoCard) |
Not: tablo numaraları log'da tutarsız (bkz. rapor).

## 9. Tez seçimi
- Tez **veriden** çıkar: künyeyi topla → kategori dağılımı → alan doluluk tablosu (建物面積/備考 %) → tuzak dağılımı → tez.
- Doluluk normalse 備考 metinlerini birbiriyle karşılaştır: benzersiz metin / dolu alan oranı.
- Bankanın yarısı ev olmayabilir (arsa); kategori `<h1>`'den okunur, fiyat regex'iyle ayırma.
- Seçim tezi elememeli (北海道: 建物面積 varlığına göre seçilmedi; şart fiyat + foto ≥9 + her belediye bir kez).
- 備考'nun doluluğu belediyenin yazım politikasıdır, ilanın riski değil ("X riskli" deme).
- 商談中/売約済 damgalı kare çıkarılır; durum kontrolü bankaya göre, fark künyeye; belediye listesinde olmayan ilan açıklamada en görünür yere.
- Kart vurgusu sayıda değil tek satırdaysa StatCard'a kelime koy (再建築不可, 記載なし…).
- 「イメージ」 rozeti YOK; tarih yazan ara ekran kartı YOK.

## 10. Banka hacimleri
LIFULL, Eylül 2026: 岐阜 238 (売買居住用196) · 大分 370 (298) · 徳島 101 (83) · 島根 **14** (hepsi 松江, atla).
`iller.js` (8 bölge sayfası, `([一-龠]{2,4}[県都府道])の空き家物件\((\d+)件\)`), 20.09.2026:
岩手567 · 北海道558 · 富山522 · 新潟499 · 兵庫440 · 岡山407 · 大分374 · 青森351 · 福島332 · 鹿児島297 ·
佐賀274 · 茨城273 · 秋田268 · 岐阜239 · 山口230 … Kullanılmamış en büyükler (o tarihte): 北海道 · 兵庫 · 岡山 · 青森 · 福島 · 鹿児島
(北海道 ve 兵庫 sonra kullanıldı).

## 11. Hazır kancalar
- `C:\Users\polat\Downloads\oita-arastirma\adaylar.json` (34 ilan): 臼杵市'de 備考'da açıkça 「再建築不可」 yazan 3 ilan —
  大字諏訪（津留）240万円 · 大字臼杵（城南）100万円 · 大字福良（福良）100万円.
  → 【再建築不可】臼杵市だけで10選 (A.4 coğrafi daraltma; 臼杵'de 55 kayıt). Anayasa §7.1 "EN GÜÇLÜ TUZAK", seride kullanılmadı.
- Ürün: 「備考欄の読み方」 ¥980 — https://bikouran.gumroad.com/l/akiya ; videoda bant (620×168, sağ üst, 60. sn'den) + QR kartı (760×360, ~8 sn).
- Açık karar: video 9/10'daki 富山 artığı uyarı kartı + önizleme.

## 12. Havuz terim notları
- Japonca terim yaz; iç mekân için Commons güvenilmez, ilan fotoğrafına yaslan.
- Kalıcı kara liste: `Japanese country road rice fields` (Hiroshige/Hokusai). `irori hearth`, `washitsu tatami room`, `minka interior` → müze.
- 重要文化財 konaklar, markalaşmış semtler (石見銀山大森, 有松, 倉吉白壁, 津山城東, 萩浜崎, 高岡金屋町), 1971 arşiv serileri → alma.
- Verimli örnekler: `persimmon orchard` 10/10, `Oyabe Toyama` 17/18, kategori turu 233 kare (`Stone walls in Japan`, `Satoyama`, `Machiya`…).
