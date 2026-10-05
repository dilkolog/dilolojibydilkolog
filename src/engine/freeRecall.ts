import { normalize, stripDiacritics } from './answerCheck'
import type { VocabularyEntry } from './types'

/**
 * Free recall after a session: the learner writes, without looking, the words they remember.
 * Recalling with no cue at all is a stronger retrieval than picking an answer, and so a stronger
 * boost to memory (testing effect; Roediger & Karpicke 2006). Matching is forgiving on purpose:
 * no articles, no accents, any order, separated by commas, lines or spaces.
 */
const key = (s: string) =>
  ` ${stripDiacritics(normalize(s))
    .replace(/[\n,;/]+/g, ' ')
    .replace(/(^|\s)(l'|d'|le|la|les|un|une|des|el|los|las|unos|unas|the|a|an|to)(?=\s)/g, ' ')
    .replace(/(^|\s)(l'|d')/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `

export function freeRecall(entries: readonly VocabularyEntry[], written: string): { recalled: VocabularyEntry[]; missed: VocabularyEntry[] } {
  const text = key(written)
  const recalled: VocabularyEntry[] = []
  const missed: VocabularyEntry[] = []
  for (const e of entries) {
    const forms = [e.lemma, ...(e.alternativeForms ?? [])].map(key).filter((f) => f.trim())
    ;(forms.some((f) => text.includes(f)) ? recalled : missed).push(e)
  }
  return { recalled, missed }
}
