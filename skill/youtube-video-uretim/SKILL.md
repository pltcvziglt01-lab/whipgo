---
name: "youtube-video-uretim"
description: Claude Code ile uçtan uca YouTube video üretim sistemi — rakibin en popüler 3 videosunu indirip ritim (0,1 sn) ve kare kare edit dili analizi; Drive edit dili kütüphanesiyle özgünleştirme (iskelet korunur, yüzey değişir); rakip kanalları günlük takip; demonetizasyon/küme risk denetimi; YouTube'dan lisanslı (CC BY) gerçek video ve görsel kaynağı; başlık, kaynaklı metin, TTS (orijinal hız), WhisperX, HeyGen Avatar III, Flow, Remotion/ffmpeg kurgu, ses miksi, render sonrası kalite kapıları (kanca, durgunluk, senkron, ekran yazısı, rakiple karşılaştırma, jüri), −14 LUFS, 6 kapak, Drive money printer kanal klasörüne teslim, disk temizliği, kanal analitiği, DEVAM.md devri. Kullanıcı video yapmak, kanal açmak, rakip analizi/takibi, edit stili, demonetize riski, metin/ses/görsel/kurgu/kapak/başlık işi istediğinde ya da DEVAM.md, Remotion, HeyGen, Flow, CDP, LUFS geçtiğinde MUTLAKA kullan.
---

# YouTube Video Üretim Sistemi

Bu skill, Windows makinede Claude Code ile çalışan, birden fazla kanalda kanıtlanmış video üretim hattının tamamıdır. İş akışı, kurallar ve araçlar burada; her kanalın **güncel durumu** ise o kanalın `DEVAM.md` dosyasındadır. İkisi çelişirse kanalın DEVAM.md'si kazanır (daha yeni ve kanala özel), ama Bölüm 1'deki dokunulmaz kurallar hiçbir dosyayla gevşemez.

## 0. İşe başlarken (her oturumda, sırayla)

