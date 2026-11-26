import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Vurus, vurusSeviye } from './Vurus';
import { Dna, EFEKT_BUTCE, YUMUSAK_ARA_SN, dnaStil, dnaVaryant, cerceveSec, imzaGecisMi, DnaAlinti, DnaAltBant, DnaAltyazi, DnaKunye, DnaArkaplan, DnaBaslik, DnaBitis, DnaDizi, DnaDoku, DnaGrafik, DnaHarita, DnaHud,
  DnaKaynakZemin, DnaKarsilastirma, DnaListe, DnaMedya, DnaSayi, DnaSfx, DnaVurgu, DnaYaris, DnaZaman } from './Dna';
import { YIL_TARAMA, yilTaramaAdimlari } from './Kart';
import { HaritaNokta } from './Harita';
import { YarisSeri } from './Grafik';
import { HudTip } from './Hud';
import { GecisTip, gecisPlani } from './Gecis';
import { FontYukle } from './FontYukle';
import { SfxOlay } from './Sfx';
import { CerceveTip, MedyaKaynak, cerceveOdak } from './Medya';
import { OKUNUR, egri, metinGenislik, sayiYerelKur, sayiYereli, sinirla } from './temel';

// ORTAK KURGU SABLONU (tum kanallar): sahne.json / props.json -> yalniz Dna* bilesenleri + SFX + bitis katmani.
// Kanal projesi bunu sarar (kanal kodu yazilmaz): `export { VideoDna } from './repertuar/VideoDna'` ve presetleri prop olarak verir.
// Cekim zamanlari seslendirmeye bagli; DnaDizi'nin gecis bindirmesi sureyi kisaltmasin diye her sahneye gecis karesi eklenir.
// Render'dan ONCE: `py scripts/kurgu_denetim.py --plan props.json --rakip <kutuphane>/kanallar/@Rakip/video-1 --duzelt props-duzeltilmis.json`
/** SAHNE TURLERI (kart.tur). Hepsi DNA'nin sectigi repertuar tipiyle cizilir; kanal kodu yazilmaz.
 *  kelime {a, b?, yerlesim?}      medya ustu iki satir (baslik/baslik2 donusumlu); yerlesim 'zemin' = kaynak zemininde ortada
 *  sayi {a, b?} · alinti {a, b?}  sayi karti / alinti karti (DNA sayi|sayi2, alinti|alinti2 donusumlu)
 *  liste {baslik?, maddeler}      DnaListe (liste|liste2)            zaman {adimlar}   DnaZaman (zaman|zaman2)
 *  yil {adimlar}                  yil-tarama (hedef yil son adim)    harita {noktalar, etiket?, zemin?}  DnaHarita
 *  grafik {veriler, etiketler?, baslik?, birim?} DnaGrafik (grafik|grafik2); {seriler, donemler} -> DnaYaris (cubuk yarisi)
 *  karsilastirma {sol, sag, birim?, onEk?, baslik?}  iki sutun     degisim {eski, yeni, ust?}  ustu-cizili-degisim
 *  bolum {no, baslik, alt?}       cift sira bolum-numarasi, tek sira hayalet numara + DNA basligi
 *  coklu {m2?, m3?, kb2?, kb3?, duzen?}  odak-karartma / bolunmus / kolaj (m2/m3: tag ya da dosya yolu); altyazi acik kalir */
export type KartTur = 'kelime' | 'sayi' | 'alinti' | 'liste' | 'zaman' | 'yil' | 'harita' | 'grafik' | 'karsilastirma' | 'bolum' | 'degisim' | 'coklu';
export type Kart = {
  tur: KartTur; a?: string; b?: string; yerlesim?: 'medya' | 'zemin';
  baslik?: string; maddeler?: string[]; adimlar?: { yil: string; yazi: string }[];
  noktalar?: HaritaNokta[]; etiket?: string; zemin?: string;
  veriler?: number[]; etiketler?: string[]; birim?: string; seriler?: YarisSeri[]; donemler?: string[];
  sol?: { ad: string; deger: number }; sag?: { ad: string; deger: number }; onEk?: string;
  no?: number | string; alt?: string; eski?: string; yeni?: string; ust?: string;
  m2?: string; m3?: string; kb2?: number; kb3?: number; duzen?: 'odak-karartma' | 'kolaj' | 'bolunmus';
  /** sayi karti: false = vurus paketi yok (efekt butcesi; sahne_zengin.py karar verir) */
  vurus?: boolean;
};
/** kalici HUD istegi: verildigi cekimden bir sonraki 'hud' alanina (nesne ya da false) kadar surer; sn verilirse en cok o kadar.
 *  Yalniz medya cekimlerinde gorunur (tam ekran kart ve etiket_ust cekiminde gizlenir, sonra kaldigi yerden devam eder). */
