# Üretim defteri + adım kapısı — hiçbir faz atlanamaz

Kullanıcı şikâyeti buydu: "skilldeki bazı maddeler atlanıyor, örneğin alt sekme kuralı." Çözüm: her video
klasöründe bir **üretim defteri** (`uretim-defteri.json`) tutulur, teslimden önce `adim_kontrol.py` bu defteri
ve kanıt dosyalarını denetler. **FAIL varken teslim yok** (kalite kapılarıyla aynı statü).

## Kural (kullanıcı kararı, 2026-11-25)

**Tam video üretiminde hiçbir faz atlanamaz; "atlandı" kaydı teslimi durdurur.** Gerekçe, "bu videoda gerek yoktu"
beyanı, model ya da insan onayı kabul edilmez. İş türü kapsamı atlama değildir: `--is kapak` yalnız kapak fazlarını
içerir ama o kapsamın içindeki her faz yine zorunludur ve kanıtsız geçilemez. Tek esneklik: fazın koşulu **nesnel
olarak** yoksa (örnek: videoda hiç gerçek dış kaynak görüntüsü yok → kaynak lisans/atıf fazı) bunu **betik kendisi
dosyalardan tespit eder** ve `kapsam_disi` işaretler; beyanla kapsam dışı yapılamaz.

Yerel AI (`yerel_ai.py qc_triyaj`) **hiçbir fazı "yanlış alarm" diye kapatamaz**; triyaj yalnız sıralama önerir,
defterdeki kapı sonuçları esastır.

## `uretim-defteri.json` şeması

```json
{
 "video": "v04",
 "is": "tam",                      // tam | kapak | metin
 "kayitlar": [
  {
   "faz": "kurgu-denetimi",        // adim_kontrol.py --fazlar listesinden
   "durum": "yapildi",             // tek geçerli durum; "atlandi" = FAIL
   "kanit": ["KURGU-DENETIM.md", "../../out/kapilar-v4/kurgu.md"],   // klasöre göre ya da mutlak yol
   "kim": "betik",                 // ana | alt-model | betik
   "zaman": "2026-11-24T23:40",
   "sekme": 6,                     // yalnız kapak fazı: ChatGPT'de kaç AYRI sekmede üretildi (kural: 6)
   "yabanci_arayuz": 0,            // yalnız kaynak-lisans: yabancı arayüzlü (Subscribe/imleç/logo) klip sayısı
   "not": "serbest not"
  }
 ]
}
```

- Aynı faz için birden çok kayıt olabilir; **son kayıt** geçerlidir.
- Kanıt dosyası diskte yoksa "yapildi" kaydı **geçersizdir** (FAIL). Kanıt klasör de olabilir.
- Deftere yazmayı kolaylaştıran komut (her faz bitince, o oturumda):
  `py scripts/adim_kontrol.py <video klasörü> --kaydet <faz> --kanit <dosya...> [--kim alt-model|betik] [--sekme 6] [--yabanci-arayuz 0] [--not "..."]`

## Denetim

```
py scripts/adim_kontrol.py <video klasörü> [--is tam|kapak|metin]   # FAIL varsa çıkış 1
py scripts/adim_kontrol.py <video klasörü> --ozet-json              # makine okur özet (yerel_ai.py arayüzü)
py scripts/adim_kontrol.py --fazlar                                 # faz tablosu (tek kaynak: betiğin içindeki FAZLAR)
```

Faz listesi SKILL.md'den elle kopyalanmaz; tek kaynak `adim_kontrol.py` içindeki `FAZLAR` tablosudur
(SKILL §2 faz haritası + §1 dokunulmaz kuralların denetim karşılığı). Denetim her fazda şunlara bakar:

1. **Kayıt var mı?** Kapsamdaki fazın defterde kaydı yoksa FAIL + hangi referans dosyasının okunacağı.
   Diskte kanıt kalıbına uyan dosya varsa "kayıt yok ama dosya var, `--kaydet` ile kaydet" ipucu verilir.
2. **Kanıt diskte var mı?** Yoksa "yapildi" kaydı geçersiz, FAIL.
3. **Kanıt beklenen kalıba uyuyor mu?** (ör. kurgu-denetimi → `*kurgu-denetim*`); bazı fazlarda **her kanıt
   grubu** ayrı ayrı zorunlu (metin-temizligi: kalıp çıktısı VE metin kontrol çıktısı; ozgunluk: STIL-DNA.md
   VE varyasyon çıktısı).
4. **Sayılabilir kurallar** (faz özel denetimleri):
   - **kapak:** KAPAK-ANALIZ.md + ≥ 6 kapak dosyası (`kapak-1..6`) + defterde `"sekme": 6` kaydı
     (ChatGPT'de **6 AYRI SEKMEDE** üretildi kanıtı). Üçünden biri eksikse FAIL.
   - **risk-denetimi:** RISK-RAPORU.md ya da DEVAM'daki tarihli risk bölümü; aynı kanalın sonraki
     videosunda rapor ≤ 30 gün (dosya tarihi ölçülür), eskiyse FAIL.
   - **ozgunluk:** STIL-DNA.md'de `TAMAM` satırı (rakipten ve son 3 videodan ≥ %20) + `varyasyon_kontrol.py` çıktısı.
   - **kaynak-lisans:** credits.json / KAYNAKCA'da yalnız CC BY / CC BY-SA / CC0 / PD (başka lisans satırı FAIL;
     rakibin videosu asla); defterde `"yabanci_arayuz": 0` (kaynak_yazi taraması: başka kanalın Subscribe
     butonu/imleç/logosu olan klip 0 — GOREVLER #0e). Sayı > 0 ise FAIL, alan yoksa UYARI.
   - **gorsel-kurallar:** insan yüzü / çocuk yüzü / yazı-logo (SKILL §1): `metin_kontrol.py --istemler`
     çıktısı ya da defterde açık onay notu.
5. **Model dağılımı (`kim`):** ölçüm/toplu iş fazlarında (rakip-analizi, risk-denetimi, gorsel-kaynak,
   izleyici-incelemesi) `kim: "ana"` ise UYARI: "alt modele verilmeliydi" (SKILL §7).

## Kapı entegrasyonu

- Teslimden önce `adim_kontrol.py <video klasörü>` **PASS zorunlu** (`teslim.md`, `kalite-kapilari.md`).
- Her faz bittiğinde kayıt o oturumda atılır; teslim gününe bırakılmaz (kanıt dosyaları temizlikte silinmeden önce).
- `--ozet-json` çıktısı yerel AI'nın "atlanmış görünen adım" yorumu için arayüzdür; entegrasyon `yerel_ai.py`'de.
