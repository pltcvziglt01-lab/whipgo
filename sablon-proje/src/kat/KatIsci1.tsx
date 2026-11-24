import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Izgara } from '../Katalog';
import { Arkaplan } from '../repertuar/Arkaplan';
import { FontYukle } from '../repertuar/FontYukle';
import { DiziSahne, GecisTip, GecisliDizi } from '../repertuar/Gecis';
import { Medya } from '../repertuar/Medya';
import { Baslik } from '../repertuar/Yazi';
import { FONTLAR, PALETLER, stilYap } from '../repertuar/temel';

// Isci 1 katalogu: Opus galerisi 2. tur gecisleri (repertuar/Gecis.tsx, envanter/opus-galeri/teknikler.json).
// Her hucrede gecisin ORTASI ayni karede (ORTA = 60): `still --frame=60` hepsini ayni anda gosterir, 52-68 araligi gecisin govdesi.
// Tek hucre tam boy: --props='{"tek":N}' (N = hucre sirasi, 0'dan).
const paletAdlari = Object.keys(PALETLER).filter((p) => p !== 'gece-kirmizi');
const fontAdlari = Object.keys(FONTLAR);
const st = (i: number, ton?: string) => stilYap(paletAdlari[i % paletAdlari.length], fontAdlari[i % fontAdlari.length], undefined, 'i1-' + i, ton);
const A = { src: 'ornek/a.jpg' }, B = { src: 'ornek/b.jpg' }, C = { src: 'ornek/c.jpg' };
export const ORTA = 60;
const SON = 150;

/** iki sahneli gecis hucresi: gecisin ortasi ORTA karesine denk gelir */
const hucre = (gecis: GecisTip, kare: number, i: number, a: Partial<DiziSahne> & { el: React.ReactNode }, b: React.ReactNode, ton?: string) => {
  const s0 = ORTA + Math.round(kare / 2);
  return <GecisliDizi stil={st(i, ton)} gecis={gecis} kare={kare} sahneler={[{ sure: s0, ...a }, { el: b, sure: SON - s0 + kare + 2 }]} />;
};

/** harfe-dalis icin: 'WAITING' kelimesi, I harfi tam ortada (odak = harfin govdesi) */
const KELIME_ODAK: [number, number] = [0.5, 0.5];
const HarfSahnesi: React.FC = () => {
  const boy = 300, yari = 34, stil: React.CSSProperties = { position: 'absolute', top: 540 - boy * 0.6, font: `400 ${boy}px Anton`, lineHeight: `${boy * 1.2}px`, color: '#f2efe8', letterSpacing: 2 };
  return (
    <AbsoluteFill style={{ background: '#16161a' }}>
      <div style={{ ...stil, right: 1920 - (960 - yari), textAlign: 'right' }}>WA</div>
      <div style={{ ...stil, left: 960, transform: 'translateX(-50%)' }}>I</div>
      <div style={{ ...stil, left: 960 + yari }}>TING</div>
    </AbsoluteFill>
  );
};
/** nesneden-daire-tasmasi icin: odak noktasinda vurgu renkli dugum */
const DUGUM: [number, number] = [0.3, 0.42];
const DugumSahnesi: React.FC<{ renk: string }> = ({ renk }) => (
  <AbsoluteFill>
    <Medya m={A} />
    <div style={{ position: 'absolute', left: DUGUM[0] * 1920 - 46, top: DUGUM[1] * 1080 - 46, width: 92, height: 92, borderRadius: '50%', background: renk, boxShadow: '0 6px 20px rgba(0,0,0,.4)' }} />
  </AbsoluteFill>
);

const hucreler = (): { ad: string; el: React.ReactNode }[] => [
  { ad: 'parcacik-toplanma', el: hucre('parcacik-toplanma', 36, 12, { el: <Medya m={A} /> }, <Medya m={B} />, 'enerjik') },
  { ad: 'renk-zemin-kelime-darbesi', el: hucre('renk-zemin-kelime-darbesi', 36, 14, { el: <Medya m={A} />, kelime: 'Signal|Noise|Wins' }, <AbsoluteFill><Medya m={B} /><Baslik tip="maske-yukari" metin="The signal wins" stil={st(14)} boyut={120} golge /></AbsoluteFill>, 'enerjik') },
  { ad: 'sayfa-cevirme-golge', el: hucre('sayfa-cevirme-golge', 20, 1, { el: <Medya m={A} /> }, <Medya m={B} />) },
  { ad: 'kolaj-geri-cekilme', el: hucre('kolaj-geri-cekilme', 40, 13, { el: <Medya m={C} /> }, <AbsoluteFill><Medya m={B} /><Baslik tip="maske-yukari" metin="So far" stil={st(13)} boyut={130} golge /></AbsoluteFill>) },
  { ad: 'yirtik-kagit', el: hucre('yirtik-kagit', 24, 0, { el: <Medya m={A} /> }, <Medya m={B} />, 'ciddi') },
  { ad: 'murekkep-duman-ortusu', el: hucre('murekkep-duman-ortusu', 36, 5, { el: <Medya m={A} /> }, <Medya m={B} />, 'ciddi') },
  { ad: 'ekran-icinde-ekran', el: hucre('ekran-icinde-ekran', 40, 10, { el: <Medya m={A} /> }, <Medya m={C} />) },
  { ad: 'harfe-dalis', el: hucre('harfe-dalis', 40, 9, { el: <HarfSahnesi />, odak: KELIME_ODAK, odakRenk: '#f2efe8' }, <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={st(9)} /><Baslik tip="maske-yukari" metin="Wait." stil={st(9)} boyut={160} /></AbsoluteFill>) },
  { ad: 'egik-cift-serit', el: hucre('egik-cift-serit', 18, 3, { el: <Medya m={A} /> }, <Medya m={B} />, 'enerjik') },
  { ad: 'nesneden-daire-tasmasi', el: hucre('nesneden-daire-tasmasi', 24, 2, { el: <DugumSahnesi renk={st(2).palet.vurgu} />, odak: DUGUM }, <Medya m={B} />) },
  { ad: 'tunel', el: hucre('tunel', 40, 12, { el: <Medya m={A} /> }, <Medya m={C} />, 'enerjik') },
  { ad: 'isik-seridi-supurme', el: hucre('isik-seridi-supurme', 24, 7, { el: <Medya m={A} /> }, <Medya m={B} />) },
  { ad: 'piksel-merdiven-silme', el: hucre('piksel-merdiven-silme', 24, 8, { el: <Medya m={A} /> }, <Medya m={B} />, 'enerjik') },
];

export const KatIsci1: React.FC<{ tek?: number }> = ({ tek }) => {
  const h = hucreler();
  if (tek !== undefined && h[tek]) return <AbsoluteFill><FontYukle />{h[tek].el}</AbsoluteFill>;
  return <Izgara sutun={4} hucreler={h} />;
};
