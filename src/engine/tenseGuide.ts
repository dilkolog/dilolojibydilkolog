import { normalize } from './answerCheck'
import { answersFor, subjectLabel, tenseOfForm, type Tense } from './tenses'
import type { VocabularyEntry } from './types'

/**
 * What each tense is for, in Turkish (adapted from the diloloji project's notes): a one-line
 * meaning, how it is formed, two examples and the time words that usually call for it. Knowing
 * why a form is used, not only what it looks like, is what makes it usable (Ellis 2006,
 * form–meaning mapping); the time words are the cue the learner will meet in real sentences.
 */
export interface TenseGuide {
  /** Name as the language calls it. */
  name: string
  /** Short Turkish label: "Geçmiş (-di)". */
  tr: string
  short: string
  formation: string
  examples: [string, string][]
  markers: string[]
}

export const TENSE_GUIDE: Record<Tense, TenseGuide> = {
  present: {
    name: 'présent',
    tr: 'Şimdiki / geniş zaman',
    short: 'Şu an olanı, alışkanlıkları ve genel doğruları anlatır: hem "yapıyorum" hem "yaparım".',
    formation: '-er fiiller: kök + -e, -es, -e, -ons, -ez, -ent (parler → je parle). -ir (-iss-) fiiller: -is, -is, -it, -issons, -issez, -issent. Düzensizler (être, avoir, aller, faire) ezberlenir.',
    examples: [
      ['Nous parlons français.', 'Fransızca konuşuyoruz.'],
      ["Il fait beau aujourd'hui.", 'Bugün hava güzel.'],
    ],
    markers: ['maintenant', "aujourd'hui", 'toujours', 'souvent', 'tous les jours', "d'habitude"],
  },
  'passe-compose': {
    name: 'passé composé',
    tr: 'Geçmiş (-di)',
    short: 'Geçmişte olup biten eylem: "yaptım". Konuşmada en çok kullanılan geçmiş zaman.',
    formation: 'avoir ya da être (présent) + participe passé: j\'ai parlé, je suis allé. Hareket ve durum değişimi fiilleri (aller, venir, partir, naître…) ve dönüşlü fiiller être alır; o zaman participe özneye uyar (elle est partie, ils sont allés).',
    examples: [
      ["J'ai mangé une pizza hier.", 'Dün bir pizza yedim.'],
      ['Elle est partie à huit heures.', 'Saat sekizde gitti.'],
    ],
    markers: ['hier', 'la semaine dernière', 'il y a deux jours', 'soudain', 'une fois', 'en 2020'],
  },
  imparfait: {
    name: 'imparfait',
    tr: 'Süren geçmiş (-iyordu, -erdi)',
    short: 'Geçmişte süren durum, alışkanlık ya da arka plan: "yapıyordum, yapardım". Olup biten tek olay için passé composé.',
    formation: 'nous formunun (présent) kökü + -ais, -ais, -ait, -ions, -iez, -aient: nous parlons → je parlais. Tek düzensiz kök être: j\'étais.',
    examples: [
      ["Quand j'étais petit, je jouais au football.", 'Küçükken futbol oynardım.'],
      ['Il pleuvait quand nous sommes arrivés.', 'Vardığımızda yağmur yağıyordu.'],
    ],
    markers: ['autrefois', "quand j'étais petit", 'tous les étés', "à l'époque", 'pendant que', 'souvent'],
  },
  futur: {
    name: 'futur simple',
    tr: 'Gelecek (-ecek)',
    short: 'Gelecekte olacak eylem, tahmin ya da niyet: "yapacağım".',
    formation: 'Mastar + -ai, -as, -a, -ons, -ez, -ont: parler → je parlerai; -re fiillerde son -e düşer: prendre → je prendrai. Düzensiz kökler: serai, aurai, irai, ferai, viendrai, pourrai.',
    examples: [
      ['Demain, il fera beau.', 'Yarın hava güzel olacak.'],
      ['Nous partirons à midi.', 'Öğlen yola çıkacağız.'],
    ],
    markers: ['demain', "l'année prochaine", 'bientôt', 'dans deux jours', 'un jour', 'plus tard'],
  },
  conditionnel: {
    name: 'conditionnel présent',
    tr: 'Şart kipi (-erdi, -ardı)',
    short: 'Bir koşula bağlı olan, nazik bir istek ya da hayal: "yapardım, ister miydiniz".',
    formation: 'Futur kökü + imparfait ekleri (-ais, -ais, -ait, -ions, -iez, -aient): parler → je parlerais, être → je serais, avoir → j\'aurais. Koşul cümlesinde "si" ile imparfait gelir: Si j\'avais le temps, je viendrais.',
    examples: [
      ['Je voudrais un café, s\'il vous plaît.', 'Bir kahve rica ediyorum.'],
      ["Si j'avais le temps, je viendrais.", 'Vaktim olsa gelirdim.'],
    ],
    markers: ['si j\'avais…', 'je voudrais', 'à ta place', 'volontiers', 'ce serait', 'au cas où'],
  },
  subjonctif: {
    name: 'subjonctif présent',
    tr: 'Dilek kipi (-mesi, -sin)',
    short: 'İstek, duygu, gereklilik ya da şüphe bildiren bir ifadeden sonra "que" ile: "gelmeni istiyorum, gelmesi gerek".',
    formation: 'ils formunun (présent) kökü + -e, -es, -e, -ent; nous ve vous imparfait gibi (-ions, -iez): ils prennent → que je prenne, que nous prenions. Düzensizler: être → que je sois, avoir → que j\'aie, aller → que j\'aille, faire → que je fasse, pouvoir → que je puisse.',
    examples: [
      ['Il faut que tu viennes.', 'Gelmen gerekiyor.'],
      ["Je suis content qu'elle soit là.", 'Onun burada olmasına seviniyorum.'],
    ],
    markers: ['il faut que', 'je veux que', 'bien que', 'pour que', 'avant que', 'je suis content que'],
  },
  presente: {
    name: 'presente',
    tr: 'Şimdiki / geniş zaman',
    short: 'Şu an olanı, alışkanlıkları ve genel doğruları anlatır: hem "yapıyorum" hem "yaparım".',
    formation: '-ar: kök + -o, -as, -a, -amos, -áis, -an (hablo). -er: -o, -es, -e, -emos, -éis, -en. -ir: -o, -es, -e, -imos, -ís, -en. Düzensizler (ser, estar, ir, tener) ve kök değişenler (pienso, puedo, pido) ezberlenir.',
    examples: [
      ['Nosotros hablamos español.', 'İspanyolca konuşuyoruz.'],
      ['Hoy hace buen tiempo.', 'Bugün hava güzel.'],
    ],
    markers: ['ahora', 'hoy', 'siempre', 'normalmente', 'todos los días', 'a veces'],
  },
  preterito: {
    name: 'pretérito indefinido',
    tr: 'Geçmiş (-di)',
    short: 'Geçmişte belli bir anda olup biten eylem: "yaptım". Bitmiş bir zamanla kullanılır (ayer, el año pasado).',
    formation: '-ar: kök + -é, -aste, -ó, -amos, -asteis, -aron (hablé). -er/-ir: -í, -iste, -ió, -imos, -isteis, -ieron (comí). Düzensiz kökler: tuv-, estuv-, hic-, pud-, dij-, vin-; ser ve ir aynı: fui, fuiste, fue.',
    examples: [
      ['Ayer comí una pizza.', 'Dün bir pizza yedim.'],
      ['Ella salió a las ocho.', 'Saat sekizde çıktı.'],
    ],
    markers: ['ayer', 'anteayer', 'el lunes pasado', 'en 2020', 'de repente', 'una vez'],
  },
  perfecto: {
    name: 'pretérito perfecto',
    tr: 'Yakın geçmiş (-di / -miş)',
    short: 'Henüz bitmemiş bir zaman diliminde olan ya da hayat deneyimi: "bugün yedim, hiç gitmedim".',
    formation: 'haber (he, has, ha, hemos, habéis, han) + participio: -ar → -ado (hablado), -er/-ir → -ido (comido). Düzensizler: hecho, dicho, visto, escrito, puesto, vuelto, abierto.',
    examples: [
      ['Hoy he comido paella.', 'Bugün paella yedim.'],
      ['Nunca he estado en Japón.', "Hiç Japonya'da bulunmadım."],
    ],
    markers: ['hoy', 'esta semana', 'este año', 'ya', 'todavía no', 'alguna vez', 'nunca'],
  },
  imperfecto: {
    name: 'pretérito imperfecto',
    tr: 'Süren geçmiş (-iyordu, -erdi)',
    short: 'Geçmişte süren durum, alışkanlık ya da arka plan: "yapıyordum, yapardım". Olup biten tek olay için indefinido.',
    formation: '-ar: kök + -aba, -abas, -aba, -ábamos, -abais, -aban (hablaba). -er/-ir: -ía, -ías, -ía, -íamos, -íais, -ían (comía). Yalnızca üç düzensiz: era, iba, veía.',
    examples: [
      ['Cuando era niño, jugaba al fútbol.', 'Çocukken futbol oynardım.'],
      ['Llovía cuando llegamos.', 'Vardığımızda yağmur yağıyordu.'],
    ],
    markers: ['antes', 'cuando era niño', 'todos los veranos', 'siempre', 'normalmente', 'mientras'],
  },
  futuro: {
    name: 'futuro simple',
    tr: 'Gelecek (-ecek)',
    short: 'Gelecekte olacak eylem, tahmin ya da niyet: "yapacağım".',
    formation: 'Mastar + -é, -ás, -á, -emos, -éis, -án (hablaré). Düzensiz kökler aynı ekleri alır: tendré, podré, diré, haré, saldré, vendré, querré, sabré.',
    examples: [
      ['Mañana hará buen tiempo.', 'Yarın hava güzel olacak.'],
      ['Saldremos al mediodía.', 'Öğlen çıkacağız.'],
    ],
    markers: ['mañana', 'el próximo año', 'pronto', 'dentro de dos días', 'algún día', 'más tarde'],
  },
  condicional: {
    name: 'condicional simple',
    tr: 'Şart kipi (-erdi, -ardı)',
    short: 'Bir koşula bağlı olan, nazik bir istek ya da tavsiye: "yapardım, ister miydin".',
    formation: 'Futuro kökü + -ía, -ías, -ía, -íamos, -íais, -ían: hablar → hablaría, comer → comería. Düzensiz kökler futuro ile aynı: tendría, podría, diría, haría, saldría, vendría.',
    examples: [
      ['Me gustaría un café.', 'Bir kahve isterdim.'],
      ['Yo que tú, hablaría con ella.', 'Senin yerinde olsam onunla konuşurdum.'],
    ],
    markers: ['me gustaría', 'yo que tú', 'en tu lugar', 'si tuviera…', '¿podrías…?', 'sería'],
  },
  subjuntivo: {
    name: 'presente de subjuntivo',
    tr: 'Dilek kipi (-mesi, -sin)',
    short: 'İstek, duygu, gereklilik ya da şüphe bildiren bir ifadeden sonra "que" ile: "gelmeni istiyorum", ve "ojalá" ile.',
    formation: 'yo formunun (presente) -o\'su atılır, -ar fiillere -e, -es, -e, -emos, -éis, -en; -er/-ir fiillere -a, -as, -a, -amos, -áis, -an eklenir: tengo → tenga, hablo → hable. Düzensizler: ser → sea, estar → esté, ir → vaya, saber → sepa, haber → haya, dar → dé.',
    examples: [
      ['Quiero que vengas.', 'Gelmeni istiyorum.'],
      ['Ojalá haga buen tiempo mañana.', 'Umarım yarın hava güzel olur.'],
    ],
    markers: ['quiero que', 'es importante que', 'ojalá', 'para que', 'espero que', 'aunque'],
  },
  'plus-que-parfait': {
    name: 'plus-que-parfait',
    tr: 'Geçmişte geçmiş (-mişti)',
    short: 'Geçmişteki başka bir olaydan önce tamamlanmış eylem: "yapmıştım".',
    formation: 'avoir ya da être (imparfait) + participe passé: j\'avais parlé, elle était partie. Hangi yardımcı fiilin geldiği passé composé ile aynıdır.',
    examples: [
      ['Quand je suis arrivé, le film avait déjà commencé.', 'Vardığımda film çoktan başlamıştı.'],
      ["Elle était déjà partie quand tu as appelé.", 'Sen aradığında o çoktan gitmişti.'],
    ],
    markers: ['déjà', 'quand', 'avant', 'la veille', 'ce jour-là', 'depuis longtemps'],
  },
  'futur-anterieur': {
    name: 'futur antérieur',
    tr: 'Bitmiş gelecek (-miş olacak)',
    short: 'Gelecekte belli bir andan önce tamamlanmış olacak eylem: "yapmış olacağım".',
    formation: 'avoir ya da être (futur) + participe passé: j\'aurai fini, elle sera partie. "quand" ve "dès que" ile futur simple yerine de gelir: Quand tu auras fini, appelle-moi.',
    examples: [
      ["Demain à midi, j'aurai fini mon travail.", 'Yarın öğlene kadar işimi bitirmiş olacağım.'],
      ['Quand tu arriveras, ils seront déjà partis.', 'Sen vardığında onlar çoktan gitmiş olacak.'],
    ],
    markers: ['demain à midi', "d'ici là", 'quand', 'dès que', 'avant', 'déjà'],
  },
  'conditionnel-passe': {
    name: 'conditionnel passé',
    tr: 'Geçmiş şart (-miş olurdu)',
    short: 'Geçmişte gerçekleşmemiş bir şeyin sonucu ya da pişmanlık: "yapmış olurdum".',
    formation: 'avoir ya da être (conditionnel) + participe passé: j\'aurais mangé, il serait venu. "Si + plus-que-parfait" cümlesinin sonucudur: Si j\'avais su, je serais venu.',
    examples: [
      ["Si j'avais su, je serais venu.", 'Bilseydim gelirdim.'],
      ["J'aurais voulu t'aider.", 'Sana yardım etmek isterdim.'],
    ],
    markers: ["si j'avais su", "j'aurais dû", "j'aurais voulu", 'à ta place', 'sans toi', 'jamais'],
  },
  'subjonctif-passe': {
    name: 'subjonctif passé',
    tr: 'Dilek kipi, tamamlanmış (-miş olması)',
    short: 'Dilek kipi gerektiren bir ifadeden sonra, tamamlanmış eylem: "başarmış olmana sevindim".',
    formation: 'avoir ya da être (subjonctif) + participe passé: que j\'aie fini, qu\'elle soit partie. Ana eylemden önce biten bir şey için kullanılır.',
    examples: [
      ['Je suis content que tu aies réussi.', 'Başarmış olmana sevindim.'],
      ["Il faut qu'ils soient partis avant midi.", 'Öğlenden önce gitmiş olmaları gerekiyor.'],
    ],
    markers: ['je suis content que', 'bien que', 'il faut que', 'dommage que', 'je doute que', 'il est possible que'],
  },
  pluscuamperfecto: {
    name: 'pretérito pluscuamperfecto',
    tr: 'Geçmişte geçmiş (-mişti)',
    short: 'Geçmişteki başka bir olaydan önce tamamlanmış eylem: "yapmıştım".',
    formation: 'haber (imperfecto: había, habías, había, habíamos, habíais, habían) + participio: había comido, habían llegado. Düzensiz participiolar perfecto ile aynı: hecho, dicho, visto, escrito.',
    examples: [
      ['Cuando llegué, la película ya había empezado.', 'Vardığımda film çoktan başlamıştı.'],
      ['Ya habíamos cenado cuando llamaste.', 'Sen aradığında biz çoktan akşam yemeğini yemiştik.'],
    ],
    markers: ['ya', 'todavía no', 'antes de', 'cuando llegué', 'hasta entonces', 'nunca antes'],
  },
  'futuro-perfecto': {
    name: 'futuro perfecto',
    tr: 'Bitmiş gelecek (-miş olacak)',
    short: 'Gelecekte belli bir andan önce bitmiş olacak eylem, ya da geçmişe dair tahmin: "yapmış olacağım, yapmış olmalı".',
    formation: 'haber (futuro: habré, habrás, habrá, habremos, habréis, habrán) + participio: habré terminado.',
    examples: [
      ['Para mañana habré terminado el trabajo.', 'Yarına kadar işi bitirmiş olacağım.'],
      ['Ya habrán llegado a casa.', 'Evlerine varmış olmalılar.'],
    ],
    markers: ['para mañana', 'dentro de una hora', 'para entonces', 'cuando llegues', 'ya', 'seguramente'],
  },
  'condicional-perfecto': {
    name: 'condicional perfecto',
    tr: 'Geçmiş şart (-miş olurdu)',
    short: 'Geçmişte gerçekleşmemiş bir şeyin sonucu ya da pişmanlık: "yapmış olurdum".',
    formation: 'haber (condicional: habría, habrías, habría, habríamos, habríais, habrían) + participio: habría ido. "Si + pluscuamperfecto de subjuntivo" ile gelir: Si hubiera sabido, habría venido.',
    examples: [
      ['Si hubiera sabido, habría venido.', 'Bilseydim gelirdim.'],
      ['Habría preferido quedarme en casa.', 'Evde kalmayı tercih ederdim.'],
    ],
    markers: ['si hubiera sabido', 'habría querido', 'en tu lugar', 'sin ti', 'ojalá', 'nunca'],
  },
  'subjuntivo-imperfecto': {
    name: 'pretérito imperfecto de subjuntivo',
    tr: 'Dilek kipi, geçmiş (-seydi, -sa)',
    short: 'Geçmişteki bir istek ya da gerçek dışı koşul: "gelmeni istiyordum", "olsaydı".',
    formation: 'Pretérito indefinido\'nun ellos formundan -ron atılır, -ra, -ras, -ra, -ramos, -rais, -ran eklenir: comieron → comiera, tuvieron → tuviera. -se biçimi de doğrudur (comiese). Nosotros\'ta vurgu işareti gelir: comiéramos.',
    examples: [
      ['Quería que vinieras a la fiesta.', 'Partiye gelmeni istiyordum.'],
      ['Si tuviera tiempo, viajaría más.', 'Vaktim olsa daha çok seyahat ederdim.'],
    ],
    markers: ['si tuviera…', 'como si', 'quería que', 'me gustaría que', 'sería mejor que', 'ojalá tuviera'],
  },
  'subjuntivo-perfecto': {
    name: 'pretérito perfecto de subjuntivo',
    tr: 'Dilek kipi, tamamlanmış (-miş olması)',
    short: 'Dilek kipi gerektiren bir ifadeden sonra, tamamlanmış eylem: "gelmiş olmana sevindim".',
    formation: 'haber (presente de subjuntivo: haya, hayas, haya, hayamos, hayáis, hayan) + participio: haya comido.',
    examples: [
      ['Espero que hayas llegado bien.', 'Umarım iyi varmışsındır.'],
      ['Me alegro de que hayan venido.', 'Geldiklerine sevindim.'],
    ],
    markers: ['espero que', 'me alegro de que', 'es posible que', 'no creo que', 'dudo que', 'ojalá'],
  },
  'subjuntivo-pluscuamperfecto': {
    name: 'pluscuamperfecto de subjuntivo',
    tr: 'Dilek kipi, geçmişte geçmiş (-seydi)',
    short: 'Geçmişte gerçekleşmemiş koşul ya da pişmanlık: "bilseydim, keşke yapsaydım".',
    formation: 'haber (imperfecto de subjuntivo: hubiera, hubieras, hubiera, hubiéramos, hubierais, hubieran) + participio: hubiera comido. -se biçimi de doğrudur: hubiese comido.',
    examples: [
      ['Si hubiera sabido, te habría llamado.', 'Bilseydim seni arardım.'],
      ['Ojalá hubiera estudiado más.', 'Keşke daha çok çalışsaydım.'],
    ],
    markers: ['si hubiera…', 'ojalá hubiera', 'como si hubiera', 'de haber sabido', 'hubiera querido', 'ojalá'],
  },
}

