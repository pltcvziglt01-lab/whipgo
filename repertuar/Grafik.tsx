import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, egri, ilerle, karistir, rgba, sinirla } from './temel';

// GRAFIK — veri animasyonlari. Ogrenildigi kanallar: @TheUnreturned-b2k (koyu panelde cizilen cizgi grafik),
// @ImmersivePast (eleme izgarasi: 1.171 -> 36 -> 2 kucuk siluet). Hepsi palete bagli; panel zemini paletin koyu tonundan.
export const GRAFIK_TIPLERI = ['cizgi-isik', 'alan-dolgu', 'basamak', 'eleme-izgara'] as const;
export type GrafikTip = typeof GRAFIK_TIPLERI[number];

const kisa = (v: number) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + 'K' : Math.round(v).toLocaleString('en-US'));

/** CIZGI GRAFIK: soldan saga cizilir, dugumler cizgi gectikce belirir, son deger buyuk etiket. veriler: y degerleri; etiketler: x ekseni */
export const CizgiGrafik: React.FC<{ tip: Exclude<GrafikTip, 'eleme-izgara'>; stil: Stil; veriler: number[]; etiketler?: string[]; baslik?: string; birim?: string; gec?: number; sure?: number }> = ({
  tip, stil, veriler, etiketler = [], baslik, birim = '', gec = 6, sure = 2.2,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const X0 = 220, X1 = W - 220, Y0 = H * 0.3, Y1 = H * 0.8;
  const mn = Math.min(0, ...veriler), mx = Math.max(...veriler) * 1.1 || 1;
  const n = veriler.length;
  const pt = (i: number, v: number) => ({ x: X0 + ((X1 - X0) * i) / Math.max(1, n - 1), y: Y1 - ((v - mn) / (mx - mn)) * (Y1 - Y0) });
  const p = egri('kubik-hizli', sinirla((f - gec) / (fps * sure)));
  const ilerleme = p * (n - 1);
  const noktalar: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (i <= ilerleme) noktalar.push(pt(i, veriler[i]));
    else {
      const k = ilerleme - (i - 1);
      if (k > 0) { const a = pt(i - 1, veriler[i - 1]), b = pt(i, veriler[i]); noktalar.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); }
      break;
    }
  }
  const yol = tip === 'basamak'
    ? noktalar.map((q, i) => (i ? `H${q.x.toFixed(1)} V${q.y.toFixed(1)}` : `M${q.x.toFixed(1)},${q.y.toFixed(1)}`)).join(' ')
    : noktalar.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  const son = noktalar[noktalar.length - 1] || pt(0, veriler[0]);
  const panel = palet.acik ? karistir(palet.murekkep, palet.zemin, 0.08) : karistir(palet.zemin, '#000000', 0.25);
  const cizgi = karistir(palet.vurgu, '#ffffff', 0.25);
  const g = ilerle(f, 0, fps * 0.4, stil.hareket);
  const sonDeger = veriler[Math.min(n - 1, Math.round(ilerleme))];
  return (
    <AbsoluteFill style={{ background: panel }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${rgba(palet.vurgu, 0.08)} 0%, transparent 60%)` }} />
      {baslik ? <div style={{ position: 'absolute', left: X0, top: Y0 - 150, fontFamily: font.govde, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: rgba('#ffffff', 0.85), textTransform: 'uppercase', opacity: g }}>{baslik}</div> : null}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="gr-alan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={palet.vurgu} stopOpacity={0.45} /><stop offset="1" stopColor={palet.vurgu} stopOpacity={0} /></linearGradient>
          <filter id="gr-hale"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((k, i) => <line key={i} x1={X0} x2={X1} y1={Y1 - k * (Y1 - Y0)} y2={Y1 - k * (Y1 - Y0)} stroke={rgba('#ffffff', i ? 0.07 : 0.25)} strokeWidth={i ? 1 : 2} opacity={g} />)}
        {tip === 'alan-dolgu' && noktalar.length > 1 ? <path d={`${yol} L${son.x},${Y1} L${X0},${Y1} Z`} fill="url(#gr-alan)" /> : null}
        <path d={yol} fill="none" stroke={rgba(palet.vurgu, 0.8)} strokeWidth={12} filter="url(#gr-hale)" />
        <path d={yol} fill="none" stroke={cizgi} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        {veriler.map((v, i) => {
          if (i > ilerleme + 0.001) return null;
          const q = pt(i, v), s = ilerle(f, gec + (i / Math.max(1, n - 1)) * fps * sure, 8, 'geri-sekme');
          return <circle key={i} cx={q.x} cy={q.y} r={8 * s} fill="#ffffff" stroke={palet.vurgu} strokeWidth={3} />;
        })}
      </svg>
      {etiketler.map((e, i) => { const q = pt(i, 0); return <div key={i} style={{ position: 'absolute', left: q.x - 80, width: 160, top: Y1 + 18, textAlign: 'center', fontFamily: font.mono, fontWeight: font.monoAgirlik, fontSize: 22, color: rgba('#ffffff', 0.55), opacity: i <= ilerleme + 0.5 ? 1 : 0.15 }}>{e}</div>; })}
      {p > 0 ? (
        <div style={{ position: 'absolute', left: son.x + 22, top: son.y - 56, fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 64, color: '#ffffff', textShadow: `0 0 24px ${rgba(palet.vurgu, 0.6)}` }}>
          {kisa(sonDeger)}<span style={{ fontSize: 30, marginLeft: 6, color: cizgi }}>{birim}</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** ELEME IZGARASI: N kucuk ikon (siluet) izgarasi; asama asama elenenler soner, kalanlar vurgulanir. asamalar: [1171, 36, 2] */
export const ElemeIzgara: React.FC<{ stil: Stil; asamalar: number[]; etiketler?: string[]; ikon?: 'denizalti' | 'kisi' | 'nokta'; gec?: number; asamaSn?: number }> = ({
  stil, asamalar, etiketler = [], ikon = 'nokta', gec = 6, asamaSn = 1.6,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const N = Math.min(asamalar[0], 1600);
  const kol = Math.ceil(Math.sqrt(N * (W * 0.8) / (H * 0.62)));
  const sat = Math.ceil(N / kol);
  const hw = (W * 0.8) / kol, hh = (H * 0.62) / sat;
  const a = Math.min(asamalar.length - 1, Math.max(0, Math.floor((f - gec) / (fps * asamaSn))));
  const ap = sinirla(((f - gec) / (fps * asamaSn)) - a);
  // kalanlar: deterministik secim (indeks karmasi) — sonraki asama her zaman bir oncekinin alt kumesi
  const sira = (i: number) => ((i * 2654435761) >>> 0) % 100000;
  const esik = (k: number) => { const s = Array.from({ length: N }, (_, i) => sira(i)).sort((x, y) => x - y); return s[Math.min(N - 1, Math.max(0, Math.round((asamalar[k] / asamalar[0]) * N) - 1))]; };
  const e0 = esik(a), e1 = a + 1 < asamalar.length ? esik(a + 1) : e0;
  const sayi = Math.round(asamalar[a] + (a + 1 < asamalar.length ? (asamalar[a + 1] - asamalar[a]) * egri('ustel-sert', sinirla((ap - 0.6) / 0.4)) : 0));
  const sekil = (x: number, y: number, w: number, h: number, renk: string, op: number, key: number) =>
    ikon === 'denizalti' ? <g key={key} opacity={op}><ellipse cx={x + w / 2} cy={y + h * 0.55} rx={w * 0.42} ry={h * 0.16} fill={renk} /><rect x={x + w * 0.42} y={y + h * 0.28} width={w * 0.14} height={h * 0.2} fill={renk} /></g>
      : ikon === 'kisi' ? <g key={key} opacity={op}><circle cx={x + w / 2} cy={y + h * 0.3} r={Math.min(w, h) * 0.16} fill={renk} /><rect x={x + w * 0.32} y={y + h * 0.5} width={w * 0.36} height={h * 0.36} rx={w * 0.12} fill={renk} /></g>
        : <circle key={key} cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.3} fill={renk} opacity={op} />;
  return (
    <AbsoluteFill style={{ background: palet.acik ? palet.zemin : karistir(palet.zemin, '#000000', 0.3) }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: N }, (_, i) => {
          const x = W * 0.1 + (i % kol) * hw, y = H * 0.24 + Math.floor(i / kol) * hh;
          const s = sira(i);
          const simdi = s <= e0, sonra = s <= e1;
          const op = !simdi ? 0.08 : sonra ? 1 : 1 - 0.9 * egri('kubik-hizli', sinirla((ap - 0.5) / 0.4));
          const renk = sonra && a + 1 >= asamalar.length - 1 && ap > 0.6 ? palet.vurgu : simdi ? palet.murekkep : palet.soluk;
          return sekil(x, y, hw, hh, renk, op * (i < N * sinirla((f - gec + 4) / 10) ? 1 : 0), i);
        })}
      </svg>
      <div style={{ position: 'absolute', left: W * 0.1, top: H * 0.09, display: 'flex', alignItems: 'baseline', gap: 26 }}>
        <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 96, color: palet.vurgu, fontVariantNumeric: 'tabular-nums' }}>{sayi.toLocaleString('en-US')}</div>
        {etiketler[ap > 0.8 && a + 1 < asamalar.length ? a + 1 : a] ? <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 34, color: palet.murekkep, letterSpacing: 2, textTransform: 'uppercase' }}>{etiketler[ap > 0.8 && a + 1 < asamalar.length ? a + 1 : a]}</div> : null}
      </div>
    </AbsoluteFill>
  );
};
