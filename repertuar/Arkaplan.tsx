import React, { useMemo } from 'react';
import { AbsoluteFill, Loop, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, fbm, gurultu3, rastgele, rgba } from './temel';
import { Altigen, BalonIzgara, DalgaliIzgara, DamaKayan, GrenliGradyan, HizCizgileri, KareliDefter, KayanIzgara, RadarHalka, SpotIsik } from './ArkaplanEdit';

// ANIMASYONLU ARKA PLANLAR — kart, baslik, cerceveli medya ve gecis aralarinda duz renk yerine kullanilir.
// Hepsi palete baglidir; ayni tip iki kanalda farkli renk/hiz/tohumla bambaska gorunur.
export const ARKAPLAN_TIPLERI = [
  'gradyan-akis', 'aurora', 'bokeh', 'toz-zerre', 'izgara-perspektif', 'blueprint', 'topografik', 'nokta-matris',
  'isik-huzmesi', 'dalga-cizgi', 'kagit', 'crt-tarama', 'sekil-yuzen', 'isik-kacagi', 'kure-izgara', 'seritler',
  // edit paketi ailesi (ArkaplanEdit.tsx)
  'dalgali-izgara', 'balon-izgara', 'kayan-izgara', 'dama-kayan', 'radar-halka', 'altigen', 'spot-isik', 'grenli-gradyan', 'kareli-defter', 'hiz-cizgileri',
] as const;
/** 'video:ab-07:6.95' = varlik/arkaplan/ab-07.mp4 (sure sn) — lisansli paket videosu (varlik_kur.py katalog) */
export type ArkaplanTip = typeof ARKAPLAN_TIPLERI[number] | `video:${string}`;

type P = { tip: ArkaplanTip; stil: Stil; hiz?: number; yogunluk?: number; tohum?: string; aralik?: number; genlik?: number; renk?: 'murekkep' | 'vurgu' };

export const Arkaplan: React.FC<P> = (p) => {
  if (typeof p.tip === 'string' && p.tip.startsWith('video:')) return <VideoArkaplan kod={p.tip} stil={p.stil} />;
  const C = HARITA[p.tip] || GradyanAkis;
  return <C {...p} hiz={p.hiz ?? 1} yogunluk={p.yogunluk ?? 1} tohum={p.tohum ?? p.stil.tohum} />;
};