export type HudIstek = { tip: HudTip; deger?: number; baslangic?: number; birim?: string; etiket?: string; ust?: string; sn?: number };
/** src verilirse dogrudan o dosya (foto/klip); yoksa <klasor>/kaynak/<tag>.mp4. video verilmezse uzantidan anlasilir.
 *  etiket_ust: kaynak goruntunun alt ucte birinde gomulu yazi var (kurgu_denetim --duzelt isaretler) -> bu cekimde alt bant ust
 *  kosede, kelime karti ust ortada, altyazi ust ucte birde (bizim yazimiz gomulu yazinin ustune binmez).
 *  odak: cekimin konusu [x, y, gen, yuk] (0..1; istege bagli): odak-karartma penceresi ve nesne-dalisi gecis noktasi buradan.
 *  hud: kalici HUD baslat (HudIstek) ya da bitir (false). */
export type Cekim = { kare: number; tag: string; kb: number; kart?: Kart | null; etiket?: string | null; flas?: boolean; src?: string; video?: boolean;
  etiket_ust?: boolean; odak?: [number, number, number, number]; hud?: HudIstek | false | null;
  /** kaynak kunyesi / AI etiketi (sahne_kur plan 'kunye'): medya gorunen cekimde sag alt kose */
  kunye?: string;
  /** bolumlu planda cekimin cercevesi (sahne_zengin.py bloklari; yoksa 'tam'); imza: imza efekt serbest (bolum acilisi, doruk, sayi) */
  cerceve?: CerceveTip; imza?: boolean };
/** BOLUM MUAMELESI (video duzeyinde kurgu, sahne_zengin.py dramaturji): bolum boyunca tutarli, bolum gecisinde degisir.
 *  letterbox: bolum DURUMU (bir kez girer, bolum boyunca kalir, sonunda cikar; tam ekran kartlarda gizli); ton: footage'a renk
 *  tonu (gecis 1 sn rampa); tempo: kamera hiz carpani; arkaplan: cerceveli medyanin arkasindaki DNA zemin rolu. */
export type BolumMuamele = { letterbox?: boolean; cerceve?: CerceveTip; ton?: { doygunluk?: number; kontrast?: number; parlaklik?: number }; tempo?: number; arkaplan?: number };
export type Bolum = { bas: number; son: number; ad?: string; rol: 'kanca' | 'giris' | 'bolum' | 'doruk' | 'kapanis'; muamele: BolumMuamele };
export type SahneVeri = { klasor: string; fps: number; toplam: number; cekimler: Cekim[]; kelimeler: { k: string; bas: number; son: number }[]; bolumler?: Bolum[] };

const SAYI = /^([^\d-]*?)(\d[\d,.]*)(\D*)$/;
const sayiAyir = (s0: string) => {
  // virgul-ondalik dillerde (fr/de/tr/es...) once normalize: '4 000' / '4.000' binlik -> 4000, '1,5' -> 1.5 (ondalik -> baslik)
  const vo = !['en-US', 'ja-JP'].includes(sayiYereli());
  const s = vo ? s0.replace(/(\d)[\s\u00a0\u202f.](?=\d{3}(?!\d))/g, '$1').replace(/(\d),(?=\d)/g, '$1.') : s0;
  const m = s.trim().match(SAYI);
  if (!m || /[-–]\s*\d/.test(s.trim().slice(m[1].length + m[2].length))) return null;
  const v = parseFloat(m[2].replace(/,/g, ''));
  return isNaN(v) ? null : { onEk: m[1], deger: v, sonEk: m[3], ondalik: /\./.test(s) };
};

/** sayi kartinin zemini o cekimin kaynak goruntusu (kaynak); yil/ondalik sayi baslik olarak DNA zemininde */
const KartEl: React.FC<{ dna: Dna; k: Kart; kaynak?: MedyaKaynak }> = ({ dna, k, kaynak }) => {
  if (k.tur === 'alinti') return <DnaAlinti dna={dna} metin={k.a || ''} kim={k.b} />;
  if (k.tur === 'sayi') {
    const s = sayiAyir(k.a || '');
    const yil = s && !s.onEk && !s.sonEk.trim() && s.deger >= 1900 && s.deger <= 2100;
    if (s && !yil && !s.ondalik) return <DnaSayi dna={dna} deger={s.deger} onEk={s.onEk} sonEk={s.sonEk} alt={k.b} kaynak={kaynak} />;
    return <DnaBaslik dna={dna} metin={k.a || ''} ust={k.b} boyut={170} />;
  }
  return null;
};

