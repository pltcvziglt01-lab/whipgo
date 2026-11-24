import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { GUVENLI, OKUNUR, Stil, cikisEgri, dogalIlerle, egri, ilerle, kontrast, kademe, kayma, konturGolge, mesafeSure, metinGenislik, okunurVurgu, rastgele, rgba, sapma, satirBol, siganBoyut, sinirla, yay, yazYerlesim } from './temel';
import { YonBulanik } from './Hareket';

// BASLIK GIRISLERI — klasik Claude = 'asagidan-yay' (opacity + 30px yukari, yumusak yay). Repertuar onu yalniz rakip
// ayni seyi yapmiyorsa ve en fazla 1 eksen olarak kullanir.
export const BASLIK_TIPLERI = [
  'maske-yukari', 'harf-dalga', 'bulaniklik', 'scramble', 'daktilo', 'kutu-acilis', 'dikey-yigin',
  'harf-aralik', 'kontur-dolma', 'olcek-darbe', 'uzun-golge', 'alt-cizgi', 'kutu-vurgu', 'zemin-perspektif', 'asagidan-yay', 'el-elips', 'arama-cubugu',
  // Opus galerisi (envanter/opus-galeri/teknikler.json): italik-vurgu (22 video), ustu-cizili-degisim (10), bolum-numarasi (7)
  'italik-vurgu', 'ustu-cizili-degisim', 'bolum-numarasi',
  // Opus galerisi, isci 2: harf-toplanma (31 video), kelime-dongusu (11), dev-kayan-kelime-bandi (7), karma-boy-satir (3),
  // kelime-kelime-renk-vurgu (16), rgb-tek-kare-giris (7; RGB yalniz enerjik ton), kelime-yigini-kolaj (7)
  'harf-toplanma', 'kelime-dongusu', 'dev-kayan-kelime-bandi', 'karma-boy-satir', 'kelime-kelime-renk-vurgu', 'rgb-tek-kare-giris', 'kelime-yigini-kolaj',
] as const;
export type BaslikTip = typeof BASLIK_TIPLERI[number];
/** alt-ucte-bir: blok yatay ortada, dikey merkezi kadrajin ~%66'sinda (konusanin yuzu ustte acik kalir); blok uzunsa yukari kayar */
export type Konum = 'orta' | 'sol-alt' | 'sol-ust' | 'sol-orta' | 'sag-alt' | 'ust-orta' | 'alt-ucte-bir';

const konumStil = (k: Konum, blokYuk = 0, H = 1080): React.CSSProperties => {
  const b: React.CSSProperties = { position: 'absolute', display: 'flex', flexDirection: 'column' };
  switch (k) {
    case 'alt-ucte-bir': {
      const merkez = Math.max(H * 0.5, Math.min(H * 0.66, H - 70 - blokYuk / 2));
      return { ...b, left: 0, right: 0, top: merkez, transform: 'translateY(-50%)', alignItems: 'center', textAlign: 'center' };
    }
    case 'sol-alt': return { ...b, left: 110, bottom: 120, alignItems: 'flex-start', textAlign: 'left' };
    case 'sol-ust': return { ...b, left: 110, top: 110, alignItems: 'flex-start', textAlign: 'left' };
    case 'sol-orta': return { ...b, left: 140, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'flex-start', textAlign: 'left' };
    case 'sag-alt': return { ...b, right: 110, bottom: 120, alignItems: 'flex-end', textAlign: 'right' };
    case 'ust-orta': return { ...b, left: 0, right: 0, top: 120, alignItems: 'center', textAlign: 'center' };
    default: return { ...b, inset: 0, justifyContent: 'center', alignItems: 'center', textAlign: 'center' };
  }
};

const KARAKTER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$';

// yazi olarak vurgu kontrasti: temel.ts okunurVurgu (Grafik.tsx ile ortak)

/** editoryal serif (italik vurgu, bolum numarasi): ciftin basligi serifse o, degilse govdesi serifse o, yoksa PlayfairDisplay.
 *  Cinzel (yalniz buyuk harf) ve AbrilFatface (asiri kontrast) italikte bozuk durur; atlanir. Italik dosyasi yok: tarayici
 *  egik kesimi sentezler (font-style: italic). */
const SERIF = ['DMSerifDisplay', 'PlayfairDisplay', 'EBGaramond', 'Lora', 'SourceSerif4', 'CormorantGaramond', 'Merriweather'];
const serifSec = (f: { baslik: string; govde: string }) => (SERIF.includes(f.baslik) ? f.baslik : SERIF.includes(f.govde) ? f.govde : 'PlayfairDisplay');
/** ustu-cizili-degisim: yalniz 'eski | yeni' bicimi cizilir. '|' yoksa (DNA ana basligi olarak secildiginde, kelime karti
 *  'a\nb') metin cizilmeden, murekkep renginde maskeden yukselir; '\n' her zaman satir sonudur. */
const degisimAyir = (s: string) => {
  const i = s.indexOf('|');
  return i < 0 ? { eski: '', yeni: s.trim() } : { eski: s.slice(0, i).trim(), yeni: s.slice(i + 1).trim() };
};
/** bolum-numarasi: numara ust'teki rakamdan ('Chapter 2' -> 02) ya da metnin basindan ('3. Baslik'); 'baslik | alt satir' */
const bolumAyir = (s: string, ust?: string) => {
  const [b0, ...alt] = s.split('|');
  let baslik = b0.trim(), no = '';
  const u = (ust || '').match(/\d+/);
  if (u) no = u[0];
  else { const m = baslik.match(/^\s*(\d{1,3})[.):\-\s]+(.+)$/s); if (m) { no = m[1]; baslik = m[2].trim(); } }
  return { no: no ? no.padStart(2, '0') : '', etiket: (ust || '').replace(/\d+/g, '').replace(/[#№:.\-]+\s*$/, '').trim(), baslik, alt: alt.join('|').trim() };
};
/** kelime-dongusu: 'Made in {Tokyo|Paris|Istanbul}' -> sabit kisim + doner yuva (+ yuvadan sonraki sabit kisim). Suslu parantez
 *  yoksa 'a | b | c' tum metin yuvadir; o da yoksa son kelime tek degerli yuvadir (siradan baslik: dongu yok, son kelime vurguya doner). */
const donguAyir = (s: string) => {
  const m = s.match(/^([\s\S]*?)\{([^}]*)\}([\s\S]*)$/);
  const tem = (x: string[]) => { const d = x.map((v) => v.trim()).filter(Boolean); return d.length ? d : ['']; };
  if (m) return { once: m[1].trim(), deger: tem(m[2].split('|')), sonra: m[3].trim() };
  if (s.includes('|')) return { once: '', deger: tem(s.split('|')), sonra: '' };
  const i = s.trimEnd().search(/\S+$/);
  return i <= 0 ? { once: '', deger: tem([s]), sonra: '' } : { once: s.slice(0, i).trim(), deger: tem([s.slice(i)]), sonra: '' };
};
/** karma-boy-satir: kucuk zarif serif baglaclar (EN + TR). _kelime_ / _iki kelime_ elle kucuk isaretler. */
const BAGLAC = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'but', 'nor', 'is', 'are', 'was', 'were', 'be', 'been', 'by',
  'with', 'from', 'as', 'its', 'that', 'than', 'then', 'into', 'onto', 'vs', 'via', 've', 'ile', 'bir', 'de', 'da', 'ki', 'icin', 'için', 'gibi', 'ya', 'veya', 'ama', 'mi', 'mı']);

/** BASLIK. metin icindeki '\n' acik satir sonudur (ornek: kelime karti a + '\n' + b). Yerlesim (yazYerlesim): satirlar
 *  guvenli alana (<= GUVENLI.genislik, maxGenislik) sigacak kadar kuculur, en az 'enaz' (90) px; daha da sigmazsa kelime
 *  sinirindan bolunur. '\n' yoksa ve tek satir sigmiyorsa once boyut korunarak satira bolunur (iki satir 120 px, tek satir 90 px'ten
 *  daha guclu okunur). Tipin kendi genislik payi (kutu dolgusu, perspektif olcegi, elips) hesaba katilir; hicbir tip oturmus
 *  halde guvenli alandan tasmaz. golge: medya ustunde koyu kontur + yumusak golge (acik zeminde de okunur). */
