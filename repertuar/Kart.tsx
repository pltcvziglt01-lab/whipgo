import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTLAR, OKUNUR, Stil, egri, fbm, hashStr, ilerle, kademe, karistir, konturGolge, metinGenislik, okunurVurgu, rastgele, rgba, satirBol, sinirla, tutmaItme, yay, yazYerlesim, sayiYereli } from './temel';

// KARTLAR — saydam katmanlardir; arkalarina Arkaplan ya da Medya konur. Her kartin birden cok tasarim varyanti var;
// stil_dna kanal basina her kart turu icin BIR varyant kilitler (kanal imzasi), rakibinkinden farkli olani.

// ---------- ALT BANT (isim / yer / tarih etiketi) ----------
export const ALTBANT_TIPLERI = ['cizgi-acilis', 'blok-kayma', 'cip-etiket', 'koseli-parantez', 'cam-panel', 'damga', 'kisi-karti'] as const;
export type AltBantTip = typeof ALTBANT_TIPLERI[number];
/** 'alt' (varsayilan): sol/sag alt kose. 'ust': ust kose (kaynak goruntunun alt ucte birinde gomulu yazi varsa — kurgu_denetim
 *  --duzelt etiket_ust: true isaretler, VideoDna uygular). Ust konumda blok ust guvenli alana (110 px) dayanir, scrim ust
 *  koseden iner, dikey giris yonleri aynalanir (cam-panel yukaridan iner, damga ust koseden basilir). */
export type AltBantKonum = 'alt' | 'ust';
/** medyaUstu (varsayilan): video/foto ustunde -> acik yazi + koyu kontur + alt kosede yumusak koyu gecis (scrim); false: Arkaplan
 *  ustunde -> palet murekkebi. Okunurluk tabani (OKUNUR): ust satir >= 64 px, alt satir >= 40 px, kalinlik >= 600; uzun etiket
 *  1500 px'te satira bolunur (kucultulmez). Plakasiz tipte (cizgi-acilis) kontrast scrim + kontur ile, digerlerinde
 *  yari saydam koyu/acik plaka ile saglanir. */
/** pencere: kisi-karti'nda medya penceresinin yatay merkezi (0..1, cekimin konusu); verilmezse sag/sol sabit (eski davranis) */
export const AltBant: React.FC<{ tip: AltBantTip; ust: string; alt?: string; stil: Stil; sag?: boolean; medyaUstu?: boolean; konum?: AltBantKonum; pencere?: number }> = ({ tip, ust, alt, stil, sag, medyaUstu = true, konum = 'alt', pencere }) => {
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
  // kisi-karti tam ekran tanitim karti: konum (alt/ust) uygulanmaz, sag -> portre cercevesi solda
  if (tip === 'kisi-karti') return <KisiKarti ust={ust} alt={alt} stil={stil} sag={sag} medyaUstu={medyaUstu} pencere={pencere} />;
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
export const SAYI_TIPLERI = ['sayac', 'rulo', 'halka', 'cubuk', 'dev-kontur', 'tabela', 'serif-zarif', 'el-alti-cizgi', 'uzun-golge', 'kare-rozet',
  'ters-zemin-sayilar', 'yanan-belge-sayac', 'esik-renkli-halka', 'hizlanan-sayac'] as const;
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
const SayiIc: React.FC<SayiProps> = (pr) => {
  const G = SAYI_GALERI[pr.tip];
  return G ? <G {...pr} /> : <SayiTemel {...pr} />;
};
const SayiTemel: React.FC<SayiProps> = ({ tip, deger, onEk = '', sonEk = '', ust, alt, yuzde, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = egri('kubik-hizli', sinirla(f / (fps * 1.1)));
  const g = ilerle(f, 0, fps * 0.5, hareket);
  const ustEl = ust ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(600, font.govdeAgirlik), fontSize: 44, color: palet.soluk, marginBottom: 10, opacity: g, textAlign: 'center', maxWidth: 1500 }}>{ust}</div> : null;
  const altEl = alt ? <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: SAYI_ETIKET, lineHeight: 1.12, color: palet.murekkep, marginTop: 22, maxWidth: 1500, textAlign: 'center', opacity: g, transform: `translateY(${(1 - g) * 16}px)` }}>{alt}</div> : null;
  const yaz = (v: number) => onEk + Math.round(v).toLocaleString(sayiYereli()) + sonEk;
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
export const ALINTI_TIPLERI = ['buyuk-tirnak', 'kagit-not', 'daktilo-belge', 'yan-cizgi', 'fosfor-satir', 'sansur-bandi', 'terminal-daktilo'] as const;
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
const AlintiIc: React.FC<AlintiProps> = (pr) => {
  if (pr.tip === 'sansur-bandi') return <SansurBandi {...pr} />;
  if (pr.tip === 'terminal-daktilo') return <TerminalDaktilo {...pr} />;
  return <AlintiTemel {...pr} />;
};
const AlintiTemel: React.FC<AlintiProps> = ({ tip, metin, kim, stil }) => {
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
export const LISTE_TIPLERI = ['isaretli', 'numarali-yigin', 'panel-yigini', 'cetvel', 'surec-zinciri', 'defter-listesi'] as const;
export type ListeTip = typeof LISTE_TIPLERI[number];
export const Liste: React.FC<{ tip: ListeTip; baslik?: string; maddeler: string[]; stil: Stil }> = (pr) => {
  if (pr.tip === 'surec-zinciri') return <SurecZinciri {...pr} />;
  if (pr.tip === 'defter-listesi') return <DefterListesi {...pr} />;
  return <ListeTemel {...pr} />;
};
const ListeTemel: React.FC<{ tip: ListeTip; baslik?: string; maddeler: string[]; stil: Stil }> = ({ tip, baslik, maddeler, stil }) => {
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
/** iki deger, ayni birim (VideoDna kart.tur 'karsilastirma'; sahne_zengin.py "X vs Y" / iki sayi ayni birimde). Buyuk deger
 *  kahraman (vurgu rengi + isik), kucugu ikincil (murekkep %40 sutun). Sutunlar kademeli (6 kare) kutleli yayla buyur, degerler sayar;
 *  sayilar 4,5:1 kontrastli (okunurVurgu), etiketler >= 40 px ve sutun genisligine sigar. baslik: ustte mono aralikli satir. */
export const Karsilastirma: React.FC<{ sol: { ad: string; deger: number }; sag: { ad: string; deger: number }; birim?: string; onEk?: string; baslik?: string; stil: Stil }> = ({ sol, sag, birim = '', onEk = '', baslik, stil }) => {
  const f = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const mx = Math.max(1e-9, sol.deger, sag.deger);
  const SUT = 560, BAR = 300, BOY = H * 0.4;
  const ondalik = [sol.deger, sag.deger].some((x) => !Number.isInteger(x));
  const yaz = (v: number) => (onEk || '') + (ondalik ? v.toFixed(1) : Math.round(v).toLocaleString(sayiYereli())) + birim;
  const vRenk = okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep);
  const enBuyuk = siganBoyutTek(yaz(Math.max(sol.deger, sag.deger)), 150, font.baslik, SUT - 20);
  const B = baslik ? (font.buyukHarf ? baslik.toUpperCase() : baslik) : '';
  const kahramanNo = sol.deger > sag.deger ? 0 : 1; // vurgu buyuk degerde (esitse sagda)
  const sut = (x: { ad: string; deger: number }, i: number) => {
    const g = 8 + i * 6;
    const p = yay(sinirla((f - g) / (fps * 0.9)), 0.9);
    const sayac = egri('kubik-hizli', sinirla((f - g) / (fps * 1.0)));
    const ad = font.buyukHarf ? x.ad.toUpperCase() : x.ad;
    const adB = siganBoyutTek(ad, 48, font.govde, SUT);
    const kahraman = i === kahramanNo;
    return (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: SUT }}>
        <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: enBuyuk, lineHeight: 1, letterSpacing: font.aralik, fontVariantNumeric: 'tabular-nums',
          color: kahraman ? vRenk : palet.murekkep, marginBottom: 22, opacity: sinirla((f - g) / 6) }}>{yaz(x.deger * sayac)}</div>
        <div style={{ width: BAR, height: Math.max(6, (x.deger / mx) * BOY * p), background: kahraman ? palet.vurgu : rgba(palet.murekkep, 0.4), borderRadius: '10px 10px 0 0',
          boxShadow: kahraman ? `0 0 40px ${rgba(palet.vurgu, 0.35)}` : undefined }} />
        <div style={{ width: SUT, height: 4, background: rgba(palet.murekkep, 0.55) }} />
        <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: Math.max(40, adB), letterSpacing: 2, color: palet.murekkep, marginTop: 20, whiteSpace: 'nowrap',
          opacity: sinirla((f - g - 4) / 8), transform: `translateY(${(1 - sinirla((f - g - 4) / 8)) * 14}px)` }}>{ad}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {B ? <div style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), fontSize: 40, letterSpacing: 6,
        color: vRenk, opacity: ilerle(f, 0, 10, 'kubik-hizli') }}>{B}</div> : null}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 120, marginTop: B ? 90 : 0 }}>
        {sut(sol, 0)}
        <div style={{ alignSelf: 'center', fontFamily: font.mono, fontWeight: 700, fontSize: 40, color: rgba(palet.murekkep, 0.7), letterSpacing: 4, opacity: sinirla((f - 10) / 8) }}>VS</div>
        {sut(sag, 1)}
      </div>
    </AbsoluteFill>
  );
};

