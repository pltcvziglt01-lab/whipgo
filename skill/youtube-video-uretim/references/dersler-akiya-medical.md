# Dersler — akiya (空き家) + medical explainer üretiminden genel kurallar

Kaynak: akiya kanalı DEVAM.md (video 1–14, Eylül 2026) + medical explainer rakip ölçümü (§13) +
tutunma revizyonu (§14). Kanala özel boru hattı: `kanallar/akiya-uretim-hatti.md`.
Bu dosyadaki kurallar kanaldan bağımsızdır; sayılar ölçülmüştür, değiştirme.

---

## 1. Remotion mimarisi

### 1.1 Rol dağılımı
- Ekranda hareket eden her şey Remotion'dan çıkar. ffmpeg yalnızca birleştirici + renk + ses.
- Yeni format/bileşen düşünürken önce "bunu Remotion'da nasıl kurarım" diye sor.
- **Ses Remotion'a KONMAZ.** Sesi en sonda ffmpeg bütün videoya bindirir.
- Son renk düzeltmesi (tv/bt709) ffmpeg tarafında yapılır; Remotion'da uğraşma.

### 1.2 Kurulum
- `node_modules`'ü her projeye yeniden kurma; paylaşılan klasöre junction/symlink bağla
  (Remotion 4.0.522 + Chrome Headless Shell orada).
- `package.json` + `tsconfig.json` kopyalanır. Giriş: `src/index.ts` → `registerRoot(RemotionRoot)`.

### 1.3 JSON sürer, TSX çizer
- Kompozisyonlar veriden üretilir, elle yazılmaz. `Root.tsx` JSON dizilerini okur, her kayıt için `<Composition>`:
```tsx
let photocards = []; try { photocards = require('./photocards.json'); } catch {}
{photocards.map(p => (
  <Composition key={p.id} id={p.id} component={PhotoCard}
    durationInFrames={FPS*5} fps={30} width={1920} height={1080} defaultProps={p} />
))}
```
- `try/catch` şart: JSON'lar sonradan üretilir, Root patlamamalı.
- `gen-*.js` betikleri JSON'u yazar ve görselleri `public/` altına kopyalar.
- Yeni kart türü eklerken DÖRT yeri güncelle: `Root.tsx`, toplu render betiği (`bas.js`),
  montaj betiğinin yerleştirme listesi (`cekirdek`) ve tür sınıflandırıcısı (`kind()`).
  Biri unutulursa kart yerleşmez ya da istatistikte `???` görünür.

### 1.4 Ortak tasarım dili (bileşen yazarken uy)
| Belirteç | Değer |
|---|---|
| Font | `"Yu Gothic UI","Yu Gothic","Meiryo",sans-serif` (JP) |
| Vurgu | altın `#ffd233` |
| Zemin | `#05080f` / lacivert `#0d1b2e` |
| Metin | `#fff`, ikincil `#cfe0ff`, üçüncül `#a9c2ee` |
| Gölge | metin `0 4px 28px rgba(0,0,0,.75)`, kutu `0 30px 90px rgba(0,0,0,.66)` |
| Giriş | `spring({frame: frame-d, fps, config:{damping:200, mass:0.6}})`; sert giriş damping 14-15; kanca 12 |
| Ken Burns | `1 + 0.03*(frame/fps)` — %3/sn, **her zaman içeri** |
| Sayaç | ease-out cubic `e = 1-Math.pow(1-t,3)`, ~0,9 sn |

### 1.5 Bileşen kataloğu (özet; props)
- **Opener** (5 sn, bölüm açılışı, uydu haritası üstünde): `{map, rank, place, priceMan, note, chips[]}`.
  Sıra soldan girer (delay 4), altın çizgi %46'ya uzar (10), yer adı (14), fiyat sayacı (26), chip'ler (40+i*6). Son 12 karede alt bant söner.
- **StatCard** (6 sn, tek büyük rakam): `{bg, ust, sayi, birim, alt, rank, place}`. Arka plan `blur(26px) brightness(.32)`,
  rakam 210 px, birim 74 px. `sayi` sayısalsa 0'dan döner, değilse metin yazılır — **kelime de konabilir** (5-6 karakter sığar).
  Anlatım rakamı okurken denk gelmeli (sınırlar + STT zamanı).
- **PhotoCard** (5 sn, düşük çözünürlüklü foto çerçevesi): `{photo, caption, rank, place, line, pw, ph}`.
  **Çerçeve fotoğrafa göre boyutlanır.** `MAXUP=1.6`, kutu ≤1180×760, foto + 520 px metin bandı tek grup olarak ortalanır (`GAP=72`). Arka plan `blur(34px)` kopya.
  Kutu: `min(1.6, 1180/w, 760/h)`.
