import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { Izgara } from './Katalog';
import { ARKAPLAN_TIPLERI, Arkaplan } from './repertuar/Arkaplan';
import { GECIS_TIPLERI, GecisliDizi } from './repertuar/Gecis';
import { ALTYAZI_TIPLERI, Altyazi, BASLIK_TIPLERI, Baslik } from './repertuar/Yazi';
import { ALINTI_TIPLERI, ALTBANT_TIPLERI, Alinti, AltBant, Karsilastirma, LISTE_TIPLERI, Liste, SAYI_TIPLERI, SayiKarti, ZAMAN_TIPLERI, ZamanCizelgesi } from './repertuar/Kart';
import { CERCEVE_TIPLERI, Cerceve, DOKU_TIPLERI, Doku, KAMERA_TIPLERI, Medya } from './repertuar/Medya';
import { FONTLAR, PALETLER, stilYap } from './repertuar/temel';
import { Onizleme, onizlemeSuresi } from './repertuar/Onizleme';
import { PresetHareket } from './repertuar/Preset';
import ornekDna from './ornek-dna.json';
// public/varlik = repo varlik/ klasoru (varlik_kur.py kanal ile baglanir)
import presetler from '../public/varlik/preset-dili-remotion.json';

// KANAL PROJESI SABLONU: VideoNN kompozisyonlarini buraya ekle (repertuar.md §4). Asagidakiler katalog ve onizleme.
const paletAdlari = Object.keys(PALETLER).filter((p) => p !== 'gece-kirmizi');
const fontAdlari = Object.keys(FONTLAR);
const A = { src: 'ornek/a.jpg' }, B = { src: 'ornek/b.jpg' };
const st = (i: number) => stilYap(paletAdlari[i % paletAdlari.length], fontAdlari[i % fontAdlari.length], undefined, 't' + i);
const kodlu = ARKAPLAN_TIPLERI.filter((t) => !t.startsWith('video:'));
const genel = kodlu.slice(0, 16);
const editPaket = kodlu.slice(16);

