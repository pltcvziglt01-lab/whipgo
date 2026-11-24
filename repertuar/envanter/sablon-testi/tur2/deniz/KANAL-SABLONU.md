# Kanal sablonu — zz-test-deniz

**Konsept:** Lost ships and unsolved maritime mysteries: ghost ships, vanished crews, shipwrecks never found. Atmospheric investigative storytelling. Example titles: 'The Mary Celeste: Where Did the Crew Go?', 'SS Waratah: The Liner That Vanished Without a Trace', 'The Ghost Ship Found Drifting in the Bermuda Triangle', 'What Really Sank the Edmund Fitzgerald'

Ton **gizem** · konu gizem 0.70, tarih 0.20, korku 0.10 · rakip/nis: @FlyWithCarla, @TheQuietRecord1, @TheUnreturned-b2k, @Wasserschweigen (nis (kutuphane, konsepte gore)) · olusturma 2026-11-24 21:23

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | gece-turkuaz |
| font | editoryal-serif |
| hareket | adim-stop |
| bitis | sinema-film |
| baslik | zemin-perspektif |
| baslik2 | bulaniklik |
| altyazi | sinema |
| altbant | damga |
| sayi | serif-zarif |
| hud | koordinat |
| harita | bolgeli-uydu |
| grafik | cizgi-isik |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Lora (2), Times New Roman (1) · aile: serif %62, sans-dar %12 | editoryal-serif (baslik DMSerifDisplay, aile serif) | UYARI rakiple ayni baslik fontu! YouTube kaniti 1.00 (serif: nis %47, genel %30); konu uyumu 1.57 (ton + · konu tarih · enerji 2 · his sinematik) |
| gecis | sert %84, karartma %11, flas %4 | filmburn, zoom-icinden, glitch-rgb (yumusak oran 0.18 — iskelet rakipten) | filmburn: YouTube kaniti 0.13 (flas: nis %3, genel %3); konu uyumu 2.24 (ton + · konu tarih/korku · enerji 2 · his arsiv/sinematik/sicak); zoom-icinden: YouTube kaniti 0.06 (zoom: nis %1, genel %2); konu uyumu 1.17 (ton + · konu gizem · enerji 4 · his sinematik); glitch-rgb: YouTube kaniti 0.03 (glitch: nis %1, genel %1); konu uyumu 1.34 (ton + · konu korku/gizem · enerji 4 · his retro/karanlik) |
| kamera | ken-burns-ice %53, sabit %31, ken-burns-disa %9 | el-kamerasi, ken-burns-ice, ken-burns-disa | el-kamerasi: konu uyumu 2.62 (ton + · konu korku/gizem · enerji 3 · his sinematik/karanlik); ken-burns-ice: YouTube kaniti 1.00 (ken-burns-ice: nis %44, genel %39); konu uyumu 1.54 (ton + · konu tarih/korku · enerji 1 · his belgesel); ken-burns-disa: YouTube kaniti 0.38 (ken-burns-disa: nis %14, genel %21); konu uyumu 1.40 (ton + · konu tarih · enerji 1 · his belgesel/sinematik) |
| cerceve | tam %94, bulanik-kopya %3, inset-golge %1 | tv-crt, letterbox | tv-crt: konu uyumu 1.63 (ton + · konu tarih/korku · enerji 3 · his retro/arsiv); letterbox: YouTube kaniti 0.33 (letterbox: nis %1, genel %2); konu uyumu 1.82 (ton + · konu tarih/korku · enerji 2 · his sinematik) |
| altyazi | yok %100 | sinema | YouTube kaniti 0.05 (sinema: nis %2, genel %7); konu uyumu 1.63 (ton + · konu tarih/korku · enerji 1 · his sinematik/belgesel) |
| palet | koyu-renkli %50, koyu-notr %50 | gece-turkuaz (koyu-notr) | YouTube kaniti 1.00 (koyu-notr: nis %67, genel %68); konu uyumu 2.27 (ton + · konu gizem · enerji 3 · his karanlik) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | zemin-perspektif + bulaniklik | konu uyumu 4.68 (ton + · konu tarih/gizem · enerji 2 · his sinematik/teknik) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | damga | konu uyumu 3.90 (ton + · konu tarih/gizem · enerji 3 · his arsiv/teknik) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | serif-zarif | konu uyumu 1.40 (ton + · konu tarih · enerji 1 · his belgesel/sinematik) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | sinema-film | konu uyumu 3.81 (ton + · konu tarih/korku/gizem · enerji 2 · his sinematik/karanlik) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | koordinat | konu uyumu 3.18 (ton + · konu gizem · enerji 3 · his teknik/karanlik) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | bolgeli-uydu | konu uyumu 3.74 (ton + · konu tarih/gizem · enerji 3 · his teknik/karanlik) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | cizgi-isik | konu uyumu 3.18 (ton + · konu gizem · enerji 3 · his karanlik/teknik) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 5.165 sn, kesim/dk 13.0, genel medyan 5.475 sn
- yumusak gecis orani 0.18, gecis 13 kare, SFX orani 0.53, cerceveli oran 0.15

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/zz-test-deniz/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/zz-test-deniz/vNN`

## Onizleme

- `C:\otomasyon\zz-test-deniz\sablon\onizleme-01.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-02.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-03.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-04.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-05.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-06.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-07.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-08.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-09.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-10.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\onizleme-11.jpg`
- `C:\otomasyon\zz-test-deniz\sablon\ONIZLEME.jpg`
