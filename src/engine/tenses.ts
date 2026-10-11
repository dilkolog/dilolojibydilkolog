import { normalize } from './answerCheck'
import { acceptedForms, conjugate, PRONOUNS, type Person } from './conjugation'
import type { VocabularyEntry } from './types'

/**
 * Past, future, conditional and subjunctive for French and Spanish verbs, on top of the present
 * (conjugation.ts).
 * Forms come from tables built by scripts/build-tenses.ts (src/data/tenses), each checked against
 * several sources; a verb missing from them simply has no such tense here. Compound tenses
 * (passé composé, pretérito perfecto) are put together from the auxiliary and the participle, so
 * reflexive verbs get être and their pronoun; the conditional from the future stem (parler-ais,
 * tendr-ía), which holds for every verb.
 */
export type FrTense = 'present' | 'passe-compose' | 'imparfait' | 'futur' | 'conditionnel' | 'subjonctif'
export type EsTense = 'presente' | 'preterito' | 'imperfecto' | 'perfecto' | 'futuro' | 'condicional' | 'subjuntivo'
/**
 * Further tenses, mostly put together from the auxiliary and the participle (or the preterite stem),
 * plus the passé simple of written French: the verb lab and the reader know them; the daily
 * questions do not ask them.
 */
export type FrMoreTense = 'imperatif' | 'passe-simple' | 'plus-que-parfait' | 'futur-anterieur' | 'conditionnel-passe' | 'subjonctif-passe'
export type EsMoreTense = 'imperativo' | 'pluscuamperfecto' | 'futuro-perfecto' | 'condicional-perfecto' | 'subjuntivo-imperfecto' | 'subjuntivo-perfecto' | 'subjuntivo-pluscuamperfecto'
export type Tense = FrTense | EsTense | FrMoreTense | EsMoreTense

/** In teaching order: the present, the past, the past background, the future, then the moods. These are the tenses the questions and the word page use. */
export const TENSES: { fr: FrTense[]; es: EsTense[] } = {
  fr: ['present', 'passe-compose', 'imparfait', 'futur', 'conditionnel', 'subjonctif'],
  es: ['presente', 'preterito', 'perfecto', 'imperfecto', 'futuro', 'condicional', 'subjuntivo'],
}

/** Every tense the verb lab shows, by mood: the indicative, then the conditional and the subjunctive. */
export const LAB_TENSES: { fr: (FrTense | FrMoreTense)[]; es: (EsTense | EsMoreTense)[] } = {
  fr: ['present', 'imparfait', 'passe-compose', 'passe-simple', 'plus-que-parfait', 'futur', 'futur-anterieur', 'conditionnel', 'conditionnel-passe', 'subjonctif', 'subjonctif-passe', 'imperatif'],
  es: ['presente', 'imperfecto', 'preterito', 'perfecto', 'pluscuamperfecto', 'futuro', 'futuro-perfecto', 'condicional', 'condicional-perfecto', 'subjuntivo', 'subjuntivo-imperfecto', 'subjuntivo-perfecto', 'subjuntivo-pluscuamperfecto', 'imperativo'],
}

/** The imperative: addressed to someone, so it has no "I" (nor "he" in French). */
export const isImperative = (tense: Tense) => tense === 'imperatif' || tense === 'imperativo'

/** The persons a tense has: all six, except the imperative (tu, nous, vous; tú, usted, nosotros, vosotros, ustedes). */
export function personsOf(language: 'fr' | 'es', tense: Tense): number[] {
  if (!isImperative(tense)) return [0, 1, 2, 3, 4, 5]
  return language === 'fr' ? [1, 3, 4] : [1, 2, 3, 4, 5]
}

export const isSubjunctive = (tense: Tense) => tense.startsWith('subjonctif') || tense.startsWith('subjuntivo')

/** Which tense of the auxiliary a compound tense uses: "j'ai parlé" (present), "había comido" (imparfait). */
const COMPOUND_AUX: Partial<Record<Tense, 'present' | 'imparfait' | 'futur' | 'conditionnel' | 'subjonctif'>> = {
  'passe-compose': 'present',
  'plus-que-parfait': 'imparfait',
  'futur-anterieur': 'futur',
  'conditionnel-passe': 'conditionnel',
  'subjonctif-passe': 'subjonctif',
  perfecto: 'present',
  pluscuamperfecto: 'imparfait',
  'futuro-perfecto': 'futur',
  'condicional-perfecto': 'conditionnel',
  'subjuntivo-perfecto': 'subjonctif',
  'subjuntivo-pluscuamperfecto': 'imparfait',
}
/** A tense built from the auxiliary and the participle. */
export const isCompound = (tense: Tense) => tense in COMPOUND_AUX

/** Endings for tenses stored as a stem (must match ENDINGS in scripts/build-tenses.ts). */
const ENDINGS = {
  frI: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  frF: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  esImpAr: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
  esImpErIr: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  esFut: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
  esPreAr: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
  esPreErIr: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
  frS: ['e', 'es', 'e', 'ions', 'iez', 'ent'],
  esSubAr: ['e', 'es', 'e', 'emos', 'éis', 'en'],
  esSubErIr: ['a', 'as', 'a', 'amos', 'áis', 'an'],
}

/** ps: the passé simple as "stem:a|i|u" (regular sets in PASSE_SIMPLE) or six forms; none for defective verbs (traire). */
interface FrRow { i: string | string[]; f: string | string[]; s?: string | string[]; ps?: string | string[]; pp: string | [string, string]; aux: 'a' | 'e' }
interface EsRow { pre: string[]; imp: string | string[]; fut: string | string[]; pp: string; sub?: string | string[] }
const DATA = { fr: new Map<string, FrRow>(), es: new Map<string, EsRow>() }

