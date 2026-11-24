# Rakip videolarının kare kare analizi (0,1 sn) — ilk 30 sn, ilk %30, temizlik

Amaç: rakibin tutan videolarının **ritmini sayıya çevirmek** (kesim sıklığı, çekim süresi, kamera hareketi, kelime/çekim, kaynak türü) ve bizim kurguyu bu sayılara oturtmak. Tahmin yok, ölçüm var. Bu analiz yeni kanal açarken ve rakip değiştiğinde zorunlu; seri videolarda 5–10 videoda bir tazelenir.

## 1. İndir (kullanıcının bilgisayarında, Claude Code)
```
py scripts/rakip_indir.py @RakipKanal --adet 3 --video --altyazi de,en --cikti rakip-analiz/<kanal>
```
- Kanalın son 300 uzun videosundan **en çok izlenen 3'ü** seçilir; `secim.md`'de izlenme, kanal ortalaması ve **oran** (outlier gücü), süre, tarih. Kullanıcı belirli videolar verdiyse `--videolar URL1 URL2 URL3`.
- Kapaklar (`kapak-1..3.jpg`, en yüksek çözünürlük), açıklamalar (`aciklama-N.txt`), etiketler, bölümler, kaynak ipuçları; `--video` ile ≤720p analiz kopyası + altyazı (otomatik dahil).
- Shorts `--en-az-sn 61` ile dışarıda. Oranı 2'nin altında olan "popüler" video genel kanal gücüdür, kalıp sinyali zayıftır; bunu raporda belirt.
- Ağ/kota sorunu: yt-dlp güncelle (`py -m pip install -U yt-dlp`); olmazsa Nexlev/TubeLab ile listele, `--videolar` ile ver.
- İndirilen videolar **yalnız ölçüm içindir**: hiçbir karesi, sesi, metni bizim videoda kullanılmaz.

