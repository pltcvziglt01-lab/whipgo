import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTLAR, OKUNUR, Stil, egri, hashStr, ilerle, karistir, konturGolge, metinGenislik, okunurVurgu, rastgele, rgba, satirBol, sinirla, tutmaItme, yay } from './temel';

// KARTLAR — saydam katmanlardir; arkalarina Arkaplan ya da Medya konur. Her kartin birden cok tasarim varyanti var;
// stil_dna kanal basina her kart turu icin BIR varyant kilitler (kanal imzasi), rakibinkinden farkli olani.

// ---------- ALT BANT (isim / yer / tarih etiketi) ----------
export const ALTBANT_TIPLERI = ['cizgi-acilis', 'blok-kayma', 'cip-etiket', 'koseli-parantez', 'cam-panel', 'damga'] as const;
export type AltBantTip = typeof ALTBANT_TIPLERI[number];
/** 'alt' (varsayilan): sol/sag alt kose. 'ust': ust kose (kaynak goruntunun alt ucte birinde gomulu yazi varsa — kurgu_denetim
 *  --duzelt etiket_ust: true isaretler, VideoDna uygular). Ust konumda blok ust guvenli alana (110 px) dayanir, scrim ust
 *  koseden iner, dikey giris yonleri aynalanir (cam-panel yukaridan iner, damga ust koseden basilir). */
export type AltBantKonum = 'alt' | 'ust';
/** medyaUstu (varsayilan): video/foto ustunde -> acik yazi + koyu kontur + alt kosede yumusak koyu gecis (scrim); false: Arkaplan
 *  ustunde -> palet murekkebi. Okunurluk tabani (OKUNUR): ust satir >= 64 px, alt satir >= 40 px, kalinlik >= 600; uzun etiket
 *  1500 px'te satira bolunur (kucultulmez). Plakasiz tipte (cizgi-acilis) kontrast scrim + kontur ile, digerlerinde
 *  yari saydam koyu/acik plaka ile saglanir. */
