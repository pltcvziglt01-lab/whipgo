import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { DiziSahne, GecisTip, GecisliDizi } from './Gecis';
import { Alinti, AlintiTip, AltBant, AltBantKonum, AltBantTip, Karsilastirma, Liste, ListeTip, SayiKarti, SayiTip, ZamanCizelgesi, ZamanTip } from './Kart';
import { Cerceve, CerceveTip, Doku, DokuTip, KameraTip, Medya, MedyaKaynak } from './Medya';
import { HareketAd, Stil, rastgele, stilYap } from './temel';
import { PresetHareket, PresetVeri } from './Preset';
import { Bitis, BitisTip } from './Bitis';
import { BolgeVurgu, EtiketliHarita, HaritaNokta, HaritaRota, HaritaTip } from './Harita';
import { CizgiGrafik, ElemeIzgara, GrafikTip } from './Grafik';
import { CubukYarisi, YarisSeri } from './Grafik';
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
  /** tur ici ikinci varyantlar (stil_dna.py): ayni turden ardisik kartlar donusumlu kullanir (dnaVaryant). Yoksa hep ilk varyant. */
  sayi2?: SayiTip; alinti2?: AlintiTip; liste2?: ListeTip; zaman2?: ZamanTip; grafik2?: GrafikTip;
};
/** tur ici varyant ekseni -> ikinci varyant alani. VideoDna her turun kacinci kart oldugunu (sira) sayar; tek siradaki kart
 *  ikinci varyanti alir (baslik/baslik2 gibi). kurgu_denetim.py ayni kurali taklit eder (VARYANT_EKSEN). */
