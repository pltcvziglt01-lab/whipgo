# CC0 SFX palet önerisi

Öneri `Sfx.tsx` `SFX_PALET` biçiminde: `[dosya, kırpma sn, seviye]`. Makine okur sürümü `PALET-ONERI.json`'da. `Sfx.tsx`'e eklemek ana oturumun işi; bu dosya yalnız öneri.

Kaynak paketlerin hepsi CC0, atıf gerekmez:

| paket | URL | commit | dosya | boyut |
|---|---|---|---|---|
| `sfx-kit` | https://github.com/wyzowl/sfx-kit | `92780e7` (2026-10-20) | 320 wav (48 kHz / 24-bit) | 66 MB |
| `uisfx` | https://github.com/romainsimon/uisfx | `9950fe6` (2026-09-08) | 936 mp3 (12 paket × 78 UI sesi) | 7,5 MB |
| `opus-sound-directory` | https://github.com/Tguntenaar/opus-sound-directory | `b2a5766` (2026-10-19) | 42 mp3 (26 müzik yatağı dışlandı) | 5,2 MB |

Lisans metinleri her paketin `LICENSE.txt` dosyasında; URL, commit ve kapsam `kaynak.json`'da.

## Seçim ilkeleri

- **Seçim yöntemi.** Adaylar sfx-kit meta verisine göre seçildi: `description`, `use_for`/`avoid_for`, senkron noktası. Ardından her adayın dalga + log spektrogram görseli (ilk 4,2 sn) ve `sfx_olc.olc()` ölçüsüne bakıldı.
- **Ciddi ve gizem tonu.** Mizah işaretli ses yok; pop, bubble ve playful sting yok. Darbeler derin ya da ahşap, geçişler yavaş ya da orta whoosh.
- **Enerjik ton.** Hızlı ve sert whoosh/swish/zip, pop ve snap kart sesleri, kısa güçlü riser.
- **Sakin ton.** Soft whoosh ve swipe, kâğıt, yumuşak çan/shimmer, düşük seviye (0,12–0,2).
- **Elenenler (görselde bakıldı):**
  - `opus/logo-sting-dark-cinematic`: müzikal braam, asıl darbe 2,6. saniyede. Ölçülen tepe başta kalıyor, olay karesine yanlış oturur.
  - `opus/riser-tension-8s` ve `opus/endless-riser-shepard`: tepe 4 sn'den sonra. `olc()` yalnız ilk 4 sn'yi gördüğü için tepe yanlış ölçülür.
  - `sfx-kit/shimmer-long-soft`: tepesi başta, yükselme rolüne uymaz.
  - `sfx-kit/click-hover-*` (0,01 sn) ve `mechanical-switch-light` (0,03 sn): duyulmayacak kadar kısa.
- **Seviye notu.** `Sfx.tsx` örnek tepesini −3 dBFS'e çeker ama kazancı en fazla 6× (+15,6 dB) yapar. Tepesi −18,6 dBFS'ten düşük sesler bu yüzden hedefin altında kalır: `foley-paper-slide` −24, `digital-scan-subtle` −22,7, `foley-card-slide` −22,2, `writing-pencil-tick` −20,8, `digital-decrypt` −20,4, `swipe-slow-soft` −19,8, `writing-pen-tick` −19,2. Bunların bir kısmının seviyesi biraz yükseltildi (0,24–0,3); render'da kulakla kontrol edilmeli.

## Ana oturum için entegrasyon notları

1. **Dosya yolu.** Buradaki dosya adları `varlik/`'e göre (`sfx-cc0/sfx-kit/x.wav`). `SfxKatmani` bugün `staticFile(\`${klasor}/${dosya}\`)` ile `klasor='varlik/sfx'` kullanıyor. İki seçenek var:
   - (a) CC0 sesler için kök `varlik` olur ve Adobe sesleri `sfx/<ad>` önekiyle yazılır;
   - (b) `Ses` öğesine kök bilgisi eklenir.