export const AltBant: React.FC<{ tip: AltBantTip; ust: string; alt?: string; stil: Stil; sag?: boolean; medyaUstu?: boolean; konum?: AltBantKonum }> = ({ tip, ust, alt, stil, sag, medyaUstu = true, konum = 'alt' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = ilerle(f, 0, fps * 0.6, hareket), q = ilerle(f, fps * 0.25, fps * 0.6, hareket);
  const U = font.buyukHarf ? ust.toUpperCase() : ust;
  const ustte = konum === 'ust';
  /** dikey yon: altta +1 (asagidan gelir), ustte -1 (yukaridan iner) */
  const dy = ustte ? -1 : 1;
  const yer: React.CSSProperties = { position: 'absolute', ...(ustte ? { top: 110 } : { bottom: 140 }), maxWidth: 1560, ...(sag ? { right: 100, textAlign: 'right' } : { left: 100 }) };
  const yaziR = medyaUstu ? (palet.acik ? palet.zemin : palet.murekkep) : palet.murekkep;
  const glg = medyaUstu ? konturGolge(3) : 'none';
  const ustSt: React.CSSProperties = { fontFamily: font.baslik, fontWeight: Math.max(600, font.baslikAgirlik), fontSize: OKUNUR.ana, lineHeight: 1.08, color: yaziR, letterSpacing: font.aralik, textShadow: glg, maxWidth: 1500 };
  const altSt: React.CSSProperties = { fontFamily: font.govde, fontWeight: Math.max(600, font.govdeAgirlik), fontSize: OKUNUR.ikincil, lineHeight: 1.15, color: medyaUstu ? yaziR : palet.soluk, marginTop: 8, textShadow: glg, maxWidth: 1500 };
  // alt kosede yumusak koyu gecis: plakasiz tipte bile parlak zeminde (beyaz tisort, isik) yazinin altinda koyu ton olur
  const scrim = medyaUstu ? <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: p,
    background: `radial-gradient(ellipse 75% 60% at ${sag ? '88%' : '12%'} ${ustte ? '0%' : '100%'}, ${rgba('#000', 0.62)} 0%, ${rgba('#000', 0.32)} 45%, transparent 75%)` }} /> : null;
  const sar = (el: React.ReactNode) => <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{scrim}{el}</div>;
  switch (tip) {
    case 'cizgi-acilis':
      return sar(
        <div style={yer}>
          <div style={{ height: 6, width: 120 * p, background: palet.vurgu, marginBottom: 18, marginLeft: sag ? 'auto' : 0, boxShadow: medyaUstu ? `0 2px 8px ${rgba('#000', 0.6)}` : undefined }} />
          <div style={{ overflow: 'hidden', padding: '0 6px' }}><div style={{ ...ustSt, transform: `translateY(${(1 - q) * 105}%)` }}>{U}</div></div>
          {alt ? <div style={{ ...altSt, opacity: q, padding: '0 6px' }}>{alt}</div> : null}
        </div>
      );
    case 'blok-kayma':
      return sar(
        <div style={yer}>
          <div style={{ display: 'inline-block', background: palet.vurgu, padding: '12px 28px', transform: `translateX(${(1 - p) * (sag ? 120 : -120)}%)`, boxShadow: `0 14px 40px ${rgba('#000', 0.4)}` }}><div style={{ ...ustSt, color: palet.zemin, textShadow: 'none' }}>{U}</div></div>
          {alt ? <div><div style={{ display: 'inline-block', background: palet.zemin, padding: '8px 28px', transform: `translateX(${(1 - q) * (sag ? 140 : -140)}%)` }}><div style={{ ...altSt, marginTop: 0, color: palet.murekkep, textShadow: 'none' }}>{alt}</div></div></div> : null}
        </div>
      );
    case 'cip-etiket':
      return sar(
        <div style={{ ...yer, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, opacity: p, transform: `scale(${0.9 + 0.1 * p})`, transformOrigin: sag ? 'right' : 'left', justifyContent: sag ? 'flex-end' : 'flex-start' }}>
          <div style={{ background: palet.murekkep, color: palet.zemin, borderRadius: 999, padding: '12px 34px', fontFamily: font.govde, fontWeight: 800, fontSize: OKUNUR.ana, lineHeight: 1.1, boxShadow: `0 12px 34px ${rgba('#000', 0.4)}`, maxWidth: 1500 }}>{U}</div>
          {alt ? <div style={{ background: rgba(palet.zemin, 0.94), color: palet.murekkep, borderRadius: 999, padding: '10px 28px', fontFamily: font.govde, fontWeight: Math.max(600, font.govdeAgirlik), fontSize: OKUNUR.ikincil, opacity: q, boxShadow: `0 8px 24px ${rgba('#000', 0.3)}` }}>{alt}</div> : null}
        </div>
      );
    case 'koseli-parantez': {
      // koseli parantez + ici yari saydam koyu plaka (bulanik): parantezler plakanin kosesinde
      const k = 36, c = `6px solid ${palet.vurgu}`;
      const plaka = medyaUstu ? rgba('#000', 0.58) : rgba(palet.zemin2, 0.7);
      return sar(
        <div style={{ ...yer, padding: '22px 36px' }}>
          <div style={{ position: 'absolute', inset: 8, background: plaka, backdropFilter: medyaUstu ? 'blur(10px)' : undefined, opacity: q }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: k, height: k, borderLeft: c, borderTop: c, transform: `translate(${(1 - p) * 40}px, ${(1 - p) * 20}px)` }} />
          <div style={{ position: 'absolute', right: 0, bottom: 0, width: k, height: k, borderRight: c, borderBottom: c, transform: `translate(${(1 - p) * -40}px, ${(1 - p) * -20}px)` }} />
          <div style={{ ...ustSt, position: 'relative', fontFamily: font.mono, fontWeight: Math.max(700, font.monoAgirlik), opacity: q }}>{U}</div>
          {alt ? <div style={{ ...altSt, position: 'relative', fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), opacity: q }}>{alt}</div> : null}
        </div>
      );
    }
    case 'damga': {
      // hafif egik kirmizi cerceveli damga (@TactCoreYT): basilir gibi buyukten oturur, kenarda murekkep puruzu.
      // Medya ustunde damganin altinda kagit tonlu yari saydam zemin: kirmizi her goruntude okunur.
      const d = ilerle(f, 0, fps * 0.25, 'ustel-sert');
      const kirmizi = palet.acik || medyaUstu ? '#b3261e' : '#ff4b3e';
      const zemin = medyaUstu ? rgba('#f3ede1', 0.9) : rgba(kirmizi, 0.06);
      return sar(
        <div style={{ ...yer, transform: `rotate(-4deg) scale(${1.6 - 0.6 * d})`, opacity: sinirla(d * 2), transformOrigin: `${sag ? 'right' : 'left'} ${ustte ? 'top' : 'bottom'}` }}>
          <div style={{ border: `6px solid ${kirmizi}`, borderRadius: 6, padding: '10px 26px', boxShadow: `inset 0 0 0 2px ${rgba(kirmizi, 0.35)}${medyaUstu ? `, 0 12px 34px ${rgba('#000', 0.45)}` : ''}`, background: zemin,
            WebkitMaskImage: 'radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,.82) 75%, #000 90%)' }}>
            <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: OKUNUR.ana, lineHeight: 1.08, letterSpacing: 4, color: kirmizi, textTransform: 'uppercase', maxWidth: 1400 }}>{U}</div>
            {alt ? <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: OKUNUR.ikincil, letterSpacing: 3, color: kirmizi, opacity: 0.9, textTransform: 'uppercase' }}>{alt}</div> : null}
          </div>
        </div>
      );
    }
    case 'cam-panel':
      // buzlu cam panel: koyu paletlerde daha koyu (0.66), acik paletlerde daha acik (0.78) -> parlak/koyu her goruntude kontrast
      return sar(
        <div style={{ ...yer, background: rgba(palet.zemin, palet.acik ? 0.78 : 0.66), backdropFilter: 'blur(18px)', border: `1px solid ${rgba(palet.murekkep, 0.25)}`, borderRadius: 22, padding: '22px 36px', opacity: p, transform: `translateY(${(1 - p) * 40 * dy}px)`, boxShadow: `0 16px 44px ${rgba('#000', 0.35)}` }}>
          <div style={{ ...ustSt, color: palet.murekkep, textShadow: 'none' }}>{U}</div>
          {alt ? <div style={{ ...altSt, color: palet.acik ? palet.murekkep : rgba(palet.murekkep, 0.86), textShadow: 'none' }}>{alt}</div> : null}
        </div>
      );
  }
  return null;
};

