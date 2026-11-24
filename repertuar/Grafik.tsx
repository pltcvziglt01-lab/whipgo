import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { OKUNUR, Stil, egri, ilerle, kademe, kameraNefes, karistir, kayma, kontrast, okunurVurgu, rastgele, rgba, siganBoyut, sinirla, yay } from './temel';
import { YonBulanik } from './Hareket';

// GRAFIK — veri animasyonlari. Ogrenildigi kanallar: @TheUnreturned-b2k (koyu panelde cizilen cizgi grafik),
// @ImmersivePast (eleme izgarasi: 1.171 -> 36 -> 2 kucuk siluet). Hepsi palete bagli; panel zemini paletin koyu tonundan.
// Opus galerisi (repertuar/envanter/opus-galeri/teknikler.json, oncelik 3): cubuk-trend (24 video), nokta-oran-izgarasi (9),
// cubuk-yarisi (7). Uc tip de DnaGrafik (veriler + etiketler) ile cizilebilir; cok donemli yaris icin DnaYaris (Dna.tsx).
// Ikinci galeri dalgasi: meclis-yarim-daire (2), ag-buyume (19), dongu-semasi (2), iliski-cipleri (1). DnaGrafik'in tek seri
// girdisinden de cizilir (CizgiGrafik yonlendirmesi); tam denetim icin ayri bilesenler: MeclisYarimDaire, AgBuyume, DonguSemasi, IliskiCipleri.
export const GRAFIK_TIPLERI = ['cizgi-isik', 'alan-dolgu', 'basamak', 'eleme-izgara', 'cubuk-trend', 'nokta-oran-izgarasi', 'cubuk-yarisi',
  'meclis-yarim-daire', 'ag-buyume', 'dongu-semasi', 'iliski-cipleri'] as const;
export type GrafikTip = typeof GRAFIK_TIPLERI[number];

const kisa = (v: number) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + 'K' : Math.round(v).toLocaleString('en-US'));

type TekSeriProps = { stil: Stil; veriler: number[]; etiketler?: string[]; baslik?: string; birim?: string; gec?: number; sure?: number };
/** TEK SERI GRAFIK (DnaGrafik buradan cizer): tip cubuk-trend / nokta-oran-izgarasi / cubuk-yarisi ise ilgili bilesene gider,
 *  digerleri cizgi grafik. Hook kullanmaz (yalniz yonlendirir). */
export const CizgiGrafik: React.FC<TekSeriProps & { tip: Exclude<GrafikTip, 'eleme-izgara'> }> = ({ tip, ...p }) => {
  if (tip === 'cubuk-trend') return <CubukTrend {...p} />;
  if (tip === 'nokta-oran-izgarasi') return <NoktaOran {...p} />;
  if (tip === 'meclis-yarim-daire') return <MeclisYarimDaire stil={p.stil} baslik={p.baslik} gec={p.gec} gruplar={p.veriler.map((v, i) => ({ ad: p.etiketler?.[i] ?? `#${i + 1}`, sayi: v }))} />;
  if (tip === 'ag-buyume') return <AgBuyume stil={p.stil} baslik={p.baslik} gec={p.gec} sure={p.sure} dugumler={p.veriler.length >= 3 ? p.veriler.map((v, i) => ({ ad: p.etiketler?.[i], skor: v })) : undefined} />;
  if (tip === 'dongu-semasi') return <DonguSemasi stil={p.stil} baslik={p.baslik} gec={p.gec} dugumler={p.etiketler?.length ? p.etiketler.slice(0, 3) : ['A', 'B', 'C']} turlar={p.veriler[0] ? Math.round(p.veriler[0]) : 3} />;
  if (tip === 'iliski-cipleri') return <IliskiCipleri stil={p.stil} gec={p.gec} cipler={p.etiketler?.length ? p.etiketler.slice(0, 3) : ['A', 'B']} aciklama={p.baslik ? [p.baslik] : []} />;
  if (tip === 'cubuk-yarisi') {
    const seriler = p.veriler.map((v, i) => ({ ad: p.etiketler?.[i] ?? `#${i + 1}`, degerler: [v] }));
    return <CubukYarisi stil={p.stil} seriler={seriler} baslik={p.baslik} birim={p.birim} gec={p.gec} />;
  }
  return <CizgiCiz tip={tip} {...p} />;
};