/** grafik ekseninin cizilen tipi (DnaGrafik ile ayni karar) */
const grafikTip = (dna: Dna) => (dna.grafik && dna.grafik !== 'eleme-izgara' ? dna.grafik : 'cizgi-isik');
/** coklu duzen: verilmezse medya sayisina gore donusumlu (m3: kolaj/odak-karartma, m2: bolunmus/odak-karartma, tek: odak-karartma) */
export const cokluDuzen = (k: Kart, sira: number): CerceveTip =>
  k.duzen || (k.m3 ? (['kolaj', 'odak-karartma'] as const)[sira % 2] : k.m2 ? (['bolunmus', 'odak-karartma'] as const)[sira % 2] : 'odak-karartma');
/** KART ANAHTARI = tur + cizilen varyant. sira: o turun videodaki kacinci karti (0'dan). Tekrar denetimi bunu sayar
 *  (kurgu_denetim.py kart_anahtar birebir taklit): ayni anahtar 2 dk icinde 3'ten fazla -> FAIL. */
export const kartAnahtar = (dna: Dna, k: Kart, sira: number): string => {
  switch (k.tur) {
    case 'kelime': return `kelime:${sira % 2 && dna.baslik2 ? dna.baslik2 : dna.baslik}:${k.yerlesim === 'zemin' ? 'zemin' : 'medya'}`;
    case 'sayi': case 'alinti': case 'liste': case 'zaman': return `${k.tur}:${(dnaVaryant(dna, k.tur, sira) as any)[k.tur]}`;
    case 'grafik': return k.seriler ? 'grafik:yaris' : `grafik:${grafikTip(dnaVaryant(dna, 'grafik', sira))}`;
    case 'yil': return 'yil:yil-tarama';
    case 'bolum': return `bolum:${sira % 2 ? 'hayalet-yil' : 'bolum-numarasi'}`;
    case 'coklu': return `coklu:${cokluDuzen(k, sira)}`;
    case 'harita': return `harita:${dna.harita || 'isik-rota'}`;
    default: return `${k.tur}:tek`;
  }
};
/** medya ustunde kalan sahne turleri (altyazi acik, HUD gorunur); digerleri tam ekran kart */
export const MEDYA_TURLERI: KartTur[] = ['coklu'];
const yilHedefKare = (k: Kart, fps: number) => {
  const n = yilTaramaAdimlari(k.adimlar || []).length;
  return n <= 1 ? 0 : Math.round(fps * YIL_TARAMA.uc) + (n - 2) * Math.round(fps * YIL_TARAMA.ara);
};
/** kart turu -> SFX olaylari (kare = kartin basindan ofset; gorsel an). Dizi rolleri (liste-madde, grafik-cubuk, sayac) tek olay. */
export const kartSfx = (k: Kart, fps: number): SfxOlay[] => {
  const say = (x?: unknown[]) => (x || []).length;
  switch (k.tur) {
    case 'alinti': return [{ kare: 0, rol: 'alinti' }];
    case 'sayi': {
      const s = sayiAyir(k.a || '');
      const yil = s && !s.onEk && !s.sonEk.trim() && s.deger >= 1900 && s.deger <= 2100;
      // sayac suresi = SayiTemel sayma suresi (fps * 1,1); son vurus sayinin durdugu kareye oturur
      return s && !yil && !/\./.test(k.a || '') ? [{ kare: 0, rol: 'sayac', sure: Math.round(fps * 1.1) }] : [{ kare: 0, rol: 'sayi' }];
    }
    case 'karsilastirma': return [{ kare: 8, rol: 'sayac', sure: Math.round(fps * 1.0) + 6 }]; // ikinci sutun 6 kare sonra baslar (Karsilastirma)
    case 'liste': return [{ kare: 8, rol: 'liste-madde', adet: Math.max(1, say(k.maddeler)), aralik: Math.round(fps * 0.35) }];
    case 'zaman': return [{ kare: 6, rol: 'liste-madde', adet: Math.max(1, say(k.adimlar)), aralik: 9 }];
    case 'yil': return [{ kare: 0, rol: 'yukselme' }, { kare: yilHedefKare(k, fps), rol: 'vurgu' }];
    case 'grafik': return k.seriler ? [{ kare: 6, rol: 'grafik-cubuk', adet: Math.max(1, say(k.seriler)), aralik: 4 }] : [{ kare: 0, rol: 'yukselme' }];
    case 'harita': return [{ kare: 8, rol: 'harita-rota', sure: Math.round(fps * 2) }];
    case 'bolum': return [{ kare: 0, rol: 'bolum' }];
    case 'degisim': return [{ kare: Math.round(fps * 0.5), rol: 'degisim', sure: Math.round(fps * 0.3) }];
    case 'coklu': return [{ kare: 0, rol: 'gecis' }];
    default: return [{ kare: 0, rol: 'kart' }];
  }
};

