import { irregularForms, labTensesOf, type Tense } from './tenses'
import type { TargetLanguage } from './types'

/** Whether a verb breaks the regular pattern somewhere in this tense. */
export function irregularIn(language: TargetLanguage, lemma: string, tense: Tense): boolean {
  const entry = { language, lemma, partOfSpeech: 'verb' as const }
  return labTensesOf(entry).includes(tense) && irregularForms(entry, tense).some(Boolean)
}

/**
 * The irregular verb to practise after `verb` in this tense: the next one in `order` (most common first) after
 * the current one, wrapping round; when the current verb is not in the list, the first one. Undefined when
 * no other verb in the list is irregular in the tense.
 */
export function nextIrregular(language: TargetLanguage, verb: string, tense: Tense, order: readonly string[]): string | undefined {
  const list = [...new Set(order)]
  const at = list.indexOf(verb)
  const rotated = at < 0 ? list : [...list.slice(at + 1), ...list.slice(0, at)]
  return rotated.find((v) => v !== verb && irregularIn(language, v, tense))
}
