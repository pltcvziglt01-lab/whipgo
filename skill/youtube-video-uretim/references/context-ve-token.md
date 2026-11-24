# Context devri ve token tasarrufu

Orijinaller: `kaynak/CONTEXT-DEVIR-KURALI.txt`, `kaynak/TOKEN-TASARRUF-KURALI.txt`.

## Ölçüm
Her büyük adımdan sonra (bir parti/render/test/QC bitince):
`ToolSearch "select:mcp__ccd_session_mgmt__get_usage"` → `get_usage(session_id: "self")`. Araç yoksa adımları ve okunan büyük dosyaları kendin say, temkinli davran.
Haftalık limit %80'i geçerse kullanıcıya tek satır haber ver.

## Devir eşiği: %45
Context %45'i geçtiyse YENİ ADIMA BAŞLAMA:
1. DEVAM.md DURUM + SIRADAKİ İŞ'i güncelle: tam nerede kalındı (dosya, satır, parti/test no), biten işler ve değişen dosyalar, açık sorunlar/şüpheler, arka planda süren işler ve çıktılarının düşeceği yer, kullanıcıdan beklenen onay.
2. Arka planda uzun iş varsa: bitmesini bekle veya DEVAM'a "şu iş sürüyor, çıktısı şu dosyaya, kontrolünü yeni oturum yapacak" yaz.
3. Yeni oturum: `ToolSearch "select:mcp__ccd_session__start_session"` → `start_session(initiation:"user_asked", context:"fresh", cwd:<proje>, use_worktree:false, prompt:"DEVAM.md'yi baştan sona oku, SIRADAKİ İŞ'ten devam et. youtube-video-uretim skill'ini kullan.", background:<≥80 karakter: amaç, kararlar, bu parçanın yeri>)`. Araç yoksa kullanıcıya yeni oturuma yapıştırılacak tek satırlık devir mesajını ver.
4. Kullanıcıya tek satır: yeni oturumun bağlantısı + kaldığı yer. Sonra DUR.

Neden %45: geçmiş büyüdükçe her adım pahalanır; yarıya gelmeden devretmek toplam tokenı belirgin düşürür ve %97'deki otomatik özetlemeye (ayrıntı kaybı) hiç varılmaz.

## Kim ne yapar
| İşi yapan | İş |
|---|---|
| Ana model | metin, kurgu/klip kararları, grafik kararları, son kalite kararı, zor hata ayıklama, kullanıcıyla konuşma |
| Sonnet alt ajan | kontakt sayfası inceleme (bulgu listesi), kaynak/altyazı özeti, net tarif edilmiş kod değişikliği, QC bulgu raporu |
| Haiku alt ajan | kopyala/listele, indirme başlat, ölçüm komutu çalıştırıp sayı raporla, Drive'da ad+boyut doğrula, log oku, DEVAM'a verilen satırı yaz |
| Betik | tekrarlanan her adım — betik varsa ajan açma |

Alt ajan yalnız şunlarda: çok dosya/görsel okunacak, uzun log taranacak, iş birkaç adım sürecek. Brief kısa ve eksiksiz (yol, komut, beklenen çıktı); ajan ≤10 satır rapor döner. Her ajana kendi dosyaları; ortak dosyaya ajan dokunmaz; aynı dosyaya iki yazar aynı anda yok. Onaylı iş için referans çıktılar saklanır, ortak dosya değişirse onlarla karşılaştırılır. Ajan raporu kanıt değil — kritik sonucu (boyut, LUFS) ana model tek komutla doğrular.

## Her adımda
- Büyük dosyayı baştan okuma: Grep veya Read offset/limit. Kendi yazdığın dosyayı tekrar okuma. Üretilmiş JSON/veri dosyalarını ana oturumda açma.
- Komut çıktısı: yalnız son satırlar/sonuç (`| tail -5`, sessiz/`--log=error` bayrakları) — **render çıktısı hariç**, o log dosyasına yazılır.
- Görsel: tek kontakt sayfası (≤2000 px) çok sayıda tek görselden ucuz; aynı görseli iki kez okuma; tam çözünürlük gerekmedikçe yok.
- Kod/betik heredoc değil Write ile.
- Aynı bilgiyi tekrar aramak yerine DEVAM'a yaz, oradan oku.
- Kısa aralıkla uyanma: uzun işleri tek zincir betikte birleştir, tek bildirimle bitsin.
- Düşünmeyi kısa tut, verilmiş kararı yeniden tartma. Kullanıcıya kısa yaz.
