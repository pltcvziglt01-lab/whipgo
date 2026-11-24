import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { Medya, MedyaKaynak } from './Medya';
import { FONTLAR, Stil, egri, ilerle, karistir, rgba, sinirla } from './temel';

// HARITA — belgesel harita grafikleri. Zemin: gercek harita gorseli (CC kaynak, uydu/eski harita) ya da repertuar arka plani.
// Koordinatlar ekranin orani (0..1). Ogrenildigi kanallar: @WhereTheyStood (isikli rota), @Ground-Engineering (kilavuz etiketli
// uydu zoom), @TheUnreturned-b2k (ulke dolgusu). Uc rota dili: isik-rota (parlayan cekirdek + hale), kesik-rota (kesikli cizgi,
// tasima/sefer), ok-yay (kalin yay + ok ucu, saldiri/hamle).
// Ek tipler (rota cizmez, ayni noktalar/etiket arayuzunu kullanir): kavisli-etiket (@OkeanosHistory: noktalar egriyi verir,
// etiket egriye oturan aralikli serif bolge adi) ve bolgeli-uydu (@ReichonRecord: koyu uydu haritasi, 'ad'li nokta nabiz isareti,
// adsiz noktalar dolan bolge cokgeni, etiket bolgenin adi).
export const HARITA_TIPLERI = ['isik-rota', 'kesik-rota', 'ok-yay', 'kavisli-etiket', 'bolgeli-uydu'] as const;
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
          fontFamily: stil.font.govde, fontSize: 36, fontWeight: 700, color: '#ffffff', letterSpacing: 1.5, whiteSpace: 'nowrap', textShadow: `0 2px 10px ${rgba('#000', 0.85)}` }}>{ad}</div>
      ) : null}
    </>
  );
};

type RotaProps = { tip: HaritaTip; stil: Stil; noktalar: HaritaNokta[]; zemin?: MedyaKaynak; arkaplan?: ArkaplanTip; etiket?: string; sure?: number; gec?: number };
/** ROTA: noktalar arasi cizilerek uzayan yol; bitince mesafe etiketi. sure: cizim suresi (sn).
 *  tip kavisli-etiket / bolgeli-uydu ise ayni girdilerle o bilesene yonlenir (DnaHarita tek arayuz kullanir). */
export const HaritaRota: React.FC<RotaProps> = (pr) =>
  pr.tip === 'kavisli-etiket' ? <KavisliEtiket {...pr} /> : pr.tip === 'bolgeli-uydu' ? <BolgeliUydu {...pr} /> : <RotaCiz {...pr} />;

const RotaCiz: React.FC<RotaProps> = ({
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
          background: rgba(palet.zemin, 0.85), border: `1px solid ${rgba(palet.vurgu, 0.7)}`, padding: '8px 18px', fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), fontSize: 34, color: palet.murekkep, letterSpacing: 2 }}>{etiket}</div>
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
              fontFamily: font.govde, fontWeight: 700, fontSize: 34, letterSpacing: 3, color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: `0 2px 8px ${rgba('#000', 0.9)}` }}>{e.ad}</div>
          </React.Fragment>
        );
      })}
      {kaynak ? <div style={{ position: 'absolute', right: 36, bottom: 26, fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 28, color: rgba('#ffffff', 0.78), textShadow: `0 1px 4px ${rgba('#000', 0.9)}` }}>{kaynak}</div> : null}
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

