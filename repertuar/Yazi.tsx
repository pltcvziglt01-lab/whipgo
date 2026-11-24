import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, egri, ilerle, rastgele, rgba, sinirla } from './temel';

// BASLIK GIRISLERI — klasik Claude = 'asagidan-yay' (opacity + 30px yukari, yumusak yay). Repertuar onu yalniz rakip
// ayni seyi yapmiyorsa ve en fazla 1 eksen olarak kullanir.
export const BASLIK_TIPLERI = [
  'maske-yukari', 'harf-dalga', 'bulaniklik', 'scramble', 'daktilo', 'kutu-acilis', 'dikey-yigin',
  'harf-aralik', 'kontur-dolma', 'olcek-darbe', 'uzun-golge', 'alt-cizgi', 'kutu-vurgu', 'zemin-perspektif', 'asagidan-yay',
] as const;
export type BaslikTip = typeof BASLIK_TIPLERI[number];
export type Konum = 'orta' | 'sol-alt' | 'sol-ust' | 'sol-orta' | 'sag-alt' | 'ust-orta';

const konumStil = (k: Konum): React.CSSProperties => {
  const b: React.CSSProperties = { position: 'absolute', display: 'flex', flexDirection: 'column' };
  switch (k) {
    case 'sol-alt': return { ...b, left: 110, bottom: 120, alignItems: 'flex-start', textAlign: 'left' };
    case 'sol-ust': return { ...b, left: 110, top: 110, alignItems: 'flex-start', textAlign: 'left' };
    case 'sol-orta': return { ...b, left: 140, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'flex-start', textAlign: 'left' };
    case 'sag-alt': return { ...b, right: 110, bottom: 120, alignItems: 'flex-end', textAlign: 'right' };
    case 'ust-orta': return { ...b, left: 0, right: 0, top: 120, alignItems: 'center', textAlign: 'center' };
    default: return { ...b, inset: 0, justifyContent: 'center', alignItems: 'center', textAlign: 'center' };
  }
};

const KARAKTER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$';