- **Intro** (tek kompozisyon, `intro.json` sürer): `Shots` (her çekim 0,35 sn bindirmeli açılış, %2,5/sn KB, `rgba(3,6,12,dark)` perde),
  `LineView` (`soru` 56 px alt üçte bir / `damga` 1,6×'ten oturan kırmızı zeminli −1,2° gerçek alıntı / `buyuk` 84 px ortada / `kanca` tam ekran alıntı + altın sol kenarlık + fiyat),
  `StatView` (sayaç + bar grafiği; satır birimi prop: `satirBirim`), `PreviewView` (4 kart).
- **Montaj** (fotoğraf sayısının kendisi tez ise): tüm kareler 0,28–0,5 sn, sağ altta sayaç 1→N.
  Kutu: `min(1500, w*maxUp) × min(880, h*maxUp)`, `maxUp` 1,6. Süre kare sayısından okunur, sabit değil.
- Video-özel karşılaştırma/metin kartları: `TaihiCard` (iki 備考 yan yana), `BunshoCard` (metnin kendisi satır satır),
  `KuranCard` (alan dolu ○ / boş gri çizgi), `HikakuCard` (yatay çubuk grafik), `BikoCard` (orijinal alan metni çizgili kağıtta).
- Medical: `Zaman.tsx` (`useAcilis()`, `yay()`), `Akis.tsx`, `AkisCizgisi.tsx`, `Fotografik` (`klipler`).
- Değişen metinleri (başlık, birim, il adı) **prop yap**, bileşene gömme (gömülü 「新潟県内の…」 ve `件` başka videoda ekranda kaldı).

### 1.6 Prop JSON şekli (örnek)
```json
{"id":"op-s10","map":"s10-pin.jpg","rank":10,"place":"…","priceMan":1850,"note":"…","chips":["…"]}
{"id":"st-s10","bg":"bg/s10.jpg","rank":10,"place":"…","ust":"…","sayi":"22","birim":"年","alt":"…"}
{"id":"pc-r04-a-01","photo":"kart/r04_a-01.jpg","caption":"外観","rank":4,"place":"…","line":"…","pw":480,"ph":360,"srcW":300,"srcH":225}
{"durSec":144.29,"shots":[{"src":"intro/giris01.mp4","from":0,"dur":3.12,"video":true,"dark":0.2}],
 "lines":[{"text":"…","from":0.3,"dur":2.9,"kind":"buyuk"}],
 "stat":{"from":99,"dur":22,"total":458,"rows":[{"ad":"…","n":105}]},
 "preview":{"from":121.4,"dur":22.6,"items":[{"img":"…","ust":"…","alt":"…"}]}}
```
Tüm yollar `public/`'e görelidir, `staticFile()` ile okunur.

### 1.7 Render bayrakları
```bash
npx remotion render intro out/intro.mp4 --log=error --concurrency=4   # ~2-3 dk
npx remotion render op-s10 out/op-s10.mp4 --log=error                 # ~30 sn
npx remotion render pc-r04-a-01 out/pc-r04-a-01.mp4 --log=error       # ~40 sn
npx remotion studio                                                    # gözle bakmak için
```
- Uzun kompozisyonda `--concurrency=4` en iyisi; fazlası Chrome'u boğar.
- Çok sayıda kompozisyonu id listesini döngüye alan betikle bas.
- Uzun render'ı **borusuz** (`--log=info`) arka planda çalıştır, ilerlemeyi çıktı dosyasından oku.

### 1.8 Remotion tuzakları
- Kompozisyon id'si yalnız `a-zA-Z0-9-`. Aksi hâlde sessizce bulunmaz (`pc-r04-a-01` ✓, `pc_r04/a01` ✗).
- Klip için `OffthreadVideo` (Video değil), `muted`.
- `Sequence durationInFrames` çekimden ~0,4 sn uzun tutulur (bindirmede alttaki kaybolmasın).
- `staticFile('a/b.jpg')` — baştaki `/` yok; dosya `public/` altında olmalı.
- **Bileşene çıkış fade'i koyma.** ffmpeg zaten xfade yapıyor; ikisi binince ~0,5 sn siyah oluşur. Giriş spring'i kalsın.
- Aynı klip iki kartta devam edecekse ikincisinde `startFrom` ile kaldığı kareden başlat (yoksa sıçrar).
- Sabit gecikmeli belirme (`sirali()`, ör. 42 kare) uzun kartta ölü zaman yaratır → belirmeleri süreye oranla yay (`yay()`).
- Görseller `public/`'e kopyalanmadan render başlatma (eksik pin dosyası → 404 ile düşer). Önce dosya sayısını kontrol et.

---

## 2. ffmpeg motoru (`build.js` mantığı)

- **Parçalı paralel render:** 20 görsel/parça, 5 eşzamanlı iş, sonda `concat` (yeniden kodlama yok). 30 dk video ≈ 4,5 dk build.
- **Ken Burns:** `zoompan`, jitter olmasın diye 3× upscale, kapalı formda doğrusal zoom. Kart/klipte `upscale=1`, zoompan yok (`still`/`clip` desenleri).
- **Geçiş:** `xfade` zinciri 0,1–0,2 sn, sert kesim yok. Son kare için `tpad=stop_mode=clone`.
- **Klip:** `\.(mp4|mov|webm)` deseni; süre ffprobe'dan, kısaysa son kare klonlanır.
- **Çapa:** bölüm başları ölçülen sınırlara oturtulur; **her çapadan sonra yerleşimi (`layoutInto()`) yeniden çalıştır** — yoksa yuvarlama birikir (son bölümde −5,8 sn kayma yaşandı). Son çapadan sonraki uzatmayı tüm kliplere dağıt.
- **RENK (kritik):** zincire `scale=in_range=pc:out_range=tv` + `setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, kodlayıcıya `-color_range tv -colorspace bt709`. Yapılmazsa `yuvj420p` etiketlenir ve Windows oynatıcıları açmaz.
- Filtre grafiği **daima dosyadan**: ffmpeg 9 `-/filter_complex`, eski sürüm `-filter_complex_script`.
- Son geçiş (`finish2.js`): tek yeniden kodlamada kapak/uyarı kartı, rozet, QR, alt bant bindirilir. Boş liste gerekiyorsa `[]` içeren dosya ver (`/dev/null` Windows'ta çalışmaz).
- `blend` girdilerini önce `format=gbrp` yap; yuv/rgb24 ile chroma bozulur, kare yeşil çıkar.
- `blend` + `all_opacity`: `çıktı = (1-op)·[0] + op·blend([0],[1])` → baskın olmasını istediğin görüntü **[0]** olmalı. Opaklığı düşürmek [0]'ı güçlendirir.
- Karanlık kareyi kaldırma: `eq=brightness=0.10:contrast=1.06`.

### Ölçülmüş spec (referans fotoğraf kanalı)
- Görsel süresi medyan **4,1 sn** (Q1 3,5 / Q3 5,0); cross-dissolve **0,1–0,2 sn**; KB her zaman içeri ~%3/sn (39/39).
- Anlatım 173–177 kelime/dk; uyarı kartı 0–0,78 sn; bölüm etiketi 2,5–2,8 sn.
- Sabit kliplerle bölümde görsel yuvası: `yuva = (span - sabitKlipler) / 4.1`.
- Ulaşılan iyi değerler: medyan 3,63–3,77 sn (Q1 ~3,1 / Q3 ~4,5–4,7).

---

## 3. QC listesi (teslimden önce HER SEFERİNDE)

- [ ] Süre = ses süresi; baş ve son tam çözülüyor; `yuv420p` + `color_range=tv` + `bt709`.
- [ ] Manifest: tekrar 0, eksik 0, sınıflandırılamayan 0.
- [ ] Tür dağılımını say (ör. harita / ilan / havuz / kart) — tek satırlık kontrol; bir tür sessizce baskın olabilir.
- [ ] Her bölüm sadece kendi konusunun görsellerini kullanıyor.
- [ ] **Tam tarama** (yeşil/siyah/beyaz kare):
```bash
ffmpeg -v error -i final.mp4 -vf "fps=2,scale=8:8" -f rawvideo -pix_fmt rgb24 - \
 | node -e "…8x8 ortalama: g>r+35&&g>b+35 → YEŞİL, maxv<24 → SİYAH, minv>245 → BEYAZ"
```
- [ ] Ara görselleri (harita katmanları, havuz) teslimden önce ayrı ayrı 8x8 ölçütünden geçir; ortalama parlaklık <48 olan havuz karesini at.
- [ ] 24–32 noktadan kare çek, kontakt sayfası yap, **GÖZLE bak** (clipart, tabela, yüz, filigran, yanlış yer, damga, logo, plan yanlış yerde).
- [ ] Bölüm açılışları doğru sıra/yer/fiyatla doğru saniyede (sınırlardan kare çek, tek sayfada karşılaştır).
- [ ] Şablondan taşınan metinler (il adı, başlık, önizleme) yeni videoya ait (`grep`).
- [ ] Açıklama: zaman damgaları ölçülen sınırlardan; linkler sırayla; UTF-8 **BOM'lu**.
- [ ] Lisanslar kayıtlı; NC/ND sıfır; künye dosyası yazıldı.
- [ ] Taramadan önce dosyanın **zaman damgasına bak** (eski çıktıyı taramak yaşandı).
- [ ] QR varsa: PNG'den VE H.264 crf20 sonrası kareden `jsqr`+`pngjs` ile oku; hata düzeltme seviyesi H.
- [ ] "Bitti" demeden önce dosyayı aç ve bak: tarama + kontakt sayfası + kare örnekleme üçü birden.

---

## 4. Shorts 9:16 tarifi

**Teknik:** 1080×1920, 30 fps, h264 yuv420p tv/bt709, AAC 48k stereo. Süre 20–50 sn (tatlı nokta 32–38), 60'ı geçme.
Güvenli alan: üstten **180 px**, alttan **420 px** boş. Tamamen Remotion'da kur; ffmpeg sadece sesi bindirir. Uzun videonun tasarım dilini koru.

**İçerik kalıbı:**
```
0,0–2,5 sn  KANCA   tek cümle + tek görsel, ana rakam/fiyat HEMEN ekranda
2,5–8 sn    ÇELİŞKİ beklenen → gerçek (sert dönüş)
8–22 sn     KANIT   2-4 gerçek görsel + alıntı damgaları
22–32 sn    RAKAM   StatCardV: tek büyük sayı
32–38 sn    KAPANIŞ "devamı ana videoda" + uzun videonun başlığı
```
Her kesme 1,5–3 sn (dikeyde tempo uzun videonun iki katı).

**Bileşenler** (`motion/src/short/`, ayrı 1080×1920 `<Composition>`):
- `ShotV` — `objectFit:'cover'` tam kırpma; önemli kısım ortada değilse kullanma.
- `PhotoBoxV` — **varsayılan**: 16:9 foto 1080×608 kutuda üstte, arkası `blur(40px)` kopya, altında yazı bandı.
- `AltyaziV` — cümle cümle (STT'den), 60 px, `fontWeight:800`, kalın kontur (~6px), y ≈ 1350. **Altyazı zorunlu** (ses kapalı izleniyor).
- `StatCardV` — rakam 260 px, birim 90 px. `DamgaV` — damga, 70 px.
- Sürücü `short.json` → `{durSec, shots[], lines[], stat, kapanis}`; kapsama denetimi (boşluk yok).

**Ses:** (1) kesit: uzun videonun sesinden cümle sınırından ~30 sn kes `ffmpeg -ss X -t Y -i vo48.wav short-vo.wav`; (2) yeni seslendirme → STT yeniden.
Bindirme: `ffmpeg -i short-video.mp4 -i short-vo.wav -c:v copy -c:a aac -b:a 192k -shortest short.mp4`

**QC:** 1080×1920, ≤60 sn, renk etiketi; ilk 2 sn'de rakam ekranda; her cümlede altyazı güvenli alanda; görseller onaylı + künye; ana videoya yönlendirme; tam tarama.

---

## 5. Rakip ölçüm yöntemi ve hedef değerler

### 5.1 Yöntem ve betikler
- `analiz/cumle-gorsel.py`: YouTube kelime zamanlı altyazı (`yt-dlp --write-auto-subs --sub-format json3`) + 0,1 sn kare farkı sinyali → cümle ve görsel sınırları.
- `kiyas.py "<video.mp4>"`: **iki videoyu da aynı eşikle** ölçer. Farklı eşik = yanlış sonuç (ilk denemede oldu).
- `analiz/tur-sure.py`: görselleri doygunluk + kenar yoğunluğu + renk çeşitliliğiyle sınıflar, tür başına süre.
- `analiz/canlilik.py`: kart sınırları hariç kart içi hareket / ölü zaman.
- `uslup.py`: transkript üslup ölçütleri; `kisalt.py`: uzun cümleleri olgu değiştirmeden böler.
- Tüm görselleri tek tek çıkarıp kontakt sayfasında bak (`analiz/gson/*.jpg`) — sayı yetmez, tür envanteri gözle çıkar.

### 5.2 Rakip ölçümü (779,6 sn explainer)
| Ölçüm | Değer |
|---|---|
| Cümle | 325; süre medyan **2,16 sn** (Ç1 1,60 / Ç3 3,04); **7 sn üstü yok** |
| Görsel (sert kesme arası) | 69; medyan **9,3 sn** (Ç1 5,7 / Ç3 14,6); en uzun 28,7 |
| Görsel başına cümle | medyan **4** (Ç1 3 / Ç3 6); en çok 12 |
| Kart içi belirme | 83 (görsel başına 1,2) |
| Toplam görsel olay | 207 → **15,9/dk** → ~3,8 sn'de bir |

Tür bazında: fotoreel/illüstrasyon 63 adet medyan 9,3 (5,8/14,4, max 28,7); düz kart 6 adet medyan 11,2 (5,8/16,6, max 21,8). %90'ı 18 sn altında.

### 5.3 İlk 30 sn ve ilk %30
- İlk 30 sn: 16 cümle · 5 görsel · 7 olay (14/dk). Tek kelimelik cümlelerle açılış, ilk görsel 9,2 sn sabit; **5 görselde 5 farklı tür** (metin → fotoğraf → aynı fotoğrafa bindirme → blueprint → kırmızı iddia kartı).
- İlk %30 vs sonrası: cümle medyanı 2,12 vs 2,16 (**0,98×**); görsel medyanı 7,50 vs 10,60 (0,71×); olay/dk 22,8 vs 13,0 (**1,76×**); görsel başına cümle 3 vs 4.
- **Konuşma hızı değişmiyor; sadece görsel daha sık değişiyor.** "Girişi hızlandır" = görseli sık değiştir, metni değil.
- Uzun sahneyi anlatımı bölmeden **görsel evrelere** böl (ör. çizim → akış → ters akış). Böylece kart 45→50, ilk %30'da 16→~25 (rakip 22).

### 5.4 Kart türü dağılımı (ilk %30, 22 görsel)
metin %32 · fotoğraf %23 · blueprint (turuncu teknik çizim, ölçü okları, ön/yan görünüş) %23 · veri/karşılaştırma %14 · şematik analoji %9.

### 5.5 Hedef değerler
```
cümle süresi         medyan 2,0-2,4 sn   ·  hiçbiri 7 sn üstü olmasın
görsel süresi        medyan 9-11 sn      ·  Ç3 ≤ 16 sn  ·  en uzun ≤ 30 sn
görsel başına cümle  medyan 3-5
olay / dakika        14-16               ·  ilk %30'da 20-24
ilk %30 / sonrası    1,6-1,9×
tür dağılımı         metin %30 · fotoğraf %20 · blueprint %20 · veri %15 · şema %15
tek çekim            ≤ 12 sn ekranda (uzunsa klip değişir veya kademeli liste döner)
ölü zaman (kart içi) rakip %56; bizde %82 → %44'e indirildi
```
İlk sürümümüz: olay/dk 7,4 (0,46×), görsel medyanı 15,2 (sonra 16,4), en uzun 90,4 sn — sorun uzun kartların ölü kalmasıydı; açılış şekli doğruydu (ilk 30 sn 18 olay/dk).

### 5.6 Ses hızı ölçümü
- Her seste doğal hızı yeniden ölç; tüm zincir buna bağlı. Örnek: Deep-toned Man (minimax) 175 wpm → `speed` 0,94; Chris (11L) 188 wpm → `speed` 0,86 (1698 kelime: 10:39 → 11:56). Rakip hedefi 165 wpm.
- Ses değişince yeniden kur: cümle sınırları → kart süreleri → toplam süre → render (`sesdegis.sh <voice_id>` yedi adım).
- Japonca: karakter/sn ölç (5,67 c/s; başka ses 5,85 c/s). Hedef süre için karakter = süre × hız. TTS tahminden ~%10 yavaş çıkabilir — pay bırak.
- Bir sesin dilini doğrula (İngilizce bir ses Japonca metne verilmişti; izleyici yorumu yakaladı).

### 5.7 Üslup ölçümü (`uslup.py`)
| Ölçüt | Rakip | Biz önce | Biz sonra |
|---|---|---|---|
| kelime/cümle | 5,4 | 10,2 | 6,3 |
| kısa cümle (≤8) | %80 | %51 | %75 |
| uzun cümle (≥20) | %0,6 | %9 | %0 |
| Flesch | 91 | 80 | 84 |
| soru | %3,4 | %1,2 | %2,5 |
| 3+ heceli | %5,9 | %7,7 | %7,9 |

Hedef: kelime/cümle ≤7 · kısa cümle ≥%70 · 20+ kelime yok · Flesch ≥83 · soru ≥%2. "Amatör" hissin yazı kaynağı uzun cümleydi.
Konu terimlerinden gelen hece sapması kabul edilebilir.

### 5.8 Görsel kalite ("amatör" teşhisi)
- Rakip kartı iki katman: **doku** (~%40 kart, difüzyon modeli illüstrasyonu — Claude yapamaz) + **hareket** (bar, akış, aktif satır — Remotion).
- Çözüm: kart zeminine Flow/Nano Banana illüstrasyonu (aynı stil istemi, "no text, no labels"), üstüne animasyon.
- Kullanıcı kuralı: canlı renk, derinlik/detay, kolay okunur font, küçük yazı yok.
- Yazı ağırlıklı kartta **kare genişliğinde sürekli hareket öğesi** şart (tam genişlik akış çizgisi). Küçük nokta/imleç/el yazısı ölü zamanı değiştirmedi (%89 → %90); tam genişlik çizgi %90 → %44.
- Anlatım art arda 4'ten fazla rakam okuyorsa o bölüme grafik koy.

---

## 6. Tutunma (retention) dersleri

### 6.1 §11 retrofit — ve neden geçersiz sayıldı
- Retrofit: 0:30 civarı kırılma için metin formülü (0. sn gerçek alıntı + fiyat, ~8 sn ikinci alıntı, 0:30'da yarıda kesilen cümle, cevap 31–35 sn) + `kanca` satırı + giriş temposu 1.8/1.8/2.4 sn/kare (0–30 sn'de 17–18 kare, ort 1,67–1,76 sn).
- Retrofit yöntemi (yeniden seslendirmeden): yeni giriş TTS → yeni giriş + eski gövde birleştir → tüm çapaları kaydır → giriş zamanlamasını yeni STT'den yaz → yeniden render.
- **Geçersiz:** "Sonuç" tablosu tutunma değil, betiğin kendi ürettiği kare sayısını ölçüyordu; yayın sonrası tutunma verisi yoktu.
  Nedensellik tersti: tek başarılı video (0:30'da %70, 10.000 izlenme) **3,65 sn/kare** ve ilk 30 sn'de ekranın yalnız **%37**'si yazıyla kapalıydı;
  hızlı kesilenler 1,71–1,86 sn/kare, yazı %51–84, izlenme 4.100 → 283.
- **Ders:** bir düzeltmeyi kendi çıktı metriğiyle değil, platform tutunma verisiyle doğrula. Varsayımı ölçüm sanma.

### 6.2 §14 teşhis
- CTR %6,1 / 10.600 gösterim → kapak sorun değil. AVD %24,3; 0:30'da %57 (JP kıyas %40-60, normal).
- **Asıl kayıp 0:30 → 1:30** (%57 → %33). Önsöz payı %11,4'ten %18,1'e büyümüştü; ilk 60 sn'de hiç asıl içerik (ev) yoktu.
- Niş kazananları 7/7 "ne alacaksın" sözleşmesini medyan **0:30**'da kuruyor; içerik başlama medyanı **0:40** (en erken 0:29). Bizde 1:43–1:59.

### 6.3 12 madde
**A. Giriş** (ilk içerik maddesi en geç 0:45, hedef 0:35)
1. İlk kare asıl konu (ev): tam ekran, bulanık değil, yavaş zoom; ilk cümle rakamı söyler.
2. Tek alıntı satırı fotoğrafın üstüne telop; ardından "bu rakamın sebebi var" — rakam asla çıplak verilmez.
3. Sözleşme cümlesi 0:25'ten önce ("bugün X tane, şuradan şuraya").
4. Vaat kısmi olsun, boş değil: 1. sıranın rakamı + yeri + nedeninin yarısı söylenir.
5. Girişten çıkar: istatistik/bar grafiği, sorumluluk beyanı, montaj, önizleme kartları (~75 sn "göstermek yerine vaat etmek"). İstatistik ilk maddeden sonra; beyan sabit yoruma + 4 sn alt telopa.

**B. Yazı**
6. Tam ekran metin kartı YOK; hepsi fotoğraf üstü telop (anlatım ~5 kar/sn > okuma ~4 kar/sn; kart ayrıca konuyu siliyor).
7. Telop: ≤35 karakter, ≤2 satır, süre ≥ karakter/4 sn.
8. İlk 30 sn'nin en fazla %40'ı merkez yazıyla kapalı.

**C. Tempo**
9. 0–30 sn kare süresi **3,3–3,8 sn** (`segT(...,3.5)`). Kesme sayısı değil, kesmenin bilgi taşıması önemli.
10. Gövdede kesmeler ilişkili: aynı konunun başka açısı (ev → ev → harita → ev, manzara en sona).

**D. Bölüm**
11. Her bölüm asıl konuyla (ev) açılır, haritayla değil (4,1–4,3 sn gecikme ✓; 11,9–13,4 ✗).
12. Her sıra geçişi duyulur: SFX + ekranda numara + yarım sn sessizlik + sabit "7/10" göstergesi. Bölüm işaretleyici (chapters) EKLEME — geri sayımda atlama daveti.

**E. Ayrıca:** müzik yatağı 100–120 BPM vokalsiz; JP anlatım hedefi 300 字/分 (NHK 300–350; ölçülen 344).
**Değiştirme:** aynı anda iki değişken değiştirme (süre, ses, sayım yönü sabit kaldı) — yoksa neyin işe yaradığı ölçülemez.

---

## 7. "Ekran sesi takip eder" senkron sistemi

Olay/dk ölçümü senkron sorununu YAKALAMAZ (5 cümle konuşulurken ekranda 3 kelime varken olay sayısı yüksekti).
1. `cumle-zaman.py` → sahne sesinden cümle sınırları (`cumleler.json`); en uzun duraklamalar sınır sayılır (TTS virgülde de durur).
2. `Zaman.tsx → useAcilis()` → her bileşenin belirmesi cümle karesine oturur.
3. `Akis.tsx` → görsel öğesi olmayan cümleye kısa damıtılmış satır (`akis: [{c: cümleIndeksi, t: 'kısa metin'}]`), anlatımın kopyası değil.
4. Aktif satır vurgusu: konuşulan satır parlar, öncekiler söner.
5. Cümleye bağlı klip değişimi: `klipler: [{c: cümleİndeksi, k: 'dosya.mp4'}]` — liste anlatırken her maddeye ayrı çekim.
6. **Denetim (kullanıcıya göstermeden ÖNCE):** `senkron-denetim.py` (her kartın cümleleri karşılanıyor mu) + cümle anı kare denetimi (her cümlenin anındaki kareyi çıkar, söylenenle karşılaştır).
Yakalanan hatalar: indeks kayması yüzünden söylenen sayı ekranda yok; görsel bir cümle erken; markdown `---` ayracı cümle olarak sızmış.

---

## 8. Kalıp rotasyonu / tekrar eden içerik (YPP riski)

Sorun: 10 videoda aynı geri sayım, kartlar, giriş/çıkış, neredeyse aynı başlık → "tekrar eden içerik".
**Her yeni videoda beş eksenden EN AZ ÜÇÜNÜ değiştir:**
1. O videoya özel Remotion bileşeni yaz (havuz büyür, her video imza taşır).
2. Bölüm dizilimini değiştir (ör. açılıştan sonra önce asıl konu, sonra manzara).
3. Çekirdek kartı bölüme göre değiştir (sayı varsa StatCard, karşılaştırma varsa yan yana kart, sayı yoksa metnin kendisi).
4. Giriş ve çıkış yapısını değiştir (alıntı kancası ↔ karşılaştırma kancası; kapanış litanisi ↔ tek tersine çevirme).
5. Başlık kalıbını değiştir (sabit kelimeleri düşür).

Formatın kimliği (geri sayım, Opener) bozulmaz; değişiklik eksenlerde olur.
Tez her videoda farklı ve **veriden** çıkar: önce künyeyi topla, dağılıma bak, sonra tezi yaz. Uydurma tez kanalı bitirir.
Kanalın kendi imzası (medical örneği): bölüm geçişinde EKG çizgisi, 4,5 sn döngüde ±%2,5 "nefes alan" zemin ışığı, aktif satır, iki katmanlı kart.
Rakibe benzetirken: **yapı kopyalanır, cümleler %100 özgün.**

---

## 9. Başlık: kaynak videonun kelimeleri korunur

- Kural (§13.19): başlık = **kaynak/yüksek izlenmeli videonun başlığı birebir** + em dash + kanca.
  Örnek: kaynak "Volts, Amps, and Watts Explained" → rakip "Volts, Amps & Watts Explained — and Which One Kills You".
  Bizim hata: 19,68 M izlenmeli "How does anesthesia work?" yerine "Anesthesia Explained" uyduruldu → düzeltildi:
  `How Does Anesthesia Work? — and the Dose That Doesn't Wake You Up`.
- Arama ifadesi başta olduğu için 60 karakteri aşmak zararsız (kırpma kancanın kuyruğunu vurur).
- **Çelişki notu:** "yapı aynı, kelimeler özgün" (§13.8) gövde metni için geçerli; **başlıkta tersi** — arama ifadesinin kelimeleri korunur.
  §12 rotasyonu ise kanalın KENDİ videoları arasında başlık kalıbını değiştirmeyi ister. Uzlaştırma: aranan ifade (kaynaktan) sabit kalır; kendi seri kalıbımızın kelimeleri (ör. sabit ek/kalıp) video video değişir.

---

## 10. Görsel kaynak ve doğrulama kuralları (genel)

- İndirilen HER görsel partisi kontakt sayfasıyla GÖZLE incelenir (portallar gerçek fotoğrafların sonuna clipart/tabela ekliyor). Sayısal eşleşme yetmez.
- Otomatik seçime güvenme ("kapak" modu = dış görünüş değil). Kritik kareleri (giriş montajı, arka plan slotları) kontakt sayfasına bakıp **elle sabitle**; `01.jpg`'yi varsayma.
- Dosya↔lisans eşleşmesi atomik: indir→doğrula→meta aynı döngüde, SHA-1'li.
- Dedup: 16x16 gri average-hash, Hamming ≤14; döndürmeye duyarsız yap. Birden çok ajanın çıktısını birleştirirken sha1 dedup.
- Düşük çözünürlük: 900 px altı tam ekran verilmez; büyütme ≤1,6× çerçeve; tam ekran eşiği ×2,5 (×2,2 çok kare düşürüyordu). Çok düşükse (medyan büyütme >3,0, ≥8 kare) montaj.
- Ortadan geçen filigran kurtarılamaz (crop/delogo işe yaramaz); kenardaki küçük logo alt %10 kırpılarak kurtarılır.
- Dosyanın içine gömülü beyaz kenar: 240 px'e küçült, %97+ beyaz satır/sütunu kırp; kenar toplamı <%4 ise veya içeriğin >%30'u gidecekse dokunma. Arka plan üretimi kırpılmış klasörden okusun.
- EXIF rotasyonu uygulanmamış olabilir: iki yönü üret, gözle karşılaştır, `transpose`, orijinali sakla.
- Üretim notunu ekranda görünen alana (açıklama/başlık) yazma; ayrı alana koy.
- Stok havuzu (Commons) ~%60 çöp: tam denetim, kararsızsan KULLANMA. Ret sebepleri: KONU_DISI, KURUMSAL, YER_YANLIS, TABELA, SANAT, KALITE, INSAN, BUYUK_SEHIR, **TEKRAR**.
- Denetim brief'ine "tek seri/nesne havuzun %5'ini geçmesin" + TEKRAR ret sebebi koy; ajanlar tekrarı kendiliğinden görmez.
- Terim yazımı: hedef dilde yaz; çok kelimeli İngilizce tanım cümleleri ~0 sonuç (20'den 17'si sıfır); işe yarayan `incategory:"..."` ve 2-3 kelimelik yer nitelemeli sorgu. Homonimlere dikkat (yer adı + bölge adı bile yetmiyor). Verimsiz terimi kalıcı kara listeye al.
- Korunan tarihî yapı / turistik "markalaşmış" yer / eski arşiv karesi asıl konu sanılır → havuza alma. "Anonim doku" kalabilir.
- Konuyla ilgisiz havuz hiç kullanılmayabilir; montaj havuzsuz da çalışmalı (uyarı verip devam).
- Bir alıntının hangi ALANDAN geldiğini, metinde geçip geçmediğinden önce kontrol et.
- Bir kategoriyi saymadan önce veride hangi kelimelerle yazıldığını listele (`match(/[^\n、。]*<kök>[^\n、。]*/g)`).
- Ürün/kapak cümlesi neyi iddia ediyorsa kod tam onu saymalı. İki dosya arası string eşleşmesi varsa "sıfır olan kaç tane" sayan satır yaz.
- Kaynaklar arası çelişki (tarih/alan) çıkarsa ve ses kayıtlıysa açıklamaya not düş, videoyu değiştirme.
- Koordinat/geocode sonucu doğrulama alanıyla kontrol et; mesafe tutmuyorsa haritayı koyma (48,9 km sapma yaşandı).
- Tam genişlik rakam (`５`) `\d` ile eşleşmez → önce 0xFEE0 çıkar.

---

## 11. Alınan dersler / tuzaklar

| Belirti | Neden | Çözüm |
|---|---|---|
| Regex hiç eşleşmiyor, ölçüt "0" (veri sonucu sanılır) | Bash heredoc `\b`'yi backspace (0x08) yapıyor | Regex/kaçışlı dosyayı Write aracıyla yaz; şüphede `sed -n 'N,Mp' f \| cat -A` ile `^H` ara |
| `node - <<'EOF'` yaması bozuk, JS'e gerçek satır sonu girmiş | Heredoc içinde `\n` tek ters bölüye iniyor | Write/Edit kullan veya `String.fromCharCode(92)`; `new RegExp('...')` |
| Render dosyası yok, görev exit 0, hata yok | `npx remotion render … 2>&1 \| tail -4` | Borusuz `--log=info`, arka planda, ilerlemeyi dosyadan oku |
| Kontakt sayfası hep ilk karelerden başlıyor | `-start_number` + `tile` sessizce yok sayılıyor | Her sayfa için kareleri geçici klasöre `001..024` kopyala, `-update 1` |
| `tile` sadece ilk kareyi alıyor, gerisi dolgu | Girdilerde farklı SAR | Küçültürken `setsar=1,format=yuvj420p` |
| Kullanıcı videoda yeşil ekran sanıyor | xstack dolgusu yeşil | Dolgu `color=c=black` |
| `xstack` patlıyor, `&&` zinciri kesiliyor, eski dosya taranıyor | Tek girdiyle çağrı | Tek kare yolu ekle; taramadan önce zaman damgasına bak |
| "Padded dimensions cannot be smaller" | `pad` + `force_original_aspect_ratio=decrease` | `increase` + `crop` |
| ffmpeg ifadesi 0'a düşüyor | `execFileSync` filtresinde tırnak | Kabuk yok → tırnak yok |
| drawtext fontconfig hatası | Makine ortamı | Kontakt sayfasında drawtext kullanma, sıra düzeniyle takip et |
| Windows oynatıcı dosyayı açmıyor | `yuvj420p` etiketi | tv/bt709 zinciri (§2) |
| Blend sonrası kare yemyeşil | yuv/rgb24 girdi | Önce `format=gbrp` |
| Opaklık düşünce katman daha baskın | `all_opacity` [0]'ı korur | Baskın olacak görüntüyü [0] yap |
| ~0,5 sn siyah geçiş | Bileşen çıkış fade'i + xfade | Bileşende çıkış fade'i yok |
| Son bölüm −5,8 sn kayık | Çapalar arası yuvarlama birikimi | Her çapadan sonra yerleşimi yeniden hesapla |
| Eski süreyle render | Kaynak ses değişti, türev wav'lar eski | Ana ses değişince türev dosyaları DERHAL yeniden üret |
| Yeni videoda eski il/başlık/önizleme metni ekranda | İskeleyle kopyalanan şablonlar (kart HTML, sabit tablolar, çıktı adı, UA satırı, önizleme metinleri) | Yeni iskelede ilk iş `grep` ile denetle (ör. `grep -o "[一-龠]\{2,3\}県" disclaimer.html`) |
| Not Defteri'nde bozuk Türkçe/Japonca | BOM yok | Teslim txt'leri UTF-8 BOM'lu |
| Terim dosyası 400/400 çöp | Düz string dizisi destructure edildi (terim=1. karakter) | Biçimi (`[["terim","grup"],...]`) toplama öncesi `node -e` ile doğrula; ilk 18 karelik kontakt sayfası |
| Havuz sessizce çöküyor | Ajanların alan adı (`file`/`f`) farklı | İki adı da kabul et; ajan çıktısını şemaya karşı doğrula |
| STT "öldü" sanıldı | Ara çıktı yok, dosya sonunda yazılıyor | Önce çıktı dosyası var mı bak, sonra süreç listesi |
| Arka plan işleri öldü (exit 127) | Ajan `Stop-Process -Name node` çalıştırdı | Ajan brief'ine toplu node kapatma yasağı |
| Ajan "hepsine baktım" ama hata var | Ajan raporu doğrulanmamış | Örnekleyerek doğrula; kontakt sayfasını kendin yeniden üret |
| Headless Chrome `--screenshot` "Erişim engellendi" | Göreli yol | Mutlak yol |
| `python -m http.server` ölüyor | Makine ortamı | 6 satırlık node sunucusu |
| PDF/kart eski içerikle basılıyor | Sunucu bayat kopyayı servis ediyor | Basmadan önce servis edilen dosyanın mtime'ı |
| Teslim klasörü yok | Windows klasör yönlendirmesi taşımış | Teslimden önce yolu doğrula; Türkçe karakterli yolda PowerShell ile kopyala |
| Flow klipleri gelmedi (6'dan 1) | Harici üretim zaman aşımı | Kurgu Flow'suz da tam olmalı; zaman çizgisi elde olana bölünür, siyah boşluk kalmaz |
| Flow hasadında eski görseller karıştı | Eski proje sayfasında toplama | Her parti için YENİ proje; isimlendirme içeriğe bakarak |
| TTS eski metinden üretti | `Ctrl+A + insertText` sessizce başarısız | Native setter ile yaz, uzunluğu doğrula, sonra üret |
| ProseMirror alanı bozuluyor | `innerHTML` ataması | Tıkla + `Input.insertText` + Enter |
| Dosya yükleme diyaloğu açılmıyor | Tıklama | `DOM.setFileInputFiles`; input'u index'e göre değil atasının metnine göre bul |
| CDP `/json/new` reddedildi | GET | `PUT` kullan |
| Chrome PDF görüntüleyicide `#page=` çalışmıyor | Aynı URL | Arada `about:blank`'e git |
| Kapak sayfası kenar boşluğu | Negatif margin çalışmıyor | `@page kapak{margin:0}` + `.tam{page:kapak;height:297mm}`; ızgaraya `break-inside:avoid` |

