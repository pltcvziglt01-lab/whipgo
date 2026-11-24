import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, fbm, gurultu3, rastgele, rgba } from './temel';

// "EDIT PAKETI" ARKA PLANLARI — YouTube editorlerinin kart/yazi/kesik gorsel arkasina koydugu hareketli zeminler
// (wavy grid, moving grid, checker, radar, grainy gradient...). Varsayilan tek renk (koyu zemin + ince acik cizgi);
// palet acik ise kendiliginden tersine doner. Ayarlar: aralik (px), genlik, hiz, cizgi rengi (murekkep|vurgu).
type P = { stil: Stil; hiz: number; yogunluk: number; tohum: string; aralik?: number; genlik?: number; renk?: 'murekkep' | 'vurgu' };

const useZ = (hiz: number) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return { t: (f / fps) * hiz, f, W: width, H: height };
};
const merkezIsik = (s: Stil, guc = 1) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 65% at 50% 48%, ${rgba(s.palet.acik ? '#ffffff' : s.palet.murekkep, (s.palet.acik ? 0.5 : 0.07) * guc)} 0%, transparent 70%)` }} />
);
const kenarKarart = (s: Stil, guc = 1) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, ${rgba(s.palet.acik ? s.palet.zemin2 : '#000000', 0.85 * guc)} 100%)` }} />
);
const cizgiRenk = (s: Stil, renk: P['renk'], a: number) => rgba(renk === 'vurgu' ? s.palet.vurgu : s.palet.murekkep, a);

// 1 — DALGALI IZGARA (su yuzeyi gibi kipirdayan ince izgara)
export const DalgaliIzgara: React.FC<P> = ({ stil, hiz, aralik = 120, genlik = 9, renk }) => {
  const { t, W, H } = useZ(hiz);
  const yollar: React.ReactNode[] = [];
  const dx = (x: number, y: number) => Math.sin(y * 0.011 + t * 1.3 + x * 0.004) * genlik + fbm(x * 0.004, y * 0.004, t * 0.35) * genlik * 1.2;
  const dy = (x: number, y: number) => Math.sin(x * 0.012 + t * 1.1 + y * 0.003) * genlik + fbm(y * 0.004 + 9, x * 0.004, t * 0.35) * genlik * 1.2;
  const ox = (W % aralik) / 2, oy = (H % aralik) / 2;
  for (let x = ox; x <= W + 1; x += aralik) {
    const n: string[] = [];
    for (let y = -20; y <= H + 20; y += 24) n.push(`${(x + dx(x, y)).toFixed(1)},${y}`);
    yollar.push(<polyline key={'v' + x} points={n.join(' ')} />);
  }
  for (let y = oy; y <= H + 1; y += aralik) {
    const n: string[] = [];
    for (let x = -20; x <= W + 20; x += 24) n.push(`${x},${(y + dy(x, y)).toFixed(1)}`);
    yollar.push(<polyline key={'h' + y} points={n.join(' ')} />);
  }
  return (
    <AbsoluteFill style={{ background: stil.palet.acik ? stil.palet.zemin : '#050505' }}>
      {merkezIsik(stil)}
      <svg width={W} height={H} style={{ position: 'absolute', filter: `drop-shadow(0 0 3px ${cizgiRenk(stil, renk, 0.5)})` }}>
        <g fill="none" stroke={cizgiRenk(stil, renk, 0.55)} strokeWidth={2}>{yollar}</g>
      </svg>
      {kenarKarart(stil)}
    </AbsoluteFill>
  );
};

// 2 — BALON IZGARA (merkezden sisip inen mercek bozulmasi)
export const BalonIzgara: React.FC<P> = ({ stil, hiz, aralik = 90, renk }) => {
  const { t, W, H } = useZ(hiz);
  const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
  const k = 0.28 + 0.12 * Math.sin(t * 1.2);
  const bozu = (x: number, y: number) => {
    const ux = (x - cx) / R, uy = (y - cy) / R, r = Math.hypot(ux, uy);
    const s = 1 + k * (1 - r * r);
    return [cx + ux * s * R, cy + uy * s * R];
  };
  const yollar: React.ReactNode[] = [];
  for (let x = -aralik * 2; x <= W + aralik * 2; x += aralik) {
    const n: string[] = [];
    for (let y = -100; y <= H + 100; y += 30) { const [a, b] = bozu(x, y); n.push(`${a.toFixed(1)},${b.toFixed(1)}`); }
    yollar.push(<polyline key={'v' + x} points={n.join(' ')} />);
  }
  for (let y = -aralik * 2; y <= H + aralik * 2; y += aralik) {
    const n: string[] = [];
    for (let x = -100; x <= W + 100; x += 30) { const [a, b] = bozu(x, y); n.push(`${a.toFixed(1)},${b.toFixed(1)}`); }
    yollar.push(<polyline key={'h' + y} points={n.join(' ')} />);
  }
  return (
    <AbsoluteFill style={{ background: stil.palet.acik ? stil.palet.zemin : '#060606' }}>
      {merkezIsik(stil, 1.3)}
      <svg width={W} height={H} style={{ position: 'absolute' }}><g fill="none" stroke={cizgiRenk(stil, renk, 0.45)} strokeWidth={1.8}>{yollar}</g></svg>
      {kenarKarart(stil)}
    </AbsoluteFill>
  );
};

