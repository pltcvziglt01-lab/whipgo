import React from 'react';
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion';
import { rastgele } from './temel';
import KUTUPHANE from './sfx-kutuphane.json';

// SFX — kurgudaki OLAYLARDAN otomatik ses TASARIMI (elle yerlestirme yok). Kurallar: references/sfx.md
//  - Birlesik kutuphane (sfx-kutuphane.json): lisansli Adobe paketi (varlik/sfx, dagitilmaz) + CC0 (varlik/sfx-cc0). Her ses
//    etiketli: rol (havuz), ton, his, karakter (yumusak|sert, metalik|kagit|dijital|organik|hava, kisa|uzun). Ciddi/gizem tonda pop
//    ve mizah sesi hic secilmez.
//  - Video basina PALET: her havuzdan tondan 3-5 ses; tohum videonun "dokusunu" (malzeme tercihi) ve aileyi (Adobe/CC0) secer
//    -> her video ayni olaylarda baska ama kendi icinde tutarli ses dili. Ayni ses art arda calmaz; dakikada ayni ses en cok 2 kez
//    (yer yoksa SESSIZLIK — tek yumusak ses ya da hic).
//  - Sahne turune ozgu DAVRANIS (SFX_DAVRANIS): sayac (tik dizisi + son vurus), yazma (harf tiklari), liste-madde, grafik-cubuk
//    (perdesi yukselen tik), harita-rota (varista tepe yapan suzulme + varis vurusu), bolum (1-2 sn yukselme + alcak darbe), doruk
//    (once 1,2 sn sessizlik, sonra vurus), degisim (cizik), belge (kagit), foto (deklansor), glitch (yalniz enerjik).
//  - SENKRON: olculen tepe ani olay karesine oturur (degisim: ses basi; harita-rota: tepe varista); bastaki sessizlik kirpilir.
//  - SEVIYE: her sesin 100 ms K-yukseklik tepesi konusmanin (ayar.vo_ref_db; ffmpeg hattinda YEREL yatak, sfx_plan.py --yatak)
//    altina oturur: darbe 6-10, gecis 12-16, tik/pop/yazma 16-22 dB (ayar.sinif); ornek tepesi -3 dBFS'i asmaz.
//    Ton ofseti: sakin -1, enerjik +0,5 dB; dogal oynama +-0,5 dB.
//  - YOGUNLUK: tonla olceklenen dakika tavani + en kisa aralik; dizi olaylari tavanda 1 sayilir; carpismada oncelikli kalir,
//    vurus (doruk/bolum/vurgu) dizinin ustune binebilir.
// Olcumler: scripts/sfx_olc.py (json'daki `olcu`), ffmpeg hatti: scripts/sfx_plan.py (bu dosyanin birebir portu).
export type SfxTon = 'ciddi' | 'gizem' | 'enerjik' | 'sakin';
export type SfxRol = 'gecis' | 'kart' | 'sayi' | 'alinti' | 'vurgu' | 'altbant' | 'yukselme'
  | 'sayac' | 'yazma' | 'liste-madde' | 'grafik-cubuk' | 'harita-rota' | 'bolum' | 'doruk' | 'degisim' | 'belge' | 'foto' | 'glitch';
export type SfxHavuz = 'gecis' | 'kart' | 'sayi' | 'alinti' | 'vurgu' | 'altbant' | 'yukselme' | 'tik' | 'yazma' | 'liste' | 'cubuk'
  | 'suzulme' | 'varis' | 'bolum' | 'doruk' | 'cizik' | 'belge' | 'foto' | 'glitch';
