# Bilinen tuzaklar (ana liste)

Akiya/Remotion/ffmpeg'e özgü ek tuzaklar: `dersler-akiya-medical.md` son bölüm. Yeni tuzak öğrenince kanalın DEVAM.md'sine yaz.

| Belirti | Neden | Çözüm |
|---|---|---|
| `sayfa bulunamadi: <site>` | sekme kapalı | `curl -X PUT "localhost:<PORT>/json/new?<url>"`, 10–15 sn bekle |
| CDP `Runtime.enable` zaman aşımı | arka plan sekmesi donmuş | `sekme.baglan()` kapatıp yeniden açar |
| Playwright 180 sn asılı | worker/iframe hedeflerine bağlanıyor | ham CDP `cdp.py` |
| CDP 403 | origin | `suppress_origin=True` |
| `TypeError: … NoneType` tıklamada | öğe henüz yok | 1 sn arayla 10–15 deneme, sonra ekran görüntüsü |
| Menü açılmıyor (Drive "Yeni", Flow paneli) | gizli sekme | `Page.bringToFront` + 5 deneme |
| Windows dosya penceresi açılıp kilitlendi | gerçek dosya seçici | `setInterceptFileChooserDialog` + `DOM.setFileInputFiles` |
| HeyGen "Uploading audio"da takılı | pencere gizli/küçük | Chrome'u arka plan bayraklarıyla başlat |
| HeyGen avatar kartları boş | gizli pencere | stüdyoyu doğrudan URL ile aç |
| HeyGen yanlış avatar | son kullanılan geliyor | panelden avatar+görünüm seç, `gonder.py … yerinde` |
| HeyGen Avatar IV'e dönmüş | varsayılan değişiyor | gonder.py III yapar; yapamazsa GÖNDERMEZ |
| Yanlış HeyGen videosu indi | hesapta başka projeler | `bul-indir.py` başlığa göre |
| Flow "Nano Banana 2 / x1" | yenilemede ayar dönüyor | `flow/ayarla.py` |
| `karakter bulunamadi` | + penceresi Karakterler filtresi boş | sol menü Karakterler → kart ⋮ → İsteme ekle → Tüm medya |
| Görsel sonraki istemin adıyla kaydedildi | geç gelen çıktı | ızgara boşalmadan gönderme; şüphede yeniden üret |
| Adlar kaydı | aynı anda iki uret.py | asla iki üretici aynı anda |
| Flow sekmesi dondu | HeyGen indirme döngüsü sekme açtı | önce Flow'u bitir |
| Flow "Kullanım sınırınıza ulaştınız" | Pro modelin ayrı sınırı | dur, sor; kredi alma |
| Flow hata kartları | eski hatalar ızgarada kalır | hata ancak sayı ARTARSA yeni |
| ai33 binlerce kredi yaktı | arayüzü koordinatla sürmek | REST API (`ai33.py`) |
| ai33 yanlış ses / eski metin | paylaşılan hesap | her bölümde ses kimliği + STT doğrulama |
| TTS rakamı/adı yanlış okuyor | yazım | sayıyı yazıyla, AUSSPRACHE sözlüğü, Japoncada kana |
| Whisper saçmalıyor | uzun dosyada halüsinasyon | bölüm bölüm çöz |
| Whisper `MemoryError` | GPU dolu | bölümleri ayrı / CPU int8 |
| Render yanlış klasöre | bitir.sh'de eski yol | kopyalarken TÜM vMM yollarını değiştir |
| Remotion "waiting for frame … timeout" | yük | `--timeout=120000`, concurrency 4 veya altı |
| Render sessizce düştü | çıktı `| tail`'e borulanmış | log dosyasına yaz |
| Arka plan görevi öldürüldü | harness zaman sınırı | `Start-Process` bağımsız süreç |
| Açılışta sunucunun yüzü kapandı | `H(0)` + `R(0)` aynı cümlede | R(0)'ı sil |
| Video Windows'ta açılmıyor | `yuvj420p` | tv/bt709 dönüşümü |
| Not Defteri'nde bozuk Türkçe/Japonca | BOM yok | UTF-8 BOM'lu yaz |
| `ses.py` ilk bölümü (`# 0 KANCA`) seslendirmiyor, vo.mp3 bir bölüm eksik | metin.txt PowerShell 5.1 `Set-Content -Encoding utf8` ile yazılınca başına BOM eklenir; `utf-8` ile okununca ilk satır `#` ile başlamaz | metin.txt'yi `utf-8-sig` ile oku (ses.py), PowerShell'de metin dosyası yazma; bölüm sayısını `bolumler.json`'da doğrula. Atlanan bölüm sonradan eklenirse `ses/NN.mp3` önbelleği kaydırılır, yeniden üretilmez |
| Render `EPERM: operation not permitted, symlink '...\yt-uretim\fontlar' -> '...remotion-webpack-bundle...\public\fontlar'` | `public/fontlar` ya da `public/varlik` junction; Remotion bundle public/'i kopyalarken junction'ı symlink yapmaya çalışır, geliştirici modu yoksa izin yok | public/ altında junction olmaz: `varlik_kur.py kanal <motion>` hard link kurar (junction'ı kaldırır). `kurulum.py kanal` artık bunu çağırır; `src/repertuar` junction kalır |
| Uzun render ortasında `Error: Page crashed!` (BrowserPage onTargetCrashed), çıktı yok | Bellek: yüksek `--concurrency` (6) + büyük OffthreadVideo önbelleği + başka oturumun render'ı aynı anda | `--concurrency=4 --offthreadvideo-cache-size-in-bytes=2000000000`; videoyu 8 parçaya böl (`--frames=B-S`), çöken parçayı concurrency 2 ile yeniden dene, sonra `ffmpeg -f concat -c copy`. Betik iz bırakmadan sonlanırsa (süreç dışarıdan kapandı) yeniden çalıştır: dolu `parcaN.mp4` atlanır, yarım parça yazılmaz |
| Elle düzeltilmiş `sfx.json` ile `ses_miks.py --sfx sfx.json` → `FileNotFoundError: [WinError 206] Dosya adı veya uzantısı çok uzun`, final yeniden yazılmaz (kapı eski dosyayı ölçer) | Her SFX ayrı ffmpeg girdisi; 200+ ses Windows komut satırı sınırını aşar | `ses_miks.py` artık 40'tan fazla sesli json'u önce `sfx_plan.miks_numpy` ile stem'e çevirir. SFX seviye FAIL'i düzeltirken: `sfx.json`'da `db`'yi değiştir → `ses_miks --sfx sfx.json` → kapıyı yeniden çalıştır; final dosyasının saatine bak |
| Fransızca videoda `kalite_kapisi` "cümlelerin %5'i konuşmada yok" FAIL; listede hep sayılı cümleler (`deux mille six`, `quatre mille`) | Sayı eşitleme yalnız en/de biliyordu: metin yazıyla, Whisper rakamla (`2006`, `4 000`) | `sayilari_esitle` artık fr: `mille/cent` tek başına, `quatre-vingt(s)`, `soixante-dix`, `vingt et un`, `4 000` boşluklu binlik. Başka dilde aynı FAIL'de önce listedeki cümlelerde sayı var mı bak |
| Final `tepe -0.8 dBTP (> -1)` FAIL, loudnorm TP -1.5 olduğu halde | AAC kodlaması tepeyi ~0,7 dB taşırır | `ses_miks` ölçülen tepe > -1 ise TP -2,2 / -3,0 ile kendiliğinden yeniden kodlar |
| İki oturum aynı ChatGPT CDP portunu (9334) aynı anda sürünce kapak istemi diğer oturumun sohbetine düşüyor; indirilen görsel o sohbetten geliyor; bir sekme `WebSocketTimeoutException` ile tüm çalıştırmayı düşürüyor | Paylaşılan otomasyon Chrome'u; port başına kilit yoktu, tek sekme hatası yakalanmıyordu | `chatgpt_kapak.py` port kilidi (ikinci çalıştırma ilki bitene kadar bekler; süreç kapanınca kilit kalkar) + sekme hatası `HATA` kaydı olur, gönderilmişler yine toplanır. İndirince `sonuc.json` sekme kimliğini `/json` URL'siyle eşle: başka oturumun sohbetiyse ona dokunma |
| Teslimden sonra `adim_kontrol` `render: kanit diskte yok (v01-ham.mp4)` FAIL | `video_temizle --sil` ham render'ı siler; render fazı ham'ı kanıt göstermişse kayıt geçersizleşir | Render fazını `--kanit v01-final.mp4 tam-render.log` ile kaydet (final temizlikte kalır) |
| `youtube_kaynak.py indir -WYNNzMsLiY ...` → `error: argument ... expected` / usage çıktısı, klip inmez | YouTube kimliği `-` ile başlayabilir; argparse onu seçenek sanar | Seçenekleri önce, kimliği `--` ayırıcısından sonra ver: `indir --bas 0 --son 60 --klasor K -- -WYNNzMsLiY` (toplu indirme betiklerinde de) |
| Kurguda yanlış klip (sırtlan yerine suaygırı), kaynakça satırı yanlış videoyu gösteriyor | Kaynak/tag adları yalnız harf büyüklüğüyle ayrılıyor (`H1` / `h1`): Windows dosya adında büyük/küçük ayırmaz, ikinci kesim 'var' sanılıp atlanır | Tag/dosya adlarını hep küçük harf ve tekil yaz (ör. `xh1`, `sirtlan1`); kesim betiği adlar arasında `lower()` çakışması varsa durmalı |
| Flow'da indirilen görsel başka istemin (önceki satırın) görseli | İstem kutusu gönderimden sonra metni tutar; ya da yeni satırın görselleri yüklenmeden aramada satırın dışına taşılır | Satırı `flow-expandable-prompt` öğesinden bul, görselleri yalnız `closest('flow-batch-info').parentElement` içinden al; kontakt sayfasında ad–içerik eşleşmesini her turda gözle kontrol et |
| Drive "tamam" ama dosya yok | yükleme paneli yanıltıcı | klasör satırında ad + boyut |
| Heredoc ile yazılan betikte regex bozuk | bash `\b`, `\n`, Windows yolları | Write/Edit kullan |
| Kartta/kapakta eski videonun il/ırk adı | şablon kopyası | QC'de konu adını ayrıca kontrol et |
| Kontakt sayfası yanlış videodan | yol/kare aralığı | kaynağı ve aralığı doğrula |
| Analitik MCP kotası doldu | ücretsiz plan | yt-dlp `extract_flat` |
| "x264 malloc failed" | RAM | ağır işleri sıraya koy |
| Türkçe karakterli yol hatası | bash kodlaması | PowerShell / tırnaklı yol |
| yt-dlp "Sign in to confirm" / 403 | YouTube bot kontrolü, eski sürüm | `py -m pip install -U yt-dlp`; olmazsa `--cookies-from-browser chrome` (kullanıcı onayıyla) veya Nexlev ile listele |
| Kanal listesinde izlenme yok | flat liste alanı boş | `--videolar` ile URL ver |
| kare_analiz fazla kesim buluyor | çok hızlı hareketli sahne | sayfayla doğrula, analiz.json'da birleştir |
| Kaynak tahmini hep GRS/hep VID | iç hareket eşiği | bilinen videoyla kalibre et, `--ic-esik` |
| Rakip videoları diskte kaldı | temizlik atlandı | `temizle.py` (son kontrol listesinde) |
| ChatGPT sekmesinde giriş ekranı | otomasyon profili oturumu yok | kullanıcı giriş yapar; şifre girme |
| ChatGPT görseli reddetti | gerçek kişi / politika | yüzsüz kompozisyon veya izinli referans; yalnız o istemi tekrar |
| ChatGPT limit mesajı | plan görsel limiti | dur, kullanıcıya süre/limit bilgisini ilet |
| Kapakta harf hatası / fazladan yazı | modelin yazı üretimi | aynı sekmede "only fix the text: …" revizyonu |
| Kapak 3:2 geldi | ChatGPT 1536x1024 üretiyor | `kapak_bitir.py` 16:9 kırpar; önemli öğeyi istemde merkezde tut |

## Edit dili analizi / kütüphane (2026-11-17)
| Belirti | Neden | Çözüm |
|---|---|---|
| Kısmi indirme (`--download-sections`) video başına ~4 dk | ffmpeg HTTP'den sırayla okuyor | tam 720p indir (~20 sn), sonra `ffmpeg -t … -c copy` ile kes (`rakip_indir.py --yuzde` böyle yapıyor) |
| Tüm indirmeler "Sign in to confirm you're not a bot", güncel yt-dlp de | IP işaretlendi | `cerez_al.py --port 9334` (girişli otomasyon Chrome'u, CDP) → `rakip_indir.py --cerez`; `kanal_isle.py --cerez-port 9334` indirmeleri tek tek yapar. Ana Chrome profili bağlanamaz |
| Çerezle yalnız storyboard formatı geliyor | JS çalışma ortamı yok (deno yok) | `--js-runtimes node` (rakip_indir.py otomatik ekler) |
| Kanal ölçümü 30 dk → 105 dk | çerezle AV1 iniyor; OpenCV AV1'i ~9 kare/sn çözüyor (H.264: ~190) | format `vcodec^=avc1` tercih + H.264 değilse ffmpeg ile çevir (rakip_indir.py yapıyor) |
| Gerçek videoda bol itme/örtü/wipe ve çözünme | el kamerası / kadraja giren nesne kaydırma modeline 0,2–0,55 artıkla "uyuyor" | kaydırma: sınır karelerde ilerlemeli (aralık ≥0,4, artık ≤0,25); artık >0,35: tek kare sıçraması = sert kesim, aynı sahne = geçiş değil, kalan "belirsiz" ('?' ile sayılır). Nadir etiketleri kare kare gözle kontrol et |
| Toplu liste okunamıyor (UnicodeDecodeError) | WhatsApp/Notepad listesi Windows-1254 | kanal_isle.py utf-8 → cp1254 dener |
| OCR video başına dakikalar | RapidOCR açı sınıflandırıcısı | `params={'Global.use_cls': False}` + değişmeyen kareyi atla |
| Yavaş Ken Burns "sabit" ölçülüyor | ardışık karede hareket piksel altı kalıyor | ORB+RANSAC, 640 px, 0,5–1 sn taban, eğim medyanı |
| Çözünme + ardından pan tek uzun koşu olup atlanıyor | eşik üstü hareket koşuyu uzatıyor | uzun koşu içinde tabana göre patlama ara; tekrarlanan kareleri (24→30 fps) komşuyla doldur, köprü kuralı yok |
| Ürün fotoğrafı "çerçeveli bulanık" sanılıyor | alan derinliği bulanıklığı | sınır keskin basamak (≥3 kat, 4 px) + her yan ayrı ayrı sade olmalı |
| Fayans/pencere çizgisi "bölünmüş ekran" | tekrarlı düz çizgiler | çizgi benzersizliği (diğer çizgilerin 2 katı) şartı |
| xfade zinciri ilk geçişten sonra kesiliyor | girişlerin zaman tabanı farklı | her girişe `settb=AVTB,setpts=PTS-STARTPTS,fps=30` |
| drawtext font yolu hatası | yolda `'` (Drive'ım) | fontu çalışma klasörüne kopyala, göreli yol ver |
| Test "çerçeveli" diyor ama klip tam ekran | kaynak karenin kendisi inset | test kaynak karelerini kenar ayrıntısına göre eler |
| Yeni kanalın kurgusu öncekilerle aynı görünüyor (koyu lacivert + kırmızı, aşağıdan belirme, gren+vinyet) | kanal başına `Parcalar.tsx` yazıldı, model varsayılan stiline düştü | yalnız `repertuar/` + `stil-dna.json`; `STIL-DNA.md` klasik skor 0 olmalı (`repertuar.md`) |
| `kutuphane_ara.py` "0 kanal" diyor | eski sürüm kütüphaneyi betiğin klasöründe arıyordu | güncel sürüm `EDIT_KUTUPHANE` / Drive yollarını dener; repodan `git pull` |
| `kanal_isle` "HATA video ölçülemedi", log'da altyazı 429 | altyazı ve video aynı yt-dlp çağrısındaydı, çeviri altyazısı 429 aldı | güncel `rakip_indir.py` altyazıyı ayrı ister, varsayılan `--altyazi orig,en` |
| Kelime/dk ~2 kat (330+) | otomatik altyazının etiketsiz tekrar blokları sayılıyordu | güncel `kare_analiz.py` etiketli dosyada etiketsiz blokları atlar |
| Paket arka planıyla render çok yavaş | 4K60 orijinal kullanıldı | Remotion yalnız `varlik/arkaplan/ab-NN.mp4` (1080p30) kullanır; orijinal arşivde |
| Filmburn geçişi yanlış anda parlıyor | tepe anı katalogda yok/yanlış | `varlik_kur.py katalog --yeniden`; geçiş kodu `filmburn:fb-NN:<tepe_sn>` |
| İki kanal aynı edit şablonunu kullanıyor (aynı kâğıt alıntı, halka sayı, film şeridi çerçeve) | kart havuzları küçüktü (2–4 seçenek) ve stil_dna diğer kanalları bilmiyordu; bir oturum da çerçeveyi elle başka kanaldakiyle aynı yaptı | kart havuzları büyütüldü (sayı 6, alıntı 5, liste 4, zaman 4); stil_dna `C:\otomasyon\*` altındaki seçilmiş `stil-dna.json`'ları okur ve kaçınır (§Diğer kanallarla ≤2 aynı); `stil-dna.json` her zaman yazılır; elle değişiklikte diğer kanallara bak |
| Her videoda "kâğıt" görünümü | kâğıt zemin + kâğıt doku + daktilo alıntı birlikte seçildi | DNA'da en fazla 1 kâğıt öğesi (stil_dna puanı); kâğıt kartların tonu artık palete bağlı |
| Yazılar çok ince (kalın font istense de) | `FontYukle` değişken fontları kalınlık aralığı vermeden yüklüyordu → hep varsayılan kesim (LeagueSpartan/Montserrat 100, Rubik/Teko/SpaceGrotesk 300); gövde yazılarında fontWeight yoktu | `FONT_AGIRLIK` tablosu FontFace'e yazılır; her font setinde `govdeAgirlik`/`monoAgirlik` (600+), modern setlerde mono = RobotoCondensed. Yeni font eklenirse tabloya kalınlık aralığını yaz |
| Videolarda hiç ses efekti yok | kurgu şablonunda SFX katmanı yoktu, katalog yalnız belgedeydi | ortak `VideoDna` + `DnaSfx` (otomatik, tepe senkronlu); SFX'siz teslim yok |
| Kamera hareketleri birbirini tekrar ediyor | `DnaMedya` kamerayı `sira % 3` ile seçiyordu (A-B-C-A-B-C) | `kameraSec`: art arda aynı yok, hız 0,75–1,3; `kurgu_denetim.py --analiz` döngüyü ölçer |
| Ekran yazısı okunmadan kayboluyor / sesten kopuk | çekim süreleri yalnız sese göre kesildi, yazının okuma süresi bakılmadı | render öncesi `kurgu_denetim.py --plan … --duzelt` |
| Paket videosunda yazı okunmuyor | video parlaklığı paletle çakışıyor | stil_dna palete uygun sınıfı (açık/orta/koyu) seçer; elle seçimde `katalog.json` `sinif` alanına bak |
