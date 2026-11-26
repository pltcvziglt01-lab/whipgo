import React, { useId } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Medya, MedyaKaynak } from './Medya';
import { YonBulanik } from './Hareket';
import { OKUNUR, Stil, cikisEgri, kademe, kameraNefes, karistir, kayma, kontrast, okunurVurgu, rastgele, rgba, sinirla, yay, yazYerlesim, sayiYereli } from './temel';

// SAHNE — tam kadraj video sahnesi DUZENLERI (Opus 5.5 galerisi, repertuar/envanter/opus-galeri/teknikler.json).
// Medya ve metin alir, kendi zeminini ve kamerasini (nefes) cizer; sahne kurucu tek giris bileseni Sahne'yi cagirir.
// Galeri kurallari: tek doygun vurgu (palet.vurgu; vurgu2 yalniz anlamsal karsitlikta, soluk), asimsiz yay (temel.yay),
// glow / lens flare / mor gradyan yok, yazi ana >= 64 px, ikincil >= 40 px, hicbiri 36 px altinda (temel.OKUNUR).
// Kaynak sayilari (kac_video, 418 videoda): cizim-dolgu 23, kart-yelpaze-dagilma 18, birikimli-sahne 11, egik-kart-akisi 10,
// patlatilmis-gorunum 8, kalici-bag-nesnesi 6, karsitlik-paneli 5, spot-konisi 4, stil-dongusu 4, siluet-katman 2.
export const SAHNE_TIPLERI = ['cizim-dolgu', 'birikimli-sahne', 'patlatilmis-gorunum', 'siluet-katman', 'stil-dongusu',
  'kart-yelpaze-dagilma', 'egik-kart-akisi', 'karsitlik-paneli', 'kalici-bag-nesnesi', 'spot-konisi'] as const;
export type SahneTip = typeof SAHNE_TIPLERI[number];

/** sahnedeki bir oge (vurus, parca, kart, taraf). Hangi alanin nerede kullanildigi tipin aciklamasinda. */
export type SahneOge = {
  /** ad / baslik (kart basligi, parca adi, taraf adi, vurus basligi) */
  ad: string;
  /** sayi (birikimli-sahne sayac karti, karsitlik-paneli skor) ya da kisa deger metni */
  deger?: number | string;
  /** ogeye ait gorsel (kart fotografi, taraf portresi) */
  medya?: MedyaKaynak;
  /** ikinci satir (parca aciklamasi, sayac karti aciklamasi) */
  aciklama?: string;
  /** tarih cipi (birikimli-sahne) */
  tarih?: string;
  /** alt liste (karsitlik-paneli: tarafin sirayla degisen hamleleri) */
  alt?: string[];
};
/** cizim-dolgu icin cizim parcasi: 1000x1000 viewBox'ta SVG yolu. ton: dolgu rengi (palete bagli); 'cizgi' = yalniz kontur */
export type SekilParca = { d: string; ton?: 'vurgu' | 'murekkep' | 'soluk' | 'zemin2' | 'cizgi' };
export type HazirSekil = 'disli' | 'kubbe' | 'gemi';

export type SahneProps = {
  tip: SahneTip;
  stil: Stil;
  /** ana satir (>= 64 px) */
  baslik?: string;
  /** ikincil satir / alinti (>= 40 px) */
  altBaslik?: string;
  /** ust kucuk satir: yil / tarih (siluet-katman) */
  tarih?: string;
  /** gorseller: kartlar (yelpaze, egik akis), konu (stil-dongusu), zemin (spot-konisi, kalici-bag, siluet-katman), alinti portresi (karsitlik) */
  medya?: MedyaKaynak[];
  /** ogeler: vuruslar (birikimli), parcalar (patlatilmis), kart basliklari (egik akis), iki taraf (karsitlik) */
  ogeler?: SahneOge[];
  /** cizim-dolgu: hazir sekil adi ya da kendi parcalarin */
  sekil?: HazirSekil | SekilParca[];
  /** giris gecikmesi (kare) */
  gec?: number;
  /** vurus araligi (sn): birikimli-sahne, karsitlik-paneli hamleleri, stil-dongusu dunya degisimi */
  adim?: number;
  /** ana hareketin suresi (sn): cizim, isik konisi suzulmesi; patlatilmis-gorunum'de verilirse sonunda toplanir */
  sure?: number;
  /** kalici-bag-nesnesi: nesnenin kahraman olarak merkeze geldigi anlar (sn, sahne basindan) */
  anlar?: number[];
  /** kalici-bag-nesnesi: sembol ('sarmal' noktali sarmal, 'halka' turuncu daire) ya da kendi gorseli */
  sembol?: 'sarmal' | 'halka' | MedyaKaynak;
  /** kart-yelpaze-dagilma: true = daginik kartlar donerek merkeze cekilip tek karta toplanir (yelpazenin tersi) */
  toplan?: boolean;
  /** egik-kart-akisi sayaci [baslangic, bitis]; verilmezse kart sayisi */
  sayac?: [number, number];
  /** sayac birimi */
  birim?: string;
  /** odak oge indeksi (yelpazede buyuyen kart, patlatilmis gorunumde vurgulu parca) */
  odak?: number;
  /** kalici-bag-nesnesi: altta calisan sahne (verilmezse medya[0] ya da palet zemini) */
  children?: React.ReactNode;
};

/** TEK GIRIS: tip -> duzen. Hook kullanmaz (yalniz yonlendirir). */
export const Sahne: React.FC<SahneProps> = (p) => {
  switch (p.tip) {
    case 'cizim-dolgu': return <CizimDolgu {...p} />;
    case 'birikimli-sahne': return <BirikimliSahne {...p} />;
    case 'patlatilmis-gorunum': return <PatlatilmisGorunum {...p} />;
    case 'siluet-katman': return <SiluetKatman {...p} />;
    case 'stil-dongusu': return <StilDongusu {...p} />;
    case 'kart-yelpaze-dagilma': return <KartYelpaze {...p} />;
    case 'egik-kart-akisi': return <EgikKartAkisi {...p} />;
    case 'karsitlik-paneli': return <KarsitlikPaneli {...p} />;
    case 'kalici-bag-nesnesi': return <KaliciBagNesnesi {...p} />;
    case 'spot-konisi':
    default: return <SpotKonisi {...p} />;
  }
};