/** Loads a language's table (the JSON from src/data/tenses), done once in the background. */
export function addTenses(language: 'fr' | 'es', json: Record<string, unknown>) {
  const map = DATA[language] as Map<string, unknown>
  for (const [verb, row] of Object.entries(json)) map.set(verb, row)
}

export const tensesLoaded = (language: 'fr' | 'es') => DATA[language].size > 0

const expand = (v: string | string[], endings: string[]) => (typeof v === 'string' ? endings.map((e) => v + e) : [...v])

/** Must match PASSE_SIMPLE in scripts/build-tenses.ts. */
const PASSE_SIMPLE: Record<string, string[]> = {
  a: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
  i: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
  u: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
}
function passeSimple(ps: string | string[]): string[] | undefined {
  if (typeof ps !== 'string') return [...ps]
  const [stem, set] = ps.split(':')
  return PASSE_SIMPLE[set]?.map((e) => stem + e)
}

const AUX = {
  avoir: {
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    imparfait: ['avais', 'avais', 'avait', 'avions', 'aviez', 'avaient'],
    futur: ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront'],
    conditionnel: ['aurais', 'aurais', 'aurait', 'aurions', 'auriez', 'auraient'],
    subjonctif: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'],
  },
  etre: {
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    imparfait: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'],
    futur: ['serai', 'seras', 'sera', 'serons', 'serez', 'seront'],
    conditionnel: ['serais', 'serais', 'serait', 'serions', 'seriez', 'seraient'],
    subjonctif: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'],
  },
  haber: {
    present: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    imparfait: ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
    futur: ['habré', 'habrás', 'habrá', 'habremos', 'habréis', 'habrán'],
    conditionnel: ['habría', 'habrías', 'habría', 'habríamos', 'habríais', 'habrían'],
    subjonctif: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
  },
  /** hubiera, hubieras…: the "-ra" form of haber, for the pluperfect subjunctive. */
  hubiera: ['hubiera', 'hubieras', 'hubiera', 'hubiéramos', 'hubierais', 'hubieran'],
}

/** Spanish imperfect subjunctive from the preterite "ellos" form: comieron → comiera, comieras, comiéramos… */
function subjunctiveImperfect(pre: readonly string[]): string[] | undefined {
  const third = pre[5]
  if (!third?.endsWith('ron')) return undefined
  const stem = third.slice(0, -3)
  // The stress stays on the syllable before -ramos: comiéramos, fuéramos.
  const accented = stem.replace(/([aeiou])([^aeiou]*)$/i, (_, v: string, rest: string) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' })[v.toLowerCase()] + rest)
  return [`${stem}ra`, `${stem}ras`, `${stem}ra`, `${accented}ramos`, `${stem}rais`, `${stem}ran`]
}
const REFL = { fr: ['me', 'te', 'se', 'nous', 'vous', 'se'], es: ['me', 'te', 'se', 'nos', 'os', 'se'] }

/** The verb's dictionary key and whether it is reflexive: "se lever" → lever, "levantarse" → levantar. */
function keyOf(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): { key: string; reflexive: boolean } {
  let v = normalize(entry.lemma).toLocaleLowerCase(entry.language)
  if (entry.language === 'fr' && /^(se |s['’])/.test(v)) return { key: v.replace(/^(se |s['’])/, ''), reflexive: true }
  if (entry.language === 'es' && /(ar|er|ir|ír)se$/.test(v)) return { key: v.slice(0, -2), reflexive: true }
  return { key: v, reflexive: false }
}

/** French reflexive pronoun before a form: me lève, m'appelle, nous levons. */
function frReflexive(person: number, form: string): string {
  const p = REFL.fr[person]
  return /^[aeiouéèêhâîôûy]/i.test(form) && (p === 'me' || p === 'te' || p === 'se') ? `${p[0]}'${form}` : `${p} ${form}`
}

/** Whether the verb has this tense here (present: when conjugation.ts can produce it). */
export function hasTense(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, tense: Tense): boolean {
  return !!conjugateTense(entry, tense)
}