/** kare: gorsel an (sesin tepesi buraya oturur). adet/aralik/sure dizi olaylari icin; aralik ve sure KARE cinsinden. */
export type SfxOlay = { kare: number; rol: SfxRol; adet?: number; aralik?: number; sure?: number };
export type SfxKayit = { rol: SfxHavuz[]; ton: SfxTon[]; his: string[]; kar: string[]; lisans: string; sn?: number; seri?: string[]; mizah?: boolean };
/** [bas sn, tepe sn, ornek tepesi dBFS, 100 ms RMS tepesi dBFS, sure sn, kanal] */
export type SfxOlcu = [number, number, number, number, number, number];
type Ayar = {
  vo_ref_db: number; seviye: Record<SfxHavuz, number>; ton_ofset: Record<SfxTon, number>; tepe_tavan_db: number; kazanc_tavan_db: number;
  oncelik: Record<SfxRol, number>; kuyruk: Record<SfxHavuz, number>; tavan: Record<SfxTon, number>; bosluk: Record<SfxTon, number>;
  dakika_ayni_ses: number; palet_adet: [number, number]; sik_havuz: SfxHavuz[]; oynama_db: number; doku: Record<SfxTon, string[]>; doruk_sessizlik: number; bolum_yukselme: Record<SfxTon, number>;
};
const K = KUTUPHANE as unknown as { ayar: Ayar; sesler: Record<string, SfxKayit>; olcu: Record<string, SfxOlcu> };
export const SFX_KUTUPHANE = K.sesler;
export const SFX_OLCU = K.olcu;
export const SFX_AYAR = K.ayar;
export const SFX_TONLARI: SfxTon[] = ['ciddi', 'gizem', 'enerjik', 'sakin'];
export const SFX_HAVUZLARI: SfxHavuz[] = ['gecis', 'kart', 'sayi', 'alinti', 'vurgu', 'altbant', 'yukselme', 'tik', 'yazma', 'liste', 'cubuk',
  'suzulme', 'varis', 'bolum', 'doruk', 'cizik', 'belge', 'foto', 'glitch'];
/** olay rolu -> caldigi havuzlar (sirasiyla) */
export const SFX_DAVRANIS: Record<SfxRol, SfxHavuz[]> = {
  gecis: ['gecis'], kart: ['kart'], sayi: ['sayi'], alinti: ['alinti'], vurgu: ['vurgu'], altbant: ['altbant'], yukselme: ['yukselme'],
  sayac: ['tik', 'sayi'], yazma: ['yazma'], 'liste-madde': ['liste'], 'grafik-cubuk': ['cubuk'], 'harita-rota': ['suzulme', 'varis'],
  bolum: ['yukselme', 'bolum'], doruk: ['doruk'], degisim: ['cizik'], belge: ['belge'], foto: ['foto'], glitch: ['glitch'],
};
export const SFX_ROLLERI = Object.keys(SFX_DAVRANIS) as SfxRol[];
const DIZI: SfxRol[] = ['sayac', 'yazma', 'liste-madde', 'grafik-cubuk', 'harita-rota'];

/** havuz + ton icin uygun adaylar (kutuphane sirasiyla). Ciddi/gizem: pop ve mizah yok; glitch yalniz enerjik. */
export const sfxAdaylari = (havuz: SfxHavuz, ton: SfxTon): string[] => Object.keys(SFX_KUTUPHANE).filter((d) => {
  const k = SFX_KUTUPHANE[d];
  if (!k.rol.includes(havuz) || !k.ton.includes(ton) || k.mizah) return false;
  if ((ton === 'ciddi' || ton === 'gizem') && k.kar.includes('pop')) return false;
  return havuz !== 'glitch' || ton === 'enerjik';
});

/** video paleti: her havuzdan 3-5 ses (sik olayli havuzlarda 5), etiket agirlikli (doku x2, aile x1,5, his eslesmesi x1,5) tohumlu secim */
export const sfxPaleti = (ton: SfxTon, tohum: string, his: string[] = []) => {
  const A = SFX_AYAR;
  const r = rastgele(tohum + 'sfxpalet');
  const doku = A.doku[ton][Math.floor(r() * 2)];
  const aile = r() < 0.5 ? 'adobe-basics' : 'CC0-1.0';
  const [amin, amax] = A.palet_adet;
  const palet = {} as Record<SfxHavuz, string[]>;
  for (const h of SFX_HAVUZLARI) {
    const aday = sfxAdaylari(h, ton);
    const n0 = amin + Math.floor(r() * (amax - amin + 1));
    const hedef = Math.min(aday.length, A.sik_havuz.includes(h) ? amax : n0);   // sik olayli havuz: dakikada <= 2 kuralina yer
    const w = aday.map((d) => {
      const k = SFX_KUTUPHANE[d];
      return (k.kar.includes(doku) ? 2 : 1) * (k.lisans === aile ? 1.5 : 1) * (his.some((x) => k.his.includes(x)) ? 1.5 : 1);
    });
    const kalan = aday.map((_, i) => i);
    const sec: string[] = [];
    while (sec.length < hedef) {
      let top = 0;
      for (const i of kalan) top += w[i];
      let x = r() * top;
      let j = 0;
      while (j < kalan.length - 1 && x >= w[kalan[j]]) { x -= w[kalan[j]]; j++; }
      sec.push(aday[kalan[j]]);
      kalan.splice(j, 1);
    }
    palet[h] = sec;
  }
  return { palet, doku, aile };
};

