import React from 'react';
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion';
import { rastgele } from './temel';

// SFX — kurgudaki OLAYLARDAN otomatik ses efekti (elle yerlestirme yok). Dosyalar kanalin public/varlik/sfx/ klasorunde
// (lisansli paket: repoda/Drive'da paylasilmaz; varlik_kur.py kurar). Kurallar (references/sfx.md):
//  - SFX bir olayi isaretler (yumusak gecis, kart/sayi/alinti girisi, vurgu, alt bant), her kesimi degil.
//  - Video basina tutarli "SFX paleti": her rol icin tondan 2 ses secilir, ikisi sirayla (ayni ses art arda yok).
//  - Yogunluk: rakibin sfx_orani + ton tavani (dk basina); iki ses arasi >= 0,8 sn; carpismada oncelikli olay kalir.
//  - SENKRON: her dosyanin olculen vurus (tepe) ani olay karesine oturur (whoosh'un tepesi kesimde, darbenin tepesi kart
//    girisinde); dosya basindaki sessizlik kirpilir. Olcum: SFX_OLCU (scripts/sfx_olc.py yeniden yazar).
//  - Seviye: dosyalar ORNEK tepesine gore normalize edilir (-3 dBFS x rol seviyesi; kirpilmaz) -> sessiz kagit/deklansor de duyulur,
//    gur whoosh bastirmaz. Sonu yumusak kapanir.
export type SfxRol = 'gecis' | 'kart' | 'sayi' | 'alinti' | 'vurgu' | 'altbant' | 'yukselme';
export type SfxOlay = { kare: number; rol: SfxRol };
export type SfxTon = 'ciddi' | 'gizem' | 'enerjik' | 'sakin';