2. **Ölçüler.** `SFX_OLCU` için ölçüler `sfx-olcu.json`'da hazır (anahtar `sfx-cc0/` öneki olmadan, paket/dosya biçiminde). `sfx_olc.py` ve `dogrula.py k_sfx` şu an yalnız `varlik/sfx`'e bakıyor; palete CC0 ses girince ikisinin de `varlik/`'e göre çözmesi gerekir.
3. **Kanal başına ses kimliği.** Adobe paleti ile CC0 paleti ayrı "ses aileleri" olarak tutulabilir. `kanal-sablon.json` `sfx_ailesi: adobe | cc0` seçebilir.
4. **Ek adaylar.** sfx-kit her sesin senkron noktasını (`senkron`) katalogda taşıyor. `olc()` tepesiyle büyük farkı olan sesler (ör. `props-page-turn`: senkron 0, ölçülen tepe 0,43 = sayfanın düşüşü) rol için doğru anı seçmede ek veri olarak kullanılabilir.

## Öneri tablosu

### ciddi

| rol | dosya | kırpma sn | seviye | ölçü [bas, tepe, dB] |
|---|---|---|---|---|
| gecis | `sfx-cc0/sfx-kit/whoosh-slow-medium.wav` | 1.0 | 0.2 | [0.227, 0.445, -10.5] |
| gecis | `sfx-cc0/sfx-kit/whoosh-medium-medium.wav` | 0.52 | 0.2 | [0.107, 0.21, -8.6] |
| gecis | `sfx-cc0/sfx-kit/reverse-whoosh-medium-soft.wav` | 0.86 | 0.18 | [0.332, 0.681, -14.5] |
| gecis | `sfx-cc0/opus-sound-directory/whoosh-pass-by.mp3` | 1.2 | 0.18 | [0.219, 0.607, -3.7] |
| kart | `sfx-cc0/sfx-kit/mechanical-shutter-light.wav` | 0.11 | 0.2 | [0.0, 0.008, -11.7] |
| kart | `sfx-cc0/sfx-kit/foley-paper-touch.wav` | 0.31 | 0.22 | [0.004, 0.025, -11.5] |
| kart | `sfx-cc0/sfx-kit/props-page-turn.wav` | 0.54 | 0.2 | [0.009, 0.431, -13.4] |
| kart | `sfx-cc0/sfx-kit/mechanical-latch-light.wav` | 0.11 | 0.2 | [0.011, 0.05, -12.4] |
| sayi | `sfx-cc0/sfx-kit/impact-deep-firm.wav` | 1.15 | 0.28 | [0.0, 0.009, -7.9] |
| sayi | `sfx-cc0/sfx-kit/boom-hit-medium.wav` | 1.3 | 0.26 | [0.0, 0.036, -12.6] |
| sayi | `sfx-cc0/sfx-kit/data-number-land.wav` | 0.23 | 0.26 | [0.0, 0.009, -8.9] |
| alinti | `sfx-cc0/sfx-kit/props-page-turn.wav` | 0.54 | 0.24 | [0.009, 0.431, -13.4] |
| alinti | `sfx-cc0/sfx-kit/foley-paper-slide.wav` | 0.49 | 0.3 | [0.036, 0.252, -24.0] |
| alinti | `sfx-cc0/sfx-kit/writing-pen-tick.wav` | 0.24 | 0.2 | [0.004, 0.158, -19.2] |
| vurgu | `sfx-cc0/sfx-kit/cinematic-drum-big.wav` | 2.18 | 0.28 | [0.0, 0.011, -7.3] |
| vurgu | `sfx-cc0/sfx-kit/cinematic-slam-big.wav` | 2.23 | 0.28 | [0.0, 0.013, -7.6] |
| vurgu | `sfx-cc0/opus-sound-directory/trailer-braam-hit.mp3` | 3.0 | 0.26 | [0.499, 0.517, 1.2] |
| vurgu | `sfx-cc0/sfx-kit/boom-hit-strong.wav` | 1.69 | 0.28 | [0.0, 0.042, -9.7] |
| altbant | `sfx-cc0/sfx-kit/click-mouse-soft.wav` | 0.1 | 0.18 | [0.0, 0.007, -11.1] |
| altbant | `sfx-cc0/sfx-kit/mechanical-latch-light.wav` | 0.11 | 0.16 | [0.011, 0.05, -12.4] |
| altbant | `sfx-cc0/sfx-kit/keyboard-letter-soft.wav` | 0.09 | 0.16 | [0.001, 0.011, -11.5] |
| yukselme | `sfx-cc0/sfx-kit/riser-2s-soft.wav` | 2.19 | 0.2 | [0.771, 1.968, -16.7] |
| yukselme | `sfx-cc0/sfx-kit/riser-4s-soft.wav` | 4.18 | 0.2 | [1.541, 3.942, -17.0] |
| yukselme | `sfx-cc0/sfx-kit/reverse-whoosh-long-soft.wav` | 1.35 | 0.2 | [0.579, 1.174, -16.0] |

