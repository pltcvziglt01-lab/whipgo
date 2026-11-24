import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HareketAd, Stil, egri, rastgele, rgba, sinirla } from './temel';

// GECISLER — sahneler arasi. GecisliDizi sahneleri ust uste bindirir; gecis tipi tek ya da liste (tohumla dagitilir).
// Iskelet kurali: gecis SURESI rakibin yumusak gecis medyanindan, SIKLIGI rakibin yumusak gecis oranindan gelir (stil_dna.py).
export const GECIS_TIPLERI = [
  'sert', 'cozunme', 'bulaniklik', 'isik-patlamasi', 'glitch-rgb', 'whip-sol', 'whip-yukari', 'kaydirma-itme',
  'maske-daire', 'maske-capraz', 'maske-seritler', 'zoom-darbe', 'film-yanigi', 'kart-cevirme', 'tv-kapanma', 'perde',
] as const;
/** 'filmburn:fb-03:1.4' = varlik/filmburn/fb-03.mp4, en parlak an 1.4 sn: kesim tam o ana denk gelir */
export type GecisTip = typeof GECIS_TIPLERI[number] | `filmburn:${string}`;

const cikisStil = (tip: GecisTip, p: number, W: number): React.CSSProperties => {
  if (tip.startsWith('filmburn')) return {};
  switch (tip) {
    case 'bulaniklik': return { filter: `blur(${p * 24}px)` };
    case 'whip-sol': return { transform: `translateX(${-egri('ustel-sert', p) * W * 0.6}px)`, filter: `blur(${Math.sin(p * Math.PI) * 40}px)` };
    case 'whip-yukari': return { transform: `translateY(${-egri('ustel-sert', p) * 700}px)`, filter: `blur(${Math.sin(p * Math.PI) * 40}px)` };
    case 'kaydirma-itme': return { transform: `translateX(${-egri('kubik-hizli', p) * 100}%)` };
    case 'zoom-darbe': return { transform: `scale(${1 + p * p * 0.8})`, opacity: 1 - p, filter: `blur(${p * 14}px)` };
    case 'kart-cevirme': return { transform: `perspective(2200px) rotateY(${Math.min(90, p * 180)}deg)`, opacity: p < 0.5 ? 1 : 0 };
    case 'tv-kapanma': { const q = sinirla(p * 2); return { transform: `scaleY(${Math.max(0.004, 1 - q)}) scaleX(${q > 0.95 ? 1 - (q - 0.95) * 18 : 1})`, filter: `brightness(${1 + q * 2})`, opacity: p < 0.5 ? 1 : 0 }; }
    case 'glitch-rgb': return { transform: `translateX(${Math.sin(p * 90) * 30 * p}px)`, filter: `hue-rotate(${p * 90}deg) saturate(${1 + p * 2})` };
    default: return {};
  }
};

