import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from 'remotion';
import { OKUNUR, Stil, rastgele, rgba, sinirla, yay } from './temel';

// VURUS PAKETI — bir olayin (sayi karti, vurgu kelimesi, bolum kesimi) TEK KAREDE senkron darbesi:
// ezilme (squash) + sonumlu kamera sarsintisi + tek flas + genisleyen halka + kivilcim. SFX'in olculen tepesi ayni kareye
// oturur (Sfx.tsx). Recete: givemotion impacts-and-energy (MIT) — kod bizim.
// seviye 0 = kapali (sakin ton), 1 = kucuk (sarsinti 6 px + halka; ciddi/gizem), 2 = buyuk (+ezilme, flas), 3 = tam (+kivilcim; enerjik).
// Flas tek seferlik (WCAG: saniyede 3 flas siniri asilmaz; kusur_kontrol.py olcer).
export type VurusSeviye = 0 | 1 | 2 | 3;
/** darbe: yukaridaki paket (seviyeyle). kilometre-tasi-halka (Opus galerisi, 72 video): onemli olayda 1 kare gri flas (+%25
 *  parlaklik), nesneden genisleyen ince beyaz halka (kadraj genisliginin %4 -> %20'si, 3 karede), etiket kontur olarak gelir ve
 *  0,5 sn'de dolar; akis o ogede yavaslar (alttaki icerik ~0,45 sn %40 hiza iner, sonraki 2 sn'de fark kapanir: toplam sure ve
 *  ses senkronu degismez). Seviye 0 yine kapatir; diger seviyeler bu tipte ayni. */
export const VURUS_TIPLERI = ['darbe', 'kilometre-tasi-halka'] as const;
export type VurusTip = typeof VURUS_TIPLERI[number];

const sonum = (t: number, hiz: number) => Math.exp(-t * hiz);

