import { describe, expect, it } from 'vitest'
import { sentencesOf } from './TranslateScreen'

describe('translation screen', () => {
  it('cuts a text into sentences, lines apart, none longer than one request', () => {
    expect(sentencesOf('Le chat dort. Il fait beau!\nÇa va ?  Oui…')).toEqual(['Le chat dort.', 'Il fait beau!', 'Ça va ?', 'Oui…'])
    expect(sentencesOf('  ')).toEqual([])
    const long = `${'mot '.repeat(200)}fin.`
    expect(sentencesOf(long).every((s) => s.length <= 600)).toBe(true)
    expect(sentencesOf(long).join(' ')).toBe(long.replace(/\s+/g, ' ').trim())
  })
})
