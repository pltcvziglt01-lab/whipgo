import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { Medya, MedyaKaynak } from './Medya';
import { Stil, egri, ilerle, karistir, rgba, sinirla } from './temel';

// HARITA — belgesel harita grafikleri. Zemin: gercek harita gorseli (CC kaynak, uydu/eski harita) ya da repertuar arka plani.
// Koordinatlar ekranin orani (0..1). Ogrenildigi kanallar: @WhereTheyStood (isikli rota), @Ground-Engineering (kilavuz etiketli
// uydu zoom), @TheUnreturned-b2k (ulke dolgusu). Uc rota dili: isik-rota (parlayan cekirdek + hale), kesik-rota (kesikli cizgi,
// tasima/sefer), ok-yay (kalin yay + ok ucu, saldiri/hamle).
export const HARITA_TIPLERI = ['isik-rota', 'kesik-rota', 'ok-yay'] as const;
export type HaritaTip = typeof HARITA_TIPLERI[number];
export type HaritaNokta = { x: number; y: number; ad?: string };

/** iki nokta arasinda hafif kavisli (quadratic) yol; egim: kavis miktari (dik yonde, mesafenin orani) */
const yolNoktalari = (a: { x: number; y: number }, b: { x: number; y: number }, egim: number, n = 48) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  const cx = mx - dy * egim, cy = my + dx * egim;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y };
  });
};

/** cok noktali rota -> piksel nokta dizisi + kumulatif uzunluk */
const rotaYap = (noktalar: HaritaNokta[], W: number, H: number, egim: number) => {
  const p: { x: number; y: number }[] = [];
  for (let i = 0; i < noktalar.length - 1; i++) {
    const seg = yolNoktalari({ x: noktalar[i].x * W, y: noktalar[i].y * H }, { x: noktalar[i + 1].x * W, y: noktalar[i + 1].y * H }, egim * (i % 2 ? -1 : 1));
    p.push(...(i ? seg.slice(1) : seg));
  }
  const L = [0];
  for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
  return { p, L, toplam: L[L.length - 1] };
};

const kesit = (r: ReturnType<typeof rotaYap>, oran: number) => {
  const hedef = r.toplam * oran;
  const out = [r.p[0]];
  for (let i = 1; i < r.p.length; i++) {
    if (r.L[i] <= hedef) out.push(r.p[i]);
    else {
      const k = (hedef - r.L[i - 1]) / Math.max(1e-6, r.L[i] - r.L[i - 1]);
      out.push({ x: r.p[i - 1].x + (r.p[i].x - r.p[i - 1].x) * k, y: r.p[i - 1].y + (r.p[i].y - r.p[i - 1].y) * k });
      break;
    }
  }
  return out;
};
const d = (pts: { x: number; y: number }[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

/** zemin: harita gorseli (yavas zoom) ya da repertuar arka plani */
const Zemin: React.FC<{ zemin?: MedyaKaynak; arkaplan?: ArkaplanTip; stil: Stil }> = ({ zemin, arkaplan = 'topografik', stil }) =>
  zemin ? <Medya m={zemin} kamera="ken-burns-ice" /> : <Arkaplan tip={arkaplan} stil={stil} />;

/** nokta + nabiz halkasi + serif etiket (kucuk, ince kilavuz cizgi ile) */
const Isaret: React.FC<{ x: number; y: number; ad?: string; renk: string; stil: Stil; gec: number; sag?: boolean }> = ({ x, y, ad, renk, stil, gec, sag }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ilerle(f, gec, fps * 0.35, 'geri-sekme');
  const nab = ((f - gec) / (fps * 1.4)) % 1;
  return (
    <>
      <div style={{ position: 'absolute', left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 9, background: renk, transform: `scale(${p})`, boxShadow: `0 0 18px ${rgba(renk, 0.9)}` }} />
      {f > gec ? <div style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, border: `2px solid ${rgba(renk, 1 - nab)}`, transform: `scale(${0.3 + nab})` }} /> : null}
      {ad ? (
        <div style={{ position: 'absolute', left: sag ? x + 26 : undefined, right: sag ? undefined : `calc(100% - ${x - 26}px)`, top: y - 22, opacity: sinirla((f - gec - 4) / 8),
          fontFamily: stil.font.govde, fontSize: 30, fontWeight: 600, color: '#ffffff', letterSpacing: 1.5, whiteSpace: 'nowrap', textShadow: `0 2px 10px ${rgba('#000', 0.85)}` }}>{ad}</div>
      ) : null}
    </>
  );
};

