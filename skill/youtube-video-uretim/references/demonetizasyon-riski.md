# Demonetizasyon riski — YouTube'un yapay zekâ "slop" ve küme tespiti, kanal denetimi

Kaynak: Google'ın makalesi *"Scalable Detection of Adversarial Synthetic Slop and Coordinated Media Abuse: A LoRA-Enabled Multimodal Defense System"* (Mathur ve diğ., Google; https://storage.googleapis.com/gweb-research2023-media/pubtools/1039291.pdf). 2026-11 X'te "kanal demonetize olmasın diye Claude Code'a bunu yaptırın" diye yayıldı. Bu dosya makalenin özeti, bizim hatta karşılığı ve denetim prosedürüdür.

## 1. Makalede KESİN yazanlar
- Sistemin adı **S-CTS** (Scalable Cluster Termination System). Hedefi tek tek videolar değil, **koordineli hesap kümeleri**: "aynı aktör ya da aynı üretim betiği tarafından yönetiliyor olması muhtemel" kanal grupları.
- **ΨA, küme dedektörü:** altyapı sinyalleri (IP, cihaz, API kullanım deseni), olayların zaman serisi ve GenAI'ye özgü metadata. Kanalları "üretim kümeleri" hâlinde gruplar.
- **ΨC, sentetik içerik sınıflandırıcısı:** iki aşamalıdır.
  - Aşama 1 şu özellikleri çıkarır:
    - video metin gömmeleri (transkript, şablon anlatı tespiti)
    - başlık ve açıklamadaki "salient terms" (öne çıkan tekrar kelimeler)
    - **yükleme temposu** (`avg_log_upload_pace`, `time_to_first_upload_secs`): insan dışı yüksek frekanslı yayın
    - Pulsar görsel gömmeleri
  - Aşama 2, kanal düzeyinde LLM (Gemini 2.0 Flash, LoRA ile ince ayarlı) karar verir.
- **Yaptırım = ΨA kümesi ∩ ΨC sentetik etiketi.** Yüksek eşiği geçen kanal otomatik kapatılır; belirsiz olan insan incelemesine gider.
- Tablodaki ilk kategori: **"Synthetic Text-to-Speech Narratives"**. Otomatik İHLAL kararında precision %95, recall %83. Yani **TTS anlatımlı seri hikâye kanalları açıkça hedefte.**
- Makaleye göre amaç "yaratıcı yapay zekâ kullanımı"nı değil, **koordineli, seri üretilmiş** davranışı cezalandırmak. Küme şartı bir güvenlik önlemi olarak anlatılıyor ve itirazla geri dönüş oranı <%1.
- Gelecek planı: C2PA ve SynthID filigranlarını kanıt olarak almak.

## 2. Makalede OLMAYANLAR (varsayım; kullanıcıya böyle söylenir)
- Eşik değerleri, hangi kelimenin "salient" sayıldığı, kaç kanalın küme oluşturduğu **yazmıyor**.
- Makale kanal kapatma (termination) sistemini anlatıyor. "Tekrar eden içerik" gerekçesiyle **demonetizasyon** (YPP reddi) aynı sistem mi, **makale bunu söylemiyor**. Benzer sinyallerin kullanıldığını varsaymak makul, ama kanıt değil.
- "Şunu yaparsan tespit edilmezsin" diye bir formül yok. Amaç dedektör atlatmak değil, **gerçekten şablon üretim olmamak**. Aşağıdaki önlemler ikisini de karşılıyor.

## 3. Bizim hatta risk haritası