/** CIZGI GRAFIK: soldan saga cizilir, dugumler cizgi gectikce belirir, son deger buyuk etiket. veriler: y degerleri; etiketler: x ekseni */
const CizgiCiz: React.FC<TekSeriProps & { tip: 'cizgi-isik' | 'alan-dolgu' | 'basamak' }> = ({
  tip, stil, veriler, etiketler = [], baslik, birim = '', gec = 6, sure = 2.2,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const X0 = 220, X1 = W - 220, Y0 = H * 0.3, Y1 = H * 0.8;
  const mn = Math.min(0, ...veriler), mx = Math.max(...veriler) * 1.1 || 1;
  const n = veriler.length;
  const pt = (i: number, v: number) => ({ x: X0 + ((X1 - X0) * i) / Math.max(1, n - 1), y: Y1 - ((v - mn) / (mx - mn)) * (Y1 - Y0) });
  const p = egri('kubik-hizli', sinirla((f - gec) / (fps * sure)));
  const ilerleme = p * (n - 1);
  const noktalar: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (i <= ilerleme) noktalar.push(pt(i, veriler[i]));
    else {
      const k = ilerleme - (i - 1);
      if (k > 0) { const a = pt(i - 1, veriler[i - 1]), b = pt(i, veriler[i]); noktalar.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); }
      break;
    }
  }
  const yol = tip === 'basamak'
    ? noktalar.map((q, i) => (i ? `H${q.x.toFixed(1)} V${q.y.toFixed(1)}` : `M${q.x.toFixed(1)},${q.y.toFixed(1)}`)).join(' ')
    : noktalar.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  const son = noktalar[noktalar.length - 1] || pt(0, veriler[0]);
  const panel = palet.acik ? karistir(palet.murekkep, palet.zemin, 0.08) : karistir(palet.zemin, '#000000', 0.25);
  const cizgi = karistir(palet.vurgu, '#ffffff', 0.25);
  const g = ilerle(f, 0, fps * 0.4, stil.hareket);
  const sonDeger = veriler[Math.min(n - 1, Math.round(ilerleme))];
  return (
    <AbsoluteFill style={{ background: panel }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${rgba(palet.vurgu, 0.08)} 0%, transparent 60%)` }} />
      {baslik ? <div style={{ position: 'absolute', left: X0, top: Y0 - 150, fontFamily: font.govde, fontWeight: 700, fontSize: 40, letterSpacing: 5, color: rgba('#ffffff', 0.9), textTransform: 'uppercase', opacity: g }}>{baslik}</div> : null}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="gr-alan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={palet.vurgu} stopOpacity={0.45} /><stop offset="1" stopColor={palet.vurgu} stopOpacity={0} /></linearGradient>
          <filter id="gr-hale"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((k, i) => <line key={i} x1={X0} x2={X1} y1={Y1 - k * (Y1 - Y0)} y2={Y1 - k * (Y1 - Y0)} stroke={rgba('#ffffff', i ? 0.07 : 0.25)} strokeWidth={i ? 1 : 2} opacity={g} />)}
        {tip === 'alan-dolgu' && noktalar.length > 1 ? <path d={`${yol} L${son.x},${Y1} L${X0},${Y1} Z`} fill="url(#gr-alan)" /> : null}
        <path d={yol} fill="none" stroke={rgba(palet.vurgu, 0.8)} strokeWidth={12} filter="url(#gr-hale)" />
        <path d={yol} fill="none" stroke={cizgi} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        {veriler.map((v, i) => {
          if (i > ilerleme + 0.001) return null;
          const q = pt(i, v), s = ilerle(f, gec + (i / Math.max(1, n - 1)) * fps * sure, 8, 'geri-sekme');
          return <circle key={i} cx={q.x} cy={q.y} r={8 * s} fill="#ffffff" stroke={palet.vurgu} strokeWidth={3} />;
        })}
      </svg>
      {etiketler.map((e, i) => { const q = pt(i, 0); return <div key={i} style={{ position: 'absolute', left: q.x - 80, width: 160, top: Y1 + 18, textAlign: 'center', fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), fontSize: 32, color: rgba('#ffffff', 0.7), opacity: i <= ilerleme + 0.5 ? 1 : 0.15 }}>{e}</div>; })}
      {p > 0 ? (
        <div style={{ position: 'absolute', left: son.x + 22, top: son.y - 56, fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 64, color: '#ffffff', textShadow: `0 0 24px ${rgba(palet.vurgu, 0.6)}` }}>
          {kisa(sonDeger)}<span style={{ fontSize: 36, marginLeft: 6, color: cizgi }}>{birim}</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** ELEME IZGARASI: N kucuk ikon (siluet) izgarasi; asama asama elenenler soner, kalanlar vurgulanir. asamalar: [1171, 36, 2] */
export const ElemeIzgara: React.FC<{ stil: Stil; asamalar: number[]; etiketler?: string[]; ikon?: 'denizalti' | 'kisi' | 'nokta'; gec?: number; asamaSn?: number }> = ({
  stil, asamalar, etiketler = [], ikon = 'nokta', gec = 6, asamaSn = 1.6,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const N = Math.min(asamalar[0], 1600);
  const kol = Math.ceil(Math.sqrt(N * (W * 0.8) / (H * 0.62)));
  const sat = Math.ceil(N / kol);
  const hw = (W * 0.8) / kol, hh = (H * 0.62) / sat;
  const a = Math.min(asamalar.length - 1, Math.max(0, Math.floor((f - gec) / (fps * asamaSn))));
  const ap = sinirla(((f - gec) / (fps * asamaSn)) - a);
  // kalanlar: deterministik secim (indeks karmasi) — sonraki asama her zaman bir oncekinin alt kumesi
  const sira = (i: number) => ((i * 2654435761) >>> 0) % 100000;
  const esik = (k: number) => { const s = Array.from({ length: N }, (_, i) => sira(i)).sort((x, y) => x - y); return s[Math.min(N - 1, Math.max(0, Math.round((asamalar[k] / asamalar[0]) * N) - 1))]; };
  const e0 = esik(a), e1 = a + 1 < asamalar.length ? esik(a + 1) : e0;
  const sayi = Math.round(asamalar[a] + (a + 1 < asamalar.length ? (asamalar[a + 1] - asamalar[a]) * egri('ustel-sert', sinirla((ap - 0.6) / 0.4)) : 0));
  const sekil = (x: number, y: number, w: number, h: number, renk: string, op: number, key: number) =>
    ikon === 'denizalti' ? <g key={key} opacity={op}><ellipse cx={x + w / 2} cy={y + h * 0.55} rx={w * 0.42} ry={h * 0.16} fill={renk} /><rect x={x + w * 0.42} y={y + h * 0.28} width={w * 0.14} height={h * 0.2} fill={renk} /></g>
      : ikon === 'kisi' ? <g key={key} opacity={op}><circle cx={x + w / 2} cy={y + h * 0.3} r={Math.min(w, h) * 0.16} fill={renk} /><rect x={x + w * 0.32} y={y + h * 0.5} width={w * 0.36} height={h * 0.36} rx={w * 0.12} fill={renk} /></g>
        : <circle key={key} cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.3} fill={renk} opacity={op} />;
  return (
    <AbsoluteFill style={{ background: palet.acik ? palet.zemin : karistir(palet.zemin, '#000000', 0.3) }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: N }, (_, i) => {
          const x = W * 0.1 + (i % kol) * hw, y = H * 0.24 + Math.floor(i / kol) * hh;
          const s = sira(i);
          const simdi = s <= e0, sonra = s <= e1;
          const op = !simdi ? 0.08 : sonra ? 1 : 1 - 0.9 * egri('kubik-hizli', sinirla((ap - 0.5) / 0.4));
          const renk = sonra && a + 1 >= asamalar.length - 1 && ap > 0.6 ? palet.vurgu : simdi ? palet.murekkep : palet.soluk;
          return sekil(x, y, hw, hh, renk, op * (i < N * sinirla((f - gec + 4) / 10) ? 1 : 0), i);
        })}
      </svg>
      <div style={{ position: 'absolute', left: W * 0.1, top: H * 0.09, display: 'flex', alignItems: 'baseline', gap: 26 }}>
        <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 96, color: palet.vurgu, fontVariantNumeric: 'tabular-nums' }}>{sayi.toLocaleString('en-US')}</div>
        {etiketler[ap > 0.8 && a + 1 < asamalar.length ? a + 1 : a] ? <div style={{ fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontSize: 34, color: palet.murekkep, letterSpacing: 2, textTransform: 'uppercase' }}>{etiketler[ap > 0.8 && a + 1 < asamalar.length ? a + 1 : a]}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------- Opus galerisi grafikleri ----------------
/** grafik paneli (palete bagli): acik palette palet zemini + koyu murekkep, koyu palette koyulastirilmis zemin + acik murekkep.
 *  Yazi rengi hep palet.murekkep (zemine zit secilmis), gri ogeler soluk tonundan. */
const panelRenk = (stil: Stil) => {
  const { palet } = stil;
  const zemin = palet.acik ? palet.zemin : karistir(palet.zemin, '#000000', 0.25);
  return { zemin, yazi: palet.murekkep, gri: karistir(palet.soluk, zemin, palet.acik ? 0.25 : 0.35), cizgi: rgba(palet.murekkep, 0.14),
    /** yazi olarak vurgu (deger etiketi, buyuk sayi): zeminde 4,5:1 */
    vurguYazi: okunurVurgu(palet.vurgu, zemin, palet.murekkep) };
};
/** kisa sayi; veride kesirli deger varsa 10'un altinda tek ondalik (2.9 -> '2.9', 1 -> '1.0') */
const kisaD = (v: number, ondalik: boolean) => (ondalik && Math.abs(v) < 10 ? v.toFixed(1) : kisa(v));
/** kamera hic durmaz (galeri A-3): grafik icerigi 1,00 -> 1,03 nefes alir (kesimde zaten hareket halinde) */
const Nefes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <AbsoluteFill style={{ transform: `scale(${kameraNefes(f / fps, 0.03, 7, 1.5).toFixed(5)})` }}>{children}</AbsoluteFill>;
};
const GrafikBaslik: React.FC<{ stil: Stil; metin?: string; x: number; y: number; op: number; renk: string }> = ({ stil, metin, x, y, op, renk }) =>
  metin ? <div style={{ position: 'absolute', left: x, top: y, fontFamily: stil.font.govde, fontWeight: 800, fontSize: 44, letterSpacing: 5, color: renk, textTransform: 'uppercase', opacity: op, transform: `translateY(${(1 - op) * 14}px)` }}>{metin}</div> : null;

/** CUBUK TREND (galeri: asei-ikarashi, triglyceee, arthurkatcher): dikey cubuklar tabandan kutleli yayla (asimsiz) ~0,9 sn'de,
 *  0,1-0,25 sn kademeyle buyur; deger etiketi cubugun tepesine binip sayar. Vurgulanan cubuk(lar) vurgu renginde, digerleri
 *  gri-arduvaz. Hepsi bitince tepe noktalarindan ince trend cizgisi (nokta isaretli) 0,5 sn'de cizilir, ucundan kesikli ok ileri
 *  firlar. vurgu: vurgulanacak cubuk indeksleri (verilmezse son cubuk). Negatif deger desteklenmez (taban 0). */
export const CubukTrend: React.FC<TekSeriProps & { vurgu?: number[] }> = ({ stil, veriler, etiketler = [], baslik, birim = '', gec = 6, vurgu }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  const n = Math.max(1, veriler.length);
  const X0 = 230, X1 = W - 300, Y0 = H * 0.32, Y1 = H * 0.8;
  const mx = Math.max(1e-9, ...veriler.map((v) => Math.max(0, v))) * 1.12;
  const slot = (X1 - X0) / n, bw = Math.min(170, slot * 0.58);
  const vs = new Set(vurgu && vurgu.length ? vurgu : [n - 1]);
  const ondalik = veriler.some((x) => !Number.isInteger(x));
  const aralik = fps * sinirla(1.2 / n, 0.1, 0.25), buyu = fps * 0.9;
  const bas = (i: number) => gec + kademe(i, n, stil.tohum + 'ct') * aralik;
  const cx = (i: number) => X0 + slot * (i + 0.5);
  const tepe = (i: number, k = 1) => Y1 - (Math.max(0, veriler[i]) / mx) * (Y1 - Y0) * k;
  const g = yay(sinirla((f - gec + 6) / (fps * 0.4)));
  // trend cizgisi: son cubuk %80 buyudugunde baslar; deger etiketlerinin ustunden gecer
  const t0 = bas(n - 1) + buyu * 0.8, tSure = fps * 0.5;
  const tp = yay(sinirla((f - t0) / tSure));
  const nok = veriler.map((_, i) => ({ x: cx(i), y: tepe(i) - 100 }));
  const uzunluk = nok.reduce((a, q, i) => (i ? a + Math.hypot(q.x - nok[i - 1].x, q.y - nok[i - 1].y) : 0), 0);
  // kesikli ok: son iki noktanin yonunde (tek cubukta yukari) slot kadar ileri
  const son = nok[n - 1], once = nok[Math.max(0, n - 2)];
  const yon = n > 1 ? Math.atan2(son.y - once.y, son.x - once.x) : -Math.PI / 4;
  const okBoy = Math.min(slot * 0.95, 180);
  const op = yay(sinirla((f - t0 - tSure * 0.8) / (fps * 0.3)));
  const okUc = { x: son.x + Math.cos(yon) * okBoy * op, y: son.y + Math.sin(yon) * okBoy * op };
  const aci = (yon * 180) / Math.PI;
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 25% 15%, ${rgba(palet.vurgu, 0.07)} 0%, transparent 55%)` }} />
      <Nefes>
        <GrafikBaslik stil={stil} metin={baslik} x={X0} y={110} op={g} renk={P.yazi} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {[0.25, 0.5, 0.75, 1].map((k, i) => <line key={i} x1={X0} x2={X1} y1={Y1 - k * (Y1 - Y0)} y2={Y1 - k * (Y1 - Y0)} stroke={P.cizgi} strokeWidth={1.5} opacity={g} />)}
          <line x1={X0 - 20} x2={X1 + 20} y1={Y1} y2={Y1} stroke={rgba(palet.murekkep, 0.5)} strokeWidth={3} opacity={g} />
          {veriler.map((v, i) => {
            const p = yay(sinirla((f - bas(i)) / buyu));
            if (p <= 0) return null;
            const y = tepe(i, p);
            return <rect key={i} x={cx(i) - bw / 2} y={y} width={bw} height={Math.max(0, Y1 - y)} rx={4} fill={vs.has(i) ? palet.vurgu : P.gri} />;
          })}
          {tp > 0 && n > 1 ? (
            <path d={nok.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} fill="none" stroke={P.yazi} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={`${uzunluk} ${uzunluk}`} strokeDashoffset={uzunluk * (1 - tp)} />
          ) : null}
          {tp > 0 ? nok.map((q, i) => {
            // nokta, cizgi o noktaya vardiginda belirir (soldan saga)
            const k = yay(sinirla((tp * (n - 1) - i + 0.15) / 0.35));
            return k > 0 ? <circle key={i} cx={q.x} cy={q.y} r={9 * k} fill={P.zemin} stroke={P.yazi} strokeWidth={4} /> : null;
          }) : null}
          {op > 0 ? (
            <g>
              <line x1={son.x} y1={son.y} x2={okUc.x} y2={okUc.y} stroke={palet.vurgu} strokeWidth={5} strokeDasharray="14 12" strokeLinecap="round" />
              <polygon points="0,-13 24,0 0,13" fill={palet.vurgu} transform={`translate(${okUc.x},${okUc.y}) rotate(${aci})`} opacity={sinirla(op * 3 - 2)} />
            </g>
          ) : null}
        </svg>
        {veriler.map((v, i) => {
          const p = yay(sinirla((f - bas(i)) / buyu));
          const vurgulu = vs.has(i);
          const boy = vurgulu ? 64 : 44;
          return (
            <React.Fragment key={i}>
              {p > 0 ? <div style={{ position: 'absolute', left: cx(i) - 160, width: 320, top: tepe(i, p) - boy * 1.2, textAlign: 'center', fontFamily: font.baslik, fontWeight: Math.max(700, font.baslikAgirlik), fontSize: boy, lineHeight: 1.1, color: vurgulu ? P.vurguYazi : P.yazi, fontVariantNumeric: 'tabular-nums', opacity: sinirla(p * 3) }}>
                {kisaD(v * p, ondalik)}<span style={{ fontSize: boy * 0.6, marginLeft: 4 }}>{birim}</span>
              </div> : null}
              {etiketler[i] ? <div style={{ position: 'absolute', left: cx(i) - slot / 2, width: slot, top: Y1 + 18, textAlign: 'center', fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), fontSize: 36, color: rgba(palet.murekkep, 0.8), opacity: g }}>{etiketler[i]}</div> : null}
            </React.Fragment>
          );
        })}
      </Nefes>
    </AbsoluteFill>
  );
};

