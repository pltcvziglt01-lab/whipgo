# Kurgu (Remotion / ffmpeg), render ve kalite kontrol

Remotion mimarisi, bileşen listesi, ffmpeg motoru ve Shorts tarifi ayrıntısı: `dersler-akiya-medical.md`. SFX yerleşimi: `sfx.md`.

## Önce deneme (yeni kanal / yeni stil)
20–30 sn'lik deneme render'ı çıkar; çerçeve, zoom, altyazı stili, geçiş, vurgu rengi için 2–3 seçenek göster. Onaydan sonra tam video. Altyazı ve efekt sade, göze rahat. Render'dan önce düşük çözünürlüklü tek kare (`npx remotion still … --frame=N`) kontrolü — her yeniden render ek bekleme demektir.

## Edit dili kaynağı (her kanal)
- Görsel dil `stil-dna.json`'dan gelir; bileşenler repodaki `repertuar/` (`repertuar.md`). Kanal projesi `varlik_kur.py kanal <motion>` ile bağlanır (src/repertuar, public/fontlar, public/varlik).
- Yeni kanal: `sablon-proje/` klasörünü `C:\otomasyon\<kanal>\motion` olarak kopyala, `npm install`, sonra `kanal` bağlantısı.
- Aşağıdaki Hund/Akiya notları hat mimarisi içindir; oradaki renk/font/geçiş örnekleri o kanallara özeldir, yeni kanala taşınmaz.

## Remotion (sunuculu referans hat — Hund)
- **Kalite kapıları** (tam render öncesi 3 onay, render sonrası `kalite_kapisi.py`, `yazi_kontrol.py`, `senkron_kontrol.py`, `karsilastir.py`, jüri): `kalite-kapilari.md`. Son ses miksi `ses_miks.py` (müzik kısma + SFX + −14 LUFS; hız değişmez).
- Yeni Remotion projesinde bir kez `npx remotion skills add` (resmî kurallar). Overlay için `@remotion/lottie`, karmaşık zaman çizelgesi için `@remotion/gsap`, 3D için `@remotion/three`; ne zaman ve hangi lisansla: `arac-yigini.md`. Kesimleri müziğe oturtmak için librosa beat ızgarası.
- `motion/src/VideoMM.tsx` → `VideoNN.tsx`; tüm `vMM`→`vNN`, `VideoMM`→`VideoNN`. `cumleler.json` → `motion/src/vNN-cumleler.json`. `Root.tsx`: `import { VideoNN, SURE_KARE as VNN_KARE } from './VideoNN';` + `<Composition id="VideoNN" …/>`.
- Değişen bloklar: `IRKLAR` (`{n, ad, koken, boy, a: ilk cümle, b: sonraki bölümün ilk cümlesi}`), `RECAP_ILK`, `PLAN`.
- Kart sözlüğü: `H(n)` tam ekran sunucu · `R(n,'gorsel',{etiket, ort, odak, an: wt(n,'kelime')})` · `S(n,'S_x')` karakterli sahne (facecam gizli) · `RASSE(n,'gorsel')` · `{c, tip:'SAYI', sayi, bicim, alt, kaynak, on}` · `{c, tip:'ZITAT', metin, kaynak}` · `{c, tip:'TIPPS', baslik, ogeler}` · `{c, tip:'RECAP'}` · `{c, tip:'KARTE', baslik, kutu, vurgu, noktalar, rota, kaynak}`. Cümle içi kesim: `{ ...R(6,'g'), ts: wt(6,'kelime') }`.
- PLAN kuralları: cümle no'ları artan, tekrar yok (montaj hariç); kesim cümle başı +0,26 sn; medyan çekim ~5–6 sn (rakip SPEC'i farklıysa SPEC); H en geç ~80–90 sn; açılışta H(0)+R(0) yok; her videoda 1–3 KARTE; görsel cümlenin birebir resmi.
- Doğrula: sıralı mı / tekrar var mı / H aralığı → `npx tsc --noEmit -p .` (VideoNN hatası yok).
- Remotion kuralları: kompozisyon id yalnız `a-zA-Z0-9-`; `staticFile` yolu `/` ile başlamaz; yerel fontlar; bileşene çıkış fade'i koyma.

## ffmpeg montaj hattı (faceless slayt / tahta)
Ken Burns yalnız içe (~%0,47/sn), xfade 0,1–0,2 sn (veya şablona göre sert kesim), 1920×1080 30 fps. Tam spec: `dersler-akiya-medical.md`.

## Render
- `videoNN/bitir.sh` önceki videodan kopyalanır — **içindeki bütün vMM/videoMM/VideoMM yollarını değiştir** (yanlış klasöre render yaşandı).
- `npx remotion render src/index.ts VideoNN ../videoNN/vNN-ham.mp4 --concurrency=4 --crf=18 --timeout=120000 --log=error`
- Ses: `ffmpeg -i vNN-ham.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11" -c:a aac -b:a 192k -movflags +faststart <ad>-vNN.mp4`
- Bağımsız süreç + `render.log`. Render çıktısını `| tail`/`| grep`'e borulama (sessizce düşüyor). Başka oturumun render'ı CPU'yu paylaşıyorsa süre 2 katına çıkar. `@remotion/media` decoding error'unda parçalı render (5000 kare) + concat. "waiting for frame … timeout" → `--timeout=120000`, concurrency düşür. "x264 malloc failed" → ağır işleri sıraya koy.
- Renk: yuv420p **tv/bt709** (`yuvj420p` Windows'ta açılmaz: `scale=in_range=pc:out_range=tv`, `-color_range tv`).

## QC — `scripts/qc.py <final.mp4> --vo vo.mp3 [--onizleme]`
Betik ölçer ve ızgaraları üretir; sen Read ile **bakarsın**:
- Süre = vo (±1 sn).
- `ebur128` Integrated −14 ±0,5 LUFS, tepe < −1 dB.
- 18 karelik ızgara (`fps=1/(süre/18),scale=480:-1,tile=3x6`) + ilk 33 sn ızgarası + açılış karesi.
- Bak: açılışta yüz açık, altyazı okunur, Nr. rozetleri doğru, karakterli sahnede facecam gizli, siyah/yeşil/beyaz kare yok, kart şablonlarında konu adı (il/ırk) bu videonunki.
- Tempo kontrolü: `py scripts/kare_analiz.py <final.mp4> --cikti qc/tempo` → ilk 30 sn ve ilk %30 tablosunu `RAKIP-OLCUM.md` hedefleriyle karşılaştır (çekim sayısı, medyan süre, kelime/çekim, kaynak türü oranı).
- Hata varsa yalnız o aralığı `--frames=a-b` ile yeniden render et ve birleştir.
- Kontakt sayfası üretirken kaynağı ve kare aralığını doğrula (yanlış dosyadan sayfa üretme hatası 3 kez yaşandı).