// 3 — KAYAN IZGARA (duz izgara capraz kayar, kesisimlerde parlama)
export const KayanIzgara: React.FC<P> = ({ stil, hiz, aralik = 80, renk }) => {
  const { t } = useZ(hiz);
  const k = (t * 40) % aralik;
  const c = cizgiRenk(stil, renk, 0.22), c2 = cizgiRenk(stil, renk, 0.5);
  return (
    <AbsoluteFill style={{ background: stil.palet.acik ? stil.palet.zemin : stil.palet.zemin }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${c} 1.5px, transparent 1.5px), linear-gradient(90deg, ${c} 1.5px, transparent 1.5px)`, backgroundSize: `${aralik}px ${aralik}px`, backgroundPosition: `${k}px ${k}px` }} />
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(circle, ${c2} 2.5px, transparent 3.5px)`, backgroundSize: `${aralik}px ${aralik}px`, backgroundPosition: `${k - aralik / 2}px ${k - aralik / 2}px` }} />
      {merkezIsik(stil)}
      {kenarKarart(stil, 0.9)}
    </AbsoluteFill>
  );
};

// 4 — DAMA (dusuk kontrastli kayan satranc tahtasi)
export const DamaKayan: React.FC<P> = ({ stil, hiz, aralik = 110 }) => {
  const { t } = useZ(hiz);
  const k = (t * 30) % (aralik * 2);
  const { palet } = stil;
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      <AbsoluteFill style={{ backgroundImage: `conic-gradient(${palet.zemin2} 25%, ${palet.zemin} 0 50%, ${palet.zemin2} 0 75%, ${palet.zemin} 0)`, backgroundSize: `${aralik * 2}px ${aralik * 2}px`, backgroundPosition: `${k}px ${-k * 0.5}px`, transform: 'rotate(-8deg) scale(1.3)' }} />
      {kenarKarart(stil, 0.7)}
    </AbsoluteFill>
  );
};

// 5 — RADAR HALKALARI (merkezden yayilan halkalar + donen tarama)
export const RadarHalka: React.FC<P> = ({ stil, hiz, renk }) => {
  const { t, W, H } = useZ(hiz);
  const cx = W / 2, cy = H / 2;
  const halka = Array.from({ length: 12 }, (_, i) => ((i + (t * 0.6) % 1) * 110));
  return (
    <AbsoluteFill style={{ background: stil.palet.acik ? stil.palet.zemin : '#05080a' }}>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {halka.map((r, i) => <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={cizgiRenk(stil, renk, 0.4 * (1 - r / 1320))} strokeWidth={1.8} />)}
        <line x1={0} y1={cy} x2={W} y2={cy} stroke={cizgiRenk(stil, renk, 0.12)} /><line x1={cx} y1={0} x2={cx} y2={H} stroke={cizgiRenk(stil, renk, 0.12)} />
      </svg>
      <AbsoluteFill style={{ background: `conic-gradient(from ${t * 60}deg at 50% 50%, ${rgba(stil.palet.vurgu, 0.28)} 0deg, transparent 50deg)` }} />
      {kenarKarart(stil)}
    </AbsoluteFill>
  );
};

// 6 — ALTIGEN PETEK (bazi hucreler nabiz gibi yanar)
export const Altigen: React.FC<P> = ({ stil, hiz, aralik = 70, renk }) => {
  const { t, W, H } = useZ(hiz);
  const r = aralik / 2, w = Math.sqrt(3) * r, hucre: React.ReactNode[] = [];
  for (let row = -1; row * r * 1.5 < H + r * 2; row++) for (let col = -1; col * w < W + w; col++) {
    const x = col * w + (row % 2 ? w / 2 : 0), y = row * r * 1.5;
    const v = gurultu3(col * 0.3, row * 0.3, t * 0.5);
    const pts = Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i + Math.PI / 6; return `${(x + Math.cos(a) * (r - 3)).toFixed(1)},${(y + Math.sin(a) * (r - 3)).toFixed(1)}`; }).join(' ');
    hucre.push(<polygon key={row + '-' + col} points={pts} fill={v > 0.72 ? rgba(stil.palet.vurgu, (v - 0.72) * 2.2) : 'none'} stroke={cizgiRenk(stil, renk, 0.18)} strokeWidth={1.5} />);
  }
  return <AbsoluteFill style={{ background: stil.palet.zemin }}><svg width={W} height={H}>{hucre}</svg>{kenarKarart(stil, 0.8)}</AbsoluteFill>;
};

