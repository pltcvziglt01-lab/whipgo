# Kanal sablonu — _test-emeklilik

**Konsept:** Retirement and personal finance with calm, reassuring narration for people 50+. Pensions, savings, budgeting, Social Security. Example titles: 'How Much Do You Really Need to Retire?', 'The 4% Rule Explained Simply', '5 Social Security Mistakes That Cost You Thousands', 'Downsizing in Retirement: Is It Worth It?'

Ton **ciddi** · konu finans 0.50, egitim 0.50 · rakip/nis: @SeitenblickTV, @FortuneOfNations, @AmericanFarmChronicle, @AnneliesGoedGeregeldNa60 (nis (kutuphane, konsepte gore)) · olusturma 2026-11-24 21:07

## Kimlik (her videoda ayni — kanal bununla taninir)

| eksen | secim |
|---|---|
| palet | bordo-krem |
| font | antik-baslik |
| hareket | kubik-hizli |
| bitis | temiz-dijital |
| baslik | el-elips |
| baslik2 | zemin-perspektif |
| altyazi | kutulu |
| altbant | blok-kayma |
| sayi | sayac |
| hud | dosya-sekmesi |
| harita | kesik-rota |
| grafik | alan-dolgu |

Videodan videoya degisen eksenler: arkaplan, gecis, kamera, cerceve, doku, alinti, liste, zaman, vurgu, kayma (stil_dna.py --sablon her videoda >= %20 farkli secer).

## Rakip -> biz ceviri tablosu

Iskelet (tempo, kesim sikligi, yumusak gecis orani, SFX orani) rakipten/nisten KORUNUR; yuzey bize ozgu.

| eksen | rakip (olculen) | biz | neden |
|---|---|---|---|
| font | Alfa Slab One (2), Poppins (1) · aile: sans-dar %62, slab %25 | antik-baslik (baslik Cinzel, aile serif) | YouTube kaniti 0.64 (serif: nis %27, genel %30); konu uyumu 0.99 (ton + · konu - · enerji 2 · his -) |
| gecis | karartma %41, sert %40, zoom %9 | filmburn, renk-bandi, supurme-inset (yumusak oran 0.81 — iskelet rakipten) | filmburn: YouTube kaniti 0.14 (flas: nis %3, genel %3); konu uyumu 0.99 (ton + · konu - · enerji 2 · his -); renk-bandi: YouTube kaniti 0.04 (maske: nis %1, genel %1); konu uyumu 2.65 (ton + · konu egitim/finans · enerji 4 · his modern/temiz); supurme-inset: YouTube kaniti 0.02 (hareket: nis %0, genel %1); konu uyumu 3.05 (ton + · konu finans · enerji 3 · his modern/resmi) |
| kamera | ken-burns-ice %42, ken-burns-disa %41, sabit %14 | ken-burns-ice, paralaks-cift, dolly-egik | ken-burns-ice: YouTube kaniti 1.00 (ken-burns-ice: nis %36, genel %39); konu uyumu 0.73 (ton + · konu - · enerji 1 · his -); paralaks-cift: konu uyumu 1.13 (ton + · konu - · enerji 3 · his modern); dolly-egik: konu uyumu 0.87 (ton + · konu - · enerji 3 · his -) |
| cerceve | tam %90, bulanik-kopya %6, inset-golge %3 | inset-golge, yuvarlak-yan | inset-golge: YouTube kaniti 0.70 (inset-golge: nis %5, genel %4); konu uyumu 5.39 (ton + · konu finans/egitim · enerji 2 · his modern/temiz); yuvarlak-yan: konu uyumu 3.49 (ton + · konu egitim · enerji 2 · his modern/temiz) |
| altyazi | yok %75, sinema %25 | kutulu | YouTube kaniti 0.13 (kutulu: nis %12, genel %7); konu uyumu 3.05 (ton + · konu finans · enerji 3 · his modern/resmi) |
| palet | koyu-renkli %50, acik %50 | bordo-krem (koyu-renkli) | YouTube kaniti 0.37 (koyu-renkli: nis %24, genel %27); konu uyumu 2.18 (ton + · konu finans · enerji 2 · his -) |
| baslik | (olculmez; EDIT-DILI.md gozlemi) | el-elips + zemin-perspektif | konu uyumu 1.13 (ton + · konu - · enerji 3 · his resmi) |
| altbant | (olculmez; EDIT-DILI.md gozlemi) | blok-kayma | konu uyumu 3.05 (ton + · konu finans · enerji 3 · his resmi/modern) |
| sayi | (olculmez; EDIT-DILI.md gozlemi) | sayac | konu uyumu 5.39 (ton + · konu finans/egitim · enerji 2 · his temiz/resmi) |
| bitis | (olculmez; EDIT-DILI.md gozlemi) | temiz-dijital | konu uyumu 4.72 (ton + · konu finans/egitim · enerji 3 · his temiz/modern) |
| hud | (olculmez; EDIT-DILI.md gozlemi) | dosya-sekmesi | konu uyumu 3.05 (ton + · konu egitim · enerji 3 · his resmi/modern) |
| harita | (olculmez; EDIT-DILI.md gozlemi) | kesik-rota | konu uyumu 2.83 (ton + · konu egitim · enerji 2 · his temiz) |
| grafik | (olculmez; EDIT-DILI.md gozlemi) | alan-dolgu | konu uyumu 4.72 (ton + · konu finans/egitim · enerji 3 · his modern/temiz) |

## Iskelet (korunan)

- ilk 30 sn medyan cekim 6.6 sn, kesim/dk 11.0, genel medyan 7.26 sn
- yumusak gecis orani 0.81, gecis 10 kare, SFX orani 0.42, cerceveli oran 0.15

## Kullanim

`py stil_dna.py --sablon C:/otomasyon/_test-emeklilik/kanal-sablon.json --konu "<video basligi + anlatilan olay>" --cikti C:/otomasyon/_test-emeklilik/vNN`

## Onizleme

- `C:\otomasyon\_test-emeklilik\sablon\onizleme-1.jpg`
- `C:\otomasyon\_test-emeklilik\sablon\onizleme-2.jpg`
- `C:\otomasyon\_test-emeklilik\sablon\onizleme-3.jpg`
- `C:\otomasyon\_test-emeklilik\sablon\onizleme-4.jpg`
- `C:\otomasyon\_test-emeklilik\sablon\onizleme-5.jpg`
- `C:\otomasyon\_test-emeklilik\sablon\onizleme-6.jpg`
- `C:\otomasyon\_test-emeklilik\sablon\ONIZLEME.jpg`
