import { useMemo } from 'react'
import { buildTour, type TourItem } from '../../engine/labTour'
import type { LabData } from '../../engine/labProgress'
import { createRng, shuffle } from '../../engine/rng'
import { conjugateTense, labTensesOf, type Tense } from '../../engine/tenses'
import { people } from './drills'
import { CORE_TENSES, dayNumber, verbEntry, type LabLanguage } from './labShared'

/** The round for today, from the lab's own data and today's verb. */
export function useTour(language: LabLanguage, lab: LabData, verbOfDay: string | undefined, ready: boolean, round = 0): TourItem[] {
  return useMemo(() => {
    if (!ready) return []
    const now = new Date()
    return buildTour({
      lab,
      now,
      verbOfDay,
      core: CORE_TENSES[language],
      persons: (_verb, tense) => people(language, tense),
      has: (verb, tense) => labTensesOf(verbEntry(language, verb)).includes(tense) && !!conjugateTense(verbEntry(language, verb), tense),
      day: dayNumber(now),
    })
    // The round is set when the lab opens (and again after one ends): answering inside it must not reshuffle it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, verbOfDay, ready, round])
}

/** The form among four: the right one, the same tense for other persons, the same person in another tense. */
export function formOptions(language: LabLanguage, verb: string, tense: Tense, person: number, seed: number): string[] {
  const entry = verbEntry(language, verb)
  const right = conjugateTense(entry, tense)?.[person] ?? ''
  const rng = createRng(seed)
  const sameTense = (conjugateTense(entry, tense) ?? []).filter(Boolean)
  const samePerson = CORE_TENSES[language].filter((t) => t !== tense).map((t) => conjugateTense(entry, t)?.[person])
  const others = shuffle([...new Set([...sameTense, ...samePerson].filter((f): f is string => !!f && f !== right))], rng)
  return shuffle([right, ...others.slice(0, 3)], rng)
}