// ---------- ZAMAN CIZELGESI ----------
// yil-tarama: Opus galerisi (envanter/opus-galeri) — yillar hizlanip yavaslayan montajla akar, hedef yilda darbe + aciklama
export const ZAMAN_TIPLERI = ['yatay-dugum', 'dikey-serit', 'buyuk-yil', 'merdiven', 'yil-tarama',
  'geri-sarma-ozet', 'akan-serit', 'iki-kulvar-zaman', 'hizli-montaj'] as const;
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
  if (tip === 'geri-sarma-ozet') return <GeriSarma adimlar={adimlar} stil={stil} />;
  if (tip === 'akan-serit') return <AkanSerit adimlar={adimlar} stil={stil} />;
  if (tip === 'iki-kulvar-zaman') return <IkiKulvar adimlar={adimlar} stil={stil} />;
  if (tip === 'hizli-montaj') return <HizliMontaj adimlar={adimlar} stil={stil} />;
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

// =====================================================================================================================
// OPUS GALERISI TIPLERI (envanter/opus-galeri/teknikler.json; tip adi = teknik adi). Okunurluk tabani OKUNUR (ana >= 64,
// ikincil >= 40, en az 36); tek doygun vurgu (palet.vurgu); glow / lens flare yok; asim yalniz kahramanda ve < %2.
// =====================================================================================================================

/** degeri kendi ondalik hanesiyle yazar (3.5 -> "3.5", 1200 -> "1,200") */
const sayiYaz = (v: number, deger: number, onEk = '', sonEk = '') => {
  const ond = Number.isInteger(deger) ? 0 : Math.min(2, (String(deger).split('.')[1] || '').length);
  return onEk + v.toLocaleString(sayiYereli(), { minimumFractionDigits: ond, maximumFractionDigits: ond }) + sonEk;
};
/** dolgu zemini ustunde okunur yazi rengi: acik zeminde koyu, koyu zeminde acik */
const zitYazi = (zemin: string) => (parlaklik(zemin) > 0.55 ? '#111111' : '#ffffff');
/** kagit tonu palete bagli (alintidaki formul) */
const kagitTon = (s: Stil) => (s.palet.acik ? karistir(s.palet.zemin, '#ffffff', 0.35) : karistir('#efe9dc', s.palet.murekkep, 0.35));

// ---------- SAYI ----------
/** ters-zemin-sayilar: ritim kirici. Sahne daire tasmasiyla (6 kare) tam ekran vurgu rengine doner (ince capraz cizgi
 *  dokusu), yazi zitYazi; rakam ara degerlerde kirpilarak 3 karede bir sicrar (%58 -> %79 -> %92 -> %98 -> tam), her
 *  sicramada %1,5 darbe; altinda kalin cizgi soldan uzar, etiket (>= 64) yukselir; ust sol ustte aralikli mono baslik. */
