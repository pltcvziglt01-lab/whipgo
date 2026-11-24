# Kurulum ve günlük kullanım

## Arkadaşa vermeden önce (lisans)
Repoda Adobe Basics preset/SFX paketleri var (`varlik/`, Release `varlik-v1`); lisans başkasına dağıtımı yasaklar. Karar (2026-11-25):
**arkadaş Adobe Basics paketlerini kendi adına lisanslar**, ancak ondan sonra repoya erişim verilir. Sıra:
1. Arkadaş lisansı alır (Adobe Basics: FREE Preset Pack, Ultimate 500+ Preset Pack, bonus presets) ve sana teyit eder.
2. Repo sahibi GitHub'da davet eder (repo ÖZEL kalır): `gh api -X PUT repos/<kullanici>/whipgo/collaborators/<arkadas> -f permission=pull`
   ya da GitHub → whipgo → Settings → Collaborators. Yazma izni gerekmiyorsa `pull` (salt okuma) yeter.
3. Arkadaş daveti kabul eder, aşağıdaki tek komutla kurar. Drive kütüphanesi ayrıca paylaşılır (`ARKADAS-ICIN-PROMPT.md`); lisanslı paket Drive'a konmaz.

## Yeni makine (bir kez) — TEK KOMUT
```powershell
winget install --id Git.Git -e; winget install --id GitHub.cli -e
& "C:\Program Files\GitHub CLI\gh.exe" auth login --web --git-protocol https     # giris kullanicinin (sifre/2FA)
git clone https://github.com/<kullanici>/whipgo C:\otomasyon\yt-uretim
py C:\otomasyon\yt-uretim\skill\youtube-video-uretim\scripts\kurulum.py kur
```
`kur` sirayla kurar, olani atlar (tekrar calistirmak guvenli): programlar (git, gh, ffmpeg, node; winget), Python paketleri
(yt-dlp, opencv, rapidocr, librosa, edge-tts, faster-whisper...), **yerel AI** (Ollama + `qwen3:8b` + `qwen2.5vl:7b`, ~12 GB disk,
GPU >= 8 GB onerilir; `--ai-yok` ile atlanir), Remotion (`sablon-proje` npm install), varliklar (Release `varlik-v1`), git kancalari,
sonda `kontrol`. Eksik kalan varsa adini yazar (cogu kez yeni terminal acip `kur`u yeniden calistirmak yeter).

Elle kurulum (eski yol):
```powershell
winget install --id GitHub.cli -e
& "C:\Program Files\GitHub CLI\gh.exe" auth login --web --git-protocol https
git clone https://github.com/<kullanici>/whipgo C:\otomasyon\yt-uretim
cd C:\otomasyon\yt-uretim
py skill\youtube-video-uretim\scripts\varlik_kur.py indir          # 35 arka plan + 26 filmburn (1080p) Release'den
py -m pip install -U yt-dlp numpy opencv-python pillow rapidocr websocket-client librosa
py skill\youtube-video-uretim\scripts\kurulum.py kontrol
```
Gerekli: Python 3, ffmpeg (PATH), Node 20+, Google Drive masaüstü (edit kutuphane + money printer).

## Skill'i güncellemek (claude.ai)
```powershell
py skill\youtube-video-uretim\scripts\kurulum.py paketle --hedef "$env:USERPROFILE\Desktop"
```
Çıkan `youtube-video-uretim-<tarih>.skill` dosyasını claude.ai → Ayarlar → Skills'te eski skill'in yerine yükle.

## Yeni kanal
```powershell
Copy-Item -Recurse C:\otomasyon\yt-uretim\sablon-proje C:\otomasyon\<kanal>\motion
cd C:\otomasyon\<kanal>\motion; npm install
py C:\otomasyon\yt-uretim\skill\youtube-video-uretim\scripts\varlik_kur.py kanal C:\otomasyon\<kanal>\motion
```
Mevcut kanal (gta6, paycheck, ranks, casus): yalnız son komut (src\repertuar, public\fontlar, public\varlik bağlantıları); eski `Parcalar.tsx` yeni videolarda kullanılmaz.

## Her video
1. `git -C C:\otomasyon\yt-uretim pull`
2. `py ...\scripts\stil_dna.py --rakip @Rakip --konu "<başlık + anlatılan olay>" --kilit palet,font --cikti C:\otomasyon\<kanal>\vNN\` — kanalın geçmişi ve diğer kanalların DNA'ları otomatik okunur, `stil-dna.json` (A) yazılır; B seçilirse `stil-dna-B.json` onun üzerine kopyalanır
3. Kanalın ilk videosunda A/B önizleme (`Onizleme` kompozisyonu) → kullanıcı seçer; sonra A.
4. VideoNN.tsx yalnız `repertuar/Dna*` bileşenleriyle (skill `references/repertuar.md` §4).

## Repertuar ya da araç değişince
```powershell
git add -A; git commit -m "..."; git push
py skill\youtube-video-uretim\scripts\kurulum.py ayna      # Drive kütüphanesindeki _araclar/ ve remotion/repertuar/ aynası
py skill\youtube-video-uretim\scripts\kurulum.py paketle   # skill değiştiyse yeniden yükle
```

## `varlik_kur.py yukle/indir` "gh auth login" derse
Bazı kabuklarda Python'un alt süreci Windows kimlik deposundaki gh token'ını göremiyor. O zaman doğrudan gh ile:
```powershell
& "C:\Program Files\GitHub CLI\gh.exe" release download varlik-v1 -p "ab-*.mp4" -D varlik\arkaplan --skip-existing
& "C:\Program Files\GitHub CLI\gh.exe" release download varlik-v1 -p "fb-*.mp4" -D varlik\filmburn --skip-existing
& "C:\Program Files\GitHub CLI\gh.exe" release upload varlik-v1 (Get-ChildItem varlik\arkaplan\*.mp4) --clobber
```

## Yeni edit paketi
`skill/youtube-video-uretim/references/varlik-paketleri.md` §2 (`varlik_kur.py katalog` → `presetler` → `yukle`).
