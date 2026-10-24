import { describe, expect, it } from 'vitest'
import { easiestWords, EASY_COUNT, struggling } from '../easyRound'
import { newWordState } from '../review'
import type { UserWordState, VocabularyEntry } from '../types'
import { abandon, affect, decide, decision, effect, improve, leave } from './fixtures'

const now = new Date('2026-10-24T10:00:00Z')
const words: VocabularyEntry[] = [decision, decide, affect, effect, abandon, leave, improve]
const vocabulary = new Map(words.map((w) => [w.id, w]))

const known = (entry: VocabularyEntry, memory: number, reps = 5, wrong = 0): UserWordState => {
  const s = newWordState(entry, now)
  return {
    ...s,
    skills: { recognition: { due: now, stability: memory, difficulty: 5, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps, lapses: 0, state: 2, last_review: now } },
    stats: { ...s.stats, reviews: 10, wrong },
  }
}
const run = (marks: string) => [...marks].map((m) => ({ verdict: m === 'x' ? 'wrong' : m === 'o' ? 'correct' : undefined }))

describe('a bad stretch', () => {
  it('is three graded answers wrong in a row', () => {
    expect(struggling(run('oxxx'))).toBe(true)
    expect(struggling(run('xxox'))).toBe(false)
    expect(struggling(run('xx'))).toBe(false)
  })

  it('does not count what was not graded (an introduction between the misses)', () => {
    expect(struggling(run('xx-x'))).toBe(true)
    expect(struggling(run('x-xo'))).toBe(false)
  })
})

describe('easy questions for it', () => {
  it('takes the words with the longest memory, three of them', () => {
    const states = [known(decision, 5), known(decide, 40), known(affect, 20), known(effect, 90), known(abandon, 10)]
    expect(easiestWords(states, vocabulary, new Set())).toEqual([effect.id, decide.id, affect.id])
    expect(EASY_COUNT).toBe(3)
  })

  it('leaves out words just missed, words still shaky, retired or hardly met ones', () => {
    const states = [known(decision, 90), known(decide, 80, 5, 6), { ...known(affect, 70), retired: true }, known(effect, 60, 2), known(abandon, 50), known(leave, 40)]
    expect(easiestWords(states, vocabulary, new Set([decision.id]))).toEqual([abandon.id, leave.id])
  })
})
