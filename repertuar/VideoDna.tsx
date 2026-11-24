import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Vurus, vurusSeviye } from './Vurus';
import { Dna, dnaStil, cerceveSec, DnaAlinti, DnaAltBant, DnaAltyazi, DnaBaslik, DnaBitis, DnaDizi, DnaDoku, DnaMedya, DnaSayi, DnaSfx, DnaVurgu } from './Dna';
import { gecisPlani } from './Gecis';
import { FontYukle } from './FontYukle';
import { SfxOlay } from './Sfx';
import { MedyaKaynak, cerceveOdak } from './Medya';
import { OKUNUR, metinGenislik } from './temel';

// ORTAK KURGU SABLONU (tum kanallar): sahne.json / props.json -> yalniz Dna* bilesenleri + SFX + bitis katmani.
// Kanal projesi bunu sarar (kanal kodu yazilmaz): `export { VideoDna } from './repertuar/VideoDna'` ve presetleri prop olarak verir.
// Cekim zamanlari seslendirmeye bagli; DnaDizi'nin gecis bindirmesi sureyi kisaltmasin diye her sahneye gecis karesi eklenir.
// Render'dan ONCE: `py scripts/kurgu_denetim.py --plan props.json --rakip <kutuphane>/kanallar/@Rakip/video-1 --duzelt props-duzeltilmis.json`
export type Kart = { tur: 'kelime' | 'sayi' | 'alinti'; a: string; b?: string };
/** src verilirse dogrudan o dosya (foto/klip); yoksa <klasor>/kaynak/<tag>.mp4. video verilmezse uzantidan anlasilir.
 *  etiket_ust: kaynak goruntunun alt ucte birinde gomulu yazi var (kurgu_denetim --duzelt isaretler) -> bu cekimde alt bant ust
 *  kosede, kelime karti ust ortada, altyazi ust ucte birde (bizim yazimiz gomulu yazinin ustune binmez).
 *  odak: cekimin konusu [x, y, gen, yuk] (0..1; istege bagli): odak-karartma penceresi ve nesne-dalisi gecis noktasi buradan. */
export type Cekim = { kare: number; tag: string; kb: number; kart?: Kart | null; etiket?: string | null; flas?: boolean; src?: string; video?: boolean;
  etiket_ust?: boolean; odak?: [number, number, number, number] };
export type SahneVeri = { klasor: string; fps: number; toplam: number; cekimler: Cekim[]; kelimeler: { k: string; bas: number; son: number }[] };

const SAYI = /^([^\d-]*?)(\d[\d,.]*)(\D*)$/;
const sayiAyir = (s: string) => {
  const m = s.trim().match(SAYI);
  if (!m || /[-–]\s*\d/.test(s.trim().slice(m[1].length + m[2].length))) return null;
  const v = parseFloat(m[2].replace(/,/g, ''));
  return isNaN(v) ? null : { onEk: m[1], deger: v, sonEk: m[3] };
};

/** sayi kartinin zemini o cekimin kaynak goruntusu (kaynak); yil/ondalik sayi baslik olarak DNA zemininde */
const KartEl: React.FC<{ dna: Dna; k: Kart; kaynak?: MedyaKaynak }> = ({ dna, k, kaynak }) => {
  if (k.tur === 'alinti') return <DnaAlinti dna={dna} metin={k.a} kim={k.b} />;
  if (k.tur === 'sayi') {
    const s = sayiAyir(k.a);
    const yil = s && !s.onEk && !s.sonEk.trim() && s.deger >= 1900 && s.deger <= 2100;
    if (s && !yil && !/\./.test(k.a)) return <DnaSayi dna={dna} deger={s.deger} onEk={s.onEk} sonEk={s.sonEk} alt={k.b} kaynak={kaynak} />;
    return <DnaBaslik dna={dna} metin={k.a} ust={k.b} boyut={170} />;
  }
  return null;
};

