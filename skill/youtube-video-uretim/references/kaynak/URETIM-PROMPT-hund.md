# ÜRETİM TALİMATI — Almanca Köpek Kanalı (Hannes Brückner)

> Bu belgeyi okuyan yapay zekâ: Hiçbir şeyi bildiğini varsayma. Her adımı yazıldığı sırayla, yazıldığı gibi yap.
> Bir adım başarısız olursa sonraki adıma GEÇME. Önce nedenini bul (ekran görüntüsü al, sayfa metnini oku), düzelt, sonra devam et.
> Kullanıcıyla **Türkçe** konuş. Her küçük adımı anlatma. İşi yap, sadece sonucu ve gerekli kararları bildir.
> Güncel durum ve sıradaki iş her zaman `C:\Users\polat\Documents\HEYGEN ALMAN\DEVAM.md` dosyasındadır. **İşe başlamadan önce onu oku.**

---

## BÖLÜM 1 — NE ÜRETİYORUZ?

Her video şunlardan oluşur:
1. Almanca bir metin (10–14 dakika). Konusu köpek ırkları ve evin korunması; izleyici Almanya'da yaşayan 50 yaş üstü kişiler; hitap "Sie".
2. Bu metnin yapay zekâ sesiyle okunmuş hali (`vo.mp3`).
3. HeyGen'de bu sesle konuşan sunucu videosu. Sunucu kasketli, sakallı bir adam; avatarın adı HUND-SUNUCU-v1.
4. Google Flow'da üretilmiş, her cümleyi birebir resmeden fotoğraflar (bir video için yaklaşık 60 istem, her istemden 2 görsel).
5. Bunların Remotion ile birleştirildiği kurgu. İçinde altyazı, ırk kartları, sayı kartları, sağ üstte yuvarlak sunucu kamerası (facecam) ve "Nr. X" rozeti var.
6. Teslim: Masaüstü klasörü + Google Drive klasörü (3 dosya) + sohbette metnin kendisi.

---

## BÖLÜM 2 — DOKUNULMAZ KURALLAR (ASLA ÇİĞNEME)

- **Şifre girme.** Bir sitede oturum kapandıysa dur, kullanıcıya "şu sekmede giriş yap" de ve bekle.
- **HeyGen'de sadece Avatar III kullan.** Avatar IV kredi harcar ve asla gönderilmez. Ekranda "Avatar IV" ya da "kredi" uyarısı görürsen gönderme, dur.
- **Ses klonlama yok.** HeyGen'e sadece hazır ses dosyası yüklenir. "Ses Yansıtma" (voice mirroring) anahtarı KAPALI olmalı.
- **Sunucuya sahte unvan verme.** Metinde "Tierarzt", "Hundetrainer", "30 yıllık uzman" gibi ifadeler olmaz.
- **Kaynaksız sayı yazma.** Her sayı `arastirma\ARASTIRMA-NN.md` dosyasındaki bir kaynağa dayanmalı.
- **Kanalda olmayan bir videoya "kanalda var" deme.**
- **Videonun açılışında sunucunun yüzünü hiçbir şey kapatmamalı.** İlk sahne mutlaka sunucudur ve üstünde görsel olmaz.
- **Flow'da sadece pltcvziglt01@gmail.com hesabıyla üret.** anlattimt@gmail.com ile ÜRETME.
- **Chrome'u kapatmadan önce kontrol et.** Aynı Chrome başka işler tarafından da kullanılıyor olabilir (magnific_cdp.py, flow-img.py). Önce `Get-CimInstance Win32_Process` ile bak.
- **Silme, satın alma ve hesap ayarı değiştirme yok.**

---

## BÖLÜM 3 — TARAYICIYI NASIL KULLANIYORUZ? (EN ÖNEMLİ BÖLÜM)

### 3.1 Hangi tarayıcı?
Kullanıcının kendi Chrome'u KULLANILMAZ. Otomasyon için ayrı bir Chrome profili var:
- Profil klasörü: `C:\Users\polat\chrome-magnific`
- Uzaktan kontrol portu (CDP): **9333**

