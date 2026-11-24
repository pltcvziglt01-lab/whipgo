import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HareketAd, Stil, cikisEgri, egri, karistir, rastgele, rgba, sinirla, yay } from './temel';

// GECISLER — sahneler arasi. GecisliDizi sahneleri ust uste bindirir; gecis tipi tek ya da liste (tohumla dagitilir).
// Iskelet kurali: gecis SURESI rakibin yumusak gecis medyanindan, SIKLIGI rakibin yumusak gecis oranindan gelir (stil_dna.py).
export const GECIS_TIPLERI = [
  'sert', 'cozunme', 'bulaniklik', 'isik-patlamasi', 'glitch-rgb', 'whip-sol', 'whip-yukari', 'kaydirma-itme',
  'maske-daire', 'maske-capraz', 'maske-seritler', 'zoom-darbe', 'film-yanigi', 'kart-cevirme', 'tv-kapanma', 'perde', 'parsomen', 'tint-sizinti', 'renk-bandi', 'zoom-icinden',
  'kareli-kagit', 'supurme-inset', 'bulanik-hayalet',
  // Opus galerisi (envanter/opus-galeri/teknikler.json, 20 video): giden sahnenin nesnesine dalis, rengi yeni sahnenin zemini
  'nesne-dalisi',
] as const;
/** 'filmburn:fb-03:1.4' = varlik/filmburn/fb-03.mp4, en parlak an 1.4 sn: kesim tam o ana denk gelir */
export type GecisTip = typeof GECIS_TIPLERI[number] | `filmburn:${string}`;

/** odak: giden sahnenin nesne noktasi (0..1, kadraja gore); nesne-dalisi buraya dalar */
type Odak = [number, number];
const ODAK: Odak = [0.5, 0.46];
// nesne-dalisi zamanlamasi (gecisin orani): dal = giden sahne ~6x buyuyup renk ekrani kaplar, ac = renk yukari cekilmeye baslar
const ND = { dal: 0.6, ac: 0.68, olcek: 5, r0: 0.05 };
/** nesne-dalisi: giden sahnenin olcegi (ease-in: yavas kalkar, hizla dalar; bulaniklik yok) */
const ndOlcek = (p: number) => 1 + ND.olcek * cikisEgri(sinirla(p / ND.dal), 2.4);

const cikisStil = (tip: GecisTip, p: number, W: number, odak: Odak = ODAK): React.CSSProperties => {
  if (tip.startsWith('filmburn')) return {};
  switch (tip) {
    // nesne-dalisi: kamera giden sahnenin nesnesine (odak) dalar; renk ekrani kaplayinca gizlenir
    case 'nesne-dalisi': return { transform: `scale(${ndOlcek(p).toFixed(4)})`, transformOrigin: `${odak[0] * 100}% ${odak[1] * 100}%`, opacity: p < ND.dal + 0.04 ? 1 : 0 };
    case 'bulaniklik': return { filter: `blur(${p * 24}px)` };
    case 'whip-sol': return { transform: `translateX(${-egri('ustel-sert', p) * W * 0.6}px)`, filter: `blur(${Math.sin(p * Math.PI) * 40}px)` };
    case 'whip-yukari': return { transform: `translateY(${-egri('ustel-sert', p) * 700}px)`, filter: `blur(${Math.sin(p * Math.PI) * 40}px)` };
    case 'kaydirma-itme': return { transform: `translateX(${-egri('kubik-hizli', p) * 100}%)` };
    case 'zoom-darbe': return { transform: `scale(${1 + p * p * 0.8})`, opacity: 1 - p, filter: `blur(${p * 14}px)` };
    case 'kart-cevirme': return { transform: `perspective(2200px) rotateY(${Math.min(90, p * 180)}deg)`, opacity: p < 0.5 ? 1 : 0 };
    case 'tv-kapanma': { const q = sinirla(p * 2); return { transform: `scaleY(${Math.max(0.004, 1 - q)}) scaleX(${q > 0.95 ? 1 - (q - 0.95) * 18 : 1})`, filter: `brightness(${1 + q * 2})`, opacity: p < 0.5 ? 1 : 0 }; }
    case 'glitch-rgb': return { transform: `translateX(${Math.sin(p * 90) * 30 * p}px)`, filter: `hue-rotate(${p * 90}deg) saturate(${1 + p * 2})` };
    // renk bandi: eski sahne bandin onunde 180 px geri kayip hafif kararir (givemotion scene-transitions)
    case 'renk-bandi': return { transform: `translateX(${-egri('kubik-hizli', p) * 180}px)`, filter: `brightness(${1 - 0.35 * p})` };
    // kameradan gecis: eski sahne buyuyerek bulanir ve solar (derine dalma)
    case 'zoom-icinden': { const q = egri('kubik-hizli', p); return { transform: `scale(${1 + q * 0.9})`, filter: `blur(${q * 16}px)`, opacity: 1 - sinirla((p - 0.35) / 0.5) }; }
    // supurme-inset: eski kare saga supurulur (gecisin ilk ~%30'u), arkasindan bos koyu panel kalir
    case 'supurme-inset': { const q = egri('ustel-sert', sinirla(p / SI.supur)); return { transform: `translateX(${q * W * 1.05}px)`, filter: `blur(${Math.sin(q * Math.PI) * 26}px)` }; }
    // bulanik hayalet: eski kare kararir, bulanir, egilir; yeni kare onun ustune cozunur (@OkeanosHistory)
    case 'bulanik-hayalet': { const q = egri('kubik-hizli', sinirla(p * 1.6)); return { transform: `rotate(${-5 * q}deg) scale(${1 + 0.24 * q})`, filter: `blur(${q * 30}px) brightness(${1 - 0.58 * q}) saturate(${1 - 0.4 * q})` }; }
    default: return {};
  }
};