const TersZemin: React.FC<SayiProps> = ({ deger, onEk = '', sonEk = '', ust, alt, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const zem = palet.vurgu, yazi = zitYazi(zem);
  const ac = ilerle(f, 0, 6, 'kubik-hizli');
  const ADIM = [0.58, 0.79, 0.92, 0.98, 1];
  const fa = Math.max(0, f - 5);
  const k = Math.min(ADIM.length - 1, Math.floor(fa / 3));
  const darbe = f >= 5 && fa < ADIM.length * 3 ? 0.015 * (1 - (fa % 3) / 3) : 0;
  const son = sayiYaz(deger, deger, onEk, sonEk);
  const df = darFont(stil);
  const fs = Math.min(440, (1640 / Math.max(1, metinGenislik(son, 440, df.fontFamily as string))) * 440);
  const cz = ilerle(f, fps * 0.35, fps * 0.4, 'kubik-hizli');
  const et = ilerle(f, fps * 0.45, fps * 0.35, hareket);
  return (
    <AbsoluteFill style={{ background: zem, clipPath: `circle(${(ac * 130).toFixed(2)}% at 22% 72%)` }}>
      <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(135deg, ${rgba(yazi, 0.07)} 0 3px, transparent 3px 22px)` }} />
      {ust ? <div style={{ position: 'absolute', left: 140, top: 120, fontFamily: font.mono, fontWeight: 700, fontSize: 46, letterSpacing: 6, color: yazi, textTransform: 'uppercase', opacity: sinirla(f / 3) }}>{ust}</div> : null}
      <div style={{ position: 'absolute', left: 140, right: 140, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ ...df, fontSize: fs, lineHeight: 0.95, color: yazi, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', transform: `scale(${(1 + darbe).toFixed(4)})`, transformOrigin: 'left center' }}>{sayiYaz(deger * ADIM[k], deger, onEk, sonEk)}</div>
        <div style={{ height: 10, width: `${cz * 100}%`, background: yazi, marginTop: 28 }} />
        {alt ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: 72, lineHeight: 1.08, color: yazi, marginTop: 26, maxWidth: 1600, opacity: et, transform: `translateY(${(1 - et) * 18}px)` }}>{alt}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/** yanan-belge-sayac: kagit belge 3 sn'de soldan saga puruzlu kor cepheyle yanarak kaybolur (kivilcimlar savrulur, geride
 *  kesik cizgili iz kalir); ustte dev yil/baslik (ust), altta deger slot rakamlariyla (her basamak dikey yuvarlanir, hizliyken
 *  hayalet kopya = hareket bulanikligi) ayni anda doner ve %70'i gecince murekkepten vurguya doner; sonda ease-out durur. */
const YananBelge: React.FC<SayiProps> = ({ deger, onEk = '', sonEk = '', ust, alt, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const df = darFont(stil);
  const g = ilerle(f, 0, fps * 0.4, hareket);
  const PW = 1120, PH = 380;
  const t0 = fps * 0.3, T = fps * 3;
  const tA = (k: number) => sinirla((k - t0) / T);
  const yanma = (k: number) => { const t = tA(k); return t * t * (3 - 2 * t); };
  const cephe = (k: number) => -50 + (PW + 110) * yanma(k);
  const fx = cephe(f);
  const N = 26;
  const nok: [number, number][] = Array.from({ length: N + 1 }, (_, k) => { const y = (PH * k) / N; return [fx + fbm(y / 70, f / 14, 3.1) * 36, y]; });
  const clip = `polygon(${nok.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')}, ${PW + 220}px ${PH}px, ${PW + 220}px 0px)`;
  const yaniyor = fx > -40 && fx < PW + 50;
  const kagit = karistir('#e7e2cf', palet.zemin, 0.12), ink = '#2f3a2e';
  // kivilcimlar: cephede dogar, saga-yukari savrulur, sonumlenir (bulaniksiz kucuk noktalar)
  const kiv = Array.from({ length: 30 }, (_, j) => {
    const r = rastgele(`${stil.tohum}kv${j}`);
    const f0 = t0 + r() * T, omur = fps * (0.45 + r() * 0.5), yas = f - f0;
    if (yas < 0 || yas > omur) return null;
    const y0 = r() * PH, vx = 2 + r() * 6, vy = 1.5 + r() * 3.5, b = 3 + r() * 4;
    return <div key={j} style={{ position: 'absolute', left: cephe(f0) + yas * vx, top: y0 - yas * vy - yas * yas * 0.02, width: b, height: b, borderRadius: b, background: r() > 0.5 ? '#ffcf7a' : '#ff8a3c', opacity: 1 - yas / omur }} />;
  });
  // slot rakamlar
  const t = tA(f), p = t >= 1 ? 1 : 1 - Math.pow(1 - t, 2.2), pOnce = 1 - Math.pow(1 - tA(f - 1), 2.2);
  const son = sayiYaz(deger, deger, onEk, sonEk);
  const ond = Number.isInteger(deger) ? 0 : Math.min(2, (String(deger).split('.')[1] || '').length);
  const olc = Math.pow(10, ond);
  const v = t >= 1 ? Math.round(deger * olc) : deger * p * olc, vOnce = deger * pOnce * olc;
  const fsN = Math.min(200, (1300 / Math.max(1, metinGenislik(son, 200, df.fontFamily as string))) * 200);
  const vurguR = okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep, 3);
  const renk = karistir(palet.murekkep, vurguR, sinirla((p - 0.7) / 0.08));
  let kalan = son.split('').filter((c) => /[0-9]/.test(c)).length;
  const rakamlar = son.split('').map((c, i) => {
    if (!/[0-9]/.test(c)) return <span key={i}>{c}</span>;
    kalan--;
    const bas = Math.pow(10, kalan);
    const tam = Math.floor(v / bas + 1e-6), d0 = tam % 10, altK = v - tam * bas;
    const kay = bas === 1 ? altK : Math.max(0, altK - (bas - 1)); // ust basamak yalniz alt basamaklar devrilirken doner
    const hiz = Math.abs(v - vOnce) / bas;
    const bos = kalan > 0 && v < bas;
    return (
      <div key={i} style={{ position: 'relative', height: '1em', overflow: 'hidden', opacity: bos ? 0.12 : 1 }}>
        <div style={{ transform: `translateY(${(-Math.max(0, kay)).toFixed(3)}em)` }}><div style={{ height: '1em' }}>{d0}</div><div style={{ height: '1em' }}>{(d0 + 1) % 10}</div></div>
        {hiz > 0.15 ? <div style={{ position: 'absolute', inset: 0, opacity: Math.min(0.45, hiz * 0.5), transform: `translateY(${(0.18 - kay).toFixed(3)}em)` }}>{d0}</div> : null}
      </div>
    );
  });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${rgba('#000', 0.25 * g)} 0%, ${rgba('#000', 0.6 * g)} 100%)` }} />
      {ust ? <div style={{ position: 'relative', ...df, fontSize: 124, lineHeight: 1, color: palet.murekkep, letterSpacing: 2, marginBottom: 30, opacity: g, transform: `translateY(${(1 - g) * 20}px)`, whiteSpace: 'nowrap' }}>{ust}</div> : null}
      <div style={{ position: 'relative', width: PW, height: PH }}>
        <div style={{ position: 'absolute', inset: 0, border: `3px dashed ${rgba(palet.murekkep, 0.28)}`, opacity: g }} />
        <div style={{ position: 'absolute', inset: 0, clipPath: clip, background: kagit, boxShadow: `0 20px 50px ${rgba('#000', 0.45)}`, opacity: g }}>
          <div style={{ position: 'absolute', inset: 18, border: `6px double ${rgba(ink, 0.55)}` }} />
          <div style={{ position: 'absolute', left: PW / 2 - 95, top: PH / 2 - 95, width: 190, height: 190, borderRadius: 95, border: `8px solid ${rgba(ink, 0.6)}`, boxShadow: `inset 0 0 0 18px ${kagit}, inset 0 0 0 22px ${rgba(ink, 0.5)}` }} />
          {[0, 1].map((k) => <div key={k} style={{ position: 'absolute', top: PH / 2 - 55, [k ? 'right' : 'left']: 80, width: 110, height: 110, borderRadius: 55, border: `6px solid ${rgba(ink, 0.5)}` }} />)}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 44, textAlign: 'center', fontFamily: font.mono, fontWeight: 700, fontSize: 30, letterSpacing: 8, color: rgba(ink, 0.75) }}>{'Nº ' + String(hashStr(stil.tohum) % 100000).padStart(5, '0')}</div>
          {[0, 1].map((k) => <div key={k} style={{ position: 'absolute', left: 260 + k * 60, right: 260 + k * 60, bottom: 52 + k * 26, height: 8, background: rgba(ink, 0.35) }} />)}
        </div>
        {yaniyor ? (
          <svg width={PW + 200} height={PH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <polyline points={nok.map(([x, y]) => `${(x + 12).toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="#2a1206" strokeOpacity={0.7} strokeWidth={24} />
            <polyline points={nok.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="#e8590c" strokeWidth={8} strokeLinejoin="round" />
            <polyline points={nok.map(([x, y]) => `${(x - 2).toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="#ffd27a" strokeWidth={2.5} strokeLinejoin="round" />
          </svg>
        ) : null}
        {kiv}
      </div>
      <div style={{ position: 'relative', display: 'flex', ...df, fontSize: fsN, lineHeight: 1, color: renk, marginTop: 34, fontVariantNumeric: 'tabular-nums', opacity: g }}>{rakamlar}</div>
      {alt ? <div style={{ position: 'relative', fontFamily: font.govde, fontWeight: 800, fontSize: SAYI_ETIKET, lineHeight: 1.1, letterSpacing: 2, color: palet.murekkep, marginTop: 18, textTransform: 'uppercase', maxWidth: 1500, textAlign: 'center', opacity: g }}>{alt}</div> : null}
    </AbsoluteFill>
  );
};

/** esik-renkli-halka: buyuk halka sayac esiklerde renk degistirir (murekkep -> %60'ta yari ton -> %85'te vurgu; esik
 *  gecisinde %1,5 nabiz), esikler halka disinda kisa cizgiyle isaretli; arkada kadraji dolduran %8 opak hayalet rakam.
 *  yuzde verilirse halka o orana kadar dolar ve esikler o orana gore; verilmezse tam tur. */
const EsikHalka: React.FC<SayiProps> = ({ deger, onEk = '', sonEk = '', ust, alt, yuzde, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const df = darFont(stil);
  const p = egri('kubik-hizli', sinirla((f - 4) / (fps * 1.8)));
  const dol = (yuzde ?? 1) * p;
  const E1 = 0.6, E2 = 0.85;
  const k1 = sinirla((dol - E1) / 0.03), k2 = sinirla((dol - E2) / 0.03);
  const orta = karistir(palet.murekkep, palet.vurgu, 0.5);
  const renk = k2 > 0 ? karistir(orta, palet.vurgu, k2) : karistir(palet.murekkep, orta, k1);
  const yaziR = k2 > 0 ? karistir(palet.murekkep, okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep, 3), k2) : palet.murekkep;
  const nabiz = 1 + 0.015 * (Math.sin(Math.PI * k1) + Math.sin(Math.PI * k2));
  const R = 330, SW = 38, D = 2 * R + 140, C = 2 * Math.PI * R;
  const s = sayiYaz(deger * p, deger, onEk, sonEk), son = sayiYaz(deger, deger, onEk, sonEk);
  const fsN = Math.min(230, ((2 * (R - SW / 2) - 110) / Math.max(1, metinGenislik(son, 230, df.fontFamily as string))) * 230);
  const fsG = Math.min(820, (1880 / Math.max(1, metinGenislik(son, 820, df.fontFamily as string))) * 820);
  const g = ilerle(f, 0, fps * 0.4, hareket);
  const isaret = (e: number) => { const a = -Math.PI / 2 + e * 2 * Math.PI, r0 = R + SW / 2 + 8, r1 = r0 + 30; return <line key={e} x1={D / 2 + Math.cos(a) * r0} y1={D / 2 + Math.sin(a) * r0} x2={D / 2 + Math.cos(a) * r1} y2={D / 2 + Math.sin(a) * r1} stroke={rgba(palet.murekkep, 0.6)} strokeWidth={6} strokeLinecap="round" />; };
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...df, fontSize: fsG, lineHeight: 1, color: rgba(palet.murekkep, 0.08), whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{s}</div>
      </AbsoluteFill>
      <div style={{ position: 'relative', width: D, height: D, transform: `scale(${(nabiz * (0.94 + 0.06 * g)).toFixed(4)})`, opacity: g }}>
        <svg width={D} height={D} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={D / 2} cy={D / 2} r={R} fill="none" stroke={rgba(palet.murekkep, 0.12)} strokeWidth={SW} />
          <circle cx={D / 2} cy={D / 2} r={R} fill="none" stroke={renk} strokeWidth={SW} strokeDasharray={C} strokeDashoffset={C * (1 - dol)} transform={`rotate(-90 ${D / 2} ${D / 2})`} />
          {[E1, E2].filter((e) => e <= (yuzde ?? 1)).map(isaret)}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {ust ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: OKUNUR.ikincil + 4, letterSpacing: 3, color: palet.soluk, textTransform: 'uppercase', marginBottom: 6, maxWidth: 2 * R - 120, textAlign: 'center' }}>{ust}</div> : null}
          <div style={{ ...df, fontSize: fsN, lineHeight: 1, color: yaziR, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{s}</div>
        </div>
      </div>
      {alt ? <div style={{ position: 'relative', fontFamily: font.govde, fontWeight: 800, fontSize: SAYI_ETIKET, lineHeight: 1.1, color: palet.murekkep, marginTop: -20, maxWidth: 1500, textAlign: 'center', opacity: ilerle(f, fps * 0.3, fps * 0.4, hareket) }}>{alt}</div> : null}
    </AbsoluteFill>
  );
};

/** hizlanan-sayac: sayac ustel ivmeyle 5 karede bir sicrayarak 1,75 sn'de degere varir (her sicramada %1,5 darbe); altinda
 *  ayni ustel egri soldan cizilir, ucunda dolu nokta; bitince alt etiket damga gibi (1,25 -> 1) oturur. */
const HizlananSayac: React.FC<SayiProps> = ({ deger, onEk = '', sonEk = '', ust, alt, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const df = darFont(stil);
  const T = Math.round(fps * 1.75), ADIM = 5, K = 6.5;
  const ex = (u: number) => (Math.exp(K * u) - 1) / (Math.exp(K) - 1);
  const fa = Math.max(0, f - 4);
  const bitti = fa >= T;
  const tk = bitti ? T : Math.floor(fa / ADIM) * ADIM;
  const v = bitti ? deger : deger * ex(tk / T);
  const darbe = !bitti && f >= 4 ? 0.015 * (1 - (fa % ADIM) / ADIM) : 0;
  const son = sayiYaz(deger, deger, onEk, sonEk);
  const fs = Math.min(300, (1500 / Math.max(1, metinGenislik(son, 300, df.fontFamily as string))) * 300);
  const GW = 1500, GH = 240;
  const uc = sinirla(fa / T);
  const yol = Array.from({ length: 61 }, (_, k) => { const u = (k / 60) * uc; return `${k ? 'L' : 'M'} ${(u * GW).toFixed(1)} ${(GH - ex(u) * GH).toFixed(1)}`; }).join(' ');
  const kil = ilerle(f, 4 + T, fps * 0.3, 'ustel-sert');
  const g = ilerle(f, 0, fps * 0.35, hareket);
  const vurguR = okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep, 3);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      {ust ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: 48, letterSpacing: 3, color: palet.soluk, textTransform: 'uppercase', marginBottom: 8, opacity: g }}>{ust}</div> : null}
      <div style={{ ...df, fontSize: fs, lineHeight: 1, color: palet.murekkep, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', transform: `scale(${(1 + darbe).toFixed(4)})`, opacity: g }}>{sayiYaz(v, deger, onEk, sonEk)}</div>
      <svg width={GW} height={GH + 20} style={{ marginTop: 26, overflow: 'visible' }}>
        <line x1={0} y1={GH} x2={GW * g} y2={GH} stroke={rgba(palet.murekkep, 0.35)} strokeWidth={4} />
        <path d={yol} fill="none" stroke={palet.vurgu} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={uc * GW} cy={GH - ex(uc) * GH} r={14} fill={palet.vurgu} opacity={f >= 4 ? 1 : 0} />
      </svg>
      {alt ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: SAYI_ETIKET + 8, lineHeight: 1.1, letterSpacing: 2, color: vurguR, marginTop: 26, textTransform: 'uppercase', maxWidth: 1500, textAlign: 'center',
        opacity: sinirla(kil * 3), transform: `scale(${(1.25 - 0.25 * kil).toFixed(4)})` }}>{alt}</div> : null}
    </AbsoluteFill>
  );
};
const SAYI_GALERI: Partial<Record<SayiTip, React.FC<SayiProps>>> = { 'ters-zemin-sayilar': TersZemin, 'yanan-belge-sayac': YananBelge, 'esik-renkli-halka': EsikHalka, 'hizlanan-sayac': HizlananSayac };

// ---------- ZAMAN ----------
/** tam ekran renk tonlari (tek doygun: vurgu; digerleri palet notrleri) */
const tonDizisi = (s: Stil) => [s.palet.vurgu, s.palet.zemin2, s.palet.murekkep, s.palet.zemin];
/** iki adimli geri sarma oku (font gerektirmez) */
const GeriOk: React.FC<{ boy: number; renk: string }> = ({ boy, renk }) => (
  <svg width={boy * 1.3} height={boy} viewBox="0 0 26 20"><path d="M13 0 L13 20 L0 10 Z M26 0 L26 20 L13 10 Z" fill={renk} /></svg>
);

/** geri-sarma-ozet: bolum sonu ozeti. Adimlar TERS sirada (sondan basa) 0,5 sn'de bir sert kesilir; her adim kendi tam
 *  ekran tonunda (vurgu / zemin2 / murekkep / zemin dongusu), kesimin ilk karesi %35, ikincisi %15 acik flas; ilk 4 karede
 *  yatay sarma bandi yukari kayar ve icerik soldan oturur (geri sarma yonu). Sag ustte geri sayim (n-1 -> 0) + cift ok.
 *  Son adim (en eski) tutulur, yavas itme. */
const GeriSarma: React.FC<{ adimlar: ZamanAdim[]; stil: Stil }> = ({ adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { font } = stil;
  const liste = [...adimlar].reverse();
  const n = liste.length, S = Math.round(fps * 0.5);
  const i = Math.min(n - 1, Math.floor(f / S)), yf = f - i * S, son = i === n - 1;
  const ton = tonDizisi(stil);
  const zem0 = ton[i % ton.length];
  const zem = yf === 0 && f > 0 ? karistir(zem0, '#ffffff', 0.35) : yf === 1 ? karistir(zem0, '#ffffff', 0.15) : zem0;
  const yazi = zitYazi(zem0);
  const a = liste[i];
  const df = darFont(stil);
  const fs = Math.min(360, (1600 / Math.max(1, metinGenislik(a.yil, 360, df.fontFamily as string))) * 360);
  const U = font.buyukHarf ? a.yazi.toUpperCase() : a.yazi;
  const yer = yazYerlesim(U, 80, font.govde, 1600, 64);
  const otur = ilerle(yf, 0, 6, 'kubik-hizli');
  const itme = son ? 1 + 0.01 * Math.max(0, yf - S) / fps : 1;
  return (
    <AbsoluteFill style={{ background: zem }}>
      <div style={{ position: 'absolute', left: 160, right: 160, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateX(${((1 - otur) * -70).toFixed(1)}px) scale(${itme.toFixed(4)})`, transformOrigin: 'left center' }}>
        <div style={{ ...df, fontSize: fs, lineHeight: 0.95, color: yazi, whiteSpace: 'nowrap', letterSpacing: fs * 0.01 }}>{a.yil}</div>
        {a.yazi ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: yer.boyut, lineHeight: 1.1, color: yazi, marginTop: 20 }}>{yer.satirlar.map((s, k) => <div key={k}>{s}</div>)}</div> : null}
      </div>
      <div style={{ position: 'absolute', right: 130, top: 110, display: 'flex', alignItems: 'center', gap: 18, fontFamily: font.mono, fontWeight: 700, fontSize: 64, color: yazi, fontVariantNumeric: 'tabular-nums' }}>
        <GeriOk boy={44} renk={yazi} />{String(n - 1 - i).padStart(2, '0')}
      </div>
      {yf < 4 && f > 0 ? <div style={{ position: 'absolute', left: 0, right: 0, top: `${(85 - yf * 24).toFixed(0)}%`, height: 70, background: rgba(yazi, 0.14) }} /> : null}
    </AbsoluteFill>
  );
};

/** akan-serit: cok ogeli kronoloji. 0,5 sn'de bir oge asagidan merkeze kayar, onceki yukari kuculup solar (iki onceki
 *  hayalet kalir); oge = vurgu cipinde yil + kalin ad (>= 72); arkada dev hayalet yil (%7), sag ustte sira sayaci
 *  (001/NNN), sagda yorungede ilerleyen dolu nokta + kademeli kuyruk, gecilen konumlar noktali iz. Son oge kilometre tasi:
 *  1 kare flas + noktadan genisleyen halka, tutulur. */
const AkanSerit: React.FC<{ adimlar: ZamanAdim[]; stil: Stil }> = ({ adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font } = stil;
  const n = adimlar.length, S = Math.round(fps * 0.5);
  const i = Math.min(n - 1, Math.floor(f / S)), yf = f - i * S, son = i === n - 1;
  const giris = yay(sinirla(yf / 9));
  const df = darFont(stil);
  const cipR = palet.vurgu, cipY = zitYazi(cipR);
  const oge = (j: number) => {
    const a = adimlar[j];
    const d = i - j - (1 - giris); // akim: -1 (alt) -> 0 (merkez) -> 1 (ust) -> 2
    if (d < -1 || d > 2) return null;
    const U = font.buyukHarf ? a.yazi.toUpperCase() : a.yazi;
    const yer = yazYerlesim(U, 112, font.baslik, 1080, 72);
    const op = d < 0 ? 1 + d : d <= 1 ? 1 - 0.72 * d : 0.28 * (2 - d);
    const sc = 1 - 0.42 * Math.min(1, Math.abs(d));
    return (
      <div key={j} style={{ position: 'absolute', left: 150, top: 540 - d * 300, transform: `translateY(-50%) scale(${sc.toFixed(4)})`, transformOrigin: 'left center', opacity: op, width: 1100 }}>
        <div style={{ display: 'inline-block', background: cipR, color: cipY, fontFamily: font.mono, fontWeight: 700, fontSize: 44, letterSpacing: 3, padding: '6px 20px', marginBottom: 14 }}>{a.yil}</div>
        <div style={{ fontFamily: font.baslik, fontWeight: Math.max(700, font.baslikAgirlik), fontSize: yer.boyut, lineHeight: 1.04, color: palet.murekkep, letterSpacing: font.aralik }}>{yer.satirlar.map((s, k) => <div key={k}>{s}</div>)}</div>
      </div>
    );
  };
  const cur = adimlar[i];
  const fsG = Math.min(560, (1500 / Math.max(1, metinGenislik(cur.yil, 560, df.fontFamily as string))) * 560);
  const OX = 1530, OY = 560, OR = 240;
  const aci = (x: number) => -Math.PI / 2 + (x / Math.max(1, n)) * Math.PI * 2;
  const nokta = (x: number) => [OX + Math.cos(aci(x)) * OR, OY + Math.sin(aci(x)) * OR];
  const [px, py] = nokta(i + giris);
  const flas = son && f > 0 ? (yf === 0 ? 0.28 : yf === 1 ? 0.1 : 0) : 0;
  const halka = son ? sinirla(yf / 20) : 1;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 60, bottom: 10, ...df, fontSize: fsG, lineHeight: 1, color: rgba(palet.murekkep, 0.07 * giris), whiteSpace: 'nowrap' }}>{cur.yil}</div>
      {[i - 2, i - 1, i].filter((j) => j >= 0).map(oge)}
      <div style={{ position: 'absolute', right: 130, top: 100, fontFamily: font.mono, fontWeight: 700, fontSize: 56, color: palet.murekkep, fontVariantNumeric: 'tabular-nums' }}>
        {String(i + 1).padStart(3, '0')}<span style={{ color: palet.soluk }}>{' / ' + String(n).padStart(3, '0')}</span>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={OX} cy={OY} r={OR} fill="none" stroke={rgba(palet.murekkep, 0.16)} strokeWidth={3} />
        {Array.from({ length: i + 1 }, (_, j) => { const [x, y] = nokta(j); return <circle key={j} cx={x} cy={y} r={7} fill={rgba(palet.murekkep, 0.55)} />; })}
        {Array.from({ length: 7 }, (_, k) => { const [x, y] = nokta(i + giris - (k + 1) * 0.045); return <circle key={k} cx={x} cy={y} r={13 - k * 1.5} fill={palet.vurgu} opacity={0.5 - k * 0.065} />; })}
        <circle cx={px} cy={py} r={17} fill={palet.vurgu} />
        {son && halka < 1 ? <circle cx={px} cy={py} r={17 + halka * 120} fill="none" stroke={palet.vurgu} strokeWidth={5} opacity={1 - halka} /> : null}
      </svg>
      {flas ? <AbsoluteFill style={{ background: rgba('#ffffff', flas) }} /> : null}
    </AbsoluteFill>
  );
};

