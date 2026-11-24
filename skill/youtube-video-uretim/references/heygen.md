# HeyGen sunucu videosu

## Kurallar
- **Yalnız Avatar III** (abonelikte). Avatar IV kredi harcar → ekranda "Avatar IV" veya "kredi/krediler" geçiyorsa GÖNDERME, dur, kullanıcıya söyle.
- Ses klonlama yok; hazır `*_hg.mp3` yüklenir; "Ses Yansıtma" (voice mirroring) KAPALI olmalı, açıksa dur.
- Avatar ve görünüm adı DEVAM §2'de (ör. HUND-SUNUCU-v1).

## Gönderim (`heygen/gonder.py <mp3 mutlak yol> <başlık> [yerinde]`)
1. Stüdyo `https://app.heygen.com/create-v4/draft?vt=l&avatarGroup=<ID>` ile açılır, AMA son kullanılan avatar gelebilir (parametre artık seçmiyor). Önce sağ panel "Avatar ve Ses" satırında doğru avatar+görünüm var mı bak; değilse Avatar satırı → ⇄ → Avatarlarım → avatar → görünüm kartı → ← geri; sonra `gonder.py … yerinde`.
2. "Sesi yükle" + avatar adı görünene kadar bekle → "Sesi yükle" → `input[type=file][accept*=audio]`'a mp3.
3. "Sesi onayla" bekle; Ses Yansıtma açıksa DUR → "Add audio" → "Yazıya dökülüyor" kaybolana kadar bekle.
4. Sağ panel **Hareket Motoru** = "Avatar III" değilse açılır listeden seç; yapamazsa DUR.
5. "Oluştur" → "Avatar III'e geç" çıkarsa ona bas → başlık kutusuna Ctrl+A + `<kanal>-vNN-tam`.
6. Sayfada "Avatar IV motorunu" veya "krediler" geçiyorsa GÖNDERME → değilse "Gönder". Ekran görüntüsüyle doğrula.

## Bekleme ve indirme
- 10–11 dk video ~40–60 dk. Flow üretimi bitmeden indirme döngüsü başlatma.
- `py heygen/durum.py <başlık>` → HAZIR/BEKLIYOR/YOK. HAZIR → `py heygen/bul-indir.py <başlık> <hedef.mp4>` (hesapta başka projeler var; kart tıklanır, başlığı geçen videonun `<video>` kaynağı indirilir). Ya da `bekle-indir.py` döngüsü.
- `ffmpeg -i <..>-tam.mp4 -an -c:v copy motion/public/vNN/host.mp4`. **Süresi vo.mp3 ile aynı olmalı.**

## Kıyafet döngüsü (tekrar eden içerik riskine karşı)
Yüz/sakal/kasket/karakter birebir aynı; üst giysi 2–3 videoda bir minimal değişir: Flow'da aynı kadrajda karakter ekli "NEW OUTFIT ONLY: …" görseli → HeyGen avatar → "Görünüm ekle → Yükle" (kredi uyarısında DUR) → `istemler.py` KAR metni + kapak istemindeki kıyafet güncellenir → DEVAM'daki kıyafet tablosuna yaz.

## Kurguda sunucu
- Açılış ilk sahne sunucu ve üstünde hiçbir şey yok: `H(0)` ile aynı cümlede `R(0,…)` olmaz.
- İlk 30 sn'de H yalnız açılışta; 0:20–0:45 arası tam ekran sunucu yok.
- Sunucu en geç ~80–90 sn'de bir görünür; ekranda kaldığı cümleler videodan videoya farklı yerlere düşer.
- Karakterli Flow sahnelerinde (`S(n,…)`) facecam gizlenir.
