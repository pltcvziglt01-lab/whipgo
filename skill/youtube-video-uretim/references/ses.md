# Ses (TTS), STT kontrol ve cümle zamanları

## Ses seçimi (yeni kanal)
- 2–4 aday sesi aynı kısa metinle (~20 sn) seslendir, rakibin aynı uzunluktaki ses parçasıyla birlikte gönder. Kullanıcı seçer.
- **SES HIZIYLA OYNANMAZ (kullanıcı kuralı, 2026-11-20):** ses servisin **orijinal hızında** (1.0 / varsayılan) üretilir. TTS'te hız parametresi verilmez, ffmpeg'de `atempo`/`rubberband` kullanılmaz. Video rakipten birkaç dakika uzun ya da kısa olabilir; bu normal.
- Süre hedefe uzaksa **metin** değiştirilir (bölüm ekle/çıkar), hız değil. Rakibin kelime/dk ölçümü yalnız metin uzunluğunu kestirmek içindir.
- Ses seçimi rakibin tınısına (F0, sıcaklık, yaş) göre yapılır. Seçilen ses DEVAM §2'de **kilitli karar** olur (hız alanı: "orijinal").

## Geçmiş kanallarda kullanılan sesler
Hız sütunu arşiv içindir. **Yeni üretimde hız her zaman orijinal (1.0)**; kullanıcı bu sohbette açıkça başka hız istemedikçe.

| Kanal | Servis / ses | Eski hız |
|---|---|---|
| Hund | ai33 `elevenlabs_FHUR0i1dH4dqNNOZj5D0` (Mirko Ziegert) | 1.10 |
| Sağlık | ai33 George | 1.00 |
| Akiya | ai33 Minimax "Dominant Man"; alternatif edge-tts `ja-JP-KeitaNeural` | Japoncada +0~8% (+15% aceleci) |
| Silah EN/ES | ai33 Brian 0.92 / Jaime 1.03 | |
| Cozy reels | edge-tts `en-US-AvaNeural` | |

## Üretim (`ses.py`)
- metin.txt'i `#` bölümlerine böl, her bölümü ayrı seslendir (ai33 REST: iş aç → durum sorgula → indir; 429/5xx'te tekrar). Aralara 0,5/0,8 sn sessizlik, birleştir → `vo.mp3` + `bolumler.json`.
- `AUSSPRACHE` (telaffuz) sözlüğü yalnız TTS'e giden yazımı değiştirir (Cavalier→Kawalier, Kuvasz→Kuwas, Groenendael→Gruhnendahl). Altyazı orijinal yazımla kalır.
- Önbellek: var olan bölüm yeniden üretilmez → değişen bölümün mp3/wav'ını sil, yalnız onu yeniden üret.
- Hesap birden fazla oturumda paylaşılıyorsa her bölümde ses kimliğini ve hızın 1.0 olduğunu doğrula (yanlış ses / eski metinden üretim yaşandı).

## STT kontrol (`kontrol.py`)
- Her bölüm faster-whisper ile yazıya dökülür, metinle karşılaştırılır. Yalnız rakam/yazım farkı kabul; kelime eksik/fazla ise o bölümü sil ve yeniden üret.
- GPU doluysa `MemoryError` → kalan bölümleri ayrı çalıştır (`kontrol.py 11 12 13`) veya CPU int8.
- Japonca/terim okumaları (万円, il adları, 築年, 旧耐震) STT'nin yakalamadığı yanlış okumalar olabilir → kritik terimleri dinleyerek kontrol et, gerekirse kana ile yaz.

## Zamanlama (`zamanla.py`) → `cumleler.json`
- **Bölüm bölüm** whisper (uzun dosyada halüsinasyon olur), kelime zamanları; metindeki cümlelerle difflib hizalaması.
- Kelime kelime altyazı ya da vurgu senkronu gerekiyorsa ve whisper'ın kelime zamanları kayıyorsa **WhisperX** (zorlamalı hizalama) kullanılır: `whisperx bolum.mp3 --language <dil> --output_format json`. Kurulum ve lisans: `arac-yigini.md`.
- Her kayıt: cümle no, metin, `t` (başlangıç), bitiş, kelime kelime zamanlar. Kurgu (PLAN), altyazı, bölüm zamanları hep buradan.
- Süre hedefin altındaysa (ör. ≤10 dk istenmiyorsa) bölümlere 1–2 kaynaklı cümle ekle, yalnız değişen bölümleri yeniden seslendir.

## Sunucu için
HeyGen'e mono düşük bitrate kopya: `ffmpeg -i vo.mp3 -ac 1 -b:a 96k <kanal>_vNN_hg.mp3`.