/** ROTA: noktalar arasi cizilerek uzayan yol; bitince mesafe etiketi. sure: cizim suresi (sn) */
export const HaritaRota: React.FC<{ tip: HaritaTip; stil: Stil; noktalar: HaritaNokta[]; zemin?: MedyaKaynak; arkaplan?: ArkaplanTip; etiket?: string; sure?: number; gec?: number }> = ({
  tip, stil, noktalar, zemin, arkaplan, etiket, sure = 2.4, gec = 10,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const r = rotaYap(noktalar, W, H, tip === 'ok-yay' ? 0.28 : 0.14);
  const p = egri(tip === 'ok-yay' ? 'ustel-sert' : 'kubik-hizli', sinirla((f - gec) / (fps * sure)));
  const yol = kesit(r, p);
  const bas = yol[yol.length - 1];
  const cekirdek = karistir(palet.vurgu, '#ffffff', 0.62);
  const renk = tip === 'ok-yay' ? palet.vurgu : tip === 'kesik-rota' ? palet.murekkep : palet.vurgu;
  const tamam = ilerle(f, gec + fps * sure, fps * 0.4, stil.hareket);
  const orta = r.p[Math.floor(r.p.length / 2)];
  // ok ucu yonu
  const once = yol[Math.max(0, yol.length - 3)];
  const aci = Math.atan2(bas.y - once.y, bas.x - once.x) * 180 / Math.PI;
  return (
    <AbsoluteFill>
      <Zemin zemin={zemin} arkaplan={arkaplan} stil={stil} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 40%, ${rgba('#000', 0.45)} 100%)` }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <filter id="hr-hale" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
        </defs>
        {tip === 'isik-rota' ? (
          <>
            <path d={d(yol)} fill="none" stroke={rgba(palet.vurgu, 0.85)} strokeWidth={18} strokeLinecap="round" filter="url(#hr-hale)" />
            <path d={d(yol)} fill="none" stroke={cekirdek} strokeWidth={4.5} strokeLinecap="round" />
            {p < 1 && p > 0 ? <circle cx={bas.x} cy={bas.y} r={9} fill="#ffffff" style={{ filter: `drop-shadow(0 0 14px ${cekirdek})` }} /> : null}
          </>
        ) : tip === 'kesik-rota' ? (
          <>
            <path d={d(yol)} fill="none" stroke={rgba('#000', 0.55)} strokeWidth={7} strokeDasharray="18 12" strokeLinecap="round" transform="translate(3,4)" />
            <path d={d(yol)} fill="none" stroke={renk} strokeWidth={6} strokeDasharray="18 12" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d={d(yol)} fill="none" stroke={rgba('#000', 0.5)} strokeWidth={22} strokeLinecap="butt" transform="translate(5,7)" />
            <path d={d(yol)} fill="none" stroke={renk} strokeWidth={20} strokeLinecap="butt" />
            {p > 0.02 ? <polygon points="-6,-26 40,0 -6,26" fill={renk} transform={`translate(${bas.x},${bas.y}) rotate(${aci})`} style={{ filter: `drop-shadow(4px 6px 0 ${rgba('#000', 0.5)})` }} /> : null}
          </>
        )}
      </svg>
      {noktalar.map((n, i) => (
        <Isaret key={i} x={n.x * W} y={n.y * H} ad={n.ad} renk={i === 0 || i === noktalar.length - 1 ? palet.vurgu : palet.murekkep} stil={stil}
          gec={gec + (i / Math.max(1, noktalar.length - 1)) * fps * sure - 4} sag={n.x < 0.75} />
      ))}
      {etiket ? (
        <div style={{ position: 'absolute', left: orta.x + 24, top: orta.y + 18, opacity: tamam, transform: `translateY(${(1 - tamam) * 12}px)`,
          background: rgba(palet.zemin, 0.85), border: `1px solid ${rgba(palet.vurgu, 0.7)}`, padding: '8px 18px', fontFamily: font.mono, fontWeight: font.monoAgirlik, fontSize: 28, color: palet.murekkep, letterSpacing: 2 }}>{etiket}</div>
      ) : null}
    </AbsoluteFill>
  );
};

/** KILAVUZ ETIKETLI HARITA: uydu/harita gorseli yavas zoom; etiketler sirayla, nokta + kirik kilavuz cizgi + kucuk buyuk harf yazi; altta kaynak satiri */
export const EtiketliHarita: React.FC<{ stil: Stil; zemin?: MedyaKaynak; arkaplan?: ArkaplanTip; etiketler: HaritaNokta[]; kaynak?: string; gec?: number }> = ({ stil, zemin, arkaplan, etiketler, kaynak, gec = 8 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { font } = stil;
  return (
    <AbsoluteFill>
      <Zemin zemin={zemin} arkaplan={arkaplan || 'topografik'} stil={stil} />
      {etiketler.map((e, i) => {
        const g0 = gec + i * fps * 0.25;
        const p = ilerle(f, g0, fps * 0.3, 'kubik-hizli'), q = ilerle(f, g0 + 5, fps * 0.3, 'kubik-hizli');
        const x = e.x * W, y = e.y * H, sag = e.x < 0.7;
        const kx = sag ? 46 : -46, ky = -54, uz = 70 * q;
        return (
          <React.Fragment key={i}>
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
              <circle cx={x} cy={y} r={6 * p} fill="#ffffff" stroke={rgba('#000', 0.6)} strokeWidth={2} />
              <path d={`M${x},${y} L${x + kx * p},${y + ky * p} L${x + kx * p + (sag ? uz : -uz)},${y + ky * p}`} fill="none" stroke="#ffffff" strokeWidth={2} style={{ filter: `drop-shadow(0 1px 2px ${rgba('#000', 0.8)})` }} />
            </svg>
            <div style={{ position: 'absolute', top: y + ky - 40, left: sag ? x + kx + 6 : undefined, right: sag ? undefined : W - (x + kx - 6), opacity: q,
              fontFamily: font.govde, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: `0 2px 8px ${rgba('#000', 0.9)}` }}>{e.ad}</div>
          </React.Fragment>
        );
      })}
      {kaynak ? <div style={{ position: 'absolute', right: 36, bottom: 26, fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 18, color: rgba('#ffffff', 0.7), textShadow: `0 1px 4px ${rgba('#000', 0.9)}` }}>{kaynak}</div> : null}
    </AbsoluteFill>
  );
};

/** BOLGE VURGUSU: harita uzerinde cokgen (ulke/bolge) yari saydam dolgu + cizilen kenar + nabiz; ortasinda ad */
export const BolgeVurgu: React.FC<{ stil: Stil; zemin?: MedyaKaynak; arkaplan?: ArkaplanTip; kenar: [number, number][]; ad?: string; renk?: string; gec?: number }> = ({ stil, zemin, arkaplan, kenar, ad, renk, gec = 8 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const R = renk || stil.palet.vurgu;
  const pts = kenar.map(([x, y]) => ({ x: x * W, y: y * H }));
  const cevre = pts.reduce((s, q, i) => s + Math.hypot(q.x - pts[(i + 1) % pts.length].x, q.y - pts[(i + 1) % pts.length].y), 0);
  const p = ilerle(f, gec, fps * 1.1, 'kubik-hizli');
  const dol = ilerle(f, gec + fps * 0.6, fps * 0.6, stil.hareket);
  const nab = 0.85 + 0.15 * Math.sin((f - gec) / fps * 3.2);
  const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length, cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
  const dd = pts.map((q, i) => `${i ? 'L' : 'M'}${q.x},${q.y}`).join(' ') + ' Z';
  return (
    <AbsoluteFill>
      <Zemin zemin={zemin} arkaplan={arkaplan || 'topografik'} stil={stil} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <path d={dd} fill={rgba(R, 0.42 * dol * nab)} />
        <path d={dd} fill="none" stroke={R} strokeWidth={4} strokeLinejoin="round" strokeDasharray={cevre} strokeDashoffset={cevre * (1 - p)} style={{ filter: `drop-shadow(0 0 10px ${rgba(R, 0.9)})` }} />
      </svg>
      {ad ? <div style={{ position: 'absolute', left: cx - 400, width: 800, top: cy - 34, textAlign: 'center', opacity: dol, fontFamily: stil.font.baslik, fontWeight: stil.font.baslikAgirlik, fontSize: 58,
        letterSpacing: 4, color: '#ffffff', textTransform: 'uppercase', textShadow: `0 3px 14px ${rgba('#000', 0.9)}` }}>{ad}</div> : null}
    </AbsoluteFill>
  );
};