/** NOKTA ORAN IZGARASI (galeri: henkvaness, asei-ikarashi): oran dolumu. veriler = [pay, payda] (ornek [19, 20], [74, 100]);
 *  baska bicimde verilirse son deger yuzde sayilir (100'u asan seride son/en buyuk). Kutular satir satir vurgu rengine doner,
 *  buyuk sayi eszamanli sayar; payda 100 ise '74%', degilse '19' + altta '/ 20'. Tek aykiri kutu (payda - pay = 1) en son vurgu2
 *  ile yanar (anlamsal karsitlik). payda > 100 ise yuzdeye cevrilir. eleme-izgara'dan farki: siluet elemesi degil, oran dolumu. */
export const NoktaOran: React.FC<TekSeriProps> = ({ stil, veriler, baslik, birim, gec = 6 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  let pay: number, payda: number;
  if (veriler.length === 2 && veriler[1] > 0 && veriler[0] >= 0 && veriler[0] <= veriler[1]) { pay = veriler[0]; payda = veriler[1]; }
  else {
    const sonV = Math.max(0, veriler[veriler.length - 1] ?? 0), mxV = Math.max(1e-9, ...veriler);
    pay = mxV <= 100 ? sonV : (sonV / mxV) * 100; payda = 100;
  }
  if (payda > 100) { pay = (pay / payda) * 100; payda = 100; }
  pay = Math.round(pay); payda = Math.max(1, Math.round(payda));
  const kol = Math.min(10, payda);
  const sat = Math.ceil(payda / kol);
  const GX = 170, GW = W * 0.48, GH = H * 0.66;
  const hucre = Math.min(GW / kol, GH / sat, 150);
  const gx0 = GX + (GW - hucre * kol) / 2, gy0 = (H - hucre * sat) / 2;
  const kutu = hucre * 0.78;
  const aykiri = payda - pay === 1;
  const dolum = fps * sinirla(pay * 0.05, 0.9, 2.2), d0 = gec + fps * 0.35;
  const yan = (k: number) => d0 + (pay > 1 ? (k / (pay - 1)) * dolum : 0);
  let sayac = 0;
  for (let k = 0; k < pay; k++) if (f >= yan(k)) sayac = k + 1;
  const aykiriT = d0 + dolum + fps * 0.35;
  const g = yay(sinirla((f - gec + 4) / (fps * 0.4)));
  const yuzdeli = payda === 100;
  const kesir = yay(sinirla((f - d0 - dolum) / (fps * 0.4)));
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <Nefes>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: payda }, (_, k) => {
            const x = gx0 + (k % kol) * hucre + (hucre - kutu) / 2, y = gy0 + Math.floor(k / kol) * hucre + (hucre - kutu) / 2;
            // bos kutular satir kademesiyle belirir, dolacak olan yanma aninda 4 karede vurguya doner + hafif cokup oturma
            const giris = yay(sinirla((f - gec - (Math.floor(k / kol) / sat) * fps * 0.3) / (fps * 0.3)));
            const dolu = k < pay ? yay(sinirla((f - yan(k)) / 4)) : aykiri && k === pay ? yay(sinirla((f - aykiriT) / 5)) : 0;
            const renk = k < pay ? palet.vurgu : palet.vurgu2;
            const s = 1 - 0.12 * Math.sin(Math.PI * dolu);
            return (
              <g key={k} opacity={giris} transform={`translate(${x + kutu / 2},${y + kutu / 2}) scale(${s}) translate(${-kutu / 2},${-kutu / 2})`}>
                <rect width={kutu} height={kutu} rx={kutu * 0.18} fill={rgba(palet.murekkep, 0.1)} stroke={rgba(palet.murekkep, 0.22)} strokeWidth={2} />
                {dolu > 0 ? <rect width={kutu} height={kutu} rx={kutu * 0.18} fill={renk} opacity={dolu} /> : null}
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', left: W * 0.62, top: 0, bottom: 0, width: W * 0.32, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: g }}>
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 210, lineHeight: 1, color: P.vurguYazi, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {sayac}{yuzdeli ? <span style={{ fontSize: 120 }}>{birim || '%'}</span> : null}
          </div>
          {!yuzdeli ? <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 84, lineHeight: 1.1, color: rgba(palet.murekkep, 0.75), opacity: kesir, transform: `translateY(${(1 - kesir) * 16}px)` }}>/ {payda}{birim ? ` ${birim}` : ''}</div> : null}
          {baslik ? <div style={{ marginTop: 28, fontFamily: font.govde, fontWeight: 800, fontSize: 48, lineHeight: 1.15, letterSpacing: 2, color: P.yazi, textTransform: 'uppercase' }}>{baslik}</div> : null}
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

/** CUBUK YARISI (galeri: hugon001): siralama tablosu. Satirlar deger degistikce yer degistirir (~0,25 sn'lik yumusak kayma),
 *  vurgulu satir tirmanirken digerlerini iter, sira numarasi rulo gibi doner, vurgulu satir 1. siraya ilk vardiginda kisa darbe
 *  (olcek 1 -> 1,03 -> 1, asim yok). seriler: her biri bir satir, degerler donem basina; donemler: donem adlari (yil) sag altta
 *  buyuk. Tek donemlik veri (DnaGrafik) verilirse cubuklar kademeyle buyurken siralama kendiliginden degisir. Olcek her an
 *  en buyuk degere gore (yaris hissi). vurgu: vurgulanacak seri adi (verilmezse en cok sira kazanan). */
export type YarisSeri = { ad: string; degerler: number[] };
export const CubukYarisi: React.FC<{ stil: Stil; seriler: YarisSeri[]; donemler?: string[]; baslik?: string; birim?: string; vurgu?: string; adimSn?: number; gec?: number; enCok?: number }> = ({
  stil, seriler, donemler = [], baslik, birim = '', vurgu, adimSn = 1.0, gec = 8, enCok = 8,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  const n = seriler.length;
  const K = Math.max(1, ...seriler.map((s) => s.degerler.length));
  const tek = K === 1;
  const aralik = fps * sinirla(1.4 / Math.max(1, n), 0.12, 0.3), buyu = fps * 1.4;
  /** i. serinin (kesirli) karedeki degeri */
  const deger = (i: number, kare: number) => {
    const d = seriler[i].degerler;
    if (tek) return Math.max(0, d[0] || 0) * yay(sinirla((kare - gec - kademe(i, n, stil.tohum + 'cy') * aralik) / buyu));
    const s = sinirla((kare - gec) / (fps * adimSn), 0, K - 1);
    const k = Math.min(K - 2, Math.floor(s)), u = s - k;
    const a = d[k] ?? d[d.length - 1] ?? 0, b = d[k + 1] ?? a;
    return a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  };
  const siralar = (kare: number) => {
    const v = seriler.map((_, i) => deger(i, kare));
    const sira = v.map((_, i) => i).sort((x, y) => v[y] - v[x] || x - y);
    const r: number[] = [];
    sira.forEach((i, k) => { r[i] = k; });
    return { v, r };
  };
  // sira konumu: son ~0,25 sn'deki siralarin ucgen agirlikli ortalamasi -> 1-2 karede baslayan, asimsiz yumusak kayma
  const M = Math.max(3, Math.round(fps * 0.25));
  const konum = seriler.map(() => 0);
  let wt = 0;
  for (let j = 0; j < M; j++) {
    const w = M - j;
    siralar(f - j).r.forEach((x, i) => { konum[i] += x * w; });
    wt += w;
  }
  for (let i = 0; i < n; i++) konum[i] /= wt;
  const { v } = siralar(f);
  // vurgulu seri: adi verilmisse o; yoksa baslangic -> bitis en cok sira kazanan (esitlikte bitiste onde olan)
  const ilk = siralar(gec - 1).r, sonR = siralar(gec + (tek ? n * aralik + buyu : fps * adimSn * (K - 1)) + 1).r;
  let vi = seriler.findIndex((s) => s.ad === vurgu);
  if (vi < 0) {
    let en = -Infinity;
    vi = 0;
    seriler.forEach((_, i) => { const k = (ilk[i] - sonR[i]) - sonR[i] * 0.01; if (k > en) { en = k; vi = i; } });
  }
  // ilk kez 1. siraya vardigi kare -> darbe
  let zirve = -1;
  for (let k = Math.max(0, gec); k <= f; k++) { if (siralar(k).r[vi] === 0) { zirve = k; break; } }
  const darbe = zirve >= 0 ? 1 + 0.03 * Math.sin(Math.PI * sinirla((f - zirve) / 9)) : 1;
  const N = Math.min(enCok, n);
  const Y0 = H * 0.24, RH = (H * 0.64) / N, BH = RH * 0.64;
  const X0 = 640, XM = W - 360;
  const ondalik = seriler.some((sr) => sr.degerler.some((x) => !Number.isInteger(x)));
  const enBuyuk = Math.max(1e-9, ...v);
  const g = yay(sinirla((f - gec + 6) / (fps * 0.4)));
  const s = sinirla((f - gec) / (fps * adimSn), 0, K - 1);
  const donem = !tek && donemler.length ? donemler[Math.min(donemler.length - 1, Math.round(s))] : '';
  const rakamH = 48, yb = Math.max(OKUNUR.enaz + 4, Math.min(48, RH * 0.42));
  // ad sutunu (200 .. X0-26): en uzun ad sigacak boyut, en az 36 px (daha uzunsa kirpilir)
  const adB = Math.max(OKUNUR.enaz + 4, siganBoyut(seriler.map((sr) => sr.ad), yb, font.govde, X0 - 226));
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <Nefes>
        <GrafikBaslik stil={stil} metin={baslik} x={110} y={Y0 - 130} op={g} renk={P.yazi} />
        {donem ? <div style={{ position: 'absolute', right: 110, bottom: 60, fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 150, lineHeight: 1, color: rgba(palet.murekkep, 0.85), fontVariantNumeric: 'tabular-nums', opacity: g }}>{donem}</div> : null}
        {seriler.map((sr, i) => {
          const y = Y0 + konum[i] * RH;
          const gor = sinirla(N - konum[i]) * g;
          if (gor <= 0) return null;
          const genis = Math.max(0, (v[i] / enBuyuk) * (XM - X0));
          const vurgulu = i === vi;
          const sc = vurgulu ? darbe : 1;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: y, width: W, height: RH, opacity: gor, zIndex: vurgulu ? 2 : 1 }}>
              {/* rulo sira numarasi: satirin surekli konumunu gosterir (tirmanirken rakamlar kayar) */}
              <div style={{ position: 'absolute', left: 110, top: (RH - rakamH) / 2, height: rakamH, overflow: 'hidden', width: 80 }}>
                <div style={{ transform: `translateY(${-konum[i] * rakamH}px)` }}>
                  {Array.from({ length: n }, (_, k) => <div key={k} style={{ height: rakamH, lineHeight: `${rakamH}px`, fontFamily: font.mono, fontWeight: 700, fontSize: 40, color: vurgulu ? P.vurguYazi : rgba(palet.murekkep, 0.6), fontVariantNumeric: 'tabular-nums' }}>{String(k + 1).padStart(2, '0')}</div>)}
                </div>
              </div>
              <div style={{ position: 'absolute', left: 200, width: X0 - 200 - 26, top: 0, height: RH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: font.govde, fontWeight: 800, fontSize: adB, color: P.yazi, whiteSpace: 'nowrap', overflow: 'hidden' }}>{sr.ad}</div>
              <div style={{ position: 'absolute', left: X0, top: (RH - BH) / 2, width: genis, height: BH, background: vurgulu ? palet.vurgu : P.gri, borderRadius: 4, transform: `scale(${sc})`, transformOrigin: 'left center' }} />
              <div style={{ position: 'absolute', left: X0 + genis * sc + 18, top: 0, height: RH, display: 'flex', alignItems: 'center', fontFamily: font.mono, fontWeight: 700, fontSize: yb, color: vurgulu ? P.vurguYazi : P.yazi, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{kisaD(v[i], ondalik)}{birim ? ` ${birim}` : ''}</div>
            </div>
          );
        })}
      </Nefes>
    </AbsoluteFill>
  );
};

