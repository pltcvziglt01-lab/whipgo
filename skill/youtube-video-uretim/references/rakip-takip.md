# Rakip kanalları günlük takip

Amaç: kullanıcının verdiği rakipleri her gün izlemek ve şu soruları cevaplamak:
- Ne yayınladılar?
- Ne tutuyor?
- Video çıkmadan önce ne yapıyorlar (konuyu Short'ta deneme, başlık ve kapak A/B testi, tempo değişikliği)?
- Biz bundan hangi konuyu, ne zaman çıkarmalıyız?

Ölçüm betikte yapılır (`scripts/rakip_takip.py`, token harcamaz). Yorum Claude'da, günde bir kısa özet olarak.

## 1. Kurulum (kullanıcı kanal listesi verdiğinde, bir kez)
1. Takip klasörü: `C:\Users\<ad>\Documents\RAKIP-TAKIP\` (DEVAM'da başka yer yazılıysa orası). Kütüphaneye (Drive) yazılmaz; orası ortak alandır.
2. `takip.txt`: her satır `@handle<TAB>not` (not = hangi kanalımızın rakibi, niş).
3. Betikleri kopyala: `rakip_takip.py` ve `rakip_indir.py` dosyalarını `RAKIP-TAKIP\_arac\` altına koy. Plugin güncellenince yol değişir, zamanlanmış görev sabit yoldan çalışmalı.
4. İlk çalışma tabanı kaydeder. Değişimler ikinci günden itibaren görünür:
   `py -I "%USERPROFILE%\Documents\RAKIP-TAKIP\_arac\rakip_takip.py" --liste "%USERPROFILE%\Documents\RAKIP-TAKIP\takip.txt"`
   - Kanal başına ilk çalışma ~1 dk sürer, sonraki çalışmalar ~10 sn.
   - Bot engelinde: `--cerez <cookies.txt>` (`cerez_al.py`).
5. **Zamanlama.** İkisi de kalıcı ayar olduğu için kullanıcıya sor ve onay al:
   - **Windows Görev Zamanlayıcı** (önerilen; Claude açık olmasa da çalışır, token harcamaz):
     ```
     schtasks /Create /SC DAILY /ST 08:30 /TN "RakipTakip" /TR "py -I \"%USERPROFILE%\Documents\RAKIP-TAKIP\_arac\rakip_takip.py\" --liste \"%USERPROFILE%\Documents\RAKIP-TAKIP\takip.txt\""
     ```
   - **Claude zamanlanmış görevi** (özeti de Claude yazsın isteniyorsa): scheduled-tasks aracıyla günlük görev. İstem: "rakip_takip.py'yi çalıştır, RAPOR-<bugün>.md'yi oku, §3'e göre Türkçe özet çıkar, RAKIP-TAKIP\OZET-<bugün>.md'ye yaz." Görev token harcar; özet yalnız rapordan yazılır, video indirilmez.

## 2. Betik ne topluyor (her çalışmada)
| Sinyal | Nasıl | Ne anlama gelir |
|---|---|---|
| Yeni uzun video / Short | `/videos` ve `/shorts` sekmesindeki son N video; yeni olanın yayın zamanı, süresi, etiketleri, açıklaması | ne yayınladılar, hangi saatte |
| İzlenme artışı ve hızı | her çalışmada izlenme kaydı → son çalışmadan beri artış, saatlik hız | hangi video şu an itiliyor (algoritma testi geçti) |
| Outlier | izlenme / son N uzun videonun medyanı ≥ 2 | kanal ortalamasını kıran konu = konu fikri adayı |
| **BAŞLIK DEĞİŞTİ** | başlık önceki çalışmadan farklı | başlık A/B testi ya da kurtarma girişimi; eski → yeni başlık kayıtlı |
| **KAPAK DEĞİŞTİ** | son 10 videonun kapağının md5'i; eski ve yeni kapak `kapaklar/` altında saklanır | kapak A/B testi (YouTube "Test & Compare"). Hangisi kalıcı oldu? Kazanan kapak dersi |
| Short'ta denenmiş konu | yeni uzun videonun başlığı daha önceki bir Short ile anahtar kelime paylaşıyor | rakip konuyu önce Short'ta test edip sonra uzun video yapıyor (içerik öncesi davranış) |
| Tempo ve saat | yayın aralığı medyanı, en sık yayın saati (UTC) | seri mi başlattılar, temposu mu değişti |

Çıktı: `RAKIP-TAKIP/RAPOR-YYYY-AA-GG.md`, kanal başına `durum.json` (bütün geçmiş) ve `kapaklar/`.

## 3. Claude'un günlük özeti (raporu okuyunca, en çok 15 satır)
1. **Bugün ne oldu:** kanal başına bir satır (yeni video, A/B testi, hızlanan video). Olay yoksa yazılmaz.
2. **Yükselen konular:** hız ve outlier listesinden 3 konu; her birinin bizim hangi kanalımıza uyduğu.
3. **İçerik öncesi sinyaller:**
   - Short'ta denenip tutan konu → 3–10 gün içinde rakibin uzun videosu gelebilir. Bizim için bir yarış konusu mu, yoksa kaçınılacak bir konu mu?
   - Başlık ya da kapak değiştiyse eski ve yeni hâlini karşılaştır ve dersi tek cümleyle yaz. Kapakları gerekirse açıp bak.
4. **Önerilen eylem:** en çok 2 madde. Örnek: "@X'in 'Nepal flood' Short'u 2 günde 10x, uzun video henüz yok. Bizim kanal için başlık adayı: …". Öneri başlık kurallarına (`ozgunluk.md`) ve demonetizasyon riski kurallarına (`demonetizasyon-riski.md`) uyar. Rakibin başlığı kopyalanmaz, iskelet alınır.
5. Haftada bir: 7 günün raporlarından trend (kim hızlandı, kim yavaşladı, hangi format tutuyor), ilgili kanalın DEVAM.md dosyasına 3 satır.

## 4. Sınırlar
- Topluluk gönderileri ve canlı yayınlar toplanmıyor (yt-dlp güvenilir vermiyor). Gerekirse elle bakılır.
- İzlenme sayıları YouTube'un yuvarladığı değerlerdir (ör. 3,3 Mn). Küçük artışlar 0 görünebilir.
- A/B testi sırasında farklı kullanıcılar farklı kapak görür. md5 değişimi "şu an sunulan kapak değişti" demektir; testin sonucu birkaç gün izlenerek anlaşılır.
- Rakip video **indirilmez**. Derin analiz gerekirse Faz 1 araçları (`kanal_isle.py`) ayrıca çalıştırılır ve sonra temizlenir.
