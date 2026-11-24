# Opus 5.5 galerisi: AE kalitesi kuralları

Kaynak: skillry.dev/ai-videos/opus-5-5 (418 video). Prompt'lar github.com/yihui-dev/awesome-opus5-5-videos deposundan alındı (MIT, `data/videos.json` + `prompts/*.md`, 703 giriş). Galerideki 418 girişin hepsi depoda var (`has_remake: true`), bu yüzden detay sayfası okumaya gerek olmadı.
Tarih: 2026-11-24. Bu belge skill'e (`references/kalite-kapilari.md`, `references/repertuar.md`) ve repertuar varsayılanlarına (`temel.ts`, `Medya.tsx`, `Yazi.tsx`) girecek kuralların kaynağıdır. Aday teknikler `teknikler.json`'da, kare ızgaraları `ornek-kareler/` klasöründe.

## Yöntem ve sayıların anlamı

| Kategori (depo etiketi) | Tüm depo | Galeride |
|---|---|---|
| motion graphics (`motion`) | 369 | 229 |
| explainer (`explainer`) | 116 | 68 |
| 3D (`3d`) | 117 | 56 |
| oyun / etkileşimli (`interactive`) | 101 | 65 |
| **toplam** | **703** | **418** |

- 703 prompt'un 207'si kısmi: tweet metni ya da yazarın yalnız sonucu anlattığı gönderi. 478'i 300 karakterden kısa. Kuralların neredeyse hepsi uzun 225 prompt'tan geliyor.
- Prompt'lar 5 parçaya bölündü ve her parçayı bir alt ajan okudu (480 ham kural). Ham kurallar aynı fikri söyleyenler birleştirilerek 52 kümeye indirildi (`py/kume.py`). Ardından 37 anahtar kelime için düz regex sayımıyla bağımsız kontrol yapıldı.
- **"n" = kuralı söyleyen farklı prompt sayısı (703 içinde), "g" = bunların galeride olanları.** Bu sayılar alt sınırdır: ajanlar kuralı yalnız açıkça yazıldığında saydı. Regex sayımı ayrıca verildiğinde "rx" ile gösterilir.
- Kategoriler: kuralların çoğu motion graphics prompt'larından geliyor. Explainer prompt'ları kısa ve konu odaklı ("make an explainer about X"); kural yazmıyorlar.
- Videolar, 1. aşama: belgesel/açıklayıcı formata en yakın 20 explainer + motion videosu indirildi. Her birinden 0,25 sn aralıklı kare ızgarası çıkarıldı (8×5 = 10 sn/sayfa, toplam 152 sayfa) ve sayfaların hepsi gözle incelendi (Bölüm B).
- Videolar, 2. aşama: galerideki **418 videonun hepsi** indirildi, ızgaraya çevrildi ve hemen silindi (Bölüm E).
  - Toplam: 1.722 MB, 17.616 sn video, 1.919 ızgara sayfası. 200 MB'ı aşan dosya yoktu; en büyüğü 68,6 MB.
  - Etiketleme iki turda alt ajanlarla yapıldı: ortak teknik sözlüğü kullanıldı, video başına en çok 4 sayfa (3D/oyunda 2) incelendi, toplam 1.186 + 617 sayfa.
  - 1. turda bağlam taşması yüzünden boş kalan 61 video 2. turda tamamen yeniden etiketlendi.
  - `teknikler.json`'daki `kac_video` bu 418 videodan sayıldı.
- Dışlananlar: oyun mekaniği, 3D sahneye özgü kurallar (PBR, path tracing), UI morph demoları (tek şekil 8–12 UI durumu, imleç kuralları), sonsuz döngü (son kare = ilk kare), "her şey kodla çizilsin, görsel üretme / stok yok". Bu sonuncusu bizim gerçek medya kullanan belgesel formatımıza ters.

---

## A. Öncelikli kurallar (sık geçen ve AE kalitesiyle ilgili)

"Bizde" sütunu: ✓ var · ◐ kısmen · ✗ yok. "Hedef" sütunu kuralın nereye gireceğini söyler.

