import { Rating } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { gradeAttempt } from '../grading'

const base = { verdict: 'correct' as const, hintsUsed: 0, maxHints: 3 }

describe('gradeAttempt (evidence-based, no self-rating)', () => {
  it('wrong → Again', () => {
    expect(gradeAttempt({ ...base, verdict: 'wrong', exerciseType: 'mc_meaning', responseMs: 1000 })).toBe(Rating.Again)
  })
  it('all hints used → Again even if correct', () => {
    expect(gradeAttempt({ ...base, hintsUsed: 3, exerciseType: 'typed_translation', responseMs: 5000 })).toBe(Rating.Again)
  })
  it('near miss or any hint → Hard', () => {
    expect(gradeAttempt({ ...base, verdict: 'near', exerciseType: 'typed_translation', responseMs: 3000 })).toBe(Rating.Hard)
    expect(gradeAttempt({ ...base, hintsUsed: 1, exerciseType: 'typed_translation', responseMs: 3000 })).toBe(Rating.Hard)
  })
  it('very slow → Hard', () => {
    expect(gradeAttempt({ ...base, exerciseType: 'typed_translation', responseMs: 30000 })).toBe(Rating.Hard)
  })
  it('fast typed recall → Easy, fast multiple choice → only Good (could be a guess)', () => {
    expect(gradeAttempt({ ...base, exerciseType: 'typed_translation', responseMs: 2000 })).toBe(Rating.Easy)
    expect(gradeAttempt({ ...base, exerciseType: 'mc_meaning', responseMs: 500 })).toBe(Rating.Good)
  })
  it('normal correct answer → Good', () => {
    expect(gradeAttempt({ ...base, exerciseType: 'typed_translation', responseMs: 7000 })).toBe(Rating.Good)
  })
})

describe('confidence', () => {
  it('a correct answer given while unsure counts as Hard', async () => {
    const { Rating } = await import('ts-fsrs')
    const { gradeAttempt } = await import('../grading')
    const base = { exerciseType: 'typed_translation' as const, verdict: 'correct' as const, responseMs: 5000, hintsUsed: 0, maxHints: 3 }
    expect(gradeAttempt({ ...base, confidence: 'sure' })).toBe(Rating.Good)
    expect(gradeAttempt({ ...base, confidence: 'unsure' })).toBe(Rating.Hard)
    expect(gradeAttempt({ ...base, verdict: 'wrong', confidence: 'unsure' })).toBe(Rating.Again)
  })
})
