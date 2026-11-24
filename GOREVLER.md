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
| 1 | Okunurluk: taşan başlık, küçük yazı tabanı (ana ≥64, ikincil ≥40, en az 32 px), sayı kartı çeşitliliği (kaynak görüntü zemini, anlamlı yüzde), altyazı konturu + medya perdesi, kelime kartı alt üçte bir, yazma animasyonu ≤1 sn, aktif kelime taşması, zemin-perspektif sığdırma | v04 `yazi_kontrol --plan` taşma FAIL 0; telefon sayfasında tüm ana yazılar okunur | ajan çalışıyor |
| 2 | v04'ü tüm yeniliklerle baştan render + kapılar + izleyici incelemesi | standart 4; eski/yeni yan yana | #1'den sonra |
| 3 | Galeri kuralları → varsayılanlar: kamera hiç durmaz (sabit = 1,00→1,02 nefes, tutuşta yavaş itme), tam durgunluk ≤1,5 sn kapısı, yasak efektler tona bağlı (glitch/ışık patlaması yalnız enerjik), `yay-esnek`/`geri-sekme` ciddi-gizem-sakinde kapalı, aynı geçiş art arda ≤2 ve pay ≤%25, palet tek vurgu, `yazi_kontrol` kontrast 4,5:1 + boy kapısı | standart 1–3; katalog önce/sonra | #1'den sonra (aynı dosyalar) |
| 4 | Galeri teknikleri (öncelik 3): cubuk-trend, italik-vurgu, nesne-dalisi, bolum-cetveli, yil-tarama, ustu-cizili-degisim, nokta-oran-izgarasi, hayalet-yil, odak-karartma, bolum-numarasi, cubuk-yarisi, belge-tarama-isigi | her biri TİP + etiket + katalog karesi gözle; dogrula PASS | #1'den sonra |
| 5 | Kaynak videodaki gömülü yazı (altyazı, haber bandı) ile bizim alt bant/altyazı çakışması: kaynak OCR bölgesi → kurgu orada yazı koymaz/taşır | v04'te 80 sn "Good morning." çakışması yok | açık |
| 6 | Çerçeve oranı ölçümü: gerçekleşen çerçeveli oran `iskelet.cerceveli_oran` ±%5 dışında UYARI (`kurgu_denetim`) | v04 film şeridi sıklığı raporda görünür | açık |
| 7 | Video tonu kanal tonunu ezebilmeli: şablonlu kanalda trajik/sakin olay (`--konu`) tonu değiştirebilsin, kimlik sabit kalsın | futbol şablonunda "çöküş/trajedi" videosu ciddi ton | açık |
| 8 | Konu sözlüğü: `deniz` (gemi, batık, okyanus) konusu + palet/his eşlemesi; niş kanal konu etiketi hataları (@JohnWayneLegacyYT teknoloji sanılıyor) | deniz şablonu deniz renginde; EV nişinde alakasız kanal yok | açık |
| 9 | `kanal_sablon` rakip 3 video garantisi: kütüphanede 1 videoyla ölçülmüş rakibi 3'e tamamla | `KANAL-SABLONU.md` "3 video" yazar | açık |
| 10 | Önizleme medyası konuya göre (hep aynı asker fotoğrafları), dil kitleye göre (Almanca kitle → Almanca metin) | deniz/şehir/futbol önizlemesi kendi görselleriyle | açık |
| 11 | ffmpeg hattı için `sfxPlani` → `ses_miks.py --sfx` json çevirici (belgede "henüz yok") | Remotion dışı kanalda SFX miksi çalışır | açık |
| 12 | Beat ızgarası (müzikli/enerjik kanallar): kesim ve büyük hareket vuruşa ±0,15 sn | müzikli deneme videosunda kesimlerin %80'i vuruşta | açık |
| 13 | Paylaşılan eleman (morph) geçişi: giden sahnenin nesnesi gelen sahnenin parçası | katalogda 2 sn mp4 gözle | açık |
| 14 | Drive kütüphane bakımı: `teknikler/inset-vinyetli-kutu/TANIM.md` eksik; EDIT-DILI atıf yaptığı ama yazılmamış gözlem dosyaları (harita-rota, alinti-karti, madde-listesi-karti, gercek-arsiv, ekran-ici-tv) | `profil_kontrol.py` temiz | açık |
| 15 | Belge temizliği: SKILL/references'ta olmayan betik adları (`kontakt.py`, `uret.py`) | dogrula belge UYARI'sı yok | açık |
| 16 | @StillInsideFilms uçtan uca test: 3 video ölç → kanal şablonu → deneme video bölümü → kapılar → izleyici incelemesi | standart 3–4 | #1–4'ten sonra |
| 17 | Skill paketi + masaüstü `ON NUMARA II\GITHUB ENTEGRE.skill`; kullanıcı claude.ai'ye yükler | paket tarihli ve güncel | her büyük turdan sonra |
| 18 | (izin gerekir) CC0 SFX paketleri ve lisanslı stok medya avı (Wikimedia/Openverse) + kredi satırları | kullanıcı indirme onayı | bekliyor |

## Kapanan (2026-11-24)
- Kurgu denetimi (yazı okuma süresi, yazı-ses senkronu, klip süresi, döngü) + otomatik düzeltme — `kurgu_denetim.py`
- Otomatik SFX (tepe senkronu, örnek tepesine göre seviye) — `Sfx.tsx`, duman testinde 3 olay, v04'te 130 olay, VO'nun 13 dB altında
- Döngüsüz kamera, iki başlık girişi, vuruş paketi, doğal hareket + hareket bulanıklığı
- Font kalınlık hatası (değişken fontlar en ince kesimle çiziliyordu) + gövde/mono ≥600
- Sistem doğrulama (`dogrula.py`) + pre-commit kancası; sahne kurucu (`sahne_kur.py`); kanallar ortak şablona bağlı
- YouTube kullanım kanıtı (`youtube_dili.py`, 176 kanal) + rakip→biz çeviri + kanal şablonu (`kanal_sablon.py`); 6 konsept testi tur 2: 5/6 belirgin iyileşme, şablonlar arası fark 2→4
- Kapı yanlış alarmları (kusur 3→0, kalite %17→%1,1, yazı 303→7)
- Yazı-ses ölçümü (`yazi_senkron.py`) rakip hattında
- 17 kanal profili + 11 yeni teknik; 418 galeri videosu işlendi (66 teknik, `repertuar/envanter/opus-galeri/`)
