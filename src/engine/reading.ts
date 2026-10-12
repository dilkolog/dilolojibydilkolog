import { State } from 'ts-fsrs'
import { cleanToken, splitSentences, stem, STOP, WORD_SOURCE } from './extract'
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
  /** Different words of the text that are neither known nor in the word list: what reading it would bring new. */
  unknownWords: number
  /** Sentences with exactly one unknown word: the ideal place to meet it (i+1). */
  iPlusOne: { sentence: string; word: string; key: string }[]
}

const WORD = new RegExp(`(${WORD_SOURCE})`, 'u')

export function readingKey(word: string, language: TargetLanguage): string {
  return stem(cleanToken(word, language).toLocaleLowerCase(language), language)
}

export function analyzeText(
  text: string,
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  known: ReadonlySet<string>,
  /** Words the reader chose to ignore: counted like names, outside the coverage. */
  ignored: ReadonlySet<string> = new Set(),
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
            } else if (ignored.has(key)) status = 'name'
            else if (STOP[language].has(lower) || known.has(key) || lower.length < 2) status = 'known'
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
  const unseenKeys = new Set<string>()
  for (const para of paragraphs) for (const sent of para) for (const t of sent.tokens) if (t.status === 'unseen' && t.key) unseenKeys.add(t.key)
  return {
    paragraphs,
    unknownWords: unseenKeys.size,
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

const ZONE_LABEL = { easy: 'rahat', ideal: 'öğrenmeye ideal', hard: 'zorlayıcı', too_hard: 'çok zor' } as const

export type CoverageZone = 'easy' | 'ideal' | 'hard' | 'too_hard'

/** The line a text carries in a picker: "%92 biliyorsun (rahat) · 14 yeni kelime". Empty for a text without words. */
export function coverageLine(a: Pick<ReadingAnalysis, 'coverage' | 'unknownWords'> & { total?: number }): string {
  if (a.total === 0) return ''
  // The zone is the one of the figure shown: 97.96% reads %98 and is "rahat", not "öğrenmeye ideal".
  const pct = Math.round(a.coverage * 1000) / 10
  const zone = ZONE_LABEL[coverageZone(pct / 100)]
  // Words that are on the list but not yet known still count against the share: say so instead of "no new words".
  const news = a.unknownWords > 0 ? `${a.unknownWords} yeni kelime` : a.coverage < 1 ? 'kalanlar listende' : 'yeni kelime yok'
  return `%${pct.toLocaleString('tr-TR')} biliyorsun (${zone}) · ${news}`
}

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

export interface KeyWord {
  key: string
  /** As written in the text, lower case. */
  word: string
  count: number
  sentence: string
}

/**
 * The unknown words worth learning before reading (pre-teaching): those the text repeats most,
 * then the most frequent in the language (`rank`: lower = more common), so a few words unlock
 * the most of the text.
 */
export function keyUnknownWords(a: ReadingAnalysis, language: TargetLanguage, rank: (word: string) => number, max = 10): KeyWord[] {
  const found = new Map<string, KeyWord>()
  for (const p of a.paragraphs) for (const s of p) for (const t of s.tokens) {
    if (t.status !== 'unseen' || !t.key) continue
    const k = found.get(t.key)
    if (k) k.count++
    else found.set(t.key, { key: t.key, word: cleanToken(t.text, language).toLocaleLowerCase(language), count: 1, sentence: s.text })
  }
  return [...found.values()].sort((x, y) => y.count - x.count || rank(x.word) - rank(y.word)).slice(0, max)
}

export interface BandCoverage {
  /** The band: the language's `max` most frequent words. */
  max: number
  /** Distinct words (by stem) in the band. */
  total: number
  known: number
  learning: number
}

export const COVERAGE_BANDS = [1000, 2000, 5000, 10_000, 20_000]

/**
 * How much of the language's most frequent words the learner knows, band by band (Nation 2006:
 * the first few thousand word families carry most of any text). Known = function words, words
 * marked known while reading, and list words that graduated; learning = the rest of the list.
 */
export function frequencyCoverage(
  list: readonly string[],
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  known: ReadonlySet<string>,
  bands: readonly number[] = COVERAGE_BANDS,
): BandCoverage[] {
  const graduated = new Set(states.filter((s) => s.skills.recognition?.state === State.Review).map((s) => s.entryId))
  const inList = new Map<string, boolean>()
  for (const e of vocabulary) {
    if (e.language !== language) continue
    for (const w of [e.lemma, ...(e.alternativeForms ?? [])]) if (!w.includes(' ')) inList.set(readingKey(w, language), inList.get(readingKey(w, language)) || graduated.has(e.id))
  }
  const out: BandCoverage[] = bands.map((max) => ({ max, total: 0, known: 0, learning: 0 }))
  const seen = new Set<string>()
  list.slice(0, Math.max(...bands)).forEach((word, i) => {
    if (word.length < 2 || !/^[\p{Ll}'’-]+$/u.test(word)) return
    const key = readingKey(word, language)
    if (seen.has(key)) return
    seen.add(key)
    const status = STOP[language].has(word) || known.has(key) || inList.get(key) === true ? 'known' : inList.has(key) ? 'learning' : 'unknown'
    for (const band of out) {
      if (i >= band.max) continue
      band.total++
      if (status === 'known') band.known++
      else if (status === 'learning') band.learning++
    }
  })
  return out
}

/** The content words (stems) a text is most about: frequent in it, not function words. */
export function topicKeys(text: string, language: TargetLanguage, max = 30): string[] {
  const counts = new Map<string, number>()
  for (const m of text.matchAll(new RegExp(WORD, 'gu'))) {
    const w = cleanToken(m[0], language).toLocaleLowerCase(language)
    if (w.length < 4 || STOP[language].has(w)) continue
    const k = readingKey(w, language)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k)
}

/**
 * Narrow reading (Krashen 2004): how much a candidate text shares the topic of the one just read,
 * as the share of its topic keys found in the candidate. Same-topic texts recycle vocabulary.
 */
export function topicOverlap(keys: readonly string[], candidate: string, language: TargetLanguage): { score: number; shared: string[] } {
  if (!keys.length) return { score: 0, shared: [] }
  const have = new Set<string>()
  for (const m of candidate.matchAll(new RegExp(WORD, 'gu'))) have.add(readingKey(m[0], language))
  const shared = keys.filter((k) => have.has(k))
  return { score: shared.length / keys.length, shared }
}
