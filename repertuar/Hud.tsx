import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { OKUNUR, Stil, egri, ilerle, karistir, rgba, siganBoyut, sinirla, yay } from './temel';

// HUD — medyanin USTUNE binen kalici bilgi katmanlari (saydam). Ogrenildigi kanallar: @Ground-Engineering (kamerayla senkron
// derinlik sayaci), @ImmersivePast (sag kenarda derinlik cetveli + sol ustte guncellenen tarih/yer rozeti).
// Deger animasyonu: baslangic -> deger, 'sure' saniyede (kamera hareketiyle es zamanli kullanilir).
// Opus galerisi (envanter/opus-galeri/teknikler.json): bolum-cetveli (17 video), hayalet-yil (9), belge-tarama-isigi (5)
export const HUD_TIPLERI = ['derinlik-cetvel', 'koordinat', 'zaman-kodu', 'tarih-rozeti', 'dosya-sekmesi', 'haber-bandi', 'belge-sekmesi',
  'bolum-cetveli', 'hayalet-yil', 'belge-tarama-isigi'] as const;
export type HudTip = typeof HUD_TIPLERI[number];

const kose = (renk: string, k = 22, c = 3): React.CSSProperties[] => [
  { left: 0, top: 0, borderLeft: `${c}px solid ${renk}`, borderTop: `${c}px solid ${renk}` },
  { right: 0, top: 0, borderRight: `${c}px solid ${renk}`, borderTop: `${c}px solid ${renk}` },
  { left: 0, bottom: 0, borderLeft: `${c}px solid ${renk}`, borderBottom: `${c}px solid ${renk}` },
  { right: 0, bottom: 0, borderRight: `${c}px solid ${renk}`, borderBottom: `${c}px solid ${renk}` },
].map((s) => ({ position: 'absolute', width: k, height: k, ...s }));