// supurme-inset zamanlamasi (gecisin orani): supurme biter, bos panel, inset belirir, inset tam ekrana acilir
const SI = { supur: 0.28, bos: 0.4, ac: 0.66 };
/** koyu kurumsal panel tonu: paletten, laciverte yakin (haber bandi ile ayni aile) */
export const panelTonu = (stil: Stil) => (stil.palet.acik ? karistir(stil.palet.murekkep, '#0b1a2e', 0.55) : karistir(stil.palet.zemin, '#0b1a2e', 0.6));
/** defter kagidi tonu: paletten (acik palette zeminin beyaza yakini, koyu palette krem-murekkep karisimi) */
export const kagitTonu = (stil: Stil) => (stil.palet.acik ? karistir(stil.palet.zemin, '#ffffff', 0.3) : karistir('#e6dcc4', stil.palet.murekkep, 0.25));

const girisStil = (tip: GecisTip, p: number, W: number, stil: Stil): React.CSSProperties => {
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
    case 'renk-bandi': { const x = bandKenar(p) - BANT; return { clipPath: `polygon(0 0, ${x + EGIM}% 0, ${x}% 100%, 0 100%)` }; }
    case 'zoom-icinden': { const q = egri('kubik-hizli', p); return { transform: `scale(${1.35 - 0.35 * q})`, filter: `blur(${(1 - q) * 12}px)`, opacity: sinirla(p * 1.8 - 0.2) }; }
    // kagit ustteyken (ortada) yeni sahne altta hazir bekler
    case 'kareli-kagit': return { opacity: p >= 0.5 ? 1 : 0 };
    case 'supurme-inset': {
      // kucultulmus inset (sol-ust agirlikli, solda ince vurgu cizgisi) -> tam ekran; disari dev golge = koyu panel
      if (p < SI.bos) return { opacity: 0 };
      const q = egri('kubik-hizli', sinirla((p - SI.ac) / (1 - SI.ac)));
      const g = egri('ustel-sert', sinirla((p - SI.bos) / 0.12));
      const s = 0.62 + 0.38 * q, dx = -3.5 * (1 - q), dy = 1.5 * (1 - q);
      return { transform: `translate(${dx}%, ${dy}%) scale(${s * (0.94 + 0.06 * g)})`, opacity: g,
        boxShadow: `${-14 / s}px 0 0 0 ${stil.palet.vurgu}, 0 0 0 ${3000}px ${panelTonu(stil)}`, filter: `brightness(${0.85 + 0.15 * g})` };
    }
    case 'bulanik-hayalet': { const q = egri('kubik-hizli', sinirla((p - 0.25) / 0.75)); return { opacity: q, transform: `scale(${1.05 - 0.05 * q})`, filter: `blur(${(1 - q) * 10}px)` }; }
    // nesne-dalisi: renk perdesinin altinda hazir bekler, perde yukari cekilirken asagidan yukselir (dalisin devami gibi hafif buyukten oturur)
    case 'nesne-dalisi': {
      if (p < ND.dal) return { opacity: 0 };
      const q = yay(sinirla((p - ND.ac) / (1 - ND.ac)));
      return { transform: `translateY(${((1 - q) * 7).toFixed(3)}%) scale(${(1.04 - 0.04 * q).toFixed(4)})` };
    }
    default: return { opacity: p };
  }
};

