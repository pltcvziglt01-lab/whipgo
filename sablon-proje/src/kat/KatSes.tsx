import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FontYukle } from '../repertuar/FontYukle';
import { SFX_AYAR, SfxKatmani, SfxOlay, SfxTon, SfxYerlesim, sfxPlani, sfxSessizlikleri } from '../repertuar/Sfx';
import veri from './katses-olaylar.json';

// SES KATALOGU (KatSes): her SFX rolu kendi diliminde, gorsel + ses. Kulakla ve olcumle kontrol icin (references/sfx.md).
// Her dilim ayri sfxPlani cagrisi (dakika tavani dilimleri birbirinden silmesin); doruk dilimi sessizligi gosterir.
// Props: {"ton": "ciddi"|"gizem"|"enerjik"|"sakin", "tohum": "..."}. Olcum: plan (katSesPlani ile ayni: sfx_plan.py sfx_plani her dilime)
// -> py scripts/sfx_olc.py --rapor out/katses-<ton>.mp4 --plan plan.json --ton <ton>  (olay basina hedef / olculen seviye)
type Dilim = { rol: string; uzunluk: number; olaylar: SfxOlay[]; not: string };
const DILIMLER = (veri as unknown as { dilimler: Dilim[] }).dilimler;
export const KATSES_SURE = DILIMLER.reduce((a, d) => a + d.uzunluk, 0);
export const katSesBaslar = () => DILIMLER.reduce<number[]>((a, d, i) => [...a, i ? a[i - 1] + DILIMLER[i - 1].uzunluk : 0], []);

/** dilim olaylarini mutlak kareye tasiyip plan kurar (olcum betigi ayni hesabi Python portuyla yapar) */
export const katSesPlani = (ton: SfxTon, tohum: string, fps: number) => {
  const bas = katSesBaslar();
  return DILIMLER.map((d, i) => sfxPlani(d.olaylar.map((o) => ({ ...o, kare: o.kare + bas[i] })), ton, tohum, fps, 1));
};

const ZEMIN = '#101216', ACIK = '#f2efe8', VURGU = '#e8b04a', SOLUK = 'rgba(242,239,232,.45)';
const yazi = (boy: number, renk = ACIK): React.CSSProperties => ({ font: `400 ${boy}px Anton`, color: renk, letterSpacing: 1 });
const govde = (boy: number, renk = ACIK): React.CSSProperties => ({ font: `500 ${boy}px Inter, Arial, sans-serif`, color: renk });