// 7 — SPOT ISIK (karanlik sahne, gezinen spot + havada toz)
export const SpotIsik: React.FC<P> = ({ stil, hiz, tohum }) => {
  const { t, W, H } = useZ(hiz);
  const x = 30 + 40 * gurultu3(1, 2, t * 0.12), y = 30 + 35 * gurultu3(5, 6, t * 0.12);
  const r = useMemo(() => rastgele(tohum + 'sp'), [tohum]);
  const toz = useMemo(() => Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 1 + r() * 2 })), [tohum]);
  return (
    // acik palette yazi koyu oldugu icin zemin de acik kalmali: koyu kenar yerine zemin2, spot beyaz
    <AbsoluteFill style={{ background: stil.palet.acik ? stil.palet.zemin2 : '#030303' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}% ${y}%, ${rgba(stil.palet.acik ? '#ffffff' : stil.palet.murekkep, stil.palet.acik ? 0.75 : 0.22)} 0%, ${rgba(stil.palet.acik ? stil.palet.zemin : stil.palet.vurgu, stil.palet.acik ? 0.5 : 0.06)} 30%, transparent 60%)` }} />
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {toz.map((d, i) => { const px = ((d.x + t * 0.008 * d.s) % 1) * W, py = ((d.y + fbm(i, t * 0.1, 0) * 0.04) % 1 + 1) % 1 * H; const yak = Math.max(0, 1 - Math.hypot(px / W * 100 - x, py / H * 100 - y) / 30); return <circle key={i} cx={px} cy={py} r={d.s} fill={rgba(stil.palet.acik ? stil.palet.soluk : '#ffffff', 0.6 * yak)} />; })}
      </svg>
    </AbsoluteFill>
  );
};

// 8 — GRENLI GRADYAN (trend: tanecikli, yavas akan iki-uc renk)
export const GrenliGradyan: React.FC<P> = ({ stil, hiz, f0 }: any) => {
  const { t, f, W, H } = useZ(hiz);
  const { palet } = stil;
  const a = 20 + 60 * gurultu3(1, 1, t * 0.1), b = 30 + 50 * gurultu3(4, 2, t * 0.1);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${a}% ${b}%, ${rgba(palet.vurgu, 0.55)} 0%, transparent 55%), radial-gradient(circle at ${100 - a}% ${100 - b}%, ${rgba(palet.vurgu2, 0.45)} 0%, transparent 60%), ${palet.zemin}` }}>
      <svg width={W} height={H} style={{ position: 'absolute', opacity: 0.32, mixBlendMode: 'overlay' }}>
        <filter id="ggr"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={3} seed={Math.floor(f / 3)} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width={W} height={H} filter="url(#ggr)" />
      </svg>
    </AbsoluteFill>
  );
};

// 9 — KARELI DEFTER (kagit kareli defter, kenar cizgisi, hafif suzulme)
export const KareliDefter: React.FC<P> = ({ stil, hiz, aralik = 46 }) => {
  const { t } = useZ(hiz);
  const k = (t * 8) % aralik;
  const { palet } = stil;
  // acik palet: beyaz defter + mavi kare; koyu palet: kara tahta/gece defteri + acik kare
  const c = palet.acik ? 'rgba(70,120,190,.25)' : rgba(palet.murekkep, 0.14);
  return (
    <AbsoluteFill style={{ background: palet.acik ? palet.zemin : palet.zemin }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${c} 2px, transparent 2px), linear-gradient(90deg, ${c} 2px, transparent 2px)`, backgroundSize: `${aralik}px ${aralik}px`, backgroundPosition: `0 ${k}px` }} />
      <div style={{ position: 'absolute', left: 170, top: 0, bottom: 0, width: 3, background: rgba(palet.vurgu, 0.6) }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, ${rgba(palet.acik ? '#503c1e' : '#000000', palet.acik ? 0.18 : 0.5)} 100%)` }} />
    </AbsoluteFill>
  );
};

// 10 — HIZ CIZGILERI (capraz akan ince isik cizgileri)
export const HizCizgileri: React.FC<P> = ({ stil, hiz, tohum, renk }) => {
  const { t, W, H } = useZ(hiz);
  const r = useMemo(() => rastgele(tohum + 'hz'), [tohum]);
  const c = useMemo(() => Array.from({ length: 46 }, () => ({ y: r(), l: 120 + r() * 520, v: 0.25 + r() * 0.9, o: r(), w: 1 + r() * 2.5 })), [tohum]);
  return (
    <AbsoluteFill style={{ background: stil.palet.zemin, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: -300, transform: 'rotate(-18deg)' }}>
        {c.map((d, i) => { const x = (((d.o + t * d.v * 0.5) % 1.4) - 0.2) * (W + 600); return <div key={i} style={{ position: 'absolute', left: x, top: d.y * (H + 600), width: d.l, height: d.w, background: `linear-gradient(90deg, transparent, ${cizgiRenk(stil, i % 5 === 0 ? 'vurgu' : renk, 0.7)})` }} />; })}
      </div>
      {kenarKarart(stil, 0.6)}
    </AbsoluteFill>
  );
};
