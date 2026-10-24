import { describe, expect, it } from 'vitest'
import { dailyTalkWords } from '../dailyTalk'
import { recordMistake } from '../mistakes'
import { newWordState } from '../review'
import type { Mistake, UserWordState, VocabularyEntry } from '../types'
import { abandon, affect, decide, decision, effect, improve, leave } from './fixtures'

const now = new Date('2026-10-24T10:00:00Z')
const words: VocabularyEntry[] = [decision, decide, affect, effect, abandon, leave, improve]

const learning = (entry: VocabularyEntry, stats: Partial<UserWordState['stats']> = {}): UserWordState => {
  const s = newWordState(entry, now)
  return { ...s, stats: { ...s.stats, reviews: 4, ...stats } }
}
const miss = (entryId: string, times = 1): Mistake[] => {
  let bank: Mistake[] = []
  for (let i = 0; i < times; i++) bank = recordMistake(bank, { entryId, errorType: 'typo', exerciseType: 'typed_translation', given: 'x', expected: 'y', at: now })
  return bank
}

describe('the words of the day\'s talk', () => {
  it('starts with the words that went wrong most, then the weakest of the rest', () => {
    const states = [learning(decision, { wrong: 0 }), learning(decide, { wrong: 3 }), learning(affect, { wrong: 1 }), learning(effect, { wrong: 2 })]
    const bank = [...miss(affect.id, 3), ...miss(decision.id, 1)]
    expect(dailyTalkWords(words, states, bank, now, 4)).toEqual(['affect', 'decision', 'decide', 'effect'])
  })

  it('offers no talk with fewer than three words to talk about', () => {
    expect(dailyTalkWords(words, [learning(decision), learning(decide)], [], now)).toEqual([])
    expect(dailyTalkWords(words, [], [], now)).toEqual([])
  })

  it('leaves out words that were retired and never repeats one', () => {
    const states = [learning(decision), { ...learning(decide), retired: true }, learning(affect), learning(effect)]
    const out = dailyTalkWords(words, states, [...miss(decision.id), ...miss(decision.id)], now)
    expect(out).not.toContain('decide')
    expect(new Set(out).size).toBe(out.length)
    expect(out).toHaveLength(3)
  })

  it('writes a word with its article, as it is learned', () => {
    const states = [learning(decision)]
    expect(dailyTalkWords([{ ...decision, article: 'la' }, decide, affect], [...states, learning(decide), learning(affect)], [], now)).toContain('la decision')
  })
})