Bu Chrome açık değilse şu komutla aç. Bayrakların hepsi gerekli; bunlar olmadan pencere arka planda kalınca sayfalar donar:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9333 --user-data-dir=C:\Users\polat\chrome-magnific --disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling
```
Bu profilde üç hesap zaten açık:
- HeyGen
- Flow (pltcvziglt01)
- Drive (anlattimt)

Giriş gerekirse kullanıcı kendisi yapar.

### 3.2 Sekme listesini görmek
Tarayıcıda hangi sekmelerin açık olduğunu öğrenmek için:
```
curl -s localhost:9333/json
```
Her satırda `type` (page / iframe / worker…) ve `url` bulunur. Sen sadece `type = page` olanlarla ilgilenirsin.

### 3.3 Yeni sekme açmak
Gerekli sekme yoksa (örneğin Drive kapalıysa) şöyle açılır:
```
curl -s -X PUT "localhost:9333/json/new?https://drive.google.com/drive/folders/1NfUcAz_ojI__jU4pVBm38zmOlAbG6I9Q"
```
Ardından sayfanın yüklenmesi için 10–15 saniye bekle.

Sık kullanılan adresler:
- **HeyGen stüdyosu (avatar seçili açılır):** `https://app.heygen.com/create-v4/draft?vt=l&avatarGroup=7ac61000cbc342cbbdefdadc5e690663`
- **HeyGen projeler listesi:** `https://app.heygen.com/projects`
- **Flow projesi:** `https://flow.google.com/u/1/project/a551d139-d73a-4926-8658-906d10edf7e8` (adresteki `u/1`, pltcvziglt01 hesabı demektir)
- **Drive teslim klasörü:** `https://drive.google.com/drive/folders/1NfUcAz_ojI__jU4pVBm38zmOlAbG6I9Q`

### 3.4 Bir sekmeye bağlanmak
Playwright KULLANMA. Playwright tarayıcıdaki bütün hedeflere (worker, iframe) bağlanmaya çalışıyor ve 180 saniye takılıyor.
Bunun yerine hazır ham CDP istemcisini kullan: `C:\Users\polat\Downloads\med-explainer\cdp.py`.
```python
import sys; sys.path.insert(0, 'C:/Users/polat/Downloads/med-explainer')
from cdp import Sayfa
s = Sayfa('a551d139', port=9333)     # URL'sinde bu parça geçen İLK sekmeye bağlanır
```
- Flow için `'a551d139'` (proje kimliği) ya da `'flow.google.com'`
- HeyGen için `'heygen.com'`
- Drive için `'drive.google.com'`

"sayfa bulunamadi" hatası alırsan o sekme açık değildir. 3.3'teki gibi aç.

### 3.5 Sekmeye komut göndermek
Her şey `s.gonder('<CDP komutu>', parametreler...)` ile yapılır. Kullandığımız komutlar:

| Amaç | Komut |
|---|---|
| Sekmeyi öne getir (gizli sekmede menüler açılmaz!) | `s.gonder('Page.bringToFront')` |
| Başka adrese git | `s.gonder('Page.navigate', url='...')` sonra `time.sleep(10)` |
| Sayfada JavaScript çalıştır, sonucu al | `s.gonder('Runtime.evaluate', expression='...', returnByValue=True, awaitPromise=True)` |
| Ekran görüntüsü al | `s.gonder('Page.captureScreenshot', format='png')` → `base64` çöz → dosyaya yaz → Read aracıyla BAK |
| Fare tıklaması | `Input.dispatchMouseEvent` ile sırasıyla `mouseMoved`, `mousePressed`, `mouseReleased` (x, y, button='left', clickCount=1) |
| Fareyi üstüne getir (hover menüleri için) | yalnızca `mouseMoved` |
| Yazı yaz | önce kutuya tıkla, sonra `s.gonder('Input.insertText', text='...')` |
| Tuş bas (Enter / Escape / Ctrl+A) | `Input.dispatchKeyEvent`, önce `keyDown` sonra `keyUp`. Ctrl için `modifiers=2`. Enter kodu 13, Escape 27 |

