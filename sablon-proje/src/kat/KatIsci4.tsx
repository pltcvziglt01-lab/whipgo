import React from 'react';
import { AbsoluteFill, Freeze } from 'remotion';
import { Izgara } from '../Katalog';
import { FontYukle } from '../repertuar/FontYukle';
import { stilYap } from '../repertuar/temel';
import { Sahne } from '../repertuar/Sahne';
import { AgBuyume, DonguSemasi, IliskiCipleri, MeclisYarimDaire } from '../repertuar/Grafik';
import { DunyaHaritasi, NoktaKure } from '../repertuar/Harita';
import { Hud } from '../repertuar/Hud';
import { Doku, Medya, MedyaKaynak, OlcekYolculugu } from '../repertuar/Medya';
import { Vurus } from '../repertuar/Vurus';

// Isci 4 katalogu (Opus galerisi: Sahne.tsx 10 tip + grafik 4 + harita 2 + hud 1 + doku 2 + kamera 1 + vurus 1).
// Props yoksa izgara (5 sutun); { hucre: '<ad>' } ile tek hucre tam kadraj (gozle kontrol: --props='{"hucre":"spot-konisi"}').
const A: MedyaKaynak = { src: 'ornek/a.jpg' }, B: MedyaKaynak = { src: 'ornek/b.jpg' }, C: MedyaKaynak = { src: 'ornek/c.jpg' };