### gizem

| rol | dosya | kırpma sn | seviye | ölçü [bas, tepe, dB] |
|---|---|---|---|---|
| gecis | `sfx-cc0/sfx-kit/whoosh-slow-soft.wav` | 1.05 | 0.2 | [0.197, 0.446, -14.5] |
| gecis | `sfx-cc0/sfx-kit/reverse-whoosh-long-soft.wav` | 1.35 | 0.18 | [0.579, 1.174, -16.0] |
| gecis | `sfx-cc0/sfx-kit/bass-rumble-short.wav` | 1.53 | 0.18 | [0.019, 0.222, -10.2] |
| gecis | `sfx-cc0/sfx-kit/digital-interference.wav` | 0.87 | 0.16 | [0.0, 0.714, -15.8] |
| kart | `sfx-cc0/sfx-kit/mechanical-shutter-heavy.wav` | 0.18 | 0.18 | [0.0, 0.008, -8.6] |
| kart | `sfx-cc0/sfx-kit/digital-scan-subtle.wav` | 0.84 | 0.24 | [0.01, 0.287, -22.7] |
| kart | `sfx-cc0/sfx-kit/foley-card-slide.wav` | 0.36 | 0.26 | [0.019, 0.228, -22.2] |
| sayi | `sfx-cc0/sfx-kit/bass-sub-drop-medium.wav` | 2.15 | 0.26 | [0.0, 0.015, -18.1] |
| sayi | `sfx-cc0/sfx-kit/impact-deep-soft.wav` | 1.28 | 0.28 | [0.0, 0.044, -10.4] |
| sayi | `sfx-cc0/sfx-kit/boom-hit-soft.wav` | 1.02 | 0.26 | [0.0, 0.022, -18.0] |
| alinti | `sfx-cc0/sfx-kit/foley-paper-slide.wav` | 0.49 | 0.3 | [0.036, 0.252, -24.0] |
| alinti | `sfx-cc0/sfx-kit/writing-pencil-tick.wav` | 0.24 | 0.2 | [0.0, 0.166, -20.8] |
| alinti | `sfx-cc0/sfx-kit/digital-decrypt.wav` | 1.26 | 0.16 | [0.001, 0.766, -20.4] |
| vurgu | `sfx-cc0/sfx-kit/cinematic-thunder-big.wav` | 3.0 | 0.28 | [0.0, 0.069, -7.3] |
| vurgu | `sfx-cc0/sfx-kit/boom-drop-medium.wav` | 3.0 | 0.26 | [0.0, 0.055, -14.0] |
| vurgu | `sfx-cc0/sfx-kit/cinematic-metal-big.wav` | 2.11 | 0.26 | [0.0, 0.029, -8.9] |
| vurgu | `sfx-cc0/sfx-kit/bass-sub-drop-long.wav` | 3.0 | 0.26 | [0.0, 0.015, -18.3] |
| altbant | `sfx-cc0/sfx-kit/digital-blip-subtle.wav` | 0.14 | 0.15 | [0.0, 0.009, -16.3] |
| altbant | `sfx-cc0/sfx-kit/mechanical-latch-light.wav` | 0.11 | 0.15 | [0.011, 0.05, -12.4] |
| yukselme | `sfx-cc0/sfx-kit/riser-4s-soft.wav` | 4.18 | 0.2 | [1.541, 3.942, -17.0] |
| yukselme | `sfx-cc0/sfx-kit/riser-2s-soft.wav` | 2.19 | 0.2 | [0.771, 1.968, -16.7] |
| yukselme | `sfx-cc0/sfx-kit/reverse-whoosh-long-strong.wav` | 1.36 | 0.2 | [0.512, 1.129, -13.0] |

