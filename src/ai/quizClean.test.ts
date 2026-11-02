import { describe, expect, it } from 'vitest'
import { cleanQuestions } from './quizClean'

const q = (over: Partial<Parameters<typeof cleanQuestions>[0][number]> = {}) => ({ question: 'Metin ne anlatıyor?', options: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'Çünkü.', ...over })

describe('cleanQuestions', () => {
  it('keeps well-formed questions', () => {
    expect(cleanQuestions([q()], 3)).toHaveLength(1)
  })
  it('drops questions that cannot be answered or are ambiguous', () => {
    const bad = [q({ options: ['a', 'b', 'c'] }), q({ answer: 4 }), q({ answer: 1.5 }), q({ options: ['a', 'A ', 'c', 'd'] }), q({ question: '  ' })]
    expect(cleanQuestions(bad, 5)).toEqual([])
  })
  it('stops at the asked count', () => {
    expect(cleanQuestions([q(), q({ question: 'İkinci?' }), q({ question: 'Üçüncü?' }), q({ question: 'Dördüncü?' })], 3)).toHaveLength(3)
  })
  it('drops what the model sent in the wrong shape instead of throwing', () => {
    const junk = [null, 5, 'x', [], { question: 5 }, { question: 'a?', options: 'abcd', answer: 0 }, { question: 'a?', options: [1, 2, 3, 4], answer: 0 }] as never
    expect(cleanQuestions(junk, 5)).toEqual([])
    expect(cleanQuestions(null as never, 5)).toEqual([])
  })
})
