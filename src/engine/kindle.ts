/**
 * Kindle imports. Two sources: "My Clippings.txt" (highlights) and the Vocabulary Builder
 * database (words looked up while reading, with the sentence they were in).
 */

export interface KindleWord {
  word: string
  /** The sentence the word was met in, when known. */
  context?: string
  book?: string
}

/** Highlights of at most this many words count as words to learn; longer ones are passages. */
const MAX_WORDS = 3

/**
 * Parses "My Clippings.txt". Entries are separated by "==========": book title, a metadata
 * line starting with "-", a blank line, then the highlighted text. Short highlights become
 * words; a longer highlight from the same book containing the word becomes its context.
 */
export function parseClippings(raw: string): KindleWord[] {
  const entries = raw
    .replace(/^﻿/, '')
    .replace(/\r/g, '')
    .split(/^=+\s*$/m)
    .map((block) => block.split('\n').map((l) => l.trim()).filter((l, i, all) => l || (i > 0 && i < all.length - 1)))
    .map((lines) => {
      const nonEmpty = lines.filter(Boolean)
      if (nonEmpty.length < 3 || !nonEmpty[1].startsWith('-')) return null
      return { book: nonEmpty[0].replace(/^﻿/, ''), text: nonEmpty.slice(2).join(' ').trim() }
    })
    .filter((e): e is { book: string; text: string } => !!e && !!e.text)
  const passages = entries.filter((e) => e.text.split(/\s+/).length > MAX_WORDS)
  const seen = new Set<string>()
  const out: KindleWord[] = []
  for (const e of entries) {
    if (e.text.split(/\s+/).length > MAX_WORDS) continue
    const word = e.text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    const key = word.toLocaleLowerCase()
    if (!word || seen.has(key)) continue
    seen.add(key)
    const context = passages.find((p) => p.book === e.book && p.text.toLocaleLowerCase().includes(key))?.text
    out.push({ word, context, book: e.book })
  }
  return out
}

export interface VocabRow {
  word: string
  stem: string | null
  lang: string
  usage: string | null
  book: string | null
  timestamp: number
}

/** Vocabulary Builder rows for one language: one entry per word (dictionary form if known), newest sentence kept. */
export function vocabRowsToWords(rows: readonly VocabRow[], language: string): KindleWord[] {
  const byWord = new Map<string, KindleWord & { at: number }>()
  for (const r of rows) {
    if (!r.lang?.toLowerCase().startsWith(language)) continue
    const word = (r.stem || r.word).trim()
    const key = word.toLocaleLowerCase()
    const prev = byWord.get(key)
    if (!prev || r.timestamp > prev.at) byWord.set(key, { word, context: r.usage?.trim() || undefined, book: r.book ?? undefined, at: r.timestamp })
  }
  return [...byWord.values()].sort((a, b) => b.at - a.at).map(({ at: _at, ...w }) => w)
}