const parlaklik = (hex: string) => { const x = hex.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((k) => k + k).join('') : x, 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const idYap = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

/** KAVISLI ETIKET: bolge adi egriye oturur (eski atlas dili). Harfler sirayla belirir, aralik genisten oturur (izleme/tracking).
 *  noktalar: egrinin gectigi noktalar (2+), etiket: yazi. Renk palet murekkebinden vurguya kayik; zitinda yumusak hale. */
const KavisliEtiket: React.FC<RotaProps> = ({ stil, noktalar, zemin, arkaplan, etiket = '', sure = 1.6, gec = 8 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet } = stil;
  const id = 'hk' + idYap(React.useId());
  const r = rotaYap(noktalar.length >= 2 ? noktalar : [{ x: 0.25, y: 0.55 }, { x: 0.75, y: 0.5 }], W, H, 0.22);
  const metin = etiket.toUpperCase();
  const n = Math.max(1, metin.length);
  const fs = Math.min(170, (r.toplam * 0.94) / (n * 1.0));
  const iz = egri('kubik-hizli', sinirla((f - gec) / (fps * sure * 1.4)));
  const renk = karistir(palet.murekkep, palet.vurgu, 0.3);
  const hale = parlaklik(renk) > 0.5 ? rgba('#000000', 0.55) : rgba('#ffffff', 0.6);
  const serif = FONTLAR['antik-baslik'];
  return (
    <AbsoluteFill>
      <Zemin zemin={zemin} arkaplan={arkaplan || 'topografik'} stil={stil} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, ${rgba('#000', 0.4)} 100%)` }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs><path id={id} d={d(r.p)} fill="none" /></defs>
        <text fontFamily={serif.baslik} fontWeight={900} fontSize={fs} fill={renk} stroke={hale} strokeWidth={fs * 0.07} paintOrder="stroke" strokeLinejoin="round"
          letterSpacing={fs * (0.5 - 0.28 * iz)} style={{ filter: `drop-shadow(0 ${fs * 0.04}px ${fs * 0.08}px ${rgba('#000', 0.55)})` }}>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {metin.split('').map((c, i) => {
              const q = ilerle(f, gec + (i / n) * fps * sure * 0.7, fps * 0.35, 'kubik-hizli');
              return <tspan key={i} opacity={q}>{c}</tspan>;
            })}
          </textPath>
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/** procedural koyu uydu zemini: lacivert deniz + koyu kara kutleleri + ince enlem/boylam agi (gercek uydu gorseli yoksa) */
const UyduZemin: React.FC<{ stil: Stil; tohum?: number }> = ({ stil, tohum = 7 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet } = stil;
  const id = 'uz' + idYap(React.useId());
  const deniz = palet.acik ? karistir(palet.murekkep, '#0a1420', 0.65) : karistir(palet.zemin, '#0a1420', 0.7);
  const kara = karistir('#17301f', palet.vurgu2, 0.12);
  const k = 1 + 0.05 * sinirla(f / (fps * 8));
  const x = parseInt(kara.slice(1), 16);
  const [kr, kg, kb] = [((x >> 16) & 255) / 255, ((x >> 8) & 255) / 255, (x & 255) / 255];
  const ag = rgba(palet.acik ? '#ffffff' : palet.murekkep, 0.07);
  return (
    <AbsoluteFill style={{ background: deniz, transform: `scale(${k})` }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0032" numOctaves={5} seed={tohum} result="n" />
          <feColorMatrix in="n" type="matrix" values={`0 0 0 0 ${kr}  0 0 0 0 ${kg}  0 0 0 0 ${kb}  9 0 0 0 -4.3`} result="k" />
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={3} seed={tohum + 3} result="d" />
          <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" result="dd" />
          <feComposite in="dd" in2="k" operator="in" result="ddk" />
          <feMerge><feMergeNode in="k" /><feMergeNode in="ddk" /></feMerge>
        </filter>
        <rect width={W} height={H} filter={`url(#${id})`} />
        {Array.from({ length: 11 }, (_, i) => <line key={'v' + i} x1={(i + 0.5) * W / 10.5} x2={(i + 0.5) * W / 10.5 + 40} y1={0} y2={H} stroke={ag} strokeWidth={1.5} />)}
        {Array.from({ length: 7 }, (_, i) => <line key={'h' + i} x1={0} x2={W} y1={(i + 0.5) * H / 6.5} y2={(i + 0.5) * H / 6.5 + 20} stroke={ag} strokeWidth={1.5} />)}
      </svg>
    </AbsoluteFill>
  );
};

/** BOLGELI UYDU: koyu uydu haritasi; 'ad'li nokta nabiz isareti (2-3 genisleyen halka, ~1 sn), adsiz noktalar bolge cokgeni:
 *  dolgu isaretten disari yayilarak ~0.5 sn'de dolar, kenar cizilir; bolge adi (etiket) ortada. zemin verilirse uydu gorseli koyulastirilir. */
const BolgeliUydu: React.FC<RotaProps> = ({ stil, noktalar, zemin, etiket, sure = 0.6, gec = 8 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const id = 'bu' + idYap(React.useId());
  const isaret = noktalar.find((n) => n.ad);
  const kenar = noktalar.filter((n) => !n.ad).map((n) => ({ x: n.x * W, y: n.y * H }));
  const cok = kenar.length >= 3;
  const cx = cok ? kenar.reduce((s, q) => s + q.x, 0) / kenar.length : W / 2, cy = cok ? kenar.reduce((s, q) => s + q.y, 0) / kenar.length : H / 2;
  const ix = isaret ? isaret.x * W : cx, iy = isaret ? isaret.y * H : cy;
  const nabizR = parlaklik(palet.vurgu) > 0.2 ? palet.vurgu : palet.vurgu2;
  const bolgeR = parlaklik(palet.vurgu2) > 0.25 && palet.vurgu2 !== nabizR ? palet.vurgu2 : karistir(palet.murekkep, nabizR, 0.25);
  const dolBas = gec + (isaret ? fps * 1.2 : 0);
  const yay = ilerle(f, dolBas, fps * sure, 'kubik-hizli');
  const cz = ilerle(f, dolBas, fps * (sure + 0.5), 'kubik-hizli');
  const yazi = ilerle(f, dolBas + fps * sure * 0.7, fps * 0.4, stil.hareket);
  const dd = cok ? kenar.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ') + ' Z' : '';
  const cevre = cok ? kenar.reduce((s, q, i) => s + Math.hypot(q.x - kenar[(i + 1) % kenar.length].x, q.y - kenar[(i + 1) % kenar.length].y), 0) : 0;
  const Rmax = cok ? Math.max(...kenar.map((q) => Math.hypot(q.x - ix, q.y - iy))) * 1.05 : 0;
  const t = (f - gec) / fps;
  const bas = ilerle(f, gec, fps * 0.3, 'geri-sekme');
  return (
    <AbsoluteFill>
      {zemin ? (
        <AbsoluteFill>
          <Medya m={zemin} kamera="ken-burns-ice" />
          <AbsoluteFill style={{ background: rgba(palet.acik ? palet.murekkep : palet.zemin, 0.55), mixBlendMode: 'multiply' }} />
        </AbsoluteFill>
      ) : <UyduZemin stil={stil} />}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${(ix / W) * 100}% ${(iy / H) * 100}%, transparent 30%, ${rgba('#000', 0.5)} 100%)` }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {cok ? (
          <>
            <defs><clipPath id={id}><circle cx={ix} cy={iy} r={Rmax * yay} /></clipPath></defs>
            <path d={dd} fill={rgba(bolgeR, 0.55)} clipPath={`url(#${id})`} />
            <path d={dd} fill="none" stroke={karistir(bolgeR, '#ffffff', 0.35)} strokeWidth={3.5} strokeLinejoin="round" strokeDasharray={cevre} strokeDashoffset={cevre * (1 - cz)}
              style={{ filter: `drop-shadow(0 0 8px ${rgba(bolgeR, 0.9)})` }} />
          </>
        ) : null}
        {isaret ? (
          <>
            {[0, 1, 2].map((k) => {
              const ph = t - k / 3;
              if (ph < 0 || t > 3.2 + k / 3) return null;
              const q = ph % 1;
              return <circle key={k} cx={ix} cy={iy} r={14 + q * 80} fill="none" stroke={rgba(nabizR, (1 - q) * 0.9)} strokeWidth={4 * (1 - q) + 1} />;
            })}
            <circle cx={ix} cy={iy} r={36} fill={rgba(nabizR, 0.25 + 0.1 * Math.sin(t * 4))} style={{ filter: 'blur(10px)' }} />
            <circle cx={ix} cy={iy} r={12 * bas} fill={nabizR} stroke={karistir(nabizR, '#ffffff', 0.6)} strokeWidth={3} />
          </>
        ) : null}
      </svg>
      {isaret ? (
        <div style={{ position: 'absolute', left: ix + 34, top: iy - 24, opacity: sinirla((f - gec - 6) / 8), fontFamily: font.govde, fontWeight: 800, fontSize: 36, letterSpacing: 2,
          color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: `0 2px 10px ${rgba('#000', 0.9)}` }}>{isaret.ad}</div>
      ) : null}
      {cok && etiket ? (
        <div style={{ position: 'absolute', left: cx - 450, width: 900, top: cy - 26, textAlign: 'center', opacity: yazi, transform: `translateY(${(1 - yazi) * 10}px)`,
          fontFamily: font.govde, fontWeight: 800, fontSize: 40, letterSpacing: 8, color: karistir('#ffffff', bolgeR, 0.15), textTransform: 'uppercase', textShadow: `0 2px 12px ${rgba('#000', 0.85)}` }}>{etiket}</div>
      ) : null}
    </AbsoluteFill>
  );
};
