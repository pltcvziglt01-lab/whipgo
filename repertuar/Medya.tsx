import React, { useMemo } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arkaplan, ArkaplanTip } from './Arkaplan';
import { DEKLANSOR, Stil, YAY_SURE, egri, fbm, kameraNefes, rastgele, rgba, sinirla, yay } from './temel';
import { ZamanBulanik } from './Hareket';

// ---------------- KAMERA (gorsel/klip icindeki hareket) ----------------
// klasik Claude = her fotoda 'ken-burns-ice' 1.05 + 0.015/sn. Repertuar karistirir; stil_dna 2-3 tip secer.
// KAMERA HIC DURMAZ (Opus galerisi A-3): 'sabit' bile 1,00 -> 1,02 nefes alir (temel.ts kameraNefes); Medya'ya kamera
// verilmezse tutusta yavas itme (foto 1,00 -> 1,05, hareketli video 1,00 -> 1,03). Gercekten durgun medya yalniz nefes={0}
// ile (medyayi kendisi hareket ettiren kapsayici icin: sayi karti zemini).
// olcek-yolculugu (Opus galerisi, 12 video): tek kesintisiz LOG OLCEK uzaklasma. Hiz log uzayda sabit (nesne her esit surede
// ayni oranda kuculur): foto 1,6 -> 1,0, video VIDEO_KB_ENCOK -> 1,0; sahne suresinin (Sequence) sonunda tam 1'e varir.
// Cok bolgeli 'powers of ten' yolculugu (bolge adi + olcek okumasi) icin OlcekYolculugu bileseni.
export const KAMERA_TIPLERI = ['sabit', 'ken-burns-ice', 'ken-burns-disa', 'pan-sol', 'pan-sag', 'pan-yukari', 'el-kamerasi', 'zoom-darbe', 'dolly-egik', 'paralaks-cift', 'olcek-yolculugu'] as const;
export type KameraTip = typeof KAMERA_TIPLERI[number];
/** nefes/itme genligi: 'sabit' kilit kare, kamera verilmemis foto / video (video itmesi abartilmaz, ust sinir VIDEO_ENCOK) */
export const NEFES = { sabit: 0.02, foto: 0.05, video: 0.03 } as const;
const VIDEO_ENCOK = 0.04;

/** hareketli VIDEO kaynakta acikca secilen Ken Burns tiplerinin (ken-burns-ice/disa, pan-*, dolly-egik) olcek tavani: klip zaten
 *  hareketli ve cozunurlugu foto kadar yuksek degil; 1,2'ye buyutmek pikseli acar ve iki hareket ust uste biner. Foto degerleri aynen. */
export const VIDEO_KB_ENCOK = 1.08;
/** 0 -> 1'e asimptotik yaklasim (tau sn): kamera hic durmaz ama tavani hic gecmez */
const yaklas = (T: number, tau: number) => 1 - Math.exp(-Math.max(0, T) / tau);
/** video Ken Burns: olcek <= VIDEO_KB_ENCOK; pan genligi kenar acilmayacak kadar (|x| <= 50 (s-1)/s %), dolly egimi +-1,2 derece
 *  (1,2 derece donmeyi ortmek icin 1,037 olcek yeter; 1,06'dan baslar) */
const videoKB = (tip: KameraTip, T: number, D = 6) => {
  const E = VIDEO_KB_ENCOK, A = 50 * (E - 1) / E - 0.3;   // ~3,4 %
  switch (tip) {
    case 'olcek-yolculugu': return { s: Math.pow(E, 1 - sinirla(T / Math.max(0.5, D))), x: 0, y: 0, r: 0 };
    case 'ken-burns-ice': return { s: 1.01 + (E - 1.01) * yaklas(T, 4.5), x: 0, y: 0, r: 0 };
    case 'ken-burns-disa': return { s: E - (E - 1.02) * yaklas(T, 4.5), x: 0, y: 0, r: 0 };
    case 'pan-sol': return { s: E, x: A * (1 - 2 * yaklas(T, 3.5)), y: 0, r: 0 };
    case 'pan-sag': return { s: E, x: -A * (1 - 2 * yaklas(T, 3.5)), y: 0, r: 0 };
    case 'pan-yukari': return { s: E, x: 0, y: A * (1 - 2 * yaklas(T, 3.5)), r: 0 };
    case 'dolly-egik': return { s: 1.06 + (E - 1.06) * yaklas(T, 4), x: 0, y: 0, r: -1.2 + 2.4 * yaklas(T, 4) };
    default: return null;
  }
};