/** iki-kulvar-zaman: ortada yil ekseni (soldan cizilir), ustte vurgu tonlu, altta notr kulvar; adimlar sirayla ust/alt
 *  kulvara (cift/tek indeks) iki sira halinde dizilir, her cip sagdan kayarak ~4 karede bir gelir ve eksene kisa cizgiyle
 *  baglanir; yil eksende, cipin karsi tarafinda mono (>= 36). Iki tarafin paralel tarihini tek ekranda ozetler. */
const IkiKulvar: React.FC<{ adimlar: ZamanAdim[]; stil: Stil }> = ({ adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font } = stil;
  const n = adimlar.length;
  const AX0 = 150, AX1 = 1770, Y = 540, PAY = 130;
  const x = (i: number) => AX0 + PAY + ((AX1 - AX0 - 2 * PAY) * i) / Math.max(1, n - 1);
  const eks = ilerle(f, 0, fps * 0.45, 'kubik-hizli');
  const adimX = n > 1 ? (AX1 - AX0 - 2 * PAY) / (n - 1) : 800;
  const cipMax = Math.min(560, adimX * 4 - 50);
  const ustR = palet.vurgu, ustY = zitYazi(ustR);
  const B = Math.max(40, Math.min(50, cipMax / 7));
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 110, height: Y - 14 - 110, background: rgba(palet.vurgu, 0.1 * eks) }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: Y + 14, height: 970 - Y - 14, background: rgba(palet.murekkep, 0.05 * eks) }} />
      <div style={{ position: 'absolute', left: AX0, top: Y - 3, height: 6, width: (AX1 - AX0) * eks, background: palet.murekkep }} />
      {adimlar.map((a, i) => {
        const g = 8 + kademe(i, n, stil.tohum) * 4;
        const p = ilerle(f, g, 9, 'kubik-hizli');
        if (p <= 0) return null;
        const ust = i % 2 === 0, sira = Math.floor(i / 2) % 2;
        const cx = x(i);
        const uzak = 80 + sira * 175;
        const U = font.buyukHarf ? a.yazi.toUpperCase() : a.yazi;
        // cip genisligi olculur, kadraj kenarina (60 px) sikistirilir: uc ciplerde tasma yok
        const cw = Math.min(cipMax, metinGenislik(U, B, font.govde) * 1.08 + 56);
        const cl0 = Math.max(60, Math.min(1860 - cw, cx - cw / 2));
        const cip: React.CSSProperties = { position: 'absolute', left: cl0, width: cw, boxSizing: 'border-box', transform: `translateX(${((1 - p) * 90).toFixed(1)}px)`, opacity: sinirla(p * 1.6),
          padding: '10px 22px', fontFamily: font.govde, fontWeight: 800, fontSize: B, lineHeight: 1.12, textAlign: 'center', boxShadow: `0 10px 26px ${rgba('#000', 0.25)}`,
          ...(ust ? { bottom: 1080 - (Y - uzak), background: ustR, color: ustY } : { top: Y + uzak, background: palet.zemin2, color: palet.murekkep, border: `3px solid ${palet.murekkep}` }) };
        const cl = ilerle(f, g + 3, 7, 'kubik-hizli');
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: cx - 2, width: 4, background: ust ? ustR : palet.murekkep, ...(ust ? { top: Y - uzak, height: uzak * cl } : { top: Y, height: uzak * cl }) }} />
            <div style={{ position: 'absolute', left: cx - 9, top: Y - 9, width: 18, height: 18, borderRadius: 9, background: ust ? ustR : palet.murekkep, opacity: p }} />
            <div style={{ position: 'absolute', left: cx, transform: 'translateX(-50%)', [ust ? 'top' : 'bottom']: ust ? Y + 18 : 1080 - Y + 18, fontFamily: font.mono, fontWeight: 700, fontSize: 38, color: palet.murekkep, opacity: p, whiteSpace: 'nowrap' } as React.CSSProperties}>{a.yil}</div>
            <div style={cip}>{U}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/** hizli-montaj: kanca / ozet montaji. Her adim ~0,27 sn (8 kare), her kesimde tam ekran ton degisir (ardisik ayni ton
 *  yok), yerlesim sol/orta/sag arasinda tohumlu doner, kesimde 1,07 -> 1 itme (kamera vurusu); son adim tutulur. */
const HizliMontaj: React.FC<{ adimlar: ZamanAdim[]; stil: Stil }> = ({ adimlar, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { font } = stil;
  const n = adimlar.length, S = Math.max(6, Math.round(fps * 0.27));
  const i = Math.min(n - 1, Math.floor(f / S)), yf = f - i * S, son = i === n - 1;
  const h = hashStr(stil.tohum);
  const ton = tonDizisi(stil), sira = [0, 2, 1, 3];
  const zem = ton[sira[(i + h) % 4]];
  const yazi = zitYazi(zem);
  const hiza = (['flex-start', 'center', 'flex-end'] as const)[(h + i * 2) % 3];
  const a = adimlar[i];
  const df = darFont(stil);
  const fs = Math.min(330, (1500 / Math.max(1, metinGenislik(a.yil, 330, df.fontFamily as string))) * 330);
  const U = font.buyukHarf ? a.yazi.toUpperCase() : a.yazi;
  const yer = yazYerlesim(U, 84, font.govde, 1500, 64);
  const itme = son && yf > S ? 1 + 0.008 * (yf - S) / fps : 1.07 - 0.07 * egri('kubik-hizli', sinirla(yf / S));
  return (
    <AbsoluteFill style={{ background: zem }}>
      <div style={{ position: 'absolute', left: 170, right: 170, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: hiza, textAlign: hiza === 'flex-start' ? 'left' : hiza === 'center' ? 'center' : 'right', transform: `scale(${itme.toFixed(4)})` }}>
        <div style={{ ...df, fontSize: fs, lineHeight: 0.95, color: yazi, whiteSpace: 'nowrap' }}>{a.yil}</div>
        {a.yazi ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: yer.boyut, lineHeight: 1.1, color: yazi, marginTop: 16 }}>{yer.satirlar.map((s, k) => <div key={k}>{s}</div>)}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------- ALINTI ----------
/** sansur-bandi: sepya kagit belge (capraz yumusak golge bandi), ustte dosya basligi (kim). Mono govde daktiloyla hizla
 *  yazilir (~0,66 kelime/kare), sonra siyah karartma bantlari anahtar kelimelerin ustune soldan saga birer birer (6 karede
 *  bir) cekilir; sonda vurgu tonlu 'CLASSIFIED' damgasi buyukten (1,4 -> 1, asim < %2) hafif egik oturur.
 *  Karartilacak kelimeler metinde [koseli] parantezle isaretlenir ("[John Smith]" birden cok kelime olabilir); isaret yoksa
 *  >= 5 harfli her 3. kelime (en cok 6). Govde >= 64 px. */
const SansurBandi: React.FC<AlintiProps> = ({ metin, kim, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = ilerle(f, 0, fps * 0.5, hareket);
  let ic = false;
  const kel = metin.split(/\s+/).filter(Boolean).map((w) => {
    const bas = w.startsWith('['); if (bas) ic = true;
    const sansur = ic; if (w.replace(/[.,;:!?'"]+$/, '').endsWith(']')) ic = false;
    return { w: w.replace(/[[\]]/g, ''), sansur };
  });
  if (!kel.some((k) => k.sansur)) {
    let say = 0;
    kel.forEach((k, i) => { if (say < 6 && i % 3 === 1 && k.w.replace(/[^\p{L}\p{N}]/gu, '').length >= 5) { k.sansur = true; say++; } });
  }
  const temiz = kel.map((k) => k.w).join(' ');
  const G = govdeBoyut(temiz, font.mono, 1340, 6, 72);
  const HIZ = 0.66, t0 = 8;
  const yazilan = Math.floor(Math.max(0, f - t0) * HIZ);
  const tY = t0 + Math.ceil(kel.length / HIZ) + 6;
  const hedef = kel.map((k, i) => (k.sansur ? i : -1)).filter((i) => i >= 0);
  // ardisik sansurlu kelimeler tek bant (ayni sira numarasi)
  const bantNo: Record<number, number> = {};
  let b = -1;
  hedef.forEach((i, k) => { if (k === 0 || hedef[k - 1] !== i - 1) b++; bantNo[i] = b; });
  const tD = tY + (b + 1) * 6 + 6;
  const d = yay(sinirla((f - tD) / 10), 0.8);
  const sepya = karistir('#e6d8b8', palet.zemin, 0.1), ink = '#2a241b';
  const damgaR = okunurVurgu(palet.vurgu, sepya, '#3a0d08', 3);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 1580, minHeight: 740, boxSizing: 'border-box', background: sepya, padding: '64px 110px 120px', opacity: p, transform: `translateY(${(1 - p) * 40}px) rotate(-0.8deg)`,
        boxShadow: `0 40px 110px ${rgba('#000', 0.5)}`, backgroundImage: `radial-gradient(ellipse at 50% 45%, transparent 50%, ${rgba('#5a4220', 0.18)} 100%), repeating-linear-gradient(0deg, ${rgba('#5a4220', 0.035)} 0 2px, transparent 2px 5px)` }}>
        <AbsoluteFill style={{ background: `linear-gradient(112deg, transparent 0%, transparent 34%, ${rgba('#000', 0.11)} 47%, transparent 61%)`, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${rgba(ink, 0.6)}`, paddingBottom: 16, marginBottom: 40, fontFamily: font.mono, fontWeight: 700, fontSize: 40, letterSpacing: 5, color: rgba(ink, 0.85) }}>
          <span>{kim ? kim.toUpperCase() : 'CASE FILE'}</span><span>{'#' + String(hashStr(stil.tohum + metin) % 10000).padStart(4, '0')}</span>
        </div>
        <div style={{ position: 'relative', fontFamily: font.mono, fontWeight: 700, fontSize: G, lineHeight: 1.45, color: ink }}>
          {kel.map((k, i) => {
            const bp = k.sansur ? ilerle(f, tY + bantNo[i] * 6, 5, 'kubik-hizli') : 0;
            const sonra = k.sansur && kel[i + 1]?.sansur && bantNo[i + 1] === bantNo[i];
            return (
              <span key={i} style={{ position: 'relative', visibility: i < yazilan ? 'visible' : 'hidden' }}>
                {k.w}
                {bp > 0 ? <span style={{ position: 'absolute', left: -6, right: sonra ? -G * 0.62 : -6, top: '0.12em', bottom: '0.02em', background: '#111111', transformOrigin: 'left', transform: `scaleX(${bp})` }} /> : null}
                {' '}
              </span>
            );
          })}
        </div>
        {d > 0 ? (
          <div style={{ position: 'absolute', right: 100, bottom: 56, transform: `rotate(-7deg) scale(${(1.4 - 0.4 * d).toFixed(4)})`, opacity: sinirla(d * 3), border: `7px solid ${damgaR}`, padding: '8px 30px',
            fontFamily: font.mono, fontWeight: 700, fontSize: 72, letterSpacing: 8, color: damgaR, WebkitMaskImage: 'radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,.8) 75%, #000 92%)' }}>CLASSIFIED</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** terminal-daktilo: koyu terminal paneli (vurgu kenarli, ust sekmede mono baslik), mono BUYUK HARF; once kullanici satiri
 *  (kim) beyaz '>' ile, sonra yanit (metin) vurgu tonunda (panelde 4,5:1) kare basi ~1,2 karakter yazilir (toplam en cok
 *  ~4 sn), blok imlec yazarken sabit, bitince yanip soner; ekran hic donmaz. Govde >= 64 px. */
const TerminalDaktilo: React.FC<AlintiProps> = ({ metin, kim, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const p = ilerle(f, 0, fps * 0.4, hareket);
  const panel = karistir(palet.acik ? palet.murekkep : palet.zemin, '#000000', 0.55);
  const beyaz = '#f2f2ee';
  const yanitR = okunurVurgu(palet.vurgu, panel, beyaz, 4.5);
  const K = kim ? '> ' + kim.toUpperCase() : '', U = metin.toUpperCase();
  const hiz = Math.max(1.2, (K.length + U.length) / (fps * 4));
  const t0 = 8;
  const nK = Math.min(K.length, Math.floor(Math.max(0, f - t0) * hiz));
  const t1 = t0 + K.length / hiz + (K ? 9 : 0);
  const nU = Math.min(U.length, Math.floor(Math.max(0, f - t1) * hiz));
  const bitti = nU >= U.length;
  const imlecGor = !bitti || Math.floor(f / 9) % 2 === 0;
  const G = govdeBoyut(U + ' ' + K, font.mono, 1440, 6, 88);
  const imlec = (r: string) => <span style={{ display: 'inline-block', width: '0.58em', height: '1em', verticalAlign: '-0.12em', background: r, opacity: imlecGor ? 1 : 0, marginLeft: 4 }} />;
  const KYaz = nK < K.length || (K && f < t1);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 1660, minHeight: 620, boxSizing: 'border-box', background: panel, border: `4px solid ${palet.vurgu}`, borderRadius: 8, opacity: p, transform: `scale(${(0.97 + 0.03 * p).toFixed(4)})`,
        boxShadow: `0 40px 110px ${rgba('#000', 0.55)}`, backgroundImage: `repeating-linear-gradient(180deg, ${rgba('#ffffff', 0.025)} 0 2px, transparent 2px 6px)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 34px', borderBottom: `2px solid ${rgba(palet.vurgu, 0.55)}`, fontFamily: font.mono, fontWeight: 700, fontSize: 36, letterSpacing: 5, color: rgba(beyaz, 0.7) }}>
          <span>TERMINAL</span><span style={{ color: yanitR }}>{'■'} LIVE</span>
        </div>
        <div style={{ padding: '44px 54px', fontFamily: font.mono, fontWeight: 700, fontSize: G, lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
          {K ? <div style={{ color: beyaz, marginBottom: 26 }}>{K.slice(0, nK)}{KYaz ? imlec(beyaz) : null}</div> : null}
          {!KYaz ? <div style={{ color: yanitR }}>{U.slice(0, nU)}{imlec(yanitR)}</div> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- LISTE ----------
type ListeProps = { tip: ListeTip; baslik?: string; maddeler: string[]; stil: Stil };
/** surec-zinciri: baslik sol ustte 3 karede belirir; 3-5 daire dugum soldan saga 0,5 sn'de bir gelir: once halka cizilir,
 *  sonra numara kucuk asimla (sonum 0,85, < %1) duser, altinda etiket (>= 44, en cok 2 satir); dugumler arasi noktali
 *  baglac cizilir; son dugum vurgu dolguyla bir kez %1,8 nabiz atar; oturan dugumler hafif yuzer (durgun kalmaz). */
const SurecZinciri: React.FC<ListeProps> = ({ baslik, maddeler, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const n = maddeler.length, GEN = 1640, ara = GEN / Math.max(1, n);
  const D = Math.min(280, ara * 0.72), CY = 520, SW = 10;
  const enUzun = maddeler.flatMap((m) => (font.buyukHarf ? m.toUpperCase() : m).split(' ')).reduce((a, b) => (b.length > a.length ? b : a), '');
  const ET = Math.max(40, Math.min(56, ara / 6.5, siganBoyutTek(enUzun, 56, font.govde, ara - 44)));
  const S = Math.round(fps * 0.5);
  const bas = (i: number) => 8 + i * S;
  const vurguR = okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep, 3);
  const B = baslik ? (font.buyukHarf ? baslik.toUpperCase() : baslik) : '';
  const sonBas = bas(n - 1) + 16;
  const nb = sinirla((f - sonBas) / 12);
  const doldur = sinirla((f - sonBas) / 5);
  return (
    <AbsoluteFill>
      {B ? <div style={{ position: 'absolute', left: 140, top: 120, fontFamily: font.baslik, fontWeight: Math.max(700, font.baslikAgirlik), fontSize: 76, lineHeight: 1.05, color: palet.murekkep, letterSpacing: font.aralik, opacity: sinirla(f / 3), maxWidth: 1640 }}>{B}</div> : null}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {maddeler.slice(0, -1).map((_, i) => {
          const x0 = 140 + ara * (i + 0.5) + D / 2 + 16, x1 = 140 + ara * (i + 1.5) - D / 2 - 16;
          const c = ilerle(f, bas(i) + 8, S - 4, 'kubik-hizli');
          return c > 0 ? <line key={i} x1={x0} y1={CY} x2={x0 + (x1 - x0) * c} y2={CY} stroke={rgba(palet.murekkep, 0.6)} strokeWidth={7} strokeLinecap="round" strokeDasharray="0 18" /> : null;
        })}
      </svg>
      {maddeler.map((m, i) => {
        const s = bas(i), cx = 140 + ara * (i + 0.5);
        const r = ilerle(f, s, 10, 'kubik-hizli');
        if (r <= 0) return null;
        const gl = yay(sinirla((f - s - 5) / 12), 0.85);
        const et = ilerle(f, s + 8, 10, hareket);
        const yuz = Math.sin(((f - s) / fps) * 1.7 + i * 1.3) * 7 * sinirla((f - s - 22) / 15);
        const sonMu = i === n - 1;
        const nab = sonMu ? 1 + 0.018 * Math.sin(Math.PI * nb) : 1;
        const C = Math.PI * (D - SW);
        const M = font.buyukHarf ? m.toUpperCase() : m;
        return (
          <div key={i} style={{ position: 'absolute', left: cx - ara / 2, width: ara, top: CY - D / 2, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateY(${yuz.toFixed(2)}px)` }}>
            <div style={{ position: 'relative', width: D, height: D, transform: `scale(${nab.toFixed(4)})` }}>
              <svg width={D} height={D} style={{ position: 'absolute', inset: 0 }}>
                <circle cx={D / 2} cy={D / 2} r={(D - SW) / 2} fill={sonMu ? palet.vurgu : rgba(palet.zemin2, 0.55)} fillOpacity={sonMu ? doldur : 1} stroke={sonMu ? palet.vurgu : palet.murekkep} strokeWidth={SW} strokeDasharray={C} strokeDashoffset={C * (1 - r)} transform={`rotate(-90 ${D / 2} ${D / 2})`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.baslik, fontWeight: Math.max(700, font.baslikAgirlik), fontSize: D * 0.4, lineHeight: 1,
                color: sonMu && doldur > 0.5 ? zitYazi(palet.vurgu) : vurguR, opacity: sinirla((f - s - 5) / 4), transform: `translateY(${((1 - gl) * -D * 0.25).toFixed(2)}px)` }}>{String(i + 1).padStart(2, '0')}</div>
            </div>
            <div style={{ marginTop: 30, width: ara - 36, textAlign: 'center', fontFamily: font.govde, fontWeight: 800, fontSize: ET, lineHeight: 1.14, color: palet.murekkep, opacity: et, transform: `translateY(${(1 - et) * 16}px)` }}>{M}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** madde -> [ad, deger]: "Ad | 1,234", "Ad: $5M" ya da sondaki sayi belirteci ("Germany 12,400"); yoksa deger bos */
const defterAyir = (m: string): [string, string] => {
  if (m.includes('|')) { const k = m.lastIndexOf('|'); return [m.slice(0, k).trim(), m.slice(k + 1).trim()]; }
  const r = m.match(/^(.*?\S)\s*(?::|\s)\s*([$€£¥]?-?\d[\d.,]*\s?(?:%|[kKmMbB]n?|bn)?)$/);
  return r ? [r[1].replace(/[:\s]+$/, ''), r[2]] : [m, ''];
};
/** defter-listesi: gazete/dergi tablosu kagit sayfada. Baslik + cift cizgi; satirlar 0,25 sn'de bir %20 -> %100 opaklikla
 *  gelir, ad solda, deger saga hizali (tabular), arada noktali kilavuz; satir boyu madde sayisina gore 54 -> 44 px.
 *  Bitince basligin etrafina elle cizilmis vurgu elips cizilir (14 kare). */
const DefterListesi: React.FC<ListeProps> = ({ baslik, maddeler, stil }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font, hareket } = stil;
  const n = maddeler.length;
  const kagit = kagitTon(stil), ink = palet.acik ? palet.murekkep : karistir('#1a1a1a', palet.zemin, 0.4);
  const R = n <= 6 ? 56 : n <= 8 ? 48 : 42;
  const p = ilerle(f, 0, fps * 0.4, hareket);
  const B = baslik ? (font.buyukHarf ? baslik.toUpperCase() : baslik) : '';
  const BB = B ? Math.min(88, siganBoyutTek(B, 88, font.baslik, 1100)) : 0;
  const bw = B ? Math.min(1180, metinGenislik(B, BB, font.baslik)) : 0, bh = BB * 1.15;
  const tE = 10 + n * 8 + 6;
  const el = ilerle(f, tE, 14, 'kubik-hizli');
  const elR = okunurVurgu(palet.vurgu, kagit, ink, 3);
  const elipsYol = (() => {
    const rx = bw / 2 + 40, ry = bh / 2 + 22, cx = rx + 20, cy = ry + 16, r = rastgele(stil.tohum + 'el');
    const fz = r() * 6;
    return Array.from({ length: 49 }, (_, k) => { const a = -0.5 + (k / 48) * (Math.PI * 2 + 0.75); const w = 1 + 0.035 * Math.sin(a * 3 + fz); return `${k ? 'L' : 'M'} ${(cx + Math.cos(a) * rx * w + k * 0.25).toFixed(1)} ${(cy + Math.sin(a) * ry * w - k * 0.12).toFixed(1)}`; }).join(' ');
  })();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 1480, boxSizing: 'border-box', background: kagit, padding: '56px 96px 56px', boxShadow: `0 40px 100px ${rgba('#000', 0.45)}`, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
        {B ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{ fontFamily: font.baslik, fontWeight: Math.max(700, font.baslikAgirlik), fontSize: BB, lineHeight: 1.15, color: ink, letterSpacing: font.aralik, whiteSpace: 'nowrap' }}>{B}</div>
            {el > 0 ? <svg width={bw + 120} height={bh + 70} style={{ position: 'absolute', left: -60, top: -38, overflow: 'visible' }}>
              <path d={elipsYol} fill="none" stroke={elR} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - el} />
            </svg> : null}
          </div>
        ) : null}
        <div style={{ borderTop: `6px solid ${ink}`, borderBottom: `2px solid ${ink}`, height: 6, margin: `${B ? 22 : 0}px 0 18px` }} />
        {maddeler.map((m, i) => {
          const q = sinirla((f - 10 - i * 8) / 8);
          const [ad, deger] = defterAyir(m);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 18, padding: `${Math.round(R * 0.14)}px 0`, opacity: f < 10 + i * 8 ? 0 : 0.2 + 0.8 * q, borderBottom: `1px solid ${rgba(ink, 0.15)}` }}>
              <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: Math.max(36, R - 14), color: rgba(ink, 0.6), width: R * 1.3, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontFamily: font.govde, fontWeight: 700, fontSize: R, lineHeight: 1.15, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 900 }}>{ad}</div>
              {deger ? <div style={{ flex: 1, borderBottom: `5px dotted ${rgba(ink, 0.4)}`, transform: 'translateY(-0.2em)' }} /> : null}
              {deger ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: R + 4, color: ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{deger}</div> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- ALT BANT: kisi-karti ----------
/** kisi-karti: tam ekran kisi tanitimi. Bir tarafta krem kenarli dikey portre cercevesi (genisligin %33'u, yuksekligin
 *  %85'i; medyaUstu ise cerceve disi %74 karartilir -> alttaki foto/video yalniz cercevede gorunur), cerceve kenari 10 karede
 *  cizilir. Diger tarafta kademeli maske girisli yigin: rol cipi (alt'in ilk parcasi), dev ad (ust, ~%11 yukseklik,
 *  >= 72), satirlar (alt'in kalan parcalari, >= 44); kosede alt'taki ilk yilin %8 hayaleti. alt parcalari ' | ' ya da
 *  ' · ' ile ayrilir: "Rol | 1893-1958 | Aciklama". Tum yigin yavas itilir (donuk kalmaz). sag: cerceve solda. */
const KisiKarti: React.FC<{ ust: string; alt?: string; stil: Stil; sag?: boolean; medyaUstu: boolean; pencere?: number }> = ({ ust, alt, stil, sag: sag0, medyaUstu, pencere }) => {
  // pencere verilirse medya penceresi konunun uzerine oturur, yazi karsi tarafa gecer (hayvan / manzara cekiminde bos ot gorunmesin)
  const sag = pencere === undefined ? sag0 : pencere < 0.5;
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font } = stil;
  const parca = (alt || '').split(/\s*[|·]\s*/).filter(Boolean);
  const rol = parca.length > 1 ? parca[0] : '';
  const satir = parca.length > 1 ? parca.slice(1) : parca;
  const yil = (alt || '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1];
  const FW = 634, FH = 918, FT = 81, KEN = 120;
  const FL = pencere === undefined ? (sag ? KEN : 1920 - KEN - FW) : Math.max(KEN, Math.min(1920 - KEN - FW, pencere * 1920 - FW / 2));
  const TL = sag ? FL + FW + 100 : KEN, TW = sag ? 1920 - KEN - (FL + FW + 100) : FL - 100 - KEN;
  const cer = ilerle(f, 0, 10, 'kubik-hizli');
  const kar = ilerle(f, 0, 8, 'kubik-hizli');
  const yaziR = medyaUstu ? (palet.acik ? palet.zemin : palet.murekkep) : palet.murekkep;
  const solukR = medyaUstu ? rgba(yaziR, 0.82) : palet.soluk;
  const vurguR = okunurVurgu(palet.vurgu, medyaUstu ? '#141414' : palet.zemin, yaziR, 4.5);
  const krem = medyaUstu ? '#efe6d2' : rgba(palet.murekkep, 0.8);
  const U = font.buyukHarf ? ust.toUpperCase() : ust;
  const ad = yazYerlesim(U, 150, font.baslik, TW, 80);
  const df = darFont(stil);
  const maske = (gec: number, el: React.ReactNode, mb = 0) => {
    const q = yay(sinirla((f - gec) / (fps * 0.38)));
    return <div style={{ overflow: 'hidden', paddingBottom: 6, marginBottom: mb }}><div style={{ transform: `translateY(${((1 - q) * 108).toFixed(2)}%)` }}>{el}</div></div>;
  };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: FL, top: FT, width: FW, height: FH, boxShadow: medyaUstu ? `0 0 0 3000px ${rgba('#000', 0.74 * kar)}` : undefined }} />
      <svg width={FW + 8} height={FH + 8} style={{ position: 'absolute', left: FL - 4, top: FT - 4, transform: tutmaItme(f, fps, { hiz: 0.006 }) }}>
        <rect x={4} y={4} width={FW} height={FH} fill="none" stroke={krem} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cer} />
      </svg>
      {yil ? <div style={{ position: 'absolute', [sag ? 'right' : 'left']: KEN - 20, bottom: 30, ...df, fontSize: 300, lineHeight: 1, color: rgba(yaziR, 0.08 * cer), whiteSpace: 'nowrap' } as React.CSSProperties}>{yil}</div> : null}
      <div style={{ position: 'absolute', left: TL, width: TW, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: tutmaItme(Math.max(0, f - 12), fps, { hiz: 0.008 }), transformOrigin: sag ? 'left center' : 'right center' }}>
        {rol ? maske(6, <div style={{ display: 'inline-block', border: `3px solid ${vurguR}`, color: vurguR, fontFamily: font.mono, fontWeight: 700, fontSize: 40, letterSpacing: 5, padding: '6px 20px', textTransform: 'uppercase' }}>{rol}</div>, 18) : null}
        {ad.satirlar.map((s, k) => <React.Fragment key={k}>{maske(10 + k * 3, <div style={{ fontFamily: font.baslik, fontWeight: Math.max(700, font.baslikAgirlik), fontSize: ad.boyut, lineHeight: 1.04, color: yaziR, letterSpacing: font.aralik, textShadow: medyaUstu ? `0 4px 18px ${rgba('#000', 0.5)}` : undefined }}>{s}</div>)}</React.Fragment>)}
        {satir.length ? <div style={{ height: 5, width: 130 * ilerle(f, 16, 10, 'kubik-hizli'), background: vurguR, margin: '22px 0 20px' }} /> : null}
        {satir.slice(0, 3).map((s, k) => <React.Fragment key={k}>{maske(18 + k * 4, <div style={{ fontFamily: font.govde, fontWeight: 700, fontSize: k === 0 ? 52 : 46, lineHeight: 1.18, color: k === 0 ? yaziR : solukR }}>{s}</div>, 6)}</React.Fragment>)}
      </div>
    </AbsoluteFill>
  );
};
