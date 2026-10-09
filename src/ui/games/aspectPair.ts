import type { Tense } from '../../engine/tenses'

/** The two past tenses the choice is between, in each language. */
export const ASPECT_PAIR: Record<'fr' | 'es', [Tense, Tense]> = {
  fr: ['passe-compose', 'imparfait'],
  es: ['preterito', 'imperfecto'],
}