const HUCRELER: { ad: string; el: React.ReactNode }[] = [
  { ad: 'cizim-dolgu', el: <Sahne tip="cizim-dolgu" stil={stilYap('kum-terrakota', 'editoryal-serif', 'kubik-hizli', 'cz', 'sakin')} sekil="kubbe" baslik="Ayasofya, 537" altBaslik="Kubbe kırk pencerenin üstünde yükselir" /> },
  { ad: 'birikimli-sahne', el: <Sahne tip="birikimli-sahne" stil={stilYap('buz-kobalt', 'grotesk-modern', 'kubik-hizli', 'bs', 'sakin')} adim={1.3}
    ogeler={[{ ad: 'Temel atıldı', tarih: '1931', deger: 120, aciklama: 'işçi sahada' }, { ad: 'Kule yükseliyor', tarih: '1932', deger: 1800, aciklama: 'işçi, iki vardiya' }, { ad: 'Vinçler kuruldu', tarih: '1933', deger: 2600, aciklama: 'işçi, üç vardiya' }, { ad: 'Kemer kapandı', tarih: '1934', deger: 3400, aciklama: 'işçi, son ay' }]} /> },
  { ad: 'patlatilmis-gorunum', el: <Sahne tip="patlatilmis-gorunum" stil={stilYap('zeytin-askeri', 'teknik-dar', 'kubik-hizli', 'pg', 'ciddi')} baslik="Motorun içi" sure={4.6}
    ogeler={[{ ad: 'Silindir kapağı', aciklama: 'alüminyum döküm' }, { ad: 'Piston', aciklama: '4 adet, 86 mm' }, { ad: 'Krank mili', aciklama: 'dövme çelik' }, { ad: 'Karter', aciklama: '5,2 litre yağ' }]} /> },
  { ad: 'siluet-katman', el: <Sahne tip="siluet-katman" stil={stilYap('gazete-sepya', 'klasik-serif', 'kubik-hizli', 'sk', 'ciddi')} tarih="1912" baslik="“Deniz bize her şeyi verdi.”" altBaslik="Bir fener bekçisinin günlüğünden" /> },
  { ad: 'stil-dongusu', el: <Sahne tip="stil-dongusu" stil={stilYap('grafit-neon', 'poster-dar', 'kubik-hizli', 'sd', 'enerjik')} medya={[B]} baslik="Aynı an, dört dünya" altBaslik="çizimden gazeteye" adim={0.7} /> },
  { ad: 'kart-yelpaze-dagilma', el: <Sahne tip="kart-yelpaze-dagilma" stil={stilYap('orman-altin', 'klasik-serif', 'kubik-hizli', 'ky', 'sakin')} medya={[A, B, C, A, B]} baslik="Kayıp mektuplar" altBaslik="1944 · Normandiya" /> },
  { ad: 'kart-yelpaze-toplan', el: <Sahne tip="kart-yelpaze-dagilma" toplan stil={stilYap('kahve-turuncu', 'grotesk-modern', 'kubik-hizli', 'kt', 'enerjik')} medya={[A, B, C, B, A]} baslik="Beş tanık, tek hikâye" /> },
  { ad: 'egik-kart-akisi', el: <Sahne tip="egik-kart-akisi" stil={stilYap('bordo-krem', 'gazete', 'kubik-hizli', 'ek', 'ciddi')} medya={[A, B, C]} sayac={[0, 412]} baslik="Manşetlerde bir hafta" altBaslik="haber, yedi günde"
    ogeler={[{ ad: 'Grev büyüyor' }, { ad: 'Liman kapandı' }, { ad: 'Bakan istifa etti' }, { ad: 'Fiyatlar uçtu' }, { ad: 'Meclis toplandı' }]} /> },
  { ad: 'karsitlik-paneli', el: <Sahne tip="karsitlik-paneli" stil={stilYap('gece-turkuaz', 'poster-dar', 'kubik-hizli', 'kp', 'ciddi')} medya={[C]} altBaslik="Önce zafer, sonra yalnızlık." adim={1.1}
    ogeler={[{ ad: 'Kartaca', medya: A, alt: ['Filler Alpleri aşar', 'Cannae zaferi', 'İtalya’da 15 yıl'] }, { ad: 'Roma', medya: B, alt: ['Fabius oyalar', 'Scipio Afrika’ya çıkar'] }]} /> },
  { ad: 'kalici-bag-nesnesi', el: <Sahne tip="kalici-bag-nesnesi" stil={stilYap('kahve-turuncu', 'geometrik-kalin', 'kubik-hizli', 'kb', 'ciddi')} medya={[C]} anlar={[0.8]} sembol="halka" baslik="Aynı sinyal, yine" /> },
  { ad: 'kalici-bag-sarmal', el: <Sahne tip="kalici-bag-nesnesi" stil={stilYap('okyanus-mercan', 'grotesk-modern', 'kubik-hizli', 'ks', 'gizem')} medya={[B]} anlar={[2.4]} sembol="sarmal" baslik="Sarmal geri döndü" /> },
  { ad: 'spot-konisi', el: <Sahne tip="spot-konisi" stil={stilYap('derin-deniz', 'teknik-dar', 'kubik-hizli', 'sp', 'gizem')} medya={[A]} baslik="Kayıp dosya" altBaslik="Oda 214 · 1978" /> },
  { ad: 'meclis-yarim-daire', el: <MeclisYarimDaire stil={stilYap('buz-kobalt', 'grotesk-modern', 'kubik-hizli', 'my', 'ciddi')} baslik="Meclis · 395 sandalye"
    gruplar={[{ ad: 'Halk', sayi: 168 }, { ad: 'Birlik', sayi: 112 }, { ad: 'Yeşiller', sayi: 61 }, { ad: 'Bağımsız', sayi: 54 }]} /> },
  { ad: 'ag-buyume', el: <AgBuyume stil={stilYap('okyanus-mercan', 'grotesk-modern', 'kubik-hizli', 'ag', 'ciddi')} baslik="Para nereye aktı" sure={3}
    dugumler={Array.from({ length: 24 }, (_, i) => ({ ad: ['Merkez Banka', 'Paravan Şirket', 'Liman', 'Holding'][i] , skor: [96, 81, 40, 55][i] ?? 8 + ((i * 37) % 50) }))} /> },
  { ad: 'dongu-semasi', el: <DonguSemasi stil={stilYap('nane-krem', 'grotesk-modern', 'kubik-hizli', 'dg', 'ciddi')} baslik="Kısır döngü" dugumler={['Borç', 'Faiz', 'Enflasyon']} turlar={4} turSn={0.8} /> },
  { ad: 'iliski-cipleri', el: <IliskiCipleri stil={stilYap('kum-terrakota', 'grotesk-modern', 'kubik-hizli', 'ic', 'ciddi')} baslik="Bölünme" cipler={['Osmanlı', 'Türkiye', 'Irak']} aciklama={['1923 sonrası iki ayrı devlet', 'Musul meselesi 1926’da kapanır']} /> },
  { ad: 'dunya-haritasi-yakinlasma', el: <DunyaHaritasi stil={stilYap('buz-kobalt', 'grotesk-modern', 'kubik-hizli', 'dh', 'ciddi')} ulke="Türkiye" sayi={[930, 500]} birim="+" etiket="deprem istasyonu" sure={2}
    sehirler={[{ ad: 'İstanbul', lon: 28.98, lat: 41.01 }, { ad: 'Ankara', lon: 32.85, lat: 39.93 }, { ad: 'İzmir', lon: 27.14, lat: 38.42 }]} /> },
  { ad: 'nokta-kure', el: <NoktaKure stil={stilYap('gece-turkuaz', 'grotesk-modern', 'kubik-hizli', 'nk', 'ciddi')} sayi={[0, 1240]} etiket="günlük uçuş" sure={2.2} maske={C}
    rotalar={[[[29, 41], [-74, 40.7]], [[29, 41], [139.7, 35.7]], [[29, 41], [37.6, 55.7]]]} /> },
  { ad: 'dergi-cercevesi', el: <AbsoluteFill><Medya m={B} /><Hud tip="dergi-cercevesi" stil={stilYap('gazete-sepya', 'editoryal-serif', 'kubik-hizli', 'dc', 'sakin')} ust="Arşiv Dergisi" etiket="Bölüm 3 · Savaş ekonomisi" deger={12} baslangic={1} birim="Kaynak: Ulusal Arşiv, 1944" gec={4} /></AbsoluteFill> },
  { ad: 'gun-gece-renk', el: <AbsoluteFill><Medya m={C} /><Doku tip="gun-gece-renk" stil={stilYap('gece-turkuaz')} /></AbsoluteFill> },
  { ad: 'gri-ton-damga', el: <AbsoluteFill><Medya m={B} /><Doku tip="gri-ton-damga" stil={stilYap('gece-turkuaz')} gec={30} metin="Durdu" /></AbsoluteFill> },
  { ad: 'olcek-yolculugu', el: <OlcekYolculugu stil={stilYap('derin-deniz', 'teknik-dar', 'kubik-hizli', 'oy', 'sakin')} bolgeSn={1.9}
    bolgeler={[{ m: A, ad: 'Eğitmen', olcek: '10⁰ m' }, { m: B, ad: 'Üs', olcek: '10² m' }, { m: C, ad: 'Tören alanı', olcek: '10³ m' }]} /> },
  { ad: 'olcek-yolculugu-medya', el: <Medya m={C} kamera="olcek-yolculugu" /> },
  { ad: 'kilometre-tasi-halka', el: <Vurus stil={stilYap('gece-turkuaz', 'poster-dar')} tip="kilometre-tasi-halka" gec={30} x={0.5} y={0.42} etiket="1 milyon"><Medya m={C} kamera="ken-burns-ice" /></Vurus> },
];

