import { stripDiacritics } from './answerCheck'
import { timeOf } from './types'

/**
 * What the learner adds to the dictionary for one language: their own corrections of a word's
 * Turkish meaning (shown first from then on, on every device), and how often they looked a word
 * up, so a word they keep coming back to can be offered for their list.
 */
export interface DictionaryNotes {
  /** Corrected meanings by word (the pack's key): the learner's own, in their order. */
  fixes: Record<string, { t: string[]; at: string }>
  /** Look-ups by word; `dismissed` once the learner said no to adding it. */
  looked: Record<string, { n: number; at: string; dismissed?: boolean }>
  /** Words the pack lacks that the learner saved with a meaning (from DeepL or typed): found in the dictionary from then on. */
  added?: Record<string, { t: string[]; at: string; from?: 'deepl' | 'own' }>
}

export const emptyNotes = (): DictionaryNotes => ({ fixes: {}, looked: {}, added: {} })

/** "ev, konut ;  yuva" → ev, konut, yuva: what the learner typed as the word's meanings. */
export function parseMeanings(text: string): string[] {
  return [...new Set(text.split(/[,;\n]/).map((m) => m.trim().replace(/\s+/g, ' ')).filter(Boolean))]
}

/** Sets the learner's meanings of a word; none clears the correction (the pack's show again). */
export function setFix(notes: DictionaryNotes, word: string, meanings: readonly string[], at: string): DictionaryNotes {
  const fixes = { ...notes.fixes }
  if (meanings.length) fixes[word] = { t: [...meanings], at }
  else delete fixes[word]
  return { ...notes, fixes }
}

/** The key a saved word is kept under: lower case, one space between words. */
export const addedKey = (word: string, language: string) => word.trim().replace(/\s+/g, ' ').toLocaleLowerCase(language)

/** Saves a word the pack lacks with its meanings, for good (a second save of the same word replaces the first). */
export function addEntry(notes: DictionaryNotes, word: string, meanings: readonly string[], at: string, from: 'deepl' | 'own', language: string): DictionaryNotes {
  const key = addedKey(word, language)
  if (!key || !meanings.length) return notes
  return { ...notes, added: { ...notes.added, [key]: { t: [...meanings], at, from } } }
}

/** Takes a saved word out of the dictionary again. */
export function removeEntry(notes: DictionaryNotes, key: string): DictionaryNotes {
  if (!notes.added?.[key]) return notes
  const added = { ...notes.added }
  delete added[key]
  return { ...notes, added }
}

/** Saved words matching what was typed: the word itself (accents aside), its start, or a Turkish meaning that contains it. Exact word first. */
export function findAdded(notes: DictionaryNotes, query: string, language: string): { word: string; t: string[]; exact: boolean }[] {
  const fold = (s: string, lang: string) => stripDiacritics(s.trim().replace(/\s+/g, ' ').toLocaleLowerCase(lang))
  const q = fold(query, language)
  if (!q) return []
  const qTr = fold(query, 'tr')
  return Object.entries(notes.added ?? {})
    .map(([word, e]) => {
      const w = fold(word, language)
      return { word, t: e.t, exact: w === q, hit: w === q || w.startsWith(q) || e.t.some((m) => fold(m, 'tr').includes(qTr)) }
    })
    .filter((e) => e.hit)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || a.word.localeCompare(b.word))
    .map(({ word, t, exact }) => ({ word, t, exact }))
}

/** One more look at a word. */
export function noteLookup(notes: DictionaryNotes, word: string, at: string): DictionaryNotes {
  const was = notes.looked[word]
  return { ...notes, looked: { ...notes.looked, [word]: { ...was, n: (was?.n ?? 0) + 1, at } } }
}

/** The learner doesn't want the word offered again. */
export function dismissLookup(notes: DictionaryNotes, word: string): DictionaryNotes {
  const was = notes.looked[word]
  return was ? { ...notes, looked: { ...notes.looked, [word]: { ...was, dismissed: true } } } : notes
}

/**
 * Words looked up at least `min` times that are not in the list and were not turned down: most
 * looked up first, then the most recent.
 */
export function lookupSuggestions(notes: DictionaryNotes, inList: (word: string) => boolean, min = 2, limit = 6): { word: string; n: number }[] {
  return Object.entries(notes.looked)
    .filter(([word, l]) => l.n >= min && !l.dismissed && !inList(word))
    .sort((a, b) => b[1].n - a[1].n || timeOf(b[1].at) - timeOf(a[1].at))
    .slice(0, limit)
    .map(([word, l]) => ({ word, n: l.n }))
}

/** Two devices' notes together: the later correction of a word, the larger look-up count, a "no" kept. */
export function mergeNotes(a: DictionaryNotes | undefined, b: DictionaryNotes | undefined): DictionaryNotes | undefined {
  if (!a || !b) return b ?? a
  const fixes = { ...a.fixes }
  for (const [w, f] of Object.entries(b.fixes)) if (!fixes[w] || timeOf(f.at) >= timeOf(fixes[w].at)) fixes[w] = f
  const looked = { ...a.looked }
  for (const [w, l] of Object.entries(b.looked)) {
    const o = looked[w]
    looked[w] = o ? { n: Math.max(o.n, l.n), at: timeOf(o.at) >= timeOf(l.at) ? o.at : l.at, ...(o.dismissed || l.dismissed ? { dismissed: true } : {}) } : l
  }
  const added = { ...a.added }
  for (const [w, e] of Object.entries(b.added ?? {})) if (!added[w] || timeOf(e.at) >= timeOf(added[w].at)) added[w] = e
  return Object.keys(added).length ? { fixes, looked, added } : { fixes, looked }
}
