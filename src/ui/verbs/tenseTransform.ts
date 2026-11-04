import { createRng, shuffle } from '../../engine/rng'
import { conjugateTense, labTensesOf, tenseSentence, type Tense } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/**
 * Change the tense: a real sentence with its verb in one tense, the same verb to be written in
 * another, the person kept. The step after filling a gap: the learner has to know both tables and
 * which form of one matches which of the other. Pairs are the moves that make sense (present to
 * past or future and back, the two pasts into each other), and a sentence whose time words tie it
 * to another time (ayer, demain) is not used for a move that would contradict them.
 */
export interface Transform {
  verb: string
  from: Tense
  to: Tense
  /** The sentence with "___" where the verb was. */
  text: string
  /** The form as it stands in the sentence. */
  form: string
  translation?: string
  /** The persons the form can be (je / tu parlais): any of their forms in `to` is right. */
  persons: number[]
}

export const TRANSFORM_PAIRS: Record<LabLanguage, [Tense, Tense][]> = {
  es: [
    ['presente', 'preterito'],
    ['presente', 'imperfecto'],
    ['presente', 'futuro'],
    ['presente', 'perfecto'],
    ['preterito', 'presente'],
    ['preterito', 'perfecto'],
    ['preterito', 'imperfecto'],
    ['imperfecto', 'presente'],
    ['imperfecto', 'preterito'],
    ['perfecto', 'presente'],
    ['perfecto', 'preterito'],
    ['futuro', 'presente'],
  ],
  // French sentences are never kept in the present (see tenses.test.ts): it is only a target.
  fr: [
    ['passe-compose', 'present'],
    ['passe-compose', 'imparfait'],
    ['passe-compose', 'futur'],
    ['passe-compose', 'plus-que-parfait'],
    ['imparfait', 'present'],
    ['imparfait', 'passe-compose'],
    ['futur', 'present'],
    ['futur', 'passe-compose'],
  ],
}

type Frame = 'past' | 'present' | 'future'

const FRAME: Partial<Record<Tense, Frame>> = {
  presente: 'present',
  perfecto: 'present',
  preterito: 'past',
  imperfecto: 'past',
  futuro: 'future',
  present: 'present',
  'passe-compose': 'past',
  imparfait: 'past',
  'plus-que-parfait': 'past',
  futur: 'future',
}

/** Time words that tie a sentence to one time. Morning (la mañana) is not tomorrow (mañana). */
const MARKERS: Record<LabLanguage, Record<Frame, RegExp>> = {
  es: {
    past: /\b(ayer|anoche|anteayer|pasad[oa]s?|hace (un|una|dos|tres|unos|unas|mucho|poco|años|días|meses|tiempo)|cuando (era|éramos|tenía|vivía)|de (niñ[oa]|pequeñ[oa]|joven)|aquel(la)?|en aquel|entonces|antes)\b/i,
    present: /\b(hoy|ahora|actualmente|esta semana|este (año|mes)|en este momento)\b/i,
    future: /(^|[^a-záéíóúñ])(?<!(la|esta|cada|una|por la|de la) )mañana\b|\b(próxim[oa]s?|dentro de|que viene|pronto|para entonces|el lunes que)\b/i,
  },
  fr: {
    past: /\b(hier|avant-hier|derni(er|ère)s?|il y a|quand j'étais|quand j’étais|autrefois|jadis|ce jour-là|à l'époque|à l’époque|la veille|autrefois)\b/i,
    present: /\b(aujourd'hui|aujourd’hui|maintenant|en ce moment|actuellement)\b/i,
    future: /\b(demain|prochain(e|s)?|bientôt|à l'avenir|à l’avenir|plus tard|dans (deux|trois|quatre|cinq|dix|quelques|\d+) )/i,
  },
}

/** Whether the sentence's time words allow the move into `to`. */
export function fitsTime(language: LabLanguage, sentence: string, to: Tense): boolean {
  const target = FRAME[to]
  if (!target) return false
  // The present also tells a planned future (Demain, je pars; Mañana voy): future words allow it.
  const allowed = (frame: Frame) => frame === target || (target === 'present' && frame === 'future' && to !== 'perfecto')
  return (Object.keys(MARKERS[language]) as Frame[]).every((frame) => allowed(frame) || !MARKERS[language][frame].test(sentence))
}

const clean = (s: string) => s.toLocaleLowerCase().replace(/[’']/g, "'").trim()

/** The persons whose form in `tense` is the one in the sentence (several when they look alike). */
export function personsOfForm(language: LabLanguage, verb: string, tense: Tense, form: string): number[] {
  const forms = conjugateTense(verbEntry(language, verb), tense)
  if (!forms) return []
  const want = clean(form)
  return forms.flatMap((f, i) => (clean(f) === want ? [i] : []))
}

const FR_SUBJECT: [RegExp, number][] = [
  [/(^|[\s,;:«"])(je|j['’])/i, 0],
  [/(^|[\s,;:«"])tu\s/i, 1],
  [/(^|[\s,;:«"])(il|elle|on)\s/i, 2],
  [/(^|[\s,;:«"])nous\s/i, 3],
  [/(^|[\s,;:«"])vous\s/i, 4],
  [/(^|[\s,;:«"])(ils|elles)\s/i, 5],
]

/**
 * When a form fits several persons (je / tu parlais), the subject pronoun just before it in the
 * sentence settles which: the last one in the clause before the verb wins.
 */
export function narrowBySubject(language: LabLanguage, text: string, persons: number[]): number[] {
  if (language !== 'fr' || persons.length < 2) return persons
  const before = text.split('___')[0].split(/[,;:.!?]/).pop() ?? ''
  let best = -1
  let person: number | undefined
  for (const [re, p] of FR_SUBJECT) {
    const all = [...before.matchAll(new RegExp(re.source, 'gi'))]
    const at = all.length ? (all[all.length - 1].index ?? -1) : -1
    if (at > best) {
      best = at
      person = p
    }
  }
  return person !== undefined && persons.includes(person) ? [person] : persons
}

/** One question for the verb in a move, or undefined when it has no fitting sentence. */
export function transformFor(language: LabLanguage, verb: string, from: Tense, to: Tense): Transform | undefined {
  const entry = verbEntry(language, verb)
  if (!labTensesOf(entry).includes(to)) return undefined
  const s = tenseSentence(entry, from)
  if (!s || !fitsTime(language, s.text, to)) return undefined
  const persons = narrowBySubject(language, s.text, personsOfForm(language, verb, from, s.form))
  const target = conjugateTense(entry, to)
  if (!persons.length || !target) return undefined
  // The move changes nothing (a form shared by both tenses) is no question.
  if (persons.some((p) => clean(target[p]) === clean(s.form))) return undefined
  return { verb, from, to, text: s.text, form: s.form, translation: s.translation, persons }
}

export const TRANSFORM_ROUND = 8

/** A round: the chosen verb first when it has a question, then other verbs, each once, the moves mixed. */
export function transformRound(language: LabLanguage, verbs: readonly string[], seed: number, size = TRANSFORM_ROUND): Transform[] {
  const rng = createRng(seed)
  const out: Transform[] = []
  const [first, ...rest] = verbs
  for (const verb of [first, ...shuffle(rest.slice(0, 200), rng)]) {
    if (!verb) continue
    for (const [from, to] of shuffle(TRANSFORM_PAIRS[language], rng)) {
      const q = transformFor(language, verb, from, to)
      if (q) {
        out.push(q)
        break
      }
    }
    if (out.length >= size) break
  }
  return out
}