type Ses = [dosya: string, sn: number, ses: number];
// olculen [ses baslangici sn, tepe ani sn, tepe zarf dB] (10 ms zarf, ilk 4 sn) — scratchpad/sfx_tepe.py ile uretildi
export const SFX_OLCU: Record<string, [bas: number, tepe: number, db: number]> = {'bass-whoosh.mp3': [0.538, 1.033, 3.0], 'bing.wav': [0.008, 0.076, -2.8], 'boom-impact.mp3': [0.025, 0.114, 2.8], 'buildup-[1].wav': [1.854, 2.768, 0.3], 'buildup-[2].wav': [0.708, 1.881, -4.8], 'buildup-[3].wav': [0.5, 1.33, -4.3], 'buildup-[4].mp3': [1.144, 2.57, -13.4], 'camera-shot.wav': [0.296, 0.328, -9.2], 'camera-shutter-2.wav': [0.085, 0.177, -23.7], 'camera-shutter-sound-effect.wav': [0.287, 0.726, -4.4], 'camera-shutter.wav': [0.005, 0.208, -8.6], 'cinem-wave-swoosh.wav': [0.314, 0.836, 2.4], 'cinematic_deep-light-medium-heavy.mp3': [1.804, 2.07, 3.0], 'click.wav': [0.026, 0.035, -5.7], 'dada-1.wav': [0.0, 0.009, -1.3], 'deep-main-swoosh2.wav': [0.039, 0.736, -6.6], 'deep-whoosh.mp3': [1.029, 2.062, 3.0], 'digital-camera-shutter.wav': [0.304, 0.334, -8.7], 'enter-back.wav': [0.009, 0.019, -2.4], 'fast-swoosh.mp3': [0.054, 0.156, 1.1], 'glitch-swoosh.wav': [0.134, 0.337, -0.9], 'heavy-buildup.mp3': [0.457, 3.446, -3.4], 'icons.wav': [0.032, 0.146, -2.8], 'impact.wav': [0.06, 0.132, 2.6], 'impact_swoosh_dust_swoosh.mp3': [0.749, 1.31, 3.9], 'loud-whip.mp3': [0.368, 0.402, 1.2], 'main-swoosh.wav': [0.263, 0.519, -0.5], 'multiple-paper-turn.wav': [0.293, 0.517, -11.8], 'paper-flip-1.wav': [0.124, 0.202, -14.2], 'paper.wav': [0.054, 0.32, -11.6], 'pop-2.wav': [0.166, 0.175, -14.8], 'pop.wav': [0.011, 0.021, 1.0], 'riser.wav': [0.678, 1.794, -22.3], 'rustling-paper-1.wav': [0.505, 1.157, -10.9], 'short-whoosh.wav': [0.07, 0.104, 0.1], 'side-swoosh.mp3': [0.739, 1.181, 2.5], 'smooth-woosh.wav': [0.215, 0.416, -0.8], 'sword-slash.wav': [0.107, 0.322, -10.2], 'tearing-paper.wav': [0.482, 0.627, -8.9], 'thump.mp3': [0.824, 0.875, 0.5], 'tik-tik.mp3': [0.405, 0.414, -0.3], 'transition-base-121422.mp3': [0.576, 0.746, -1.9], 'transition-woosh.mp3': [0.46, 0.672, -3.3], 'turbulance.mp3': [0.771, 1.317, 3.0], 'ui.wav': [0.12, 0.13, 1.9], 'zhwoop.mp3': [0.75, 1.363, 3.0]};
// ton -> rol -> aday sesler [dosya, kirpma sn, seviye]. Mizah sesleri hicbir paletta yok.
export const SFX_PALET: Record<SfxTon, Record<SfxRol, Ses[]>> = {
  ciddi: {
    gecis: [['deep-whoosh.mp3', 1.6, 0.2], ['bass-whoosh.mp3', 1.6, 0.2], ['transition-woosh.mp3', 1.5, 0.18], ['deep-main-swoosh2.wav', 1.5, 0.2], ['main-swoosh.wav', 1.3, 0.18], ['transition-base-121422.mp3', 1.5, 0.18]],
    kart: [['camera-shutter.wav', 0.6, 0.2], ['paper-flip-1.wav', 0.9, 0.22], ['camera-shot.wav', 0.9, 0.18], ['click.wav', 0.35, 0.25]],
    sayi: [['thump.mp3', 1.6, 0.3], ['impact.wav', 2.0, 0.26], ['dada-1.wav', 1.6, 0.24]],
    alinti: [['paper-flip-1.wav', 0.9, 0.24], ['multiple-paper-turn.wav', 1.1, 0.22], ['rustling-paper-1.wav', 1.4, 0.18]],
    vurgu: [['cinematic_deep-light-medium-heavy.mp3', 2.2, 0.28], ['impact.wav', 2.0, 0.28], ['thump.mp3', 1.6, 0.3]],
    altbant: [['click.wav', 0.35, 0.18], ['camera-shutter-2.wav', 0.33, 0.16], ['tik-tik.mp3', 0.6, 0.14]],
    yukselme: [['riser.wav', 2.0, 0.2], ['buildup-[2].wav', 2.5, 0.2], ['heavy-buildup.mp3', 3.0, 0.2]],
  },
  gizem: {
    gecis: [['deep-whoosh.mp3', 1.8, 0.2], ['turbulance.mp3', 2.0, 0.18], ['smooth-woosh.wav', 2.0, 0.18], ['cinem-wave-swoosh.wav', 2.0, 0.18], ['deep-main-swoosh2.wav', 1.5, 0.2]],
    kart: [['camera-shutter-sound-effect.wav', 0.86, 0.18], ['paper.wav', 0.45, 0.22], ['digital-camera-shutter.wav', 0.56, 0.18]],
    sayi: [['boom-impact.mp3', 2.4, 0.26], ['thump.mp3', 1.6, 0.28], ['cinematic_deep-light-medium-heavy.mp3', 2.4, 0.26]],
    alinti: [['paper-flip-1.wav', 0.9, 0.22], ['tearing-paper.wav', 1.2, 0.18], ['rustling-paper-1.wav', 1.4, 0.18]],
    vurgu: [['boom-impact.mp3', 2.6, 0.28], ['cinematic_deep-light-medium-heavy.mp3', 2.4, 0.28]],
    altbant: [['camera-shutter-2.wav', 0.33, 0.15], ['click.wav', 0.35, 0.15]],
    yukselme: [['heavy-buildup.mp3', 3.5, 0.2], ['buildup-[4].mp3', 2.7, 0.2], ['riser.wav', 2.0, 0.2]],
  },
  enerjik: {
    gecis: [['fast-swoosh.mp3', 1.0, 0.22], ['loud-whip.mp3', 1.2, 0.2], ['short-whoosh.wav', 0.27, 0.26], ['zhwoop.mp3', 1.2, 0.2], ['glitch-swoosh.wav', 0.78, 0.2], ['side-swoosh.mp3', 1.2, 0.2]],
    kart: [['pop.wav', 0.22, 0.26], ['pop-2.wav', 0.4, 0.24], ['bing.wav', 0.56, 0.18], ['ui.wav', 0.8, 0.2]],
    sayi: [['impact.wav', 1.6, 0.3], ['sword-slash.wav', 1.2, 0.24], ['dada-1.wav', 1.6, 0.26]],
    alinti: [['paper-flip-1.wav', 0.9, 0.24], ['pop-2.wav', 0.4, 0.22]],
    vurgu: [['impact.wav', 1.8, 0.32], ['impact_swoosh_dust_swoosh.mp3', 2.0, 0.28], ['loud-whip.mp3', 1.2, 0.28]],
    altbant: [['pop.wav', 0.22, 0.2], ['enter-back.wav', 0.08, 0.22], ['icons.wav', 0.72, 0.16]],
    yukselme: [['buildup-[1].wav', 2.9, 0.22], ['buildup-[3].wav', 1.8, 0.22], ['riser.wav', 2.0, 0.22]],
  },
  sakin: {
    gecis: [['smooth-woosh.wav', 1.8, 0.14], ['transition-base-121422.mp3', 1.5, 0.14], ['main-swoosh.wav', 1.3, 0.13]],
    kart: [['paper.wav', 0.45, 0.18], ['pop-2.wav', 0.4, 0.14], ['camera-shutter-2.wav', 0.33, 0.14]],
    sayi: [['dada-1.wav', 1.6, 0.2], ['bing.wav', 0.56, 0.14]],
    alinti: [['paper-flip-1.wav', 0.9, 0.18], ['rustling-paper-1.wav', 1.4, 0.14]],
    vurgu: [['thump.mp3', 1.6, 0.22], ['dada-1.wav', 1.6, 0.2]],
    altbant: [['click.wav', 0.35, 0.12]],
    yukselme: [['riser.wav', 2.0, 0.16]],
  },
};
// rol onceligi (carpismada yuksek kalir) ve whoosh'un kesimden once baslama payi (kare)
const ONCELIK: Record<SfxRol, number> = { vurgu: 5, sayi: 4, yukselme: 4, alinti: 3, kart: 3, gecis: 2, altbant: 1 };
const KUYRUK: Record<SfxRol, number> = { gecis: 0.7, yukselme: 0.35, kart: 0.5, sayi: 1.1, alinti: 0.8, vurgu: 1.4, altbant: 0.35 };
// dakikada en fazla olay (ton tavani); rakibin sfx_orani yumusak gecislere uygulanan olasilik
const TAVAN: Record<SfxTon, number> = { ciddi: 12, gizem: 10, enerjik: 26, sakin: 6 };