/** The six forms (without subject pronouns; with the reflexive pronoun), or undefined. */
export function conjugateTense(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, tense: Tense): string[] | undefined {
  if (entry.language === 'en' || entry.partOfSpeech !== 'verb') return undefined
  if (tense === 'present' || tense === 'presente') return conjugate(entry)?.forms
  if (isImperative(tense)) return imperative(entry)
  const { key, reflexive } = keyOf(entry)
  if (entry.language === 'fr') {
    const row = DATA.fr.get(key)
    if (!row) return undefined
    const simple =
      tense === 'imparfait'
        ? expand(row.i, ENDINGS.frI)
        : tense === 'futur'
          ? expand(row.f, ENDINGS.frF)
          : tense === 'conditionnel'
            ? ENDINGS.frI.map((e) => expand(row.f, ENDINGS.frF)[0].slice(0, -2) + e)
            : tense === 'subjonctif' && row.s
              ? expand(row.s, ENDINGS.frS)
              : tense === 'passe-simple' && row.ps
                ? passeSimple(row.ps)
                : undefined
    if (simple) return reflexive ? simple.map((f, i) => frReflexive(i, f)) : simple
    const compound = COMPOUND_AUX[tense]
    if (compound) {
      const etre = reflexive || row.aux === 'e'
      const [sg, pl] = typeof row.pp === 'string' ? [row.pp, `${row.pp}s`] : row.pp
      return AUX[etre ? 'etre' : 'avoir'][compound].map((aux, i) => {
        // With être the participle agrees with the subject: plural for nous, vous, ils.
        const form = `${aux} ${etre && i >= 3 ? pl : sg}`
        return reflexive ? frReflexive(i, form) : form
      })
    }
    return undefined
  }
  const row = DATA.es.get(key)
  if (!row) return undefined
  const aux = COMPOUND_AUX[tense]
  const forms =
    tense === 'preterito'
      ? [...row.pre]
      : tense === 'imperfecto'
        ? expand(row.imp, key.endsWith('ar') ? ENDINGS.esImpAr : ENDINGS.esImpErIr)
        : tense === 'futuro'
          ? expand(row.fut, ENDINGS.esFut)
          : aux
            ? (tense === 'subjuntivo-pluscuamperfecto' ? AUX.hubiera : AUX.haber[aux]).map((h) => `${h} ${row.pp}`)
            : tense === 'condicional'
              ? ENDINGS.esImpErIr.map((e) => expand(row.fut, ENDINGS.esFut)[0].slice(0, -1) + e)
              : tense === 'subjuntivo' && row.sub
                ? expand(row.sub, key.endsWith('ar') ? ENDINGS.esSubAr : ENDINGS.esSubErIr)
                : tense === 'subjuntivo-imperfecto'
                  ? subjunctiveImperfect(row.pre)
                  : undefined
  return forms && (reflexive ? forms.map((f, i) => `${REFL.es[i]} ${f}`) : forms)
}

/** French imperatives that are not the present's (sois, aie, sache, veuille). */
const FR_IMPERATIVE: Record<string, [string, string, string]> = {
  être: ['sois', 'soyons', 'soyez'],
  avoir: ['aie', 'ayons', 'ayez'],
  savoir: ['sache', 'sachons', 'sachez'],
  vouloir: ['veuille', 'veuillons', 'veuillez'],
}

/** Spanish "tú" imperatives that are not the present's "él" form; compounds keep the pattern with an accent (obtén, supón). */
function esTu(key: string, present: string): string {
  const exact: Record<string, string> = { decir: 'di', ir: 've', ser: 'sé', salir: 'sal', tener: 'ten', venir: 'ven', poner: 'pon', hacer: 'haz' }
  if (exact[key]) return exact[key]
  for (const [base, form, accented] of [['tener', 'ten', 'tén'], ['venir', 'ven', 'vén'], ['poner', 'pon', 'pón'], ['hacer', 'haz', 'haz'], ['salir', 'sal', 'sal']] as const)
    if (key.endsWith(base) && key.length > base.length) return key.slice(0, -base.length) + (accented ?? form)
  return present
}

/**
 * The imperative, as six slots with "" for the persons it lacks (personsOf). French: the present
 * of tu (-es and vas drop the s: parle, ouvre, va), nous, vous, with the reflexive pronoun after
 * (lève-toi, levons-nous). Spanish: tú from the present (habla) or its short irregulars (di, haz,
 * ve), usted / nosotros / ustedes from the subjunctive, vosotros from the infinitive (hablad).
 * A Spanish reflexive (levántate, the stress mark moves) is not built here.
 */
function imperative(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>): string[] | undefined {
  const { key, reflexive } = keyOf(entry)
  const present = conjugate({ ...entry, lemma: key })?.forms
  if (!present) return undefined
  if (entry.language === 'fr') {
    const [tu, nous, vous] = FR_IMPERATIVE[key] ?? [/(es|^vas)$/.test(present[1]) ? present[1].slice(0, -1) : present[1], present[3], present[4]]
    const forms = reflexive ? [`${tu}-toi`, `${nous}-nous`, `${vous}-vous`] : [tu, nous, vous]
    return ['', forms[0], '', forms[1], forms[2], '']
  }
  if (reflexive) return undefined
  const row = DATA.es.get(key)
  if (!row?.sub) return undefined
  const sub = expand(row.sub, key.endsWith('ar') ? ENDINGS.esSubAr : ENDINGS.esSubErIr)
  // ir: "vamos" (not vayamos) and "id".
  return ['', esTu(key, present[2]), sub[2], key === 'ir' ? 'vamos' : sub[3], key === 'ir' ? 'id' : `${key.slice(0, -1)}d`, sub[5]]
}

/** Every tense the verb lab can show for the verb, by mood. */
export function labTensesOf(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>): Tense[] {
  if (entry.language === 'en') return []
  return (LAB_TENSES[entry.language] as Tense[]).filter((t) => hasTense(entry, t))
}

/** Tenses the verb has among those the questions and the word page use, in teaching order. */
export function tensesOf(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>): Tense[] {
  if (entry.language === 'en') return []
  return (TENSES[entry.language] as Tense[]).filter((t) => hasTense(entry, t))
}

/**
 * Which forms break the regular pattern (marked in the table and worth practising): each form
 * against what the regular rule would give. Spelling changes (busqué) count, as they must be learned.
 */
