#!/usr/bin/env python3
"""Seslendirmeden ve gorsel uretiminden ONCE metin ve prompt kontrolu.

Kullanim:
  py metin_kontrol.py --metin metin.txt --dil de|en|tr|ja [--yasakli adlar.txt]
  py metin_kontrol.py --istemler istemler.txt|istemler.json [--yasakli adlar.txt]
  (ikisi birlikte de verilebilir; kalip_kontrol.py ile birlikte calisir, onun yerine gecmez)

METIN
  FAIL  TTS'te gurultu/duraklama yapan isaretler (uzun tire —, ..., parantez icinde uzun aciklama)
        40 kelimeden uzun cumle
  UYARI makine yazisi izleri ve kliseler (dile gore liste) · ayni kelimeyle baslayan 3+ ardisik cumle
        ayni cumle iki kez · rakamla yazilmis sayi (TTS icin yaziyla yaz; yil/oran istisna olabilir)
ISTEMLER (gorsel/video modeli promptlari; satir basina bir istem ya da JSON liste/sozluk)
  FAIL  yazi isteyen kelime (sign, poster, label, newspaper, banner, logo, caption, Schild, 看板...) VE
        "no text" korumasi yok · yasakli listedeki ad (gercek kisi/marka; modeller reddeder ya da risk)
  UYARI hic "no text / no letters" korumasi olmayan istem · iki buyuk harfli kelimelik ozel ad gorunumu
"""
import argparse, collections, json, re, sys

KLISE = {
    'en': ["in today's video", "let's dive in", "dive into", "delve", "in this day and age", "it's important to note",
           "it is worth noting", "game-changer", "game changer", "unlock the secrets", "buckle up", "without further ado",
           "at the end of the day", "in conclusion", "the world of", "a testament to", "tapestry", "navigate the",
           "ever-evolving", "in the realm of", "stay tuned", "smash that like", "whether you're", "embark on",
           "it's no secret", "here's the thing", "let that sink in", "but here's the kicker", "not just", "more than just"],
    'de': ["in diesem video", "lass uns eintauchen", "tauchen wir ein", "es ist wichtig zu beachten", "spannende reise",
           "in der heutigen zeit", "zusammenfassend lässt sich sagen", "am ende des tages", "die welt der",
           "ohne weitere umschweife", "bleiben sie dran", "nicht nur", "mehr als nur", "ein zeugnis für", "facettenreich"],
    'tr': ["bu videoda", "hadi başlayalım", "derinlemesine", "günümüzde", "unutulmamalıdır ki", "önemle belirtmek gerekir",
           "sonuç olarak", "günün sonunda", "dünyasına yolculuk", "lafı fazla uzatmadan", "bir yolculuğa çıkalım",
           "sadece bir", "değil, aynı zamanda", "şunu belirtmek gerekir", "merak etmeyin"],
    'ja': ["いかがでしたか", "について解説します", "結論から言うと", "ぜひ最後まで", "それでは早速", "知っておきたい"],
}
YAZI_ISTEYEN = r'\b(sign|signs|signage|poster|label|labels|newspaper|headline|banner|logo|caption|subtitle|text|letters|' \
               r'writing|written|billboard|menu|book cover|plaque|inscription|schild|plakat|zeitung|aufschrift|beschriftung|' \
               r'tabela|afiş|gazete|yazı)\b|看板|ポスター|新聞|文字|ロゴ'
KORUMA = r'no text|without text|no letters|no writing|no words|no captions|no logos|text-free|kein text|ohne text|yazısız|yazı yok|文字なし'


def cumleler(metin):
    metin = '\n'.join(s for s in metin.splitlines() if not s.lstrip().startswith('#'))
    return [c.strip() for c in re.split(r'(?<=[.!?…。！？])\s+', metin) if c.strip()]


