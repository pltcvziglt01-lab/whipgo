import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FontYukle } from './FontYukle';
import { Dna, DnaAlinti, DnaAltBant, DnaAltyazi, DnaBaslik, DnaBitis, DnaDizi, DnaDoku, DnaEleme, DnaGrafik, DnaHarita, DnaHud, DnaListe, DnaMedya, DnaSayi, DnaZaman } from './Dna';
import { diziSuresi, gecisPlani } from './Gecis';
import { DnaVurgu, DnaGiris } from './Dna';
import { PresetVeri } from './Preset';

// DNA / KANAL SABLONU onizlemesi: ayni icerik, farkli DNA -> farkli edit dili. Kanal kimliginin tum eksenleri gorunur
// (baslik x2, alt bant, sayi, altyazi, alinti, liste, zaman, HUD, harita, grafik). Sahneler ESIT sureli (S):
// sahne i'nin oturmus karesi = i * (S - gecis_kare) + OTURMA  (kanal_sablon.py onizleme karelerini bununla secer).
// props: { dna, foto: [a, b, c], metin?: { baslik, bolum, ... } } — metin konseptten gelir (kanal_sablon), yoksa notr ornek.
/** grafik: konseptin verisi (verilirse her grafik tipinde bu cizilir; nokta-oran-izgarasi icin [pay, payda], eleme-izgara icin
 *  asamalar). Verilmezse tipe uygun notr ornek (grafikOrnek). */
export type OnizlemeGrafik = { veriler: number[]; etiketler?: string[]; baslik?: string; birim?: string };
export type OnizlemeMetin = { baslik?: string; bolum?: string; baslik2?: string; yer?: string; tarih?: string; sayi?: number; sayiUst?: string; sayiAlt?: string;
  alinti?: string; kim?: string; liste?: string[]; listeBaslik?: string; altyazi?: string; grafik?: OnizlemeGrafik;
  /** dil/konu ornekleri (kanal_sablon --dil / --ornek): ikinci bolum etiketi, grafik basligi, zaman adimlari (yil-tarama: ilk + son) */
  bolum2?: string; grafikBaslik?: string; zaman?: { yil: string; yazi: string }[];
  /** grafik tipine ozel ornek veri (or. cubuk-yarisi: konunun kategorileri); `grafik`ten once bakilir */
  grafikler?: Record<string, OnizlemeGrafik> };
export type OnizlemeProps = { dna: Dna; foto: string[]; baslik?: string; bolum?: string; presetler?: PresetVeri[]; metin?: OnizlemeMetin };
export const ONIZLEME_S = 60;      // sahne suresi (kare)
export const ONIZLEME_OTURMA = 40; // sahne girisinden kac kare sonra her sey yerine oturmus olur
const S = ONIZLEME_S;

/** grafik tipine uygun notr ornek veri: tek seri trend (cizgi/alan/basamak), donemli cubuklar (cubuk-trend), oran [pay, payda]
 *  (nokta-oran-izgarasi), kategori siralamasi (cubuk-yarisi), eleme asamalari (eleme-izgara) */
export const grafikOrnek = (tip: string | undefined, m: OnizlemeMetin): OnizlemeGrafik => {
  if (tip && m.grafikler?.[tip]) return m.grafikler[tip];
  if (m.grafik) return m.grafik;
  switch (tip) {
    case 'nokta-oran-izgarasi': return { veriler: [19, 20], baslik: m.grafikBaslik || 'Never recovered' };
    case 'cubuk-trend': return { veriler: [29, 14, 32, 48, 39, 51, 76, 84], etiketler: ['2018', '19', '20', '21', '22', '23', '24', '25'], baslik: m.sayiUst || 'Yearly total' };
    case 'cubuk-yarisi': return { veriler: [38, 61, 45, 72, 20], etiketler: ['North', 'South', 'East', 'West', 'Central'], baslik: 'Share by region', birim: '%' };
    case 'eleme-izgara': return { veriler: [1171, 36, 2], etiketler: ['candidates', 'after the first cut', 'left standing'] };
    default: return { veriler: [12, 30, 26, 58, 74, 120], etiketler: ['1', '2', '3', '4', '5', '6'], baslik: m.grafikBaslik || m.sayiUst || 'Trend' };
  }
};
/** onizleme sahnesi 2 sn (S): grafik ONIZLEME_OTURMA'da (40. kare) bitmis olmali. Cizgi tipleri 1,1 sn'de cizilir; kademeli
 *  cubuk tipleri (toplam ~2,2-2,5 sn) ileriden baslar (negatif gec): giriste cubuklar zaten buyumekte, 40. karede trend/siralama tam */
const GRAFIK_ZAMAN: Record<string, { gec: number; sure?: number }> = {
  'cizgi-isik': { gec: 0, sure: 1.1 }, 'alan-dolgu': { gec: 0, sure: 1.1 }, basamak: { gec: 0, sure: 1.1 },
  'nokta-oran-izgarasi': { gec: -3 }, 'cubuk-trend': { gec: -30 }, 'cubuk-yarisi': { gec: -32 },
};
/** zaman ornegi: yil-tarama tek durakli montajdir (2 sn'lik onizleme sahnesinde 3 adim: 0,5 + 0,25 + hedef; ONIZLEME_OTURMA'da
 *  hedef yil ve yazisi oturmus olur); digerleri uc duraklik cizelge */
