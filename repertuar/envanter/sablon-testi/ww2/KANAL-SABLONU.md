# Kanal sablonu — _test-ww2

**Konsept:** WWII documentary channel about failed military operations and disastrous battle plans. Serious, analytical narration for adult history fans. Example titles: 'Operation Market Garden: The Bridge Too Far', 'Why the Dieppe Raid Was a Bloodbath', 'Operation Barbarossa: How Hitler Lost the War in 6 Months', 'The Disaster at Slapton Sands'

Ton **ciddi** · konu askeri 0.46, egitim 0.18, tarih 0.09, gizem 0.09 · rakip/nis: @WhereTheyStood (verilen rakip) · olusturma 2026-11-24 20:57

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | kum-terrakota |
| font | antik-baslik |
| hareket | ustel-sert |
| bitis | sinema-film |
| baslik | zemin-perspektif |
| baslik2 | kutu-vurgu |
| altyazi | yok |
| altbant | cizgi-acilis |
| sayi | uzun-golge |
| hud | dosya-sekmesi |
| harita | bolgeli-uydu |
| grafik | basamak |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Cormorant Garamond (2) · aile: serif %100 | antik-baslik (baslik Cinzel, aile serif) | YouTube kaniti 0.71 (serif: nis %31, genel %30); konu uyumu 2.54 (ton + · konu tarih/askeri · enerji 2 · his sinematik/arsiv) |
| gecis | sert %94, karartma %3, flas %2 | bulanik-hayalet, renk-bandi, film-yanigi (yumusak oran 0.07 — iskelet rakipten) | bulanik-hayalet: YouTube kaniti 1.00 (karartma: nis %22, genel %21); konu uyumu 2.92 (ton + · konu askeri/tarih/gizem · enerji 2 · his arsiv/sinematik/karanlik); renk-bandi: YouTube kaniti 0.04 (maske: nis %1, genel %1); konu uyumu 0.81 (ton + · konu egitim · enerji 4 · his modern/temiz); film-yanigi: YouTube kaniti 0.12 (flas: nis %2, genel %3); konu uyumu 2.54 (ton + · konu tarih/askeri · enerji 2 · his arsiv/sinematik) |
| kamera | ken-burns-ice %61, sabit %20, ken-burns-disa %13 | dolly-egik, ken-burns-ice, pan-yukari | dolly-egik: konu uyumu 1.11 (ton + · konu muhendislik · enerji 3 · his sinematik); ken-burns-ice: YouTube kaniti 1.00 (ken-burns-ice: nis %40, genel %39); konu uyumu 1.94 (ton + · konu tarih/askeri/muhendislik · enerji 1 · his belgesel); pan-yukari: YouTube kaniti 0.10 (pan-yukari: nis %4, genel %4); konu uyumu 1.50 (ton + · konu tarih/muhendislik · enerji 2 · his sinematik) |
| cerceve | tam %73, inset-golge %25, bulanik-kopya %2 | tv-crt, bulanik-kopya | tv-crt: konu uyumu 1.11 (ton + · konu tarih · enerji 3 · his arsiv); bulanik-kopya: YouTube kaniti 1.00 (bulanik-kopya: nis %7, genel %6); konu uyumu 1.27 (ton + · konu yasam · enerji 2 · his modern) |
| altyazi | yok %100 | yok | YouTube kaniti 1.00 (yok: nis %82, genel %82); konu uyumu 1.77 (ton + · konu tarih/askeri · enerji 1 · his belgesel) |
| palet | koyu-notr %100 | kum-terrakota (acik) | YouTube kaniti 0.07 (acik: nis %4, genel %6); konu uyumu 1.50 (ton + · konu tarih/yasam · enerji 2 · his sicak) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | zemin-perspektif + kutu-vurgu | konu uyumu 3.02 (ton + · konu muhendislik/tarih/askeri/gizem · enerji 2 · his sinematik/teknik) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | cizgi-acilis | konu uyumu 3.33 (ton + · konu askeri/tarih/muhendislik · enerji 2 · his belgesel/resmi) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | uzun-golge | konu uyumu 0.74 (ton + · konu egitim · enerji 4 · his modern) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | sinema-film | konu uyumu 2.78 (ton + · konu tarih/askeri/gizem · enerji 2 · his sinematik/karanlik) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | dosya-sekmesi | konu uyumu 3.29 (ton + · konu askeri/egitim/gizem · enerji 3 · his resmi/teknik/modern) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | bolgeli-uydu | konu uyumu 3.03 (ton + · konu askeri/tarih/gizem · enerji 3 · his teknik/karanlik/resmi) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | basamak | konu uyumu 2.66 (ton + · konu muhendislik/askeri · enerji 3 · his teknik/resmi) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 2.67 sn, kesim/dk 24.0, genel medyan 3.03 sn
- yumusak gecis orani 0.07, gecis 13 kare, SFX orani 0.33, cerceveli oran 0.27

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/_test-ww2/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/_test-ww2/vNN`

## Onizleme

- `C:\otomasyon\_test-ww2\sablon\onizleme-1.jpg`
- `C:\otomasyon\_test-ww2\sablon\onizleme-2.jpg`
- `C:\otomasyon\_test-ww2\sablon\onizleme-3.jpg`
- `C:\otomasyon\_test-ww2\sablon\onizleme-4.jpg`
- `C:\otomasyon\_test-ww2\sablon\onizleme-5.jpg`
- `C:\otomasyon\_test-ww2\sablon\onizleme-6.jpg`
- `C:\otomasyon\_test-ww2\sablon\ONIZLEME.jpg`