// kamera durumu sayisal: CSS sirasi scale(s) translate(x y) rotate(r); x/y birimi '%' (ogenin boyu) ya da 'px'.
type KameraDurum = { s: number; x: number; y: number; birim: '%' | 'px'; r: number };
const kameraDurum = (tip: KameraTip, t: number, f: number, tohum: string, hiz = 1, nefes: number = NEFES.sabit, video = false, D = 6): KameraDurum => {
  const T = t * hiz;
  const d = (s: number, x = 0, y = 0, birim: '%' | 'px' = '%', r = 0): KameraDurum => ({ s, x, y, birim, r });
  if (video) { const v = videoKB(tip, T, D); if (v) return d(v.s, v.x, v.y, '%', v.r); }
  switch (tip) {
    // log olcek: s = S0^(1 - T/D) -> esit surede esit oranda kuculme, D (sahne suresi) sonunda 1
    case 'olcek-yolculugu': return d(Math.pow(1.6, 1 - sinirla(T / Math.max(0.5, D))));
    case 'sabit': return d(kameraNefes(T, nefes));
    case 'ken-burns-ice': return d(1.04 + 0.035 * T);
    case 'ken-burns-disa': return d(Math.max(1.02, 1.22 - 0.035 * T));
    case 'pan-sol': return d(1.18, 6 - 2.2 * T);
    case 'pan-sag': return d(1.18, -6 + 2.2 * T);
    case 'pan-yukari': return d(1.2, 0, 6 - 2 * T);
    case 'el-kamerasi': { const h = tohum.length; return d(1.08, fbm(T * 0.9, h, 1) * 14, fbm(h, T * 0.9, 2) * 10, 'px', fbm(T * 0.5, 3, h) * 0.6); }
    // darbe kesimde baslar, kamera yayi (kritik, asimsiz) ile YAY_SURE.kamera (0,6 sn) icinde oturur: ogelerden yavas (galeri A-3/A-6)
    case 'zoom-darbe': return d(1.25 - 0.17 * yay(sinirla(t / YAY_SURE.kamera), 1) + 0.012 * T);
    case 'dolly-egik': return d(1.1 + 0.02 * T, 0, 0, '%', -1.2 + 0.5 * T);
    default: return d(1);
  }
};
const kameraCss = (k: KameraDurum) =>
  `scale(${k.s.toFixed(5)})${k.x || k.y ? ` translate(${k.x}${k.birim}, ${k.y}${k.birim})` : ''}${k.r ? ` rotate(${k.r}deg)` : ''}`;
/** iki kamera durumu arasinda ogenin koselerinin en buyuk ekran kaymasi (px); W/H = oge boyu (kompozisyon boyu ust sinir) */
const kameraKayma = (a: KameraDurum, b: KameraDurum, W: number, H: number) => {
  const nokta = (k: KameraDurum, px: number, py: number) => {
    const rr = (k.r * Math.PI) / 180, c = Math.cos(rr), sn = Math.sin(rr);
    const tx = k.birim === '%' ? (k.x / 100) * W : k.x, ty = k.birim === '%' ? (k.y / 100) * H : k.y;
    return [k.s * (c * px - sn * py + tx), k.s * (sn * px + c * py + ty)];
  };
  let m = 0;
  for (const [px, py] of [[-W / 2, -H / 2], [W / 2, -H / 2], [-W / 2, H / 2], [W / 2, H / 2], [0, 0]]) {
    const [x1, y1] = nokta(a, px, py), [x2, y2] = nokta(b, px, py);
    m = Math.max(m, Math.hypot(x2 - x1, y2 - y1));
  }
  return m;
};

export type MedyaKaynak = { src: string; video?: boolean; bas?: number; derece?: string };
const Ham: React.FC<{ m: MedyaKaynak; style?: React.CSSProperties }> = ({ m, style }) => {
  const { fps } = useVideoConfig();
  const st: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', filter: m.derece, ...style };
  const src = m.src.startsWith('http') ? m.src : staticFile(m.src);
  return m.video ? <OffthreadVideo muted src={src} startFrom={Math.round((m.bas || 0) * fps)} style={st} /> : <Img src={src} style={st} />;
};

/** kamera verilmezse yavas itme (foto NEFES.foto, video NEFES.video); kamera='sabit' -> NEFES.sabit nefes.
 *  nefes: sabit/varsayilan genligi elle (0 = tamamen durgun; yalniz medyayi kendisi hareket ettiren kapsayicida). */
export const Medya: React.FC<{ m: MedyaKaynak; kamera?: KameraTip; hiz?: number; tohum?: string; nefes?: number }> = ({ m, kamera: kameraVerilen, hiz = 1, tohum = 'k', nefes }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames } = useVideoConfig();
  const t = f / fps;
  const kamera: KameraTip = kameraVerilen ?? 'sabit';
  const g0 = nefes ?? (kameraVerilen === undefined ? (m.video ? NEFES.video : NEFES.foto) : NEFES.sabit);
  const genlik = m.video ? Math.min(g0, VIDEO_ENCOK) : g0;
  if (kamera === 'paralaks-cift') {
    // sahte 2.5B: arkada bulanik buyuk kopya yavas, onde keskin kopya hizli ve hafif maskeli
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transform: `scale(1.3) translateX(${-1 * t}%)`, filter: 'blur(14px) brightness(0.8)' }}><Ham m={m} /></AbsoluteFill>
        <AbsoluteFill style={{ transform: `scale(${1.06 + 0.03 * t}) translateX(${2 - 1.8 * t}%)`, WebkitMaskImage: 'radial-gradient(ellipse 75% 85% at 50% 50%, #000 60%, transparent 100%)' }}><Ham m={m} /></AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // hareket bulanikligi: kamera durumu deklansor araliginda (180 derece) orneklenir; yavas kamerada (kayma < 2 px) tek katman
  const durum = (dt: number) => kameraDurum(kamera, (f + dt) / fps, f + dt, tohum, hiz, genlik, !!m.video, durationInFrames / fps);
  if (kamera === 'sabit' && genlik <= 0) return <AbsoluteFill style={{ overflow: 'hidden' }}><Ham m={m} /></AbsoluteFill>;
  const boy = kameraKayma(durum(-DEKLANSOR / 2), durum(DEKLANSOR / 2), W, H);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <ZamanBulanik boy={boy} donusum={(dt) => kameraCss(durum(dt))}><Ham m={m} /></ZamanBulanik>
    </AbsoluteFill>
  );
};

