import { openSlips, type LabData, type LabSlip } from '../../engine/labProgress'
import { createRng, shuffle, type Rng } from '../../engine/rng'
import { conjugateTense, labTensesOf, personsOf } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/** How many forms one sitting of the mistakes bank asks. */
export const SLIP_ROUND = 10
const DISTRACTORS = 3

/** A form from the bank, and how it is asked: freshly missed ones are chosen from options, the ones answered once are typed. */
export interface SlipQuestion {
  slip: LabSlip
  format: 'choose' | 'type'
}

/**
 * A sitting from the mistakes bank, mixed: the ones missed most and the ones not yet answered right
 * come up first, but the order is shuffled and the same verb is not asked twice in a row when there
 * is a choice. Forms that no longer have a table are left out.
 */
export function slipRound(lab: LabData, language: LabLanguage, seed: number, size = SLIP_ROUND): SlipQuestion[] {
  const rng = createRng(seed)
  const usable = openSlips(lab).filter((s) => conjugateTense(verbEntry(language, s.verb), s.tense)?.[s.person])
  // Weighted draw without replacement: more misses and a zero streak weigh more.
  const pool = usable.map((slip) => ({ slip, weight: (1 + Math.min(slip.wrong, 4)) * (slip.streak === 0 ? 2 : 1) }))
  const chosen: LabSlip[] = []
  while (chosen.length < size && pool.length) {
    const total = pool.reduce((n, p) => n + p.weight, 0)
    let at = rng() * total
    let i = 0
    while (i < pool.length - 1 && at >= pool[i].weight) at -= pool[i++].weight
    chosen.push(pool.splice(i, 1)[0].slip)
  }
  return spreadVerbs(shuffle(chosen, rng)).map((slip) => ({ slip, format: slip.streak === 0 ? 'choose' : 'type' }))
}

/** The order with the same verb kept apart where it can be (a greedy pass, stable otherwise). */
export function spreadVerbs(slips: readonly LabSlip[]): LabSlip[] {
  const left = [...slips]
  const out: LabSlip[] = []
  while (left.length) {
    const last = out[out.length - 1]
    const i = left.findIndex((s) => !last || s.verb !== last.verb)
    out.push(left.splice(i < 0 ? 0 : i, 1)[0])
  }
  return out
}

/**
 * The options for a form: the right one, what was wrongly given last time, and forms a learner might
 * really pick (this person in other tenses, other persons in this tense).
 */
export function slipOptions(language: LabLanguage, slip: LabSlip, rng: Rng): string[] {
  const entry = verbEntry(language, slip.verb)
  const forms = conjugateTense(entry, slip.tense) ?? []
  const right = forms[slip.person]
  const pool = new Set<string>()
  for (const t of labTensesOf(entry)) if (t !== slip.tense) pool.add(conjugateTense(entry, t)?.[slip.person] ?? '')
  for (const p of personsOf(language, slip.tense)) if (p !== slip.person) pool.add(forms[p] ?? '')
  pool.delete('')
  pool.delete(right)
  // What was wrongly given is a good option only when it is a real form of the verb (not a typo).
  const given = slip.given && pool.has(slip.given) ? [slip.given] : []
  const wrong = [...given, ...shuffle([...pool].filter((f) => !given.includes(f)), rng)].slice(0, DISTRACTORS)
  return shuffle([right, ...wrong], rng)
}