/** sesin dogrusal kazanci: 100 ms K-yukseklik tepesi -> ref (konusma yuksekligi, vars. vo_ref_db) + havuz seviyesi + ton ofseti
 *  (+ dbEk); ornek tepesi tavani (kanal basina) asmaz. */
export const sfxKazanc = (dosya: string, havuz: SfxHavuz, ton: SfxTon, dbEk = 0, ref = SFX_AYAR.vo_ref_db) => {
  const A = SFX_AYAR;
  const o = SFX_OLCU[dosya] ?? [0, 0.05, -6, -20, 1, 1];
  // o[3]: K-yukseklik (kanallar toplami) -> mono dosyanin stereoya -3 dB acilmasi yuksekligi degistirmez; ornek tepesi ise kanal basina -3 dB
  const mono = o[5] === 1 ? 3.01 : 0;
  const g = Math.min(ref + A.seviye[havuz] + (A.ton_ofset[ton] ?? 0) + dbEk - o[3], A.tepe_tavan_db - o[2] + mono, A.kazanc_tavan_db);
  return Math.pow(10, g / 20);
};

/** kes: sure kesin (doruk sessizligi kuyrugu kesti) -> zarf zorunlu */
/** an: sesin oturdugu GORSEL olay karesi (hiza 'tepe': tepe ani, 'bas': ses basi) — sfx_kontrol.py yerlesimi buna gore olcer */
export type SfxYerlesim = { kare: number; dosya: string; sure: number; ses: number; rol: SfxRol; havuz: SfxHavuz; kirp: number; an: number; hiza: 'tepe' | 'bas'; kes?: boolean };

/** tek sesi yerlestir. hiza 'tepe': olculen tepe `an`a; 'bas': ses basi `an`a. azamiOn: tepeden onceki en uzun sure (sn; riser'in
 *  basi kirpilir). azamiSure: en uzun calma (sn). kirp/sure/kare KARE cinsinden. */
const yerlestir = (dosya: string, havuz: SfxHavuz, rol: SfxRol, an: number, hiza: 'tepe' | 'bas', fps: number, ses: number,
  sn: number | undefined, azamiOn?: number, azamiSure?: number): SfxYerlesim => {
  const [bas, tepe, , , dsure] = SFX_OLCU[dosya] ?? [0, 0.05, -6, -20, 1, 1];
  const son = Math.min(sn ?? dsure, dsure || (sn ?? 1));
  let kirp = Math.max(0, bas - 0.04);
  if (hiza === 'tepe' && azamiOn !== undefined && tepe - kirp > azamiOn) kirp = Math.max(kirp, tepe - azamiOn);
  let kirpK = Math.round(kirp * fps);
  const vurusK = hiza === 'tepe' ? Math.round(tepe * fps) - kirpK : Math.round(bas * fps) - kirpK;
  let sure = Math.round(Math.min(son - kirpK / fps, (tepe - kirpK / fps) + SFX_AYAR.kuyruk[havuz], azamiSure ?? 1e9) * fps);
  let kare = an - Math.max(0, vurusK);
  if (kare < 0) { kirpK -= kare; sure += kare; kare = 0; }
  return { kare, dosya, sure: Math.max(4, sure), ses, rol, havuz, kirp: kirpK, an, hiza };
};