// ---------------- CERCEVE / DUZEN ----------------
// 'tam' disindaki her duzen arkada ANIMASYONLU arka plan kullanir (duz renk degil).
// odak-karartma: Opus galerisi (envanter/opus-galeri/teknikler.json, 8 video) — odak tasinirken eski ogeler silinmez, %40'a kararir
export const CERCEVE_TIPLERI = ['tam', 'inset-golge', 'bulanik-kopya', 'polaroid', 'tv-crt', 'letterbox', 'pencere', 'film-seridi', 'bolunmus', 'kolaj', 'yuvarlak-yan', 'altin-cerceve',
  'odak-karartma'] as const;
export type CerceveTip = typeof CERCEVE_TIPLERI[number];

/** odak-karartma tek medyada varsayilan odak penceresi [x, y, gen, yuk] (0..1): ortadaki dikey pencere (konu cogu kez ortada) */
export const ODAK_PENCERE: [number, number, number, number] = [0.32, 0.12, 0.36, 0.76];
/** cerceve tipinde ana medyanin kadrajdaki kutusu [x, y, gen, yuk] (0..1, 1920x1080 duzeni; Cerceve ile ayni olculer) */
export const cerceveKutu = (tip: CerceveTip, odak?: [number, number, number, number]): [number, number, number, number] => {
  const W = 1920, H = 1080;
  switch (tip) {
    case 'inset-golge': return [0.12, 0.11, 0.76, 0.78];
    case 'bulanik-kopya': { const w = (H * 0.86 * 1.2) / W; return [(1 - w) / 2, 0.07, w, 0.86]; }
    case 'polaroid': return [0.27 + 26 / W, 0.08 + 26 / H, 0.46 - 52 / W, 0.84 - 146 / H];
    case 'tv-crt': return [0.17 + 40 / W, 0.1 + 40 / H, 0.66 - 80 / W, 0.8 - 80 / H];
    case 'letterbox': return [0, 0.12, 1, 0.76];
    case 'pencere': return [0.14, 0.1 + 54 / H, 0.72, 0.8 - 54 / H];
    case 'film-seridi': return [0, 90 / H, 1, (H - 180) / H];
    case 'bolunmus': return [60 / W, 60 / H, (W / 2 - 75) / W, (H - 120) / H];
    case 'kolaj': return [0.05, 0.08, 0.5, 0.84];
    case 'yuvarlak-yan': return [0.5, 0.12, (H * 0.76) / W, 0.76];
    case 'altin-cerceve': return [0.2, 0.13, 0.6, 0.74];
    case 'odak-karartma': return odak || ODAK_PENCERE;
    default: return [0, 0, 1, 1];
  }
};
/** cercevenin optik merkezi (0..1): ana medya kutusunun yatay ortasi, dikeyde geometrik merkezin biraz ustu (%46) —
 *  nesne-dalisi gecisi, kart/etiket yoksa buraya dalar */
export const cerceveOdak = (tip: CerceveTip, odak?: [number, number, number, number]): [number, number] => {
  const [x, y, w, h] = cerceveKutu(tip, odak);
  return [x + w / 2, y + h * 0.46];
};

/** odak: odak-karartma'nin tek medyada parlak kalan alani [x, y, gen, yuk] (0..1); verilmezse ODAK_PENCERE */
/** ofset: ayni cerceve art arda gelen cekimlerde blok basindan beri gecen kare (VideoDna). Giris animasyonu yalniz blogun ilk
 *  cekiminde oynar, film seridi / isik gibi periyodik hareketler cekim sinirinda sicramaz. */
