import { describe, expect, it } from 'vitest'
import { saidForm } from './spokenForm'

describe('a spoken form', () => {
  it('is found among the alternatives, with or without the subject', () => {
    expect(saidForm(['nous avons parlé'], 'avons parlé', 'fr')).toBe(true)
    expect(saidForm(['Nous avons parlé.'], 'nous avons parlé', 'fr')).toBe(true)
    expect(saidForm(['tenemos'], 'tenemos', 'es')).toBe(true)
    expect(saidForm(['tienen', 'tenemos'], 'tenemos', 'es')).toBe(true)
  })

  it('in French, spellings that sound the same count; heard endings still differ', () => {
    expect(saidForm(['tu parle'], 'parles', 'fr')).toBe(true)
    expect(saidForm(['ils finissent'], 'finissent', 'fr')).toBe(true)
    expect(saidForm(['vous parlez'], 'parlons', 'fr')).toBe(false)
    expect(saidForm(['je parlais'], 'parle', 'fr')).toBe(false)
  })

  it('in Spanish, every ending counts', () => {
    expect(saidForm(['hablas'], 'habla', 'es')).toBe(false)
    expect(saidForm(['hablo'], 'habló', 'es')).toBe(false)
    expect(saidForm(['il parle'], 'a parlé', 'fr')).toBe(false)
  })
})
