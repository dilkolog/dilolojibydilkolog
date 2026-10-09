/**
 * Every sentence (or word) translated, kept on the device: the same text is never sent again,
 * it shows offline too, and the translation screen lists the recent ones. Backed up and synced.
 */
export type MemoryLang = 'en' | 'fr' | 'es' | 'tr'

export interface TranslationEntry {
  text: string
  translation: string
  /** The language of `text`, when it was known. */
  from?: MemoryLang
  to: MemoryLang
  /** When it was translated (ISO). */
  at: string
}

/** Entries kept: years of everyday use, a few hundred kilobytes at most. */
export const MEMORY_MAX = 3000

export const memoryKey = (e: Pick<TranslationEntry, 'text' | 'from' | 'to'>) => `${e.from ?? ''}>${e.to}:${e.text.trim()}`

/** The memory with `entry` in front (a text translated again moves up, with its newest translation). */
export function remember(list: readonly TranslationEntry[], entry: TranslationEntry, max = MEMORY_MAX): TranslationEntry[] {
  const key = memoryKey(entry)
  return [entry, ...list.filter((e) => memoryKey(e) !== key)].slice(0, max)
}

export function recall(list: readonly TranslationEntry[], text: string, from: MemoryLang | undefined, to: MemoryLang): TranslationEntry | undefined {
  const key = memoryKey({ text, from, to })
  return list.find((e) => memoryKey(e) === key)
}

/** Two devices' memories together: every text once, the newer translation of it, newest first. */
export function mergeMemories(a: readonly TranslationEntry[] = [], b: readonly TranslationEntry[] = [], max = MEMORY_MAX): TranslationEntry[] {
  const by = new Map<string, TranslationEntry>()
  for (const e of [...a, ...b]) {
    const key = memoryKey(e)
    const had = by.get(key)
    if (!had || e.at > had.at) by.set(key, e)
  }
  return [...by.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, max)
}
