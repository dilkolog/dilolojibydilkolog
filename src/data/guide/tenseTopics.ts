import type { Tense } from '../../engine/tenses'

/**
 * The verb-lab tense each tense lesson of the guide teaches (lesson topic → tense). Kept apart from the lessons
 * themselves (ten thousand lines of text): a screen that only needs to know "is there a lesson for this tense" imports this.
 */
export const LESSON_TENSE: Record<string, Tense> = {
  basics_fr_present: 'present',
  basics_fr_passe_compose: 'passe-compose',
  passe_imparfait: 'imparfait',
  basics_fr_plus_que_parfait: 'plus-que-parfait',
  basics_fr_passe_simple: 'passe-simple',
  futur_fr: 'futur',
  basics_fr_hypothese: 'conditionnel',
  conditionnel_passe: 'conditionnel-passe',
  subjonctif: 'subjonctif',
  basics_fr_subjonctif_passe: 'subjonctif-passe',
  basics_fr_imperatif: 'imperatif',
  basics_es_presente: 'presente',
  basics_es_preterito: 'perfecto',
  basics_es_perfecto_indefinido: 'preterito',
  preterito_imperfecto: 'imperfecto',
  basics_es_pluscuamperfecto: 'pluscuamperfecto',
  basics_es_futuro: 'futuro',
  basics_es_probabilidad: 'futuro-perfecto',
  condicionales: 'condicional',
  subjuntivo: 'subjuntivo',
  basics_es_imperfecto_subjuntivo: 'subjuntivo-imperfecto',
  basics_es_subjuntivo_compuesto: 'subjuntivo-perfecto',
  imperativo_es: 'imperativo',
}

/** The topic of the lesson that teaches a tense, when there is one (the basic lesson of the tense first). */
export function topicOfTense(tense: string): string | undefined {
  return Object.keys(LESSON_TENSE).find((t) => LESSON_TENSE[t] === tense)
}
