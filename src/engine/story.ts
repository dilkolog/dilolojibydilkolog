import { openMistakes } from './mistakes'
import type { Scheduler } from './scheduler'
import type { Mistake, TargetLanguage, UserWordState, VocabularyEntry } from './types'

/**
 * Words for today's story episode: the ones most worth meeting again in a meaningful context —
 * weakest recall first, words with open mistakes boosted, and words used in the last episodes
 * skipped so every episode brings different words.
 */
export function pickStoryWords(input: {
  language: TargetLanguage
  catalog: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  mistakes: readonly Mistake[]
  scheduler: Scheduler
  now: Date
  recentlyUsed?: ReadonlySet<string>
  count?: number
}): VocabularyEntry[] {
  const { language, catalog, states, mistakes, scheduler, now, recentlyUsed = new Set(), count = 6 } = input
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const withMistakes = new Set(openMistakes(mistakes).map((m) => m.entryId))
  const scored = states
    .filter((s) => s.language === language && byId.has(s.entryId))
    .map((s) => {
      const cards = Object.values(s.skills)
      const r = cards.length ? Math.min(...cards.map((c) => scheduler.retrievability(c, now))) : 0
      const score = r - (withMistakes.has(s.entryId) ? 0.3 : 0) + (recentlyUsed.has(s.entryId) ? 1 : 0)
      return { entry: byId.get(s.entryId)!, score }
    })
    .sort((a, b) => a.score - b.score)
  return scored.slice(0, count).map((x) => x.entry)
}

export interface StoryBlank {
  /** Index of the blank in reading order. */
  index: number
  entryId: string
  /** The exact form used in the text, e.g. "abandoned". */
  answer: string
}

export type StoryPart = { kind: 'text'; text: string } | { kind: 'blank'; blank: StoryBlank }

/**
 * Splits story text with {{form}} markers into text and blanks. A marker is a blank only if its
 * form belongs to one of the episode's words (lemma or inflection by shared prefix); any other
 * marker stays plain text, so a model mistake never produces an unanswerable blank.
 */
export function parseStoryText(text: string, words: readonly VocabularyEntry[], startIndex = 0): { parts: StoryPart[]; next: number } {
  const parts: StoryPart[] = []
  let index = startIndex
  let last = 0
  const norm = (s: string) => s.toLocaleLowerCase().normalize('NFC')
  const prefix = (a: string, b: string) => {
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    return i
  }
  for (const m of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
    if (m.index! > last) parts.push({ kind: 'text', text: text.slice(last, m.index) })
    const form = m[1].trim()
    const f = norm(form)
    const owner = words
      .map((w) => ({ w, p: Math.max(prefix(f, norm(w.lemma)), norm(form).includes(norm(w.lemma)) ? w.lemma.length : 0) }))
      .filter(({ w, p }) => p >= Math.min(4, w.lemma.length))
      .sort((a, b) => b.p - a.p)[0]?.w
    if (owner) parts.push({ kind: 'blank', blank: { index: index++, entryId: owner.id, answer: form } })
    else parts.push({ kind: 'text', text: form })
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return { parts, next: index }
}