/** kurgu olaylari -> SFX olaylari (yumusak gecis, kart/sayi/alinti girisi, alt bant, vurgu) */
export const sfxOlaylari = (veri: SahneVeri, sureler: number[], plan: string[], gecisKare: number): SfxOlay[] => {
  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? gecisKare : 0);
  const out: SfxOlay[] = [];
  let bas = 0;
  veri.cekimler.forEach((c, i) => {
    if (i > 0) bas += sureler[i - 1] - d(i - 1);
    if (i > 0 && plan[i - 1] && plan[i - 1] !== 'sert') out.push({ kare: bas, rol: 'gecis' });
    if (c.kart) out.push({ kare: bas, rol: c.kart.tur === 'alinti' ? 'alinti' : c.kart.tur === 'sayi' ? 'sayi' : 'kart' });
    else if (c.etiket) out.push({ kare: bas + 4, rol: 'altbant' });
    if (c.flas) out.push({ kare: bas, rol: 'vurgu' });
  });
  return out;
};

/** nesne-dalisi odagi (0..1): cekimde kart/etiket varsa onun merkezi (dalis yaziya iner), yoksa cekimin konusu (c.odak),
 *  yoksa cercevenin optik merkezi (cerceveSec ile ayni secim). */
export const cekimOdak = (dna: Dna, c: Cekim, sira: number): [number, number] => {
  const ust = !!c.etiket_ust;
  if (c.kart) {
    if (c.kart.tur === 'kelime') return [0.5, ust ? 0.24 : 0.66];
    if (c.kart.tur === 'sayi' && dna.sayi === 'kare-rozet') return [0.8, 0.3];
    return [0.5, 0.48];
  }
  if (c.etiket) {
    // alt bant blogu: sol kenar 100 px, genislik ust satirin tahmini genisligi (<= 1500 px), dikey merkez ust satir hizasi
    const { font } = dnaStil(dna);
    const w = Math.min(1500, metinGenislik(font.buyukHarf ? c.etiket.toUpperCase() : c.etiket, OKUNUR.ana, font.baslik));
    return [(100 + w / 2) / 1920, ust ? (110 + 45) / 1080 : (1080 - 140 - 45) / 1080];
  }
  if (c.odak) return [c.odak[0] + c.odak[2] / 2, c.odak[1] + c.odak[3] / 2];
  return cerceveOdak(cerceveSec(dna, sira));
};