export type SfxYerlesim = { kare: number; dosya: string; sure: number; ses: number; rol: SfxRol; kirp: number };

/** olaylardan yerlesim plani: palet secimi, yogunluk, aralik, sirayla donen sesler. Deterministik (tohum). */
export const sfxPlani = (olaylar: SfxOlay[], ton: SfxTon, tohum: string, fps: number, sfxOrani = 0.5): SfxYerlesim[] => {
  const r = rastgele(tohum + 'sfx');
  const palet = SFX_PALET[ton] || SFX_PALET.ciddi;
  // video paleti: her rol icin 2 ses (tohumla) — video boyunca tutarli ses dili
  const secili = {} as Record<SfxRol, Ses[]>;
  (Object.keys(palet) as SfxRol[]).forEach((rol) => {
    const a = [...palet[rol]];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    secili[rol] = a.slice(0, Math.min(2, a.length));
  });
  const aday = olaylar
    .filter((o) => o.rol !== 'gecis' || r() < Math.max(0.15, Math.min(0.9, sfxOrani)))
    .sort((a, b) => a.kare - b.kare);
  const bosluk = Math.round(fps * 0.8);
  const kalan: SfxOlay[] = [];
  for (const o of aday) {
    const son = kalan[kalan.length - 1];
    if (son && o.kare - son.kare < bosluk) {
      if (ONCELIK[o.rol] > ONCELIK[son.rol]) kalan[kalan.length - 1] = o;
      continue;
    }
    kalan.push(o);
  }
  // dakika tavani: her 60 sn'lik pencerede oncelige gore kirp
  const pencere = fps * 60, tavan = TAVAN[ton] || 12;
  const sonuc: SfxOlay[] = [];
  for (let p = 0; p <= (kalan[kalan.length - 1]?.kare ?? 0); p += pencere) {
    const g = kalan.filter((o) => o.kare >= p && o.kare < p + pencere);
    const tut = new Set([...g].sort((a, b) => ONCELIK[b.rol] - ONCELIK[a.rol]).slice(0, tavan));
    sonuc.push(...g.filter((o) => tut.has(o)));
  }
  const sayac: Partial<Record<SfxRol, number>> = {};
  return sonuc.map((o) => {
    const liste = secili[o.rol];
    const k = (sayac[o.rol] = (sayac[o.rol] ?? -1) + 1);
    const [dosya, sn, ses] = liste[k % liste.length];
    const [bas, tepe, db] = SFX_OLCU[dosya] ?? [0, 0.05, -6];
    const kirp = Math.max(0, bas - 0.04);                       // bastaki sessizlik
    const vurus = Math.round((tepe - kirp) * fps);              // ses basindan tepeye kare
    const kazanc = Math.min(6, Math.pow(10, (-3 - db) / 20));   // ornek tepesi -3 dBFS'e normalize (x rol seviyesi -> kirpilmaz)
    const sure = Math.max(4, Math.round(Math.min(sn + 2, tepe - kirp + KUYRUK[o.rol]) * fps));
    return { kare: Math.max(0, o.kare - vurus), dosya, sure, ses: ses * kazanc * (0.9 + r() * 0.2), rol: o.rol, kirp: Math.round(kirp * fps) };
  });
};

/** yerlesim planini calar. klasor: public altindaki sfx klasoru */
export const SfxKatmani: React.FC<{ plan: SfxYerlesim[]; klasor?: string; genelSes?: number }> = ({ plan, klasor = 'varlik/sfx', genelSes = 1 }) => {
  const { fps } = useVideoConfig();
  const kapanis = Math.round(fps * 0.25);
  return (
    <>
      {plan.map((s, i) => (
        <Sequence key={i} from={s.kare} durationInFrames={s.sure} layout="none">
          <Audio src={staticFile(`${klasor}/${s.dosya}`)} trimBefore={s.kirp}
            volume={(f) => s.ses * genelSes * interpolate(f, [0, 2, Math.max(3, s.sure - kapanis), s.sure], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
        </Sequence>
      ))}
    </>
  );
};