const KatArkaplan: React.FC = () => <Izgara hucreler={genel.map((t, i) => ({ ad: `${t} · ${paletAdlari[i % paletAdlari.length]}`, el: <Arkaplan tip={t} stil={st(i)} /> }))} />;
const KatEdit: React.FC = () => <Izgara hucreler={editPaket.map((t, i) => ({ ad: t, el: <Arkaplan tip={t} stil={st(i + 4)} /> }))} />;
const KatGecis: React.FC = () => (
  <Izgara hucreler={GECIS_TIPLERI.map((g, i) => ({ ad: g, el: <GecisliDizi stil={st(i)} gecis={g} kare={16} sahneler={[{ el: <Medya m={A} />, sure: 30 }, { el: <Medya m={B} />, sure: 30 }]} /> }))} />
);
const KatBaslik: React.FC = () => (
  <Izgara hucreler={BASLIK_TIPLERI.map((b, i) => ({ ad: `${b} · ${fontAdlari[i % fontAdlari.length]}`, el: <AbsoluteFill><Arkaplan tip={editPaket[i % editPaket.length]} stil={st(i)} /><Baslik tip={b} metin="The Cheapest Rifle" ust="Chapter 2" stil={st(i)} boyut={130} /></AbsoluteFill> }))} />
);
const kel = 'This one detail changed the entire war forever'.split(' ').map((k, i) => ({ k, bas: i * 0.28, son: i * 0.28 + 0.26 }));
const KatYazi2: React.FC = () => (
  <Izgara hucreler={[
    ...ALTYAZI_TIPLERI.map((a, i) => ({ ad: 'altyazi: ' + a, el: <AbsoluteFill><Medya m={A} /><Altyazi tip={a} kelimeler={kel} stil={st(i + 3)} /></AbsoluteFill> })),
    ...ALTBANT_TIPLERI.map((a, i) => ({ ad: 'altbant: ' + a, el: <AbsoluteFill><Medya m={B} /><AltBant tip={a} ust="Fort Benning" alt="Georgia, 1943" stil={st(i + 5)} /></AbsoluteFill> })),
    ...DOKU_TIPLERI.slice(0, 4).map((d, i) => ({ ad: 'doku: ' + d, el: <AbsoluteFill><Medya m={A} /><Doku tip={d} stil={st(i)} guc={1.5} /></AbsoluteFill> })),
  ]} />
);
const KatKart: React.FC = () => (
  <Izgara hucreler={[
    ...SAYI_TIPLERI.map((s, i) => ({ ad: 'sayi: ' + s, el: <AbsoluteFill><Arkaplan tip={editPaket[(i + 2) % editPaket.length]} stil={st(i + 1)} /><SayiKarti tip={s} deger={1928} onEk="$" ust="Army price" alt="for the same round" yuzde={0.72} stil={st(i + 1)} /></AbsoluteFill> })),
    ...ALINTI_TIPLERI.map((a, i) => ({ ad: 'alinti: ' + a, el: <AbsoluteFill><Arkaplan tip={genel[(i * 3) % 16]} stil={st(i + 6)} /><Alinti tip={a} metin="We had no idea what was coming." kim="Pvt. J. Miller, 1944" stil={st(i + 6)} /></AbsoluteFill> })),
    ...LISTE_TIPLERI.map((l, i) => ({ ad: 'liste: ' + l, el: <AbsoluteFill><Arkaplan tip="kareli-defter" stil={st(i + 2)} /><Liste tip={l} baslik="What you get" maddeler={['Same caliber', 'Half the weight', 'No waiting list']} stil={st(i + 2)} /></AbsoluteFill> })),
  ]} />
);
const KatKart2: React.FC = () => (
  <Izgara sutun={3} hucreler={[
    { ad: 'karsilastirma', el: <AbsoluteFill><Arkaplan tip="kayan-izgara" stil={st(9)} /><Karsilastirma sol={{ ad: 'Budget', deger: 380 }} sag={{ ad: 'Army', deger: 1928 }} birim="$" stil={st(9)} /></AbsoluteFill> },
    ...ZAMAN_TIPLERI.map((z, i) => ({ ad: 'zaman: ' + z, el: <AbsoluteFill><Arkaplan tip={['dalgali-izgara', 'topografik', 'grenli-gradyan', 'radar-halka'][i % 4]} stil={st(i + 7)} /><ZamanCizelgesi tip={z} adimlar={[{ yil: '1939', yazi: 'Prototype' }, { yil: '1942', yazi: 'Mass production' }, { yil: '1945', yazi: 'Retired' }]} stil={st(i + 7)} /></AbsoluteFill> })),
  ]} />
);
const KatCerceve: React.FC = () => (
  <Izgara hucreler={[
    ...CERCEVE_TIPLERI.map((c, i) => ({ ad: 'cerceve: ' + c, el: <Cerceve tip={c} m={A} m2={B} kamera="ken-burns-ice" stil={st(i)} arkaplan={editPaket[i % editPaket.length]} etiket="archive_1944.jpg" /> })),
    ...KAMERA_TIPLERI.slice(5, 10).map((k) => ({ ad: 'kamera: ' + k, el: <Medya m={B} kamera={k} /> })),
  ]} />
);
const KatPreset: React.FC = () => {
  const sec = ['zoom', 'sarsinti', 'kayma', 'gecis', 'yazi', 'zoom', 'sarsinti', 'kayma', 'gecis'].map((s, i) => (presetler as any[]).filter((p) => p.sinif === s)[i]).filter(Boolean);
  return <Izgara sutun={3} hucreler={sec.map((p: any, i) => ({ ad: p.id, el: <AbsoluteFill style={{ background: '#111' }}><PresetHareket preset={p} dongu gec={6}><Medya m={i % 2 ? B : A} /></PresetHareket></AbsoluteFill> }))} />;
};

const K = (id: string, c: React.FC, d = 300) => <Composition id={id} component={c} durationInFrames={d} fps={30} width={1920} height={1080} />;
export const RemotionRoot: React.FC = () => (
  <>
    {K('KatArkaplan', KatArkaplan)}{K('KatEdit', KatEdit)}{K('KatGecis', KatGecis, 60)}{K('KatBaslik', KatBaslik)}
    {K('KatYazi2', KatYazi2)}{K('KatKart', KatKart)}{K('KatKart2', KatKart2)}{K('KatCerceve', KatCerceve)}{K('KatPreset', KatPreset, 90)}
    <Composition id="Onizleme" component={Onizleme as any} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ dna: ornekDna as any, foto: ['ornek/a.jpg', 'ornek/b.jpg', 'ornek/c.jpg'], presetler: presetler as any }}
      calculateMetadata={({ props }: any) => ({ durationInFrames: onizlemeSuresi(props) })} />
  </>
);
