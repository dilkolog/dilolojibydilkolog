import { beforeAll, describe, expect, it } from 'vitest'
import { loadTenses } from '../data/tenseData'
import { irregularIn, nextIrregular } from './irregularNext'

beforeAll(async () => {
  await loadTenses('es')
  await loadTenses('fr')
})

describe('nextIrregular', () => {
  it('knows which verbs are irregular in a tense', () => {
    expect(irregularIn('es', 'hacer', 'futuro')).toBe(true)
    expect(irregularIn('es', 'hablar', 'futuro')).toBe(false)
    expect(irregularIn('fr', 'aller', 'futur')).toBe(true)
  })

  it('goes on to the next irregular verb in the order, skipping regular ones', () => {
    const order = ['hablar', 'hacer', 'comer', 'tener', 'vivir', 'poder']
    expect(nextIrregular('es', 'hacer', 'futuro', order)).toBe('tener')
    expect(nextIrregular('es', 'tener', 'futuro', order)).toBe('poder')
    // Wraps round to the start.
    expect(nextIrregular('es', 'poder', 'futuro', order)).toBe('hacer')
    // A verb outside the list starts from the most common.
    expect(nextIrregular('es', 'salir', 'futuro', order)).toBe('hacer')
  })

  it('finds nothing when no other verb is irregular there', () => {
    expect(nextIrregular('es', 'hacer', 'futuro', ['hablar', 'comer', 'hacer'])).toBeUndefined()
  })
})
