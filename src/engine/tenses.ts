import { normalize } from './answerCheck'
import { conjugate, type Person } from './conjugation'
import type { VocabularyEntry } from './types'

/**
 * Past and future tenses for French and Spanish verbs, on top of the present (conjugation.ts).
 * Forms come from tables built by scripts/build-tenses.ts (src/data/tenses), each checked against
 * several sources; a verb missing from them simply has no past or future here. Compound tenses
 * (passé composé, pretérito perfecto) are put together from the auxiliary and the participle, so
 * reflexive verbs get être and their pronoun.
 */
export type FrTense = 'present' | 'passe-compose' | 'imparfait' | 'futur'
export type EsTense = 'presente' | 'preterito' | 'imperfecto' | 'perfecto' | 'futuro'
export type Tense = FrTense | EsTense

/** In teaching order: the present, then the past, the past background, then the future. */
export const TENSES: { fr: FrTense[]; es: EsTense[] } = {
  fr: ['present', 'passe-compose', 'imparfait', 'futur'],
  es: ['presente', 'preterito', 'perfecto', 'imperfecto', 'futuro'],
}

/** Endings for tenses stored as a stem (must match ENDINGS in scripts/build-tenses.ts). */
const ENDINGS = {
  frI: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  frF: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  esImpAr: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
  esImpErIr: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  esFut: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
  esPreAr: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
  esPreErIr: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
}

interface FrRow { i: string | string[]; f: string | string[]; pp: string | [string, string]; aux: 'a' | 'e' }
interface EsRow { pre: string[]; imp: string | string[]; fut: string | string[]; pp: string }
const DATA = { fr: new Map<string, FrRow>(), es: new Map<string, EsRow>() }

/** Loads a language's table (the JSON from src/data/tenses), done once in the background. */
export function addTenses(language: 'fr' | 'es', json: Record<string, unknown>) {
  const map = DATA[language] as Map<string, unknown>
  for (const [verb, row] of Object.entries(json)) map.set(verb, row)
}

export const tensesLoaded = (language: 'fr' | 'es') => DATA[language].size > 0

const expand = (v: string | string[], endings: string[]) => (typeof v === 'string' ? endings.map((e) => v + e) : [...v])

const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont']
const ETRE = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']
const HABER = ['he', 'has', 'ha', 'hemos', 'habéis', 'han']
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
  const { key, reflexive } = keyOf(entry)
  if (entry.language === 'fr') {
    const row = DATA.fr.get(key)
    if (!row) return undefined
    if (tense === 'imparfait' || tense === 'futur') {
      const forms = expand(tense === 'imparfait' ? row.i : row.f, tense === 'imparfait' ? ENDINGS.frI : ENDINGS.frF)
      return reflexive ? forms.map((f, i) => frReflexive(i, f)) : forms
    }
    if (tense === 'passe-compose') {
      const etre = reflexive || row.aux === 'e'
      const [sg, pl] = typeof row.pp === 'string' ? [row.pp, `${row.pp}s`] : row.pp
      return (etre ? ETRE : AVOIR).map((aux, i) => {
        // With être the participle agrees with the subject: plural for nous, vous, ils.
        const form = `${aux} ${etre && i >= 3 ? pl : sg}`
        return reflexive ? frReflexive(i, form) : form
      })
    }
    return undefined
  }
  const row = DATA.es.get(key)
  if (!row) return undefined
  const forms =
    tense === 'preterito'
      ? [...row.pre]
      : tense === 'imperfecto'
        ? expand(row.imp, key.endsWith('ar') ? ENDINGS.esImpAr : ENDINGS.esImpErIr)
        : tense === 'futuro'
          ? expand(row.fut, ENDINGS.esFut)
          : tense === 'perfecto'
            ? HABER.map((h) => `${h} ${row.pp}`)
            : undefined
  return forms && (reflexive ? forms.map((f, i) => `${REFL.es[i]} ${f}`) : forms)
}