// ---------------- Opus galerisi, ikinci dalga ----------------
const ilr = (f: number, bas: number, sure: number) => sinirla((f - bas) / Math.max(1, sure));
/** dolgu uzerinde okunur yazi rengi: beyaz ya da koyu (hangisi daha zitsa) */
const dolguYazi = (dolgu: string) => (kontrast('#ffffff', dolgu) >= kontrast('#141414', dolgu) ? '#ffffff' : '#141414');

/** MECLIS YARIM DAIRE (galeri: 2 video): N koltuk es merkezli yarim daire siralarinda nokta (cercevenin ~%45'i), ortada buyuk
 *  toplam. Once tum noktalar gri hayalet (0,5 sn), sonra her grup acisal sirayla nokta nokta boyanir (kucuk grup 6 kare,
 *  buyuk 10 kare), en son lejant (renk karesi + ad + sayi) solar. Renk: vurgu grubu (varsayilan en buyuk) palet.vurgu, digerleri
 *  notr murekkep rampasi (tek doygun vurgu); grup.renk elle verilebilir. Secim, oylama, bolunme, meclis anlatimi. */
export type MeclisGrup = { ad: string; sayi: number; renk?: string };
export const MeclisYarimDaire: React.FC<{ stil: Stil; gruplar: MeclisGrup[]; baslik?: string; vurgu?: number; gec?: number; birim?: string }> = ({ stil, gruplar, baslik, vurgu, gec = 6, birim = '' }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  const gs = gruplar.filter((g) => g.sayi > 0).map((g) => ({ ...g, sayi: Math.round(g.sayi) }));
  const N = Math.max(1, Math.min(800, gs.reduce((a, g) => a + g.sayi, 0)));
  const vi = vurgu ?? gs.reduce((b, g, i) => (g.sayi > gs[b].sayi ? i : b), 0);
  const notr = gs.map((_, i) => i).filter((i) => i !== vi);
  const renk = (i: number) => gs[i].renk || (i === vi ? palet.vurgu : karistir(palet.murekkep, P.zemin, 0.12 + 0.55 * (notr.indexOf(i) / Math.max(1, notr.length))));
  // koltuk yerlesimi: satir sayisi ~ sqrt(0,273 N); satir basina koltuk yaricapla orantili
  const S = Math.max(2, Math.round(Math.sqrt(0.273 * N)));
  const r0 = 0.45, R = W * 0.235, cx = W / 2, cy = H * 0.7;
  const yr = Array.from({ length: S }, (_, k) => r0 + ((1 - r0) * k) / (S - 1));
  const top = yr.reduce((a, b) => a + b, 0);
  const adet = yr.map((r) => Math.max(1, Math.round((N * r) / top)));
  adet[S - 1] += N - adet.reduce((a, b) => a + b, 0);
  const koltuk: { x: number; y: number; a: number }[] = [];
  yr.forEach((r, k) => { for (let j = 0; j < adet[k]; j++) { const a = Math.PI * (1 - (adet[k] > 1 ? j / (adet[k] - 1) : 0.5)); koltuk.push({ x: cx + R * r * Math.cos(a), y: cy - R * r * Math.sin(a), a }); } });
  koltuk.sort((p, q) => q.a - p.a);
  const nr = (0.42 * (1 - r0) * R) / Math.max(1, S - 1);
  // grup zamanlari: hayalet 0,5 sn, sonra sirayla
  const hay = gec + fps * 0.5;
  const sureG = gs.map((g) => Math.round(6 + 4 * sinirla((g.sayi / N - 0.05) / 0.4)));
  const basG: number[] = [];
  let tt = hay;
  sureG.forEach((d, i) => { basG[i] = tt; tt += d + 2; });
  const sahip: number[] = [];
  let sira = 0;
  gs.forEach((g, i) => { for (let k = 0; k < g.sayi; k++) sahip[sira++] = i; });
  const ici: number[] = [];
  const say: number[] = gs.map(() => 0);
  sahip.forEach((g, k) => { ici[k] = say[g]++; });
  const g0 = yay(ilr(f, gec - 6, fps * 0.4));
  const leg = yay(ilr(f, tt + 4, fps * 0.45));
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <Nefes>
        <GrafikBaslik stil={stil} metin={baslik} x={110} y={90} op={g0} renk={P.yazi} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {koltuk.map((q, k) => {
            const g = sahip[k] ?? 0;
            const hy = yay(ilr(f, gec + (1 - q.a / Math.PI) * fps * 0.25, fps * 0.3));
            const b = sinirla((f - basG[g] - (ici[k] / Math.max(1, gs[g].sayi)) * sureG[g]) / 3);
            return <circle key={k} cx={q.x} cy={q.y} r={nr} fill={b > 0 ? karistir(P.gri, renk(g), b) : P.gri} opacity={hy} />;
          })}
        </svg>
        <div style={{ position: 'absolute', left: cx - 300, width: 600, top: cy - 116, textAlign: 'center', opacity: g0 }}>
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: siganBoyut([String(N) + birim], 120, font.baslik, R * r0 * 1.7), lineHeight: 1, color: P.yazi, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(N * egri('kubik-hizli', ilr(f, gec, fps * 0.5))).toLocaleString('en-US')}{birim}</div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: cy + 46, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px 46px', padding: '0 120px', opacity: leg, transform: `translateY(${(1 - leg) * 14}px)` }}>
          {gs.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: font.govde, fontWeight: 800, fontSize: 40, color: P.yazi, whiteSpace: 'nowrap' }}>
              <div style={{ width: 30, height: 30, background: renk(i), borderRadius: 4 }} />{g.ad}<span style={{ fontWeight: 700, color: i === vi ? P.vurguYazi : rgba(palet.murekkep, 0.7), fontVariantNumeric: 'tabular-nums' }}>{g.sayi}</span>
            </div>
          ))}
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

