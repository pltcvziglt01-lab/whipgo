import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { FONTLAR } from './temel';

// public/fontlar/<Ad>.ttf dosyalarini yukler; render, fontlar inmeden baslamaz.
const yuklendi = new Set<string>();
export const FontYukle: React.FC<{ adlar?: string[] }> = ({ adlar }) => {
  const liste = adlar && adlar.length ? adlar : Array.from(new Set(Object.values(FONTLAR).flatMap((f) => [f.baslik, f.govde, f.mono])));
  const [h] = useState(() => delayRender('fontlar'));
  useEffect(() => {
    Promise.all(liste.filter((a) => !yuklendi.has(a)).map((a) => {
      yuklendi.add(a);
      return new FontFace(a, `url(${staticFile(`fontlar/${a}.ttf`)})`).load().then((ff) => { (document as any).fonts.add(ff); }).catch(() => undefined);
    })).then(() => continueRender(h));
  }, []);
  return null;
};