## 2. 0,1 sn tarama
Her video için (paralel çalıştırma; CPU'yu render ile paylaşma):
```
py scripts/kare_analiz.py rakip-analiz/<kanal>/video-1.mp4 --cikti rakip-analiz/<kanal>/analiz-1
```
Betik videoyu 10 fps (0,1 sn) ffmpeg borusuyla okur, kareleri diske yazmaz. Her kare çifti için: renk histogramı + piksel farkı (kesim), ORB + RANSAC benzerlik dönüşümü (zoom ölçeği, yatay/dikey kayma), kamera hareketi çıkarıldıktan sonra kalan **iç hareket** (kaynak türü), parlaklık/doygunluk, düz alan + keskin kenar oranı (grafik/kart).

Çıktılar ve ne yapacağın:
| Dosya | İçerik | Sen ne yaparsın |
|---|---|---|
| `analiz.md` | bölüm tablosu (ilk30 / yüzde30 / sonrası / tüm) + ilk 30 sn çekim çekim | sayıları SPEC'e taşı |
| `ilk3sn-0.1.jpg` | ilk 3 sn'nin 30 karesi | açılış karesi, ilk kesimin anı, yazı/efekt girişi |
| `ilk30-0.5.jpg` | ilk 30 sn, 0,5 sn'de bir | kancanın görsel hikâyesi |
| `ilk30-cekimler.jpg` | ilk 30 sn'deki her çekimin ilk karesi + süre + hareket + kaynak kodu | çekim türlerini adlandır |
| `yuzde30-cekimler-N.jpg` | ilk %30'un bütün çekimleri | tür dağılımı, kart/harita/sunucu sıklığı |
| `sonrasi-ornek.jpg` | %30 sonrasından eşit aralıklı 36 çekim | tempo düşüşü, tekrar eden kalıp |
| `analiz.json` | her çekim: baş, süre, giriş (sert/yumuşak/flaş/siyah), hareket, zoom %/sn, kaynak tahmini, iç hareket, kelime | gerekirse ayrıntı |

Kod sözlüğü (sayfalarda): `zoom+` içe, `zoom-` dışa, `pan>` `pan<` `pan^` `panv` kaydırma, `sabit`, `GRS` durağan görsel, `VID` hareketli video, `KRT` grafik/kart.

Sayfaları **Read ile tek tek aç ve bak**. Çok sayfa varsa bir Sonnet alt ajanına "her çekim için: tür (foto/AI görsel/stok video/gerçek arşiv/AI video/kart/harita/sunucu/metin ekranı), ekrandaki yazı var mı, efekt" listesini çıkart, sorunlu/emin olunmayanlara kendin bak.

## 3. Ölçülecek her şey (rapora girer)
**İlk 30 saniye — birebir yapı**
- Çekim çekim tablo: zaman, süre, görsel türü, kamera hareketi, ekrandaki yazı/altyazı, efekt/SFX anı (sesi dinlemek yerine dalga/altyazıdan çıkar), anlatılan cümle.
- İlk karede ne var (yüz mü, sahne mi, yazı mı), ilk kesim kaçıncı saniyede, başlığın vaadi kaçıncı saniyede söyleniyor, ilk "liste maddesi/ana içerik" ne zaman başlıyor.
- Kancanın cümle yapısı (transkriptten): soru/iddia/sahne/rakam; açık döngü cümleleri.

**İlk %30 — yoğunluk**
- Kesim/dk, medyan çekim süresi, çekim süresi dağılımı, görsel tür dağılımı (adet ve süre %), kart/harita/sunucu sıklığı.
- Cümle başına görsel (= çekim / cümle) ve görsel başına kelime (`cekim_basi_kelime`).
- İlk %30 ile sonrası arasındaki fark (çoğu tutan videoda başta daha hızlıdır; farkı oranla yaz).

**Bütün video**
- Kelime/dk (altyazıdan), LUFS, zoom hızı medyanı (%/sn), geçiş tipleri, altyazı stili, vurgu rengi, bölüm yapısı (açıklamadaki bölümler).

## 4. Birleştir → hedefler
```
py scripts/kare_analiz.py --birlestir analiz-1/analiz.json analiz-2/analiz.json analiz-3/analiz.json --cikti rakip-analiz/<kanal>/RAKIP-OLCUM.md
```
Hedef = 3 videonun medyanı. `RAKIP-OLCUM.md` + görsel gözlemlerin → `sistem/SPEC-<kanal>.md` ve DEVAM §3b/§4. Kurgu PLAN'ı, istem sayısı (görsel adedi ≈ hedef çekim sayısı) ve metin uzunluğu bu hedeflerle kurulur.

**Kendi videonu da ölç:** render sonrası aynı betiği bizim finale çalıştır, ilk 30 sn ve ilk %30 tablosunu RAKIP-OLCUM hedefleriyle yan yana koy; ±%20'den fazla sapma varsa kurguyu düzelt ya da nedenini DEVAM'a yaz.

## 5. Sınırlar (dürüst ol)
- Kesim tespiti uyarlanır eşikle; çok hızlı hareketli sahnede fazladan kesim, çok yavaş çapraz geçişte eksik kesim olabilir → sayfalarla doğrula, gerekirse `analiz.json`'u düzeltip birleştir.
- Kaynak tahmini ve iç hareket eşiği (`--ic-esik`, varsayılan 2,5) sezgiseldir. Kalibrasyon: türünü bildiğin bir videoya (ör. bizim Flow görselli videomuz → hepsi GRS olmalı) çalıştır, eşiği ona göre ayarla.
- Otomatik altyazı kelime sayısını ±%5 şaşırabilir.

## 6. Temizlik (analiz bitince, zorunlu)
```
py scripts/temizle.py rakip-analiz/<kanal> --deneme   # listeyi gör
py scripts/temizle.py rakip-analiz/<kanal>            # sil
```
- Yalnız o klasördeki indirilen video/ses/yarım indirme dosyaları silinir (`indirilenler.json` + uzantı listesi). Raporlar, kapaklar, açıklamalar, kontakt sayfaları, altyazılar kalır (`--altyazi` ile onlar da silinir).
- Rakip indirmeleri yeniden indirilebilir geçici dosyalardır; kalıcı silme bunlar için serbesttir. Bizim ürettiğimiz dosyalar için kural değişmez (Geri Dönüşüm Kutusu, `teslim.md`).
- Silindiğini doğrula (betik boşaltılan MB'ı yazar) ve DEVAM'a "rakip analizi <tarih>: klasör, hedefler, temizlendi" satırı ekle.