export const Baslik: React.FC<{ metin: string; ust?: string; tip: BaslikTip; stil: Stil; konum?: Konum; boyut?: number; gec?: number; renk?: string; maxGenislik?: number }> = ({ metin, ust, tip, stil, konum = 'orta', boyut = 120, gec = 0, renk, maxGenislik = 1500 }) => {
  const f0 = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = f0 - gec;
  const { palet, font, hareket } = stil;
  const m = font.buyukHarf ? metin.toUpperCase() : metin;
  const R = renk || palet.murekkep;
  const temel: React.CSSProperties = { fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: boyut, lineHeight: 1.04, letterSpacing: font.aralik, color: R, maxWidth: maxGenislik, margin: 0 };
  const ustSatir = ust ? (
    <div style={{ fontFamily: font.govde, fontSize: boyut * 0.24, letterSpacing: 3, color: palet.vurgu, textTransform: 'uppercase', marginBottom: boyut * 0.22, opacity: sinirla(f / 10) }}>{ust}</div>
  ) : null;
  const sure = Math.round(fps * 0.7);
  let govde: React.ReactNode;

  switch (tip) {
    case 'maske-yukari': {
      const satirlar = bolSatir(m, Math.max(8, Math.floor(maxGenislik / (boyut * 0.55))));
      govde = satirlar.map((s, i) => {
        const p = ilerle(f, i * 5, sure, hareket);
        return <div key={i} style={{ overflow: 'hidden', paddingBottom: boyut * 0.06 }}><div style={{ ...temel, transform: `translateY(${(1 - p) * 110}%)` }}>{s}</div></div>;
      });
      break;
    }
    case 'harf-dalga':
      govde = <div style={temel}>{m.split('').map((c, i) => {
        const p = ilerle(f, i * 1.6, sure * 0.7, hareket === 'yay-yumusak' ? 'geri-sekme' : hareket);
        return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: sinirla(p * 2), transform: `translateY(${(1 - p) * boyut * 0.5}px) rotate(${(1 - p) * 12}deg)` }}>{c}</span>;
      })}</div>;
      break;
    case 'bulaniklik': {
      const p = ilerle(f, 0, sure * 1.3, hareket);
      govde = <div style={{ ...temel, filter: `blur(${(1 - p) * 26}px)`, opacity: p, transform: `scale(${1.08 - p * 0.08})` }}>{m}</div>;
      break;
    }
    case 'scramble': {
      const r = rastgele(Math.floor(f / 2) + 3);
      govde = <div style={{ ...temel, fontFamily: font.mono, fontWeight: 700, letterSpacing: 2 }}>{m.split('').map((c, i) => {
        const coz = f > 4 + i * 1.3;
        return <span key={i} style={{ color: coz ? R : palet.vurgu, opacity: f > i * 0.6 ? 1 : 0 }}>{c === ' ' ? ' ' : coz ? c : KARAKTER[Math.floor(r() * KARAKTER.length)]}</span>;
      })}</div>;
      break;
    }
    case 'daktilo': {
      const n = Math.floor(Math.max(0, f) / 1.6);
      const imlec = Math.floor(f0 / 15) % 2 === 0;
      govde = <div style={{ ...temel, fontFamily: font.mono, fontWeight: 700 }}>{m.slice(0, n)}<span style={{ opacity: imlec ? 1 : 0, color: palet.vurgu }}>▌</span></div>;
      break;
    }
    case 'kutu-acilis': {
      const p = ilerle(f, 0, sure * 0.8, hareket), q = ilerle(f, sure * 0.5, sure * 0.8, hareket);
      govde = (
        <div style={{ position: 'relative', padding: `${boyut * 0.12}px ${boyut * 0.3}px` }}>
          <div style={{ position: 'absolute', inset: 0, background: palet.vurgu, transform: `scaleX(${p})`, transformOrigin: konum.startsWith('sag') ? 'right' : 'left' }} />
          <div style={{ ...temel, position: 'relative', color: palet.acik ? palet.zemin : palet.zemin, opacity: q, transform: `translateX(${(1 - q) * -20}px)` }}>{m}</div>
        </div>
      );
      break;
    }
    case 'dikey-yigin': {
      const k = m.split(' ');
      govde = k.map((w, i) => {
        const p = ilerle(f, i * 6, sure, hareket);
        const yon = i % 2 === 0 ? -1 : 1;
        return <div key={i} style={{ ...temel, fontSize: boyut * (i === k.length - 1 ? 1.25 : 1), color: i === k.length - 1 ? palet.vurgu : R, transform: `translateX(${yon * (1 - p) * 260}px)`, opacity: sinirla(p * 1.5), lineHeight: 0.95 }}>{w}</div>;
      });
      break;
    }
    case 'harf-aralik': {
      const p = ilerle(f, 0, sure * 1.6, hareket);
      govde = <div style={{ ...temel, letterSpacing: font.aralik + (1 - p) * boyut * 0.5, opacity: p, whiteSpace: 'nowrap' }}>{m}</div>;
      break;
    }
    case 'kontur-dolma': {
      const p = ilerle(f, 0, sure, hareket), q = ilerle(f, sure * 0.8, sure, hareket);
      govde = <div style={{ ...temel, color: rgba(R, q), WebkitTextStroke: `${Math.max(1.5, boyut / 45)}px ${R}`, opacity: sinirla(p * 2), clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{m}</div>;
      break;
    }
    case 'olcek-darbe': {
      const p = ilerle(f, 0, sure * 0.5, 'ustel-sert');
      const sars = f > 0 && f < sure * 0.6 ? Math.sin(f * 2.3) * (1 - p) * 10 : 0;
      govde = <div style={{ ...temel, transform: `scale(${2.2 - p * 1.2}) translateX(${sars}px)`, opacity: sinirla(p * 3) }}>{m}</div>;
      break;
    }
    case 'uzun-golge': {
      const p = ilerle(f, 0, sure * 1.4, hareket);
      const n = Math.round(p * 18);
      const golge = Array.from({ length: n }, (_, i) => `${i + 1}px ${i + 1}px 0 ${palet.vurgu}`).join(',');
      govde = <div style={{ ...temel, textShadow: golge || 'none', opacity: sinirla(p * 3), transform: `translate(${-p * 6}px, ${-p * 6}px)` }}>{m}</div>;
      break;
    }
    case 'alt-cizgi': {
      const p = ilerle(f, 0, sure, hareket), q = ilerle(f, sure * 0.6, sure, hareket);
      govde = (
        <div style={{ display: 'inline-block' }}>
          <div style={{ ...temel, opacity: p }}>{m}</div>
          <div style={{ height: Math.max(6, boyut * 0.07), background: palet.vurgu, marginTop: boyut * 0.08, transform: `scaleX(${q})`, transformOrigin: 'left' }} />
        </div>
      );
      break;
    }
    case 'kutu-vurgu': {
      // agir sans; *isaretli* kelimeler (yoksa son kelime) dolu vurgu kutusunda. Kelimeler sirayla yukari kayar, kutu soldan acilir.
      const ham = metin.split(' ');
      const isaret = ham.some((w) => /^\*.*\*$/.test(w));
      const kel = ham.map((w, i) => ({ w: (font.buyukHarf ? w.toUpperCase() : w).replace(/\*/g, ''), v: isaret ? /^\*.*\*$/.test(w) : i === ham.length - 1 }));
      govde = (
        <div style={{ ...temel, display: 'flex', flexWrap: 'wrap', justifyContent: konum === 'orta' || konum === 'ust-orta' ? 'center' : 'flex-start', columnGap: boyut * 0.24, rowGap: boyut * 0.1 }}>
          {kel.map((k, i) => {
            const p = ilerle(f, i * 3, sure * 0.6, hareket);
            const q = ilerle(f, i * 3 + sure * 0.35, sure * 0.5, 'ustel-sert');
            return (
              <div key={i} style={{ overflow: 'hidden', position: 'relative', padding: k.v ? `0 ${boyut * 0.12}px` : 0 }}>
                {k.v ? <div style={{ position: 'absolute', inset: `${boyut * 0.04}px 0`, background: palet.vurgu, transform: `scaleX(${q})`, transformOrigin: 'left' }} /> : null}
                <div style={{ position: 'relative', transform: `translateY(${(1 - p) * 105}%)`, color: k.v && q > 0.5 ? (palet.acik ? palet.zemin : '#ffffff') : R }}>{k.w}</div>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case 'zemin-perspektif': {
      // sahnenin zeminine yazilmis 3D metin: perspektifte yatar, kamera yukselir (rotateX 72 -> 52), ustunden isik suzulur
      const p = ilerle(f, 0, sure * 2.2, 'kubik-hizli');
      const isik = sinirla((f - sure * 0.4) / (sure * 1.8));
      const parlak = karistirHex(R, '#ffffff', 0.55);
      govde = (
        <div style={{ perspective: boyut * 9, perspectiveOrigin: '50% 0%' }}>
          <div style={{ ...temel, fontSize: boyut * 1.15, whiteSpace: 'nowrap', transform: `rotateX(${72 - 20 * p}deg) translateY(${(1 - p) * boyut * 0.8}px) scale(${0.92 + 0.08 * p})`, transformOrigin: '50% 100%',
            opacity: sinirla(p * 2.5), color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text',
            backgroundImage: `linear-gradient(100deg, ${R} ${isik * 120 - 30}%, ${parlak} ${isik * 120 - 10}%, ${R} ${isik * 120 + 10}%)`,
            filter: `drop-shadow(0 ${boyut * 0.06}px ${boyut * 0.12}px ${rgba('#000', 0.6)}) drop-shadow(0 0 ${boyut * 0.18}px ${rgba(palet.vurgu, 0.35 * isik)})` }}>{m}</div>
        </div>
      );
      break;
    }
    default: { // asagidan-yay (klasik)
      const p = ilerle(f, 0, sure, 'yay-yumusak');
      govde = <div style={{ ...temel, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{m}</div>;
    }
  }
  return <div style={konumStil(konum)}>{ustSatir}{govde}</div>;
};

const karistirHex = (a: string, b: string, t: number) => {
  const c = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((k) => k + k).join('') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = c(a), B = c(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

const bolSatir = (s: string, n: number) => {
  const out: string[] = [];
  let sat = '';
  s.split(' ').forEach((w) => { if ((sat + ' ' + w).trim().length > n && sat) { out.push(sat); sat = w; } else sat = (sat + ' ' + w).trim(); });
  if (sat) out.push(sat);
  return out;
};

// ---------------- ALTYAZI ----------------
export const ALTYAZI_TIPLERI = ['kelime-pop', 'vurgu-kalem', 'kutulu', 'karaoke', 'tek-kelime', 'renkli-aktif', 'sinema'] as const;
export type AltyaziTip = typeof ALTYAZI_TIPLERI[number];
export type Kelime = { k: string; bas: number; son: number }; // saniye

/** kelimeleri sayfalara boler (en cok n kelime / karakter siniri) */
const sayfala = (kel: Kelime[], n: number, maxK = 28) => {
  const s: Kelime[][] = [];
  let c: Kelime[] = [];
  kel.forEach((w) => {
    const uz = c.map((x) => x.k).join(' ').length + w.k.length;
    if (c.length >= n || (uz > maxK && c.length)) { s.push(c); c = []; }
    c.push(w);
  });
  if (c.length) s.push(c);
  return s;
};

export const Altyazi: React.FC<{ kelimeler: Kelime[]; tip: AltyaziTip; stil: Stil; konum?: 'alt' | 'orta' | 'ust-ucte-bir'; boyut?: number }> = ({ kelimeler, tip, stil, konum = 'alt', boyut = 64 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const { palet, font } = stil;
  const n = tip === 'tek-kelime' ? 1 : tip === 'sinema' ? 9 : tip === 'kelime-pop' ? 4 : 5;
  const sayfa = sayfala(kelimeler, n, tip === 'sinema' ? 64 : 28).find((s) => t >= s[0].bas - 0.05 && t <= s[s.length - 1].son + 0.25);
  if (!sayfa) return null;
  const yer: React.CSSProperties = konum === 'orta' ? { alignItems: 'center' } : konum === 'ust-ucte-bir' ? { alignItems: 'flex-start', paddingTop: 300 } : { alignItems: 'flex-end', paddingBottom: 110 };
  const buyuk = font.buyukHarf || tip === 'tek-kelime';
  const metin = (w: string) => (buyuk ? w.toUpperCase() : w);
  const temel: React.CSSProperties = { fontFamily: tip === 'sinema' ? font.govde : font.baslik, fontWeight: tip === 'sinema' ? 500 : Math.max(700, font.baslikAgirlik), fontSize: tip === 'tek-kelime' ? boyut * 2.2 : tip === 'sinema' ? boyut * 0.62 : boyut, lineHeight: 1.15 };
  // altyazi video ustunde durur: palet ne olursa olsun acik yazi + koyu golge (kutulu haric)
  const acikYazi = palet.acik ? palet.zemin : palet.murekkep;
  const golge = `0 3px 0 ${rgba('#000', 0.45)}, 0 0 22px ${rgba('#000', 0.6)}`;

  const kelimeEl = sayfa.map((w, i) => {
    const aktif = t >= w.bas && t < w.son + 0.05;
    const gecti = t >= w.son;
    const pg = sinirla((t - w.bas) / 0.12);
    let st: React.CSSProperties = { display: 'inline-block', margin: `0 ${boyut * 0.14}px`, color: acikYazi, textShadow: golge, position: 'relative' };
    switch (tip) {
      case 'kelime-pop':
        st = { ...st, opacity: t >= w.bas ? 1 : 0, transform: `scale(${t >= w.bas ? 1 + (1 - egri('geri-sekme', pg)) * -0.4 : 0.6})`, color: aktif ? palet.vurgu : acikYazi };
        break;
      case 'vurgu-kalem':
        st = { ...st, color: aktif ? (palet.acik ? palet.murekkep : palet.zemin) : acikYazi, textShadow: aktif ? 'none' : golge, zIndex: 1 };
        break;
      case 'karaoke':
        st = { ...st, color: gecti || aktif ? palet.vurgu : rgba(acikYazi, 0.55) };
        break;
      case 'renkli-aktif':
        st = { ...st, color: aktif ? palet.vurgu : acikYazi, transform: aktif ? `scale(1.18) rotate(-2deg)` : 'none', opacity: t >= w.bas - 0.02 ? 1 : 0.35 };
        break;
      case 'tek-kelime':
        st = { ...st, transform: `scale(${0.85 + egri('ustel-sert', pg) * 0.15})`, color: i % 3 === 2 ? palet.vurgu : acikYazi };
        break;
      case 'kutulu':
        st = { ...st, fontWeight: aktif ? 900 : temel.fontWeight, color: aktif ? palet.vurgu : palet.acik ? palet.zemin : palet.murekkep, textShadow: 'none' };
        break;
    }
    return (
      <span key={i} style={st}>
        {tip === 'vurgu-kalem' && aktif ? <span style={{ position: 'absolute', left: -10, right: -10, top: '12%', bottom: '4%', background: palet.vurgu, zIndex: -1, transform: `scaleX(${egri('kubik-hizli', pg)}) skewX(-8deg)`, transformOrigin: 'left', borderRadius: 4 }} /> : null}
        {tip === 'karaoke' && aktif ? <span style={{ position: 'absolute', left: 0, bottom: -6, height: 5, width: `${sinirla((t - w.bas) / Math.max(0.05, w.son - w.bas)) * 100}%`, background: palet.vurgu }} /> : null}
        {metin(w.k)}
      </span>
    );
  });

  const kutu: React.CSSProperties = tip === 'kutulu'
    ? { background: palet.acik ? rgba(palet.murekkep, 0.92) : rgba(palet.zemin, 0.85), padding: '10px 26px', borderRadius: 8, color: palet.murekkep }
    : tip === 'sinema' ? { background: rgba('#000', 0.0) } : {};
  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', ...yer, pointerEvents: 'none' }}>
      <div style={{ ...temel, ...kutu, maxWidth: 1500, textAlign: 'center', position: 'relative', isolation: 'isolate' }}>
        {kelimeEl}
      </div>
    </AbsoluteFill>
  );
};
