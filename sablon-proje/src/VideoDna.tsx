import React from 'react';
import presetler from '../public/varlik/preset-dili-remotion.json';
import { VideoDna as OrtakVideoDna } from './repertuar/VideoDna';

// Kurgu sablonu ortak repertuarda (repertuar/VideoDna.tsx: Dna* + SFX + vurus + bitis). Kanal yalniz presetlerini verir.
// Kayit (Root.tsx): <Composition id="VideoDna" component={VideoDna as any} durationInFrames={300} fps={30} width={1920} height={1080}
//   defaultProps={{ dna: {} as any, veri: { klasor: '', fps: 30, toplam: 30, cekimler: [], kelimeler: [] } }}
//   calculateMetadata={({ props }: any) => ({ durationInFrames: Math.max(30, props.veri.toplam) })} />
export type { Kart, Cekim, SahneVeri } from './repertuar/VideoDna';
export const VideoDna: React.FC<any> = (p) => <OrtakVideoDna presetler={presetler as any} {...p} />;
