import { irregularForms, labTensesOf, type Tense } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/** How far down the frequency list "the next irregular" looks (the common verbs are where irregulars matter). */
export const IRREGULAR_POOL = 300

/** Whether a verb has at least one irregular form in this tense (spelling changes count: they must be learned too). */
export function irregularIn(language: LabLanguage, verb: string, tense: Tense): boolean {
  const entry = verbEntry(language, verb)
  return labTensesOf(entry).includes(tense) && irregularForms(entry, tense).some(Boolean)
}

/**
 * The next verb to practise in the same tense, irregulars only: going down the frequency list after the current verb
 * (from the top when the current one is not on it, round again at the end), leaving out the ones already done this
 * visit. Null when no other irregular is left.
 */
export function nextIrregular(language: LabLanguage, tense: Tense, current: string, order: readonly string[], done: ReadonlySet<string> = new Set()): string | null {
  const list = order.slice(0, IRREGULAR_POOL)
  const start = list.indexOf(current)
  for (let step = 1; step <= list.length; step++) {
    const verb = list[(start + step + list.length) % list.length]
    if (verb === current || done.has(verb)) continue
    if (irregularIn(language, verb, tense)) return verb
  }
  return null
}
