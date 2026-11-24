import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FontYukle } from './repertuar/FontYukle';

// Izgara katalog: her hucre 1920x1080 tam sahneyi olcekleyerek gosterir (gorsel kontrol icin)
export const Izgara: React.FC<{ hucreler: { ad: string; el: React.ReactNode }[]; sutun?: number }> = ({ hucreler, sutun = 4 }) => {
  const s = 1 / sutun, w = 1920 * s, h = 1080 * s;
  return (
    <AbsoluteFill style={{ background: '#777' }}>
      <FontYukle />
      {hucreler.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: (i % sutun) * w, top: Math.floor(i / sutun) * h, width: w, height: h, overflow: 'hidden', outline: '1px solid #000' }}>
          <div style={{ width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0', position: 'relative' }}>{c.el}</div>
          <div style={{ position: 'absolute', left: 4, top: 4, background: 'rgba(0,0,0,.75)', color: '#fff', font: '600 13px Arial', padding: '2px 6px' }}>{c.ad}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