---

## 12. Ortam notları (genelleşenler)

- Node 24, Python 3.14 (`py`; playwright + psutil), **ffmpeg 9** (`-/filter_complex`), Chrome (headless kart + CDP).
- Windows: ffmpeg filtre yolunda `C:` → `C\\:`; filtre daima dosyadan; `/dev/null` yok (boş dosya ver).
- Kart/kapak üretimi: HTML → yerel node sunucusu → headless Chrome ekran görüntüsü 1920×1080 (veya CDP `Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot`).
```js
require('http').createServer((q,s)=>{const f=require('path').join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));
 try{s.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html; charset=utf-8':'application/octet-stream'});
 s.end(require('fs').readFileSync(f));}catch(e){s.writeHead(404);s.end('no');}}).listen(8743);
```
- Tarayıcı sürücüsü (eklenti yokken): ayrı profil + `--remote-debugging-port=9222 --remote-allow-origins=*`, `ws` üzerinden `Runtime.evaluate` / `Input.dispatchMouseEvent`. Giriş kullanıcıya bırakılır.
- Sayfa ayrıştırmayı Node tarafında ham HTML üzerinde yap (in-page JS tırnak kaçışı sorunlarını ortadan kaldırır).
- STT: `node run.js` + `onnx-community/whisper-small` (q8, chunk 30 / stride 5, return_timestamps) ~2,5× gerçek zaman.
- Render hızı: 30 dk video ≈ 4,5 dk build + 9 dk finish (~6,3× gerçek zaman); kart ~40 sn, Opener ~30 sn, intro ~2,5 dk.
- Görsel üretim maliyeti: video kredisi pahalı, görsel ucuz → illüstrasyon katmanı Flow (Nano Banana 2 · crop_16_9 · x1).
- Uzun betikleri Write ile dosyaya yaz; `node -e`/heredoc'a uzun kod koyma.
- İletişim: kullanıcıyla Türkçe, madde madde, kısa.