const girisStil = (tip: GecisTip, p: number, W: number): React.CSSProperties => {
  if (tip.startsWith('filmburn')) return { opacity: p >= 0.5 ? 1 : 0 };
  switch (tip) {
    case 'sert': return {};
    case 'cozunme': return { opacity: p };
    case 'bulaniklik': return { opacity: p, filter: `blur(${(1 - p) * 24}px)` };
    case 'isik-patlamasi': return { opacity: sinirla(p * 2.2 - 0.6) };
    case 'film-yanigi': return { opacity: sinirla(p * 1.6 - 0.3) };
    case 'glitch-rgb': return { opacity: p > 0.35 ? 1 : 0, transform: `translateX(${Math.sin(p * 77) * 40 * (1 - p)}px)`, filter: `hue-rotate(${(1 - p) * -90}deg)` };
    case 'whip-sol': return { transform: `translateX(${(1 - egri('kubik-hizli', p)) * W * 0.6}px)`, filter: `blur(${Math.sin(p * Math.PI) * 40}px)`, opacity: sinirla(p * 3) };
    case 'whip-yukari': return { transform: `translateY(${(1 - egri('kubik-hizli', p)) * 700}px)`, filter: `blur(${Math.sin(p * Math.PI) * 40}px)`, opacity: sinirla(p * 3) };
    case 'kaydirma-itme': return { transform: `translateX(${(1 - egri('kubik-hizli', p)) * 100}%)` };
    case 'maske-daire': return { clipPath: `circle(${egri('kubik-hizli', p) * 120}% at 50% 50%)` };
    case 'maske-capraz': { const q = egri('kubik-hizli', p) * 220 - 60; return { clipPath: `polygon(0 0, ${q}% 0, ${q - 60}% 100%, 0 100%)` }; }
    case 'maske-seritler': { const w = 120, q = egri('kubik-hizli', p) * w; return { WebkitMaskImage: `repeating-linear-gradient(90deg, #000 0 ${q}px, transparent ${q}px ${w}px)`, maskImage: `repeating-linear-gradient(90deg, #000 0 ${q}px, transparent ${q}px ${w}px)` }; }
    case 'zoom-darbe': return { transform: `scale(${1.5 - egri('ustel-sert', p) * 0.5})`, opacity: sinirla(p * 2.5) };
    case 'kart-cevirme': return { transform: `perspective(2200px) rotateY(${Math.min(0, -90 + (p - 0.5) * 180)}deg)`, opacity: p >= 0.5 ? 1 : 0 };
    case 'tv-kapanma': { const q = sinirla(p * 2 - 1); return { transform: `scaleY(${Math.max(0.004, q)})`, filter: `brightness(${3 - q * 2})`, opacity: p >= 0.5 ? 1 : 0 }; }
    case 'perde': { const q = egri('kubik-hizli', p) * 50; return { clipPath: `inset(0 ${50 - q}% 0 ${50 - q}%)` }; }
    default: return { opacity: p };
  }
};