export function irregularForms(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, tense: Tense): boolean[] {
  const forms = conjugateTense(entry, tense)
  if (!forms) return []
  const { key } = keyOf(entry)
  // The imperative is irregular where it is not the regular source's: sois, aie (not the present);
  // di, haz, ten, obtén (not the present's él form); vamos (not the subjunctive).
  if (isImperative(tense)) {
    if (entry.language === 'fr') return forms.map((f) => !!f && key in FR_IMPERATIVE)
    const present = conjugate({ ...entry, lemma: key })?.forms
    return forms.map((f, i) => (i === 1 ? !!present && f !== present[2] : i === 3 && key === 'ir'))
  }
  const bare = forms.map((f) => f.replace(/^(me|te|se|nous|vous|nos|os) |^[mts]'/, ''))
  let regular: string[] | undefined
  if (tense === 'present' || tense === 'presente') {
    // The regular pattern of the verb's class; a form off it (vais, tengo, pienso) is marked.
    const stem = key.slice(0, -2)
    // French -ir verbs follow one of three patterns (finir, partir, ouvrir); the one matching
    // most forms is the verb's own, so only real breaks are marked (not partons, dormez).
    const fr = (endings: string[], sing = stem) => endings.map((e, i) => (i < 3 ? sing : stem) + e)
    const candidates =
      entry.language === 'fr'
        ? key.endsWith('er')
          ? [fr(['e', 'es', 'e', 'ons', 'ez', 'ent'])]
          : key.endsWith('ir') && !key.endsWith('oir')
            ? [fr(['is', 'is', 'it', 'issons', 'issez', 'issent']), fr(['s', 's', 't', 'ons', 'ez', 'ent'], stem.slice(0, -1)), fr(['e', 'es', 'e', 'ons', 'ez', 'ent'])]
            : key.endsWith('re')
              ? [fr(['s', 's', '', 'ons', 'ez', 'ent'])]
              : []
        : [(key.endsWith('ar') ? ['o', 'as', 'a', 'amos', 'áis', 'an'] : key.endsWith('er') ? ['o', 'es', 'e', 'emos', 'éis', 'en'] : ['o', 'es', 'e', 'imos', 'ís', 'en']).map((e) => stem + e)]
    const fit = (c: string[]) => c.filter((f, i) => f === bare[i]).length
    // -oir verbs (savoir, voir, pouvoir) have no regular pattern: every present form is learned.
    regular = entry.language === 'fr' && key.endsWith('oir') ? bare.map(() => '') : candidates.sort((x, y) => fit(y) - fit(x))[0]
  } else if (entry.language === 'fr') {
    if (tense === 'imparfait') {
      const nous = conjugateTense(entry, 'present')?.[3].replace(/^nous /, '')
      if (nous?.endsWith('ons')) regular = ENDINGS.frI.map((e) => nous.slice(0, -3) + e)
    } else if (tense === 'futur' || tense === 'conditionnel') {
      const stem = key.endsWith('re') ? key.slice(0, -1) : key
      regular = (tense === 'futur' ? ENDINGS.frF : ENDINGS.frI).map((e) => stem + e)
    } else if (tense === 'subjonctif') {
      // Stem of "ils" (present) for je/tu/il/ils, the imparfait for nous/vous: prennent → prenne, prenions.
      const ils = conjugateTense(entry, 'present')?.[5].replace(/^se /, '')
      const imp = conjugateTense(entry, 'imparfait')?.map((f) => f.replace(/^(nous|vous) /, ''))
      if (ils?.endsWith('ent') && imp) regular = ENDINGS.frS.map((e, i) => (i === 3 || i === 4 ? imp[i] : ils.slice(0, -3) + e))
      // sont, ont, vont, font: no stem to build from, the whole tense is learned by heart.
      else if (ils) regular = bare.map(() => '')
    } else if (isCompound(tense)) {
      const pp = key.endsWith('er') ? `${key.slice(0, -2)}é` : key.endsWith('ir') ? `${key.slice(0, -2)}i` : key.endsWith('re') ? `${key.slice(0, -2)}u` : ''
      regular = bare.map((f) => (pp && f.split(' ')[1]?.replace(/s$/, '') === pp ? f : ''))
    }
  } else {
    const stem = key.slice(0, -2)
    const ar = key.endsWith('ar')
    if (tense === 'preterito') regular = (ar ? ENDINGS.esPreAr : ENDINGS.esPreErIr).map((e) => stem + e)
    else if (tense === 'imperfecto') regular = (ar ? ENDINGS.esImpAr : ENDINGS.esImpErIr).map((e) => stem + e)
    else if (tense === 'futuro') regular = ENDINGS.esFut.map((e) => key + e)
    else if (tense === 'condicional') regular = ENDINGS.esImpErIr.map((e) => key + e)
    else if (tense === 'subjuntivo') {
      // From the "yo" form of the present (tengo → tenga); a stem change (pienso) stays out of
      // nosotros/vosotros (pensemos), as in the present.
      const yo = conjugateTense(entry, 'presente')?.[0].replace(/^me /, '')
      if (yo?.endsWith('o')) {
        const yoStem = yo.slice(0, -1)
        const nosStem = yoStem.replace('ie', 'e') === stem || yoStem.replace('ue', 'o') === stem ? stem : yoStem
        regular = (ar ? ENDINGS.esSubAr : ENDINGS.esSubErIr).map((e, i) => (i === 3 || i === 4 ? nosStem : yoStem) + e)
      } else if (yo) regular = bare.map(() => '') // soy, voy, sé: sea, vaya, sepa are learned by heart.

    }
    else if (isCompound(tense)) {
      const pp = `${stem}${ar ? 'ado' : 'ido'}`
      regular = bare.map((f) => (f.endsWith(` ${pp}`) ? f : ''))
    } else if (tense === 'subjuntivo-imperfecto') {
      // From the preterite "ellos" form, so the whole tense is irregular when the preterite is.
      const pre = (ar ? ENDINGS.esPreAr : ENDINGS.esPreErIr).map((e) => stem + e)
      const regularSub = subjunctiveImperfect(pre)
      const row = DATA.es.get(key)
      regular = row && row.pre[5] === pre[5] ? regularSub : bare.map(() => '')
    }
  }
  return regular ? bare.map((f, i) => f !== regular![i]) : bare.map(() => false)
}

/**
 * Other accepted spellings: the 1990 French reform (cèderai beside céderai; cachète beside
 * cachette for -eler/-eter verbs other than appeler and jeter) and Spanish monosyllables written
 * without the accent since 2010 (rio, guio beside rió, guió).
 */
export function tenseVariants(language: 'fr' | 'es', form: string, lemma = ''): string[] {
  if (language === 'fr') {
    const out = new Set<string>()
    out.add(form.replace(/é([^aeiouéèêy ]+)er(ai|as|a|ons|ez|ont|ais|ait|ions|iez|aient)$/, 'è$1er$2'))
    if (/e[lt]er$/.test(lemma) && !/(jeter|appeler)$/.test(lemma))
      out.add(form.replace(/e(l|t)\1(e|es|ent|erai|eras|era|erons|erez|eront|erais|erait|erions|eriez|eraient)$/, 'è$1$2'))
    out.delete(form)
    return [...out]
  }
  const words = form.split(' ')
  const last = words[words.length - 1]
  const plain = last.replace(/([iu])ó$/, '$1o').replace(/([iu])é$/, '$1e')
  if (plain === last || plain.replace(/[^aeiouáéíóú]/g, '').length > 2) return []
  return [[...words.slice(0, -1), plain].join(' ')]
}

/**
 * Every right answer for one person, without the subject pronoun: the form, its spelling
 * variants and, with être, the participle agreeing with a feminine or (vous) singular subject.
 */
export function tenseAnswers(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, tense: Tense, person: number): string[] {
  const forms = conjugateTense(entry, tense)
  if (!forms || entry.language === 'en') return []
  const form = forms[person]
  const out = new Set([form, ...tenseVariants(entry.language, form, keyOf(entry).key)])
  // The -se forms of the imperfect subjunctive (comiese) are as right as the -ra ones.
  if (tense === 'subjuntivo-pluscuamperfecto') out.add(form.replace(/^hubi(é|e)ra(s|mos|is|n)?/, (_m, v: string, e: string | undefined) => `hubi${v}se${e ?? ''}`))
  if (tense === 'subjuntivo-imperfecto') out.add(form.replace(/ra(s|mos|is|n)?$/, (_m, e: string | undefined) => `se${e ?? ''}`))
  if (entry.language === 'fr' && isCompound(tense)) {
    const { key, reflexive } = keyOf(entry)
    const row = DATA.fr.get(key)
    const etre = reflexive || row?.aux === 'e'
    if (row && etre) {
      const sg = typeof row.pp === 'string' ? row.pp : row.pp[0]
      const fem = person < 3 ? [`${sg}e`] : person === 4 ? [sg, `${sg}e`, `${sg}es`] : [`${sg}es`]
      const head = form.slice(0, form.lastIndexOf(' ') + 1)
      for (const p of fem) out.add(head + p)
    }
  }
  return [...out]
}

/** "que je", "qu'il / qu'elle": the subjunctive is asked and shown after "que". */
const que = (language: 'fr' | 'es', s: string) => (language === 'fr' && /^[aeiouyéè]/i.test(s) ? `qu'${s}` : `que ${s}`)

/** The subject as a question or the table shows it: "nous", "que je", "qu'il / qu'elle". */
export function subjectLabel(language: 'fr' | 'es', tense: Tense, person: number): string {
  // The imperative has no subject; the person it speaks to, in brackets.
  if (isImperative(tense)) return `(${language === 'es' && person === 2 ? 'usted' : language === 'es' && person === 5 ? 'ustedes' : PRONOUNS[language][person][0]})`
  return PRONOUNS[language][person]
    .slice(0, 2)
    .map((p) => (isSubjunctive(tense) ? que(language, p) : p))
    .join(' / ')
}

/** A form with its subject, as a list shows it: "j'aime", "que nous parlions". */
export function withSubject(language: 'fr' | 'es', tense: Tense, person: number, form: string): string {
  if (isImperative(tense)) return language === 'es' ? `¡${form}!` : `${form} !`
  const full = acceptedForms(language, person as Person, form)[1]
  return isSubjunctive(tense) ? que(language, full) : full
}

/** Accepted typed answers: the form alone or with a subject pronoun (and "que" for the subjunctive). */
export function answersFor(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, tense: Tense, person: number): string[] {
  if (entry.language === 'en') return []
  const lang = entry.language
  // Said without a subject: "parle", not "tu parle".
  if (isImperative(tense)) return tenseAnswers(entry, tense, person)
  const withPronoun = tenseAnswers(entry, tense, person).flatMap((f) => acceptedForms(lang, person as Person, f))
  return isSubjunctive(tense) ? [...withPronoun, ...withPronoun.filter((a) => a.includes(' ') || a.includes("'")).map((a) => que(lang, a))] : withPronoun
}

/** How many correct productions open each tense: the present first, the rest as the word settles. */
const UNLOCK: Record<Tense, number> = {
  present: 0,
  'passe-compose': 1,
  imparfait: 3,
  futur: 5,
  conditionnel: 6,
  subjonctif: 8,
  presente: 0,
  preterito: 1,
  perfecto: 2,
  imperfecto: 3,
  futuro: 5,
  condicional: 6,
  subjuntivo: 8,
  // Only the verb lab asks these.
  'passe-simple': 99,
  imperatif: 99,
  imperativo: 99,
  'plus-que-parfait': 99,
  'futur-anterieur': 99,
  'conditionnel-passe': 99,
  'subjonctif-passe': 99,
  pluscuamperfecto: 99,
  'futuro-perfecto': 99,
  'condicional-perfecto': 99,
  'subjuntivo-imperfecto': 99,
  'subjuntivo-perfecto': 99,
  'subjuntivo-pluscuamperfecto': 99,
}

/**
 * Tenses a conjugation question may ask for, given how often the word has been produced:
 * one new tense at a time keeps the load low (Pienemann's processability: one step after the
 * other), and the present comes back between them. A verb without the present starts at its
 * first available tense.
 */
/** Correct productions after which conjugation questions start asking this tense. */
export const unlockAt = (tense: Tense) => UNLOCK[tense]

export function unlockedTenses(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, reps: number): Tense[] {
  const all = tensesOf(entry)
  const open = all.filter((t) => UNLOCK[t] <= reps)
  return open.length ? open : all.slice(0, 1)
}

/** Example sentences per verb and tense ("text with [form]\ttranslation"), see addTenseSentences. */
const SENTENCES = { fr: new Map<string, Record<string, string>>(), es: new Map<string, Record<string, string>>() }

/** Loads src/data/tenses/{fr,es}-sentences.json (built by scripts/build-tense-sentences*.ts). */
export function addTenseSentences(language: 'fr' | 'es', json: Record<string, Record<string, string>>) {
  for (const [verb, row] of Object.entries(json)) SENTENCES[language].set(verb, row)
}

export interface TenseSentence {
  /** The sentence with the verb form replaced by "___". */
  text: string
  /** The form as it stands in the sentence. */
  form: string
  /** Turkish, when there is a trustworthy one (most French sentences have none). */
  translation?: string
}

/** A checked sentence using the verb in this tense, if there is one. */
export function tenseSentence(entry: Pick<VocabularyEntry, 'language' | 'lemma'>, tense: Tense): TenseSentence | undefined {
  if (entry.language === 'en') return undefined
  const raw = SENTENCES[entry.language].get(normalize(entry.lemma).toLocaleLowerCase(entry.language))?.[tense]
  const m = raw?.match(/^(.*)\[([^\]]+)\](.*)\t(.*)$/)
  return m ? { text: `${m[1]}___${m[3]}`, form: m[2], translation: m[4] || undefined } : undefined
}

/** Past perfective or imperfective in a sentence whose time words settle it (see build scripts). */
export interface AspectItem {
  verb: string
  /** The tense the sentence uses. */
  tense: Tense
  /** The sentence with "___" where the verb was. */
  text: string
  form: string
  /** The same person in the other tense, the wrong option. */
  other: string
  translation?: string
  /** The time words that settle the tense ("hier", "cuando era niño"). */
  cue: string
}
const ASPECT = { fr: [] as AspectItem[], es: [] as AspectItem[] }

export function addAspect(language: 'fr' | 'es', rows: string[][]) {
  ASPECT[language] = rows.flatMap(([verb, tense, marked, other, tr, cue]) => {
    const m = marked.match(/^(.*)\[([^\]]+)\](.*)$/)
    return m ? [{ verb, tense: tense as Tense, text: `${m[1]}___${m[3]}`, form: m[2], other, translation: tr || undefined, cue }] : []
  })
}

