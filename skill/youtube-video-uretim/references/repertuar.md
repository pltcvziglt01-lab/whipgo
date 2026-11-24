# Repertuar ve stil DNA — her video kendi edit diliyle

Kod: repo `C:\otomasyon\yt-uretim\repertuar\` (Remotion bileşenleri). Görsel katalog: `sablon-proje\katalog\*.jpg`, varlıklar: `varlik\onizleme\*-sayfa.jpg`.
Bu dosya ne zaman okunur: Faz 1a (stil önerisi) ve Faz 6 (kurgu). Paketler ve öğrenilmiş presetler: `varlik-paketleri.md`.

## 1. Neden var
Eski hatta her kanal kendi `Parcalar.tsx`'ini yazıyordu ve hepsi aynı "klasik Claude" görünümüne düşüyordu:
koyu lacivert-siyah zemin + tek kırmızı vurgu, her öğe aşağıdan 30 px yay ile belirir, her karede gren + vinyet,
her fotoğrafta 1.05 + 0.015/sn Ken Burns, ortalı büyük harf başlık + ince kırmızı çizgi. İzleyici bunu tanır.
**Kural:** Kurgu yalnız repertuar bileşenleriyle ve videonun `stil-dna.json`'u ile kurulur. Kanal başına yeni `Parcalar.tsx` yazılmaz;
eksik teknik repertuara eklenir (bkz. §5).

## 2. Repertuar (sayılar `*_TIPLERI` listelerinden; stil_dna.py bu listeleri okur)
| Eksen | Dosya | Seçenek |
|---|---|---|
| Arka plan | `Arkaplan.tsx`, `ArkaplanEdit.tsx` | 26 kod üretimi (gradyan-akış, aurora, bokeh, toz, perspektif ızgara, blueprint, topografik, nokta matris, ışık huzmesi, dalga çizgi, kâğıt, CRT, şekiller, ışık kaçağı, küre ızgara, şeritler, **dalgalı ızgara**, balon ızgara, kayan ızgara, dama, radar, altıgen, spot ışık, grenli gradyan, kareli defter, hız çizgileri) + paket videoları `video:ab-NN:sn` |
| Geçiş | `Gecis.tsx` | 16 (çözünme, bulanıklık, ışık patlaması, glitch, whip ×2, itme, maske daire/çapraz/şerit, zoom darbe, film yanığı, kart çevirme, TV kapanma, perde) + `filmburn:fb-NN:tepe` |
| Başlık | `Yazi.tsx` | 13 giriş (maske-yukarı, harf dalgası, bulanıklık, scramble, daktilo, kutu açılış, dikey yığın, harf aralığı, kontur dolma, ölçek darbe, uzun gölge, alt çizgi; `asagidan-yay` = klasik, seçilmez) |
| Altyazı | `Yazi.tsx` | 7 (kelime-pop, vurgu-kalem, kutulu, karaoke, tek-kelime, renkli-aktif, sinema) + yok |
| Kartlar | `Kart.tsx` | alt bant 5, sayı 6 (sayaç/rulo/halka/çubuk/dev-kontur/tabela), alıntı 5 (büyük tırnak/kâğıt not/daktilo belge/yan çizgi/fosfor satır), liste 4 (işaretli/numaralı yığın/panel yığını/cetvel), karşılaştırma, zaman çizelgesi 4 (yatay düğüm/dikey şerit/büyük yıl/merdiven). Kâğıt kartların tonu palete bağlı |
| Medya | `Medya.tsx` | kamera 10 (KB iç/dış, pan ×3, el kamerası, zoom darbe, dolly eğik, paralaks), çerçeve 11 (tam, inset gölge, bulanık kopya, polaroid, TV-CRT, letterbox, pencere, film şeridi, bölünmüş, kolaj, yuvarlak), doku 9 |
| Stil | `temel.ts` | 16 palet (`gece-kirmizi` klasik, seçilmez), 12 font çifti, 7 hareket eğrisi |
| **Bitiş (AE görünümü)** | `Bitis.tsx` | 6 post-prodüksiyon katmanı (sinema-film, temiz-dijital, arsiv-proje, neon-parilti, sicak-hale, soguk-belgesel): kamera nefesi (wiggle), kalkık siyahlar + split-tone grade, kayan ışık cepleri, gren, titreme, projektör sallantısı, bölüm geçişinde ışık süzülmesi. **Her video `DnaBitis` ile sarılır** — ham Remotion çıktısı "kod" gibi görünür |
| Öğrenilmiş | `Preset.tsx` | Premiere presetlerinden zoom / shake / slide / whip / blur-in (338) — `varlik-paketleri.md` |

## 3. Akış
1. Rakip kütüphaneye girmiş olmalı (`kanal_isle.py @Rakip --adet 3`).
2. DNA:
   ```
   py scripts/stil_dna.py --rakip @Rakip --konu "<başlık + anlatılan olay>" --gecmis <önceki videoların stil-dna.json> --kilit palet,font --cikti <videoNN>/
   ```
   - `--konu`: ton buradan otomatik (savaş/tarih/ekonomi = ciddi, suç/gizem/korku = gizem, teknoloji/spor/liste = enerjik, sağlık/yaşam/seyahat = sakin); kütüphanede aynı tondaki kanallar seçimi ağırlıklandırır. Gerekirse `--ton` ile elle.
   - `--kilit palet,font`: kanal kimliği (2. videodan itibaren). İlk videoda kilit yok.
   - `--cikti` kanal klasörünün içinde olmalı (`C:\otomasyon\<kanal>\...`): kanal adı buradan çıkar. `--gecmis` verilmezse kanalın önceki `stil-dna.json`'ları otomatik okunur.
   - **Kanallar arası:** diğer tüm kanalların son seçilmiş DNA'sı okunur; ondaki öğeler ilk kademede seçilmez. Kontrol: her kanalla en fazla 2 görünür eksen aynı, en fazla 1 kâğıt öğesi (kâğıt zemin / kareli defter / kâğıt doku / kâğıt-daktilo alıntı).
   - Çıktı: `stil-dna-A.json`, `stil-dna-B.json`, `stil-dna.json` (= A, yoksa yazılır), `STIL-DNA.md` (rakip vs A/B tablosu, kanıt kanalları, kontrol satırları).
3. İki kontrol satırı da `TAMAM`: (a) rakipten ve son 3 videonun her birinden en az %20 farklı, klasik skor 0; (b) §Diğer kanallarla: her kanalla ≤2 görünür eksen aynı, ≤1 kâğıt öğesi. §Konu ve ton bölümünü oku: ton konuyla çelişiyorsa `--ton` ile düzelt. Tutmuyorsa `--tohum` değiştir.
4. **Önizleme** (`sablon-proje` Root'unda `Onizleme`):
   ```
   npx remotion render src/index.ts Onizleme onizleme-A.mp4 --props=props-A.json
   ```
   props: `{ "dna": <stil-dna-A.json>, "foto": ["vNN/foto/1.jpg", ...], "baslik": "...", "bolum": "...", "presetler": <varlik/preset-dili-remotion.json> }`.
   Kanalın **ilk videosunda** A ve B'yi kullanıcıya gönder, seçtir (en fazla 2 seçenek, önerilen ilk). Sonraki videolarda A otomatik seçilir; yalnız kontrol satırı DEVAM.md'ye yazılır.
5. Seçilen DNA `videoNN/stil-dna.json` olarak kalır (yeniden render aynı görünür); kullanıcı B'yi seçerse `stil-dna-B.json` → `stil-dna.json` kopyalanır. Bu dosya hem kanalın sonraki videolarının hem **diğer kanalların** girdisidir: silinmez, elle değiştirilirse STIL-DNA.md §Diğer kanallarla satırı yeniden kontrol edilir (başka kanalda kullanılan öğe seçilmez).

## 3b. Etiketler — edit dili konsepte göre seçilir (`repertuar/etiketler.json`)
Her repertuar öğesinin etiketi var; `stil_dna.py` seçimi bunlarla yapar. **Yeni öğe etiketsiz eklenmez** (stil_dna `UYARI: etiketsiz` der).
```json
"arkaplan": { "radar-halka": { "ton": ["ciddi","gizem","enerjik"], "konu": ["askeri","suc","teknoloji"], "enerji": 3, "his": ["teknik","karanlik"], "kaynak": ["@Kanal"] } }
```
- **ton** (kapı): `ciddi` `gizem` `enerjik` `sakin` — videonun tonu listede yoksa öğe seçilmez (önce tona uyanlar, yetmezse kapısız).
- **konu** (ağırlık): `askeri` `tarih` `suc` `korku` `gizem` `finans` `teknoloji` `bilim` `muhendislik` `otomotiv` `spor` `oyun` `saglik` `yasam` `seyahat` `haber` `biyografi` `felsefe` `liste` `egitim` `eglence` — `--konu` metninden kelime eşleşmesiyle puanlanır (stil_dna `KONU_KELIME`); eşleşen konu ağırlığı ×3'e kadar.
- **enerji** 1–5: hedef = ton tabanı (ciddi 2,2 · gizem 2 · sakin 1,5 · enerjik 4) + rakibin ilk 30 sn kesim hızı; uzaklık ağırlığı düşürür.
- **his**: `belgesel` `arsiv` `resmi` `teknik` `sinematik` `karanlik` `retro` `neon` `modern` `temiz` `sicak` `yumusak` `oyunbaz` `dinamik` — konudan gelen his tercihiyle eşleşme ağırlık verir.
- **kaynak**: tekniğin öğrenildiği kanal(lar) (kütüphane `kanallar/@X`).
- STIL-DNA.md §Konu ve ton: konu payları, enerji hedefi, his tercihi; §Seçim nedenleri: her öğenin hangi etiketle seçildiği; "tona uymayan öğe: 0" olmalı.
- Paket videoları: `video-aile` bölümü (katalog.json `aile` alanı).

## 4. VideoNN.tsx iskeleti
```tsx
import dna from './v04/stil-dna.json';
import presetler from '../public/varlik/preset-dili-remotion.json';
import { DnaBitis, DnaDizi, DnaMedya, DnaBaslik, DnaSayi, DnaAltyazi, DnaAltBant, DnaVurgu, DnaGiris, DnaDoku } from './repertuar/Dna';
import { FontYukle } from './repertuar/FontYukle';
// sahne süreleri cumleler.json'dan; ilk 30 sn medyanı dna.iskelet.ilk30_medyan_sn'yi ±%20 tutar
const sahneler = [
  { sure: 95, el: <DnaBaslik dna={dna} metin="..." ust="Chapter 1" /> },
  { sure: 60, el: <><DnaVurgu dna={dna} presetler={presetler} gec={24}><DnaMedya dna={dna} m={{ src: 'v04/foto/3.jpg' }} sira={2} /></DnaVurgu><DnaAltyazi dna={dna} kelimeler={k3} /></> },
  { sure: 70, el: <DnaGiris dna={dna} presetler={presetler}><DnaSayi dna={dna} deger={1928} onEk="$" ust="..." /></DnaGiris> },
];
// bolum baslarinin kareleri: isik suzulmesi orada gecer
export const Video04 = () => (<><FontYukle /><DnaBitis dna={dna} anlar={[0, 2710, 6020]}><DnaDizi dna={dna} sahneler={sahneler} /><DnaDoku dna={dna} /></DnaBitis></>);
```
- `DnaMedya` `sira`'ya göre tam ekran/çerçeveli kararını `iskelet.cerceveli_oran` ile verir; kamera hareketini döndürür.
- `DnaDizi` geçişleri DNA'dan, süreyi (`gecis_kare`) ve sertlik oranını (`yumusak_oran`) rakipten alır.
- `DnaVurgu` yalnız vurgulanan kelimede/cümlede (metindeki `*kelime*` işaretleri) kullanılır; dakikada en çok ~2.
- SFX: `iskelet.sfx_orani` > 0,5 ise geçişlere whoosh, vurgulara hit (`sfx.md`, `varlik/sfx/sfx-katalog.json`).

## 5. Repertuarı büyütmek (her yeni kanal bir şey ekler)
- Rakipte gözle gördüğün ama repertuarda olmayan tekniği koda dök: ilgili dosyaya bileşen + `*_TIPLERI`'ne ad ekle.
- `sablon-proje`'de katalog kompozisyonunu render et (`KatArkaplan`, `KatEdit`, `KatGecis`, `KatBaslik`, `KatYazi2`, `KatKart`, `KatCerceve`), sayfayı **gözle** kontrol et: okunurluk (açık palet + koyu zemin çakışması), taşma, kesilme.
- Bileşen palet/font/hareket dışında sabit renk/font/easing kullanmaz (yeni klasik görünüm doğmasın).
- Commit + push (repo). Kütüphane aynasını güncelle: `py scripts/kurulum.py ayna`.

## 6. Bilinen sınırlar
- Katalog sayfaları 1/4 ölçekli: 1,5 px'lik çizgiler orada görünmez, tam boyutta görünür.
- `kart-cevirme`, `tv-kapanma` arasında `DnaDizi`'nin zemini (rol 1 arka planı) görünür; düz renk istenirse `GecisliDizi` doğrudan kullanılır.
- Paket videoları 1080p30 çalışma kopyasıdır; 4K orijinal yalnız release arşivinde.
