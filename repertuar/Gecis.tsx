import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HareketAd, OKUNUR, Stil, cikisEgri, egri, fbm, karistir, konturGolge, kontrast, metinGenislik, rastgele, rgba, sinirla, yay } from './temel';

// GECISLER — sahneler arasi. GecisliDizi sahneleri ust uste bindirir; gecis tipi tek ya da liste (tohumla dagitilir).
// Iskelet kurali: gecis SURESI rakibin yumusak gecis medyanindan, SIKLIGI rakibin yumusak gecis oranindan gelir (stil_dna.py).
export const GECIS_TIPLERI = [
  'sert', 'cozunme', 'bulaniklik', 'isik-patlamasi', 'glitch-rgb', 'whip-sol', 'whip-yukari', 'kaydirma-itme',
  'maske-daire', 'maske-capraz', 'maske-seritler', 'zoom-darbe', 'film-yanigi', 'kart-cevirme', 'tv-kapanma', 'perde', 'parsomen', 'tint-sizinti', 'renk-bandi', 'zoom-icinden',
  'kareli-kagit', 'supurme-inset', 'bulanik-hayalet',
  // Opus galerisi (envanter/opus-galeri/teknikler.json, 20 video): giden sahnenin nesnesine dalis, rengi yeni sahnenin zemini
  'nesne-dalisi',
  // Opus galerisi 2. tur (isci1; tarifler teknikler.json): her birinin yakin akrabasindan farki tipin yorumunda
  'parcacik-toplanma', 'renk-zemin-kelime-darbesi', 'sayfa-cevirme-golge', 'kolaj-geri-cekilme', 'yirtik-kagit', 'murekkep-duman-ortusu',
  'ekran-icinde-ekran', 'harfe-dalis', 'egik-cift-serit', 'nesneden-daire-tasmasi', 'tunel', 'isik-seridi-supurme', 'piksel-merdiven-silme',
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

const cikisStil = (tip: GecisTip, p: number, W: number, odak: Odak = ODAK, g?: GB): React.CSSProperties => {
  if (tip.startsWith('filmburn')) return {};
  if (g) { const c = galeriCikis(tip, p, { ...g, odak }); if (c) return c; }
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

const girisStil = (tip: GecisTip, p: number, W: number, stil: Stil, g?: GB): React.CSSProperties => {
  if (tip.startsWith('filmburn')) return { opacity: p >= 0.5 ? 1 : 0 };
  if (g) { const c = galeriGiris(tip, p, g); if (c) return c; }
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
const GecisUstKatman: React.FC<{ tip: GecisTip; p: number; stil: Stil; odak?: Odak; ek?: UstEk }> = ({ tip, p, stil, odak = ODAK, ek }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const g2 = GaleriUstKatman({ tip, p, g: { W, H, odak, stil, renk: ek?.renk }, ek });
  if (g2 !== undefined) return g2;
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
    // renk tonu rampasi (@diearbeiterjahreyt): kesimde ekran once soguk ara tona, sonra vurgu (sicak) tonuna boyanir, 280 ms.
    // Tek doygun vurgu (temel.ts): ara ton vurgu2 DEGIL, vurgu2'nin zemin2 ile %65 karisimi (doygunlugu dusuk, kisa: gecisin ilk
    // ~%35'i); ekrani dolduran tek doygun renk vurgu, o da tepede %80 orti ile. screen parlamasi yalniz vurgu fazinda.
    const a = Math.sin(p * Math.PI);
    const ara = karistir(stil.palet.vurgu2, stil.palet.zemin2, 0.65);
    const q = egri('kubik-hizli', sinirla((p - 0.1) / 0.35));
    return (
      <AbsoluteFill style={{ mixBlendMode: 'color', opacity: Math.min(0.8, a * 1.2) }}>
        <AbsoluteFill style={{ background: `linear-gradient(${120 + p * 60}deg, ${rgba(ara, 0.85)} ${-60 + q * 60}%, ${rgba(stil.palet.vurgu, 0.9)} ${-10 + q * 70}%)` }} />
        {q > 0.5 ? <AbsoluteFill style={{ background: rgba(stil.palet.vurgu, 0.18 * a), mixBlendMode: 'screen' }} /> : null}
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

type Uc = { tip: GecisTip; d: number; odak?: Odak; renk?: string };
const Sahne: React.FC<{ sure: number; giris?: Uc; cikis?: Uc; stil: Stil; children: React.ReactNode }> = ({ sure, giris, cikis, stil, children }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  let st: React.CSSProperties = {};
  if (giris && giris.d > 0 && f < giris.d) st = { ...st, ...girisStil(giris.tip, f / giris.d, W, stil, { W, H, stil, odak: giris.odak || ODAK, renk: giris.renk }) };
  if (cikis && cikis.d > 0 && f >= sure - cikis.d) {
    const c = cikisStil(cikis.tip, (f - (sure - cikis.d)) / cikis.d, W, cikis.odak, { W, H, stil, odak: cikis.odak || ODAK, renk: cikis.renk });
    st = { ...st, ...c, transform: [st.transform, c.transform].filter(Boolean).join(' ') || undefined, filter: [st.filter, c.filter].filter(Boolean).join(' ') || undefined };
  }
  return <AbsoluteFill style={{ ...st, overflow: 'hidden' }}>{children}</AbsoluteFill>;
};

/** odak: sahnenin ana nesnesinin kadrajdaki yeri (0..1); nesne-dalisi / harfe-dalis / nesneden-daire-tasmasi bu sahneden cikarken
 *  oraya dalar ya da oradan tasar (verilmezse ortanin biraz ustu). odakRenk: odaktaki nesnenin/harfin rengi (harfe-dalis ekrani bu
 *  renkle doldurur; verilmezse palet murekkebi). kelime: renk-zemin-kelime-darbesi bu sahneden cikarken '|' ile ayrilmis 1-4 kelimeyi
 *  kendi renk zemininde arka arkaya vurur (verilmezse bolum numarasi). */
export type DiziSahne = { el: React.ReactNode; sure: number; odak?: [number, number]; odakRenk?: string; kelime?: string };
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
/** plan verilirse (VideoDna gecisPlaniVideo: efekt butcesi + yumusak gecis araligi) o kullanilir; yoksa gecisPlani */
export const GecisliDizi: React.FC<{ sahneler: DiziSahne[]; gecis: GecisTip | GecisTip[]; kare?: number; stil: Stil; yumusakOran?: number; tohum?: string; zemin?: React.ReactNode; plan?: GecisTip[] }> = ({ sahneler, gecis, kare = 12, stil, yumusakOran = 1, tohum, zemin, plan: verilen }) => {
  const { fps } = useVideoConfig();
  const plan = verilen ?? gecisPlani(sahneler.length - 1, gecis, tohum ?? stil.tohum, yumusakOran);
  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? kare : 0);
  const bas: number[] = [];
  sahneler.forEach((s, i) => bas.push(i === 0 ? 0 : bas[i - 1] + sahneler[i - 1].sure - d(i - 1)));
  return (
    <AbsoluteFill style={{ background: stil.palet.zemin }}>
      {zemin}
      {sahneler.map((s, i) => (
        <Sequence key={i} from={bas[i]} durationInFrames={s.sure} layout="none">
          <Sahne stil={stil} sure={s.sure} giris={i > 0 ? { tip: plan[i - 1], d: d(i - 1), odak: sahneler[i - 1].odak, renk: sahneler[i - 1].odakRenk } : undefined} cikis={i < plan.length ? { tip: plan[i], d: d(i), odak: s.odak, renk: s.odakRenk } : undefined}>{s.el}</Sahne>
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
            <UstKatmanSarici tip={t} d={d(i)} stil={stil} odak={sahneler[i].odak} ek={{ sira: i, kelime: sahneler[i].kelime, renk: sahneler[i].odakRenk, havuz: kolajHavuz(sahneler, i) }} />
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
const UstKatmanSarici: React.FC<{ tip: GecisTip; d: number; stil: Stil; odak?: Odak; ek?: UstEk }> = ({ tip, d, stil, odak, ek }) => {
  const f = useCurrentFrame();
  return <GecisUstKatman tip={tip} p={f / d} stil={stil} odak={odak} ek={ek} />;
};

// ================= GALERI GECISLERI, 2. TUR (Opus galerisi, envanter/opus-galeri/teknikler.json; isci1) =================
// Her tipin repertuardaki en yakin akrabasindan farki tipin basinda yazili. Kurallar: glow / lens flare / gokkusagi yok, yay
// asimi yok (gecisler asimsiz), yazi OKUNUR tabaninda, kenarda siyah bosluk birakilmaz (her faz ya sahneyi ya renk zemini kaplar).
/** gecis baglami: kadraj, odak (giden sahnenin nesnesi), stil, odaktaki nesnenin rengi */
type GB = { W: number; H: number; odak: Odak; stil: Stil; renk?: string };
/** ust katmana GecisliDizi'den gelen ekler: sinir sirasi, kelime(ler), kolaj icin onceki sahneler */
type UstEk = { sira?: number; kelime?: string; renk?: string; havuz?: React.ReactNode[] };
/** kolaj duvari: giden sahneye kadar olan sahneler; 3'ten azsa butun dizi (duvar tek kareyle dolmasin) */
const kolajHavuz = (s: DiziSahne[], i: number) => (i + 1 >= 3 ? s.slice(0, i + 1) : s).map((x) => x.el);
/** ease-in-out (kamera geri cekilme / dalis): yavas kalkar, hizlanir, asimsiz oturur */
const ioEgri = (t: number) => { t = sinirla(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const f1 = (v: number) => v.toFixed(1);
const daireYol = (x: number, y: number, r: number) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
const kaplaR = (W: number, H: number, x: number, y: number) => Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
/** gecis aninda sahnenin arkasinda gorunen koyu zemin (paletten; acik palette murekkebin koyusu) */
const koyuTon = (stil: Stil) => karistir(stil.palet.acik ? stil.palet.murekkep : stil.palet.zemin, '#000000', 0.55);
const iki = (n: number) => String(Math.max(0, n)).padStart(2, '0');

// --- parcacik-toplanma: giden sahne yarim ton noktalarina bolunup ruzgarla dagilir, yeni sahne noktalardan toplanir.
// maske-seritler / piksel'den farki: organik (gurultulu) supurme, noktalar yer degistirir; yalniz enerjik ton (etiket).
const PT = { s: 40, cik: 0.68, gir: 0.22 };
const noktaMaske = (g: GB, q: number, giris: boolean): React.CSSProperties => {
  if (q <= 0) return giris ? { opacity: 0 } : {};
  if (q >= 1) return giris ? {} : { opacity: 0 };
  const { W, H } = g, s = PT.s, R0 = s * 0.74;
  const r = rastgele(g.stil.tohum + 'pt');
  const nx = Math.ceil(W / s), ny = Math.ceil(H / s);
  let d = '';
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * s, y = (j + 0.5) * s, a = r(), b = r();
    const sira = 0.7 * (x / W) + 0.3 * a;
    const u = sinirla((q - sira * 0.55) / 0.45);
    let rr: number, m: number;
    if (!giris) { rr = R0 * (1 - cikisEgri(u, 1.3)); m = u * u * s * (4 + 7 * b); }
    else { const v = egri('kubik-hizli', u); rr = R0 * v; m = -(1 - v) * (1 - v) * s * (4 + 7 * b); }
    if (rr < 0.6) continue;
    d += daireYol(x + m * 0.94, y - m * (0.3 + 0.5 * a), rr);
  }
  return d ? { clipPath: `path('${d}')` } : { opacity: 0 };
};

// --- sayfa-cevirme-golge: yeni sayfa sagdan kayar, sol kenarinda genisligin %3'u yumusak golge; eskisi golgede kararip az geri
// kayar; sayfa oturunca ustte ince cizgi soldan cizilir, sayfa numarasi sayfayla gelir. kaydirma-itme'den farki: golge + editoryal cizgi.
const SC = { gec: 0.5 };
// --- kolaj-geri-cekilme: kamera geri cekilir, sahne onceki sahnelerin kartlarindan olusan duvarin ortasina oturur, duvar noktaya
// kuculur, yeni sahne o noktadan kart olarak buyur. zoom-darbe'den farki: duvar baglami (bolum sonu ozeti).
const KG = { k: 0.3, geri: 0.5, uzak: 0.66, sol: 0.56, gir: 0.62 };
const kgKamera = (p: number) => (p < KG.geri ? Math.exp(Math.log(1 / KG.k) * (1 - ioEgri(p / KG.geri))) : Math.exp(Math.log(0.22) * cikisEgri((p - KG.geri) / (KG.uzak - KG.geri), 1.6)));
const kgAlfa = (p: number) => 1 - sinirla((p - KG.sol) / (KG.uzak - KG.sol));
const KAGIT_KENAR = '#f1ece1';
// --- ekran-icinde-ekran: sahne 0,45'e kuculup koyu zeminde ic ice ince cercevelerden (tunel) olusan cukurun dibine oturur, kosede
// derinlik sayaci artar, yeni sahne ayni cerceveden tam ekrana buyur. supurme-inset'ten farki: cerceve tuneli + derinlik sayaci.
const EE = { s0: 0.45, geri: 0.42, gir: 0.5, ac: 0.6, seviye: [0.93, 0.81, 0.69, 0.57] };
const eeKamera = (p: number) => {
  if (p < EE.geri) return Math.exp(Math.log(1 / EE.s0) * (1 - ioEgri(p / EE.geri)));
  if (p < EE.ac) return 1 + 0.025 * sinirla((p - EE.geri) / (EE.ac - EE.geri));
  return 1.025 * Math.exp(Math.log(1 / (EE.s0 * 1.025)) * ioEgri((p - EE.ac) / (1 - EE.ac)));
};
// --- harfe-dalis: butun kompozisyon secilen harfin govdesine (odak) ~40x dalar (govde ekrani doldurana dek), harfin rengi ekrani doldurur, renk iki kanat olarak yana acilir.
// nesne-dalisi'ndan farki: cizilen dugum yok (harfin kendisine dalinir), renk perdesi yukari degil ortadan yana acilir.
const HD = { dal: 0.56, ac: 0.68, olcek: 42 };
// --- egik-cift-serit: 20 derece egik iki katmanli serit (vurgu ustte, acik tonu bir adim onde) ease-in ile supurur, arkasinda yeni sahne
// koyu acilip aydinlanir. renk-bandi'ndan farki: iki katman, ters egim (20 derece), ease-in, eski sahne itilmez, yeni sahne karanliktan.
const EC = { gen: 44, kay: 7, sup: 0.7 };
// --- nesneden-daire-tasmasi: vurgu rengi daire giden sahnenin nesnesinden (odak) buyuyup koseleri asar, yeni sahne ayni noktadan
// acilan halka icinden cikar. maske-daire'den farki: cikis noktasi nesne, arada duz renk ani, renk halkasi yeni sahneyi cevreler.
const NT = { dol: 0.42, ac: 0.48 };
// --- tunel: koyu zeminde yarim ton noktali halkalar merkezden dalga dalga yayilip tunel olur, kamera dalar, vurgu rengine patlar,
// yeni sahne renk icindeki acilan daireden cikar. zoom-icinden'den farki: halka tuneli + renk patlamasi, bulaniklik yok.
const TN = { patla: 0.56, dolu: 0.72, ac: 0.76, halka: 16 };
// --- isik-seridi-supurme: sahne ust/alt kenarlardan yatay bir isik cizgisine kapanir, cizgi uzerinde parlak bir parca soldan saga
// gecer, yeni sahne ayni cizgiden dikey acilir. tv-kapanma'dan farki: icerik ezilmez (maskeyle kapanir), parlama/glow yok, supurme parcasi.
const IS = { kapa: 0.34, ac: 0.58 };
// --- piksel-merdiven-silme: sahne kosegen merdiven sirasiyla buyuyen kare bloklarla beyaza silinir, bu sirada pikselleserek cozulur;
// yeni sahne ayni merdivenle acilip netlesir. Ailesi glitch: yalniz enerjik tonda (etiket).
const PM = { B: 120, adim: [1, 12, 20, 32, 48] };
const pmBoyut = (q: number) => PM.adim[Math.min(PM.adim.length - 1, Math.floor(sinirla(q) * PM.adim.length))];
const pmYama = (n: number) => Math.min(n, Math.max(4, Math.round(n / 3)));
const pmFiltre = (n: number): React.CSSProperties => (n > 1 ? { filter: `url(#gc-px-${n})` } : {});
// --- yirtik-kagit: yeni sahne yirtik kenarli kagit olarak sagdan kayip eskisini orter; kenarda krem lif seridi ve golge, eski sahne
// sepyaya doner. perde / kaydirma-itme'den farki: duzensiz yirtik kenar, kagit lifi, arsiv tonu.
const YK = { gec: 0.62 };
const yirtikKenar = (g: GB, x0: number) => {
  // kenar noktalari (yukaridan asagi): cok olcekli gurultu, hafif egim
  const { H } = g, n = 46, out: [number, number][] = [];
  const r = rastgele(g.stil.tohum + 'yk');
  for (let k = 0; k <= n; k++) {
    const y = (k / n) * H;
    const jag = fbm(k * 0.21, 3.1, 0.5, 3) * 70 + (r() - 0.5) * 22;
    out.push([x0 + jag + (y / H - 0.5) * 60, y]);
  }
  return out;
};
const ykX = (g: GB, p: number) => g.W + 140 - (g.W + 280) * egri('kubik-hizli', sinirla(p / YK.gec));
// --- murekkep-duman-ortusu: kagit dokulu zemin organik lekelerle eski sahnenin uzerine yayilir, yeni sahne murekkep kenarli
// lekelerden acilir (ortu yumusak duman kenarli, acilis keskin murekkep kenarli). parsomen'den farki: duzensiz leke maskesi
// (cozunme degil), murekkep sacagi.
const MD = { ort: 0.5, ac: 0.38 };
const hashSay = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return h * 0.37; };
/** sacak: ayni lekenin murekkep yayilmasi (kenardan 5-27 px, duzensiz) */
const lekeYol = (g: GB, q: number, tohum: string, merkezler: [number, number, number][], sacak = false) => {
  const { W, H } = g, R = kaplaR(W, H, W / 2, H / 2) * 1.25;
  let d = '';
  merkezler.forEach(([cx, cy, gec], m) => {
    const u = sinirla((q - gec) / (1 - gec));
    if (u <= 0) return;
    const rb = R * egri('kubik-hizli', u) * (0.55 + 0.45 * u);
    const n = 64, z = hashSay(tohum) + m * 7.3;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      let rr = rb * (1 + 0.22 * fbm(Math.cos(a) * 1.6 + z, Math.sin(a) * 1.6, u * 1.5, 3));
      if (sacak) rr += 4 + 24 * Math.max(0, fbm(Math.cos(a) * 5 + z * 2, Math.sin(a) * 5, u * 2, 2) + 0.25) * Math.min(1, u * 6);
      const x = cx * W + Math.cos(a) * rr, y = cy * H + Math.sin(a) * rr;
      d += (k === 0 ? 'M' : 'L') + f1(x) + ' ' + f1(y);
    }
    d += 'Z';
  });
  return d;
};
const MD_ORT: [number, number, number][] = [[0.2, 0.3, 0], [0.78, 0.66, 0.12], [0.55, 0.15, 0.22]];
const MD_AC: [number, number, number][] = [[0.48, 0.5, 0], [0.18, 0.78, 0.2], [0.85, 0.22, 0.3]];
const ecEgim = (W: number, H: number) => (Math.tan((20 * Math.PI) / 180) * H / W) * 100;
/** egik-cift-serit on kenari (ustte, % ekran): ease-in */
const ecKenar = (p: number, W: number, H: number) => { const e = ecEgim(W, H); return -e + (100 + EC.gen + EC.kay + e) * cikisEgri(sinirla(p / EC.sup), 1.7); };

/** giden sahne stili (galeri 2); tip bu turdan degilse null */
const galeriCikis = (tip: GecisTip, p: number, g: GB): React.CSSProperties | null => {
  const { W, odak } = g;
  switch (tip) {
    case 'parcacik-toplanma': return noktaMaske(g, p / PT.cik, false);
    case 'renk-zemin-kelime-darbesi': return {};
    case 'sayfa-cevirme-golge': { const q = egri('kubik-hizli', sinirla(p / SC.gec)); return { transform: `translateX(${f1(-W * 0.12 * q)}px)`, filter: `brightness(${(1 - 0.4 * q).toFixed(3)})` }; }
    case 'kolaj-geri-cekilme': {
      const s = kgKamera(p) * KG.k;
      return { transform: `scale(${s.toFixed(4)})`, outline: `${f1(8 / KG.k)}px solid ${KAGIT_KENAR}`, boxShadow: `0 ${f1(10 / KG.k)}px ${f1(30 / KG.k)}px ${rgba('#000000', 0.45)}`, opacity: kgAlfa(p) };
    }
    case 'ekran-icinde-ekran': return { transform: `scale(${(EE.s0 * eeKamera(p)).toFixed(4)})`, opacity: p < EE.gir + 0.1 ? 1 : 0 };
    case 'harfe-dalis': return { transform: `scale(${(1 + (HD.olcek - 1) * cikisEgri(sinirla(p / HD.dal), 3)).toFixed(4)})`, transformOrigin: `${odak[0] * 100}% ${odak[1] * 100}%`, opacity: p < HD.dal ? 1 : 0 };
    case 'egik-cift-serit': return {};
    case 'nesneden-daire-tasmasi': return {};
    case 'tunel': return { transform: `scale(${(1 + 0.3 * cikisEgri(sinirla(p / TN.patla), 2)).toFixed(4)})` };
    case 'isik-seridi-supurme': { if (p >= IS.kapa) return { opacity: 0 }; const c = cikisEgri(p / IS.kapa, 2) * 50; return { clipPath: `inset(${c.toFixed(2)}% 0 ${c.toFixed(2)}% 0)`, transform: `scaleY(${(1 - (0.12 * c) / 50).toFixed(4)})` }; }
    case 'piksel-merdiven-silme': return p < 0.5 ? pmFiltre(pmBoyut(p / 0.5)) : { opacity: 0 };
    case 'yirtik-kagit': { const q = egri('kubik-hizli', sinirla(p / YK.gec)); return { filter: `sepia(${(0.55 * q).toFixed(3)}) brightness(${(1 - 0.18 * q).toFixed(3)})`, transform: `translateX(${f1(-W * 0.04 * q)}px)` }; }
    case 'murekkep-duman-ortusu': return { filter: `sepia(${(0.4 * sinirla(p / MD.ort)).toFixed(3)})` };
    default: return null;
  }
};

/** gelen sahne stili (galeri 2); g.odak = giden sahnenin odagi */
const galeriGiris = (tip: GecisTip, p: number, g: GB): React.CSSProperties | null => {
  const { W, H, odak } = g;
  switch (tip) {
    case 'parcacik-toplanma': return noktaMaske(g, (p - PT.gir) / (1 - PT.gir), true);
    case 'renk-zemin-kelime-darbesi': return { opacity: 0 };
    case 'sayfa-cevirme-golge': {
      const q = egri('kubik-hizli', sinirla(p / SC.gec));
      return { transform: `translateX(${f1((1 - q) * W * 1.06)}px)`, boxShadow: `${f1(-W * 0.03)}px 0 ${f1(W * 0.035)}px ${rgba('#000000', 0.55)}` };
    }
    case 'kolaj-geri-cekilme': {
      if (p < KG.gir) return { opacity: 0 };
      const q = yay((p - KG.gir) / (1 - KG.gir)), s0 = 0.22 * KG.k * 0.9, s = s0 + (1 - s0) * q;
      return { transform: `scale(${s.toFixed(4)})`, outline: `${f1(8 / s)}px solid ${rgba(KAGIT_KENAR, 1 - q)}`, boxShadow: `0 ${f1(10 / s)}px ${f1(30 / s)}px ${rgba('#000000', 0.45 * (1 - q))}` };
    }
    case 'ekran-icinde-ekran': {
      if (p < EE.gir) return { opacity: 0 };
      const r = egri('kubik-hizli', sinirla((p - EE.gir) / 0.08));
      return { transform: `scale(${(EE.s0 * eeKamera(p)).toFixed(4)})`, clipPath: `inset(0 0 ${((1 - r) * 100).toFixed(2)}% 0)` };
    }
    case 'harfe-dalis': { if (p < HD.ac) return { opacity: 0 }; const q = egri('kubik-hizli', (p - HD.ac) / (1 - HD.ac)); return { transform: `scale(${(1.07 - 0.07 * q).toFixed(4)})` }; }
    case 'egik-cift-serit': {
      const a = ecKenar(p, W, H) - EC.gen - EC.kay, e = ecEgim(W, H);
      const q = egri('kubik-hizli', sinirla((p - 0.55) / 0.45));
      return { clipPath: `polygon(-5% 0, ${a.toFixed(2)}% 0, ${(a + e).toFixed(2)}% 100%, -5% 100%)`, filter: `brightness(${(0.3 + 0.7 * q).toFixed(3)})` };
    }
    case 'nesneden-daire-tasmasi': {
      if (p < NT.ac) return { opacity: 0 };
      const q = egri('kubik-hizli', (p - NT.ac) / (1 - NT.ac)), cx = odak[0] * W, cy = odak[1] * H;
      return { clipPath: `circle(${f1(kaplaR(W, H, cx, cy) * 1.02 * q)}px at ${f1(cx)}px ${f1(cy)}px)`, transform: `scale(${(1.05 - 0.05 * q).toFixed(4)})` };
    }
    case 'tunel': {
      if (p < TN.ac) return { opacity: 0 };
      const q = egri('kubik-hizli', (p - TN.ac) / (1 - TN.ac));
      return { clipPath: `circle(${f1(kaplaR(W, H, W / 2, H / 2) * 1.02 * q)}px at 50% 50%)`, transform: `scale(${(1.12 - 0.12 * q).toFixed(4)})` };
    }
    case 'isik-seridi-supurme': {
      if (p < IS.ac) return { opacity: 0 };
      const q = (1 - egri('kubik-hizli', (p - IS.ac) / (1 - IS.ac))) * 50;
      return { clipPath: `inset(${q.toFixed(2)}% 0 ${q.toFixed(2)}% 0)` };
    }
    case 'piksel-merdiven-silme': return p < 0.5 ? { opacity: 0 } : pmFiltre(pmBoyut(1 - (p - 0.5) / 0.5));
    case 'yirtik-kagit': {
      const k = yirtikKenar(g, ykX(g, p));
      return { clipPath: `polygon(${k.map(([x, y]) => `${f1(x)}px ${f1(y)}px`).join(', ')}, ${W + 400}px ${H}px, ${W + 400}px 0px)` };
    }
    case 'murekkep-duman-ortusu': {
      const q = (p - MD.ac) / (1 - MD.ac);
      if (q <= 0) return { opacity: 0 };
      if (q >= 1) return {};
      return { clipPath: `path('${lekeYol(g, q, g.stil.tohum + 'ac', MD_AC)}')` };
    }
    default: return null;
  }
};

/** ust katman (galeri 2): tip bu turdan degilse undefined */
const GaleriUstKatman = ({ tip, p, g, ek }: { tip: GecisTip; p: number; g: GB; ek?: UstEk }): React.ReactElement | null | undefined => {
  const { W, H, stil, odak } = g;
  const pl = stil.palet;
  switch (tip) {
    case 'parcacik-toplanma': return null;
    case 'renk-zemin-kelime-darbesi': return <KelimeDarbesi p={p} stil={stil} kelime={ek?.kelime} sira={ek?.sira ?? 0} />;
    case 'sayfa-cevirme-golge': {
      const q = egri('kubik-hizli', sinirla(p / SC.gec)), x = (1 - q) * W * 1.06;
      const c = egri('kubik-hizli', sinirla((p - SC.gec - 0.04) / 0.3));
      const a = 1 - sinirla((p - 0.9) / 0.1);
      const kenar = karistir('#ffffff', pl.zemin, 0.25);
      return (
        <AbsoluteFill style={{ pointerEvents: 'none', opacity: a }}>
          {q < 1 ? <div style={{ position: 'absolute', left: x, top: 0, width: 3, height: H, background: rgba(kenar, 0.85) }} /> : null}
          <div style={{ position: 'absolute', left: x + 100, top: 104, width: (W - 200) * c, height: 3, background: '#ffffff', boxShadow: `0 1px 4px ${rgba('#000000', 0.6)}` }} />
          <div style={{ position: 'absolute', left: x + W - 100, top: 46, transform: 'translateX(-100%)', font: `700 ${OKUNUR.enaz + 4}px ${stil.font.mono}`, color: '#ffffff', letterSpacing: 1, textShadow: konturGolge(2.5) }}>p.{iki((ek?.sira ?? 0) + 2)}</div>
        </AbsoluteFill>
      );
    }
    case 'kolaj-geri-cekilme': return <KolajDuvar p={p} g={g} havuz={ek?.havuz || []} />;
    case 'ekran-icinde-ekran': {
      const cam = eeKamera(p), s = EE.s0 * cam;
      if (s >= 1) return null;
      const w = W * s, h = H * s, x0 = (W - w) / 2, y0 = (H - h) / 2;
      const gor = sinirla((1 - s) / 0.18);
      const acik = karistir('#ffffff', pl.vurgu, 0.3);
      const rol = egri('kubik-hizli', sinirla((p - 0.44) / 0.12));
      const sayac = (sira: number) => <div style={{ height: 52, font: `700 ${OKUNUR.ikincil + 4}px ${stil.font.mono}`, lineHeight: '52px', color: acik, letterSpacing: 2 }}>{iki(sira)}</div>;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
            <path d={`M0 0H${W}V${H}H0Z M${f1(x0)} ${f1(y0)}h${f1(w)}v${f1(h)}h${f1(-w)}Z`} fill={koyuTon(stil)} fillRule="evenodd" />
            {[[0, 0, x0, y0], [W, 0, x0 + w, y0], [0, H, x0, y0 + h], [W, H, x0 + w, y0 + h]].map(([a, b, c2, d2], i) => <line key={i} x1={a} y1={b} x2={c2} y2={d2} stroke={rgba(acik, 0.35)} strokeWidth={2} />)}
            {EE.seviye.map((lv, i) => { const ww = W * lv * cam, hh = H * lv * cam; return ww > W * 1.02 ? null : <rect key={i} x={(W - ww) / 2} y={(H - hh) / 2} width={ww} height={hh} fill="none" stroke={i % 2 ? rgba(acik, 0.55) : pl.vurgu} strokeWidth={3} />; })}
            <rect x={x0 - 1.5} y={y0 - 1.5} width={w + 3} height={h + 3} fill="none" stroke={pl.vurgu} strokeWidth={3} />
          </svg>
          <div style={{ position: 'absolute', left: 100, top: 70, height: 52, overflow: 'hidden', width: 140, opacity: gor }}>
            <div style={{ transform: `translateY(${f1(-52 * rol)}px)` }}>{sayac((ek?.sira ?? 0) + 1)}{sayac((ek?.sira ?? 0) + 2)}</div>
          </div>
        </AbsoluteFill>
      );
    }
    case 'harfe-dalis': {
      if (p < HD.dal) return null;
      const renk = g.renk || pl.murekkep;
      const q = cikisEgri(sinirla((p - HD.ac) / (1 - HD.ac)), 1.6);
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: W / 2 + 1, height: H, background: renk, transform: `translateX(${f1(-q * W * 0.52)}px)` }} />
          <div style={{ position: 'absolute', left: W / 2, top: 0, width: W / 2, height: H, background: renk, transform: `translateX(${f1(q * W * 0.52)}px)` }} />
        </AbsoluteFill>
      );
    }
    case 'egik-cift-serit': {
      const x = ecKenar(p, W, H), e = ecEgim(W, H);
      const poli = (a: number, b: number) => `polygon(${a.toFixed(2)}% 0, ${b.toFixed(2)}% 0, ${(b + e).toFixed(2)}% 100%, ${(a + e).toFixed(2)}% 100%)`;
      const alt = karistir(pl.vurgu, '#ffffff', 0.42);
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <AbsoluteFill style={{ background: alt, clipPath: poli(x - EC.gen, x) }} />
          <AbsoluteFill style={{ background: pl.vurgu, clipPath: poli(x - EC.gen - EC.kay, x - EC.kay) }} />
          <AbsoluteFill style={{ background: rgba('#000000', 0.28), clipPath: poli(x - EC.gen - EC.kay, x - EC.gen - EC.kay + 0.9) }} />
        </AbsoluteFill>
      );
    }
    case 'nesneden-daire-tasmasi': {
      const cx = odak[0] * W, cy = odak[1] * H, R = kaplaR(W, H, cx, cy) * 1.02, r0 = H * 0.035;
      const r1 = r0 + (R - r0) * egri('kubik-hizli', sinirla(p / NT.dol));
      const r2 = p < NT.ac ? 0 : R * egri('kubik-hizli', (p - NT.ac) / (1 - NT.ac));
      if (r2 >= R - 0.5) return null;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <svg width={W} height={H}><path d={daireYol(cx, cy, r1) + (r2 > 0.5 ? daireYol(cx, cy, r2) : '')} fill={pl.vurgu} fillRule="evenodd" opacity={sinirla(p / 0.05)} /></svg>
        </AbsoluteFill>
      );
    }
    case 'tunel': return <Tunel p={p} g={g} />;
    case 'isik-seridi-supurme': {
      const isik = karistir('#ffffff', pl.vurgu, 0.22);
      const h = p < IS.kapa ? H * (1 - cikisEgri(p / IS.kapa, 2)) : p < IS.ac ? 0 : H * egri('kubik-hizli', (p - IS.ac) / (1 - IS.ac));
      const ac = p >= IS.ac ? egri('kubik-hizli', (p - IS.ac) / (1 - IS.ac)) : 0;
      const ka = p < IS.kapa ? sinirla(cikisEgri(p / IS.kapa, 2) * 4) : 1 - ac;
      const sp = sinirla((p - 0.26) / 0.36), sx = -0.25 * W + sp * 1.25 * W;
      const y1 = (H - h) / 2, y2 = (H + h) / 2;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: y1, background: koyuTon(stil) }} />
          <div style={{ position: 'absolute', left: 0, top: y2, width: W, height: H - y2, background: koyuTon(stil) }} />
          {h < 4 ? <div style={{ position: 'absolute', left: 0, top: H / 2 - 2, width: W, height: 4, background: isik }} /> : (<>
            <div style={{ position: 'absolute', left: 0, top: y1 - 2, width: W, height: 3, background: rgba(isik, ka) }} />
            <div style={{ position: 'absolute', left: 0, top: y2 - 1, width: W, height: 3, background: rgba(isik, ka) }} />
          </>)}
          {sp > 0 && sp < 1 ? <div style={{ position: 'absolute', left: sx, top: H / 2 - 3, width: W * 0.25, height: 6, background: `linear-gradient(90deg, ${rgba('#ffffff', 0)}, #ffffff 70%, ${rgba('#ffffff', 0)})` }} /> : null}
        </AbsoluteFill>
      );
    }
    case 'piksel-merdiven-silme': {
      const nx = Math.ceil(W / PM.B), ny = Math.ceil(H / PM.B), B = PM.B;
      const q = p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
      const beyaz = karistir('#ffffff', pl.zemin, 0.08);
      const rects: React.ReactNode[] = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const o = (i + j) / (nx + ny - 2);
        const v = Math.ceil(sinirla((q - o * 0.55) / 0.45) * 4) / 4;
        const b = B * (p < 0.5 ? v : 1 - v);
        if (b <= 0) continue;
        rects.push(<rect key={i + '-' + j} x={i * B + (B - b) / 2} y={j * B + (B - b) / 2} width={b + 0.5} height={b + 0.5} fill={beyaz} />);
      }
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
            <defs>{PM.adim.filter((n) => n > 1).map((n) => (
              <filter key={n} id={`gc-px-${n}`} x={0} y={0} width={1} height={1} colorInterpolationFilters="sRGB">
                {/* ornekleme yamasi >= 4 birim: olceklenmis kapta (katalog izgarasi) 1 birimlik yama alt piksele dusup sahneyi yok ediyordu */}
                <feFlood x={(n - pmYama(n)) / 2} y={(n - pmYama(n)) / 2} width={pmYama(n)} height={pmYama(n)} floodColor="#000" />
                <feComposite width={n} height={n} />
                <feTile result="a" />
                <feComposite in="SourceGraphic" in2="a" operator="in" />
                <feMorphology operator="dilate" radius={(n - pmYama(n)) / 2} />
              </filter>
            ))}</defs>
            {rects}
          </svg>
        </AbsoluteFill>
      );
    }
    case 'yirtik-kagit': {
      const x = ykX(g, p);
      if (x <= -130) return null;
      const k = yirtikKenar(g, x);
      const r = rastgele(stil.tohum + 'ykl');
      // lif seridi: kenarin 6-20 px solunda duzensiz krem serit (yirtik kagidin beyaz ici)
      const lif = k.map(([kx, ky]) => [kx - 6 - r() * 14, ky] as [number, number]).reverse();
      const pts = [...k, ...lif].map(([a, b]) => `${f1(a)},${f1(b)}`).join(' ');
      const krem = karistir('#f4ecd8', pl.zemin, 0.12);
      return (
        <AbsoluteFill style={{ pointerEvents: 'none', filter: `drop-shadow(-10px 0 12px ${rgba('#000000', 0.45)})` }}>
          <svg width={W} height={H}><polygon points={pts} fill={krem} /></svg>
        </AbsoluteFill>
      );
    }
    case 'murekkep-duman-ortusu': {
      const qo = sinirla(p / MD.ort), qa = (p - MD.ac) / (1 - MD.ac);
      if (qa >= 1) return null;
      const id = `gc-md-${stil.tohum.replace(/[^a-z0-9]/gi, '')}`;
      const kagit = karistir('#e9dfc8', pl.zemin, 0.15), murekkep = karistir(pl.murekkep, '#000000', pl.acik ? 0.2 : 0.75);
      const ort = lekeYol(g, qo, stil.tohum + 'or', MD_ORT);
      const acY = qa > 0 ? lekeYol(g, qa, stil.tohum + 'ac', MD_AC) : '';
      const sacak = qa > 0 ? lekeYol(g, qa, stil.tohum + 'ac', MD_AC, true) : '';
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <svg width={W} height={H}>
            <defs>
              <filter id={id + 'y'} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={16} /></filter>
              <filter id={id + 'd'}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.5 0" /><feComposite in2="SourceGraphic" operator="in" /></filter>
              <mask id={id + 'm'}><rect width={W} height={H} fill="#fff" />{acY ? <path d={acY} fill="#000" /> : null}</mask>
            </defs>
            <g mask={`url(#${id}m)`}>
              {/* ortu: duman gibi yumusak kenarli kagit; acilis: keskin murekkep kenari */}
              {ort ? <g filter={qo < 1 ? `url(#${id}y)` : undefined}><path d={ort} fill={kagit} /><path d={ort} fill="#000" filter={`url(#${id}d)`} opacity={0.5} /></g> : null}
              {sacak ? <path d={sacak} fill={murekkep} opacity={0.82} /> : null}
            </g>
          </svg>
        </AbsoluteFill>
      );
    }
    default: return undefined;
  }
};