export const Baslik: React.FC<{ metin: string; ust?: string; tip: BaslikTip; stil: Stil; konum?: Konum; boyut?: number; gec?: number; renk?: string; maxGenislik?: number; golge?: boolean; enaz?: number;
  /** kelime-yigini-kolaj: yiginin sarsilip dagildigi kare (gec'e gore; sahne sonundan ~14 kare once). Verilmezse yigin durur. */
  dagil?: number }> = ({
  metin, ust, tip, stil, konum = 'orta', boyut = 120, gec = 0, renk, maxGenislik = 1500, golge = false, enaz = 90, dagil,
}) => {
  const f0 = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const f = f0 - gec;
  const { palet, font, hareket, ton } = stil;
  const ham = font.buyukHarf ? metin.toUpperCase() : metin;
  // kademeli girislerin tohumu: ayni metin her renderda ayni nefesi alir, farkli metin farkli
  const tY = stil.tohum + '|' + metin;
  // medya ustunde (golge) yazi her palette ACIK: acik palette murekkep koyu oldugundan zemin rengi kullanilir
  const R = renk || (golge && palet.acik ? palet.zemin : palet.murekkep);

  // ---- yerlesim: satirlar + sigan boyut ----
  const mono = tip === 'scramble' || tip === 'daktilo';
  const fAd = mono ? font.mono : font.baslik;
  const aralik = mono ? 2 : font.aralik;
  const kenarli = konum !== 'orta' && konum !== 'ust-orta' && konum !== 'alt-ucte-bir';
  const maxW = Math.min(maxGenislik, GUVENLI.genislik - (kenarli ? 20 : 0));
  // tipin metin disi genislik payi: carpan (perspektif 1.15x) + boyuta bagli dolgu (kutu, elips)
  // italik-vurgu: serif italik vurgu kelimesi sans govdeden ~%6 genis (egik kesim + 1.08 olcek) -> pay
  // rgb-tek-kare-giris: vurgu karesinde %105 olcek + kanal kaymasi; kelime-yigini-kolaj: satir donusu (+-5 derece) ve kaydirmasi
  const carpan = tip === 'zemin-perspektif' ? 1.15 : tip === 'italik-vurgu' ? 1.06 : tip === 'rgb-tek-kare-giris' ? 1.08 : tip === 'kelime-yigini-kolaj' ? 1.06 : 1;
  const dolgu = tip === 'kutu-acilis' ? 0.6 : tip === 'el-elips' ? 0.95 : tip === 'kutu-vurgu' ? 0.3 : 0;
  const etkinW = Math.max(300, maxW / carpan - dolgu * boyut);
  const bolum = tip === 'bolum-numarasi' ? bolumAyir(ham, ust) : null;
  const temiz = tip === 'kutu-vurgu' || tip === 'italik-vurgu' || tip === 'kelime-kelime-renk-vurgu' ? ham.replace(/\*/g, '') : bolum ? bolum.baslik : ham;
  let satirlar: string[], B: number;
  // ustu-cizili-degisim: eski ve yeni ifade ayri bloklar; ikisi de ayni boyutta (kucuk olana inilir) guvenli alana sigar
  let eskiS: string[] = [], yeniS: string[] = [];
  // kelime-dongusu: sabit kisim + yuva degerleri; tek satira (sabit + en genis deger) sigiyorsa satir ici, yoksa yuva kendi satirinda
  let dng: { satirIci: boolean; once: string[]; sonra: string[]; deger: string[][] } | null = null;
  // karma-boy-satir: agir buyuk harf kelimeler + kucuk serif baglaclar ayni taban cizgisinde
  let karma: { w: string; k: boolean }[][] | null = null;
  // kelime-yigini-kolaj: satir basina boyut / donus / yatay kayma
  let kolaj: { w: string; s: number; rot: number; x: number }[] | null = null;
  const karmaKucukB = (b: number) => Math.max(OKUNUR.ikincil, b * 0.4);
  if (tip === 'ustu-cizili-degisim') {
    const { eski, yeni } = degisimAyir(temiz);
    const parca = [eski, yeni].filter(Boolean);
    B = Math.min(...parca.map((x) => yazYerlesim(x, boyut, fAd, etkinW, enaz, aralik).boyut));
    const yer = (x: string) => (x ? yazYerlesim(x, B, fAd, etkinW, enaz, aralik).satirlar : []);
    eskiS = yer(eski); yeniS = yer(yeni);
    satirlar = [...eskiS, ...yeniS];
  } else if (tip === 'kelime-dongusu') {
    const d = donguAyir(temiz);
    const W = (x: string, b: number) => (x ? metinGenislik(x, b, fAd, aralik) : 0);
    const bosluk = (b: number) => metinGenislik(' ', b, fAd, aralik);
    const toplam = (b: number) => W(d.once, b) + (d.once ? bosluk(b) : 0) + Math.max(...d.deger.map((v) => W(v, b))) + (d.sonra ? bosluk(b) + W(d.sonra, b) : 0);
    const bIc = Math.min(boyut, boyut * (etkinW / Math.max(1, toplam(boyut))));
    if (!/\n/.test(d.once + d.deger.join('') + d.sonra) && bIc >= Math.min(boyut, 100)) {
      B = bIc;
      dng = { satirIci: true, once: d.once ? [d.once] : [], sonra: d.sonra ? [d.sonra] : [], deger: d.deger.map((v) => [v]) };
      satirlar = [[d.once, d.deger.reduce((a, v) => (W(v, B) > W(a, B) ? v : a), ''), d.sonra].filter(Boolean).join(' ')];
    } else {
      const parca = [d.once, ...d.deger, d.sonra].filter(Boolean);
      B = Math.min(...parca.map((x) => yazYerlesim(x, boyut, fAd, etkinW, enaz, aralik).boyut));
      const yer = (x: string) => (x ? yazYerlesim(x, B, fAd, etkinW, enaz, aralik).satirlar : []);
      dng = { satirIci: false, once: yer(d.once), sonra: yer(d.sonra), deger: d.deger.map((v) => (v ? yer(v) : [''])) };
      const enUzun = dng.deger.reduce((a, v) => (v.length > a.length ? v : a), ['']);
      satirlar = [...dng.once, ...enUzun, ...dng.sonra];
    }
  } else if (tip === 'karma-boy-satir') {
    const kaba = metin.replace(/\*/g, '');
    const tok: { w: string; k: boolean; kir?: boolean }[] = [];
    let ic = false;
    kaba.split('\n').forEach((sat, si) => {
      if (si) tok.push({ w: '', k: false, kir: true });
      sat.split(/\s+/).filter(Boolean).forEach((w) => {
        const b = w.startsWith('_'), s = /_[.,!?;:"')]*$/.test(w);
        const t = w.replace(/_/g, '');
        const k = ic || b || BAGLAC.has(t.toLowerCase().replace(/[^\p{L}]/gu, ''));
        if (b) ic = true;
        if (s) ic = false;
        if (t) tok.push({ w: t, k });
      });
    });
    // hepsi kucuk cikarsa (yalniz baglac) hepsi agir
    if (!tok.some((t) => !t.kir && !t.k)) tok.forEach((t) => { t.k = false; });
    tok.forEach((t) => { if (!t.k) t.w = t.w.toUpperCase(); });
    const gen = (t: { w: string; k: boolean }, b: number) => (t.k ? metinGenislik(t.w, karmaKucukB(b), serifSec(font)) : metinGenislik(t.w, b, fAd, aralik));
    const diz = (b: number) => {
      const out: { w: string; k: boolean }[][] = [[]];
      let w = 0;
      for (const t of tok) {
        const sat = out[out.length - 1];
        if (t.kir) { if (sat.length) { out.push([]); w = 0; } continue; }
        const g = gen(t, b);
        if (sat.length && w + b * 0.22 + g > etkinW) { out.push([t]); w = g; } else { w += (sat.length ? b * 0.22 : 0) + g; sat.push(t); }
      }
      return out.filter((r) => r.length);
    };
    const tasar = (r: { w: string; k: boolean }[][], b: number) => r.some((row) => row.reduce((s, t, i) => s + gen(t, b) + (i ? b * 0.22 : 0), 0) > etkinW);
    let b = boyut, r = diz(b);
    while ((r.length > 3 || tasar(r, b)) && b > enaz) { b = Math.max(enaz, b * 0.94); r = diz(b); }
    B = b; karma = r;
    satirlar = r.map((row) => row.map((t) => t.w).join(' '));
  } else if (tip === 'kelime-yigini-kolaj') {
    // her kelime kendi satirinda; 5'ten fazla kelimede en kisa komsu ciftler birlesir (yigin en fazla 5 kat)
    let r = temiz.split(/\s+/).filter(Boolean);
    while (r.length > 5) {
      let bi = 0, bl = Infinity;
      for (let i = 0; i < r.length - 1; i++) { const l = r[i].length + r[i + 1].length; if (l < bl) { bl = l; bi = i; } }
      r.splice(bi, 2, r[bi] + ' ' + r[bi + 1]);
    }
    if (!r.length) r = [''];
    const rs = rastgele(tY + ':kolaj');
    // poster olcegi: taban boyutun ~1,35 kati (satir carpani 0,82-1,22), yigin kadrajin %72'sini asmaz
    const fk = r.map((_, i) => 1.35 * (i === 0 ? 1.18 : 0.82 + rs() * 0.4));
    const W1 = r.map((w) => metinGenislik(w, 1, fAd, 0) + 0.24); // kutulu satirin dolgusu dahil
    let s = r.map((_, i) => Math.min(fk[i] * boyut, etkinW / W1[i]));
    const yuk = s.reduce((a, v) => a + v * 0.92, 0);
    if (yuk > H * 0.72) s = s.map((v) => v * ((H * 0.72) / yuk));
    s = s.map((v, i) => Math.min(Math.max(v, enaz), etkinW / W1[i]));
    kolaj = r.map((w, i) => {
      const bos = Math.max(0, (etkinW - W1[i] * s[i]) / 2);
      return { w, s: s[i], rot: (rs() * 2 - 1) * 5, x: (rs() * 2 - 1) * Math.min(bos, s[i] * 0.5) };
    });
    B = Math.max(...s);
    satirlar = r;
  } else if (tip === 'dikey-yigin') {
    // her kelime (metinde '\n' varsa her satir) kendi satirinda, son oge 1.25x: en genis oge sigar, toplam yukseklik kadrajin
    // %70'ini asmaz
    const kel = temiz.includes('\n') ? temiz.split('\n').map((s) => s.trim()).filter(Boolean) : temiz.split(/\s+/).filter(Boolean);
    const en = Math.max(1, ...kel.map((w, i) => metinGenislik(w, boyut, fAd, aralik) * (i === kel.length - 1 ? 1.25 : 1)));
    const yuk = (kel.length - 1 + 1.25) * boyut * 0.95;
    B = Math.min(boyut, boyut * (etkinW / en), boyut * ((H * 0.7) / Math.max(1, yuk)));
    satirlar = kel;
  } else if (tip === 'arama-cubugu') {
    satirlar = [temiz.replace(/\s*\n\s*/g, ' ')];
    B = boyut;
  } else if (!temiz.includes('\n') && metinGenislik(temiz, boyut, fAd, aralik) > etkinW && tip !== 'harf-aralik') {
    // tek uzun satir: boyutu koruyarak bol; yine sigmayan (cok uzun tek kelime) satir icin kucult
    satirlar = satirBol(temiz, boyut, fAd, etkinW, aralik);
    B = Math.max(Math.min(boyut, enaz), siganBoyut(satirlar, boyut, fAd, etkinW, aralik));
    if (B < boyut) satirlar = yazYerlesim(satirlar.join('\n'), boyut, fAd, etkinW, enaz, aralik).satirlar;
  } else {
    const y = yazYerlesim(temiz, boyut, fAd, etkinW, enaz, aralik);
    satirlar = y.satirlar; B = y.boyut;
  }
  // zemin-perspektif (yatik 3B yazi) en fazla 2 satir: fazlaysa 2 satira inene kadar kucult
  if (tip === 'zemin-perspektif' && satirlar.length > 2) {
    const kel = satirlar.join(' ');
    let b = B;
    let s2 = satirBol(kel, b, fAd, etkinW, aralik);
    while (s2.length > 2 && b > OKUNUR.ana) { b *= 0.94; s2 = satirBol(kel, b, fAd, etkinW, aralik); }
    satirlar = s2; B = Math.min(b, siganBoyut(s2, b, fAd, etkinW, aralik));
  }
  // blok yuksekligi (alt-ucte-bir konumu blogu kadrajda tutar): satirlar + ust satir
  // bolum-numarasi: dev kontur numara (NB) + italik alt satir (AB); ust satir numaranin yaninda kucuk etiket olur
  const NB = Math.min(B * 1.7, 260), AB = Math.max(OKUNUR.ikincil, B * 0.4);
  const serifAd = serifSec(font);
  const altS = bolum && bolum.alt ? satirBol(bolum.alt, AB, serifAd, etkinW) : [];
  const blokYuk = (tip === 'dikey-yigin' ? (satirlar.length + 0.25) * B * 0.95 : kolaj ? kolaj.reduce((a, r) => a + r.s * 0.92, 0) : satirlar.length * B * (karma ? 1.25 : 1.1))
    + (ust && tip !== 'bolum-numarasi' ? B * 0.5 : 0) + (tip === 'el-elips' ? B * 0.7 : 0)
    + (bolum ? NB * 1.02 + altS.length * AB * 1.3 + (altS.length ? B * 0.2 : 0) : 0);
  const m = satirlar.join('\n');
  const enGen = Math.max(...satirlar.map((s) => metinGenislik(s, B, fAd, aralik)));

  const glg = golge ? konturGolge(Math.max(2.5, Math.min(4, B / 34))) : undefined;
  // yazi olarak vurgu (italik-vurgu, ustu-cizili-degisim): palet zemininde, medya ustunde (golge) koyu kontura karsi 4,5:1
  // (ornek gazete-sepya koyu kirmizisi videoda koyu zeminde kaybolur -> acik yaziya dogru acilir)
  const vurguYazi = !/^#/.test(R) ? palet.vurgu : okunurVurgu(palet.vurgu, golge ? '#141414' : palet.zemin, R);
  const temel: React.CSSProperties = { fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: B, lineHeight: 1.04, letterSpacing: font.aralik, color: R, maxWidth: maxW, margin: 0, whiteSpace: 'pre-line', textShadow: glg };
  // ust satir (bolum etiketi): en az OKUNUR.enaz (36 px); vurgu renginde ama zeminde 4,5:1 (beton-sari'de sari -> koyu hardal)
  const ustBoyut = Math.max(OKUNUR.enaz, B * 0.24);
  const ustRenk = okunurVurgu(palet.vurgu, golge ? '#141414' : palet.zemin, golge ? (palet.acik ? palet.zemin : palet.murekkep) : palet.murekkep);
  const ustSatir = ust && tip !== 'bolum-numarasi' && tip !== 'kelime-kelime-renk-vurgu' ? (
    <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: ustBoyut, letterSpacing: 3, color: ustRenk, textTransform: 'uppercase', marginBottom: B * 0.22, opacity: yay(f / 12), textShadow: glg }}>{ust}</div>
  ) : null;
  const sure = Math.round(fps * 0.7);
  /** karakter karakter cizilen tiplerde satir sonu */
  const kr = (c: string, i: number, el: (c: string) => React.ReactNode) => (c === '\n' ? <br key={i} /> : el(c));
  /** maske-yukari satiri (yeni tiplerin sabit kisimlari icin ortak): asimsiz, nefesli kademe, hizli anda dikey hareket bulanikligi */
  const suM = mesafeSure(sure, B * 1.15);
  const maskeSatir = (s: React.ReactNode, i: number, n: number, gec0 = 0, ek: React.CSSProperties = {}) => {
    const pf = (k: number) => dogalIlerle(k, gec0 + kademe(i, n, tY) * 5, suM * sapma(i, tY), hareket, { ton });
    const p = pf(f);
    return <div key={gec0 + ':' + i} style={{ overflow: 'hidden', paddingBottom: B * 0.06, paddingLeft: golge ? 8 : 0, paddingRight: golge ? 8 : 0 }}><YonBulanik dy={kayma(pf, f) * B * 1.15} style={{ ...temel, ...ek, transform: `translateY(${(1 - p) * 110}%)` }}>{s}</YonBulanik></div>;
  };
  /** tam kadraj arka katman (dev-kayan-kelime-bandi bandi, rgb-tek-kare-giris parlaklik karesi) */
  let arka: React.ReactNode = null;
  let govde: React.ReactNode;

  switch (tip) {
    case 'maske-yukari': {
      // maske girisi: asimsiz oturur; satirlar ayni aralikla degil, nefesli kademeyle; hizli anda dikey hareket bulanikligi
      const su = mesafeSure(sure, B * 1.15);
      govde = satirlar.map((s, i) => {
        const pf = (k: number) => dogalIlerle(k, kademe(i, satirlar.length, tY) * 5, su * sapma(i, tY), hareket, { ton });
        const p = pf(f);
        return <div key={i} style={{ overflow: 'hidden', paddingBottom: B * 0.06, paddingLeft: golge ? 8 : 0, paddingRight: golge ? 8 : 0 }}><YonBulanik dy={kayma(pf, f) * B * 1.15} style={{ ...temel, transform: `translateY(${(1 - p) * 110}%)` }}>{s}</YonBulanik></div>;
      });
      break;
    }
    case 'harf-dalga':
      govde = <div style={temel}>{m.split('').map((c, i, d) => kr(c, i, (c) => {
        const p = dogalIlerle(f, kademe(i, d.length, tY, 0.2) * 1.6, sure * 0.7 * sapma(i, tY, 0.07), hareket === 'yay-yumusak' ? 'geri-sekme' : hareket, { ton });
        return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: sinirla(p * 2), transform: `translateY(${(1 - p) * B * 0.5}px) rotate(${(1 - p) * 12}deg)` }}>{c}</span>;
      }))}</div>;
      break;
    case 'bulaniklik': {
      const p = ilerle(f, 0, sure * 1.3, hareket);
      govde = <div style={{ ...temel, filter: `blur(${(1 - p) * 26}px)`, opacity: p, transform: `scale(${1.08 - p * 0.08})` }}>{m}</div>;
      break;
    }
    case 'scramble': {
      const r = rastgele(Math.floor(f / 2) + 3);
      govde = <div style={{ ...temel, fontFamily: font.mono, fontWeight: 700, letterSpacing: 2 }}>{m.split('').map((c, i) => kr(c, i, (c) => {
        const coz = f > 4 + i * 1.3;
        return <span key={i} style={{ color: coz ? R : palet.vurgu, opacity: f > i * 0.6 ? 1 : 0 }}>{c === ' ' ? ' ' : coz ? c : KARAKTER[Math.floor(r() * KARAKTER.length)]}</span>;
      }))}</div>;
      break;
    }
    case 'daktilo': {
      const n = Math.floor(Math.max(0, f) / 1.6);
      const imlec = Math.floor(f0 / 15) % 2 === 0;
      govde = <div style={{ ...temel, fontFamily: font.mono, fontWeight: 700, letterSpacing: 2 }}>{m.slice(0, n)}<span style={{ opacity: imlec ? 1 : 0, color: palet.vurgu }}>▌</span></div>;
      break;
    }
    case 'kutu-acilis': {
      const p = ilerle(f, 0, sure * 0.8, hareket), q = ilerle(f, sure * 0.5, sure * 0.8, hareket);
      govde = (
        <div style={{ position: 'relative', padding: `${B * 0.12}px ${B * 0.3}px` }}>
          <div style={{ position: 'absolute', inset: 0, background: palet.vurgu, transform: `scaleX(${p})`, transformOrigin: konum.startsWith('sag') ? 'right' : 'left', boxShadow: golge ? `0 12px 40px ${rgba('#000', 0.45)}` : undefined }} />
          <div style={{ ...temel, position: 'relative', color: palet.zemin, textShadow: 'none', opacity: q, transform: `translateX(${(1 - q) * -20}px)` }}>{m}</div>
        </div>
      );
      break;
    }
    case 'dikey-yigin': {
      const k = satirlar;
      // 260 px'lik kayma buyuk hareket: sure mesafeyle uzar; son (vurgu) kelime kahraman, tonu izin verirse en cok %1,2 asar
      const su = mesafeSure(sure, 260);
      govde = k.map((w, i) => {
        const son = i === k.length - 1;
        const pf = (x: number) => dogalIlerle(x, kademe(i, k.length, tY) * 6, su * sapma(i, tY), hareket, { ton, kahraman: son });
        const p = pf(f);
        const yon = i % 2 === 0 ? -1 : 1;
        return <YonBulanik key={i} dx={kayma(pf, f) * 260} style={{ ...temel, whiteSpace: 'nowrap', fontSize: B * (son ? 1.25 : 1), color: son ? palet.vurgu : R, transform: `translateX(${yon * (1 - p) * 260}px)`, opacity: sinirla(p * 1.5), lineHeight: 0.95 }}>{w}</YonBulanik>;
      });
      break;
    }
    case 'harf-aralik': {
      // aralik acilisi guvenli alani asmaz: acilma payi = kalan bos genislik (uzun metinde aralik az, olcek+solma ile girer)
      const p = ilerle(f, 0, sure * 1.6, hareket);
      const n = Math.max(1, ...satirlar.map((s) => s.length));
      const pay = Math.max(0, (maxW - enGen) / n);
      const ek = Math.min(B * 0.5, pay) * (1 - p);
      govde = <div style={{ ...temel, letterSpacing: font.aralik + ek, opacity: p, whiteSpace: 'pre', transform: `scale(${1 + (pay < B * 0.1 ? 0.06 * (1 - p) : 0)})` }}>{m}</div>;
      break;
    }
    case 'kontur-dolma': {
      // dolgu bos (seffaf) iken text-shadow harfin icinden gorunur: golge filtre ile verilir
      const p = ilerle(f, 0, sure, hareket), q = ilerle(f, sure * 0.8, sure, hareket);
      govde = <div style={{ ...temel, textShadow: 'none', filter: golge ? `drop-shadow(0 4px 14px ${rgba('#000', 0.7)})` : undefined, color: rgba(R, q), WebkitTextStroke: `${Math.max(1.5, B / 45)}px ${R}`, opacity: sinirla(p * 2), clipPath: `inset(-20px ${(1 - p) * 100}% -20px -20px)` }}>{m}</div>;
      break;
    }
    case 'olcek-darbe': {
      // buyukten carpar; baslangic olcegi blogu kadraj disina tasimayacak kadar (uzun metinde daha az buyur)
      const p = ilerle(f, 0, sure * 0.5, 'ustel-sert');
      const s0 = Math.max(1.15, Math.min(2.2, 1880 / Math.max(1, enGen)));
      const sars = f > 0 && f < sure * 0.6 ? Math.sin(f * 2.3) * (1 - p) * 10 : 0;
      govde = <div style={{ ...temel, transform: `scale(${s0 - p * (s0 - 1)}) translateX(${sars}px)`, opacity: sinirla(p * 3) }}>{m}</div>;
      break;
    }
    case 'uzun-golge': {
      const p = ilerle(f, 0, sure * 1.4, hareket);
      const n = Math.round(p * 18);
      const golgeD = Array.from({ length: n }, (_, i) => `${i + 1}px ${i + 1}px 0 ${palet.vurgu}`);
      if (golge) golgeD.push(`0 0 3px ${rgba('#000', 0.9)}`, `0 10px 30px ${rgba('#000', 0.6)}`);
      govde = <div style={{ ...temel, textShadow: golgeD.join(',') || 'none', opacity: sinirla(p * 3), transform: `translate(${-p * 6}px, ${-p * 6}px)` }}>{m}</div>;
      break;
    }
    case 'alt-cizgi': {
      const p = ilerle(f, 0, sure, hareket), q = ilerle(f, sure * 0.6, sure, hareket);
      govde = (
        <div style={{ display: 'inline-block' }}>
          <div style={{ ...temel, opacity: p }}>{m}</div>
          <div style={{ height: Math.max(6, B * 0.07), background: palet.vurgu, marginTop: B * 0.08, transform: `scaleX(${q})`, transformOrigin: 'left', boxShadow: golge ? `0 3px 10px ${rgba('#000', 0.6)}` : undefined }} />
        </div>
      );
      break;
    }
    case 'kutu-vurgu': {
      // agir sans; *isaretli* kelimeler (yoksa son kelime) dolu vurgu kutusunda. Kelimeler sirayla yukari kayar, kutu soldan acilir.
      // '\n' satir sonu: tam genislik kirilma ogesi
      const kaba = (font.buyukHarf ? metin.toUpperCase() : metin);
      const parca = kaba.split('\n').map((s) => s.trim().split(/\s+/).filter(Boolean));
      const hepsi = parca.flat();
      const isaret = hepsi.some((w) => /^\*.*\*$/.test(w));
      let say = 0;
      const kel: { w: string; v: boolean; kir?: boolean }[] = [];
      parca.forEach((sat, si) => {
        if (si > 0) kel.push({ w: '', v: false, kir: true });
        sat.forEach((w) => { kel.push({ w: w.replace(/\*/g, ''), v: isaret ? /^\*.*\*$/.test(w) : say === hepsi.length - 1 }); say++; });
      });
      let ki = 0;
      govde = (
        <div style={{ ...temel, whiteSpace: 'normal', display: 'flex', flexWrap: 'wrap', justifyContent: konum === 'orta' || konum === 'ust-orta' || konum === 'alt-ucte-bir' ? 'center' : 'flex-start', columnGap: B * 0.24, rowGap: B * 0.1 }}>
          {kel.map((k, j) => {
            if (k.kir) return <div key={'k' + j} style={{ flexBasis: '100%', height: 0 }} />;
            const i = ki++;
            const g = kademe(i, hepsi.length, tY) * 3;
            const pf = (x: number) => dogalIlerle(x, g, sure * 0.6 * sapma(i, tY), hareket, { ton });
            const p = pf(f);
            const q = ilerle(f, g + sure * 0.35, sure * 0.5, 'ustel-sert');
            return (
              <div key={j} style={{ overflow: 'hidden', position: 'relative', padding: k.v ? `0 ${B * 0.12}px` : golge ? '0 6px' : 0 }}>
                {k.v ? <div style={{ position: 'absolute', inset: `${B * 0.04}px 0`, background: palet.vurgu, transform: `scaleX(${q})`, transformOrigin: 'left' }} /> : null}
                <YonBulanik dy={kayma(pf, f) * B * 1.1} style={{ position: 'relative', transform: `translateY(${(1 - p) * 105}%)`, color: k.v && q > 0.5 ? (palet.acik ? palet.zemin : '#ffffff') : R, textShadow: k.v && q > 0.5 ? 'none' : glg }}>{k.w}</YonBulanik>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case 'el-elips': {
      // agir kelime + etrafina ELLE cizilmis kirmizi elips (@ReichonRecord): metin hafif olcekle oturur, ardindan 0,4 sn'de
      // kalem cizgisi (bir turdan biraz fazla, ucu kapanmayan, kenari titrek) dolanir. Belge/dosya kartlarinda isim/yil vurgusu.
      const p = ilerle(f, 0, sure * 0.6, hareket);
      const c = sinirla((f - sure * 0.55) / (fps * 0.4));
      const r = rastgele(metin + 'el');
      const genis = Math.min(maxW - B * 0.9, enGen) + B * 0.9, yuk = B * (1.04 * satirlar.length + 0.66);
      const n = 90, nokta: string[] = [];
      for (let i = 0; i <= n * c; i++) {
        const t = (i / n) * Math.PI * 2 * 1.12 - 0.5;
        const tit = 1 + Math.sin(i * 0.9 + r() * 6) * 0.015 + (i / n) * 0.05;
        nokta.push(`${(genis / 2) * tit * Math.cos(t) + genis / 2 + 6},${(yuk / 2) * tit * Math.sin(t) * (1 + 0.04 * Math.sin(t * 3)) + yuk / 2 + 6}`);
      }
      const kirmizi = palet.acik ? '#c22a22' : '#ff4b3e';
      govde = (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: genis + 12, height: yuk + 12 }}>
          <div style={{ ...temel, fontWeight: Math.max(800, font.baslikAgirlik), transform: `scale(${1.08 - 0.08 * p})`, opacity: sinirla(p * 2) }}>{m}</div>
          <svg width={genis + 12} height={yuk + 12} style={{ position: 'absolute', inset: 0, overflow: 'visible', transform: 'rotate(-3deg)' }}>
            {nokta.length > 1 ? <polyline points={nokta.join(' ')} fill="none" stroke={kirmizi} strokeWidth={B * 0.07} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} /> : null}
          </svg>
        </div>
      );
      break;
    }
    case 'arama-cubugu': {
      // yuvarlak beyaz arama cubugu (@InnovatingCore): cubuk soldan acilir, metin harf harf yazilir + yanip sonen imlec,
      // bitince hafif 'basildi' cokmesi. Marka/logo YOK (genel arama kutusu). Cubuk metne gore uzar, guvenli alani asmaz;
      // metin sigmiyorsa yazi kuculur (en az OKUNUR.ana).
      const yazi = satirlar[0];
      const ac = ilerle(f, 0, sure * 0.6, 'kubik-hizli');
      // yazma en fazla ~1,0 sn surer: harf basi sure = min(0,045 sn, 1,0 sn / harf sayisi)
      const yazBas = sure * 0.5, harfKare = Math.min(fps * 0.045, fps / Math.max(1, yazi.length));
      const harf = Math.floor(sinirla((f - yazBas) / (Math.max(1, yazi.length) * harfKare)) * yazi.length);
      const bitti = harf >= yazi.length;
      const bas = bitti ? ilerle(f, yazBas + yazi.length * harfKare + 6, 8, 'ustel-sert') : 0;
      const yuk = B * 0.95;
      const yb0 = B * 0.42;
      const tw0 = metinGenislik(yazi, yb0, font.govde);
      const cubukW = Math.min(maxW, Math.max(B * 6, tw0 + B * 1.7));
      const yb = Math.max(Math.min(yb0, OKUNUR.ana), yb0 * Math.min(1, (cubukW - B * 1.7) / Math.max(1, tw0)));
      govde = (
        <div style={{ display: 'flex', alignItems: 'center', gap: B * 0.3, height: yuk, width: cubukW * ac, padding: `0 ${B * 0.4}px`, background: '#ffffff', borderRadius: yuk / 2,
          boxShadow: `0 ${B * 0.12}px ${B * 0.5}px ${rgba('#000000', 0.35)}`, transform: `scale(${1 - 0.03 * Math.sin(bas * Math.PI)})`, opacity: sinirla(ac * 3), overflow: 'hidden', boxSizing: 'border-box' }}>
          <svg width={yuk * 0.42} height={yuk * 0.42} viewBox="0 0 24 24" style={{ flex: 'none' }}><circle cx="10" cy="10" r="6.5" fill="none" stroke="#5f6368" strokeWidth="2.6" /><line x1="15" y1="15" x2="21" y2="21" stroke="#5f6368" strokeWidth="2.6" strokeLinecap="round" /></svg>
          <div style={{ fontFamily: font.govde, fontWeight: 600, fontSize: yb, color: '#202124', whiteSpace: 'nowrap', letterSpacing: 0 }}>
            {yazi.slice(0, harf)}<span style={{ display: 'inline-block', width: 3, height: B * 0.5, marginLeft: 3, verticalAlign: 'middle', background: '#1a73e8', opacity: Math.floor(f / 15) % 2 || !bitti ? 1 : 0 }} />
          </div>
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
        <div style={{ perspective: B * 9, perspectiveOrigin: '50% 0%' }}>
          <div style={{ ...temel, textShadow: 'none', fontSize: B * 1.15, whiteSpace: 'pre', transform: `rotateX(${72 - 20 * p}deg) translateY(${(1 - p) * B * 0.8}px) scale(${0.92 + 0.08 * p})`, transformOrigin: '50% 100%',
            opacity: sinirla(p * 2.5), color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text',
            backgroundImage: `linear-gradient(100deg, ${R} ${isik * 120 - 30}%, ${parlak} ${isik * 120 - 10}%, ${R} ${isik * 120 + 10}%)`,
            filter: `drop-shadow(0 ${B * 0.06}px ${B * 0.12}px ${rgba('#000', 0.6)}) drop-shadow(0 0 ${B * 0.18}px ${rgba(palet.vurgu, 0.35 * isik)})${golge ? ` drop-shadow(0 0 3px ${rgba('#000', 0.9)})` : ''}` }}>{m}</div>
        </div>
      );
      break;
    }
    case 'italik-vurgu': {
      // galeri (henkvaness, stewchan2, gdgtify): cumle kelime kelime kurulur (1-2 karede bir; %60 opak + 8 px asagidan),
      // *isaretli* kelimeler (yoksa son kelime) editoryal serif ITALIK'te; cumle kurulunca vurgu rengine doner ve hafifce oturur.
      // Kutu / alt cizgi yok (dergi hissi). Yerlesim ustteki ortak guvenli alan sigdirmasindan (satirlar, B).
      const kaba = (font.buyukHarf ? metin.toUpperCase() : metin).split(/\s+/).filter(Boolean);
      let ic = false;
      const vurgu = kaba.map((w) => { const b = w.startsWith('*'), s = /\*[.,!?;:"')]*$/.test(w); const v = ic || b; if (b) ic = true; if (s) ic = false; return v; });
      if (!vurgu.some(Boolean)) vurgu[vurgu.length - 1] = true;
      const n = vurgu.length;
      const kurulus = kademe(n - 1, n, tY) * 1.6;
      let wi = 0;
      govde = (
        <div style={{ ...temel, whiteSpace: 'normal' }}>
          {satirlar.map((s, si) => (
            <div key={si} style={{ whiteSpace: 'nowrap' }}>
              {s.split(' ').filter(Boolean).map((w, j) => {
                const i = wi++;
                const g0 = kademe(i, n, tY) * 1.6;
                const p = dogalIlerle(f, g0, sure * 0.5 * sapma(i, tY), hareket, { ton });
                const q = ilerle(f, g0 + 3, sure * 0.45, 'kubik-hizli');
                const v = vurgu[i];
                // vurgu kelimesi: son kelime de tam renge ulasinca (kurulus + ~0,5 sn) 6 karede vurgu rengine doner, 1.03 -> 1 oturur
                const d = v ? dogalIlerle(f, kurulus + sure * 0.75 + i * 0.5, 6, hareket, { ton }) : 0;
                const st: React.CSSProperties = v
                  ? { fontFamily: serifAd, fontStyle: 'italic', fontWeight: 700, fontSize: B * 1.08, letterSpacing: 0, color: d > 0 ? karistirHex(R, vurguYazi, d) : rgba(R, 0.6 + 0.4 * q), opacity: sinirla(p * 2.5) }
                  : { color: rgba(R, 0.6 + 0.4 * q), opacity: sinirla(p * 2.5) };
                return (
                  <React.Fragment key={j}>
                    {j ? ' ' : null}
                    <span style={{ display: 'inline-block', ...st, transform: `translateY(${(1 - p) * 8}px) scale(${v && d > 0 ? 1.03 - 0.03 * d : 1})`, transformOrigin: '50% 80%', paddingRight: v ? B * 0.06 : 0 }}>{w}</span>
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      );
      break;
    }
    case 'ustu-cizili-degisim': {
      // galeri (chrisjdimarco "THE INVISIBLE HAND." -> "FEW READ HIS WARNING.", fire-ozgur): 'eski | yeni'. Eski ifade maskeden
      // yukselir; ~1 sn sonra %55 opakliga iner ve vurgu cizgisi 3 karede ustunden gecer; yeni ifade altindan vurgu renginde
      // maskeden yukselir. "Herkes X sanir -> aslinda Y" (efsane / gercek) kalibi.
      const t1 = eskiS.length ? Math.round(sure * 1.4) : 0, t2 = eskiS.length ? t1 + 7 : 0;
      const su = mesafeSure(sure, B * 1.15);
      const kalin = Math.max(5, B * 0.075);
      const satir = (s: string, i: number, n: number, gec: number, renk: string, cizik: number) => {
        const pf = (k: number) => dogalIlerle(k, gec + kademe(i, n, tY + gec) * 5, su * sapma(i, tY), hareket, { ton });
        const p = pf(f);
        return (
          <div key={gec + '-' + i} style={{ overflow: 'hidden', paddingBottom: B * 0.06, paddingLeft: golge ? 8 : 0, paddingRight: golge ? 8 : 0 }}>
            <YonBulanik dy={kayma(pf, f) * B * 1.15} style={{ ...temel, color: renk, display: 'inline-block', position: 'relative', transform: `translateY(${(1 - p) * 110}%)` }}>
              {s}
              {cizik > 0 ? <div style={{ position: 'absolute', left: -B * 0.04, right: -B * 0.04, top: '54%', height: kalin, marginTop: -kalin / 2, background: vurguYazi, transform: `scaleX(${cizik})`, transformOrigin: 'left', boxShadow: golge ? `0 2px 8px ${rgba('#000', 0.5)}` : undefined }} /> : null}
            </YonBulanik>
          </div>
        );
      };
      const gri = ilerle(f, t1, 4, 'kubik-hizli');
      govde = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'inherit' }}>
          {eskiS.map((s, i) => satir(s, i, eskiS.length, 0, rgba(R, 1 - 0.45 * gri), ilerle(f, t1 + i * 2, 3, 'ustel-sert')))}
          <div style={{ height: eskiS.length ? B * 0.1 : 0 }} />
          {yeniS.map((s, i) => satir(s, i, yeniS.length, t2, eskiS.length ? vurguYazi : R, 0))}
        </div>
      );
      break;
    }
    case 'bolum-numarasi': {
      // galeri (henkvaness s009/s012/s026): bolum kapagi. Ici bos (yalniz kontur) dev serif numara 0,3 sn'de solar; yaninda kisa
      // vurgu cizgisi + kucuk etiket ('CHAPTER'); ardindan dolu baslik maskeden ve altinda italik soluk alt satir kademeli gelir.
      // metin: 'Baslik | alt satir'; numara ust'teki rakamdan ('Chapter 2') ya da metnin basindan ('3. Baslik').
      const b = bolum!;
      const p0 = dogalIlerle(f, 0, Math.round(fps * 0.3), hareket, { ton });
      const ce = ilerle(f, 4, Math.round(fps * 0.35), 'kubik-hizli');
      const tg = Math.round(fps * 0.3), ag = tg + Math.round(fps * 0.4);
      const su = mesafeSure(sure, B * 1.15);
      const kontur = Math.max(1.5, NB / 95);
      const etBoy = Math.max(OKUNUR.enaz + 4, B * 0.3);
      govde = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: NB * 0.16, marginBottom: B * 0.08 }}>
            {b.no ? <div style={{ fontFamily: serifAd, fontWeight: 700, fontSize: NB, lineHeight: 1, color: 'transparent', WebkitTextStroke: `${kontur}px ${R}`, opacity: p0, transform: `translateY(${(1 - p0) * 14}px)`,
              filter: golge ? `drop-shadow(0 3px 10px ${rgba('#000', 0.75)})` : undefined }}>{b.no}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: etBoy * 0.3 }}>
              <div style={{ width: 90, height: Math.max(6, B * 0.06), background: palet.vurgu, transform: `scaleX(${ce})`, transformOrigin: 'left' }} />
              {b.etiket ? <div style={{ fontFamily: font.govde, fontWeight: 800, fontSize: etBoy, letterSpacing: 4, textTransform: 'uppercase', color: R, opacity: ce, textShadow: glg, whiteSpace: 'nowrap' }}>{b.etiket}</div> : null}
            </div>
          </div>
          {satirlar.map((s, i) => {
            const pf = (k: number) => dogalIlerle(k, tg + kademe(i, satirlar.length, tY) * 5, su * sapma(i, tY), hareket, { ton });
            const p = pf(f);
            return <div key={i} style={{ overflow: 'hidden', paddingBottom: B * 0.06, paddingLeft: golge ? 8 : 0, paddingRight: golge ? 8 : 0 }}><YonBulanik dy={kayma(pf, f) * B * 1.15} style={{ ...temel, transform: `translateY(${(1 - p) * 110}%)` }}>{s}</YonBulanik></div>;
          })}
          {altS.map((s, i) => {
            const p = dogalIlerle(f, ag + i * 3, Math.round(sure * 0.6), hareket, { ton });
            return <div key={'a' + i} style={{ fontFamily: serifAd, fontStyle: 'italic', fontWeight: 600, fontSize: AB, lineHeight: 1.3, color: rgba(R, 0.78), opacity: sinirla(p * 1.5), transform: `translateY(${(1 - p) * 8}px)`, textShadow: glg, marginTop: i ? 0 : B * 0.12, whiteSpace: 'nowrap' }}>{s}</div>;
          })}
        </div>
      );
      break;
    }
    case 'harf-toplanma': {
      // galeri (kloss-xyz s004, 31 video): harfler kadraja dagilmis gelir (rastgele konum, donus, olcek, bulaniklik) ve ~1,5 sn'de
      // kademeyle yerlerine kilitlenir. scramble'dan farki: karakter degil KONUM toplanir. Kritik yay (asimsiz: kilit sekmez).
      // Hepsi kilitlenince arkadan sicak bir zemin isigi yayilir ve ~1 sn'de soluk bir dinlenmeye iner (yazi glow'u degil).
      const top = Math.round(fps * 1.0), dag = Math.round(fps * 0.5);
      let son = 0;
      const harfler = m.split('').map((c, i) => kr(c, i, (c) => {
        const r = rastgele(tY + ':h' + i);
        const dx = (r() * 2 - 1) * 820, dy = (r() * 2 - 1) * 380, rot = (r() * 2 - 1) * 150, s0 = 0.5 + r() * 1.1, g = r() * dag;
        son = Math.max(son, g + top);
        const q = 1 - dogalIlerle(f, g, top, 'kubik-hizli', { ton });
        return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: sinirla(f / 6) * (0.3 + 0.7 * sinirla((1 - q) * 1.4)), filter: q > 0.02 ? `blur(${(q * 9).toFixed(2)}px)` : undefined,
          transform: `translate(${q * dx}px, ${q * dy}px) rotate(${q * rot}deg) scale(${1 + q * (s0 - 1)})` }}>{c}</span>;
      }));
      const isik = sinirla((f - (son - 6)) / 6) * (f < son ? 1 : 0.2 + 0.8 * Math.exp(-(f - son) / (fps * 0.45)));
      const sicak = karistirHex(/^#/.test(palet.vurgu) ? palet.vurgu : '#ff9a4a', '#ff9a4a', 0.5);
      govde = (
        <div style={{ position: 'relative' }}>
          {isik > 0.01 ? <div style={{ position: 'absolute', left: '50%', top: '50%', width: enGen * 1.5 + 500, height: blokYuk * 2 + 420, transform: 'translate(-50%, -50%)', pointerEvents: 'none',
            background: `radial-gradient(closest-side, ${rgba(sicak, 0.24 * isik)}, ${rgba(sicak, 0.08 * isik)} 55%, ${rgba(sicak, 0)})` }} /> : null}
          <div style={{ ...temel, position: 'relative' }}>{harfler}</div>
        </div>
      );
      break;
    }
    case 'kelime-dongusu': {
      // galeri (iammxfschr s003, itisrazak s003; 11 video): sabit cumlede tek yuva (ad, sehir, urun) 0,6 sn arayla dikey kayarak
      // ve hareket bulanikligiyla degisir; yuva genisligi yumusakca yeni degere uyar (satir yeniden ortalanir, sicrama yok);
      // son degerde durur ve vurgu rengine doner. Ust satir baglami tutar. Metin: 'Made in {Tokyo|Paris|Istanbul}'.
      const d = dng!;
      const n = d.deger.length;
      const adim = Math.round(fps * 0.6), gs = Math.max(5, Math.round(fps * 0.22)), t0 = Math.round(sure * 0.9);
      const k = n > 1 ? Math.max(0, Math.min(n - 1, Math.floor((f - t0) / adim) + 1)) : 0;
      const tk = k ? t0 + (k - 1) * adim : 0;
      const p = k ? ilerle(f, tk, gs, 'kubik-hizli') : 1;
      const p0 = dogalIlerle(f, 0, suM, hareket, { ton });
      const vr = ilerle(f, n > 1 ? t0 + (n - 2) * adim + gs : Math.round(sure * 1.1), 6, 'kubik-hizli');
      const sonRenk = k === n - 1 && /^#/.test(R) ? karistirHex(R, vurguYazi, vr) : R;
      const pad = B * 0.1, satH = B * 1.04;
      const yW = (v: string[]) => Math.max(...v.map((s) => metinGenislik(s, B, fAd, aralik)));
      const w = k ? yW(d.deger[k - 1]) + (yW(d.deger[k]) - yW(d.deger[k - 1])) * p : yW(d.deger[0]);
      const enSatir = Math.max(...d.deger.map((v) => v.length));
      const orta = !d.satirIci && (konum === 'orta' || konum === 'ust-orta' || konum === 'alt-ucte-bir');
      const deger = (v: string[], ty: number, bl: number, op: number, renk: string, key: string) => (
        <div key={key} style={{ position: 'absolute', top: pad, left: orta ? '50%' : 0, whiteSpace: 'pre', textAlign: 'inherit', color: renk, opacity: op,
          transform: `${orta ? 'translateX(-50%) ' : ''}translateY(${ty}%)`, filter: bl > 0.3 ? `blur(${bl.toFixed(2)}px)` : undefined }}>{v.join('\n')}</div>
      );
      const yuva = (
        <div style={{ ...temel, position: 'relative', width: w, height: satH * enSatir + pad * 2, clipPath: `inset(0 ${-B * 0.3}px)`, flex: 'none', alignSelf: d.satirIci ? undefined : orta ? 'center' : 'flex-start' }}>
          {k && p < 1 ? deger(d.deger[k - 1], -p * 130, Math.sin(Math.PI * p) * 7, 1 - p, R, 'o' + k) : null}
          {deger(d.deger[k], k ? (1 - p) * 110 : (1 - p0) * 110, k ? Math.sin(Math.PI * p) * 7 : 0, 1, sonRenk, 'y' + k)}
        </div>
      );
      if (d.satirIci) {
        // ayni font, ayni boyut, ayni dolgu: kutu altlari hizalaninca taban cizgileri de hizalanir
        const parca = (s: string, key: string) => (
          <div key={key} style={{ ...temel, whiteSpace: 'pre', height: satH + pad * 2, padding: `${pad}px 0`, boxSizing: 'border-box', clipPath: `inset(0 ${-B * 0.3}px)`, flex: 'none' }}>
            <div style={{ transform: `translateY(${(1 - p0) * 110}%)` }}>{s}</div>
          </div>
        );
        govde = (
          <div style={{ display: 'flex', alignItems: 'flex-end', columnGap: metinGenislik(' ', B, fAd, aralik) }}>
            {d.once.map((s, i) => parca(s, 'a' + i))}{yuva}{d.sonra.map((s, i) => parca(s, 'b' + i))}
          </div>
        );
      } else {
        govde = (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'inherit' }}>
            {d.once.map((s, i) => maskeSatir(s, i, d.once.length))}{yuva}{d.sonra.map((s, i) => maskeSatir(s, i, d.sonra.length, 4))}
          </div>
        );
      }
      break;
    }
    case 'dev-kayan-kelime-bandi': {
      // galeri (melvynx s001, robvjourney s001; 7 video): kadrajdan tasan DEV kelime bandi kenardan kirpilarak surekli kayar
      // (marquee); okunur baslik onun ustunde maskeden yukselir. Bant metnin kendisi: dolu ve kontur birimler sirayla, soluk.
      // Dongu kendi genisliginin yuzdesiyle kaydigi icin olcum hatasinda bile dikissizdir.
      const bandB = Math.min(H * 0.46, Math.max(B * 2.4, 260));
      const birim = (ham.toUpperCase()).replace(/\s*\n\s*/g, ' ').replace(/[|{}*_]/g, '').trim();
      const uw = metinGenislik(birim + '  —  ', bandB, font.baslik, font.aralik);
      const adet = Math.max(2, Math.ceil(2600 / Math.max(200, uw)));
      const kopyaW = adet * uw;
      const kay = ((f * bandB * 0.02) / kopyaW) % 1;
      const gir = ilerle(f, 0, Math.round(fps * 0.5), 'kubik-hizli');
      const kopya = (ki: number) => Array.from({ length: adet }, (_, i) => (
        <span key={ki + ':' + i} style={i % 2 ? { color: rgba(R, 0.12) } : { color: 'transparent', WebkitTextStroke: `${Math.max(2, bandB / 120)}px ${rgba(palet.vurgu, 0.34)}` }}>{birim}<span style={{ color: rgba(R, 0.12), WebkitTextStroke: '0px' }}>{'  —  '}</span></span>
      ));
      arka = (
        <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, top: blokMerkez(konum, blokYuk, H), transform: `translate(${(1 - gir) * 320}px, -50%)`, opacity: gir }}>
            <div style={{ display: 'inline-flex', whiteSpace: 'pre', fontFamily: font.baslik, fontWeight: Math.max(800, font.baslikAgirlik), fontSize: bandB, lineHeight: 1, letterSpacing: font.aralik, transform: `translateX(${-kay * 50}%)` }}>
              <span style={{ whiteSpace: 'pre' }}>{kopya(0)}</span><span style={{ whiteSpace: 'pre' }}>{kopya(1)}</span>
            </div>
          </div>
        </AbsoluteFill>
      );
      govde = <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'inherit' }}>{satirlar.map((s, i) => maskeSatir(s, i, satirlar.length, Math.round(fps * 0.15)))}</div>;
      break;
    }
    case 'karma-boy-satir': {
      // galeri (gdgtify s001-s002 'FLOOR belongs to US.'): tek taban cizgisinde agir buyuk harf kavram kelimeleri ve kucuk zarif
      // serif italik baglaclar (~%38 boy, en az 40 px). Once vurgu renginde ince 'ip' cizgisi acilir, kelimeler 0,3 sn'de taban
      // maskesinden tek tek yukselip ipe oturur. Kucuk kelime: baglac listesi ya da _elle isaret_.
      const K = karma!;
      const S = karmaKucukB(B), serif = serifSec(font);
      const ipK = Math.max(3, B * 0.026), ipRenk = okunurVurgu(palet.vurgu, golge ? '#141414' : palet.zemin, R, 3);
      const n = K.reduce((a, r) => a + r.length, 0);
      const gen = (t: { w: string; k: boolean }) => (t.k ? metinGenislik(t.w, S, serif) : metinGenislik(t.w, B, fAd, aralik)) / 1.04;
      let wi = 0;
      govde = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'inherit', rowGap: B * 0.14 }}>
          {K.map((row, ri) => {
            const rw = row.reduce((a, t, i) => a + gen(t) + (i ? B * 0.22 : 0), 0);
            const ce = ilerle(f, ri * 5, Math.round(fps * 0.45), 'kubik-hizli');
            return (
              <div key={ri} style={{ display: 'flex', alignItems: 'baseline', columnGap: B * 0.22, paddingBottom: B * 0.06 }}>
                {/* bos oge: alt kenari taban cizgisinde -> ip tam tabanin altinda */}
                <div style={{ width: 0, height: 0, position: 'relative', marginRight: -B * 0.22, alignSelf: 'baseline' }}>
                  <div style={{ position: 'absolute', left: -B * 0.18, top: B * 0.035, width: rw + B * 0.36, height: ipK, background: ipRenk, transform: `scaleX(${ce})`, transformOrigin: konum.startsWith('sag') ? 'right' : 'left',
                    boxShadow: golge ? `0 2px 6px ${rgba('#000', 0.6)}` : undefined }} />
                </div>
                {row.map((t, j) => {
                  const i = wi++;
                  const g = Math.round(fps * 0.12) + kademe(i, n, tY) * 4;
                  const p = dogalIlerle(f, g, Math.round(fps * 0.3) * sapma(i, tY), 'kubik-hizli', { ton });
                  return (
                    <span key={j} style={{ display: 'inline-block', clipPath: `inset(-40% -12% 0 -12%)`, lineHeight: 1 }}>
                      <span style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(1 - p) * 105}%)`, textShadow: glg, color: t.k ? rgba(R, 0.92) : R,
                        ...(t.k ? { fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: S, letterSpacing: 0 } : { fontFamily: fAd, fontWeight: Math.max(800, font.baslikAgirlik), fontSize: B, letterSpacing: font.aralik }) }}>{t.w}</span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case 'kelime-kelime-renk-vurgu': {
      // galeri (javi-llofriu s002, jhylee95 s002-s003; 16 video): kelimeler tek tek maskeden yukselir; iki satirda ikinci satir
      // VURGU RENGINDE ayri bir kademeyle (+0,25 sn) gelir; tek satirda *isaretli* kelime ya da cumle sonu noktasi vurguda kalir.
      // Ust satir numarali kucuk etiket: '01 — ETIKET' (numara ust'teki rakamdan).
      const kaba = (font.buyukHarf ? metin.toUpperCase() : metin).split(/\s+/).filter(Boolean);
      let ic = false;
      const isaret = kaba.map((w) => { const b = w.startsWith('*'), s = /\*[.,!?;:"')]*$/.test(w); const v = ic || b; if (b) ic = true; if (s) ic = false; return v; });
      const isaretli = isaret.some(Boolean);
      const satirMod = !isaretli && satirlar.length >= 2;
      const kel = satirlar.map((s) => s.split(' ').filter(Boolean));
      const n = kel.reduce((a, r) => a + r.length, 0);
      const sonW = kel[kel.length - 1][kel[kel.length - 1].length - 1] || '';
      const nokta = !isaretli && !satirMod && /[.!?]$/.test(sonW);
      const ek2 = Math.round(fps * 0.25);
      let wi = 0;
      const uNo = (ust || '').match(/\d+/)?.[0];
      const uEt = (ust || '').replace(/\d+/g, '').replace(/^[\s#№:.\-—–]+|[\s#№:.\-—–]+$/g, '').trim();
      const up = dogalIlerle(f, 0, Math.round(fps * 0.35), 'kubik-hizli', { ton });
      const ustEl = ust ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: ustBoyut * 0.45, marginBottom: B * 0.22, opacity: up, transform: `translateY(${(1 - up) * 10}px)` }}>
          {uNo ? <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: ustBoyut, color: ustRenk, textShadow: glg }}>{uNo.padStart(2, '0')}</span> : null}
          <span style={{ display: 'inline-block', width: ustBoyut * 1.1 * up, height: Math.max(3, ustBoyut * 0.09), background: ustRenk }} />
          {uEt ? <span style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: ustBoyut, letterSpacing: 3, textTransform: 'uppercase', color: R, textShadow: glg, whiteSpace: 'nowrap' }}>{uEt}</span> : null}
        </div>
      ) : null;
      const yaslama = konum === 'orta' || konum === 'ust-orta' || konum === 'alt-ucte-bir' ? 'center' : konum.startsWith('sag') ? 'flex-end' : 'flex-start';
      govde = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'inherit' }}>
          {ustEl}
          {kel.map((row, li) => (
            <div key={li} style={{ display: 'flex', justifyContent: yaslama, columnGap: B * 0.24 - (golge ? 12 : 0) }}>
              {row.map((w, j) => {
                const i = wi++;
                const v = isaretli ? isaret[i] : satirMod ? li === kel.length - 1 : !nokta && i === n - 1;
                const g = kademe(i, n, tY) * 2.2 + (satirMod && li === kel.length - 1 ? ek2 : 0);
                const pf = (x: number) => dogalIlerle(x, g, sure * 0.55 * sapma(i, tY), hareket, { ton });
                const p = pf(f);
                const govdeW = nokta && i === n - 1 ? <>{w.slice(0, -1)}<span style={{ color: vurguYazi }}>{w.slice(-1)}</span></> : w;
                return (
                  <div key={j} style={{ overflow: 'hidden', paddingBottom: B * 0.08, padding: golge ? `0 6px ${B * 0.08}px` : undefined }}>
                    <YonBulanik dy={kayma(pf, f) * B * 1.05} style={{ ...temel, whiteSpace: 'pre', color: v ? vurguYazi : R, transform: `translateY(${(1 - p) * 105}%)` }}>{govdeW}</YonBulanik>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
      break;
    }
    case 'rgb-tek-kare-giris': {
      // galeri (nummanali s001/s004; 7 video): baslik tek bir "vurgu karesi" (~0,25 sn) icinde %105 olcek, kirmizi/camgobegi
      // kanal kaymasi (metin genisliginin ~%3'u), genis harf araligi, hafif bulaniklik ve +%25 parlaklikla gelir; sonra 3 karede
      // keskin, %100, siki aralikla oturur. RGB kaymasi ve parlaklik karesi YALNIZ enerjik tonda (galeri yasak listesi): diger
      // tonda ayni darbe kanal kaymasiz (olcek + aralik + bulaniklik) gelir.
      const vk = Math.max(4, Math.round(fps * 0.25));
      const a = f < 0 ? 0 : 1 - ilerle(f, vk, 3, 'ustel-sert');
      const rgbVar = !ton || ton === 'enerjik';
      const kay = rgbVar ? enGen * 0.015 * a * (1 + 0.25 * Math.sin(f * 2.7)) : 0;
      const nh = Math.max(1, ...satirlar.map((s) => s.length));
      const ek = Math.min(B * 0.08, Math.max(0, (maxW / 1.05 - enGen) / nh)) * a;
      const st: React.CSSProperties = { ...temel, letterSpacing: font.aralik + ek, whiteSpace: 'pre' };
      const kanal = (renkK: string, dx: number) => <div style={{ ...st, position: 'absolute', inset: 0, color: renkK, textShadow: 'none', opacity: 0.85, transform: `translateX(${dx}px)` }}>{m}</div>;
      govde = (
        <div style={{ position: 'relative', opacity: f < 0 ? 0 : 1, transform: `scale(${1 + 0.05 * a})`, filter: a > 0.01 ? `blur(${(1.6 * a).toFixed(2)}px) brightness(${1 + 0.25 * a})` : undefined }}>
          {kay > 0.5 ? kanal('#ff2d2d', -kay) : null}
          {kay > 0.5 ? kanal('#00e0ff', kay) : null}
          <div style={{ ...st, position: 'relative' }}>{m}</div>
        </div>
      );
      if (rgbVar && a > 0.01) arka = <AbsoluteFill style={{ background: rgba('#ffffff', 0.1 * a), pointerEvents: 'none' }} />;
      break;
    }
    case 'kelime-yigini-kolaj': {
      // galeri (kloss-xyz s002-s003, pankajkumar-dev s003; 7 video): farkli boy, donus ve renkte kelimeler birer vurusta ust uste
      // yigilip poster kolaji kurar; geometrik sekiller (daire, capraz bant, ucgen) aralara girer; her vurus 4 karelik kucuk bir
      // sarsinti (surekli degil). dagil verilirse yigin 5 kare sarsilip 9 karede ease-in ile dagilir. Okuma sirasi korunur.
      const K = kolaj!;
      const adim = Math.max(3, Math.round(fps * 0.17));
      const vur = (k: number) => Math.min(k, K.length) * adim;
      let sx = 0, sy = 0;
      K.forEach((_, k) => { const d = f - vur(k); if (d >= 0 && d < 4) { const g = (1 - d / 4) * B * 0.035; sx += Math.sin(d * 2.9 + k) * g; sy += Math.cos(d * 3.7 + k) * g; } });
      const dg = dagil != null ? f - dagil : -1;
      if (dg >= 0 && dg < 5) { sx += Math.sin(dg * 3.3) * B * 0.06; sy += Math.cos(dg * 4.1) * B * 0.05; }
      const dp = dg >= 5 ? cikisEgri(sinirla((dg - 5) / 9)) : 0;
      const kutuYazi = [palet.zemin, palet.murekkep, '#ffffff', '#111111'].reduce((a, c) => (/^#/.test(c) && kontrast(c, palet.vurgu) > kontrast(a, palet.vurgu) ? c : a), '#111111');
      // sekil rengi yazi rengiyle (R) karismasin: siradaki adaylardan R'ye karsi >= 2,5:1 olan ilki
      const sekilRenk = (aday: string[]) => aday.find((c) => /^#/.test(c) && /^#/.test(R) && kontrast(c, R) >= 2.5) || palet.vurgu;
      const daireR = sekilRenk([palet.vurgu2, palet.vurgu, palet.soluk]), bantR = sekilRenk([palet.vurgu, palet.vurgu2, palet.soluk]);
      const ucus = (k: string) => { const r = rastgele(tY + ':u' + k); return { x: (r() * 2 - 1) * 1300 * dp, y: (r() * 2 - 1) * 600 * dp, r: (r() * 2 - 1) * 50 * dp }; };
      const sekil = (k: number, el: (p: number) => React.ReactNode) => { const p = ilerle(f, vur(k) + 1, 4, 'ustel-sert'); return f < vur(k) + 1 ? null : el(p); };
      const u1 = ucus('s1'), u2 = ucus('s2'), u3 = ucus('s3');
      govde = (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'inherit', transform: `translate(${sx}px, ${sy}px)`, opacity: 1 - dp }}>
          {sekil(1, (p) => <div style={{ position: 'absolute', right: -B * 0.5, top: -B * 0.35, width: B * 1.6, height: B * 1.6, borderRadius: '50%', background: daireR, opacity: 0.92, zIndex: 0,
            transform: `translate(${u1.x}px, ${u1.y}px) scale(${p})` }} />)}
          {sekil(2, (p) => <div style={{ position: 'absolute', left: '-8%', right: '-8%', top: '52%', height: B * 0.22, background: bantR, zIndex: 0,
            transform: `translate(${u2.x}px, ${u2.y}px) rotate(${-7 + u2.r}deg) scaleX(${p})`, transformOrigin: 'left' }} />)}
          {sekil(3, (p) => <div style={{ position: 'absolute', left: -B * 0.75, bottom: -B * 0.1, width: B * 0.8, height: B * 0.7, background: R, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)', zIndex: 0, opacity: 0.9,
            transform: `translate(${u3.x}px, ${u3.y}px) rotate(${12 + u3.r}deg) scale(${p})` }} />)}
          {K.map((r, k) => {
            const d = f - vur(k);
            const p = ilerle(f, vur(k), 3, 'ustel-sert');
            // tur: 0 duz, 1 vurgu kutusu, 2 duz (capraz bant arkasindan gecer), 3 vurgu rengi
            const tur = k % 4, kutulu = tur === 1;
            const u = ucus('w' + k);
            return (
              <div key={k} style={{ position: 'relative', zIndex: 1, marginTop: k ? -r.s * 0.06 : 0, opacity: d < 0 ? 0 : 1,
                transform: `translate(${r.x + u.x}px, ${u.y}px) rotate(${r.rot + u.r}deg) scale(${d < 0 ? 1 : 1 + 0.3 * (1 - p)})` }}>
                <span style={{ ...temel, display: 'inline-block', fontSize: r.s, lineHeight: 0.95, fontWeight: Math.max(800, font.baslikAgirlik), whiteSpace: 'pre', maxWidth: undefined,
                  color: kutulu ? kutuYazi : tur === 3 ? vurguYazi : R, background: kutulu ? palet.vurgu : undefined, padding: kutulu ? `${r.s * 0.04}px ${r.s * 0.12}px` : 0, textShadow: kutulu ? 'none' : glg }}>{r.w}</span>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    default: { // asagidan-yay (klasik)
      const p = ilerle(f, 0, sure, 'yay-yumusak');
      govde = <div style={{ ...temel, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{m}</div>;
    }
  }
  const kutu = <div style={konumStil(konum, blokYuk, H)}>{ustSatir}{govde}</div>;
  return arka ? <>{arka}{kutu}</> : kutu;
};

/** blogun dikey merkezi (konumStil ile ayni kurallar): tam kadraj arka katmani bloga hizalar */
const blokMerkez = (k: Konum, blokYuk: number, H: number) => {
  switch (k) {
    case 'alt-ucte-bir': return Math.max(H * 0.5, Math.min(H * 0.66, H - 70 - blokYuk / 2));
    case 'sol-alt': case 'sag-alt': return H - 120 - blokYuk / 2;
    case 'sol-ust': return 110 + blokYuk / 2;
    case 'ust-orta': return 120 + blokYuk / 2;
    default: return H / 2;
  }
};

const karistirHex = (a: string, b: string, t: number) => {
  const c = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((k) => k + k).join('') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = c(a), B = c(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
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

/** ALTYAZI. Medya ustunde: acik yazi + 3,5 px koyu kontur + yumusak golge (her tipte; beyaz tisort/gokyuzunde de okunur).
 *  Kutusuz tiplerde (kutulu haric) alt konumda alttan yumusak koyu gecis (scrim) konusma suresince acilir/kapanir.
 *  Aktif kelime buyuyen tiplerde (renkli-aktif, kelime-pop) olcek en fazla 1.08 ve kelime arasi bosluk olcekle birlikte
 *  acilir: buyuyen kelime komsusunun ustune binmez. */
export const Altyazi: React.FC<{ kelimeler: Kelime[]; tip: AltyaziTip; stil: Stil; konum?: 'alt' | 'orta' | 'ust-ucte-bir'; boyut?: number; scrim?: boolean }> = ({ kelimeler, tip, stil, konum = 'alt', boyut = 64, scrim = true }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const { palet, font } = stil;
  // scrim: konusmaya uzakligi (sn) -> 0,25 sn'de yumusak acilir/kapanir (sayfa gecislerinde kirpmaz)
  const scrimAcik = scrim && tip !== 'kutulu' && konum === 'alt';
  let uzak = 9;
  if (scrimAcik) for (const w of kelimeler) { const d = t < w.bas - 0.05 ? w.bas - 0.05 - t : t > w.son + 0.3 ? t - w.son - 0.3 : 0; if (d < uzak) uzak = d; if (!d) break; }
  const scrimOp = scrimAcik ? 1 - sinirla(uzak / 0.25) : 0;
  const scrimEl = scrimOp > 0.01 ? <AbsoluteFill style={{ background: `linear-gradient(to top, ${rgba('#000', 0.62 * scrimOp)} 0%, ${rgba('#000', 0.42 * scrimOp)} 13%, ${rgba('#000', 0.14 * scrimOp)} 27%, transparent 38%)`, pointerEvents: 'none' }} /> : null;
  const n = tip === 'tek-kelime' ? 1 : tip === 'sinema' ? 9 : tip === 'kelime-pop' ? 4 : 5;
  const sayfa = sayfala(kelimeler, n, tip === 'sinema' ? 64 : 28).find((s) => t >= s[0].bas - 0.05 && t <= s[s.length - 1].son + 0.25);
  if (!sayfa) return scrimEl;
  const yer: React.CSSProperties = konum === 'orta' ? { alignItems: 'center' } : konum === 'ust-ucte-bir' ? { alignItems: 'flex-start', paddingTop: 300 } : { alignItems: 'flex-end', paddingBottom: 110 };
  const buyuk = font.buyukHarf || tip === 'tek-kelime';
  const metin = (w: string) => (buyuk ? w.toUpperCase() : w);
  const fAile = tip === 'sinema' ? font.govde : font.baslik;
  const fBoy = tip === 'tek-kelime' ? boyut * 2.2 : tip === 'sinema' ? Math.max(OKUNUR.ikincil + 8, boyut * 0.75) : boyut;
  const temel: React.CSSProperties = { fontFamily: fAile, fontWeight: tip === 'sinema' ? Math.max(600, font.govdeAgirlik) : Math.max(700, font.baslikAgirlik), fontSize: fBoy, lineHeight: 1.15 };
  // altyazi video ustunde durur: palet ne olursa olsun acik yazi + koyu kontur + golge (kutulu haric)
  const acikYazi = palet.acik ? palet.zemin : palet.murekkep;
  const golge = konturGolge(tip === 'tek-kelime' ? 4 : 3.5);
  const bosluk = boyut * (tip === 'vurgu-kalem' ? 0.22 : 0.14);

  const kelimeEl = sayfa.map((w, i) => {
    const aktif = t >= w.bas && t < w.son + 0.05;
    const gecti = t >= w.son;
    const pg = sinirla((t - w.bas) / 0.12);
    // buyuyen kelimenin tasan yarisi kadar ek bosluk (olcek 1 iken 0)
    const ekBosluk = (s: number) => Math.max(0, (s - 1) * metinGenislik(metin(w.k), fBoy, fAile) / 2);
    let st: React.CSSProperties = { display: 'inline-block', margin: `0 ${bosluk}px`, color: acikYazi, textShadow: golge, position: 'relative' };
    switch (tip) {
      case 'kelime-pop': {
        const s = t >= w.bas ? Math.min(1.08, 1 + (1 - egri('geri-sekme', pg)) * -0.4) : 0.6;
        st = { ...st, margin: `0 ${bosluk + ekBosluk(s)}px`, opacity: t >= w.bas ? 1 : 0, transform: `scale(${s})`, color: aktif ? palet.vurgu : acikYazi };
        break;
      }
      case 'vurgu-kalem':
        st = { ...st, color: aktif ? (palet.acik ? palet.murekkep : palet.zemin) : acikYazi, textShadow: aktif ? 'none' : golge, zIndex: 1 };
        break;
      case 'karaoke':
        st = { ...st, color: gecti || aktif ? palet.vurgu : acikYazi, opacity: gecti || aktif ? 1 : 0.72 };
        break;
      case 'renkli-aktif': {
        const s = aktif ? 1 + 0.08 * egri('kubik-hizli', pg) : 1;
        st = { ...st, margin: `0 ${bosluk + ekBosluk(s)}px`, color: aktif ? palet.vurgu : acikYazi, transform: aktif ? `scale(${s}) rotate(${-2 * pg}deg)` : 'none', opacity: t >= w.bas - 0.02 ? 1 : 0.45 };
        break;
      }
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
        {tip === 'karaoke' && aktif ? <span style={{ position: 'absolute', left: 0, bottom: -6, height: 6, width: `${sinirla((t - w.bas) / Math.max(0.05, w.son - w.bas)) * 100}%`, background: palet.vurgu, boxShadow: `0 0 0 2px ${rgba('#000', 0.6)}` }} /> : null}
        {metin(w.k)}
      </span>
    );
  });

  // kutulu: kutu her zeminde opak (zemin acik paletlerde koyu murekkep, koyu paletlerde koyu zemin)
  const kutu: React.CSSProperties = tip === 'kutulu'
    ? { background: palet.acik ? rgba(palet.murekkep, 0.92) : rgba(palet.zemin, 0.9), padding: '12px 28px', borderRadius: 8, color: palet.murekkep, boxShadow: `0 10px 30px ${rgba('#000', 0.35)}` }
    : {};
  return (
    <>
      {scrimEl}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', ...yer, pointerEvents: 'none' }}>
        <div style={{ ...temel, ...kutu, maxWidth: 1560, textAlign: 'center', position: 'relative', isolation: 'isolate' }}>
          {kelimeEl}
        </div>
      </AbsoluteFill>
    </>
  );
};
