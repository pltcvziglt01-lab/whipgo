# Kanal sablonu — _test-ev

**Konsept:** Electric vehicle engineering explained: batteries, motors, charging and why EV design choices matter. Clear technical explainers for car enthusiasts. Example titles: 'How Tesla's 4680 Battery Actually Works', 'Why EVs Don't Need Gearboxes', 'The Truth About Solid-State Batteries', 'Heat Pumps: The Hidden Range Saver'

Ton **enerjik** · konu otomotiv 0.46, egitim 0.27, muhendislik 0.18, teknoloji 0.09 · rakip/nis: @SvenskaBilar (verilen rakip) · olusturma 2026-11-24 21:00

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | grafit-neon |
| font | damga-stencil |
| hareket | ustel-sert |
| bitis | neon-parilti |
| baslik | maske-yukari |
| baslik2 | arama-cubugu |
| altyazi | kutulu |
| altbant | koseli-parantez |
| sayi | uzun-golge |
| hud | derinlik-cetvel |
| harita | kesik-rota |
| grafik | cizgi-isik |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Oswald (2) · aile: sans-dar %100 | damga-stencil (baslik Staatliches, aile sans-dar) | YouTube kaniti 1.00 (sans-dar: nis %38, genel %45); konu uyumu 1.21 (ton + · konu muhendislik · enerji 3 · his teknik) |
| gecis | sert %93, karartma %4, maske %3 | zoom-icinden, glitch-rgb, tint-sizinti (yumusak oran 0.09 — iskelet rakipten) | zoom-icinden: YouTube kaniti 0.09 (zoom: nis %2, genel %2); konu uyumu 3.65 (ton + · konu teknoloji/otomotiv/muhendislik · enerji 4 · his dinamik/modern); glitch-rgb: YouTube kaniti 0.04 (glitch: nis %1, genel %1); konu uyumu 1.28 (ton + · konu teknoloji · enerji 4 · his neon); tint-sizinti: YouTube kaniti 0.12 (flas: nis %2, genel %3); konu uyumu 1.46 (ton + · konu muhendislik · enerji 3 · his dinamik) |
| kamera | ken-burns-disa %42, ken-burns-ice %40, sabit %14 | paralaks-cift, dolly-egik, zoom-darbe | paralaks-cift: konu uyumu 1.40 (ton + · konu teknoloji/muhendislik · enerji 3 · his modern); dolly-egik: konu uyumu 2.20 (ton + · konu otomotiv/teknoloji/muhendislik · enerji 3 · his -); zoom-darbe: konu uyumu 1.27 (ton + · konu - · enerji 4 · his dinamik) |
| cerceve | tam %94, bulanik-kopya %6 | pencere, kolaj | pencere: konu uyumu 1.58 (ton + · konu teknoloji/egitim · enerji 3 · his modern); kolaj: konu uyumu 0.80 (ton + · konu - · enerji 3 · his -) |
| altyazi | yok %100 | kutulu | YouTube kaniti 0.12 (kutulu: nis %11, genel %7); konu uyumu 1.21 (ton + · konu muhendislik · enerji 3 · his modern) |
| palet | koyu-notr %100 | grafit-neon (koyu-notr) | YouTube kaniti 1.00 (koyu-notr: nis %73, genel %68); konu uyumu 3.05 (ton + · konu teknoloji/otomotiv/muhendislik · enerji 4 · his neon/modern) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | maske-yukari + arama-cubugu | konu uyumu 2.05 (ton + · konu teknoloji/egitim/muhendislik · enerji 3 · his modern/temiz) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | koseli-parantez | konu uyumu 2.32 (ton + · konu teknoloji/otomotiv/muhendislik · enerji 3 · his teknik) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | uzun-golge | konu uyumu 3.65 (ton + · konu otomotiv/egitim · enerji 4 · his modern/dinamik) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | neon-parilti | konu uyumu 3.07 (ton + · konu teknoloji/otomotiv · enerji 4 · his neon/dinamik) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | derinlik-cetvel | konu uyumu 1.21 (ton + · konu muhendislik · enerji 3 · his teknik) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | kesik-rota | konu uyumu 0.79 (ton + · konu egitim · enerji 2 · his belgesel/temiz) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | cizgi-isik | konu uyumu 1.08 (ton + · konu teknoloji · enerji 3 · his modern/teknik) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 4.17 sn, kesim/dk 14.0, genel medyan 4.0 sn
- yumusak gecis orani 0.09, gecis 11 kare, SFX orani 0.56, cerceveli oran 0.15

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/_test-ev/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/_test-ev/vNN`

## Onizleme

- `C:\otomasyon\_test-ev\sablon\onizleme-1.jpg`
- `C:\otomasyon\_test-ev\sablon\onizleme-2.jpg`
- `C:\otomasyon\_test-ev\sablon\onizleme-3.jpg`
- `C:\otomasyon\_test-ev\sablon\onizleme-4.jpg`
- `C:\otomasyon\_test-ev\sablon\onizleme-5.jpg`
- `C:\otomasyon\_test-ev\sablon\onizleme-6.jpg`
- `C:\otomasyon\_test-ev\sablon\ONIZLEME.jpg`
