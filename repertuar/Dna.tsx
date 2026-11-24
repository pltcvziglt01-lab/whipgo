import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { DiziSahne, GecisTip, GecisliDizi } from './Gecis';
import { Alinti, AlintiTip, AltBant, AltBantTip, Liste, ListeTip, SayiKarti, SayiTip, ZamanCizelgesi, ZamanTip } from './Kart';
import { Cerceve, CerceveTip, Doku, DokuTip, KameraTip, Medya, MedyaKaynak } from './Medya';
import { HareketAd, Stil, rastgele, stilYap } from './temel';
import { PresetHareket, PresetVeri } from './Preset';
import { Bitis, BitisTip } from './Bitis';
import { BolgeVurgu, EtiketliHarita, HaritaNokta, HaritaRota, HaritaTip } from './Harita';
import { CizgiGrafik, ElemeIzgara, GrafikTip } from './Grafik';
import { Hud, HudTip } from './Hud';
import { Altyazi, AltyaziTip, BaslikTip, Baslik, Kelime, Konum } from './Yazi';
import { SfxKatmani, SfxOlay, SfxTon, sfxPlani } from './Sfx';

// stil-dna.json (stil_dna.py ciktisi) -> bilesenler. Video kodu yalniz bunlari kullanir; boylece her video/kanal
// kendi DNA'siyla bambaska gorunur ve "klasik Claude" gorunumune geri dusmez.
export type Dna = {
  palet: string; font: string; hareket: HareketAd; arkaplan: ArkaplanTip[]; gecis: GecisTip[]; kamera: KameraTip[]; cerceve: CerceveTip[];
  baslik: BaslikTip; altyazi: AltyaziTip | 'yok'; altbant: AltBantTip; sayi: SayiTip; alinti: AlintiTip; liste: ListeTip; zaman: ZamanTip; doku: DokuTip[];
  iskelet: { fps: number; gecis_kare: number; yumusak_oran: number; cerceveli_oran: number; ilk30_medyan_sn?: number; genel_medyan_sn?: number; sfx_orani?: number };
  tohum: string;
  /** ogrenilmis Premiere presetleri (id): vurgu = anahtar kelimede zoom/sarsinti, kayma = oge girisi */
  vurgu?: string[]; kayma?: string;
  /** post-produksiyon katmani (Bitis.tsx): grade + kamera nefesi + isik; yoksa ham */
  bitis?: BitisTip;
  /** veri/harita/HUD dili (Harita.tsx, Grafik.tsx, Hud.tsx) */
  harita?: HaritaTip; grafik?: GrafikTip; hud?: HudTip;
  /** konudan gelen ton (stil_dna.py) — SFX paletini ve yogunlugunu belirler */
  ton?: string;
  /** ikinci baslik girisi: ardisik kartlar donusumlu (yoksa hep baslik) */
  baslik2?: BaslikTip;
};
// ton Stil'e gecer: ciddi/gizem tonda dogal yay asimsiz (temel.ts ASIMSIZ_TON)
export const dnaStil = (d: Dna): Stil => stilYap(d.palet, d.font, d.hareket, d.tohum, d.ton);

/** arka plan rolleri: 0 = kart/sayi/liste zemini, 1 = cerceveli medyanin arkasi, 2 = bolum basligi */
/** zemin perdesi (okunurluk korumasi): yazi tasiyan rollerde (0 kart, 2 bolum basligi) hareketli zeminin ortasi palet zeminine
 *  dogru sakinlesir, kenarlar canli kalir. Paletin yazi rengi (murekkep) zemine zit secildigi icin kontrast her palette korunur.
 *  Paket videosu zemininde perde daha guclu. Rol 1 (cerceveli medyanin arkasi) perdesiz. */
