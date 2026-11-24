import { KatIsci1 } from './kat/KatIsci1';
import { KatIsci2 } from './kat/KatIsci2';
import { KatIsci3 } from './kat/KatIsci3';
import { KatIsci4 } from './kat/KatIsci4';
import { VideoDna } from './VideoDna';
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
import { BITIS_TIPLERI, Bitis } from './repertuar/Bitis';
import { BolgeVurgu, EtiketliHarita, HARITA_TIPLERI, HaritaRota } from './repertuar/Harita';
import { CizgiGrafik, CubukYarisi, ElemeIzgara } from './repertuar/Grafik';
import { HUD_TIPLERI, Hud } from './repertuar/Hud';
import { DnaHud } from './repertuar/Dna';
import ornekDna from './ornek-dna.json';
// public/varlik = repo varlik/ klasoru (varlik_kur.py kanal ile baglanir)
import presetler from '../public/varlik/preset-dili-remotion.json';

// KANAL PROJESI SABLONU: VideoNN kompozisyonlarini buraya ekle (repertuar.md §4). Asagidakiler katalog ve onizleme.
const paletAdlari = Object.keys(PALETLER).filter((p) => p !== 'gece-kirmizi');
const fontAdlari = Object.keys(FONTLAR);
const A = { src: 'ornek/a.jpg' }, B = { src: 'ornek/b.jpg' }, C = { src: 'ornek/c.jpg' };
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
// KatYazi: guvenli alan testi — her baslik tipi medya ustunde, alt ucte bir, iki satir uzun metin (kelime karti kosulu)
const uzunBaslik = (b: string) => b === 'zemin-perspektif' ? 'The Mary Celeste: Where Did Everyone Go?' : b === 'arama-cubugu' ? 'How Much Do You Really Know About Copper Wiring' : 'Easy Answer #2\nThe Verdict Nobody Expected';
const KatYazi: React.FC = () => (
  <Izgara sutun={5} hucreler={BASLIK_TIPLERI.map((b, i) => ({ ad: `${b} · ${fontAdlari[i % fontAdlari.length]}`, el: <AbsoluteFill><Medya m={i % 2 ? A : B} /><AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.3) 50%, rgba(0,0,0,.05))' }} /><div style={{ position: 'absolute', left: 100, right: 100, top: 0, bottom: 0, outline: '3px dashed rgba(255,0,80,.8)' }} /><Baslik tip={b} metin={uzunBaslik(b)} ust="Chapter 2" stil={st(i)} boyut={120} konum="alt-ucte-bir" golge maxGenislik={1720} /></AbsoluteFill> }))} />
);
const kel = 'This one detail changed the entire war forever'.split(' ').map((k, i) => ({ k, bas: i * 0.28, son: i * 0.28 + 0.26 }));
const KatYazi2: React.FC = () => (
  <Izgara hucreler={[
    ...ALTYAZI_TIPLERI.map((a, i) => ({ ad: 'altyazi: ' + a, el: <AbsoluteFill><Medya m={A} /><Altyazi tip={a} kelimeler={kel} stil={st(i + 3)} /></AbsoluteFill> })),
    ...ALTBANT_TIPLERI.map((a, i) => ({ ad: 'altbant: ' + a, el: <AbsoluteFill><Medya m={B} /><AltBant tip={a} ust="Fort Benning" alt="Georgia, 1943" stil={st(i + 5)} /></AbsoluteFill> })),
    ...DOKU_TIPLERI.slice(0, 4).map((d, i) => ({ ad: 'doku: ' + d, el: <AbsoluteFill><Medya m={A} /><Doku tip={d} stil={st(i)} guc={1.5} /></AbsoluteFill> })),
  ]} />
);
// sayi: yuzde verilmeden (halka/cubuk yuzdesiz duzen) + halka/cubuk yuzdeli (0.72) ayrica
const KatKart: React.FC = () => (
  <Izgara sutun={5} hucreler={[
    ...SAYI_TIPLERI.map((s, i) => ({ ad: 'sayi: ' + s, el: <AbsoluteFill><Arkaplan tip={editPaket[(i + 2) % editPaket.length]} stil={st(i + 1)} /><SayiKarti tip={s} deger={1928} onEk="$" ust="Army price" alt="for the same round" stil={st(i + 1)} /></AbsoluteFill> })),
    ...(['halka', 'cubuk'] as const).map((s, i) => ({ ad: 'sayi: ' + s + ' (yuzde 0.72)', el: <AbsoluteFill><Arkaplan tip={editPaket[(i + 4) % editPaket.length]} stil={st(i + 3)} /><SayiKarti tip={s} deger={72} sonEk="%" ust="Army price" alt="of rounds delivered on time" yuzde={0.72} stil={st(i + 3)} /></AbsoluteFill> })),
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
const bitisSahne = (i: number) => (
  <AbsoluteFill>
    <Medya m={i % 2 ? B : A} kamera="ken-burns-ice" />
    <Baslik tip="maske-yukari" metin="Operation Nightfall" ust="Chapter 3" stil={st(12)} boyut={110} />
  </AbsoluteFill>
);
const KatBitis: React.FC = () => (
  <Izgara sutun={3} hucreler={[
    { ad: 'bitis: ham (yok)', el: bitisSahne(0) },
    ...BITIS_TIPLERI.map((b, i) => ({ ad: 'bitis: ' + b, el: <Bitis tip={b} stil={st(12 + i)} anlar={[40]}>{bitisSahne(i + 1)}</Bitis> })),
  ]} />
);
const rota = [{ x: 0.62, y: 0.22, ad: 'Tokyo' }, { x: 0.48, y: 0.55 }, { x: 0.4, y: 0.8, ad: 'Iwo Jima' }];
// Opus galerisi teknikleri (GOREVLER #4; repertuar/envanter/opus-galeri/teknikler.json). KatYeni'de de var; KatOpus ayni hucreleri
// 4 sutunda buyuk gosterir (gozle kontrol: hucre 480x270, --scale=4 ile tam boy).
const yaris = [
  { ad: 'United Kingdom', degerler: [1.9, 2.7, 2.2, 1.3, 1.4] }, { ad: 'Germany', degerler: [0.6, 1.3, 0.2, 0.3, 0.6] },
  { ad: 'United States', degerler: [0.4, 0.8, 1.3, 1.3, 2.9] }, { ad: 'Japan', degerler: [0.3, 0.5, 0.8, 1.1, 1.3] },
  { ad: 'France', degerler: [0.7, 0.9, 0.7, 0.6, 0.5] }, { ad: 'Italy', degerler: [0.3, 0.4, 0.4, 0.5, 0.6] },
];
const opusHucre: { ad: string; el: React.ReactNode }[] = [
  { ad: 'grafik: cubuk-trend', el: <CizgiGrafik tip="cubuk-trend" stil={st(14)} veriler={[29, 14, 32, 48, 39, 51, 76, 84]} etiketler={['2018', '19', '20', '21', '22', '23', '24', '25']} baslik="Revenue, billion $" /> },
  { ad: 'grafik: nokta-oran 19/20', el: <CizgiGrafik tip="nokta-oran-izgarasi" stil={st(0)} veriler={[19, 20]} baslik="Ships never found" /> },
  { ad: 'grafik: nokta-oran 74%', el: <CizgiGrafik tip="nokta-oran-izgarasi" stil={st(13)} veriler={[74, 100]} baslik="of rounds hit nothing" /> },
  { ad: 'grafik: cubuk-yarisi (donemli)', el: <CubukYarisi stil={st(9)} seriler={yaris} donemler={['1900', '1910', '1920', '1930', '1940']} baslik="Navy tonnage, million t" adimSn={0.7} /> },
  { ad: 'grafik: cubuk-yarisi (DnaGrafik)', el: <CizgiGrafik tip="cubuk-yarisi" stil={st(3)} veriler={[38, 61, 45, 72, 20]} etiketler={['Ford', 'Toyota', 'GM', 'Volkswagen', 'Tesla']} baslik="Cars sold, millions" /> },
  { ad: 'baslik: italik-vurgu', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={st(1)} /><Baslik tip="italik-vurgu" metin="Nobody read the *second* page" stil={st(1)} boyut={120} /></AbsoluteFill> },
  { ad: 'baslik: ustu-cizili-degisim', el: <AbsoluteFill><Arkaplan tip="kagit" stil={st(5)} /><Baslik tip="ustu-cizili-degisim" metin="The Invisible Hand | Few read his warning" ust="Everyone quotes" stil={st(5)} boyut={110} /></AbsoluteFill> },
  { ad: 'baslik: bolum-numarasi', el: <AbsoluteFill><Arkaplan tip="toz-zerre" stil={st(2)} /><Baslik tip="bolum-numarasi" metin="The Price of Silence | How one memo changed the war" ust="Chapter 3" stil={st(2)} boyut={110} konum="sol-orta" /></AbsoluteFill> },
  { ad: 'gecis: nesne-dalisi', el: <GecisliDizi stil={st(14)} gecis="nesne-dalisi" kare={26} sahneler={[{ el: <Medya m={A} />, sure: 40, odak: [0.56, 0.42] }, { el: <AbsoluteFill><Medya m={B} /><Baslik tip="maske-yukari" metin="83 Years." stil={st(14)} boyut={130} golge /></AbsoluteFill>, sure: 110 }]} /> },
  { ad: 'hud: bolum-cetveli (bolum)', el: <AbsoluteFill><Medya m={B} /><Hud tip="bolum-cetveli" stil={st(12)} deger={3} baslangic={6} etiket="The Blockade" /></AbsoluteFill> },
  { ad: 'hud: bolum-cetveli (yil)', el: <AbsoluteFill><Medya m={A} /><Hud tip="bolum-cetveli" stil={st(7)} ust="2018|2026" deger={2021} baslangic={2019} etiket="Topped off" /></AbsoluteFill> },
  { ad: 'hud: hayalet-yil', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={st(11)} /><Hud tip="hayalet-yil" stil={st(11)} ust="March 1943" /><Baslik tip="maske-yukari" metin="Operation Mincemeat" ust="Gibraltar" stil={st(11)} boyut={120} /></AbsoluteFill> },
  { ad: 'hud: belge-tarama-isigi', el: <AbsoluteFill><Medya m={A} /><Hud tip="belge-tarama-isigi" stil={st(15)} etiket="Exhibit 12" ust="Page 4" /></AbsoluteFill> },
  { ad: 'cerceve: odak-karartma (3 panel)', el: <Cerceve tip="odak-karartma" m={A} m2={B} m3={C} stil={st(13)} arkaplan="topografik" /> },
  { ad: 'cerceve: odak-karartma (tek)', el: <Cerceve tip="odak-karartma" m={B} stil={st(8)} etiket="The second rifleman" /> },
];
const KatYeni: React.FC = () => (
  <Izgara sutun={8} hucreler={[
    { ad: 'baslik: kutu-vurgu', el: <AbsoluteFill><Medya m={A} kamera="ken-burns-ice" /><AbsoluteFill style={{ background: 'rgba(0,0,0,.45)' }} /><Baslik tip="kutu-vurgu" metin="The ship that *never* came back" stil={st(12)} boyut={96} /></AbsoluteFill> },
    { ad: 'baslik: zemin-perspektif', el: <AbsoluteFill><Arkaplan tip="toz-zerre" stil={st(13)} /><Baslik tip="zemin-perspektif" metin="1 DEC 1963" stil={st(13)} boyut={150} /></AbsoluteFill> },
    { ad: 'sayi: serif-zarif', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={st(11)} /><SayiKarti tip="serif-zarif" deger={6821} ust="Americans killed" alt="in thirty-six days" stil={st(11)} /></AbsoluteFill> },
    { ad: 'sayi: el-alti-cizgi', el: <AbsoluteFill><Arkaplan tip="kagit" stil={st(1)} /><SayiKarti tip="el-alti-cizgi" deger={1185} alt="bodies in the mass grave" stil={st(1)} /></AbsoluteFill> },
    { ad: 'cerceve: altin-cerceve', el: <Cerceve tip="altin-cerceve" m={B} kamera="ken-burns-ice" stil={st(11)} etiket="Mount Suribachi, February 1945" /> },
    ...HARITA_TIPLERI.slice(0, 3).map((h, i) => ({ ad: 'harita: ' + h, el: <HaritaRota tip={h} stil={st(12 + i)} noktalar={rota} arkaplan={(['topografik', 'kagit', 'blueprint'] as const)[i]} etiket="750 mi" sure={1.5} /> })),
    { ad: 'harita: etiketli zoom', el: <EtiketliHarita stil={st(3)} zemin={A} etiketler={[{ x: 0.3, y: 0.5, ad: 'Urta-Bulak' }, { x: 0.62, y: 0.4, ad: 'Bukhara' }, { x: 0.78, y: 0.7, ad: 'Gas field' }]} kaynak="Imagery: Landsat / USGS" /> },
    { ad: 'harita: bolge vurgu', el: <BolgeVurgu stil={st(2)} arkaplan="topografik" kenar={[[0.35, 0.3], [0.55, 0.25], [0.66, 0.45], [0.58, 0.72], [0.38, 0.68], [0.3, 0.48]]} ad="France" /> },
    { ad: 'grafik: cizgi-isik', el: <CizgiGrafik tip="cizgi-isik" stil={st(12)} veriler={[12, 40, 95, 160, 120, 210]} etiketler={['1939', '40', '41', '42', '43', '44']} baslik="Allied ships sunk" /> },
    { ad: 'grafik: alan-dolgu', el: <CizgiGrafik tip="alan-dolgu" stil={st(9)} veriler={[3, 5, 4, 8, 12, 18]} baslik="Cost per round" birim="$" /> },
    { ad: 'grafik: basamak', el: <CizgiGrafik tip="basamak" stil={st(10)} veriler={[100, 100, 240, 240, 410, 600]} baslik="Depth reached" birim="m" /> },
    { ad: 'grafik: eleme-izgara', el: <ElemeIzgara stil={st(12)} asamalar={[1171, 36, 2]} etiketler={['U-boats lost', 'near New Jersey', 'candidates']} ikon="denizalti" asamaSn={1.2} /> },
    ...HUD_TIPLERI.filter((h) => !['belge-sekmesi', 'bolum-cetveli', 'hayalet-yil', 'belge-tarama-isigi'].includes(h)).map((h, i) => ({ ad: 'hud: ' + h, el: <AbsoluteFill><Medya m={i % 2 ? A : B} /><Hud tip={h} stil={st(12 + i)} deger={h === 'koordinat' ? 24.7841 : h === 'zaman-kodu' ? 1 : 2430} baslangic={h === 'koordinat' ? 141.3168 : h === 'zaman-kodu' ? 3 * 3600 : 0} birim="m" etiket={h === 'tarih-rozeti' ? 'North Atlantic' : ''} ust={h === 'tarih-rozeti' ? 'Feb 11, 1945' : ''} sure={2} /></AbsoluteFill> })),
    { ad: 'gecis: parsomen', el: <GecisliDizi stil={st(1)} gecis="parsomen" kare={24} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'baslik: el-elips', el: <AbsoluteFill><Arkaplan tip="kareli-defter" stil={st(1)} /><Baslik tip="el-elips" metin="KINZEL" ust="Operational file" stil={st(1)} boyut={130} /></AbsoluteFill> },
    { ad: 'baslik: arama-cubugu', el: <AbsoluteFill><Arkaplan tip="gradyan-akis" stil={st(9)} /><Baslik tip="arama-cubugu" metin="Copper: King of Electricity" stil={st(9)} boyut={110} /></AbsoluteFill> },
    { ad: 'hud: haber-bandi', el: <AbsoluteFill><Medya m={B} /><Hud tip="haber-bandi" stil={st(12)} etiket="LIVE" ust="ABB unveils magnet-free motor | 62.7 kW per tonne | Production starts 2027" /></AbsoluteFill> },
    { ad: 'gecis: renk-bandi', el: <GecisliDizi stil={st(4)} gecis="renk-bandi" kare={16} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'gecis: zoom-icinden', el: <GecisliDizi stil={st(5)} gecis="zoom-icinden" kare={14} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'gecis: tint-sizinti', el: <GecisliDizi stil={st(6)} gecis="tint-sizinti" kare={12} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'altbant: damga', el: <AbsoluteFill><Medya m={B} /><AltBant tip="damga" ust="Article 113" alt="UCMJ" stil={st(12)} /></AbsoluteFill> },
    { ad: 'hud: dosya-sekmesi', el: <AbsoluteFill><Arkaplan tip="blueprint" stil={st(13)} /><Hud tip="dosya-sekmesi" stil={st(13)} etiket="Sleeping on post" deger={3} baslangic={9} /></AbsoluteFill> },
    { ad: 'gecis: kareli-kagit', el: <GecisliDizi stil={st(1)} gecis="kareli-kagit" kare={24} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'gecis: supurme-inset', el: <GecisliDizi stil={st(12)} gecis="supurme-inset" kare={20} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'gecis: bulanik-hayalet', el: <GecisliDizi stil={st(11)} gecis="bulanik-hayalet" kare={14} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'sayi: uzun-golge', el: <AbsoluteFill><Medya m={A} kamera="ken-burns-ice" /><SayiKarti tip="uzun-golge" deger={142} alt="km/h in a 30 zone" stil={st(14)} /></AbsoluteFill> },
    { ad: 'sayi: kare-rozet', el: <AbsoluteFill><Medya m={B} kamera="ken-burns-ice" /><SayiKarti tip="kare-rozet" deger={67} sonEk="%" ust="EV share" alt="of new cars, 2025" stil={st(12)} /></AbsoluteFill> },
    { ad: 'harita: kavisli-etiket', el: <HaritaRota tip="kavisli-etiket" stil={st(1)} arkaplan="kagit" noktalar={[{ x: 0.18, y: 0.6 }, { x: 0.82, y: 0.52 }]} etiket="Thirteen Colonies" /> },
    { ad: 'harita: bolgeli-uydu', el: <HaritaRota tip="bolgeli-uydu" stil={st(12)} noktalar={[{ x: 0.3, y: 0.46, ad: 'Germany' }, { x: 0.5, y: 0.22 }, { x: 0.84, y: 0.16 }, { x: 0.92, y: 0.5 }, { x: 0.8, y: 0.8 }, { x: 0.56, y: 0.72 }, { x: 0.47, y: 0.45 }]} etiket="Soviet Union" /> },
    { ad: 'hud: belge-sekmesi', el: <AbsoluteFill><Medya m={A} kamera="ken-burns-ice" /><Hud tip="belge-sekmesi" stil={st(10)} etiket="Alaska Treaty" ust="Washington, 30 March 1867" /></AbsoluteFill> },
    ...opusHucre,
  ]} />
);
const KatOpus: React.FC = () => <Izgara sutun={4} hucreler={opusHucre} />;
// GOREVLER #19 #22 #25 #26 #28 #29 gozle kontrol: alt bant ust konumu (6 tip; altta kaynaga gomulu sahte yazi), altyazi ust ucte
// bir, yil-tarama (ciddi temiz kesim / enerjik glitch + geri sayim), beton-sari baslik ust satiri, tint-sizinti, video Ken Burns
// tavani (1,08) ve foto karsiligi, DnaHud bolge
const gomulu = <div style={{ position: 'absolute', left: 0, right: 0, bottom: 80, textAlign: 'center', font: '700 58px Arial', color: '#fff', textShadow: '0 0 8px #000, 0 0 2px #000' }}>GOOD MORNING.</div>;
const V = { src: 'varlik/arkaplan/ab-01.mp4', video: true };
const tonlu = (i: number, ton: string) => ({ ...st(i), ton });
const KatGorev: React.FC = () => (
  <Izgara sutun={4} hucreler={[
    ...ALTBANT_TIPLERI.map((a, i) => ({ ad: 'altbant (ust): ' + a, el: <AbsoluteFill><Medya m={i % 2 ? A : B} />{gomulu}<AltBant tip={a} ust="Appointed 29 June 2026" alt="3-year deal" stil={st(i + 5)} konum="ust" /></AbsoluteFill> })),
    { ad: 'altyazi: ust-ucte-bir (tek-kelime)', el: <AbsoluteFill><Medya m={A} />{gomulu}<Altyazi tip="tek-kelime" kelimeler={kel} stil={st(8)} konum="ust-ucte-bir" /></AbsoluteFill> },
    { ad: 'altyazi: ust-ucte-bir (karaoke)', el: <AbsoluteFill><Medya m={B} />{gomulu}<Altyazi tip="karaoke" kelimeler={kel} stil={st(9)} konum="ust-ucte-bir" /></AbsoluteFill> },
    { ad: 'zaman: yil-tarama (ciddi)', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={tonlu(11, 'ciddi')} /><ZamanCizelgesi tip="yil-tarama" adimlar={[{ yil: '1939', yazi: '' }, { yil: '1945', yazi: 'The war ends in Europe' }]} stil={tonlu(11, 'ciddi')} /></AbsoluteFill> },
    { ad: 'zaman: yil-tarama (enerjik, geri sayim)', el: <AbsoluteFill><Arkaplan tip="dalgali-izgara" stil={tonlu(6, 'enerjik')} /><ZamanCizelgesi tip="yil-tarama" adimlar={[{ yil: '2026', yazi: '' }, { yil: '2019', yazi: 'Where it all started' }]} stil={tonlu(6, 'enerjik')} /></AbsoluteFill> },
    { ad: 'baslik ust: beton-sari (arkaplanli)', el: <AbsoluteFill><Arkaplan tip="grenli-gradyan" stil={st(5)} /><Baslik tip="maske-yukari" metin="The Cheapest Rifle" ust="Chapter 2" stil={st(5)} boyut={120} /></AbsoluteFill> },
    { ad: 'gecis: tint-sizinti (synth-mor)', el: <GecisliDizi stil={st(6)} gecis="tint-sizinti" kare={12} sahneler={[{ el: <Medya m={A} />, sure: 40 }, { el: <Medya m={B} />, sure: 40 }]} /> },
    { ad: 'gecis: tint-sizinti (okyanus-mercan)', el: <GecisliDizi stil={st(8)} gecis="tint-sizinti" kare={12} sahneler={[{ el: <Medya m={B} />, sure: 40 }, { el: <Medya m={A} />, sure: 40 }]} /> },
    { ad: 'kamera: video pan-sag (<= 1,08)', el: <Medya m={V} kamera="pan-sag" /> },
    { ad: 'kamera: video dolly-egik (<= 1,08)', el: <Medya m={V} kamera="dolly-egik" /> },
    { ad: 'kamera: foto pan-sag (1,18, degismedi)', el: <Medya m={A} kamera="pan-sag" /> },
    { ad: 'DnaHud: belge-tarama-isigi bolge', el: <AbsoluteFill><Medya m={A} /><DnaHud dna={ornekDna as any} tip="belge-tarama-isigi" etiket="Exhibit 12" ust="Page 4" bolge={[0.08, 0.2, 0.5, 0.16]} /></AbsoluteFill> },
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
    {K('KatYazi', KatYazi)}{K('KatYazi2', KatYazi2)}{K('KatKart', KatKart)}{K('KatKart2', KatKart2)}{K('KatCerceve', KatCerceve)}{K('KatPreset', KatPreset, 90)}{K('KatBitis', KatBitis, 120)}{K('KatYeni', KatYeni, 120)}{K('KatOpus', KatOpus, 120)}{K('KatGorev', KatGorev, 120)}
    <Composition id="Onizleme" component={Onizleme as any} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ dna: ornekDna as any, foto: ['ornek/a.jpg', 'ornek/b.jpg', 'ornek/c.jpg'], presetler: presetler as any }}
      calculateMetadata={({ props }: any) => ({ durationInFrames: onizlemeSuresi(props) })} />
      <Composition id="VideoDna" component={VideoDna as any} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ dna: {} as any, veri: { klasor: '', fps: 30, toplam: 30, cekimler: [], kelimeler: [] } }}
      calculateMetadata={({ props }: any) => ({ durationInFrames: Math.max(30, props.veri.toplam) })} />
        <Composition id="KatIsci1" component={KatIsci1} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="KatIsci2" component={KatIsci2} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="KatIsci3" component={KatIsci3} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="KatIsci4" component={KatIsci4} durationInFrames={150} fps={30} width={1920} height={1080} />
  </>
);
