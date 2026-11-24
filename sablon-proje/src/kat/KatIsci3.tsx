import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Izgara } from '../Katalog';
import { Arkaplan } from '../repertuar/Arkaplan';
import { Alinti, AltBant, Liste, SayiKarti, ZamanCizelgesi } from '../repertuar/Kart';
import { Medya } from '../repertuar/Medya';
import { stilYap } from '../repertuar/temel';

// Isci 3 katalogu (Opus galerisi teknikleri: sayi / zaman / alinti / liste / altbant). Root.tsx'te 'KatIsci3' olarak kayitli.
// Props: sutun (varsayilan 4; 5 -> hucre ~384 px = telefon genisligi kontrolu), tek (yalniz o hucre, tam boy 1920x1080).
const B = { src: 'ornek/b.jpg' };
const s = (p: string, f: string, t: string, ton?: string) => stilYap(p, f, undefined, t, ton);

const hucreler: { ad: string; el: React.ReactNode }[] = [
  { ad: 'sayi: ters-zemin-sayilar', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={s('grafit-neon', 'teknik-dar', 'i3a')} /><SayiKarti tip="ters-zemin-sayilar" deger={48} sonEk="%" ust="Market share" alt="of global EV sales in 2025" stil={s('grafit-neon', 'teknik-dar', 'i3a')} /></AbsoluteFill> },
  { ad: 'sayi: yanan-belge-sayac', el: <AbsoluteFill><Arkaplan tip="toz-zerre" stil={s('orman-altin', 'klasik-serif', 'i3b')} /><SayiKarti tip="yanan-belge-sayac" deger={97} sonEk="%" ust="1913 – 2026" alt="of the dollar's value, gone" stil={s('orman-altin', 'klasik-serif', 'i3b')} /></AbsoluteFill> },
  { ad: 'sayi: esik-renkli-halka', el: <AbsoluteFill><Arkaplan tip="radar-halka" stil={s('gece-turkuaz', 'sport-teko', 'i3c')} /><SayiKarti tip="esik-renkli-halka" deger={140} ust="km/h" alt="Past the legal limit" stil={s('gece-turkuaz', 'sport-teko', 'i3c')} /></AbsoluteFill> },
  { ad: 'sayi: hizlanan-sayac', el: <AbsoluteFill><Arkaplan tip="nokta-matris" stil={s('buz-kobalt', 'geometrik-kalin', 'i3d')} /><SayiKarti tip="hizlanan-sayac" deger={1000000} onEk="$" ust="Monthly revenue" alt="in just 18 months" stil={s('buz-kobalt', 'geometrik-kalin', 'i3d')} /></AbsoluteFill> },
  { ad: 'zaman: geri-sarma-ozet', el: <ZamanCizelgesi tip="geri-sarma-ozet" stil={s('bordo-krem', 'poster-dar', 'i3e')} adimlar={[
    { yil: '1914', yazi: 'The war begins' }, { yil: '1916', yazi: 'Verdun' }, { yil: '1917', yazi: 'America joins' }, { yil: '1918', yazi: 'Armistice signed' }, { yil: '1919', yazi: 'Versailles' }]} /> },
  { ad: 'zaman: akan-serit', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={s('okyanus-mercan', 'grotesk-modern', 'i3f')} /><ZamanCizelgesi tip="akan-serit" stil={s('okyanus-mercan', 'grotesk-modern', 'i3f')} adimlar={[
    { yil: '2018', yazi: 'GPT-1' }, { yil: '2019', yazi: 'GPT-2' }, { yil: '2020', yazi: 'GPT-3' }, { yil: '2022', yazi: 'ChatGPT' }, { yil: '2023', yazi: 'GPT-4' }, { yil: '2024', yazi: 'Claude 3.5 Sonnet' }, { yil: '2025', yazi: 'Reasoning models' }, { yil: '2026', yazi: 'Autonomous agents' }]} /></AbsoluteFill> },
  { ad: 'zaman: iki-kulvar-zaman', el: <AbsoluteFill><Arkaplan tip="kagit" stil={s('nane-krem', 'editoryal-serif', 'i3g')} /><ZamanCizelgesi tip="iki-kulvar-zaman" stil={s('nane-krem', 'editoryal-serif', 'i3g')} adimlar={[
    { yil: '1945', yazi: 'Labour wins landslide' }, { yil: '1951', yazi: 'Churchill returns' }, { yil: '1964', yazi: 'Wilson elected' }, { yil: '1970', yazi: 'Heath surprise' }, { yil: '1974', yazi: 'Wilson again' }, { yil: '1979', yazi: 'Thatcher era' }, { yil: '1997', yazi: 'New Labour' }, { yil: '2010', yazi: 'Coalition' }]} /></AbsoluteFill> },
  { ad: 'zaman: hizli-montaj', el: <ZamanCizelgesi tip="hizli-montaj" stil={s('kahve-turuncu', 'damga-stencil', 'i3h', 'enerjik')} adimlar={[
    { yil: 'V8', yazi: '5.0 litre' }, { yil: '0–60', yazi: '3.4 seconds' }, { yil: '641', yazi: 'horsepower' }, { yil: '1:1', yazi: 'power to weight' }, { yil: '#1', yazi: 'at the Ring' }, { yil: '$89K', yazi: 'starting price' }]} /> },
  { ad: 'alinti: sansur-bandi', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={s('zeytin-askeri', 'damga-stencil', 'i3i', 'gizem')} /><Alinti tip="sansur-bandi" kim="Case file 77-B" stil={s('zeytin-askeri', 'damga-stencil', 'i3i', 'gizem')}
    metin="Subject was last seen at [Willow Pier] on the night of [June 14]. Witness recalls a grey sedan idling near the [boathouse]. Cause of death: [pending]." /></AbsoluteFill> },
  { ad: 'alinti: terminal-daktilo', el: <AbsoluteFill><Arkaplan tip="nokta-matris" stil={s('kahve-turuncu', 'teknik-dar', 'i3j')} /><Alinti tip="terminal-daktilo" kim="Who sent the signal?" metin="Origin traced to a relay in Novosibirsk. Last ping 03:12 UTC." stil={s('kahve-turuncu', 'teknik-dar', 'i3j')} /></AbsoluteFill> },
  { ad: 'liste: surec-zinciri', el: <AbsoluteFill><Arkaplan tip="blueprint" stil={s('derin-deniz', 'geometrik-kalin', 'i3k')} /><Liste tip="surec-zinciri" baslik="How desalination works" maddeler={['Intake', 'Filtering', 'Reverse osmosis', 'Remineralize', 'Distribution']} stil={s('derin-deniz', 'geometrik-kalin', 'i3k')} /></AbsoluteFill> },
  { ad: 'liste: defter-listesi', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={s('orman-altin', 'gazete', 'i3l')} /><Liste tip="defter-listesi" baslik="Costliest storms" maddeler={['Katrina | $201B', 'Harvey | $160B', 'Maria | $115B', 'Ian | $119B', 'Sandy | $88B', 'Ida | $84B', 'Irma | $64B', 'Andrew | $60B']} stil={s('orman-altin', 'gazete', 'i3l')} /></AbsoluteFill> },
  { ad: 'altbant: kisi-karti', el: <AbsoluteFill><Medya m={B} kamera="ken-burns-ice" /><AltBant tip="kisi-karti" ust="Marie Curie" alt="Physicist | 1867 – 1934 | Two Nobel Prizes, in two sciences" stil={s('zeytin-askeri', 'klasik-serif', 'i3m')} /></AbsoluteFill> },
];

export const KatIsci3: React.FC<{ sutun?: number; tek?: number }> = ({ sutun = 4, tek }) =>
  tek != null ? <Izgara sutun={1} hucreler={[hucreler[tek]]} /> : <Izgara sutun={sutun} hucreler={hucreler} />;
