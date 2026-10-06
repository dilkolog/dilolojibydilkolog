import { conjugateTense, irregularForms, tenseVerbs, verbParts } from './tenses'

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
  /** The tense the family is drilled in. */
  tense: 'presente' | 'present' | 'passe-compose'
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
}

/** The families of each language in the order they are best met: the rules that cover most verbs first. */
export const FAMILY_ORDER: Record<'fr' | 'es', FamilyId[]> = {
  es: ['es-e-ie', 'es-o-ue', 'es-e-i', 'es-go', 'es-zco', 'es-uir', 'es-other', 'es-regular'],
  fr: ['fr-er', 'fr-ir-iss', 'fr-re', 'fr-ir-irreg', 'fr-cer', 'fr-ger', 'fr-yer', 'fr-accent', 'fr-double', 'fr-oir', 'fr-etre', 'fr-other'],
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
    if (!tags.length) tags.push(irregularForms(entry, 'presente').some(Boolean) ? 'es-other' : 'es-regular')
    return tags
  }
  const irregular = irregularForms(entry, 'present').some(Boolean)
  if (key.endsWith('er')) {
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
  return tags
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
