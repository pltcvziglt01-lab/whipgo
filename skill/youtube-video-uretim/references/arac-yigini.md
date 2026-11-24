# Açık kaynak araç yığını — hangi faza ne, nasıl kurulur, hangi tuzak var

Kaynak: kullanıcının paylaştığı 4 X gönderisindeki ~40 repo. Her birinin README'si 2026-11-18'de tek tek okundu, lisanslar doğrulandı. **Hattın çekirdeği değişmez:** Remotion + ffmpeg + yt-dlp + bizim betikler. Bu araçlar yalnız aşağıda yazan işte devreye girer. "Ne var diye her şeyi kur" yapılmaz: bir araç ancak o fazın işi onu gerektirdiğinde, kullanıcıya bir satırla söylenerek kurulur.

**Monetize kanal kuralı:** Çıktısı videoya giren her modelin **ağırlık lisansı** ticari kullanıma izin vermeli. NC (non-commercial) lisanslı bir model, kodu MIT olsa bile kullanılmaz.

## 1. Kullanılacaklar (faz sırasıyla)

| Faz | Araç | Ne zaman | Kurulum (README'den) | Not / tuzak |
|---|---|---|---|---|
| 1 Rakip / 3 Araştırma | **yt-dlp** | zaten çekirdek (`rakip_indir.py`) | `py -m pip install -U "yt-dlp[default]"` + node veya deno | indirilen video yalnız analiz içindir, analizden sonra silinir |
| 1 Rakip | **claude-video** (`/watch`) | rakip videoyu transkript ve kareleriyle hızlıca "izlemek", soru sormak | `/plugin marketplace add bradautomates/claude-video` → `/plugin install watch@claude-video` | MIT. Ölçüm yerine geçmez; sayılar `kare_analiz.py` ve `edit_dili.py`'den gelir |
| 2–3 Konu + araştırma | **last30days-skill** | konunun son 30 gündeki Reddit, HN, X ve YouTube nabzı; gerçek izleyici dili; başlık fikri | `/plugin marketplace add mvanhorn/last30days-skill` → `/plugin install last30days` | MIT, Python 3.12+. README Windows konusunda çelişkili, ilk kullanımda dene. Çıktısındaki iddialar kaynak değildir, yine doğrulanır (`metin.md`) |
| 3 Metin cilası | **humanizer** | İngilizce metinde yapay zekâ yazı izlerini (26 desen) temizlemek; TTS'ten **önce**, `kalip_kontrol.py`'den sonra | `/plugin marketplace add blader/humanizer` → `/plugin install humanizer@humanizer` | MIT. Desenler İngilizce; DE/JA/TR'de yalnız ilke olarak uygulanır. Dedektör atlatma aracı değildir, amaç doğal ve kanal sesine uygun metin |
| 4 Ses → zamanlama | **WhisperX** | TTS çıktısında **kelime düzeyi** zaman damgası (kelime kelime altyazı, vurgu senkronu); `cumleler.json`'u kelime hassasiyetine çıkarır | `py -m pip install whisperx` → `whisperx vo.mp3 --language de --highlight_words True --output_format json` | BSD-2. GPU varsa CUDA 12.8, CPU'da da çalışır. Python 3.14 uyumu kurulumda kontrol edilir; olmazsa ayrı venv (3.12). Yedek: `openai-whisper --word_timestamps True` (MIT) |
| 6 Kurgu (kod) | **remotion-dev/skills** | Claude'un Remotion kodunu resmî kurallarla yazması (animasyon, altyazı, render) | Remotion projesinde `npx remotion skills add` | Remotion projesine bir kez kurulur. Bizim `kurgu-render-qc.md` kuralları önceliklidir |
| 6 Kurgu (hareket) | **motion-design-skill** (LottieFiles) | easing, zamanlama ve koreografi kararları; "neden bu yumuşaklık" sorusuna ilke | `npx skills add LottieFiles/motion-design-skill` | MIT. UI odaklıdır; videoda yalnız timing, easing ve koreografi tablolarını al. Ölçülen rakip geçiş süreleri (`edit_dili.py`) bunun önündedir |
| 6 Kurgu (overlay) | **Lottie** (`@remotion/lottie` + lottie-web) | ikon, alt bant, vurgu, geçiş overlay'leri | `npm i @remotion/lottie lottie-web` | MIT. LottieFiles'tan alınan her animasyonun kendi lisansına bak. Expression içeren Lottie render'da titreyebilir; QC ızgarasında kontrol et |
| 6 Kurgu (karmaşık zaman çizelgesi) | **GSAP** (`@remotion/gsap`) | yalnızca SplitText, MorphSVG ya da çok parçalı bir zaman çizelgesi gerektiğinde | `npm i @remotion/gsap gsap` (Remotion ≥ 4.0.517) | Ücretsiz, ticari kullanım serbest. Kendi ticker'ıyla çalışan düz GSAP KULLANMA; `useGsapTimeline()` ile kareye bağla. Basit hareket için `interpolate()`/`spring()` yeterli |
| 6 Kurgu (3D) | **three.js** (`@remotion/three`) | dünya küresi, harita üzerinde uçuş, ürün modeli, 3D bilgi kartı | `npm i three @react-three/fiber @remotion/three @types/three` | MIT. `<ThreeCanvas>` içinde `useCurrentFrame()` kullan, `useFrame` değil. Render için tarayıcı GL'i gerekir |
| 1a / 6 Ritim | **librosa** | müziğin beat ızgarası; kesimleri vuruşa oturtmak; rakipte "kesimler müziğe mi oturuyor" ölçümü | `py -m pip install librosa` | ISC. `librosa.beat.beat_track` → kesim noktası adayları |

## 2. Şartlı (yalnız yazılı durumda)

| Araç | Şart |
|---|---|
| **HyperFrames** (HeyGen, Apache-2.0) | Remotion lisansı sorun olursa (4+ çalışanlı şirket) ya da HTML bloğu hazır bir sahne hızlı lazımsa yedek render motoru. `claude plugin marketplace add heygen-com/hyperframes`. Ana hatta ikinci motor açma |
| **Manim** (MIT) | yalnız formül, grafik ya da diyagram anlatan açıklayıcı sahneler. LaTeX ve Cairo bağımlılığı var; kurulum: docs.manim.community |
| **react-postprocessing / three.quarks** (MIT) | yalnız 3D sahne kullanılıyorsa bloom, vinyet, grain ya da parçacık için. Parçacık simülasyonu kareye göre sürülmeli (deterministik render) |
| **Pocket TTS** (kod MIT, ağırlık CC-BY-4.0) | Almanca için CPU'da ücretsiz TTS adayı. Atıf zorunlu; her sesin lisansı ayrı, NC olan sesler seçilmez. Japonca ve Türkçe yok |
| **ZONOS3-Mini** (ağırlık Apache-2.0) | TR, JA ve DE dahil ~50 dilde TTS ve ses klonlama. Windows'ta hazır kurulum yok; önce tarayıcı demosunda kaliteyi dene. **Ses klonlama yalnız sesin sahibinin izniyle** (Bölüm 1 kuralı: HeyGen'de klon yok; burada da izinsiz klon yok) |
| **Fooocus** (GPL-3.0, bakım modunda) | Flow ya da Magnific kotası bittiğinde ücretsiz yerel görsel yedeği. 6 GB+ VRAM. Kullanılan checkpoint'in ticari çıktı lisansını doğrula |
| **Ollama** (MIT, model lisansları ayrı) | yalnız ücretsiz toplu kaba iş: etiket önerisi, sınıflandırma. Metin yazımı Claude'da kalır |
| **OpenMontage** (AGPL-3.0) | kod kopyalanmaz. Yalnız fikir: kalite kapıları, "slayt gösterisi riski" skoru, birleştirme öncesi doğrulama → `kurgu-render-qc.md` QC'sine uyarlandı |