0. **Repoyu güncelle:** `git -C C:\otomasyon\yt-uretim pull` (araçlar, repertuar, varlık kataloğu buradan; yoksa `KURULUM.md`). Betikler `C:\otomasyon\yt-uretim\skill\youtube-video-uretim\scripts\` yolundan çalıştırılır (skill paketindeki kopya yalnız yedek).
1. **DEVAM.md'yi bul ve oku.** Kanal klasöründe (`Documents\<KANAL>\DEVAM.md` veya proje kökü). Yoksa yeni kanaldır → `references/devam-sablonu.md` ile oluştur. DEVAM'da cevabı yazılı olan hiçbir şeyi kullanıcıya tekrar sorma.
2. **Hangi işi yapacağını belirle:** DEVAM §SIRADAKİ İŞ'ten devam mı, yeni video mu, yeni kanal mı, tek bir parça mı (sadece başlık / sadece kapak / sadece metin)? Tek parça istendiyse yalnız o fazın referansını oku.
3. **Görev listesi kur** (TaskCreate): aşağıdaki fazlardan bu işe girenler + en sonda "QC ve doğrulama".
4. **Context bütçesi:** büyük adımlardan sonra kullanımı ölç; %45'i geçince yeni adıma başlama, devret (`references/context-ve-token.md`).

## 0a. Kullanıcı yalnızca kanal linki verdiğinde (yeni sohbet, hazır kanal yok)
Skill hiçbir kanala bağlı değildir. Kanal adları, rakipler ve takip listesi sohbette verilen linklerden kurulur. Dosyalardaki Hund ve Akiya yalnız örnektir, onların kuralları başka kanala taşınmaz.
1. **Linkin kime ait olduğunu anla.** Kullanıcı "benim kanalım" mı diyor, "rakip" mi? Belli değilse tek soru sor (iki seçenek).
2. **Kendi kanalı ise:**
   - DEVAM.md'yi `references/devam-sablonu.md` ile kur.
   - `kanal_risk.py <link>` ile risk denetimi yap (`demonetizasyon-riski.md`).
   - Kanalın en çok izlenen 3 videosunu ölç (`kanal_isle.py <link> --adet 3`).
   - Bulguları kısa özetle; rakip linki ve hedef iste.
3. **Rakip ise:**
   - Faz 1 rakip analizi (§3) yap.
   - Linki `RAKIP-TAKIP/takip.txt`'ye ekle; zamanlamayı kurmayı **sor** (`rakip-takip.md`).
4. **Ortam kontrolü:** betikler yerel Python, ffmpeg, yt-dlp ve Drive senkron klasörü ister (Claude Code / masaüstü).
   - Bunlar yoksa (ör. claude.ai sohbetinde, yerel dosya erişimi olmadan), bunu ilk mesajda tek satırla söyle.
   - Yapılabilenleri yap: link üzerinden araştırma, başlık ve metin, kütüphaneyi Drive bağlantısından okumak.
   - Ölçüm ve takibi Claude Code oturumuna bırak. Sayı uydurma.

## 1. Dokunulmaz kurallar (hiçbir kanal dosyası bunları gevşetmez)

- **Şifre, kart, API anahtarı girme; satın alma, kredi yükleme, hesap ayarı değiştirme, kalıcı silme yok.** Oturum kapandıysa dur, "şu sekmede giriş yap" de, bekle.
- **HeyGen'de yalnız Avatar III.** "Avatar IV" veya "kredi" uyarısı görünürse GÖNDERME, dur. Ses klonlama yok; "Ses Yansıtma" kapalı.
- **Kaynaksız sayı/iddia yok, uydurma anı/unvan yok** (sunucu doktor/veteriner/uzman değilse öyle konuşmaz). Kanalda olmayan videoya "kanalda var" denmez.
- **Kontrol etmediğin şeye "tamam" deme.** Ekran görüntüsüne, dosya boyutuna, LUFS'a, süreye kendin bak. Ajan raporu kanıt değildir.
- **Her video ölçülebilir en az %20 farklı (demonetizasyon / "AI slop" koruması):** rakip analizinden sonra yüzey (edit dili) rakipten ve kanalın son 3 videosundan ayrı ayrı en az %20 değişir — `stil_dna.py` kontrol satırı `TAMAM` olmadan kurguya geçilmez. Metin %100 özgün, kalıp cümleler `kalip_kontrol.py` temiz, `ozgunluk.md` §AI slop listesindeki işaretlerin hiçbiri yok.
- **Edit dili konuya uyar:** ton anlatılan olaydan belirlenir (`stil_dna.py --konu "<başlık + olay>"`; savaş/tarih/ekonomi = ciddi, suç/gizem/korku = gizem, teknoloji/spor/liste = enerjik, sağlık/yaşam/seyahat = sakin). Askeri ya da trajik bir konuda neşeli edit (çizgi roman zemini, zıplayan/esnek hareket, pastel, bokeh) kullanılmaz. Seçim kütüphanede aynı tondaki kanalların ölçülmüş edit diliyle ağırlıklandırılır (STIL-DNA.md §Konu ve ton).
- **After Effects görünümü:** her video `DnaBitis` ile sarılır (DNA'nın `bitis` ekseni: grade + kamera nefesi + ışık + gren). Bitişsiz ham Remotion çıktısı teslim edilmez.
- **Seçim etiketle:** her repertuar öğesi `repertuar/etiketler.json`'da ton/konu/enerji/his etiketli; stil_dna konuyu (`--konu`) puanlar, tona uymayanı eler, konuya ve rakip ritmine uyanı öne çıkarır. Yeni teknik etiketsiz eklenmez (`repertuar.md` §3b).
- **Kanallar birbirine benzemez:** `stil_dna.py` `C:\otomasyon\*` altındaki tüm kanalların seçilmiş `stil-dna.json`'larını okur; başka bir kanalın son DNA'sıyla en fazla 2 görünür eksen (palet, zemin, çerçeve, başlık, altyazı, alt bant, sayı/alıntı/liste/zaman kartı) aynı olabilir, bir DNA'da en fazla 1 kâğıt öğesi. Seçilen DNA her zaman `vNN/stil-dna.json` olarak kalır (kanallar arası hafıza budur); elle eksen değiştirirsen STIL-DNA.md §Diğer kanallarla satırına bak, başka kanalda olanı seçme.
- **Klasik Claude kurgusu yok:** kurgu yalnız repertuar bileşenleri + videonun `stil-dna.json`'u ile kurulur; kanal başına `Parcalar.tsx` yazılmaz, gece-kırmızı palet / aşağıdan-yay giriş / her karede gren+vinyet / her fotoda aynı Ken Burns kullanılmaz (`references/repertuar.md`).
- **Rakibin metnini, kurgusunu, kapağını kopyalama.** Kalıbı ve ölçülen ritmi al, içeriği kendin yaz (`references/ozgunluk.md`).
- **Kullanıcının günlük Chrome'una dokunma**; otomasyon ayrı profil + CDP portuyla. Başka oturumların Chrome/render süreçlerini öldürme.
- **İnsan yüzü (çocuk yüzü asla) ve görselde yazı/logo yok**, kanal dosyası aksini söylemedikçe. AI görsel gereken kanallarda etiket (ör. 「イメージ」).
- **Ses hızıyla oynanmaz:** TTS orijinal hızında (1.0), `atempo` yok. Süre birkaç dakika farklı çıkabilir, normal; süre metinle ayarlanır (`references/ses.md`). Kaynak dosyalardaki "hızı rakibe göre ayarla" talimatları geçersizdir.
- **YouTube'dan alınan gerçek görüntü yalnız CC BY lisanslı** (atıfla) ya da kullanıcının açık izniyle; rakibin videosu asla (`references/youtube-kaynak.md`).
- **FAIL veren kalite kapısıyla teslim yok** (`references/kalite-kapilari.md`).
- **Kurgu denetimi render'dan ÖNCE:** `kurgu_denetim.py --plan props.json --rakip <kütüphane>/kanallar/@Rakip/video-* --duzelt props-duzeltilmis.json` — ekran yazısı okunacak kadar kalıyor mu, seslendirmeci söylerken mi beliriyor, söylemeden kayboluyor mu, klip süreleri rakiple uyumlu mu, hareket/kart döngüsü var mı. Kalan FAIL'ler (art arda yazılı kartlar) metin kısaltılarak ya da kart ayrılarak çözülür.
- **SFX zorunlu ve otomatik:** kurgu ortak `repertuar/VideoDna.tsx` ile kurulur (kanal kodu yazılmaz); `DnaSfx` geçiş/kart/sayı/alıntı/vurgu/alt bant olaylarına tonun SFX paletinden ses koyar, sesin ölçülen vuruş anı olay karesine oturur. SFX'siz video teslim edilmez (`references/sfx.md`).

## 2. Faz haritası — her faz için hangi dosyayı okuyacaksın

| # | Faz | Çıktı | Oku |
|---|---|---|---|
| 0 | Kurulum / yeni makine | çalışan araçlar, CDP Chrome | `references/kurulum-ve-cdp.md` |
| 1 | Rakip analizi: en popüler 3 video indir, 0,1 sn kare analizi (ilk 30 sn, ilk %30), birleşik hedefler, **temizlik** | RAKIP-OLCUM.md, SPEC-<kanal>.md | `references/rakip-kare-analizi.md`, `references/rakip-analizi-ve-baslik.md` |
| 1a | **Edit dili** (kare kare: geçiş tipi+ms, düzen/çerçeve, kalıcı katman, OCR yazı+font, altyazı stili, renk, SFX) + **stil DNA** (`stil_dna.py --rakip @X --konu "..."`: ton konudan, nişteki kütüphane kanallarıyla ağırlık; rakipten ve son 3 videodan ≥%20 farklı, klasik skor 0) → A/B önizleme | EDIT-DILI.md (kütüphanede), STIL-DNA.md, stil-dna.json, onizleme-A/B.mp4 | `references/edit-dili-kutuphanesi.md`, `references/repertuar.md`, `references/varlik-paketleri.md` |
| 1b | Rakibin kaynak araştırması: gerçek video / stok / AI görsel / AI video / kart oranı → bizim üretim yöntemi | KAYNAK-ANALIZ.md, araç kararı | `references/rakip-kaynak-analizi.md` |
| 2 | Konu + başlık | 3–4 başlık, önerilen ilk sırada | aynı dosya + `references/ozgunluk.md` |
| 3 | Araştırma + metin | ARASTIRMA-NN.md, metin.txt | `references/metin.md` |
| 4 | Ses | vo.mp3, cumleler.json | `references/ses.md` |
| 5 | Görsel | img/, seçilmiş görseller | `references/gorsel-ve-kapak.md` |
| 5a | **Gerçek görüntü** (YouTube CC BY klip/kare, atıf) | kaynak/, KAYNAKCA.tsv | `references/youtube-kaynak.md` |
| 5b | Sunucu (varsa) | host.mp4 | `references/heygen.md` |
| 6 | Kurgu + SFX (yalnız `Dna*` bileşenleri; arka plan/geçiş/vurgu DNA'dan) | VideoNN.tsx / build planı | `references/repertuar.md` §4, `references/kurgu-render-qc.md`, `references/sfx.md` |
| 6a | **Tam render öncesi 3 onay** (hikâye tablosu, görünüm kareleri, storyboard) | onaylar DEVAM'da | `references/kalite-kapilari.md` §2 |
| 7 | Render + QC + **kalite kapıları** (kapı, yazı, senkron, rakiple karşılaştırma, jüri) + ses miksi | final mp4, *-KAPI.md, KARSILASTIRMA.md | `references/kurgu-render-qc.md`, `references/kalite-kapilari.md` |
| 8 | **Kapak (video bittikten sonra):** rakibin en popüler 3 kapağını indir + tek tek detaylı analiz → 6 konsept → ChatGPT'de 6 ayrı sekmede üret → kontrol → 6'sı Drive'a + kullanıcıya | KAPAK-ANALIZ.md, kapak-1..6 | `references/kapak-analizi-ve-uretim.md` |
| 8b | Başlık/açıklama | baslik-aciklama.txt | `references/teslim.md` |
| 9 | Teslim: `money printer\<KANAL>\<video>\` + **disk temizliği** + DEVAM güncelle | Drive klasörü, önizleme, açılan GB | `references/teslim.md` |
| M | **Kendi kanal analitiği** (neden tutmadı / büyümüyor → tek eylem) | DEVAM'a eylem + ölçüt | `references/kanal-analitigi.md` |
| T | **Rakip günlük takibi** (kullanıcı takip listesi verdiğinde; zamanlanmış) | RAPOR-<gün>.md + günlük özet | `references/rakip-takip.md` |
| R | **Kanal risk denetimi** (demonetize / tekrar eden içerik / küme; yeni kanalda ve her 10 videoda) | RISK-RAPORU.md + eylem planı | `references/demonetizasyon-riski.md` |
| A | **Araç seçimi** (WhisperX, Remotion skills, Lottie, GSAP, three.js, librosa, humanizer, last30days…; lisans tuzakları) | kurulum yalnız gerektiğinde | `references/arac-yigini.md` |

**Edit dili kütüphanesi** (Drive `edit kutuphane`): ölçülmüş başarılı kanalların kurgu arşivi; her oturum okur ve büyütür.
- Bağlantı: https://drive.google.com/drive/folders/1Oipbh6A6_-atXOLZupfspbrvoEXuCtb2
- Bu makinede: `G:\Drive'ım\edit kutuphane`. Başka makinede Google Drive masaüstü uygulamasıyla `G:\My Drive\edit kutuphane` ya da `G:\Drive'ım\…` olur. Klasör kullanıcının Drive'ında değil de "Benimle paylaşılanlar"da ise önce Drive'da sağ tık → "Kısayol ekle → Drive'ım" yapılır, sonra yerel yoldan çalışılır.
- Yerel yol yoksa bağlantı tarayıcıda açılır, salt-okur kullanılır (README, `kanallar/*/EDIT-DILI.md`). Yazma ve ölçüm yalnız yerel senkron klasörde yapılır.
- Kurallar kütüphanenin `README.md`'sinde, kullanım `references/edit-dili-kutuphanesi.md`'de. Araçların tek kaynağı repodur; kütüphanedeki `_araclar/` ve `remotion/repertuar/` reponun aynasıdır (`kurulum.py ayna`).

**Repo** (GitHub özel `whipgo`, yerel kopya `C:\otomasyon\yt-uretim`): `skill/` (bu skill), `repertuar/` (Remotion edit bileşenleri), `sablon-proje/` (yeni kanal motion projesi + katalog/önizleme kompozisyonları), `fontlar/`, `varlik/` (lisanslı arka plan/filmburn videoları — GitHub Release `varlik-v1`; SFX, Premiere presetleri ve öğrenilmiş preset dili — git). Kurulum ve yeni makine: repo kökündeki `KURULUM.md`.

Sorun çıktığında önce `references/tuzaklar.md` tablosuna bak — yaşanmış hataların çoğunun hazır çözümü orada.

## 3. Yeni kanal / yeni rakip akışı (kullanıcı konsept + rakip verdiğinde)

Kullanıcının standart istemi `references/kaynak/KANAL-URETIM-PROMPT.md`'dir. Özeti ve onay noktaları:

1. **Rakip analizi** — `kanal_isle.py @Rakip --adet 3 --cerez-port 9334` (kütüphanenin `_araclar/`'ı; kütüphane toplu işinde varsayılan `--adet 1`) tek komutla: en popüler 3 videonun ilk %30'u, ritim + edit dili ölçümü, kütüphaneye kayıt. Ayrıntı: en popüler 3 videoyu indir (`rakip_indir.py --video`), her birini 0,1 sn karelerle tara (`kare_analiz.py`): cümle/çekim, çekim süresi, zoom/kaydırma, geçiş, kelime/çekim; ilk 30 sn çekim çekim ve ilk %30 yoğunluğu birebir; 3 videonun medyanı = hedef (`--birlestir`). Başlık kalıbı ve outlier oranı (≥2,0). Bitince indirilen videoları sil (`temizle.py`). → RAKIP-OLCUM + SPEC.
1a. **Edit dili + stil DNA** — rakibin geçiş/düzen/yazı/font/altyazı/renk/SFX dilini çıkar; iskeleti (ritim, kanca, yoğunluk, geçiş süresi/sıklığı, kaynak türü) koru, yüzeyi `stil_dna.py --rakip @X --konu "<başlık + anlatılan olay>"` ile repertuardan seç (ton konudan otomatik; rakipten ve son 3 videodan ≥%20 farklı, klasik skor 0). **A/B önizlemeyi render edip kullanıcıya sun** (kanalın ilk videosunda; sonra A otomatik). (`edit-dili-kutuphanesi.md`, `repertuar.md`)
1b. **Kaynak araştırması** — rakip gerçek video mu, stok mu, AI görsel mi, AI video mu, kart mı kullanıyor; oranlarıyla (`rakip-kaynak-analizi.md`). Bizim araç seçimi buna göre (Flow / Flow Video / Magnific stok / kredili arşiv / HeyGen / Remotion kart) → **kullanıcıya tabloyla sun, onay al**.
2. **Başlık** — kazanan iskeleti çıkar, 3–4 başlık öner (AskUserQuestion, önerilen ilk + "(Önerilen)"). **Kullanıcı seçer.**
3. **Metin** — kaynaklı, rakibin yapısında ama özgün cümlelerle; uzunluk ve cümle kısalığı rakibe yakın. `metin_kontrol.py` + `kalip_kontrol.py` temiz. **Kullanıcıya göster.**
4. **Ses** — 2–4 aday sesle aynı kısa metni seslendir, rakip sesle birlikte gönder. **Kullanıcı seçer.** Ses **orijinal hızında** kullanılır (hız ayarı yok; süre farkı birkaç dakika olabilir).
5. **Görsel** — rakibin tarzından özgün bir stil tarifi çıkar, **onaylat**. Hangi araç/hesapla üretileceğini **sor** (DEVAM'da yazılı değilse). Karakter/mekân/stil sürekliliği, her cümleye kendi görseli, tek tek kontrol, bozuğu yeniden üret.
6. **Kurgu** — `Dna*` bileşenleriyle (`repertuar.md` §4); tam render'dan önce **3 onay** (hikâye tablosu, 2–4 görünüm karesi, 20–30 sn deneme/storyboard); **onaydan sonra** tam video. Sade, göze rahat. Render sonrası kalite kapıları + rakiple karşılaştırma + jüri (`kalite-kapilari.md`); FAIL varsa düzelt, tekrar ölç.
7. **Kapak (video bittikten sonra)** — rakibin en popüler 3 videosunun kapaklarını indir, her birini tek tek analiz et (yazı birebir, font, renk, şablon, özne/ifade, gerçekçilik türü, tema, ışık, grafik öğeler, okunurluk, psikoloji); ortak şablondan **6 konsept** → ChatGPT'de **6 ayrı sekmede** üret (`chatgpt_kapak.py`) → kontrol → 16:9 hazırla → **6'sını da Drive'daki video klasörüne (`kapaklar\`) koy ve kullanıcıya gönder**, kullanıcı seçer. Revizede yalnız değişecek yerleri düzelten istem, aynı sekmede.
8. **Teslim** — `G:\Drive'ım\money printer\<KANAL>\` (yoksa aç) → video klasörü: mp4 + başlık-açıklama + metin + 6 kapak (+ KAYNAKCA). Drive'da boyut doğrulanınca **`video_temizle.py` ile diskte yer aç** (önce deneme, sonra `--sil`). Telefondan izlenecek önizleme gönder.

Sonra: pilot video → kullanıcı onayı → seri. Her kararı DEVAM.md'ye yaz.

## 4. Var olan kanalda "sıradaki video"

1. DEVAM.md → kanal anayasası/kuralları → `references/ozgunluk.md` (son 3 videoyla değişim kontrolü, `scripts/varyasyon_kontrol.py`).
2. Konu: rakip outlier'larından + kanalın kendi tutan kalıbından 3–4 başlık → kullanıcı seçer. Önceki videolarda kullanılan öğeleri (ırk, il, nesne, kanca tipi) tekrar etme.
3. Rakip ölçümü 5–10 videodan eskiyse veya rakip değiştiyse Faz 1–1b'yi tazele. Sonra Faz 3 → 9'u sırayla yürüt; kapak fazı (8) her videoda render+QC'den sonra. Kullanıcı kanalın kilitli kararlarını (ses+hız, avatar, Flow hesabı/proje, renk, teslim klasörü) DEVAM'da vermiştir; yeniden sorma.
4. Seslendirmeden ÖNCE `scripts/kalip_kontrol.py` ile kalıp cümle ve önceki videolarla ortak dizi kontrolü; temiz değilse metni düzelt. (Ses üretildikten sonra düzeltmek yeniden üretim demektir.)

## 5. Kanal profilleri (örnek ve şablon olarak)

Kanal dosyası kanala özel kuralların kaynağıdır; yeni kanal açarken en yakın profili şablon al.

| Kanal | Format | Dosya |
|---|---|---|
| Hund / Hannes Brückner (DE) — **referans hat** | HeyGen sunucu + Flow B-roll, Remotion | `references/kanallar/hund.md` → ayrıntı `references/kaynak/URETIM-PROMPT-hund.md`, `OZGUNLUK-KURALLARI-hund.txt` |
| Akiya Japonya (JP) | faceless ilan slaytı, 10→1 teşhis | `references/kanallar/akiya-uretim-hatti.md`, `references/kaynak/KANAL-ANAYASASI-akiya.md` |
| Dr. Martin Ebeling sağlık (DE) | faceless tahta + stok, tek mekanizma | `references/kaynak/VIDEO-PATLATMA-TAKTIGI-saglik.txt` |
| Diğer hat tipleri (silah, POW, hikâye, Cozy reels, CapCut) | özet tablo | `references/kaynak/YOUTUBE-OTOMASYON-SISTEMI.md` §7 |

Akiya + medical explainer'dan çıkan genel kurgu/tutunma/ölçüm dersleri: `references/dersler-akiya-medical.md` (Remotion mimarisi, ffmpeg motoru, Shorts tarifi, ölçülen hedef değerler).

## 6. Hazır betikler (`scripts/`) — tekrarlanan işi betikle yap, ajan açma

| Betik | Ne yapar |
|---|---|
| `qc.py <video.mp4> [--vo vo.mp3] [--onizleme]` | süre, LUFS/tepe, 18'lik ızgara + ilk 33 sn ızgarası, açılış karesi, isteğe bağlı 60 sn önizleme |
| `kalip_kontrol.py metin.txt --onceki a.txt b.txt c.txt [--kaliplar kaliplar.txt]` | kalıp cümle sayımı + önceki metinlerle 6+ kelimelik ortak diziler |
| `varyasyon_kontrol.py varyasyon.tsv --yeni "<satır>"` | yeni videonun son 3 videoya göre kaç sütunda farklı olduğunu sayar (eşik 8) |
| `bolum_zamanlari.py cumleler.json metin.txt` | `# BÖLÜM` başlıklarından YouTube bölüm zamanları (0:00 …) |
| `sfx_kur.py <zip...> --hedef <klasör>` | SFX paketlerini açar, adları temizler, `sfx-katalog.json` (süre + kategori) yazar |
| `rakip_indir.py @kanal --adet 3 [--video]` | en popüler 3 video: kapak, açıklama/etiket/kaynak ipuçları, (≤720p video + altyazı), `indirilenler.json` |
| `kare_analiz.py video.mp4` / `--birlestir a b c` | 0,1 sn tarama: kesimler, çekim süreleri, zoom/pan, geçiş, kelime/çekim, kaynak tahmini (durağan görsel/video/kart); ilk 30 sn, ilk %30, sonrası; kontakt sayfaları; birleşik hedefler |
| `stil_dna.py --rakip @X --konu "..." [--ton ciddi\|gizem\|enerjik\|sakin] [--gecmis ...] [--kilit palet,font] --cikti C:\otomasyon\<kanal>\vNN\` | **stil DNA**: rakip imzası → repertuardan A/B yüzey (arka plan, geçiş, palet, font, başlık, altyazı, kart, kamera, çerçeve, doku, vurgu presetleri); kanalın geçmişi (`--gecmis` verilmezse otomatik) ve diğer kanalların DNA'ları okunur; `stil-dna.json` (varsayılan A) + `STIL-DNA.md` kanıt + kontrol |
| `varlik_kur.py katalog\|presetler\|yukle\|indir\|kanal <motion>` | lisanslı paketler: 1080p kopya + ölçüm + katalog, preset derleme, GitHub Release yükle/indir, kanal projesine bağlantı |
| `preset_ogren.py paket.prfpset` | Premiere preset XML'inden anahtar kare + bezier eğrisi → Remotion (`PresetHareket`) |
| `kutuphane_ara.py [--ritim 2.0 --tolerans 0.3 ...]` | kütüphane indeksi (`_indeks/`) + ritim/geçiş/düzen/altyazı filtresi |
| `kurulum.py kontrol\|ayna\|paketle` | ortam kontrolü, kütüphane aynası (`_araclar/`, `remotion/repertuar/`), `.skill` paketi üretimi |
| `kanal_isle.py @kanal --kim <ad>` / `--liste x.txt --paralel 2` | **tek komut**: indir (ilk %30) → kare_analiz + edit_dili + font_aday → kütüphaneye yaz → durum.txt kilidi. Güncel kopyası kütüphanenin `_araclar/` klasöründe |
| `edit_dili.py video.mp4 [--vtt]` | kare kare (videonun fps'i) geçiş tipi+ms, düzen/çerçeve, kalıcı katman, OCR yazı/altyazı stili, renk, SFX vurgusu; `edit-dili-sayfa.jpg` |
| `font_aday.py <editdili> / --indir` | yazı kırpıntısını ~50 aday fontla yan yana; sıralama kaba, karar gözle |
| `temizle.py <rakip klasörü> [--deneme]` | indirilen rakip videolarını siler, raporlar/kapaklar/sayfalar kalır |
| `kapak_metrik.py k1 k2 k3` | kapak metrikleri (parlaklık, kontrast, doygunluk, palet, ağırlık) + karşılaştırma ve mobil boyut sayfası |
| `chatgpt_kapak.py istemler.json --port P` | her istemi ChatGPT'de ayrı sekmede çalıştırır, görselleri indirir, ekran görüntüsü alır |
| `kapak_bitir.py "kapak-*.png" --rakip …` | 16:9 1280×720 <2 MB, numaralı sayfa, rakiple ana sayfa akışı karşılaştırması |
| `metin_kontrol.py --metin metin.txt --dil de` / `--istemler istemler.json` | TTS ve görsel üretiminden önce: TTS'i bozan işaretler, uzun cümle, klişe/makine izi; istemde yazı çıkaracak kelime + "no text" koruması, yasaklı ad |
| `senkron_kontrol.py vo.mp3 cumleler.json [--video final.mp4]` | zamanlar ileri mi, ilk cümle konuşmayla mı başlıyor, son cümle sesten taşıyor mu, video/ses süresi |
| `kurgu_denetim.py --plan props.json --rakip <rakip video klasörleri> [--duzelt yeni.json]` | **render öncesi kurgu denetimi** (FAIL = render yok): yazı okunmadan kayboluyor, yazı sesle geç/erken, seslendirmeci bitirmeden kayboluyor, klip süresi rakipten sapmış, aynı görüntü tekrar, kart/hareket döngüsü; `--duzelt` komşu çekimlerden kare ödünç alarak düzeltir (toplam süre sabit). Render sonrası: `--analiz analiz.json --rakip …` (hareket döngüsü) |
| `kusur_kontrol.py final.mp4` | **render sonrası kusur kapısı** (FAIL = teslim yok): saniyede > 3 flaş (WCAG 2.3.1, nöbet riski; glitch/flaş geçişleri art arda), ses kırpılması, ani ses düşmesi |
| `kalite_kapisi.py final.mp4 --metin metin.txt --dil de [--brief brief.json]` | **render sonrası kapı** (FAIL = teslim yok): ölü kanca, siyah/donmuş, tek karelik sıçrama, sessizlik, LUFS/tepe, okunmayan cümle, durağan pay, tekrar eden görsel |
| `yazi_kontrol.py final.mp4` | ekran yazısı: kesik/kenarda, güvenli alan (Shorts telefon arayüzü), üst üste, kontrast < 3:1, bozuk okuma |
| `karsilastir.py --biz analiz.json --ref r1 r2 r3 [--biz-video --ref-video]` | bizim final vs rakip: iskelet tablosu (±%20), tutmayan satıra eylem, yan yana sayfa |
| `ses_miks.py --vo vo.mp3 --muzik m.mp3 --sfx sfx.json --video ham.mp4 --cikti final.mp4` / `--vurus m.mp3` | konuşma sıkıştırma + müzik kısma (sidechain) + zamanlı SFX + iki geçişli −14 LUFS; hız değişmez. Vuruş haritası (librosa) |
| `youtube_kaynak.py ara "sorgu"` / `indir <id> --bas --son` / `kare <id> --anlar` | YouTube'dan CC BY gerçek görüntü: lisans doğrulamalı arama, aralık indirme, kare; `KAYNAKCA.tsv` |
| `video_temizle.py <videoNN> --drive <Drive klasörü> --final --temp [--sil]` | teslimden sonra yeniden üretilebilir ara dosyaları siler, açılan GB'yi yazar; final yalnız Drive'da aynı boyuttaysa |
| `rakip_takip.py --liste takip.txt` | **günlük rakip takibi**: yeni video/Short, izlenme hızı, outlier, başlık/kapak değişimi (A/B), Short'ta denenen konu → `RAPOR-<gün>.md` (`rakip-takip.md`) |
| `kanal_risk.py @A @B --altyazi` | **demonetizasyon/küme riski**: yükleme temposu, başlık iskeleti, açıklama şablonu, süre, metin benzerliği, kanallar arası benzerlik → `RISK-RAPORU.md` (`demonetizasyon-riski.md`) |

Betikler Python 3 + ffmpeg/ffprobe; ek olarak `kare_analiz.py`/`edit_dili.py` numpy+opencv+pillow (+ `rapidocr` OCR için), `rakip_indir.py` yt-dlp, `chatgpt_kapak.py` websocket-client ister. Windows'ta `py`, diğerlerinde `python3`.

## 7. Çalışma ve iletişim biçimi

- Kullanıcıyla **Türkçe, kısa, sonuç odaklı**. "Şimdi şuna tıklıyorum" anlatımı yok; ara durum tek satır ("görseller 20/59").
- Karar gereken yerde en fazla 2–4 seçenek, önerilen ilk sırada. Önce kısa parça göster, onay al, sonra büyüt.
- Uzun işler (Flow üretimi, HeyGen beklemesi, render, Drive yükleme) **bağımsız süreç** olarak arka planda; log'u bitiş + hata filtresiyle izle; kısa aralıkla yoklama.
- Gönderilen dosya önizlemeyse (küçültülmüş) bunu söyle, tam kalite dosyanın yolunu ver.
- Her video bitince ve her önemli kararda DEVAM.md'yi güncelle: durum tablosu, SIRADAKİ İŞ, yeni tuzak.
- Model dağılımı: düşünme işi (metin, kurgu kararı, son kalite kararı) ana modelde; çok görsel/uzun log incelemesi Sonnet alt ajanda; kopyala/listele/ölç Haiku'da; tekrarlanan her şey betikte. Ortak dosyaya (ortak betik, kök bileşen, config) alt ajan dokunmaz.

## 8. Teslimden önce son kontrol

- [ ] Süre = vo süresi (±1 sn); I ≈ −14 LUFS (±0,5), tepe < −1 dB
- [ ] Izgarada siyah/yeşil/boş kare yok; açılış karesinde sunucunun yüzü açık (sunuculu kanalda)
- [ ] Altyazı okunur, rozet/numaralar doğru, karakterli sahnede facecam gizli
- [ ] Başlık/kapak/kart şablonlarında doğru konu adı (il/ırk) — eski videodan kalma ad yok
- [ ] Açıklama: bölüm zamanları cumleler.json'dan, kaynaklar, dürüstlük notu/feragat, etiketler; txt UTF-8 (BOM'lu)
- [ ] Özgünlük: son 3 videoya göre ≥8 eksen farklı, kalip_kontrol temiz
- [ ] Kendi finalimiz `kare_analiz.py` ile ölçüldü; ilk 30 sn / ilk %30 RAKIP-OLCUM hedeflerinden ±%20 içinde (değilse nedeni DEVAM'da)
- [ ] 6 kapak üretildi, yazıları birebir kontrol edildi, 6'sı Drive'daki `kapaklar\` klasöründe ve kullanıcıya gönderildi
- [ ] `kurgu_denetim.py --plan` PASS (render öncesi); SFX katmanı var (`DnaSfx`)
- [ ] `kusur_kontrol.py` PASS
- [ ] **İzleyici gibi izle:** finalden her bölümden kareler (qc ızgarası) ve telefon boyutunda (~360 px) bak: yazı ince/küçük mü, arka planla karışıyor mu, okunmadan mı gidiyor, aynı animasyon tekrar mı ediyor. Sayılar temiz çıksa da bu bakış atlanmaz
- [ ] `kalite_kapisi.py` PASS, `yazi_kontrol.py` PASS (yazı varsa), `senkron_kontrol.py` PASS; `karsilastir.py` farkları düzeltildi ya da nedeni DEVAM'da; jüri puanı ≥ 7
- [ ] Ses orijinal hızında (hız parametresi/atempo yok)
- [ ] Gerçek görüntü varsa hepsi CC BY ya da izinli, atıflar açıklamada
- [ ] Rakip analiz klasöründe (yerel) indirilmiş video kalmadı (`temizle.py`), kütüphaneye de video konmaz
- [ ] Rakip kütüphaneye girdi (`durum.txt = bitti`), `STIL-DNA.md` kontrol satırı temiz (rakipten ≥6/7, son 3 videodan ≥6 eksen farklı, klasik skor 0), `stil-dna.json` video klasöründe, kendi finalimiz `edit_dili.py` ile ölçülüp DEVAM'a yazıldı
- [ ] STIL-DNA.md §Konu ve ton konuyla uyumlu (askeri/trajik konuda neşeli yüzey yok); §Kontrol satırı `TAMAM` (rakipten ve son 3 videodan ≥%20)
- [ ] Kurguda kanal başına yazılmış bileşen yok; yalnız `repertuar/` + `Dna*` (yeni teknik gerektiyse repertuara eklendi ve commit edildi)
- [ ] Teslim `money printer\<KANAL>\<video>\` altında; Drive'da ad + boyut görüldü (yükleme paneline güvenme)
- [ ] `video_temizle.py --sil` çalıştı, açılan GB kullanıcıya söylendi
- [ ] Yayın saati/günü son 3 yayından farklı, aynı gün 2. uzun video yok; yeni kanalda `kanal_risk.py` temiz (`demonetizasyon-riski.md`)
- [ ] DEVAM.md güncellendi