const dizi = (rol: SfxRol) => DIZI.includes(rol);
/** olayin kapladigi pencere (kare): [kare - on, kare + arka) */
const kapsam = (o: SfxOlay, fps: number, ton: SfxTon) => {
  let on = 0, arka = 0;
  if (o.rol === 'sayac') arka = o.sure ?? (o.adet && o.aralik ? o.adet * o.aralik : Math.round(fps * 1.2));
  else if (o.rol === 'yazma') arka = (o.adet ?? 12) * (o.aralik ?? 2);
  else if (o.rol === 'liste-madde' || o.rol === 'grafik-cubuk') arka = o.adet && o.adet > 1 ? (o.adet - 1) * (o.aralik ?? Math.round(fps * (o.rol === 'liste-madde' ? 0.5 : 0.25))) : 0;
  else if (o.rol === 'harita-rota') arka = o.sure ?? Math.round(fps * 1.5);
  else if (o.rol === 'bolum') on = Math.round(fps * SFX_AYAR.bolum_yukselme[ton]);
  else if (o.rol === 'doruk') on = Math.round(fps * SFX_AYAR.doruk_sessizlik);
  return [on, arka];
};

/** doruk olaylarinin sessizlik pencereleri (kare) — muzik kismak icin */
export const sfxSessizlikleri = (olaylar: SfxOlay[], fps: number) =>
  olaylar.filter((o) => o.rol === 'doruk').map((o) => ({ bas: Math.max(0, o.kare - Math.round(fps * SFX_AYAR.doruk_sessizlik)), son: o.kare }));

