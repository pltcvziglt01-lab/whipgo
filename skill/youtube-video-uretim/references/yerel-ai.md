# Yerel AI katmani (Ollama + yerel_ai.py)

Yerelde calisan "zevk/yorum" katmani: konu/ton/his cikarimi, sahne firsati avi, stil adlari,
kare jurisi, kurgu onerileri. **Kural bekcisi degildir**: secim yine motor (stil_dna etiket +
YouTube kaniti), son karar kullanicinin (3 secenek). Yerel AI repo koduna dokunmaz, yalniz oneri verir.

## Ne zaman kullanilir
| Is | Cagri | Motorla iliskisi |
|---|---|---|
| Konsept siniflandirma (kelime eslesmesi yaniltici olabilir: "investigative ship stories") | `konu_ton(metin)` | `stil_dna.konu_bul/ton_bul` ile karsilastirilir; celiskide motor kazanir, dusuk guvende yerel AI yok sayilir |
| Metinden sahne firsatlari (liste/zaman/karsilastirma/grafik/bolum/degisim/harita) | `sahne_firsatlari(metin, kelimeler)` | Oneri listesi; sahneyi kuran `sahne_kur`/plan dogrular |
| 3 secenege Turkce karakter adi | `stil_adi(dna_ozet)` | Yalniz sunum metni |
| Render karesine juri (PowerPoint hissi, okunurluk) | `kare_juri(resim_yolu, baglam)` | `kusur_kontrol`/`kalite_kapisi`nin yerine GECMEZ, yanina eklenir |
| Denetim raporuna somut kurgu onerisi | `kurgu_onerisi(rapor_md, plan_ozeti)` | Yalniz oneri; uygulama motorun isi |
| Kutuphane kanalina EDIT-DILI.md taslagi (olcum dosyalari + kare sayfalari) | `profil_taslak(kanal_klasoru)` | TASLAK: sayilarin dogrulugu ve dosyaya yazma ana oturumda; gorsel maddeler "gozlem (yerel AI)" isaretli |
| QC raporu FAIL/UYARI maddelerini onceliklendir | `qc_triyaj(rapor_md, baglam)` | Kapi sonucunu DEGISTIRMEZ; yalniz insan bakisini siralar, 'belirsiz' -> insan_baksin |

## Motora bagli kancalar (2026-11-25; Ollama yoksa hepsi sessizce kapanir, davranis aynen)
| Nerede | Ne yapar | Kapatma |
|---|---|---|
| `stil_dna.py` konu | kelime yontemiyle CELISIR ve AI guveni >= 0.7 ise AI'nin konusu; STIL-DNA.md `konu (nis)` satirinda `yerel AI:` notu | `--yerel-ai-yok` (dogrula testleri kapali kosar) |
| `sahne_zengin.py` | AI ani + turu aday gosterir; yazi SESLENDIRME METNINDEN kurulur (degisim: onceki yil -> 'DECADES LATER'); kurulamayan adaylar SAHNE-ZENGIN.md 'Yerel AI sahne adaylari' (insan baksin) | `--yerel-ai-yok` |
| `yerel_ai.py video-juri --video final.mp4 --cikti JURI.md` | render sonrasi esit aralikli kareler, 2 orneklemeli kor juri; PowerPoint hissi / okunurluk | kapi degil |
| `adim_kontrol.py --ozet-json` + `qc-triyaj` | defter ve kapi raporlarini onceliklendirir | kapi degil |

Kurulum: `py scripts/kurulum.py kur` (Ollama + iki model dahil); durum: `kurulum.py kontrol`.

