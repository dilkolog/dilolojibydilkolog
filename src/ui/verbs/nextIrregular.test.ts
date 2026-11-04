import { beforeAll, describe, expect, it } from 'vitest'
import { loadTenses } from '../../data/tenseData'
import { irregularIn, nextIrregular } from './nextIrregular'

beforeAll(async () => {
  await loadTenses('es')
  await loadTenses('fr')
})

describe('the next irregular verb in the same tense', () => {
  it('knows irregular from regular in a tense', () => {
    expect(irregularIn('es', 'hacer', 'futuro')).toBe(true)
    expect(irregularIn('es', 'hablar', 'futuro')).toBe(false)
    expect(irregularIn('es', 'tener', 'presente')).toBe(true)
    expect(irregularIn('fr', 'être', 'futur')).toBe(true)
    expect(irregularIn('fr', 'parler', 'futur')).toBe(false)
  })

  it('goes down the frequency list, skipping regular verbs and the ones done', () => {
    const order = ['ser', 'hablar', 'tener', 'comer', 'hacer', 'poder', 'vivir', 'decir']
    expect(nextIrregular('es', 'futuro', 'ser', order)).toBe('tener')
    expect(nextIrregular('es', 'futuro', 'tener', order)).toBe('hacer')
    expect(nextIrregular('es', 'futuro', 'tener', order, new Set(['hacer']))).toBe('poder')
    // Past the end it starts again from the top; a verb not on the list starts from the top.
    expect(nextIrregular('es', 'futuro', 'decir', order)).toBe('tener')
    expect(nextIrregular('es', 'futuro', 'salir', order)).toBe('tener')
  })

  it('says so when no other irregular is left', () => {
    expect(nextIrregular('es', 'futuro', 'tener', ['hablar', 'tener', 'comer'])).toBeNull()
    expect(nextIrregular('es', 'futuro', 'hablar', ['hablar', 'tener'], new Set(['tener']))).toBeNull()
  })
})
