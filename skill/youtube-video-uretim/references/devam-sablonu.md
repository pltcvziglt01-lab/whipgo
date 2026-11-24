# DEVAM.md şablonu (her kanal için bir tane)

Yer: `Documents\<KANAL>\DEVAM.md` (veya proje kökü). Her video bitince ve her önemli kararda güncellenir. Başka bir Claude oturumu yalnız bu dosyayla kaldığı yerden devam edebilmeli. Kullanıcıya sorulup cevaplanmış her şey buraya yazılır ve bir daha sorulmaz.

```markdown
# <KANAL> — DEVAM
> Son güncelleme: <YYYY-AA-GG> (<ne bitti>)
> Yeni oturum: "youtube-video-uretim skill'ini kullan, bu dosyayı oku, §10'dan devam et."

## 0. Proje bir bakışta
Kanal adı, dil, hedef kitle ve hitap, format, uzunluk, rakip(ler), farkımız, alınmış ana kararlar.

## 1. Klasörler ve dosyalar
| Ne | Yol |
|---|---|
| Video klasörleri | C:\otomasyon\<kanal>\videoNN\ |
| Araştırma | ...\arastirma\ |
| Remotion | ...\motion\ |
| Teslim (Drive) | G:\Drive'ım\...\ |
| Sistem (varyasyon.tsv, kaliplar.txt, SPEC) | ...\sistem\ |

## 2. Hesaplar ve araçlar — KİLİTLİ KARARLAR
TTS servisi + ses kimliği + hız · avatar adı + motor (Avatar III) + güncel görünüm · Flow hesabı + proje URL + model · Chrome profil + CDP port · Drive klasörü · SFX paleti.

## 3. Değişmez kurallar (kullanıcı kararları, yasaklar)
## 3b. Giriş / tutunma kuralları (ölçülmüş)
## 4. Görsel / kurgu kuralları (+ kıyafet döngüsü tablosu, vurgu renkleri geçmişi)
## 5. Kapak kuralları (tutan şablon)
## 6. Bir videonun üretim hattı (çalışan komutlar birebir)
## 7. Bilinen tuzaklar (bu kanala özgü)

## 8. Videolar — DURUM
| # | Başlık | Süre | Klasör | Teslim | Sonuç (izlenme/0:30 tutunma) |
|---|---|---|---|---|---|

## 9. Konu havuzu (henüz yapılmadı) — kaynak outlier + oran
## 10. SIRADAKİ İŞ
1. <iş> — bitti sayılır: <kriter>
   - Arka planda süren: <süreç, log, çıktı yolu>
   - Kullanıcıdan beklenen onay: <...>
## 11. Kullanıcı tercihleri
```

## Yeni kanal açma listesi
rakip seç → kare kare ölç → `sistem/SPEC-<kanal>.md` → anayasa (ton, başlık kalıbı, yasaklar, kanal kimliği sabitleri) → ses seç (ölç + kullanıcıya dinlet) → sunucu/karakter (Flow karakter + HeyGen photo avatar) veya faceless stil tarifi → referans hattı kopyala → 20–30 sn deneme → pilot video → kullanıcı onayı → seri. `sistem/varyasyon.tsv` başlığı ve `sistem/kaliplar.txt` (her videoda tekrarlanma riski olan cümleler) baştan açılır.