export const Cerceve: React.FC<{ tip: CerceveTip; m: MedyaKaynak; m2?: MedyaKaynak; m3?: MedyaKaynak; kamera?: KameraTip; hiz?: number; stil: Stil; arkaplan?: ArkaplanTip; etiket?: string; tohum?: string; odak?: [number, number, number, number]; ofset?: number }> = ({ tip, m, m2, m3, kamera, hiz = 1, stil, arkaplan = 'gradyan-akis', etiket, tohum = 'c', odak, ofset = 0 }) => {
  const f = useCurrentFrame() + ofset;
  const { fps, width: W, height: H } = useVideoConfig();
  const t = f / fps;
  const { palet, font } = stil;
  const ap = <Arkaplan tip={arkaplan} stil={stil} tohum={tohum} />;
  // kamera verilmezse Medya'nin varsayilani (yavas itme) gecerli
  const md = (x: MedyaKaynak, k: KameraTip | undefined = kamera) => <Medya m={x} kamera={k} hiz={hiz} tohum={tohum} />;
  const kutu = (l: number, tp: number, w: number, h: number, ic: React.ReactNode, ek: React.CSSProperties = {}) => (
    <div style={{ position: 'absolute', left: l, top: tp, width: w, height: h, overflow: 'hidden', ...ek }}>{ic}</div>
  );
  const giris = sinirla(f / 14);
  switch (tip) {
    case 'tam': return md(m);
    case 'inset-golge':
      return <AbsoluteFill>{ap}{kutu(W * 0.12, H * 0.11, W * 0.76, H * 0.78, md(m), { borderRadius: 28, boxShadow: `0 50px 120px ${rgba('#000', 0.45)}`, transform: `scale(${0.96 + 0.04 * giris})` })}</AbsoluteFill>;
    case 'bulanik-kopya':
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ filter: 'blur(40px) brightness(0.7) saturate(1.3)', transform: 'scale(1.2)' }}><Ham m={m} /></AbsoluteFill>
          {kutu((W - H * 0.86 * 1.2) / 2, H * 0.07, H * 0.86 * 1.2, H * 0.86, md(m), { boxShadow: `0 30px 90px ${rgba('#000', 0.5)}` })}
        </AbsoluteFill>
      );
    case 'polaroid': {
      const rot = -4 + 2 * Math.sin(t * 0.4);
      return (
        <AbsoluteFill>{ap}
          <div style={{ position: 'absolute', left: W * 0.27, top: H * 0.08, width: W * 0.46, height: H * 0.84, background: '#fbfaf6', padding: '26px 26px 120px', boxSizing: 'border-box', boxShadow: `0 40px 90px ${rgba('#000', 0.45)}`, transform: `rotate(${rot}deg) translateY(${(1 - giris) * 80}px)` }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{md(m)}</div>
            {etiket ? <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontFamily: font.mono, fontWeight: font.monoAgirlik, fontSize: 38, color: '#333' }}>{etiket}</div> : null}
          </div>
        </AbsoluteFill>
      );
    }
    case 'tv-crt':
      return (
        <AbsoluteFill>{ap}
          <div style={{ position: 'absolute', left: W * 0.17, top: H * 0.1, width: W * 0.66, height: H * 0.8, borderRadius: 60, background: '#1a1a1a', padding: 40, boxShadow: `0 40px 100px ${rgba('#000', 0.6)}, inset 0 0 0 6px #2b2b2b` }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 46, overflow: 'hidden', position: 'relative', filter: 'saturate(1.3) contrast(1.1)' }}>
              {md(m)}
              <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, ${rgba('#000', 0.3)} 0 2px, transparent 2px 4px)` }} />
              <AbsoluteFill style={{ boxShadow: `inset 0 0 120px ${rgba('#000', 0.8)}`, borderRadius: 46 }} />
            </div>
          </div>
        </AbsoluteFill>
      );
    case 'letterbox': {
      const b = H * 0.12 * giris;
      return <AbsoluteFill style={{ background: '#000' }}>{md(m)}<div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: b, background: '#000' }} /><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: b, background: '#000' }} /></AbsoluteFill>;
    }
    case 'pencere':
      return (
        <AbsoluteFill>{ap}
          <div style={{ position: 'absolute', left: W * 0.14, top: H * 0.1, width: W * 0.72, height: H * 0.8, borderRadius: 18, overflow: 'hidden', boxShadow: `0 40px 100px ${rgba('#000', 0.45)}`, background: palet.acik ? '#fff' : '#1b1d22', transform: `translateY(${(1 - giris) * 60}px)` }}>
            <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', background: palet.acik ? '#ece9e2' : '#26292f' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
              <div style={{ marginLeft: 20, fontFamily: font.mono, fontWeight: Math.max(600, font.monoAgirlik), fontSize: 28, color: palet.soluk, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{etiket || ''}</div>
            </div>
            <div style={{ position: 'absolute', top: 54, left: 0, right: 0, bottom: 0 }}>{md(m)}</div>
          </div>
        </AbsoluteFill>
      );
    case 'film-seridi': {
      const kay = (t * 60) % 90;
      const delik = (y: number) => <div style={{ position: 'absolute', left: 0, right: 0, top: y, height: 70, background: '#0c0c0c', backgroundImage: `repeating-linear-gradient(90deg, transparent 0 24px, #e8e2d0 24px 54px, transparent 54px 90px)`, backgroundSize: '90px 34px', backgroundRepeat: 'repeat-x', backgroundPosition: `${-kay}px 18px` }} />;
      return <AbsoluteFill style={{ background: '#0c0c0c' }}>{kutu(0, 90, W, H - 180, md(m), { filter: 'sepia(0.25) contrast(1.05)' })}{delik(10)}{delik(H - 80)}</AbsoluteFill>;
    }
    case 'bolunmus':
      return <AbsoluteFill>{ap}{kutu(60, 60, W / 2 - 75, H - 120, md(m), { borderRadius: 18, transform: `translateX(${(1 - giris) * -120}px)` })}{kutu(W / 2 + 15, 60, W / 2 - 75, H - 120, md(m2 || m, 'ken-burns-disa'), { borderRadius: 18, transform: `translateX(${(1 - giris) * 120}px)` })}</AbsoluteFill>;
    case 'kolaj': {
      const g = (i: number) => sinirla((f - i * 5) / 12);
      return (
        <AbsoluteFill>{ap}
          {kutu(W * 0.05, H * 0.08, W * 0.5, H * 0.84, md(m), { borderRadius: 10, transform: `rotate(-2deg) scale(${0.9 + 0.1 * g(0)})`, opacity: g(0), boxShadow: `0 30px 70px ${rgba('#000', 0.4)}` })}
          {kutu(W * 0.58, H * 0.06, W * 0.37, H * 0.42, md(m2 || m, 'pan-sag'), { borderRadius: 10, transform: `rotate(2deg) scale(${0.9 + 0.1 * g(1)})`, opacity: g(1), boxShadow: `0 30px 70px ${rgba('#000', 0.4)}` })}
          {kutu(W * 0.6, H * 0.52, W * 0.35, H * 0.42, md(m3 || m2 || m, 'ken-burns-disa'), { borderRadius: 10, transform: `rotate(-1deg) scale(${0.9 + 0.1 * g(2)})`, opacity: g(2), boxShadow: `0 30px 70px ${rgba('#000', 0.4)}` })}
        </AbsoluteFill>
      );
    }
    case 'yuvarlak-yan':
      return <AbsoluteFill>{ap}{kutu(W * 0.5, H * 0.12, H * 0.76, H * 0.76, md(m), { borderRadius: '50%', border: `10px solid ${palet.vurgu}`, transform: `scale(${0.8 + 0.2 * giris})` })}</AbsoluteFill>;
    case 'altin-cerceve': {
      // arsiv fotografi neredeyse siyah zeminde, egimli (bevel) altin cercevede; cerceve uzerinden yavas isik gecer
      const altin = ['#6e5122', '#d9b46a', '#f6e2a8', '#b48a3e', '#6e5122'];
      const isik = ((t * 0.18) % 1.6) - 0.3;
      const bw = W * 0.6, bh = H * 0.74, x0 = (W - bw) / 2, y0 = (H - bh) / 2;
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${rgba(palet.zemin2, 0.55)} 0%, #050505 75%)` }}>
          <div style={{ position: 'absolute', left: x0 - 18, top: y0 - 18, width: bw + 36, height: bh + 36, padding: 18, boxSizing: 'border-box', opacity: giris, transform: `scale(${0.97 + 0.03 * giris})`,
            background: `linear-gradient(135deg, ${altin.join(', ')})`, boxShadow: `0 40px 110px ${rgba('#000', 0.75)}, inset 0 0 0 2px ${rgba('#fff3c4', 0.35)}` }}>
            {/* cerceve uzerinden gecen isik: fotografin ALTINDA (yalniz altin kenarda gorunur) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `linear-gradient(115deg, transparent ${isik * 100 - 8}%, ${rgba('#fff6d8', 0.6)} ${isik * 100}%, transparent ${isik * 100 + 8}%)` }} />
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', boxShadow: `inset 0 0 0 3px ${rgba('#000', 0.6)}` }}>
              {md(m)}
              <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 60px ${rgba('#000', 0.55)}` }} />
            </div>
          </div>
          {etiket ? <div style={{ position: 'absolute', left: x0, top: y0 + bh + 40, fontFamily: font.govde, fontWeight: font.govdeAgirlik, fontStyle: 'italic', fontSize: 34, color: '#d9b46a', opacity: giris }}>{etiket}</div> : null}
        </AbsoluteFill>
      );
    }
    case 'odak-karartma': {
      // galeri (arthurkatcher s002, stewchan2 s005, amberpromptai): odak yeni ogeye gecince eskiler silinmez, 0,35 sn'de %40
      // parlakliga iner (hafif doygunluk kaybi + geri cekilme); anahtar anda yalniz kahraman ve bir karsiti parlak kalir.
      // m2 verilirse uc panel (buyuk sol + sag ust/alt): once hepsi, sonra odak 1 -> 2 -> 3, sonda kahraman (1) + karsit (3).
      // Yalniz m: tam ekran medya, odak alani disi %40'a kararir (pencere kadraj kenarindan alana daralir), alan ince vurgu
      // cizgisiyle cevrilir, etiket alanin altinda. Panel/kart yiginlarinda genel kural olarak da kullanilir.
      const gecis = 0.35;
      const plan: [number, number[]][] = [[0, [1, 1, 1]], [0.9, [1, 0, 0]], [2.1, [0, 1, 0]], [3.3, [1, 0, 1]]];
      const agirlik = (i: number) => {
        let a = plan[0][1][i];
        for (let k = 1; k < plan.length; k++) a += (plan[k][1][i] - a) * egri('kubik-hizli', sinirla((t - plan[k][0]) / gecis));
        return a;
      };
      if (m2) {
        const panel = [
          { x: W * 0.06, y: H * 0.1, w: W * 0.5, h: H * 0.8, mm: m, k: kamera },
          { x: W * 0.59, y: H * 0.1, w: W * 0.35, h: H * 0.385, mm: m2, k: 'pan-sag' as KameraTip },
          { x: W * 0.59, y: H * 0.515, w: W * 0.35, h: H * 0.385, mm: m3 || m2, k: 'ken-burns-disa' as KameraTip },
        ];
        return (
          <AbsoluteFill>{ap}
            {panel.map((q, i) => {
              const g = yay(sinirla((f - i * 4) / 14));
              const a = agirlik(i);
              return kutu(q.x, q.y, q.w, q.h, md(q.mm, q.k), {
                borderRadius: 10, opacity: g, transform: `scale(${((0.96 + 0.04 * g) * (0.985 + 0.015 * a)).toFixed(4)})`,
                filter: `brightness(${(0.4 + 0.6 * a).toFixed(3)}) saturate(${(0.7 + 0.3 * a).toFixed(3)})`,
                boxShadow: `0 30px 70px ${rgba('#000', 0.4)}`,
              });
            })}
            {panel.map((q, i) => {
              // odak cercevesi: panelin ustunde ince vurgu cizgisi (kahraman/karsit aninda ikisinde de)
              const a = agirlik(i) * sinirla((t - plan[1][0]) / gecis);
              return <div key={'c' + i} style={{ position: 'absolute', left: q.x, top: q.y, width: q.w, height: q.h, borderRadius: 10, boxShadow: `inset 0 0 0 4px ${palet.vurgu}`, opacity: a * 0.9, pointerEvents: 'none' }} />;
            })}
          </AbsoluteFill>
        );
      }
      const [ox, oy, ow, oh] = odak || ODAK_PENCERE;
      const a = yay(sinirla((t - 0.5) / 0.45));
      const L = { x: ox * W * a, y: oy * H * a, w: W + (ow * W - W) * a, h: H + (oh * H - H) * a };
      return (
        <AbsoluteFill style={{ background: '#000' }}>
          {md(m)}
          <AbsoluteFill style={{ background: rgba('#000', 0.6 * a), clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${L.y}px, ${L.x}px ${L.y}px, ${L.x}px ${L.y + L.h}px, ${L.x + L.w}px ${L.y + L.h}px, ${L.x + L.w}px ${L.y}px, 0 ${L.y}px)` }} />
          <div style={{ position: 'absolute', left: L.x, top: L.y, width: L.w, height: L.h, boxShadow: `inset 0 0 0 3px ${palet.vurgu}`, opacity: a }} />
          {etiket ? <div style={{ position: 'absolute', left: L.x, top: L.y + L.h + 18, width: Math.max(L.w, 600), fontFamily: font.govde, fontWeight: 800, fontSize: 36, letterSpacing: 3, color: '#ffffff', textTransform: 'uppercase',
            textShadow: `0 2px 8px ${rgba('#000', 0.9)}`, opacity: yay(sinirla((t - 0.8) / 0.35)), whiteSpace: 'nowrap' }}>{etiket}</div> : null}
        </AbsoluteFill>
      );
    }
    default: return md(m);
  }
};

// ---------------- DOKU / UST KATMAN ----------------
// klasik Claude = her sahnede gren 0.045 + vinyet 0.5. Repertuar 0-2 doku secer ve sahne tipine gore acar/kapatir.
// Opus galerisi: gun-gece-renk (11 video) ve gri-ton-damga (2 video) alttaki sahnenin RENGINI degistirir (backdrop-filter):
// Doku'yu sahnenin ustune, Sequence icine koy; zamanlama Sequence suresine ve 'gec'e gore.
export const DOKU_TIPLERI = ['gren', 'vinyet', 'tarama', 'film-cizik', 'kromatik', 'titreme', 'isik-sizintisi', 'kagit-ust', 'toz', 'gun-gece-renk', 'gri-ton-damga'] as const;
export type DokuTip = typeof DOKU_TIPLERI[number];
/** ANLIK dokular: tek sahne/an icin (Sequence icinde, 'gec' ile). Tum videoya serilen DNA dokusu OLAMAZ (DnaDoku eler, stil_dna secmez). */
export const ANI_DOKU: readonly DokuTip[] = ['gun-gece-renk', 'gri-ton-damga'];

/** metin: gri-ton-damga damga yazisi (varsayilan 'DURDU'); gec: gri-ton-damga ani (kare, Sequence basindan) */
export const Doku: React.FC<{ tip: DokuTip; stil: Stil; guc?: number; metin?: string; gec?: number }> = ({ tip, stil, guc = 1, metin, gec = 0 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const r = rastgele(Math.floor(f / 2) + 91);
  switch (tip) {
    case 'gren':
      return (
        <AbsoluteFill style={{ opacity: 0.08 * guc, mixBlendMode: 'overlay' }}>
          <svg width={W} height={H}><filter id="grn"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 30} /></filter><rect width={W} height={H} filter="url(#grn)" /></svg>
        </AbsoluteFill>
      );
    case 'vinyet': return <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 50%, ${rgba('#000', 0.55 * guc)} 100%)` }} />;
    case 'tarama': return <AbsoluteFill style={{ background: `repeating-linear-gradient(180deg, ${rgba('#000', 0.18 * guc)} 0 2px, transparent 2px 4px)` }} />;
    case 'film-cizik':
      return (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: guc }}>
          {Array.from({ length: 3 }, (_, i) => r() > 0.55 ? <div key={i} style={{ position: 'absolute', left: r() * W, top: 0, width: 1 + r() * 2, height: H, background: rgba('#fff', 0.25 + r() * 0.3) }} /> : null)}
          {Array.from({ length: 10 }, (_, i) => <div key={'t' + i} style={{ position: 'absolute', left: r() * W, top: r() * H, width: 2 + r() * 6, height: 2 + r() * 6, borderRadius: '50%', background: rgba('#fff', 0.5 * r()) }} />)}
        </AbsoluteFill>
      );
    case 'kromatik': return <AbsoluteFill style={{ boxShadow: `inset 6px 0 30px ${rgba('#ff0050', 0.25 * guc)}, inset -6px 0 30px ${rgba('#00e5ff', 0.25 * guc)}` }} />;
    case 'titreme': return <AbsoluteFill style={{ background: rgba('#000', (0.03 + 0.05 * r()) * guc) }} />;
    case 'isik-sizintisi': {
      const t = f / 30;
      return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: guc }}><div style={{ position: 'absolute', right: -300 + Math.sin(t * 0.3) * 120, top: -200, width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(stil.palet.vurgu, 0.35)} 0%, ${rgba('#ffb36b', 0.18)} 40%, transparent 70%)`, filter: 'blur(40px)' }} /></AbsoluteFill>;
    }
    case 'kagit-ust':
      return (
        <AbsoluteFill style={{ opacity: 0.35 * guc, mixBlendMode: 'multiply' }}>
          <svg width={W} height={H}><filter id="kgu"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves={4} seed={7} /><feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.52  0 0 0 0 0.4  0 0 0 0.7 0" /></filter><rect width={W} height={H} filter="url(#kgu)" /></svg>
        </AbsoluteFill>
      );
    case 'toz': {
      const rr = rastgele(5);
      const t = f / 30;
      return <AbsoluteFill style={{ opacity: guc }}><svg width={W} height={H}>{Array.from({ length: 60 }, (_, i) => { const x = rr(), y = rr(), s = 1 + rr() * 2.5; return <circle key={i} cx={((x + t * 0.01 * (1 + s)) % 1) * W} cy={((y + fbm(i, t * 0.1, 1) * 0.05) % 1 + 1) % 1 * H} r={s} fill={rgba('#fff', 0.35)} />; })}</svg></AbsoluteFill>;
    }
    case 'gun-gece-renk': {
      // ayni sahne sabit kalirken isik/palet kayar: gunduz -> gun batimi -> gece (Sequence suresince; ilk %20 gunduz, son %25
      // gece). Lambalar gece esiginde TEK KAREDE yanar (alttan sicak isik katmani). guc: gece koyulugu carpani.
      const u = sinirla(f / Math.max(1, durationInFrames - 1));
      const k = (a: number, b: number) => 0.5 - 0.5 * Math.cos(Math.PI * sinirla((u - a) / (b - a)));
      const bat = k(0.2, 0.45) * (1 - k(0.5, 0.75)), gece = k(0.45, 0.75) * guc;
      const parlak = 1 - 0.05 * bat - 0.42 * gece, doy = 1 + 0.18 * bat - 0.45 * gece;
      const lamba = u >= 0.62;
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <AbsoluteFill style={{ backdropFilter: `brightness(${parlak.toFixed(3)}) saturate(${doy.toFixed(3)}) sepia(${(0.3 * bat).toFixed(3)}) hue-rotate(${(-12 * gece).toFixed(1)}deg)` }} />
          <AbsoluteFill style={{ background: `linear-gradient(180deg, ${rgba('#ff7a2e', 0.4 * bat)} 0%, ${rgba('#ffb36b', 0.18 * bat)} 55%, transparent 100%)`, mixBlendMode: 'soft-light' }} />
          <AbsoluteFill style={{ background: rgba('#1a2766', 0.5 * gece), mixBlendMode: 'multiply' }} />
          {lamba ? <AbsoluteFill style={{ background: `linear-gradient(0deg, ${rgba('#ffb35c', 0.16 * guc)} 0%, transparent 45%)`, mixBlendMode: 'screen' }} /> : null}
        </AbsoluteFill>
      );
    }
    case 'gri-ton-damga': {
      // durus / kayip ani: 'gec' karesinde tum sahne TEK KAREDE griye doner (doygunluk 0), dev egik lastik damga 1,6 -> 1,0
      // olcekle iner (0,22 sn, asimsiz), murekkep koyu gri; 0,5 sn sonra kirmiziya doner (tek doygun renk, anlamsal).
      // Sonraki bolum yeni Sequence oldugu icin renk geri gelir.
      if (f < gec) return null;
      const t = (f - gec) / fps;
      const in2 = yay(sinirla(t / 0.22));
      const s = 1.6 - 0.6 * in2;
      const kirmizi = yay(sinirla((t - 0.5) / 0.25));
      const renk = `rgb(${Math.round(43 + (200 - 43) * kirmizi)},${Math.round(43 + (38 - 43) * kirmizi)},${Math.round(43 + (30 - 43) * kirmizi)})`;
      const yazi = (metin || 'DURDU').toUpperCase();
      const id = 'gtd' + gec;
      const genis = Math.min(W * 0.62, yazi.length * 190 + 160);
      return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <AbsoluteFill style={{ backdropFilter: 'grayscale(1) contrast(1.06)' }} />
          <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={genis + 80} height={360} style={{ transform: `rotate(-11deg) scale(${s.toFixed(4)})`, opacity: sinirla(in2 * 3), overflow: 'visible' }}>
              <defs>
                <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} result="n" />
                  <feComponentTransfer in="n" result="m"><feFuncA type="discrete" tableValues="1 1 1 1 1 1 0 1 1 0" /></feComponentTransfer>
                  <feComposite in="SourceGraphic" in2="m" operator="in" />
                </filter>
              </defs>
              <g filter={`url(#${id})`}>
                <rect x={40} y={40} width={genis} height={280} rx={18} fill="none" stroke={renk} strokeWidth={16} />
                <rect x={64} y={64} width={genis - 48} height={232} rx={10} fill="none" stroke={renk} strokeWidth={5} />
                <text x={40 + genis / 2} y={180} dominantBaseline="central" textAnchor="middle" fontFamily="Staatliches" fontSize={200} letterSpacing={10} fill={renk}
                  textLength={yazi.length > 4 ? genis - 140 : undefined} lengthAdjust="spacingAndGlyphs">{yazi}</text>
              </g>
            </svg>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    default: return null;
  }
};

