# Kapak: rakibin en popüler 3 kapağının analizi → 6 kapak (ChatGPT, 6 ayrı sekme) → kullanıcıya teslim

**Ne zaman:** video render + QC bittikten sonra, teslimden önce (başlık kesinleşmiş olur; kapak yazısı başlığı tekrar etmeden tamamlar). Kullanıcı sadece kapak isterse bağımsız da çalışır.

## Adım 0 — Kapak kütüphanesi (önce buradan)
`G:\Drive'ım\kapak kutuphanesi\_indeks\kapak-dili.json` → videonun konu etiketine yakın kanalların teknik sayımı ve ölçüm medyanları. Rakibin klasöründe `KAPAK-DILI.md` varsa Adım 1–3 yerine onu oku (12 kapak, ölçülmüş, çekirdek/yüzey ayrılmış). 6 konseptten en az 2'si rakip dışındaki kütüphane kanallarından gelen bir tekniği kullanır (özgünlük). Rakip kütüphanede yoksa: `py scripts/kapak_kutuphane.py kanal @Rakip`, sonra profil (şablon: kütüphanenin `README.md`'si).

## Adım 1 — Rakibin en popüler 3 videosunun kapaklarını indir
Rakip kare analizi bu kanal için yakın zamanda yapıldıysa `rakip-analiz/<kanal>/kapak-1..3.jpg` zaten vardır. Yoksa:
```
py scripts/rakip_indir.py @RakipKanal --adet 3 --cikti rakip-analiz/<kanal>
```
(video indirmeden; yalnız kapak + meta). Kullanıcı başka rakip/videolar verdiyse `--videolar`. Kanalın kendi tutan kapakları da varsa (DEVAM §5) onları da karşılaştırmaya ekle.

## Adım 2 — Ölçülebilir metrikler
```
py scripts/kapak_metrik.py rakip-analiz/<kanal>/kapak-1.jpg kapak-2.jpg kapak-3.jpg --cikti rakip-analiz/<kanal>/kapak-analiz --etiket "R1,R2,R3"
```
Parlaklık, kontrast, doygunluk, renklilik, sıcak/soğuk oranı, baskın 6 renk (hex), 3×3 ayrıntı ızgarası (yazı/özne nerede), sol/orta/sağ ağırlık; `karsilastirma.jpg` (büyük + palet + mobil 168×94) ve `akis-onizleme.jpg` (ana sayfa boyutu).

## Adım 3 — Tek tek detaylı analiz (her kapak için, atlamadan)
Her kapağı tam boyut **Read ile aç**, ayrıca `karsilastirma.jpg`'ye bak. Her kapak için şu başlıkların hepsini doldur:

1. **Kimlik** — video başlığı, izlenme, oran (kanal ortalamasına göre), yayın tarihi.
2. **Yazı** — birebir metin (satır satır, büyük/küçük harf aynen), kelime sayısı, dil; font karakteri (sans/serif, kalınlık, dar/geniş, el yazısı, condensed; benzer font adı: Anton, Bebas Neue, Montserrat Black, Impact…); her satırın rengi (hex yaklaşık), kontur/gölge/arka plan kutusu/fırça bandı; harf yüksekliğinin görsel yüksekliğine oranı; konum (3×3 ızgara); vurgu kelimesi ve nasıl vurgulandığı; başlıkla ilişkisi (tekrar mı, tamamlayıcı mı, merak boşluğu mu).
3. **Şablon / kompozisyon** — yerleşim (ör. "sol %55 yazı, sağ özne", "ortada özne, üstte bant"), özne sayısı ve kapladığı alan, odak noktası ve göz akışı, ön/orta/arka plan katmanları, boş alan, sağ alt süre etiketi alanı boş mu, üçte bir kuralı.
4. **Özne** — kim/ne (gerçek kişi, karakter, nesne, hayvan, yer), yüz var mı, ifade ve duygu (şok, korku, merak, gülümseme), bakış yönü (kameraya / nesneye / dışarı), el hareketi (işaret, tutma), elindeki/öndeki nesne.
5. **Görsel tür ve gerçekçilik** — gerçek fotoğraf / fotoğraf + düzenleme / AI fotogerçekçi / realistik dijital resim / 3D render / illüstrasyon / kolaj; kanıtı (ten dokusu, eller, ışık tutarlılığı, AI artefaktları, kesip yapıştırma kenarı).
6. **Tema ve atmosfer** — konu teması, dönem, mekân, mevsim/saat, ruh hali (tehdit, nostalji, gizem, umut).
7. **Renk ve ışık** — baskın 3–5 renk (metrikten hex), sıcak/soğuk, doygunluk, parlaklık, kontrast, kenar ışığı (rim light), arka plan bulanıklığı, vinyet, renk derecelendirme (teal-orange vb.).
8. **Grafik öğeler** — ok (renk, yön, kalınlık), daire/halka, çarpı/tik, emoji, rozet/etiket, çerçeve, bölünmüş ekran (önce/sonra, X vs Y), bulanıklaştırılmış/sansürlü alan, logo.
9. **Okunurluk** — mobil 168×94'te yazı okunuyor mu, özne seçiliyor mu, kaç saniyede anlaşılıyor (1 sn testi).
10. **Tıklama psikolojisi** — tetiklediği duygu, saklanan bilgi (merak boşluğu), vaat, başlık + kapak birlikte ne söylüyor.
11. **Puan** (1–10): dikkat çekme, okunurluk, merak, konu netliği + 1 cümle gerekçe.