| # | Kural | n / g | Sayılar (aralık) | Bizde | Hedef |
|---|---|---|---|---|---|
| 1 | Render → kare incele → en kötüleri düzelt döngüsü | 57 / 34 (rx 26) | vuruş başına 1 kare; 16–20 karelik temas tabakası; 0,2–0,25 sn aralık; geçiş çevresinde ±0,5 sn yoğun kare; her turda "en kötü 3 sorun"; tam renderden önce 5 sn deneme | ◐ | kalite-kapilari |
| 2 | Bekleme sınırı: hiçbir şey 1 sn'den uzun donmaz | 22 / 10 (rx 18) | tam durgunluk ≤0,5–1 sn (son kare ≤2 sn); 30 sn'de 12–15 kompozisyon, her biri 1,4–3,5 sn; 1–2 sn'de bir yeni görsel fikir; ölçüt: 30 sn'de ≤1 sn donma | ◐ | kalite_kapisi eşiği |
| 3 | Kamera hiç durmaz, sahne başına tek kolaylaştırılmış hareket | 22 / 8 + 17 / 12 | tutuşta 1,03–1,07 yavaş itme; kilit karede 1,000→1,012→1,000 nefes; vuruşta darbe 1,00→1,08; kamera vuruşta başlar, nesneden yavaş oturur (0,6 sn / 0,35 sn); konu kadrajın ≥%50'si | ✗ (`Medya` varsayılanı `sabit`) | Medya.tsx varsayılanı |
| 4 | Okunurluk: büyük yazı, kontrast, çarpışma yok | 24 / 16 | okunan satır ≥64 px (1080p'de %6); küçük etiket 24–28 px, ağırlık 600–800, aralık 0,14–0,3 em; kontrast ≥4,5:1; giden başlık, gelen başlık aynı yeri almadan kaybolur; kameranın ölçeklediği öğeye `will-change` verilmez | ◐ (yazi_kontrol 3:1, boy kapısı yok) | yazi_kontrol + Yazi.tsx |
| 5 | Yasak efektler listesi | 42 / 24 (rx 39) | yasak: parçacık patlaması, glow, lens flare, sürekli sarsıntı, RGB split, gökkuşağı/mor "AI" gradyanı, şablon/PowerPoint görünümü, crossfade, rastgele wipe, dönen geçiş; glitch yalnız gerçek kesimde 1–2 kare + tık sesiyle; konfeti yalnız 1 kez, zirvede; köşe çerçeve/köşe yazısı yok | ◐ (Vurus/Kusur kapısı) | stil_dna yasak eksenleri |
| 6 | Sekmeyen yay, en çok minik aşım | 30 / 17 (rx 27) | aşım <%2; kritik sönümlü `1-(1+wt)e^(-wt)`, w 12–40; şekil sönümü 0,72 / oturma 0,35 sn; kamera sönümü 1,0 / 0,6 sn | ◐ (`dogal()` kahraman aşımı %1,5 ✓; `yay-esnek` ve `geri-sekme` hâlâ seçilebiliyor) | temel.ts + etiketler |
| 7 | Hareket bulanıklığı (alt kare) | 26 / 17 (rx 29) | 60 fps; kare başına 3–8 alt kare (çoğunlukla 4); örnek zamanları t±1/240 sn; "hayalet kopya izi değil gerçek bulanıklık" | ◐ (`Hareket.tsx` yeni, sürüyor) | Hareket.tsx varsayılanı |
| 8 | Dar palet, tek vurgu; geçişleri vurgu rengi taşır | 41 / 17 (rx 15) | 3–4 renk + nötr; 1 doygun vurgu; vurgu siyahla doğrudan çapraz çözünmez; anlamsal renk (yeşil yalnız olumlu, kırmızı yalnız gerekli yerde) | ◐ (palet var; "tek vurgu" kuralı yok) | temel.ts PALETLER notu |
| 9 | Sahneler nesne üzerinden bağlanır (kesmesiz / taşınan nesne) | 43 / 23 | kısa formda 0 sert kesim; giden sahnenin nesnesi gelen sahnenin parçası olur; sonraki hareket öncekisi bitmeden başlar | ✗ ("paylaşılan eleman" sırada) | Gecis.tsx (aday: nesne-dalisi) |
| 10 | Beat ızgarası: kesim ve büyük hareket vuruşa | 69 / 33 (rx 49) | 100–140 BPM (çoğunlukla 120: vuruş 0,5 sn, ölçü 2 sn); bölüm = tam ölçü; hareket vuruştan 0,05 sn önce başlar; drop'tan 12 vuruş önce müzik; ilk 16 vuruşta her vuruşta bir olay | ◐ (müzikli kanallar için "sırada") | sahne_kur / ses_miks |

### Ayrıntı ve kaynaklar

**1. İnceleme döngüsü.** Prompt'lar storyboard'u (kural 15) render sonrasındaki kare kontrolünden ayrı tutuyor. Render sonrası kontrolde istenenler: "vuruş başına 1 still", "16 karelik kontakt", "0,25 sn aralıkla kare listesi", "her geçişte yoğun kare", "sert bir motion director gibi eleştir ve en kötü 3 sorunu düzelt", "kendini 1–10 puanla, en düşüğü düzelt", "kurucu kendi işini yargılamaz, bağımsız eleştirmen". En sıkı varyant: kalite kapısı geçmeden video bitmiş sayılmaz (≤1 sn donma/30 sn, >0,5 sn durgun yok, kontrast 4,5:1, loudness).
Bizde eksik olanlar: geçişlerin ±0,5 sn'lik yoğun tabakası ve "en kötü 3 + yeniden render" turu (bağımsız ajan).
Kaynak: brainextends-606193, annacher-433425, daniel-haida-636937, everestchris6-399895, notdwd-998633, astrothewizard-618782, gdgtify-929495, twoclipping-551116.

**2. Bekleme sınırı.** "Something moves every second", "no hold longer than 1s (final logo up to 2s)", "nothing ever freezes".
Video gözlemi bunu doğruluyor. En AE görünen uzun video kloss-xyz (172 sn), kompozisyonları ortalama 7,5 sn tutuyor ama hiçbir yerde 1,5 sn'den uzun tam durgunluk yok. En zayıf iki uzun video henkvaness (337 sn) ve stewchan2 (114 sn): ortalama plan 9,5 ve 12 sn, en uzun tam durgunluk 8 ve 6 sn.
**Uzun formun kuralı:** kompozisyon uzun kalabilir, tam durgunluk kalamaz.
Kaynak: 0xnicc0-516612, annacher-433425, brainextends-606193, dzhohola-249003, egeberkina-949521, everestchris6-399895.

**3. Kamera.** "Every hold gets a slow push or float", "one eased move per scene, never zoom in and out consecutively", "camera starts on the beat and settles slower than the subject", "screen-studio zoom so each state fills the frame".
Galeride kamerasız videolar (henkvaness, triglyceee, stewchan2, signalz, rpa-dake) hep "slayt / PowerPoint" zayıflığı aldı.
**Öneri:** `Medya` varsayılanı `sabit` olmasın. `sabit` seçilse bile 1,00→1,02 nefes uygulansın. Kart/sayı sahnelerinde de 1,00→1,03 itme olsun.
Kaynak: annacher-433425, flxrnc-251921, gdgtify-929495, akakuma0219-658335, earthwalkerx17-912577, godsboy7777-150194.

**4. Okunurluk.** "Currently read text ≥64 px in a 1080 px frame", "readable on a phone", "4.5:1 contrast and nothing collides".
**En güçlü video bulgusu:** incelenen 20 videonun 18'inde ana zayıflık minik yazı. Altyazı, HUD ve etiketler çerçeve yüksekliğinin %0,8–1,5'i, yani 1080p'de 9–16 px.
Önerilen kapı eşikleri:
- okunan ana satır ≥ %5,5 (≈60 px)
- yardımcı etiket ≥ %2,2 (≈24 px)
- HUD süsü (okunması gerekmeyen) muaf, ama bilgi taşıyan sayı muaf değil
- kontrast: ana metin 4,5:1, büyük başlık 3:1

Kaynak: 0xnicc0-516612, brainextends-606193, anjmaxx-459455, everestchris6-399895, raphaelaubryy-687877.

**5. Yasak listesi.** Prompt'ların ortak dili: "Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, dead time, anything that looks like a template." En sık maddeler sırasıyla: şablon görünümü (8), sekme/elastik (8+6), parçacık + glow + sarsıntı (7), gökkuşağı/mor AI gradyanı (7), jenerik geçişler (crossfade, rastgele wipe, spin; 7).
Bizdeki `isik-patlamasi`, `glitch-rgb` ve `kromatik` bu listeye giriyor. Etiketleri yalnız `enerjik`/`neon` ile sınırlı kalmalı; ciddi tonda seçilmemeli.
Kaynak: twoclipping-402193, demonugc-525162, hicallmechai-878304, 1littlecoder-378066, annacher-152174.

**6. Yay.**
- `1-(1+wt)e^(-wt)`, w 12–40 (kritik sönümlü: hiç geçmez)
- "overshoot < 2%"
- "shape damping 0.72 settle 0.35 s; camera damping 1.0 settle 0.6 s"
- "springs everywhere, a tiny overshoot at most"

Bizdeki `dogal()` bununla uyumlu. Fark şu: `yay-esnek` (sin salınımı) ve `geri-sekme` (c1 = 1,9: yaklaşık %10 geri çekilme) hâlâ tüm tonlarda seçilebiliyor. Öneri: bu ikisi yalnız `enerjik` + `oyunbaz` his ile seçilsin.
Kaynak: 0xnicc0-516612, flxrnc-251921, twoclipping-402193, demonugc-525162, diamai-157697.

**7. Hareket bulanıklığı.** "Render 4 subframes per output frame and blend (ffmpeg tmix)", "3 subframes at t−1/240, t, t+1/240". En çok 8 alt kare. 60 fps şart koşuluyor. Bizdeki `Hareket.tsx` aynı fikri bileşen düzeyinde uyguluyor; eşik altında kapalı kalması doğru.
Kaynak: annacher-433425, brainextends-606193, demonugc-525162, hicallmechai-878304, jake11moran-414633.

**8. Palet.** Örnek üçlü/dörtlüler:
- `#102820 / #F4E9D5 / #F2B544`
- `#080D23 / #FFF4DD / #FF654F (+#6685FF)`
- `#0A0A0A / #FF2BD6 / #B8FF00 / #F5F5F5`
- sıcak kırık beyaz `#F3F3F0` + `#121212` + tek vurgu

Galeride en iyi görünenler de 1 vurgu kullanıyor: kloss turuncu `#FF7A2E`, cboyack altın-kırmızı, gdgtify altın çizgi.
Öneri: bizdeki palette vurgu rengi zaten tek. Kural olarak yazılmalı: aynı karede ikinci doygun renk yalnız anlamsal (artış/azalış) olabilir.

**9. Nesne üzerinden geçiş.** "Every scene grows out of the previous one", "the chart line becomes the connector", "one object carries the story and lands on the exact same pixels on both sides".
Videolarda en çok "AE" puanı alan geçişler bunlar: kloss Σ dalışı, gdgtify harfe dalış, emollick ekran-içinde-ekran, nummanali sarmal bağ nesnesi. Bizim uzun formatta "0 kesim" gerçekçi değil.
**Öneri:** bölüm içi geçişlerin en az üçte biri nesne/maske tabanlı olsun, crossfade bölüm başına en çok 1 kez kullanılsın.

**10. Beat ızgarası.** Müzikli kısa videoların omurgası. Bizim anlatımlı formatta ızgara = **kelime zamanları** (`yazi_senkron.py`; kural 21). Beat ızgarası yalnız müziğin önde olduğu parçalarda kullanılır: kanca (ilk 15–30 sn), bölüm geçiş montajı, özet montajı.
Sayılar:
- 120 BPM'de vuruş 0,5 sn, ölçü 2 sn
- `B = 60/BPM`
- vuruş hücresi tam kare sayısına denk gelmeli (30 fps'de 120 BPM = 15 kare)

### İkinci sıra (sık geçiyor, kısmen bizde var)

| # | Kural | n / g | Sayılar | Bizde | Hedef |
|---|---|---|---|---|---|
| 11 | Kolaylaştırma: doğrusal hareket yok, hızlı gel / yumuşak kon | 17 / 4 (rx 26) | giriş `cubic-bezier(0.16,1,0.3,1)` 0,6–0,8 sn + 20 px yükselme; morph `cubic-bezier(.45,0,.15,1)` 0,8 sn; kalan mesafenin kare başına %12–19'u; okunacak yerde yavaş in, çıkarken hızlı çık | ✓ (`kubik-hizli`, `ustel-sert`, `cikisEgri`) | — |
| 12 | Kademeli giriş (stagger) | 9 / 6 (rx 8) | öğe arası 60 ms; kart 280 / başlık 220 / meta 160 ms; kelime adımı 80 ms, süre 0,6 sn; harf 50 ms; 30 fps'de 2–4 kare; glif başına 1/16 nota (120 BPM'de 125 ms) | ✓ (`kademe()`) | aralığı belgeye yaz |
| 13 | Maske çizgisinden yükselen yazı; hiçbir şey birden belirmez | 13 / 7 (rx 15) | harf harf maske yükselmesi; morph olan şeklin içindeki yazıya ayrı maske | ✓ (`maske-yukari`) | varsayılan başlık girişi |
| 14 | İçerik değişimi: bulanık + solma | 8 / 5 | 12 px blur + 0,15 sn; kayarak değişim 0,55 sn; renk değişimi 0,35 sn; değişim geçişin ikinci yarısında | ◐ | Yazi/Kart iç değişim |
| 15 | Önce storyboard / görünüm karesi / wireframe | 38 / 14 (rx 19) | 0,5 sn adımlı tablo; vuruş başına 1 still (5–8 still); 3 stil karesi + 10 sn örnek; gri wireframe önce, sonra kaplama | ✓ (3 onay) | wireframe adımı eklenebilir |
| 16 | Font rolleri: en çok 2 (editoryalde 3) aile | 29 / 17 (rx 22) | büyük başlık 900, etiket 600–800; dev başlık satır aralığı 0,85, harf aralığı −0,07 em; sayılar mono/tabular; editoryal üçlü: yüksek kontrastlı serif + ağır grotesk + mono | ✓ (`FONTLAR` çift) | sayılar tabular |
| 17 | Az kelime | 14 / 7 | başlık tek satır 3–4 kelime; altyazı ≤7 kelime; mono yardımcı ≤18 karakter; vuruş başına 1–4 kelime | ◐ (okuma süresi ✓, kelime sınırı ✗) | yazi_kontrol |
| 18 | Okuma tutuşu ve bitiş karesi | 15 / 7 | tam metin süs hareketi başlamadan 700 ms durur; son kare 0,7–1,2 sn hareketsiz; şov anından önce 0,3–0,5 sn bekleme; videoda en az bir 400 ms tam durgunluk ("kazanılmış değişim") | ◐ | kurgu_denetim |
| 19 | Film dokusu ölçülü | 18 / 5 (rx 10) | her karede yeni gren; parlak kenarda halation; vinyet 0,65x; 1 px kromatik saçak; baskı kayması 2–4 px %40 yalnız vurgu karelerinde | ✓ (`DOKU_TIPLERI`) | — |
| 20 | SFX ölçülen tepeye; her öğeye tek yumuşak ses, aksi halde sessizlik | 44 / 24 (rx 30) | SFX müzikten sessiz; her etki ≈0,5 sn; ses türü sayısı sınırlı | ✓ (`Sfx.tsx` tepe senkronu) | — |
| 21 | Görsel kelime zamanına asılı | 22 / 10 (rx 44 anlatım) | 35–50 an / dk; kelime düzeyinde zaman damgası; grafik kesilmemiş ses parçasının içinde kalır | ✓ (`yazi_senkron.py` yeni) | — |
| 22 | Miks | 16 / 8 (rx 13) | −14 LUFS, −2 dBTP (sinematik diyalog −16); anlatıcı müzikten 10–15 dB üstte; konuşmada müzik −18 dB; AAC sonrası yeniden ölç | ✓ (ses_miks: −20 + sidechain ≈−12) | — |
| 23 | Gerçek veri, kaynaklı olgu | 36 / 16 | her sayı kaynak dosyasından; sayaç gerçek değerde durur; belirsizlik dürüstçe gösterilir | ✓ | — |
| 24 | Her kare tek başına bitmiş kompozisyon | 15 / 8 | ilk kare yarıda uçan bir kelime değil, bitmiş kompozisyon; duraklatılan her kare poster gibi durmalı | ✗ | kalite kapısı (ilk kare + rastgele 10 kare) |
| 25 | İlk saniyede kanca | 12 / 9 | ilk 0,5–1,5 sn premium görünür; kahraman öğe ilk saniyede büyük ve hareket hâlinde | ✓ (2 sn ölü kanca) | — |
| 26 | Plan başına tek fikir, 3 imza an | 17 / 8 | 15 sn'de ~4 görsel fikir; "10 orta an yerine 3 olağanüstü an"; her sahnede tek jest | ◐ | sahne_kur |
| 27 | Karşıtlık: sessizlik, yavaş pasaj, sert açık/koyu | 12 / 4 | bir kez belirgin yavaş pasaj; bölümler arası 0,5 sn boş koyu vuruş; renk yayı (soğuk → sıcak); bölüm başına palet dönüşümü | ✗ | stil_dna (bölüm paleti) |
| 28 | Ölçülen kalite: tek kare sıçrama, renk eşleme | 9 / 3 | kare farkı komşunun 3 katıysa sıçrama; referansla son kare renk eşlemesi; zaman damgası/süre doğrulaması | ✓ (kalite_kapisi) | — |
| 29 | Ekran yazısında nokta yok (bilinçli vurgu dışında) | 4 / 3 (rx 3) | başlık, wordmark ve kısa ekran metninde nokta kullanılmaz; "GONE." gibi bilinçli vurgu istisna | ✗ | yazi_kontrol uyarısı |
| 30 | Deterministik zaman, tohumlu rastgelelik | 56 / 22 | her değer kare zamanının saf fonksiyonu; `Math.random` yok; CSS transition yok | ✓ (Remotion + `rastgele()`) | — |

---

## B. Videolardan çıkan kurallar (20 video, 152 kare ızgarası)

| Video | Süre (sn) | Ort. kompozisyon (sn) | En uzun tam durgunluk (sn) | Ort. AE puanı (1–5) | Teknik |
|---|---|---|---|---|---|
| henkvaness-975279 (makaleden eğitim videosu) | 337 | 9,5 | **8** | 3,5 | 11 |
| triglyceee-161719 (Fas siyasi tarihi) | 210 | 2,6 | 3,0 | **3,0** | 10 |
| kloss-xyz-067876 (yapay zekâ tarihi) | 172 | 7,5 | 1,5 | 4,0 | 10 |
| stewchan2-369810 (backlink açıklayıcı) | 114 | **12** | **6** | 3,2 | 9 |
| thesethian-384517 (30 yıllık yolculuk) | 80 | 20 | 0,5 | 3,4 | 7 |
| emollick-019567 (özyineleme, değişen stiller) | 75 | 4,4 | 1,0 | 4,2 | 8 |
| nummanali-340931 (LLM kronolojisi) | 62 | 0,9 | 1,0 | 4,3 | 10 |
| kgonia7-746268 (ölçek yolculuğu) | 60 | 6,0 | 0 | 3,6 | 8 |
| retropunkai-277590 (Sphere tarihi, dikey) | 60 | 4 | 1,5 | 4,2 | 10 |
| amberpromptai-345137 (Ay festivali) | 47 | 6 | 2,5 | 4,3 | 7 |
| arthurkatcher-604161 (kodlama ajanı) | 40 | 3,5 | 1,5 | 4,1 | 8 |
| signalz-jp-918002 (editoryal) | 33 | 2,8 | 1,25 | 4,4 | 8 |
| tejasthange3-128242 (Twitter→X) | 30 | 2,2 | 1,5 | **4,6** | 9 |
| abhinayguptha-259981 (jenerik) | 20 | 2,9 | 0,5 | **4,6** | 7 |
| gdgtify-929495 (kinetik tipografi) | 20 | 4,0 | 0,75 | 4,2 | 8 |
| stokebuilder-356793 (kavram animasyonu) | 16 | 3,5 | 0,5 | 3,7 | 6 |
| asei-ikarashi-437835 (sayılar, satış grafiği) | 15 | 1,9 | 0,5 | 4,0 | 9 |
| rpa-dake-593915 (arama tarihi) | 15 | 2,5 | 0,75 | 3,3 | 6 |
| cboyack-407181 (ekonomi, dikey) | 15 | 3 | 1,25 | 4,5 | 6 |
| parkerrex-701462 (token bucket) | 12 | 4 | 0,75 | 3,0 | 3 |

(AE puanı: inceleyen alt ajanın teknik başına 1–5 puanlarının ortalaması.)

Çıkan kurallar:

1. **Uzunluk arttıkça kalite düşüyor.** Bu, kod üretimi videonun asıl zaafı. 3 dakikayı geçen üç videodan ikisi en düşük puanları aldı. Ortak hataları:
   - aynı yerleşim her bölümde tekrar ediyor
   - tek geçiş tipi tekrar ediyor (henkvaness'te aynı yumuşak wipe 13 kez)
   - kamera yok
   - 6–8 sn tam durgunluk var

   Bizim 10–30 dk formatın çözümü:
   - bölüm başına yerleşim ve geçiş değişimi (stil_dna zaten bölüm başına seçebilir)
   - "aynı geçiş arka arkaya en çok 2 kez, video boyunca toplam payı ≤%25"
   - tam durgunluk ≤1,5 sn
2. **Minik yazı 18/20 videoda zayıflık** (bkz. A-4). Bilgi taşıyan her yazı (sayının birimi, grafik etiketi, kaynak satırı) okunur boyda olmalı. Okunmayacaksa hiç konmamalı.
3. **Vurgu karesi = 1 kare (0,25 sn).** İyi videolarda her yeni başlık ya da olay tek karelik bir darbeyle geliyor: RGB kayması, +%25 parlaklık, %105 ölçek, beyaz flaş ya da renk zemini. Ardından keskin oturuyor. Kötülerde yazı yalnız soluyor. Bizdeki `Vurus.tsx` darbesi başlık girişinde de kullanılabilir.
4. **Hayalet bilgi katmanı.** Güncel başlığın arkasında dev, soluk yıl/ay/sayı 5 videoda var. Boş zemini doldurmanın en ucuz AE yolu bu (aday: `hayalet-yil`).
5. **Sayaçlar her zaman ease-out ile, ara değerde kırpılarak sayıyor.** Örnek: 0→522.607 5 karede, son %10 yavaş; 37→47→48 3 karede. Değer bir eşiği geçince renk değiştiriyor (beyaz → kırmızı). Sayı, grafiğin ya da çubuğun ucuna binip onunla birlikte ilerliyor (sayı ve çubuk kilitli).
6. **Grafik çizimi 1–3 sn, kademe 0,1–0,25 sn.** Çubuklar 4 karede büyüyor. Çizgi tek noktadan başlayıp 12 karede uzuyor, altı gradyanla doluyor. Meclis yarım dairesinde gri hayalet noktalar 0,5 sn önce geliyor. Lejant en son geliyor.
7. **Bölüm tanıma:** iyi uzun videolar bölümü 3 kanaldan birden işaretliyor:
   - renk (bölüm paleti dönüşümü: kloss "AI kışı" bölümünde maviye dönüyor)
   - numara/başlık kartı (henkvaness içi boş kontur numara)
   - kalıcı ilerleme göstergesi (retropunkai yıl cetveli + pim)
8. **Montaj hızlanması.** Özet bölümünde ritim ikiye katlanıyor: her öğe 0,5 sn, yıl taraması 0,25–0,5 sn/yıl. Bu, uzun anlatımın içinde "nefes" yerine "hız" kontrastı veriyor. Kural A-27'nin tersi; ikisi birlikte kullanılmalı.
9. **Zayıf geçiş = karanlıktan çözünme.** stewchan2'de 8 sahnenin hepsi aynı karartmayla birbirine bağlanıyor ve en düşük enerjiyi veren yöntem bu. "Kararıp açılma" yalnız büyük bölüm sınırında kullanılmalı.

---

## C. Repertuara ve skill'e girecek varsayılanlar (özet)

| Nereye | Ne |
|---|---|
| `temel.ts` | `yay-esnek` / `geri-sekme` ciddi, gizem ve sakin tonlarda yasak (ASIMSIZ_TON genişlemesi); kamera yayı sönüm 1,0 / oturma 0,6 sn, öğe yayı 0,72 / 0,35 sn |
| `Medya.tsx` | varsayılan kamera `sabit` değil; `sabit` = 1,00→1,02 nefes |
| `Yazi.tsx` / `Kart.tsx` | okunan satır ≥60 px, etiket ≥24 px (1080p); sayılar `tabular-nums`; içerik değişimi 12 px blur + 0,15 sn |
| `Gecis.tsx` / stil_dna | aynı geçiş arka arkaya ≤2, toplam pay ≤%25; crossfade bölüm başına ≤1; `isik-patlamasi`, `glitch-rgb`, `kromatik` yalnız enerjik ton |
| `kalite-kapilari.md` + `kalite_kapisi.py` | tam durgunluk ≤1,5 sn (uzun form); ilk kare ve rastgele 10 kare "bitmiş kompozisyon" kontrolü; geçiş başına ±0,5 sn yoğun tabaka; "en kötü 3" düzeltme turu |
| `yazi_kontrol.py` | ana metin kontrastı 4,5:1; boy kapısı; ekranda >7 kelimelik altyazı satırı uyarısı; başlıkta nokta uyarısı |
| `repertuar.md` | stagger, easing ve yay sayıları (A-6, A-11, A-12) belgeye yazılsın |

---

## E. 418 videonun toplu etiketlemesi

Sayılar, tekniğin görüldüğü farklı video sayısıdır (418 içinde). Ajanlar video başına en çok 4 sayfa (40 sn) gördü, bu yüzden sayılar alt sınırdır. AE puanları ajan tahminidir: motion 4,4 · explainer 4,1 · 3D 3,6 · oyun 2,9.

**Genel stil** (video başına 2–5 etiket):

| Stil | Video |
|---|---|
| tek vurgu renkli palet | 232 (%56) |
| koyu zemin | 212 |
| UI/ürün demosu | 155 (%37; bizim için dışlanan kısım) |
| çok renkli | 139 |
| açık zemin | 116 |
| 3D render | 104 |
| kondanse başlık | 80 |
| düz vektör | 75 |
| serif başlık | 60 |
| minik yazı sorunu | 55 |
| müzik vuruş senkronu | 52 |
| kâğıt/editoryal | 51 |
| kamera hareketsiz | 29 |
| kesmesiz tek plan | 17 |

**Repertuarda olan tiplerin galerideki sıklığı** (ilk 20):

| Tip | Video | Not |
|---|---|---|
| `gecis:cozunme` (crossfade) | 217 | %52; prompt'lar yasaklıyor ama videolarda en sık geçiş |
| `baslik:bulaniklik` | 189 | |
| `gecis:sert` | 182 | |
| `doku:vinyet` | 149 | |
| `hareket:yay-esnek` | 144 | %34; prompt'lar "no bouncy" diyor, sonuç yine sekiyor |
| `sayi:sayac` | 137 | |
| `gecis:bulaniklik` | 136 | |
| `altbant:cip-etiket` | 133 | |
| `baslik:daktilo` | 120 | |
| `cerceve:inset-golge` | 117 | |
| `baslik:maske-yukari` | 111 | |
| `hareket:bulaniklik` (motion blur) | 111 | |
| `kamera:sabit` | 106 | |
| `baslik:harf-aralik` | 98 | |
| `kamera:ken-burns-ice` | 93 | |
| `baslik:olcek-darbe` | 90 | |
| `gecis:isik-patlamasi` | 80 | |
| `altbant:cam-panel` | 72 | |
| `vurus:darbe` | 72 | |
| `doku:gren` | 68 | |

Çıkarımlar:
1. **"Claude yaptı" görüntüsünün imzası:** crossfade + bulanık yazı girişi + sekmeli yay + sabit kamera. Bu dördü galerinin yarısında var; ayrışmak için bunları sınırlamak gerekiyor. A-3, A-5, A-6 ve B-1 kuralları bu yüzden öncelikli.
2. **Ortak sözlükte en sık görülen adaylar (ilk turda bulunanlar):**

   | Aday | Video |
   |---|---|
   | harf-toplanma | 31 |
   | cubuk-trend | 24 |
   | cizim-dolgu | 23 |
   | italik-vurgu | 22 |
   | nesne-dalisi | 20 |
   | ag-buyume | 19 |
   | surec-zinciri | 18 |
   | bolum-cetveli | 17 |
   | dergi-cercevesi | 14 |
   | olcek-yolculugu | 12 |
   | birikimli-sahne | 11 |
   | yil-tarama | 10 |
   | hayalet-yil | 9 |
   | nokta-oran-izgarasi | 9 |
3. **Toplu taramada çıkan yeni temalar (1.074 serbest "yeni" kaydı ad benzerliğiyle temalara toplandı):**

   | Tema | Video |
   |---|---|
   | parçacıktan toplanma | 23 |
   | renk zeminli kelime darbesi | 21 |
   | kart yelpazesi / dağılma | 18 |
   | kelime kelime renk vurgusu | 16 |
   | nesneden taşan renk dairesi | 13 |
   | kelime döngüsü | 11 |
   | gün-gece / mevsim renk geçişi | 11 |
   | üstü çizili değişim | 10 |
   | eğik kart akışı | 10 |
   | patlatılmış görünüm | 8 |
   | çubuk yarışı | 7 |
   | dev kayan kelime bandı | 7 |
   | kolaj geri çekilme | 6 |
   | yırtık kâğıt | 5 |
   | belge tarama ışığı | 5 |
   | nokta küre | 5 |

   485 serbest kayıt hiçbir temaya girmedi (tek seferlik, çoğu UI/oyun). Belgesel için seçilenler `teknikler.json`'a öncelikleriyle eklendi.
4. **Dışlananlar:** konfeti/para yağmuru (10), onomatope (3), osiloskop dalgası (7), UI/telefon/imleç demoları (42+). Belgesel tonuna uymuyor ya da ürün tanıtımına özgü.
5. **Belgesel için en değerli az görülen teknikler:** az görülmesi değersiz olduğu anlamına gelmiyor, rakiplerden ayrışma payı yüksek. Bunlar öncelik 3:
   - meclis yarım dairesi (2)
   - sansür bandı (2)
   - dünya haritası → ülke yakınlaşması (2)
   - belge tarama ışığı (5)
   - çubuk yarışı (7)

## D. Örnek kareler (`ornek-kareler/`)

Her dosya 10 sn'lik bir sayfa: 8 sütun × 5 satır, kare başı 0,25 sn, sol üstte zaman damgası.

| Dosya | Ne öğretiyor |
|---|---|
| 01-nesne-dalisi (kloss s016) | Σ düğümü ~1 sn'de ekranı doldurur, rengi yeni başlığın zemini olur; arkada kontur yıl taraması 1997→1943 |
| 02-harf-toplanma (kloss s004) | yırtılma geçişi → dağınık harfler 1,5 sn'de toplanır → sıcak ışık; kenarda süzülen soluk isimler |
| 03-karma-boy-satir-harfe-dalis (gdgtify s002) | dikey kenar kelimeleri çerçeve kurar; ağır büyük harf + küçük serif tek satırda; 1,25 sn'de harfe dalış |
| 04-akan-serit-hayalet-ay (nummanali s002) | 0,5 sn/öğe kronoloji; dev hayalet ay; sayaç; yörünge izi; kilometre taşında flaş + halka |
| 05-basamak-grafik-sarmal-bag (nummanali s004) | RGB tek kare başlık girişi; sarmal bağ nesnesi; basamak çizgi + alan dolgu + büyük yüzde sayacı |
| 06-meclis-yarim-daire-cubuk (triglyceee s019) | gri hayalet → grup grup süpürme → lejant; ardından 0,25 sn kararma ve kademeli çubuklar + dev %38 |
| 07-renk-flas-ozet-yil-tarama (triglyceee s018) | iki kulvarlı zaman çizelgesi → her parti adı kendi renginde 0,5 sn → yıl taraması 0,5 sn/adım |
| 08-egik-serit-daire-tasma-ters-zemin (asei s001) | eğik çift şerit (1 kare), ikondan taşan daire (2 kare), amber ters zeminde sayaç sütunları, kademeli çubuk |
| 09-sansur-bandi-asinmis-baslik (abhinayguptha s002) | karartma bantları birer birer + damga; iris makro; kontur alanından aşınarak çıkan başlık; sinema bantları (letterbox) |
| 10-ekran-icinde-ekran (emollick s001) | iç içe çerçeve tüneli; tek kelime kırmızı zemin darbesi "EASY."; kelime kelime vurgu rengi |
| 11-yanan-belge-rulo-sayac (cboyack s001) | yanan banknot + slot rakamlı yıl/değer; iris ile %97; banknot duvarı arkasında "THEY PRINT. YOU PAY." |
| 12-birikimli-sahne-cetvel-gri-damga (retropunkai s002) | aynı zeminde kubbe çizgiyle inşa olur; üstte yıl cetveli + pim; gri ton + PAUSED damgası |
| 13-olcek-yolculugu (kgonia7 s002) | okyanus → atmosfer → Dünya noktası → yörünge halkası; eksik olan şey ölçek okuması |
| 14-NEGATIF-durgun-liste-minik-yazi (henkvaness s031) | **kötü örnek:** 10 sn boyunca yalnız tek satır eklenir; yazı çerçevenin %1–1,5'i; kamera yok |
| 15-dunya-haritasi-yakinlasma-rulo (smitjaineditor s003) | ince çizgili dünya haritası üstünde dev rulo sayı 930→500+; kamera Hindistan'a yaklaşır, bölge dolgusu ve şehir etiketleri gelir |
| 16-ustu-cizili-degisim-piksel-merdiven (chrisjdimarco s002) | serif alıntı + kırmızı anahtar kelimeler; piksel merdiven silme; "THE INVISIBLE HAND." üstü çizilir, altından "FEW READ HIS WARNING." gelir; arkada hayalet yıl |
| 17-parcacik-siluet-sepya-murekkep (michaelzsguo s007) | sepya zeminde ada ve Özgürlük Heykeli parçacıklardan toplanır, gemi dumanı canlı; köşede yıl + alıntı; dikey mürekkep şeridiyle süpürülüp kapanır |
| 18-yil-tarama-ikon-hayalet-kelime-ray (salmanr2d2 s003) | yıl başına çizgi ikon (0,25–0,5 sn), arkada dev hayalet kelime şeridi, altta ilerleyen yıl rayı + hız eğrisi HUD'u; sonda kum saati çizimi |
| 19-olcek-yolculugu-cetvel-etiket (acoramaa s002) | kesintisiz yaklaşma; sağda ölçek cetveli + görüş alanı okuması, lider çizgili etiketler, sol altta aşama başlığı |
| 20-kolaj-geri-cekilme (slvdev s002) | tam ekran "Just ask" kartı geri çekilip önceki sahnelerin kartlarından oluşan kolaja karışır; ardından bitiş kartı |
| 21-renk-dairesi-bolum-gecisi (itakahashikun s002) | her süreç adımında tam ekran renk dairesi taşar (mor → yeşil → kırmızı), sağda tek nesne ve kademeli olay, solda serif başlık |
| 22-kagit-kesim-lider-etiket-yirtik-kagit (samissudo s002) | kâğıt kesim karakter + lider çizgili etiketler; kelime kelime renk vurgulu altyazı; yırtık kâğıt sahne geçişi |
| 23-kelime-yigini-kolaj (pankajkumar s003) | Bauhaus şekilleri üstünde kelimeler 1 karede bir yığılır, sonda sarsılıp dağılır; enerjik ton için (belgesel gövdesine uygun değil) |
