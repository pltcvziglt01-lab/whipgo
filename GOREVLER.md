# GÖREVLER — yaşayan eksik listesi (yönetici: ana oturum)

Her oturum işe başlamadan bu dosyayı okur; iş bitince satırı **Kapanan**'a taşır (tarih + kanıt). Yeni eksik bulunca buraya yazılır,
sohbette bırakılmaz. Kalite standardından geçmeyen iş kapanmaz.

## Kalite standardı (her iş için kabul ölçütü)
1. `py -I skill/youtube-video-uretim/scripts/dogrula.py --hizli` PASS (pre-commit kancası zorunlu kılar); repertuar/motor değişikliğinde `--tam` PASS.
2. **Gözle kontrol (yönetici bakar, ajan raporu kanıt değildir):** repertuar değişikliği → ilgili katalog karesi render edilip açılır;
   yazı değişikliği → 360 px telefon küçültmesi; geçiş/hareket → ardışık 3–4 kare ya da 2 sn mp4.
3. Motor/seçim değişikliği → 6 konsept testi (`repertuar/envanter/sablon-testi/` yöntemi): konuya uygunluk, AE hissi, okunurluk, gerekçe, şablonlar arası fark ≥ 4/5.
4. Video → `kurgu_denetim` 0 FAIL, `kusur_kontrol` + `kalite_kapisi` + `yazi_kontrol --plan` PASS, izleyici gözüyle inceleme (her 20 sn kare, 5 rastgele 3 sn bölüm, telefon sayfası).
5. Kullanıcı kuralları her zaman: AE görünümü (Claude şablonu değil), kalın ve okunur yazı, konuya uygun edit dili, her video ≥ %20 özgün, kanallar birbirine benzemez, SFX zorunlu.

