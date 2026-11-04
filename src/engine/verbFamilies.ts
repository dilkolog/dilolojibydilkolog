import type { LabData } from './labProgress'
import { conjugateTense, irregularForms, tenseVerbs, verbParts, type Tense } from './tenses'

/**
 * Verb families: verbs that break the regular pattern in the same way. Learning "e becomes ie in
 * everything but nosotros and vosotros" once covers pensar, querer, empezar and a hundred more, so
 * a rule is worth more than a list. The family of a verb is read off its own present-tense forms.
 */
export type FamilyId =
  | 'es-e-ie'
  | 'es-o-ue'
  | 'es-e-i'
  | 'es-go'
  | 'es-zco'
  | 'es-uir'
  | 'es-other'
  | 'es-regular'
  | 'fr-er'
  | 'fr-ir-iss'
  | 'fr-re'
  | 'fr-ir-irreg'
  | 'fr-cer'
  | 'fr-ger'
  | 'fr-yer'
  | 'fr-accent'
  | 'fr-double'
  | 'fr-oir'
  | 'fr-etre'
  | 'fr-other'
  | 'es-prefix'
  | 'es-pret-strong'
  | 'es-pret-j'
  | 'es-pret-y'
  | 'es-pret-stem'
  | 'es-pret-spell'
  | 'es-pret-other'
  | 'es-fut-stem'
  | 'es-subj-yo'
  | 'es-subj-other'
  | 'fr-prefix'
  | 'fr-pp'
  | 'fr-fut-stem'
  | 'fr-subj-stem'

export interface Family {
  id: FamilyId
  language: 'fr' | 'es'
  /** Short name in Turkish. */
  name: string
  /** The rule, in a sentence. */
  rule: string
  /** Which persons carry the change (0 = je/yo … 5 = ils/ellos): drawn as the shape of the pattern. */
  persons: number[]
  /** The person worth asking when drilling the family. */
  ask: number
  /** When set, the drill asks these persons in turn instead of `ask` alone. */
  asks?: number[]
  /** The tense the family is drilled in. */
  tense: Tense
  /** Verbs that show the pattern at a glance, for the card. */
  examples: string[]
}

