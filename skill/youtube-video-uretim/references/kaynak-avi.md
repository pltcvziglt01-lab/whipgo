# Kaynak avı — kaynak stratejisinden lisanslı gerçek görüntüye

Sıra: **rakip kaynak türü** (`rakip-kaynak-analizi.md`) → **kaynak stratejisi** (`kanal_sablon.py`, `kanal-sablon.json → kaynak`) → **kaynak avı** (bu dosya) → kurgu (`sahne_kur.py`). AI payı Flow hattıyla üretilir (`gorsel-ve-kapak.md`); bu dosya gerçek payı anlatır.

## 1. Kaynak stratejisi (kanal başına bir kez, kimlikle birlikte)
- Yeni kanalda `kanal_sablon.py` stratejiyi kendiliğinden yazar. Var olan şablona eklemek için: `py scripts/kanal_sablon.py --kanal <ad> --kaynak-guncelle [--dil en|de|tr]`.
- Ölçüm rakibin `ritim/analiz.json` dosyasından gelir. `kaynak_tahmini` alanı durağan görsel, video ve kart paylarını verir; <1 sn "video" geçiş artığı sayılır, video payına girmez. `edit-dili.json → renk.siyah_beyaz_orani` arşiv fotoğrafının izidir.
- AI mı, gerçek mi, stok mu ayrımını `EDIT-DILI.md`, `aciklama-N.txt` ve `secim.json → kaynak_ipuclari` belirler. Güven "düşük" çıkarsa kareye bak (`rakip-kaynak-analizi.md` §1–2).
- Çıktı `KANAL-SABLONU.md` → "Kaynak stratejisi" bölümündedir:
  - rakip payları ve bizim hedef oranımız;
  - 10 dakikalık video için tür başına adet;
  - sahne türü → kaynak → araç tablosu;
  - kurallar: AI etiketi, sentetik içerik beyanı, lisans, yüz/yazı/logo.
- Oranın kuralı: rakibin karışımı korunur. Gerçek olay anlatan kanalda AI payı rakibinkini geçmez. Rakipte video yoksa en az %5 hareketli kaynak konur (durgunluğu kırmak için).

**Oran zorunlu (kullanıcı kuralı, 2026-11-25):** rakip ne kadar video, ne kadar görsel, ne kadar kart kullanıyorsa kurgu ona göre kurulur. `kurgu_denetim.py` her planda `kaynak.hedef`'i okur, video / görsel / kart süre payını ölçer; sapma FAIL'dir, render yapılmaz. Kartın altına konan video sayılmaz (kart zemini bulanıklaşır). Video, medyası görünen bir çekim olarak girmelidir.

## 2. Kaynak türüne göre araç
| Sahne | Kaynak | Araç |
|---|---|---|
| Gerçek kişi, belge, olayın kendisi | arşiv fotoğrafı (PD / CC) | `stok_ara.py ara "<olay> archive photo"`, kurum sayfası için `stok_ara.py sayfa <url>` |
| Yer, bina, nesne, müze eşyası | Commons / Openverse CC BY, CC BY-SA | `stok_ara.py ara "<yer/nesne>"` |
| Hareketli an | YouTube CC BY klip; Commons PD film | `youtube_kaynak.py ara/indir` (`youtube-kaynak.md`); `stok_ara.py ara "<konu>" --tur video` |
| Belgelenmemiş an (kazı, bulunuş, gece) | AI görsel + köşede etiket ("ILLUSTRATION" / "SYMBOLBILD" / "TEMSİLÎ" / 「イメージ」) | Flow (`gorsel-ve-kapak.md`) |
| İsim, tarih, sayı, harita | Remotion kart | `sahne_kur.py` kart |

