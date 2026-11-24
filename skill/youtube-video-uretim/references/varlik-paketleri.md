# Edit paketleri ve öğrenilmiş Premiere dili

Repo `varlik\` klasörü. Lisans (Adobe Basics): bitmiş videonun parçası olarak ticari kullanım serbest; paketin kendisi
paylaşılamaz → repo **özel** kalır, paylaşılan Drive kütüphanesine ve başka kişilere paket dosyası verilmez.

## 1. Ne nerede
| Varlık | Yer | Git / Release | Kullanım |
|---|---|---|---|
| 35 animasyonlu arka plan | `varlik/arkaplan/ab-NN.mp4` (1080p30) | Release `varlik-v1` | DNA arka plan rolü `video:ab-NN:sn` |
| 26 film yanığı | `varlik/filmburn/fb-NN.mp4` | Release | geçiş `filmburn:fb-NN:tepe_sn` (screen karışım, tepe an kesimde) |
| 4K orijinaller | `arsiv/orijinal/*-4k.mp4` (varlik/ dışında: Remotion her render'da public/'i kopyalar) | Release (arşiv) | gerekmez; yeniden kodlamak için |
| Katalog | `varlik/katalog.json`, `varlik/onizleme/*.jpg` | git | süre, parlaklık/sınıf (açık/orta/koyu), doygunluk, sıcaklık, 4 baskın renk, hareket, döngü farkı, filmburn tepe anı + siyah oranı |
| SFX (97) | `varlik/sfx/` + `sfx-katalog.json` | git | `sfx.md`, `ses_miks.py` |
| Premiere presetleri | `varlik/presetler/*.prfpset` | git | kaynak |
| Öğrenilmiş preset dili | `varlik/preset-dili-remotion.json` | git | `PresetHareket`, `DnaVurgu`, `DnaGiris` |

Yeni makinede: `git clone` → `py skill/youtube-video-uretim/scripts/varlik_kur.py indir` (gh girişli). Kanal projesine bağlamak:
`py .../varlik_kur.py kanal C:\otomasyon\<kanal>\motion` (src/repertuar, public/fontlar, public/varlik bağlantıları).

## 2. Yeni paket eklemek
1. Zip'i aç: videolar `varlik/arkaplan/` ya da `varlik/filmburn/` (ham ad kalabilir), presetler `varlik/presetler/`, SFX `sfx_kur.py <zip> --hedef varlik/sfx`.
2. `py varlik_kur.py katalog` → adlandırır (ab-NN/fb-NN), 1080p30 kopya üretir, orijinali `arsiv/orijinal/`'e taşır, ölçer, önizleme sayfası çizer.
3. `py varlik_kur.py presetler` → tüm `.prfpset` yeniden derlenir.
4. Sayfayı gözle kontrol et (`varlik/onizleme/arkaplan-sayfa.jpg`). Uygunsuz olanı (logo, yazı, yüz) katalogda `"kullanma": true` yap.
5. `py varlik_kur.py yukle` (yeni mp4'ler release'e) + commit/push.

## 3. Premiere dilini öğrenme (`preset_ogren.py`)
`.prfpset` bir XML'dir: preset → efekt bileşeni (Transform/Motion, Gaussian Blur, …) → parametre → anahtar kareler
(`tick,değer,tip,…,gelen_etki,hız,giden_etki`; 1 sn = 254016000000 tick). Betik her presetin zamanla değişen parametrelerini çıkarır
ve iki kare arasını `cubic-bezier(giden_etki, …, 1−gelen_etki, …)` olarak derler. Remotion'da `PresetHareket` aynı eğriyi oynatır.
Desteklenen izler: konum (normalize x,y), ölçek (yükseklik/genişlik), dönme, opaklık, bulanıklık. Desteklenmeyen (LUT, Lumetri,
Wave Warp, Turbulent Displace, Roughen Edges, metin efektleri) atlanır; gerekirse repertuara elle tekniği yazılır.

Örnek okumalar:
- Snappy Zoom In: ölçek 100→125, 0,67 sn, etki 0,83/0,83 → yavaş başlar, ortada çok hızlanır, sert durur.
- Whip Pan Left: x 0,5→1,26 (0,53 sn), bir karede −0,47'ye sıçrar, 0,5'e döner (1,08 sn).
- Impact Shake (Rotation): dönme ±2,9° her 0,05 sn, sönümlenir; aynı anda ölçek 100→115.
- Slide Up: y 1,57→0,5, 0,75 sn, etki 0,18/1,0 → hızlı giriş, uzun yumuşak duruş.

DNA bu dilden kanal başına bir set seçer: `vurgu` (1 zoom + 1 sarsıntı; `sakin` tonda yalnız smooth zoom), `kayma` (öğe girişi).
Rakip analizinde gözle aynı hareketi görürsen (ör. anahtar kelimede ani zoom) `STIL-DNA.md`'ye "rakipte var" yaz; o zaman DNA'da farklı
sınıf seç (zoom yerine sarsıntı ya da tersi).
