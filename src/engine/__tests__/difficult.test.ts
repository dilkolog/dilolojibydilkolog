import { describe, expect, it } from 'vitest'
import { difficultWords, isDifficult, withDifficult } from '../difficult'
import type { TargetLanguage } from '../types'
import { decision } from './fixtures'

const word = (id: string, language: TargetLanguage) => ({ ...decision, id, language })

describe('difficult words', () => {
  it('marks and clears without leaving a field behind', () => {
    const e = word('fr:chat', 'fr')
    const marked = withDifficult(e, true)
    expect(isDifficult(marked)).toBe(true)
    const cleared = withDifficult(marked, false)
    expect(isDifficult(cleared)).toBe(false)
    expect('difficult' in cleared).toBe(false)
    expect(e.difficult).toBeUndefined()
  })

  it('gathers the marked words, of one language or all', () => {
    const words = [withDifficult(word('fr:a', 'fr'), true), word('fr:b', 'fr'), withDifficult(word('es:c', 'es'), true)]
    expect(difficultWords(words).map((w) => w.id)).toEqual(['fr:a', 'es:c'])
    expect(difficultWords(words, 'fr').map((w) => w.id)).toEqual(['fr:a'])
  })
})
