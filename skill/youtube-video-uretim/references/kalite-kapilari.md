# Kalite kapıları — ölç, bak, sonra teslim et

Bu sayfadaki kontroller sayılarla çalışır. **FAIL varsa video teslim edilmez**; önce düzeltilir, sonra kapı yeniden çalıştırılır. Uyarı (UYARI) düzeltme zorunluluğu getirmez, gözle bakılıp karar verilir. Temiz çıkan sayı bakmanın yerine geçmez: `qc.py` ızgarası ve yan yana sayfa her zaman açılır.

Fikir kaynağı: vidbucks (MIT) kalite kapısı yaklaşımı. Kod bizim, kendi hattımıza (Windows, rapidocr, kare_analiz) göre yazıldı.

## 1. Sıra (her videoda)

| Ne zaman | Komut | Ne yakalar |
|---|---|---|
| Metin bitince, **TTS'ten önce** | `py scripts/kalip_kontrol.py …` + `py scripts/metin_kontrol.py --metin metin.txt --dil <dil>` | kalıp cümle, tekrar; uzun tire/üç nokta (TTS duraklar), 40+ kelimelik cümle, makine yazısı izleri ve klişeler (TR/EN/DE/JA), rakamla yazılmış sayı |
| Görsel/video istemleri bitince, **üretimden önce** | `py scripts/metin_kontrol.py --istemler istemler.json [--yasakli adlar.txt]` | yazı çıkaracak kelime + "no text" koruması yok, gerçek kişi/marka adı (modeller reddeder ya da risk) |
| Ses ve zamanlama bitince; her yeniden seslendirme/zamanlama sonrası | `py scripts/senkron_kontrol.py vo.mp3 cumleler.json` | zaman geri gidiyor, ilk cümle konuşmadan önce/sonra başlıyor (düz whisper ~0,4 sn erken), son cümle sesten taşıyor |
| **Tam render'dan önce** | §2 üç onay | yanlış hikâye/görünümle saatlerce render |
| Her render sonrası | `py scripts/kalite_kapisi.py final.mp4 --metin metin.txt --dil <dil> [--brief brief.json]` | görüntü/ses süre farkı, ilk 2 sn ölü kanca, siyah/donmuş bölüm, tek karelik sıçrama, uzun sessizlik, LUFS/tepe, metnin okunmayan cümleleri, durağan pay, aynı görselin tekrarı, arka arkaya aynı kadraj |
| Ekranda yazı olan her render | `py scripts/yazi_kontrol.py final.mp4` | kadrajdan taşan/kesik yazı, güvenli alan dışı (Shorts'ta telefon arayüzü), üst üste binen yazı, kontrast < 3:1, bozuk okunan yazı |
| Render + kapı geçtikten sonra | `py scripts/kare_analiz.py final.mp4 --cikti bizim-analiz` → `py scripts/karsilastir.py --biz bizim-analiz/analiz.json --ref <rakip analiz.json'ları> [--biz-video final.mp4 --ref-video …]` | iskelet sayıları rakibin ±%20'si içinde mi; tutmayan her satır için somut eylem; yan yana sayfa |
| Ses miksi | `py scripts/ses_miks.py --vo vo.mp3 --muzik m.mp3 --sfx sfx.json --video ham.mp4 --cikti final.mp4` | konuşma sıkıştırma, müziği konuşmada kısma (sidechain), SFX'i kesim anına koyma, iki geçişli −14 LUFS. **Ses hızına dokunmaz.** Vuruş haritası: `--vurus muzik.mp3` (librosa) |

Hepsi FAIL'de çıkış kodu 1 döner. Rapor dosyaları videonun yanına yazılır (`*-KAPI.md`, `*-YAZI.md`, `KARSILASTIRMA.md`).

## 2. Tam render'dan önce üç onay (kullanıcıdan)
Ucuz adımlar, pahalı render'dan önce:
1. **Hikâye tablosu:** bölüm / süre / ana fikir / kanca cümlesi / kullanılacak görsel türü (tek tablo).
2. **Görünüm kareleri:** 2–4 adet tek kare (still): renk, yazı stili, altyazı, çerçeve. Remotion'da `npx remotion still`.
3. **Storyboard / 20–30 sn deneme:** ilk 30 sn'nin çekim çekim planı ya da kısa deneme render'ı (`kurgu-render-qc.md`).

Hikâye değişirse (metin, sıra, kanca) üç onay yeniden açılır. Onaylar DEVAM.md'ye tarihle yazılır.

## 3. Jüri (her taslakla, kullanıcıya göstermeden önce)
Altı soru, her biri tek cümle cevap ve kanıt anı (mm:ss):
1. **Kanca:** ilk 2 sn izleyiciyi durduruyor mu? (hareket + merak)
2. **Doruk anı:** videonun en güçlü 5 sn'si nerede, yeterince güçlü mü?
3. **Jenerik kare:** "her videoda olabilecek" sıradan bir kare var mı?
4. **En zayıf 5 sn:** neresi, neden?
5. **Ses:** büyük kesimlerde ses vurgusu var mı, müzik konuşmayı bastırıyor mu?
6. **Sözler:** ekrandaki yazı ve metin doğal mı, klişe var mı?

Puan, sabit ölçeğe göre verilir: 5 = öğrenci işi · 6 = yayınlanabilir · 7 = rakip seviyesi · 8 = rakipten iyi · 9 = ödül seviyesi.
En fazla **3 düzeltme** yazılır, etkisi en büyük olan ilk sırada. Puan 7'nin altındaysa düzeltmeden kullanıcıya gösterilmez.

## 4. Teslim notu
Kullanıcıya şunlar söylenir: kapı sonucu (PASS, uyarı sayısı), karşılaştırma tablosunun özeti, jüri puanı. Ayrıca **neyin doğrulanamadığı** açıkça yazılır. Örnekler: "metin kontrolü faster-whisper olmadığı için atlandı", "rakip video silindiği için yan yana sayfa kontakt sayfalarından yapıldı".
