import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, fbm, karistir, rastgele, rgba } from './temel';

// BITIS — post-produksiyon katmani: videonun tamamini sarar. "Kod ciktisi" duzlugunu kirar, After Effects / renk duzeltme
// hissi verir: kamera nefesi (wiggle), split-tone grade (kalkik siyahlar + sicak/soguk isik), kayan isik cepleri,
// gren, film titremesi, projektor sallantisi, kenar karartma, kromatik kenar. Hepsi palete baglidir.
// Kullanim: <Bitis tip={dna.bitis} stil={stil} anlar={[bolumKareleri]}>{video}</Bitis>  (anlar: isik suzulmesi kareleri)
export const BITIS_TIPLERI = ['sinema-film', 'temiz-dijital', 'arsiv-proje', 'neon-parilti', 'sicak-hale', 'soguk-belgesel'] as const;
export type BitisTip = typeof BITIS_TIPLERI[number];

type Ayar = {
  nefes: number; don: number; filtre: string; golge: string; isik: string; tint: number; siyah: number; gren: number; titreme: number;
  sallanti: number; cep: number; cepRenk: [string, string]; kenar: number; kromatik: number; sicakNokta: number; suzulme: string;
};

const ayar = (tip: BitisTip, s: Stil): Ayar => {
  const p = s.palet;
  switch (tip) {
    case 'temiz-dijital':
      return { nefes: 2.5, don: 0, filtre: 'contrast(1.04) saturate(1.06)', golge: p.zemin2, isik: '#ffffff', tint: 0.06, siyah: 0.12, gren: 0.025, titreme: 0,
        sallanti: 0, cep: 0.12, cepRenk: [p.vurgu, p.vurgu2], kenar: 0.18, kromatik: 0, sicakNokta: 0, suzulme: p.vurgu };
    case 'arsiv-proje':
      return { nefes: 3, don: 0.2, filtre: 'contrast(1.16) saturate(0.55) sepia(0.28)', golge: '#1d140c', isik: '#f3d9a4', tint: 0.22, siyah: 0.32, gren: 0.15, titreme: 0.05,
        sallanti: 1.3, cep: 0, cepRenk: ['#f3d9a4', '#f3d9a4'], kenar: 0.6, kromatik: 0, sicakNokta: 0.07, suzulme: '#ffd9a0' };
    case 'neon-parilti':
      return { nefes: 4, don: 0.1, filtre: 'contrast(1.1) saturate(1.25)', golge: karistir(p.vurgu2, '#000000', 0.7), isik: p.vurgu, tint: 0.16, siyah: 0.28, gren: 0.04, titreme: 0.01,
        sallanti: 0, cep: 0.3, cepRenk: [p.vurgu, p.vurgu2], kenar: 0.35, kromatik: 0.5, sicakNokta: 0, suzulme: p.vurgu2 };
    case 'sicak-hale':
      return { nefes: 4, don: 0.12, filtre: 'contrast(1.03) saturate(1.06) brightness(1.03)', golge: '#3a1e10', isik: '#ffc58a', tint: 0.2, siyah: 0.3, gren: 0.05, titreme: 0.01,
        sallanti: 0, cep: 0.26, cepRenk: ['#ffb36b', p.vurgu], kenar: 0.3, kromatik: 0, sicakNokta: 0.05, suzulme: '#ffc27a' };
    case 'soguk-belgesel':
      return { nefes: 3, don: 0.08, filtre: 'contrast(1.1) saturate(0.82)', golge: '#0d2238', isik: '#cfe6ff', tint: 0.2, siyah: 0.3, gren: 0.06, titreme: 0.012,
        sallanti: 0, cep: 0.08, cepRenk: ['#9cc8ff', p.vurgu], kenar: 0.45, kromatik: 0, sicakNokta: 0, suzulme: '#d8ecff' };
    case 'sinema-film':
    default:
      return { nefes: 5, don: 0.14, filtre: 'contrast(1.08) saturate(0.9)', golge: '#0b3c49', isik: '#ffb070', tint: 0.2, siyah: 0.34, gren: 0.07, titreme: 0.015,
        sallanti: 0, cep: 0.18, cepRenk: ['#ffb070', p.vurgu], kenar: 0.45, kromatik: 0, sicakNokta: 0, suzulme: '#ffcf96' };
  }
};