// paket videosu: dongulu oynar, palet zeminiyle hafifce renklendirilir (yazi okunurlugu + kanal rengi)
const VideoArkaplan: React.FC<{ kod: string; stil: Stil }> = ({ kod, stil }) => {
  const { fps } = useVideoConfig();
  const [, id, s] = kod.split(':');
  const sureK = Math.max(1, Math.round(parseFloat(s || '7') * fps) - 1);
  return (
    <AbsoluteFill style={{ background: stil.palet.zemin }}>
      <Loop durationInFrames={sureK}>
        <OffthreadVideo muted src={staticFile(`varlik/arkaplan/${id}.mp4`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Loop>
      {/* paket videosu palete boyanir (kendi renkleriyle gelmez): renk tonu zeminden, parlaklik videodan */}
      <AbsoluteFill style={{ background: stil.palet.zemin, mixBlendMode: 'color', opacity: 0.6 }} />
      <AbsoluteFill style={{ background: rgba(stil.palet.zemin, 0.3), mixBlendMode: stil.palet.acik ? 'screen' : 'multiply' }} />
    </AbsoluteFill>
  );
};

const useZaman = (hiz: number) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return { t: (f / fps) * hiz, f, fps, W: width, H: height };
};

// 1 — yumusak renk lekeleri suruklenir (mesh gradient hissi)
const GradyanAkis: React.FC<P> = ({ stil, hiz, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const r = useMemo(() => rastgele(tohum + 'ga'), [tohum]);
  const lek = useMemo(() => [palet.vurgu, palet.vurgu2, palet.zemin2, palet.vurgu].map((c, i) => ({ c, s: 0.45 + r() * 0.35, o: r() * 100 + i * 17 })), [palet, tohum]);
  return (
    <AbsoluteFill style={{ background: palet.zemin, overflow: 'hidden' }}>
      {lek.map((l, i) => {
        const x = gurultu3(l.o, 0, t * 0.07) * 1.3 - 0.15, y = gurultu3(0, l.o, t * 0.07 + 5) * 1.3 - 0.15;
        const d = Math.max(W, H) * l.s;
        return <div key={i} style={{ position: 'absolute', left: x * W - d / 2, top: y * H - d / 2, width: d, height: d, borderRadius: '50%', background: rgba(l.c, palet.acik ? 0.42 : 0.5), filter: 'blur(110px)' }} />;
      })}
    </AbsoluteFill>
  );
};

// 2 — dalgalanan isik seritleri
const Aurora: React.FC<P> = ({ stil, hiz }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const serit = (k: number, renk: string) => {
    const nokta: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * W;
      const y = H * (0.35 + k * 0.12) + fbm(i * 0.09, k * 3, t * 0.12) * H * 0.22 + Math.sin(i * 0.25 + t * 0.6 + k) * 30;
      nokta.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const alt = nokta.slice().reverse().map((n) => { const [x, y] = n.split(','); return `${x},${(+y + 180 + k * 40).toFixed(1)}`; });
    return <polygon key={k} points={[...nokta, ...alt].join(' ')} fill={rgba(renk, 0.55)} />;
  };
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${palet.zemin} 0%, ${palet.zemin2} 100%)` }}>
      <svg width={W} height={H} style={{ position: 'absolute', filter: 'blur(38px)', mixBlendMode: palet.acik ? 'multiply' : 'screen' }}>
        {serit(0, palet.vurgu)}{serit(1, palet.vurgu2)}{serit(2, palet.vurgu)}
      </svg>
    </AbsoluteFill>
  );
};

// 3 — bulanik isik daireleri yukari suzulur
const Bokeh: React.FC<P> = ({ stil, hiz, yogunluk, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const r = useMemo(() => rastgele(tohum + 'bk'), [tohum]);
  const d = useMemo(() => Array.from({ length: Math.round(34 * yogunluk!) }, () => ({ x: r(), y: r(), s: 30 + r() * 150, v: 0.01 + r() * 0.03, c: r() > 0.5 ? palet.vurgu : palet.vurgu2, b: 4 + r() * 22, p: r() * 6 })), [tohum, palet]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 60%, ${palet.zemin2} 0%, ${palet.zemin} 75%)`, overflow: 'hidden' }}>
      {d.map((k, i) => {
        const y = ((k.y - t * k.v) % 1 + 1) % 1;
        const a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.8 + k.p));
        return <div key={i} style={{ position: 'absolute', left: k.x * W + Math.sin(t * 0.3 + k.p) * 40, top: y * (H + 200) - 100, width: k.s, height: k.s, borderRadius: '50%', background: rgba(k.c, a), filter: `blur(${k.b}px)` }} />;
      })}
    </AbsoluteFill>
  );
};

// 4 — havada asili toz / kivilcim zerreleri
const TozZerre: React.FC<P> = ({ stil, hiz, yogunluk, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const r = useMemo(() => rastgele(tohum + 'tz'), [tohum]);
  const d = useMemo(() => Array.from({ length: Math.round(170 * yogunluk!) }, () => ({ x: r(), y: r(), s: 1 + r() * 3.2, z: r() })), [tohum]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${palet.zemin2} 0%, ${palet.zemin} 70%)` }}>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {d.map((k, i) => {
          const x = (k.x + fbm(k.x * 4, k.y * 4, t * 0.05) * 0.08 + t * 0.004 * (0.5 + k.z)) % 1;
          const y = (k.y + fbm(k.y * 4, k.x * 4, t * 0.05 + 9) * 0.08) % 1;
          const a = 0.25 + 0.75 * gurultu3(i, 0, t * 1.5);
          return <circle key={i} cx={x * W} cy={y * H} r={k.s * (0.6 + k.z)} fill={rgba(k.z > 0.8 ? palet.vurgu : palet.murekkep, a * 0.7)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// 5 — retro sonsuz zemin izgarasi
const IzgaraPerspektif: React.FC<P> = ({ stil, hiz }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const ufuk = H * 0.52, cx = W / 2;
  const yatay: number[] = [];
  const kay = (t * 0.6) % 1;
  for (let i = 0; i < 22; i++) { const z = i + 1 - kay; const y = ufuk + (H * 0.9) / z; if (y < H + 20 && y > ufuk) yatay.push(y); }
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${palet.zemin} 0%, ${palet.zemin2} 52%, ${palet.zemin} 52.1%, ${palet.zemin} 100%)` }}>
      <div style={{ position: 'absolute', left: cx - 260, top: ufuk - 420, width: 520, height: 520, borderRadius: '50%', background: `linear-gradient(180deg, ${palet.vurgu2}, ${palet.vurgu})`, opacity: 0.85, WebkitMaskImage: 'repeating-linear-gradient(180deg, #000 0 26px, transparent 26px 34px)' }} />
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {Array.from({ length: 31 }, (_, i) => { const x = (i - 15) * 160; return <line key={i} x1={cx + x * 0.02} y1={ufuk} x2={cx + x * 3} y2={H} stroke={rgba(palet.vurgu, 0.7)} strokeWidth={2} />; })}
        {yatay.map((y, i) => <line key={'h' + i} x1={0} y1={y} x2={W} y2={y} stroke={rgba(palet.vurgu, 0.25 + 0.6 * ((y - ufuk) / (H - ufuk)))} strokeWidth={2} />)}
      </svg>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent 50%, ${rgba(palet.zemin, 0.9)} 53%, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

