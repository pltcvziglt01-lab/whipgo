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
  'gece-turkuaz':    { ad: 'gece-turkuaz',    zemin: '#0b1320', zemin2: '#13233a', murekkep: '#eaf2ff', soluk: '#8ea3c0', vurgu: '#2ee6c5', vurgu2: '#ffb547', acik: false },
  'kahve-turuncu':   { ad: 'kahve-turuncu',   zemin: '#1e140d', zemin2: '#3a2517', murekkep: '#f8ecdc', soluk: '#bba08a', vurgu: '#ff8a1f', vurgu2: '#6fc3df', acik: false },
  'kirmizi-zemin':   { ad: 'kirmizi-zemin',   zemin: '#c8251c', zemin2: '#a51b14', murekkep: '#fff6ea', soluk: '#ffd2c4', vurgu: '#111111', vurgu2: '#ffd23f', acik: false },
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
  Roboto: '100 900', RobotoCondensed: '100 900', Rubik: '300 900', SourceSerif4: '200 900', SpaceGrotesk: '300 700', Staatliches: '400', Teko: '300 700', WorkSans: '100 900',
};
export const fontCifti = (ad?: string): FontCifti => FONTLAR[ad || ''] || FONTLAR['grotesk-modern'];

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
 *  sonum = sonum orani (zeta): 1 = kritik, asimsiz | 0.85 ~ %0,3 | 0.8 ~ %1,2 | 0.78 ~ %1,8 (alt sinir: asim hep < %2). */
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
/** girisin dogal karsiligi: yumusak karakterler kutleli yaya cevrilir, bilerek secilmis karakterler (esnek, geri-sekme,
 *  ustel-sert, adim-stop, dogrusal) aynen kalir. kahraman=true yalniz tek bir oge icin (asim %1,5), digerleri asimsiz. */
export const dogal = (ad: HareketAd, t: number, o: { ton?: string; kahraman?: boolean } = {}): number => {
  const asim = !!o.kahraman && !ASIMSIZ_TON.includes(o.ton || '');
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
/** ton: stil_dna.py'nin konu tonu (ciddi/gizem/enerjik/sakin); verilirse ciddi/gizem tonda hic asim olmaz */
export type Stil = { palet: Palet; font: FontCifti; hareket: HareketAd; tohum: string; ton?: string };
export const stilYap = (p?: string, f?: string, h?: HareketAd, tohum = 'x', ton?: string): Stil => ({ palet: palet(p), font: fontCifti(f), hareket: h || 'kubik-hizli', tohum, ton });