## Açık (öncelik sırası)
| # | İş | Kabul ölçütü | Kim / durum |
|---|---|---|---|
| 0e | **KAYNAK TEMIZLIGI (v4 bulgusu, hak/kalite riski):** kaynak kliplerde baska kanalin Subscribe butonu, fare imleci ve BEANYMAN SPORTS logosu var (76-78, 159-163 sn; logolu kaynak surenin ~%30'u). SKILL kurali zaten 'rakibin videosu asla, yalniz CC BY'; v04 kaynaklari eski donemden. Cozum: kaynak secimi/indirmede arayuz-filigran tespiti (kaynak_yazi OCR'i buton/imlec/logo desenlerini 'yabanci arayuz' olarak isaretlesin) -> o klip reddedilir ya da kirpilir; kurgu_denetim FAIL | v04 kaynak listesinde yabanci arayuzlu klip 0; yeni indirmelerde otomatik ret | acik (gorsel-kaynak devami) |
| 0f | Gecis kumelenmesi: iki yumusak gecis arasi >= 2 sn (v4: 23/124 gecis <1,5 sn arayla) | kurgu_denetim gecis-araligi kontrolu; v5 planinda kume 0 | sahne-cesitliligi sekmesine iletildi |
| 0d | **YEREL AI (kullanici istegi, 'PewDiePie'in AI'i' = odysseus-dev/odysseus):** Ollama + qwen3:8b + qwen2.5vl:7b kurulumu + `yerel_ai.py` (konu/ton, sahne firsati, stil adi, kare jurisi, kurgu onerisi). Odysseus KURULMAYACAK (AGPL, agir sohbet uygulamasi, council ozelligi repoda yok); 4 deseni yeniden yazilarak alinacak: hakem cikti ayristirici, GPU slot kilidi, iki orneklemeli kor juri, 'emin degil -> somut soru'. Entegrasyon kancalari (stil_dna --llm, sahne_zengin, kanal_sablon, juri adimi) ana oturumda. GENISLETME (kullanici 2026-11-25: 'maksimum verim, cogu isi cozsun'): profil_taslak (kanal profili taslagi, vision), qc_triyaj (kapi raporu eleme); sonraki dalga: kapak analizi taslagi, teknik envanter taslagi, baslik adaylari, SFX/etiket onerileri, adim defteri yorumu. Kural degismez: taslak/oneri uretir, kapilar ve ana oturum dogrular | isabet tablosu kelime yonteminden iyi; juri ciktisi makul; Ollama'siz sistem ayni calisir | yerel-ai sekmesi |
| 0c | **3 EDIT STILI SECENEGI (kullanici istegi):** kanal_sablon 6 secenek uretip en uygununu kendisi seciyor; yerine konuya uygun ve birbirinden belirgin farkli 3 secenek (A/B/C), her biri icin ~10 sn onizleme mp4 + kare sayfasi + gerekce; kullanici secer (`--sec B`), secilen kanal kimligi olur | 3 onizleme birbirinden en az 6 gorunur eksende farkli, hepsi uyum > -0.6; kullaniciya yan yana gosterilir | ana oturum (gorsel-kaynak kanal_sablon'u biraktiktan sonra) |
| 0b | **SES TASARIMI (kullanici: 'SFX tirt, hepsi kullanilmiyor'):** rol basina 2 ses, 98 dosyanin 46'si, sahneye ozgu ses davranisi yok (sayac tiki, yazma, liste, grafik, rota, bolum yukselmesi, doruk sessizligi), cekingen seviye; 1298 CC0 ses bagli degil | rol basina 3-5 aday, dakikada ayni ses <=2; KatSes + v04 60 sn once/sonra; seviye tablosu | ses-tasarimi sekmesi |
| 0 | **KENDINI TEKRAR EDEN EDIT (kullanici sikayeti, en yuksek oncelik):** VideoDna cekim basina yalniz goruntu/kelime/sayi/alinti/alt bant uretiyor; harita, grafik, zaman, liste, karsilastirma, bolum, degisim, coklu medya, HUD videoya hic girmiyor; kart eksenlerinde tek varyant. Cozum: zengin sahne turleri + tur ici varyant + anlatimdan sahne firsati cikarici + tekrar denetimi + VIDEO DUZEYINDE DRAMATURJI (kanca/bolumler/doruk/kapanis, bolum basina muamele; letterbox/HUD/renk tonu bolum durumu — cekim basina giris yok, v04'te letterbox 50 kez giriyordu) + efekt butcesi (imza efektler anlama bagli, sayi/aralik siniri) | her 60 sn'de >=3 farkli sahne turu; ayni kart+varyant 2 dk'da <=3; letterbox girisi bolum sayisi kadar; efekt butcesi FAIL yok; v04 tur seridi once/sonra; izleyici gozu 'tekrar etmiyor' | sahne-cesitliligi sekmesi |
| 2 | v04'ü tüm yeniliklerle baştan render + kapılar + izleyici incelemesi | standart 4; eski/yeni yan yana | #1'den sonra |
| 10 | Önizleme medyası konuya göre (hep aynı asker fotoğrafları), dil kitleye göre (Almanca kitle → Almanca metin) | deniz/şehir/futbol önizlemesi kendi görselleriyle | açık |
| 12 | Beat ızgarası (müzikli/enerjik kanallar): kesim ve büyük hareket vuruşa ±0,15 sn | müzikli deneme videosunda kesimlerin %80'i vuruşta | açık |
| 13 | Paylaşılan eleman (morph) geçişi: giden sahnenin nesnesi gelen sahnenin parçası | katalogda 2 sn mp4 gözle | açık |
| 14 | Drive kütüphane bakımı: `teknikler/inset-vinyetli-kutu/TANIM.md` eksik; EDIT-DILI atıf yaptığı ama yazılmamış gözlem dosyaları (harita-rota, alinti-karti, madde-listesi-karti, gercek-arsiv, ekran-ici-tv) | `profil_kontrol.py` temiz | açık |
| 16 | @StillInsideFilms uçtan uca test: 3 video ölç → kanal şablonu → deneme video bölümü → kapılar → izleyici incelemesi | standart 3–4 | #1–4'ten sonra |
| 17 | Skill paketi + masaüstü `ON NUMARA II\printerv1.skill`; kullanıcı claude.ai'ye yükler | paket tarihli ve güncel | her büyük turdan sonra |
| 21 | Drive profil hatalari (3 kanal EDIT-DILI.md'de sert/yumusak gecis sayilari yok) | profil_kontrol 0 hata | acik |
| 10b | Onizleme: --foto/--dil eklendi; varsayilan gorseller hala asker fotograflari — konu notr ornek gorsel seti | 6 sablonda farkli gorsel | acik |
| 31 | Ust uc birde altyazi bazen konusanin basina biniyor (v04 #98); ust orta kelime karti letterbox'a 10 px | v04 karesi | acik |
| 32 | adim_kontrol sertlestirme: kapi raporlarinin ICINDEKI PASS/FAIL okunsun (su an dosya varligi); risk raporu tarihi mtime yerine icerikten | sahte/bos kanit yakalanir | acik |
| 18 | CC0 SFX paketleri (cc0-sfx sekmesi) + lisanslı gerçek görüntü avı ve rakip kaynak türü → kaynak stratejisi (gorsel-kaynak sekmesi) | Sfx paletinde CC0 secenek; kanal sablonunda kaynak plani; test sahnesi icin kaynakli gercek gorsel | sekmelerde (kullanici onayi 2026-11-24) |
| 32 | Harita sahnesi videoda yok: sahne_zengin yer adlarini (to Barcelona, from Lille) yalniz RAPOR ediyor; koordinatli harita zemini (Avrupa/dunya gorseli + lat/lon -> x,y projeksiyonu) yok | v04'te 'to Barcelona' rota karti, gozle | acik (sahne-zengin bulgusu) |
| 33 | Sahne turlerinin SFX'i tam miksle kulakla dinlenmedi: v5 4 bolgede (bolum 'vurgu', yil 'yukselme'+'vurgu', grafik 'yukselme', karsilastirma 'sayi') tepe -13..-20 dB olculdu; VO ile birlikte denge kontrolu yok | v5 tam render + kalite_kapisi SFX satiri | acik |
| 34 | Tur ici varyant yalniz DNA'nin 2 secenegi: liste/zaman/grafik 3. varyant ve kelime kartinin ucuncu yerlesimi yok; uzun videoda (20+ dk) ayni anahtar yine 2 dk'da 3'e yaklasabilir | 20 dk denemede ayni-varyant-tekrar 0 | acik |
| 35 | Secenek onizlemesinde yazi boyutu kapisi yok: A'nin acilis basligi ince italik ve kucuk, liste/zaman satirlari ~24 px, '420 KM' egik; yazi_kontrol --plan onizlemeye de kosulmali (OKUNUR tabani) | SECENEKLER.jpg telefon boyutunda okunur | acik |
| 36 | Muzik yatagi yok: sfx-kutuphane'de ambiyans/drone/muzik 0 oge; ses_miks --muzik var ama lisansli (CC0/CC BY) muzik havuzu ve tona gore secim yok. VO Remotion render'ina girmiyor, miks elle (render sesi + vo) | belgesel denemesinde tona uygun CC0 muzik -20 dB, konusmada sidechain | acik |
| 37 | 20 sn'lik kancada sahne_zengin 0 firsat buldu (1944 tarihi, 'decades later' degisimi, Hurtgen yer adi); kisa planda zaman/degisim/harita sahnesi onerilmiyor | ayni metinde >=1 zengin sahne | acik |

| 38 | Alinti karti acik video zeminde (B: ab-34 kagit dokusu) BEYAZ yazi — okunmuyor; liste/zaman/oran izgarasi koyu paletlerde (orman-altin) zemine karisiyor. Yazi rengi zemin parlakligina gore secilmeli (kontrast >= 4.5:1) | predateur SECENEKLER B'de alinti/liste/zaman telefon boyutunda okunur | acik (predateur bulgusu 2026-11-26) |
| 39 | Onizlemede HUD derinlik-cetvel konudan bagimsiz '420 m' gosteriyor; sayi bicimi dile gore degil (FR '2 300', DE '2.300'; su an hep '2,300') | fr onizlemede '2 300'; HUD degeri ornek icerikten | acik |

## Kapanan (2026-11-26)
- `doga` konusu (vahsi yasam/hayvan): stil_dna KONU_KELIME (EN/FR/DE/TR/ES) + ton ciddi + his sinematik/belgesel/sicak, 84 repertuar ogesine etiket; `konu_kapi` etiketi (gizli belge/sansur/terminal/dosya sekmesi/stencil yalniz kendi konusunda). Oncesi: hayvan konseptinde zeytin-askeri palet + asker fotolari + CLASSIFIED damgali alinti; sonrasi: predateur SECENEKLER A/B/C konuya uygun (yonetici gozle)
- #10/#10b kismen: kanal_sablon `--ornek` (konunun ornek icerigi) + `--dil fr`; Onizleme.tsx bolum2/zaman/grafikBaslik/grafikler dil-icerik ile ezilebilir (Ingilizce 'Part 2', 'Share by region', 1939-1945 sabitleri kalkti)
- kanal_isle.py varsayilan --kok: repo kopyasindan calisinca sonuc repoya yaziliyordu; artik EDIT_KUTUPHANE > ust klasor (kanallar/ varsa) > Drive

## Kapanan (2026-11-24/25)
- #0g adim defteri kapisi: adim_kontrol.py + uretim-defteri.md; TAM VIDEODA HER FAZ ZORUNLU, 'atlandi' = FAIL, kapsam disi yalniz nesnel tespit; 6 kapak/6 sekme sayiliyor; v04 geriye donuk test 11 gercek eksigi yakaladi; yonetici cikis kodu + JSON dogruladi (commit, agac yesilince)
- #30 kurgu_denetim cerceveSec taklidi (v04 %50/%50, kodla ayni), etiket_ust kelime karti/altyazi icin de (4 cakisma -> 0)
- #27 gercek italik fontlar (PlayfairDisplay/DMSerifDisplay/EBGaramond/SourceSerif4, OFL) — italik-vurgu gercek italikle (yonetici gozle onayladi); dogrula kopya font klasorundeki eksikleri uyarir
- #19 alt bant/altyazi kaynak yazisindan kacar (etiket_ust; 80,9 sn kanit yonetici onayi)
- #20 cerceveSec kotali dagilim (v04 %50; rapor taklidi #30)
- #22 OKUNUR.enaz 36, ust satir 4,5:1
- #25 videoda Ken Burns <= 1,08
- #26 tint-sizinti tek vurgu
- #28 odak bilgisi (nesne-dalisi, HUD bolge, odak-karartma)
- #29 onizleme grafik verisi + yil-tarama tipi
- #4 galeri teknikleri: 12 tip (cubuk-trend, nokta-oran-izgarasi, cubuk-yarisi, italik-vurgu, ustu-cizili-degisim, bolum-numarasi, nesne-dalisi, bolum-cetveli, hayalet-yil, belge-tarama-isigi, odak-karartma) — telefon 360 px karesi yonetici tarafindan onaylandi
- #23 stil_dna en az 4 gecis tipi (D-Day: 4 tip)
- #24 duragan pay ve 8 sn hareketsiz cekim uyarisi pencereli olcum (nefes duragan sayilmaz)
- #3 galeri kurallari varsayilan: kamera hic durmaz (nefes), sekmesiz ton, yasak efektler yalniz enerjik, gecis plani (art arda <=2), durgunluk kapisi 1,5 sn (pencereli), kontrast 4,5:1 + boy kapisi — gecis sinirlari yonetici tarafindan gozle onaylandi
- #1 okunurluk — v04 telefon karsilastirmasi yonetici tarafindan gozle onaylandi (c4a7487)
- #5 kaynak gomulu yazi — kaynak_yazi.py + kurgu_denetim UYARI; v04 13 cakisma (77,9 sn "Good morning." dahil)
- #6 cerceve orani olcumu — v04 %14 (hedef %15); asil tekrar film-seridi (49 cercevenin 32si)
- #7 video tonu kanal tonunu ezebilir (fecaf86)
- #8 deniz konusu + derin-deniz paleti; deniz sablonu deniz renginde (yonetici testi)
- #9 kanal_sablon rakip 3 video garantisi (fecaf86)
- #11 sfx_plan.py (ffmpeg hatti SFX plani, Sfx.tsx ile ayni mantik)
- #15 belge temizligi — dogrula 0 UYARI
- Kurgu denetimi (yazı okuma süresi, yazı-ses senkronu, klip süresi, döngü) + otomatik düzeltme — `kurgu_denetim.py`
- Otomatik SFX (tepe senkronu, örnek tepesine göre seviye) — `Sfx.tsx`, duman testinde 3 olay, v04'te 130 olay, VO'nun 13 dB altında
- Döngüsüz kamera, iki başlık girişi, vuruş paketi, doğal hareket + hareket bulanıklığı
- Font kalınlık hatası (değişken fontlar en ince kesimle çiziliyordu) + gövde/mono ≥600
- Sistem doğrulama (`dogrula.py`) + pre-commit kancası; sahne kurucu (`sahne_kur.py`); kanallar ortak şablona bağlı
- YouTube kullanım kanıtı (`youtube_dili.py`, 176 kanal) + rakip→biz çeviri + kanal şablonu (`kanal_sablon.py`); 6 konsept testi tur 2: 5/6 belirgin iyileşme, şablonlar arası fark 2→4
- Kapı yanlış alarmları (kusur 3→0, kalite %17→%1,1, yazı 303→7)
- Yazı-ses ölçümü (`yazi_senkron.py`) rakip hattında
- 17 kanal profili + 11 yeni teknik; 418 galeri videosu işlendi (66 teknik, `repertuar/envanter/opus-galeri/`)