export const DnaArkaplan: React.FC<{ dna: Dna; rol?: 0 | 1 | 2 }> = ({ dna, rol = 0 }) => {
  const tip = dna.arkaplan[rol % dna.arkaplan.length];
  const st = dnaStil(dna);
  const video = typeof tip === 'string' && tip.startsWith('video:');
  const orta = rol === 1 ? 0 : video ? 0.78 : 0.62, kenar = rol === 1 ? 0 : video ? 0.45 : 0.25;
  return (
    <AbsoluteFill>
      <Arkaplan tip={tip} stil={st} />
      {orta > 0 ? <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 62% at 50% 50%, ${rgbaHex(st.palet.zemin, orta)} 0%, ${rgbaHex(st.palet.zemin, (orta + kenar) / 2)} 55%, ${rgbaHex(st.palet.zemin, kenar)} 100%)` }} /> : null}
    </AbsoluteFill>
  );
};
const rgbaHex = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** kamera plani: DNA'nin kamera hareketleri DONGUSUZ dagitilir (eskiden sira % n -> A-B-C-A-B-C mekanik tekrar).
 *  Kural: ayni hareket art arda yok; bir onceki-oncekine donus %35; hiz her cekimde 0,75-1,3 arasi. Deterministik (tohum). */
const kameraOnbellek = new Map<string, { tip: KameraTip; hiz: number }[]>();
export const kameraSec = (dna: Dna, sira: number) => {
  const anahtar = dna.tohum + '|' + dna.kamera.join(',');
  let p = kameraOnbellek.get(anahtar);
  if (!p) { p = []; kameraOnbellek.set(anahtar, p); }
  const K = dna.kamera.length ? dna.kamera : (['ken-burns-ice'] as KameraTip[]);
  while (p.length <= sira) {
    const i = p.length, r = rastgele(anahtar + 'km' + i);
    let aday = K.filter((k) => k !== p[i - 1]?.tip);
    if (!aday.length) aday = [...K];
    if (aday.length > 1 && p[i - 2] && r() > 0.35) aday = aday.filter((k) => k !== p[i - 2].tip).length ? aday.filter((k) => k !== p[i - 2].tip) : aday;
    p.push({ tip: aday[Math.floor(r() * aday.length)], hiz: 0.75 + r() * 0.55 });
  }
  return p[sira];
};

/** medya sahnesi: sira numarasina gore tam ekran / cerceveli karar verir (cerceveli_oran kadar), kamerayi dongusuz secer */
export const DnaMedya: React.FC<{ dna: Dna; m: MedyaKaynak; m2?: MedyaKaynak; m3?: MedyaKaynak; sira: number; etiket?: string; zorla?: CerceveTip }> = ({ dna, m, m2, m3, sira, etiket, zorla }) => {
  const r = rastgele(dna.tohum + 'md' + sira);
  const cerceveli = zorla ? zorla !== 'tam' : r() < dna.iskelet.cerceveli_oran;
  const { tip: kamera, hiz } = kameraSec(dna, sira);
  const tip: CerceveTip = zorla || (cerceveli ? dna.cerceve[Math.floor(r() * dna.cerceve.length)] : 'tam');
  return <Cerceve tip={tip} m={m} m2={m2} m3={m3} kamera={kamera} hiz={hiz} stil={dnaStil(dna)} arkaplan={dna.arkaplan[1 % dna.arkaplan.length]} etiket={etiket} tohum={dna.tohum + sira} />;
};

/** arkaplanli=false (medya ustu): baslik koyu konturlu + golgeli cizilir ve guvenli alanin tamamini (1720 px) kullanabilir */
export const DnaBaslik: React.FC<{ dna: Dna; metin: string; ust?: string; konum?: Konum; boyut?: number; arkaplanli?: boolean; sira?: number }> = ({ dna, metin, ust, konum, boyut, arkaplanli = true, sira = 0 }) => (
  <AbsoluteFill>{arkaplanli ? <DnaArkaplan dna={dna} rol={2} /> : null}<Baslik tip={sira % 2 && dna.baslik2 ? dna.baslik2 : dna.baslik} metin={metin} ust={ust} stil={dnaStil(dna)} konum={konum} boyut={boyut}
    golge={!arkaplanli} maxGenislik={arkaplanli ? undefined : 1720} /></AbsoluteFill>
);
/** SFX katmani: kurgu olaylarindan (gecis/kart/sayi/alinti/vurgu/altbant) otomatik ses efekti. Tum Dna videolarinda ZORUNLU. */
export const DnaSfx: React.FC<{ dna: Dna; olaylar: SfxOlay[]; klasor?: string; genelSes?: number }> = ({ dna, olaylar, klasor, genelSes }) => {
  const ton = (['ciddi', 'gizem', 'enerjik', 'sakin'].includes(dna.ton || '') ? dna.ton : 'ciddi') as SfxTon;
  const plan = React.useMemo(() => sfxPlani(olaylar, ton, dna.tohum, dna.iskelet.fps || 30, dna.iskelet.sfx_orani ?? 0.5), [olaylar, ton, dna.tohum]);
  return <SfxKatmani plan={plan} klasor={klasor} genelSes={genelSes} />;
};
export const DnaAltyazi: React.FC<{ dna: Dna; kelimeler: Kelime[] }> = ({ dna, kelimeler }) => (dna.altyazi === 'yok' ? null : <Altyazi tip={dna.altyazi} kelimeler={kelimeler} stil={dnaStil(dna)} />);
export const DnaAltBant: React.FC<{ dna: Dna; ust: string; alt?: string; medyaUstu?: boolean }> = ({ dna, ...p }) => <AltBant tip={dna.altbant} stil={dnaStil(dna)} {...p} />;
/** sayi karti. kaynak verilirse zemin O CEKIMIN goruntusudur (bulanik + koyulastirilmis/palet tonuna yikanmis, karta ters yonde
 *  yavas kayar -> parallax): her sayi karti kendi sahnesinin rengini tasir, ayni sablon tekrar etmez. kaynak yoksa DNA arka plani. */
export const DnaSayi: React.FC<{ dna: Dna; deger: number; onEk?: string; sonEk?: string; ust?: string; alt?: string; yuzde?: number; kaynak?: MedyaKaynak }> = ({ dna, kaynak, ...p }) => (
  <AbsoluteFill>{kaynak ? <SayiZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={0} />}<SayiKarti tip={dna.sayi} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
const SayiZemin: React.FC<{ dna: Dna; m: MedyaKaynak }> = ({ dna, m }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet } = dnaStil(dna);
  const t = f / fps;
  // koyu palet: goruntu koyulasir (acik yazi okunur); acik palet: palet zeminine yikanir (koyu yazi okunur)
  const filtre = palet.acik ? 'blur(24px) saturate(0.9) brightness(1.08)' : 'blur(24px) saturate(1.2) brightness(0.66)';
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: palet.zemin }}>
      <AbsoluteFill style={{ transform: `scale(${(1.24 - 0.01 * t).toFixed(4)}) translateX(${(-0.5 * t).toFixed(3)}%)`, filter: filtre }}><Medya m={m} /></AbsoluteFill>
      <AbsoluteFill style={{ background: rgbaHex(palet.zemin, palet.acik ? 0.66 : 0.3) }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, ${rgbaHex(palet.acik ? palet.zemin : '#000000', 0.55)} 100%)` }} />
    </AbsoluteFill>
  );
};
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

