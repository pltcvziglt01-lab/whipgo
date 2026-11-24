import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, egri, ilerle, rgba, sinirla } from './temel';

// HUD — medyanin USTUNE binen kalici bilgi katmanlari (saydam). Ogrenildigi kanallar: @Ground-Engineering (kamerayla senkron
// derinlik sayaci), @ImmersivePast (sag kenarda derinlik cetveli + sol ustte guncellenen tarih/yer rozeti).
// Deger animasyonu: baslangic -> deger, 'sure' saniyede (kamera hareketiyle es zamanli kullanilir).
export const HUD_TIPLERI = ['derinlik-cetvel', 'koordinat', 'zaman-kodu', 'tarih-rozeti', 'dosya-sekmesi'] as const;
export type HudTip = typeof HUD_TIPLERI[number];

const kose = (renk: string, k = 22, c = 3): React.CSSProperties[] => [
  { left: 0, top: 0, borderLeft: `${c}px solid ${renk}`, borderTop: `${c}px solid ${renk}` },
  { right: 0, top: 0, borderRight: `${c}px solid ${renk}`, borderTop: `${c}px solid ${renk}` },
  { left: 0, bottom: 0, borderLeft: `${c}px solid ${renk}`, borderBottom: `${c}px solid ${renk}` },
  { right: 0, bottom: 0, borderRight: `${c}px solid ${renk}`, borderBottom: `${c}px solid ${renk}` },
].map((s) => ({ position: 'absolute', width: k, height: k, ...s }));

export const Hud: React.FC<{ tip: HudTip; stil: Stil; deger?: number; baslangic?: number; birim?: string; etiket?: string; ust?: string; sure?: number; gec?: number }> = ({
  tip, stil, deger = 0, baslangic = 0, birim = '', etiket = '', ust = '', sure = 3, gec = 0,
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
                {uzun && birimNo >= 0 ? <text x={X + 72} y={y + 7} fill={rgba('#ffffff', 0.75)} fontFamily={font.mono} fontSize={20}>{birimNo}</text> : null}
              </g>;
            })}
            <polygon points={`${X - 18},${H / 2 - 11} ${X - 2},${H / 2} ${X - 18},${H / 2 + 11}`} fill={renk} />
          </svg>
          <div style={{ position: 'absolute', right: 240, top: H / 2 - 52, padding: '12px 24px', background: rgba('#000', 0.45), border: `1px solid ${rgba(renk, 0.8)}` }}>
            {kose(renk, 14, 3).map((s, i) => <div key={i} style={{ ...s, margin: -5 }} />)}
            <div style={{ ...yazi, fontSize: 18, letterSpacing: 4, color: renk }}>{(etiket || 'DEPTH').toUpperCase()}</div>
            <div style={{ ...yazi, fontSize: 46, fontWeight: 700 }}>{Math.round(v).toLocaleString('en-US')}<span style={{ fontSize: 24, marginLeft: 8 }}>{birim}</span></div>
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
          <div style={{ position: 'absolute', left: 70, bottom: 60, ...yazi, fontSize: 26, lineHeight: 1.5 }}>
            <div style={{ color: renk, fontSize: 18, letterSpacing: 4 }}>{(etiket || 'POSITION').toUpperCase()}</div>
            <div>{fmt(lat, 'N', 'S')}</div><div>{fmt(lon, 'E', 'W')}</div>
          </div>
          <div style={{ position: 'absolute', right: 70, top: 56, display: 'flex', alignItems: 'center', gap: 12, ...yazi, fontSize: 24 }}>
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
            <div style={{ color: renk, fontSize: 18, letterSpacing: 4 }}>{(etiket || 'LOCAL TIME').toUpperCase()}</div>
            <div style={{ fontSize: 40 }}>{z(hh)}:{z(mm)}:{z(ss)}<span style={{ opacity: 0.6, fontSize: 28 }}>:{z(kk)}</span></div>
            {ust ? <div style={{ fontSize: 20, opacity: 0.8, marginTop: 4 }}>{ust}</div> : null}
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
            fontFamily: font.govde, fontWeight: 800, fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', borderRadius: '0 0 10px 10px', boxShadow: `0 8px 24px ${rgba('#000', 0.35)}` }}>{etiket}</div>
          <div style={{ position: 'absolute', right: 64, top: 30, ...yazi, fontSize: 26, letterSpacing: 3, opacity: k }}>
            FILE <span style={{ color: renk, fontWeight: 700 }}>{z(deger)}</span><span style={{ opacity: 0.6 }}> / {z(baslangic)}</span>
          </div>
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
              <div style={{ fontFamily: font.govde, fontWeight: 700, fontSize: 24, letterSpacing: 5, color: '#ffffff', textTransform: 'uppercase', textShadow: `0 1px 6px ${rgba('#000', 0.85)}`, transform: `translateY(${(1 - k) * 100}%)` }}>{etiket}</div>
              <div style={{ fontFamily: font.mono, fontWeight: font.monoAgirlik, fontSize: 22, color: rgba('#ffffff', 0.8), textShadow: `0 1px 6px ${rgba('#000', 0.85)}`, transform: `translateY(${(1 - k) * 140}%)` }}>{ust}</div>
            </div>
          </div>
        </AbsoluteFill>
      );
    }
  }
};