/** AG BUYUME (galeri: 19 video): dugumler tek tek belirir (once seyrek, sonra yogun; zaman ~ (i/n)^0,55), kenarlar ince cizgi
 *  olarak cizilir, kenar boyunca kucuk halka darbeleri akar; dugum yaricapi skorla 1x -> 2,2x buyur. Sonda odak: yalniz iki
 *  dugum (odak; varsayilan en yuksek iki skor) ve aralarindaki yol vurgu renginde, digerleri %40'a iner; adlari + skorlari
 *  >= 40 px. dugumler: { ad, skor } (verilmezse n tohumlu dugum). Baglanti, etki agi, orgut semasi, ticaret agi. */
export const AgBuyume: React.FC<{ stil: Stil; dugumler?: { ad?: string; skor?: number }[]; n?: number; odak?: [number, number]; baslik?: string; gec?: number; sure?: number }> = ({
  stil, dugumler, n: nVer = 25, odak, baslik, gec = 6, sure = 3.2,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  const n = Math.max(3, Math.min(60, dugumler?.length || nVer));
  const r = rastgele(stil.tohum + 'ag');
  const ALTIN = Math.PI * (3 - Math.sqrt(5));
  const cx = W * 0.5, cy = H * 0.56, RX = W * 0.36, RY = H * 0.33;
  const dug = Array.from({ length: n }, (_, i) => {
    const rr = Math.sqrt((i + 0.6) / n), a = i * ALTIN + r() * 0.5;
    const skor = dugumler?.[i]?.skor ?? Math.round(5 + Math.pow(r(), 2.2) * 95);
    return { x: cx + Math.cos(a) * rr * RX + (r() - 0.5) * 30, y: cy + Math.sin(a) * rr * RY + (r() - 0.5) * 24, skor, ad: dugumler?.[i]?.ad };
  });
  const mx = Math.max(1, ...dug.map((d) => d.skor));
  const kenar: [number, number][] = [];
  for (let i = 1; i < n; i++) {
    const yak = Array.from({ length: i }, (_, j) => j).sort((a, b) => Math.hypot(dug[a].x - dug[i].x, dug[a].y - dug[i].y) - Math.hypot(dug[b].x - dug[i].x, dug[b].y - dug[i].y));
    kenar.push([yak[0], i]);
    if (yak[1] !== undefined && r() < 0.55) kenar.push([yak[1], i]);
  }
  const sirali = dug.map((_, i) => i).sort((a, b) => dug[b].skor - dug[a].skor);
  const [o1, o2] = odak || [sirali[0], sirali[1]];
  const gel = (i: number) => gec + fps * sure * Math.pow(i / n, 0.55);
  const odakP = yay(ilr(f, gec + fps * sure + fps * 0.25, fps * 0.5));
  const g0 = yay(ilr(f, gec - 6, fps * 0.4));
  const sonuk = (i: number) => (i === o1 || i === o2 ? 1 : 1 - 0.6 * odakP);
  // odak yolu: iki dugum arasi kenar varsa o, yoksa dogrudan ince vurgu cizgisi
  const odakKenar = kenar.findIndex(([a, b]) => (a === o1 && b === o2) || (a === o2 && b === o1));
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <Nefes>
        <GrafikBaslik stil={stil} metin={baslik} x={110} y={80} op={g0} renk={P.yazi} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {kenar.map(([a, b], k) => {
            const p = yay(ilr(f, gel(b), fps * 0.3));
            if (p <= 0) return null;
            const A = dug[a], B = dug[b];
            const op = 1 - 0.6 * odakP;
            const L = Math.hypot(B.x - A.x, B.y - A.y);
            const faz = ((f - gel(b)) / (fps * 1.6) + (k % 5) / 5) % 1;
            const px = A.x + (B.x - A.x) * faz, py = A.y + (B.y - A.y) * faz;
            return (
              <g key={k} opacity={k === odakKenar ? 1 : op}>
                <line x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * p} y2={A.y + (B.y - A.y) * p} stroke={rgba(palet.murekkep, 0.32)} strokeWidth={2} />
                {p >= 1 && L > 60 ? <circle cx={px} cy={py} r={5 + 4 * Math.sin(Math.PI * faz)} fill="none" stroke={rgba(palet.murekkep, 0.55 * Math.sin(Math.PI * faz))} strokeWidth={2} /> : null}
              </g>
            );
          })}
          {odakP > 0 ? (() => {
            const A = dug[o1], B = dug[o2];
            const L = Math.hypot(B.x - A.x, B.y - A.y);
            return <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={palet.vurgu} strokeWidth={5} strokeDasharray={`${L} ${L}`} strokeDashoffset={L * (1 - odakP)} />;
          })() : null}
          {dug.map((d, i) => {
            const p = yay(ilr(f, gel(i), fps * 0.3));
            if (p <= 0) return null;
            const b = yay(ilr(f, gel(i) + fps * 0.2, fps * 1.2));
            const rr = (12 + 1.2 * 12 * (d.skor / mx) * b) * p;
            const vurgulu = (i === o1 || i === o2) && odakP > 0;
            return <circle key={i} cx={d.x} cy={d.y} r={rr * (vurgulu ? 1 + 0.3 * odakP : 1)} fill={vurgulu ? karistir(P.gri, palet.vurgu, odakP) : P.gri}
              stroke={P.zemin} strokeWidth={3} opacity={sonuk(i)} />;
          })}
        </svg>
        {[o1, o2].map((i, k) => {
          const d = dug[i];
          const ad = d.ad || `#${i + 1}`;
          const sag = d.x < W * 0.62;
          return (
            <div key={k} style={{ position: 'absolute', top: d.y + (k === 0 ? -96 : 34), left: sag ? d.x + 30 : undefined, right: sag ? undefined : W - d.x + 30, opacity: odakP, transform: `translateY(${(1 - odakP) * 12}px)`,
              fontFamily: font.govde, fontWeight: 800, fontSize: 44, color: P.yazi, whiteSpace: 'nowrap', background: rgba(P.zemin, 0.85), padding: '2px 12px' }}>
              {ad}<span style={{ marginLeft: 14, color: P.vurguYazi, fontVariantNumeric: 'tabular-nums' }}>{Math.round(d.skor)}</span>
            </div>
          );
        })}
      </Nefes>
    </AbsoluteFill>
  );
};