export const aspectItems = (language: 'fr' | 'es'): readonly AspectItem[] => ASPECT[language]

/** The past-tense choice items for one verb (its own sentences). */
export function aspectItemsFor(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): AspectItem[] {
  if (entry.language === 'en') return []
  const key = keyOf(entry).key
  return ASPECT[entry.language].filter((a) => a.verb === key)
}

/** Which tense an expected answer of this verb belongs to (the first, in teaching order). */
export function tenseOfForm(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, form: string): Tense | undefined {
  const f = normalize(form).toLocaleLowerCase(entry.language)
  if (!f) return undefined
  return tensesOf(entry).find((t) => [0, 1, 2, 3, 4, 5].some((p) => answersFor(entry, t, p).some((a) => normalize(a).toLocaleLowerCase(entry.language) === f)))
}

export interface TenseStat {
  tense: Tense
  correct: number
  wrong: number
}

/**
 * Right and wrong conjugation answers per tense, from the answer log (sessions and the drill):
 * where the learner's conjugation is weak, so the drill and the mistakes page can say so.
 */
export function tenseStats(
  events: readonly { entryId: string; exerciseType: string; expected?: string; correct: boolean }[],
  byId: ReadonlyMap<string, Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>>,
): TenseStat[] {
  const stats = new Map<Tense, TenseStat>()
  for (const e of events) {
    if (e.exerciseType !== 'conjugation' || !e.expected) continue
    const entry = byId.get(e.entryId)
    const tense = entry && tenseOfForm(entry, e.expected)
    if (!tense) continue
    const s = stats.get(tense) ?? { tense, correct: 0, wrong: 0 }
    if (e.correct) s.correct++
    else s.wrong++
    stats.set(tense, s)
  }
  return [...stats.values()]
}

