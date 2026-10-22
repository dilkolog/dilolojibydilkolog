# Fiil laboratuvarında örnek cümle kapsamı

Güncelleme: 2026-10-21 (önceki sürüm 2026-10-13'tendi ve bayattı). Sayılar `src/data/tenses/{fr,es}.json` çekim tabloları ile `{fr,es}-sentences.json` örnek cümleleri karşılaştırılarak çıkarıldı. Fiil laboratuvarı fiilleri sıklık sırasına göre seviyelere böler (`engine/verbLab.ts` `verbLevels`: ilk 40 fiil A1, 40–120 A2, 120–300 B1, 300–600 B2, gerisi C1); öğrencinin en çok gördüğü fiiller bunlar. Hiç cümlesi olmayan fiillerin listesi: `fiil-ornek-yok-fr.txt`, `fiil-ornek-yok-es.txt` (yeniden üretildi; her satır: sıklık sırası ya da `-`, fiil; dönüşlü lemmayla cümlesi olanlar kapsanmış sayılır).

## Laboratuvarın gösterdiği zamanlar

Fransızca 12 zaman (présent … impératif), İspanyolca 14 zaman (presente … imperativo) gösterilir (`LAB_TENSES`). Soruların ve kelime sayfasının kullandığı "çekirdek" zamanlar FR'de 6, ES'de 7'dir (`TENSES`). Eskiden cümle yalnızca çekirdek zamanlarda vardı; 2026-10-21'den beri araç (`scripts/add-tense-sentences.ts`) laboratuvarın bütün zamanlarını kabul eder (aşağıdaki kurallar).

**Çekim tablosu eksikleri:** ilk 600 fiilde neredeyse hiç yok (FR 1 fiilin passé simple'ı, ES 1 fiilin üç zamanı: kusurlu/kişisiz fiiller). Düzeltilenler: `résoudre` ortacı `résous` → `résolu` (laboratuvar "j'ai résous" gösteriyordu); `pouvoir`un uydurma emir kipi ("peux, pouvons, pouvez") kaldırıldı (`tenses.ts` `FR_NO_IMPERATIVE`: laboratuvar bu zamanı artık göstermez).

## Çekirdek zamanlar (ilk 600 fiil)

| Seviye | FR eksik / toplam yuva | ES eksik / toplam yuva |
|---|---:|---:|
| A1 (ilk 40) | 0 / 200 | 7 / 280 |
| A2 (40–120) | 8 / 400 | 21 / 560 |
| B1 (120–300) | 14 / 900 | 21 / 1260 |
| B2 (300–600) | 85 / 1500 | 70 / 2098 |

(FR présent hariç: kayıtlı cümleler şimdiki zaman olmaz, aşağıya bak.) Kalan eksiklerin **hepsi bilerek yazılmayan fiillerdir**: ES `haber` (yardımcı fiil), kaba/argo (`joder`, `coger`, `follar`, `mear`, `cagar`, `orinar`, `pillar`), hassas (`violar`), sıfat/isim anlamı baskın (`militar`, `nuclear`, `solar`, `escolar`, `titular`, `pilar`, `auxiliar`, `reportar`); FR kaba/argo (`foutre`, `baiser`, `chier`, `pisser`, `bouffer`, `déconner`, `foirer`, `choper`, `mater`, `tanner`, `flipper`, `défoncer`, `draguer`, `buter`, `péter`, `sucer`), hassas (`violer`, `torturer`, `assassiner`, `suicider`), isim/özel ad (`officier`, `manager`, `harper`, `palmer`, `botter`, `piper`, `rocher`, `plancher`, `lester`, `river`), yalnızca dönüşlü kullanılan ve tablodaki yalın biçimi anlamsız olanlar (`souvenir`, `asseoir`, `fier`, `enfuir`, `moquer`, `soucier`) ve `ressortir`ın imparfait/subjonctif'i (tablo "ressortissait" veriyor: hukuki "ressortir" anlamı).

## Laboratuvarın öteki zamanları

İlk 120 fiil (A1 + A2) için bütün laboratuvar zamanlarının cümlesi var: FR passé simple, plus-que-parfait, futur antérieur, conditionnel passé, subjonctif passé, impératif; ES pluscuamperfecto, futuro perfecto, condicional perfecto, subjuntivo imperfecto/perfecto/pluscuamperfecto, imperativo. Bilerek boş bırakılan emir kipleri: FR `tuer`, `mourir`, `devoir`, `voler`, `marier`; ES `poder`, `morir`, `parecer`, `caer`, `escapar`, `necesitar`, `robar`, `deber` (doğal bir emir cümlesi kurulmuyor). 120–600. fiiller (B1–B2) aşağıda; 600. fiilden sonrasında (C1) bu zamanların cümlesi yok.

**Fransızca, 120–600. fiiller (B1–B2, 2026-10-21, partiler fr-26…fr-34):** passé simple, plus-que-parfait, futur antérieur, conditionnel passé ve subjonctif passé her fiilde var (yalnızca `distraire`ın passé simple'ı yok: tabloda bu zaman yok). Boş kalanlar bilerek yazılmayan fiiller: `officier`, `chier`, `enfuir`, `pisser`, `manager`, `harper`, `bouffer`, `suicider`, `buter`, `péter`, `palmer`, `botter`, `piper`, `moquer`, `violer`, `flipper`, `soucier`, `rocher`, `assassiner`, `déconner`, `sucer`, `torturer`, `choper`, `draguer`, `plancher`, `lester`, `foirer`, `river`, `tanner`, `défoncer`, `mater` (yukarıdaki listeyle aynı gerekçe) ve `débrouiller` (yalın biçimi neredeyse yalnızca dönüşlü kullanılır). Emir kipi yalnızca doğal bir emir cümlesi kurulabilen fiillerde yazıldı (120–600 arasındaki 480 fiilin 301'inde); `sembler`, `exister`, `naître`, `coûter`, `durer`, `regretter`, `mentir` gibi fiillerde emir kipi bilerek boş. Birleşik zamanlarda yardımcı fiil ile ortaç bitişik, özne eril ve önde dişil/çoğul nesne zamiri yok (tablo uyum bilmez).

**İspanyolca, 120–600. fiiller (B1–B2, 2026-10-21, partiler es-46…es-57):** pluscuamperfecto, futuro perfecto, condicional perfecto, subjuntivo imperfecto/perfecto/pluscuamperfecto her fiilde var (467 fiil × 6 zaman). Boş kalanlar yalnızca bilerek yazılmayan 13 fiil: `nuclear`, `solar`, `escolar`, `titular`, `pilar`, `auxiliar`, `reportar` (sıfat/isim anlamı baskın), `orinar`, `mear`, `follar`, `cagar`, `pillar` (kaba/argo), `violar` (hassas). Emir kipi yalnızca doğal bir emir cümlesi kurulabilen fiillerde yazıldı (467 fiilin 295'inde); `gustar`, `ocurrir`, `doler`, `llover`, `nacer`, `existir`, `costar`, `valer`, `amanecer`, `anochecer`, `atardecer`, `mentir`, `temer` gibi fiillerde ya da yalnızca olumsuz/dönüşlü emri doğal olanlarda (`preocupar`, `enfadar`, `afeitar`, `mudar`, `enterar`) emir kipi bilerek boş. `atardecer`ın presente ve subjuntivo tablosu yok (kişisiz fiil), cümlesi de yok.

## Zaman başına kapsam (tablodaki bütün fiiller)

Fransızca (4103 fiil, en az bir cümlesi olan 2816; toplam 10585 cümle):

| Zaman | Fiil sayısı |
|---|---:|
| présent | 0 (bilerek) |
| imparfait | 1903 |
| passé composé | 2385 |
| passé simple | 562 |
| plus-que-parfait | 563 |
| futur | 1402 |
| futur antérieur | 563 |
| conditionnel | 1029 |
| conditionnel passé | 563 |
| subjonctif | 642 |
| subjonctif passé | 563 |
| impératif | 410 |

İspanyolca (1456 fiil, en az bir cümlesi olan 1389; toplam 13237 cümle):

| Zaman | Fiil sayısı |
|---|---:|
| presente | 1280 |
| imperfecto | 1382 |
| pretérito | 1368 |
| perfecto | 1379 |
| pluscuamperfecto | 582 |
| futuro | 1380 |
| futuro perfecto | 582 |
| condicional | 1064 |
| condicional perfecto | 582 |
| subjuntivo | 1070 |
| subjuntivo imperfecto | 582 |
| subjuntivo perfecto | 582 |
| subjuntivo pluscuamperfecto | 582 |
| imperativo | 403 |

## Aracın kuralları (2026-10-21)

- Cümlede o zamanın tablodaki biçimlerinden tam biri tek kez geçmeli; bileşik zamanda yardımcı fiil ile ortaç bitişik olmalı (araya `pas`, `jamais`, `déjà`, `bien` girerse bulunmaz); tablo dişil/çoğul uyumu bilmez (eril tekil özne, önde nesne zamiri olmasın: "les a mariés" bulunmaz).
- Biçim fiilin başka bir zamanına da aitse reddedilir. İki istisna, cümle zamanı kendisi belli ettiğinde: **subjonctif/subjuntivo** biçimi şimdiki zaman, imparfait ya da emir kipiyle aynıysa önünde `que`/`qu'` (İspanyolcada `que`/`ojalá`) olmalı; böylece Fransızca `-er` fiillerinin subjonctif'i artık yazılabiliyor ("Il faut que tu parles"). **Emir kipi** şimdiki zaman/subjonctif/passé simple ile aynıysa cümleyi ya da yan cümleyi başlatmalı ("Parle plus fort", "Pasa, estás en tu casa").
- Fransızca **présent** cümlesi hâlâ kaydedilmez (`tenses.test.ts` denetler): laboratuvarın présent sekmesinde cümle yok. Elle yazılan cümlelerde Tatoeba'daki "isimle karışan biçim" sorunu olmadığı için bu kural gevşetilebilir; karar sahibinin.

## Partiler

`ornek-cumle-partileri/` altında: es-39/es-40 (ilk 600 fiilin eksik çekirdek zamanları), es-41/42/43/44 (ilk 120 fiilin öteki zamanları), es-45 (cümlesiz kalan iki fiil); fr-19/20/22/23 (ilk 600 fiilin eksik çekirdek zamanları, çoğu `-er` subjonctif'i), fr-21/24/25 (ilk 120 fiilin öteki zamanları), fr-26…fr-33 (120–600. fiillerin öteki zamanları, sıklık sırasıyla 60'ar fiil), fr-34 (aynı aralıkta ek emir kipi cümleleri); es-46…es-56 (120–600. fiillerin öteki zamanları, sıklık sırasıyla 30–60'ar fiil), es-57 (aynı aralıkta ek emir kipi cümleleri).
