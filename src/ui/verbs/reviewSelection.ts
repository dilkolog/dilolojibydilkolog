import { prefs } from '../prefs'
import { createRng, pick } from '../../engine/rng'
import { irregularForms, personsOf, type Tense } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/** How many forms one review sitting asks: short enough to fit a spare two minutes. */
export const REVIEW_SIZE = 8

/** One question: a person's form of a verb in a tense. */
export interface Asked {
  verb: string
  tense: Tense
  person: number
}

/** The person asked for a form: the ones that break the rule come up a little more often. */
export function personFor(language: LabLanguage, item: { verb: string; tense: Tense }, seed: number): number {
  const rng = createRng(seed)
  const all = personsOf(language, item.tense).filter((p) => !(language === 'es' && prefs.hideVosotros && p === 4))
  const odd = irregularForms(verbEntry(language, item.verb), item.tense)
  const irregular = all.filter((p) => odd[p])
  return pick(irregular.length && rng() < 0.6 ? irregular : all, rng)
}
