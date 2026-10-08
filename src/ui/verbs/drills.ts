import type { ErrorKind } from '../../engine/formDiagnosis'
import { tallyCells, type LabData } from '../../engine/labProgress'
import { createRng, shuffle } from '../../engine/rng'
import { conjugateTense, irregularForms, personsOf, type Tense } from '../../engine/tenses'
import { prefs } from '../prefs'
import { personFor, type Asked } from './ReviewTab'
import { CORE_TENSES, verbEntry, type LabLanguage } from './labShared'

/** A focused round: short like a review sitting. */
export const DRILL_SIZE = 8

/** The kinds of slip a round can aim at (a typo or an unknown form has no pattern to drill). */
export const DRILLABLE: ErrorKind[] = ['person', 'tense', 'accent', 'irregular']

export const DRILL_TEXT: Partial<Record<ErrorKind, string>> = {
  person: 'En çok karıştırdığın kişiler, o zamanlarda.',
  tense: 'Çalıştığın fiiller, temel zamanlar karışık: her soruda zamanın adına bak.',
  accent: 'Aksanlı biçimler: aksanı da yaz.',
  irregular: 'Sık fiillerin kuralın dışındaki biçimleri.',
}

const ACCENTED = /[^\x20-\x7e]/
const people = (language: LabLanguage, tense: Tense) => personsOf(language, tense).filter((p) => !(language === 'es' && prefs.hideVosotros && p === 4))

/** The verbs worked on in the lab, else the most common ones. */
function verbsOf(lab: LabData, byFrequency: readonly string[]): string[] {
  const practised = [...new Set(Object.keys(lab.records).map((k) => k.split('|')[0]))]
  return practised.length >= 3 ? practised : [...practised, ...byFrequency.slice(0, 30)]
}

/**
 * Questions aimed at one kind of slip, from what the lab recorded: the persons most often missed,
 * the core tenses mixed, forms with accents, or the irregular forms of common verbs.
 */
export function drillQueue(kind: ErrorKind, lab: LabData, language: LabLanguage, byFrequency: readonly string[], seed: number, size = DRILL_SIZE): Asked[] {
  const rng = createRng(seed)
  const core = CORE_TENSES[language]
  const verbs = shuffle(verbsOf(lab, byFrequency), rng)
  const forms = (verb: string, tense: Tense) => conjugateTense(verbEntry(language, verb), tense)
  const take = (candidates: Asked[]) => {
    // One question per verb and tense first, so a round isn't six persons of the same table.
    const seen = new Set<string>()
    const spread = shuffle(candidates, rng).filter((a) => !seen.has(`${a.verb}|${a.tense}`) && seen.add(`${a.verb}|${a.tense}`))
    return [...spread, ...candidates.filter((a) => !spread.includes(a))].slice(0, size)
  }

  if (kind === 'person') {
    const missed = tallyCells(lab)
      .filter((c) => c.wrong > 0 && people(language, c.tense).includes(c.person))
      .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
      .slice(0, 4)
    if (!missed.length) return []
    return take(verbs.flatMap((verb) => missed.filter((c) => forms(verb, c.tense)).map((c) => ({ verb, tense: c.tense, person: c.person }))))
  }
  if (kind === 'tense')
    return take(verbs.flatMap((verb, i) => core.filter((t) => forms(verb, t)).map((tense, j) => ({ verb, tense, person: personFor(language, { verb, tense }, seed + i * 7 + j) }))))
  if (kind === 'accent')
    return take(
      verbs.flatMap((verb) =>
        core.flatMap((tense) => {
          const f = forms(verb, tense)
          return f ? people(language, tense).filter((p) => ACCENTED.test(f[p])).map((person) => ({ verb, tense, person })) : []
        }),
      ),
    )
  if (kind === 'irregular') {
    const pool = [...new Set([...verbs, ...byFrequency.slice(0, 60)])]
    return take(
      pool.flatMap((verb) =>
        core.flatMap((tense) => {
          const odd = forms(verb, tense) ? irregularForms(verbEntry(language, verb), tense) : []
          return people(language, tense)
            .filter((p) => odd[p])
            .map((person) => ({ verb, tense, person }))
        }),
      ),
    )
  }
  return []
}
