# Ses efektleri (SFX)

## Kaynak ve lisans
Kullanıcının iki paketi var: **SFX_Pack_Mini** (~80 dosya, @adobebasics) ve **Ultimate 500 Preset Pack** (BONUS/Sound Effects Pack, 18 dosya + Premiere preseti + 3 "headless avatar" karakter PNG/PSD).
- Lisans (Basics Studio AB): monetize videolarda, **bitmiş bir projenin parçası olarak** kullanılabilir; tek başına paylaşmak, yeniden dağıtmak, şablona koymak yasak. Bu yüzden ses dosyaları skill'e gömülmez; kullanıcının makinesinde ortak klasöre kurulur.
- Kurulum (bir kez): `py scripts/sfx_kur.py "<SFX_Pack_Mini.zip>" "<Ultimate_500_Preset_Pack.zip>" --hedef C:\otomasyon\ortak\sfx` → adlar temizlenir (`@adobebasics` atılır, küçük harf, boşluk→`-`), `sfx-katalog.json` (ad, süre, kategori) yazılır. Remotion için kanalın `motion/public/sfx/`'ine junction veya kopya.
- `.prfpset` Premiere Pro preset dosyasıdır; Remotion/ffmpeg hattında kullanılamaz. Yalnız CapCut/Premiere teslimli hatlarda (Hayalet) anlamlı. Bozuk dosya: `Slice Woosh.wav` (veri yok) — atlanır.

## Kullanım ilkeleri (rakip SPEC'i farklı söylemiyorsa)
- Az ve anlamlı: SFX bir **olayı** işaretler (kart girişi, sayı vurgusu, bölüm geçişi), her kesimi değil. Belgesel/sakin tonlu kanallarda (Akiya, 50+ Almanca) dakikada ~2–4; hızlı Shorts'ta daha sık.
- Seviye: seslendirmenin altında, tipik −18 ila −24 dB göreli (Remotion `<Audio volume={0.15–0.3}>`); konuşmayı asla bastırmasın. Final loudnorm −14 LUFS'tan önce eklenir.
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

## Otomatik yerleştirme (varsayılan — elle SFX yerleştirilmez)
`repertuar/VideoDna.tsx` kurgu olaylarından `DnaSfx` olay listesi çıkarır: yumuşak geçiş → whoosh, kelime kartı → kart sesi, sayı → darbe, alıntı → kâğıt, alt bant → tık, vurgu (flas) → darbe. `repertuar/Sfx.tsx`:
- Ton paleti (`SFX_PALET`: ciddi / gizem / enerjik / sakin; mizah sesleri yok). Video başına her rolden 2 ses seçilir (tohum) ve sırayla döner: tutarlı ses dili, aynı ses art arda yok.
- Yoğunluk: yumuşak geçişlere rakibin `sfx_orani` olasılığı; iki ses arası ≥ 0,8 sn (çakışmada öncelikli rol kalır); dakika tavanı ciddi 12, gizem 10, enerjik 26, sakin 6.
- **Senkron:** `SFX_OLCU` her dosyanın ölçülen ses başlangıcı ve **tepe anı** (10 ms zarf). Baştaki sessizlik kırpılır (`trimBefore`), tepe olay karesine oturur (whoosh tepesi kesimde). Eskiden sabit öteleme vardı; `thump` 0,8 sn, `deep-whoosh` 2 sn geç vuruyordu.
- **Seviye:** örnek tepesine göre normalize (−3 dBFS × rol seviyesi 0,12–0,32); sessiz kâğıt/deklanşör de duyulur. Yeni ses eklenince `py scripts/sfx_olc.py` ölçümü yeniden yazar (örnek tepesine göre; kırpılma olmaz). Ölçüsüz ses `dogrula.py`'de FAIL.
- Kapatmak için `<VideoDna sfx={false} />` (yalnız sesi ffmpeg ile bindiren hatlarda). O zaman aynı SFX dili ffmpeg'de: `py scripts/sfx_plan.py --plan props.json [--dna stil-dna.json] --cikti sfx.json` → `ses_miks.py --vo … --sfx sfx.json`. `sfx_plan.py` paleti/ölçüyü/önceliği/tavanı her çalışmada `repertuar/Sfx.tsx`'ten okur, `gecisPlani` + `sfxOlaylari` + `sfxPlani` mantığını ve `temel.ts` `rastgele`'yi birebir port eder: aynı tohumla Remotion ile aynı ses, aynı kare (`--karsilastir` node ile doğrular; v04: 131/131 olay, 0 fark). json'daki `kirp`/`sure` ile `ses_miks` baştaki sessizliği kırpar, 2 kare giriş / 0,25 sn çıkış yumuşatır (Remotion zarfı). Port edilen TS fonksiyonu değişirse betik UYARI verir.

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
