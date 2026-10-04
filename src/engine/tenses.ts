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
export type Tense = FrTense | EsTense

/** In teaching order: the present, the past, the past background, the future, then the moods. */
export const TENSES: { fr: FrTense[]; es: EsTense[] } = {
  fr: ['present', 'passe-compose', 'imparfait', 'futur', 'conditionnel', 'subjonctif'],
  es: ['presente', 'preterito', 'perfecto', 'imperfecto', 'futuro', 'condicional', 'subjuntivo'],
}

export const isSubjunctive = (tense: Tense) => tense === 'subjonctif' || tense === 'subjuntivo'

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

interface FrRow { i: string | string[]; f: string | string[]; s?: string | string[]; pp: string | [string, string]; aux: 'a' | 'e' }
interface EsRow { pre: string[]; imp: string | string[]; fut: string | string[]; pp: string; sub?: string | string[] }
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
    const simple =
      tense === 'imparfait'
        ? expand(row.i, ENDINGS.frI)
        : tense === 'futur'
          ? expand(row.f, ENDINGS.frF)
          : tense === 'conditionnel'
            ? ENDINGS.frI.map((e) => expand(row.f, ENDINGS.frF)[0].slice(0, -2) + e)
            : tense === 'subjonctif' && row.s
              ? expand(row.s, ENDINGS.frS)
              : undefined
    if (simple) return reflexive ? simple.map((f, i) => frReflexive(i, f)) : simple
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
            : tense === 'condicional'
              ? ENDINGS.esImpErIr.map((e) => expand(row.fut, ENDINGS.esFut)[0].slice(0, -1) + e)
              : tense === 'subjuntivo' && row.sub
                ? expand(row.sub, key.endsWith('ar') ? ENDINGS.esSubAr : ENDINGS.esSubErIr)
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
  if (tense === 'present' || tense === 'presente') {
    // The regular pattern of the verb's class; a form off it (vais, tengo, pienso) is marked.
    const stem = key.slice(0, -2)
    const patterns =
      entry.language === 'fr'
        ? key.endsWith('er')
          ? [['e', 'es', 'e', 'ons', 'ez', 'ent']]
          : key.endsWith('ir')
            ? [['is', 'is', 'it', 'issons', 'issez', 'issent']]
            : key.endsWith('re')
              ? [['s', 's', '', 'ons', 'ez', 'ent']]
              : []
        : key.endsWith('ar')
          ? [['o', 'as', 'a', 'amos', 'áis', 'an']]
          : key.endsWith('er')
            ? [['o', 'es', 'e', 'emos', 'éis', 'en']]
            : [['o', 'es', 'e', 'imos', 'ís', 'en']]
    regular = patterns[0]?.map((e) => stem + e)
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
    else if (tense === 'perfecto') {
      const pp = `${stem}${ar ? 'ado' : 'ido'}`
      regular = bare.map((f) => (f.endsWith(` ${pp}`) ? f : ''))
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

/** "que je", "qu'il / qu'elle": the subjunctive is asked and shown after "que". */
const que = (language: 'fr' | 'es', s: string) => (language === 'fr' && /^[aeiouyéè]/i.test(s) ? `qu'${s}` : `que ${s}`)

/** The subject as a question or the table shows it: "nous", "que je", "qu'il / qu'elle". */
export function subjectLabel(language: 'fr' | 'es', tense: Tense, person: number): string {
  return PRONOUNS[language][person]
    .slice(0, 2)
    .map((p) => (isSubjunctive(tense) ? que(language, p) : p))
    .join(' / ')
}

/** A form with its subject, as a list shows it: "j'aime", "que nous parlions". */
export function withSubject(language: 'fr' | 'es', tense: Tense, person: number, form: string): string {
  const full = acceptedForms(language, person as Person, form)[1]
  return isSubjunctive(tense) ? que(language, full) : full
}

/** Accepted typed answers: the form alone or with a subject pronoun (and "que" for the subjunctive). */
export function answersFor(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, tense: Tense, person: number): string[] {
  if (entry.language === 'en') return []
  const lang = entry.language
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

export type { Person }
