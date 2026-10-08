import { conjugateTense, type Tense } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/**
 * The same tense in the other lab language, for a learner of both: French and Spanish line up
 * tense for tense, except where use differs, and those places get a note.
 */
const TWIN: Record<string, { tense: Tense; note?: string }> = {
  // French → Spanish
  present: { tense: 'presente' },
  imparfait: { tense: 'imperfecto' },
  'passe-compose': {
    tense: 'preterito',
    note: 'Konuşmadaki passé composé, İspanyolcada çoğu zaman indefinido’dur (j’ai parlé hier → hablé ayer). Bugün, bu hafta gibi henüz bitmemiş bir zaman diliminde İspanyolca perfecto’yu kullanır (he hablado hoy).',
  },
  'passe-simple': { tense: 'preterito', note: 'Passé simple yalnızca yazı dilinde; İspanyolcada aynı işi gören indefinido ise konuşmada da her yerde.' },
  'plus-que-parfait': { tense: 'pluscuamperfecto' },
  futur: { tense: 'futuro' },
  'futur-anterieur': { tense: 'futuro-perfecto' },
  conditionnel: { tense: 'condicional' },
  'conditionnel-passe': { tense: 'condicional-perfecto' },
  subjonctif: { tense: 'subjuntivo' },
  'subjonctif-passe': { tense: 'subjuntivo-perfecto' },
  imperatif: { tense: 'imperativo' },
  // Spanish → French
  presente: { tense: 'present' },
  imperfecto: { tense: 'imparfait' },
  preterito: { tense: 'passe-compose', note: 'İndefinido’nun Fransızcadaki karşılığı konuşmada passé composé’dir (hablé → j’ai parlé); passé simple yalnızca yazı dilinde.' },
  perfecto: { tense: 'passe-compose', note: 'Perfecto da Fransızcada passé composé’dir: Fransızca iki İspanyolca zamanı tek zamanla karşılar.' },
  pluscuamperfecto: { tense: 'plus-que-parfait' },
  futuro: { tense: 'futur' },
  'futuro-perfecto': { tense: 'futur-anterieur' },
  condicional: { tense: 'conditionnel' },
  'condicional-perfecto': { tense: 'conditionnel-passe' },
  subjuntivo: { tense: 'subjonctif' },
  'subjuntivo-imperfecto': { tense: 'subjonctif', note: 'Fransızcada subjonctif imparfait günlük dilde kullanılmaz; yerine présent du subjonctif gelir (quería que vinieras → je voulais que tu viennes).' },
  'subjuntivo-perfecto': { tense: 'subjonctif-passe' },
  'subjuntivo-pluscuamperfecto': { tense: 'subjonctif-passe', note: 'Fransızcada bu zamanın yerine subjonctif passé kullanılır.' },
  imperativo: { tense: 'imperatif' },
}

const COMPOUND = new Set<Tense>(['passe-compose', 'plus-que-parfait', 'futur-anterieur', 'conditionnel-passe', 'subjonctif-passe', 'perfecto', 'pluscuamperfecto', 'futuro-perfecto', 'condicional-perfecto', 'subjuntivo-perfecto', 'subjuntivo-pluscuamperfecto'])

export const otherLab = (language: LabLanguage): LabLanguage => (language === 'fr' ? 'es' : 'fr')

export interface Twin {
  language: LabLanguage
  verb: string
  tense: Tense
  forms: string[]
  notes: string[]
}

/**
 * The verb's twin in the other language, in the matching tense: the first of `candidates` (the
 * pack's translations) the other language's tables know. Null when none is conjugated there.
 */
export function twinOf(language: LabLanguage, verb: string, tense: Tense, candidates: readonly string[]): Twin | null {
  const map = TWIN[tense]
  if (!map) return null
  const other = otherLab(language)
  for (const candidate of candidates) {
    const forms = conjugateTense(verbEntry(other, candidate), map.tense)
    if (!forms) continue
    const notes = map.note ? [map.note] : []
    // French builds some compound tenses with être; Spanish always with haber.
    if (COMPOUND.has(tense) || COMPOUND.has(map.tense)) {
      const french = language === 'fr' ? { verb, tense } : { verb: candidate, tense: map.tense }
      const first = conjugateTense(verbEntry('fr', french.verb), french.tense)?.[0] ?? ''
      if (/^(me |m’|m')?(suis|étais|serai|serais|sois)\b/.test(first))
        notes.push(`Fransızcada ${french.verb} bileşik zamanlarda être ile kurulur (${first}); İspanyolcada bileşik zamanlar her zaman haber ile.`)
    }
    return { language: other, verb: candidate, tense: map.tense, forms, notes }
  }
  return null
}
