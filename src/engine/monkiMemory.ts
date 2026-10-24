/**
 * What Monki remembers about a learner between talks: a few short notes ("tekrar eden hata: ser/estar karışıyor",
 * "hedefi Mart'ta DELF B1"), kept on the device and carried with the account like the other preferences. The notes are
 * the model's own, one or two at a time, so nothing extra is asked for; the learner can read them, delete them one by one,
 * or switch remembering off.
 */
export interface MemoryNote {
  id: string
  text: string
  /** The day it was noted, `YYYY-MM-DD`. */
  at: string
}

/** The notes kept per language: older ones make room for new ones. */
export const MAX_NOTES = 12
/** One note is a line, not a paragraph. */
export const MAX_NOTE_LENGTH = 110

/** A note's letters without accents, case, Turkish dotted/dotless i or punctuation: two notes alike in these are the same note. */
const flat = (s: string) => s.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** The notes in a stored value, whatever shape it has: anything that is not a well-formed note is dropped. */
export function cleanNotes(raw: unknown): MemoryNote[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const notes: MemoryNote[] = []
  for (const n of raw) {
    if (!n || typeof n !== 'object') continue
    const { id, text, at } = n as Record<string, unknown>
    if (typeof id !== 'string' || typeof text !== 'string' || typeof at !== 'string') continue
    const t = text.trim().slice(0, MAX_NOTE_LENGTH)
    const key = flat(t)
    if (!t || !key || seen.has(key)) continue
    seen.add(key)
    notes.push({ id, text: t, at })
  }
  return notes.slice(-MAX_NOTES)
}

/** The notes with the model's new ones added (empty and repeated lines ignored, the oldest dropped when full). */
export function addNotes(notes: readonly MemoryNote[], texts: readonly string[] | undefined, day: string, newId: () => string): MemoryNote[] {
  const have = new Set(notes.map((n) => flat(n.text)))
  const added: MemoryNote[] = []
  for (const raw of texts ?? []) {
    if (typeof raw !== 'string') continue
    const text = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE_LENGTH)
    const key = flat(text)
    if (!text || !key || have.has(key)) continue
    have.add(key)
    added.push({ id: newId(), text, at: day })
  }
  return added.length ? [...notes, ...added].slice(-MAX_NOTES) : [...notes]
}

export const removeNote = (notes: readonly MemoryNote[], id: string): MemoryNote[] => notes.filter((n) => n.id !== id)

/** The lines handed to Monki, the newest last. */
export const memoryLines = (notes: readonly MemoryNote[]): string[] => notes.map((n) => n.text)