Sonra **ortak şablon** tablosu: 3 kapakta ortak olan her özellik = kanıtlanmış şablon (koru); yalnız 1'inde olan = deneme (isteğe bağlı); rakibin zayıf noktaları (karanlık, kalabalık yazı, küçük özne, düşük kontrast) = bizim fırsatımız. Rapor: `rakip-analiz/<kanal>/KAPAK-ANALIZ.md` (+ bu videonun klasörüne kopya). Kullanıcıya kısa özet ver.

## Adım 4 — 6 kapak konsepti ve istemleri
Hepsi kanıtlanmış şablonun çekirdeğini korur, rakipten **daha parlak, daha okunur, daha meraklı** olur; hiçbiri rakibin kapağının kopyası değildir (aynı metin, aynı kişi pozu, aynı yerleşim pikseli pikseline yok). 6 konsept farklı bir ekseni öne çıkarır:
1. **Şablona en sadık** — ortak şablon birebir, ama daha yüksek kontrast/parlaklık, daha büyük yazı.
2. **Duygu** — öznenin ifadesi ve bakışı güçlendirilmiş, yüz daha büyük.
3. **Merak boşluğu** — farklı yazı açısı (soru / tek kelime / rakam), saklanan bilgi daha keskin.
4. **Nesne/sahne odaklı** — cevabı taşıyan nesne veya sahne en büyük unsur (sağlıktaki ölçüm aleti mantığı).
5. **Cesur alternatif** — farklı renk teması veya kompozisyon (ana sayfada rakiplerden ayrışan), şablonun okunurluk kurallarını koruyarak.
6. **A/B eşi** — 1–5 içinde en güçlü bulunan konseptin aynı görselli, farklı yazılı/renkli varyantı. YouTube Studio'daki "Test & Compare" testine (3 kapağa kadar) hazır çift olsun diye.

Kanalın kendi kapak kuralları (DEVAM §5, `gorsel-ve-kapak.md` kanal tablosu) her konsepte uygulanır; yazı başlığı tekrar etmez; aynı nesne/zemin önceki videolarda kullanılmadı (`ozgunluk.md` L).

İstem yazımı (ChatGPT görsel üretimi; İngilizce yaz, yazı metni hedef dilde):
```
YouTube thumbnail, 16:9 landscape (wide 1536x1024 composition, keep all important elements inside the central 16:9 area).
SCENE: <tek sahne, mekân, saat, ışık>
SUBJECT: <özne, kıyafet, ifade, bakış yönü, el pozisyonu — "exactly one thumb and four fingers per hand">
STYLE: <analizde çıkan gerçekçilik düzeyi: e.g. "photorealistic photo, 85mm, shallow depth of field" | "realistic digital painting, soft volumetric shading">
COLOR & LIGHT: <palet hex'leri, sıcak yüz ışığı, rim light, arka plan karartma>
TEXT (render exactly, no other text): line 1 "<METİN>" in <renk hex> heavy condensed sans-serif (Anton-like), all caps, <konum>, <kontur/gölge/kutu>; line 2 "<METİN>" ...
GRAPHICS: <ok/halka: renk, konum, neye işaret ediyor, nesneye değmeyen boşluk>
LAYOUT: <yerleşim yüzdeleri>, bottom-right 15% empty (no text, no faces).
Avoid: extra text, watermarks, logos, borders, collage panels, distorted hands, gibberish letters.
```
- Karakter/sunucu varsa referans görselini ekle ("use the attached image as the exact face/character reference") — HeyGen/Flow karakter kartı.
- Gerçek ünlü/kamu figürü yüzü: ChatGPT reddedebilir; kullanıcının izinli referansı yoksa yüzü göstermeyen kompozisyon öner.
- 6 istemi `videoNN/kapak-istemleri.json` dosyasına yaz: `[{"ad":"kapak-1","istem":"...","referans":["C:/.../karakter.png"]}, …]`. Ayrıca okunabilir hali `baslik-aciklama.txt` KAPAK İSTEMİ bölümüne.