/**
 * What a wrong conjugation actually was, said by name: another tense ("allais is imparfait; the
 * question wants passé composé") or another person. Naming the error works better than only
 * showing the right form (metalinguistic feedback; Lyster & Ranta 1997).
 */
export function formFeedback(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, asked: Tense, given: string): string | undefined {
  if (entry.language === 'en') return undefined
  const typed = given.trim()
  const tense = tenseOfForm(entry, typed)
  if (!tense) return undefined
  if (tense !== asked) return `“${typed}” ${TENSE_GUIDE[tense].name} biçimi; burada ${TENSE_GUIDE[asked].name} isteniyor: ${TENSE_GUIDE[asked].short}`
  const f = normalize(typed).toLocaleLowerCase(entry.language)
  const person = [0, 1, 2, 3, 4, 5].find((p) => answersFor(entry, asked, p).some((a) => normalize(a).toLocaleLowerCase(entry.language) === f))
  return person === undefined ? undefined : `Zaman doğru, kişi değil: “${typed}” ${subjectLabel(entry.language, asked, person).split(' / ')[0]} için.`
}

/**
 * A tense seen from Turkish: which Turkish tense or suffix it answers to, and where the two do not
 * line up. A learner thinks in Turkish first; saying where the bridge is and where it breaks is
 * what makes a tense usable rather than only memorised.
 */