/** bolge: belge-tarama-isigi'nin kilitlendigi alan [x, y, gen, yuk] (0..1, kadraja gore); verilmezse ortadaki satir bandi */
export const Hud: React.FC<{ tip: HudTip; stil: Stil; deger?: number; baslangic?: number; birim?: string; etiket?: string; ust?: string; sure?: number; gec?: number; bolge?: [number, number, number, number] }> = ({
  tip, stil, deger = 0, baslangic = 0, birim = '', etiket = '', ust = '', sure = 3, gec = 0, bolge,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const g = ilerle(f, gec, fps * 0.35, 'kubik-hizli');
  const p = egri('kubik-hizli', sinirla((f - gec) / (fps * sure)));
  const v = baslangic + (deger - baslangic) * p;
  const yazi: React.CSSProperties = { fontFamily: font.mono, fontWeight: font.monoAgirlik, color: '#ffffff', textShadow: `0 1px 6px ${rgba('#000', 0.85)}`, fontVariantNumeric: 'tabular-nums' };
  const renk = palet.vurgu;
  switch (tip) {
    case 'derinlik-cetvel': {
      // sag kenarda kayan cetvel (her 10 birimde uzun, 50'de etiketli) + ortada okunan deger kutusu
      const olcek = 6; // px / birim
      const ofset = v * olcek;
      const X = W - 170;
      return (
        <AbsoluteFill style={{ opacity: g, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: X - 10, top: 0, bottom: 0, width: 150, background: `linear-gradient(90deg, transparent, ${rgba('#000', 0.35)})` }} />
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: Math.ceil(H / olcek / 5) + 4 }, (_, k) => {
              const birimNo = Math.floor((ofset - H / 2) / olcek / 5) * 5 + k * 5;
              const y = H / 2 + birimNo * olcek - ofset;
              if (y < -20 || y > H + 20) return null;
              const uzun = birimNo % 50 === 0, orta = birimNo % 10 === 0;
              return <g key={k}>
                <line x1={X + (uzun ? 0 : orta ? 22 : 36)} x2={X + 60} y1={y} y2={y} stroke={rgba('#ffffff', uzun ? 0.9 : 0.5)} strokeWidth={uzun ? 2.5 : 1.5} />
                {uzun && birimNo >= 0 ? <text x={X + 72} y={y + 7} fill={rgba('#ffffff', 0.75)} fontFamily={font.mono} fontSize={28} fontWeight={700}>{birimNo}</text> : null}
              </g>;
            })}
            <polygon points={`${X - 18},${H / 2 - 11} ${X - 2},${H / 2} ${X - 18},${H / 2 + 11}`} fill={renk} />
          </svg>
          <div style={{ position: 'absolute', right: 240, top: H / 2 - 52, padding: '12px 24px', background: rgba('#000', 0.45), border: `1px solid ${rgba(renk, 0.8)}` }}>
            {kose(renk, 14, 3).map((s, i) => <div key={i} style={{ ...s, margin: -5 }} />)}
            <div style={{ ...yazi, fontSize: 32, fontWeight: 700, letterSpacing: 4, color: renk }}>{(etiket || 'DEPTH').toUpperCase()}</div>
            <div style={{ ...yazi, fontSize: 46, fontWeight: 700 }}>{Math.round(v).toLocaleString('en-US')}<span style={{ fontSize: 32, marginLeft: 8 }}>{birim}</span></div>
          </div>
        </AbsoluteFill>
      );
    }
    case 'koordinat': {
      // sol alt: akan enlem/boylam + REC; ortada ince nisangah
      const t = (f - gec) / fps;
      const lat = deger + Math.sin(t * 0.7) * 0.0004 + t * 0.00011, lon = baslangic + Math.cos(t * 0.5) * 0.0004 + t * 0.00007;
      const fmt = (x: number, a: string, b: string) => `${Math.abs(x).toFixed(4)}° ${x >= 0 ? a : b}`;
      return (
        <AbsoluteFill style={{ opacity: g, pointerEvents: 'none' }}>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
            <line x1={W / 2 - 40} x2={W / 2 - 12} y1={H / 2} y2={H / 2} stroke="#fff" strokeWidth={2} /><line x1={W / 2 + 12} x2={W / 2 + 40} y1={H / 2} y2={H / 2} stroke="#fff" strokeWidth={2} />
            <line y1={H / 2 - 40} y2={H / 2 - 12} x1={W / 2} x2={W / 2} stroke="#fff" strokeWidth={2} /><line y1={H / 2 + 12} y2={H / 2 + 40} x1={W / 2} x2={W / 2} stroke="#fff" strokeWidth={2} />
          </svg>
          <div style={{ position: 'absolute', left: 70, bottom: 60, ...yazi, fontSize: 32, lineHeight: 1.4 }}>
            <div style={{ color: renk, fontSize: 32, fontWeight: 700, letterSpacing: 4 }}>{(etiket || 'POSITION').toUpperCase()}</div>
            <div>{fmt(lat, 'N', 'S')}</div><div>{fmt(lon, 'E', 'W')}</div>
          </div>
          <div style={{ position: 'absolute', right: 70, top: 56, display: 'flex', alignItems: 'center', gap: 12, ...yazi, fontSize: 32 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: '#ff3b30', opacity: Math.floor(f / 15) % 2 ? 1 : 0.25 }} />REC
          </div>
        </AbsoluteFill>
      );
    }
    case 'zaman-kodu': {
      // sag ust: akan zaman kodu / saat (baslangic: saniye cinsinden saat; ornek 3*3600 = 03:00:00)
      const s = baslangic + (f - gec) / fps * (deger || 1);
      const hh = Math.floor(s / 3600) % 24, mm = Math.floor(s / 60) % 60, ss = Math.floor(s) % 60, kk = Math.floor((s % 1) * 30);
      const z = (n: number) => String(n).padStart(2, '0');
      return (
        <AbsoluteFill style={{ opacity: g, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', right: 70, top: 56, textAlign: 'right', ...yazi }}>
            <div style={{ color: renk, fontSize: 32, fontWeight: 700, letterSpacing: 4 }}>{(etiket || 'LOCAL TIME').toUpperCase()}</div>
            <div style={{ fontSize: 40 }}>{z(hh)}:{z(mm)}:{z(ss)}<span style={{ opacity: 0.6, fontSize: 28 }}>:{z(kk)}</span></div>
            {ust ? <div style={{ fontSize: 32, opacity: 0.9, marginTop: 4 }}>{ust}</div> : null}
          </div>
        </AbsoluteFill>
      );
    }
    case 'haber-bandi': {
      // canli haber bandi (@SvenskaBilar): altta tam genislik koyu serit, solda vurgu kutusunda etiket (LIVE),
      // saga dogru surekli sola kayan kalin mansetler ('ust' alaninda '|' ile ayrilir), aralarda vurgu '//' ayirici.
      const k = ilerle(f, gec, fps * 0.4, 'ustel-sert');
      const mansetler = (ust || 'BREAKING').split('|').map((x) => x.trim()).filter(Boolean);
      const kay = ((f - gec) / fps) * 140; // px/sn
      const serit = H * 0.075;
      const zemin = palet.acik ? karistir(palet.murekkep, '#0b1a2e', 0.5) : karistir(palet.zemin, '#0b1a2e', 0.6);
      const dizi = [...mansetler, ...mansetler, ...mansetler];
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: H * 0.05, height: serit, background: rgba(zemin, 0.92), transform: `translateY(${(1 - k) * 160}%)`, display: 'flex', alignItems: 'center', overflow: 'hidden', boxShadow: `0 -4px 24px ${rgba('#000', 0.35)}` }}>
            <div style={{ flex: 'none', height: '100%', display: 'flex', alignItems: 'center', padding: `0 ${serit * 0.45}px`, background: renk, color: '#ffffff', fontFamily: font.govde, fontWeight: 800, fontSize: serit * 0.46, letterSpacing: 2, textTransform: 'uppercase', zIndex: 1 }}>{etiket || 'LIVE'}</div>
            <div style={{ whiteSpace: 'nowrap', transform: `translateX(${-kay % (W * 1.5)}px)`, paddingLeft: serit * 0.5, fontFamily: font.govde, fontWeight: 700, fontSize: serit * 0.42, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {dizi.map((x, i) => <span key={i}>{x}<span style={{ color: renk, margin: `0 ${serit * 0.4}px`, fontWeight: 800 }}>//</span></span>)}
            </div>
          </div>
        </AbsoluteFill>
      );
    }
    case 'belge-sekmesi': {
      // belgenin sol-ust kenarina yapisik egik uclu sekme (@OkeanosHistory): once belge kenari cizgisi soldan uzar, sekme ondan asagi
      // iner; icinde kalin buyuk harf belge adi + '·' + tarih/yer (ust). Ton: vurgu sicaga kaydirilmis (kahve-turuncu ailesi).
      const c = ilerle(f, gec, fps * 0.45, 'kubik-hizli');
      const k = ilerle(f, gec + fps * 0.18, fps * 0.35, 'ustel-sert');
      const ton = karistir(karistir(palet.vurgu, '#c8602a', 0.35), '#000000', 0.12);
      const yz = H * 0.065, kenarY = H * 0.14;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, top: kenarY - 3, height: 5, width: W * c, background: ton, boxShadow: `0 2px 10px ${rgba('#000', 0.35)}` }} />
          <div style={{ position: 'absolute', left: 0, top: kenarY, overflow: 'hidden', height: yz + 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: yz, padding: `0 ${yz * 1.1}px 0 ${W * 0.035}px`, background: ton,
              clipPath: `polygon(0 0, 100% 0, calc(100% - ${yz * 0.7}px) 100%, 0 100%)`, transform: `translateY(${(k - 1) * 105}%)`,
              fontFamily: font.govde, fontWeight: 800, fontSize: yz * 0.46, letterSpacing: 2.5, color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              <span>{etiket}</span>
              {ust ? <><span style={{ opacity: 0.7 }}>·</span><span style={{ fontWeight: 600, opacity: 0.92 }}>{ust}</span></> : null}
            </div>
          </div>
        </AbsoluteFill>
      );
    }
    case 'dosya-sekmesi': {
      // ust kenarda vurgu renkli baslik sekmesi + sag ustte 'FILE 03 / 09' sayaci (@TactCoreYT); deger = bu dosya, baslangic = toplam
      const k = ilerle(f, gec, fps * 0.35, 'ustel-sert');
      const z = (n: number) => String(Math.max(0, Math.round(n))).padStart(2, '0');
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 64, top: 0, padding: '14px 28px 12px', background: renk, color: palet.acik ? '#ffffff' : palet.zemin, transform: `translateY(${(k - 1) * 100}%)`,
            fontFamily: font.govde, fontWeight: 800, fontSize: 36, letterSpacing: 4, textTransform: 'uppercase', borderRadius: '0 0 10px 10px', boxShadow: `0 8px 24px ${rgba('#000', 0.35)}` }}>{etiket}</div>
          <div style={{ position: 'absolute', right: 64, top: 30, ...yazi, fontSize: 32, letterSpacing: 3, opacity: k }}>
            FILE <span style={{ color: renk, fontWeight: 700 }}>{z(deger)}</span><span style={{ opacity: 0.6 }}> / {z(baslangic)}</span>
          </div>
        </AbsoluteFill>
      );
    }
    case 'bolum-cetveli': {
      // galeri (retropunkai s001-s004, rpa-dake, kloss-xyz): kalici yonlendirme. Ustte ince cetvel, bolum ilerledikce kayan
      // yuvarlak pim; gecilen kisim vurgu renginde dolar, gecilen isaretler rengini korur. Yazisiz 'neredeyiz' bilgisi.
      // Yil kipi: ust = '2018|2026' -> her yil bir isaret ('18 ... '26), pim baslangic -> deger yilina kayar.
      // Bolum kipi (varsayilan): deger = bu bolum (1'den), baslangic = toplam bolum (dosya-sekmesi ile ayni sozlesme); pim bir
      // onceki bolumden bu bolume kayar. etiket: pimin altinda bolum adi.
      const yil = ust.match(/^\s*(\d{3,4})\s*\|\s*(\d{3,4})\s*$/);
      const a0 = yil ? +yil[1] : 1, a1 = yil ? Math.max(+yil[2], a0 + 1) : Math.max(2, Math.round(baslangic) || 5);
      const N = a1 - a0 + 1;
      const hedef = yil ? sinirla(deger || a0, a0, a1) - a0 : sinirla(Math.round(deger) || 1, 1, N) - 1;
      const once = yil ? sinirla(baslangic && baslangic !== deger ? baslangic : (deger || a0) - 1, a0, a1) - a0 : Math.max(0, hedef - 1);
      const ac = ilerle(f, gec, fps * 0.45, 'kubik-hizli');
      const kay = yay(sinirla((f - gec - fps * 0.35) / (fps * Math.min(1.2, sure * 0.6))));
      const konum = once + (hedef - once) * kay;
      const X0 = 160, X1 = W - 160, Y = 92;
      const x = (k: number) => X0 + ((X1 - X0) * k) / Math.max(1, N - 1);
      const adim = N > 16 ? Math.ceil(N / 12) : 1;
      const etk = (k: number) => (yil ? `'${String(a0 + k).slice(-2)}` : String(k + 1).padStart(2, '0'));
      const pimX = x(konum);
      const golge = `0 1px 6px ${rgba('#000', 0.85)}`;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 260, background: `linear-gradient(180deg, ${rgba('#000', 0.55 * ac)}, ${rgba('#000', 0.3 * ac)} 55%, transparent)` }} />
          <svg width={W} height={240} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <line x1={X0} x2={X0 + (X1 - X0) * ac} y1={Y} y2={Y} stroke={rgba('#ffffff', 0.55)} strokeWidth={3} />
            <line x1={X0} x2={pimX} y1={Y} y2={Y} stroke={renk} strokeWidth={6} opacity={ac} />
            {Array.from({ length: N }, (_, k) => {
              const gecti = k <= konum + 0.02;
              const ara = k < N - 1 ? [0.25, 0.5, 0.75].map((u) => <line key={u} x1={x(k + u)} x2={x(k + u)} y1={Y - 6} y2={Y + 6} stroke={rgba('#ffffff', 0.4)} strokeWidth={2} />) : null;
              return (
                <g key={k} opacity={sinirla(ac * N - k * 0.6)}>
                  {ara}
                  <line x1={x(k)} x2={x(k)} y1={Y - 16} y2={Y + 16} stroke={gecti ? renk : rgba('#ffffff', 0.85)} strokeWidth={4} />
                </g>
              );
            })}
            <circle cx={pimX} cy={Y} r={17} fill={renk} stroke="#ffffff" strokeWidth={4} opacity={ac} />
          </svg>
          {Array.from({ length: N }, (_, k) => (k % adim && k !== N - 1 ? null : (
            <div key={k} style={{ position: 'absolute', left: x(k) - 60, width: 120, top: Y - 70, textAlign: 'center', ...yazi, fontSize: 36, fontWeight: 700, textShadow: golge,
              color: k <= konum + 0.02 ? renk : rgba('#ffffff', 0.85), opacity: sinirla(ac * N - k * 0.6) }}>{etk(k)}</div>
          )))}
          {etiket ? <div style={{ position: 'absolute', left: sinirla(pimX - 300, 60, W - 660), width: 600, top: Y + 30, textAlign: pimX - 300 < 60 ? 'left' : pimX + 300 > W - 60 ? 'right' : 'center',
            fontFamily: font.govde, fontWeight: 800, fontSize: 36, letterSpacing: 4, color: '#ffffff', textTransform: 'uppercase', textShadow: golge, opacity: kay, whiteSpace: 'nowrap' }}>{etiket}</div> : null}
        </AbsoluteFill>
      );
    }
    case 'hayalet-yil': {
      // galeri (kloss-xyz s015, asei-ikarashi, nummanali, tejasthange3): guncel basligin ARKASINDA ayni bilginin dev (kadraj
      // yuksekliginin ~%45'i) filigrani: yalniz kontur (palet murekkebi), %34 opak.
      // Yavas yatay kayar (kamera durmaz). Icerik: ust'te 3-4 haneli yil varsa o ('Feb 11, 1945' -> 1945), ust kisaysa (<= 6)
      // kendisi, yoksa baslangic -> deger sayar (+ birim). Sahnede basliktan ONCE (altta) cizilir; sahne degisince yeni Hud ile solar.
      const yilEs = ust.match(/\b(1\d{3}|20\d{2})\b/);
      const metin = yilEs ? yilEs[1] : ust && ust.length <= 6 ? ust : Math.round(v).toLocaleString('en-US') + (birim || '');
      const t = (f - gec) / fps;
      const gir = yay(sinirla((f - gec) / (fps * 0.6)));
      const boy = siganBoyut([metin], H * 0.62, font.baslik, W * 0.92);
      // palet murekkebi: koyu palette acik (medya ve koyu zeminde), acik palette koyu (palet zemininde) kontur
      const cizgi = palet.murekkep;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: boy, lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: font.aralik,
            color: 'transparent', WebkitTextStroke: `${Math.max(2, boy / 220).toFixed(2)}px ${rgba(cizgi, 0.34)}`,
            opacity: gir, transform: `translateX(${(1.5 - 0.35 * t).toFixed(3)}%) scale(${(1.04 - 0.04 * gir).toFixed(4)})`, fontVariantNumeric: 'tabular-nums' }}>{metin}</div>
        </AbsoluteFill>
      );
    }
    case 'belge-tarama-isigi': {
      // galeri (soumymaheshwri s002, sudo-kiran): kanit/belge inceleme ani. Vurgu renkli yatay tarama cizgisi ~0,5 sn'de iner
      // (arkasinda hafif renk izi; glow yok), dort kose parantezi kadraj kenarindan ilgili alana kilitlenir, alan disi hafif
      // kararir, alandaki satirlar fosforlu kalem gibi soldan saga isaretlenir; etiket (+ ust) alanin ustunde kucuk sekme.
      // bolge: [x, y, gen, yuk] (0..1). Galerideki 'satir kartlarina ayrilma' bu tipte yok (kart ekseninin isi).
      const [bx, by, bw, bh] = bolge || [0.17, 0.42, 0.66, 0.17];
      const tarama = sinirla((f - gec) / (fps * 0.55));
      const ty = egri('kubik-hizli', tarama) * (H + 40) - 20;
      const kilit = yay(sinirla((f - gec - fps * 0.45) / (fps * 0.4)));
      const L = { x: bx * W, y: by * H, w: bw * W, h: bh * H };
      const lerp = (a: number, b: number) => a + (b - a) * kilit;
      const kx = lerp(70, L.x), ky = lerp(70, L.y), kw = lerp(W - 140, L.w), kh = lerp(H - 140, L.h);
      const satir = Math.max(1, Math.min(3, Math.round(L.h / 90)));
      const isaret = (i: number) => egri('kubik-hizli', sinirla((f - gec - fps * 0.8 - i * 4) / (fps * 0.3)));
      const sekme = ilerle(f, gec + fps * 0.85, fps * 0.3, 'ustel-sert');
      const kk = 34, kc = 5;
      const koseler: React.CSSProperties[] = [
        { left: kx, top: ky, borderLeft: `${kc}px solid ${renk}`, borderTop: `${kc}px solid ${renk}` },
        { left: kx + kw - kk, top: ky, borderRight: `${kc}px solid ${renk}`, borderTop: `${kc}px solid ${renk}` },
        { left: kx, top: ky + kh - kk, borderLeft: `${kc}px solid ${renk}`, borderBottom: `${kc}px solid ${renk}` },
        { left: kx + kw - kk, top: ky + kh - kk, borderRight: `${kc}px solid ${renk}`, borderBottom: `${kc}px solid ${renk}` },
      ];
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <AbsoluteFill style={{ background: rgba('#000', 0.3 * kilit), clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${L.y}px, ${L.x}px ${L.y}px, ${L.x}px ${L.y + L.h}px, ${L.x + L.w}px ${L.y + L.h}px, ${L.x + L.w}px ${L.y}px, 0 ${L.y}px)` }} />
          {Array.from({ length: satir }, (_, i) => {
            const sh = L.h / satir;
            // fosforlu kalem: yari saydam bant + altinda tam renkli ince cizgi (her medyada okunur isaret)
            const w = (L.w - 20) * isaret(i);
            return (
              <React.Fragment key={i}>
                <div style={{ position: 'absolute', left: L.x + 10, top: L.y + i * sh + sh * 0.2, width: w, height: sh * 0.6, background: rgba(renk, 0.24), mixBlendMode: palet.acik ? 'multiply' : 'normal' }} />
                <div style={{ position: 'absolute', left: L.x + 10, top: L.y + i * sh + sh * 0.8, width: w, height: 5, background: renk }} />
              </React.Fragment>
            );
          })}
          {tarama > 0 && tarama < 1 ? (
            <>
              <div style={{ position: 'absolute', left: 0, right: 0, top: ty - 150, height: 150, background: `linear-gradient(180deg, transparent, ${rgba(renk, 0.16)})` }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: ty - 2, height: 4, background: renk }} />
            </>
          ) : null}
          {kilit > 0 ? koseler.map((st, i) => <div key={i} style={{ position: 'absolute', width: kk, height: kk, ...st, opacity: sinirla(kilit * 2) }} />) : null}
          {etiket ? (
            <div style={{ position: 'absolute', left: L.x, top: L.y - 70, overflow: 'hidden', height: 62 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 58, padding: '0 20px', background: renk, color: palet.acik ? '#ffffff' : palet.zemin, transform: `translateY(${(1 - sekme) * 125}%)`,
                fontFamily: font.govde, fontWeight: 800, fontSize: OKUNUR.enaz + 4, letterSpacing: 3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                <span>{etiket}</span>{ust ? <><span style={{ opacity: 0.6 }}>·</span><span style={{ fontWeight: 700 }}>{ust}</span></> : null}
              </div>
            </div>
          ) : null}
        </AbsoluteFill>
      );
    }
    case 'tarih-rozeti':
    default: {
      // sol ust: kalici tarih/yer rozeti — ince vurgu cubugu, ust satir yer (buyuk harf, aralikli), alt satir tarih; degistiginde kayarak yenilenir
      const k = ilerle(f, gec + 4, fps * 0.4, stil.hareket);
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 64, top: 56, display: 'flex', gap: 16, alignItems: 'stretch', opacity: g }}>
            <div style={{ width: 5, background: renk, transform: `scaleY(${g})`, transformOrigin: 'top' }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: 36, letterSpacing: 5, color: '#ffffff', textTransform: 'uppercase', textShadow: `0 1px 6px ${rgba('#000', 0.85)}`, transform: `translateY(${(1 - k) * 100}%)` }}>{etiket}</div>
              <div style={{ fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), fontSize: 32, color: rgba('#ffffff', 0.88), textShadow: `0 1px 6px ${rgba('#000', 0.85)}`, transform: `translateY(${(1 - k) * 140}%)` }}>{ust}</div>
            </div>
          </div>
        </AbsoluteFill>
      );
    }
  }
};