## Adım 5 — ChatGPT'de 6 ayrı sekmede üret
Ön koşul: otomasyon Chrome profilinde (DEVAM §2 portu) chatgpt.com'a **kullanıcı kendisi giriş yapmış** olmalı. Şifre girme, abonelik/satın alma yapma.
```
py scripts/chatgpt_kapak.py videoNN/kapak-istemleri.json --port <PORT> --cikti videoNN/kapak-uretim --bekle 600
```
- Her istem için **yeni sekme** açar (8 sn arayla), varsa referansı yükler, istemi yazıp gönderir; sonra bütün sekmeleri 10 sn'de bir yoklar, görsel bitip iki turda değişmeyince indirir: `kapak-N.png` + `kapak-N-ekran.png` (son durum) + `sonuc.json`.
- Çıkış 2 = giriş gerekli → kullanıcıya "otomasyon Chrome'unda ChatGPT'ye giriş yap" de, bekle. Çıkış 3 = limit/ret → ekran görüntüsüne bak, mesajı kullanıcıya ilet; reddedilen istemi (ör. gerçek kişi) düzeltip yalnız onu tekrar gönder. Zaman aşımı → `--topla` ile sekmeler açıkken yeniden topla.
- Sekmeler açık kalır: kullanıcı oradan devam edebilir ("şunu daha parlak yap" gibi). Sekmeleri kapatma.
- Betik ChatGPT arayüzü değişince kırılabilir: ekran görüntülerine bak; seçici bulunamazsa aynı adımları `kurulum-ve-cdp.md`'deki yazıdan bulma yöntemiyle elle yap (veya oturumda Claude in Chrome varsa onunla: her istem için yeni sekme → yaz → gönder → bitince görseli indir).

## Adım 6 — Kontrol, hazırlama, gönderme
1. Her `kapak-N.png`'yi Read ile aç: yazı **birebir doğru mu** (harf hatası, fazladan yazı), eller, yüz/karakter tutarlılığı, sağ alt boşluk, 16:9 kırpınca önemli öğe kesiliyor mu. Hatalıysa yalnız değişecek yeri anlatan revizyon istemini **aynı sekmede** gönder ("Keep everything identical, only fix: …").
2. Hazırla:
   ```
   py scripts/kapak_bitir.py "videoNN/kapak-uretim/kapak-*.png" --cikti videoNN/kapak --rakip rakip-analiz/<kanal>/kapak-1.jpg rakip-analiz/<kanal>/kapak-2.jpg rakip-analiz/<kanal>/kapak-3.jpg
   ```
   → `kapak-N-1280x720.jpg` (16:9, <2 MB), `kapaklar-sayfa.jpg` (numaralı + mobil boyut), `akis-karsilastirma.jpg` (bizim 6 + rakip 3, ana sayfa boyutunda).
3. **6 kapağın hepsini Drive'a koy:** `G:\Drive'ım\money printer\<KANAL>\<video klasörü>\kapaklar\` (`kapak-1..6-1280x720.jpg` + `kapaklar-sayfa.jpg`). Drive'da ad ve boyutu klasör satırında gör (`teslim.md`).
   Kullanıcıya **hepsini gönder** (SendUserFile varsa 6 kapak + 2 sayfa; yoksa klasör yolu): her kapak için tek satır konsept + öneri sırası ("en güçlü: 3 — neden"). Seçimi kullanıcı yapar; seçileni teslim klasörüne `kapak.jpg` olarak koy, DEVAM §5 ve `varyasyon.tsv` kapak sütununa yaz.
4. Revizyon istenirse: yalnız değişecek yerleri düzelten kısa istem, aynı sekmede.
