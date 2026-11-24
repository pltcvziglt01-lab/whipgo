# Görsel üretimi (Flow / stok / gerçek foto) ve kapak

## Stil tarifi (yeni kanal — onaylatılır)
Önce rakibin kaynak karışımını belirle (`rakip-kaynak-analizi.md`): AI görsel mi, stok mu, gerçek footage mı — araç ve oran buna göre.
Rakibin görsel dilini SPEC'ten çıkar (ışık, palet, kadraj, gerçekçilik derecesi, kare tipi karışımı) ve **özgünleştirerek** tek bir stil bloğuna yaz. 3–4 örnek kare üret, kullanıcıya göster, onay al. Hangi araç/hesapla (Flow hesabı, Magnific, gerçek ilan fotoğrafı) üretileceğini DEVAM'da yoksa sor.

## İstem dosyası `istemler.py`
- `r('ad', "Sahne tarifi")` normal sahne (stil bloğu otomatik eklenir); `k('S_ad', "…")` sunucu/karakter referanslı sahne.
- **Süreklilik:** karakter, hayvan, mekân tanımları değişken (`AFF = "a healthy adult Affenpinscher (black wiry coat, …)"`); her sahnede aynı değişken → aynı görünüm. Mekânlar da değişken (oda, ışık, saat).
- Her cümle kendi görseliyle eşleşir; görsel cümlenin birebir resmi olmalı (soyut metafor değil).
- Ad önekleri bölüme göre (`h_` kanca, `cav_` ırk, `a_` alternatif, `p_` pratik, `z_` özet) → kurgu PLAN'ında kullanılır.
- Varsayılan yasaklar: insan yüzü (arkadan/kırpık/eller), çocuk yüzü asla, yazı/tabela/logo, çerçeve/kolaj/parşömen kenar. Tarihî sahne `TARIH` (eski fotoğraf), tablo `GEMAELDE` stili.
- Işık/mevsim teması ve kare tipi karışımı her videoda değişir (`ozgunluk.md` F).
- Kalite: Nano Banana Pro, 16:9, x2; gerekirse Real-ESRGAN ile büyüt (POW hattı).

