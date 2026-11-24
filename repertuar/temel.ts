// REPERTUAR — temel: tohumlu rastgele, gurultu, paletler, font ciftleri, hareket dili.
// Amac: her video/kanal ayni "Claude gorunumu"ne dusmesin. Hicbir bilesen sabit renk/font/easing kullanmaz;
// hepsi Stil (palet + font + hareket) alir. Stil'i stil_dna.py secer (stil-dna.json).

// ---------- tohumlu rastgele ----------
export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
export const rastgele = (tohum: number | string) => {
  let a = typeof tohum === 'string' ? hashStr(tohum) : tohum >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------- 3B deger gurultusu (dis paket gerektirmez) ----------
const h3 = (x: number, y: number, z: number) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const yum = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 arasi duzgun 3B gurultu */
export const gurultu3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = yum(x - xi), yf = yum(y - yi), zf = yum(z - zi);
  const c = (dx: number, dy: number, dz: number) => h3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
};
/** fraktal (oktavli) gurultu, -1..1 */
export const fbm = (x: number, y: number, z: number, oktav = 3) => {
  let t = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oktav; i++) { t += a * (gurultu3(x * f, y * f, z * f) * 2 - 1); n += a; a *= 0.5; f *= 2; }
  return t / n;
};

export const sinirla = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// ---------- PALETLER ----------
// "gece-kirmizi" = klasik Claude paleti (koyu lacivert-siyah + tek kirmizi). Varsayilan DEGIL; stil_dna onu yasakli listede tutar.
// TEK DOYGUN VURGU KURALI (Opus galerisi A-8; 418 videonun %56'si, en AE gorunenlerin hepsi): bir karede tek doygun renk vardir,
// o da 'vurgu'dur (vurgu cizgisi, aktif kelime, sayi, gecis bandi). 'vurgu2' IKINCILDIR ve az kullanilir: ince ayirici serit,
// soluk ikinci seri, anlamsal karsitlik (artis/azalis, once/sonra) ya da gecisin kisa ara tonu. vurgu2 ana vurgu yerine (dolgu
// zemini, buyuk yazi, kahraman sayi) kullanilmaz; ayni ogede vurgu ile esit agirlikta yan yana gelmez. Yesil yalniz olumlu,
// kirmizi yalniz gerekli yerde (anlamsal renk). Doygun vurgu siyaha dogrudan capraz cozunmez (once zemin tonuna iner).
export type Palet = { ad: string; zemin: string; zemin2: string; murekkep: string; soluk: string; vurgu: string; vurgu2: string; acik: boolean };
export const PALETLER: Record<string, Palet> = {
  'kum-terrakota':   { ad: 'kum-terrakota',   zemin: '#efe4d2', zemin2: '#e2d1b6', murekkep: '#2b1d14', soluk: '#7d6652', vurgu: '#c4532d', vurgu2: '#2f5d62', acik: true },
  'gazete-sepya':    { ad: 'gazete-sepya',    zemin: '#f2ecdf', zemin2: '#ddd3bf', murekkep: '#1d1a16', soluk: '#6e6656', vurgu: '#8c1c13', vurgu2: '#3a3a3a', acik: true },
  'buz-kobalt':      { ad: 'buz-kobalt',      zemin: '#eef3f8', zemin2: '#d6e2ee', murekkep: '#0e1b2c', soluk: '#5b6c80', vurgu: '#1f4fd1', vurgu2: '#ff8a3d', acik: true },
  'nane-krem':       { ad: 'nane-krem',       zemin: '#f4f1e8', zemin2: '#cfe7dc', murekkep: '#16302b', soluk: '#5c766f', vurgu: '#0f8f6f', vurgu2: '#e2a33b', acik: true },
  'pastel-lila':     { ad: 'pastel-lila',     zemin: '#f3eefb', zemin2: '#e2d8f5', murekkep: '#25193d', soluk: '#7a6c96', vurgu: '#7b3fe4', vurgu2: '#f25f8a', acik: true },
  'beton-sari':      { ad: 'beton-sari',      zemin: '#d9d9d6', zemin2: '#bdbdb8', murekkep: '#151515', soluk: '#5a5a57', vurgu: '#f2c200', vurgu2: '#151515', acik: true },
  'synth-mor':       { ad: 'synth-mor',       zemin: '#140a26', zemin2: '#2b0f4a', murekkep: '#f7ecff', soluk: '#b49ad6', vurgu: '#ff4fa3', vurgu2: '#3de3ff', acik: false },
  'orman-altin':     { ad: 'orman-altin',     zemin: '#0f1f17', zemin2: '#1c3627', murekkep: '#f1ead7', soluk: '#9fb3a2', vurgu: '#d9a441', vurgu2: '#7fbf8f', acik: false },
  'okyanus-mercan':  { ad: 'okyanus-mercan',  zemin: '#06202b', zemin2: '#0b3a4a', murekkep: '#e9f6f7', soluk: '#8fb7bf', vurgu: '#ff7a59', vurgu2: '#5ad1c8', acik: false },
  'zeytin-askeri':   { ad: 'zeytin-askeri',   zemin: '#22261b', zemin2: '#353b29', murekkep: '#eae6d4', soluk: '#a7a68a', vurgu: '#e0b23a', vurgu2: '#c75b39', acik: false },
  'grafit-neon':     { ad: 'grafit-neon',     zemin: '#121314', zemin2: '#1f2124', murekkep: '#f4f4f0', soluk: '#9a9c9f', vurgu: '#c6ff3d', vurgu2: '#7a7cff', acik: false },
  'bordo-krem':      { ad: 'bordo-krem',      zemin: '#2a0d12', zemin2: '#4a1820', murekkep: '#f6eadb', soluk: '#c9a9a0', vurgu: '#f0c987', vurgu2: '#e86a5c', acik: false },
  // derin-deniz: lacivert abis zemini + deniz turkuazi; ikinci vurgu soluk fener sarisi (deniz gizemi / denizcilik tarihi)
  'derin-deniz':     { ad: 'derin-deniz',     zemin: '#071a24', zemin2: '#0d2c3b', murekkep: '#e6f3f6', soluk: '#7fa3b0', vurgu: '#4fd1c5', vurgu2: '#e9c46a', acik: false },
  'gece-turkuaz':    { ad: 'gece-turkuaz',    zemin: '#0b1320', zemin2: '#13233a', murekkep: '#eaf2ff', soluk: '#8ea3c0', vurgu: '#2ee6c5', vurgu2: '#ffb547', acik: false },
  'kahve-turuncu':   { ad: 'kahve-turuncu',   zemin: '#1e140d', zemin2: '#3a2517', murekkep: '#f8ecdc', soluk: '#bba08a', vurgu: '#ff8a1f', vurgu2: '#6fc3df', acik: false },
  'kirmizi-zemin':   { ad: 'kirmizi-zemin',   zemin: '#c8251c', zemin2: '#a51b14', murekkep: '#fff6ea', soluk: '#ffd2c4', vurgu: '#ffd23f', vurgu2: '#111111', acik: false },  // tek doygun vurgu: sari; siyah ikincil
  'mavi-zemin':      { ad: 'mavi-zemin',      zemin: '#1d3fd6', zemin2: '#142fa8', murekkep: '#ffffff', soluk: '#c3cdfa', vurgu: '#ffe14d', vurgu2: '#ff5c8a', acik: false },
  // klasik — yalniz rakip ayni seyi kullaniyorsa karsilastirma icin; stil_dna secmez
  'gece-kirmizi':    { ad: 'gece-kirmizi',    zemin: '#05070b', zemin2: '#0b0f16', murekkep: '#eef1f5', soluk: '#93a0ae', vurgu: '#cf2b20', vurgu2: '#dba43a', acik: false },
};
export const palet = (ad?: string): Palet => PALETLER[ad || ''] || PALETLER['gece-turkuaz'];
export const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** iki hex rengi karistir (t=0 -> a, t=1 -> b); kagit/kart tonlarini palete baglamak icin */
export const karistir = (a: string, b: string, t: number) => {
  const c = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((k) => k + k).join('') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = c(a), B = c(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

// ---------- FONT CIFTLERI (dosyalar: public/fontlar/<Ad>.ttf — kutuphanenin fontlar/ klasorunden kopyalanir) ----------
export type FontCifti = { ad: string; baslik: string; govde: string; mono: string; baslikAgirlik: number; buyukHarf: boolean; aralik: number;
  /** video ustunde okunurluk: govde/mono yazilarin EN AZ kalinligi (bilesen fontWeight vermediyse bu kullanilir) */
  govdeAgirlik: number; monoAgirlik: number };
export const FONTLAR: Record<string, FontCifti> = {
  'grotesk-modern':  { ad: 'grotesk-modern',  baslik: 'SpaceGrotesk', govde: 'DMSans', mono: 'RobotoCondensed', baslikAgirlik: 700, buyukHarf: false, aralik: -1, govdeAgirlik: 600, monoAgirlik: 600 },
  'editoryal-serif': { ad: 'editoryal-serif', baslik: 'DMSerifDisplay', govde: 'WorkSans', mono: 'CourierPrime', baslikAgirlik: 400, buyukHarf: false, aralik: -0.5, govdeAgirlik: 600, monoAgirlik: 600 },
  'klasik-serif':    { ad: 'klasik-serif',    baslik: 'PlayfairDisplay', govde: 'Lora', mono: 'CourierPrime', baslikAgirlik: 700, buyukHarf: false, aralik: 0, govdeAgirlik: 600, monoAgirlik: 600 },
  'antik-baslik':    { ad: 'antik-baslik',    baslik: 'Cinzel', govde: 'EBGaramond', mono: 'CourierPrime', baslikAgirlik: 700, buyukHarf: true, aralik: 4, govdeAgirlik: 600, monoAgirlik: 600 },
  'poster-dar':      { ad: 'poster-dar',      baslik: 'Anton', govde: 'Rubik', mono: 'RobotoCondensed', baslikAgirlik: 400, buyukHarf: true, aralik: 1, govdeAgirlik: 600, monoAgirlik: 600 },
  'teknik-dar':      { ad: 'teknik-dar',      baslik: 'BarlowCondensed', govde: 'RobotoCondensed', mono: 'RobotoCondensed', baslikAgirlik: 700, buyukHarf: true, aralik: 2, govdeAgirlik: 600, monoAgirlik: 600 },
  'geometrik-kalin': { ad: 'geometrik-kalin', baslik: 'LeagueSpartan', govde: 'Poppins', mono: 'RobotoCondensed', baslikAgirlik: 800, buyukHarf: false, aralik: -1.5, govdeAgirlik: 600, monoAgirlik: 600 },
  'retro-slab':      { ad: 'retro-slab',      baslik: 'AlfaSlabOne', govde: 'Nunito', mono: 'CourierPrime', baslikAgirlik: 400, buyukHarf: false, aralik: 0, govdeAgirlik: 600, monoAgirlik: 600 },
  'sport-teko':      { ad: 'sport-teko',      baslik: 'Teko', govde: 'Kanit', mono: 'RobotoCondensed', baslikAgirlik: 600, buyukHarf: true, aralik: 2, govdeAgirlik: 600, monoAgirlik: 600 },
  'damga-stencil':   { ad: 'damga-stencil',   baslik: 'Staatliches', govde: 'WorkSans', mono: 'CourierPrime', baslikAgirlik: 400, buyukHarf: true, aralik: 3, govdeAgirlik: 600, monoAgirlik: 600 },
  'gazete':          { ad: 'gazete',          baslik: 'AbrilFatface', govde: 'SourceSerif4', mono: 'CourierPrime', baslikAgirlik: 400, buyukHarf: false, aralik: 0, govdeAgirlik: 600, monoAgirlik: 600 },
  'yumusak-sans':    { ad: 'yumusak-sans',    baslik: 'Nunito', govde: 'Nunito', mono: 'RobotoCondensed', baslikAgirlik: 800, buyukHarf: false, aralik: -0.5, govdeAgirlik: 700, monoAgirlik: 600 },
};
/** font dosyalarinin kalinlik araligi (fvar wght min-max) ya da sabit dosyanin kalinligi (OS/2 usWeightClass).
 *  FontYukle bunu FontFace 'weight' tanimina yazar: yazilmazsa degisken font hep VARSAYILAN kesimle cizilir
 *  (LeagueSpartan/Montserrat/Raleway 100, Rubik/SpaceGrotesk/Teko 300) ve fontWeight: 800 bile ince gorunur. Yeni font eklenince guncelle. */
export const FONT_AGIRLIK: Record<string, string> = {
  AbrilFatface: '400', AlfaSlabOne: '400', Anton: '400', ArchivoBlack: '400', Bangers: '400', BarlowCondensed: '600', BebasNeue: '400', BlackOpsOne: '400',
  Cinzel: '400 900', CormorantGaramond: '300 700', CourierPrime: '400', DMSans: '100 1000', DMSerifDisplay: '400', EBGaramond: '400 800', FjallaOne: '400',
  Inter: '100 900', Kanit: '700', Lato: '700', LeagueSpartan: '100 900', Lora: '400 700', Merriweather: '300 900', Montserrat: '100 900', NotoSansJP: '100 900',
  NotoSerifJP: '200 900', Nunito: '200 1000', OpenSans: '300 800', Oswald: '200 700', PlayfairDisplay: '400 900', Poppins: '700', Raleway: '100 900',
  Roboto: '100 900', RobotoCondensed: '100 900',
  // gercek italik kesimler (OFL): FontYukle bunlari ana ailenin 'italic' stili olarak kaydeder
  'PlayfairDisplay-Italic': '400 900', 'DMSerifDisplay-Italic': '400', 'EBGaramond-Italic': '400 800', 'SourceSerif4-Italic': '200 900', Rubik: '300 900', SourceSerif4: '200 900', SpaceGrotesk: '300 700', Staatliches: '400', Teko: '300 700', WorkSans: '100 900',
};
export const fontCifti = (ad?: string): FontCifti => FONTLAR[ad || ''] || FONTLAR['grotesk-modern'];

// ---------- OKUNURLUK (1080p tabani; telefonda 360 px genislikte de okunmali) ----------
/** izleyiciye donuk yazi boyutu tabani (px, 1920x1080). ana: tek basina okunan satir (alt bant ust satiri, alinti govdesi);
 *  ikincil: ikinci satir / etiket; enaz: hicbir izleyici yazisi bunun altina inmez; sus: dekoratif mikro yazi (dosya adi,
 *  koordinat susu, cetvel rakami) alt siniri. enaz 36 px: buyuk harf yuksekligi ~25 px (yazi_kontrol boy kapisi 24 px @1080p;
 *  32 px'te ~21 px kaliyordu), 360 px telefonda ~8 px buyuk harf. */
export const OKUNUR = { ana: 64, ikincil: 40, enaz: 36, sus: 28 } as const;

// ---------- KONTRAST (okunurluk kapisi, WCAG) ----------
/** goreli parlaklik (WCAG 2.x) */
export const parlaklikWcag = (hex: string) => {
  const x = hex.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((k) => k + k).join('') : x.slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** iki rengin kontrast orani (1..21) */
export const kontrast = (a: string, b: string) => { const x = parlaklikWcag(a), y = parlaklikWcag(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** yazi olarak vurgu: vurgu rengi zeminde esigi (4,5:1) gecmiyorsa (ornek beton-sari: sari yazi acik gri zeminde 1,6:1)
 *  murekkebe dogru adim adim kaydirilir; ton kimligi olabildigince korunur. Hicbiri gecmezse murekkep. */
export const okunurVurgu = (vurgu: string, zemin: string, murekkep: string, esik = 4.5) => {
  for (let t = 0; t <= 1.001; t += 0.1) { const c = karistir(vurgu, murekkep, t); if (kontrast(c, zemin) >= esik) return c; }
  return murekkep;
};
/** baslik guvenli alani: yazi blogu bu genisligi asmaz (1920'nin %90'i civari, kenarlarda 100 px pay) */
export const GUVENLI = { genislik: 1720, kenar: 100 } as const;

/** font basina ortalama harf genisligi (em): [buyuk harf, kucuk harf, rakam, bosluk, noktalama]. fontTools ile olculdu
 *  (degisken fontlar wght 800'de; Ingilizce harf sikligiyla agirlikli). Yeni font eklenince genislik olcumu de eklenmeli;
 *  tabloda yoksa 0.62 em varsayilir (genis tarafta kalir). */
const FONT_EN: Record<string, number[]> = {
  AbrilFatface: [0.667, 0.516, 0.571, 0.18, 0.386], AlfaSlabOne: [0.768, 0.587, 0.66, 0.3, 0.399], Anton: [0.454, 0.445, 0.478, 0.234, 0.329],
  ArchivoBlack: [0.751, 0.599, 0.667, 0.333, 0.44], BarlowCondensed: [0.447, 0.39, 0.414, 0.2, 0.315], BebasNeue: [0.382, 0.382, 0.4, 0.16, 0.269],
  Cinzel: [0.732, 0.642, 0.599, 0.25, 0.387], CourierPrime: [0.6, 0.6, 0.6, 0.6, 0.6], DMSans: [0.654, 0.559, 0.605, 0.237, 0.436],
  DMSerifDisplay: [0.604, 0.494, 0.504, 0.218, 0.387], EBGaramond: [0.681, 0.466, 0.54, 0.245, 0.356], Kanit: [0.616, 0.527, 0.545, 0.205, 0.37],
  LeagueSpartan: [0.607, 0.491, 0.54, 0.271, 0.39], Lora: [0.68, 0.527, 0.541, 0.263, 0.375], Nunito: [0.678, 0.522, 0.6, 0.279, 0.389],
  PlayfairDisplay: [0.688, 0.513, 0.529, 0.228, 0.403], Poppins: [0.651, 0.579, 0.597, 0.212, 0.461], RobotoCondensed: [0.548, 0.439, 0.508, 0.23, 0.342],
  Rubik: [0.68, 0.579, 0.659, 0.2, 0.431], SourceSerif4: [0.65, 0.519, 0.551, 0.21, 0.395], SpaceGrotesk: [0.608, 0.541, 0.593, 0.254, 0.409],
  Staatliches: [0.431, 0.431, 0.426, 0.148, 0.306], Teko: [0.491, 0.432, 0.468, 0.2, 0.367], WorkSans: [0.673, 0.551, 0.603, 0.267, 0.429],
  Oswald: [0.521, 0.444, 0.503, 0.256, 0.339],
};
/** tek satirin tahmini genisligi (px). aralik: letterSpacing (px, harf basina). %4 guvenlik payi icerir. */
export const metinGenislik = (s: string, boyut: number, fontAd: string, aralik = 0) => {
  const e = FONT_EN[fontAd] || [0.62, 0.52, 0.58, 0.25, 0.4];
  let w = 0;
  for (const c of s) w += /[A-ZÀ-Þ]/.test(c) ? e[0] : /[a-zß-ÿ]/.test(c) ? e[1] : /[0-9]/.test(c) ? e[2] : c === ' ' ? e[3] : /[£$€%@#&MW]/.test(c) ? e[0] : e[4];
  return (w * boyut + Math.max(0, s.length - 1) * aralik) * 1.04;
};
/** satirlarin en genisi maxGen'e sigacak boyut (boyut'tan buyuk olmaz) */
export const siganBoyut = (satirlar: string[], boyut: number, fontAd: string, maxGen: number = GUVENLI.genislik, aralik = 0) => {
  const en = Math.max(1, ...satirlar.map((s) => metinGenislik(s, boyut, fontAd, aralik)));
  return en <= maxGen ? boyut : boyut * (maxGen / en);
};
/** kelime sinirindan satir bolme: her satir maxGen'e sigar (tek kelime sigmiyorsa kendi satirinda kalir) */
export const satirBol = (s: string, boyut: number, fontAd: string, maxGen: number, aralik = 0) => {
  const out: string[] = [];
  let sat = '';
  s.split(' ').filter(Boolean).forEach((w) => {
    const aday = sat ? sat + ' ' + w : w;
    if (sat && metinGenislik(aday, boyut, fontAd, aralik) > maxGen) { out.push(sat); sat = w; } else sat = aday;
  });
  if (sat) out.push(sat);
  return out.length ? out : [''];
};
/** baslik yerlesimi: '\n' acik satir sonu. Once butun satirlar guvenli alana sigacak kadar kuculur; boyut 'enaz'in altina
 *  dusecekse enaz'da kalinir ve uzun satir kelime sinirindan bolunur. Doner: { satirlar, boyut }. */
export const yazYerlesim = (metin: string, boyut: number, fontAd: string, maxGen: number = GUVENLI.genislik, enaz = 90, aralik = 0) => {
  const acik = metin.split('\n').map((x) => x.trim()).filter(Boolean);
  const sat = acik.length ? acik : [''];
  const b = siganBoyut(sat, boyut, fontAd, maxGen, aralik);
  const alt = Math.min(boyut, enaz);
  if (b >= alt) return { satirlar: sat, boyut: b };
  const bol = sat.flatMap((x) => satirBol(x, alt, fontAd, maxGen, aralik));
  return { satirlar: bol, boyut: Math.min(alt, siganBoyut(bol, alt, fontAd, maxGen, aralik)) };
};
/** koyu kontur (text-shadow ile, 16 yon) + yumusak golge: acik yazi her zeminde (beyaz tisort, gokyuzu) okunur.
 *  -webkit-text-stroke harfin icine de yediginden ince fontlarda kullanilmaz. */
export const konturGolge = (px = 3.5, renk = 'rgba(0,0,0,0.92)', yumusak = 0.55) => {
  const k: string[] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.push(`${(Math.cos(a) * px).toFixed(2)}px ${(Math.sin(a) * px).toFixed(2)}px 0 ${renk}`); }
  k.push(`0 ${Math.round(px * 1.6)}px ${Math.round(px * 5)}px rgba(0,0,0,${yumusak})`);
  return k.join(', ');
};
/** KAMERA NEFESI (galeri A-3: kamera hic durmaz; kilit karede 1,000 -> 1,012 -> 1,000 nefes). Medya 'sabit' (ve kamera
 *  verilmeden) bununla cizilir: olcek 1 ile 1 + genlik arasinda yumusak gidip gelir (yarim periyot 'yari' sn). Kesimde zaten
 *  hareket halindedir (faz 'faz' sn ileride: kamera vurusta baslar, sifir hizdan kalkmaz), ilk 'yari - faz' sn tek yonlu itme
 *  (belgesel cekimlerinin cogu bu surede biter), sonra ayni yumusaklikla geri nefes. Hiz yalniz donus aninda (~0,7 sn) sifira
 *  yaklasir; iki bilesen olmadigi icin hareket birbirini sondurmez. Olcek 1'in altina inmez, 1 + genligi asmaz (kenar acilmaz).
 *  Genlik: kilit kare / 'sabit' 0,02 · tutusta yavas itme (kamera verilmedi) foto 0,05, hareketli video 0,03 (video <= 0,04).
 *  Kart icerigi tutmaItme ile, medya bununla itilir; ikisini ayni katmanda ust uste kullanma (Dna.tsx SayiZemin nefes=0). */
export const kameraNefes = (t: number, genlik = 0.02, yari = 8, faz = 2) =>
  1 + genlik * (1 - Math.cos((Math.PI * (Math.max(0, t) + faz)) / yari)) / 2;
/** tutma suresinde yavas kamera itmesi (donuk kalmasin): t saniye -> olcek/kayma/egim. AE'deki 'slow push' karsiligi. */
export const tutmaItme = (f: number, fps: number, o: { hiz?: number; egim?: number; yon?: number } = {}) => {
  const t = Math.max(0, f / fps);
  const s = 1 + (o.hiz ?? 0.012) * t;
  return `scale(${s.toFixed(4)}) translateY(${(-2.2 * t * (o.yon ?? 1)).toFixed(2)}px) rotate(${((o.egim ?? 0) * Math.min(1, t / 4)).toFixed(3)}deg)`;
};

// ---------- HAREKET DILI ----------
// Her kanal tek bir hareket "karakteri" secer; tum girisler bu egriyle olur. Klasik Claude = 'yay-yumusak' + asagidan 30px.
export type HareketAd = 'yay-yumusak' | 'yay-esnek' | 'kubik-hizli' | 'ustel-sert' | 'adim-stop' | 'geri-sekme' | 'dogrusal-mekanik';
export const egri = (ad: HareketAd, t: number): number => {
  t = sinirla(t);
  switch (ad) {
    case 'yay-esnek': { const c4 = (2 * Math.PI) / 3.2; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 8 - 0.75) * c4) + 1; }
    case 'kubik-hizli': return 1 - Math.pow(1 - t, 3);
    case 'ustel-sert': return t === 1 ? 1 : 1 - Math.pow(2, -12 * t);
    case 'adim-stop': return t >= 1 ? 1 : Math.floor(t * 5) / 5;
    case 'geri-sekme': { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
    case 'dogrusal-mekanik': return t;
    default: return 1 - Math.pow(1 - t, 2.2);
  }
};
/** kare tabanli ilerleme: gec (kare) sonra sure (kare) icinde 0..1, secilen egriyle */
export const ilerle = (f: number, gec: number, sure: number, ad: HareketAd = 'kubik-hizli') => egri(ad, (f - gec) / Math.max(1, sure));

// ---------- DOGAL HAREKET (AE hissi: kutle, kademe nefesi, ease-in cikis) ----------
// Kaynak ilkeler (givemotion motion-design notlari, MIT): girisler kutleli yayla durur (sifir hizdan kalkar, hicbir sey
// "pop" etmez); maske/kayma/solma girisleri asimsiz oturur, asim yalniz kahramanda ve %2'yi gecmez; cikislar ease-in
// (yavas kalkar, hizla gider), girisin ~%65'i surer; kademeli dizilerde zamanlama tohumlu birkac yuzde oynar (ilk ve son oge
// sabit); buyuk hareket biraz daha uzun surer. Mevcut egri()/ilerle() DEGISMEDI; bunlar yanina eklenir.

/** kutleli yay, kapali form (durgun halden birakilan sonumlu salinici), t 0..1 -> 0..1, t=1'de tam 1.
 *  sonum = sonum orani (zeta): 1 = kritik, asimsiz | 0.85 ~ %0,3 | 0.8 ~ %1,2 | 0.78 ~ %1,8 (alt sinir: asim hep < %2).
 *  Galeri A-6 ile olculen uyum (2026-11-24): asim < %2 kurali alt sinir 0.78 ile garanti. Galerideki "oge sonumu 0,72" bir
 *  sonum ORANI olarak okunursa %3,8 asim verir (kuralla celisir), bu yuzden alt sinir 0.78'de kalir. Oturma suresi yayin
 *  'sure'sidir: kritik yay normalize surenin %78'inde %2 bandina girer -> oge girisi 0,35-0,45 sn, kamera oturmasi 0,6 sn
 *  (YAY_SURE); kamera ogeden yavas oturur ve hep kritik (sonum 1, asimsiz). */
export const YAY_SURE = { oge: 0.35, kamera: 0.6 } as const;
export const yay = (t: number, sonum = 1): number => {
  t = sinirla(t);
  if (t >= 1) return 1;
  const z = sinirla(sonum, 0.78, 1);
  let x: (u: number) => number;
  if (z >= 0.999) {
    const w = 7; // kritik: t=1'de kalan %0,7 normalize edilir
    x = (u) => 1 - Math.exp(-w * u) * (1 + w * u);
  } else {
    const w = 6.2 / z, wd = w * Math.sqrt(1 - z * z); // zarf e^(-6.2) -> t=1'de salinim bitmis
    x = (u) => 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + ((z * w) / wd) * Math.sin(wd * u));
  }
  return x(t) / x(1);
};

/** cikis egrisi (ease-in): yavas kalkar, hizla gider. Sure = giris suresinin ~%65'i (cikisSure). */
export const cikisEgri = (t: number, us = 2.6) => Math.pow(sinirla(t), us);
export const cikisSure = (girisSure: number) => Math.max(4, Math.round(girisSure * 0.65));

/** ciddi/gizem tonda ya da maske/kayma girislerinde asim yok */
export const ASIMSIZ_TON = ['ciddi', 'gizem'];
/** sekmeli/esnek karakterler (yay-esnek: sin salinimi, geri-sekme: ~%10 geri cekilme) galeri A-5/A-6'da yasak listesinde;
 *  yalniz enerjik tonda kalir. Bu tonlarda kritik yaya (kubik-hizli -> dogal() ile asimsiz) cevrilir. stil_dna da secmez. */
export const SEKMELI_HAREKET: HareketAd[] = ['yay-esnek', 'geri-sekme'];
export const SEKMESIZ_TON = ['ciddi', 'gizem', 'sakin'];
export const tonHareket = (h: HareketAd, ton?: string): HareketAd => (SEKMESIZ_TON.includes(ton || '') && SEKMELI_HAREKET.includes(h) ? 'kubik-hizli' : h);
/** girisin dogal karsiligi: yumusak karakterler kutleli yaya cevrilir, bilerek secilmis karakterler (esnek, geri-sekme,
 *  ustel-sert, adim-stop, dogrusal) aynen kalir; esnek/geri-sekme ciddi/gizem/sakin tonda kritik yaya iner.
 *  kahraman=true yalniz tek bir oge icin (asim %1,5), digerleri asimsiz. */
export const dogal = (ad: HareketAd, t: number, o: { ton?: string; kahraman?: boolean } = {}): number => {
  const asim = !!o.kahraman && !ASIMSIZ_TON.includes(o.ton || '');
  ad = tonHareket(ad, o.ton);
  switch (ad) {
    case 'yay-yumusak': return yay(t, asim ? 0.8 : 1);
    case 'kubik-hizli': return yay(t, asim ? 0.85 : 1);
    default: return egri(ad, t);
  }
};
export const dogalIlerle = (f: number, gec: number, sure: number, ad: HareketAd, o: { ton?: string; kahraman?: boolean } = {}) =>
  dogal(ad, (f - gec) / Math.max(1, sure), o);

/** kademeli dizide i. ogenin baslangici, ARALIK BIRIMINDE (gec = kademe(i, n, tohum) * aralik).
 *  Duz i*aralik yerine: dagilim hafif ease-out (ilk ogeye bir nefes, sonrakiler akar; toplam sure ayni) + ara ogelere
 *  tohumlu +-%7 sapma. Ilk ve son oge zamanini korur (ritim kayboluyormus gibi gorunmez). Deterministik. */
export const kademe = (i: number, n: number, tohum: string | number, egim = 0.3): number => {
  if (n <= 1 || i <= 0) return 0;
  const son = n - 1;
  if (i >= son) return son;
  const u = i / son;
  const egik = (1 - egim) * u + egim * (1 - (1 - u) * (1 - u));
  const r = rastgele(`${tohum}:k${i}`)();
  return egik * son + (r * 2 - 1) * 0.07;
};
/** tohumlu sure carpani 1 +- oran (varsayilan %6): ayni dizideki ogeler ayni surede bitmesin */
export const sapma = (i: number, tohum: string | number, oran = 0.06) => 1 + (rastgele(`${tohum}:s${i}`)() * 2 - 1) * oran;

/** mesafeye gore sure: ref px'lik hareket 'sure' kadar; buyuk hareket alt-dogrusal uzar (0,85x..1,4x). */
export const mesafeSure = (sure: number, mesafePx: number, ref = 120) => sure * sinirla(Math.pow(Math.max(1, Math.abs(mesafePx)) / ref, 0.2), 0.85, 1.4);

/** deklansor: 180 derece (AE varsayilani) = kare suresinin yarisi, karenin ortasina oturur */
export const DEKLANSOR = 0.5;
/** bir degerin deklansor araligindaki degisimi (hareket bulanikligi boyu): fn(kare) -> deger */
export const kayma = (fn: (kare: number) => number, f: number, perde = DEKLANSOR) => fn(f + perde / 2) - fn(f - perde / 2);

// ---------- STIL (bilesenlere gecen tek nesne) ----------
/** ton: stil_dna.py'nin konu tonu (ciddi/gizem/enerjik/sakin); verilirse ciddi/gizem tonda hic asim olmaz,
 *  ciddi/gizem/sakin tonda sekmeli hareket (yay-esnek, geri-sekme) kubik-hizli'ya iner (eski DNA'lar da guvende) */
export type Stil = { palet: Palet; font: FontCifti; hareket: HareketAd; tohum: string; ton?: string };
export const stilYap = (p?: string, f?: string, h?: HareketAd, tohum = 'x', ton?: string): Stil => ({ palet: palet(p), font: fontCifti(f), hareket: tonHareket(h || 'kubik-hizli', ton), tohum, ton });