### enerjik

| rol | dosya | kırpma sn | seviye | ölçü [bas, tepe, dB] |
|---|---|---|---|---|
| gecis | `sfx-cc0/sfx-kit/whoosh-fast-hard.wav` | 0.25 | 0.22 | [0.043, 0.093, -6.8] |
| gecis | `sfx-cc0/sfx-kit/swish-hard.wav` | 0.17 | 0.22 | [0.017, 0.057, -5.6] |
| gecis | `sfx-cc0/sfx-kit/zip-in-hard.wav` | 0.28 | 0.2 | [0.079, 0.19, -5.5] |
| gecis | `sfx-cc0/sfx-kit/swipe-fast-firm.wav` | 0.2 | 0.22 | [0.0, 0.042, -12.9] |
| kart | `sfx-cc0/sfx-kit/pop-medium-in.wav` | 0.06 | 0.26 | [0.0, 0.009, -7.1] |
| kart | `sfx-cc0/sfx-kit/click-snap-firm.wav` | 0.12 | 0.24 | [0.004, 0.013, -11.0] |
| kart | `sfx-cc0/sfx-kit/appear-flip-quick.wav` | 0.18 | 0.22 | [0.013, 0.16, -9.3] |
| kart | `sfx-cc0/uisfx/studio-press.mp3` | 0.2 | 0.22 | [0.0, 0.009, -8.7] |
| sayi | `sfx-cc0/sfx-kit/impact-medium-hard.wav` | 0.16 | 0.3 | [0.0, 0.008, -5.9] |
| sayi | `sfx-cc0/sfx-kit/data-number-land.wav` | 0.23 | 0.28 | [0.0, 0.009, -8.9] |
| sayi | `sfx-cc0/sfx-kit/boom-hit-strong.wav` | 1.69 | 0.26 | [0.0, 0.042, -9.7] |
| alinti | `sfx-cc0/sfx-kit/props-page-turn.wav` | 0.54 | 0.24 | [0.009, 0.431, -13.4] |
| alinti | `sfx-cc0/sfx-kit/swish-medium.wav` | 0.2 | 0.22 | [0.024, 0.072, -8.8] |
| alinti | `sfx-cc0/sfx-kit/pop-small-in.wav` | 0.04 | 0.22 | [0.0, 0.008, -8.5] |
| vurgu | `sfx-cc0/sfx-kit/impact-heavy-hard.wav` | 0.3 | 0.32 | [0.0, 0.008, -5.6] |
| vurgu | `sfx-cc0/sfx-kit/cinematic-slam-massive.wav` | 3.0 | 0.28 | [0.0, 0.083, -9.1] |
| vurgu | `sfx-cc0/sfx-kit/boom-drop-strong.wav` | 3.0 | 0.28 | [0.0, 0.1, -12.6] |
| vurgu | `sfx-cc0/opus-sound-directory/drop-impact-heavy.mp3` | 3.0 | 0.28 | [0.975, 1.588, -3.4] |
| altbant | `sfx-cc0/sfx-kit/click-tap-firm.wav` | 0.02 | 0.2 | [0.0, 0.007, -5.9] |
| altbant | `sfx-cc0/sfx-kit/pop-small-out.wav` | 0.05 | 0.2 | [0.0, 0.009, -7.4] |
| altbant | `sfx-cc0/sfx-kit/keyboard-return-firm.wav` | 0.09 | 0.2 | [0.001, 0.011, -9.3] |
| yukselme | `sfx-cc0/sfx-kit/riser-1s-strong.wav` | 1.22 | 0.22 | [0.378, 1.001, -14.3] |
| yukselme | `sfx-cc0/sfx-kit/riser-2s-strong.wav` | 2.19 | 0.22 | [0.769, 1.879, -12.6] |
| yukselme | `sfx-cc0/sfx-kit/reverse-whoosh-short-strong.wav` | 0.5 | 0.22 | [0.148, 0.334, -10.0] |