export const FAMILIES: Record<FamilyId, Family> = {
  'es-e-ie': { id: 'es-e-ie', language: 'es', name: 'e → ie (bot fiilleri)', rule: 'Vurgu kökteyken kökteki e, ie olur: yo, tú, él, ellos’ta değişir; nosotros ve vosotros değişmez (“bot” biçimi).', persons: [0, 1, 2, 5], ask: 1, tense: 'presente', examples: ['pensar → pienso', 'querer → quiero', 'empezar → empiezo', 'entender → entiendo'] },
  'es-o-ue': { id: 'es-o-ue', language: 'es', name: 'o → ue (bot fiilleri)', rule: 'Vurgulu kökte o, ue olur (jugar’da u → ue): yo, tú, él, ellos’ta; nosotros ve vosotros değişmez.', persons: [0, 1, 2, 5], ask: 1, tense: 'presente', examples: ['poder → puedo', 'volver → vuelvo', 'dormir → duermo', 'jugar → juego'] },
  'es-e-i': { id: 'es-e-i', language: 'es', name: 'e → i (-ir fiilleri)', rule: '-ir fiillerinde e, i olur: yo, tú, él, ellos’ta; nosotros ve vosotros değişmez. Geçmişte (indefinido) él ve ellos’ta da görülür: pidió, pidieron.', persons: [0, 1, 2, 5], ask: 1, tense: 'presente', examples: ['pedir → pido', 'seguir → sigo', 'repetir → repito', 'servir → sirvo'] },
  'es-go': { id: 'es-go', language: 'es', name: 'yo biçimi -go', rule: 'Yalnız “yo” düzensiz: sonuna -go gelir, diğer kişiler kurallı gider (bazıları ayrıca kök değiştirir).', persons: [0], ask: 0, tense: 'presente', examples: ['tener → tengo', 'hacer → hago', 'poner → pongo', 'salir → salgo'] },
  'es-zco': { id: 'es-zco', language: 'es', name: 'yo biçimi -zco', rule: '-cer / -cir ile biten fiillerde yalnız “yo” -zco olur; diğer kişiler kurallı.', persons: [0], ask: 0, tense: 'presente', examples: ['conocer → conozco', 'parecer → parezco', 'ofrecer → ofrezco', 'traducir → traduzco'] },
  'es-uir': { id: 'es-uir', language: 'es', name: '-uir → -uy-', rule: '-uir fiillerinde nosotros ve vosotros dışındaki kişilerde araya y girer.', persons: [0, 1, 2, 5], ask: 1, tense: 'presente', examples: ['construir → construyo', 'huir → huyo', 'incluir → incluyo', 'destruir → destruyo'] },
  'es-other': { id: 'es-other', language: 'es', name: 'Tek tek öğrenilenler', rule: 'Hiçbir kalıba girmeyen düzensizler: bunları tek tek öğrenmek gerekir.', persons: [0, 1, 2, 3, 4, 5], ask: 0, tense: 'presente', examples: ['ser → soy', 'ir → voy', 'dar → doy', 'saber → sé'] },
  'es-regular': { id: 'es-regular', language: 'es', name: 'Kurallı fiiller', rule: '-ar, -er, -ir: kök aynı kalır, sadece ekler değişir.', persons: [], ask: 0, tense: 'presente', examples: ['hablar → hablo', 'comer → como', 'vivir → vivo'] },
  'fr-er': { id: 'fr-er', language: 'fr', name: '-er fiilleri (kurallı)', rule: 'Fransızca fiillerin çoğu: kök + -e, -es, -e, -ons, -ez, -ent.', persons: [], ask: 0, tense: 'present', examples: ['parler → je parle', 'aimer → j’aime', 'chanter → je chante'] },
  'fr-ir-iss': { id: 'fr-ir-iss', language: 'fr', name: '-ir (-iss-) fiilleri', rule: 'Çoğul kişilerde araya -iss- girer: finis, finis, finit, finissons, finissez, finissent.', persons: [3, 4, 5], ask: 3, tense: 'present', examples: ['finir → nous finissons', 'choisir → nous choisissons', 'réussir → nous réussissons'] },
  'fr-re': { id: 'fr-re', language: 'fr', name: '-re fiilleri (kurallı)', rule: 'Son -re düşer: vends, vends, vend, vendons, vendez, vendent (3. tekil ek almaz).', persons: [], ask: 2, tense: 'present', examples: ['vendre → il vend', 'attendre → il attend', 'répondre → il répond'] },
  'fr-ir-irreg': { id: 'fr-ir-irreg', language: 'fr', name: '-ir düzensizleri (partir tipi)', rule: 'Tekil kişilerde kökün son harfi düşer: pars, pars, part; çoğulda tam kök: partons.', persons: [0, 1, 2], ask: 0, tense: 'present', examples: ['partir → je pars', 'dormir → je dors', 'sortir → je sors', 'servir → je sers'] },
  'fr-cer': { id: 'fr-cer', language: 'fr', name: '-cer: ç', rule: 'nous formunda c, ç olur ki ses yumuşamasın: nous commençons.', persons: [3], ask: 3, tense: 'present', examples: ['commencer → nous commençons', 'placer → nous plaçons', 'lancer → nous lançons'] },
  'fr-ger': { id: 'fr-ger', language: 'fr', name: '-ger: ge', rule: 'nous formunda g’den sonra e girer ki ses sertleşmesin: nous mangeons.', persons: [3], ask: 3, tense: 'present', examples: ['manger → nous mangeons', 'voyager → nous voyageons', 'changer → nous changeons'] },
  'fr-yer': { id: 'fr-yer', language: 'fr', name: '-yer: y → i', rule: 'Sessiz e’nin önünde (je, tu, il, ils) y, i olur: je paie, tu envoies.', persons: [0, 1, 2, 5], ask: 0, tense: 'present', examples: ['payer → je paie', 'envoyer → j’envoie', 'nettoyer → je nettoie', 'essayer → j’essaie'] },
  'fr-accent': { id: 'fr-accent', language: 'fr', name: 'e → è (aksan değişimi)', rule: 'Sesli e’den önce gelen e, è olur: je lève, tu achètes (nous, vous’da değişmez).', persons: [0, 1, 2, 5], ask: 0, tense: 'present', examples: ['lever → je lève', 'acheter → j’achète', 'se promener → je me promène'] },
  'fr-double': { id: 'fr-double', language: 'fr', name: 'çift ünsüz (ll, tt)', rule: 'Sessiz e’nin önünde l ya da t ikilenir: j’appelle, je jette (nous, vous’da tek).', persons: [0, 1, 2, 5], ask: 0, tense: 'present', examples: ['appeler → j’appelle', 'jeter → je jette', 'épeler → j’épelle'] },
  'fr-oir': { id: 'fr-oir', language: 'fr', name: '-oir fiilleri', rule: 'Kural yok: kökler tekilde ve çoğulda değişir, tek tek öğrenilir.', persons: [0, 1, 2, 3, 4, 5], ask: 0, tense: 'present', examples: ['pouvoir → je peux', 'vouloir → je veux', 'savoir → je sais', 'devoir → je dois'] },
  'fr-etre': { id: 'fr-etre', language: 'fr', name: 'être alan fiiller', rule: 'Hareket ve durum değişimi fiilleri ile dönüşlü fiiller passé composé’de être alır, ortaç özneye uyar: elle est allée, ils sont partis.', persons: [0, 1, 2, 3, 4, 5], ask: 0, tense: 'passe-compose', examples: ['aller → je suis allé', 'venir → je suis venu', 'partir → je suis parti', 'se lever → je me suis levé'] },
  'fr-other': { id: 'fr-other', language: 'fr', name: 'Tek tek öğrenilenler', rule: 'Hiçbir kalıba girmeyen düzensizler.', persons: [0, 1, 2, 3, 4, 5], ask: 0, tense: 'present', examples: ['être → je suis', 'avoir → j’ai', 'aller → je vais', 'faire → je fais'] },
  'es-prefix': { id: 'es-prefix', language: 'es', name: 'Ön ekli düzensizler (tener → obtener)', rule: 'Düzensiz bir fiilin başına ön ek gelince çekimi aynen kalır: tener’i bilen obtener, mantener, contener’i de bilir; poner’i bilen proponer, suponer’i.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 5, 1], tense: 'presente', examples: ['tener → obtengo, mantengo', 'poner → propongo, supongo', 'venir → convengo, prevengo', 'hacer → deshago, rehago'] },
  'es-pret-strong': { id: 'es-pret-strong', language: 'es', name: 'Güçlü geçmiş kökleri (tuve, hice)', rule: 'Pretérito indefinido’de kök tamamen değişir ve ekler vurgusuz olur: -e, -iste, -o, -imos, -isteis, -ieron. yo “tuve” (tuvé değil), él “tuvo” (tuvó değil).', persons: [0, 1, 2, 3, 4, 5], ask: 2, asks: [0, 2, 5, 3], tense: 'preterito', examples: ['tener → tuve, tuvo', 'estar → estuve', 'poder → pude', 'hacer → hice, hizo', 'querer → quise', 'venir → vine'] },
  'es-pret-j': { id: 'es-pret-j', language: 'es', name: 'j kökü (dije, traje)', rule: 'Kökü j ile biten güçlü geçmişlerde ellos/ustedes -ieron değil -eron alır: dijeron, trajeron, condujeron. Ekler vurgusuz: dije, dijo.', persons: [0, 1, 2, 3, 4, 5], ask: 5, asks: [5, 0, 2], tense: 'preterito', examples: ['decir → dije, dijeron', 'traer → traje, trajeron', 'conducir → conduje, condujeron', 'producir → produje'] },
  'es-pret-y': { id: 'es-pret-y', language: 'es', name: 'él / ellos’ta y (leyó, cayeron)', rule: 'Kökü ünlüyle biten -er/-ir fiillerinde iki ünlü arasındaki i, y olur: leyó, leyeron (leió değil). Diğer kişilerde vurgu işareti gelir: leí, leíste, leímos.', persons: [2, 5], ask: 2, asks: [2, 5], tense: 'preterito', examples: ['leer → leyó, leyeron', 'creer → creyó', 'oír → oyó', 'construir → construyó'] },
  'es-pret-stem': { id: 'es-pret-stem', language: 'es', name: '-ir: él / ellos’ta e → i, o → u', rule: 'Şimdiki zamanda kök değiştiren -ir fiilleri geçmişte yalnız él ve ellos’ta değişir: e → i (pidió, sintieron), o → u (durmió, murieron). -ar ve -er fiillerinde geçmişte değişim yoktur.', persons: [2, 5], ask: 2, asks: [2, 5], tense: 'preterito', examples: ['pedir → pidió, pidieron', 'sentir → sintió', 'dormir → durmió, durmieron', 'preferir → prefirió'] },
  'es-pret-spell': { id: 'es-pret-spell', language: 'es', name: 'yo’da yazım: busqué, llegué, empecé', rule: 'Sesi korumak için yalnız yo biçimi yazımda değişir: -car → -qué, -gar → -gué, -zar → -cé. Diğer kişiler kurallı: buscaste, buscó.', persons: [0], ask: 0, tense: 'preterito', examples: ['buscar → busqué', 'llegar → llegué', 'empezar → empecé', 'tocar → toqué', 'pagar → pagué'] },
  'es-pret-other': { id: 'es-pret-other', language: 'es', name: 'Geçmişte tek tek öğrenilenler', rule: 'ser ve ir geçmişte aynıdır (fui, fue, fueron: anlamı cümleden çıkar); dar ve ver kısa ve vurgusuzdur (di, dio; vi, vio).', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 5], tense: 'preterito', examples: ['ser / ir → fui, fue', 'dar → di, dio', 'ver → vi, vio'] },
  'es-fut-stem': { id: 'es-fut-stem', language: 'es', name: 'Gelecekte kısa kökler (tendré, haré)', rule: 'Ekler bütün fiillerde aynıdır (-é, -ás, -á, -emos, -éis, -án); bu fiillerde yalnız kök değişir. Aynı kök condicional’de de kullanılır: tendría, haría.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 3, 5], tense: 'futuro', examples: ['tener → tendré', 'poner → pondré', 'salir → saldré', 'poder → podré', 'saber → sabré', 'hacer → haré', 'decir → diré', 'querer → querré'] },
  'es-subj-yo': { id: 'es-subj-yo', language: 'es', name: 'Subjuntivo yo’dan gelir (tenga, conozca)', rule: 'Presente de subjuntivo şimdiki zamanın yo biçiminden kurulur: -o atılır, ters ünlü eklenir. yo’daki -g- ve -zc- bütün kişilere geçer: tengo → tenga, tengamos; conozco → conozca, conozcamos.', persons: [0, 1, 2, 3, 4, 5], ask: 3, asks: [3, 0, 2, 5], tense: 'subjuntivo', examples: ['tener (tengo) → tenga', 'hacer (hago) → hagamos', 'conocer (conozco) → conozca', 'decir (digo) → digan'] },
  'es-subj-other': { id: 'es-subj-other', language: 'es', name: 'Subjuntivo’da tek tek öğrenilenler', rule: 'yo biçimi -o ile bitmeyen altı fiil subjuntivo’yu kuralsız kurar: ser → sea, ir → vaya, saber → sepa, haber → haya, estar → esté, dar → dé.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 3], tense: 'subjuntivo', examples: ['ser → sea', 'ir → vaya', 'saber → sepa', 'estar → esté', 'dar → dé'] },
  'fr-prefix': { id: 'fr-prefix', language: 'fr', name: 'Ön ekli düzensizler (prendre → comprendre)', rule: 'Düzensiz bir fiilin başına ön ek gelince çekimi aynen kalır: prendre’ı bilen comprendre, apprendre, surprendre’ı da bilir; venir’i bilen devenir, revenir, prévenir’i.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 3, 5], tense: 'present', examples: ['prendre → je comprends', 'venir → je deviens', 'mettre → je promets', 'tenir → j’obtiens'] },
  'fr-pp': { id: 'fr-pp', language: 'fr', name: 'Düzensiz ortaçlar (fait, pris, vu)', rule: 'Kural: -er → -é, -ir → -i, -re → -u. Bu fiillerin ortacı ezberlenir: passé composé, plus-que-parfait, futur antérieur hep aynı ortacı kullanır.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 3], tense: 'passe-compose', examples: ['faire → fait', 'prendre → pris', 'voir → vu', 'mettre → mis', 'ouvrir → ouvert', 'venir → venu', 'avoir → eu'] },
  'fr-fut-stem': { id: 'fr-fut-stem', language: 'fr', name: 'Futur’de düzensiz kökler (je serai, j’irai)', rule: 'Ekler hep aynıdır (-ai, -as, -a, -ons, -ez, -ont); bu fiillerde mastarın yerine özel bir kök gelir. Aynı kök conditionnel’de de kullanılır: je serais, j’irais.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 3, 5], tense: 'futur', examples: ['être → je serai', 'avoir → j’aurai', 'aller → j’irai', 'faire → je ferai', 'pouvoir → je pourrai', 'venir → je viendrai', 'voir → je verrai'] },
  'fr-subj-stem': { id: 'fr-subj-stem', language: 'fr', name: 'Subjonctif’te düzensiz kökler (que je fasse)', rule: 'Kural: ils biçiminden -ent atılır, -e, -es, -e, -ions, -iez, -ent eklenir (ils finissent → que je finisse). Bu fiiller kendi köklerini kullanır.', persons: [0, 1, 2, 3, 4, 5], ask: 0, asks: [0, 2, 3, 5], tense: 'subjonctif', examples: ['faire → que je fasse', 'pouvoir → que je puisse', 'savoir → que je sache', 'aller → que j’aille', 'vouloir → que je veuille', 'être → que je sois'] },
}

/** The families of each language in the order they are best met: the rules that cover most verbs first. */
export const FAMILY_ORDER: Record<'fr' | 'es', FamilyId[]> = {
  es: ['es-e-ie', 'es-o-ue', 'es-e-i', 'es-go', 'es-zco', 'es-uir', 'es-prefix', 'es-other', 'es-regular', 'es-pret-spell', 'es-pret-stem', 'es-pret-y', 'es-pret-strong', 'es-pret-j', 'es-pret-other', 'es-fut-stem', 'es-subj-yo', 'es-subj-other'],
  fr: ['fr-er', 'fr-ir-iss', 'fr-re', 'fr-ir-irreg', 'fr-cer', 'fr-ger', 'fr-yer', 'fr-accent', 'fr-double', 'fr-oir', 'fr-prefix', 'fr-other', 'fr-pp', 'fr-etre', 'fr-fut-stem', 'fr-subj-stem'],
}

const stemOf = (key: string) => key.slice(0, -2)

/** Which families a verb belongs to (one or several: tener is both e → ie and -go). Empty when the verb is not in the tables. */
export function verbFamilies(language: 'fr' | 'es', key: string): FamilyId[] {
  const entry = { language, lemma: key, partOfSpeech: 'verb' as const }
  const present = conjugateTense(entry, language === 'fr' ? 'present' : 'presente')
  // Only verbs the tables hold: the present can be built by rule for any word that looks like a verb.
  if (!present || !verbParts(entry)) return []
  const tags: FamilyId[] = []
  if (language === 'es') {
    const tuStem = present[1].replace(/(as|es)$/, '')
    const stem = stemOf(key)
    if (tuStem !== stem) {
      if (/ie/.test(tuStem) && tuStem.replace(/ie/, 'e') === stem) tags.push('es-e-ie')
      else if (/ue/.test(tuStem) && (tuStem.replace(/ue/, 'o') === stem || tuStem.replace(/ue/, 'u') === stem)) tags.push('es-o-ue')
      else if (key.endsWith('ir') && /i/.test(tuStem) && tuStem.replace(/i(?=[^i]*$)/, 'e') === stem) tags.push('es-e-i')
    }
    if (present[0].endsWith('go') && !/(gar|guir)$/.test(key)) tags.push('es-go')
    if (present[0].endsWith('zco')) tags.push('es-zco')
    if (/uir$/.test(key) && !/[gq]uir$/.test(key) && /uy/.test(present[1])) tags.push('es-uir')
    if (prefixBase(language, key)) tags.push('es-prefix')
    if (!tags.length) tags.push(irregularForms(entry, 'presente').some(Boolean) ? 'es-other' : 'es-regular')
    return [...tags, ...spanishOtherTenses(key, present)]
  }
  const irregular = irregularForms(entry, 'present').some(Boolean)
  const prefixed = !!prefixBase(language, key)
  if (prefixed) tags.push('fr-prefix')
  if (prefixed) {
    // Its present is its base verb's: the base's family says nothing new.
  } else if (key.endsWith('er')) {
    if (key.endsWith('cer') && present[3].includes('ç')) tags.push('fr-cer')
    else if (key.endsWith('ger') && /ge(ons|ant)/.test(present[3])) tags.push('fr-ger')
    else if (/[aou]yer$/.test(key) || /[aeiou]yer$/.test(key)) tags.push('fr-yer')
    else if (/è/.test(present[0]) && !key.includes('è')) tags.push('fr-accent')
    else if (/(ll|tt)e$/.test(present[0]) && !/(ll|tt)er$/.test(key)) tags.push('fr-double')
    else tags.push(irregular ? 'fr-other' : 'fr-er')
  } else if (key.endsWith('oir')) tags.push('fr-oir')
  else if (key.endsWith('ir')) tags.push(present[3].endsWith('issons') ? 'fr-ir-iss' : 'fr-ir-irreg')
  else if (key.endsWith('re')) tags.push(irregular ? 'fr-other' : 'fr-re')
  else tags.push('fr-other')
  if (verbParts(entry)?.auxiliary === 'être') tags.push('fr-etre')
  return [...tags, ...frenchOtherTenses(key, present)]
}

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
/** Without accents, doubled letters or y for i: tells a spelling change from a new stem. */
const loose = (s: string) => strip(s).replace(/(.)\1/g, '$1').replace(/y/g, 'i')

/** Spanish families of the past, the future and the subjunctive, read off each tense's own forms. */
function spanishOtherTenses(key: string, present: string[]): FamilyId[] {
  const entry = { language: 'es' as const, lemma: key, partOfSpeech: 'verb' as const }
  const tags: FamilyId[] = []
  const stem = stemOf(key)
  const past = conjugateTense(entry, 'preterito')
  if (past) {
    const [yo, , el, , , ellos] = past
    if (/^(ser|ir|dar|ver)$/.test(key)) tags.push('es-pret-other')
    else if (/[^éí]e$/.test(yo) && /[^ó]o$/.test(el) && yo !== `${stem}e`) tags.push(/je$/.test(yo) && /jeron$/.test(ellos) ? 'es-pret-j' : 'es-pret-strong')
    else if (key.endsWith('car') && yo === `${stem.slice(0, -1)}qué`) tags.push('es-pret-spell')
    else if (key.endsWith('gar') && yo === `${stem}ué`) tags.push('es-pret-spell')
    else if (key.endsWith('zar') && yo === `${stem.slice(0, -1)}cé`) tags.push('es-pret-spell')
    else if (/yó$/.test(el) && /yeron$/.test(ellos) && !key.endsWith('ar')) tags.push('es-pret-y')
    else if (key.endsWith('ir') && el.endsWith('ió') && el !== `${stem}ió` && strip(el) !== strip(`${stem}io`)) tags.push('es-pret-stem')
  }
  const future = conjugateTense(entry, 'futuro')
  if (future && strip(future[0]) !== strip(`${key}e`) && !key.endsWith('ír')) tags.push('es-fut-stem')
  const subj = conjugateTense(entry, 'subjuntivo')
  if (subj) {
    if (!present[0].endsWith('o')) tags.push('es-subj-other')
    else if (/(g|zc)o$/.test(present[0]) && !/(gar|guir|ger|gir)$/.test(key) && subj[0] === `${present[0].slice(0, -1)}a`) tags.push('es-subj-yo')
  }
  return tags
}

/** French families of the past participle, the future and the subjunctive. */
function frenchOtherTenses(key: string, present: string[]): FamilyId[] {
  const entry = { language: 'fr' as const, lemma: key, partOfSpeech: 'verb' as const }
  const tags: FamilyId[] = []
  const pp = verbParts(entry)?.participle
  const regularPp = key.endsWith('er') ? `${stemOf(key)}é` : key.endsWith('ir') && !key.endsWith('oir') ? `${stemOf(key)}i` : key.endsWith('re') ? `${stemOf(key)}u` : ''
  if (pp && pp !== regularPp) tags.push('fr-pp')
  const future = conjugateTense(entry, 'futur')
  if (future) {
    const base = key.endsWith('re') ? key.slice(0, -1) : key
    // -er spelling changes (j'achèterai, j'appellerai, je paierai) are the infinitive with an accent, a doubled letter or i for y: not a new stem.
    if (loose(future[0]) !== loose(`${base}ai`)) tags.push('fr-fut-stem')
  }
  const subj = conjugateTense(entry, 'subjonctif')
  // -er verbs (but aller) and the -iss- verbs always build it by rule; the rest from ils (ils prennent → que je prenne).
  const byRule = (key.endsWith('er') && key !== 'aller') || subj?.[0] === `${stemOf(key)}isse`
  if (subj && !byRule && (!present[5]?.endsWith('ent') || loose(subj[0]) !== loose(`${present[5].slice(0, -3)}e`))) tags.push('fr-subj-stem')
  return tags
}

const PREFIXES = {
  es: ['ob', 'man', 'con', 'de', 'des', 'dis', 're', 'pro', 'su', 'com', 'ex', 'im', 'pre', 'pos', 'sos', 'sobre', 'entre', 'inter', 'contra', 'de', 'a', 'sub', 'tras', 'satis', 'per', 'retro', 'super'],
  fr: ['contre', 'a', 'com', 'ap', 'sur', 'ap', 'dé', 'de', 're', 'ré', 'pré', 'pro', 'per', 'ad', 'ob', 'sou', 'main', 'con', 'ap', 'dis', 'entre', 'inter', 'trans', 'par', 'sub', 'cir', 'pour', 'mé', 'se'],
}

/**
 * A verb worth naming as the model of its prefixed ones: one that has to be learnt on its own
 * (tener, poner, hacer; prendre, venir, mettre), not one with a spelling or stem rule anyone can
 * apply (probar, sentir; lancer, appeler).
 */
function strongBase(language: 'fr' | 'es', base: string): boolean {
  const entry = { language, lemma: base, partOfSpeech: 'verb' as const }
  if (language === 'fr') return !base.endsWith('er') && irregularForms(entry, 'present').some(Boolean)
  const present = conjugateTense(entry, 'presente')
  const past = conjugateTense(entry, 'preterito')
  return !!present && ((/(go|zco)$/.test(present[0]) && !/(gar|guir)$/.test(base) && present[0] !== `${stemOf(base)}o`) || !present[0].endsWith('o') || (!!past && /[^éí]e$/.test(past[0]) && past[0] !== `${stemOf(base)}e`))
}

const PREFIX_CACHE = new Map<string, string | null>()

/**
 * The irregular verb a prefixed one is conjugated like (obtener → tener, comprendre → prendre), or
 * undefined: the base must be in the tables, irregular, and its present must give the verb's whole
 * present with the prefix in front.
 */
export function prefixBase(language: 'fr' | 'es', key: string): string | undefined {
  const cacheKey = `${language}:${key}`
  if (PREFIX_CACHE.has(cacheKey)) return PREFIX_CACHE.get(cacheKey) ?? undefined
  let found: string | undefined
  const tense: Tense = language === 'fr' ? 'present' : 'presente'
  const mine = conjugateTense({ language, lemma: key, partOfSpeech: 'verb' }, tense)
  if (mine && verbParts({ language, lemma: key, partOfSpeech: 'verb' })) {
    for (const prefix of new Set(PREFIXES[language])) {
      if (!key.startsWith(prefix) || key.length - prefix.length < 3) continue
      const base = key.slice(prefix.length)
      const entry = { language, lemma: base, partOfSpeech: 'verb' as const }
      if (!verbParts(entry) || !strongBase(language, base)) continue
      const theirs = conjugateTense(entry, tense)
      // Spanish written accents move with the stress (detener, detienes; tener, tienes: same), so compare without them.
      if (theirs && theirs.every((f, i) => strip(mine[i]) === strip(prefix + f))) {
        found = base
        break
      }
    }
  }
  PREFIX_CACHE.set(cacheKey, found ?? null)
  return found
}

const CACHE = new Map<string, Map<FamilyId, string[]>>()

/** Every verb of a family among the tables, most frequent first when a frequency list is given. */
export function familyVerbs(language: 'fr' | 'es', id: FamilyId, frequency?: ReadonlyMap<string, number>): string[] {
  const size = tenseVerbs(language).length
  const key = `${language}:${size}`
  let by = CACHE.get(key)
  if (!by) {
    by = new Map()
    for (const verb of tenseVerbs(language)) for (const f of verbFamilies(language, verb)) by.set(f, [...(by.get(f) ?? []), verb])
    CACHE.set(key, by)
  }
  const list = by.get(id) ?? []
  if (!frequency) return list
  const rank = (v: string) => frequency.get(v) ?? Number.MAX_SAFE_INTEGER
  return [...list].sort((a, b) => rank(a) - rank(b))
}

/** How the learner does in one family's tense, from the lab's own answers. */
export interface FamilyWeakness {
  id: FamilyId
  ok: number
  wrong: number
  /** Wrong answers as a share of all (0–1). */
  rate: number
  /** The family's verbs answered wrong, most missed first: the round asks them first. */
  missed: string[]
}

/** Enough answers in a family for its share of mistakes to mean something. */
export const WEAK_MIN_ANSWERS = 6
const WEAK_MIN_RATE = 0.25

/**
 * The families the learner slips in most: every verb-and-tense record counted into the families
 * the verb belongs to in that tense (the regular ones left out: no pattern to drill there), the
 * worst share of mistakes first. Only families with enough answers and a real share of slips.
 */
export function weakFamilies(language: 'fr' | 'es', lab: Pick<LabData, 'records' | 'slips'>): FamilyWeakness[] {
  const by = new Map<FamilyId, { ok: number; wrong: number; missed: Map<string, number> }>()
  for (const [key, rec] of Object.entries(lab.records)) {
    const [verb, tense] = key.split('|')
    if (!verb || !tense || !(rec.ok + rec.wrong)) continue
    for (const id of verbFamilies(language, verb)) {
      if (FAMILIES[id].tense !== tense || REGULAR.has(id)) continue
      const row = by.get(id) ?? { ok: 0, wrong: 0, missed: new Map() }
      row.ok += rec.ok
      row.wrong += rec.wrong
      if (rec.wrong) row.missed.set(verb, (row.missed.get(verb) ?? 0) + rec.wrong)
      by.set(id, row)
    }
  }
  // The open mistakes bank names the verbs still wrong: those first.
  for (const slip of Object.values(lab.slips ?? {})) {
    if (slip.done) continue
    for (const id of verbFamilies(language, slip.verb)) {
      const row = by.get(id)
      if (row && FAMILIES[id].tense === slip.tense) row.missed.set(slip.verb, (row.missed.get(slip.verb) ?? 0) + 100)
    }
  }
  return [...by.entries()]
    .map(([id, r]) => ({ id, ok: r.ok, wrong: r.wrong, rate: r.wrong / (r.ok + r.wrong), missed: [...r.missed.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v) }))
    .filter((r) => r.ok + r.wrong >= WEAK_MIN_ANSWERS && r.wrong >= 2 && r.rate >= WEAK_MIN_RATE)
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
}

const REGULAR = new Set<FamilyId>(['es-regular', 'fr-er', 'fr-re', 'fr-ir-iss'])

/** The families shown for a verb in a tense: its present-tense ones (what kind of verb it is) and the ones of the tense in view. */
export function familiesInView(language: 'fr' | 'es', key: string, tense: Tense): FamilyId[] {
  const present: Tense = language === 'fr' ? 'present' : 'presente'
  return verbFamilies(language, key).filter((id) => FAMILIES[id].tense === present || FAMILIES[id].tense === tense || id === 'fr-etre')
}
