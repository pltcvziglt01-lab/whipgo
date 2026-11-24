# Kanal sablonu — zz-test-futbol

**Konsept:** Football tactical analysis and club drama: formations, pressing systems, manager tactics, transfer sagas and dressing-room chaos. Example titles: 'How Arteta Rebuilt Arsenal's Press', 'The Collapse of Chelsea's Billion-Pound Project', 'Why Barcelona Can't Defend Counter-Attacks', 'Inside Man United's Dressing Room Crisis'

Ton **enerjik** · konu spor 0.57, egitim 0.29, finans 0.14 · rakip/nis: @VyroSports (verilen rakip) · olusturma 2026-11-24 21:22

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | grafit-neon |
| font | poster-dar |
| hareket | yay-esnek |
| bitis | neon-parilti |
| baslik | dikey-yigin |
| baslik2 | maske-yukari |
| altyazi | kelime-pop |
| altbant | blok-kayma |
| sayi | rulo |
| hud | derinlik-cetvel |
| harita | ok-yay |
| grafik | cizgi-isik |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Oswald (3), Noto Serif JP (1) · aile: sans-dar %83, japonca %17 | poster-dar (baslik Anton, aile sans-dar) | YouTube kaniti 1.00 (sans-dar: nis %64, genel %45); konu uyumu 3.18 (ton + · konu spor · enerji 4 · his dinamik) |
| gecis | sert %78, karartma %18, flas %2 | maske-capraz, tint-sizinti, whip-sol (yumusak oran 0.3 — iskelet rakipten) | maske-capraz: YouTube kaniti 0.03 (maske: nis %0, genel %1); konu uyumu 3.88 (ton + · konu spor/finans · enerji 4 · his dinamik/modern); tint-sizinti: YouTube kaniti 0.18 (flas: nis %4, genel %3); konu uyumu 1.08 (ton + · konu - · enerji 3 · his dinamik); whip-sol: YouTube kaniti 0.01 (hareket: nis %0, genel %1); konu uyumu 2.55 (ton + · konu spor · enerji 5 · his dinamik) |
| kamera | sabit %35, ken-burns-ice %31, ken-burns-disa %24 | zoom-darbe, paralaks-cift, dolly-egik | zoom-darbe: konu uyumu 3.18 (ton + · konu spor · enerji 4 · his dinamik); paralaks-cift: konu uyumu 0.87 (ton + · konu - · enerji 3 · his modern); dolly-egik: konu uyumu 1.90 (ton + · konu spor · enerji 3 · his -) |
| cerceve | tam %90, bulanik-kopya %7, letterbox %2 | bolunmus, kolaj | bolunmus: YouTube kaniti 0.05 (bolunmus: nis %0, genel %0); konu uyumu 3.88 (ton + · konu spor/finans · enerji 4 · his dinamik/modern); kolaj: konu uyumu 0.80 (ton + · konu - · enerji 3 · his -) |
| altyazi | kutulu %67, yok %33 | kelime-pop | YouTube kaniti 0.01 (kelime: nis %0, genel %1); konu uyumu 2.55 (ton + · konu spor · enerji 5 · his dinamik) |
| palet | koyu-renkli %100 | grafit-neon (koyu-notr) | YouTube kaniti 1.00 (koyu-notr: nis %58, genel %68); konu uyumu 2.57 (ton + · konu spor · enerji 4 · his modern) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | dikey-yigin + maske-yukari | konu uyumu 3.39 (ton + · konu spor · enerji 4 · his dinamik/modern) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | blok-kayma | konu uyumu 2.55 (ton + · konu spor/finans · enerji 3 · his resmi/modern) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | rulo | konu uyumu 2.92 (ton + · konu finans/spor · enerji 3 · his dinamik) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | neon-parilti | konu uyumu 3.18 (ton + · konu spor · enerji 4 · his dinamik) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | derinlik-cetvel | konu uyumu 0.80 (ton + · konu - · enerji 3 · his -) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | ok-yay | konu uyumu 3.39 (ton + · konu spor · enerji 4 · his dinamik/resmi) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | cizgi-isik | konu uyumu 1.17 (ton + · konu finans · enerji 3 · his modern) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 2.1 sn, kesim/dk 26.0, genel medyan 2.235 sn
- yumusak gecis orani 0.3, gecis 7 kare, SFX orani 0.495, cerceveli oran 0.15

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/zz-test-futbol/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/zz-test-futbol/vNN`

## Onizleme

- `C:\otomasyon\zz-test-futbol\sablon\onizleme-01.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-02.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-03.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-04.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-05.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-06.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-07.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-08.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-09.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-10.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\onizleme-11.jpg`
- `C:\otomasyon\zz-test-futbol\sablon\ONIZLEME.jpg`