/** renk-zemin-kelime-darbesi: her kelime kendi duz renk zemininde sert kesimle; kutu / koseli parantez / italik donusumlu */
const KelimeDarbesi: React.FC<{ p: number; stil: Stil; kelime?: string; sira: number }> = ({ p, stil, kelime, sira }) => {
  const { height: H } = useVideoConfig();
  const pl = stil.palet, fn = stil.font;
  const kel = (kelime || '').split('|').map((x) => x.trim()).filter(Boolean).slice(0, 4);
  const liste = kel.length ? kel : ['', '', iki(sira + 2)];
  const n = liste.length, k = Math.min(n - 1, Math.floor(p * n)), t = p * n - k;
  const zeminler = [pl.vurgu, karistir(pl.acik ? pl.murekkep : pl.zemin, '#000000', 0.6), '#efe7d6'];
  const z = zeminler[(k + sira) % 3];
  const yazi = kontrast(z, '#ffffff') >= kontrast(z, '#141414') ? '#ffffff' : '#141414';
  const w = fn.buyukHarf ? liste[k].toUpperCase() : liste[k];
  const tur = (k + sira) % 3;
  const b0 = 220, boyut = Math.max(OKUNUR.ana, Math.min(b0, (b0 * 1350) / Math.max(1, metinGenislik(w, b0, fn.baslik, fn.aralik))));
  const gir = egri('kubik-hizli', sinirla(t / 0.35));
  const vurguYazi = z === pl.vurgu ? yazi : pl.vurgu;
  const harf: React.CSSProperties = { fontFamily: fn.baslik, fontWeight: fn.baslikAgirlik, fontStyle: tur === 2 ? 'italic' : 'normal', fontSize: boyut, letterSpacing: fn.aralik, lineHeight: 1, whiteSpace: 'nowrap' };
  let ic: React.ReactNode = null;
  if (w) {
    if (tur === 0) ic = (
      <div style={{ position: 'relative', padding: `${f1(boyut * 0.1)}px ${f1(boyut * 0.22)}px` }}>
        <div style={{ position: 'absolute', inset: 0, background: yazi, transform: `scaleX(${gir.toFixed(3)})`, transformOrigin: '0 50%' }} />
        <div style={{ ...harf, position: 'relative', color: z, clipPath: `inset(0 ${((1 - gir) * 100).toFixed(1)}% 0 0)` }}>{w}</div>
      </div>
    );
    else if (tur === 1) ic = (
      <div style={{ display: 'flex', alignItems: 'center', gap: boyut * 0.12 }}>
        <span style={{ ...harf, color: vurguYazi, transform: `translateX(${f1(-40 * (1 - gir))}px)` }}>[</span>
        <span style={{ ...harf, color: yazi }}>{w}</span>
        <span style={{ ...harf, color: vurguYazi, transform: `translateX(${f1(40 * (1 - gir))}px)` }}>]</span>
      </div>
    );
    else ic = <div style={{ ...harf, color: yazi, transform: `translateX(${f1(30 * (1 - gir))}px)` }}>{w}</div>;
  }
  const s = 1.035 - 0.035 * yay(sinirla(t / 0.5));
  return (
    <AbsoluteFill style={{ background: z, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ transform: `scale(${s.toFixed(4)})` }}>{ic}</div>
      <AbsoluteFill style={{ boxShadow: `inset 0 0 ${f1(H * 0.25)}px ${rgba('#000000', 0.12)}` }} />
    </AbsoluteFill>
  );
};

