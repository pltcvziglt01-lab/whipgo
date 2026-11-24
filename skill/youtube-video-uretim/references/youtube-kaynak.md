# YouTube'dan gerçek video ve görsel kaynağı

Bazı kanallar gerçek görüntü ister: tarihî arşiv, müze, askerî tatbikat, doğa, şehir, ürün. Bu görüntüyü YouTube'dan almak mümkün, ama **telif ve "yeniden kullanılmış içerik" kuralı** var. Kuralsız alınan klip kanalı demonetize ettirir ya da telif ihtarı getirir (`demonetizasyon-riski.md`).

## 1. Kural (dokunulmaz)
| Durum | Kullanılır mı | Ne yapılır |
|---|---|---|
| Video lisansı **Creative Commons Attribution (CC BY)** | EVET | açıklamada atıf: "Footage: <kanal> – <başlık> (<url>), CC BY". `KAYNAKCA.tsv`'den otomatik çıkar |
| Standart YouTube lisansı | HAYIR | yalnız araştırma/fikir için izlenir. İstisna yalnız **kullanıcının açık izniyle**: sahibinden yazılı izin, kullanıcının kendi kanalı, kamuya açık resmî kayıt (ör. ordu/devlet kurumu kamu malı). İzin `--izinli "..."` ile kayda geçer |
| **Rakibin videosu** | ASLA | rakip yalnız ölçülür (ritim, edit dili); görüntüsü kullanılmaz |
| Haber kanalı, film, dizi, maç, müzik klibi | HAYIR | CC BY yazsa bile şüpheli; kullanıcıya sor |

Ek kurallar:
- CC BY klip de **anlamlı katkıyla** kullanılır: anlatımla, kurguyla, bilgi kartıyla dönüştürülür. Uzun ham parça (>15–20 sn kesintisiz) yerine kısa çekimler.
- Aynı klip iki videoda kullanılmaz (`ozgunluk.md`).
- Görüntüdeki filigran/logo kırpılmaz; atıf zaten verilir. Kırpmak gerekirse kullanıcıya sor.
- Yüzü görünen sıradan kişiler (özel kişi) bulanıklaştırılır ya da o çekim kullanılmaz.

## 2. Akış
1. **Ara** (lisans filtreli, her video tek tek doğrulanır):
   `py scripts/youtube_kaynak.py ara "<İngilizce/yerel sorgu>" --adet 20 [--cerez <cookies.txt>]` → `adaylar.tsv` (kullanılabilir EVET/HAYIR, kanal, süre, çözünürlük).
   Sorguyu çeşitlendir: konu + "archive footage", "museum", "documentary b-roll", "4K", "drone", yerel dilde karşılığı.
2. **İzle ve seç:** adayın ilgili anlarını bul (gerekirse claude-video `/watch` ya da altyazı). Seçilen aralıkları cümlelerle eşle (`cumleler.json`).
3. **Parça indir:** `py scripts/youtube_kaynak.py indir <id> --bas 12.5 --son 21 --klasor videoNN/kaynak` (≤1080p, yalnız o aralık).
   **Kare (görsel olarak):** `py scripts/youtube_kaynak.py kare <id> --anlar 10,22.5 --klasor videoNN/kaynak`, Ken Burns ile kullanılır.
4. **Kurguya koy:** klip CFR/bt709'a çevrilir (`kurgu-render-qc.md`), ses kısılır ya da atılır (bizim seslendirme ana ses).
5. **Atıf:** `videoNN/kaynak/KAYNAKCA.tsv` → baslik-aciklama.txt "Footage / Quellen" bölümü; gerekiyorsa sabit yorum.
6. **Temizlik:** video Drive'a teslim edildikten sonra `kaynak/` altındaki indirilmiş klipler silinir (`video_temizle.py`). KAYNAKCA.tsv kalır.

## 3. Bot engeli
YouTube "bot değilsin" derse `cerez_al.py --port <otomasyon Chrome portu>` ile çerez al, `--cerez` ver. İstekler yavaşlatılır. Kullanıcının günlük Chrome'una dokunulmaz.
