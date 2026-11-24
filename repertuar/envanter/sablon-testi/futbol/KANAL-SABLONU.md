# Kanal sablonu — _test-futbol

**Konsept:** Football tactical analysis and club drama: formations, pressing systems, manager tactics, transfer sagas and dressing-room chaos. Example titles: 'How Arteta Rebuilt Arsenal's Press', 'The Collapse of Chelsea's Billion-Pound Project', 'Why Barcelona Can't Defend Counter-Attacks', 'Inside Man United's Dressing Room Crisis'

Ton **enerjik** · konu spor 0.57, egitim 0.29, finans 0.14 · rakip/nis: @VyroSports (verilen rakip) · olusturma 2026-11-24 21:02

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | synth-mor |
| font | sport-teko |
| hareket | ustel-sert |
| bitis | temiz-dijital |
| baslik | kontur-dolma |
| baslik2 | arama-cubugu |
| altyazi | kutulu |
| altbant | blok-kayma |
| sayi | dev-kontur |
| hud | haber-bandi |
| harita | ok-yay |
| grafik | basamak |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Oswald (3), Noto Serif JP (1) · aile: sans-dar %83, japonca %17 | sport-teko (baslik Teko, aile sans-dar) | YouTube kaniti 1.00 (sans-dar: nis %64, genel %45); konu uyumu 2.55 (ton + · konu spor · enerji 5 · his dinamik) |
| gecis | sert %78, karartma %18, flas %2 | tint-sizinti, renk-bandi, whip-yukari (yumusak oran 0.3 — iskelet rakipten) | tint-sizinti: YouTube kaniti 0.18 (flas: nis %4, genel %3); konu uyumu 1.08 (ton + · konu - · enerji 3 · his dinamik); renk-bandi: YouTube kaniti 0.03 (maske: nis %0, genel %1); konu uyumu 5.15 (ton + · konu spor/egitim/finans · enerji 4 · his modern/dinamik/temiz); whip-yukari: YouTube kaniti 0.01 (hareket: nis %0, genel %1); konu uyumu 2.55 (ton + · konu spor · enerji 5 · his dinamik) |
| kamera | sabit %35, ken-burns-ice %31, ken-burns-disa %24 | paralaks-cift, zoom-darbe, dolly-egik | paralaks-cift: konu uyumu 0.87 (ton + · konu - · enerji 3 · his modern); zoom-darbe: konu uyumu 3.18 (ton + · konu spor · enerji 4 · his dinamik); dolly-egik: konu uyumu 1.90 (ton + · konu spor · enerji 3 · his -) |
| cerceve | tam %90, bulanik-kopya %7, letterbox %2 | bolunmus, yuvarlak-yan | bolunmus: YouTube kaniti 0.05 (bolunmus: nis %0, genel %0); konu uyumu 3.88 (ton + · konu spor/finans · enerji 4 · his dinamik/modern); yuvarlak-yan: konu uyumu 0.81 (ton + · konu egitim · enerji 2 · his modern/temiz) |
| altyazi | kutulu %67, yok %33 | kutulu | YouTube kaniti 0.42 (kutulu: nis %38, genel %7); konu uyumu 2.55 (ton + · konu finans/spor · enerji 3 · his modern/resmi) |
| palet | koyu-renkli %100 | synth-mor (koyu-renkli) | YouTube kaniti 0.58 (koyu-renkli: nis %40, genel %27); konu uyumu 1.00 (ton + · konu - · enerji 4 · his -) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | kontur-dolma + arama-cubugu | konu uyumu 3.39 (ton + · konu spor · enerji 4 · his dinamik/modern) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | blok-kayma | konu uyumu 2.55 (ton + · konu spor/finans · enerji 3 · his resmi/modern) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | dev-kontur | konu uyumu 3.88 (ton + · konu spor/finans · enerji 4 · his dinamik/modern) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | temiz-dijital | konu uyumu 1.90 (ton + · konu finans/egitim · enerji 3 · his temiz/modern) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | haber-bandi | konu uyumu 3.29 (ton + · konu finans/spor · enerji 3 · his resmi/modern/dinamik) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | ok-yay | konu uyumu 3.39 (ton + · konu spor · enerji 4 · his dinamik/resmi) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | basamak | konu uyumu 2.36 (ton + · konu finans/spor · enerji 3 · his resmi) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 2.1 sn, kesim/dk 26.0, genel medyan 2.235 sn
- yumusak gecis orani 0.3, gecis 7 kare, SFX orani 0.495, cerceveli oran 0.15

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/_test-futbol/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/_test-futbol/vNN`

## Onizleme

- `C:\otomasyon\_test-futbol\sablon\onizleme-1.jpg`
- `C:\otomasyon\_test-futbol\sablon\onizleme-2.jpg`
- `C:\otomasyon\_test-futbol\sablon\onizleme-3.jpg`
- `C:\otomasyon\_test-futbol\sablon\onizleme-4.jpg`
- `C:\otomasyon\_test-futbol\sablon\onizleme-5.jpg`
- `C:\otomasyon\_test-futbol\sablon\onizleme-6.jpg`
- `C:\otomasyon\_test-futbol\sablon\ONIZLEME.jpg`
