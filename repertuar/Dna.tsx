import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { DiziSahne, GecisTip, GecisliDizi } from './Gecis';
import { Alinti, AlintiTip, AltBant, AltBantTip, Liste, ListeTip, SayiKarti, SayiTip, ZamanCizelgesi, ZamanTip } from './Kart';
import { Cerceve, CerceveTip, Doku, DokuTip, KameraTip, Medya, MedyaKaynak } from './Medya';
import { HareketAd, Stil, rastgele, stilYap } from './temel';
import { PresetHareket, PresetVeri } from './Preset';
import { Altyazi, AltyaziTip, BaslikTip, Baslik, Kelime, Konum } from './Yazi';

// stil-dna.json (stil_dna.py ciktisi) -> bilesenler. Video kodu yalniz bunlari kullanir; boylece her video/kanal
// kendi DNA'siyla bambaska gorunur ve "klasik Claude" gorunumune geri dusmez.
export type Dna = {
  palet: string; font: string; hareket: HareketAd; arkaplan: ArkaplanTip[]; gecis: GecisTip[]; kamera: KameraTip[]; cerceve: CerceveTip[];
  baslik: BaslikTip; altyazi: AltyaziTip | 'yok'; altbant: AltBantTip; sayi: SayiTip; alinti: AlintiTip; liste: ListeTip; zaman: ZamanTip; doku: DokuTip[];
  iskelet: { fps: number; gecis_kare: number; yumusak_oran: number; cerceveli_oran: number; ilk30_medyan_sn?: number; genel_medyan_sn?: number; sfx_orani?: number };
  tohum: string;
  /** ogrenilmis Premiere presetleri (id): vurgu = anahtar kelimede zoom/sarsinti, kayma = oge girisi */
  vurgu?: string[]; kayma?: string;
};
export const dnaStil = (d: Dna): Stil => stilYap(d.palet, d.font, d.hareket, d.tohum);

/** arka plan rolleri: 0 = kart/sayi/liste zemini, 1 = cerceveli medyanin arkasi, 2 = bolum basligi */
export const DnaArkaplan: React.FC<{ dna: Dna; rol?: 0 | 1 | 2 }> = ({ dna, rol = 0 }) => <Arkaplan tip={dna.arkaplan[rol % dna.arkaplan.length]} stil={dnaStil(dna)} />;

/** medya sahnesi: sira numarasina gore tam ekran / cerceveli karar verir (cerceveli_oran kadar), kamerayi dondurur */
export const DnaMedya: React.FC<{ dna: Dna; m: MedyaKaynak; m2?: MedyaKaynak; m3?: MedyaKaynak; sira: number; etiket?: string; zorla?: CerceveTip }> = ({ dna, m, m2, m3, sira, etiket, zorla }) => {
  const r = rastgele(dna.tohum + 'md' + sira);
  const cerceveli = zorla ? zorla !== 'tam' : r() < dna.iskelet.cerceveli_oran;
  const kamera = dna.kamera[sira % dna.kamera.length];
  const tip: CerceveTip = zorla || (cerceveli ? dna.cerceve[Math.floor(r() * dna.cerceve.length)] : 'tam');
  return <Cerceve tip={tip} m={m} m2={m2} m3={m3} kamera={kamera} stil={dnaStil(dna)} arkaplan={dna.arkaplan[1 % dna.arkaplan.length]} etiket={etiket} tohum={dna.tohum + sira} />;
};

