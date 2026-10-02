import { State } from 'ts-fsrs'
import { cleanToken, splitSentences, stem, STOP } from './extract'
import type { ReviewEvent, TargetLanguage, UserWordState, VocabularyEntry } from './types'

/**
 * Reading mode. Comfortable reading needs about 98% of the running words to be known, and
 * learning new words from context works best around 95% (Hu & Nation 2000; Schmitt et al. 2011).
 * Below that, a text is mostly decoding. The coverage meter tells which zone a text is in.
 *
 * "Known" can't come from the word list alone: an advanced learner knows far more words than
 * they study. So, as in extensive-reading tools, every word the reader doesn't mark while
 * reading a text joins a known-word set when they finish it.
 */

export type ReadStatus = 'known' | 'learning' | 'new' | 'unseen' | 'name'

export interface ReadToken {
  /** Text exactly as written (a word or the punctuation/space between words). */
  text: string
  /** Lookup key (a stem) for words; absent for separators. */
  key?: string
  status?: ReadStatus
  entryId?: string
}

export interface ReadSentence {
  text: string
  tokens: ReadToken[]
}

export interface ReadingAnalysis {
  paragraphs: ReadSentence[][]
  counts: Record<ReadStatus, number>
  /** Running words that count (names excluded). */
  total: number
  /** Share of running words known. */
  coverage: number
  /** Share known or already in the word list. */
  coverageWithList: number
  /** Sentences with exactly one unknown word: the ideal place to meet it (i+1). */
  iPlusOne: { sentence: string; word: string; key: string }[]
}

const WORD = /([\p{L}][\p{L}'’-]*)/u

export function readingKey(word: string, language: TargetLanguage): string {
  return stem(cleanToken(word, language).toLocaleLowerCase(language), language)
}

export function analyzeText(
  text: string,
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  known: ReadonlySet<string>,
): ReadingAnalysis {
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const byKey = new Map<string, VocabularyEntry>()
  for (const e of vocabulary) {
    if (e.language !== language) continue
    for (const w of [e.lemma, ...(e.alternativeForms ?? [])]) if (!w.includes(' ')) byKey.set(readingKey(w, language), e)
  }

  // A capitalised word never seen in lowercase anywhere in the text is taken as a name.
  const lowerSeen = new Set<string>()
  for (const m of text.matchAll(new RegExp(WORD, 'gu'))) if (!/^\p{Lu}/u.test(cleanToken(m[0], language))) lowerSeen.add(readingKey(m[0], language))

  const counts: Record<ReadStatus, number> = { known: 0, learning: 0, new: 0, unseen: 0, name: 0 }
  const iPlusOne: ReadingAnalysis['iPlusOne'] = []
  const paragraphs = text
    .replace(/\r/g, '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      splitSentences(p).map((sentence) => {
        const parts = sentence.split(WORD)
        let wordIndex = 0
        const tokens: ReadToken[] = parts
          .filter((t) => t !== '')
          .map((t) => {
            if (!WORD.test(t) || !/^\p{L}/u.test(t)) return { text: t }
            const clean = cleanToken(t, language)
            const lower = clean.toLocaleLowerCase(language)
            const key = readingKey(t, language)
            const first = wordIndex++ === 0
            const entry = byKey.get(key)
            let status: ReadStatus
            let entryId: string | undefined
            if (entry) {
              entryId = entry.id
              const st = stateById.get(entry.id)
              status = st?.skills.recognition?.state === State.Review ? 'known' : st ? 'learning' : 'new'
            } else if (STOP[language].has(lower) || known.has(key) || lower.length < 2) status = 'known'
            else if (/^\p{Lu}/u.test(clean) && !first && !lowerSeen.has(key)) status = 'name'
            else status = 'unseen'
            counts[status]++
            return { text: t, key, status, entryId }
          })
        const words = tokens.filter((t) => t.key)
        const open = words.filter((t) => t.status !== 'known' && t.status !== 'name')
        if (words.length >= 5 && words.length <= 25 && open.length === 1 && open[0].status === 'unseen') {
          iPlusOne.push({ sentence, word: cleanToken(open[0].text, language), key: open[0].key! })
        }
        return { text: sentence, tokens }
      }),
    )

  const total = counts.known + counts.learning + counts.new + counts.unseen
  return {
    paragraphs,
    counts,
    total,
    coverage: total ? counts.known / total : 0,
    coverageWithList: total ? (counts.known + counts.learning + counts.new) / total : 0,
    iPlusOne: iPlusOne.filter((x, i, all) => all.findIndex((y) => y.key === x.key) === i),
  }
}

/** Exercises that show the word inside a sentence. */
const CONTEXT_EXERCISES = new Set(['mc_context', 'discriminate', 'cloze_typed', 'dictation'])
/** Meetings in context needed before a word is usually known well (Webb 2007; Uchihara et al. 2019). */
export const ENCOUNTER_TARGET = 10

/** Times a word has been met inside a sentence: context exercises plus reading. */
export function contextEncounters(events: readonly Pick<ReviewEvent, 'exerciseType'>[], fromReading = 0): number {
  return events.filter((e) => CONTEXT_EXERCISES.has(e.exerciseType)).length + fromReading
}

export type CoverageZone = 'easy' | 'ideal' | 'hard' | 'too_hard'

export function coverageZone(coverage: number): CoverageZone {
  if (coverage >= 0.98) return 'easy'
  if (coverage >= 0.95) return 'ideal'
  if (coverage >= 0.9) return 'hard'
  return 'too_hard'
}

/**
 * Finishing a text: unmarked unseen words become known, and every list word met in it counts
 * as an encounter (8–12 meetings in context are needed to really know a word; Webb 2007).
 * `skipped` = keys the reader chose to leave open (e.g. added to the list meanwhile).
 */
export function finishReading(a: ReadingAnalysis, skipped: ReadonlySet<string> = new Set()): { knownKeys: string[]; encounters: Record<string, number> } {
  const knownKeys = new Set<string>()
  const encounters: Record<string, number> = {}
  for (const p of a.paragraphs)
    for (const s of p)
      for (const t of s.tokens) {
        if (t.status === 'unseen' && t.key && !skipped.has(t.key)) knownKeys.add(t.key)
        if (t.entryId) encounters[t.entryId] = (encounters[t.entryId] ?? 0) + 1
      }
  return { knownKeys: [...knownKeys], encounters }
}

export interface MissingWord {
  word: string
  /** Frequency rank of the word's most frequent form. */
  rank: number
  key: string
}

/**
 * Frequent words the learner has neither in the list nor among known words: gaps that pay off
 * most (Nation 2006). Forms sharing a stem appear once, under their most frequent form.
 * `list` is the frequency list, most frequent first.
 */
export function missingFrequent(
  list: readonly string[],
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  known: ReadonlySet<string>,
  maxRank = 3000,
): MissingWord[] {
  const have = new Set<string>()
  for (const e of vocabulary) {
    if (e.language !== language) continue
    for (const w of [e.lemma, ...(e.alternativeForms ?? [])]) if (!w.includes(' ')) have.add(readingKey(w, language))
  }
  const seen = new Set<string>()
  const out: MissingWord[] = []
  list.slice(0, maxRank).forEach((word, i) => {
    if (word.length < 3 || !/^[\p{Ll}'’-]+$/u.test(word) || STOP[language].has(word)) return
    const key = readingKey(word, language)
    if (seen.has(key)) return
    seen.add(key)
    if (!known.has(key) && !have.has(key)) out.push({ word, rank: i + 1, key })
  })
  return out
}