## 3. `stok_ara.py` (Commons + Openverse, anahtarsız)
`--klasor` her zaman Remotion `public/<vNN>` klasörüdür. Çıktılar `<klasor>/kaynak/` altına yazılır.
```
py scripts/stok_ara.py ara "Hurtgen Forest 1944" --sorgu "M1 helmet rusted" --sorgu "Ardennes American Cemetery" --klasor motion/public/v01
py scripts/stok_ara.py ara "US Army 1944 film" --tur video --min-genislik 960 --klasor ...   # arşiv filmi çoğu zaman <1280
py scripts/stok_ara.py sec 3,7,12,15,21 --ad orman,migfer,mezarlik,kazi,kunye --klasor ...
py scripts/stok_ara.py sec 31 --ad yuruyus --bas 12 --son 22 --klasor ...                    # video: aralık
py scripts/stok_ara.py atif --klasor ... --dil en        # credits.json + KAYNAKCA.tsv -> ATIF.txt (açıklamaya)
py scripts/stok_ara.py temizle --klasor ...              # önizlemeleri sil (teslimden önce)
```
- **Lisans süzgeci:** yalnız PD/PDM ("no known restrictions" dahil), CC0, CC BY, CC BY-SA kabul edilir. NC, ND ve yalnız-GFDL elenir. Commons'ta `Restrictions` (insignia, personality, trademark) varsa kontakt sayfasında **KISIT** yazar. Gamalı haç ya da SS işareti gibi semboller YouTube'da sınırlama riski taşır; yalnız zorunluysa ve bağlamıyla kullanılır.
- **Süzgeç ve tekrar eleme:** en küçük genişlik varsayılanı 1280'dir. Aynı dosya iki yoldan tanınır: Commons pageid ya da curid, normalize URL. Görsel olarak aynı ya da çok benzer olanı dHash (≤6 bit fark) yakalar. Daha önce seçilmiş dosyalar da (`credits.json`) yeniden aday olmaz.
- **Kontakt:** `kaynak/_aday/KONTAKT-N.jpg` sayfaları sayfa başına 20 aday taşır. Her adayın üstünde numara, altında kaynak (C = Commons, O = Openverse, W = web), lisans ve boyut yazar. Video adayında süre kırmızı köşede görünür.
  - `YUZ?` işareti yalnız OpenCV Haar cascade varsa çıkar. OpenCV 5'te bu yok; o durumda yüz gözle aranır.
- **Seç:** tam boy indirir; en büyük genişlik varsayılanı 2880'dir. Dosya yeniden JPEG olarak kaydedilir, meta veri atılır. Video H.264, 30 fps CFR, bt709, sessiz ve ≤1920 olur.
- **`credits.json` alanları:** dosya, `src` (sahne_kur yolu), `tag` (video), başlık, yazar, lisans, lisans URL'si, kaynak URL'si, değişiklik notu, boyut, sorgu, `yuz_algilandi`, kısıt.
- **Kurguda kullanım:**
  - görsel: `kurgu.json` bölümüne `"src": "v01/kaynak/orman.jpg", "video": false` yazılır;
  - video: `"tag": "yuruyus"` yazılır (`public/v01/kaynak/yuruyus.mp4`).

## 4. Seçim kuralları (kontakt sayfasına bakarken)
- Cümlenin birebir resmi olmalı. Dönem doğru olmalı: WW2 anlatırken modern kamuflaj olmaz.
- **İnsan yüzü:** yakın ve tanınabilir yüz seçilmez; sivil ve çocuk yüzü hiç seçilmez. Uzak, arkadan ya da kalabalık çekim olur. Anlatılan gerçek kişinin kamu malı portresi istisnadır; kullanıcıya sorulur.
- **Yazı, logo, filigran:** görselde okunur yazı, filigran ya da kanal logosu olan kare seçilmez, kırpılarak da kullanılmaz. Belge taramasında yazı içeriğin kendisidir, kabul edilir. Alt bant çakışmasını `kaynak_yazi.py` ve `kurgu_denetim` ölçer.
- Müze vitrini yansıması, maket ya da manken, poster ve illüstrasyon tablosu (ör. ONI üniforma sayfası) "gerçek an" yerine geçmez; yalnız nesneyi göstermek gerekiyorsa kullanılır.
- CC BY-SA görsel kendi başına atıfla kullanılır. Videonun tamamı BY-SA olmaz: görsel ayrı bir öğedir, değişiklik notu ATIF'te yazar.
- Aynı görsel iki videoda kullanılmaz (`ozgunluk.md`).

