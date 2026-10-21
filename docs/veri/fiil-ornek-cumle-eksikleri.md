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

İlk 120 fiil (A1 + A2) için bütün laboratuvar zamanlarının cümlesi var: FR passé simple, plus-que-parfait, futur antérieur, conditionnel passé, subjonctif passé, impératif; ES pluscuamperfecto, futuro perfecto, condicional perfecto, subjuntivo imperfecto/perfecto/pluscuamperfecto, imperativo. Bilerek boş bırakılan emir kipleri: FR `tuer`, `mourir`, `devoir`, `voler`, `marier`; ES `poder`, `morir`, `parecer`, `caer`, `escapar`, `necesitar`, `robar`, `deber` (doğal bir emir cümlesi kurulmuyor). 120. fiilden sonrasında bu zamanların cümlesi yok (B1–C1: sıradaki iş).

## Zaman başına kapsam (tablodaki bütün fiiller)

Fransızca (4103 fiil, en az bir cümlesi olan 2816; toplam 8359 cümle):

| Zaman | Fiil sayısı |
|---|---:|
| présent | 0 (bilerek) |
| imparfait | 1903 |
| passé composé | 2385 |
| passé simple | 115 |
| plus-que-parfait | 115 |
| futur | 1402 |
| futur antérieur | 115 |
| conditionnel | 1029 |
| conditionnel passé | 115 |
| subjonctif | 642 |
| subjonctif passé | 115 |
| impératif | 109 |

İspanyolca (1456 fiil, en az bir cümlesi olan 1389; toplam 10140 cümle):

| Zaman | Fiil sayısı |
|---|---:|
| presente | 1280 |
| imperfecto | 1382 |
| pretérito | 1368 |
| perfecto | 1379 |
| pluscuamperfecto | 115 |
| futuro | 1380 |
| futuro perfecto | 115 |
| condicional | 1064 |
| condicional perfecto | 115 |
| subjuntivo | 1070 |
| subjuntivo imperfecto | 115 |
| subjuntivo perfecto | 115 |
| subjuntivo pluscuamperfecto | 115 |
| imperativo | 108 |

## Aracın kuralları (2026-10-21)

- Cümlede o zamanın tablodaki biçimlerinden tam biri tek kez geçmeli; bileşik zamanda yardımcı fiil ile ortaç bitişik olmalı (araya `pas`, `jamais`, `déjà`, `bien` girerse bulunmaz); tablo dişil/çoğul uyumu bilmez (eril tekil özne, önde nesne zamiri olmasın: "les a mariés" bulunmaz).
- Biçim fiilin başka bir zamanına da aitse reddedilir. İki istisna, cümle zamanı kendisi belli ettiğinde: **subjonctif/subjuntivo** biçimi şimdiki zaman, imparfait ya da emir kipiyle aynıysa önünde `que`/`qu'` (İspanyolcada `que`/`ojalá`) olmalı; böylece Fransızca `-er` fiillerinin subjonctif'i artık yazılabiliyor ("Il faut que tu parles"). **Emir kipi** şimdiki zaman/subjonctif/passé simple ile aynıysa cümleyi ya da yan cümleyi başlatmalı ("Parle plus fort", "Pasa, estás en tu casa").
- Fransızca **présent** cümlesi hâlâ kaydedilmez (`tenses.test.ts` denetler): laboratuvarın présent sekmesinde cümle yok. Elle yazılan cümlelerde Tatoeba'daki "isimle karışan biçim" sorunu olmadığı için bu kural gevşetilebilir; karar sahibinin.

## Partiler

`ornek-cumle-partileri/` altında: es-39/es-40 (ilk 600 fiilin eksik çekirdek zamanları), es-41/42/43/44 (ilk 120 fiilin öteki zamanları), es-45 (cümlesiz kalan iki fiil); fr-19/20/22/23 (ilk 600 fiilin eksik çekirdek zamanları, çoğu `-er` subjonctif'i), fr-21/24/25 (ilk 120 fiilin öteki zamanları).
