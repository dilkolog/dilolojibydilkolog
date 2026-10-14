import { cleanToken, splitSentences, WORD_SOURCE } from './extract'
import { isDueFor } from './practice'
import { readingKey } from './reading'
import { shuffle, type Rng } from './rng'
import type { TargetLanguage, UserWordState, VocabularyEntry } from './types'

/**
 * Review in context: sentences the learner has already met (texts read, sentences translated,
 * their words' examples) in which two or more of their own words stand. The words are blanked
 * and put back from a bank of chips, so each word is recalled inside real language, next to the
 * others, rather than one card at a time. A due word counts as its review, as in any game.
 */

export interface ContextSource {
  text: string
  /** The Turkish, when it is known (a sentence translated, an example with its translation). */
  translation?: string
  /** Where it was met: a text's title, "Çevirdiklerin", "Örnek cümle". */
  from: string
}

export interface ContextSlot {
  entryId: string
  /** The word as it stands in the sentence (décidé for décider). */
  form: string
  start: number
  end: number
}

export interface ContextItem {
  text: string
  translation?: string
  from: string
  slots: ContextSlot[]
  /** How many of its words are due for review now. */
  due: number
}

/** At least this many of the learner's words in one sentence: one alone is a cloze card, which the session has already. */
export const CONTEXT_MIN_WORDS = 2
/** Blanks in one sentence at most: more and the sentence stops carrying them. */
const MAX_SLOTS = 4
/** Running words a sentence may have: long enough for context, short enough to hold in mind. */
const MIN_TOKENS = 5
const MAX_TOKENS = 28
export const CONTEXT_ROUND = 6
/** A word in at most this many sentences of one round. */
const PER_WORD = 2

const WORD = new RegExp(WORD_SOURCE, 'gu')
const norm = (s: string) => s.replace(/\*/g, '').replace(/\s+/g, ' ').trim()

/** Every sentence of the sources with two or more of the learner's met words, blanks marked, each sentence once. */
export function contextItems(
  sources: readonly ContextSource[],
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  now: Date,
): ContextItem[] {
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const byKey = new Map<string, VocabularyEntry>()
  for (const e of vocabulary) {
    const st = stateById.get(e.id)
    if (e.language !== language || !st || st.retired) continue
    for (const w of [e.lemma, ...(e.alternativeForms ?? [])]) if (!w.includes(' ')) byKey.set(readingKey(w, language), e)
  }
  if (byKey.size < CONTEXT_MIN_WORDS) return []
  const seen = new Set<string>()
  const out: ContextItem[] = []
  for (const src of sources) {
    // A source of several sentences (a text) is split; a translated or example sentence stays whole.
    const sentences = splitSentences(norm(src.text))
    const single = sentences.length === 1
    for (const text of sentences) {
      const key = text.toLocaleLowerCase(language)
      if (seen.has(key)) continue
      const tokens = [...text.matchAll(WORD)]
      if (tokens.length < MIN_TOKENS || tokens.length > MAX_TOKENS) continue
      const slots: (ContextSlot & { due: boolean })[] = []
      for (const m of tokens) {
        const entry = byKey.get(readingKey(m[0], language))
        if (!entry || slots.some((s) => s.entryId === entry.id)) continue
        // "l'arbre": only "arbre" is blanked, the article stays.
        const clean = cleanToken(m[0], language)
        const offset = Math.max(0, m[0].indexOf(clean))
        const start = m.index + offset
        slots.push({ entryId: entry.id, form: clean, start, end: start + clean.length, due: isDueFor(stateById.get(entry.id)!, 'recognition', now) })
      }
      if (slots.length < CONTEXT_MIN_WORDS) continue
      seen.add(key)
      // The due ones first when there are too many, then back in reading order.
      const kept = [...slots]
        .sort((a, b) => Number(b.due) - Number(a.due))
        .slice(0, MAX_SLOTS)
        .sort((a, b) => a.start - b.start)
      out.push({
        text,
        ...(single && src.translation ? { translation: src.translation } : {}),
        from: src.from,
        slots: kept.map(({ due: _due, ...s }) => s),
        due: kept.filter((s) => s.due).length,
      })
    }
  }
  return out
}

/** A round: sentences with due words first, then the richest, no word in more than two of them. */
export function contextRound(items: readonly ContextItem[], rng: Rng, size = CONTEXT_ROUND): ContextItem[] {
  const ranked = shuffle(items, rng).sort((a, b) => b.due - a.due || b.slots.length - a.slots.length)
  const used = new Map<string, number>()
  const round: ContextItem[] = []
  for (const item of ranked) {
    if (round.length >= size) break
    if (item.slots.some((s) => (used.get(s.entryId) ?? 0) >= PER_WORD)) continue
    round.push(item)
    for (const s of item.slots) used.set(s.entryId, (used.get(s.entryId) ?? 0) + 1)
  }
  return shuffle(round, rng)
}

/** The chips to fill a sentence from: its own words and up to two words of other sentences, mixed. */
export function contextBank(item: ContextItem, others: readonly ContextItem[], rng: Rng, extra = 2): string[] {
  const own = item.slots.map((s) => s.form)
  const lower = new Set(own.map((f) => f.toLowerCase()))
  const pool = [...new Set(others.filter((o) => o !== item).flatMap((o) => o.slots.map((s) => s.form)))].filter((f) => !lower.has(f.toLowerCase()))
  return shuffle([...own, ...shuffle(pool, rng).slice(0, extra)], rng)
}

/** Each blank right or not: a form put in the right place, letter case aside. */
export const checkSlots = (item: ContextItem, answers: readonly (string | null)[]): boolean[] =>
  item.slots.map((s, i) => (answers[i] ?? '').toLocaleLowerCase() === s.form.toLocaleLowerCase())

/** The sentence cut at its blanks: text pieces and blank numbers, in order. */
export function contextParts(item: ContextItem): ({ text: string } | { slot: number })[] {
  const parts: ({ text: string } | { slot: number })[] = []
  let at = 0
  item.slots.forEach((s, i) => {
    if (s.start > at) parts.push({ text: item.text.slice(at, s.start) })
    parts.push({ slot: i })
    at = s.end
  })
  if (at < item.text.length) parts.push({ text: item.text.slice(at) })
  return parts
}