// renk bandi geometrisi (% ekran): on kenar soldan saga kayar; bant genisligi %22, kenar egimi %10 (≈ -10,5°), onde ince serit
const BANT = 22, EGIM = 10;
const bandKenar = (p: number) => -EGIM + egri('kubik-hizli', p) * (100 + BANT + 2 * EGIM);

// gecis aninda en ustte cizilen katman (flas, isik sizintisi, glitch seritleri)
const GecisUstKatman: React.FC<{ tip: GecisTip; p: number; stil: Stil; odak?: Odak }> = ({ tip, p, stil, odak = ODAK }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (tip === 'nesne-dalisi') {
    // galeri (kloss-xyz s016: Σ dugumu -> turuncu zemin -> '83 YEARS.'): odak noktasinda vurgu renkli dugum (dolu daire + ince
    // halka) belirir, kamera daldikca dugum kameraya dogru buyur (yaricap olcek^2) ve ekrani kaplar; renk yeni sahnenin zeminidir.
    // Ardindan renk perdesi alt kenarindan yukari cekilir, yeni sahne altindan yukselir. Bulaniklik, flas, glow yok.
    const s = ndOlcek(p);
    const k = yay(sinirla(p / 0.14));
    const cx = odak[0] * W, cy = odak[1] * H;
    const kapla = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    const r = H * ND.r0 * (0.55 + 0.45 * k) * s * s;
    const q = yay(sinirla((p - ND.ac) / (1 - ND.ac)));
    const dolu = r >= kapla;
    const kenar = karistir(stil.palet.vurgu, '#000000', 0.3);
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', clipPath: q > 0 ? `inset(0 0 ${(q * 100).toFixed(3)}% 0)` : undefined }}>
        {dolu ? <AbsoluteFill style={{ background: stil.palet.vurgu }} /> : (
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
            <circle cx={cx} cy={cy} r={r * 1.45} fill="none" stroke={stil.palet.vurgu} strokeWidth={3 * s} opacity={0.75 * k} />
            <circle cx={cx} cy={cy} r={r} fill={stil.palet.vurgu} opacity={sinirla(k * 1.4)} />
          </svg>
        )}
        {q > 0 && q < 1 ? <div style={{ position: 'absolute', left: 0, right: 0, top: (1 - q) * H - 6, height: 6, background: kenar }} /> : null}
      </AbsoluteFill>
    );
  }
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
  if (tip === 'tint-sizinti') {
    // renk tonu rampasi (@diearbeiterjahreyt): kesimde ekran once vurgu2 (soguk), sonra vurgu (sicak) tonuna boyanir, 280 ms
    const a = Math.sin(p * Math.PI);
    const renk = p < 0.5 ? stil.palet.vurgu2 : stil.palet.vurgu;
    return (
      <AbsoluteFill style={{ mixBlendMode: 'color', opacity: Math.min(1, a * 1.4) }}>
        <AbsoluteFill style={{ background: `linear-gradient(${120 + p * 60}deg, ${rgba(stil.palet.vurgu2, 0.95)} ${-40 + p * 80}%, ${rgba(stil.palet.vurgu, 0.95)} ${20 + p * 90}%)` }} />
        <AbsoluteFill style={{ background: rgba(renk, 0.25 * a), mixBlendMode: 'screen' }} />
      </AbsoluteFill>
    );
  }
  if (tip === 'parsomen') {
    // bos sepya parsomen uzerinden cozunme (@BoneWitness-r6y): sahne kagida doner, kagittan yenisi cikar
    const a = Math.sin(p * Math.PI);
    return (
      <AbsoluteFill style={{ opacity: Math.min(1, a * 1.25) }}>
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #e9d8b0 0%, #cdb27c 70%, #9c7c48 100%)' }} />
        <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: 0.55 }}>
          <svg width={W} height={H}><filter id="gc-pars"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={11} /><feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.25  0 0 0 0.9 0" /></filter><rect width={W} height={H} filter="url(#gc-pars)" /></svg>
        </AbsoluteFill>
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
  if (tip === 'renk-bandi') {
    const x = bandKenar(p), poli = (a: number, b: number) => `polygon(${a + EGIM}% 0, ${b + EGIM}% 0, ${b}% 100%, ${a}% 100%)`;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <AbsoluteFill style={{ background: stil.palet.vurgu, clipPath: poli(x - BANT, x) }} />
        <AbsoluteFill style={{ background: stil.palet.vurgu2, clipPath: poli(x + 2, x + 3.5) }} />
        <AbsoluteFill style={{ background: rgba('#000000', 0.25), clipPath: poli(x - BANT, x - BANT + 1.2) }} />
      </AbsoluteFill>
    );
  }
  if (tip === 'zoom-icinden') {
    const a = Math.sin(p * Math.PI);
    return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, transparent 30%, ${rgba('#000000', 0.5 * a)} 100%)`, pointerEvents: 'none' }} />;
  }
  if (tip === 'kareli-kagit') {
    // kareli defter kagidi (@NederlandseAutowereld): ustten kayarak sahneyi orter, ortada kisa durur (kart zemini anı),
    // yukari kayip hafif solarak yeni sahneyi acar. Hucre ~ekran genisliginin %4'u, kenarda yumusak golge.
    const gir = egri('kubik-hizli', sinirla(p / 0.4)), cik = egri('kubik-hizli', sinirla((p - 0.6) / 0.4));
    const y = p < 0.5 ? (gir - 1) * H : -cik * H;
    const kagit = kagitTonu(stil);
    const cizgi = karistir(kagit, karistir(stil.palet.vurgu2, '#000000', 0.3), 0.2);
    const h = Math.round(W * 0.04);
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: y, width: W, height: H, opacity: 1 - 0.45 * cik, background: kagit,
          backgroundImage: `repeating-linear-gradient(0deg, ${cizgi} 0 2px, transparent 2px ${h}px), repeating-linear-gradient(90deg, ${cizgi} 0 2px, transparent 2px ${h}px)`,
          boxShadow: `0 26px 60px ${rgba('#000000', 0.45)}, 0 4px 0 ${rgba('#000000', 0.12)}` }}>
          <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: 0.28 }}>
            <svg width={W} height={H}><filter id="gc-kk"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} /><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0.55 0" /></filter><rect width={W} height={H} filter="url(#gc-kk)" /></svg>
          </AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, transparent 55%, ${rgba('#000000', 0.12)} 100%)` }} />
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'supurme-inset') {
    // supurme sirasinda bosalan sol bolge koyu panelle dolar; on kenarda ince vurgu cizgisi; sonra kisa bos panel
    if (p >= SI.bos) return null;
    const q = egri('ustel-sert', sinirla(p / SI.supur)), x = Math.min(1.05, q * 1.05) * W;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: x, height: H, background: panelTonu(stil) }} />
        {p < SI.supur ? <div style={{ position: 'absolute', left: x - 8, top: 0, width: 8, height: H, background: stil.palet.vurgu }} /> : null}
      </AbsoluteFill>
    );
  }
  if (tip === 'bulanik-hayalet') {
    const a = Math.sin(p * Math.PI);
    return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 35%, ${rgba('#000000', 0.6 * a)} 100%)`, pointerEvents: 'none' }} />;
  }
  if (tip === 'tv-kapanma') {
    const a = Math.max(0, 1 - Math.abs(p - 0.5) * 6);
    return <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - 2, height: 4, background: rgba('#ffffff', a), boxShadow: `0 0 40px ${rgba('#ffffff', a)}` }} />;
  }
  return null;
};

const Sahne: React.FC<{ sure: number; giris?: { tip: GecisTip; d: number }; cikis?: { tip: GecisTip; d: number; odak?: Odak }; stil: Stil; children: React.ReactNode }> = ({ sure, giris, cikis, stil, children }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  let st: React.CSSProperties = {};
  if (giris && giris.d > 0 && f < giris.d) st = { ...st, ...girisStil(giris.tip, f / giris.d, W, stil) };
  if (cikis && cikis.d > 0 && f >= sure - cikis.d) {
    const c = cikisStil(cikis.tip, (f - (sure - cikis.d)) / cikis.d, W, cikis.odak);
    st = { ...st, ...c, transform: [st.transform, c.transform].filter(Boolean).join(' ') || undefined, filter: [st.filter, c.filter].filter(Boolean).join(' ') || undefined };
  }
  return <AbsoluteFill style={{ ...st, overflow: 'hidden' }}>{children}</AbsoluteFill>;
};

/** odak: sahnenin ana nesnesinin kadrajdaki yeri (0..1); nesne-dalisi bu sahneden cikarken oraya dalar (verilmezse ortanin biraz ustu) */
export type DiziSahne = { el: React.ReactNode; sure: number; odak?: [number, number] };
/** yumusak gecis dagilimi (Opus galerisi B-1: uzun videoda tek gecis tipinin tekrari en zayif gorunum):
 *  ayni tip yumusak gecis dizisinde art arda en cok GECIS_ARDISIK kez; tek tipin yumusak gecisler icindeki payi en cok
 *  GECIS_PAY (birden fazla tip varsa; k tipte bu oran 1/k'nin altina inemez -> 3 tipli DNA'da tavan %33). */
export const GECIS_ARDISIK = 2;
export const GECIS_PAY = 0.25;
/** her sinir icin gecis tipi: liste verilirse tohumla dagitilir; 'sert' agirligi = 1 - yumusakOran. Yumusak gecislerde once
 *  bir onceki yumusak tipten farkli olan secilir, ayni tip hic GECIS_ARDISIK'tan fazla art arda gelmez ve kotasini asmaz
 *  (kota = max(taban(GECIS_PAY * yumusak), tavan(yumusak / k))). Deterministik (tohum). */
export const gecisPlani = (n: number, gecis: GecisTip | GecisTip[], tohum = 'g', yumusakOran = 1): GecisTip[] => {
  const r = rastgele(tohum + 'gp');
  const liste = Array.from(new Set(Array.isArray(gecis) ? gecis : [gecis]));
  // 1) sert / yumusak iskeleti (rakibin yumusak orani)
  const yumusak = Array.from({ length: n }, () => r() <= yumusakOran);
  if (liste.length <= 1) return yumusak.map((y) => (y ? liste[0] : 'sert'));
  // 2) yumusak sinirlara tip: ardisik + pay siniri, kalan kotaya gore agirlikli
  const ny = yumusak.filter(Boolean).length;
  // kota: payi GECIS_PAY'i asmayan en buyuk adet; k tip ny gecisi tasiyamiyorsa (k*kota < ny) esit dagilimin tavani
  const kota = Math.max(Math.floor(GECIS_PAY * ny + 1e-9), Math.ceil(ny / liste.length));
  const say: Record<string, number> = {};
  const son: GecisTip[] = [];
  return yumusak.map((y) => {
    if (!y) return 'sert';
    const ardisikDolu = (t: GecisTip) => son.length >= GECIS_ARDISIK && son.slice(-GECIS_ARDISIK).every((x) => x === t);
    const kotada = (t: GecisTip) => (say[t] || 0) < kota;
    let aday = liste.filter((t) => t !== son[son.length - 1] && kotada(t));
    if (!aday.length) aday = liste.filter((t) => !ardisikDolu(t) && kotada(t));
    if (!aday.length) aday = liste.filter((t) => !ardisikDolu(t));
    const w = aday.map((t) => Math.max(0.5, kota - (say[t] || 0)));
    let u = r() * w.reduce((a, b) => a + b, 0), t = aday[aday.length - 1];
    for (let i = 0; i < aday.length; i++) { u -= w[i]; if (u < 0) { t = aday[i]; break; } }
    say[t] = (say[t] || 0) + 1;
    son.push(t);
    return t;
  });
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
          <Sahne stil={stil} sure={s.sure} giris={i > 0 ? { tip: plan[i - 1], d: d(i - 1) } : undefined} cikis={i < plan.length ? { tip: plan[i], d: d(i), odak: s.odak } : undefined}>{s.el}</Sahne>
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
            <UstKatmanSarici tip={t} d={d(i)} stil={stil} odak={sahneler[i].odak} />
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
const UstKatmanSarici: React.FC<{ tip: GecisTip; d: number; stil: Stil; odak?: Odak }> = ({ tip, d, stil, odak }) => {
  const f = useCurrentFrame();
  return <GecisUstKatman tip={tip} p={f / d} stil={stil} odak={odak} />;
};
