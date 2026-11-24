import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stil, egri, ilerle, rgba, sinirla } from './temel';

// KARTLAR — saydam katmanlardir; arkalarina Arkaplan ya da Medya konur. Her kartin birden cok tasarim varyanti var;
// stil_dna kanal basina her kart turu icin BIR varyant kilitler (kanal imzasi), rakibinkinden farkli olani.

// ---------- ALT BANT (isim / yer / tarih etiketi) ----------
export const ALTBANT_TIPLERI = ['cizgi-acilis', 'blok-kayma', 'cip-etiket', 'koseli-parantez', 'cam-panel'] as const;
export type AltBantTip = typeof ALTBANT_TIPLERI[number];
/** medyaUstu (varsayilan): video/foto ustunde -> acik yazi + golge; false: Arkaplan ustunde -> palet murekkebi */
export const AltBant: React.FC<{ tip: AltBantTip; ust: string; alt?: string; stil: Stil; sag?: boolean; medyaUstu?: boolean }> = ({ tip, ust, alt, stil, sag, medyaUstu = true }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = ilerle(f, 0, fps * 0.6, hareket), q = ilerle(f, fps * 0.25, fps * 0.6, hareket);
  const U = font.buyukHarf ? ust.toUpperCase() : ust;
  const yer: React.CSSProperties = { position: 'absolute', bottom: 110, ...(sag ? { right: 100, textAlign: 'right' } : { left: 100 }) };
  const yaziR = medyaUstu ? (palet.acik ? palet.zemin : palet.murekkep) : palet.murekkep;
  const glg = medyaUstu ? `0 2px 0 ${rgba('#000', 0.4)}, 0 0 18px ${rgba('#000', 0.65)}` : 'none';
  const ustSt: React.CSSProperties = { fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 52, color: yaziR, letterSpacing: font.aralik, textShadow: glg };
  const altSt: React.CSSProperties = { fontFamily: font.govde, fontSize: 30, color: medyaUstu ? rgba(yaziR, 0.85) : palet.soluk, marginTop: 6, textShadow: glg };
  switch (tip) {
    case 'cizgi-acilis':
      return (
        <div style={yer}>
          <div style={{ height: 4, width: 90 * p, background: palet.vurgu, marginBottom: 16, marginLeft: sag ? 'auto' : 0 }} />
          <div style={{ overflow: 'hidden' }}><div style={{ ...ustSt, transform: `translateY(${(1 - q) * 100}%)` }}>{U}</div></div>
          {alt ? <div style={{ ...altSt, opacity: q }}>{alt}</div> : null}
        </div>
      );
    case 'blok-kayma':
      return (
        <div style={yer}>
          <div style={{ display: 'inline-block', background: palet.vurgu, padding: '10px 24px', transform: `translateX(${(1 - p) * (sag ? 120 : -120)}%)` }}><div style={{ ...ustSt, color: palet.zemin, textShadow: 'none' }}>{U}</div></div>
          {alt ? <div><div style={{ display: 'inline-block', background: palet.zemin, padding: '6px 24px', transform: `translateX(${(1 - q) * (sag ? 140 : -140)}%)` }}><div style={{ ...altSt, marginTop: 0, color: palet.murekkep, textShadow: 'none' }}>{alt}</div></div></div> : null}
        </div>
      );
    case 'cip-etiket':
      return (
        <div style={{ ...yer, display: 'flex', alignItems: 'center', gap: 14, opacity: p, transform: `scale(${0.9 + 0.1 * p})`, transformOrigin: sag ? 'right' : 'left' }}>
          <div style={{ background: palet.murekkep, color: palet.zemin, borderRadius: 999, padding: '10px 26px', fontFamily: font.govde, fontWeight: 700, fontSize: 32 }}>{U}</div>
          {alt ? <div style={{ background: rgba(palet.zemin, 0.85), color: palet.murekkep, borderRadius: 999, padding: '10px 22px', fontFamily: font.govde, fontSize: 26, opacity: q }}>{alt}</div> : null}
        </div>
      );
    case 'koseli-parantez': {
      const k = 26, c = `4px solid ${palet.vurgu}`;
      return (
        <div style={{ ...yer, padding: '18px 30px' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: k, height: k, borderLeft: c, borderTop: c, transform: `translate(${(1 - p) * 40}px, ${(1 - p) * 20}px)` }} />
          <div style={{ position: 'absolute', right: 0, bottom: 0, width: k, height: k, borderRight: c, borderBottom: c, transform: `translate(${(1 - p) * -40}px, ${(1 - p) * -20}px)` }} />
          <div style={{ ...ustSt, fontFamily: font.mono, fontSize: 44, opacity: q }}>{U}</div>
          {alt ? <div style={{ ...altSt, fontFamily: font.mono, opacity: q }}>{alt}</div> : null}
        </div>
      );
    }
    case 'cam-panel':
      return (
        <div style={{ ...yer, background: rgba(palet.zemin, 0.42), backdropFilter: 'blur(18px)', border: `1px solid ${rgba(palet.murekkep, 0.25)}`, borderRadius: 22, padding: '20px 32px', opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
          <div style={{ ...ustSt, color: palet.murekkep, textShadow: 'none' }}>{U}</div>
          {alt ? <div style={{ ...altSt, color: palet.soluk, textShadow: 'none' }}>{alt}</div> : null}
        </div>
      );
  }
  return null;
};

// ---------- SAYI KARTI ----------
export const SAYI_TIPLERI = ['sayac', 'rulo', 'halka', 'cubuk'] as const;
export type SayiTip = typeof SAYI_TIPLERI[number];
export const SayiKarti: React.FC<{ tip: SayiTip; deger: number; onEk?: string; sonEk?: string; ust?: string; alt?: string; yuzde?: number; stil: Stil }> = ({ tip, deger, onEk = '', sonEk = '', ust, alt, yuzde, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = egri('kubik-hizli', sinirla(f / (fps * 1.1)));
  const g = ilerle(f, 0, fps * 0.5, hareket);
  const ustEl = ust ? <div style={{ fontFamily: font.govde, fontSize: 40, color: palet.soluk, marginBottom: 10, opacity: g }}>{ust}</div> : null;
  const altEl = alt ? <div style={{ fontFamily: font.govde, fontSize: 38, color: palet.murekkep, marginTop: 18, maxWidth: 1100, textAlign: 'center', opacity: g }}>{alt}</div> : null;
  const yaz = (v: number) => onEk + Math.round(v).toLocaleString('en-US') + sonEk;
  const buyuk: React.CSSProperties = { fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 230, color: palet.vurgu, lineHeight: 1, letterSpacing: font.aralik, fontVariantNumeric: 'tabular-nums' };
  let govde: React.ReactNode;
  switch (tip) {
    case 'rulo': {
      const s = yaz(deger);
      govde = <div style={{ display: 'flex', ...buyuk }}>{s.split('').map((c, i) => {
        if (!/[0-9]/.test(c)) return <span key={i}>{c}</span>;
        const d = +c, q = ilerle(f, i * 3, fps * 1.0, 'kubik-hizli');
        const kay = (d + 10 * 2) * q;
        return <div key={i} style={{ height: '1em', overflow: 'hidden' }}><div style={{ transform: `translateY(${-kay}em)` }}>{Array.from({ length: 31 }, (_, k) => <div key={k} style={{ height: '1em' }}>{k % 10}</div>)}</div></div>;
      })}</div>;
      break;
    }
    case 'halka': {
      const y = yuzde ?? 0.7, R = 200, C = 2 * Math.PI * R;
      govde = (
        <div style={{ position: 'relative', width: 520, height: 520 }}>
          <svg width={520} height={520} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={260} cy={260} r={R} fill="none" stroke={rgba(palet.murekkep, 0.12)} strokeWidth={34} />
            <circle cx={260} cy={260} r={R} fill="none" stroke={palet.vurgu} strokeWidth={34} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - y * p)} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...buyuk, fontSize: 130, color: palet.murekkep }}>{yaz(deger * p)}</div>
        </div>
      );
      break;
    }
    case 'cubuk': {
      const y = yuzde ?? 0.7;
      govde = (
        <div style={{ width: 1200 }}>
          <div style={{ ...buyuk, fontSize: 170, textAlign: 'left' }}>{yaz(deger * p)}</div>
          <div style={{ height: 40, background: rgba(palet.murekkep, 0.12), marginTop: 20, borderRadius: 6, overflow: 'hidden' }}><div style={{ height: '100%', width: `${y * p * 100}%`, background: palet.vurgu }} /></div>
        </div>
      );
      break;
    }
    default:
      govde = <div style={buyuk}>{yaz(deger * p)}</div>;
  }
  return <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>{ustEl}{govde}{altEl}</AbsoluteFill>;
};