// 6 — teknik cizim kagidi, cizgiler kendini cizer
const Blueprint: React.FC<P> = ({ stil, hiz, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const r = useMemo(() => rastgele(tohum + 'bp'), [tohum]);
  const sekil = useMemo(() => Array.from({ length: 9 }, () => ({ x: r() * W, y: r() * H, w: 120 + r() * 380, h: 80 + r() * 260, c: r() > 0.6, gec: r() * 8 })), [tohum, W, H]);
  const kay = (t * 12) % 60;
  return (
    <AbsoluteFill style={{ background: palet.zemin, backgroundImage: `linear-gradient(${rgba(palet.murekkep, 0.22)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${rgba(palet.murekkep, 0.22)} 1.5px, transparent 1.5px), linear-gradient(${rgba(palet.murekkep, 0.09)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(palet.murekkep, 0.09)} 1px, transparent 1px)`, backgroundSize: '240px 240px, 240px 240px, 60px 60px, 60px 60px', backgroundPosition: `${kay}px ${kay * 0.5}px` }}>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {sekil.map((s, i) => {
          const u = s.c ? Math.PI * s.w : 2 * (s.w + s.h);
          const p = Math.min(1, Math.max(0, ((t - s.gec * 0.4) % 9) / 3));
          return s.c
            ? <circle key={i} cx={s.x} cy={s.y} r={s.w / 2} fill="none" stroke={rgba(palet.vurgu, 0.85)} strokeWidth={3} strokeDasharray={u} strokeDashoffset={u * (1 - p)} />
            : <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke={rgba(palet.murekkep, 0.5)} strokeWidth={2} strokeDasharray={u} strokeDashoffset={u * (1 - p)} />;
        })}
        {sekil.slice(0, 4).map((s, i) => (
          <g key={'a' + i} stroke={rgba(palet.vurgu, 0.7)} strokeWidth={1.5}>
            <line x1={s.x - 18} y1={s.y} x2={s.x + 18} y2={s.y} /><line x1={s.x} y1={s.y - 18} x2={s.x} y2={s.y + 18} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// 7 — es yukselti egrileri (harita / arazi hissi)
const Topografik: React.FC<P> = ({ stil, hiz, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const r = useMemo(() => rastgele(tohum + 'tp'), [tohum]);
  const merk = useMemo(() => [{ x: r() * W, y: r() * H }, { x: r() * W, y: r() * H }], [tohum, W, H]);
  const yollar: React.ReactNode[] = [];
  merk.forEach((m, mi) => {
    for (let k = 1; k <= 16; k++) {
      const n: string[] = [];
      for (let a = 0; a <= 72; a++) {
        const ang = (a / 72) * Math.PI * 2;
        const rr = k * 58 + fbm(Math.cos(ang) * 1.2 + mi * 7, Math.sin(ang) * 1.2, k * 0.08 + t * 0.06) * 70;
        n.push(`${(m.x + Math.cos(ang) * rr).toFixed(1)},${(m.y + Math.sin(ang) * rr).toFixed(1)}`);
      }
      yollar.push(<polygon key={mi + '-' + k} points={n.join(' ')} fill="none" stroke={rgba(k % 4 === 0 ? palet.vurgu : palet.soluk, k % 4 === 0 ? 0.55 : 0.28)} strokeWidth={k % 4 === 0 ? 2 : 1.2} />);
    }
  });
  return <AbsoluteFill style={{ background: palet.zemin }}><svg width={W} height={H}>{yollar}</svg></AbsoluteFill>;
};

// 8 — yarim ton nokta matrisi, dalga gibi nefes alir
const NoktaMatris: React.FC<P> = ({ stil, hiz }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const ara = 34, nokta: React.ReactNode[] = [];
  for (let y = ara / 2; y < H; y += ara) for (let x = ara / 2; x < W; x += ara) {
    const v = 0.5 + 0.5 * fbm(x * 0.0022, y * 0.0022, t * 0.15, 2) * 1.6;
    const rr = Math.max(0.6, v * ara * 0.42);
    nokta.push(<circle key={x + '-' + y} cx={x} cy={y} r={rr} fill={v > 0.72 ? rgba(palet.vurgu, 0.8) : rgba(palet.murekkep, 0.13)} />);
  }
  return <AbsoluteFill style={{ background: palet.zemin }}><svg width={W} height={H}>{nokta}</svg></AbsoluteFill>;
};

// 9 — donen isik huzmeleri
const IsikHuzmesi: React.FC<P> = ({ stil, hiz }) => {
  const { t } = useZaman(hiz!);
  const { palet } = stil;
  const a = t * 6;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 18% 0%, ${palet.zemin2} 0%, ${palet.zemin} 70%)`, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${a}deg at 18% -10%, ${rgba(palet.vurgu, 0.16)} 0deg 4deg, transparent 4deg 11deg)`, WebkitMaskImage: 'radial-gradient(circle at 18% 0%, #000 0%, transparent 85%)', filter: 'blur(6px)' }} />
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${-a * 0.6}deg at 18% -10%, ${rgba(palet.vurgu2, 0.08)} 0deg 2deg, transparent 2deg 17deg)`, WebkitMaskImage: 'radial-gradient(circle at 18% 0%, #000 0%, transparent 70%)', filter: 'blur(3px)' }} />
    </AbsoluteFill>
  );
};

// 10 — ust uste dalga cizgileri (sinyal / ses dalgasi)
const DalgaCizgi: React.FC<P> = ({ stil, hiz }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const satir = 30, cizgi: React.ReactNode[] = [];
  for (let k = 0; k < satir; k++) {
    const y0 = H * 0.12 + (k / satir) * H * 0.82;
    const n: string[] = [];
    for (let i = 0; i <= 90; i++) {
      const x = (i / 90) * W;
      const merkez = Math.exp(-Math.pow((i / 90 - 0.5) / 0.22, 2));
      const y = y0 - Math.abs(fbm(i * 0.08, k * 0.35, t * 0.25)) * 160 * merkez;
      n.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    cizgi.push(<polyline key={k} points={n.join(' ')} fill={palet.zemin} stroke={rgba(k % 7 === 3 ? palet.vurgu : palet.murekkep, k % 7 === 3 ? 0.9 : 0.45)} strokeWidth={1.6} />);
  }
  return <AbsoluteFill style={{ background: palet.zemin }}><svg width={W} height={H}>{cizgi}</svg></AbsoluteFill>;
};

// 11 — dokulu kagit, uzerinde gezinen yumusak isik
const Kagit: React.FC<P> = ({ stil, hiz, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const sid = (useMemo(() => rastgele(tohum + 'kg')(), [tohum]) * 999) | 0;
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      <svg width={W} height={H} style={{ position: 'absolute', opacity: palet.acik ? 0.55 : 0.6, mixBlendMode: palet.acik ? 'multiply' : 'screen' }}>
        <filter id={'kg' + sid}><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={sid} /><feColorMatrix values={palet.acik ? '0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.6 0' : '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.35 0'} /></filter>
        <rect width={W} height={H} filter={`url(#kg${sid})`} />
      </svg>
      <svg width={W} height={H} style={{ position: 'absolute', opacity: 0.35 }}>
        <filter id={'kl' + sid}><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={sid + 3} /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.25 0" /></filter>
        <rect width={W} height={H} filter={`url(#kl${sid})`} />
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${30 + 40 * gurultu3(1, 2, t * 0.05)}% ${30 + 40 * gurultu3(3, 4, t * 0.05)}%, ${rgba('#ffffff', palet.acik ? 0.35 : 0.08)} 0%, transparent 55%)` }} />
    </AbsoluteFill>
  );
};

// 12 — CRT ekran: tarama cizgisi + kayan parlak bant + titreme
const CrtTarama: React.FC<P> = ({ stil, hiz, f0 }: any) => {
  const { t, f, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const bant = ((t * 0.25) % 1.3) - 0.15;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${palet.zemin2} 0%, ${palet.zemin} 80%)` }}>
      <svg width={W} height={H} style={{ position: 'absolute', opacity: 0.12, mixBlendMode: 'screen' }}>
        <filter id="crtn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={Math.floor(f / 2)} /></filter>
        <rect width={W} height={H} filter="url(#crtn)" />
      </svg>
      <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, ${rgba('#000', 0.28)} 0 2px, transparent 2px 5px)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: bant * H, height: 140, background: `linear-gradient(180deg, transparent, ${rgba(palet.vurgu2, 0.12)}, transparent)` }} />
      <AbsoluteFill style={{ boxShadow: `inset 0 0 220px ${rgba('#000', 0.75)}`, opacity: 0.92 + 0.08 * Math.sin(f * 1.7) }} />
    </AbsoluteFill>
  );
};

