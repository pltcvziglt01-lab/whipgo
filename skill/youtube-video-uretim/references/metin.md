# Araştırma ve metin

## Araştırma → `arastirma/ARASTIRMA-NN.md`
- WebSearch/WebFetch; birincil/resmî kaynak (Wikipedia dil sürümleri, standart kurumları, kanun metni, hakemli çalışma, belediye ilanı).
- Her iddia tek satır + kaynak URL. Kaynağı bulunamayan madde metinden çıkar (ör. mizaç bilgisi olmayan ırk listeden çıkar).
- En sona dürüstlük notu: neyi doğrulayamadın, neyi yuvarladın.
- Rakam yuvarlanır ve sözle yazılır ("fast die Hälfte", "etwa drei von zehn").

## metin.txt biçimi
- Bölüm başlıkları `# 0 KANCA`, `# 1 …` — seslendirilmez, kurgu ve bölüm zamanları bunlardan çıkar.
- Sayıları yazıyla yaz (TTS için), kısaltmaları aç. Japoncada 万円, 坪+㎡, 築年 biçimleri kanal anayasasında.
- Kısa ve uzun cümleyi dönüşümlü kullan; cümle uzunluğu rakibe yakın (SPEC). Hedef süre metin uzunluğuyla tutturulur; ses hızı değiştirilmez (`ses.md`).
- Anlatıcı gerçek uzman değilse "hastalarım", "30 yıllık tecrübemle" yok. Uydurma kişisel anı yok; genel gözlem olur.

## Uzunluk (kanal DEVAM'ı kilitler; tipik değerler)
| Kanal | Hedef |
|---|---|
| Hund | ÖZGÜNLÜK dosyası (2026-10-20, en yeni): 8–10 dk, 1250–1350 kelime, ±30 sn oynasın. Eski üretim dosyaları 1550–2100 der — **yenisi geçerli**. |
| Sağlık | ~2.900 kelime ≈ 19–20 dk |
| Akiya | anayasa: "10 dk, 4.300–4.700 karakter, ilan başına ~290" — ama ölçülen okuma hızı ~344 字/分 (≈5,7 karakter/sn) bu bütçeyle ~13 dk verir; §14 hedefi 300 字/分. Süreyi karakterden değil, seçilen sesin ölçülen hızından hesapla. |

## Giriş / tutunma kuralları (analitikten; 0:30'da %60–65'e düşüş görüldü)
- Kanca ≤25–30 sn (~60–75 kelime). 1. cümle = başlığın vaadi + çarpıcı görüntü.
- "Am Ende erzähle ich…", "Bevor wir anfangen", "en sonda anlatacağım" **yasak**. Açık döngüler somut: "Einer davon…", "Die Nummer eins…".
- İlk liste maddesi en geç 0:40. Ayrı kriter/bağlam bölümü yok.
- Başlıktaki yanlış inancı ilk 60 sn'de açıkça reddet; beklettiğin şey DOĞRU cevaptır.
- Rakibin ilk 30 sn ve ilk %30'unu SPEC'teki sahne yapısıyla birebir kur.
- Kanal bazlı ayrıntı ve geçersiz kalan eski retrofit için: `dersler-akiya-medical.md` (Tutunma).

## Yapı şablonları
**Geri sayım (Hund):** kanca (iki merak: "biri şaşırtıcı…", "1 numara…") → 10…6 → ortada sunucunun dürüst uyarısı → 5…1 → pratik 3 madde → özet listesi → yorum sorusu + kanalda VAR olan önceki videoya yönlendirme → kapanış (her videoda farklı).

**Tek mekanizma (Sağlık):** soğuk açılış sahnesi (saat, mekân, tek hareket; 150–200 kelime) → erken düzeltme → mekanizma (basit benzetme) → rakamlar → izleyicinin itirazları → evde test → ne zaman doktora (kırmızı bayraklar) → yapılacaklar (numaralı, ücretsiz) → ne yapılmamalı → özet + yorum isteği + "birine gönderin".

**Teşhis geri sayımı (Akiya):** T1 olumsuzlamayla açılış + T3 soru yağmuru → T4 dürüstlük beyanı + T5 geri sayım vaadi → her ilan ①フック ②土地 ③スペック ④価格 (fiyat ASLA başta değil) ⑤二人の目 (her ilanda bir kez) ⑦一行総括 → T10 örüntüyü çıkar. Tam teknik listesi `kaynak/KANAL-ANAYASASI-akiya.md` §5–7.

## Seslendirmeden önce dil kontrolü
- Tekrarlanan kelime ("wie wie"), hatalı hâl eki, "lesen/hören" karışıklığı, kanal adı/konu adı yanlış.
- `scripts/kalip_kontrol.py` (kalıp cümle sınırları + önceki 3 metinle 6+ kelimelik ortak dizi). Temiz değilse düzelt.
- Metni kullanıcıya göster (yeni kanalda zorunlu; seri videoda DEVAM'daki tercihe göre).