Hazır yardımcılar:
- `hund-analiz\flow\fl.py` → `fl.js(s, ifade)`, `fl.tik(s, x, y)`, `fl.ekran(s, ad)`, `fl.yukle(s, x, y, dosya)`
- `hund-analiz\flow\bul.py` → `yer(fl, s, 'Görünen yazı')` → o yazının ekrandaki merkez koordinatı
- `hund-analiz\heygen\hg.py` → HeyGen için aynıları

### 3.6 Nereye tıklayacağını NASIL bulursun?
Koordinatı ASLA tahmin etme. Her zaman şu sırayı izle:
1. JavaScript ile öğeyi **görünen yazısından** bul. Örnek: `innerText` değeri tam olarak "İsteme ekle" olan buton.
2. `getBoundingClientRect()` ile kutusunu al. Merkez noktası `[x + genişlik/2, y + yükseklik/2]` olur.
3. Birden fazla eşleşme çıkarsa en kısa metinli (en içteki) öğeyi seç. Konuma göre de süzebilirsin: `y > 600` alttaki çubuk demektir, `x < 240` sol menü demektir.
4. O koordinata `mouseMoved → mousePressed → mouseReleased` gönder.
5. 1–3 saniye bekle. **Sonra kontrol et:** ya ekran görüntüsü alıp bak ya da sayfa metninde beklenen yazının çıkıp çıkmadığına bak.
6. Öğe bulunamazsa (`null`) hemen tıklamaya çalışma (`TypeError: Value after * must be an iterable, not NoneType` hatası buradan gelir). 1 saniye bekleyip 10–15 kez yeniden dene. Yine yoksa ekran görüntüsü al ve ne olduğuna bak.

Google/HeyGen'deki ikonlu butonların `innerText` değeri ikonun adıdır: `add`, `more_vert`, `arrow_drop_down`, `close`.
"+" butonu `'add'`, üç nokta menüsü `'more_vert'` diye aranır.

### 3.7 Dosya yükleme (dosya seçme penceresi açılmadan)
Windows'un dosya seçme penceresi açılırsa otomasyon orada kilitlenir. Bunun yerine pencereyi yakala:
1. `s.gonder('Page.setInterceptFileChooserDialog', enabled=True)` ve `s.gonder('DOM.enable')`
2. "Yükle" düğmesine tıkla.
3. Websocket'ten gelen mesajları oku, `Page.fileChooserOpened` gelince içindeki `backendNodeId` değerini al.
4. `s.gonder('DOM.setFileInputFiles', files=[TAM_YOL], backendNodeId=...)`
5. `Page.setInterceptFileChooserDialog enabled=False`

Alternatif yol: sayfadaki `input[type=file]` öğesini `DOM.querySelectorAll` ile bul (`pierce=True`) ve `DOM.setFileInputFiles` komutunu doğrudan ona ver. HeyGen'de ses yükleme bu şekilde yapılıyor.

Dosya yolları her zaman **mutlak** yol olmalı.

### 3.8 Gözünle kontrol et
Her kritik adımdan sonra ekran görüntüsü alıp Read aracıyla bak.
"Tıkladım, oldu herhalde" deme. Özellikle şunlardan sonra mutlaka bak:
- ayar değişikliği
- karakter ekleme
- gönder
- yükleme bitti

---

## BÖLÜM 4 — ADIM ADIM BİR VİDEO ÜRETİMİ