/** OLCEK YOLCULUGU (Opus galerisi, 12 video): 'powers of ten'. bolgeler kucukten buyuge (tekne -> okyanus -> kita ...). Tek
 *  kesintisiz kamera log olcek hizinda uzaklasir: bolge i'nin olcegi oran^(i - u), u sabit hizla artar (bolgeSn'de bir bolge).
 *  Onceki bolge yenisinin ortasinda yumusak kenarli olarak kuculur, noktaya inip kararir; sonraki yapi o noktadan buyur.
 *  Sol altta bolge adi (>= 64) + olcek okumasi (olcek, ornek '10^4 m', >= 40) bolge degisince kayarak yenilenir (tarifteki eksik:
 *  5+ sn okunur bir sey kalmamasi). Bolge gorselleri ayni merkeze bakmali (ilgi noktasi ortada). */
export type OlcekBolge = { m: MedyaKaynak; ad: string; olcek?: string };
export const OlcekYolculugu: React.FC<{ stil: Stil; bolgeler: OlcekBolge[]; bolgeSn?: number; oran?: number; gec?: number }> = ({ stil, bolgeler, bolgeSn = 2.6, oran = 6, gec = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palet, font } = stil;
  const n = bolgeler.length;
  const u = sinirla((f - gec) / (fps * bolgeSn), 0, Math.max(0, n - 1));
  const aktif = Math.min(n - 1, Math.round(u));
  const gecis = sinirla((u - (aktif - 0.5)) / 0.18);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {bolgeler.map((b, i) => ({ b, i })).reverse().map(({ b, i }) => {
        const s = Math.pow(oran, i - u);
        if (s > oran * 1.05 || s < 0.004) return null;
        const op = sinirla((s - 0.004) / 0.03);
        // tam kadrajdayken maske yok; kuculur kuculmez kenarlari (closest-side elips) yumusar ve bir sonraki bolgenin icine erir.
        // Arkadaki buyutulmus bolge (s > 1) koselerde karanlik kalir (vinyet gibi okunur).
        const k = sinirla((1 - s) / 0.3), ic = 99 - 34 * k;
        const maske = s < 1 ? `radial-gradient(ellipse closest-side at 50% 50%, #000 ${ic.toFixed(1)}%, transparent 100%)` : undefined;
        return (
          <AbsoluteFill key={i} style={{ transform: `scale(${s.toFixed(5)})`, opacity: op, WebkitMaskImage: maske, maskImage: maske }}>
            <Medya m={b.m} nefes={0} />
            <AbsoluteFill style={{ background: '#000', opacity: Math.max(0.55 * (1 - sinirla(s / 0.25)), 0.6 * sinirla((s - 1) / 2)) }} />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${rgba('#000', 0.45)} 100%)` }} />
      <div style={{ position: 'absolute', left: 100, bottom: 80, overflow: 'hidden', paddingRight: 30 }}>
        <div style={{ transform: `translateY(${((1 - yay(aktif === 0 ? 1 : gecis)) * 105).toFixed(2)}%)` }}>
          {bolgeler[aktif]?.olcek ? <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 44, letterSpacing: 3, color: palet.vurgu, textShadow: `0 2px 10px ${rgba('#000', 0.8)}` }}>{bolgeler[aktif].olcek}</div> : null}
          <div style={{ fontFamily: font.baslik, fontWeight: font.baslikAgirlik, fontSize: 84, lineHeight: 1.05, letterSpacing: font.aralik, color: '#ffffff', textTransform: font.buyukHarf ? 'uppercase' : 'none',
            textShadow: `0 3px 16px ${rgba('#000', 0.75)}` }}>{bolgeler[aktif]?.ad}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

