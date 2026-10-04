import type { Tense } from './tenses'

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
}