`NN` = yeni video numarası (örnek 08). `MM` = bir önceki video (örnek 07).
Yeni klasör `C:\Users\polat\Downloads\hund-analiz\videoNN\` olur. Betikler bir önceki videonun klasöründen kopyalanır. **uret.py'yi mutlaka video07'den (ya da daha yenisinden) kopyala**, çünkü karakter ekleme orada düzeltildi.

### Adım 1 — Konu seçimi
- Rakip kanallarda tutan başlık kalıplarından (DEVAM.md §9 konu havuzu) 3–4 başlık hazırla.
- AskUserQuestion ile kullanıcıya sor. Önerdiğin seçeneği ilk sıraya koy ve "(Önerilen)" yaz.
- Kullanıcı "diğer videoya geç" dediğinde bu adımdan başla.

### Adım 2 — Araştırma
- WebSearch/WebFetch ile de.wikipedia ırk makalelerini, FCI standart numaralarını ve resmî kaynakları topla.
- `arastirma\ARASTIRMA-NN.md` dosyasına yaz: her ırk için tek satır, sayılar ve kaynak.
- En sona dürüstlük notunu ekle.

### Adım 3 — Metin
- `videoNN\metin.txt` dosyasını yaz. Bölüm başlıkları `# 0 KANCA`, `# 1 ...` şeklinde olur; bunlar seslendirilmez.
- Uzunluk 1.600–2.100 kelime.
- Yapı:
  1. Kanca, iki merak unsuruyla: "biri şaşırtıcı…" ve "1 numara…"
  2. Bağlam
  3. Geri sayımın ilk yarısı
  4. Ortada sunucunun dürüst uyarısı
  5. Geri sayımın ikinci yarısı
  6. Pratik öneriler
  7. Özet listesi
  8. Yorum sorusu, önceki videoya yönlendirme ve veda
- Sayıları yazıyla yaz ("achtzig Kilometer pro Stunde"). Kısaltmaları açık yaz.

### Adım 4 — Ses
```
cd videoNN
cp ../videoMM/{ses.py,zamanla.py,kontrol.py,uret.py,kontakt.py,surekli.sh} .
```
- `ses.py` içindeki `AUSSPRACHE` sözlüğüne yanlış okunacak kelimeleri ekle (Cavalier→Kawalier, Kuvasz→Kuwas gibi).
- `py ses.py` çalıştır. ai33 servisi, ses `elevenlabs_FHUR0i1dH4dqNNOZj5D0` (Mirko), hız **1.10**. Her bölüm ayrı seslendirilir, sonra birleştirilip `vo.mp3` olur.
- `py kontrol.py` çalıştır. Her bölüm whisper ile yazıya çevrilip metinle karşılaştırılır. Sadece rakam/yazım farkı kabul edilir; kelime eksik ya da fazlaysa o bölümün sesini sil ve yeniden üret.
- `py -W ignore zamanla.py` çalıştır. `cumleler.json` oluşur: her cümlenin başlangıç/bitiş zamanı ve kelime kelime zamanlar.

### Adım 5 — HeyGen (sunucu videosu)
```
ffmpeg -i vo.mp3 -ac 1 -b:a 96k hund_vNN_hg.mp3
cd ..\heygen
py -W ignore gonder.py "C:\Users\polat\Downloads\hund-analiz\videoNN\hund_vNN_hg.mp3" hund-vNN-tam
```
gonder.py şunları yapar (elle yapman gerekirse de bu sırayla yap):
1. HeyGen sekmesini stüdyo adresine götürür. Avatar kartları gizli pencerede yüklenmediği için adres doğrudan kullanılır.
2. Sayfada "Sesi yükle" ve "HUND-SUNUCU-v1" yazılarının çıkmasını bekler.
3. "Sesi yükle"ye tıklar, `input[type=file][accept*=audio]` öğesine mp3'ü verir.
4. "Sesi onayla" yazısını bekler. Ses Yansıtma anahtarı açıksa DURUR.
5. "Add audio"ya basar. "Yazıya dökülüyor" yazısı kaybolana kadar bekler.
6. Sağ paneldeki **Hareket Motoru** satırına bakar. "Avatar III" değilse açılır listeden "Avatar III"ü seçer. Yapamazsa DURUR.
7. "Oluştur"a basar. "Avatar III'e geç" çıkarsa ona basar. Pencerede başlık kutusuna Ctrl+A ile `hund-vNN-tam` yazar.
8. Sayfada "Avatar IV motorunu" ya da "krediler" geçiyorsa GÖNDERMEZ.
9. "Gönder"e basar.