// 13 — suzulen geometrik cizgi sekiller
const SekilYuzen: React.FC<P> = ({ stil, hiz, tohum }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const r = useMemo(() => rastgele(tohum + 'sy'), [tohum]);
  const s = useMemo(() => Array.from({ length: 16 }, () => ({ x: r(), y: r(), b: 30 + r() * 110, tip: Math.floor(r() * 4), d: (r() - 0.5) * 40, v: 0.005 + r() * 0.015, c: r() > 0.55 })), [tohum]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${palet.zemin} 0%, ${palet.zemin2} 100%)` }}>
      <svg width={W} height={H}>
        {s.map((k, i) => {
          const x = k.x * W + Math.sin(t * 0.3 + i) * 60, y = (((k.y - t * k.v) % 1) + 1) % 1 * (H + 300) - 150, rot = t * k.d;
          const renk = rgba(k.c ? palet.vurgu : palet.murekkep, k.c ? 0.7 : 0.22), b = k.b;
          const sek = k.tip === 0 ? <circle r={b / 2} /> : k.tip === 1 ? <polygon points={`0,${-b / 2} ${b / 2},${b / 2} ${-b / 2},${b / 2}`} /> : k.tip === 2 ? <rect x={-b / 2} y={-b / 2} width={b} height={b} /> : <path d={`M${-b / 2},0 H${b / 2} M0,${-b / 2} V${b / 2}`} />;
          return <g key={i} transform={`translate(${x},${y}) rotate(${rot})`} fill="none" stroke={renk} strokeWidth={k.tip === 3 ? 4 : 2.5}>{sek}</g>;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// 14 — film isik sizintisi (kenarlardan sicak renk akar)
const IsikKacagi: React.FC<P> = ({ stil, hiz }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const lek = [palet.vurgu, palet.vurgu2, '#ffcf7a'];
  return (
    <AbsoluteFill style={{ background: palet.zemin, overflow: 'hidden' }}>
      {lek.map((c, i) => {
        const x = (gurultu3(i * 11, 1, t * 0.09) > 0.5 ? 1.05 : -0.05) * W, y = gurultu3(i * 5, 7, t * 0.08) * H;
        const d = 700 + 500 * gurultu3(i, 9, t * 0.1);
        return <div key={i} style={{ position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: '50%', background: rgba(c, 0.5 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 2))), filter: 'blur(120px)', mixBlendMode: 'screen' }} />;
      })}
    </AbsoluteFill>
  );
};

// 15 — donen tel kafes dunya
const KureIzgara: React.FC<P> = ({ stil, hiz }) => {
  const { t, W, H } = useZaman(hiz!);
  const { palet } = stil;
  const R = H * 0.42, cx = W * 0.68, cy = H * 0.55, don = t * 0.18, egim = 0.35;
  const proj = (lat: number, lon: number) => {
    const x = Math.cos(lat) * Math.sin(lon + don), y0 = Math.sin(lat), z0 = Math.cos(lat) * Math.cos(lon + don);
    const y = y0 * Math.cos(egim) - z0 * Math.sin(egim), z = y0 * Math.sin(egim) + z0 * Math.cos(egim);
    return { x: cx + x * R, y: cy - y * R, z };
  };
  const yollar: React.ReactNode[] = [];
  const ciz = (pts: { x: number; y: number; z: number }[], k: string, vurgu = false) => {
    let seg: string[] = [];
    const out: React.ReactNode[] = [];
    pts.forEach((p, i) => {
      if (p.z > 0) seg.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      if ((p.z <= 0 || i === pts.length - 1) && seg.length > 1) { out.push(<polyline key={k + i} points={seg.join(' ')} fill="none" stroke={rgba(vurgu ? palet.vurgu : palet.murekkep, vurgu ? 0.8 : 0.3)} strokeWidth={vurgu ? 2.2 : 1.3} />); seg = []; }
      if (p.z <= 0) seg = [];
    });
    return out;
  };
  for (let lo = 0; lo < 24; lo++) { const lon = (lo / 24) * Math.PI * 2; yollar.push(...ciz(Array.from({ length: 49 }, (_, i) => proj(-Math.PI / 2 + (i / 48) * Math.PI, lon)), 'm' + lo)); }
  for (let la = -5; la <= 5; la++) { const lat = (la / 6) * (Math.PI / 2); yollar.push(...ciz(Array.from({ length: 73 }, (_, i) => proj(lat, (i / 72) * Math.PI * 2)), 'p' + la, la === 0)); }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 68% 55%, ${palet.zemin2} 0%, ${palet.zemin} 60%)` }}>
      <svg width={W} height={H}>{yollar}</svg>
    </AbsoluteFill>
  );
};

