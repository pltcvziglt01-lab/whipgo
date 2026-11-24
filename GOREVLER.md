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
| 2 | v04'ü tüm yeniliklerle baştan render + kapılar + izleyici incelemesi | standart 4; eski/yeni yan yana | #1'den sonra |
| 10 | Önizleme medyası konuya göre (hep aynı asker fotoğrafları), dil kitleye göre (Almanca kitle → Almanca metin) | deniz/şehir/futbol önizlemesi kendi görselleriyle | açık |
| 12 | Beat ızgarası (müzikli/enerjik kanallar): kesim ve büyük hareket vuruşa ±0,15 sn | müzikli deneme videosunda kesimlerin %80'i vuruşta | açık |
| 13 | Paylaşılan eleman (morph) geçişi: giden sahnenin nesnesi gelen sahnenin parçası | katalogda 2 sn mp4 gözle | açık |
| 14 | Drive kütüphane bakımı: `teknikler/inset-vinyetli-kutu/TANIM.md` eksik; EDIT-DILI atıf yaptığı ama yazılmamış gözlem dosyaları (harita-rota, alinti-karti, madde-listesi-karti, gercek-arsiv, ekran-ici-tv) | `profil_kontrol.py` temiz | açık |
| 16 | @StillInsideFilms uçtan uca test: 3 video ölç → kanal şablonu → deneme video bölümü → kapılar → izleyici incelemesi | standart 3–4 | #1–4'ten sonra |
| 17 | Skill paketi + masaüstü `ON NUMARA II\GITHUB ENTEGRE.skill`; kullanıcı claude.ai'ye yükler | paket tarihli ve güncel | her büyük turdan sonra |
| 21 | Drive profil hatalari (3 kanal EDIT-DILI.md'de sert/yumusak gecis sayilari yok) | profil_kontrol 0 hata | acik |
| 10b | Onizleme: --foto/--dil eklendi; varsayilan gorseller hala asker fotograflari — konu notr ornek gorsel seti | 6 sablonda farkli gorsel | acik |
| 30 | kurgu_denetim: cerceve_olc yeni cerceveSec mantigini taklit etsin; etiket_ust UYARI'si kalksin; --duzelt cozemedigi kelime karti/altyazi cakismasina etiket_ust koysun | rapor %50 gosterir | alt model |
| 31 | Ust uc birde altyazi bazen konusanin basina biniyor (v04 #98); ust orta kelime karti letterbox'a 10 px | v04 karesi | acik |
| 18 | CC0 SFX paketleri (cc0-sfx sekmesi) + lisanslı gerçek görüntü avı ve rakip kaynak türü → kaynak stratejisi (gorsel-kaynak sekmesi) | Sfx paletinde CC0 secenek; kanal sablonunda kaynak plani; test sahnesi icin kaynakli gercek gorsel | sekmelerde (kullanici onayi 2026-11-24) |

## Kapanan (2026-11-24)
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
