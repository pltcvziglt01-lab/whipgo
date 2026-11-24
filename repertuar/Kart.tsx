import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTLAR, Stil, egri, ilerle, karistir, rgba, sinirla } from './temel';

// KARTLAR — saydam katmanlardir; arkalarina Arkaplan ya da Medya konur. Her kartin birden cok tasarim varyanti var;
// stil_dna kanal basina her kart turu icin BIR varyant kilitler (kanal imzasi), rakibinkinden farkli olani.

// ---------- ALT BANT (isim / yer / tarih etiketi) ----------
export const ALTBANT_TIPLERI = ['cizgi-acilis', 'blok-kayma', 'cip-etiket', 'koseli-parantez', 'cam-panel', 'damga'] as const;
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
    case 'damga': {
      // hafif egik kirmizi cerceveli damga (@TactCoreYT): basilir gibi buyukten oturur, kenarda murekkep puruzu
      const d = ilerle(f, 0, fps * 0.25, 'ustel-sert');
      const kirmizi = palet.acik ? '#b3261e' : '#ff4b3e';
      return (
        <div style={{ ...yer, transform: `rotate(-4deg) scale(${1.6 - 0.6 * d})`, opacity: sinirla(d * 2), transformOrigin: sag ? 'right bottom' : 'left bottom' }}>
          <div style={{ border: `5px solid ${kirmizi}`, borderRadius: 6, padding: '8px 22px', boxShadow: `inset 0 0 0 2px ${rgba(kirmizi, 0.35)}`, background: rgba(kirmizi, 0.06),
            WebkitMaskImage: 'radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,.75) 75%, #000 90%)' }}>
            <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 44, letterSpacing: 4, color: kirmizi, textTransform: 'uppercase' }}>{U}</div>
            {alt ? <div style={{ fontFamily: font.mono, fontSize: 24, letterSpacing: 3, color: kirmizi, opacity: 0.85, textTransform: 'uppercase' }}>{alt}</div> : null}
          </div>
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
export const SAYI_TIPLERI = ['sayac', 'rulo', 'halka', 'cubuk', 'dev-kontur', 'tabela', 'serif-zarif', 'el-alti-cizgi'] as const;
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
    case 'dev-kontur': {
      // ekrani dolduran kontur rakam; ic dolgu asagidan yukari dolar, etiket sol altta
      const s = yaz(deger);
      const dolu = egri('kubik-hizli', sinirla((f - fps * 0.2) / (fps * 1.2)));
      const fs = Math.min(560, 1700 / Math.max(2, s.length * 0.62));
      const st: React.CSSProperties = { fontFamily: font.baslik, fontWeight: 900, fontSize: fs, lineHeight: 1, letterSpacing: -fs * 0.02, whiteSpace: 'nowrap' };
      return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ position: 'relative', transform: `scale(${1.08 - 0.08 * g})` }}>
            <div style={{ ...st, color: 'transparent', WebkitTextStroke: `4px ${rgba(palet.murekkep, 0.55)}` }}>{s}</div>
            <div style={{ ...st, position: 'absolute', inset: 0, color: palet.vurgu, clipPath: `inset(${(1 - dolu) * 100}% 0 0 0)` }}>{s}</div>
          </div>
          {ust || alt ? (
            <div style={{ position: 'absolute', left: 140, bottom: 120, borderLeft: `6px solid ${palet.vurgu}`, paddingLeft: 26, opacity: g, transform: `translateX(${(1 - g) * -40}px)` }}>
              {ust ? <div style={{ fontFamily: font.mono, fontSize: 30, color: palet.soluk, letterSpacing: 3 }}>{ust.toUpperCase()}</div> : null}
              {alt ? <div style={{ fontFamily: font.govde, fontSize: 44, color: palet.murekkep, marginTop: 6, maxWidth: 1000 }}>{alt}</div> : null}
            </div>
          ) : null}
        </AbsoluteFill>
      );
    }
    case 'el-alti-cizgi': {
      // dar kalin rakam (vurgu renginde) + altina elle cizilmis kirmizi cizgi (@BoneWitness-r6y)
      const cz = ilerle(f, fps * 0.45, fps * 0.45, 'kubik-hizli');
      const s = yaz(deger * p);
      const gen = Math.min(1500, s.length * 118);
      const yol = `M 6 22 C ${gen * 0.25} ${10} ${gen * 0.5} ${30} ${gen * 0.75} ${16} S ${gen - 20} ${24} ${gen - 4} ${12}`;
      return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          {ustEl}
          <div style={{ fontFamily: font.baslik, fontWeight: 800, fontSize: 220, lineHeight: 1, color: palet.vurgu, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', transform: `scaleY(1.08)` }}>{s}</div>
          <svg width={gen} height={40} style={{ marginTop: 4 }}>
            <path d={yol} fill="none" stroke={palet.vurgu} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cz} />
          </svg>
          {altEl}
        </AbsoluteFill>
      );
    }
    case 'serif-zarif': {
      // prestijli belgesel: eski stil (oldstyle) serif rakam, altinda ince vurgu cizgisi ve genis aralikli buyuk harf alt yazi
      const serif = FONTLAR['editoryal-serif'];
      const cizgi = ilerle(f, fps * 0.35, fps * 0.6, 'kubik-hizli');
      return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          {ust ? <div style={{ fontFamily: serif.govde, fontStyle: 'italic', fontSize: 40, color: palet.soluk, marginBottom: 6, opacity: g }}>{ust}</div> : null}
          <div style={{ fontFamily: serif.baslik, fontWeight: 500, fontSize: 250, lineHeight: 1, color: palet.murekkep, fontVariantNumeric: 'oldstyle-nums proportional-nums', fontFeatureSettings: '"onum" 1',
            opacity: g, transform: `translateY(${(1 - g) * 24}px)`, textShadow: `0 10px 40px ${rgba('#000', 0.35)}` }}>{yaz(deger * p)}</div>
          <div style={{ width: 360 * cizgi, height: 2, background: palet.vurgu, margin: '22px 0 20px' }} />
          {alt ? <div style={{ fontFamily: font.govde, fontSize: 30, letterSpacing: 9, color: palet.vurgu, textTransform: 'uppercase', opacity: cizgi, maxWidth: 1300, textAlign: 'center' }}>{alt}</div> : null}
        </AbsoluteFill>
      );
    }
    case 'tabela': {
      // havalimani tabelasi: her hane ayri karo, sirayla cevrilerek yerine oturur
      const s = yaz(deger);
      const karo = Math.min(200, 1500 / Math.max(3, s.length));
      govde = (
        <div style={{ display: 'flex', gap: karo * 0.08 }}>
          {s.split('').map((c, i) => {
            const q = ilerle(f, 4 + i * 4, fps * 0.45, 'ustel-sert');
            const doner = q < 1 && /[0-9]/.test(c) ? String(Math.floor(f / 2 + i * 3) % 10) : c;
            return (
              <div key={i} style={{ width: karo, height: karo * 1.35, background: karistir(palet.zemin, palet.murekkep, 0.1), borderRadius: karo * 0.08, position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 -${karo * 0.04}px 0 ${rgba('#000', 0.35)}`, transform: `rotateX(${(1 - q) * 70}deg)` }}>
                <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: karo * 0.95, color: palet.vurgu, lineHeight: 1 }}>{doner}</div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, background: rgba('#000', 0.45) }} />
              </div>
            );
          })}
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
export const ALINTI_TIPLERI = ['buyuk-tirnak', 'kagit-not', 'daktilo-belge', 'yan-cizgi', 'fosfor-satir'] as const;
export type AlintiTip = typeof ALINTI_TIPLERI[number];
export const Alinti: React.FC<{ tip: AlintiTip; metin: string; kim?: string; stil: Stil }> = ({ tip, metin, kim, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = ilerle(f, 0, fps * 0.7, hareket);
  // kagit tonu palete bagli (her kanalda ayni krem kagit gorunmesin)
  const kagit = palet.acik ? karistir(palet.zemin, '#ffffff', 0.35) : karistir('#efe9dc', palet.murekkep, 0.35);
  const murek = palet.acik ? palet.murekkep : karistir('#1a1a1a', palet.zemin, 0.4);
  if (tip === 'yan-cizgi') {
    // sola dayali, solda vurgu cizgisi; kelimeler tek tek belirir
    const k = metin.split(' ');
    const hiz = Math.max(1.2, Math.min(3, (fps * 1.6) / k.length));
    return (
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 220, paddingRight: 260 }}>
        <div style={{ position: 'absolute', left: 170, top: '50%', width: 10, height: 420 * p, transform: 'translateY(-50%)', background: palet.vurgu }} />
        <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 70, lineHeight: 1.18, color: palet.murekkep, maxWidth: 1350 }}>
          {k.map((w, i) => { const q = sinirla((f - 6 - i * hiz) / 6); return <span key={i} style={{ opacity: 0.12 + 0.88 * q }}>{w} </span>; })}
        </div>
        {kim ? <div style={{ fontFamily: font.mono, fontSize: 30, color: palet.soluk, marginTop: 36, letterSpacing: 2, opacity: ilerle(f, fps * 0.8, fps * 0.4, hareket) }}>{kim.toUpperCase()}</div> : null}
      </AbsoluteFill>
    );
  }
  if (tip === 'fosfor-satir') {
    // satirlarin arkasindan vurgu kalemi gecer; yazi zemin renginde kalir
    const sat: string[] = [];
    metin.split(' ').forEach((w) => { const s = sat[sat.length - 1]; if (s && (s + ' ' + w).length <= 30) sat[sat.length - 1] = s + ' ' + w; else sat.push(w); });
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          {sat.map((s, i) => {
            const q = ilerle(f, 4 + i * fps * 0.32, fps * 0.35, 'kubik-hizli');
            return (
              <div key={i} style={{ position: 'relative', padding: '4px 18px' }}>
                <div style={{ position: 'absolute', inset: 0, background: palet.vurgu, transformOrigin: 'left', transform: `scaleX(${q})` }} />
                <div style={{ position: 'relative', fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 68, color: q > 0.5 ? palet.zemin : palet.murekkep, opacity: 0.25 + 0.75 * q }}>{font.buyukHarf ? s.toUpperCase() : s}</div>
              </div>
            );
          })}
          {kim ? <div style={{ fontFamily: font.govde, fontSize: 32, color: palet.soluk, marginTop: 22, marginLeft: 18 }}>— {kim}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'kagit-not') {
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1100, background: kagit, padding: '70px 80px', transform: `rotate(${-2 + p * 1}deg) translateY(${(1 - p) * 60}px)`, opacity: sinirla(p * 2), boxShadow: `0 30px 80px ${rgba('#000', 0.35)}`, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 58px, ${rgba(palet.vurgu2, 0.28)} 58px 60px)` }}>
          <div style={{ fontFamily: font.govde, fontSize: 50, color: murek, lineHeight: 1.2 }}>{metin}</div>
          {kim ? <div style={{ fontFamily: font.mono, fontSize: 30, color: rgba(murek, 0.6), marginTop: 30 }}>— {kim}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'daktilo-belge') {
    const n = Math.floor(Math.max(0, f - 8) / 1.3);
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1200, background: kagit, padding: '60px 80px', boxShadow: `0 30px 80px ${rgba('#000', 0.35)}`, opacity: p, borderTop: `10px solid ${palet.vurgu}` }}>
          <div style={{ fontFamily: font.mono, fontSize: 24, color: palet.acik ? palet.vurgu : karistir(palet.vurgu, '#000000', 0.35), letterSpacing: 4, marginBottom: 26 }}>{kim ? kim.toUpperCase() : 'KAYIT'}</div>
          <div style={{ fontFamily: font.mono, fontSize: 42, color: murek, lineHeight: 1.45 }}>{metin.slice(0, n)}<span style={{ opacity: Math.floor(f / 12) % 2 }}>▌</span></div>
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
export const LISTE_TIPLERI = ['isaretli', 'numarali-yigin', 'panel-yigini', 'cetvel'] as const;
export type ListeTip = typeof LISTE_TIPLERI[number];
export const Liste: React.FC<{ tip: ListeTip; baslik?: string; maddeler: string[]; stil: Stil }> = ({ tip, baslik, maddeler, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const B = baslik && font.buyukHarf ? baslik.toUpperCase() : baslik;
  if (tip === 'panel-yigini') {
    // her madde sagdan kayan yari saydam panel; solda numara cipi
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'flex-end', paddingRight: 160 }}>
        {B ? <div style={{ fontFamily: font.mono, fontSize: 34, letterSpacing: 4, color: palet.vurgu, marginBottom: 30, width: 1100, opacity: ilerle(f, 0, 12, hareket) }}>{B}</div> : null}
        {maddeler.map((m, i) => {
          const p = ilerle(f, 6 + i * fps * 0.3, fps * 0.4, hareket);
          return (
            <div key={i} style={{ width: 1100, display: 'flex', alignItems: 'center', gap: 28, marginBottom: 18, padding: '22px 30px', background: rgba(palet.zemin2, 0.78), borderRadius: 14,
              border: `1px solid ${rgba(palet.murekkep, 0.14)}`, opacity: sinirla(p * 1.5), transform: `translateX(${(1 - p) * 260}px)` }}>
              <div style={{ minWidth: 64, height: 64, borderRadius: 32, background: palet.vurgu, color: palet.zemin, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.baslik, fontWeight: 800, fontSize: 34 }}>{i + 1}</div>
              <div style={{ fontFamily: font.govde, fontSize: 46, color: palet.murekkep }}>{m}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  if (tip === 'cetvel') {
    // gazete/editoryal: maddeler arasi ince cizgiler, numara sagda mono
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1300 }}>
          {B ? <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 64, color: palet.murekkep, paddingBottom: 18, borderBottom: `6px solid ${palet.murekkep}`, opacity: ilerle(f, 0, 12, hareket) }}>{B}</div> : null}
          {maddeler.map((m, i) => {
            const p = ilerle(f, 8 + i * fps * 0.35, fps * 0.4, hareket);
            return (
              <div key={i} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '26px 0' }}>
                <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${p * 100}%`, background: rgba(palet.murekkep, 0.35) }} />
                <div style={{ fontFamily: font.govde, fontSize: 50, color: palet.murekkep, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>{m}</div>
                <div style={{ fontFamily: font.mono, fontSize: 34, color: palet.acik ? palet.soluk : palet.vurgu, opacity: p }}>{String(i + 1).padStart(2, '0')}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }
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
export const ZAMAN_TIPLERI = ['yatay-dugum', 'dikey-serit', 'buyuk-yil', 'merdiven'] as const;
export type ZamanTip = typeof ZAMAN_TIPLERI[number];
export const ZamanCizelgesi: React.FC<{ tip: ZamanTip; adimlar: { yil: string; yazi: string }[]; stil: Stil }> = ({ tip, adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const n = adimlar.length;
  if (tip === 'buyuk-yil') {
    // her adim tek basina: dev tarih ekrani doldurur, alta aciklama; altta ilerleme cubugu
    const adim = fps * 1.6;
    const i = Math.min(n - 1, Math.floor(f / adim));
    const yf = f - i * adim;
    const q = ilerle(yf, 0, fps * 0.35, hareket);
    const a = adimlar[i];
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontFamily: font.baslik, fontWeight: 900, fontSize: 300, color: palet.vurgu, lineHeight: 1, letterSpacing: font.aralik, opacity: q, transform: `translateY(${(1 - q) * 70}px)` }}>{a.yil}</div>
        <div style={{ fontFamily: font.govde, fontSize: 48, color: palet.murekkep, marginTop: 24, opacity: ilerle(yf, 6, fps * 0.3, hareket) }}>{a.yazi}</div>
        <div style={{ position: 'absolute', bottom: 130, left: 300, right: 300, display: 'flex', gap: 14 }}>
          {adimlar.map((_, k) => <div key={k} style={{ flex: 1, height: 8, borderRadius: 4, background: k < i ? palet.vurgu : rgba(palet.murekkep, 0.18), overflow: 'hidden' }}>
            {k === i ? <div style={{ height: '100%', width: `${sinirla(yf / adim) * 100}%`, background: palet.vurgu }} /> : null}</div>)}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'merdiven') {
    // capraz basamaklar: soldan alta, saga uste cikan bloklar
    const bw = Math.min(420, (W - 360) / n);
    return (
      <AbsoluteFill>
        {adimlar.map((a, i) => {
          const p = ilerle(f, 6 + i * fps * 0.35, fps * 0.4, hareket);
          const x = 180 + i * bw, y = H * 0.72 - i * Math.min(150, (H * 0.5) / n);
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y, width: bw - 20, opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}>
              <div style={{ height: 10, background: palet.vurgu, width: `${p * 100}%` }} />
              <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 58, color: palet.murekkep, marginTop: 14 }}>{a.yil}</div>
              <div style={{ fontFamily: font.govde, fontSize: 28, color: palet.soluk, marginTop: 4 }}>{a.yazi}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
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