## 5. Web'de araştırma (Commons/Openverse yetmezse)
1. **Sayfa bul:** WebSearch ya da tarayıcıyla kurum arşivlerini ara:
   - NARA (catalog.archives.gov), Library of Congress (loc.gov/pictures);
   - DVIDS (ABD ordusu, kamu malı), NASA, Bundesarchiv (Commons'ta CC BY-SA 3.0 de);
   - Imperial War Museums: çoğu IWM Non Commercial lisanslıdır, KULLANILMAZ;
   - Europeana (lisans süzgeciyle), Flickr Commons (Openverse zaten tarar), DPAA basın sayfaları (kamu malı ABD hükümeti).
   - Sorgu: konu + "public domain" / "no known restrictions" / site:
2. **Sayfayı çözümle:** `py scripts/stok_ara.py sayfa <url> [<url> ...] --klasor ...`
   - Sayfadaki lisans işaretlerini okur: `rel=license`, creativecommons.org bağlantısı, "public domain" ya da "no known restrictions" metni, JSON-LD `license`.
   - Tek ve açık bir izinli lisans varsa sayfanın büyük görsellerini ve videolarını (og:image, srcset, `<video>`, doğrudan dosya bağlantısı) aday olarak ekler. Aynı kontakt ve sec akışı sürer.
   - **Lisans belirsizse** (işaret yok, birden çok lisans, NC/ND, ©) medya yalnız listelenir, **indirilmez**.
   - "ABD federal eseri olası" gibi tahminler kullanıcıya sorulur.
3. **JS ile yüklenen sayfalar** (NARA katalog gibi SPA'lar): `--cdp <port>` ekle.
   - Sayfa otomasyon Chrome'unda yeni sekmede açılır, DOM okunur, sekme kapatılır. Bu Chrome ayrı profil ve CDP portuyla çalışır (`kurulum-ve-cdp.md`, ör. 9334). Kullanıcının günlük Chrome'una dokunulmaz.
   - Giriş, CAPTCHA ya da çerez onayı isteyen sayfada dur, kullanıcıya bırak.
4. Sayfanın lisansı görselin lisansı olmayabilir: koleksiyon sayfası "CC BY", tek bir görsel "© ajans" diyebilir. Şüphede o görselin kendi sayfasını `sayfa` ile ayrıca çözümle.

## 6. Atıf ve teslim
- **Ekranda künye (rakip iskeleti):** kurgu.json'a `"kunye": {"dil": "fr"}` yazılınca `sahne_kur.py` her medya çekimine sağ alt köşe künyesi koyar: YouTube klibi `KAYNAKCA.tsv`'den ("Vidéo : Kanal (CC BY)"), Commons/Openverse `credits.json`'dan ("Photo : Yazar / Wikimedia Commons (CC BY-SA)"), AI görsel (`"ai": true` ya da `src` yolunda `/ai/`) dil etiketiyle ("ILLUSTRATION" / "SYMBOLBILD" / "TEMSİLÎ"). Bölümde `"kunye": "…"` elle yazar, `false` kapatır. VideoDna bunu `DnaKunye` ile çizer (kart zemininde görünmez).
- `stok_ara.py atif --dil <kitle dili>` `kaynak/ATIF.txt` dosyasını yazar. İçinde görsel satırları ("başlık" by yazar, lisans (url) — kaynak), YouTube `KAYNAKCA.tsv` satırları ve BY/BY-SA için değişiklik notu bulunur. Bu metin `baslik-aciklama.txt` dosyasının kaynak bölümüne kopyalanır.
- Teslimden sonra `stok_ara.py temizle` çalıştırılır; indirilen dosyalar `video_temizle.py` ile silinir. `credits.json`, `ATIF.txt` ve `KAYNAKCA.tsv` kalır: hem kanıt hem kanallar arası tekrar hafızasıdır.