/** kurgu olaylari -> SFX olaylari (yumusak gecis, kart girisi [tur rolu: kartSfx], alt bant, vurgu, doruk bolumu basi) */
export const sfxOlaylari = (veri: SahneVeri, sureler: number[], plan: string[], gecisKare: number): SfxOlay[] => {
  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? gecisKare : 0);
  const out: SfxOlay[] = [];
  let bas = 0;
  veri.cekimler.forEach((c, i) => {
    if (i > 0) bas += sureler[i - 1] - d(i - 1);
    if (i > 0 && plan[i - 1] && plan[i - 1] !== 'sert') out.push({ kare: bas, rol: 'gecis' });
    if (c.kart) kartSfx(c.kart, veri.fps).forEach((o) => out.push({ ...o, kare: bas + o.kare }));
    if ((!c.kart || c.kart.tur === 'coklu') && c.etiket) out.push({ kare: bas + 4, rol: 'altbant' });
    if (c.flas) out.push({ kare: bas, rol: 'vurgu' });
  });
  (veri.bolumler || []).forEach((b) => { if (b.rol === 'doruk') out.push({ kare: b.bas, rol: 'doruk' }); });
  return out;
};

/** nesne-dalisi odagi (0..1): cekimde kart/etiket varsa onun merkezi (dalis yaziya iner), yoksa cekimin konusu (c.odak),
 *  yoksa cercevenin optik merkezi (cerceveSec ile ayni secim). */
