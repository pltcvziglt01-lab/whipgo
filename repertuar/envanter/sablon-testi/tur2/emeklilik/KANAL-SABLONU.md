# Kanal sablonu — zz-test-emeklilik

**Konsept:** Retirement and personal finance with calm, reassuring narration for people 50+. Pensions, savings, budgeting, Social Security. Example titles: 'How Much Do You Really Need to Retire?', 'The 4% Rule Explained Simply', '5 Social Security Mistakes That Cost You Thousands', 'Downsizing in Retirement: Is It Worth It?'

Ton **ciddi** · konu finans 0.50, egitim 0.50 · rakip/nis: @SeitenblickTV, @FortuneOfNations, @AmericanFarmChronicle, @AnneliesGoedGeregeldNa60 (nis (kutuphane, konsepte gore)) · olusturma 2026-11-24 21:24

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | bordo-krem |
| font | grotesk-modern |
| hareket | kubik-hizli |
| bitis | temiz-dijital |
| baslik | arama-cubugu |
| baslik2 | alt-cizgi |
| altyazi | renkli-aktif |
| altbant | cizgi-acilis |
| sayi | cubuk |
| hud | tarih-rozeti |
| harita | kesik-rota |
| grafik | basamak |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Alfa Slab One (2), Poppins (1) · aile: sans-dar %62, slab %25 | grotesk-modern (baslik SpaceGrotesk, aile sans) | YouTube kaniti 0.29 (sans: nis %14, genel %11); konu uyumu 4.72 (ton + · konu finans/egitim · enerji 3 · his modern/temiz) |
| gecis | karartma %41, sert %40, zoom %9 | renk-bandi, film-yanigi (yumusak oran 0.81 — iskelet rakipten) | renk-bandi: YouTube kaniti 0.04 (maske: nis %1, genel %1); konu uyumu 2.65 (ton + · konu egitim/finans · enerji 4 · his modern/temiz); film-yanigi: YouTube kaniti 0.14 (flas: nis %3, genel %3); konu uyumu 0.99 (ton + · konu - · enerji 2 · his -) |
| kamera | ken-burns-ice %42, ken-burns-disa %41, sabit %14 | el-kamerasi, paralaks-cift, ken-burns-disa | el-kamerasi: konu uyumu 0.87 (ton + · konu - · enerji 3 · his -); paralaks-cift: konu uyumu 1.13 (ton + · konu - · enerji 3 · his modern); ken-burns-disa: YouTube kaniti 0.67 (ken-burns-disa: nis %27, genel %21); konu uyumu 0.73 (ton + · konu - · enerji 1 · his -) |
| cerceve | tam %90, bulanik-kopya %6, inset-golge %3 | yuvarlak-yan, inset-golge | yuvarlak-yan: konu uyumu 3.49 (ton + · konu egitim · enerji 2 · his modern/temiz); inset-golge: YouTube kaniti 0.70 (inset-golge: nis %5, genel %4); konu uyumu 5.39 (ton + · konu finans/egitim · enerji 2 · his modern/temiz) |
| altyazi | yok %75, sinema %25 | renkli-aktif | YouTube kaniti 0.01 (vurgulu: nis %0, genel %3); konu uyumu 2.48 (ton + · konu finans · enerji 3 · his modern) |
| palet | koyu-renkli %50, acik %50 | bordo-krem (koyu-renkli) | YouTube kaniti 0.37 (koyu-renkli: nis %24, genel %27); konu uyumu 2.18 (ton + · konu finans · enerji 2 · his -) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | arama-cubugu + alt-cizgi | konu uyumu 4.72 (ton + · konu egitim/finans · enerji 3 · his modern/temiz) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | cizgi-acilis | konu uyumu 1.29 (ton + · konu - · enerji 2 · his resmi) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | cubuk | konu uyumu 4.38 (ton + · konu finans/egitim · enerji 2 · his temiz) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | temiz-dijital | konu uyumu 4.72 (ton + · konu finans/egitim · enerji 3 · his temiz/modern) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | tarih-rozeti | konu uyumu 1.29 (ton + · konu - · enerji 2 · his resmi) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | kesik-rota | konu uyumu 2.83 (ton + · konu egitim · enerji 2 · his temiz) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | basamak | konu uyumu 2.48 (ton + · konu finans · enerji 3 · his resmi) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 6.6 sn, kesim/dk 11.0, genel medyan 7.26 sn
- yumusak gecis orani 0.81, gecis 10 kare, SFX orani 0.42, cerceveli oran 0.15

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/zz-test-emeklilik/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/zz-test-emeklilik/vNN`

## Onizleme

- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-01.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-02.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-03.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-04.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-05.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-06.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-07.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-08.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-09.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-10.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\onizleme-11.jpg`
- `C:\otomasyon\zz-test-emeklilik\sablon\ONIZLEME.jpg`
