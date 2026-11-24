# Teslim

Kayıt yeri DEVAM §1/§2'de yazılı değilse kullanıcıya sor (masaüstü klasörü + Drive linki), sonra DEVAM'a yaz.

**Teslimden önce `py scripts/adim_kontrol.py <video klasörü>` PASS zorunlu** — üretim defteri tam, her faz kanıtlı, hiçbir faz atlanmamış (`references/uretim-defteri.md`); FAIL varken teslim yok.

## baslik-aciklama.txt
1. **BAŞLIK** (seçilen)
2. **AÇIKLAMA** — ilk 2 cümle her videoda yeniden yazılır (şablon kopyalanmaz); 2 paragraf; bölüm zamanları `scripts/bolum_zamanlari.py cumleler.json metin.txt` (her bölümün ilk cümlesinin `t` değeri, ilki 0:00); yorum sorusu; 3 hashtag.
3. **Kaynaklar** (Quellen / 出典) — ARASTIRMA dosyasından. Gerçek görüntü kullanıldıysa `KAYNAKCA.tsv`'den "Footage: <kanal> (<url>), CC BY" satırları (`youtube-kaynak.md`).
4. **Hinweis / feragat / dürüstlük notu** — sağlık: "ilacı kendi başınıza bırakmayın"; güvenlik: "köpek kilit yerine geçmez"; emlak: 宅建業法 feragati; hikâye: "dramatized".
5. **ETİKETLER**
6. **KAPAK İSTEMİ** — seçilen kapağın istemi + 6 kapağın dosya adları (`kapak-analizi-ve-uretim.md`)
- txt'ler UTF-8 **BOM'lu** (Not Defteri'nde bozuk görünmesin). Gerçek görsel kullanan kanalda ayrıca sabit yorum için kredi dosyası.

## Dosya adları
- Hund tipi: `YYYY-AA-GG_VNN_<Kısa-Ad>.mp4`, `.txt` (başlık-açıklama + "METİN (<dil>)" + metin), `_METIN.txt` (yalnız metin, paragraflar arası boş satır). TARİH = üretim günü.
- Diğer kanallar: `YYYY-AA-GG - Video N.mp4` + `... - baslik ve aciklama.txt` + `... - Skript.txt`, veya DEVAM'daki adlandırma.

## Drive — her kanalın kendi klasörü (kullanıcı kuralı, 2026-11-20)
- **Kök:** `G:\Drive'ım\money printer\` (Google Drive masaüstü; başka makinede `G:\My Drive\money printer\`). Kök yoksa kullanıcıya sor, uydurma yol açma.
- **Kanal klasörü:** `money printer\<KANAL ADI>\`. Yoksa ilk videoda **aç** (kanal adı DEVAM §0'daki ad; Windows'ta geçersiz karakterler `\ / : * ? " < > |` atılır). Yol DEVAM §1'e yazılır.
- **Video klasörü:** `money printer\<KANAL>\YYYY-AA-GG - Video NN - <Kısa başlık>\` içinde:
  - `<…>.mp4` (final)
  - `baslik-aciklama.txt`
  - `metin.txt` (BOM'lu UTF-8)
  - `kapaklar\` (6 kapak + sayfalar)
  - varsa `KAYNAKCA.tsv`
- Son ffmpeg çıktısı doğrudan bu klasöre yazılır (masaüstü kopyası yok). DEVAM'da eski bir teslim kuralı varsa bu kural geçerlidir; kullanıcı aksini söylemedikçe.
- **Doğrulama:** yerel dosya boyutu = Drive klasöründeki boyut (`G:` yolunda `os.path.getsize`). Senkron bitti mi diye Drive web'de klasör satırında **ad + boyut** görülür. Yükleme paneline güvenilmez.
- Yedek yol (masaüstü uygulaması yoksa): `py drive-yukle.py <dosyalar>` (sekmeyi öne getirir, "Yeni" menüsünü 5 kez dener, dosya penceresini yakalar, var olanı atlar).

## Temizlik — her videodan sonra diskte yer aç (kullanıcı kuralı)
Drive doğrulandıktan hemen sonra:
1. Önce deneme: `py scripts/video_temizle.py <videoNN klasörü> [rakip/kaynak klasörü] --drive "<Drive video klasörü>" --final --temp` (siler mi diye listeler, toplam GB yazar).
2. Listede kaynak dosya (metin, vo, seçilmiş görseller, istemler, kapaklar, raporlar) **olmadığını** gör. Sonra aynı komutu `--sil` ile çalıştır.
3. Silinenler yeniden üretilebilir dosyalardır:
   - ham render, parça render ve önizleme
   - kare/tmp/cache klasörleri
   - indirilmiş rakip videoları ve YouTube klipleri
   - Remotion `public\vNN` altındaki kopyalar
   - `%TEMP%` altındaki Remotion ve yt-dlp artıkları

   Final mp4 yalnız Drive'da aynı boyutta görülürse silinir.
4. Kullanıcıya tek satır: "X GB açıldı". Remotion render önbelleği ve `node_modules` silinmez (bir sonraki render'ı yavaşlatır).

## Kullanıcıya
- 60 sn önizleme (`qc.py --onizleme` → `onizleme.mp4`, 960 px, crf 26) SendUserFile ile; önizleme olduğunu söyle, tam dosyanın yerini ver.
- Kısa Türkçe özet: süre, LUFS, nereye kondu, dikkat edilecekler. İstenirse metnin tamamı düz yazı.

## DEVAM.md güncelle
Durum tablosuna satır (# | başlık | süre | klasör | teslim), `varyasyon.tsv`'ye satır, SIRADAKİ İŞ, yeni öğrenilen tuzak → Bilinen tuzaklar.