## Flow üretimi
Not: bu bölümdeki `ayarla.py`, `uret.py`, `kontakt.py`, `surekli.sh` skill'in `scripts/` betikleri DEĞİL; Flow/görsel sunucu hattının video klasörü betikleridir (`sablon-video/`'dan ya da bir önceki `videoNN\`'den kopyalanır, `references/kaynak/YOUTUBE-OTOMASYON-SISTEMI.md`).
1. Flow sekmesi + proje açık, doğru hesap (`u/N`). `py flow/ayarla.py` → model çipine BİR kez tık (ikinci tık kapatır) → x2 → "Nano Banana Pro" seç → Escape → çipte "Nano Banana Pro" ve "x2" doğrula. Sayfa yenilenince "Nano Banana 2 / x1"e döner, her turda çalıştır.
2. `bash surekli.sh` (ayarla + uret döngüsü, eksikleri tamamlar, bitince log'a `BITTI2`) → bağımsız süreç. İzleme filtresi: `BITTI|Traceback|Error|0 gorsel`. Her görsel satırını izleme.
3. `uret.py` her istemde: ızgarada yüzde gösteren kutu kalmayana kadar bekle (geç gelen görsel yanlış isme yazılmasın) → "önce" listesi → (karakterliyse karakteri ekle) → `[contenteditable=true]`'ya tıkla, `insertText`, Enter → 240 sn'ye kadar 2 yeni görsel → `img/<ad>_a.jpg`, `_b.jpg`.
4. **Karakter ekleme (2026-10 itibarıyla doğru yol):** Escape → sol menü (x<240) "Karakterler" → karta hover → `more_vert` → "İsteme ekle" → "Tüm medya" → 4 sn → yazı kutusu üstünde küçük karakter resmi görünmeli. "+" penceresindeki Karakterler filtresi/arama kutusu proje bazlı ve boş döner, kullanma.
5. Aynı anda iki `uret.py` çalıştırma (adlar kayar). Flow üretimi sürerken HeyGen indirme döngüsü çalıştırma (sekme yeniden açılınca Flow sekmesi donuyor).
6. "Kullanım sınırınıza ulaştınız" → dur, kullanıcıya sor (bekle / Nano Banana 2'ye onayla geç). Kredi satın alma yok. Hata kartları ızgarada kalır; hata ancak sayı ARTARSA yenidir.

## Kontrol (tek tek, atlama)
- Video klasöründe `kontakt.py` (Flow hattı) → etiketli kontakt sayfaları (≤2000 px). Çok sayfa varsa önce Sonnet alt ajan bulgu listesi çıkarsın, ana model yalnız sorunlu kareye baksın. Aynı görseli iki kez okuma.
- Ele: yanlış tür/ırk, yazı/tabela, çerçeve/kolaj/parşömen, deforme el/pençe, yüzü görünen yabancı, sahneye ait olmayan hayvan/nesne, farklı sunucu yüzü, stil kopması.
- İkisi de kötüyse istemi düzelt, yalnız onu yeniden üret: video klasöründe `uret.py ad1,ad2` (Flow hattı).
- Seçim: `B="ad1 ad2"` → `_b`, diğerleri `_a` → `motion/public/vNN/<ad>.jpg`.

## Stok ve gerçek görüntü
- Oran ve sahne türü → kaynak: `kanal-sablon.json → kaynak` (kaynak stratejisi). Gerçek görüntü avı: `kaynak-avi.md` (`stok_ara.py` Commons/Openverse/web sayfası → kontakt → seç → `credits.json` + `ATIF.txt`).
- Magnific stok (sağlık hattında ≥%35–40 stok); günlük kota.
- Gerçek ilan/arşiv fotoğrafı: kullanım hakkını video başına kontrol et, açıklamaya kaynak/kredi (Commons künyesi sabit yoruma). Kullanılamıyorsa harita/hava fotoğrafı + AI temsilî görsel **etiketli**.
- YouTube klibi (gerçek footage hattı): kaynak tsv + kredi, CFR/bt709 transcode, filigran kırpma.

## Kapak promptu
Tam süreç (rakibin 3 kapağının analizi → 6 konsept → ChatGPT 6 sekme → hepsi Drive'a → teslim): `kapak-analizi-ve-uretim.md`. Aşağıdakiler kanal kuralları ve genel ilkeler.

Kanalda **tutan** kendi kapak şablonu varsa onu esas al; rakip kapaklarını analiz edip daha parlak/okunur yap. Karakter varsa referans görseli ver. Revizede yalnız değişecek yerleri anlatan kısa prompt.

Genel kurallar:
- Tek sahne, panel yok. Yazı başlığı tekrar etmez; 2 kısa satır, büyük, dar, kalın (Anton / Archivo Black tarzı).
- YouTube ana sayfasında küçükte okunmalı: yüksek kontrast, sıcak yüz ışığı, sağ alt ~%15 boş (süre etiketi).
- Aynı nesne/zemin/ok konumu art arda videolarda tekrar etmez (`ozgunluk.md` L).
- Eller: "tam olarak bir başparmak ve dört parmak" yaz. Üslubu yasaklarla değil POZİTİF tarif et.

Kanal şablonları:
| Kanal | Şablon |
|---|---|
| Hund (tutan) | sunucu köpeği işaret eder (DEVAM'a göre kameraya bakar/bakmaz), 2 satır bağıran yazı beyaz+sarı, kırmızı kutuda tek kelime, beyaz/kırmızı ok, ince kırmızı halka, gece mavisi veya sıcak akşam ışığı, güncel kıyafet; zemin dönüşümlü: lacivert fırça / düz / kırmızı bant |
| Sağlık | sol ~%60 düz koyu panel #0A0D12; sağ üstte aynı karakter (kafa ~%30); orta-sağda **cevabı taşıyan ölçüm aleti** (saat, tansiyon aleti) en büyük unsur; 4 satır: 1–2 sarı #FFE000 en büyük, 3 beyaz küçük, 4 beyaz kırmızı kutuda #D81F1F; nesne etrafında değmeyen kırmızı elips #E01B1B + sarı ok; "realistik dijital resim" |
| Akiya | sol üst tek terim (再建築不可) kırmızı zemin beyaz; sağda fiyat sarı kalın; altta arazi beyaz; gerçek ilan fotoğrafı (AI ise köşede 「イメージ」); yazı ABD şablonunun yarısı |