const zamanOrnek = (tip: string, m: OnizlemeMetin) => {
  const z = m.zaman && m.zaman.length >= 2 ? m.zaman : null;
  if (tip === 'yil-tarama') return z ? [{ yil: z[z.length - 2].yil, yazi: '' }, z[z.length - 1]] : [{ yil: '1943', yazi: '' }, { yil: '1945', yazi: 'The end of the war' }];
  return z || [{ yil: '1939', yazi: 'Start' }, { yil: '1942', yazi: 'Turning point' }, { yil: '1945', yazi: 'End' }];
};

const sahneler = (p: OnizlemeProps) => {
  const { dna } = p;
  const m: OnizlemeMetin = { baslik: p.baslik, bolum: p.bolum, ...(p.metin || {}) };
  const A = { src: p.foto[0] }, B = { src: p.foto[1] || p.foto[0] }, C = { src: p.foto[2] || p.foto[0] };
  const kel = (m.altyazi || 'Nobody expected this to change everything').split(' ').map((k, i) => ({ k, bas: i * 0.24, son: i * 0.24 + 0.22 }));
  return [
    { sure: S, el: <DnaBaslik dna={dna} metin={m.baslik || 'The Story Nobody Told'} ust={m.bolum || 'Chapter 1'} sira={0} /> },
    { sure: S, el: <AbsoluteFill><DnaMedya dna={dna} m={A} m2={B} m3={C} sira={0} zorla={dna.cerceve[0]} etiket="archive.jpg" /><DnaAltBant dna={dna} ust={m.yer || 'Location'} alt={m.tarih || 'Date'} medyaUstu={dna.cerceve[0] === 'tam' || dna.cerceve[0] === 'letterbox'} /></AbsoluteFill> },
    { sure: S, el: <DnaGiris dna={dna} presetler={p.presetler}><DnaSayi dna={dna} deger={m.sayi ?? 1928} ust={m.sayiUst || 'Key figure'} alt={m.sayiAlt || 'the number behind the story'} yuzde={0.74} /></DnaGiris> },
    { sure: S, el: <AbsoluteFill><DnaVurgu dna={dna} presetler={p.presetler} gec={18}><DnaMedya dna={dna} m={B} sira={1} zorla="tam" /></DnaVurgu><DnaAltyazi dna={dna} kelimeler={kel} /></AbsoluteFill> },
    { sure: S, el: <DnaAlinti dna={dna} metin={m.alinti || 'It was never supposed to happen.'} kim={m.kim || 'Eyewitness'} /> },
    { sure: S, el: <AbsoluteFill><DnaMedya dna={dna} m={C} sira={2} zorla="tam" />{dna.hud ? <DnaHud dna={dna} tip={dna.hud} etiket={m.yer || 'Location'} ust={m.tarih || 'Date'} deger={dna.hud === 'derinlik-cetvel' ? 420 : 3} baslangic={dna.hud === 'derinlik-cetvel' ? 0 : 9} birim="m" sure={1.2} /> : null}</AbsoluteFill> },
    { sure: S, el: <DnaBaslik dna={dna} metin={m.baslik2 || 'What Really Happened'} ust={m.bolum2 || (m.bolum ? 'Part 2' : 'Chapter 2')} sira={1} /> },
    { sure: S, el: <DnaHarita dna={dna} noktalar={[{ x: 0.28, y: 0.62, ad: 'A' }, { x: 0.5, y: 0.4 }, { x: 0.72, y: 0.3, ad: 'B' }]} etiket="420 km" sure={0.9} /> },
    { sure: S, el: dna.grafik === 'eleme-izgara'
      ? <DnaEleme dna={dna} asamalar={grafikOrnek(dna.grafik, m).veriler} etiketler={grafikOrnek(dna.grafik, m).etiketler} asamaSn={0.6} />
      : <DnaGrafik dna={dna} {...grafikOrnek(dna.grafik, m)} {...(GRAFIK_ZAMAN[dna.grafik || 'cizgi-isik'] || {})} /> },
    { sure: S, el: <DnaListe dna={dna} baslik={m.listeBaslik || 'Three reasons'} maddeler={m.liste || ['The first warning', 'The second mistake', 'The final decision']} /> },
    { sure: S, el: <DnaZaman dna={dna} adimlar={zamanOrnek(dna.zaman, m)} /> },
  ];
};

export const onizlemeSuresi = (p: OnizlemeProps) => {
  const s = sahneler(p);
  return diziSuresi(s, gecisPlani(s.length - 1, p.dna.gecis, p.dna.tohum, 1), p.dna.iskelet.gecis_kare);
};

export const Onizleme: React.FC<OnizlemeProps> = (p) => (
  <AbsoluteFill>
    <FontYukle />
    <DnaBitis dna={p.dna} anlar={[Math.round(onizlemeSuresi(p) * 0.45)]}>
      {/* onizlemede her sinirda gecis gosterilir (yumusakOran 1); gercek videoda iskeletin orani kullanilir */}
      <DnaDizi dna={p.dna} sahneler={sahneler(p)} yumusakOran={1} />
      <DnaDoku dna={p.dna} />
    </DnaBitis>
  </AbsoluteFill>
);