HeyGen videosu yaklaşık 40 dakikada hazır olur. İndirmek için:
```
py heygen/bekle-indir.py hund-vNN-tam heygen/hund-vNN-tam.mp4
```
Bu betik projeler sayfasını dakikada bir yeniler, başlığın yanında süre ("10m 19s") görününce videoyu indirir.
Hesapta başka projelerin videoları da olduğu için video linkleri tek tek açılır ve sayfasında başlık geçen video indirilir (`bul-indir.py`).
İndirilen videonun süresi `vo.mp3` ile aynı olmalı.

### Adım 6 — Flow (görseller)
**6a. İstemleri yaz:** `videoNN\istemler.py`
- `r('ad', "Sahne tarifi")` normal sahne; stil otomatik eklenir.
- `k('S_ad', "…")` sunucu karakterli sahne. Her videoda 3 tane olur: `S_intro`, `S_haelfte`, `S_schluss`.
- Irk tanımlarını değişken yap (renk, kulak, kuyruk), böylece aynı köpek her sahnede aynı görünür.
- İnsan yüzü gösterme; kişiler arkadan ya da kırpılmış olsun. Çocuk yüzü asla olmaz.
- Görselde yazı, tabela, logo olmamalı.
- Tarihî sahneler için `TARIH` stilini (eski fotoğraf), tablolar için `GEMAELDE` stilini kullan.
- Adları kurgu planında kullanacaksın; bölüm önekleri koy (`cav_`, `hus_`, `h_` = kanca, `a_` = alternatif, `p_` = pratik, `z_` = özet).

**6b. Flow ayarı:** Flow bazen "Nano Banana 2 / x1" ayarına geri döner. `py ../flow/ayarla.py` şunları yapar:
1. Alttaki model çipine ("Nano Banana …") BİR KEZ tıklar. İkinci tık paneli kapatır.
2. Açılan panelde "x2"ye tıklar.
3. Model satırında "Nano Banana 2 arrow_drop…" öğesine tıklar ve açılan listede tam metni "Nano Banana Pro" olan öğeye tıklar (y < 850).
4. Escape'e basar ve çipte "Nano Banana Pro" ve "x2" yazdığını doğrular.

**6c. Üretim:** `bash surekli.sh` komutunu arka planda çalıştır. Betik ayarla.py + uret.py çiftini 6 kere dener, her seferinde eksik görselleri tamamlar ve en sonda `uret.log` dosyasına `BITTI2` yazar.

uret.py her istem için şunları yapar:
1. Izgarada hâlâ yüzde gösteren (üretimi süren) kutu kalmayana kadar bekler. Böylece geç gelen görsel yanlış isme yazılmaz.
2. Sayfadaki büyük görsellerin listesini alır ("önce").
3. İstem karakterliyse karakteri ekler (6d).
4. Alttaki yazı kutusuna (`[contenteditable=true]`) tıklar, `Input.insertText` ile istemi yazar, Enter'a basar.
5. 240 saniyeye kadar bekler. "Sonra" listesinde "önce"de olmayan 2 yeni görsel çıkınca onları `fetch` ile indirip `img\<ad>_a.jpg` ve `img\<ad>_b.jpg` olarak kaydeder.