export const Vurus: React.FC<{ stil: Stil; seviye?: VurusSeviye; gec?: number; x?: number; y?: number; tohum?: string; tip?: VurusTip; etiket?: string; children: React.ReactNode }> = ({
  stil, seviye = 2, gec = 0, x = 0.5, y = 0.5, tohum = 'v', tip = 'darbe', etiket, children,
}) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  if (!seviye) return <>{children}</>;
  if (tip === 'kilometre-tasi-halka') return <KilometreTasi stil={stil} gec={gec} x={x} y={y} etiket={etiket}>{children}</KilometreTasi>;
  const t = (f - gec) / fps; // saniye, vurustan beri
  const aktif = t >= 0 && t < 1.2;
  // ezilme: 70 ms ezik (scaleY .88 / scaleX 1.07), sonra elastik yerlesme
  let sx = 1, sy = 1;
  if (aktif && seviye >= 2) {
    if (t < 0.07) { const k = t / 0.07; sx = 1 + 0.07 * k; sy = 1 - 0.12 * k; }
    else { const u = t - 0.07; const e = sonum(u, 7) * Math.cos(u * 26); sx = 1 + 0.07 * e; sy = 1 - 0.12 * e; }
  }
  // sarsinti: sonumlu, iki eksende farkli frekans
  const genlik = seviye === 1 ? 6 : seviye === 2 ? 14 : 20;
  const r = rastgele(tohum + 'vs');
  const fx = 37 + r() * 9, fy = 29 + r() * 9;
  const dx = aktif ? genlik * sonum(t, 7.5) * Math.sin(t * fx) : 0;
  const dy = aktif ? genlik * 0.7 * sonum(t, 7.5) * Math.cos(t * fy) : 0;
  const flas = seviye >= 2 && aktif ? 0.55 * sonum(t, 18) : 0;
  const halkaK = sinirla(t / 0.6);
  const halka = aktif && t < 0.6;
  const cx = x * W, cy = y * H;
  const kivilcim = seviye >= 3 && aktif && t < 0.7
    ? Array.from({ length: 36 }, (_, i) => {
      const rr = rastgele(tohum + 'k' + i);
      const aci = (-170 + rr() * 160) * (Math.PI / 180) + (rr() < 0.5 ? 0 : Math.PI);
      const hiz = (900 + rr() * 1100) * (W / 1920);
      const ut = t * (0.8 + rr() * 0.4);
      const px = cx + Math.cos(aci) * hiz * ut * sonum(ut, 2.2), py = cy + Math.sin(aci) * hiz * ut * sonum(ut, 2.2) + 900 * ut * ut;
      const boy = 10 + rr() * 22;
      return { px, py, aci, boy, op: 1 - sinirla(ut / 0.6) };
    })
    : [];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: `${x * 100}% ${y * 100 + 10}%` }}>{children}</AbsoluteFill>
      {halka ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <circle cx={cx} cy={cy} r={H * (0.08 + 0.55 * (1 - Math.pow(1 - halkaK, 3)))} fill="none" stroke={stil.palet.vurgu} strokeWidth={10 * (1 - halkaK) + 1} opacity={0.85 * (1 - halkaK)} />
          {seviye >= 2 ? <circle cx={cx} cy={cy} r={H * (0.05 + 0.35 * (1 - Math.pow(1 - sinirla(t / 0.45), 3)))} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.6 * (1 - sinirla(t / 0.45))} /> : null}
          {kivilcim.map((k, i) => (
            <line key={i} x1={k.px} y1={k.py} x2={k.px - Math.cos(k.aci) * k.boy} y2={k.py - Math.sin(k.aci) * k.boy} stroke={i % 3 ? stil.palet.vurgu : '#ffffff'} strokeWidth={3} strokeLinecap="round" opacity={k.op} />
          ))}
        </svg>
      ) : null}
      {flas > 0.01 ? <AbsoluteFill style={{ background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${rgba('#ffffff', flas)} 0%, ${rgba(stil.palet.vurgu, flas * 0.4)} 40%, transparent 75%)`, mixBlendMode: 'screen', pointerEvents: 'none' }} /> : null}
    </AbsoluteFill>
  );
};

/** yavaslama: alttaki icerigin zamani g(f) = f - D * tumsek(f - gec); tumsek 0,45 sn'de 0 -> 1 (hiz ~%40'a iner), 2 sn'de 1 -> 0
 *  (hiz ~%110, fark kapanir). Pencere disinda Freeze kullanilmaz (icerik kendi zamaninda). */
const KilometreTasi: React.FC<{ stil: Stil; gec: number; x: number; y: number; etiket?: string; children: React.ReactNode }> = ({ stil, gec, x, y, etiket, children }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = (f - gec) / fps;
  const yuk = 0.45, ini = 2.0, D = 0.2 * fps;
  const tumsek = t <= 0 ? 0 : t < yuk ? 0.5 - 0.5 * Math.cos((Math.PI * t) / yuk) : t < yuk + ini ? 0.5 + 0.5 * Math.cos((Math.PI * (t - yuk)) / ini) : 0;
  const zaman = f - D * tumsek;
  const flas = f === Math.round(gec);
  const cx = x * W, cy = y * H;
  const hk = sinirla((f - gec) / 3);
  const hs = sinirla((f - gec - 3) / 8);
  const kont = yay(sinirla((f - gec) / (fps * 0.2)));
  const dol = yay(sinirla((f - gec - fps * 0.3) / (fps * 0.5)));
  const ic = <AbsoluteFill style={flas ? { filter: 'grayscale(0.75) brightness(1.25)' } : undefined}>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {tumsek > 0 ? <Freeze frame={zaman}>{ic}</Freeze> : ic}
      {f >= gec && hs < 1 ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <circle cx={cx} cy={cy} r={W * (0.04 + 0.16 * (1 - Math.pow(1 - hk, 2)))} fill="none" stroke="#ffffff" strokeWidth={4 - 2.5 * hk} opacity={1 - hs} />
        </svg>
      ) : null}
      {etiket && f >= gec ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: Math.min(H - 180, cy + W * 0.06), textAlign: 'center', opacity: kont, transform: `scale(${(1.04 - 0.04 * kont).toFixed(4)})` }}>
          <span style={{ fontFamily: stil.font.baslik, fontWeight: stil.font.baslikAgirlik, fontSize: OKUNUR.ana + 24, letterSpacing: stil.font.aralik, textTransform: stil.font.buyukHarf ? 'uppercase' : 'none',
            color: rgba('#ffffff', dol), WebkitTextStroke: `3px #ffffff`, textShadow: dol > 0.5 ? `0 3px 14px ${rgba('#000', 0.55)}` : 'none' }}>{etiket}</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** tona gore varsayilan seviye */
export const vurusSeviye = (ton?: string): VurusSeviye => (ton === 'enerjik' ? 3 : ton === 'sakin' ? 0 : ton === 'gizem' ? 1 : 1);