## 3. Kullanılmayacaklar (neden)

| Araç | Neden |
|---|---|
| audiocraft / MusicGen / AudioGen | **ağırlıklar CC-BY-NC** → monetize videoda yasak. Müzik ve SFX telifsiz/ticari kütüphaneden (`sfx.md`) |
| Phonon (xn-ptts) çok dilli | ağırlıklar CC-BY-NC; yalnız İngilizce 31m modeli serbest |
| video-use | konuşan kafa ham çekimini kurgular; bizim hat sıfırdan üretiyor; ElevenLabs anahtarı ister |
| ai-kit (Motion), vfx-js, Theatre.js | web UI ve canlı sayfa animasyonu; kare-deterministik video render'ına uymuyor (Theatre studio AGPL) |
| Blender (+ blender-agents) | blender-agents reposu 404 (doğrulanamadı); Blender ağır, 3D gerekiyorsa three.js yeterli |
| frontend-slides, ppt-master, hairline, anatomy | slayt ve web grafiği üretir, video hattına girmez |
| Plausible, AppFlowy, Penpot, n8n, Cal.com, Bitwarden | video üretimiyle ilgisiz |

## 4. Kurulum disiplini
- Kurmadan önce kullanıcıya tek satır: "X'i şu iş için kuruyorum (lisans: …)". Plugin ve skill kurulumları kullanıcının Claude ayarlarını değiştirir; ilk seferde onay al.
- Python araçları sistem Python'unu (3.14) bozmasın: uyumsuzlukta `py -3.12 -m venv C:\araclar\<ad>-venv`.
- Her yeni aracı kanalın DEVAM.md'sine yaz: sürüm, nerede kurulu, hangi videoda kullanıldı.
