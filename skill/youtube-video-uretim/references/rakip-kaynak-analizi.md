# Rakibin kaynak araştırması — gerçek video mu, stok mu, AI mı? → bizim üretim yöntemi

Rakibin görüntüsünü **nereden** aldığını bilmeden doğru hattı seçemezsin: AI görselle yapılan bir kanalı gerçek arşiv görüntüsüyle kopyalamaya çalışmak boşa maliyet; gerçek footage kanalını AI görselle taklit etmek izleyiciyi kaybettirir. Bu adım rakip kare analizinin (`rakip-kare-analizi.md`) hemen ardından, **stil tarifi ve araç seçiminden önce** yapılır.

## 1. Kanıt kaynakları (hepsini kullan)
1. **Ölçüm** — `analiz.json`/`RAKIP-OLCUM.md`'deki `kaynak tahmini`: `GRS` durağan görsel (+Ken Burns), `VID` hareketli video, `KRT` grafik/kart; süre yüzdesi. Bu yalnız "hareket ediyor mu"yu söyler, türü söylemez.
2. **Gözle inceleme** — kontakt sayfaları + gerekirse tam çözünürlükte tek kare (`ffmpeg -ss <t> -i video -frames:v 1 kare.jpg`, temizlikten ÖNCE al). Aşağıdaki işaretler.
3. **Açıklama ve meta** — `aciklama-N.txt`, `secim.json → kaynak_ipuclari`: "Footage: Pexels/Storyblocks/Envato", "AI-generated", "archive/courtesy", "dramatized", "illustrative". YouTube'un "Değiştirilmiş veya sentetik içerik" etiketi video sayfasında görünür (tarayıcıda bak).
4. **Ters görsel arama** (stok/gerçek ayrımı için, 3–5 temsilî kare): tarayıcıda Google Lens / Bing Görsel'e kareyi yükle. Pexels/Storyblocks/Getty/Shutterstock sayfası çıkarsa stok; haber ajansı/arşiv/Wikimedia çıkarsa gerçek arşiv; hiçbir eşleşme yoksa AI veya özel çekim olasılığı artar. Kullanıcının hesabıyla oturum açma gerekmez; giriş isterse dur.
5. **Kanal geneli** — kanalın Shorts'ları, topluluk gönderileri, "hakkında" (araç/ajans adı geçebilir); aynı karelerin farklı videolarda tekrar edip etmediği (tekrar = sınırlı stok havuzu veya kendi AI havuzu).

## 2. Görsel işaretler
| Tür | İşaretler |
|---|---|
| **AI görsel (durağan)** | aşırı temiz/kusursuz ışık, plastik/pürüzsüz ten, bozuk eller-parmaklar, anlamsız yazı/tabela, simetrik yüzler, aynı karakterin sahneden sahneye ufak farkları, "fazla sinematik" bokeh, tutarsız gölge yönü; GRS + Ken Burns |
| **AI video** | VID ama: biçim değiştiren nesneler, kayan/eriyen detaylar, fiziksiz hareket (su, saç), yüzde titreme, 4–8 sn'lik klip uzunlukları, kesimlerin klip sınırında olması |
| **Stok video** | VID; jenerik B-roll (el yakın çekim, drone, şehir timelapse, laboratuvar), yüksek prodüksiyon ama konuya "yaklaşık" uyum, model sürümlü kişiler, aynı klibin başka kanallarda görülmesi; ters aramada stok sitesi |
| **Stok/gerçek fotoğraf** | GRS; doğal kusurlar (gren, lens bozulması, gerçek çevre dağınıklığı), EXIF benzeri gerçekçilik; ters aramada kaynak bulunur |
| **Gerçek arşiv / haber / film** | VID veya GRS; dönem kalitesi (gren, 4:3, renk solukluğu), kanal logosu/filigran, kırpılmış kenarlar, alt yazı bandı, gerçek olay ve kişiler; açıklamada "courtesy/archive/fair use" |
| **Ekran kaydı / harita / veri** | KRT veya GRS; arayüz öğeleri, Google Earth, grafik animasyon |
| **Sunucu / avatar** | konuşan yüz; HeyGen/D-ID tipi ağız senkronu, sabit duruş, el hareketi az |
| **Grafik/kart** | KRT; düz zemin + yazı/ikon, kinetik tipografi |

Emin değilsen "olasılıkla" de; her tür kararının yanına 1 kanıt yaz.

## 3. Rapor → `rakip-analiz/<kanal>/KAYNAK-ANALIZ.md`
```
| Video | Bölüm | AI görsel % | AI video % | Stok video % | Stok/gerçek foto % | Gerçek arşiv % | Kart/grafik % | Harita % | Sunucu % |
Her satır süre yüzdesi (ilk30 / yüzde30 / tüm ayrı). Altında: kanıtlar (kare zamanı + işaret + ters arama sonucu), görsel stil (ışık, palet, dönem, kadraj), tekrar eden öğeler.
```

## 4. Karar: bizim üretim yöntemi
Kural: **rakibin kaynak karışımını ve oranını koru** (izleyici o dokuya alışık), ama malzemeyi kendimiz üret/lisansla. Oranı özellikle ilk 30 sn ve ilk %30'da tut.

| Rakipte baskın | Bizim karşılığımız | Not |
|---|---|---|
| AI görsel + Ken Burns | Google Flow Nano Banana Pro (16:9, x2), stil kilidi + karakter/mekân değişkenleri | `gorsel-ve-kapak.md`; zoom hızı RAKIP-OLCUM'dan |
| AI video | Flow Video (kredi yer → **kullanıcı onayı**), veya AI görsel + paralaks/hareket kartlarıyla taklit | maliyeti kullanıcıya söyle, kısa klip (4–8 sn) |
| Stok video | Magnific stok (günlük ~100 indirme), konu başına arama listesi; oranı rakiple eşle (sağlık hattında ≥%35–40) | aynı klibi iki videoda kullanma |
| Stok/gerçek foto | Magnific / Wikimedia Commons (lisans + künye sabit yoruma) / kullanıcının izinli kaynağı | kredi zorunlu |
| Gerçek arşiv / haber / film klibi | kısa, dönüştürücü, kredili kullanım (gerçek footage hattı: kaynak tsv, transcode, filigran kırpma); mümkünse kamu malı/Commons arşivi | **telif riskini kullanıcıya açıkça söyle**, kararı o versin; uzun kesit yok |
| Sunucu | HeyGen Avatar III | `heygen.md` |
| Kart/grafik/harita | Remotion kart sistemi, `Karte.tsx` | oran ve sıklık rakiple aynı |

Karışık kanallarda (ör. %50 stok video + %30 AI görsel + %20 kart) PLAN'da her çekime kaynak türü etiketi koy (`kaynak: 'stok'|'flow'|'kart'|…`) ve sayımı hedefe göre kontrol et.

Kullanıcıya tek tabloyla sun: "Rakip: … → Önerim: …, maliyet/risk: …" ve onay al (yeni kanalda stil tarifiyle birlikte). Karar DEVAM §2'ye kilitli karar olarak yazılır.

## 5. Yasaklar
- Rakibin kendi karelerini, kliplerini, AI görsellerini indirip kullanmak (analiz kopyası yalnız ölçüm içindir ve temizlenir).
- Lisansı belirsiz görseli kredisiz kullanmak; AI görseli gerçek fotoğraf/belge gibi sunmak (tarih/haber kanallarında "temsilî" notu).
- Gerçek kişiyi AI ile gerçekmiş gibi bir olayda göstermek.
