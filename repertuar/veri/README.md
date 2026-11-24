# repertuar/veri

| Dosya | Ne | Kaynak / lisans |
|---|---|---|
| `dunya-ulkeler.json` | 201 ülke. Alanlar: `ad` (Natural Earth NAME_DE), `tr` (Türkçe ad, ~120 ülke), `k` (MultiPolygon, yalnız dış halka, lon/lat), `m` (en büyük parçanın bbox merkezi), `b` (en büyük parçanın bbox'ı). Douglas–Peucker 0,06°; alanı 0,02 derece²'den küçük adalar atıldı. | Natural Earth 1:50m (kamu malı). `C:\otomasyon\ranks\motion\src\ulkeler50-ince.json`'dan türetildi. |
| `dunya-kara-noktalari.json` | 2°'lik ızgarada karada kalan [lon, lat] noktaları (3.858). Nokta küre / nokta matrisli harita için. | aynı veri |

Kullanan: `Harita.tsx` (`dunya-haritasi-yakinlasma`, `nokta-kure`). Ülke `ad` ya da `tr` ile seçilir (`ulkeBul`).
