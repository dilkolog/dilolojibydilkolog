import { createEmptyCard, State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { buildDailyPlan, MAX_TROUBLE_ITEMS, type PlanInput } from '../dailyPlan'
import { createScheduler } from '../scheduler'
import { troubleWords } from '../trouble'
import { SKILLS, type UserWordState, type VocabularyEntry } from '../types'
import { CATALOG, EN_CATALOG } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00Z')
const tries = (...scores: number[]) => scores.map((score, i) => ({ at: `2026-10-0${i + 1}T09:00:00Z`, score }))
const en = (id: string) => EN_CATALOG.find((e) => e.id === id)!

/** A word known well enough for listening to be unlocked, nothing due for weeks. */
function steady(entry: VocabularyEntry, over: Partial<UserWordState> = {}): UserWordState {
  const card = (stability: number) => ({ ...createEmptyCard(new Date('2026-09-01T00:00:00Z')), state: State.Review, reps: 5, stability, due: new Date('2026-12-01T00:00:00Z'), last_review: new Date('2026-09-20T00:00:00Z') })
  return {
    entryId: entry.id,
    language: entry.language,
    introducedAt: new Date('2026-09-01T00:00:00Z'),
    skills: Object.fromEntries(SKILLS.map((k) => [k, card(30)])),
    lastReviewAt: new Date('2026-09-20T00:00:00Z'),
    stats: { reviews: 5, correct: 5, wrong: 0, hints: 0, totalResponseMs: 15000, consecutiveWrong: 0 },
    ...over,
  }
}

describe('troubleWords', () => {
  it('finds words dictation still misses (by the word or a form it was met in) and words scored low by voice', () => {
    const decide = en('en:decide')
    const withForm = { ...en('en:improve'), senses: [{ ...en('en:improve').senses[0], examples: [{ text: 'It *improved* a lot.', translation: '', form: 'improved' }] }] }
    const log = {
      en: {
        decide: { n: 3, ok: 1, last: '2026-10-09T00:00:00Z', sentence: 'I decide.' },
        improved: { n: 2, ok: 0, last: '2026-10-09T00:00:00Z', sentence: 'It improved.' },
        leave: { n: 1, ok: 1, last: '2026-10-09T00:00:00Z', sentence: 'x' },
      },
    }
    const t = troubleWords([decide, withForm, en('en:leave'), en('en:effect')], 'en', log, { 'en:effect': tries(40, 50), 'en:decide': tries(10) })
    expect([...t.keys()].sort()).toEqual(['en:decide', 'en:effect', 'en:improve'])
    expect(t.get('en:decide')).toEqual({ kind: 'ear', weight: 2 })
    expect(t.get('en:improve')).toMatchObject({ kind: 'ear', weight: 2 })
    expect(t.get('en:effect')).toMatchObject({ kind: 'voice' })
  })

  it('also finds a form met in a later sense of the word', () => {
    const base = en('en:improve')
    const second = { ...base, senses: [base.senses[0], { ...base.senses[0], gloss: 'second', examples: [{ text: 'It *improves* things.', translation: '', form: 'improves' }] }] }
    const log = { en: { improves: { n: 3, ok: 0, last: '2026-10-09T00:00:00Z', sentence: 'It improves.' } } }
    expect(troubleWords([second], 'en', log, {}).get('en:improve')).toMatchObject({ kind: 'ear', weight: 3 })
  })

  it('is empty without trouble and ignores other languages', () => {
    expect(troubleWords(CATALOG, 'en', {}, {}).size).toBe(0)
    expect(troubleWords(CATALOG, 'fr', { en: { decide: { n: 5, ok: 0, last: '2026-10-09T00:00:00Z', sentence: 'x' } } }, {}).size).toBe(0)
  })
})

describe('the day\'s plan with trouble', () => {
  const settings = { language: 'en' as const, dailyMinutes: 30, newWordsPerDay: 0 }
  const plan = (over: Partial<PlanInput>) =>
    buildDailyPlan({ now: NOW, settings, catalog: EN_CATALOG, states: [], mistakes: [], scheduler, seed: 3, ...over })
  const words = ['en:decide', 'en:effect', 'en:affect', 'en:leave', 'en:improve']

  it('adds a listening question for a word the ear misses, even though nothing is due', () => {
    const states = words.map((id) => steady(en(id)))
    expect(plan({ states }).items).toEqual([])
    const trouble = new Map([['en:decide', { kind: 'ear' as const, weight: 3 }]])
    const items = plan({ states, trouble }).items
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ entryId: 'en:decide', skill: 'listening', exerciseType: 'listen_type', reason: 'weak' })
  })

  it('uses a choice for the voice, puts the ear first and keeps to the daily cap', () => {
    const states = words.map((id) => steady(en(id)))
    const trouble = new Map<string, { kind: 'ear' | 'voice'; weight: number }>([
      ['en:decide', { kind: 'voice', weight: 2 }],
      ['en:effect', { kind: 'ear', weight: 1 }],
      ['en:affect', { kind: 'ear', weight: 4 }],
      ['en:leave', { kind: 'voice', weight: 3 }],
      ['en:improve', { kind: 'ear', weight: 2 }],
    ])
    const items = plan({ states, trouble }).items
    expect(items).toHaveLength(MAX_TROUBLE_ITEMS)
    expect(items.map((i) => i.entryId).sort()).toEqual(['en:affect', 'en:effect', 'en:improve'])
    const voiceOnly = plan({ states, trouble: new Map([['en:decide', { kind: 'voice' as const, weight: 1 }]]) }).items
    expect(voiceOnly[0]).toMatchObject({ exerciseType: 'listen_choose' })
  })

  it('does not repeat a word whose listening is already due, or one practised by ear today, or one not yet recalled', () => {
    const decide = en('en:decide')
    const due = steady(decide)
    due.skills.listening = { ...due.skills.recall!, due: new Date('2026-10-01T00:00:00Z') }
    const heard = steady(en('en:effect'), { lastReviewAt: new Date('2026-10-10T07:00:00Z'), lastExerciseType: 'listen_type' })
    const fresh = steady(en('en:affect'))
    fresh.skills = { recognition: fresh.skills.recognition }
    const trouble = new Map([decide.id, 'en:effect', 'en:affect'].map((id) => [id, { kind: 'ear' as const, weight: 1 }]))
    const items = plan({ states: [due, heard, fresh], trouble }).items
    const listening = items.filter((i) => i.skill === 'listening')
    expect(listening.filter((i) => i.entryId === decide.id)).toHaveLength(1) // the due one, not a second
    expect(listening.map((i) => i.entryId)).not.toContain('en:effect')
    expect(listening.map((i) => i.entryId)).not.toContain('en:affect')
  })
})