/** tum videoyu sarar: <DnaBitis dna={dna} anlar={[bolum basi kareleri]}> ...DnaDizi, DnaDoku, DnaAltyazi... </DnaBitis> */
export const DnaBitis: React.FC<{ dna: Dna; anlar?: number[]; children: React.ReactNode }> = ({ dna, anlar, children }) => (
  <Bitis tip={dna.bitis} stil={dnaStil(dna)} anlar={anlar}>{children}</Bitis>
);

// ---- harita / grafik / HUD (zemin: CC harita gorseli; yoksa DNA'nin 3. arka plani) ----
export const DnaHarita: React.FC<{ dna: Dna; noktalar: HaritaNokta[]; zemin?: MedyaKaynak; etiket?: string; sure?: number }> = ({ dna, ...p }) => (
  <HaritaRota tip={dna.harita || 'isik-rota'} stil={dnaStil(dna)} arkaplan={dna.arkaplan[2 % dna.arkaplan.length]} {...p} />
);
export const DnaEtiketliHarita: React.FC<{ dna: Dna; etiketler: HaritaNokta[]; zemin?: MedyaKaynak; kaynak?: string }> = ({ dna, ...p }) => (
  <EtiketliHarita stil={dnaStil(dna)} arkaplan={dna.arkaplan[2 % dna.arkaplan.length]} {...p} />
);
export const DnaBolge: React.FC<{ dna: Dna; kenar: [number, number][]; ad?: string; zemin?: MedyaKaynak }> = ({ dna, ...p }) => (
  <BolgeVurgu stil={dnaStil(dna)} arkaplan={dna.arkaplan[2 % dna.arkaplan.length]} {...p} />
);
export const DnaGrafik: React.FC<{ dna: Dna; veriler: number[]; etiketler?: string[]; baslik?: string; birim?: string }> = ({ dna, ...p }) => (
  <CizgiGrafik tip={dna.grafik && dna.grafik !== 'eleme-izgara' ? dna.grafik : 'cizgi-isik'} stil={dnaStil(dna)} {...p} />
);
export const DnaEleme: React.FC<{ dna: Dna; asamalar: number[]; etiketler?: string[]; ikon?: 'denizalti' | 'kisi' | 'nokta' }> = ({ dna, ...p }) => <ElemeIzgara stil={dnaStil(dna)} {...p} />;
/** medya ustune binen HUD; tip verilmezse DNA'nin hud ekseni */
export const DnaHud: React.FC<{ dna: Dna; tip?: HudTip; deger?: number; baslangic?: number; birim?: string; etiket?: string; ust?: string; sure?: number }> = ({ dna, tip, ...p }) => (
  <Hud tip={tip || dna.hud || 'tarih-rozeti'} stil={dnaStil(dna)} {...p} />
);