/** Tenses the verb has, in teaching order. */
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
  const bare = forms.map((f) => f.replace(/^(me|te|se|nous|vous|nos|os) |^[mts]'/, ''))
  let regular: string[] | undefined
  if (entry.language === 'fr') {
    if (tense === 'imparfait') {
      const nous = conjugateTense(entry, 'present')?.[3].replace(/^nous /, '')
      if (nous?.endsWith('ons')) regular = ENDINGS.frI.map((e) => nous.slice(0, -3) + e)
    } else if (tense === 'futur') {
      const stem = key.endsWith('re') ? key.slice(0, -1) : key
      regular = ENDINGS.frF.map((e) => stem + e)
    } else if (tense === 'passe-compose') {
      const pp = key.endsWith('er') ? `${key.slice(0, -2)}é` : key.endsWith('ir') ? `${key.slice(0, -2)}i` : key.endsWith('re') ? `${key.slice(0, -2)}u` : ''
      regular = bare.map((f) => (pp && f.split(' ')[1]?.replace(/s$/, '') === pp ? f : ''))
    }
  } else {
    const stem = key.slice(0, -2)
    const ar = key.endsWith('ar')
    if (tense === 'preterito') regular = (ar ? ENDINGS.esPreAr : ENDINGS.esPreErIr).map((e) => stem + e)
    else if (tense === 'imperfecto') regular = (ar ? ENDINGS.esImpAr : ENDINGS.esImpErIr).map((e) => stem + e)
    else if (tense === 'futuro') regular = ENDINGS.esFut.map((e) => key + e)
    else if (tense === 'perfecto') {
      const pp = `${stem}${ar ? 'ado' : 'ido'}`
      regular = bare.map((f) => (f.endsWith(` ${pp}`) ? f : ''))
    }
  }
  return regular ? bare.map((f, i) => f !== regular![i]) : bare.map(() => false)
}

/**
 * Other accepted spellings: the 1990 French reform (cèderai beside céderai) and Spanish
 * monosyllables written without the accent since 2010 (rio, guio beside rió, guió).
 */
export function tenseVariants(language: 'fr' | 'es', form: string): string[] {
  if (language === 'fr') {
    const reform = form.replace(/é([^aeiouéèêy ]+)er(ai|as|a|ons|ez|ont)$/, 'è$1er$2')
    return reform !== form ? [reform] : []
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
  const out = new Set([form, ...tenseVariants(entry.language, form)])
  if (entry.language === 'fr' && tense === 'passe-compose') {
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

/** How many correct productions open each tense: the present first, the rest as the word settles. */
const UNLOCK: Record<Tense, number> = {
  present: 0,
  'passe-compose': 1,
  imparfait: 3,
  futur: 5,
  presente: 0,
  preterito: 1,
  perfecto: 2,
  imperfecto: 3,
  futuro: 5,
}

/**
 * Tenses a conjugation question may ask for, given how often the word has been produced:
 * one new tense at a time keeps the load low (Pienemann's processability: one step after the
 * other), and the present comes back between them. A verb without the present starts at its
 * first available tense.
 */
export function unlockedTenses(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, reps: number): Tense[] {
  const all = tensesOf(entry)
  const open = all.filter((t) => UNLOCK[t] <= reps)
  return open.length ? open : all.slice(0, 1)
}

/** Example sentences per verb and tense ("text with [form]\ttranslation"), see addTenseSentences. */
const SENTENCES = new Map<string, Record<string, string>>()

/** Loads src/data/tenses/es-sentences.json (built by scripts/build-tense-sentences.ts). */
export function addTenseSentences(json: Record<string, Record<string, string>>) {
  for (const [verb, row] of Object.entries(json)) SENTENCES.set(verb, row)
}

export interface TenseSentence {
  /** The sentence with the verb form replaced by "___". */
  text: string
  /** The form as it stands in the sentence. */
  form: string
  translation: string
}

/** A sentence using the verb in this tense, when one has been checked (Spanish for now). */
export function tenseSentence(entry: Pick<VocabularyEntry, 'language' | 'lemma'>, tense: Tense): TenseSentence | undefined {
  if (entry.language !== 'es') return undefined
  const raw = SENTENCES.get(normalize(entry.lemma).toLocaleLowerCase('es'))?.[tense]
  const m = raw?.match(/^(.*)\[([^\]]+)\](.*)\t(.*)$/)
  return m ? { text: `${m[1]}___${m[3]}`, form: m[2], translation: m[4] } : undefined
}

export type { Person }