export interface FormAnalysis {
  lemma: string
  tense: Tense
  persons: number[]
  /** A compound tense found around a word: the words it is made of ("ai mangé"). */
  phrase?: string
}

/** Reverse index (form → verb, tense, persons), built once per language when first needed. */
const REVERSE: { fr?: { size: number; map: Map<string, FormAnalysis[]> }; es?: { size: number; map: Map<string, FormAnalysis[]> } } = {}

function reverseIndex(language: 'fr' | 'es'): Map<string, FormAnalysis[]> {
  const cached = REVERSE[language]
  if (cached && cached.size === DATA[language].size) return cached.map
  const map = new Map<string, FormAnalysis[]>()
  for (const lemma of DATA[language].keys()) {
    const entry = { language, lemma, partOfSpeech: 'verb' as const }
    // Not the imperative: its forms are the present's (parle, habla), so a tapped word would read twice.
    for (const tense of (LAB_TENSES[language] as Tense[]).filter((t) => !isImperative(t))) {
      const forms = conjugateTense(entry, tense)
      if (!forms) continue
      forms.forEach((form, person) => {
        // Single words only: a tapped word is one token (compound tenses are two).
        if (form.includes(' ') || form === lemma) return
        const list = map.get(form) ?? []
        const same = list.find((a) => a.lemma === lemma && a.tense === tense)
        if (same) same.persons.push(person)
        else map.set(form, [...list, { lemma, tense, persons: [person] }])
      })
    }
  }
  REVERSE[language] = { size: DATA[language].size, map }
  return map
}