## Nasil cagirilir
Kutuphane (ayni dizinden import) ya da CLI:
```
py -I skill/youtube-video-uretim/scripts/yerel_ai.py durum
py -I skill/youtube-video-uretim/scripts/yerel_ai.py konu-ton --metin "WW2 tank crews of 1944"
py -I skill/youtube-video-uretim/scripts/yerel_ai.py sahne --dosya metin.txt --kelimeler kelimeler.json
py -I skill/youtube-video-uretim/scripts/yerel_ai.py stil-adi --dosya dna-ozet.json
py -I skill/youtube-video-uretim/scripts/yerel_ai.py kare-juri --resim KARE.jpg --baglam "askeri belgesel"
py -I skill/youtube-video-uretim/scripts/yerel_ai.py kurgu-oneri --rapor KURGU-DENETIM.md --plan "40 sahne"
py -I skill/youtube-video-uretim/scripts/yerel_ai.py profil-taslak --kanal "G:\...\kanallar\@X"
py -I skill/youtube-video-uretim/scripts/yerel_ai.py qc-triyaj --rapor out/kapilar/kalite.md --baglam "v4, 715 sn"
```
Toplu/tekrarli iste `--arka` (kutuphanede `oncelik='arka'`): kullanici bekleyen on plan cagrilarina yol verir.
Hepsi JSON basar. Donusler: `konu_ton` -> `{konu: {ad: pay}, ton, his[], guven}`;
`sahne_firsatlari` -> `[{tur, kanit, veri, kelime_index}]` (`kelime_index` kanitin ilk kelimesinin
`kelimeler.json`'daki indeksi, eslesmezse -1); `kare_juri` -> `{puan 1-5, sorunlar[], powerpoint_hissi, okunurluk 1-5}`.
Sozlukler `stil_dna.py`'den alinir (KONULAR/TON_KELIME/HISLER); model disina cikan degerler atilir,
JSON sema Ollama `format` ile zorlanir, uymayan yanit 1 kez yeniden denenir (yine olmazsa None).

## Is devri: yerel AI'nin ustlendigi isler (eskiden parali alt modele gidiyordu)
- **EDIT-DILI.md taslagi** (`profil_taslak`): olcum dosyalari + kare sayfalarindan ilk taslak;
  Sonnet alt ajaninin yerine ilk gecis, ana oturum yalniz kontrol eder.
- **QC on eleme** (`qc_triyaj`): uzun UYARI listelerinde neye once bakilacagi.
- **Kare puanlama turlari** (`kare_juri`): katalog/onizleme karelerinde PowerPoint hissi avi.
- Isabet bulgusu (2026-11-25, 13 konsept): kelime yontemi 7/13, yerel AI 7/13 — ama TAMAMLAYICI:
  aldatici konseptlerde (investigative ships, calm retirement, Carson anisi) AI dogru / kelime yanlis;
  duz anahtar kelimeli konularda ve tonda kelime yontemi daha iyi (AI tona cok "ciddi" diyor).
  Entegrasyon onerisi: konu icin iki yontem celisir ve AI guveni >= 0.7 ise AI sonucu dikkate alinir;
  ton icin kelime yontemi esas kalir. Kanca ana oturumda baglanir.

## Odysseus'tan alinan desenler (fikir; AGPL nedeniyle kod kopyasi yok)
1. **Hakem ayristirici**: model yaniti once `<think>` temizliginden gecer (kapanmamis blok
   sonrasi atilir), dogrudan parse olmazsa metindeki beklenen alani tasiyan SON `{...}` alinir,
   sondaki virgul onarilir; JSON hic cikmazsa duzyazidan kaba puan yakalanir (`kare_juri`).
2. **GPU slot kilidi**: tum cagrilar `%TEMP%\yerel-ai-gpu.kilit` dosya kilidinden tek sira gecer
   (surecler arasi). Toplu islere `--arka` / `oncelik='arka'` ver: kullanici bekleyen on plan
   cagrilarina yol verir. Bayat kilit 10 dk sonra temizlenir.
3. **Iki orneklemeli juri**: `kare_juri` ayni kareyi sicaklik 0.2 ve 0.8 ile 2 kez puanlar
   (sirali, VRAM tek model). Fark <=1: ortalama + `guven: yuksek`; ayrisirsa `guven: dusuk`,
   `insan_baksin: true`, kotumser puan. A/B kiyasta jurilere hangisinin hangisi oldugunu soyleme
   (kor puanlama: baglam metnine "bizim/rakip" yazma).
4. **Emin degil -> somut soru**: `konu_ton` guveni 0.5 altindaysa sonuc None + `yerel_ai.SON_SORU`
   (CLI: `{"sonuc": null, "soru": "..."}`) — motor deterministik yola (kelime yontemi) duser.
   Model "yaptim/duzelttim" diyemez: oyle anlatan oneri maddeleri atilir, oneri hep oneridir.

## Ollama yoksa davranis
Her fonksiyon **None** doner, CLI `null` basar ve kod 2 ile cikar; hata/istisna firlatmaz.
Boru hatti yerel AI'siz aynen calisir — cagiran taraf None'u "katman kapali" sayip kelime
yontemiyle devam eder. Durum kontrolu: `hazir()` ya da CLI `durum` (3 sn zaman asimi).
Diger cagrilarin zaman asimi 120 sn.

## VRAM notu (RTX 5060 8 GB)
- qwen3:8b ~5-6 GB, qwen2.5vl:7b ~6 GB: **ayni anda tek model**. `yerel_ai` her cagrida
  `_tek_model` ile oteki modeli bosaltir (`keep_alive: 0`); sistem geneline
  `OLLAMA_MAX_LOADED_MODELS` yazmaya gerek yok (yazilacaksa kullanici onayiyla).
- **Render ile sirayla kullan**: Remotion/Chrome GPU render'i surerken `kare_juri` cagirma;
  once juri turu, sonra render (ya da tersi). Model 5 dk bosta kalinca VRAM'den kendi cikar
  (`keep_alive: '5m'`).
- Kurulum: `OllamaSetup.exe` (kullanici profiline, `%LOCALAPPDATA%\Programs\Ollama`),
  modeller `ollama pull qwen3:8b` + `ollama pull qwen2.5vl:7b` (~12 GB disk).