// ---------- ALINTI ----------
export const ALINTI_TIPLERI = ['buyuk-tirnak', 'kagit-not', 'daktilo-belge'] as const;
export type AlintiTip = typeof ALINTI_TIPLERI[number];
export const Alinti: React.FC<{ tip: AlintiTip; metin: string; kim?: string; stil: Stil }> = ({ tip, metin, kim, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = ilerle(f, 0, fps * 0.7, hareket);
  if (tip === 'kagit-not') {
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1100, background: '#fdf6d8', padding: '70px 80px', transform: `rotate(${-2 + p * 1}deg) translateY(${(1 - p) * 60}px)`, opacity: sinirla(p * 2), boxShadow: `0 30px 80px ${rgba('#000', 0.35)}`, backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 58px, rgba(70,110,180,.25) 58px 60px)' }}>
          <div style={{ fontFamily: font.govde, fontSize: 50, color: '#2a2a2a', lineHeight: 1.2 }}>{metin}</div>
          {kim ? <div style={{ fontFamily: font.mono, fontSize: 30, color: '#6a6a6a', marginTop: 30 }}>— {kim}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'daktilo-belge') {
    const n = Math.floor(Math.max(0, f - 8) / 1.3);
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1200, background: '#f3efe6', padding: '60px 80px', boxShadow: `0 30px 80px ${rgba('#000', 0.35)}`, opacity: p }}>
          <div style={{ fontFamily: font.mono, fontSize: 24, color: '#8a2b1d', letterSpacing: 4, marginBottom: 26 }}>{kim ? kim.toUpperCase() : 'KAYIT'}</div>
          <div style={{ fontFamily: font.mono, fontSize: 42, color: '#1d1d1d', lineHeight: 1.45 }}>{metin.slice(0, n)}<span style={{ opacity: Math.floor(f / 12) % 2 }}>▌</span></div>
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: 1400, position: 'relative' }}>
        <div style={{ position: 'absolute', left: -60, top: -170, fontFamily: font.baslik, fontSize: 380, color: palet.vurgu, opacity: 0.85 * p, lineHeight: 1, transform: `scale(${0.6 + 0.4 * p})` }}>“</div>
        <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 76, color: palet.murekkep, lineHeight: 1.15, opacity: p, clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` }}>{metin}</div>
        {kim ? <div style={{ fontFamily: font.govde, fontSize: 34, color: palet.soluk, marginTop: 34, opacity: ilerle(f, fps * 0.4, fps * 0.5, hareket) }}>{kim}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------- LISTE ----------
export const LISTE_TIPLERI = ['isaretli', 'numarali-yigin'] as const;
export type ListeTip = typeof LISTE_TIPLERI[number];
export const Liste: React.FC<{ tip: ListeTip; baslik?: string; maddeler: string[]; stil: Stil }> = ({ tip, baslik, maddeler, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 200 }}>
      {baslik ? <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 70, color: palet.murekkep, marginBottom: 40, opacity: ilerle(f, 0, 12, hareket) }}>{font.buyukHarf ? baslik.toUpperCase() : baslik}</div> : null}
      {maddeler.map((m, i) => {
        const p = ilerle(f, 8 + i * fps * 0.35, fps * 0.45, hareket);
        return tip === 'numarali-yigin' ? (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 30, marginBottom: 22, opacity: sinirla(p * 2), transform: `translateX(${(1 - p) * -80}px)` }}>
            <div style={{ fontFamily: font.baslik, fontWeight: 800, fontSize: 96, color: palet.vurgu, width: 120, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontFamily: font.govde, fontSize: 50, color: palet.murekkep }}>{m}</div>
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 26, opacity: sinirla(p * 2) }}>
            <svg width={56} height={56}><rect x={3} y={3} width={50} height={50} rx={10} fill="none" stroke={palet.vurgu} strokeWidth={4} /><path d="M14 29 L25 40 L44 17" fill="none" stroke={palet.vurgu} strokeWidth={6} strokeDasharray={50} strokeDashoffset={50 * (1 - p)} strokeLinecap="round" /></svg>
            <div style={{ fontFamily: font.govde, fontSize: 52, color: palet.murekkep }}>{m}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- KARSILASTIRMA ----------
export const Karsilastirma: React.FC<{ sol: { ad: string; deger: number }; sag: { ad: string; deger: number }; birim?: string; stil: Stil }> = ({ sol, sag, birim = '', stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font } = stil;
  const mx = Math.max(sol.deger, sag.deger);
  const p = egri('kubik-hizli', sinirla(f / (fps * 1.2)));
  const sut = (x: { ad: string; deger: number }, renk: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 760, width: 380 }}>
      <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 80, color: palet.murekkep, marginBottom: 14 }}>{Math.round(x.deger * p).toLocaleString('en-US')}{birim}</div>
      <div style={{ width: 300, height: (x.deger / mx) * 520 * p, background: renk, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontFamily: font.govde, fontSize: 40, color: palet.soluk, marginTop: 18 }}>{x.ad}</div>
    </div>
  );
  return <AbsoluteFill style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 160 }}>{sut(sol, palet.vurgu2)}{sut(sag, palet.vurgu)}</AbsoluteFill>;
};

// ---------- ZAMAN CIZELGESI ----------
export const ZAMAN_TIPLERI = ['yatay-dugum', 'dikey-serit'] as const;
export type ZamanTip = typeof ZAMAN_TIPLERI[number];
export const ZamanCizelgesi: React.FC<{ tip: ZamanTip; adimlar: { yil: string; yazi: string }[]; stil: Stil }> = ({ tip, adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const n = adimlar.length;
  if (tip === 'dikey-serit') {
    const aktif = Math.min(n - 1, Math.floor(f / (fps * 0.8)));
    return (
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 260 }}>
        <div style={{ position: 'absolute', left: 200, top: H * 0.15, width: 6, height: H * 0.7 * sinirla(f / (fps * 0.6)), background: rgba(palet.murekkep, 0.25) }} />
        {adimlar.map((a, i) => {
          const p = ilerle(f, i * fps * 0.8, fps * 0.4, hareket);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 36, marginBottom: 34, opacity: 0.25 + 0.75 * p * (i === aktif ? 1 : 0.6) }}>
              <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: i === aktif ? 96 : 64, color: i === aktif ? palet.vurgu : palet.murekkep, width: 300 }}>{a.yil}</div>
              <div style={{ fontFamily: font.govde, fontSize: 40, color: palet.murekkep, maxWidth: 900 }}>{a.yazi}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  const X0 = 200, X1 = W - 200, Y = H * 0.55;
  const cz = interpolateCizgi(f, fps, n, X0, X1);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        <line x1={X0} y1={Y} x2={cz} y2={Y} stroke={rgba(palet.murekkep, 0.3)} strokeWidth={4} />
        {adimlar.map((_, i) => { const x = X0 + ((X1 - X0) * i) / Math.max(1, n - 1); const p = ilerle(f, 6 + i * 9, 14, 'geri-sekme'); return <rect key={i} x={x - 14 * p} y={Y - 14 * p} width={28 * p} height={28 * p} transform={`rotate(45 ${x} ${Y})`} fill={palet.vurgu} />; })}
      </svg>
      {adimlar.map((a, i) => {
        const x = X0 + ((X1 - X0) * i) / Math.max(1, n - 1);
        const p = ilerle(f, 8 + i * 9, 16, hareket);
        const ust = i % 2 === 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x - 170, width: 340, top: ust ? Y - 190 : Y + 50, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * (ust ? 20 : -20)}px)` }}>
            <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 54, color: palet.vurgu }}>{a.yil}</div>
            <div style={{ fontFamily: font.govde, fontSize: 28, color: palet.murekkep, marginTop: 6 }}>{a.yazi}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
const interpolateCizgi = (f: number, fps: number, n: number, x0: number, x1: number) => x0 + (x1 - x0) * sinirla((f - 4) / (n * 9 + 6));
