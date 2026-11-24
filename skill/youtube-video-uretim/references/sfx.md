# Ses efektleri (SFX)

## Kaynak ve lisans
Kullanıcının iki paketi var: **SFX_Pack_Mini** (~80 dosya, @adobebasics) ve **Ultimate 500 Preset Pack** (BONUS/Sound Effects Pack, 18 dosya + Premiere preseti + 3 "headless avatar" karakter PNG/PSD).
- Lisans (Basics Studio AB): monetize videolarda, **bitmiş bir projenin parçası olarak** kullanılabilir; tek başına paylaşmak, yeniden dağıtmak, şablona koymak yasak. Bu yüzden ses dosyaları skill'e gömülmez; kullanıcının makinesinde ortak klasöre kurulur.
- Kurulum (bir kez): `py scripts/sfx_kur.py "<SFX_Pack_Mini.zip>" "<Ultimate_500_Preset_Pack.zip>" --hedef C:\otomasyon\ortak\sfx` → adlar temizlenir (`@adobebasics` atılır, küçük harf, boşluk→`-`), `sfx-katalog.json` (ad, süre, kategori) yazılır. Remotion için kanalın `motion/public/sfx/`'ine junction veya kopya.
- **CC0 kütüphane** (`varlik/sfx-cc0/`, repoda ve Drive aynasında olabilir, atıf gerekmez): `sfx-kit` (github.com/wyzowl/sfx-kit, 320 wav), `uisfx` (github.com/romainsimon/uisfx, 936 mp3, 12 UI paketi), `opus-sound-directory` (42 mp3). Lisans metni her paketin `LICENSE.txt`'inde, URL/commit `kaynak.json`'da; `turev/` = CC0 seslerin perde kaydırmalı türevleri (`sfx_olc.py --turev`). Lisanslı Adobe paketi (`varlik/sfx/`) Drive aynasına ASLA girmez (`kurulum.py ayna` yalnız `sfx-cc0/` kopyalar).
- `.prfpset` Premiere Pro preset dosyasıdır; Remotion/ffmpeg hattında kullanılamaz. Yalnız CapCut/Premiere teslimli hatlarda (Hayalet) anlamlı. Bozuk dosya: `Slice Woosh.wav` (veri yok) — atlanır.

## Kullanım ilkeleri (rakip SPEC'i farklı söylemiyorsa)
- Az ve anlamlı: SFX bir **olayı** işaretler (kart girişi, sayı vurgusu, bölüm geçişi), her kesimi değil. Belgesel/sakin tonlu kanallarda (Akiya, 50+ Almanca) dakikada ~2–4; hızlı Shorts'ta daha sık.
- Seviye: seslendirmenin altında; darbe/bölüm ~8–10 dB, geçiş/tık ~14–19 dB (otomatik tasarımda havuz seviyeleri, aşağıda); konuşmayı asla bastırmasın. Final loudnorm −14 LUFS'tan önce eklenir.
- Zamanlama: geçiş whoosh'u kesimden ~0,1–0,2 sn önce başlar; pop/ding kartın belirdiği karede; riser/buildup açılacak bilgiye 1–3 sn kala.
- Aynı efekt art arda iki olayda yok; uzun dosyaların (Cinematic Sounds 295 sn, Whoosh Sounds-1 49 sn, Paper Sounds Video 58 sn, Clock Tick 60 sn) yalnız ilgili kesiti kullanılır.
- Komedi/meme sesleri (Anime Wow, Weird Laugh, Slap, Discord Leave, minecraft sfx, Iphone Ringtone) ciddi nişlerde kullanılmaz.
- Özgünlük: kanalın "SFX paleti" (hangi 4–6 ses) DEVAM'da kayıtlı; kurgu stili ekseninde (`ozgunluk.md` E) zaman zaman değiştir.

