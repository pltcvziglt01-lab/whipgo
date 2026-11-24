# Kanal sablonu — _test-sehir

**Konsept:** Forgotten stories of historic cities for a German-speaking audience (German narration and on-screen text). Hidden history, lost districts, legends of old towns. Example titles: 'Die vergessene Geschichte von Lübeck', 'Was unter Köln begraben liegt', 'Danzig: Die Stadt, die zweimal starb', 'Die verlorenen Viertel von Wien'

Ton **ciddi** · konu tarih 0.60, gizem 0.20, biyografi 0.20 · rakip/nis: @Undertold-usa, @AlltagZerlegt, @BuiltonYou, @Ethos-j7t (nis (kutuphane, konsepte gore)) · olusturma 2026-11-24 21:07

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | bordo-krem |
| font | antik-baslik |
| hareket | dogrusal-mekanik |
| bitis | arsiv-proje |
| baslik | zemin-perspektif |
| baslik2 | bulaniklik |
| altyazi | yok |
| altbant | damga |
| sayi | el-alti-cizgi |
| hud | derinlik-cetvel |
| harita | isik-rota |
| grafik | cizgi-isik |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Cinzel (2), Cormorant Garamond (2) · aile: serif %62, sans-dar %25 | antik-baslik (baslik Cinzel, aile serif) | YouTube kaniti 0.82 (serif: nis %36, genel %30); konu uyumu 3.00 (ton + · konu tarih · enerji 2 · his sinematik/arsiv) |
| gecis | sert %83, karartma %9, zoom %4 | filmburn, supurme-inset, zoom-icinden (yumusak oran 0.09 — iskelet rakipten) | filmburn: YouTube kaniti 0.12 (flas: nis %3, genel %3); konu uyumu 4.63 (ton + · konu tarih/biyografi · enerji 2 · his arsiv/sinematik/sicak); supurme-inset: YouTube kaniti 0.03 (hareket: nis %1, genel %1); konu uyumu 0.97 (ton + · konu - · enerji 3 · his teknik); zoom-icinden: YouTube kaniti 0.08 (zoom: nis %2, genel %2); konu uyumu 0.81 (ton + · konu gizem · enerji 4 · his sinematik) |
| kamera | ken-burns-ice %54, sabit %38, ken-burns-disa %7 | dolly-egik, pan-yukari, paralaks-cift | dolly-egik: konu uyumu 0.97 (ton + · konu - · enerji 3 · his sinematik); pan-yukari: YouTube kaniti 0.11 (pan-yukari: nis %5, genel %4); konu uyumu 3.24 (ton + · konu tarih/biyografi · enerji 2 · his sinematik); paralaks-cift: konu uyumu 2.84 (ton + · konu tarih/biyografi · enerji 3 · his sinematik) |
| cerceve | tam %75, bulanik-kopya %17, inset-golge %8 | letterbox, altin-cerceve | letterbox: YouTube kaniti 0.26 (letterbox: nis %3, genel %2); konu uyumu 2.71 (ton + · konu tarih · enerji 2 · his sinematik); altin-cerceve: konu uyumu 2.63 (ton + · konu tarih/biyografi · enerji 1 · his arsiv/sinematik) |
| altyazi | yok %75, vurgulu %25 | yok | YouTube kaniti 1.00 (yok: nis %86, genel %82); konu uyumu 2.37 (ton + · konu tarih/biyografi · enerji 1 · his belgesel) |
| palet | koyu-notr %75, acik %25 | bordo-krem (koyu-renkli) | YouTube kaniti 0.39 (koyu-renkli: nis %26, genel %27); konu uyumu 4.28 (ton + · konu tarih/biyografi · enerji 2 · his sinematik/sicak) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | zemin-perspektif + bulaniklik | konu uyumu 4.18 (ton + · konu tarih/gizem/biyografi · enerji 2 · his sinematik/teknik) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | damga | konu uyumu 3.14 (ton + · konu tarih/gizem · enerji 3 · his arsiv/teknik) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | el-alti-cizgi | konu uyumu 5.39 (ton + · konu tarih/biyografi/gizem · enerji 2 · his arsiv/belgesel/sicak) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | arsiv-proje | konu uyumu 2.63 (ton + · konu tarih/biyografi · enerji 1 · his arsiv/belgesel) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | derinlik-cetvel | konu uyumu 1.59 (ton + · konu gizem · enerji 3 · his teknik/karanlik) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | isik-rota | konu uyumu 4.58 (ton + · konu tarih/gizem/biyografi · enerji 2 · his sinematik/belgesel/karanlik) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | cizgi-isik | konu uyumu 1.59 (ton + · konu gizem · enerji 3 · his karanlik/teknik) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 4.62 sn, kesim/dk 15.0, genel medyan 4.88 sn
- yumusak gecis orani 0.09, gecis 9 kare, SFX orani 0.345, cerceveli oran 0.25

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/_test-sehir/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/_test-sehir/vNN`

## Onizleme

- `C:\otomasyon\_test-sehir\sablon\onizleme-1.jpg`
- `C:\otomasyon\_test-sehir\sablon\onizleme-2.jpg`
- `C:\otomasyon\_test-sehir\sablon\onizleme-3.jpg`
- `C:\otomasyon\_test-sehir\sablon\onizleme-4.jpg`
- `C:\otomasyon\_test-sehir\sablon\onizleme-5.jpg`
- `C:\otomasyon\_test-sehir\sablon\onizleme-6.jpg`
- `C:\otomasyon\_test-sehir\sablon\ONIZLEME.jpg`