/** hucre: tek hucre tam kadraj. kareler (4 kare no): ayni hucrenin 4 ani 2x2 (her biri 960x540, Freeze ile) — animasyon
 *  ortasi + oturmus kare tek renderda; 960 px genislik telefon (360 px) kontrolu icin kucultulur. */
export const KatIsci4: React.FC<{ hucre?: string; kareler?: number[] }> = ({ hucre, kareler }) => {
  const h = hucre ? HUCRELER.find((c) => c.ad === hucre) : null;
  if (h && kareler?.length) {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <FontYukle />
        {kareler.slice(0, 4).map((k, i) => (
          <div key={i} style={{ position: 'absolute', left: (i % 2) * 960, top: Math.floor(i / 2) * 540, width: 960, height: 540, overflow: 'hidden' }}>
            <div style={{ width: 1920, height: 1080, transform: 'scale(0.5)', transformOrigin: '0 0', position: 'relative' }}><Freeze frame={k}>{h.el}</Freeze></div>
            <div style={{ position: 'absolute', left: 6, top: 6, background: 'rgba(0,0,0,.75)', color: '#fff', font: '700 22px Arial', padding: '2px 8px' }}>{k}</div>
          </div>
        ))}
      </AbsoluteFill>
    );
  }
  if (h) return <AbsoluteFill style={{ background: '#000' }}><FontYukle />{h.el}</AbsoluteFill>;
  return <Izgara hucreler={HUCRELER} sutun={5} />;
};