export const DnaBaslik: React.FC<{ dna: Dna; metin: string; ust?: string; konum?: Konum; boyut?: number; arkaplanli?: boolean }> = ({ dna, metin, ust, konum, boyut, arkaplanli = true }) => (
  <AbsoluteFill>{arkaplanli ? <DnaArkaplan dna={dna} rol={2} /> : null}<Baslik tip={dna.baslik} metin={metin} ust={ust} stil={dnaStil(dna)} konum={konum} boyut={boyut} /></AbsoluteFill>
);
export const DnaAltyazi: React.FC<{ dna: Dna; kelimeler: Kelime[] }> = ({ dna, kelimeler }) => (dna.altyazi === 'yok' ? null : <Altyazi tip={dna.altyazi} kelimeler={kelimeler} stil={dnaStil(dna)} />);
export const DnaAltBant: React.FC<{ dna: Dna; ust: string; alt?: string; medyaUstu?: boolean }> = ({ dna, ...p }) => <AltBant tip={dna.altbant} stil={dnaStil(dna)} {...p} />;
export const DnaSayi: React.FC<{ dna: Dna; deger: number; onEk?: string; sonEk?: string; ust?: string; alt?: string; yuzde?: number }> = ({ dna, ...p }) => (
  <AbsoluteFill><DnaArkaplan dna={dna} rol={0} /><SayiKarti tip={dna.sayi} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
export const DnaAlinti: React.FC<{ dna: Dna; metin: string; kim?: string }> = ({ dna, ...p }) => (
  <AbsoluteFill><DnaArkaplan dna={dna} rol={1} /><Alinti tip={dna.alinti} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
export const DnaListe: React.FC<{ dna: Dna; baslik?: string; maddeler: string[] }> = ({ dna, ...p }) => (
  <AbsoluteFill><DnaArkaplan dna={dna} rol={0} /><Liste tip={dna.liste} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
export const DnaZaman: React.FC<{ dna: Dna; adimlar: { yil: string; yazi: string }[] }> = ({ dna, adimlar }) => (
  <AbsoluteFill><DnaArkaplan dna={dna} rol={2} /><ZamanCizelgesi tip={dna.zaman} adimlar={adimlar} stil={dnaStil(dna)} /></AbsoluteFill>
);
/** tum videonun ustune: DNA'nin dokulari (0-2 adet) */
/** vurgu: presetler = varlik/preset-dili-remotion.json (video kodunda import edilir). sira ile DNA'nin vurgu listesi doner */
export const presetBul = (liste: PresetVeri[] | undefined, id?: string) => (liste && id ? liste.find((p: any) => p.id === id) : undefined);
export const DnaVurgu: React.FC<{ dna: Dna; presetler?: PresetVeri[]; sira?: number; gec?: number; children: React.ReactNode }> = ({ dna, presetler, sira = 0, gec = 0, children }) => {
  const p = presetBul(presetler, dna.vurgu?.[sira % Math.max(1, dna.vurgu?.length || 1)]);
  return p ? <PresetHareket preset={p} gec={gec}>{children}</PresetHareket> : <>{children}</>;
};
export const DnaGiris: React.FC<{ dna: Dna; presetler?: PresetVeri[]; gec?: number; children: React.ReactNode }> = ({ dna, presetler, gec = 0, children }) => {
  const p = presetBul(presetler, dna.kayma);
  return p ? <PresetHareket preset={p} gec={gec}>{children}</PresetHareket> : <>{children}</>;
};
export const DnaDoku: React.FC<{ dna: Dna }> = ({ dna }) => <>{dna.doku.map((d) => <Doku key={d} tip={d} stil={dnaStil(dna)} />)}</>;
/** sahne dizisi: gecis tipleri DNA'dan, sure ve siklik iskeletten (rakibin olculmus degerleri) */
export const DnaDizi: React.FC<{ dna: Dna; sahneler: DiziSahne[]; yumusakOran?: number }> = ({ dna, sahneler, yumusakOran }) => (
  <GecisliDizi sahneler={sahneler} gecis={dna.gecis} kare={dna.iskelet.gecis_kare} yumusakOran={yumusakOran ?? dna.iskelet.yumusak_oran} stil={dnaStil(dna)} tohum={dna.tohum} zemin={<DnaArkaplan dna={dna} rol={1} />} />
);