/** kolaj duvari: onceki sahnelerin donmus kartlari (Freeze), ortadaki bos yuvaya giden sahne oturur */
const KolajDuvar: React.FC<{ p: number; g: GB; havuz: React.ReactNode[] }> = ({ p, g, havuz }) => {
  const { W, H, stil } = g;
  const a = kgAlfa(p);
  if (a <= 0 || !havuz.length) return null;
  const C = kgKamera(p), k = KG.k, cw = W * k, ch = H * k, gx = cw + W * 0.03, gy = ch + H * 0.04;
  const r = rastgele(stil.tohum + 'kg');
  const kart: React.ReactNode[] = [];
  let n = 0;
  for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) {
    const rot = (r() * 2 - 1) * 3, ox = (r() * 2 - 1) * W * 0.01, oy = (r() * 2 - 1) * H * 0.012, ton = r();
    if (i === 0 && j === 0) continue;
    const x = i * gx + ox, y = j * gy + oy;
    const el = havuz[n++ % havuz.length];
    // ekrana dusmeyen kart cizilmez
    if (Math.abs(x * C) - (cw * C) / 2 > W / 2 + 20 || Math.abs(y * C) - (ch * C) / 2 > H / 2 + 20) continue;
    kart.push(
      <div key={i + ':' + j} style={{ position: 'absolute', left: x - cw / 2, top: y - ch / 2, width: cw, height: ch, transform: `rotate(${rot.toFixed(2)}deg)`, outline: `8px solid ${KAGIT_KENAR}`, boxShadow: `0 10px 30px ${rgba('#000000', 0.45)}`, overflow: 'hidden', background: koyuTon(stil), filter: `saturate(${(0.75 + 0.25 * ton).toFixed(2)}) brightness(${(0.82 + 0.12 * ton).toFixed(2)})` }}>
        <div style={{ width: W, height: H, transform: `scale(${k})`, transformOrigin: '0 0', position: 'relative' }}><Freeze frame={24}>{el}</Freeze></div>
      </div>,
    );
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: a }}>
      <div style={{ position: 'absolute', left: W / 2, top: H / 2, transform: `scale(${C.toFixed(4)})`, transformOrigin: '0 0' }}>{kart}</div>
    </AbsoluteFill>
  );
};

