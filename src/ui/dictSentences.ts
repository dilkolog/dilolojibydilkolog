import { examplesFromPack } from '../data/wordpack'
import type { PackRecord } from '../data/wordpackBuild'
import type { Example, TargetLanguage } from '../engine/types'

/** Fetched once per word and kept on the device for a month, so a word looked up before works offline. */
export const KEY = (language: TargetLanguage, word: string) => `kelime-koc:dict-sentences:${language}:${word}`
export const MAX_AGE = 30 * 86_400_000

/** The sentences shown for a word right now, without waiting: the ones fetched for it (kept a month), else the pack's. */
export function sentencesNow(language: TargetLanguage, word: string, bundled?: PackRecord['c']): Example[] {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY(language, word)) ?? 'null') as { at: number; examples: Example[] } | null
    if (cached && Date.now() - cached.at < MAX_AGE && cached.examples.length) return cached.examples
  } catch {
    // Unreadable: the pack's.
  }
  return examplesFromPack(bundled) ?? []
}