/** olaylardan yerlesim plani. Deterministik (tohum). secenek.his: videonun gorsel his etiketleri (etiketler.json) -> ses agirligi */
export const sfxPlani = (olaylar: SfxOlay[], ton: SfxTon, tohum: string, fps: number, sfxOrani = 0.5, secenek: { his?: string[] } = {}): SfxYerlesim[] => {
  const A = SFX_AYAR;
  if (!SFX_TONLARI.includes(ton)) ton = 'ciddi';
  const r = rastgele(tohum + 'sfx');
  const { palet } = sfxPaleti(ton, tohum, secenek.his || []);
  const ON = A.oncelik;
  const esik = Math.max(0.15, Math.min(0.9, sfxOrani));
  const aday = olaylar
    .filter((o) => ON[o.rol] !== undefined && (o.rol !== 'glitch' || ton === 'enerjik') && (o.rol !== 'gecis' || r() < esik))
    .map((o, i) => ({ o, i }))
    .sort((a, b) => a.o.kare - b.o.kare || ON[b.o.rol] - ON[a.o.rol] || a.i - b.i)
    .map((x) => x.o);
  // 1. carpisma: kaplanan pencereler cakisirsa oncelikli kalir; vurus (oncelik >= 5) dizinin ustune binebilir
  const bosluk = Math.round(fps * A.bosluk[ton]);
  const kalan: SfxOlay[] = [];
  for (const o of aday) {
    const [on, arka] = kapsam(o, fps, ton);
    const a0 = o.kare - on, a1 = o.kare + Math.max(bosluk, arka);
    let at = false;
    for (let j = kalan.length - 1; j >= 0 && !at; j--) {
      const k = kalan[j];
      if (k.kare < o.kare - fps * 90) break;
      const [kon, karka] = kapsam(k, fps, ton);
      const b0 = k.kare - kon, b1 = k.kare + Math.max(bosluk, karka);
      if (a0 >= b1 || b0 >= a1) continue;
      if ((ON[o.rol] >= 5 && dizi(k.rol)) || (ON[k.rol] >= 5 && dizi(o.rol))) continue;
      if (ON[o.rol] > ON[k.rol]) kalan.splice(j, 1);
      else at = true;
    }
    if (!at) kalan.push(o);
  }
  // 2. dakika tavani (tonla): her 60 sn'lik pencerede oncelige gore kirp (dizi = 1 olay)
  const pencere = fps * 60, tavan = A.tavan[ton];
  const sonuc: SfxOlay[] = [];
  const sonKare = kalan.length ? kalan[kalan.length - 1].kare : 0;
  for (let p = 0; p <= sonKare; p += pencere) {
    const g = kalan.filter((o) => o.kare >= p && o.kare < p + pencere);
    const tut = new Set([...g].sort((a, b) => ON[b.rol] - ON[a.rol]).slice(0, tavan));
    sonuc.push(...g.filter((o) => tut.has(o)));
  }
  // 3. ses secimi: havuz paletinde sirayla; ayni ses art arda yok, dakikada <= dakika_ayni_ses
  const sira: Partial<Record<SfxHavuz, number>> = {};
  const sonHavuz: Partial<Record<SfxHavuz, string>> = {};
  let sonGenel = '';
  const kullanim: Record<string, number[]> = {};
  const sec = (h: SfxHavuz, kare: number): string | null => {
    const liste = palet[h] || [];
    const s0 = sira[h] ?? 0;
    for (let d = 0; d < liste.length; d++) {
      const s = liste[(s0 + d) % liste.length];
      if (liste.length > 1 && (s === sonHavuz[h] || s === sonGenel)) continue;
      if ((kullanim[s] || []).filter((x) => kare - x < pencere).length >= A.dakika_ayni_ses) continue;
      sira[h] = (s0 + d + 1) % liste.length;
      sonHavuz[h] = s;
      sonGenel = s;
      (kullanim[s] = kullanim[s] || []).push(kare);
      return s;
    }
    return null;
  };
  const out: SfxYerlesim[] = [];
  const jit = () => (r() - 0.5) * 2 * A.oynama_db;
  const ekle = (d: string | null, h: SfxHavuz, rol: SfxRol, an: number, dbEk = 0, hiza: 'tepe' | 'bas' = 'tepe', sn?: number, azamiOn?: number, azamiSure?: number) => {
    if (!d) return;
    out.push(yerlestir(d, h, rol, an, hiza, fps, sfxKazanc(d, h, ton, dbEk + jit()), sn ?? SFX_KUTUPHANE[d]?.sn, azamiOn, azamiSure));
  };
  for (const o of sonuc) {
    const rol = o.rol;
    if (rol === 'sayac') {
      const sure = kapsam(o, fps, ton)[1];
      const n = Math.max(2, Math.min(24, o.adet ?? Math.round(sure / (fps * 0.12))));
      const t: number[] = [];
      for (let i = 0; i < n; i++) t.push(o.kare + (o.aralik ? i * o.aralik : Math.round(sure * (1 - Math.pow(1 - i / n, 1 / 3)))));
      const tk: number[] = [];
      for (const x of t) if (!tk.length || x - tk[tk.length - 1] >= 2) tk.push(x);
      const a = sec('tik', o.kare), b = sec('tik', o.kare);
      tk.forEach((x, i) => ekle(i % 2 && b ? b : a, 'tik', rol, x, -2 + (2 * i) / Math.max(1, tk.length - 1)));
      ekle(sec('sayi', o.kare + sure), 'sayi', rol, o.kare + sure);
    } else if (rol === 'yazma') {
      const n = Math.min(60, o.adet ?? 12), ar = o.aralik ?? 2, adim = Math.max(1, Math.ceil(2 / ar));
      const ss = [sec('yazma', o.kare), sec('yazma', o.kare), sec('yazma', o.kare)].filter((x): x is string => !!x);
      let m = 0;
      for (let i = 0; i < n && m < 40; i += adim, m++) ekle(ss.length ? ss[m % ss.length] : null, 'yazma', rol, o.kare + Math.round(i * ar), jit());
    } else if (rol === 'liste-madde') {
      const n = Math.max(1, o.adet ?? 1), ar = o.aralik ?? Math.round(fps * 0.5);
      for (let i = 0; i < n; i++) ekle(sec('liste', o.kare + i * ar), 'liste', rol, o.kare + i * ar);
    } else if (rol === 'grafik-cubuk') {
      const n = Math.max(1, o.adet ?? 1), ar = o.aralik ?? Math.round(fps * 0.25);
      const taban = sec('cubuk', o.kare);
      if (taban) {
        const seri = SFX_KUTUPHANE[taban].seri || [taban];
        for (let i = 0; i < n; i++) ekle(seri[Math.min(i, seri.length - 1)], 'cubuk', rol, o.kare + i * ar, 0.4 * i, 'tepe', SFX_KUTUPHANE[taban].sn);
      }
    } else if (rol === 'harita-rota') {
      const sure = kapsam(o, fps, ton)[1], varis = o.kare + sure;
      ekle(sec('suzulme', o.kare), 'suzulme', rol, varis, 0, 'tepe', undefined, sure / fps);
      ekle(sec('varis', varis), 'varis', rol, varis);
    } else if (rol === 'bolum') {
      ekle(sec('yukselme', o.kare), 'yukselme', rol, o.kare, 0, 'tepe', undefined, A.bolum_yukselme[ton]);
      ekle(sec('bolum', o.kare), 'bolum', rol, o.kare);
    } else if (rol === 'degisim') {
      ekle(sec('cizik', o.kare), 'cizik', rol, o.kare, 0, 'bas', undefined, undefined, o.sure ? o.sure / fps + 0.3 : undefined);
    } else {
      const h = SFX_DAVRANIS[rol][0];
      ekle(sec(h, o.kare), h, rol, o.kare);
    }
  }
  // 4. doruk oncesi sessizlik: penceredeki baska sesler silinir, oncesinden tasan kuyruk kesilir
  for (const w of sfxSessizlikleri(sonuc, fps)) {
    for (let i = out.length - 1; i >= 0; i--) {
      const p = out[i];
      if (p.rol === 'doruk' || p.kare >= w.son || p.kare + p.sure <= w.bas) continue;
      if (p.kare >= w.bas) out.splice(i, 1);
      else { p.sure = Math.max(4, w.bas - p.kare); p.kes = true; }
    }
  }
  return out.sort((a, b) => a.kare - b.kare);
};

