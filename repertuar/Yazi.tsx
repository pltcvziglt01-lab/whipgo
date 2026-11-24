import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { GUVENLI, OKUNUR, Stil, dogalIlerle, egri, ilerle, kademe, kayma, konturGolge, mesafeSure, metinGenislik, okunurVurgu, rastgele, rgba, sapma, satirBol, siganBoyut, sinirla, yay, yazYerlesim } from './temel';
import { YonBulanik } from './Hareket';

// BASLIK GIRISLERI — klasik Claude = 'asagidan-yay' (opacity + 30px yukari, yumusak yay). Repertuar onu yalniz rakip
// ayni seyi yapmiyorsa ve en fazla 1 eksen olarak kullanir.
export const BASLIK_TIPLERI = [
  'maske-yukari', 'harf-dalga', 'bulaniklik', 'scramble', 'daktilo', 'kutu-acilis', 'dikey-yigin',
  'harf-aralik', 'kontur-dolma', 'olcek-darbe', 'uzun-golge', 'alt-cizgi', 'kutu-vurgu', 'zemin-perspektif', 'asagidan-yay', 'el-elips', 'arama-cubugu',
  // Opus galerisi (envanter/opus-galeri/teknikler.json): italik-vurgu (22 video), ustu-cizili-degisim (10), bolum-numarasi (7)
  'italik-vurgu', 'ustu-cizili-degisim', 'bolum-numarasi',
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

/** BASLIK. metin icindeki '\n' acik satir sonudur (ornek: kelime karti a + '\n' + b). Yerlesim (yazYerlesim): satirlar
 *  guvenli alana (<= GUVENLI.genislik, maxGenislik) sigacak kadar kuculur, en az 'enaz' (90) px; daha da sigmazsa kelime
 *  sinirindan bolunur. '\n' yoksa ve tek satir sigmiyorsa once boyut korunarak satira bolunur (iki satir 120 px, tek satir 90 px'ten
 *  daha guclu okunur). Tipin kendi genislik payi (kutu dolgusu, perspektif olcegi, elips) hesaba katilir; hicbir tip oturmus
 *  halde guvenli alandan tasmaz. golge: medya ustunde koyu kontur + yumusak golge (acik zeminde de okunur). */
export const Baslik: React.FC<{ metin: string; ust?: string; tip: BaslikTip; stil: Stil; konum?: Konum; boyut?: number; gec?: number; renk?: string; maxGenislik?: number; golge?: boolean; enaz?: number }> = ({
  metin, ust, tip, stil, konum = 'orta', boyut = 120, gec = 0, renk, maxGenislik = 1500, golge = false, enaz = 90,
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
  const carpan = tip === 'zemin-perspektif' ? 1.15 : tip === 'italik-vurgu' ? 1.06 : 1;
  const dolgu = tip === 'kutu-acilis' ? 0.6 : tip === 'el-elips' ? 0.95 : tip === 'kutu-vurgu' ? 0.3 : 0;
  const etkinW = Math.max(300, maxW / carpan - dolgu * boyut);
  const bolum = tip === 'bolum-numarasi' ? bolumAyir(ham, ust) : null;
  const temiz = tip === 'kutu-vurgu' || tip === 'italik-vurgu' ? ham.replace(/\*/g, '') : bolum ? bolum.baslik : ham;
  let satirlar: string[], B: number;
  // ustu-cizili-degisim: eski ve yeni ifade ayri bloklar; ikisi de ayni boyutta (kucuk olana inilir) guvenli alana sigar
  let eskiS: string[] = [], yeniS: string[] = [];
  if (tip === 'ustu-cizili-degisim') {
    const { eski, yeni } = degisimAyir(temiz);
    const parca = [eski, yeni].filter(Boolean);
    B = Math.min(...parca.map((x) => yazYerlesim(x, boyut, fAd, etkinW, enaz, aralik).boyut));
    const yer = (x: string) => (x ? yazYerlesim(x, B, fAd, etkinW, enaz, aralik).satirlar : []);
    eskiS = yer(eski); yeniS = yer(yeni);
    satirlar = [...eskiS, ...yeniS];
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
  const blokYuk = (tip === 'dikey-yigin' ? (satirlar.length + 0.25) * B * 0.95 : satirlar.length * B * 1.1) + (ust && tip !== 'bolum-numarasi' ? B * 0.5 : 0) + (tip === 'el-elips' ? B * 0.7 : 0)
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
  const ustSatir = ust && tip !== 'bolum-numarasi' ? (
    <div style={{ fontFamily: font.govde, fontWeight: Math.max(700, font.govdeAgirlik), fontSize: ustBoyut, letterSpacing: 3, color: ustRenk, textTransform: 'uppercase', marginBottom: B * 0.22, opacity: yay(f / 12), textShadow: glg }}>{ust}</div>
  ) : null;
  const sure = Math.round(fps * 0.7);
  /** karakter karakter cizilen tiplerde satir sonu */
  const kr = (c: string, i: number, el: (c: string) => React.ReactNode) => (c === '\n' ? <br key={i} /> : el(c));
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
    default: { // asagidan-yay (klasik)
      const p = ilerle(f, 0, sure, 'yay-yumusak');
      govde = <div style={{ ...temel, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{m}</div>;
    }
  }
  return <div style={konumStil(konum, blokYuk, H)}>{ustSatir}{govde}</div>;
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