export const VARYANT_EKSEN = ['sayi', 'alinti', 'liste', 'zaman', 'grafik'] as const;
export type VaryantEksen = typeof VARYANT_EKSEN[number];
export const dnaVaryant = (d: Dna, eksen: VaryantEksen, sira: number): Dna => {
  const v2 = (d as any)[eksen + '2'];
  return sira % 2 && v2 && v2 !== (d as any)[eksen] ? ({ ...d, [eksen]: v2 } as Dna) : d;
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

/** cerceve plani: cekim cerceveli mi — eskisi gibi rastgele(tohum + 'md' + sira)() < cerceveli_oran (kurgu_denetim cerceve_olc
 *  ayni orani olcer). Cerceveli cekimin TIPI artik zar degil, kotali dagitim (v04: film-seridi 49 cercevenin 32'si = %65 idi):
 *  - yakin tekrar yok: son CERCEVE_YAKIN cekim icinde kullanilan tip (DNA'da baska tip varsa) secilmez — ayni cerceve art arda
 *    gelmez; hepsi yakinda kullanildiysa en uzun suredir kullanilmayan;
 *  - denge: yalniz en az kullanilan tipin en fazla 1 fazlasi kadar kullanilmis tipler aday (tek tipin payi pratikte <= %55,
 *    CERCEVE_PAY = %60 tavan); adaylar arasinda eksigi buyuk olan agirlikli, tohumlu secilir (mekanik A-B-A-B'ye kilitlenmez).
 *  Deterministik (tohum); VideoDna nesne-dalisi odagi icin de bunu kullanir. */
export const CERCEVE_PAY = 0.6;
export const CERCEVE_YAKIN = 8;
const cerceveOnbellek = new Map<string, CerceveTip[]>();
export const cerceveSec = (dna: Dna, sira: number): CerceveTip => {
  const anahtar = dna.tohum + '|' + (dna.cerceve || []).join(',') + '|' + dna.iskelet.cerceveli_oran;
  let p = cerceveOnbellek.get(anahtar);
  if (!p) { p = []; cerceveOnbellek.set(anahtar, p); }
  const K = Array.from(new Set(dna.cerceve || [])).filter((t) => t !== 'tam') as CerceveTip[];
  const say: Record<string, number> = {};
  p.forEach((t) => { if (t !== 'tam') say[t] = (say[t] || 0) + 1; });
  while (p.length <= sira) {
    const i = p.length, r = rastgele(dna.tohum + 'md' + i);
    if (!K.length || r() >= dna.iskelet.cerceveli_oran) { p.push('tam'); continue; }
    const yakin = new Set(p.slice(Math.max(0, i - CERCEVE_YAKIN)).filter((t) => t !== 'tam'));
    const enaz = Math.min(...K.map((t) => say[t] || 0));
    let aday = K.filter((t) => !yakin.has(t) && (say[t] || 0) <= enaz + 1);
    if (!aday.length) {
      // hepsi yakinda kullanildi: dengede kalanlardan en uzun suredir kullanilmayan (onceki cekimle ayni olamaz)
      const sonKullanim = (t: CerceveTip) => p!.lastIndexOf(t);
      const denge = K.filter((t) => (say[t] || 0) <= enaz + 1 && p![i - 1] !== t);
      const havuz = denge.length ? denge : K.filter((t) => p![i - 1] !== t).length ? K.filter((t) => p![i - 1] !== t) : K;
      const eski = Math.min(...havuz.map(sonKullanim));
      aday = havuz.filter((t) => sonKullanim(t) === eski);
    }
    const w = aday.map((t) => enaz + 2 - (say[t] || 0));
    let u = r() * w.reduce((a, b) => a + b, 0), t = aday[aday.length - 1];
    for (let k = 0; k < aday.length; k++) { u -= w[k]; if (u < 0) { t = aday[k]; break; } }
    say[t] = (say[t] || 0) + 1;
    p.push(t);
  }
  return p[sira];
};

/** medya sahnesi: sira numarasina gore tam ekran / cerceveli karar verir (cerceveSec), kamerayi dongusuz secer.
 *  odak: odak-karartma penceresi [x, y, gen, yuk] (0..1; verilmezse ortadaki dikey pencere) */
/** bolum muamelesi (VideoDna): ofset = ayni cerceve blogunun basindan beri gecen kare (giris tekrar oynamaz), tempo = kamera hiz
 *  carpani, arkaplanRol = cerceveli medyanin arkasindaki DNA zemini, imza = bu cekimde imza efekt (zoom-darbe kamera) serbest.
 *  zoom-darbe (imza) imza noktasi disinda ken-burns-ice'e duser (efekt butcesi). */
export const DnaMedya: React.FC<{ dna: Dna; m: MedyaKaynak; m2?: MedyaKaynak; m3?: MedyaKaynak; sira: number; etiket?: string; zorla?: CerceveTip; odak?: [number, number, number, number];
  ofset?: number; tempo?: number; arkaplanRol?: number; imza?: boolean }> = ({ dna, m, m2, m3, sira, etiket, zorla, odak, ofset, tempo = 1, arkaplanRol = 1, imza = true }) => {
  const s = kameraSec(dna, sira);
  const kamera: KameraTip = s.tip === 'zoom-darbe' && !imza ? 'ken-burns-ice' : s.tip;
  const tip: CerceveTip = zorla || cerceveSec(dna, sira);
  return <Cerceve tip={tip} m={m} m2={m2} m3={m3} kamera={kamera} hiz={s.hiz * tempo} stil={dnaStil(dna)} arkaplan={dna.arkaplan[arkaplanRol % dna.arkaplan.length]} etiket={etiket} tohum={dna.tohum + sira} odak={odak} ofset={ofset} />;
};

/** EFEKT BUTCESI (video basina): imza efektler anlama baglanir (bolum acilisi, doruk, sayi aciklamasi), duzgun aralikli rastgele
 *  dagilmaz. enCok: video basina en cok giris; dakikada: dakika basina tavan (yukari yuvarlanir); araSn: iki kullanim arasi en az.
 *  Uygulayan: sahne_zengin.py (plan: vurus, cerceve bloklari, letterbox bolumu) + VideoDna gecisPlaniVideo (imza gecisler).
 *  Denetleyen: kurgu_denetim.py 'efekt butcesi' (asim = FAIL). */
export const EFEKT_BUTCE = {
  letterbox: { enCok: 2, araSn: 120 },
  cerceveGiris: { dakikada: 1.5, araSn: 12 },
  vurus: { dakikada: 1.5, araSn: 12 },
  imzaGecis: { dakikada: 1, araSn: 25 },
  zoomDarbe: { dakikada: 1, araSn: 25 },
};
/** imza gecisler (gorunur 'efekt'; butceye tabi). filmburn:* (gercek film yanigi) de imzadir. */
export const IMZA_GECIS = ['isik-patlamasi', 'film-yanigi', 'glitch-rgb', 'zoom-darbe', 'nesne-dalisi', 'tv-kapanma', 'tunel', 'harfe-dalis',
  'renk-zemin-kelime-darbesi', 'piksel-merdiven-silme', 'parcacik-toplanma', 'isik-seridi-supurme'];
export const imzaGecisMi = (t: string) => t.startsWith('filmburn') || IMZA_GECIS.includes(t);
/** iki yumusak gecis arasi en az (sn): kisa cekim dizisinde araya sert kesim girer (v4: 124 gecisin 23'u < 1,5 sn arayla) */
export const YUMUSAK_ARA_SN = 2;

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
/** konum 'ust-ucte-bir': kaynak goruntunun alt ucte birinde gomulu yazi olan cekimlerde (VideoDna etiket_ust) altyazi yukari alinir */
export const DnaAltyazi: React.FC<{ dna: Dna; kelimeler: Kelime[]; konum?: 'alt' | 'orta' | 'ust-ucte-bir' }> = ({ dna, kelimeler, konum }) => (dna.altyazi === 'yok' ? null : <Altyazi tip={dna.altyazi} kelimeler={kelimeler} stil={dnaStil(dna)} konum={konum} />);
/** konum 'ust': alt bant ust kosede (kaynak goruntunun alt ucte birinde gomulu yazi varsa; VideoDna etiket_ust) */
export const DnaAltBant: React.FC<{ dna: Dna; ust: string; alt?: string; medyaUstu?: boolean; konum?: AltBantKonum }> = ({ dna, ...p }) => <AltBant tip={dna.altbant} stil={dnaStil(dna)} {...p} />;
/** sayi karti. kaynak verilirse zemin O CEKIMIN goruntusudur (bulanik + koyulastirilmis/palet tonuna yikanmis, karta ters yonde
 *  yavas kayar -> parallax): her sayi karti kendi sahnesinin rengini tasir, ayni sablon tekrar etmez. kaynak yoksa DNA arka plani. */
export const DnaSayi: React.FC<{ dna: Dna; deger: number; onEk?: string; sonEk?: string; ust?: string; alt?: string; yuzde?: number; kaynak?: MedyaKaynak }> = ({ dna, kaynak, ...p }) => (
  <AbsoluteFill>{kaynak ? <DnaKaynakZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={0} />}<SayiKarti tip={dna.sayi} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
/** kaynak zemini: cekimin kendi goruntusu bulanik + palet tonuna yikanmis, yavas parallax. Bilgi kartlari (sayi, liste, zaman,
 *  karsilastirma, kelime 'zemin' yerlesimi) bunu kullanir: kart sahnenin rengini tasir, soyut "sablon" zemini gibi durmaz. */
export const DnaKaynakZemin: React.FC<{ dna: Dna; m: MedyaKaynak }> = ({ dna, m }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet } = dnaStil(dna);
  const t = f / fps;
  // koyu palet: goruntu koyulasir (acik yazi okunur); acik palet: palet zeminine yikanir (koyu yazi okunur)
  const filtre = palet.acik ? 'blur(24px) saturate(0.9) brightness(1.08)' : 'blur(24px) saturate(1.2) brightness(0.66)';
  // zemin kendisi hareket eder (karttaki tutmaItme itmesine ters yonde yavas geri cekilme + kayma = parallax); Medya'nin
  // varsayilan itmesi buna ucuncu bir hareket eklemesin diye nefes=0 (kamera yine durmaz: kayma/olcek surekli)
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: palet.zemin }}>
      <AbsoluteFill style={{ transform: `scale(${(1.24 - 0.01 * t).toFixed(4)}) translateX(${(-0.5 * t).toFixed(3)}%)`, filter: filtre }}><Medya m={m} nefes={0} /></AbsoluteFill>
      <AbsoluteFill style={{ background: rgbaHex(palet.zemin, palet.acik ? 0.66 : 0.3) }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, ${rgbaHex(palet.acik ? palet.zemin : '#000000', 0.55)} 100%)` }} />
    </AbsoluteFill>
  );
};
export const DnaAlinti: React.FC<{ dna: Dna; metin: string; kim?: string }> = ({ dna, ...p }) => (
  <AbsoluteFill><DnaArkaplan dna={dna} rol={1} /><Alinti tip={dna.alinti} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
/** kaynak verilirse zemin o cekimin goruntusu (DnaKaynakZemin); yoksa DNA arka plani */
export const DnaListe: React.FC<{ dna: Dna; baslik?: string; maddeler: string[]; kaynak?: MedyaKaynak }> = ({ dna, kaynak, ...p }) => (
  <AbsoluteFill>{kaynak ? <DnaKaynakZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={0} />}<Liste tip={dna.liste} stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
export const DnaZaman: React.FC<{ dna: Dna; adimlar: { yil: string; yazi: string }[]; kaynak?: MedyaKaynak }> = ({ dna, adimlar, kaynak }) => (
  <AbsoluteFill>{kaynak ? <DnaKaynakZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={2} />}<ZamanCizelgesi tip={dna.zaman} adimlar={adimlar} stil={dnaStil(dna)} /></AbsoluteFill>
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
export const DnaDizi: React.FC<{ dna: Dna; sahneler: DiziSahne[]; yumusakOran?: number; plan?: GecisTip[] }> = ({ dna, sahneler, yumusakOran, plan }) => (
  <GecisliDizi sahneler={sahneler} gecis={dna.gecis} kare={dna.iskelet.gecis_kare} yumusakOran={yumusakOran ?? dna.iskelet.yumusak_oran} stil={dnaStil(dna)} tohum={dna.tohum} zemin={<DnaArkaplan dna={dna} rol={1} />} plan={plan} />
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
/** gec (kare) / sure (sn, cizgi tipleri): animasyon zamanlamasi; negatif gec animasyonu ileriden baslatir (onizleme sahnesi) */
export const DnaGrafik: React.FC<{ dna: Dna; veriler: number[]; etiketler?: string[]; baslik?: string; birim?: string; gec?: number; sure?: number }> = ({ dna, ...p }) => (
  <CizgiGrafik tip={dna.grafik && dna.grafik !== 'eleme-izgara' ? dna.grafik : 'cizgi-isik'} stil={dnaStil(dna)} {...p} />
);
export const DnaEleme: React.FC<{ dna: Dna; asamalar: number[]; etiketler?: string[]; ikon?: 'denizalti' | 'kisi' | 'nokta'; gec?: number; asamaSn?: number }> = ({ dna, ...p }) => <ElemeIzgara stil={dnaStil(dna)} {...p} />;
/** medya ustune binen HUD; tip verilmezse DNA'nin hud ekseni */
/** bolge: belge-tarama-isigi'nin kilitlendigi alan [x, y, gen, yuk] (0..1); verilmezse ortadaki satir bandi */
export const DnaHud: React.FC<{ dna: Dna; tip?: HudTip; deger?: number; baslangic?: number; birim?: string; etiket?: string; ust?: string; sure?: number; gec?: number; bolge?: [number, number, number, number] }> = ({ dna, tip, ...p }) => (
  <Hud tip={tip || dna.hud || 'tarih-rozeti'} stil={dnaStil(dna)} {...p} />
);
/** cubuk yarisi (siralama tablosu, cok donemli): seriler = satirlar (donem basina degerler), donemler = yil etiketleri.
 *  Tek donemlik veri icin DnaGrafik (dna.grafik = 'cubuk-yarisi') yeter. */
export const DnaYaris: React.FC<{ dna: Dna; seriler: YarisSeri[]; donemler?: string[]; baslik?: string; birim?: string; vurgu?: string; adimSn?: number }> = ({ dna, ...p }) => (
  <CubukYarisi stil={dnaStil(dna)} {...p} />
);
/** iki deger karsilastirmasi (ayni birim): kaynak zemini ya da DNA arka plani ustunde iki sutun */
export const DnaKarsilastirma: React.FC<{ dna: Dna; sol: { ad: string; deger: number }; sag: { ad: string; deger: number }; birim?: string; onEk?: string; baslik?: string; kaynak?: MedyaKaynak }> = ({ dna, kaynak, ...p }) => (
  <AbsoluteFill>{kaynak ? <DnaKaynakZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={0} />}<Karsilastirma stil={dnaStil(dna)} {...p} /></AbsoluteFill>
);