/** isik suzulmesi: bolum gecislerinde ekrani capraz gecen yumusak isik bandi (0,9 sn) */
const Suzulme: React.FC<{ an: number; renk: string }> = ({ an, renk }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = (f - an) / (fps * 0.9);
  if (t < 0 || t > 1) return null;
  const x = -0.6 * W + t * 2.2 * W;
  const a = Math.sin(t * Math.PI);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: x, top: -H * 0.3, width: W * 0.45, height: H * 1.6, transform: 'rotate(18deg)', filter: 'blur(70px)',
        background: `linear-gradient(90deg, transparent, ${rgba(renk, 0.55 * a)} 45%, ${rgba('#ffffff', 0.35 * a)} 50%, ${rgba(renk, 0.55 * a)} 55%, transparent)` }} />
    </AbsoluteFill>
  );
};

export const Bitis: React.FC<{ tip?: BitisTip; stil: Stil; anlar?: number[]; children: React.ReactNode }> = ({ tip, stil, anlar = [], children }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  if (!tip) return <>{children}</>;
  const a = ayar(tip, stil);
  const t = f / fps;
  const tohum = (stil.tohum.length * 7.3) % 50;
  // kamera nefesi: yavas fbm wiggle (AE "wiggle(0.3, 5)" benzeri) + projektor sallantisi (kare basina titreme)
  const r = rastgele(f * 13 + 7);
  const sx = a.sallanti ? (r() - 0.5) * a.sallanti : 0, sy = a.sallanti ? (r() - 0.5) * a.sallanti * 1.6 : 0;
  const x = fbm(t * 0.22, 1.3, tohum) * a.nefes + sx;
  const y = fbm(3.1, t * 0.19, tohum + 4) * a.nefes * 0.7 + sy;
  const rot = fbm(t * 0.13, 7.7, tohum + 9) * a.don;
  const olcek = 1 + (a.nefes * 2.4 + a.sallanti * 2) / Math.min(W, H) + 0.004 * Math.sin(t * 0.35);
  const titre = a.titreme ? (r() - 0.5) * 2 * a.titreme : 0;
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${olcek})`, filter: a.filtre }}>{children}</AbsoluteFill>
      {/* kalkik siyahlar: koyu tonu 'screen' ile golge rengine kaydirir (film baskisi) */}
      <AbsoluteFill style={{ background: a.golge, opacity: a.siyah, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      {/* split-tone: ust (isik) / alt (golge) yonlu soft-light */}
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${rgba(a.isik, a.tint)} 0%, transparent 55%, ${rgba(a.golge, a.tint * 1.2)} 100%)`, mixBlendMode: 'soft-light', pointerEvents: 'none' }} />
      {a.cep > 0 ? (
        <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
          {[0, 1].map((i) => {
            const cx = (0.5 + 0.45 * fbm(t * 0.05 + i * 9, 2.2, tohum + i)) * W, cy = (0.5 + 0.4 * fbm(4.4, t * 0.04 + i * 5, tohum + i)) * H;
            const nab = 0.75 + 0.25 * Math.sin(t * 0.6 + i * 2);
            return <div key={i} style={{ position: 'absolute', left: cx - 450, top: cy - 450, width: 900, height: 900, borderRadius: '50%', filter: 'blur(80px)',
              background: `radial-gradient(circle, ${rgba(a.cepRenk[i], a.cep * nab)} 0%, transparent 65%)` }} />;
          })}
        </AbsoluteFill>
      ) : null}
      {a.sicakNokta ? <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${rgba('#fff3d6', a.sicakNokta)} 0%, transparent 60%)`, mixBlendMode: 'screen', pointerEvents: 'none' }} /> : null}
      {anlar.map((an, i) => <Suzulme key={i} an={an} renk={a.suzulme} />)}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 48%, ${rgba('#000', a.kenar)} 100%)`, pointerEvents: 'none' }} />
      {a.kromatik ? <AbsoluteFill style={{ boxShadow: `inset 8px 0 40px ${rgba('#ff2a6d', 0.22 * a.kromatik)}, inset -8px 0 40px ${rgba('#05d9e8', 0.22 * a.kromatik)}`, pointerEvents: 'none' }} /> : null}
      {a.titreme ? <AbsoluteFill style={{ background: titre > 0 ? '#fff' : '#000', opacity: Math.abs(titre), pointerEvents: 'none' }} /> : null}
      {a.gren > 0 ? (
        <AbsoluteFill style={{ opacity: a.gren, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
          <svg width={W} height={H}><filter id={`btg-${tip}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 24} /></filter><rect width={W} height={H} filter={`url(#btg-${tip})`} /></svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