/** DONGU SEMASI (galeri: 2 video): ucgen dizilmis 3 yuvarlak dugum; kuyruklu sinyal noktasi her 'turSn' sn'de ucgeni bir tur
 *  doner, gectigi dugumun kenari vurgu rengi atar, ortadaki buyuk tur sayaci her turda bir artar, sagda log satiri eklenir.
 *  turlar bitince nokta durur ve ilk dugum vurguyla dolar (glow yok: tek halka darbesi). Surec / kisir dongu / ekonomik
 *  cevrim anlatimi. dugumler: 3 ad (>= 40 px). */
export const DonguSemasi: React.FC<{ stil: Stil; dugumler: string[]; turlar?: number; turSn?: number; baslik?: string; gec?: number }> = ({ stil, dugumler, turlar = 3, turSn = 0.9, baslik, gec = 6 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  const ad = [0, 1, 2].map((i) => dugumler[i] ?? String.fromCharCode(65 + i));
  const cx = W * 0.36, cy = H * 0.57, RR = 290, NR = 118;
  const nok = [0, 1, 2].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3; return { x: cx + Math.cos(a) * RR, y: cy + Math.sin(a) * RR }; });
  const bas = gec + fps * 0.5;
  const T = fps * turSn;
  const u = sinirla((f - bas) / T, 0, turlar);
  const bitti = f - bas >= T * turlar;
  const konum = (uu: number) => {
    const fr = (uu % 1) * 3, k = Math.floor(fr), q = fr - k;
    const A = nok[k % 3], B = nok[(k + 1) % 3];
    return { x: A.x + (B.x - A.x) * q, y: A.y + (B.y - A.y) * q };
  };
  // dugum i'ye son varistan beri gecen sure -> kenar rengi 0,35 sn'de soner
  const isik = (i: number) => {
    let son = -1;
    for (let k = 0; k <= Math.floor(u * 3 + 1e-6); k++) if (k % 3 === i) son = k / 3;
    return son < 0 || f < bas ? 0 : 1 - sinirla(((u - son) * T) / (fps * 0.35));
  };
  const tur = Math.min(turlar, Math.floor(u + 1e-6));
  const sonP = yay(ilr(f, bas + T * turlar, fps * 0.35));
  const g0 = yay(ilr(f, gec - 6, fps * 0.4));
  const log = Array.from({ length: tur }, (_, k) => k + 1).slice(-5);
  const logSatir = (k: number) => `${String(k).padStart(2, '0')} · ${ad[0]} → ${ad[1]} → ${ad[2]}`;
  const logB = Math.max(OKUNUR.enaz, siganBoyut([logSatir(99)], 40, font.mono, W * 0.32));
  const ok = (A: { x: number; y: number }, B: { x: number; y: number }) => {
    const L = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / L, uy = (B.y - A.y) / L;
    return { x1: A.x + ux * (NR + 12), y1: A.y + uy * (NR + 12), x2: B.x - ux * (NR + 22), y2: B.y - uy * (NR + 22), a: (Math.atan2(uy, ux) * 180) / Math.PI };
  };
  const kuyruk = Array.from({ length: 8 }, (_, k) => konum(Math.max(0, u - k * 0.018)));
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <Nefes>
        <GrafikBaslik stil={stil} metin={baslik} x={110} y={80} op={g0} renk={P.yazi} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {nok.map((A, i) => {
            const o = ok(A, nok[(i + 1) % 3]);
            return (
              <g key={i} opacity={g0}>
                <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={rgba(palet.murekkep, 0.35)} strokeWidth={4} />
                <polygon points="0,-11 20,0 0,11" fill={rgba(palet.murekkep, 0.5)} transform={`translate(${o.x2},${o.y2}) rotate(${o.a})`} />
              </g>
            );
          })}
          {!bitti && f >= bas ? kuyruk.map((q, k) => <circle key={k} cx={q.x} cy={q.y} r={14 - k * 1.4} fill={palet.vurgu} opacity={(1 - k / 8) * (k ? 0.5 : 1)} />) : null}
          {nok.map((q, i) => {
            const is = isik(i);
            const dolu = bitti && i === 0 ? sonP : 0;
            const gir = yay(ilr(f, gec + i * 3, fps * 0.4));
            return (
              <g key={'d' + i} opacity={gir}>
                <circle cx={q.x} cy={q.y} r={NR} fill={karistir(P.zemin, palet.vurgu, dolu)} stroke={karistir(palet.soluk, palet.vurgu, Math.max(is, dolu))} strokeWidth={6 + 4 * is} />
                {dolu > 0 && dolu < 1 ? <circle cx={q.x} cy={q.y} r={NR + 40 * dolu} fill="none" stroke={palet.vurgu} strokeWidth={4} opacity={1 - dolu} /> : null}
              </g>
            );
          })}
        </svg>
        {nok.map((q, i) => {
          const dolu = bitti && i === 0 ? sonP : 0;
          const b = siganBoyut([ad[i]], 46, font.govde, NR * 1.7);
          return <div key={i} style={{ position: 'absolute', left: q.x - NR, top: q.y - NR, width: NR * 2, height: NR * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            fontFamily: font.govde, fontWeight: 800, fontSize: Math.max(OKUNUR.enaz + 4, b), lineHeight: 1.05, color: dolu > 0.5 ? dolguYazi(palet.vurgu) : P.yazi, opacity: g0 }}>{ad[i]}</div>;
        })}
        <div style={{ position: 'absolute', left: cx - 160, width: 320, top: cy - 40, textAlign: 'center', fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 112, lineHeight: 1, color: P.vurguYazi, fontVariantNumeric: 'tabular-nums', opacity: g0 }}>
          ×{tur}
        </div>
        <div style={{ position: 'absolute', left: W * 0.64, top: H * 0.3, width: W * 0.32 }}>
          {log.map((k) => {
            const p = yay(ilr(f, bas + k * T, fps * 0.25));
            return <div key={k} style={{ fontFamily: font.mono, fontWeight: 700, fontSize: logB, lineHeight: 1.5, color: k === tur ? P.yazi : rgba(palet.murekkep, 0.55), whiteSpace: 'nowrap', opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
              {logSatir(k)}
            </div>;
          })}
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

/** ILISKI CIPLERI (galeri: 1 video): iki-uc renkli yuvarlak koseli cip (kurum / parti / kisi adi) dirsekli ince baglayiciyla
 *  birlesir: ilk cip yerinde acilir, ikinci cip kenardan 0,5 sn'de kayar (yon bulanikligi) ve cizgi onun arkasindan cizilir,
 *  ucuncusu 0,25 sn sonra; altta 1-2 satir aciklama (>= 40). bicim 'bolunme': A solda, B/C sagda (A ikiye ayrilir);
 *  'birlesme': B/C solda, A sagda. Renkler: A vurgu, B vurgu2 soluk (karsitlik), C kontur. Bolunme/birlesme/soy agaci. */
export const IliskiCipleri: React.FC<{ stil: Stil; cipler: string[]; aciklama?: string[]; baslik?: string; bicim?: 'bolunme' | 'birlesme'; gec?: number }> = ({ stil, cipler, aciklama = [], baslik, bicim = 'bolunme', gec = 6 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const P = panelRenk(stil);
  const c = cipler.slice(0, 3);
  const m = c.length;
  const birles = bicim === 'birlesme';
  const CH = 116, FS = 56;
  const gen = (s: string) => Math.min(680, s.length * FS * 0.62 + 110);
  const ay = H * 0.46;
  const yX = (i: number) => (i === 0 ? (birles ? W * 0.62 : W * 0.08) : (birles ? W * 0.08 : W * 0.58));
  const yY = (i: number) => (i === 0 || m === 2 ? ay : i === 1 ? ay - 150 : ay + 150);
  const varis = (i: number) => gec + fps * 0.45 + (i - 1) * fps * 0.25;
  const kay = (i: number, kare: number) => (i === 0 ? 0 : (1 - yay(ilr(kare, varis(i), fps * 0.5))) * (birles ? -1 : 1) * (W - yX(i) + 100));
  const renk = (i: number) => (i === 0 ? palet.vurgu : i === 1 ? karistir(palet.vurgu2, P.zemin, 0.35) : 'transparent');
  const A0 = yay(ilr(f, gec, fps * 0.4));
  const ac = yay(ilr(f, varis(m - 1) + fps * 0.4, fps * 0.5));
  return (
    <AbsoluteFill style={{ background: P.zemin }}>
      <Nefes>
        <GrafikBaslik stil={stil} metin={baslik} x={110} y={80} op={A0} renk={P.yazi} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {c.slice(1).map((_, k) => {
            const i = k + 1;
            if (f < varis(i)) return null;
            const ax = birles ? yX(0) : yX(0) + gen(c[0]), ayy = yY(0);
            const hedef = birles ? yX(i) + gen(c[i]) : yX(i);
            const bx = hedef + kay(i, f), by = yY(i);
            const mx = (ax + hedef) / 2;
            // cizgi cipin arkasindan gelir: dirsek yerinde, son yatay parca kayan cipin kenarina kadar uzanir
            const d = `M${ax},${ayy} H${mx} V${by} H${bx}`;
            return <path key={i} d={d} fill="none" stroke={rgba(palet.murekkep, 0.75)} strokeWidth={4} strokeLinejoin="round" />;
          })}
        </svg>
        {c.map((s, i) => {
          const x = yX(i) + kay(i, f);
          const gor = i === 0 ? A0 : f >= varis(i) ? 1 : 0;
          if (!gor) return null;
          const dolgu = renk(i);
          return (
            <YonBulanik key={i} dx={kayma((k) => kay(i, k), f)} style={{ position: 'absolute', left: x, top: yY(i) - CH / 2, height: CH, width: gen(s), opacity: gor,
              transform: i === 0 ? `scale(${(0.9 + 0.1 * A0).toFixed(4)})` : undefined }}>
              <div style={{ width: '100%', height: '100%', borderRadius: CH / 2, background: dolgu, border: i === 2 ? `5px solid ${palet.murekkep}` : 'none', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.govde, fontWeight: 800, fontSize: Math.max(OKUNUR.ikincil, siganBoyut([s], FS, font.govde, gen(s) - 70)),
                color: i === 2 ? P.yazi : dolguYazi(dolgu), whiteSpace: 'nowrap', boxShadow: i === 2 ? 'none' : `0 10px 26px ${rgba('#000', 0.22)}` }}>{s}</div>
            </YonBulanik>
          );
        })}
        <div style={{ position: 'absolute', left: W * 0.08, right: W * 0.08, top: H * 0.74, opacity: ac, transform: `translateY(${(1 - ac) * 14}px)` }}>
          {aciklama.slice(0, 2).map((a, i) => <div key={i} style={{ fontFamily: font.govde, fontWeight: i ? 600 : 700, fontSize: i ? 40 : 46, lineHeight: 1.3, color: i ? rgba(palet.murekkep, 0.75) : P.yazi }}>{a}</div>)}
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};