/**
 * What a conjugated word in a text is: "allions" → aller, imparfait, nous. Several answers when
 * the form is shared (parle: présent and subjonctif). Empty when the tables aren't loaded or the
 * word is no verb form.
 */
export function analyzeForm(language: 'fr' | 'es' | 'en', word: string): FormAnalysis[] {
  if (language === 'en' || !tensesLoaded(language)) return []
  return reverseIndex(language).get(normalize(word).toLocaleLowerCase(language)) ?? []
}

/** Auxiliary form (ai, había, hubiera…) → the compound tenses it opens, with the person it stands for. */
const AUX_FORMS: { fr?: Map<string, { kind: 'avoir' | 'etre'; tense: Tense; person: number }[]>; es?: Map<string, { tense: Tense; person: number }[]> } = {}

function auxForms(language: 'fr' | 'es') {
  const cached = AUX_FORMS[language]
  if (cached) return cached
  const map = new Map<string, { kind?: 'avoir' | 'etre'; tense: Tense; person: number }[]>()
  const add = (form: string, tense: Tense, person: number, kind?: 'avoir' | 'etre') => map.set(form, [...(map.get(form) ?? []), { kind, tense, person }])
  for (const [tense, when] of Object.entries(COMPOUND_AUX) as [Tense, NonNullable<(typeof COMPOUND_AUX)[Tense]>][]) {
    if (!(LAB_TENSES[language] as Tense[]).includes(tense)) continue
    if (language === 'fr') for (const kind of ['avoir', 'etre'] as const) AUX[kind][when].forEach((f, i) => add(f, tense, i, kind))
    else (tense === 'subjuntivo-pluscuamperfecto' ? AUX.hubiera : AUX.haber[when]).forEach((f, i) => add(f, tense, i))
  }
  AUX_FORMS[language] = map as never
  return map
}

/** Past participle (with the agreeing French forms: allée, allés) → its verb and whether it takes être. */
const PARTICIPLES: { fr?: { size: number; map: Map<string, { lemma: string; etre: boolean }[]> }; es?: { size: number; map: Map<string, { lemma: string; etre: boolean }[]> } } = {}

function participleIndex(language: 'fr' | 'es') {
  const cached = PARTICIPLES[language]
  if (cached && cached.size === DATA[language].size) return cached.map
  const map = new Map<string, { lemma: string; etre: boolean }[]>()
  const add = (form: string, lemma: string, etre: boolean) => {
    const key = normalize(form).toLocaleLowerCase(language)
    const list = map.get(key) ?? []
    if (!list.some((x) => x.lemma === lemma)) map.set(key, [...list, { lemma, etre }])
  }
  if (language === 'fr')
    for (const [lemma, row] of DATA.fr) {
      const [sg, pl] = typeof row.pp === 'string' ? [row.pp, `${row.pp}s`] : row.pp
      for (const f of [sg, pl, `${sg}e`, `${sg}es`]) add(f, lemma, row.aux === 'e')
    }
  else for (const [lemma, row] of DATA.es) add(row.pp, lemma, false)
  PARTICIPLES[language] = { size: DATA[language].size, map }
  return map
}

/**
 * A compound tense from two neighbouring words: "ai" + "mangé" → manger, passé composé. The
 * French auxiliary must fit the verb (est + allé, never est + mangé, which would be the passive),
 * unless the verb is reflexive (s'est lavé), which `reflexive` says. Empty when the tables aren't loaded or the pair is no compound tense.
 */
export function analyzeCompound(language: 'fr' | 'es' | 'en', aux: string, participle: string, reflexive = false): FormAnalysis[] {
  if (language === 'en' || !tensesLoaded(language)) return []
  const verbs = participleIndex(language).get(normalize(participle).toLocaleLowerCase(language))
  const opens = auxForms(language).get(normalize(aux).toLocaleLowerCase(language)) as { kind?: 'avoir' | 'etre'; tense: Tense; person: number }[] | undefined
  if (!verbs || !opens) return []
  const out: FormAnalysis[] = []
  for (const v of verbs)
    for (const o of opens) {
      // A reflexive verb ("il s'est lavé") takes être whatever its own auxiliary is.
      if (language === 'fr' && !(reflexive && o.kind === 'etre') && o.kind !== (v.etre ? 'etre' : 'avoir')) continue
      const same = out.find((a) => a.lemma === v.lemma && a.tense === o.tense)
      if (same) same.persons.push(o.person)
      else out.push({ lemma: v.lemma, tense: o.tense, persons: [o.person] })
    }
  return out
}

