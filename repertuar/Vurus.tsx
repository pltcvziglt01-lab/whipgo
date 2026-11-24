import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, rastgele, rgba, sinirla } from './temel';

// VURUS PAKETI — bir olayin (sayi karti, vurgu kelimesi, bolum kesimi) TEK KAREDE senkron darbesi:
// ezilme (squash) + sonumlu kamera sarsintisi + tek flas + genisleyen halka + kivilcim. SFX'in olculen tepesi ayni kareye
// oturur (Sfx.tsx). Recete: givemotion impacts-and-energy (MIT) — kod bizim.
// seviye 0 = kapali (sakin ton), 1 = kucuk (sarsinti 6 px + halka; ciddi/gizem), 2 = buyuk (+ezilme, flas), 3 = tam (+kivilcim; enerjik).
// Flas tek seferlik (WCAG: saniyede 3 flas siniri asilmaz; kusur_kontrol.py olcer).
export type VurusSeviye = 0 | 1 | 2 | 3;

const sonum = (t: number, hiz: number) => Math.exp(-t * hiz);

export const Vurus: React.FC<{ stil: Stil; seviye?: VurusSeviye; gec?: number; x?: number; y?: number; tohum?: string; children: React.ReactNode }> = ({
  stil, seviye = 2, gec = 0, x = 0.5, y = 0.5, tohum = 'v', children,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  if (!seviye) return <>{children}</>;
  const t = (f - gec) / fps; // saniye, vurustan beri
  const aktif = t >= 0 && t < 1.2;
  // ezilme: 70 ms ezik (scaleY .88 / scaleX 1.07), sonra elastik yerlesme
  let sx = 1, sy = 1;
  if (aktif && seviye >= 2) {
    if (t < 0.07) { const k = t / 0.07; sx = 1 + 0.07 * k; sy = 1 - 0.12 * k; }
    else { const u = t - 0.07; const e = sonum(u, 7) * Math.cos(u * 26); sx = 1 + 0.07 * e; sy = 1 - 0.12 * e; }
  }
  // sarsinti: sonumlu, iki eksende farkli frekans
  const genlik = seviye === 1 ? 6 : seviye === 2 ? 14 : 20;
  const r = rastgele(tohum + 'vs');
  const fx = 37 + r() * 9, fy = 29 + r() * 9;
  const dx = aktif ? genlik * sonum(t, 7.5) * Math.sin(t * fx) : 0;
  const dy = aktif ? genlik * 0.7 * sonum(t, 7.5) * Math.cos(t * fy) : 0;
  const flas = seviye >= 2 && aktif ? 0.55 * sonum(t, 18) : 0;
  const halkaK = sinirla(t / 0.6);
  const halka = aktif && t < 0.6;
  const cx = x * W, cy = y * H;
  const kivilcim = seviye >= 3 && aktif && t < 0.7
    ? Array.from({ length: 36 }, (_, i) => {
      const rr = rastgele(tohum + 'k' + i);
      const aci = (-170 + rr() * 160) * (Math.PI / 180) + (rr() < 0.5 ? 0 : Math.PI);
      const hiz = (900 + rr() * 1100) * (W / 1920);
      const ut = t * (0.8 + rr() * 0.4);
      const px = cx + Math.cos(aci) * hiz * ut * sonum(ut, 2.2), py = cy + Math.sin(aci) * hiz * ut * sonum(ut, 2.2) + 900 * ut * ut;
      const boy = 10 + rr() * 22;
      return { px, py, aci, boy, op: 1 - sinirla(ut / 0.6) };
    })
    : [];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: `${x * 100}% ${y * 100 + 10}%` }}>{children}</AbsoluteFill>
      {halka ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <circle cx={cx} cy={cy} r={H * (0.08 + 0.55 * (1 - Math.pow(1 - halkaK, 3)))} fill="none" stroke={stil.palet.vurgu} strokeWidth={10 * (1 - halkaK) + 1} opacity={0.85 * (1 - halkaK)} />
          {seviye >= 2 ? <circle cx={cx} cy={cy} r={H * (0.05 + 0.35 * (1 - Math.pow(1 - sinirla(t / 0.45), 3)))} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.6 * (1 - sinirla(t / 0.45))} /> : null}
          {kivilcim.map((k, i) => (
            <line key={i} x1={k.px} y1={k.py} x2={k.px - Math.cos(k.aci) * k.boy} y2={k.py - Math.sin(k.aci) * k.boy} stroke={i % 3 ? stil.palet.vurgu : '#ffffff'} strokeWidth={3} strokeLinecap="round" opacity={k.op} />
          ))}
        </svg>
      ) : null}
      {flas > 0.01 ? <AbsoluteFill style={{ background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${rgba('#ffffff', flas)} 0%, ${rgba(stil.palet.vurgu, flas * 0.4)} 40%, transparent 75%)`, mixBlendMode: 'screen', pointerEvents: 'none' }} /> : null}
    </AbsoluteFill>
  );
};

/** tona gore varsayilan seviye */
export const vurusSeviye = (ton?: string): VurusSeviye => (ton === 'enerjik' ? 3 : ton === 'sakin' ? 0 : ton === 'gizem' ? 1 : 1);
