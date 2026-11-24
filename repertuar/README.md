# REPERTUAR — Remotion edit dili bilesenleri (2026-11-24)

Amac: her kanal/video kendi edit dilini kullansin, izleyici "klasik Claude" kurgusunu (koyu lacivert zemin + tek kirmizi,
asagidan yay ile belirme, her karede gren+vinyet, her fotoda 1.05 Ken Burns) gormesin.

| Dosya | Icerik |
|---|---|
| `temel.ts` | tohumlu rastgele, gurultu, 16 palet, 12 font cifti, 7 hareket egrisi, `Stil` |
| `Arkaplan.tsx` + `ArkaplanEdit.tsx` | 26 animasyonlu arka plan (16 genel + 10 "edit paketi": dalgali/balon/kayan izgara, dama, radar, altigen, spot, grenli gradyan, kareli defter, hiz cizgileri) |
| `Gecis.tsx` | 16 gecis + `GecisliDizi` (gecis plani tohumla, sertlik orani iskeletten) |
| `Yazi.tsx` | 13 baslik girisi, 7 altyazi stili (kelime zamanli) |
| `Kart.tsx` | alt bant (5), sayi (4), alinti (3), liste (2), karsilastirma, zaman cizelgesi (2) |
| `Medya.tsx` | 10 kamera hareketi, 11 cerceve/duzen (animasyonlu zeminli), 9 doku |
| `Dna.tsx` | `stil-dna.json` -> `DnaDizi`, `DnaMedya`, `DnaBaslik`, `DnaAltyazi`, `DnaSayi`... (video kodu yalniz bunlari kullanir) |
| `Onizleme.tsx` | ayni icerik + farkli DNA = A/B onizleme (~12 sn) |
| `Preset.tsx` | Premiere `.prfpset` presetlerinden OGRENILMIS hareketler (zoom, shake, slide, whip, blur-in, pop): `PresetHareket preset={...}`. Veri `_araclar/preset_ogren.py paket.prfpset` ile kullanicinin makinesinde uretilir (`*-remotion.json`), dagitilmaz |
| `FontYukle.tsx` | `public/fontlar/<Ad>.ttf` yukler (kutuphanenin `fontlar/` klasorunden kopyala) |

## Kanal projesinde kullanim
1. Bu klasoru kanalin `motion/src/repertuar/` altina kopyala; kutuphanenin `fontlar/*.ttf` dosyalarini `motion/public/fontlar/`'a kopyala.
2. DNA uret: `py "<KUT>/_araclar/stil_dna.py" --rakip @Rakip --ton ciddi|enerjik|sakin --gecmis v01/stil-dna.json v02/... --cikti v04/`
   -> `stil-dna-A.json`, `stil-dna-B.json`, `STIL-DNA.md` (rakip vs secenekler, kanit kanallari, kontrol).
3. Root.tsx'e `Onizleme` kompozisyonunu ekle (`calculateMetadata: onizlemeSuresi`), A ve B'yi `--props` ile render et, kanalin ILK videosunda kullaniciya sor; sonraki videolarda A otomatik (gecmis + kilit palet,font).
4. VideoNN.tsx: `import dna from './stil-dna.json'` -> sahneleri `DnaDizi` ile kur; kart/baslik/altyazi/medya icin Dna* bilesenleri.

## Kurallar
- Iskelet rakipten: sahne sureleri (ilk 30 sn medyan), gecis suresi (`iskelet.gecis_kare`), yumusak gecis orani, SFX orani.
- Yuzey DNA'dan: rakipten en az 6/7 eksen farkli, son 3 videodan en az 6 eksen farkli, klasik skor 0.
- Yeni bilesen: `*_TIPLERI` listesine ekle (stil_dna.py listeleri buradan okur), katalog render et, gozle kontrol et.
- Lisansli paketler (Adobe Basics arka plan/filmburn/SFX/preset) bu klasore, GitHub'a ya da paylasilan Drive'a KONMAZ (lisans: dagitim yasak); yalniz kullanicinin kendi makinesinde.
