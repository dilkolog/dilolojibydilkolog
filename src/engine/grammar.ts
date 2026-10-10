import { normalize, stripDiacritics } from './answerCheck'
import { timeOf, type TargetLanguage } from './types'

/**
 * Grammar questions on the hard points of B1–C1: a gap to fill, a choice, or an error to find.
 * Each carries its rule in Turkish, shown after the answer. Questions come from `src/data/grammar`
 * (own, and later imported open-licence sets); how the learner does is kept per question.
 */
export type GrammarType = 'cloze' | 'choice' | 'error'
export type GrammarLevel = 'B1' | 'B2' | 'C1'

export interface GrammarExercise {
  id: string
  language: TargetLanguage
  level: GrammarLevel
  /** A key of TOPIC_NAME. */
  topic: string
  type: GrammarType
  /** The sentence; a cloze or choice marks its gap with "___", an error shows a sentence with one wrong word. */
  prompt: string
  /** The word(s) of the gap; for an error, the wrong word as it stands in the sentence (its first occurrence). */
  answer: string
  /** Other answers just as right. */
  alternatives?: string[]
  /** A choice's options (the answer among them). */
  options?: string[]
  /** An error's right word(s). */
  fix?: string
  /** What to think of, before answering ("faire → subjonctif présent"). */
  hint?: string
  /** The rule, in Turkish. */
  explanation: string
  /** Where it comes from (a licence line for imported sets). */
  source: string
}

export const TOPIC_NAME: Record<string, string> = {
  subjonctif: 'Subjonctif',
  participe_passe: 'Participe passé uyumu',
  pronoms_relatifs: 'Birleşik ilgi zamirleri',
  conditionnel_passe: 'Conditionnel passé ve şart',
  subjuntivo: 'Subjuntivo',
  ser_estar: 'Ser ve estar',
  por_para: 'Por ve para',
  se_pasivo: 'Se pasivo ve impersonal',
  condicionales: 'Şart cümleleri (si)',
  perifrasis: 'Perífrasis verbales',
  inversion: 'Devrik yapı (inversion)',
  cleft: 'Vurgulu cümle (cleft)',
  mixed_conditionals: 'Karma şart cümleleri',
  subjunctive: 'Subjunctive',
  participle_clauses: 'Participle clauses',
  gerund_infinitive: 'Gerund ve infinitive',
}

export const topicName = (topic: string) => TOPIC_NAME[topic] ?? topic

export type GrammarVerdict = 'correct' | 'near' | 'wrong'

/** A typed answer without the sentence's quote marks, final dot and stray spaces. */
const clean = (s: string) => normalize(s.replace(/[’‘]/g, "'").replace(/[.!?]+$/g, ''))

/**
 * Whether the answer is right. A gap or an error: the word(s) exactly (case and spacing aside);
 * the same with other accents is "near" (right word, careless accent: counts, but is said).
 */
export function checkGrammar(ex: GrammarExercise, given: string): GrammarVerdict {
  const g = clean(given)
  if (!g) return 'wrong'
  const accepted = [ex.answer, ...(ex.alternatives ?? [])].map(clean)
  if (accepted.includes(g)) return 'correct'
  const bare = stripDiacritics(g)
  return accepted.some((a) => stripDiacritics(a) === bare) ? 'near' : 'wrong'
}

/** The prompt with its gap filled by `word` (the verb in brackets after the gap goes), for showing the whole sentence after the answer. */
export const filled = (ex: GrammarExercise, word: string) => (ex.type === 'error' ? ex.prompt : ex.prompt.replace(/___(\s*\([^)]*\))?/, () => word))

/** A sentence cut into words (tappable) and what lies between them; the wrong word of an error is the first that reads like its answer. */
export function sentenceTokens(ex: GrammarExercise): { text: string; word: boolean; wrong: boolean }[] {
  const parts = ex.prompt.match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu) ?? []
  let found = false
  return parts.map((text) => {
    const word = /^[\p{L}\p{M}]/u.test(text)
    const wrong = word && !found && ex.type === 'error' && clean(text) === clean(ex.answer)
    if (wrong) found = true
    return { text, word, wrong }
  })
}

/** What the learner has done with each question. */
export interface GrammarRecord {
  ok: number
  wrong: number
  /** Last tried (ISO). */
  last: string
}
export type GrammarLog = Record<string, GrammarRecord>

export function recordGrammar(log: GrammarLog, id: string, correct: boolean, now: Date): GrammarLog {
  const had = log[id]
  return { ...log, [id]: { ok: (had?.ok ?? 0) + (correct ? 1 : 0), wrong: (had?.wrong ?? 0) + (correct ? 0 : 1), last: now.toISOString() } }
}

/** Two devices' logs together: per question, the larger counts and the later try. */
export function mergeGrammarLogs(a: GrammarLog = {}, b: GrammarLog = {}): GrammarLog {
  const out: GrammarLog = { ...a }
  for (const [id, r] of Object.entries(b)) {
    const had = out[id]
    out[id] = had ? { ok: Math.max(had.ok, r.ok), wrong: Math.max(had.wrong, r.wrong), last: timeOf(r.last) > timeOf(had.last) ? r.last : had.last } : r
  }
  return out
}

export interface TopicStat {
  topic: string
  answered: number
  /** Share right, 0–1. */
  accuracy: number
}

/** Per topic of the given exercises: how much was answered and how well, weakest first (untouched topics last). */
export function topicStats(log: GrammarLog, exercises: readonly GrammarExercise[]): TopicStat[] {
  const by = new Map<string, { ok: number; wrong: number }>()
  for (const ex of exercises) {
    const t = by.get(ex.topic) ?? { ok: 0, wrong: 0 }
    const r = log[ex.id]
    by.set(ex.topic, { ok: t.ok + (r?.ok ?? 0), wrong: t.wrong + (r?.wrong ?? 0) })
  }
  return [...by.entries()]
    .map(([topic, t]) => ({ topic, answered: t.ok + t.wrong, accuracy: t.ok + t.wrong ? t.ok / (t.ok + t.wrong) : 1 }))
    .sort((a, b) => Number(a.answered === 0) - Number(b.answered === 0) || a.accuracy - b.accuracy || b.answered - a.answered)
}

/** Questions in one round. */
export const GRAMMAR_ROUND = 8

/**
 * A round of questions: the ones never tried and the ones more often wrong than right come first,
 * then the rest, the longest untried first; no question twice. A topic can be asked for.
 */
export function pickGrammarRound(
  exercises: readonly GrammarExercise[],
  log: GrammarLog,
  rng: () => number,
  { topic, size = GRAMMAR_ROUND }: { topic?: string; size?: number } = {},
): GrammarExercise[] {
  const pool = exercises.filter((e) => !topic || e.topic === topic)
  const weight = (e: GrammarExercise) => {
    const r = log[e.id]
    if (!r) return 3
    if (r.wrong > r.ok) return 4
    return 1 / (1 + r.ok - r.wrong)
  }
  const chosen: GrammarExercise[] = []
  const left = [...pool]
  while (chosen.length < size && left.length) {
    const total = left.reduce((n, e) => n + weight(e), 0)
    let at = rng() * total
    let i = 0
    while (i < left.length - 1 && (at -= weight(left[i])) > 0) i++
    chosen.push(left.splice(i, 1)[0])
  }
  return chosen
}