// gecis aninda en ustte cizilen katman (flas, isik sizintisi, glitch seritleri)
const GecisUstKatman: React.FC<{ tip: GecisTip; p: number; stil: Stil }> = ({ tip, p, stil }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (tip === 'isik-patlamasi') {
    const a = Math.sin(p * Math.PI);
    return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${rgba('#ffffff', a)} 0%, ${rgba(stil.palet.vurgu2, a * 0.8)} 45%, ${rgba(stil.palet.vurgu, a * 0.5)} 100%)`, mixBlendMode: 'screen' }} />;
  }
  if (tip === 'film-yanigi') {
    const a = Math.sin(p * Math.PI);
    return (
      <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
        <div style={{ position: 'absolute', left: -600 + p * (W + 600), top: -200, width: 1100, height: H + 400, borderRadius: '50%', background: `radial-gradient(ellipse, ${rgba('#ffd08a', a)} 0%, ${rgba(stil.palet.vurgu, a * 0.8)} 40%, transparent 70%)`, filter: 'blur(60px)' }} />
        <AbsoluteFill style={{ background: rgba('#ff9a3c', a * 0.25) }} />
      </AbsoluteFill>
    );
  }
  if (tip === 'glitch-rgb') {
    const r = rastgele(Math.floor(f / 2) + 17);
    const a = Math.sin(p * Math.PI);
    return (
      <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: (r() - 0.3) * W * 0.4, top: r() * H, width: W * (0.4 + r()), height: 6 + r() * 60, background: [rgba('#ff0040', a * 0.7), rgba('#00e5ff', a * 0.7), rgba(stil.palet.vurgu, a * 0.6)][i % 3] }} />
        ))}
      </AbsoluteFill>
    );
  }
  if (tip === 'tv-kapanma') {
    const a = Math.max(0, 1 - Math.abs(p - 0.5) * 6);
    return <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - 2, height: 4, background: rgba('#ffffff', a), boxShadow: `0 0 40px ${rgba('#ffffff', a)}` }} />;
  }
  return null;
};

const Sahne: React.FC<{ sure: number; giris?: { tip: GecisTip; d: number }; cikis?: { tip: GecisTip; d: number }; children: React.ReactNode }> = ({ sure, giris, cikis, children }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  let st: React.CSSProperties = {};
  if (giris && giris.d > 0 && f < giris.d) st = { ...st, ...girisStil(giris.tip, f / giris.d, W) };
  if (cikis && cikis.d > 0 && f >= sure - cikis.d) {
    const c = cikisStil(cikis.tip, (f - (sure - cikis.d)) / cikis.d, W);
    st = { ...st, ...c, transform: [st.transform, c.transform].filter(Boolean).join(' ') || undefined, filter: [st.filter, c.filter].filter(Boolean).join(' ') || undefined };
  }
  return <AbsoluteFill style={{ ...st, overflow: 'hidden' }}>{children}</AbsoluteFill>;
};

export type DiziSahne = { el: React.ReactNode; sure: number };
/** her sinir icin gecis tipi: liste verilirse tohumla dagitilir, ayni tip art arda gelmez; 'sert' agirligi = 1 - yumusakOran */
export const gecisPlani = (n: number, gecis: GecisTip | GecisTip[], tohum = 'g', yumusakOran = 1): GecisTip[] => {
  const r = rastgele(tohum + 'gp');
  const liste = Array.isArray(gecis) ? gecis : [gecis];
  const out: GecisTip[] = [];
  for (let i = 0; i < n; i++) {
    if (r() > yumusakOran) { out.push('sert'); continue; }
    let t = liste[Math.floor(r() * liste.length)];
    if (liste.length > 1 && t === out[i - 1]) t = liste[(liste.indexOf(t) + 1) % liste.length];
    out.push(t);
  }
  return out;
};
export const diziSuresi = (sahneler: DiziSahne[], plan: GecisTip[], kare: number) =>
  sahneler.reduce((a, s, i) => a + s.sure - (i < sahneler.length - 1 && plan[i] !== 'sert' ? kare : 0), 0);

/** zemin: kart-cevirme / tv-kapanma / whip gibi gecislerde arada gorunen katman (ornegin <Arkaplan/>); verilmezse palet zemini */
export const GecisliDizi: React.FC<{ sahneler: DiziSahne[]; gecis: GecisTip | GecisTip[]; kare?: number; stil: Stil; yumusakOran?: number; tohum?: string; zemin?: React.ReactNode }> = ({ sahneler, gecis, kare = 12, stil, yumusakOran = 1, tohum, zemin }) => {
  const { fps } = useVideoConfig();
  const plan = gecisPlani(sahneler.length - 1, gecis, tohum ?? stil.tohum, yumusakOran);
  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? kare : 0);
  const bas: number[] = [];
  sahneler.forEach((s, i) => bas.push(i === 0 ? 0 : bas[i - 1] + sahneler[i - 1].sure - d(i - 1)));
  return (
    <AbsoluteFill style={{ background: stil.palet.zemin }}>
      {zemin}
      {sahneler.map((s, i) => (
        <Sequence key={i} from={bas[i]} durationInFrames={s.sure} layout="none">
          <Sahne sure={s.sure} giris={i > 0 ? { tip: plan[i - 1], d: d(i - 1) } : undefined} cikis={i < plan.length ? { tip: plan[i], d: d(i) } : undefined}>{s.el}</Sahne>
        </Sequence>
      ))}
      {plan.map((t, i) => {
        if (d(i) <= 0) return null;
        if (t.startsWith('filmburn')) {
          // yanik videosu gecisten uzun: tepe ani kesimin ortasina oturur
          const [, id, tepe] = t.split(':');
          const L = Math.round(fps * 1.0), orta = bas[i + 1] + Math.round(d(i) / 2);
          const bas0 = Math.max(0, orta - Math.round(L / 2));
          const ofs = Math.max(0, Math.round(parseFloat(tepe || '1') * fps) - (orta - bas0));
          return (
            <Sequence key={'u' + i} from={bas0} durationInFrames={L} layout="none">
              <YanikZarf L={L}><OffthreadVideo muted src={staticFile(`varlik/filmburn/${id}.mp4`)} startFrom={ofs} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></YanikZarf>
            </Sequence>
          );
        }
        return (
          <Sequence key={'u' + i} from={bas[i + 1]} durationInFrames={d(i)} layout="none">
            <UstKatmanSarici tip={t} d={d(i)} stil={stil} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
// film yanigi zarfi: yumusak girer/cikar, tepede en cok %85 (kartlari bembeyaz yapmasin)
const YanikZarf: React.FC<{ L: number; children: React.ReactNode }> = ({ L, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.85 * Math.sin(Math.PI * Math.min(1, Math.max(0, f / L))) }}>{children}</AbsoluteFill>;
};
const UstKatmanSarici: React.FC<{ tip: GecisTip; d: number; stil: Stil }> = ({ tip, d, stil }) => {
  const f = useCurrentFrame();
  return <GecisUstKatman tip={tip} p={f / d} stil={stil} />;
};