// ---------- SAYI KARTI ----------
export const SAYI_TIPLERI = ['sayac', 'rulo', 'halka', 'cubuk', 'dev-kontur', 'tabela', 'serif-zarif', 'el-alti-cizgi', 'uzun-golge', 'kare-rozet'] as const;
/** rengin algilanan parlakligi 0..1 (koyu vurgu koyu zeminde kaybolmasin diye) */
const parlaklik = (hex: string) => { const x = hex.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((k) => k + k).join('') : x, 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** dar/kondanse baslik fontu: kanalin baslik fontu darsa o, degilse Anton (kalin, okunur) */
const DAR = ['Anton', 'BarlowCondensed', 'Teko', 'Staatliches', 'BebasNeue', 'Oswald'];
const darFont = (s: Stil) => (DAR.includes(s.font.baslik) ? { fontFamily: s.font.baslik, fontWeight: s.font.baslikAgirlik } : { fontFamily: FONTLAR['poster-dar'].baslik, fontWeight: FONTLAR['poster-dar'].baslikAgirlik });
export type SayiTip = typeof SAYI_TIPLERI[number];
/** alt etiket tabani (telefonda okunur): >= 56 px */
const SAYI_ETIKET = 56;
type SayiProps = { tip: SayiTip; deger: number; onEk?: string; sonEk?: string; ust?: string; alt?: string; yuzde?: number; stil: Stil };
/** SAYI KARTI. Giristen sonra tutma suresinde yavas kamera itmesi (donuk kalmaz; zemin DnaSayi'da ters yone kayar -> parallax).
 *  halka/cubuk yuzde cizgisi YALNIZ 'yuzde' verildiyse; verilmezse tipin yuzdesiz duzeni (kapanan kadran / tam vurgu cizgisi). */
export const SayiKarti: React.FC<SayiProps> = (pr) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const yon = hashStr(pr.stil.tohum + pr.deger) % 2 ? 1 : -1;
  return <AbsoluteFill style={{ transform: tutmaItme(Math.max(0, f - fps * 0.45), fps, { hiz: 0.016, egim: 0.35 * yon }) }}><SayiIc {...pr} /></AbsoluteFill>;
};
const SayiIc: React.FC<SayiProps> = ({ tip, deger, onEk = '', sonEk = '', ust, alt, yuzde, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = egri('kubik-hizli', sinirla(f / (fps * 1.1)));
  const g = ilerle(f, 0, fps * 0.5, hareket);
  const ustEl = ust ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(600, font.govdeAgirlik), fontSize: 44, color: palet.soluk, marginBottom: 10, opacity: g, textAlign: 'center', maxWidth: 1500 }}>{ust}</div> : null;
  const altEl = alt ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: SAYI_ETIKET, lineHeight: 1.12, color: palet.murekkep, marginTop: 22, maxWidth: 1500, textAlign: 'center', opacity: g, transform: `translateY(${(1 - g) * 16}px)` }}>{alt}</div> : null;
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
      const R = 200, C = 2 * Math.PI * R;
      if (yuzde == null) {
        // yuzdesiz kadran: ince halka tam tur kapanir, cevresinde 60 cizgili olcek yavas doner; rakam halkanin icinde buyuk
        const don = (f / fps) * 6;
        const R2 = 268, C2 = 2 * Math.PI * R2;
        govde = (
          <div style={{ position: 'relative', width: 660, height: 660 }}>
            <svg width={660} height={660} style={{ position: 'absolute', inset: 0, transform: `rotate(${don - 90}deg)` }}>
              {Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2, u = i % 5 === 0 ? 28 : 13, r0 = 318; const gor = i / 60 <= p;
                return <line key={i} x1={330 + Math.cos(a) * r0} y1={330 + Math.sin(a) * r0} x2={330 + Math.cos(a) * (r0 - u)} y2={330 + Math.sin(a) * (r0 - u)} stroke={rgba(palet.murekkep, i % 5 === 0 ? 0.7 : 0.3)} strokeWidth={i % 5 === 0 ? 4 : 2} opacity={gor ? 1 : 0} />; })}
            </svg>
            <svg width={660} height={660} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx={330} cy={330} r={R2} fill="none" stroke={palet.vurgu} strokeWidth={14} strokeLinecap="round" strokeDasharray={C2} strokeDashoffset={C2 * (1 - p)} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...buyuk, fontSize: Math.min(210, 430 / Math.max(1, yaz(deger).length * 0.55)), color: palet.murekkep }}>{yaz(deger * p)}</div>
          </div>
        );
        break;
      }
      const y = yuzde;
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
      if (yuzde == null) {
        // yuzdesiz: ilerleme cubugu yok (izi yok); rakamin altinda tam boy kalin vurgu cizgisi soldan suzulur, ucunda kucuk kesik
        const c = ilerle(f, fps * 0.15, fps * 0.7, 'kubik-hizli');
        govde = (
          <div style={{ width: 1200 }}>
            <div style={{ ...buyuk, fontSize: 200, textAlign: 'left' }}>{yaz(deger * p)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <div style={{ height: 14, width: `${c * 88}%`, background: palet.vurgu }} />
              <div style={{ height: 14, width: 40, background: palet.vurgu, opacity: c > 0.98 ? 1 : 0 }} />
            </div>
          </div>
        );
        break;
      }
      const y = yuzde;
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
            <div style={{ position: 'absolute', left: 140, bottom: 110, borderLeft: `8px solid ${palet.vurgu}`, paddingLeft: 28, opacity: g, transform: `translateX(${(1 - g) * -40}px)` }}>
              {ust ? <div style={{ fontFamily: font.mono, fontWeight: Math.max(700, font.monoAgirlik), fontSize: OKUNUR.ikincil, color: palet.soluk, letterSpacing: 3 }}>{ust.toUpperCase()}</div> : null}
              {alt ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: SAYI_ETIKET, lineHeight: 1.1, color: palet.murekkep, marginTop: 6, maxWidth: 1500 }}>{alt}</div> : null}
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
          {ust ? <div style={{ fontFamily: serif.govde, fontWeight: serif.govdeAgirlik, fontStyle: 'italic', fontSize: 46, color: palet.soluk, marginBottom: 6, opacity: g }}>{ust}</div> : null}
          <div style={{ fontFamily: serif.baslik, fontWeight: 500, fontSize: 250, lineHeight: 1, color: palet.murekkep, fontVariantNumeric: 'oldstyle-nums proportional-nums', fontFeatureSettings: '"onum" 1',
            opacity: g, transform: `translateY(${(1 - g) * 24}px)`, textShadow: `0 10px 40px ${rgba('#000', 0.35)}` }}>{yaz(deger * p)}</div>
          <div style={{ width: 360 * cizgi, height: 2, background: palet.vurgu, margin: '22px 0 20px' }} />
          {alt ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: SAYI_ETIKET, lineHeight: 1.12, letterSpacing: 4, color: palet.vurgu, textTransform: 'uppercase', opacity: cizgi, maxWidth: 1500, textAlign: 'center' }}>{alt}</div> : null}
        </AbsoluteFill>
      );
    }
    case 'uzun-golge': {
      // karartilmis sahne ustunde dev kondanse rakam, saga-asagi bulaniksiz uzun (extrude) golge (@NederlandseAutowereld).
      // Giris: buyukten 'pat' diye oturur, golge sonra uzar; altinda aralikli kalin birim etiketi (mono ince kaldigi icin govde 800).
      const pop = ilerle(f, 0, fps * 0.28, 'ustel-sert');
      const uz = ilerle(f, fps * 0.12, fps * 0.4, 'kubik-hizli');
      const et = ilerle(f, fps * 0.3, fps * 0.35, hareket);
      const s = yaz(deger);
      const fs = Math.min(400, 2000 / Math.max(2.4, s.length * 0.55));
      const renk = parlaklik(palet.vurgu) > 0.25 ? palet.vurgu : parlaklik(palet.vurgu2) > 0.25 ? palet.vurgu2 : palet.murekkep;
      const golgeR = karistir(palet.acik ? palet.murekkep : palet.zemin, '#000000', 0.75);
      const N = Math.round(fs * 0.055 * uz);
      const golge = Array.from({ length: N }, (_, k) => `${k + 1}px ${k + 1}px 0 ${golgeR}`).join(', ');
      const krem = palet.acik ? karistir(palet.zemin, '#ffffff', 0.4) : karistir(palet.murekkep, '#f3e6c8', 0.35);
      return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <AbsoluteFill style={{ background: rgba('#000000', 0.55 * g) }} />
          {ust ? <div style={{ position: 'relative', fontFamily: font.govde, fontWeight: 800, fontSize: OKUNUR.ikincil, letterSpacing: 6, color: krem, opacity: et, marginBottom: 6, textTransform: 'uppercase', textShadow: `2px 2px 0 ${golgeR}` }}>{ust}</div> : null}
          <div style={{ position: 'relative', ...darFont(stil), fontSize: fs, lineHeight: 1, color: renk, letterSpacing: fs * 0.01, whiteSpace: 'nowrap', textShadow: golge,
            transform: `scale(${(1.3 - 0.3 * pop) * (1 + 0.03 * sinirla(f / (fps * 3)))})`, opacity: sinirla(pop * 3) }}>{s}</div>
          {alt ? <div style={{ position: 'relative', fontFamily: font.govde, fontWeight: 800, fontSize: SAYI_ETIKET, lineHeight: 1.12, letterSpacing: 4, color: krem, marginTop: 26, textTransform: 'uppercase', maxWidth: 1500, textAlign: 'center',
            opacity: et, transform: `translateY(${(1 - et) * 18}px)`, textShadow: `3px 3px 0 ${golgeR}` }}>{alt}</div> : null}
        </AbsoluteFill>
      );
    }
    case 'kare-rozet': {
      // kurumsal koyu kare plaka icinde beyaz kondanse rakam (@SvenskaBilar): plaka soldan silinerek acilir, haneler maskeden
      // tek tek yukari cikar, altta vurgu cubugu uzar; etiket plakanin altinda vurgu cipinde. Sag-ust ucte durur (yayin grafigi).
      const ac = ilerle(f, 0, fps * 0.3, 'ustel-sert');
      const cb = ilerle(f, fps * 0.25, fps * 0.45, 'kubik-hizli');
      const et = ilerle(f, fps * 0.4, fps * 0.3, hareket);
      const s = yaz(deger);
      const fs = Math.min(250, 1100 / Math.max(2.5, s.length * 0.52));
      const plaka = palet.acik ? karistir(palet.murekkep, '#0b1a2e', 0.55) : karistir(palet.zemin, '#12263f', 0.6);
      const beyaz = karistir('#ffffff', palet.murekkep, palet.acik ? 0 : 0.08);
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(250deg, ${rgba('#000000', 0.55 * g)} 0%, ${rgba('#000000', 0.15 * g)} 60%, transparent 100%)` }} />
          <div style={{ position: 'absolute', right: 150, top: 140, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {ust ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: OKUNUR.ikincil, letterSpacing: 4, color: '#ffffff', textTransform: 'uppercase', marginBottom: 14, opacity: et, textShadow: `0 2px 10px ${rgba('#000', 0.7)}` }}>{ust}</div> : null}
            <div style={{ position: 'relative', background: plaka, padding: `${fs * 0.14}px ${fs * 0.22}px ${fs * 0.18}px`, clipPath: `inset(0 ${(1 - ac) * 100}% 0 0)`, boxShadow: `0 24px 60px ${rgba('#000', 0.45)}` }}>
              <div style={{ display: 'flex', ...darFont(stil), fontSize: fs, lineHeight: 1.02, color: beyaz, letterSpacing: fs * 0.01, fontVariantNumeric: 'tabular-nums' }}>
                {s.split('').map((c, i) => { const q = ilerle(f, fps * 0.12 + i * 2, fps * 0.3, 'ustel-sert'); return <div key={i} style={{ overflow: 'hidden' }}><div style={{ transform: `translateY(${(1 - q) * 105}%)` }}>{c}</div></div>; })}
              </div>
              <div style={{ position: 'absolute', left: 0, bottom: 0, height: Math.max(8, fs * 0.05), width: `${cb * 100}%`, background: palet.vurgu }} />
            </div>
            {alt ? <div style={{ marginTop: 16, background: palet.vurgu, color: parlaklik(palet.vurgu) > 0.6 ? '#111111' : '#ffffff', padding: '10px 24px', fontFamily: font.govde, fontWeight: 800, fontSize: SAYI_ETIKET, lineHeight: 1.1, letterSpacing: 2,
              textTransform: 'uppercase', clipPath: `inset(0 0 0 ${(1 - et) * 100}%)`, maxWidth: 1300, textAlign: 'right' }}>{alt}</div> : null}
          </div>
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
/** alinti govdesi >= 72 px, imza >= 36 px (OKUNUR); kart/kagit/metin blogu kadraj genisliginin >= %65'i. Cok uzun alintida
 *  govde 5 satiri gecmesin diye en fazla 64 px'e iner. */
const ALINTI_GOVDE = 76, ALINTI_IMZA = 40;
type AlintiProps = { tip: AlintiTip; metin: string; kim?: string; stil: Stil };
/** ALINTI. Tutma suresinde hafif kamera itmesi + egim (sabit 'slayt' durmaz); egim yonu tohumdan. */
export const Alinti: React.FC<AlintiProps> = (pr) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const yon = hashStr(pr.stil.tohum + pr.metin) % 2 ? 1 : -1;
  return <AbsoluteFill style={{ transform: tutmaItme(Math.max(0, f - fps * 0.3), fps, { hiz: 0.018, egim: 0.6 * yon }) }}><AlintiIc {...pr} /></AbsoluteFill>;
};
/** govde boyutu: metin genislige gore en fazla 'satir' satira sigsin (alt sinir 64) */
const govdeBoyut = (metin: string, fontAd: string, gen: number, satir = 5, boyut = ALINTI_GOVDE) => {
  let b = boyut;
  while (b > 64 && Math.ceil(metinGenislik(metin, b, fontAd) / (gen * 0.92)) > satir) b -= 2;
  return b;
};
const AlintiIc: React.FC<AlintiProps> = ({ tip, metin, kim, stil }) => {
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
    const G = govdeBoyut(metin, font.baslik, 1500, 5, 82);
    return (
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 230, paddingRight: 190 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: -60, top: 0, bottom: 0, width: 12, background: palet.vurgu, transform: `scaleY(${p})`, transformOrigin: 'top' }} />
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: G, lineHeight: 1.16, color: palet.murekkep, maxWidth: 1500 }}>
            {k.map((w, i) => { const q = sinirla((f - 6 - i * hiz) / 6); return <span key={i} style={{ opacity: 0.12 + 0.88 * q }}>{w} </span>; })}
          </div>
          {kim ? <div style={{ fontFamily: font.mono, fontWeight: Math.max(700, font.monoAgirlik), fontSize: ALINTI_IMZA, color: palet.soluk, marginTop: 36, letterSpacing: 2, opacity: ilerle(f, fps * 0.8, fps * 0.4, hareket) }}>{kim.toUpperCase()}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'fosfor-satir') {
    // satirlarin arkasindan vurgu kalemi gecer; yazi zemin renginde kalir. Satirlar olculen genislikle bolunur (<= 1500 px)
    const U = font.buyukHarf ? metin.toUpperCase() : metin;
    const G = govdeBoyut(U, font.baslik, 1500, 5, 80);
    const sat = satirBol(U, G, font.baslik, 1440);
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, minWidth: 1250 }}>
          {sat.map((s, i) => {
            const q = ilerle(f, 4 + i * fps * 0.32, fps * 0.35, 'kubik-hizli');
            return (
              <div key={i} style={{ position: 'relative', padding: '4px 22px' }}>
                <div style={{ position: 'absolute', inset: 0, background: palet.vurgu, transformOrigin: 'left', transform: `scaleX(${q})` }} />
                <div style={{ position: 'relative', fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: G, lineHeight: 1.12, color: q > 0.5 ? palet.zemin : palet.murekkep, opacity: 0.25 + 0.75 * q }}>{s}</div>
              </div>
            );
          })}
          {kim ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: ALINTI_IMZA, color: palet.soluk, marginTop: 22, marginLeft: 22 }}>— {kim}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'kagit-not') {
    const G = govdeBoyut(metin, font.govde, 1240, 5);
    const sat = Math.round(G * 1.24);
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1400, minHeight: 560, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: kagit, padding: '80px 90px', transform: `rotate(${-2 + p * 1}deg) translateY(${(1 - p) * 60}px)`, opacity: sinirla(p * 2), boxShadow: `0 40px 100px ${rgba('#000', 0.45)}`, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${sat - 2}px, ${rgba(palet.vurgu2, 0.28)} ${sat - 2}px ${sat}px)`, backgroundPosition: '0 72px' }}>
          <div style={{ fontFamily: font.govde, fontWeight: Math.max(600, font.govdeAgirlik), fontSize: G, color: murek, lineHeight: `${sat}px` }}>{metin}</div>
          {kim ? <div style={{ fontFamily: font.mono, fontWeight: Math.max(700, font.monoAgirlik), fontSize: ALINTI_IMZA, color: rgba(murek, 0.72), marginTop: 30 }}>— {kim}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (tip === 'daktilo-belge') {
    // kadrajin %78'i genisliginde belge; ust sekmede imza (kim) + ince vurgu cizgisi, govde iri daktilo yazisi.
    // Yazma en fazla ~1,0 sn surer: harf basi sure = min(0,045 sn, 1,0 sn / harf sayisi)
    const harfKare = Math.min(fps * 0.045, fps / Math.max(1, metin.length));
    const n = Math.floor(Math.max(0, f - 8) / harfKare);
    const G = govdeBoyut(metin, font.mono, 1300, 4, 88);
    const baslikR = palet.acik ? palet.vurgu : karistir(palet.vurgu, '#000000', 0.35);
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1500, minHeight: 620, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: kagit, padding: '64px 100px 80px', boxShadow: `0 40px 110px ${rgba('#000', 0.5)}`, opacity: p,
          transform: `translateY(${(1 - p) * 40}px) rotate(-0.6deg)`, borderTop: `14px solid ${palet.vurgu}`,
          backgroundImage: `radial-gradient(ellipse at 50% 40%, transparent 55%, ${rgba('#000', 0.08)} 100%)` }}>
          <div style={{ borderBottom: `3px solid ${rgba(baslikR, 0.5)}`, paddingBottom: 18, marginBottom: 44, fontFamily: font.mono, fontWeight: 700, fontSize: 38, color: baslikR, letterSpacing: 5 }}>{kim ? kim.toUpperCase() : 'KAYIT'}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: G, color: murek, lineHeight: 1.28 }}>{metin.slice(0, n)}<span style={{ opacity: Math.floor(f / 12) % 2, color: palet.vurgu }}>▌</span></div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  const G = govdeBoyut(metin, font.baslik, 1500, 5, 84);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 1500, position: 'relative' }}>
        <div style={{ position: 'absolute', left: -70, top: -190, fontFamily: font.baslik, fontSize: 400, color: palet.vurgu, opacity: 0.85 * p, lineHeight: 1, transform: `scale(${0.6 + 0.4 * p})` }}>“</div>
        <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: G, color: palet.murekkep, lineHeight: 1.14, opacity: p, clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` }}>{metin}</div>
        {kim ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: ALINTI_IMZA, color: palet.soluk, marginTop: 38, opacity: ilerle(f, fps * 0.4, fps * 0.5, hareket) }}>— {kim}</div> : null}
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
        {B ? <div style={{ fontFamily: font.mono, fontWeight: font.monoAgirlik, fontSize: 34, letterSpacing: 4, color: palet.vurgu, marginBottom: 30, width: 1100, opacity: ilerle(f, 0, 12, hareket) }}>{B}</div> : null}
        {maddeler.map((m, i) => {
          const p = ilerle(f, 6 + i * fps * 0.3, fps * 0.4, hareket);
          return (
            <div key={i} style={{ width: 1100, display: 'flex', alignItems: 'center', gap: 28, marginBottom: 18, padding: '22px 30px', background: rgba(palet.zemin2, 0.78), borderRadius: 14,
              border: `1px solid ${rgba(palet.murekkep, 0.14)}`, opacity: sinirla(p * 1.5), transform: `translateX(${(1 - p) * 260}px)` }}>
              <div style={{ minWidth: 64, height: 64, borderRadius: 32, background: palet.vurgu, color: palet.zemin, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.baslik, fontWeight: 800, fontSize: 34 }}>{i + 1}</div>
              <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 46, color: palet.murekkep }}>{m}</div>
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
                <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 50, color: palet.murekkep, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>{m}</div>
                <div style={{ fontFamily: font.mono, fontWeight: font.monoAgirlik, fontSize: 34, color: palet.acik ? palet.soluk : palet.vurgu, opacity: p }}>{String(i + 1).padStart(2, '0')}</div>
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
            <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 50, color: palet.murekkep }}>{m}</div>
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 26, opacity: sinirla(p * 2) }}>
            <svg width={56} height={56}><rect x={3} y={3} width={50} height={50} rx={10} fill="none" stroke={palet.vurgu} strokeWidth={4} /><path d="M14 29 L25 40 L44 17" fill="none" stroke={palet.vurgu} strokeWidth={6} strokeDasharray={50} strokeDashoffset={50 * (1 - p)} strokeLinecap="round" /></svg>
            <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 52, color: palet.murekkep }}>{m}</div>
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
      <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 40, color: palet.soluk, marginTop: 18 }}>{x.ad}</div>
    </div>
  );
  return <AbsoluteFill style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 160 }}>{sut(sol, palet.soluk)}{sut(sag, palet.vurgu)}</AbsoluteFill>;
};

// ---------- ZAMAN CIZELGESI ----------
// yil-tarama: Opus galerisi (envanter/opus-galeri) — yillar hizlanip yavaslayan montajla akar, hedef yilda darbe + aciklama
export const ZAMAN_TIPLERI = ['yatay-dugum', 'dikey-serit', 'buyuk-yil', 'merdiven', 'yil-tarama'] as const;
export type ZamanTip = typeof ZAMAN_TIPLERI[number];
type ZamanAdim = { yil: string; yazi: string };
/** yil-tarama zamanlamasi (sn): ilk ve son adim, ara adimlar; en cok kac ara adim otomatik doldurulur */
export const YIL_TARAMA = { uc: 0.5, ara: 0.25, enCokAra: 8 } as const;
/** yil-tarama adim listesi: verilen adimlar + iki sayisal yil arasi bos ise ara yillar (ileri ya da geri sayim). Ara bosluk
 *  YIL_TARAMA.enCokAra'dan buyukse esit aralikli enCokAra yil secilir. Yil sayi degilse ('Mart 1943') araya bir sey konmaz. */
export const yilTaramaAdimlari = (adimlar: ZamanAdim[]): ZamanAdim[] => {
  const out: ZamanAdim[] = [];
  const sayi = (y: string) => (/^\s*-?\d{1,5}\s*$/.test(y) ? parseInt(y, 10) : null);
  adimlar.forEach((a, i) => {
    if (i > 0) {
      const y0 = sayi(adimlar[i - 1].yil), y1 = sayi(a.yil);
      if (y0 != null && y1 != null && Math.abs(y1 - y0) > 1) {
        const bos = Math.abs(y1 - y0) - 1, yon = Math.sign(y1 - y0), k = Math.min(YIL_TARAMA.enCokAra, bos);
        for (let j = 1; j <= k; j++) out.push({ yil: String(y0 + yon * Math.round((j * (bos + 1)) / (k + 1))), yazi: '' });
      }
    }
    out.push(a);
  });
  return out;
};

/** YIL TARAMA. Ici bos dev rakam (kadraj yuksekliginin ~%42'si) her adimda lostan parlaga gelir; adim sureleri ilk ve son
 *  0,5 sn, aradakiler 0,25 sn (hizlanip yavaslayan montaj). Hedef (son) yilda kontur vurgu rengine doner, 1 -> 1,02 kisa
 *  darbe, ardindan yavas itme (kamera durmaz); altinda yazi (>= 64 px) maskeden yukselir. Adim degisimi ciddi/gizem/sakin tonda
 *  temiz sert kesim; yalniz enerjik tonda 3 karelik yatay tarama cizgili glitch (dilim kaymasi + renk ayrismasi). Ara adimlarin
 *  yazisi gosterilmez (0,25 sn okunmaz): her durak ayri sahne olmali. */
const YilTarama: React.FC<{ adimlar: ZamanAdim[]; stil: Stil }> = ({ adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const { palet, font, ton } = stil;
  const liste = yilTaramaAdimlari(adimlar);
  const n = liste.length;
  const sure = (i: number) => Math.round(fps * (i === 0 || i === n - 1 ? YIL_TARAMA.uc : YIL_TARAMA.ara));
  const bas: number[] = [];
  liste.forEach((_, i) => bas.push(i ? bas[i - 1] + sure(i - 1) : 0));
  let i = 0;
  while (i < n - 1 && f >= bas[i + 1]) i++;
  const yf = f - bas[i];
  const son = i === n - 1;
  const a = liste[i];
  // rakam: kadraj yuksekliginin %42'si, dar kalin font; cok haneli/uzun yil genislige sigsin (1700 px)
  const df = darFont(stil);
  const fs0 = H * 0.42;
  const fs = Math.min(fs0, (1700 / Math.max(1, metinGenislik(a.yil, fs0, df.fontFamily as string))) * fs0);
  // lostan parlaga: adimin ilk ~%70'inde (ara adimda 0,17 sn) %22 -> %100
  const parlak = 0.22 + 0.78 * egri('kubik-hizli', sinirla(yf / Math.max(2, sure(i) * 0.7)));
  // montaj boyunca yavas yaklasma (0,94 -> 1), hedefte darbe 1 -> 1,02 -> 1 (0,3 sn) + yavas itme
  const top = bas[n - 1];
  const yaklas = 0.94 + 0.06 * egri('kubik-hizli', sinirla(f / Math.max(1, top)));
  const darbe = son ? 0.02 * Math.sin(Math.PI * sinirla(yf / (fps * 0.3))) : 0;
  const itme = son ? 0.008 * Math.max(0, yf - fps * 0.3) / fps : 0;
  const olcek = yaklas * (1 + darbe + itme);
  const hedefR = okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep, 3);
  const kontur = son ? karistir(palet.murekkep, hedefR, egri('kubik-hizli', sinirla(yf / 6))) : palet.murekkep;
  // kontur ~7 px @1080p (360 px telefonda ~1,4 px; daha incesi kaybolur); ic %7 tonlu: bos okunur ama zeminle karismaz
  const kalin = Math.max(4, fs / 65);
  const rakamSt: React.CSSProperties = { ...df, fontSize: fs, lineHeight: 1, letterSpacing: fs * 0.01, color: rgba(kontur, 0.07), WebkitTextStroke: `${kalin}px ${kontur}`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
  // enerjik ton: adim degisiminin ilk 3 karesinde yatay tarama cizgili glitch
  const glitch = ton === 'enerjik' && i > 0 && yf < 3;
  const r = rastgele(stil.tohum + 'yt' + f);
  const dilimler = glitch ? Array.from({ length: 5 }, () => ({ y: r() * 100, h: 4 + r() * 14, dx: (r() - 0.5) * fs * 0.18 })) : [];
  const yaziP = son && a.yazi ? yay(sinirla((yf - fps * 0.12) / (fps * 0.38))) : 0;
  const yaziU = font.buyukHarf ? a.yazi.toUpperCase() : a.yazi;
  const yaziB = Math.max(OKUNUR.ana, Math.min(72, siganBoyutTek(yaziU, 72, font.govde, 1500)));
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateY(${liste[n - 1].yazi ? -H * 0.04 : 0}px)` }}>
        <div style={{ position: 'relative', transform: `scale(${olcek.toFixed(5)})`, opacity: parlak, filter: son ? `drop-shadow(0 0 ${(fs * 0.04).toFixed(1)}px ${rgba(hedefR, 0.35 * sinirla(yf / 8))})` : undefined }}>
          <div style={{ ...rakamSt, clipPath: glitch ? 'inset(0 0 0 0)' : undefined }}>{a.yil}</div>
          {glitch ? (
            <>
              <div style={{ ...rakamSt, position: 'absolute', inset: 0, WebkitTextStroke: `${kalin}px ${rgba('#ff2a4a', 0.8)}`, transform: `translateX(${-fs * 0.025}px)`, mixBlendMode: 'screen' }}>{a.yil}</div>
              <div style={{ ...rakamSt, position: 'absolute', inset: 0, WebkitTextStroke: `${kalin}px ${rgba('#22e4ff', 0.8)}`, transform: `translateX(${fs * 0.025}px)`, mixBlendMode: 'screen' }}>{a.yil}</div>
              {dilimler.map((d, k) => <div key={k} style={{ ...rakamSt, position: 'absolute', inset: 0, clipPath: `inset(${d.y}% 0 ${Math.max(0, 100 - d.y - d.h)}% 0)`, transform: `translateX(${d.dx}px)` }}>{a.yil}</div>)}
            </>
          ) : null}
        </div>
        {son && a.yazi ? (
          <div style={{ overflow: 'hidden', marginTop: fs * 0.02, padding: '0 12px 8px' }}>
            <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: yaziB, lineHeight: 1.12, letterSpacing: font.buyukHarf ? 3 : 0.5, color: palet.murekkep,
              maxWidth: 1500, textAlign: 'center', transform: `translateY(${((1 - yaziP) * 110).toFixed(2)}%)` }}>{yaziU}</div>
          </div>
        ) : null}
      </div>
      {glitch ? <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, ${rgba('#000', 0.28)} 0 2px, transparent 2px 5px)`, pointerEvents: 'none' }} /> : null}
    </AbsoluteFill>
  );
};
/** tek satir: maxGen'e sigan boyut (boyut'u gecmez) */
const siganBoyutTek = (s: string, boyut: number, fontAd: string, maxGen: number) => Math.min(boyut, (maxGen / Math.max(1, metinGenislik(s, boyut, fontAd))) * boyut);

export const ZamanCizelgesi: React.FC<{ tip: ZamanTip; adimlar: ZamanAdim[]; stil: Stil }> = ({ tip, adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const n = adimlar.length;
  if (tip === 'yil-tarama') return <YilTarama adimlar={adimlar} stil={stil} />;
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
        <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 48, color: palet.murekkep, marginTop: 24, opacity: ilerle(yf, 6, fps * 0.3, hareket) }}>{a.yazi}</div>
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
              <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 34, color: palet.soluk, marginTop: 4 }}>{a.yazi}</div>
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
              <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 40, color: palet.murekkep, maxWidth: 900 }}>{a.yazi}</div>
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
            <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 34, color: palet.murekkep, marginTop: 6 }}>{a.yazi}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
const interpolateCizgi = (f: number, fps: number, n: number, x0: number, x1: number) => x0 + (x1 - x0) * sinirla((f - 4) / (n * 9 + 6));
