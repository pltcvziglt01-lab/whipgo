# Edit dili: kare kare analiz, kütüphane ve özgünleştirme

Rakibin **ne kadar hızlı** kestiğini `kare_analiz.py` ölçer (ritim). **Nasıl** kurguladığını — geçiş, düzen, yazı, font, altyazı, renk, SFX — `edit_dili.py` ölçer.
İkisinin sonucu kütüphanedeki diğer kanallarla karşılaştırılır ve rakibin çalışan iskeleti korunarak yüzeyi özgünleştirilir.

## 1. Kütüphane
- Bağlantı: https://drive.google.com/drive/folders/1Oipbh6A6_-atXOLZupfspbrvoEXuCtb2 (erişim yoksa sahibinden paylaşım istenir; yerel senkron yoksa yalnız okunur)
- Yer: Google Drive **`edit kutuphane`** (bu makinede `G:\Drive'ım\edit kutuphane`; başka makinede `G:\My Drive\...`). Kurallar ve klasör yapısı kütüphanenin `README.md` dosyasında. Oku, tekrar etme.
- Araçların **tek kaynağı GitHub reposudur** (`C:\otomasyon\yt-uretim\skill\youtube-video-uretim\scripts\`, oturum başında `git pull`). Kütüphanenin `_araclar/` ve `remotion/repertuar/` klasörleri reponun **aynasıdır** (`py scripts/kurulum.py ayna`); orada elle değişiklik yapılmaz. Kütüphaneyi kullanan başka kişiler (repoya erişimi olmayanlar) `_araclar/`'ı kullanır, hata bulursa `HATA-BILDIRIM.md`'ye not düşer.
- Betikler kütüphaneyi kendileri bulur (`EDIT_KUTUPHANE` > `G:\Drive'ım\edit kutuphane` > `G:\My Drive\...` > kısayol yolu); repodan da kütüphaneden de çalışır.
- Birden çok Claude (başka kullanıcılarınki de) aynı anda yazar. Bu yüzden **ortak dosya yok**: her kanal kendi klasöründe, kilit `durum.txt`'de, teknik gözlemleri ayrı dosyalarda tutulur (`teknikler/<teknik>/gozlem-<@handle>.md`).
- Kuyruk listeleri `_kuyruk/` klasöründe (`url<TAB>etiket<TAB>not`).

## 2. Rakibi ölçmek (her yeni rakipte; Faz 1'in parçası)
```
py "<KUT>/_araclar/kanal_isle.py" @Rakip --kim <oturum-adi> --etiket edit
```
Komut varsayılan olarak en çok izlenen 1 videoyu (ilk %30'unu) indirir; rakip analizinde `--adet 3` ver. YouTube bot engelinde `--cerez-port 9334` (girişli otomasyon Chrome'u; `cerez_al.py`). Hem ritim hem edit dili analizini çalıştırır, sonucu kütüphaneye yazar. Yani rakip analizi aynı zamanda kütüphaneye katkı olur.
Ayrıntılı tek video gerekiyorsa: `edit_dili.py video.mp4 --vtt x.vtt --cikti klasor`.

**Hassasiyet:** Kesimler videonun kendi fps'inde, kare kare bulunur. 30 fps'te bu 33 ms, 60 fps'te 17 ms demektir. Videoda 0,01 sn'lik bilgi yoktur. "0,01 sn analiz" istenirse kare hassasiyetini kullan ve bunu kullanıcıya söyle.

`edit_dili.py` ne bulur, ne bulamaz:
| Ölçer (sayı) | Gözle doğrula (sayfa) |
|---|---|
| kesim anı (ms), geçiş tipi + süresi (kare/ms): sert, çözünme, siyaha/beyaza geçiş, flaş kesim, kaydırma/whip (yön), zoom geçişi, bileşik (glitch/ışık patlaması) | glitch'in türü (RGB kayması, tarama çizgisi), light leak, maske/wipe şekli |
| çekim içi zoom %/sn, pan %/sn, keskinlik | paralaks mı, gerçek kamera mı |
| düzen dağılımı: tam ekran / çerçeveli (düz renk, bulanık kopya, doku arka plan) / letterbox / bölünmüş | köşe yuvarlaklığı, gölge, çerçeve kalınlığı |
| kalıcı katmanlar: logo, alt bant, ilerleme çubuğu (zamanla değişmeyen pikseller) | ne oldukları |
| OCR: yazı, süre, yer, boyut (% yükseklik), yazı/zemin rengi, büyük harf oranı; altyazı/başlık ayrımı, kelime/ekran | animasyon tipi (daktilo, kelime kelime pop, kayma), font |
| font: `font_aday.py` ile ~50 aday arasından şekle göre ilk 12 | **son karar gözle** (otomatik sıralama kaba; harf aralığı açık başlıkta yanılır) |
| renk: parlaklık, kontrast, doygunluk, sıcaklık, vinyet, siyah-beyaz oranı | grade karakteri (sinematik, arşiv, parlak) |
| SFX: kesimlerin kaçında ses vurgusu var (>~0,5 = kesimlere whoosh/hit konuyor) | sesin türü |

Görsel kontrol: her video için önce **yalnız `edit-dili-sayfa.jpg`** açılır (ilk 24 çekim + geçiş şeritleri), font kararı için `font-aday-01.jpg` açılır. Çok kanal varsa bunu Sonnet alt ajanı yapar, ana model yalnız şüpheli sayfayı görür.

## 3. İskelet ve yüzey ayrımı (özgünleştirmenin kuralı)
| İSKELET: rakipten alınır, korunur (±%20) | YÜZEY: stil DNA'sı seçer, değiştirilir |
|---|---|
| ilk 30 sn çekim sayısı ve medyan süresi, ilk %30 kesim/dk | palet / renk sınıfı, font çifti, hareket eğrisi |
| kancanın cümle yapısı ve ilk ana içeriğe kadar geçen süre | **animasyonlu arka plan** (kod ya da paket videosu), çerçeve/düzen |
| yumuşak geçiş **oranı** ve **süresi** (ms → `gecis_kare`) | geçiş **türü** (rakibin geçiş ailesi dışında) |
| kelime/çekim, kaynak türü oranı (gerçek/stok/AI/kart) | başlık girişi, altyazı stili, alt bant / sayı / alıntı / liste / zaman kartı |
| bilgi kartı sıklığı, SFX oranı, video uzunluğu, bölüm yapısı | kamera hareketi, doku, öğrenilmiş vurgu/kayma presetleri |

Kural (stil_dna.py kontrol eder): yüzeyde rakipten **en az 6/7 ölçülebilir eksen** farklı, kanalın son 3 videosundan **en az 6 eksen** farklı,
**klasik Claude skoru 0** (gece-kırmızı palet, aşağıdan-yay giriş, yumuşak yay hareketi, her karede gren+vinyet, yalnız Ken Burns içe — hiçbiri).
Kütüphanede kanıtı olan seçenek `STIL-DNA.md`'de kanıt kanalıyla gösterilir; kanıtı olmayan repertuar öğesi "yeni (repertuar)" diye işaretlenir ve
kullanılabilir (amaç rakipten ve klasik görünümden uzaklaşmak; ritim zaten rakipten geldiği için tutma riski yüzeyde düşüktür).

## 4. Stil DNA (elle kütüphane taraması YOK)
```
py scripts/stil_dna.py --rakip @Rakip --konu "<başlık + anlatılan olay>" [--gecmis v01/stil-dna.json ...] [--kilit palet,font] --cikti <videoNN>/
```
- **Ton konudan:** `--konu` (+ rakibin niş satırı ve başlıkları) → ciddi / gizem / enerjik / sakin (`--ton` ile elle de verilir). Tona uymayan yüzey elenir (ciddi/gizemde çizgi roman zemini, bokeh, esnek/zıplayan hareket, pastel yok).
- **Kütüphane nişi:** aynı tondaki (ortak anahtar kelimesi en çok olan) 12 kanalın ölçülmüş palet sınıfı, geçiş ailesi ve çerçevesi seçimi ağırlıklandırır; STIL-DNA.md'de listelenir. Rakibin kendi ailesi yine yasak, rakibin renk sınıfı geri planda.
- Rakibin `kanal.json` + `edit-dili.json`'larından imza çıkarır: geçiş aileleri, düzen dağılımı, altyazı ailesi (≥ 8 öğe/dk = yakılmış altyazı), renk sınıfı, doku, kamera, iskelet sayıları.
- Repertuardan (`repertuar.md`) ve varlıklardan (`varlik-paketleri.md`) A/B iki DNA seçer; `STIL-DNA.md` rakip vs A/B tablosunu, kanıt kanallarını (teknikler/ gözlem sayısı) ve kontrol satırını yazar.
- Benzer ritimli kütüphane kanallarını görmek gerekiyorsa (stil sohbeti, kanıt arama): `py scripts/kutuphane_ara.py --ritim <ilk30 medyan sn> --tolerans 0.3 [--gecis cozunme --duzen cerceveli --altyazi var --etiket edit]` (indeksi de yeniden üretir; token harcamaz).
- Kanalın ilk videosunda A/B önizleme render edilir ve kullanıcıya sorulur (`repertuar.md` §3); sonra A otomatik.

## 5. Kütüphaneyi büyütmek (her oturumun görevi)
- Ölçtüğün her rakip kütüphaneye girer (`kanal_isle.py` bunu otomatik yapar). EDIT-DILI.md profilini Sonnet alt ajanı yazar, sen kontrol edip `durum.txt`'yi `bitti` yaparsın. Brief'i kütüphanedeki `ARKADAS-ICIN-PROMPT.md` dosyasının 4. adımında bulursun.
- Yeni bir tekniği Remotion'a döktüysen repodaki `repertuar/` dosyasına ekle (`repertuar.md` §5), katalogla kontrol et, commit + `kurulum.py ayna`.
- Kendi bitmiş videonu da `edit_dili.py` ile ölç. Hangi yüzeyle çıktığını (`stil-dna.json` yolu + STIL-DNA kontrol satırı) kanalın `DEVAM.md` dosyasına yaz. Bu, tekrar eden içerik kontrolünde (`ozgunluk.md`) "son 3 videoya göre değişen eksen" sayımının kanıtıdır.

## 6. Toplu işleme (kullanıcı kanal listesi verdiğinde)
```
py "<KUT>/_araclar/kanal_isle.py" --liste "<KUT>/_kuyruk/<liste>.txt" --kim <ad> --paralel 2
```
- Bağımsız süreç olarak başlatılır (`Start-Process`, log dosyasına). Kanal başına ~10–20 dk sürer, 2 paralelle 200 kanal yaklaşık 1–1,5 gün eder. YouTube 429/bot uyarısı verirse paralel 1'e düşülür. Uyarı sürerse kullanıcıya sorulur; çerez kullanımı kullanıcının kararıdır.
- Disk: iş yerel geçici klasörde yapılır, kanal bitince silinir. Drive'a yalnız analiz gider (~2–5 MB/kanal); video saklanmaz.
- Profiller (EDIT-DILI.md) ölçümden ayrı, partiler halinde Sonnet ajanlarına yazdırılır (en çok 3 paralel). Ana model yalnız kontrol eder.

## 7. Doğrulama (aracı değiştiren herkes çalıştırır)
`edit_dili_test.py --kaynak <herhangi bir video>` doğru cevabı bilinen sentetik bir video üretir. İçinde 13 geçiş (sert, çözünme 0,5/0,2 sn, siyaha, beyaza, itme sola/sağa, zoom, wipe), bilinen zoom/pan hızları, inset, letterbox ve Anton fontlu yazılar vardır. Test analizi çalıştırıp `TEST-SONUC.md`'ye puan yazar.
Ölçülen sonuç (2026-11-17, iki farklı kaynakla): geçiş **26/26** doğru yer ve tip, yanlış alarm 0, süre hatası 0 kare. Kamera zoom/pan gerçeğin **±%5**'i içinde. Düzen 26/28 (kaçanlar kaynak görselin kendi bantları). OCR yazı/zaman/renk doğru, altyazı/başlık ayrımı doğru. Font: dış çizgisiz yazıda doğru font 1. sırada; dış çizgili yazıda aynı aile ilk 4'te (yüzü gözle doğrula).
Kural: `edit_dili.py` değişirse bu test **en az iki farklı kaynakla** çalışır ve skor düşmez. Düşerse değişiklik geri alınır.
Bilinen sınırlar: glitch/light leak gibi modele uymayan efektler `diger_efekt` ya da `bilesik_*` olarak işaretlenir, türünü sayfadan gözle adlandır. Sahne içindeki gerçek kamera ile Ken Burns ayrılmaz, ikisi de "hareket" olarak ölçülür.