### sakin

| rol | dosya | kırpma sn | seviye | ölçü [bas, tepe, dB] |
|---|---|---|---|---|
| gecis | `sfx-cc0/sfx-kit/whoosh-slow-soft.wav` | 1.05 | 0.14 | [0.197, 0.446, -14.5] |
| gecis | `sfx-cc0/sfx-kit/swipe-slow-soft.wav` | 0.43 | 0.16 | [0.0, 0.146, -19.8] |
| gecis | `sfx-cc0/sfx-kit/swish-soft.wav` | 0.22 | 0.14 | [0.022, 0.087, -11.1] |
| gecis | `sfx-cc0/sfx-kit/reverse-whoosh-short-soft.wav` | 0.51 | 0.14 | [0.175, 0.335, -14.5] |
| kart | `sfx-cc0/sfx-kit/foley-paper-touch.wav` | 0.31 | 0.18 | [0.004, 0.025, -11.5] |
| kart | `sfx-cc0/sfx-kit/click-button-soft.wav` | 0.02 | 0.16 | [0.0, 0.007, -9.3] |
| kart | `sfx-cc0/sfx-kit/shimmer-short-soft.wav` | 0.48 | 0.14 | [0.001, 0.011, -14.4] |
| kart | `sfx-cc0/uisfx/soft-select.mp3` | 0.41 | 0.14 | [0.0, 0.017, -8.5] |
| sayi | `sfx-cc0/sfx-kit/impact-light-soft.wav` | 0.17 | 0.2 | [0.0, 0.01, -11.5] |
| sayi | `sfx-cc0/sfx-kit/tone-ding-mid.wav` | 1.06 | 0.14 | [0.0, 0.008, -18.0] |
| sayi | `sfx-cc0/sfx-kit/notification-success-soft.wav` | 0.53 | 0.14 | [0.0, 0.01, -17.0] |
| alinti | `sfx-cc0/sfx-kit/foley-paper-slide.wav` | 0.49 | 0.26 | [0.036, 0.252, -24.0] |
| alinti | `sfx-cc0/sfx-kit/writing-pencil-write.wav` | 1.19 | 0.16 | [0.0, 0.318, -16.8] |
| alinti | `sfx-cc0/sfx-kit/props-page-turn.wav` | 0.54 | 0.18 | [0.009, 0.431, -13.4] |
| vurgu | `sfx-cc0/sfx-kit/impact-medium-soft.wav` | 0.21 | 0.22 | [0.001, 0.01, -8.2] |
| vurgu | `sfx-cc0/sfx-kit/boom-hit-soft.wav` | 1.02 | 0.2 | [0.0, 0.022, -18.0] |
| vurgu | `sfx-cc0/sfx-kit/shimmer-medium-soft.wav` | 1.13 | 0.16 | [0.0, 0.009, -17.1] |
| altbant | `sfx-cc0/uisfx/soft-press.mp3` | 0.27 | 0.14 | [0.0, 0.016, -8.1] |
| altbant | `sfx-cc0/sfx-kit/click-tap-soft.wav` | 0.02 | 0.12 | [0.0, 0.007, -8.7] |
| altbant | `sfx-cc0/sfx-kit/foley-wood-touch.wav` | 0.13 | 0.12 | [0.0, 0.009, -11.7] |
| yukselme | `sfx-cc0/sfx-kit/riser-2s-soft.wav` | 2.19 | 0.16 | [0.771, 1.968, -16.7] |
| yukselme | `sfx-cc0/sfx-kit/riser-1s-soft.wav` | 1.19 | 0.16 | [0.354, 0.927, -15.8] |
| yukselme | `sfx-cc0/sfx-kit/reverse-whoosh-medium-soft.wav` | 0.86 | 0.16 | [0.332, 0.681, -14.5] |
