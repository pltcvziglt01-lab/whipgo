# Rakip analizi, konu seçimi ve başlık

Ayrıntılı kaynaklar: `kaynak/VIDEO-PATLATMA-TAKTIGI-saglik.txt` (outlier + iki filtre + başlık iskeleti), `dersler-akiya-medical.md` (ölçüm yöntemi ve hedef sayılar), `kaynak/KANAL-ANAYASASI-akiya.md` §1 (bir rakip kanalın tam analizi örneği).

## 1. Rakip kümesi (tek rakibe bakma)
1. Referans kanaldan "ilgili kanallar" (Nexlev `get_similar_channels` / TubeLab `search_related_channels`), kaynak dil filtresi, abone ≥20.000.
2. İzlenme/abone oranına göre sırala: >1,5 dağıtım alıyor → çalış; <0,1 ölü kanal → at.
3. Aynı başlık 2–3 kanalda tutmuşsa **iki kez doğrulanmıştır** — en güvenilir sinyal.
4. Çoklu dil ses parçası (dublaj) olan kanalları yerli rakip sayma.

## 2. Outlier'lar
- Ölçüt: `averageViewsRatio` (video / kanal ortalaması). **Eşik ≥2,0.** Altı "iyi video"dur (başarısız örneğin kaynağı 1,71×'ti).
- Tablo: başlık | en iyi izlenme | oran | kaç kanalda var.
- Kaynak videonun izlenmesi bizim sonucumuzu tahmin etmez; konunun **şekli** ve **kitle genişliği** belirler.

## 3. İki filtre (geçmeden yazma)
- **Kitle genişliği:** "İzlemek için başına özel bir şey gelmiş olmalı mı?" Evet → ele (belirli ameliyat/teşhis/nadir ilaç). Milyonların yaşadığı şey geniş sayılır.
- **Konu türü:** liste ("5 ameliyat"), utandıran, doymuş jenerik, soyut/kurumsal → ele. Tut: tek günlük davranış/belirti, kesin (tercihen sayısal) cevabı olan soru.
- Not: Bu filtreler sağlık nişinde ölçüldü. Geri sayım listesinin kanalın kendi kazanan formatı olduğu nişlerde (Hund, Akiya) kanalın kendi verisi kazanır.

## 4. Kaynak videodan tek mekanizma
Transkripti oku (`get_video_transcript`). Başlık tekil ama içerik listeyse listeyi kopyalama; en geniş kitleye dokunan, en somut, evde yapılabilir çözümü olan TEK maddeyi al, videoyu onun üzerine kur. Ana iddiayı güncel literatürle doğrula; çürükse videoyu iptal etme, **açıyı değiştir** (yaygın yanlış inancı düzeltmek çoğu zaman en güçlü açıdır). Hedef ülkenin kendi kaynaklarını kullan.

## 5. Kare kare ölçüm (yeni kanal / yeni rakip için zorunlu)
Uygulama: `rakip-kare-analizi.md` (indir → 0,1 sn tara → birleştir → temizle) ve `rakip-kaynak-analizi.md` (gerçek/stok/AI).
Ölç, tahmin etme. SPEC-<kanal>.md'ye yaz:
- Cümle başına görsel sayısı, görselin ekranda kalma süresi (medyan + dağılım), görsel başına kelime.
- İlk 30 sn ve ilk %30'un sahne listesi (birebir yapı), ilk %30 ile sonrası arasındaki yoğunluk farkı.
- Görsel tür dağılımı (foto / kart / harita / sunucu / stok video / animasyon).
- Zoom yönü/hızı, geçiş tipi ve süresi, altyazı stili, vurgu rengi, efekt sıklığı.
- Konuşma hızı (kelime/dk veya karakter/dk), cümle uzunluğu, LUFS.
- Kapak şablonu (yazı miktarı, renkler, nesne, yüz/bakış).
Kare almak için: Nexlev `extract_video_frames_for_editing_animation_and_camera_style`, `watch_youtube_video_and_ask`; ya da yt-dlp + ffmpeg sahne tespiti (`select='gt(scene,0.3)'`). Bulgular sayıya bağlanmadan kural yazılmaz.

## 6. Başlık iskeleti (her konuya tek sabit formül uygulama)
A) Rakip başlığını parçala: kime hitap, ne tetikliyor (korku/merak/fayda/hata/uyarı), açılış kalıbı (soru/emir/koşul/karşıtlık/sayı), somut konu, ters köşe, saklanan bilgi, somut vaat, sıra/ritim.
B) Değişkenli şablona çevir: `[günlük belirti] + [yaygın açıklamanın reddi] + [şaşırtan alternatif]`. Rakibin mekanizmasını koru, başka formüle zorlama.
C) Aynı iskeleti farklı, doğal yerel dille kur. Kelime kelime çeviri / eş anlamlı değişimi yetersiz. Uydurma rakam/garanti/sahte unvan ekleme.
D) 3 varyant: (1) iskelete en sadık, (2) en doğal yerel, (3) güçlü merak. Her biri için: rakip başlığı, iskelet, yeni başlık, Türkçe anlamı, korunan mekanizma, değişen kelime/dizilim.
E) Son kontrol: aynı sorun + aynı merak tipi mi; yüzeysel çeviri değil mi; hedef dilde doğal mı; yeni gerçek dışı iddia yok mu; ~60–70 karakter.

**Çelişki notu:** Akiya kanalında ölçülen ders (§13.19, `dersler-akiya-medical.md`) "kaynak videonun anahtar kelimeleri korunur" der. Kural: arama/öneri trafiği getiren **konu anahtar kelimelerini** koru, **cümle dizilimini ve diğer kelimeleri** değiştir. Kanalın DEVAM'ında hangisi kilitliyse o.

## 7. Kullanıcıya sunuş
AskUserQuestion: 3–4 başlık, önerilen ilk ve "(Önerilen)". Her seçenek açıklamasında Türkçe anlamı ve dayandığı outlier (oran + izlenme). Kanal başlık havuzu ve son 5 videonun kalıbı (`ozgunluk.md`) tekrar etmesin.

## 8. Ölçme kaydı
Her yayınlanan videonun sonucunu (kaynak oranı, bizim izlenmemiz, tutunma 0:30) DEVAM'a yaz; filtreleri buna göre güncelle. Gerçek örnek: kaynakta 790K → bizde 108 (liste); 402K → 50K (geniş kitle, tek davranış).