/** tunel: yarim ton noktali halkalar merkezden yayilir (perspektif: disa dogru nokta buyur), vurgu rengine patlar */
const Tunel: React.FC<{ p: number; g: GB }> = ({ p, g }) => {
  const { W, H, stil } = g;
  const pl = stil.palet, cx = W / 2, cy = H / 2, R = kaplaR(W, H, cx, cy) * 1.02;
  const zemin = egri('kubik-hizli', sinirla(p / 0.3));
  const acik = karistir('#ffffff', pl.vurgu, 0.35);
  const rp = p < TN.patla ? 0 : R * cikisEgri(sinirla((p - TN.patla) / (TN.dolu - TN.patla)), 1.8);
  const r2 = p < TN.ac ? 0 : R * egri('kubik-hizli', (p - TN.ac) / (1 - TN.ac));
  if (r2 >= R - 0.5) return null;
  const noktalar: React.ReactNode[] = [];
  if (rp < R) {
    for (let j = 0; j < TN.halka; j++) {
      const t = p + 0.14 - j * 0.042;
      if (t <= 0) continue;
      const rr = 16 * Math.exp(6.2 * t + 3.5 * t * t);
      if (rr > R * 1.05 || rr < 24) continue;
      const m = Math.max(12, Math.min(220, Math.round((2 * Math.PI * rr) / (9 + rr * 0.032))));
      const rd = 1.8 + rr * 0.0145, faz = j * 0.37;
      const renk = j % 2 ? pl.vurgu : acik;
      for (let i = 0; i < m; i++) {
        const a = (i / m) * Math.PI * 2 + faz;
        noktalar.push(<circle key={j + '-' + i} cx={cx + Math.cos(a) * rr} cy={cy + Math.sin(a) * rr} r={rd} fill={renk} />);
      }
    }
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H}>
        {rp < R ? <rect width={W} height={H} fill={koyuTon(stil)} opacity={zemin} /> : null}
        {noktalar}
        {rp > 0.5 ? <path d={(rp >= R ? `M0 0H${W}V${H}H0Z` : daireYol(cx, cy, rp)) + (r2 > 0.5 ? daireYol(cx, cy, r2) : '')} fill={pl.vurgu} fillRule="evenodd" /> : null}
      </svg>
    </AbsoluteFill>
  );
};
