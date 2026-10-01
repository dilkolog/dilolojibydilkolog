import { conjugate } from '../engine/conjugation'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'

/**
 * Word frequency from subtitles (see frequency/SOURCE.md): spoken, everyday language, which is
 * what a learner meets most. Each list is a separate chunk, loaded only when needed.
 */
const LOADERS: Record<TargetLanguage, () => Promise<{ default: string }>> = {
  en: () => import('./frequency/en.txt?raw'),
  fr: () => import('./frequency/fr.txt?raw'),
  es: () => import('./frequency/es.txt?raw'),
}

const cache = new Map<TargetLanguage, Promise<Map<string, number>>>()

export function parseFrequencyList(text: string): Map<string, number> {
  const map = new Map<string, number>()
  text.split('\n').forEach((w, i) => {
    if (w && !map.has(w)) map.set(w, i + 1)
  })
  return map
}

export function loadFrequency(language: TargetLanguage): Promise<Map<string, number>> {
  let p = cache.get(language)
  if (!p) {
    p = LOADERS[language]().then((m) => parseFrequencyList(m.default))
    cache.set(language, p)
  }
  return p
}

/** The list as words in rank order (index 0 = rank 1). */
export async function frequencyWords(language: TargetLanguage): Promise<string[]> {
  return [...(await loadFrequency(language)).keys()]
}

/** Looked up, but not among the listed words: rarer than the list goes. */
export const NOT_LISTED = -1
/** Can't be ranked by a single-word list (multi-word phrases). */
export const UNRANKED = -2

/**
 * Rank of a word (1 = most frequent), or NOT_LISTED. Verbs take their best-ranked present form
 * too, since subtitles say "est" far more often than "être". Multi-word phrases aren't ranked.
 */
export function rankOf(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>, list: ReadonlyMap<string, number>): number {
  const lemma = entry.lemma
    .toLocaleLowerCase(entry.language)
    .trim()
    .replace(/^(se |s['’])/, '')
    .replace(/^to /, '')
  if (/\s/.test(lemma)) return UNRANKED
  const forms = [lemma, ...(conjugate(entry)?.forms.map((f) => f.split(' ').at(-1)!.replace(/^[a-z]['’]/, '')) ?? [])]
  const ranks = forms.map((f) => list.get(f)).filter((r): r is number => r !== undefined)
  return ranks.length ? Math.min(...ranks) : NOT_LISTED
}

/**
 * Fills in the frequency of the user's words that don't have one yet (added by hand without a
 * band, imported, or from text). Returns how many words were updated.
 */
export async function fillFrequencyRanks(db: KelimeDB, language: TargetLanguage): Promise<number> {
  const todo = (await db.vocabulary.where('language').equals(language).toArray()).filter((e) => e.source !== 'sample' && !e.frequencyRank)
  if (!todo.length) return 0
  const list = await loadFrequency(language)
  await db.vocabulary.bulkPut(todo.map((e) => ({ ...e, frequencyRank: rankOf(e, list) })))
  return todo.length
}
