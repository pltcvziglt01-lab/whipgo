# Özgünlük — "tekrar eden / yeniden kullanılmış içerik" ihlaline karşı

Kanal örneği (tam havuzlar, Almanca cümle alternatifleri): `kaynak/OZGUNLUK-KURALLARI-hund.txt`. Bu dosya kanaldan bağımsız sistemdir.

## Neden
YouTube iki şeyi cezalandırır: (1) başkasının malzemesini anlamlı katkı olmadan kullanmak, (2) şablondan seri üretilmiş, birbirinin neredeyse aynısı videolar. Seri üretimde asıl risk ikincisi. Çözüm: **niş ve kimlik sabit, biçim/dil/kurgu/başlık her videoda ölçülebilir şekilde değişir.**

## Sabitler (kanal kimliği) — DEVAM'da yazılı
Sunucu/karakter görünüşü, konu ve kitle, kaynaklı anlatım biçimi. Bunlar değişmez.

## Değişim eksenleri — her yeni video son 3 videoyla karşılaştırılır
**En az 8 eksen farklı; A–D ve J (konu öğeleri) her zaman farklı.**

| Eksen | Ne değişir |
|---|---|
| A Başlık yapısı | son 5 videonun kalıbı tekrar etmez (soru+vaat, neden, birinci tekil tavsiye, iki nokta, tek öğe sorgusu, tire+tema, rakamsız iddia, karşılaştırma, hata/yanılgı, senaryo, zaman/yaş). Kanalın yasaklı aşınmış kalıpları DEVAM'da. |
| B Format | aynı format üst üste 3. kez olmaz (geri sayım — sayıyı da değiştir, tek öğe derinlemesine, ikili karşılaştırma, yanılgılar, senaryo/S-C, bölümlü, bir günün akışı) |
| C Kanca tipi | sahne / soru / iddia / rakam / alıntı / gerçek yorumdan soru / genel gözlem (uydurma anı yasak) |
| D Kalıp cümleler | her videoda tekrarlanan geçiş/kapanış/vurgu cümleleri dönüşümlü; her biri en çok 1 kez, vurgu ifadesi en çok 3 kez → `kalip_kontrol.py` |
| E Kurgu stili | `stil_dna.py --gecmis` son 3 videoya göre ≥6 DNA ekseni farklı seçer (STIL-DNA.md kontrol satırı); en az 2 öğe: vurgu rengi (son 2'dekini kullanma), altyazı stili, bilgi kartı stili, alıntı kartı, geçiş, facecam konumu, görsel hareketi, özet düzeni |
| F Görsel dil | ışık/mevsim teması, kare tipi karışımı, aynı öğenin aynı pozu art arda yok |
| G Sunucu | kıyafet döngüsü 2–3 videoda bir; ekranda kaldığı cümleler farklı yerlere |
| H Orta bölüm kaynağı | kanun / istatistik / yönetmelik / sigorta / mahkeme kararı / sağlık; aynı kaynak art arda yok |
| I Kapanış + yorum sorusu | soru tipi (deneyim/tercih/tartışma/bilgi yarışması) ve kapanış cümlesi son 3'te yok |
| J Konu öğeleri | son 3 videonun öğeleri (ırk/il/ürün) yok; eski bir videodan en fazla 3 öğe; 1 numara son 5'te 1 numara olmamış |
| K Süre/tempo | ±30 sn oynasın; öğe başına süre eşit olmak zorunda değil |
| L Açıklama/kapak | açıklamanın ilk 2 cümlesi yeni; kapak zemini/ok/yazı konumu dönüşümlü; kapak yazısı başlığı tekrar etmez |
| M Reklam/CTA | %30'dan sonraki ilk bölüm sınırı; cümlesi her videoda yeniden yazılır |

## Her video en az %20 farklı (zorunlu)
Rakip analizinden sonra her videoda iki karşılaştırma yapılır ve ikisi de en az %20 olmak zorundadır:
1. **Rakibe göre:** edit dili (stil_dna rakip eksenleri) + metin + kapak. Metin ve kapak zaten %100 bizim; edit dilinde ≥%20 (pratikte 6/7 eksen).
2. **Kanalın son 3 videosuna göre:** stil DNA eksenleri (17 eksen; `--kilit palet,font` ile kimlik 2 eksen sabit kalsa da en az 4 eksen değişir) + bu dosyadaki A–M eksenleri (≥8).
`STIL-DNA.md` §Kontrol `TUTMADI` derse `--tohum` değiştirilir; elle "yeterince farklı" denmez.

## AI slop işaretleri (hiçbiri olmayacak)
- Her sahnede aynı geçiş / aynı Ken Burns / aynı giriş animasyonu (repertuar + DNA bunu engeller; elle kurgu yazılmaz).
- Her cümleye bir stok görüntü, görüntü konuyla gevşek ilgili; aynı görselin tekrarı (`kalite_kapisi.py` tekrar eden görsel).
- Robotik ritim: tüm çekimler eşit süre (iskelet rakipten gelir; sahne süreleri cümle uzunluğuyla değişir).
- Kalıp cümleler ("In this video…", "Let's dive in", "But here's the thing", "Stay tuned") — `kalip_kontrol.py`.
- Kaynaksız iddia, uydurma anı, genel geçer dolgu paragrafları.
- Konuyla çelişen ton (savaş anlatırken neşeli müzik/edit; gizemde parlak pastel).
- Her videoda aynı kapak şablonu, aynı başlık kalıbı (A ve L eksenleri).
- Yapay ses tonu tek düze: TTS sesi kanal başına seçilir, cümle vurguları metinde işaretlenir (`ses.md`).

## Yasaklar
- Uydurma anı/unvan, kaynaksız rakam.
- Başka kanalın metnini, kurgusunu, kapağını kopyalamak. Rakip videolar konu fikri, yapı ve ritim ölçümü için kullanılır; cümleler %100 bizim.
- Aynı görseli iki videoda kullanmak (stok havuzu yok, her video kendi görselleri).
- Başka videodan 2+ cümlelik metin bloğu kopyalamak (alıntı hariç).

## Kayıt ve kontrol
- `sistem/varyasyon.tsv`, her video bir satır:
  `video | başlık kalıbı | format | öğe sayısı | kanca tipi | vurgu rengi | altyazı stili | kart stili | geçiş | facecam | ışık teması | orta bölüm konusu | kapanış cümlesi | yorum sorusu tipi | kapak zemini | 1 numara`
- Planlarken: `py scripts/varyasyon_kontrol.py sistem/varyasyon.tsv --yeni "<planlanan satır>"` → kaç sütun farklı, hangi zorunlu eksen tekrar ediyor.
- TTS'ten önce: `py scripts/kalip_kontrol.py videoNN/metin.txt --onceki video(NN-1..NN-3)/metin.txt --kaliplar sistem/kaliplar.txt`. Temiz değilse metni düzelt, sonra seslendir.
- Faceless kanallarda en az 5 eksenden 3'ü (Akiya kuralı) — kanal DEVAM'ı eşiği belirler.