/** Imperative forms (parle, venez, ven, hablad) → their verb; built once per language, apart from the reverse index above. */
const IMPERATIVES: { fr?: { size: number; map: Map<string, FormAnalysis[]> }; es?: { size: number; map: Map<string, FormAnalysis[]> } } = {}

/** Which verbs' imperative this word is, if any. */
export function analyzeImperative(language: 'fr' | 'es', word: string): FormAnalysis[] {
  if (!tensesLoaded(language)) return []
  let cached = IMPERATIVES[language]
  if (!cached || cached.size !== DATA[language].size) {
    const map = new Map<string, FormAnalysis[]>()
    const tense: Tense = language === 'fr' ? 'imperatif' : 'imperativo'
    for (const lemma of DATA[language].keys()) {
      conjugateTense({ language, lemma, partOfSpeech: 'verb' }, tense)?.forEach((form, person) => {
        if (!form || form.includes(' ')) return
        const list = map.get(form) ?? []
        const same = list.find((a) => a.lemma === lemma)
        if (same) same.persons.push(person)
        else list.push({ lemma, tense, persons: [person] })
        map.set(form, list)
      })
    }
    cached = IMPERATIVES[language] = { size: DATA[language].size, map }
  }
  return cached.map.get(normalize(word).toLocaleLowerCase(language)) ?? []
}

/**
 * The imperative of a sentence, when it is one: it ends with "!" and starts with a verb's
 * imperative ("Viens ici !", "¡Hablad más alto!"). Its forms are the present's (parle, habla), so
 * this is the only place they are read as imperatives; "Il parle !" is not one.
 */
export function sentenceImperative(language: 'fr' | 'es', sentence: string): { form: string; analysis: FormAnalysis } | undefined {
  const text = sentence.trim()
  if (!/!\s*[»"”)]*$/.test(text)) return undefined
  const first = text.replace(/^[\s¡¿«"“(—–-]+/, '').match(/^[\p{L}'’]+/u)?.[0]
  if (!first) return undefined
  const form = first.toLocaleLowerCase(language)
  const [analysis] = analyzeImperative(language, form)
  return analysis && { form, analysis }
}

/** The verbs the tables hold (dictionary keys, without any reflexive pronoun), in the order they were built. */
export const tenseVerbs = (language: 'fr' | 'es'): string[] => [...DATA[language].keys()]

export interface VerbParts {
  infinitive: string
  /** Present participle in French (parlant), gerund in Spanish (hablando). */
  gerund?: string
  /** Past participle: parlé, hablado. */
  participle?: string
  /** Reflexive in the list ("se lever", "levantarse"). */
  reflexive: boolean
  /** Some present form breaks the regular pattern. */
  irregular: boolean
  /** The auxiliary of the compound tenses (French: être for movement verbs and the reflexive ones). */
  auxiliary?: 'avoir' | 'être'
}

/** Spanish gerunds that the preterite does not reveal. */
const ES_GERUND_FIXED: Record<string, string> = { ir: 'yendo', poder: 'pudiendo' }

function spanishGerund(key: string, pre: readonly string[]): string {
  const fixed = ES_GERUND_FIXED[key]
  if (fixed) return fixed
  if (key.endsWith('decir')) return `${key.slice(0, -5)}diciendo`
  if (key.endsWith('venir')) return `${key.slice(0, -5)}viniendo`
  if (key.endsWith('eír')) return `${key.slice(0, -3)}iendo`
  const stem = key.slice(0, -2)
  if (key.endsWith('ar')) return `${stem}ando`
  const third = pre[2] ?? ''
  // -ir verbs that change their stem show it in the preterite "él" form (pidió, durmió, sintió).
  if (key.endsWith('ir') && third.endsWith('ió') && third.slice(0, -2) !== stem) return `${third.slice(0, -2)}iendo`
  // riñó, bulló: the i is absorbed by ñ and ll.
  if (key.endsWith('ir') && /(ñó|lló)$/.test(third)) return `${third.slice(0, -1)}endo`
  if (/(ñ|ll)$/.test(stem)) return `${stem}endo`
  // A vowel before the ending: leyendo, cayendo, huyendo (but seguir: gu + iendo).
  if (/[aeiouáéíóú]$/.test(stem) && !/[gq]u$/.test(stem)) return `${stem}yendo`
  return `${stem}iendo`
}

/** The verb's non-finite forms, for the lab's header line. */
export function verbParts(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>): VerbParts | undefined {
  if (entry.language === 'en' || entry.partOfSpeech !== 'verb') return undefined
  const { key, reflexive } = keyOf(entry)
  const irregular = irregularForms(entry, entry.language === 'fr' ? 'present' : 'presente').some(Boolean)
  if (entry.language === 'fr') {
    const row = DATA.fr.get(key)
    if (!row) return undefined
    const nous = conjugate({ ...entry, lemma: key })?.forms[3]
    const fixed: Record<string, string> = { être: 'étant', avoir: 'ayant', savoir: 'sachant' }
    return {
      infinitive: key,
      gerund: fixed[key] ?? (nous?.endsWith('ons') ? `${nous.slice(0, -3)}ant` : undefined),
      participle: typeof row.pp === 'string' ? row.pp : row.pp[0],
      reflexive,
      irregular,
      auxiliary: reflexive || row.aux === 'e' ? 'être' : 'avoir',
    }
  }
  const row = DATA.es.get(key)
  if (!row) return undefined
  return { infinitive: key, gerund: spanishGerund(key, row.pre), participle: row.pp, reflexive, irregular }
}

export type { Person }