## Katalog (süre sn)
| Kategori | Dosyalar | Tipik kullanım |
|---|---|---|
| Geçiş / whoosh | Transition Woosh 1.97 · transition-base 1.70 · Main Swoosh 1.37 · Deep Main Swoosh2 1.65 · short whoosh 0.27 · fast Swoosh 4.04 · Side Swoosh 3.29 · Whoosh 3.65 · Deep Whoosh 3.70 · Bass Whoosh 2.86 · Loud Whoosh 3.86 · Drum Woosh 3.40 · Fly By 3.53 · glitch swoosh 0.78 · Zhwoop 3.02 · Loud Zhwoop 4.03 · Smooth Woosh 12.75 · Cinem cut swoosh 11.37 · Cinem Wave Swoosh 11.37 · impact_swoosh_Dust 3.94 · Turbulance 4.54 | bölüm/sahne geçişi, kart kayması |
| Darbe / vurgu | boom impact 15.91 · impact 3.28 · Thump 2.16 · Light-Medium-Heavy 12.84 · Cinematic_deep L-M-H 12.84 · Dada 1 1.68 · Dodo 3.33 · Loud Whip 1.26 · Sword Slash 5.88 / sword slash 1.22 · Glass shatter 7.58 | 1 numara açılışı, çarpıcı rakam, "tuzak" anı |
| Gerilim / yükselme | riser 2.02 · Buildup 2.66 · Buildup [1] 2.93 · [2] 2.54 · [3] 1.80 · [4] 2.74 · Heavy Buildup 5.78 · Cinematic Sounds 295 | kanca sonu, açıklama öncesi |
| Pop / bildirim | pop 0.22 · pop 2 0.40 · Pop 1.78 · Bing 0.56 · ding 2.82 · Boop 2.62 · Apple Notification 1.90 · Iphone Receive 0.79 · Icons 0.72 · Home 1.07 · User 1.79 · ui 0.80 · This One 0.09 · Enter & Back 0.08 | kart/etiket/rozet belirmesi, liste maddesi |
| Tık / klavye | click 0.35 · Klick 0.01 · Tick 0.01 · Mouse Click 3.34 · Mouse Click Sound 3.11 · gaming mouse click 3.11 · Typing 3.14 · Typing Sound 18.99 · Tik Tik 1.20 · Drop Down 3.86 | arama/ekran kaydı, yazı animasyonu |
| Kamera / foto | camera shutter (×3: 0.33–0.86) · Camera Shutter 'Crunch' 0.63 · camera shot 0.91 · digital camera shutter 0.56 · camera flash 2.06 · film projecter 11.67 | fotoğraf geçişi, arşiv/tarihî kare, ilan fotoğrafı |
| Kâğıt / belge | paper 0.45 · Paper Flip 1 0.93 · Multiple Paper Turn 1.17 · Paper Sketchbook Page Flip 9.08 · Paper Crumble 1/2 3.37/4.24 · Ripping/tearing Paper 2.17/1.44 · Rustling Paper 4.60 · Paper Sounds Video 58 | alıntı/kanun/standart kartı, belge görünümü |
| Saat / zaman | Clock Tick 60.4 · Gun Clock (mp3 2.16 / wav 1.43) | saat soruları (sağlık "ne zaman"), geri sayım |
| Para | money counter 6.80 | fiyat açıklaması (Akiya ④価格) |
| Ortam | Burning Fire 10.99 · lighting-a-fire 5.52 | sahne atmosferi |
| Glitch | glitch 0.57 · glitch swoosh 0.78 | dijital/teknoloji kanalları, hata vurgusu |
| Kalabalık | Applause 25.73 | kapanış (nadiren) |
| Mizah (ciddi nişte yok) | Anime Wow · Weird Laush · Slap · Discord_Leave · minecraft sfx · Iphone Ringtone | yalnız eğlence/Shorts |

