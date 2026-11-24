# Kanal sablonu — zz-test-ww2

**Konsept:** WWII documentary channel about failed military operations and disastrous battle plans. Serious, analytical narration for adult history fans. Example titles: 'Operation Market Garden: The Bridge Too Far', 'Why the Dieppe Raid Was a Bloodbath', 'Operation Barbarossa: How Hitler Lost the War in 6 Months', 'The Disaster at Slapton Sands'

Ton **ciddi** · konu askeri 0.46, egitim 0.18, tarih 0.09, gizem 0.09 · rakip/nis: @WhereTheyStood (verilen rakip) · olusturma 2026-11-24 21:19

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | zeytin-askeri |
| font | damga-stencil |
| hareket | ustel-sert |
| bitis | soguk-belgesel |
| baslik | el-elips |
| baslik2 | maske-yukari |
| altyazi | yok |
| altbant | damga |
| sayi | el-alti-cizgi |
| hud | dosya-sekmesi |
| harita | ok-yay |
| grafik | basamak |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Cormorant Garamond (2) · aile: serif %100 | damga-stencil (baslik Staatliches, aile sans-dar) | YouTube kaniti 1.00 (sans-dar: nis %42, genel %45); konu uyumu 2.22 (ton + · konu askeri/muhendislik · enerji 3 · his teknik/arsiv) |
| gecis | sert %94, karartma %3, flas %2 | bulaniklik, bulanik-hayalet, filmburn (yumusak oran 0.07 — iskelet rakipten) | bulaniklik: YouTube kaniti 1.00 (karartma: nis %22, genel %21); konu uyumu 1.58 (ton + · konu yasam/gizem · enerji 2 · his sinematik/yumusak); bulanik-hayalet: YouTube kaniti 1.00 (karartma: nis %22, genel %21); konu uyumu 2.92 (ton + · konu askeri/tarih/gizem · enerji 2 · his arsiv/sinematik/karanlik); filmburn: YouTube kaniti 0.12 (flas: nis %2, genel %3); konu uyumu 2.92 (ton + · konu tarih/askeri/yasam · enerji 2 · his arsiv/sinematik/sicak) |
| kamera | ken-burns-ice %61, sabit %20, ken-burns-disa %13 | paralaks-cift, dolly-egik, ken-burns-ice | paralaks-cift: konu uyumu 1.38 (ton + · konu tarih/muhendislik · enerji 3 · his sinematik/modern); dolly-egik: konu uyumu 1.11 (ton + · konu muhendislik · enerji 3 · his sinematik); ken-burns-ice: YouTube kaniti 1.00 (ken-burns-ice: nis %40, genel %39); konu uyumu 1.94 (ton + · konu tarih/askeri/muhendislik · enerji 1 · his belgesel) |
| cerceve | tam %73, inset-golge %25, bulanik-kopya %2 | altin-cerceve, bulanik-kopya | altin-cerceve: konu uyumu 2.32 (ton + · konu tarih/askeri · enerji 1 · his resmi/arsiv/sinematik); bulanik-kopya: YouTube kaniti 1.00 (bulanik-kopya: nis %7, genel %6); konu uyumu 1.27 (ton + · konu yasam · enerji 2 · his modern) |
| altyazi | yok %100 | yok | YouTube kaniti 1.00 (yok: nis %82, genel %82); konu uyumu 1.77 (ton + · konu tarih/askeri · enerji 1 · his belgesel) |
| palet | koyu-notr %100 | zeytin-askeri (koyu-notr) | YouTube kaniti 1.00 (koyu-notr: nis %67, genel %68); konu uyumu 3.33 (ton + · konu askeri/tarih/muhendislik · enerji 2 · his belgesel/resmi) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | el-elips + maske-yukari | konu uyumu 3.03 (ton + · konu askeri/tarih/gizem · enerji 3 · his arsiv/belgesel/resmi) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | damga | konu uyumu 3.03 (ton + · konu askeri/tarih/gizem · enerji 3 · his resmi/arsiv/teknik) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | el-alti-cizgi | konu uyumu 2.92 (ton + · konu tarih/askeri/gizem · enerji 2 · his arsiv/belgesel/sicak) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | soguk-belgesel | konu uyumu 3.29 (ton + · konu askeri/muhendislik · enerji 2 · his belgesel/teknik/resmi/karanlik) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | dosya-sekmesi | konu uyumu 3.29 (ton + · konu askeri/egitim/gizem · enerji 3 · his resmi/teknik/modern) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | ok-yay | konu uyumu 1.43 (ton + · konu askeri/tarih · enerji 4 · his resmi) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | basamak | konu uyumu 2.66 (ton + · konu muhendislik/askeri · enerji 3 · his teknik/resmi) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 2.67 sn, kesim/dk 24.0, genel medyan 3.03 sn
- yumusak gecis orani 0.07, gecis 13 kare, SFX orani 0.33, cerceveli oran 0.27

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/zz-test-ww2/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/zz-test-ww2/vNN`

## Onizleme

- `C:\otomasyon\zz-test-ww2\sablon\onizleme-01.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-02.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-03.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-04.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-05.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-06.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-07.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-08.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-09.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-10.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\onizleme-11.jpg`
- `C:\otomasyon\zz-test-ww2\sablon\ONIZLEME.jpg`