def metin_kontrol(yol, dil, F, U):
    m = open(yol, encoding='utf-8-sig').read()
    cs = cumleler(m)
    for i, c in enumerate(cs):
        n = len(c.split())
        if n > 40:
            F.append(f'cumle {i + 1} {n} kelime (>40): "{c[:70]}…"')
        if '—' in c or '–' in c:
            F.append(f'cumle {i + 1}: uzun tire TTS\'te duraklama/gurultu yapar: "{c[:70]}"')
        if '...' in c:
            U.append(f'cumle {i + 1}: "..." (TTS uzun duraklar) "{c[:60]}"')
        if re.search(r'\([^)]{25,}\)', c):
            F.append(f'cumle {i + 1}: parantez icinde uzun aciklama (okunusta kopar)')
        sayi = re.findall(r'(?<![\w.])\d[\d.,]*(?![\w])', c)
        sayi = [x for x in sayi if not re.fullmatch(r'(1[5-9]|20)\d\d', x)]
        if sayi and dil != 'ja':
            U.append(f'cumle {i + 1}: rakamla sayi {sayi[:3]} (TTS icin yaziyla yaz ya da okunusu dene)')
    alt = m.lower()
    for k in KLISE.get(dil, []) + (KLISE['en'] if dil != 'en' else []):
        n = alt.count(k)
        if n:
            U.append(f'klise/makine izi "{k}" x{n}')
    bas = [re.findall(r'\w+', c.lower())[:1] for c in cs]
    seri = 1
    for i in range(1, len(bas)):
        seri = seri + 1 if bas[i] and bas[i] == bas[i - 1] else 1
        if seri == 3:
            U.append(f'cumle {i - 1}-{i + 1}: ayni kelimeyle ({bas[i][0]}) basliyor')
    for c, n in collections.Counter(cs).items():
        if n > 1 and len(c.split()) > 3:
            U.append(f'ayni cumle {n} kez: "{c[:60]}"')
    print(f'metin: {len(cs)} cumle, {len(m.split())} kelime')


def istem_kontrol(yol, yasakli, F, U):
    ham = open(yol, encoding='utf-8-sig').read()
    try:
        j = json.loads(ham)
        istemler = list(j.items()) if isinstance(j, dict) else [(str(i), x if isinstance(x, str) else json.dumps(x, ensure_ascii=False)) for i, x in enumerate(j)]
    except json.JSONDecodeError:
        istemler = [(str(i + 1), s) for i, s in enumerate(ham.splitlines()) if s.strip()]
    for ad, ist in istemler:
        ist = ist if isinstance(ist, str) else json.dumps(ist, ensure_ascii=False)
        low = ist.lower()
        korumali = re.search(KORUMA, low) is not None
        if re.search(YAZI_ISTEYEN, low) and not korumali:
            F.append(f'istem {ad}: yazi cikaracak kelime var, "no text" korumasi yok: "{ist[:70]}"')
        elif not korumali:
            U.append(f'istem {ad}: "no text, no letters, no logos" korumasi yok')
        for y in yasakli:
            if y and y.lower() in low:
                F.append(f'istem {ad}: yasakli ad "{y}"')
        for m in re.findall(r'(?<![.!?]\s)(?<!^)\b([A-Z][a-z]+ [A-Z][a-z]+)\b', ist):
            U.append(f'istem {ad}: ozel ad gibi "{m}" (gercek kisi/marka ise kaldir, tarif et)')
    print(f'istem: {len(istemler)} adet')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--metin')
    ap.add_argument('--dil', default='en')
    ap.add_argument('--istemler')
    ap.add_argument('--yasakli', help='satir basina bir ad (gercek kisi, marka, telifli karakter)')
    a = ap.parse_args()
    if not (a.metin or a.istemler):
        sys.exit('--metin ya da --istemler ver')
    F, U = [], []
    yasakli = [s.strip() for s in open(a.yasakli, encoding='utf-8-sig')] if a.yasakli else []
    if a.metin:
        metin_kontrol(a.metin, a.dil, F, U)
    if a.istemler:
        istem_kontrol(a.istemler, yasakli, F, U)
    for x in F:
        print('FAIL ', x)
    for x in U[:60]:
        print('UYARI', x)
    if len(U) > 60:
        print(f'... {len(U) - 60} uyari daha')
    print(f'METIN {"PASS" if not F else "FAIL"} fail={len(F)} uyari={len(U)}')
    sys.exit(1 if F else 0)


if __name__ == '__main__':
    for _a in (sys.stdout, sys.stderr):
        try:
            _a.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
