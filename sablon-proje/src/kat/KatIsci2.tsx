import React from 'react';
import { AbsoluteFill, Freeze } from 'remotion';
import { Izgara } from '../Katalog';
import { FontYukle } from '../repertuar/FontYukle';
import { Medya } from '../repertuar/Medya';
import { Baslik, BaslikTip, Konum } from '../repertuar/Yazi';
import { HareketAd, stilYap } from '../repertuar/temel';

// Isci 2 katalogu (Opus galerisi baslik teknikleri). Root.tsx'te 'KatIsci2' olarak kayitli (150 kare).
// Izgara: 7 tip duz zeminde + 2 medya ustu (golge, alt-ucte-bir, guvenli alan cizgisi) hucre.
// Tek hucre tam boy: --props='{"hucre": 3}' (dizin). Telefon kontrolu: tek hucre --scale=0.1875 (360 px).
type Hucre = { ad: string; tip: BaslikTip; metin: string; ust?: string; p: string; f: string; h?: HareketAd; ton?: string; medya?: string; konum?: Konum; dagil?: number };
const HUCRELER: Hucre[] = [
  { ad: 'harf-toplanma', tip: 'harf-toplanma', metin: 'Artificial Intelligence', ust: 'Dartmouth, 1956', p: 'kahve-turuncu', f: 'poster-dar', ton: 'gizem' },
  { ad: 'kelime-dongusu (satir ici)', tip: 'kelime-dongusu', metin: 'Made in {Tokyo|Lagos|Paris|Istanbul}', ust: 'One supply chain', p: 'gece-turkuaz', f: 'grotesk-modern', ton: 'enerjik' },
  { ad: 'dev-kayan-kelime-bandi', tip: 'dev-kayan-kelime-bandi', metin: 'Breaking Point', ust: 'Episode 4', p: 'grafit-neon', f: 'teknik-dar', ton: 'enerjik' },
  { ad: 'karma-boy-satir', tip: 'karma-boy-satir', metin: 'The Floor _belongs to_ Us.', p: 'orman-altin', f: 'geometrik-kalin', ton: 'ciddi' },
  { ad: 'kelime-kelime-renk-vurgu', tip: 'kelime-kelime-renk-vurgu', metin: 'Easy Answer #2\nThe Verdict Nobody Expected', ust: 'Ranking 01', p: 'buz-kobalt', f: 'geometrik-kalin', ton: 'sakin' },
  { ad: 'rgb-tek-kare-giris (enerjik)', tip: 'rgb-tek-kare-giris', metin: 'System Override', ust: 'Level 9', p: 'synth-mor', f: 'sport-teko', ton: 'enerjik' },
  { ad: 'kelime-yigini-kolaj (dagil 118)', tip: 'kelime-yigini-kolaj', metin: 'No Frame Type Motion Break', p: 'beton-sari', f: 'poster-dar', ton: 'enerjik', dagil: 118 },
  // medya ustu: uzun metin, alt ucte bir, golge (guvenli alan cizgisi kesik kirmizi)
  { ad: 'kelime-dongusu (ust uste, medya)', tip: 'kelime-dongusu', metin: 'The Cheapest Rifle Ever Built Came From {America|Russia|Belgium}', ust: 'Chapter 2', p: 'zeytin-askeri', f: 'poster-dar', ton: 'ciddi', medya: 'ornek/a.jpg', konum: 'alt-ucte-bir' },
  { ad: 'karma-boy-satir (medya, uzun)', tip: 'karma-boy-satir', metin: 'The Price of a Rifle and the Cost of a War', ust: 'Chapter 2', p: 'bordo-krem', f: 'damga-stencil', ton: 'ciddi', medya: 'ornek/b.jpg', konum: 'alt-ucte-bir' },
];

const Sahne: React.FC<{ c: Hucre; i: number }> = ({ c, i }) => {
  const st = stilYap(c.p, c.f, c.h, 'isci2-' + i, c.ton);
  return (
    <AbsoluteFill style={{ background: st.palet.zemin }}>
      {c.medya ? <><Medya m={{ src: c.medya }} /><AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.3) 50%, rgba(0,0,0,.05))' }} />
        <div style={{ position: 'absolute', left: 100, right: 100, top: 0, bottom: 0, outline: '3px dashed rgba(255,0,80,.8)' }} /></> : null}
      <Baslik tip={c.tip} metin={c.metin} ust={c.ust} stil={st} boyut={c.medya ? 120 : 130} konum={c.konum || 'orta'} golge={!!c.medya} maxGenislik={c.medya ? 1720 : 1500} gec={6} dagil={c.dagil} />
    </AbsoluteFill>
  );
};

// guvenli alan modu (--props='{"mod": "medya"}'): 7 tip medya ustunde, alt ucte bir, KatYazi'nin iki satirlik uzun metniyle
const TIPLER: BaslikTip[] = ['harf-toplanma', 'kelime-dongusu', 'dev-kayan-kelime-bandi', 'karma-boy-satir', 'kelime-kelime-renk-vurgu', 'rgb-tek-kare-giris', 'kelime-yigini-kolaj'];
const MEDYA_P = ['zeytin-askeri', 'okyanus-mercan', 'grafit-neon', 'bordo-krem', 'gece-turkuaz', 'synth-mor', 'kahve-turuncu'];
const MEDYA_F = ['poster-dar', 'grotesk-modern', 'teknik-dar', 'klasik-serif', 'geometrik-kalin', 'sport-teko', 'damga-stencil'];

// kanit modu: --props='{"hucre": 3, "kareler": [12,13,14,15,40,100]}' -> ayni hucrenin verilen kareleri 3x2 dosemede (Freeze)
export const KatIsci2: React.FC<{ hucre?: number; kareler?: number[]; mod?: string }> = ({ hucre, kareler, mod }) => {
  if (mod === 'medya') {
    return <Izgara sutun={3} hucreler={TIPLER.map((t, i) => ({ ad: `${t} · medya · ${MEDYA_F[i]}`, el: <Sahne i={20 + i} c={{ ad: t, tip: t, metin: 'Easy Answer #2\nThe Verdict Nobody Expected', ust: 'Chapter 2', p: MEDYA_P[i], f: MEDYA_F[i], ton: 'enerjik', medya: i % 2 ? 'ornek/a.jpg' : 'ornek/b.jpg', konum: 'alt-ucte-bir' }} /> }))} />;
  }
  if (hucre != null && HUCRELER[hucre] && kareler?.length) {
    return <Izgara sutun={kareler.length > 4 ? 3 : 2} hucreler={kareler.map((k) => ({ ad: `${HUCRELER[hucre].ad} · kare ${k}`, el: <Freeze frame={k}><Sahne c={HUCRELER[hucre]} i={hucre} /></Freeze> }))} />;
  }
  if (hucre != null && HUCRELER[hucre]) return <AbsoluteFill><FontYukle /><Sahne c={HUCRELER[hucre]} i={hucre} /></AbsoluteFill>;
  return <Izgara sutun={3} hucreler={HUCRELER.map((c, i) => ({ ad: c.ad, el: <Sahne c={c} i={i} /> }))} />;
};
