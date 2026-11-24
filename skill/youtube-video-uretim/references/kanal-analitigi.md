# Kendi kanalının analitiği — tek eylem

Kullanıcı "neden büyümüyor", "videom neden tutmadı", "sıradaki videoda neyi değiştireyim" dediğinde kullanılır. Rakip takibi (`rakip-takip.md`) dışarıya bakar; bu sayfa kanalın kendi rakamlarına bakar.

## 1. Veri nereden
- **YouTube analitik MCP bağlıysa** (ör. `get_my_channel_overview`, `get_my_top_videos`, `get_my_video_analytics`, `get_my_audience_retention`, `get_my_traffic_sources`, `get_my_device_report`): son 28 gün + son 5 video.
- Bağlı değilse kullanıcıdan YouTube Studio ekran görüntüsü ya da CSV istenir: Genel bakış, İçerik (gösterim, TO, izlenme, ort. izleme süresi), video başına "Kitleyi elde tutma" grafiği, Trafik kaynakları.
- Uydurma yok: veri yoksa "bu veri olmadan söyleyemem" denir.

## 2. Okuma sırası (huni)
1. **Gösterim:** YouTube videoyu gösteriyor mu? Az gösterim varsa sorun konu ya da kanal sinyalidir; kapak değil.
2. **TO (tıklama oranı):** gösterim var ama TO < %3–4 ise kapak ve başlık sorunu var. `kapak-analizi-ve-uretim.md` ve rakip takipteki kapak A/B dersleri.
3. **İlk 30 sn tutma:** %60'ın altındaysa kanca sorunu var. Kancayı rakibin ilk 30 sn ölçümüyle karşılaştır (`karsilastir.py`, ilk30 satırları).
4. **Ortalama izleme yüzdesi ve düşüş noktaları:** grafikte ani düşüş olan an (mm:ss) → o anda metinde/kurguda ne vardı? Tekrar, uzun durağan sahne, konudan sapma.
5. **Trafik kaynağı:** göz atma/önerilen ağırlıklıysa algoritma test ediyor demektir. Arama ağırlıklıysa başlıktaki anahtar kelime çalışıyor demektir.
6. **Yayın temposu ve saat:** `kanal_risk.py` (insan dışı tempo uyarısı da buradan).

## 3. Çıktı
- **TEK eylem** önerilir. En büyük kayıp hunide nerede başlıyorsa oraya: "Sıradaki videoda kancayı şöyle değiştir" ya da "kapak yazısını 3 kelimeye indir". Birden çok şey aynı anda değişirse neyin işe yaradığı anlaşılmaz.
- Eylemin ölçütü: hangi rakam, kaç videoda, ne kadar değişirse başarılı sayılır.
- DEVAM.md'ye yazılır: tarih, rakamlar, eylem, beklenen sonuç. Bir sonraki videoda sonuç tabloya eklenir (`VIDEO-PATLATMA-TAKTIGI-saglik.txt`'teki tutan/batan tablosu gibi).
