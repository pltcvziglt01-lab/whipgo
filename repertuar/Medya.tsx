import React, { useMemo } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { Stil, fbm, rastgele, rgba, sinirla } from './temel';

// ---------------- KAMERA (gorsel/klip icindeki hareket) ----------------
// klasik Claude = her fotoda 'ken-burns-ice' 1.05 + 0.015/sn. Repertuar karistirir; stil_dna 2-3 tip secer.
export const KAMERA_TIPLERI = ['sabit', 'ken-burns-ice', 'ken-burns-disa', 'pan-sol', 'pan-sag', 'pan-yukari', 'el-kamerasi', 'zoom-darbe', 'dolly-egik', 'paralaks-cift'] as const;
export type KameraTip = typeof KAMERA_TIPLERI[number];

const kameraDonusum = (tip: KameraTip, t: number, f: number, tohum: string, hiz = 1): string => {
  const T = t * hiz;
  switch (tip) {
    case 'ken-burns-ice': return `scale(${1.04 + 0.035 * T})`;
    case 'ken-burns-disa': return `scale(${Math.max(1.02, 1.22 - 0.035 * T)})`;
    case 'pan-sol': return `scale(1.18) translateX(${6 - 2.2 * T}%)`;
    case 'pan-sag': return `scale(1.18) translateX(${-6 + 2.2 * T}%)`;
    case 'pan-yukari': return `scale(1.2) translateY(${6 - 2 * T}%)`;
    case 'el-kamerasi': { const h = tohum.length; return `scale(1.08) translate(${fbm(T * 0.9, h, 1) * 14}px, ${fbm(h, T * 0.9, 2) * 10}px) rotate(${fbm(T * 0.5, 3, h) * 0.6}deg)`; }
    case 'zoom-darbe': { const p = sinirla(f / 6); return `scale(${1.25 - 0.17 * (1 - Math.pow(1 - p, 3)) + 0.012 * T})`; }
    case 'dolly-egik': return `scale(${1.1 + 0.02 * T}) rotate(${-1.2 + 0.5 * T}deg)`;
    default: return 'none';
  }
};

export type MedyaKaynak = { src: string; video?: boolean; bas?: number; derece?: string };
const Ham: React.FC<{ m: MedyaKaynak; style?: React.CSSProperties }> = ({ m, style }) => {
  const { fps } = useVideoConfig();
  const st: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', filter: m.derece, ...style };
  const src = m.src.startsWith('http') ? m.src : staticFile(m.src);
  return m.video ? <OffthreadVideo muted src={src} startFrom={Math.round((m.bas || 0) * fps)} style={st} /> : <Img src={src} style={st} />;
};

export const Medya: React.FC<{ m: MedyaKaynak; kamera?: KameraTip; hiz?: number; tohum?: string }> = ({ m, kamera = 'sabit', hiz = 1, tohum = 'k' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  if (kamera === 'paralaks-cift') {
    // sahte 2.5B: arkada bulanik buyuk kopya yavas, onde keskin kopya hizli ve hafif maskeli
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transform: `scale(1.3) translateX(${-1 * t}%)`, filter: 'blur(14px) brightness(0.8)' }}><Ham m={m} /></AbsoluteFill>
        <AbsoluteFill style={{ transform: `scale(${1.06 + 0.03 * t}) translateX(${2 - 1.8 * t}%)`, WebkitMaskImage: 'radial-gradient(ellipse 75% 85% at 50% 50%, #000 60%, transparent 100%)' }}><Ham m={m} /></AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{ overflow: 'hidden' }}><AbsoluteFill style={{ transform: kameraDonusum(kamera, t, f, tohum, hiz) }}><Ham m={m} /></AbsoluteFill></AbsoluteFill>;
};

// ---------------- CERCEVE / DUZEN ----------------
// 'tam' disindaki her duzen arkada ANIMASYONLU arka plan kullanir (duz renk degil).
export const CERCEVE_TIPLERI = ['tam', 'inset-golge', 'bulanik-kopya', 'polaroid', 'tv-crt', 'letterbox', 'pencere', 'film-seridi', 'bolunmus', 'kolaj', 'yuvarlak-yan', 'altin-cerceve'] as const;
export type CerceveTip = typeof CERCEVE_TIPLERI[number];

