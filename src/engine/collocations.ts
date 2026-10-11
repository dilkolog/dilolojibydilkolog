import type { TargetLanguage } from './types'

/**
 * Words that keep company: "décider de + infinitif", "poser une question", "heavy rain". Shown
 * on the page of any word they hold (a verb and its noun both), so the pair is learnt together.
 */
export interface Collocation {
  id: string
  language: TargetLanguage
  /** The words whose page shows it. */
  lemmas: string[]
  pattern: string
  example: string
  /** The example in Turkish. */
  tr: string
  source: string
}

const norm = (s: string) => s.trim().toLowerCase()

/** What the word goes with: at most two, so the chip row stays short. */
export function collocationsOf(list: readonly Collocation[], language: TargetLanguage, lemma: string, max = 2): Collocation[] {
  const key = norm(lemma)
  return list.filter((c) => c.language === language && c.lemmas.some((l) => norm(l) === key)).slice(0, max)
}
