import type { SentenceCard } from './sentences'
import type { TranslationEntry } from './translationMemory'
import type { TargetLanguage } from './types'

/** A sentence to write back from its Turkish: `text` in the learner's language, `turkish` shown. */
export interface BackItem {
  text: string
  turkish: string
}

/** Sentences asked per round: enough to warm up, short enough to finish. */
export const BACK_ROUND = 8

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length
const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * The translation memory as back-translation practice: every sentence translated between the
 * learner's language and Turkish (either way; a DeepL sentence in the learner's language is a good
 * model), not yet a sentence card. Single words and long passages are left out: one is a word card,
 * the other too much to write from memory. Newest first, so what was just read comes up while fresh.
 */
export function backTranslationItems(memory: readonly TranslationEntry[], cards: readonly SentenceCard[], language: TargetLanguage): BackItem[] {
  const carded = new Set(cards.filter((c) => c.language === language).map((c) => flat(c.text)))
  const seen = new Set<string>()
  const out: BackItem[] = []
  for (const e of memory) {
    const pair =
      e.from === language && e.to === 'tr' ? { text: e.text, turkish: e.translation } : e.from === 'tr' && e.to === language ? { text: e.translation, turkish: e.text } : null
    if (!pair) continue
    const text = flat(pair.text)
    const n = wordCount(text)
    if (n < 3 || n > 25 || carded.has(text) || seen.has(text)) continue
    seen.add(text)
    out.push({ text, turkish: flat(pair.turkish) })
  }
  return out
}