/** Remotion render'i kare kare degisen seviyeyi 1/97 adimlara yuvarlar (renderer round-volume-to-avoid-stack-overflow): 0,05'lik
 *  kazancta +-1 dB, 0,005 altinda sessizlik. Bu esigin altinda zarf yerine SABIT (tam) seviye calinir; ses o zaman dogal
 *  kuyruguyla (dosya/sn sonuna kadar) biter, kesilmez. */
export const SFX_ZARF_ESIK = 0.12;
/** sesin gercekte calinacagi sure (kare): zarfsiz (dusuk kazanc) seste dogal kuyruk; zarfli seste plan suresi */
export const sfxCalmaSuresi = (s: SfxYerlesim, fps: number, genelSes = 1) => {
  if (s.kes || s.ses * genelSes >= SFX_ZARF_ESIK) return s.sure;
  const [, , , , dsure] = SFX_OLCU[s.dosya] ?? [0, 0, 0, 0, s.sure / fps, 1];
  const sn = SFX_KUTUPHANE[s.dosya]?.sn ?? dsure;
  return Math.max(s.sure, Math.round((Math.min(sn, dsure) * fps) - s.kirp));
};

/** ses dosyanin (ya da sn'nin) dogal sonuna kadar caliyor mu: o zaman kesik yok, cikis yumusamasi gerekmez */
export const sfxDogalSon = (s: SfxYerlesim, sure: number, fps: number) => {
  if (s.kes) return false;
  const dsure = (SFX_OLCU[s.dosya] ?? [0, 0, 0, 0, 0, 1])[4];
  return (s.kirp + sure) / fps >= dsure - 0.05;
};

/** yerlesim planini calar. klasor: public altindaki varlik koku (dosya yollari ona gore: sfx/..., sfx-cc0/...).
 *  Eski cagrilar ('varlik/sfx') desteklenir. Zarf (kazanc >= SFX_ZARF_ESIK): 1 karelik giris (kirpilmis seste), sonda <= 0,25 sn cikis (ses kesiliyorsa). */
export const SfxKatmani: React.FC<{ plan: SfxYerlesim[]; klasor?: string; genelSes?: number }> = ({ plan, klasor = 'varlik', genelSes = 1 }) => {
  const { fps } = useVideoConfig();
  const kok = klasor.replace(/\/sfx\/?$/, '');
  return (
    <>
      {plan.map((s, i) => {
        const ses = s.ses * genelSes;
        const sure = sfxCalmaSuresi(s, fps, genelSes);
        const kapanis = Math.max(1, Math.min(Math.round(fps * 0.25), Math.floor(sure * 0.3), sure - 2));
        const giris = s.kirp > 0 ? 0.25 : 1;
        const son = sfxDogalSon(s, sure, fps) ? 1 : 0;   // dosyanin kendi sonuna kadar calan seste cikis yumusamasi yok (riser tepesi sonda)
        return (
          <Sequence key={i} from={s.kare} durationInFrames={sure} layout="none">
            <Audio src={staticFile(`${kok}/${s.dosya}`)} trimBefore={s.kirp}
              volume={ses < SFX_ZARF_ESIK && !s.kes ? ses : (f) => ses * interpolate(f, [0, 1, sure - kapanis, sure], [giris, 1, 1, son], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
          </Sequence>
        );
      })}
    </>
  );
};