**6d. Karakter ekleme (2026-09-30'dan beri bu yol):**
"+" penceresindeki "Karakterler" filtresi proje bazlı çalışıyor ve "Hund Sunucu"yu BULAMIYOR. Arama kutusunu KULLANMA. Doğru yol:
1. Escape'e bas.
2. Sol menüde (x < 240) "Karakterler" yazısına tıkla.
3. "Hund Sunucu" yazılı kartı bul. Fareyi kartın üst kısmına getir (hover); sağ üstte kalp ve ⋮ (`more_vert`) çıkar.
4. `more_vert` düğmesine tıkla. Açılan menüde "İsteme ekle"ye tıkla.
5. Sol menüde "Tüm medya"ya tıkla ve 4 saniye bekle.
6. Yazı kutusunun üstünde küçük bir karakter küçük resmi görünmeli. Görünmüyorsa ekran görüntüsü alıp bak.

Karakter sayfasında kartın görseli: kasketli, gri-kızıl sakallı, yeşil mumlu ceketli adam.

**6e. Kontrol:** `py kontakt.py` → `kontakt-00.jpg … kontakt-09.jpg` dosyaları oluşur. HER BİRİNİ Read ile aç ve tek tek bak.
Şunları eleyip diğer varyantı (`_b`) seç:
- yanlış ırk
- yazı ya da tabela
- çerçeve, kolaj, kenarda boş parşömen
- deforme el ya da pençe
- yüzü görünen yabancı
- sahneye ait olmayan hayvan
- sunucunun yüzü farklı

İki varyant da kötüyse istemi düzelt ve sadece o istemi yeniden üret: `py uret.py ad1,ad2`.

**6f. Görselleri kurguya koy:**
```
B="b_secilenler bosluklu"   # örnek: gre_scheu bea_heult
```
Her istem için `img/<ad>_a.jpg` dosyasını (ad B'deyse `_b`) `motion/public/vNN/<ad>.jpg` olarak kopyala.
`vo.mp3` dosyasını da `motion/public/vNN/` klasörüne kopyala.

### Adım 7 — Kurgu (Remotion)
- `motion\src\VideoMM.tsx` dosyasını `VideoNN.tsx` olarak kopyala. İçindeki tüm `vMM` → `vNN` ve `VideoMM` → `VideoNN` yollarını değiştir.
- `cumleler.json` dosyasını `motion\src\vNN-cumleler.json` olarak kopyala.
- Değiştirilecek üç şey:
  - **IRKLAR:** Her ırk için `n` (sıra no), `ad`, `koken`, `boy` (kısa bilgi), `a` (ırk bölümünün ilk cümle numarası), `b` (sonraki bölümün ilk cümle numarası).
  - **RECAP_ILK:** Özet listesinin ilk maddesinin cümle numarası.
  - **PLAN:** Cümle numarasına göre sıralı sahne listesi.
    - `H(n)`: sunucu tam ekran
    - `R(n,'gorsel',{etiket, ort, odak, an})`: görsel. `etiket` amber kutu, `ort` konum çipi, `an: wt(n,'kelime')` o kelimede belirir.
    - `S(n,'S_...')`: karakterli sahne; bunda facecam gizlenir.
    - `RASSE(n,'gorsel')`: ırk kimlik kartı.
    - Kart türleri: `{tip:'SAYI'}`, `{tip:'ZITAT'}`, `{tip:'TIPPS'}`, `{tip:'RECAP'}`
- PLAN kuralları:
  - Cümle numaraları küçükten büyüğe sıralı olmalı; aynı numara iki kez geçmemeli.
  - **`H(0)` ile aynı cümlede `R(0,…)` olmamalı**, yoksa açılışta sunucunun yüzü kapanır.
  - Sunucu en geç ~80 saniyede bir görünmeli. Bir çekim ortalama ~5 saniye sürer.
  - Görsel cümlenin birebir resmi olmalı.
- `Root.tsx` dosyasına `import { VideoNN, SURE_KARE as VNN_KARE } from './VideoNN';` ekle. Ayrıca `<Composition id="VideoNN" … />` ekle.
- `npx tsc --noEmit -p .` çalıştır; VideoNN ile ilgili hata çıkmamalı.

### Adım 8 — Render
`videoNN\bitir.sh` dosyasını videoMM'den kopyala ve **içindeki bütün vMM/videoMM/VideoMM yollarını değiştir**. Betik sırasıyla şunları yapar:
1. HeyGen'den indirir.
2. Sessiz `host.mp4` dosyasını `motion/public/vNN/` klasörüne koyar.
3. Render komutu: `npx remotion render src/index.ts VideoNN ../videoNN/vNN-ham.mp4 --concurrency=6 --crf=18`
4. Ses seviyesini `loudnorm=I=-14:TP=-1:LRA=11` ile ayarlar ve `<Kısa-Ad>-vNN.mp4` dosyasını üretir.

Betiği arka planda çalıştır. Render yaklaşık 15–25 dakika sürer.

### Adım 9 — Kalite kontrol
- **Süre:** `vo.mp3` süresiyle aynı olmalı (±1 sn).
- **Ses:** `ffmpeg -i X.mp4 -af ebur128 -f null -` komutunda Integrated değeri **-14 ±0,5 LUFS** olmalı, tepe değeri -1 dB'nin altında olmalı.
- **Görüntü:** 18 karelik ızgara çıkar: `ffmpeg -i X.mp4 -vf "fps=1/<süre/18>,scale=480:-1,tile=3x6" -frames:v 1 qc.jpg`. Read ile bak.
  - Açılış karesinde sunucunun yüzü açık olmalı.
  - Altyazılar okunur olmalı.
  - Nr. rozetleri doğru olmalı.
  - Karakterli sahnelerde facecam gizli olmalı.
- Hata varsa sadece o kare aralığını `--frames=a-b` ile yeniden render et ve birleştir.

### Adım 10 — Teslim
1. **Masaüstü:** `Desktop\<Kısa Başlık> - Video NN\` klasörüne şunları kopyala: mp4, `baslik-aciklama.txt`, `metin.txt`.
2. **baslik-aciklama.txt içeriği:** BAŞLIK, AÇIKLAMA (bölüm zamanları `cumleler.json`'daki her bölümün ilk cümlesinin `t` değerinden hesaplanır), Kaynaklar, Hinweis, ETİKETLER, KAPAK İSTEMİ. Kapak istemi kapak kurallarına uyar:
   - tek sahne, panel yok
   - solda 2 satır sarı soru, altında kırmızı kutuda tek kelime
   - sunucu kameraya BAKMAZ
   - gece mavisi, yüzde sıcak ışık
   - beyaz ok ve ince kırmızı halka
   - sağ alt %15 boş
3. **Drive hazırlığı:** `drive-hazirlik\` klasörüne üç dosya koy:
   - `<TARİH>_VNN_<Kısa-Ad>.mp4`
   - `<TARİH>_VNN_<Kısa-Ad>.txt` (baslik-aciklama + "METİN (Almanca)" + metin)
   - `<TARİH>_VNN_<Kısa-Ad>_METIN.txt` (sadece Almanca metin, paragraflar arasında boş satır)

   TARİH = üretim günü (YYYY-AA-GG).
4. **Drive'a yükle:** `py drive-yukle.py drive-hazirlik\<3 dosya>`. Drive sekmesi yoksa önce 3.3'teki gibi aç. Betik şunları yapar:
   - Sekmeyi öne getirir. Gizli sekmede "Yeni" menüsü açılmaz.
   - Klasöre gider; zaten var olan dosyaları atlar.
   - "Yeni" menüsünü açmayı 5 kez dener, "Dosya yükle"ye tıklar ve dosya seçme penceresini yakalar.
   - Başarıyı yükleme paneline göre değil, **klasör satırlarında** üç dosya adının da görünmesine göre kabul eder.
5. **Önizleme:** İlk 60 saniyeyi kısa bir mp4 olarak çıkar ve SendUserFile ile gönder.
6. **Sohbet:** Kısa Türkçe özet yaz (süre, LUFS, nereye konduğu, dikkat edilmesi gerekenler), altına Almanca metnin tamamını düz yazı olarak ekle.
7. **DEVAM.md:** §8'deki durum tablosuna satır ekle, §10 SIRADAKİ İŞ'i güncelle, yeni bir tuzak öğrendiysen §7'ye yaz.

---

## BÖLÜM 5 — UZUN SÜREN İŞLERİ BEKLEMEK
- Flow üretimi, HeyGen beklemesi, render ve Drive yüklemesi uzun sürer. Bunları **arka planda** çalıştır (`run_in_background`).
- Sonucu izlemek için log dosyasını hedefli filtreyle takip et. Filtre hem bitiş işaretini hem hataları yakalamalı: `tail -F uret.log | grep -E "BITTI|Traceback|Error|0 gorsel"`.
- Her görsel satırını izleme; çok fazla bildirim gelir.
- Bir arka plan işini durdurduğunda alt süreçleri de öldür (`taskkill //F //T //PID <bash pid>`). Yoksa döngü kendi kendine devam eder.
- Beklerken kullanıcıya kısa durum ver ("görseller üretiliyor, 20/59").

---

## BÖLÜM 6 — BİLİNEN TUZAKLAR VE ÇÖZÜMLERİ

| Belirti | Neden | Çözüm |
|---|---|---|
| `sayfa bulunamadi: drive.google.com` | Sekme kapalı | `curl -X PUT localhost:9333/json/new?<adres>` |
| HeyGen yüklemesi "Uploading audio"da takılıyor | Chrome penceresi gizli/simge durumunda | Chrome'u 3.1'deki bayraklarla başlat |
| HeyGen avatar kartları boş | Gizli pencere | Stüdyoyu doğrudan URL ile aç (gonder.py öyle yapıyor) |
| HeyGen Avatar IV'e dönmüş | Varsayılan değişiyor | gonder.py III yapar; yapamazsa göndermez. Elle "Hareket Motoru" → Avatar III |
| Yanlış HeyGen videosu indi | Hesapta başka projeler var | bul-indir.py başlığa göre bulur |
| Flow "Nano Banana 2 / x1" | Ayar kendiliğinden dönüyor | `py flow/ayarla.py` |
| `karakter bulunamadi` / `NoneType` hatası | + penceresindeki Karakterler filtresi boş | 6d: sol menü → Karakterler → kart ⋮ → İsteme ekle → Tüm medya |
| Görsel bir sonraki istemin adıyla kaydedildi | Geç gelen çıktı | uret.py ızgara boşalana kadar bekler; şüphede o istemi yeniden üret |
| Whisper saçmalıyor | Uzun dosyada halüsinasyon | Bölüm bölüm çöz (zamanla.py öyle yapıyor) |
| Drive "Yeni" menüsü açılmıyor | Gizli sekme | `Page.bringToFront` + 5 deneme |
| Drive "tamam" dedi ama dosya yok | Yükleme paneli yanıltıcı | Klasör satırlarına bak |
| Render yanlış klasöre yazdı | bitir.sh'de eski yol kaldı | Kopyalarken bütün vMM yollarını değiştir |
| Flow "krediler azalıyor" | Aylık kredi | Biterse DUR, kullanıcıya söyle; kredi satın alma |

---

## BÖLÜM 7 — KULLANICIYLA İLETİŞİM
- Türkçe, kısa, sonuç odaklı konuş. "Şimdi şuna tıklıyorum" gibi anlatım yapma.
- Karar gerektiğinde (başlık seçimi gibi) AskUserQuestion kullan.
- Bir sorun kullanıcının müdahalesini gerektiriyorsa (giriş, kredi, Chrome penceresi) bunu açıkça ve tek cümleyle söyle.
- Yapmadığın bir şeyi yaptım deme. Kontrol etmediğin bir şeye "tamam" deme.
- Her video bitince DEVAM.md'yi güncelle ki başka bir oturum kaldığı yerden devam edebilsin.