export interface TenseBridge {
  /** The Turkish tense or suffix it is closest to. */
  suffix: string
  /** How the two compare, with a Turkish example. */
  note: string
  /** Where the comparison misleads, if it does. */
  trap?: string
}

const PRESENT_BRIDGE: TenseBridge = {
  suffix: '-iyor (şimdiki) ve -ir/-er (geniş)',
  note: 'Türkçede “yapıyorum” ile “yaparım” ayrı zamanlardır; burada ikisi de tek biçimle söylenir. “Okuyorum” da “okurum” da aynı çekim.',
  trap: 'Yakın gelecek de bununla söylenir: “yarın giderim” = yarın gidiyorum/gidiyoruz.',
}

export const TENSE_BRIDGE: Record<Tense, TenseBridge> = {
  present: PRESENT_BRIDGE,
  presente: PRESENT_BRIDGE,
  'passe-compose': {
    suffix: '-di (görülen geçmiş)',
    note: '“Yedim, gittim, aradım”: bitmiş, sınırı belli olay. Konuşmada Fransızcanın ana geçmiş zamanı.',
    trap: 'Yardımcı fiil (avoir/être) + ortaç iki parçadır; Türkçede tek kelime olduğu için yardımcı fiili atlamak sık hata.',
  },
  imparfait: {
    suffix: '-iyordu / -erdi (hikâye ve alışkanlık geçmişi)',
    note: '“Yağmur yağıyordu”, “Her yaz denize giderdik”: süren durum ve alışkanlık. “Yağmur yağdı” (olup bitti) ise passé composé.',
    trap: 'Türkçede “-di” ve “-iyordu” ayrımını sen zaten yapıyorsun: aynı ayrım burada passé composé / imparfait.',
  },
  futur: {
    suffix: '-ecek',
    note: '“Yarın gelecek, yapacağım”: Türkçedeki gelecek zamanla birebir.',
    trap: 'Konuşmada çoğu zaman “aller + mastar” (yakın gelecek) tercih edilir: “je vais manger” = yiyeceğim.',
  },
  conditionnel: {
    suffix: '-erdi / -ir miydi (nazik istek, varsayım)',
    note: '“İsterdim, gelirdi, yapar mısınız?”: nazik rica ve koşulun sonucu. “Bir kahve isterdim” = je voudrais un café.',
    trap: '“Si” ile koşul kurarken “si” cümlesinde conditionnel olmaz: “si j’avais” (imparfait), sonuçta conditionnel.',
  },
  subjonctif: {
    suffix: '-sin / -mesi (istek, gereklilik)',
    note: '“Gelmeni istiyorum”, “gelmesi gerek”: iki cümleyi “que” bağlar ve ikinci fiil subjonctif olur. Türkçede bunu ad-fiil (-mA) ve istek eki (-sIn) üstlenir.',
    trap: 'Özneler aynıysa subjonctif yok, mastar kullanılır: “je veux partir”; özne değişince “je veux que tu partes”.',
  },
  'plus-que-parfait': {
    suffix: '-miştim (geçmişte geçmiş)',
    note: '“Geldiğimde film başlamıştı”: geçmişteki başka bir olaydan önce bitmiş olan.',
  },
  'futur-anterieur': {
    suffix: '-miş olacak',
    note: '“Yarın öğlene kadar bitirmiş olacağım”: gelecekteki bir andan önce tamamlanmış olacak.',
    trap: 'Türkçede “bitirdiğinde ara” dersin; Fransızcada “quand/dès que” sonrası bitmiş eylem için futur antérieur gelir: Quand tu auras fini, appelle-moi.',
  },
  'conditionnel-passe': {
    suffix: '-miş olurdu / -saydı … -erdi',
    note: '“Bilseydim gelirdim”: gerçekleşmemiş geçmişin sonucu ve pişmanlık: “j’aurais dû” = yapmalıydım.',
  },
  'subjonctif-passe': {
    suffix: '-miş olması',
    note: '“Başarmış olmana sevindim”: istek/duygu ifadesinden sonra tamamlanmış eylem.',
  },
  preterito: {
    suffix: '-di (görülen geçmiş)',
    note: '“Yedim, gittim, geldi”: bitmiş, belli bir anda olan olay. En çok kullanacağın geçmiş zaman.',
    trap: 'Türkçedeki “-miş” (öğrenilen geçmiş) için ayrı bir İspanyolca zaman yok; “dicen que vino” gibi cümleyle söylenir.',
  },
  imperfecto: {
    suffix: '-iyordu / -erdi (arka plan, alışkanlık)',
    note: '“Yağmur yağıyordu”, “Çocukken futbol oynardım”: süren durum ve alışkanlık.',
    trap: '“Dün yağmur yağdı” → indefinido, “yağmur yağıyordu” → imperfecto: Türkçedeki ayrımı aynen kullan.',
  },
  perfecto: {
    suffix: '-di / -miş (bugünle bağlı geçmiş)',
    note: '“Bugün yedim, hiç gitmedim, bu hafta çalıştım”: henüz bitmemiş bir zaman diliminde olan şeyler ve yaşanmışlık.',
    trap: 'Latin Amerika’da konuşmada çoğu zaman indefinido tercih edilir; İspanya’da bugünle ilgili olaylar için perfecto.',
  },
  pluscuamperfecto: {
    suffix: '-miştim (geçmişte geçmiş)',
    note: '“Geldiğimde film başlamıştı”: geçmişteki başka bir olaydan önce bitmiş.',
  },
  futuro: {
    suffix: '-ecek / -ir (tahmin)',
    note: '“Yarın gelecek, yapacağım”: gelecek zaman. Aynı zamanda tahmin: “serán las dos” = saat ikidir herhalde.',
    trap: 'Konuşmada “ir a + mastar” yaygın: “voy a comer” = yiyeceğim.',
  },
  'futuro-perfecto': {
    suffix: '-miş olacak / -miş olmalı',
    note: '“Yarına kadar bitirmiş olacağım” ve tahmin: “ya habrán llegado” = çoktan varmışlardır.',
  },
  condicional: {
    suffix: '-erdi / -ir miydi (nazik istek, varsayım)',
    note: '“İsterdim, gelirdi, yapar mısın?”: nazik rica ve koşulun sonucu: “me gustaría un café” = bir kahve isterdim.',
    trap: '“Si” cümlesinde condicional olmaz: “si tuviera tiempo” (subjuntivo imperfecto), sonuçta condicional: “viajaría”.',
  },
  'condicional-perfecto': {
    suffix: '-miş olurdu / -saydı … -erdi',
    note: '“Bilseydim gelirdim”: gerçekleşmemiş geçmişin sonucu ve pişmanlık.',
  },
  subjuntivo: {
    suffix: '-sin / -mesi / -e (istek, umut)',
    note: '“Gelmeni istiyorum”, “umarım gelir”: “que” ile bağlanan ikinci fiil subjuntivo olur. Türkçedeki ad-fiil (-mA) ve istek eki (-A, -sIn) işini yapar.',
    trap: 'Özneler aynıysa subjuntivo yok, mastar kullanılır: “quiero salir”; özne değişince “quiero que salgas”.',
  },
  'subjuntivo-imperfecto': {
    suffix: '-sa / -saydı (koşul), -mesini istiyordum',
    note: '“Vaktim olsa daha çok gezerdim”, “gelmeni istiyordum”: geçmişteki istek ve gerçek dışı koşul. “Si” cümlesinde hep bu zaman gelir.',
  },
  'subjuntivo-perfecto': {
    suffix: '-miş olması / -miştir umarım',
    note: '“Umarım iyi varmışsındır”, “geldiklerine sevindim”: tamamlanmış eylem + istek/duygu.',
  },
  'subjuntivo-pluscuamperfecto': {
    suffix: '-saydı (bilseydim)',
    note: '“Bilseydim seni arardım”, “keşke daha çok çalışsaydım”: geçmişte gerçekleşmemiş koşul ve pişmanlık.',
  },
}
