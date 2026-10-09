import { readingKey } from './reading'
import { STOP } from './extract'
import type { CefrLevel, TargetLanguage, UserWordState, VocabularyEntry } from './types'
import { State } from 'ts-fsrs'

/**
 * Words graded by the level at which learner materials start using them (FLELex, ELELex: see
 * data/cefr/SOURCE.md). A textbook's level for a word, which says more than how common it is in
 * films: "gouvernement" is frequent but comes at A2, "chat" at A1.
 */
export type CefrList = ReadonlyMap<string, CefrLevel>

export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function parseCefrList(text: string): Map<string, CefrLevel> {
  const map = new Map<string, CefrLevel>()
  for (const line of text.split('\n')) {
    const [word, level] = line.split('\t')
    if (word && level && !map.has(word)) map.set(word, level as CefrLevel)
  }
  return map
}

/** A word's level: as written, without a reflexive pronoun, or (Spanish) without its "-se". */
export function cefrOf(entry: Pick<VocabularyEntry, 'language' | 'lemma'>, list: CefrList): CefrLevel | undefined {
  const lemma = entry.lemma.toLocaleLowerCase(entry.language).replace(/’/g, "'").trim()
  const plain = lemma.replace(/^(se |s')/, '')
  return list.get(lemma) ?? list.get(plain) ?? (entry.language === 'es' && /[aeií]rse$/.test(lemma) ? list.get(lemma.slice(0, -2)) : undefined)
}

export interface LevelCoverage {
  level: CefrLevel
  total: number
  /** Known: marked known while reading, learned in the list (out of learning), or a function word. */
  known: number
  /** In the list, still being learned. */
  learning: number
}

/** The single words of `level`, most frequent first (phrases aside: they can't be told apart in text). */
export const wordsAt = (list: CefrList, level: CefrLevel) => [...list].filter(([w, l]) => l === level && !w.includes(' ')).map(([w]) => w)

/**
 * How much of each level's words the learner has: known, being learned, or not yet. Counted the
 * way the frequency card counts (by stem, function words known), level by level, not cumulative.
 */
export function levelCoverage(
  list: CefrList,
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  known: ReadonlySet<string>,
): LevelCoverage[] {
  const graduated = new Set(states.filter((s) => s.skills.recognition?.state === State.Review).map((s) => s.entryId))
  const inList = new Map<string, boolean>()
  for (const e of vocabulary) {
    if (e.language !== language) continue
    for (const w of [e.lemma, ...(e.alternativeForms ?? [])]) {
      if (w.includes(' ')) continue
      const key = readingKey(w, language)
      inList.set(key, inList.get(key) || graduated.has(e.id))
    }
  }
  const out = new Map<CefrLevel, LevelCoverage>(CEFR_LEVELS.map((level) => [level, { level, total: 0, known: 0, learning: 0 }]))
  const seen = new Set<string>()
  for (const [word, level] of list) {
    if (word.includes(' ') || word.length < 2) continue
    const key = readingKey(word, language)
    if (seen.has(key)) continue
    seen.add(key)
    const row = out.get(level)!
    row.total++
    if (STOP[language].has(word) || known.has(key) || inList.get(key) === true) row.known++
    else if (inList.has(key)) row.learning++
  }
  return [...out.values()].filter((r) => r.total > 0)
}
