import type { ContextSource } from './contextReview'
import { cleanToken, splitSentences, STOP, WORD_SOURCE } from './extract'
import { shuffle, type Rng } from './rng'
import type { TargetLanguage } from './types'

/**
 * The speed ladder: the same sentence heard three times, a little slower, as it is, a little faster, and each time a
 * question about what was heard (which of four words was in it). Where the answers start to fail is the speed the ear
 * can follow today; the next ladder is for climbing it. Sentences are the ones the learner has met (see contextReview.ts),
 * read aloud by the device's voice, so the recording is always the same one, only its speed changes.
 */

/** The three steps, as multiples of the voice's usual speed. */
export const LADDER_RATES = [0.75, 1, 1.25] as const
export type LadderRate = (typeof LADDER_RATES)[number]
/** Sentences in one ladder (each is heard at every step: 12 questions in all). */
export const LADDER_SENTENCES = 4

/** A sentence this long (in words) is short enough to keep in mind and long enough to hold three questions. */
const MIN_WORDS = 6
const MAX_WORDS = 16
/** A word worth asking about: this many letters, and not a function word. */
const MIN_LETTERS = 5

export interface LadderStep {
  rate: LadderRate
  /** The word that was in the sentence. */
  target: string
  /** Four words in a fixed order: the target and three that were not in the sentence. */
  options: string[]
}

export interface LadderItem {
  text: string
  translation?: string
  from: string
  steps: LadderStep[]
}

const WORD = new RegExp(WORD_SOURCE, 'gu')

/** The words of a sentence worth asking about, each once, in lower case. */
export function askable(text: string, language: TargetLanguage): string[] {
  const seen = new Set<string>()
  for (const m of text.matchAll(WORD)) {
    const w = cleanToken(m[0], language).toLocaleLowerCase(language)
    if (w.length >= MIN_LETTERS && !STOP[language].has(w) && !/\d/.test(w)) seen.add(w)
  }
  return [...seen]
}

const wordCount = (text: string) => [...text.matchAll(WORD)].length

/** Every sentence of the sources that can carry a ladder: of the right length, with at least three words to ask about. */
function candidates(sources: readonly ContextSource[], language: TargetLanguage) {
  const seen = new Set<string>()
  const out: { text: string; translation?: string; from: string; words: string[] }[] = []
  for (const src of sources) {
    // A source with its own translation is one sentence; a text is cut into its sentences.
    const parts = src.translation ? [src.text.trim()] : splitSentences(src.text)
    for (const text of parts) {
      const n = wordCount(text)
      if (n < MIN_WORDS || n > MAX_WORDS || seen.has(text)) continue
      const words = askable(text, language)
      if (words.length < LADDER_RATES.length) continue
      seen.add(text)
      out.push({ text, translation: src.translation, from: src.from, words })
    }
  }
  return out
}

/** Whether there are enough sentences to make a ladder from. */
export const canClimb = (sources: readonly ContextSource[], language: TargetLanguage) => candidates(sources, language).length >= LADDER_SENTENCES

/**
 * A ladder: `LADDER_SENTENCES` sentences, each with a step per speed. Every step asks about a different word of the
 * sentence, with three wrong ones taken from the other sentences (of about the same length, so length gives nothing away).
 */
export function ladder(sources: readonly ContextSource[], language: TargetLanguage, rng: Rng): LadderItem[] {
  const all = candidates(sources, language)
  const chosen = shuffle(all, rng).slice(0, LADDER_SENTENCES)
  const pool = [...new Set(all.flatMap((c) => c.words))]
  return chosen.map((c) => {
    const targets = shuffle(c.words, rng).slice(0, LADDER_RATES.length)
    const inSentence = new Set(c.words)
    const steps = LADDER_RATES.map((rate, i): LadderStep => {
      const target = targets[i]
      const others = pool.filter((w) => !inSentence.has(w))
      // Closest in length first, so the odd one out is not the longest or the shortest.
      const near = shuffle(others, rng).sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length)).slice(0, 3)
      return { rate, target, options: shuffle([target, ...near], rng) }
    })
    return { text: c.text, translation: c.translation, from: c.from, steps }
  })
}

