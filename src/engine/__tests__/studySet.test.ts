import { describe, expect, it } from 'vitest'
import { newWordState, processAttempt } from '../review'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import { dealCards, DEFAULT_STUDY, selectStudyWords, type StudyOptions } from '../studySet'
import type { UserWordState, VocabularyEntry } from '../types'
import { affect, decide, decision, effect } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00')

const learned = (e: VocabularyEntry, at: Date, ok = true): UserWordState =>
  processAttempt(newWordState(e, at), { exerciseType: 'mc_meaning', verdict: ok ? 'correct' : 'wrong', responseMs: 3000, hintsUsed: 0, maxHints: 0, at }, [], scheduler, () => 'x').state

const pick = (vocab: VocabularyEntry[], states: UserWordState[], o: Partial<StudyOptions>, seed = 1) =>
  selectStudyWords(vocab, states, scheduler, NOW, { ...DEFAULT_STUDY, size: 0, ...o }, createRng(seed)).map((e) => e.id)

describe('selectStudyWords', () => {
  const yesterday = new Date(NOW.getTime() - 86_400_000)
  const states = [learned(decision, yesterday), learned(decide, NOW), learned(affect, yesterday, false)]
  const vocab = [decision, decide, affect, effect]

  it('takes the learned words weakest first, and leaves out words never met', () => {
    const ids = pick(vocab, states, { scope: 'weak' })
    expect(ids).toHaveLength(3)
    expect(ids).not.toContain(effect.id)
    expect(ids[0]).toBe(affect.id)
  })

  it('today: only the words met today; unlearned: only the ones with no state yet', () => {
    expect(pick(vocab, states, { scope: 'today' })).toEqual([decide.id])
    expect(pick(vocab, states, { scope: 'unlearned' })).toEqual([effect.id])
  })

  it('hard: the marked words, learned or not; list: the words of that list', () => {
    const marked = vocab.map((e) => (e.id === effect.id ? { ...e, difficult: true } : e))
    expect(pick(marked, states, { scope: 'hard' })).toEqual([effect.id])
    const inList = vocab.map((e) => (e.id === decide.id || e.id === effect.id ? { ...e, listId: 'l1' } : e))
    expect(pick(inList, states, { scope: 'list', listId: 'l1' }).sort()).toEqual([decide.id, effect.id].sort())
    expect(pick(inList, states, { scope: 'list' })).toEqual([])
  })

  it('shuffles from the whole set before cutting it to the size', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...decision, id: `w${i}`, lemma: `w${i}` }) as VocabularyEntry)
    const st = many.map((e) => learned(e, yesterday))
    const first20 = pick(many, st, { scope: 'all', size: 20 })
    const mixed = pick(many, st, { scope: 'all', size: 20, shuffle: true }, 7)
    expect(first20).toHaveLength(20)
    expect(mixed).toHaveLength(20)
    expect(mixed).not.toEqual(first20)
    expect(new Set(mixed).size).toBe(20)
  })
})

describe('dealCards', () => {
  const words = [decision, decide, affect, effect]
  it('forward and reverse are fixed; mixed gives both', () => {
    expect(dealCards(words, 'forward', createRng(1)).every((c) => !c.reverse)).toBe(true)
    expect(dealCards(words, 'reverse', createRng(1)).every((c) => c.reverse)).toBe(true)
    const many = Array.from({ length: 40 }, () => decision)
    const mixed = dealCards(many, 'mixed', createRng(3)).map((c) => c.reverse)
    expect(mixed).toContain(true)
    expect(mixed).toContain(false)
  })
})