## Otomatik ses tasarımı (varsayılan — elle SFX yerleştirilmez)
Tek kaynak `repertuar/sfx-kutuphane.json` (Sfx.tsx import eder, `sfx_plan.py` okur):
- **Birleşik kütüphane:** Adobe (`sfx/…`) + CC0 (`sfx-cc0/…`) ~190 ses (+ 42 perde türevi). Her kayıt: `rol` (havuz), `ton`, `his` (etiketler.json görsel his sözlüğü), `kar` (karakter: yumuşak/sert · metalik/kâğıt/dijital/organik/hava · kısa/uzun · pop), `sn` (kullanılabilir süre), `seri` (perde serisi). `olcu` = `sfx_olc.py` ölçümü [baş, tepe, örnek tepesi dBFS, 100 ms RMS tepesi dBFS, süre, kanal]. `ayar` = seviyeler, öncelik, kuyruk, ton tavanı/aralığı, doku tercihleri.
- **Video paleti:** her havuzdan tondan 3–5 ses; tohum videonun dokusunu (malzeme tercihi ×2) ve ailesini (Adobe/CC0 ×1,5) seçer, his eşleşmesi ×1,5. Aynı ses art arda çalmaz, dakikada aynı ses ≤ 2 (yer yoksa sessizlik). Ciddi/gizem tonda pop ve mizah hiç seçilmez; glitch yalnız enerjik.
- **Sahne davranışları** (`SfxOlay = {kare, rol, adet?, aralik?, sure?}`, aralık/süre kare): `sayac` ease-out tık dizisi + bitişte sayı darbesi · `yazma` harf başına klavye tıkı (3 ses dönüşümlü) · `liste-madde` madde başına tık/pop · `grafik-cubuk` çubuk başına perdesi yükselen tık (türev serisi) · `harita-rota` varışta tepe yapan süzülme + varış vuruşu · `bolum` 1,2–2 sn yükselme + alçak darbe · `doruk` önce 1,2 sn sessizlik (pencerede diğer sesler silinir, taşan kuyruk kesilir; `sfxSessizlikleri()` müzik kısmak için) sonra vuruş · `degisim` çizik (ses başı çizginin başladığı kareye) · `belge` kâğıt · `foto` deklanşör · `glitch` dijital tık. Eski roller: gecis, kart, sayi, alinti, vurgu, altbant, yukselme.
- **Seviye (konuşmaya göre):** her ses 100 ms RMS tepesiyle konuşma referansının (`vo_ref_db` −17 dBFS kanal başına = −14 LUFS teslimde konuşma medyanı) altına oturur: doruk/bölüm −8, vurgu −9, sayı −10, varış −13, kart/belge/foto/çizik/alıntı/yükselme −14, geçiş/glitch −15, süzülme/liste −16, alt bant/çubuk −17, tık −18, yazma −19 dB; ton ofseti sakin −2, enerjik +1; ±1 dB doğal oynama. Örnek tepesi −3 dBFS'i aşmaz. Mono dosya stereoya −3 dB açıldığı için (Remotion ve ffmpeg) +3 dB telafi. KatSes ölçümü: olay başına hedef farkı ortalama ±0,2 dB, mutlak medyan 0,8 dB.
- **Zarf:** kırpılmış seste 1 karelik giriş, sonda ≤ 0,25 sn çıkış. Remotion kare başına değişen seviyeyi 1/97 adımlara yuvarlar (0,05 kazançta ±1 dB, 0,005 altı sessiz): kazanç < `SFX_ZARF_ESIK` (0,12) ise zarf yerine sabit seviye ve doğal kuyruk.
- **Yoğunluk:** en kısa aralık ciddi 0,8 · gizem 0,9 · enerjik 0,5 · sakin 1,1 sn; dakika tavanı ciddi 16 · gizem 14 · enerjik 30 · sakin 9 (dizi = 1 olay); çakışmada öncelik (doruk > bölüm > vurgu > sayı/sayaç/yükselme > … > alt bant), vuruş dizinin üstüne binebilir. Yumuşak geçişlere rakibin `sfx_orani` olasılığı.
- **Senkron:** tepe anı olay karesine oturur (WAV render'da medyan +7 ms). Remotion'un MP4/AAC çıktısında kodlayıcı gecikmesi kırpılmıyor (ses ~45–57 ms geç, ses akışı videodan uzun): SFX stemini MP4'ten çıkarıp miksleyen hatlarda `atrim=start=0.045` uygula ya da stemi `--codec=wav` render et.
- **Dinleme/ölçüm:** `sablon-proje` `KatSes` kompozisyonu (her rol sırayla, görsel + ses; props `{"ton": …}`) → `py scripts/sfx_olc.py --rapor out.mp4 --plan plan.json --ton <ton>` olay başına hedef/ölçülen tablo. Yeni ses: kütüphaneye etiketle ekle → `py scripts/sfx_olc.py` (ölçüm, ~1 dk) → `dogrula.py` (ölçüsüz/eksik ses FAIL, 3'ten az aday UYARI) → KatSes'i dinle.
- **ffmpeg hattı:** `<VideoDna sfx={false} />` ile render, ses ayrı: `py scripts/sfx_plan.py --plan props.json [--dna stil-dna.json] [--vo vo.mp3] --cikti sfx.json` → `ses_miks.py --vo … --sfx sfx.json`. Plan varsayılan olarak GERÇEK TS'ten (node+esbuild: gecisPlani + sfxOlaylari + sfxPlani) hesaplanır; node yoksa Python portu (v04: 131/131 ses, 0 fark; `--karsilastir`). `--vo` konuşmayı ölçer, SFX dB'lerini referans farkına göre kaydırır. Kanal projesinde CC0 dosyaları: `py scripts/varlik_kur.py kanal <motion>` (hard link).

## Remotion'da (elle, özel sahneler için)
Kanalın hattına bak: Hund'da ses Remotion içinde; Akiya mimarisinde ses Remotion'a KONMAZ, ffmpeg en sonda bindirir (o zaman aşağıdaki ffmpeg yolu).
```tsx
import { Audio, Sequence, staticFile } from 'remotion';
// PLAN olayından türet: kartın başladığı kare = f
<Sequence from={f - 4} durationInFrames={45}><Audio src={staticFile('sfx/transition-woosh.mp3')} volume={0.2} /></Sequence>
```
Olay→SFX eşlemesini kart türüne bağla (ör. `SAYI`→pop, `ZITAT`→paper flip, bölüm geçişi→whoosh, `KARTE`→short whoosh), elle tek tek yerleştirme.

## ffmpeg hattında
`adelay=<ms>|<ms>,volume=0.2` ile her SFX'i geciktir, `amix=inputs=N:normalize=0` ile VO'ya karıştır, sonra loudnorm.