// 16 — kayan capraz seritler (retro / spor)
const Seritler: React.FC<P> = ({ stil, hiz }) => {
  const { t } = useZaman(hiz!);
  const { palet } = stil;
  const k = (t * 40) % 120;
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      <AbsoluteFill style={{ background: `repeating-linear-gradient(115deg, ${palet.zemin2} 0 40px, ${palet.zemin} 40px 120px)`, backgroundPosition: `${k}px 0`, backgroundSize: '200% 100%', opacity: 0.9 }} />
      <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent 58%, ${rgba(palet.vurgu, 0.9)} 58%, ${rgba(palet.vurgu, 0.9)} 64%, transparent 64%, transparent 67%, ${rgba(palet.vurgu2, 0.9)} 67%, ${rgba(palet.vurgu2, 0.9)} 69%, transparent 69%)`, transform: `translateX(${Math.sin(t * 0.5) * 30}px)` }} />
    </AbsoluteFill>
  );
};

const HARITA: Record<string, React.FC<P>> = {
  'gradyan-akis': GradyanAkis, 'aurora': Aurora, 'bokeh': Bokeh, 'toz-zerre': TozZerre, 'izgara-perspektif': IzgaraPerspektif,
  'blueprint': Blueprint, 'topografik': Topografik, 'nokta-matris': NoktaMatris, 'isik-huzmesi': IsikHuzmesi, 'dalga-cizgi': DalgaCizgi,
  'kagit': Kagit, 'crt-tarama': CrtTarama, 'sekil-yuzen': SekilYuzen, 'isik-kacagi': IsikKacagi, 'kure-izgara': KureIzgara, 'seritler': Seritler,
  'dalgali-izgara': DalgaliIzgara as any, 'balon-izgara': BalonIzgara as any, 'kayan-izgara': KayanIzgara as any, 'dama-kayan': DamaKayan as any,
  'radar-halka': RadarHalka as any, 'altigen': Altigen as any, 'spot-isik': SpotIsik as any, 'grenli-gradyan': GrenliGradyan as any,
  'kareli-defter': KareliDefter as any, 'hiz-cizgileri': HizCizgileri as any,
};