| Sinyal (makale) | Bizde nerede oluşur | Önlem (skill'de nerede) |
|---|---|---|
| Altyapı ve küme: aynı IP, cihaz, hesap, API | aynı makineden, aynı Google hesabından birden çok kanal; aynı otomasyon betiği | kanalları ayrı marka hesaplarında tut; kanallar arası **içerik dili** ayrı olsun (format, başlık iskeleti, ses, görsel stil). `kanal_risk.py @A @B` kanallar arası benzerliği ölçer. IP/cihaz ayırma kullanıcının kararıdır; skill bunu önerir, kendisi yapmaz |
| Şablon anlatı (transkript gömmesi) | aynı kalıp cümleler, aynı açılış ve kapanış, aynı yapı | `ozgunluk.md` eksenleri (≥8), `kalip_kontrol.py`, humanizer (EN). Her videonun kendine özgü araştırması ve kaynağı (`metin.md`) |
| Başlık ve açıklamada tekrarlayan kelime grupları | başlık şablonu ("X That Destroyed Y…"), aynı ilk 2 açıklama cümlesi | başlık iskeleti döner (`ozgunluk.md` A ekseni); açıklamanın ilk 2 cümlesi her videoda yeni. `kanal_risk.py` %40'tan fazla başlıkta geçen kelime gruplarını listeler |
| Yükleme temposu | günde 2+ video, makine gibi sabit saat | günde en çok 1 uzun video; yayın saati ±2 saat oynasın; seri hâlinde toplu yükleme yok |
| TTS anlatımı | her kanalda TTS | TTS yasak değil. Ama TTS + şablon + yüksek tempo birleşimi tam olarak tablo 1'deki kategori. Kanal başına **sabit, karakterli bir ses**, doğal tempo; mümkünse sunucu (HeyGen Avatar III) ya da gerçek ses |
| Görsel gömme (Pulsar) | her videoda aynı stil prompt'u, aynı kompozisyon | `ozgunluk.md` F ekseni; kütüphaneden iskelet korunur ama yüzey değişir (`edit-dili-kutuphanesi.md` §3) |
| Sentetik içerik | AI görsel, AI video | YouTube'un "altered or synthetic content" etiketini gerçekçi AI sahnelerde işaretle (Studio'da yükleme sırasında). Bu kural kanal dosyasında yoksa **kullanıcıya sor**, varsayma |

## 4. Kanal denetimi (kullanıcı "kanalım risk altında mı / demonetize olmasın" dediğinde)
1. **Ölç:**
   `py scripts/kanal_risk.py @Kanal1 @Kanal2 --adet 30 --altyazi --cerez <cookies.txt> --cikti RISK-RAPORU.md`
   Kendi metinlerimiz varsa `--metinler "<kanal1 klasörü>" "<kanal2 klasörü>"` ile `metin*.txt` dosyalarını verir; bunlar otomatik altyazıdan daha doğrudur.
   Çıkan ölçümler:
   - yükleme temposu, aynı gün 2+ yükleme, saat sabitliği
   - başlık iskeleti tekrarı, Jaccard benzerliği, şablon kelime grupları
   - açıklamanın ilk 2 cümlesinin tekrarı
   - süre değişim katsayısı
   - metinler arası 6'lı dizi ortaklığı ve kosinüs benzerliği
   - kanallar arası benzerlik
2. **Kanıtla:** her uyarıyı videonun linki ve sayısıyla yaz. "Kanal riskli" gibi genel bir cümle kurma.
3. **Kanal başına risk notu** (düşük / orta / yüksek). Gerekçe kesin bulgulardan gelir (§1); varsayımlar ayrı satırda "varsayım" diye yazılır.
4. **Eylem planı:** her uyarıya somut adım. Örnek: "son 10 başlığın 7'si 'China's … Could Replace …' iskeleti → sıradaki 5 videoda A ekseninden 5 farklı kalıp, liste şu"; "açıklamanın ilk 2 cümlesi 12 videoda aynı → yeniden yaz, şablon yalnız alttaki linkler". Eski videoları toplu silmek ya da toplu başlık değiştirmek **önerilmez** (ani toplu değişiklik de bir sinyaldir); yalnız ileriye dönük değişim önerilir. Kullanıcı isterse tek tek düzeltilir.
5. Raporu kanalın DEVAM.md dosyasına özet olarak yaz. Her 10 videoda bir ya da yeni kanal açılırken tekrarla.

## 5. Yeni video ve kanal açarken (önleyici; Faz 2–9 sırasında)
- Faz 2 başlık: son 10 başlıkla iskelet ve Jaccard karşılaştırması (`kanal_risk.py` çıktısındaki sık kelime gruplarını kullanma).
- Faz 3 metin: `kalip_kontrol.py` temiz, açılış ve kapanış son 5 videoda yok; İngilizce kanalda humanizer'dan geçir.
- Faz 9 teslim: yayın saati ve günü DEVAM'daki son 3 yayından farklı (±2 saat oynasın); aynı gün ikinci uzun video yok.
- Yeni kanal: mevcut kanallarla aynı başlık iskeleti, aynı ses ve aynı görsel stil prompt'u **kullanılmaz** (küme riski).
