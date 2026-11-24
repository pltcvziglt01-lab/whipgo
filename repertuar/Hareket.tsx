import React, { useId } from 'react';
import { AbsoluteFill } from 'remotion';
import { DEKLANSOR } from './temel';

// REPERTUAR — hareket bulanikligi. AE'de hizli giden her katmanin "motion blur" anahtari acik olur; kod uretimi videoda
// her kare jilet keskin kalir ve hareket "kayar" gibi gorunur. Iki arac:
//  - ZamanBulanik: tum kare/medya donusumu (zoom, pan, sarsinti, whip) icin. Deklansor araligini alt karelerde orneklenmis
//    kopyalarla ortalar; zoom'da radyal, pan'da yonlu, donmede yay seklinde dogru bulaniklik verir.
//  - YonBulanik: kucuk ogeler (kelime, kart) icin SVG feGaussianBlur stdDeviation="x y": kaymanin yonunde, hizdan turetilir.
// Ikisi de esigin altinda (yavas hareket) hicbir sey eklemez: gorunum ve render suresi eskisiyle ayni.

/** donusum(dt): karenin ortasindan dt kare uzaktaki CSS transform. boy: deklansor araliginda en buyuk ekran kaymasi (px).
 *  Kopyalar esit agirlikla ust uste biner (k. kopyanin opakligi 1/(k+1)). adim: kopyalar arasi en cok px. */
export const ZamanBulanik: React.FC<{
  donusum: (dt: number) => string; boy: number; esik?: number; adim?: number; enCok?: number;
  style?: React.CSSProperties; children: React.ReactNode;
}> = ({ donusum, boy, esik = 2, adim = 4, enCok = 10, style, children }) => {
  const n = boy < esik ? 1 : Math.min(enCok, Math.max(3, Math.ceil(boy / adim)));
  if (n === 1) return <AbsoluteFill style={{ ...style, transform: donusum(0) }}>{children}</AbsoluteFill>;
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <AbsoluteFill key={k} style={{ ...style, transform: donusum((k / (n - 1) - 0.5) * DEKLANSOR), opacity: 1 / (k + 1) }}>{children}</AbsoluteFill>
      ))}
    </>
  );
};

/** dx/dy: ogenin deklansor araligindaki kaymasi (px, temel.kayma ile). Gauss sigma ~ kayma * 0.3 (kutu bulanikligina denk). */
export const YonBulanik: React.FC<{ dx?: number; dy?: number; esik?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ dx = 0, dy = 0, esik = 0.6, style, children }) => {
  const id = 'yb' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sx = Math.min(40, Math.abs(dx) * 0.3), sy = Math.min(40, Math.abs(dy) * 0.3);
  if (Math.max(sx, sy) < esik) return <div style={style}>{children}</div>;
  return (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
        </filter>
      </svg>
      <div style={{ ...style, filter: `url(#${id})${style?.filter ? ' ' + style.filter : ''}` }}>{children}</div>
    </>
  );
};
