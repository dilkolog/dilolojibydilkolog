import { describe, expect, it } from 'vitest'
import { ASPECT_PAIR } from './aspectPair'

describe('aspectPair', () => {
  it('defines the two contrasting past tenses for French (passé composé vs imparfait)', () => {
    expect(ASPECT_PAIR.fr).toEqual(['passe-compose', 'imparfait'])
  })

  it('defines the two contrasting past tenses for Spanish (pretérito vs imperfecto)', () => {
    expect(ASPECT_PAIR.es).toEqual(['preterito', 'imperfecto'])
  })
})