/** rol gorseli (dilim icindeki kare f) */
const Gorsel: React.FC<{ d: Dilim; f: number }> = ({ d, f }) => {
  const o = d.olaylar[d.olaylar.length - 1];
  const t = (a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nabiz = (k: number) => 1 + 0.12 * Math.max(0, 1 - Math.abs(f - k) / 6);
  switch (d.rol) {
    case 'sayac': {
      const p = Easing.out(Easing.cubic)(t(o.kare, o.kare + (o.sure || 42)));
      return <div style={{ ...yazi(260, VURGU), transform: `scale(${nabiz(o.kare + (o.sure || 42))})` }}>{Math.round(1928 * p).toLocaleString('en-US')}</div>;
    }
    case 'yazma': {
      const m = 'WHO WON IN 2012?';
      const n = Math.max(0, Math.min(m.length, Math.floor((f - o.kare) / (o.aralik || 2)) + 1));
      return <div style={{ ...govde(84), background: '#fff', color: '#111', padding: '26px 40px', borderRadius: 60, width: 1100 }}>{m.slice(0, f >= o.kare ? n : 0)}<span style={{ opacity: f % 16 < 8 ? 1 : 0 }}>|</span></div>;
    }
    case 'liste-madde':
      return <div>{['ONE', 'TWO', 'THREE', 'FOUR'].map((m, i) => <div key={m} style={{ ...yazi(90), opacity: t(o.kare + i * 12, o.kare + i * 12 + 3), transform: `translateX(${(1 - t(o.kare + i * 12, o.kare + i * 12 + 5)) * -60}px)` }}>{i + 1}. {m}</div>)}</div>;
    case 'grafik-cubuk':
      return <div style={{ display: 'flex', alignItems: 'flex-end', gap: 36, height: 520 }}>{[0.35, 0.5, 0.62, 0.74, 0.86, 1].map((h, i) => <div key={i} style={{ width: 110, height: 520 * h * Easing.out(Easing.cubic)(t(o.kare + i * 7 - 6, o.kare + i * 7)), background: i === 5 ? VURGU : ACIK }} />)}</div>;
    case 'harita-rota': {
      const p = t(o.kare, o.kare + (o.sure || 45));
      return (
        <svg width={1300} height={560}><path d="M80 470 C 380 60, 760 600, 1220 110" stroke={SOLUK} strokeWidth={6} fill="none" strokeDasharray="14 14" />
          <path d="M80 470 C 380 60, 760 600, 1220 110" stroke={VURGU} strokeWidth={10} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
          <circle cx={1220} cy={110} r={22 * nabiz(o.kare + (o.sure || 45))} fill={p >= 1 ? VURGU : SOLUK} /></svg>
      );
    }
    case 'degisim': {
      const p = t(o.kare, o.kare + (o.sure || 12));
      return <div style={{ position: 'relative' }}><div style={yazi(200)}>$899</div><div style={{ position: 'absolute', left: -10, top: '52%', height: 16, width: `${p * 105}%`, background: '#e0483e' }} /></div>;
    }
    case 'doruk': {
      const k = o.kare, ses = sfxSessizlikleri([o], 30)[0];
      return <div style={{ textAlign: 'center' }}><div style={{ ...yazi(f >= k ? 230 : 120, f >= k ? VURGU : SOLUK), transform: `scale(${nabiz(k)})` }}>{f >= k ? 'THE TRUTH' : f >= ses.bas ? '…' : 'CARD'}</div>
        <div style={govde(34, SOLUK)}>{f < ses.bas ? 'once kart + gecis' : f < k ? `sessizlik ${SFX_AYAR.doruk_sessizlik} sn` : 'vurus'}</div></div>;
    }
    default: {
      const k = o.kare;
      return <div style={{ ...yazi(200, f >= k ? ACIK : SOLUK), transform: `scale(${nabiz(k)})` }}>{d.rol.toUpperCase()}</div>;
    }
  }
};

export const KatSes: React.FC<{ ton?: SfxTon; tohum?: string }> = ({ ton = 'ciddi', tohum = 'katses' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bas = katSesBaslar();
  const planlar = React.useMemo(() => katSesPlani(ton, tohum, fps), [ton, tohum, fps]);
  const plan: SfxYerlesim[] = planlar.flat();
  let i = 0;
  while (i < DILIMLER.length - 1 && f >= bas[i + 1]) i++;
  const d = DILIMLER[i], yerel = f - bas[i];
  const bu = planlar[i];
  return (
    <AbsoluteFill style={{ background: ZEMIN }}>
      <FontYukle />
      <SfxKatmani plan={plan} />
      <div style={{ position: 'absolute', left: 90, top: 60, ...govde(34, SOLUK) }}>SES KATALOGU · ton {ton} · {i + 1}/{DILIMLER.length}</div>
      <div style={{ position: 'absolute', left: 90, top: 110, ...yazi(96, VURGU) }}>{d.rol}</div>
      <div style={{ position: 'absolute', left: 90, top: 230, ...govde(36, SOLUK) }}>{d.not}</div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', top: 120 }}><Gorsel d={d} f={yerel} /></AbsoluteFill>
      <div style={{ position: 'absolute', right: 90, top: 60, textAlign: 'right' }}>
        {bu.length ? [...new Map(bu.map((s) => [s.dosya, s])).values()].slice(0, 6).map((s) => (
          <div key={s.dosya} style={govde(26, f >= s.kare && f < s.kare + s.sure ? VURGU : SOLUK)}>{s.havuz} · {s.dosya.split('/').pop()} · {SFX_AYAR.seviye[s.havuz]} dB</div>
        )) : <div style={govde(28, SOLUK)}>sessiz (bu tonda calmaz)</div>}
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, bottom: 70, height: 6, background: 'rgba(255,255,255,.12)' }}>
        {plan.map((s, k) => <div key={k} style={{ position: 'absolute', left: `${(s.kare / KATSES_SURE) * 100}%`, top: -10, width: 3, height: 26, background: f >= s.kare ? VURGU : SOLUK }} />)}
        <div style={{ position: 'absolute', left: `${(f / KATSES_SURE) * 100}%`, top: -18, width: 4, height: 42, background: ACIK }} />
      </div>
    </AbsoluteFill>
  );
};