export const VideoDna: React.FC<{ dna: Dna; veri: SahneVeri; presetler?: any[]; sfx?: boolean; sfxKlasor?: string }> = ({ dna, veri, presetler = [], sfx = true, sfxKlasor }) => {
  const n = veri.cekimler.length;
  const plan = gecisPlani(n - 1, dna.gecis, dna.tohum, dna.iskelet.yumusak_oran);
  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? dna.iskelet.gecis_kare : 0);
  let kartNo = 0; // kelime kartlari arasinda baslik girisi donusumlu
  const sahneler = veri.cekimler.map((c, i) => {
    const src = c.src || `${veri.klasor}/kaynak/${c.tag}.mp4`;
    const video = c.video ?? !/\.(jpe?g|png|webp|avif)$/i.test(src);
    const kaynak = video ? { src, video: true, bas: c.kb } : { src };
    // vurgu (preset zoom/sarsinti) YALNIZ goruntuye: yaziya uygulanirsa (eski hali) kelime karti/alt bant kadrajdan tasar
    const medya0 = <DnaMedya dna={dna} sira={i} m={kaynak} odak={c.odak} />;
    const medya = c.flas && presetler.length ? <DnaVurgu dna={dna} presetler={presetler} sira={i}>{medya0}</DnaVurgu> : medya0;
    let el: React.ReactNode;
    if (c.kart && c.kart.tur === 'sayi') el = <Vurus stil={dnaStil(dna)} seviye={vurusSeviye(dna.ton)} tohum={dna.tohum + i}><KartEl dna={dna} k={c.kart} kaynak={kaynak} /></Vurus>;
    else if (c.kart && c.kart.tur === 'alinti') el = <KartEl dna={dna} k={c.kart} />;
    else if (c.kart && c.kart.tur === 'kelime')
      // kelime karti: a ve b iki satir, alt ucte birde (konusanin yuzu ustte acik kalir); karartma tam ekran degil alttan gradyan.
      // etiket_ust (kaynakta altta gomulu yazi): kart ust ortada, gradyan ustten
      el = (
        <AbsoluteFill>
          {medya}
          <AbsoluteFill style={{ background: `linear-gradient(to ${c.etiket_ust ? 'bottom' : 'top'}, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.66) 26%, rgba(0,0,0,0.3) 48%, rgba(0,0,0,0.08) 66%, rgba(0,0,0,0.04) 100%)` }} />
          <DnaBaslik dna={dna} metin={c.kart.b ? `${c.kart.a}\n${c.kart.b}` : c.kart.a} arkaplanli={false} konum={c.etiket_ust ? 'ust-orta' : 'alt-ucte-bir'} boyut={c.kart.b ? 120 : 150} sira={kartNo++} />
        </AbsoluteFill>
      );
    else el = <AbsoluteFill>{medya}{c.etiket ? <DnaAltBant dna={dna} ust={c.etiket} konum={c.etiket_ust ? 'ust' : 'alt'} /> : null}</AbsoluteFill>;
    // vurgu karesi: vurus paketi (SFX 'vurgu' tepesi ayni kareye oturur); sayi kartinda zaten var
    if (c.flas && !(c.kart && c.kart.tur === 'sayi')) el = <Vurus stil={dnaStil(dna)} seviye={Math.min(2, vurusSeviye(dna.ton)) as any} tohum={dna.tohum + 'f' + i}>{el}</Vurus>;
    return { sure: c.kare + d(i), el, odak: cekimOdak(dna, c, i) };
  });
  // altyazi kart / alt bant olan cekimlerde gizlenir (iki yazi ust uste binmesin). etiket_ust isaretli (kaynakta alt ucte birde
  // gomulu yazi) yazisiz cekimde konusulan kelimeler ust ucte birde ayri altyazi katmaninda cizilir (gomulu yazinin ustune
  // binmez); kelime cekim sinirina tasiyorsa ortasi hangi cekimdeyse oraya.
  const sessiz: [number, number][] = [], ustAralik: [number, number][] = [];
  let t = 0;
  veri.cekimler.forEach((c) => {
    if (c.kart || c.etiket) sessiz.push([t / veri.fps, (t + c.kare) / veri.fps]);
    else if (c.etiket_ust) ustAralik.push([t / veri.fps, (t + c.kare) / veri.fps]);
    t += c.kare;
  });
  const acik = veri.kelimeler.filter((w) => !sessiz.some(([a, b]) => w.bas + 0.05 < b && w.son - 0.05 > a));
  const ustte = (w: { bas: number; son: number }) => ustAralik.some(([a, b]) => (w.bas + w.son) / 2 >= a && (w.bas + w.son) / 2 < b);
  const kelimeler = acik.filter((w) => !ustte(w));
  const kelimelerUst = acik.filter(ustte);
  const olaylar = React.useMemo(() => sfxOlaylari(veri, sahneler.map((s) => s.sure), plan, dna.iskelet.gecis_kare), [veri, dna.tohum]);
  const icerik = (
    <AbsoluteFill style={{ background: '#000' }}>
      <FontYukle />
      <DnaDizi dna={dna} sahneler={sahneler} />
      <DnaDoku dna={dna} />
      <DnaAltyazi dna={dna} kelimeler={kelimeler} />
      {kelimelerUst.length ? <DnaAltyazi dna={dna} kelimeler={kelimelerUst} konum="ust-ucte-bir" /> : null}
    </AbsoluteFill>
  );
  return (
    <>
      {dna.bitis ? <DnaBitis dna={dna}>{icerik}</DnaBitis> : icerik}
      {sfx ? <DnaSfx dna={dna} olaylar={olaylar} klasor={sfxKlasor} /> : null}
    </>
  );
};