export interface LadderAnswer {
  rate: LadderRate
  ok: boolean
}

export interface RateScore {
  rate: LadderRate
  n: number
  right: number
}

/** Right answers by speed (all three always listed, in order). */
export function scoreByRate(answers: readonly LadderAnswer[]): RateScore[] {
  return LADDER_RATES.map((rate) => {
    const mine = answers.filter((a) => a.rate === rate)
    return { rate, n: mine.length, right: mine.filter((a) => a.ok).length }
  })
}

/** The fastest step the ear held (at least 3 in 4 right), if any: today's comfortable speed. */
export function comfortable(scores: readonly RateScore[]): LadderRate | null {
  let best: LadderRate | null = null
  for (const s of scores) if (s.n > 0 && s.right / s.n >= 0.75) best = s.rate
  return best
}

/** A line on what the three steps say. */
export function advice(scores: readonly RateScore[]): string {
  const held = comfortable(scores)
  const pct = (s: RateScore) => (s.n ? s.right / s.n : 0)
  const [slow, normal, fast] = scores
  if (!scores.some((s) => s.n > 0)) return ''
  if (held === 1.25) return 'Hızlı konuşmayı da yakaladın: kulağın bu cümleleri 1,25× hızda bile izliyor. Bir sonraki turda daha uzun cümleler dene.'
  if (held === 1) return 'Normal hızda rahatsın; hızlıda düşüyorsun. Biraz daha dinleme çalışması (Okuma → sesli metinler) 1,25×’i yakalamana yardım eder.'
  if (held === 0.75) return 'Yavaşta tamam, normal hızda zorlanıyorsun. Aynı cümleleri önce yavaş, sonra normal hızda tekrar dinlemek işe yarar.'
  if (pct(slow) < 0.5 && pct(normal) < 0.5 && pct(fast) < 0.5) return 'Yavaşta bile kaçırdın: kelimeler bu cümlelerde sana yeni olabilir. Önce cümleleri Okuma’da oku, sonra dinle.'
  return 'Sonuçlar karışık: cümleler arasındaki fark büyük olabilir. Bir tur daha dene.'
}

/** One finished ladder, as kept on the device to show progress. */
export interface LadderRun {
  at: string
  /** Right answers out of asked, per speed, in the order of LADDER_RATES. */
  right: number[]
  asked: number[]
}

/** The last runs, newest last, at most this many. */
export const KEEP_RUNS = 12

export function addRun(runs: readonly LadderRun[], scores: readonly RateScore[], now: Date): LadderRun[] {
  const run: LadderRun = { at: now.toISOString(), right: scores.map((s) => s.right), asked: scores.map((s) => s.n) }
  return [...runs, run].slice(-KEEP_RUNS)
}

/** Only runs of the right shape survive (a hand-edited or damaged value). */
export function cleanRuns(raw: unknown): LadderRun[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((r): LadderRun[] => {
    const v = r as Partial<LadderRun> | null
    const ok = (a: unknown): a is number[] => Array.isArray(a) && a.length === LADDER_RATES.length && a.every((n) => Number.isInteger(n) && n >= 0 && n <= 50)
    return v && typeof v.at === 'string' && ok(v.right) && ok(v.asked) ? [{ at: v.at, right: v.right, asked: v.asked }] : []
  })
}

/** How the last run compares with the one before, per speed, in points of accuracy (null where either did not ask). */
export function change(runs: readonly LadderRun[]): (number | null)[] | null {
  if (runs.length < 2) return null
  const [before, last] = runs.slice(-2)
  return LADDER_RATES.map((_, i) => (before.asked[i] && last.asked[i] ? Math.round((last.right[i] / last.asked[i] - before.right[i] / before.asked[i]) * 100) : null))
}
