import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FontYukle } from './FontYukle';
import { Dna, DnaAlinti, DnaAltBant, DnaAltyazi, DnaBaslik, DnaDizi, DnaDoku, DnaListe, DnaMedya, DnaSayi, DnaZaman } from './Dna';
import { diziSuresi, gecisPlani } from './Gecis';
import { DnaVurgu, DnaGiris } from './Dna';
import { PresetVeri } from './Preset';

// DNA onizlemesi: ayni icerik, farkli DNA -> farkli edit dili. Kullaniciya A/B secimi icin ~14 sn.
// props: { dna: Dna, foto: [string, string, string?], metin?: {...} }
export type OnizlemeProps = { dna: Dna; foto: string[]; baslik?: string; bolum?: string; presetler?: PresetVeri[] };
const S = 54; // sahne suresi (kare)

const sahneler = (p: OnizlemeProps) => {
  const { dna } = p;
  const A = { src: p.foto[0] }, B = { src: p.foto[1] || p.foto[0] }, C = { src: p.foto[2] || p.foto[0] };
  const kel = 'Nobody expected this to work but it changed everything'.split(' ').map((k, i) => ({ k, bas: i * 0.27, son: i * 0.27 + 0.25 }));
  return [
    { sure: S, el: <DnaBaslik dna={dna} metin={p.baslik || 'The Cheapest Rifle'} ust={p.bolum || 'Chapter 1'} /> },
    { sure: S, el: <AbsoluteFill><DnaMedya dna={dna} m={A} m2={B} m3={C} sira={0} zorla={dna.cerceve[0]} etiket="archive_1944.jpg" /><DnaAltBant dna={dna} ust="Fort Benning" alt="Georgia, 1943" medyaUstu={dna.cerceve[0] === 'tam' || dna.cerceve[0] === 'letterbox'} /></AbsoluteFill> },
    { sure: S, el: <DnaGiris dna={dna} presetler={p.presetler}><DnaSayi dna={dna} deger={1928} onEk="$" ust="Army price" alt="for the very same round" yuzde={0.74} /></DnaGiris> },
    { sure: S + 12, el: <AbsoluteFill><DnaVurgu dna={dna} presetler={p.presetler} gec={18}><DnaMedya dna={dna} m={B} sira={1} zorla="tam" /></DnaVurgu><DnaAltyazi dna={dna} kelimeler={kel} /></AbsoluteFill> },
    { sure: S, el: <DnaAlinti dna={dna} metin="We had no idea what was coming." kim="Pvt. J. Miller, 1944" /> },
    { sure: S, el: <DnaMedya dna={dna} m={C} m2={A} m3={B} sira={2} zorla={dna.cerceve[1] || dna.cerceve[0]} etiket="report.pdf" /> },
    { sure: S, el: <DnaListe dna={dna} baslik="What you get" maddeler={['Same caliber', 'Half the weight', 'No waiting list']} /> },
    { sure: S + 10, el: <DnaZaman dna={dna} adimlar={[{ yil: '1939', yazi: 'Prototype' }, { yil: '1942', yazi: 'Mass production' }, { yil: '1945', yazi: 'Retired' }]} /> },
  ];
};

export const onizlemeSuresi = (p: OnizlemeProps) => {
  const s = sahneler(p);
  return diziSuresi(s, gecisPlani(s.length - 1, p.dna.gecis, p.dna.tohum, 1), p.dna.iskelet.gecis_kare);
};

export const Onizleme: React.FC<OnizlemeProps> = (p) => (
  <AbsoluteFill>
    <FontYukle />
    {/* onizlemede her sinirda gecis gosterilir (yumusakOran 1); gercek videoda iskeletin orani kullanilir */}
    <DnaDizi dna={p.dna} sahneler={sahneler(p)} yumusakOran={1} />
    <DnaDoku dna={p.dna} />
  </AbsoluteFill>
);
