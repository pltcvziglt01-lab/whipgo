# Kanal sablonu — zz-test-sehir

**Konsept:** Forgotten stories of historic cities for a German-speaking audience (German narration and on-screen text). Hidden history, lost districts, legends of old towns. Example titles: 'Die vergessene Geschichte von Lübeck', 'Was unter Köln begraben liegt', 'Danzig: Die Stadt, die zweimal starb', 'Die verlorenen Viertel von Wien'

Ton **ciddi** · konu tarih 0.60, gizem 0.20, biyografi 0.20 · rakip/nis: @Undertold-usa, @AlltagZerlegt, @BuiltonYou, @Ethos-j7t (nis (kutuphane, konsepte gore)) · olusturma 2026-11-24 21:25

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | orman-altin |
| font | gazete |
| hareket | kubik-hizli |
| bitis | sicak-hale |
| baslik | bulaniklik |
| baslik2 | kutu-vurgu |
| altyazi | sinema |
| altbant | cizgi-acilis |
| sayi | el-alti-cizgi |
| hud | zaman-kodu |
| harita | isik-rota |
| grafik | basamak |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Cinzel (2), Cormorant Garamond (2) · aile: serif %62, sans-dar %25 | gazete (baslik AbrilFatface, aile serif) | YouTube kaniti 0.82 (serif: nis %36, genel %30); konu uyumu 2.71 (ton + · konu tarih · enerji 2 · his arsiv) |
| gecis | sert %83, karartma %9, zoom %4 | filmburn, kareli-kagit, perde (yumusak oran 0.09 — iskelet rakipten) | filmburn: YouTube kaniti 0.12 (flas: nis %3, genel %3); konu uyumu 4.63 (ton + · konu tarih/biyografi · enerji 2 · his arsiv/sinematik/sicak); kareli-kagit: YouTube kaniti 0.02 (maske: nis %0, genel %1); konu uyumu 2.37 (ton + · konu tarih · enerji 3 · his belgesel); perde: YouTube kaniti 0.02 (maske: nis %0, genel %1); konu uyumu 3.24 (ton + · konu biyografi/tarih · enerji 2 · his sinematik) |
| kamera | ken-burns-ice %54, sabit %38, ken-burns-disa %7 | ken-burns-ice, paralaks-cift, pan-yukari | ken-burns-ice: YouTube kaniti 1.00 (ken-burns-ice: nis %44, genel %39); konu uyumu 2.37 (ton + · konu tarih/biyografi · enerji 1 · his belgesel); paralaks-cift: konu uyumu 2.84 (ton + · konu tarih/biyografi · enerji 3 · his sinematik); pan-yukari: YouTube kaniti 0.11 (pan-yukari: nis %5, genel %4); konu uyumu 3.24 (ton + · konu tarih/biyografi · enerji 2 · his sinematik) |
| cerceve | tam %75, bulanik-kopya %17, inset-golge %8 | letterbox, film-seridi | letterbox: YouTube kaniti 0.26 (letterbox: nis %3, genel %2); konu uyumu 2.71 (ton + · konu tarih · enerji 2 · his sinematik); film-seridi: konu uyumu 3.24 (ton + · konu tarih/biyografi · enerji 2 · his arsiv) |
| altyazi | yok %75, vurgulu %25 | sinema | YouTube kaniti 0.08 (sinema: nis %7, genel %7); konu uyumu 2.63 (ton + · konu tarih/biyografi · enerji 1 · his sinematik/belgesel) |
| palet | koyu-notr %75, acik %25 | orman-altin (koyu-renkli) | YouTube kaniti 0.39 (koyu-renkli: nis %26, genel %27); konu uyumu 4.28 (ton + · konu tarih/biyografi · enerji 2 · his sicak/belgesel) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | bulaniklik + kutu-vurgu | konu uyumu 3.77 (ton + · konu biyografi/tarih/gizem · enerji 2 · his sinematik) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | cizgi-acilis | konu uyumu 3.24 (ton + · konu tarih/biyografi · enerji 2 · his belgesel) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | el-alti-cizgi | konu uyumu 5.39 (ton + · konu tarih/biyografi/gizem · enerji 2 · his arsiv/belgesel/sicak) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | sicak-hale | konu uyumu 2.17 (ton + · konu biyografi · enerji 2 · his sicak/sinematik) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | zaman-kodu | konu uyumu 1.59 (ton + · konu gizem · enerji 3 · his teknik/sinematik) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | isik-rota | konu uyumu 4.58 (ton + · konu tarih/gizem/biyografi · enerji 2 · his sinematik/belgesel/karanlik) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | basamak | konu uyumu 0.97 (ton + · konu - · enerji 3 · his teknik) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 4.62 sn, kesim/dk 15.0, genel medyan 4.88 sn
- yumusak gecis orani 0.09, gecis 9 kare, SFX orani 0.345, cerceveli oran 0.25

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/zz-test-sehir/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/zz-test-sehir/vNN`

## Onizleme

- `C:\otomasyon\zz-test-sehir\sablon\onizleme-01.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-02.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-03.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-04.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-05.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-06.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-07.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-08.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-09.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-10.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\onizleme-11.jpg`
- `C:\otomasyon\zz-test-sehir\sablon\ONIZLEME.jpg`