export const Cerceve: React.FC<{ tip: CerceveTip; m: MedyaKaynak; m2?: MedyaKaynak; m3?: MedyaKaynak; kamera?: KameraTip; stil: Stil; arkaplan?: ArkaplanTip; etiket?: string; tohum?: string }> = ({ tip, m, m2, m3, kamera = 'sabit', stil, arkaplan = 'gradyan-akis', etiket, tohum = 'c' }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = f / fps;
  const { palet, font } = stil;
  const ap = <Arkaplan tip={arkaplan} stil={stil} tohum={tohum} />;
  const md = (x: MedyaKaynak, k: KameraTip = kamera) => <Medya m={x} kamera={k} tohum={tohum} />;
  const kutu = (l: number, tp: number, w: number, h: number, ic: React.ReactNode, ek: React.CSSProperties = {}) => (
    <div style={{ position: 'absolute', left: l, top: tp, width: w, height: h, overflow: 'hidden', ...ek }}>{ic}</div>
  );
  const giris = sinirla(f / 14);
  switch (tip) {
    case 'tam': return md(m);
    case 'inset-golge':
      return <AbsoluteFill>{ap}{kutu(W * 0.12, H * 0.11, W * 0.76, H * 0.78, md(m), { borderRadius: 28, boxShadow: `0 50px 120px ${rgba('#000', 0.45)}`, transform: `scale(${0.96 + 0.04 * giris})` })}</AbsoluteFill>;
    case 'bulanik-kopya':
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ filter: 'blur(40px) brightness(0.7) saturate(1.3)', transform: 'scale(1.2)' }}><Ham m={m} /></AbsoluteFill>
          {kutu((W - H * 0.86 * 1.2) / 2, H * 0.07, H * 0.86 * 1.2, H * 0.86, md(m), { boxShadow: `0 30px 90px ${rgba('#000', 0.5)}` })}
        </AbsoluteFill>
      );
    case 'polaroid': {
      const rot = -4 + 2 * Math.sin(t * 0.4);
      return (
        <AbsoluteFill>{ap}
          <div style={{ position: 'absolute', left: W * 0.27, top: H * 0.08, width: W * 0.46, height: H * 0.84, background: '#fbfaf6', padding: '26px 26px 120px', boxSizing: 'border-box', boxShadow: `0 40px 90px ${rgba('#000', 0.45)}`, transform: `rotate(${rot}deg) translateY(${(1 - giris) * 80}px)` }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{md(m)}</div>
            {etiket ? <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontFamily: font.mono, fontSize: 38, color: '#333' }}>{etiket}</div> : null}
          </div>
        </AbsoluteFill>
      );
    }
    case 'tv-crt':
      return (
        <AbsoluteFill>{ap}
          <div style={{ position: 'absolute', left: W * 0.17, top: H * 0.1, width: W * 0.66, height: H * 0.8, borderRadius: 60, background: '#1a1a1a', padding: 40, boxShadow: `0 40px 100px ${rgba('#000', 0.6)}, inset 0 0 0 6px #2b2b2b` }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 46, overflow: 'hidden', position: 'relative', filter: 'saturate(1.3) contrast(1.1)' }}>
              {md(m)}
              <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, ${rgba('#000', 0.3)} 0 2px, transparent 2px 4px)` }} />
              <AbsoluteFill style={{ boxShadow: `inset 0 0 120px ${rgba('#000', 0.8)}`, borderRadius: 46 }} />
            </div>
          </div>
        </AbsoluteFill>
      );
    case 'letterbox': {
      const b = H * 0.12 * giris;
      return <AbsoluteFill style={{ background: '#000' }}>{md(m)}<div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: b, background: '#000' }} /><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: b, background: '#000' }} /></AbsoluteFill>;
    }
    case 'pencere':
      return (
        <AbsoluteFill>{ap}
          <div style={{ position: 'absolute', left: W * 0.14, top: H * 0.1, width: W * 0.72, height: H * 0.8, borderRadius: 18, overflow: 'hidden', boxShadow: `0 40px 100px ${rgba('#000', 0.45)}`, background: palet.acik ? '#fff' : '#1b1d22', transform: `translateY(${(1 - giris) * 60}px)` }}>
            <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', background: palet.acik ? '#ece9e2' : '#26292f' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
              <div style={{ marginLeft: 20, fontFamily: font.mono, fontSize: 22, color: palet.soluk }}>{etiket || ''}</div>
            </div>
            <div style={{ position: 'absolute', top: 54, left: 0, right: 0, bottom: 0 }}>{md(m)}</div>
          </div>
        </AbsoluteFill>
      );
    case 'film-seridi': {
      const kay = (t * 60) % 90;
      const delik = (y: number) => <div style={{ position: 'absolute', left: 0, right: 0, top: y, height: 70, background: '#0c0c0c', backgroundImage: `repeating-linear-gradient(90deg, transparent 0 24px, #e8e2d0 24px 54px, transparent 54px 90px)`, backgroundSize: '90px 34px', backgroundRepeat: 'repeat-x', backgroundPosition: `${-kay}px 18px` }} />;
      return <AbsoluteFill style={{ background: '#0c0c0c' }}>{kutu(0, 90, W, H - 180, md(m), { filter: 'sepia(0.25) contrast(1.05)' })}{delik(10)}{delik(H - 80)}</AbsoluteFill>;
    }
    case 'bolunmus':
      return <AbsoluteFill>{ap}{kutu(60, 60, W / 2 - 75, H - 120, md(m), { borderRadius: 18, transform: `translateX(${(1 - giris) * -120}px)` })}{kutu(W / 2 + 15, 60, W / 2 - 75, H - 120, md(m2 || m, 'ken-burns-disa'), { borderRadius: 18, transform: `translateX(${(1 - giris) * 120}px)` })}</AbsoluteFill>;
    case 'kolaj': {
      const g = (i: number) => sinirla((f - i * 5) / 12);
      return (
        <AbsoluteFill>{ap}
          {kutu(W * 0.05, H * 0.08, W * 0.5, H * 0.84, md(m), { borderRadius: 10, transform: `rotate(-2deg) scale(${0.9 + 0.1 * g(0)})`, opacity: g(0), boxShadow: `0 30px 70px ${rgba('#000', 0.4)}` })}
          {kutu(W * 0.58, H * 0.06, W * 0.37, H * 0.42, md(m2 || m, 'pan-sag'), { borderRadius: 10, transform: `rotate(2deg) scale(${0.9 + 0.1 * g(1)})`, opacity: g(1), boxShadow: `0 30px 70px ${rgba('#000', 0.4)}` })}
          {kutu(W * 0.6, H * 0.52, W * 0.35, H * 0.42, md(m3 || m2 || m, 'ken-burns-disa'), { borderRadius: 10, transform: `rotate(-1deg) scale(${0.9 + 0.1 * g(2)})`, opacity: g(2), boxShadow: `0 30px 70px ${rgba('#000', 0.4)}` })}
        </AbsoluteFill>
      );
    }
    case 'yuvarlak-yan':
      return <AbsoluteFill>{ap}{kutu(W * 0.5, H * 0.12, H * 0.76, H * 0.76, md(m), { borderRadius: '50%', border: `10px solid ${palet.vurgu}`, transform: `scale(${0.8 + 0.2 * giris})` })}</AbsoluteFill>;
    case 'altin-cerceve': {
      // arsiv fotografi neredeyse siyah zeminde, egimli (bevel) altin cercevede; cerceve uzerinden yavas isik gecer
      const altin = ['#6e5122', '#d9b46a', '#f6e2a8', '#b48a3e', '#6e5122'];
      const isik = ((t * 0.18) % 1.6) - 0.3;
      const bw = W * 0.6, bh = H * 0.74, x0 = (W - bw) / 2, y0 = (H - bh) / 2;
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${rgba(palet.zemin2, 0.55)} 0%, #050505 75%)` }}>
          <div style={{ position: 'absolute', left: x0 - 18, top: y0 - 18, width: bw + 36, height: bh + 36, padding: 18, boxSizing: 'border-box', opacity: giris, transform: `scale(${0.97 + 0.03 * giris})`,
            background: `linear-gradient(135deg, ${altin.join(', ')})`, boxShadow: `0 40px 110px ${rgba('#000', 0.75)}, inset 0 0 0 2px ${rgba('#fff3c4', 0.35)}` }}>
            {/* cerceve uzerinden gecen isik: fotografin ALTINDA (yalniz altin kenarda gorunur) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `linear-gradient(115deg, transparent ${isik * 100 - 8}%, ${rgba('#fff6d8', 0.6)} ${isik * 100}%, transparent ${isik * 100 + 8}%)` }} />
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', boxShadow: `inset 0 0 0 3px ${rgba('#000', 0.6)}` }}>
              {md(m)}
              <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 60px ${rgba('#000', 0.55)}` }} />
            </div>
          </div>
          {etiket ? <div style={{ position: 'absolute', left: x0, top: y0 + bh + 40, fontFamily: font.govde, fontStyle: 'italic', fontSize: 26, color: '#d9b46a', opacity: giris }}>{etiket}</div> : null}
        </AbsoluteFill>
      );
    }
    default: return md(m);
  }
};

// ---------------- DOKU / UST KATMAN ----------------
// klasik Claude = her sahnede gren 0.045 + vinyet 0.5. Repertuar 0-2 doku secer ve sahne tipine gore acar/kapatir.
export const DOKU_TIPLERI = ['gren', 'vinyet', 'tarama', 'film-cizik', 'kromatik', 'titreme', 'isik-sizintisi', 'kagit-ust', 'toz'] as const;
export type DokuTip = typeof DOKU_TIPLERI[number];

export const Doku: React.FC<{ tip: DokuTip; stil: Stil; guc?: number }> = ({ tip, stil, guc = 1 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const r = rastgele(Math.floor(f / 2) + 91);
  switch (tip) {
    case 'gren':
      return (
        <AbsoluteFill style={{ opacity: 0.08 * guc, mixBlendMode: 'overlay' }}>
          <svg width={W} height={H}><filter id="grn"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 30} /></filter><rect width={W} height={H} filter="url(#grn)" /></svg>
        </AbsoluteFill>
      );
    case 'vinyet': return <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 50%, ${rgba('#000', 0.55 * guc)} 100%)` }} />;
    case 'tarama': return <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, ${rgba('#000', 0.18 * guc)} 0 2px, transparent 2px 4px)` }} />;
    case 'film-cizik':
      return (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: guc }}>
          {Array.from({ length: 3 }, (_, i) => r() > 0.55 ? <div key={i} style={{ position: 'absolute', left: r() * W, top: 0, width: 1 + r() * 2, height: H, background: rgba('#fff', 0.25 + r() * 0.3) }} /> : null)}
          {Array.from({ length: 10 }, (_, i) => <div key={'t' + i} style={{ position: 'absolute', left: r() * W, top: r() * H, width: 2 + r() * 6, height: 2 + r() * 6, borderRadius: '50%', background: rgba('#fff', 0.5 * r()) }} />)}
        </AbsoluteFill>
      );
    case 'kromatik': return <AbsoluteFill style={{ boxShadow: `inset 6px 0 30px ${rgba('#ff0050', 0.25 * guc)}, inset -6px 0 30px ${rgba('#00e5ff', 0.25 * guc)}` }} />;
    case 'titreme': return <AbsoluteFill style={{ background: rgba('#000', (0.03 + 0.05 * r()) * guc) }} />;
    case 'isik-sizintisi': {
      const t = f / 30;
      return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: guc }}><div style={{ position: 'absolute', right: -300 + Math.sin(t * 0.3) * 120, top: -200, width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(stil.palet.vurgu, 0.35)} 0%, ${rgba('#ffb36b', 0.18)} 40%, transparent 70%)`, filter: 'blur(40px)' }} /></AbsoluteFill>;
    }
    case 'kagit-ust':
      return (
        <AbsoluteFill style={{ opacity: 0.35 * guc, mixBlendMode: 'multiply' }}>
          <svg width={W} height={H}><filter id="kgu"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves={4} seed={7} /><feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.52  0 0 0 0 0.4  0 0 0 0.7 0" /></filter><rect width={W} height={H} filter="url(#kgu)" /></svg>
        </AbsoluteFill>
      );
    case 'toz': {
      const rr = rastgele(5);
      const t = f / 30;
      return <AbsoluteFill style={{ opacity: guc }}><svg width={W} height={H}>{Array.from({ length: 60 }, (_, i) => { const x = rr(), y = rr(), s = 1 + rr() * 2.5; return <circle key={i} cx={((x + t * 0.01 * (1 + s)) % 1) * W} cy={((y + fbm(i, t * 0.1, 1) * 0.05) % 1 + 1) % 1 * H} r={s} fill={rgba('#fff', 0.35)} />; })}</svg></AbsoluteFill>;
    }
    default: return null;
  }
};