export const cekimOdak = (dna: Dna, c: Cekim, sira: number): [number, number] => {
  const ust = !!c.etiket_ust;
  if (c.kart && c.kart.tur !== 'coklu') {
    if (c.kart.tur === 'kelime') return [0.5, c.kart.yerlesim === 'zemin' ? 0.5 : ust ? 0.24 : 0.66];
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

const RESIM = /\.(jpe?g|png|webp|avif)$/i;
/** tag ya da dosya yolu -> MedyaKaynak (tag: <klasor>/kaynak/<tag>.mp4) */
const kaynakYap = (klasor: string, x: string, kb = 0): MedyaKaynak => {
  const src = /[/\\]|\.\w{2,4}$/.test(x) ? x : `${klasor}/kaynak/${x}.mp4`;
  return RESIM.test(src) ? { src } : { src, video: true, bas: kb };
};

type HudParca = { bas: number; son: number; gec: number; istek: HudIstek };
/** kalici HUD parcalari: [bas, son) kare araliklari, yalniz medya cekimlerinde; gec = HUD basinin parca basina gore farki (<= 0):
 *  kart arasindan sonra HUD giris animasyonunu tekrarlamaz, kaldigi yerden surer. */
export const hudParcalari = (veri: SahneVeri): HudParca[] => {
  const segler: { istek: HudIstek; bas: number; son: number }[] = [];
  const sinir: { a: number; b: number; gorunur: boolean }[] = [];
  let t = 0;
  let akt: { istek: HudIstek; bas: number; son: number } | null = null;
  veri.cekimler.forEach((c) => {
    if (c.hud !== undefined && c.hud !== null) {
      if (akt) { akt.son = Math.min(t, akt.son); segler.push(akt); }
      akt = c.hud ? { istek: c.hud, bas: t, son: c.hud.sn ? t + Math.round(c.hud.sn * veri.fps) : Number.MAX_SAFE_INTEGER } : null;
    }
    sinir.push({ a: t, b: t + c.kare, gorunur: !(c.kart && !MEDYA_TURLERI.includes(c.kart.tur)) && !c.etiket_ust });
    t += c.kare;
  });
  if (akt) { const a = akt as { istek: HudIstek; bas: number; son: number }; a.son = Math.min(t, a.son); segler.push(a); }
  const out: HudParca[] = [];
  segler.forEach((sg) => {
    let pa = -1, pb = -1;
    const it = () => { if (pb > pa && pa >= 0) out.push({ bas: pa, son: pb, gec: sg.bas - pa, istek: sg.istek }); pa = pb = -1; };
    sinir.forEach(({ a, b, gorunur }) => {
      const x = Math.max(a, sg.bas), y = Math.min(b, sg.son);
      if (y <= x) return;
      if (!gorunur) { it(); return; }
      if (pa >= 0 && pb === x) pb = y;
      else { it(); pa = x; pb = y; }
    });
    it();
  });
  return out;
};

/** imza noktasi: bolumlu planda c.imza (bolum acilisi, doruk, sayi aciklamasi); eski planda vurgulu (flas) cekim */
const imzaNoktasi = (veri: SahneVeri, c?: Cekim) => !!c && (veri.bolumler ? !!c.imza : !!c.flas);
/** VIDEO GECIS PLANI: gecisPlani (DNA tipleri, rakibin yumusak orani) + efekt butcesi + yumusak gecis araligi.
 *  - imza gecisler (isik patlamasi, film yanigi, glitch, nesne-dalisi...) YALNIZ imza noktasinda, video basina dakikada
 *    EFEKT_BUTCE.imzaGecis.dakikada, aralarinda >= araSn; imza noktasinda butce varsa DNA'nin imza gecisi konur (anlama bagli);
 *  - butce disi imza gecis DNA'nin sade yumusak tipine (yoksa sert kesime) doner;
 *  - iki yumusak gecis arasi >= YUMUSAK_ARA_SN: kisa cekim dizisinde araya sert kesim girer.
 *  kurgu_denetim.py gecis_plani_video birebir taklit eder (efekt butcesi + gecis araligi kontrolu). */
export const gecisPlaniVideo = (veri: SahneVeri, dna: Dna): GecisTip[] => {
  const n = veri.cekimler.length, fps = veri.fps;
  const p0 = gecisPlani(n - 1, dna.gecis, dna.tohum, dna.iskelet.yumusak_oran);
  const liste = Array.from(new Set(dna.gecis || []));
  const sade = liste.filter((t) => t !== 'sert' && !imzaGecisMi(t)), imzalar = liste.filter(imzaGecisMi);
  const toplam = veri.cekimler.reduce((a, c) => a + c.kare, 0);
  const B = EFEKT_BUTCE.imzaGecis, butce = Math.max(1, Math.ceil((toplam / fps / 60) * B.dakikada));
  let sonY = -1e9, sonI = -1e9, imzaSay = 0, t = 0;
  return p0.map((g, i) => {
    t += veri.cekimler[i].kare;
    let x: GecisTip = g;
    const bosY = t - sonY >= YUMUSAK_ARA_SN * fps;
    if (imzalar.length && imzaNoktasi(veri, veri.cekimler[i + 1]) && imzaSay < butce && t - sonI >= B.araSn * fps && bosY) x = imzalar[imzaSay % imzalar.length];
    else if (x !== 'sert' && imzaGecisMi(x)) x = sade.length ? sade[i % sade.length] : 'sert';
    if (x !== 'sert' && !bosY) x = 'sert';
    if (x !== 'sert') { sonY = t; if (imzaGecisMi(x)) { sonI = t; imzaSay++; } }
    return x;
  });
};

/** cekim medya gosteriyor mu (kalici katmanlar icin): kartsiz, medya ustu kelime karti ya da coklu duzen */
const medyaGorunur = (c: Cekim) => !c.kart || c.kart.tur === 'coklu' || (c.kart.tur === 'kelime' && c.kart.yerlesim !== 'zemin');
/** cekim basina cerceve + blok ofseti: ayni cerceve art arda gelirse giris animasyonu tekrar oynamaz (ofset = bloktaki kare) */
export const cerceveBloklari = (dna: Dna, veri: SahneVeri) => {
  const sira: Partial<Record<KartTur, number>> = {};
  const tip: CerceveTip[] = [], ofset: number[] = [];
  veri.cekimler.forEach((c, i) => {
    const k = c.kart;
    const s = k ? (sira[k.tur] = (sira[k.tur] ?? -1) + 1) : 0;
    const t: CerceveTip = k && k.tur === 'coklu' ? cokluDuzen(k, s) : c.cerceve ?? (veri.bolumler ? 'tam' : cerceveSec(dna, i));
    tip.push(t);
    ofset.push(i > 0 && t !== 'tam' && tip[i - 1] === t && medyaGorunur(veri.cekimler[i - 1]) ? ofset[i - 1] + veri.cekimler[i - 1].kare : 0);
  });
  return { tip, ofset };
};

type DurumParca = { bas: number; son: number; ilk: number; sonG: number };
/** bolum durumu (letterbox) parcalari: letterbox bolumundeki medya cekimleri; ilk/sonG = bolumun ilk ve son gorunur karesi */
export const letterboxParcalari = (veri: SahneVeri): DurumParca[] => {
  const out: DurumParca[] = [];
  const bas: number[] = [];
  let t = 0;
  veri.cekimler.forEach((c) => { bas.push(t); t += c.kare; });
  (veri.bolumler || []).filter((b) => b.muamele.letterbox).forEach((b) => {
    const p: [number, number][] = [];
    veri.cekimler.forEach((c, i) => {
      const x = Math.max(bas[i], b.bas), y = Math.min(bas[i] + c.kare, b.son);
      if (y <= x || !medyaGorunur(c)) return;
      if (p.length && p[p.length - 1][1] === x) p[p.length - 1][1] = y; else p.push([x, y]);
    });
    if (p.length) p.forEach(([x, y]) => out.push({ bas: x, son: y, ilk: p[0][0], sonG: p[p.length - 1][1] }));
  });
  return out;
};
/** sinema bantlari (2,39:1 ~ %12 + %12): bolumun ilk gorunur karesinde 0,6 sn'de girer, son gorunur karesinde 0,5 sn'de cikar */
const LetterboxKatman: React.FC<{ p: DurumParca }> = ({ p }) => {
  const f = useCurrentFrame() + p.bas;
  const { fps, height: H } = useVideoConfig();
  const g = egri('kubik-hizli', sinirla((f - p.ilk) / (fps * 0.6)));
  const c = egri('kubik-hizli', sinirla((p.sonG - f) / (fps * 0.5)));
  const b = H * 0.12 * Math.min(g, c);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: b, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: b, background: '#000' }} />
    </AbsoluteFill>
  );
};
/** bolum renk tonu (footage'a CSS filtre), bolum basinda onceki tondan 1 sn rampa */
const bolumTon = (veri: SahneVeri, f: number) => {
  const B = veri.bolumler;
  if (!B || !B.length) return undefined;
  const i = Math.max(0, B.findIndex((b) => f >= b.bas && f < b.son));
  const deg = (b?: Bolum) => ({ d: b?.muamele.ton?.doygunluk ?? 1, k: b?.muamele.ton?.kontrast ?? 1, p: b?.muamele.ton?.parlaklik ?? 1 });
  const a = deg(B[i - 1] || B[i]), z = deg(B[i]);
  const u = egri('kubik-hizli', sinirla((f - B[i].bas) / veri.fps));
  const m = (x: number, y: number) => (x + (y - x) * u).toFixed(3);
  const s = `saturate(${m(a.d, z.d)}) contrast(${m(a.k, z.k)}) brightness(${m(a.p, z.p)})`;
  return s === 'saturate(1.000) contrast(1.000) brightness(1.000)' ? undefined : s;
};
const bolumBul = (veri: SahneVeri, kare: number) => (veri.bolumler || []).find((b) => kare >= b.bas && kare < b.son);