// ---------------- ortak yardimcilar ----------------
const url = (m: MedyaKaynak) => (m.src.startsWith('http') ? m.src : staticFile(m.src));
const useKimlik = () => 's' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
const ilerleme = (f: number, bas: number, sure: number) => sinirla((f - bas) / Math.max(1, sure));
/** kamera hic durmaz (galeri A-3): sahne icerigi 1,00 -> 1 + genlik nefes alir */
const Nefes: React.FC<{ genlik?: number; children: React.ReactNode }> = ({ genlik = 0.025, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <AbsoluteFill style={{ transform: `scale(${kameraNefes(f / fps, genlik, 7, 1.5).toFixed(5)})` }}>{children}</AbsoluteFill>;
};
/** zemin uzerinde okunur yazi rengi (murekkep ya da zemin, hangisi daha zitsa) */
const ustYazi = (zemin: string, a: string, b: string) => (kontrast(a, zemin) >= kontrast(b, zemin) ? a : b);

/** maskeli satir girisi: her satir kendi maskesinden asagidan yukari kayar (asimsiz yay). Boyut guvenli olarak kuculur,
 *  'enaz'in altina inmez (inecekse kelime sinirindan bolunur). */
const Yazi: React.FC<{
  stil: Stil; metin?: string; boyut: number; maxGen: number; enaz?: number; tur?: 'baslik' | 'govde' | 'mono'; renk: string;
  p: number; hiza?: 'left' | 'center' | 'right'; aralik?: number; satir?: number; agirlik?: number; italik?: boolean; style?: React.CSSProperties;
}> = ({ stil, metin, boyut, maxGen, enaz, tur = 'baslik', renk, p, hiza = 'left', aralik, satir = 1.08, agirlik, italik, style }) => {
  if (!metin) return null;
  const { font } = stil;
  const aile = tur === 'baslik' ? font.baslik : tur === 'mono' ? font.mono : font.govde;
  const buyuk = tur === 'baslik' ? font.buyukHarf : false;
  const ara = aralik ?? (tur === 'baslik' ? font.aralik : 0);
  const olc = buyuk ? metin.toUpperCase() : metin;
  const y = yazYerlesim(olc, boyut, aile, maxGen, enaz ?? (boyut >= OKUNUR.ana ? OKUNUR.ana : OKUNUR.enaz), ara);
  const w = agirlik ?? (tur === 'baslik' ? Math.max(font.baslikAgirlik, 400) : tur === 'mono' ? Math.max(700, font.monoAgirlik) : 800);
  return (
    <div style={{ textAlign: hiza, ...style }}>
      {y.satirlar.map((s, i) => {
        const k = yay(sinirla(p * 1.25 - i * 0.18));
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: y.boyut * 0.08, marginBottom: -y.boyut * 0.08 }}>
            <div style={{ fontFamily: aile, fontWeight: w, fontSize: y.boyut, lineHeight: satir, letterSpacing: ara, color: renk, whiteSpace: 'nowrap',
              fontStyle: italik ? 'italic' : 'normal', transform: `translateY(${((1 - k) * 105).toFixed(2)}%)`, opacity: k > 0 ? 1 : 0 }}>{s}</div>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================================================================================
// 1) CIZIM-DOLGU (23 video): illustrasyon once kontur olarak cizilir (stroke-dashoffset, ~2 sn, kenarda hafif "kaynama"
// titresimi), sonra dolgu alttan yukari akar; kontur ustte kalir. sekil: hazir ('disli' muhendislik, 'kubbe' tarih/mimari,
// 'gemi' denizcilik) ya da 1000x1000 viewBox'ta SekilParca[]. medya[0] verilirse 'vurgu' tonlu parcalar o gorselle dolar.
// Yazi: sagda baslik (>= 64) + altBaslik (>= 40). sure: cizim suresi (varsayilan 2 sn).
// =====================================================================================================================
const disliYol = (cx: number, cy: number, R: number, r: number, dis: number, delik: number) => {
  const T = (Math.PI * 2) / dis;
  const p: string[] = [];
  for (let j = 0; j < dis; j++) {
    const a = j * T;
    const nok = [[r, a], [R, a + 0.14 * T], [R, a + 0.44 * T], [r, a + 0.58 * T]];
    nok.forEach(([rr, aa], k) => p.push(`${j === 0 && k === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(aa)).toFixed(1)},${(cy + rr * Math.sin(aa)).toFixed(1)}`));
  }
  return `${p.join(' ')} Z M${cx + delik},${cy} A${delik},${delik} 0 1,0 ${cx - delik},${cy} A${delik},${delik} 0 1,0 ${cx + delik},${cy} Z`;
};
const daire = (cx: number, cy: number, r: number) => `M${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} Z`;
const HAZIR: Record<HazirSekil, SekilParca[]> = {
  disli: [
    { d: disliYol(500, 500, 400, 330, 14, 130), ton: 'vurgu' },
    { d: `${daire(500, 500, 235)} M630,500 A130,130 0 1,1 370,500 A130,130 0 1,1 630,500 Z`, ton: 'zemin2' },
    ...[0, 1, 2, 3, 4, 5].map((k) => ({ d: daire(500 + 182 * Math.cos((k * Math.PI) / 3), 500 + 182 * Math.sin((k * Math.PI) / 3), 26), ton: 'murekkep' as const })),
  ],
  kubbe: [
    { d: 'M110,860 H890 V905 H110 Z', ton: 'soluk' },
    { d: 'M170,820 H830 V860 H170 Z', ton: 'zemin2' },
    { d: 'M210,600 H790 V820 H210 Z', ton: 'zemin2' },
    ...[0, 1, 2, 3, 4, 5].map((k) => ({ d: `M${245 + k * 100},625 H${275 + k * 100} V815 H${245 + k * 100} Z`, ton: 'soluk' as const })),
    { d: 'M180,600 L500,520 L820,600 Z', ton: 'soluk' },
    { d: 'M300,520 H700 V455 H300 Z', ton: 'zemin2' },
    { d: 'M300,455 A200,200 0 0,1 700,455 Z', ton: 'vurgu' },
    { d: 'M500,255 C440,280 390,350 365,455 M500,255 C560,280 610,350 635,455 M500,255 V455', ton: 'cizgi' },
    { d: 'M470,255 H530 V205 H470 Z M470,205 A30,30 0 0,1 530,205 Z', ton: 'murekkep' },
  ],
  gemi: [
    { d: 'M100,800 Q175,770 250,800 T400,800 T550,800 T700,800 T850,800 T1000,800', ton: 'cizgi' },
    { d: 'M140,650 L860,650 L780,770 L220,770 Z', ton: 'vurgu' },
    { d: 'M570,560 H730 V650 H570 Z', ton: 'zemin2' },
    { d: 'M440,640 V200', ton: 'cizgi' },
    { d: 'M455,225 L455,610 L720,610 Z', ton: 'soluk' },
    { d: 'M425,250 L425,600 L230,600 Z', ton: 'zemin2' },
    { d: 'M440,200 L520,222 L440,244 Z', ton: 'murekkep' },
  ],
};

const CizimDolgu: React.FC<SahneProps> = ({ stil, sekil = 'disli', medya = [], baslik, altBaslik, gec = 6, sure = 2 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const id = useKimlik();
  const { palet } = stil;
  const parcalar = typeof sekil === 'string' ? HAZIR[sekil] || HAZIR.disli : sekil;
  const n = parcalar.length;
  const cizS = fps * sure;
  const ton = (t?: SekilParca['ton']) => t === 'vurgu' ? (medya[0] ? `url(#${id}im)` : palet.vurgu) : t === 'murekkep' ? palet.murekkep
    : t === 'soluk' ? karistir(palet.soluk, palet.zemin, 0.3) : t === 'zemin2' ? karistir(palet.zemin2, palet.murekkep, palet.acik ? 0.08 : 0.12) : 'none';
  const dolgu = yay(ilerleme(f, gec + cizS * 0.85, fps * 0.9));
  const S = 840, X = 150, Y = (H - S) / 2 + 10;
  const yazP = ilerleme(f, gec + fps * 0.5, fps * 0.7);
  const yaziRenk = palet.murekkep;
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba(palet.murekkep, 0.1)} 1.6px, transparent 1.6px)`, backgroundSize: '38px 38px' }} />
      <Nefes genlik={0.025}>
        <svg width={S} height={S} viewBox="0 0 1000 1000" style={{ position: 'absolute', left: X, top: Y, overflow: 'visible' }}>
          <defs>
            <clipPath id={`${id}dk`}><rect x={-20} width={1040} y={1010 - 1030 * dolgu} height={1030 * dolgu + 20} /></clipPath>
            {/* kaynama: kontur her 3 karede bir minik yer degistirir (elle cizim hissi; kenarda +-1,5 px) */}
            <filter id={`${id}ky`} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves={1} seed={Math.floor(f / 3) % 9} />
              <feDisplacementMap in="SourceGraphic" scale={3.2} />
            </filter>
            {medya[0] ? (
              <pattern id={`${id}im`} patternUnits="userSpaceOnUse" width={1000} height={1000}>
                <image href={url(medya[0])} width={1000} height={1000} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ) : null}
          </defs>
          <g clipPath={`url(#${id}dk)`}>
            {parcalar.map((q, i) => q.ton === 'cizgi' ? null : <path key={i} d={q.d} fill={ton(q.ton)} fillRule="evenodd" />)}
          </g>
          <g filter={`url(#${id}ky)`}>
            {parcalar.map((q, i) => {
              const bas = gec + kademe(i, n, stil.tohum + 'cz') * ((cizS * 0.5) / Math.max(1, n - 1));
              const k = yay(ilerleme(f, bas, cizS * 0.5));
              return k > 0 ? <path key={i} d={q.d} pathLength={1} fill="none" stroke={palet.murekkep} strokeWidth={q.ton === 'cizgi' ? 6 : 5.5}
                strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - k} /> : null;
            })}
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 1080, top: 0, bottom: 0, width: 720, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
          <div style={{ width: 120 * yay(yazP), height: 8, background: palet.vurgu }} />
          <Yazi stil={stil} metin={baslik} boyut={96} maxGen={720} renk={yaziRenk} p={yazP} />
          <Yazi stil={stil} metin={altBaslik} tur="govde" boyut={44} maxGen={700} renk={rgba(palet.murekkep, 0.82)} p={ilerleme(f, gec + fps * 0.8, fps * 0.7)} satir={1.2} />
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 2) BIRIKIMLI-SAHNE (11 video): bolum boyunca ayni zemin (gokyuzu + tepe siluet ufku) kalir; her vurus (ogeler[i]) bir yapi
// ekler: kontur asagidan yukari cizilir, cam dolgu alttan dolar. Odak yeni yapiya gecince eskiler %40'a iner. Ustte tarih cipi
// (ogeler[i].tarih) + baslik (ogeler[i].ad) her vurusta degisir (cip rengi vurgu <-> murekkep), altta sayacli aciklama karti
// (ogeler[i].deger sayar, ogeler[i].aciklama). adim: vurus araligi (varsayilan 1,6 sn). Yapi turleri sirayla: kule, kubbe,
// vinc, kemer (birim kutuda tanimli; durum biriktigi icin izleyici sureci gorur).
// =====================================================================================================================
type Yapi = { cizgi: string; dolgu?: string };
const YAPILAR: Yapi[] = [
  { cizgi: 'M0,1 V0 H1 V1 M0.33,1 V0.06 M0.66,1 V0.06 M0,0.82 H1 M0,0.64 H1 M0,0.46 H1 M0,0.28 H1 M0,0.12 H1', dolgu: 'M0,1 V0 H1 V1 Z' },
  { cizgi: 'M0.1,1 V0.55 H0.9 V1 M0.1,0.55 C0.1,0.2 0.35,0.06 0.5,0.06 C0.65,0.06 0.9,0.2 0.9,0.55 M0.3,0.55 C0.3,0.3 0.42,0.1 0.5,0.06 M0.7,0.55 C0.7,0.3 0.58,0.1 0.5,0.06 M0.5,0.55 V0.06', dolgu: 'M0.1,1 V0.55 C0.1,0.2 0.35,0.06 0.5,0.06 C0.65,0.06 0.9,0.2 0.9,0.55 V1 Z' },
  { cizgi: 'M0.28,1 V0.06 M0.4,1 V0.06 M0.28,0.9 L0.4,0.78 L0.28,0.66 L0.4,0.54 L0.28,0.42 L0.4,0.3 L0.28,0.18 L0.4,0.06 M0,0.06 H1 M0,0.12 H1 M0.9,0.12 V0.5 M0.84,0.5 H0.96', dolgu: 'M0,0.06 H0.18 V0.2 H0 Z' },
  { cizgi: 'M0,1 V0.4 C0,0.15 0.25,0.04 0.5,0.04 C0.75,0.04 1,0.15 1,0.4 V1 H0.76 V0.52 C0.76,0.36 0.64,0.28 0.5,0.28 C0.36,0.28 0.24,0.36 0.24,0.52 V1 Z', dolgu: 'M0,1 V0.4 C0,0.15 0.25,0.04 0.5,0.04 C0.75,0.04 1,0.15 1,0.4 V1 H0.76 V0.52 C0.76,0.36 0.64,0.28 0.5,0.28 C0.36,0.28 0.24,0.36 0.24,0.52 V1 Z' },
];
/** birim kutudaki mutlak SVG yolunu (M L H V C S Q T A Z) kutuya olcekler: kontur kalinligi bozulmaz, pathLength dogru kalir */
const olcekYol = (d: string, x: number, y: number, w: number, h: number) => {
  const parca = d.match(/[a-zA-Z]|-?[\d.]+(?:e-?\d+)?/g) || [];
  let k = 'M', i = 0;
  const out: string[] = [];
  const sayi = () => parseFloat(parca[i++]);
  const X = (v: number) => (x + v * w).toFixed(1), Y = (v: number) => (y + v * h).toFixed(1);
  while (i < parca.length) {
    if (/[a-zA-Z]/.test(parca[i])) { k = parca[i++]; out.push(k); if (k === 'Z' || k === 'z') continue; }
    switch (k) {
      case 'H': out.push(X(sayi())); break;
      case 'V': out.push(Y(sayi())); break;
      case 'A': { const rx = sayi(), ry = sayi(), r = sayi(), b1 = sayi(), b2 = sayi(); out.push(`${(rx * w).toFixed(1)},${(ry * h).toFixed(1)} ${r} ${b1},${b2} ${X(sayi())},${Y(sayi())}`); break; }
      default: { const a = sayi(); out.push(`${X(a)},${Y(sayi())}`); }
    }
  }
  return out.join(' ');
};
const BirikimliSahne: React.FC<SahneProps> = ({ stil, ogeler = [], baslik, gec = 6, adim = 1.6 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const id = useKimlik();
  const { palet, font } = stil;
  const og = ogeler.length ? ogeler : [{ ad: baslik || '' }];
  const n = og.length;
  const A = fps * adim;
  const aktif = Math.max(0, Math.min(n - 1, Math.floor((f - gec) / A)));
  const ufuk = H * 0.8;
  const yer = palet.acik ? karistir(palet.murekkep, palet.zemin, 0.2) : karistir(palet.zemin, '#000000', 0.45);
  const slot = (W * 0.7) / n;
  const yapiKutu = (i: number) => {
    const w = Math.min(300, slot * 0.66), h = H * (0.3 + 0.14 * ((i * 2) % 3) / 2 + (i === n - 1 ? 0.08 : 0));
    return { x: W * 0.15 + slot * (i + 0.5) - w / 2, y: ufuk - h, w, h };
  };
  const vbas = (i: number) => gec + i * A;
  const cipRenk = aktif % 2 === 0 ? palet.vurgu : palet.murekkep;
  const cipYazi = ustYazi(cipRenk, palet.zemin, palet.murekkep);
  const degis = ilerleme(f, vbas(aktif), fps * 0.35);
  const o = og[aktif];
  const onceki = og[aktif - 1];
  const sayiOnce = typeof onceki?.deger === 'number' && aktif > 0 ? onceki.deger : 0;
  const sayi = typeof o.deger === 'number' ? sayiOnce + (o.deger - sayiOnce) * yay(ilerleme(f, vbas(aktif) + fps * 0.2, fps * 0.9)) : null;
  const giris = yay(ilerleme(f, gec - 6, fps * 0.45));
  const tepe = `M0,${ufuk + 30} C${W * 0.15},${ufuk - 20} ${W * 0.3},${ufuk + 10} ${W * 0.45},${ufuk - 5} S${W * 0.8},${ufuk - 25} ${W},${ufuk + 5} V${H} H0 Z`;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${palet.zemin} 0%, ${palet.zemin2} 100%)` }}>
      <Nefes genlik={0.03}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {og.map((_, i) => {
            const k = yapiKutu(i);
            const yap = YAPILAR[i % YAPILAR.length];
            const c = yay(ilerleme(f, vbas(i), A * 0.6));
            if (c <= 0) return null;
            const d = yay(ilerleme(f, vbas(i) + A * 0.45, A * 0.45));
            const odak = i === aktif ? 1 : 0.4 + 0.6 * (1 - yay(ilerleme(f, vbas(aktif), fps * 0.3)));
            return (
              <g key={i} opacity={i === aktif ? 1 : odak}>
                <defs><clipPath id={`${id}c${i}`}><rect x={k.x - 20} width={k.w + 40} y={k.y + k.h - (k.h + 20) * d} height={(k.h + 20) * d + 10} /></clipPath></defs>
                {yap.dolgu ? <path d={olcekYol(yap.dolgu, k.x, k.y, k.w, k.h)} fill={i === aktif ? rgba(palet.vurgu, 0.85) : karistir(palet.soluk, palet.zemin2, 0.3)} clipPath={`url(#${id}c${i})`} /> : null}
                <path d={olcekYol(yap.cizgi, k.x, k.y, k.w, k.h)} fill="none" stroke={palet.murekkep} strokeWidth={3.5} pathLength={1}
                  strokeDasharray="1 1" strokeDashoffset={1 - c} strokeLinejoin="round" />
              </g>
            );
          })}
          <path d={tepe} fill={yer} />
        </svg>
        {/* ust: tarih cipi + vurus basligi */}
        <div style={{ position: 'absolute', left: 110, top: 80, display: 'flex', alignItems: 'center', gap: 28, opacity: giris }}>
          {o.tarih ? (
            <div style={{ background: cipRenk, color: cipYazi, padding: '6px 22px', fontFamily: font.mono, fontWeight: 700, fontSize: 44, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>{o.tarih}</div>
          ) : null}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ transform: `translateY(${((1 - yay(degis)) * 100).toFixed(2)}%)` }}>
              <Yazi stil={stil} metin={o.ad} boyut={80} maxGen={1250} renk={palet.murekkep} p={1} />
            </div>
          </div>
        </div>
        {/* alt: sayacli aciklama karti (yer bandinin ustunde) */}
        {sayi !== null || o.aciklama ? (
          <div style={{ position: 'absolute', left: 110, top: ufuk + 34, display: 'flex', alignItems: 'center', gap: 26, padding: '14px 30px', background: palet.zemin,
            borderLeft: `8px solid ${palet.vurgu}`, opacity: giris, boxShadow: `0 10px 30px ${rgba('#000', 0.25)}` }}>
            {sayi !== null ? <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 72, lineHeight: 1, color: okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep), fontVariantNumeric: 'tabular-nums' }}>{Math.round(sayi).toLocaleString(sayiYereli())}</div> : null}
            {o.aciklama ? <div style={{ fontFamily: font.govde, fontWeight: 700, fontSize: 40, color: palet.murekkep, maxWidth: 900, opacity: sinirla(degis * 2) }}>{o.aciklama}</div> : null}
          </div>
        ) : null}
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 3) PATLATILMIS-GORUNUM (8 video): izometrik parca yigini once yan profilden izometriye doner (0,45 sn), sonra parcalar dikey
// eksen boyunca ayrisir (kademeli, asimsiz), her parcaya ince kirik lider cizgiyle etiket (ad >= 40, aciklama >= 36) baglanir.
// ogeler: ustten alta parcalar (ad, aciklama). odak: vurgu renkli parca (varsayilan 0). sure verilirse sure sonunda ters
// sirayla toplanir. Silah, motor, bina kesiti, cihaz anlatimi.
// =====================================================================================================================
const PatlatilmisGorunum: React.FC<SahneProps> = ({ stil, ogeler = [], baslik, gec = 6, odak = 0, sure }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const og = ogeler.length ? ogeler : [{ ad: 'A' }, { ad: 'B' }, { ad: 'C' }, { ad: 'D' }];
  const n = og.length;
  const s = 1.0, cx = W * 0.3, cy = H * 0.58;
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  const egim = 0.12 + 0.66 * yay(ilerleme(f, gec, fps * 0.45));
  const P = (x: number, y: number, z: number) => [cx + (x - y) * C30 * s, cy + (x + y) * S30 * egim * s - z * s] as [number, number];
  const poly = (pts: [number, number][]) => pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');
  // parca olculeri: tohumlu genislik/kalinlik; silindir ve kutu sirayla
  const parca = og.map((_, i) => {
    const r = rastgele(stil.tohum + 'pg' + i);
    return { a: 100 + r() * 60, t: 34 + r() * 36, silindir: i % 2 === 1 };
  });
  const bosluk = Math.min(105, (H * 0.42) / n);
  const ayri = (i: number) => {
    const ac = yay(ilerleme(f, gec + fps * 0.45 + kademe(i, n, stil.tohum + 'pa') * 4, fps * 0.55));
    const top = sure ? 1 - yay(ilerleme(f, gec + fps * sure - fps * 0.6 + (n - 1 - i) * 3, fps * 0.5)) : 1;
    return ac * top;
  };
  // z tabanlari (alttan uste: ogeler[n-1] en altta)
  const tabanlar: number[] = [];
  let z = 0;
  for (let i = n - 1; i >= 0; i--) { tabanlar[i] = z; z += parca[i].t; }
  const acOrt = og.reduce((a, _, i) => a + ayri(i), 0) / n;
  const zb = (i: number) => tabanlar[i] + (n - 1 - i) * bosluk * ayri(i) - (z + (n - 1) * bosluk * acOrt) / 2;
  const yuzRenk = (i: number) => {
    const v = i === odak;
    const b = v ? palet.vurgu : karistir(palet.soluk, palet.zemin, palet.acik ? 0.15 : 0.3);
    return { ust: karistir(b, '#ffffff', 0.18), sag: b, sol: karistir(b, '#000000', 0.28) };
  };
  const kenar = rgba(palet.murekkep, 0.35);
  const etiketX = W * 0.6;
  const g = yay(ilerleme(f, gec - 4, fps * 0.4));
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${rgba(palet.murekkep, 0.05)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(palet.murekkep, 0.05)} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
      <Nefes genlik={0.025}>
        <div style={{ position: 'absolute', left: 110, top: 70, opacity: g }}>
          <Yazi stil={stil} metin={baslik} boyut={76} maxGen={1300} renk={palet.murekkep} p={ilerleme(f, gec, fps * 0.6)} />
        </div>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {/* alttan uste ciz (ustteki parca en son) */}
          {og.map((_, k) => {
            const i = n - 1 - k;
            const { a, t, silindir } = parca[i];
            const z0 = zb(i), z1 = z0 + t;
            const c = yuzRenk(i);
            if (silindir) {
              const rx = Math.SQRT2 * a * C30 * s, ry = Math.SQRT2 * a * S30 * egim * s;
              const [ox, oy0] = P(0, 0, z0), [, oy1] = P(0, 0, z1);
              return (
                <g key={i}>
                  <path d={`M${ox - rx},${oy1} L${ox - rx},${oy0} A${rx},${ry} 0 0,0 ${ox + rx},${oy0} L${ox + rx},${oy1} Z`} fill={c.sol} stroke={kenar} strokeWidth={1.5} />
                  <path d={`M${ox},${oy1 + ry} A${rx},${ry} 0 0,0 ${ox + rx},${oy1} L${ox + rx},${oy0} A${rx},${ry} 0 0,1 ${ox},${oy0 + ry} Z`} fill={c.sag} />
                  <ellipse cx={ox} cy={oy1} rx={rx} ry={ry} fill={c.ust} stroke={kenar} strokeWidth={1.5} />
                  <ellipse cx={ox} cy={oy1} rx={rx * 0.35} ry={ry * 0.35} fill="none" stroke={kenar} strokeWidth={2} />
                </g>
              );
            }
            return (
              <g key={i} stroke={kenar} strokeWidth={1.5} strokeLinejoin="round">
                <polygon points={poly([P(-a, a, z0), P(a, a, z0), P(a, a, z1), P(-a, a, z1)])} fill={c.sol} />
                <polygon points={poly([P(a, -a, z0), P(a, a, z0), P(a, a, z1), P(a, -a, z1)])} fill={c.sag} />
                <polygon points={poly([P(-a, -a, z1), P(a, -a, z1), P(a, a, z1), P(-a, a, z1)])} fill={c.ust} />
              </g>
            );
          })}
          {/* lider cizgiler */}
          {og.map((_, i) => {
            const { a, t } = parca[i];
            const l = yay(ilerleme(f, gec + fps * 0.85 + i * 4, fps * 0.4)) * ayri(i);
            if (l <= 0) return null;
            const [px, py] = P(a, 0, zb(i) + t / 2);
            const ly = H * 0.26 + i * ((H * 0.62) / Math.max(1, n - 1 || 1)) * (n > 1 ? 1 : 0);
            const kx = px + 40;
            const yol = `M${px},${py} L${kx},${py} L${kx + Math.abs(ly - py) * 0.4},${ly} L${etiketX - 20},${ly}`;
            return (
              <g key={'l' + i}>
                <circle cx={px} cy={py} r={6} fill={palet.murekkep} opacity={l} />
                <path d={yol} fill="none" stroke={rgba(palet.murekkep, 0.7)} strokeWidth={2.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - l} />
              </g>
            );
          })}
        </svg>
        {og.map((o, i) => {
          const l = yay(ilerleme(f, gec + fps * 1.05 + i * 4, fps * 0.4)) * ayri(i);
          const ly = H * 0.26 + i * ((H * 0.62) / Math.max(1, n - 1)) * (n > 1 ? 1 : 0);
          return (
            <div key={i} style={{ position: 'absolute', left: etiketX, top: ly - 32, width: W - etiketX - 100, opacity: sinirla(l * 1.5) }}>
              <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: i === odak ? okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep) : palet.murekkep, transform: `translateX(${(1 - l) * -24}px)` }}>{o.ad}</div>
              {o.aciklama ? <div style={{ fontFamily: font.govde, fontWeight: 600, fontSize: 36, lineHeight: 1.15, color: rgba(palet.murekkep, 0.72), marginTop: 4 }}>{o.aciklama}</div> : null}
            </div>
          );
        })}
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 4) SILUET-KATMAN (2 video): sepya kagit zemin, tek ton. Koyu siluet katmanlari (uzak tepeler, deniz + yelkenli, kayalik +
// fener, kuslar) kendi kucuk hareketleriyle (salinim, kanat, kayma) katmanlanir; her siluet yarim ton noktalardan toplanarak
// dogar (parcacik patlamasi degil: noktalar yerinde buyuyerek birlesir). Ustte kucuk yil (tarih, >= 40) + alinti (baslik, >= 64).
// medya[0] verilirse en arkada sepya ton, carpma karisimli arsiv fotografi olarak durur.
// =====================================================================================================================
const SiluetKatman: React.FC<SahneProps> = ({ stil, medya = [], baslik, tarih, altBaslik, gec = 6 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const id = useKimlik();
  const { palet } = stil;
  const t = f / fps;
  const kagit = palet.acik ? karistir(palet.zemin, '#e9dcc0', 0.5) : '#e6d8bc';
  const mur = palet.acik ? karistir(palet.murekkep, '#2a2016', 0.5) : '#2a2016';
  const ton = (k: number) => karistir(kagit, mur, k);
  // yarim ton toplanma maskesi: bolgedeki hucrelerin noktalari tohumlu gecikmeyle buyur (soldan saga egilimli)
  const HUC = 18;
  const maske = (ad: string, x0: number, y0: number, w: number, h: number, bas: number) => {
    const bitti = f > bas + fps * 1.25;
    if (bitti) return null;
    const dots: React.ReactNode[] = [];
    for (let y = y0; y < y0 + h; y += HUC) for (let x = x0; x < x0 + w; x += HUC) {
      const r0 = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
      const gec2 = bas + fps * (0.55 * r0 + 0.35 * ((x - x0) / Math.max(1, w)));
      const k = sinirla((f - gec2) / (fps * 0.3));
      if (k > 0) dots.push(<circle key={x * 7919 + y} cx={x + HUC / 2} cy={y + HUC / 2} r={HUC * 0.78 * yay(k)} fill="#fff" />);
    }
    return <mask id={`${id}${ad}`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>{dots}</mask>;
  };
  const katman = (ad: string, bas: number, kutu: [number, number, number, number], icerik: React.ReactNode) => {
    const m = maske(ad, kutu[0], kutu[1], kutu[2], kutu[3], bas);
    return <g>{m ? <defs>{m}</defs> : null}<g mask={m ? `url(#${id}${ad})` : undefined}>{icerik}</g></g>;
  };
  const b0 = gec, b1 = gec + fps * 0.35, b2 = gec + fps * 0.7, b3 = gec + fps * 1.0;
  const kayU = -6 * t, gemiY = 4 * Math.sin(t * 1.3), gemiR = 1.2 * Math.sin(t * 1.05);
  const deniz = H * 0.74;
  const dalga = `M-300,${deniz} Q-262,${deniz - 9} -225,${deniz} ` + Array.from({ length: 30 }, (_, k) => `T${-150 + k * 75},${deniz}`).join(' ');
  const kus = (x: number, y: number, s: number, faz: number) => {
    const k = Math.sin(t * 7 + faz) * 9 * s;
    return `M${x - 22 * s},${y - k} Q${x - 10 * s},${y - 6 * s} ${x},${y} Q${x + 10 * s},${y - 6 * s} ${x + 22 * s},${y - k}`;
  };
  const yaziP = ilerleme(f, gec + fps * 0.9, fps * 0.8);
  return (
    <AbsoluteFill style={{ background: kagit }}>
      {medya[0] ? <AbsoluteFill style={{ opacity: 0.3, mixBlendMode: 'multiply', filter: 'grayscale(1) sepia(0.7) contrast(1.15)' }}><Medya m={medya[0]} /></AbsoluteFill> : null}
      <Nefes genlik={0.02}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {katman('t', b0, [0, H * 0.45, W, H * 0.35], (
            <path transform={`translate(${kayU},0)`} d={`M-60,${H * 0.7} C${W * 0.12},${H * 0.55} ${W * 0.25},${H * 0.62} ${W * 0.38},${H * 0.58} S${W * 0.7},${H * 0.5} ${W * 0.85},${H * 0.6} S${W + 80},${H * 0.56} ${W + 80},${H * 0.6} V${H} H-60 Z`} fill={ton(0.32)} />
          ))}
          {katman('d', b1, [0, deniz - 20, W, H - deniz + 20], (
            <g><rect x={0} y={deniz} width={W} height={H - deniz} fill={ton(0.55)} /><path d={dalga} transform={`translate(${((t * 18) % 150).toFixed(1)},0)`} fill="none" stroke={ton(0.7)} strokeWidth={3} /></g>
          ))}
          {katman('g', b2, [1080, 330, 560, 470], (
            <g transform={`translate(0,${gemiY}) rotate(${gemiR} 1350 ${deniz})`} fill={ton(0.88)}>
              <path d={`M1110,${deniz - 70} L1600,${deniz - 70} L1545,${deniz + 6} L1170,${deniz + 6} Z`} />
              <rect x={1255} y={360} width={9} height={deniz - 430} /><rect x={1410} y={330} width={9} height={deniz - 400} />
              <path d={`M1268,380 Q1340,470 1268,${deniz - 90} Z M1423,350 Q1520,460 1423,${deniz - 90} Z M1250,390 L1150,${deniz - 95} L1250,${deniz - 95} Z`} />
            </g>
          ))}
          {katman('k', b3, [0, H * 0.32, 560, H * 0.68], (
            <g fill={mur}>
              <path d={`M-20,${H * 0.6} L120,${H * 0.56} L260,${H * 0.62} L420,${H * 0.7} L520,${deniz} L560,${H} H-20 Z`} />
              <path d={`M150,${H * 0.56} L170,${H * 0.36} L230,${H * 0.36} L250,${H * 0.58} Z M160,${H * 0.36} H240 V${H * 0.33} H160 Z M175,${H * 0.33} L200,${H * 0.29} L225,${H * 0.33} Z`} />
            </g>
          ))}
          <g fill="none" stroke={mur} strokeWidth={4.5} strokeLinecap="round" opacity={yay(ilerleme(f, b3 + fps * 0.3, fps * 0.6))}>
            {[[640, 450, 1, 0], [720, 485, 0.8, 1.3], [580, 500, 0.7, 2.1], [800, 440, 0.6, 0.7]].map(([x, y, s, fz], i) => (
              <path key={i} d={kus(x + t * 26 * s, y - t * 3, s, fz)} />
            ))}
          </g>
          <filter id={`${id}kg`}><feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves={4} seed={3} /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 0.55 0" /></filter>
          <rect width={W} height={H} filter={`url(#${id}kg)`} style={{ mixBlendMode: 'multiply' }} opacity={0.5} />
        </svg>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${rgba(mur, 0.35)} 100%)` }} />
        <div style={{ position: 'absolute', left: W * 0.5 - 700, width: 1400, top: 80, textAlign: 'center' }}>
          <Yazi stil={stil} metin={tarih} tur="baslik" boyut={48} maxGen={900} renk={rgba(mur, 0.85)} p={ilerleme(f, gec + fps * 0.6, fps * 0.6)} hiza="center" aralik={10} />
          <div style={{ height: 14 }} />
          <Yazi stil={stil} metin={baslik} boyut={70} maxGen={1300} renk={mur} p={yaziP} hiza="center" italik={!stil.font.buyukHarf} satir={1.15} />
          {altBaslik ? <div style={{ height: 10 }} /> : null}
          <Yazi stil={stil} metin={altBaslik} tur="govde" boyut={40} maxGen={1100} renk={rgba(mur, 0.8)} p={ilerleme(f, gec + fps * 1.3, fps * 0.6)} hiza="center" />
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 5) STIL-DONGUSU (4 video; YALNIZ ENERJIK TON): kompozisyon sabit (solda konu gorseli medya[0], sagda baslik), her 'adim' sn'de
// (varsayilan 0,8) dunya tamamen degisir: blueprint -> piksel -> cizgi roman -> gazete. Zemin, palet, doku ve yazi fontu
// birlikte degisir; konu gorseli her dunyanin filtresiyle cizilir. Sert kesim (tekniginin kendisi); parlaklik siralamasi
// koyu-koyu-acik-acik, saniyede 3 flas sinirini asmaz. Degisimde 2 karelik 1,02 -> 1 darbe.
// =====================================================================================================================
const DUNYALAR = ['blueprint', 'piksel', 'cizgi-roman', 'gazete'] as const;
const StilDongusu: React.FC<SahneProps> = ({ stil, medya = [], baslik, altBaslik, gec = 0, adim = 0.8 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const id = useKimlik();
  const A = Math.max(4, fps * adim);
  const k = Math.max(0, Math.floor((f - gec) / A));
  const dunya = DUNYALAR[k % DUNYALAR.length];
  const darbe = 1 + 0.02 * (1 - sinirla(((f - gec) - k * A) / 3));
  const giris = yay(ilerleme(f, gec - 6, fps * 0.4));
  const z = {
    blueprint: { zemin: '#123c86', desen: `linear-gradient(${rgba('#ffffff', 0.13)} 2px, transparent 2px), linear-gradient(90deg, ${rgba('#ffffff', 0.13)} 2px, transparent 2px), linear-gradient(${rgba('#ffffff', 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${rgba('#ffffff', 0.06)} 1px, transparent 1px)`, boyut: '120px 120px, 120px 120px, 24px 24px, 24px 24px', yazi: '#ffffff', font: 'RobotoCondensed', agirlik: 700, buyuk: true, filtre: 'grayscale(1) invert(1) contrast(1.25) brightness(1.1)', ton: '#1d4fa8', karisim: 'screen', cerceve: `3px solid ${rgba('#ffffff', 0.9)}` },
    piksel: { zemin: '#14142b', desen: `linear-gradient(${rgba('#ffffff', 0.04)} 4px, transparent 4px), linear-gradient(90deg, ${rgba('#ffffff', 0.04)} 4px, transparent 4px)`, boyut: '32px 32px', yazi: '#7dff6b', font: 'Teko', agirlik: 600, buyuk: true, filtre: `url(#${id}px) saturate(1.5)`, ton: '', karisim: 'normal', cerceve: '8px solid #7dff6b' },
    'cizgi-roman': { zemin: '#ffd21f', desen: `radial-gradient(${rgba('#d8261c', 0.5)} 3.2px, transparent 3.6px)`, boyut: '16px 16px', yazi: '#111111', font: 'AlfaSlabOne', agirlik: 400, buyuk: true, filtre: 'saturate(1.9) contrast(1.45)', ton: '', karisim: 'normal', cerceve: '12px solid #111111' },
    gazete: { zemin: '#eee7d8', desen: `repeating-linear-gradient(0deg, ${rgba('#000000', 0.04)} 0 2px, transparent 2px 6px)`, boyut: 'auto', yazi: '#141414', font: 'AbrilFatface', agirlik: 400, buyuk: false, filtre: 'grayscale(1) contrast(1.6) brightness(1.05)', ton: '', karisim: 'normal', cerceve: '2px solid #141414' },
  }[dunya];
  const metin = baslik || '';
  const fit = yazYerlesim(z.buyuk ? metin.toUpperCase() : metin, 120, z.font, 640, OKUNUR.ana);
  return (
    <AbsoluteFill style={{ background: z.zemin }}>
      <AbsoluteFill style={{ backgroundImage: z.desen, backgroundSize: z.boyut }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={`${id}px`} x="0" y="0" width="100%" height="100%">
          <feFlood x="10" y="10" height="4" width="4" /><feComposite width="24" height="24" /><feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" /><feMorphology operator="dilate" radius="12" />
        </filter>
      </svg>
      <Nefes genlik={0.03}>
        <AbsoluteFill style={{ transform: `scale(${darbe.toFixed(4)})`, opacity: giris }}>
          {medya[0] ? (
            <div style={{ position: 'absolute', left: 140, top: 190, width: 920, height: 700, border: z.cerceve, overflow: 'hidden', background: '#000',
              boxShadow: dunya === 'cizgi-roman' ? '18px 18px 0 #111111' : dunya === 'gazete' ? 'none' : `0 20px 50px ${rgba('#000', 0.4)}` }}>
              <AbsoluteFill style={{ filter: z.filtre }}><Medya m={medya[0]} nefes={0} /></AbsoluteFill>
              {z.ton ? <AbsoluteFill style={{ background: z.ton, mixBlendMode: z.karisim as any }} /> : null}
              {dunya === 'gazete' ? <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba('#000', 0.35)} 1.4px, transparent 1.8px)`, backgroundSize: '6px 6px', mixBlendMode: 'multiply' }} /> : null}
            </div>
          ) : null}
          <div style={{ position: 'absolute', left: 1130, top: 0, bottom: 0, width: 660, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {fit.satirlar.map((s, i) => (
              <div key={i} style={{ fontFamily: z.font, fontWeight: z.agirlik, fontSize: fit.boyut, lineHeight: 1.02, color: z.yazi, whiteSpace: 'nowrap',
                textShadow: dunya === 'cizgi-roman' ? '5px 5px 0 #ffffff' : 'none' }}>{s}</div>
            ))}
            {altBaslik ? <div style={{ marginTop: 24, fontFamily: z.font === 'AbrilFatface' ? 'SourceSerif4' : 'RobotoCondensed', fontWeight: 700, fontSize: 44, color: z.yazi, letterSpacing: 2 }}>{altBaslik}</div> : null}
          </div>
        </AbsoluteFill>
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 6) KART-YELPAZE-DAGILMA (18 video): foto/belge kartlari (medya, en az 3; az ise dongulenir) merkezde yigin halinden yelpaze
// olarak ~0,45 sn'de acilir (kademeli), sonra odak kart (odak, varsayilan orta) yukselip 1,25'e buyur, digerleri %40'a iner.
// toplan=true: tersi; daginik kartlar donerek merkeze cekilir ve tek yigina toplanir (hizli olanlara yon bulanikligi).
// Altta baslik (>= 64) + altBaslik (>= 40). Arsiv fotografi seckisi icin.
// =====================================================================================================================
const KartYelpaze: React.FC<SahneProps> = ({ stil, medya = [], ogeler = [], baslik, altBaslik, gec = 6, toplan = false, odak }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet } = stil;
  const kaynak = medya.length ? medya : ogeler.map((o) => o.medya).filter(Boolean) as MedyaKaynak[];
  const n = Math.max(5, Math.min(9, kaynak.length || 5));
  const orta = odak ?? Math.floor(n / 2);
  const CW = 400, CH = 520;
  const merkezX = W / 2, merkezY = H * 0.39;
  const durum = (i: number, kare: number) => {
    const p = yay(ilerleme(kare, gec + kademe(i, n, stil.tohum + 'ky') * 2, fps * (toplan ? 0.6 : 0.45)));
    const hedefA = (i - (n - 1) / 2) * (toplan ? 2.5 : 10);
    if (!toplan) return { x: 0, y: 0, a: hedefA * p };
    const r = rastgele(stil.tohum + 'kt' + i);
    const ac = r() * Math.PI * 2, uz = 760 + r() * 260;
    const x0 = Math.cos(ac) * uz, y0 = Math.sin(ac) * uz * 0.6, a0 = (r() * 2 - 1) * 50;
    return { x: x0 * (1 - p), y: y0 * (1 - p), a: a0 + (hedefA - a0) * p };
  };
  const yuksel = yay(ilerleme(f, gec + fps * (toplan ? 0.85 : 0.65), fps * 0.6));
  const kagit = palet.acik ? '#ffffff' : '#f4efe6';
  const sira = Array.from({ length: n }, (_, i) => i).filter((i) => i !== orta).concat([orta]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${palet.zemin2} 0%, ${palet.zemin} 70%)` }}>
      <Nefes genlik={0.025}>
        {sira.map((i) => {
          const d = durum(i, f);
          const dx = kayma((k) => durum(i, k).x, f), dy = kayma((k) => durum(i, k).y, f);
          const odakta = i === orta;
          const s = odakta ? 1 + 0.2 * yuksel : 1;
          const ty = odakta ? -24 * yuksel : 0;
          const sonuk = odakta ? 1 : 1 - 0.6 * yuksel;
          return (
            <YonBulanik key={i} dx={dx} dy={dy} style={{ position: 'absolute', left: merkezX - CW / 2, top: merkezY - CH / 2, width: CW, height: CH,
              transformOrigin: toplan ? '50% 50%' : '50% 175%', transform: `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px) rotate(${d.a.toFixed(2)}deg)`, zIndex: odakta ? 10 : i }}>
              <div style={{ position: 'absolute', inset: 0, background: kagit, padding: 14, boxShadow: `0 ${18 + 10 * (odakta ? yuksel : 0)}px 40px ${rgba('#000', 0.38)}`,
                transform: `translateY(${ty.toFixed(1)}px) scale(${s.toFixed(4)})`, transformOrigin: '50% 50%' }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#222' }}>
                  {kaynak.length ? <Medya m={kaynak[i % kaynak.length]} tohum={'ky' + i} /> : null}
                  <AbsoluteFill style={{ background: '#000', opacity: 1 - sonuk }} />
                </div>
              </div>
            </YonBulanik>
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: H * 0.79, textAlign: 'center' }}>
          <Yazi stil={stil} metin={baslik} boyut={76} maxGen={1500} renk={palet.murekkep} p={ilerleme(f, gec + fps * 0.7, fps * 0.6)} hiza="center" style={{ marginBottom: 10 }} />
          <Yazi stil={stil} metin={altBaslik ?? ogeler[orta]?.ad} tur="govde" boyut={42} maxGen={1300} renk={rgba(palet.murekkep, 0.8)} p={ilerleme(f, gec + fps * 0.95, fps * 0.6)} hiza="center" />
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 7) EGIK-KART-AKISI (10 video): kartlar (haber kupuru / belge / foto) egik 3B duzleme (-10 derece) 3 karede bir dusup yigilir
// (her kart -8..+10 derece kendi acisiyla), yigin tamamlaninca 0,5 sn icinde kaymis izgaraya dagilir; sagda sayac kart
// dustukce eszamanli sayar (sayac [a, b] ya da kart sayisi). Kart: ogeler[i].ad varsa kupur (serif baslik + metin cizgileri),
// medya varsa foto; ikisi varsa sirayla karisik. baslik solda ustte, altBaslik sayacin etiketi.
// =====================================================================================================================
const EgikKartAkisi: React.FC<SahneProps> = ({ stil, medya = [], ogeler = [], baslik, altBaslik, gec = 6, sayac, birim = '' }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const n = 8;
  const ARA = 3;
  const dus = (i: number) => gec + i * ARA;
  const izgaraBas = dus(n - 1) + fps * 0.4;
  const iz = (i: number) => yay(ilerleme(f, izgaraBas + kademe(i, n, stil.tohum + 'ek') * 1.5, fps * 0.5));
  const KW = 250, KH = 320, kol = 4, sat = Math.ceil(n / kol);
  const kagit = '#f2ecdf';
  const dusen = Math.max(0, Math.min(n, Math.floor((f - gec) / ARA) + 1));
  const [s0, s1] = sayac || [0, n];
  const sayi = Math.round(s0 + (s1 - s0) * (dusen / n));
  const g = yay(ilerleme(f, gec - 6, fps * 0.4));
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 55%, ${palet.zemin2} 0%, transparent 65%)` }} />
      <Nefes genlik={0.03}>
        <div style={{ position: 'absolute', left: W * 0.32 - 700, top: H * 0.5 - 450, width: 1400, height: 900, perspective: 2400 }}>
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: 'rotateX(40deg) rotateZ(-10deg)' }}>
            {Array.from({ length: n }, (_, i) => {
              const p = yay(ilerleme(f, dus(i), fps * 0.3));
              if (f < dus(i)) return null;
              const r = rastgele(stil.tohum + 'ec' + i);
              const ya = -8 + r() * 18;
              const yx = (r() * 2 - 1) * 70, yy = (r() * 2 - 1) * 50;
              const gx = ((i % kol) - (kol - 1) / 2) * (KW + 30) + (Math.floor(i / kol) % 2) * 36, gy = (Math.floor(i / kol) - (sat - 1) / 2) * (KH + 30);
              const k = iz(i);
              const x = yx + (gx - yx) * k, y = yy + (gy - yy) * k, a = ya * (1 - k) + (r() * 4 - 2) * k;
              const fotoMu = medya.length > 0 && (ogeler.length === 0 || i % 2 === 1);
              const o = ogeler.length ? ogeler[i % ogeler.length] : null;
              return (
                <div key={i} style={{ position: 'absolute', left: 700 - KW / 2, top: 450 - KH / 2, width: KW, height: KH,
                  transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${((1 - p) * 650 + i * 0.6).toFixed(1)}px) rotateZ(${a.toFixed(2)}deg)`,
                  opacity: sinirla(p * 4), background: kagit, boxShadow: `0 ${6 + 30 * (1 - p)}px ${14 + 30 * (1 - p)}px ${rgba('#000', 0.35)}`, padding: fotoMu ? 12 : 22, overflow: 'hidden' }}>
                  {fotoMu ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', filter: 'grayscale(0.35)' }}><Medya m={medya[i % medya.length]} nefes={0} /></div>
                  ) : (
                    <>
                      <div style={{ fontFamily: 'PlayfairDisplay', fontWeight: 900, fontSize: 38, lineHeight: 1.02, color: '#1a1712' }}>{o?.ad ?? ''}</div>
                      <div style={{ height: 3, background: '#1a1712', margin: '14px 0' }} />
                      {Array.from({ length: 7 }, (_, k2) => <div key={k2} style={{ height: 9, margin: '0 0 11px', width: `${70 + ((k2 * 37 + i * 13) % 30)}%`, background: rgba('#1a1712', 0.28) }} />)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 110, top: 70, opacity: g }}>
          <Yazi stil={stil} metin={baslik} boyut={76} maxGen={1050} renk={palet.murekkep} p={ilerleme(f, gec, fps * 0.6)} />
        </div>
        <div style={{ position: 'absolute', right: 100, top: H * 0.36, width: 470, textAlign: 'right', opacity: g }}>
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 190, lineHeight: 1, color: okunurVurgu(palet.vurgu, palet.zemin, palet.murekkep), fontVariantNumeric: 'tabular-nums' }}>
            {sayi.toLocaleString(sayiYereli())}<span style={{ fontSize: 80 }}>{birim}</span>
          </div>
          {altBaslik ? <div style={{ marginTop: 10, fontFamily: font.govde, fontWeight: 800, fontSize: 44, lineHeight: 1.15, color: palet.murekkep, textTransform: 'uppercase', letterSpacing: 2 }}>{altBaslik}</div> : null}
        </div>
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 8) KARSITLIK-PANELI (5 video): iki sutunlu "skor tablosu". Sol %55 birinci tarafin rengi (palet.vurgu), sag %45 karsi taraf
// (vurgu2, zemine dogru soluklastirilmis: anlamsal karsitlik). Her tarafta ikon (ogeler[i].medya portre ya da bas harf), ad
// (>= 64), skor ve sirayla degisen hamle satiri (ogeler[i].alt, 'adim' sn'de bir 0,25 sn solmayla; sol 1 sn sonra baslar).
// Skor = gosterilen hamle sayisi (ya da deger). Sag altta kucuk portreli (medya[0]) beyaz konusma balonu alintiyla
// (altBaslik) acilir. Ayni panel video boyunca geri donerek iki tarafin hamlelerini sayar.
// =====================================================================================================================
const KarsitlikPaneli: React.FC<SahneProps> = ({ stil, ogeler = [], medya = [], altBaslik, gec = 6, adim = 1.2 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet, font } = stil;
  const A = ogeler[0] || { ad: 'A' }, B = ogeler[1] || { ad: 'B' };
  const renkA = palet.vurgu;
  const renkB = karistir(palet.vurgu2, palet.zemin, 0.45);
  const g = yay(ilerleme(f, gec - 4, fps * 0.45));
  const taraf = (o: SahneOge, renk: string, x0: number, w: number, bas: number, sag: boolean) => {
    const yazi = ustYazi(renk, '#ffffff', '#111111');
    const liste = o.alt || [];
    const k = liste.length ? Math.max(-1, Math.min(liste.length - 1, Math.floor((f - bas) / (fps * adim)))) : -1;
    const fade = sinirla(((f - bas) - k * fps * adim) / (fps * 0.25));
    const skor = typeof o.deger === 'number' ? Math.round(o.deger * yay(ilerleme(f, bas, fps * adim * Math.max(1, liste.length)))) : k + 1;
    const ikonP = yay(ilerleme(f, gec + (sag ? 5 : 0), fps * 0.45));
    return (
      <div style={{ position: 'absolute', left: x0, top: 0, width: w, height: H, padding: sag ? '210px 110px 0 150px' : '210px 120px 0 110px', boxSizing: 'border-box', color: yazi }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
          <div style={{ width: 150, height: 150, borderRadius: 75, overflow: 'hidden', position: 'relative', flex: 'none', background: rgba(yazi, 0.15), border: `5px solid ${yazi}`,
            transform: `scale(${0.6 + 0.4 * ikonP})`, opacity: ikonP, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 80 }}>
            {o.medya ? <Medya m={o.medya} nefes={0} /> : o.ad.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 170, lineHeight: 1, fontVariantNumeric: 'tabular-nums', opacity: g }}>{Math.max(0, skor)}</div>
        </div>
        <div style={{ marginTop: 40 }}>
          <Yazi stil={stil} metin={o.ad} boyut={88} maxGen={w - 260} renk={yazi} p={ilerleme(f, gec + 3, fps * 0.6)} />
        </div>
        <div style={{ height: 6, width: 140, background: yazi, margin: '30px 0 28px', opacity: 0.85 * g }} />
        {k >= 0 ? (
          <div style={{ opacity: yay(fade), transform: `translateY(${((1 - yay(fade)) * 18).toFixed(1)}px)` }}>
            <Yazi stil={stil} metin={liste[k]} tur="govde" boyut={60} maxGen={w - 260} renk={yazi} p={1} satir={1.15} />
          </div>
        ) : null}
      </div>
    );
  };
  const balon = yay(ilerleme(f, gec + fps * 1.6, fps * 0.45));
  const solW = W * 0.55;
  return (
    <AbsoluteFill style={{ background: renkB }}>
      <Nefes genlik={0.02}>
        <AbsoluteFill style={{ background: renkB }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: solW + 60, height: H, background: renkA, clipPath: `polygon(0 0, 100% 0, ${((solW - 60) / (solW + 60)) * 100}% 100%, 0 100%)`,
          transform: `translateX(${((1 - g) * -120).toFixed(1)}px)` }} />
        {taraf(A, renkA, 0, solW, gec + fps * 1.0, false)}
        {taraf(B, renkB, solW, W - solW, gec + fps * 1.0 + fps * adim * 0.5, true)}
        {altBaslik && balon > 0 ? (
          <div style={{ position: 'absolute', right: 90, bottom: 80, width: 720, transformOrigin: '90% 120%', transform: `scale(${(0.85 + 0.15 * balon).toFixed(4)})`, opacity: balon }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#ffffff', borderRadius: 26, padding: '22px 30px', boxShadow: `0 16px 40px ${rgba('#000', 0.3)}` }}>
              {medya[0] ? <div style={{ position: 'relative', width: 104, height: 104, borderRadius: 52, overflow: 'hidden', flex: 'none' }}><Medya m={medya[0]} nefes={0} /></div> : null}
              <div style={{ fontFamily: font.govde, fontWeight: 700, fontSize: 40, lineHeight: 1.2, color: '#141414' }}>“{altBaslik}”</div>
            </div>
            <svg width={60} height={40} style={{ position: 'absolute', right: 70, bottom: -34 }}><path d="M0,0 L60,0 L48,40 Z" fill="#ffffff" /></svg>
          </div>
        ) : null}
      </Nefes>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 9) KALICI-BAG-NESNESI (6 video; KATMAN): videonun simgesi olan tek nesne (sembol: noktali 'sarmal', 'halka' ya da gorsel)
// sag ust kosede %20 opaklikta bekler; 'anlar'daki her anda kamera yayiyla (0,35 sn) merkeze kahraman olarak buyur (en hizli
// karede yon bulanikligi), ~1,2 sn kalir (baslik >= 64 altinda belirir), ease-in ile geri cekilir; bu sirada alttaki sahne
// %45 kararir. Caprazsiz bag kurar, videoya kimlik verir. Altta children (yoksa medya[0], yoksa palet zemini) calisir.
// =====================================================================================================================
const Sembol: React.FC<{ tur: 'sarmal' | 'halka' | MedyaKaynak; boy: number; renk: string; ikinci: string; t: number }> = ({ tur, boy, renk, ikinci, t }) => {
  if (typeof tur === 'object') return <div style={{ position: 'relative', width: boy, height: boy, borderRadius: boy / 2, overflow: 'hidden' }}><Medya m={tur} nefes={0} /></div>;
  if (tur === 'halka') {
    return (
      <svg width={boy} height={boy} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={40} fill="none" stroke={renk} strokeWidth={11} />
        <circle cx={50} cy={50} r={13} fill={renk} />
        <circle cx={50} cy={50} r={40} fill="none" stroke={ikinci} strokeWidth={1.5} strokeDasharray="3 5" transform={`rotate(${t * 25} 50 50)`} />
      </svg>
    );
  }
  const N = 70, ALTIN = Math.PI * (3 - Math.sqrt(5));
  return (
    <svg width={boy} height={boy} viewBox="0 0 100 100">
      <g transform={`rotate(${t * 18} 50 50)`}>
        {Array.from({ length: N }, (_, k) => {
          const r = 5.6 * Math.sqrt(k + 1) * 0.84, a = k * ALTIN;
          return <circle key={k} cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r={0.7 + 2.4 * (k / N)} fill={k % 9 === 0 ? ikinci : renk} />;
        })}
      </g>
    </svg>
  );
};
const KaliciBagNesnesi: React.FC<SahneProps> = ({ stil, medya = [], children, anlar = [0.6], sembol = 'sarmal', baslik, gec = 0 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { palet } = stil;
  const KUC = 130, BUY = 480;
  const kahraman = (kare: number) => {
    let k = 0;
    for (const an of anlar) {
      const a0 = gec + an * fps;
      const gel = yay(ilerleme(kare, a0, fps * 0.35));
      const git = cikisEgri(ilerleme(kare, a0 + fps * 1.55, fps * 0.3));
      k = Math.max(k, gel * (1 - git));
    }
    return k;
  };
  const k = kahraman(f);
  const kosX = W - 140, kosY = 140, ortX = W / 2, ortY = H * 0.43;
  const xAt = (kare: number) => kosX + (ortX - kosX) * kahraman(kare);
  const yAt = (kare: number) => kosY + (ortY - kosY) * kahraman(kare);
  const boy = KUC + (BUY - KUC) * k;
  const etiket = Math.max(0, ...anlar.map((an) => yay(ilerleme(f, gec + an * fps + fps * 0.3, fps * 0.4)) * (1 - cikisEgri(ilerleme(f, gec + an * fps + fps * 1.45, fps * 0.25)))));
  return (
    <AbsoluteFill style={{ background: palet.zemin }}>
      {children ? <AbsoluteFill>{children}</AbsoluteFill> : medya[0] ? <Medya m={medya[0]} /> : <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 40%, ${palet.zemin2}, ${palet.zemin} 70%)` }} />}
      <AbsoluteFill style={{ background: '#000', opacity: 0.45 * k }} />
      <YonBulanik dx={kayma(xAt, f)} dy={kayma(yAt, f)} style={{ position: 'absolute', left: xAt(f) - boy / 2, top: yAt(f) - boy / 2, width: boy, height: boy, opacity: 0.2 + 0.8 * k }}>
        <Sembol tur={sembol} boy={boy} renk={palet.vurgu} ikinci={palet.murekkep} t={f / fps} />
      </YonBulanik>
      {baslik && etiket > 0 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: ortY + BUY / 2 + 30, textAlign: 'center' }}>
          <Yazi stil={stil} metin={baslik} boyut={80} maxGen={1500} renk="#ffffff" p={etiket} hiza="center"
            style={{ textShadow: `0 3px 18px ${rgba('#000', 0.6)}`, opacity: sinirla(etiket * 2) }} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// 10) SPOT-KONISI (4 video): koyu sahnede yumusak isik konisi (fener/spot) ~sure sn'de (varsayilan 4) yavasca suzulur; sis
// katmani yavas kayar; medya[0] yalniz koninin aydinlattigi yerde gorunur (disari %12). Baslik genis harf araligiyla (>= 64)
// solar, altBaslik (>= 40) altinda. Glow yok: koni yumusak kenarli isik maskesi, yazi isik almaz.
// =====================================================================================================================
const SpotKonisi: React.FC<SahneProps> = ({ stil, medya = [], baslik, altBaslik, gec = 0, sure = 4 }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const id = useKimlik();
  const { palet } = stil;
  const t = f / fps;
  const u = sinirla((f - gec) / (fps * sure));
  const aci = -24 + 40 * (0.5 - 0.5 * Math.cos(Math.PI * u)) + 1.2 * Math.sin(t * 0.9);
  const kaynak = { x: W * 0.5, y: -140 };
  const boy = H * 1.45, yari = 520;
  const rad = (aci * Math.PI) / 180;
  const uc = { x: kaynak.x + Math.sin(rad) * boy, y: kaynak.y + Math.cos(rad) * boy };
  const nx = Math.cos(rad), ny = -Math.sin(rad);
  const koni = `M${kaynak.x - nx * 18},${kaynak.y - ny * 18} L${kaynak.x + nx * 18},${kaynak.y + ny * 18} L${uc.x + nx * yari},${uc.y + ny * yari} L${uc.x - nx * yari},${uc.y - ny * yari} Z`;
  const zeminKoyu = karistir(palet.acik ? palet.murekkep : palet.zemin, '#000000', 0.55);
  const yazP = ilerleme(f, gec + fps * 1.1, fps * 1.2);
  const isikY = Math.min(H * 0.86, uc.y);
  const isikX = kaynak.x + Math.sin(rad) * (isikY - kaynak.y) / Math.max(0.2, Math.cos(rad));
  const icerik = medya[0] ? <Medya m={medya[0]} /> : (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${karistir(palet.zemin2, '#000', 0.2)} 0%, ${karistir(palet.zemin, '#000', 0.1)} 70%, ${karistir(palet.zemin2, '#000', 0.35)} 100%)` }} />
  );
  return (
    <AbsoluteFill style={{ background: zeminKoyu }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={`${id}lg`} gradientUnits="userSpaceOnUse" x1={kaynak.x} y1={kaynak.y} x2={uc.x} y2={uc.y}>
            <stop offset="0" stopColor="#fff" stopOpacity={1} /><stop offset="0.75" stopColor="#fff" stopOpacity={0.75} /><stop offset="1" stopColor="#fff" stopOpacity={0.2} />
          </linearGradient>
          <filter id={`${id}yb`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26" /></filter>
          <linearGradient id={`${id}lk`} gradientUnits="userSpaceOnUse" x1={kaynak.x} y1={kaynak.y} x2={uc.x} y2={uc.y}>
            <stop offset="0" stopColor="#000" stopOpacity={1} /><stop offset="0.75" stopColor="#000" stopOpacity={0.8} /><stop offset="1" stopColor="#000" stopOpacity={0.25} />
          </linearGradient>
          <mask id={`${id}mk`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <path d={koni} fill={`url(#${id}lk)`} filter={`url(#${id}yb)`} />
            <ellipse cx={isikX} cy={isikY} rx={360} ry={90} fill="#000" opacity={0.6} filter={`url(#${id}yb)`} />
          </mask>
          <filter id={`${id}sis`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.006" numOctaves={2} seed={11} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.4 0 0 0 -0.55" />
          </filter>
        </defs>
      </svg>
      <Nefes genlik={0.03}>
        <AbsoluteFill>{icerik}</AbsoluteFill>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <rect width={W} height={H} fill={zeminKoyu} opacity={0.9} mask={`url(#${id}mk)`} />
          <path d={koni} fill={`url(#${id}lg)`} filter={`url(#${id}yb)`} opacity={0.2} style={{ mixBlendMode: 'screen' }} />
        </svg>
        <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: 'screen' }}>
          <svg width={W * 1.6} height={H} style={{ position: 'absolute', left: -W * 0.3 - ((t * 22) % (W * 0.3)), top: 0 }}><rect width={W * 1.6} height={H} filter={`url(#${id}sis)`} /></svg>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 45%, ${rgba('#000', 0.55)} 100%)` }} />
      </Nefes>
      <div style={{ position: 'absolute', left: 0, right: 0, top: H * 0.62, textAlign: 'center', opacity: yay(yazP) }}>
        <Yazi stil={stil} metin={baslik} boyut={84} maxGen={1600} renk="#f3efe6" p={yazP} hiza="center" aralik={14} style={{ textShadow: `0 2px 14px ${rgba('#000', 0.7)}` }} />
        <div style={{ height: 14 }} />
        <Yazi stil={stil} metin={altBaslik} tur="govde" boyut={42} maxGen={1300} renk={rgba('#f3efe6', 0.82)} p={ilerleme(f, gec + fps * 1.6, fps * 0.8)} hiza="center" aralik={4} />
      </div>
    </AbsoluteFill>
  );
};
