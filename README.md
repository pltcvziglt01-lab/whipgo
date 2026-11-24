# yt-uretim (ÖZEL)

YouTube video üretim sisteminin tek kaynağı: Claude skill'i, Remotion edit repertuarı, araçlar ve lisanslı edit paketleri.
**Repo özel kalır** — `varlik/` içindeki paketlerin lisansı (Adobe Basics) dağıtımı yasaklar.

| Klasör | İçerik | Nerede kullanılır |
|---|---|---|
| `skill/youtube-video-uretim/` | SKILL.md, `references/` (iş akışı, kurallar), `scripts/` (tüm Python araçları) | claude.ai'ye `.skill` olarak yüklenir (`kurulum.py paketle`); betikler buradan çalıştırılır |
| `repertuar/` | Remotion edit bileşenleri: 26 animasyonlu arka plan, 16 geçiş, 13 başlık, 7 altyazı, kartlar, kamera/çerçeve/doku, stil DNA, öğrenilmiş Premiere presetleri | kanal projelerine bağlantı (`varlik_kur.py kanal`) |
| `sablon-proje/` | yeni kanal için Remotion projesi + katalog ve A/B önizleme kompozisyonları; `katalog/` görsel katalog | `C:\otomasyon\<kanal>\motion` olarak kopyalanır |
| `fontlar/` | 38 açık lisanslı (OFL) font | `public/fontlar` bağlantısı |
| `varlik/` | `arkaplan/` 35 + `filmburn/` 26 video (Release `varlik-v1`), `sfx/` 97 ses, `presetler/` Premiere, `preset-dili-remotion.json` (338 öğrenilmiş preset), `katalog.json`, `onizleme/` | `public/varlik` bağlantısı; stil_dna.py |
| `dist/` | üretilen `.skill` paketleri (git dışı) | claude.ai yüklemesi |

Kurulum ve günlük kullanım: `KURULUM.md`.
