import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

// Premiere presetlerinden OGRENILMIS hareket dili (preset_ogren.py -> preset-dili-remotion.json).
// Premiere gerekmez: anahtar kareler + bezier egrileri burada birebir oynatilir.
// JSON kullanicinin makinesinde kalir (paket lisansi dagitimi yasaklar); bu bilesen serbesttir.
export type PresetIz = { k: [number, number | number[]][]; e: [number, number, number, number][] };
export type PresetVeri = { ad: string; yol: string; sinif: string; sure: number; iz: Record<string, PresetIz> };

const bez = (x1: number, y1: number, x2: number, y2: number, x: number) => {
  // x -> t (ikiye bolme), t -> y
  const cx = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const cy = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  let a = 0, b = 1, t = x;
  for (let i = 0; i < 24; i++) { t = (a + b) / 2; if (cx(t) < x) a = t; else b = t; }
  return cy(t);
};

/** iz degerini zamanda hesapla (sn) */
export const izDeger = (iz: PresetIz, t: number): number | number[] => {
  const k = iz.k;
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, v0] = k[i], [t1, v1] = k[i + 1];
    if (t <= t1) {
      const [x1, y1, x2, y2] = iz.e[i] || [0, 0, 1, 1];
      const p = bez(x1, y1, x2, y2, (t - t0) / Math.max(1e-4, t1 - t0));
      if (Array.isArray(v0)) return (v0 as number[]).map((a, j) => a + ((v1 as number[])[j] - a) * p);
      return (v0 as number) + ((v1 as number) - (v0 as number)) * p;
    }
  }
  return k[k.length - 1][1];
};

export const presetStil = (p: PresetVeri, t: number, W: number, H: number): React.CSSProperties => {
  const v = (ad: string) => (p.iz[ad] ? izDeger(p.iz[ad], t) : undefined);
  const konum = v('konum') as number[] | undefined;
  const olcek = v('olcek') as number | undefined, olcekX = v('olcek_x') as number | undefined;
  const donme = v('donme') as number | undefined, opak = v('opaklik') as number | undefined, bul = v('bulanik') as number | undefined;
  const tr: string[] = [];
  if (konum) tr.push(`translate(${(konum[0] - 0.5) * W}px, ${(konum[1] - 0.5) * H}px)`);
  if (olcek !== undefined || olcekX !== undefined) tr.push(`scale(${(olcekX ?? olcek ?? 100) / 100}, ${(olcek ?? 100) / 100})`);
  if (donme !== undefined) tr.push(`rotate(${donme}deg)`);
  return { transform: tr.join(' ') || undefined, opacity: opak !== undefined ? opak / 100 : undefined, filter: bul ? `blur(${bul * 0.4}px)` : undefined };
};

/** cocugu presetin hareketiyle oynatir. gec: baslangic karesi, hiz: 1 = orijinal, dongu: sure bitince tekrar */
export const PresetHareket: React.FC<{ preset: PresetVeri; gec?: number; hiz?: number; dongu?: boolean; children: React.ReactNode }> = ({ preset, gec = 0, hiz = 1, dongu, children }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  let t = Math.max(0, (f - gec) / fps) * hiz;
  if (dongu && preset.sure > 0) t = t % (preset.sure + 0.4);
  return <AbsoluteFill style={{ ...presetStil(preset, t, W, H), overflow: 'visible' }}>{children}</AbsoluteFill>;
};