export const VideoDna: React.FC<{ dna: Dna; veri: SahneVeri; presetler?: any[]; sfx?: boolean; sfxKlasor?: string }> = ({ dna, veri, presetler = [], sfx = true, sfxKlasor }) => {
  sayiYerelKur(dna.dil); // sayi kartlari / grafik / HUD videonun dilinde (fr: 4 000)
  const fr = useCurrentFrame();
  const plan = React.useMemo(() => gecisPlaniVideo(veri, dna), [veri, dna.tohum]);
  const cb = React.useMemo(() => cerceveBloklari(dna, veri), [veri, dna.tohum]);
  const basK: number[] = [];
  veri.cekimler.reduce((t, c) => (basK.push(t), t + c.kare), 0);
  const d = (i: number) => (i >= 0 && i < plan.length && plan[i] !== 'sert' ? dna.iskelet.gecis_kare : 0);
  const sira: Partial<Record<KartTur, number>> = {}; // tur basina kacinci kart: tur ici varyant donusumu (kelime: baslik/baslik2)
  const sahneler = veri.cekimler.map((c, i) => {
    // kaynaksiz cekim (src yok, tag yok): yalniz kartlar olabilir; kart DNA zemininde cizilir ("null.mp4" aranmaz)
    const src = c.src || (c.tag ? `${veri.klasor}/kaynak/${c.tag}.mp4` : '');
    const video = !!src && (c.video ?? !RESIM.test(src));
    const kaynak: MedyaKaynak | undefined = !src ? undefined : video ? { src, video: true, bas: c.kb } : { src };
    const k = c.kart || null;
    const s = k ? (sira[k.tur] = (sira[k.tur] ?? -1) + 1) : 0;
    // vurgu (preset zoom/sarsinti) YALNIZ goruntuye: yaziya uygulanirsa (eski hali) kelime karti/alt bant kadrajdan tasar
    const mu = bolumBul(veri, basK[i])?.muamele;
    const ortak = { dna, sira: i, odak: c.odak, zorla: cb.tip[i], ofset: cb.ofset[i], tempo: mu?.tempo, arkaplanRol: mu?.arkaplan, imza: veri.bolumler ? !!c.imza : true };
    const medya0 = !kaynak ? <DnaArkaplan dna={dna} rol={1} /> : k && k.tur === 'coklu'
      ? <DnaMedya {...ortak} m={kaynak} m2={k.m2 ? kaynakYap(veri.klasor, k.m2, k.kb2) : undefined} m3={k.m3 ? kaynakYap(veri.klasor, k.m3, k.kb3) : undefined} />
      : <DnaMedya {...ortak} m={kaynak} />;
    const medya = c.flas && presetler.length ? <DnaVurgu dna={dna} presetler={presetler} sira={i}>{medya0}</DnaVurgu> : medya0;
    const bant = c.etiket ? <DnaAltBant dna={dna} ust={c.etiket} konum={c.etiket_ust ? 'ust' : 'alt'} /> : null;
    let el: React.ReactNode;
    if (!k) el = <AbsoluteFill>{medya}{bant}</AbsoluteFill>;
    else if (k.tur === 'sayi')
      el = k.vurus === false ? <KartEl dna={dnaVaryant(dna, 'sayi', s)} k={k} kaynak={kaynak} />
        : <Vurus stil={dnaStil(dna)} seviye={vurusSeviye(dna.ton)} tohum={dna.tohum + i}><KartEl dna={dnaVaryant(dna, 'sayi', s)} k={k} kaynak={kaynak} /></Vurus>;
    else if (k.tur === 'alinti') el = <KartEl dna={dnaVaryant(dna, 'alinti', s)} k={k} />;
    else if (k.tur === 'kelime' && k.yerlesim === 'zemin')
      // ikinci kelime yerlesimi: cekimin kendi goruntusu bulanik zeminde, iki satir ortada (medya ustu alt ucte birden farkli duzen)
      el = <AbsoluteFill>{kaynak ? <DnaKaynakZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={1} />}<DnaBaslik dna={dna} metin={k.b ? `${k.a}\n${k.b}` : k.a || ''} arkaplanli={false} konum="orta" boyut={k.b ? 130 : 160} sira={s} /></AbsoluteFill>;
    else if (k.tur === 'kelime')
      // kelime karti: a ve b iki satir, alt ucte birde (konusanin yuzu ustte acik kalir); karartma tam ekran degil alttan gradyan.
      // etiket_ust (kaynakta altta gomulu yazi): kart ust ortada, gradyan ustten
      el = (
        <AbsoluteFill>
          {medya}
          <AbsoluteFill style={{ background: `linear-gradient(to ${c.etiket_ust ? 'bottom' : 'top'}, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.66) 26%, rgba(0,0,0,0.3) 48%, rgba(0,0,0,0.08) 66%, rgba(0,0,0,0.04) 100%)` }} />
          <DnaBaslik dna={dna} metin={k.b ? `${k.a}\n${k.b}` : k.a || ''} arkaplanli={false} konum={c.etiket_ust ? 'ust-orta' : 'alt-ucte-bir'} boyut={k.b ? 120 : 150} sira={s} />
        </AbsoluteFill>
      );
    else if (k.tur === 'liste') el = <DnaListe dna={dnaVaryant(dna, 'liste', s)} baslik={k.baslik} maddeler={k.maddeler || []} kaynak={kaynak} />;
    else if (k.tur === 'zaman') el = <DnaZaman dna={dnaVaryant(dna, 'zaman', s)} adimlar={k.adimlar || []} kaynak={kaynak} />;
    else if (k.tur === 'yil') el = <DnaZaman dna={{ ...dna, zaman: 'yil-tarama' }} adimlar={k.adimlar || []} kaynak={kaynak} />;
    else if (k.tur === 'grafik')
      el = k.seriler ? <DnaYaris dna={dna} seriler={k.seriler} donemler={k.donemler} baslik={k.baslik} birim={k.birim} />
        : <DnaGrafik dna={dnaVaryant(dna, 'grafik', s)} veriler={k.veriler || []} etiketler={k.etiketler} baslik={k.baslik} birim={k.birim} />;
    else if (k.tur === 'karsilastirma' && k.sol && k.sag)
      el = <DnaKarsilastirma dna={dna} sol={k.sol} sag={k.sag} birim={k.birim} onEk={k.onEk} baslik={k.baslik} kaynak={kaynak} />;
    else if (k.tur === 'harita')
      el = <DnaHarita dna={dna} noktalar={k.noktalar || []} etiket={k.etiket} zemin={k.zemin ? kaynakYap(veri.klasor, k.zemin) : undefined} />;
    else if (k.tur === 'bolum') {
      const no = String(k.no ?? '').padStart(2, '0');
      el = s % 2
        // hayalet numara: dev kontur bolum numarasi arkada yavas kayar, onde DNA basligi (ust satir: alt ya da CHAPTER NN)
        ? <AbsoluteFill><DnaArkaplan dna={dna} rol={2} /><DnaHud dna={dna} tip="hayalet-yil" ust={no} /><DnaBaslik dna={dna} metin={k.baslik || ''} ust={k.alt || `CHAPTER ${no}`} arkaplanli={false} boyut={150} /></AbsoluteFill>
        : <DnaBaslik dna={{ ...dna, baslik: 'bolum-numarasi', baslik2: undefined }} metin={k.alt ? `${k.baslik} | ${k.alt}` : k.baslik || ''} ust={`CHAPTER ${no}`} />;
    } else if (k.tur === 'degisim')
      el = <AbsoluteFill>{kaynak ? <DnaKaynakZemin dna={dna} m={kaynak} /> : <DnaArkaplan dna={dna} rol={1} />}<DnaBaslik dna={{ ...dna, baslik: 'ustu-cizili-degisim', baslik2: undefined }} metin={`${k.eski || ''} | ${k.yeni || ''}`} ust={k.ust} arkaplanli={false} konum="orta" /></AbsoluteFill>;
    else el = <AbsoluteFill>{medya}{bant}</AbsoluteFill>; // coklu (ve verisi eksik kart): medya duzeni + alt bant
    // vurgu karesi: vurus paketi (SFX 'vurgu' tepesi ayni kareye oturur); sayi kartinda zaten var
    if (c.flas && !(k && k.tur === 'sayi')) el = <Vurus stil={dnaStil(dna)} seviye={Math.min(2, vurusSeviye(dna.ton)) as any} tohum={dna.tohum + 'f' + i}>{el}</Vurus>;
    // kunye yalniz medya tam gorunurken (kart zemini bulanik kopya oldugunda degil): duz cekim, medya ustu kelime karti, coklu
    if (c.kunye && kaynak && (!k || k.tur === 'coklu' || (k.tur === 'kelime' && k.yerlesim !== 'zemin'))) el = <AbsoluteFill>{el}<DnaKunye dna={dna} metin={c.kunye} /></AbsoluteFill>;
    return { sure: c.kare + d(i), el, odak: cekimOdak(dna, c, i) };
  });
  // altyazi kart / alt bant olan cekimlerde gizlenir (iki yazi ust uste binmesin). etiket_ust isaretli (kaynakta alt ucte birde
  // gomulu yazi) yazisiz cekimde konusulan kelimeler ust ucte birde ayri altyazi katmaninda cizilir (gomulu yazinin ustune
  // binmez); kelime cekim sinirina tasiyorsa ortasi hangi cekimdeyse oraya. coklu (medya duzeni) altyaziyi gizlemez.
  const sessiz: [number, number][] = [], ustAralik: [number, number][] = [];
  let t = 0;
  veri.cekimler.forEach((c) => {
    if ((c.kart && !MEDYA_TURLERI.includes(c.kart.tur)) || c.etiket) sessiz.push([t / veri.fps, (t + c.kare) / veri.fps]);
    else if (c.etiket_ust) ustAralik.push([t / veri.fps, (t + c.kare) / veri.fps]);
    t += c.kare;
  });
  const acik = veri.kelimeler.filter((w) => !sessiz.some(([a, b]) => w.bas + 0.05 < b && w.son - 0.05 > a));
  const ustte = (w: { bas: number; son: number }) => ustAralik.some(([a, b]) => (w.bas + w.son) / 2 >= a && (w.bas + w.son) / 2 < b);
  const kelimeler = acik.filter((w) => !ustte(w));
  const kelimelerUst = acik.filter(ustte);
  const olaylar = React.useMemo(() => sfxOlaylari(veri, sahneler.map((s) => s.sure), plan, dna.iskelet.gecis_kare), [veri, dna.tohum]);
  const hud = React.useMemo(() => hudParcalari(veri), [veri]);
  const lb = React.useMemo(() => letterboxParcalari(veri), [veri]);
  const ton = bolumTon(veri, fr);
  const icerik = (
    <AbsoluteFill style={{ background: '#000' }}>
      <FontYukle />
      <AbsoluteFill style={ton ? { filter: ton } : undefined}>
        <DnaDizi dna={dna} sahneler={sahneler} plan={plan} />
        {lb.map((p, j) => (
          <Sequence key={'lb' + j} from={p.bas} durationInFrames={p.son - p.bas}>
            <LetterboxKatman p={p} />
          </Sequence>
        ))}
      </AbsoluteFill>
      {hud.map((h, j) => (
        <Sequence key={'hud' + j} from={h.bas} durationInFrames={h.son - h.bas}>
          <DnaHud dna={dna} tip={h.istek.tip} deger={h.istek.deger} baslangic={h.istek.baslangic} birim={h.istek.birim} etiket={h.istek.etiket} ust={h.istek.ust} gec={h.gec} />
        </Sequence>
      ))}
      <DnaDoku dna={dna} />
      <DnaAltyazi dna={dna} kelimeler={kelimeler} />
      {kelimelerUst.length ? <DnaAltyazi dna={dna} kelimeler={kelimelerUst} konum="ust-ucte-bir" /> : null}
    </AbsoluteFill>
  );
  return (
    <>
      {dna.bitis ? <DnaBitis dna={dna} anlar={(veri.bolumler || []).slice(1).map((b) => b.bas)}>{icerik}</DnaBitis> : icerik}
      {sfx ? <DnaSfx dna={dna} olaylar={olaylar} klasor={sfxKlasor} /> : null}
    </>
  );
};
