import { describe, expect, it } from 'vitest'
import { BACKLOG_AT, buildDailyPlan, buildExtraNewPlan, interleave, shortRound, SHORT_ROUND, isFormId, MAX_DAY_FORMS, mixForms, type PlanInput, type PlanItem } from '../dailyPlan'
import { recordMistake } from '../mistakes'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import type { UserWordState, VocabularyEntry } from '../types'
import { abandon, affect, CATALOG, decide, decision, effect, EN_CATALOG, improve, leave } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

const settings = { language: 'en' as const, dailyMinutes: 12, newWordsPerDay: 4 }
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  now: NOW,
  settings,
  catalog: CATALOG,
  states: [],
  mistakes: [],
  scheduler,
  seed: 7,
  ...over,
})

function learned(entry: VocabularyEntry, at: Date, verdict: 'correct' | 'wrong' = 'correct'): UserWordState {
  return processAttempt(
    newWordState(entry, at),
    { exerciseType: 'mc_meaning', verdict, responseMs: 3000, hintsUsed: 0, maxHints: 0, at },
    [],
    scheduler,
    () => 'x',
  ).state
}

describe('new words', () => {
  it('introduces sample words most frequent first, in the chosen language', () => {
    const plan = buildDailyPlan(input())
    expect(plan.newEntryIds.length).toBeGreaterThan(0)
    expect(plan.newEntryIds.every((id) => id.startsWith('en:'))).toBe(true)
    expect(plan.newEntryIds[0]).toBe('en:leave')
  })

  it('says why no more new words were added, and how many are waiting', () => {
    const plan = buildDailyPlan(input({ settings: { ...settings, newWordsPerDay: 2, dailyMinutes: 60 } }))
    expect(plan.newEntryIds).toHaveLength(2)
    expect(plan.newBlockedBy).toBe('limit')
    expect(plan.waitingNew).toBe(EN_CATALOG.length - 2)
    const all = buildDailyPlan(input({ catalog: [], states: [] }))
    expect(all.newBlockedBy).toBe('none_left')
    const backlog = buildDailyPlan(input({ states: EN_CATALOG.slice(0, 5).map((e) => learned(e, daysAgo(20))), settings: { ...settings, dailyMinutes: 0.5 } }))
    expect(backlog.newBlockedBy).toBe('backlog')
  })

  it("counts a new word's two follow-ups in the session, so the day fits the minutes given", () => {
    // Intro 20 s + first test 8 s + follow-ups (choice 8 s, typed 12 s) ≈ 48 s a word: two minutes hold two.
    const plan = buildDailyPlan(input({ settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 2 } }))
    expect(plan.newEntryIds).toHaveLength(2)
    expect(plan.newBlockedBy).toBe('budget')
    expect(plan.estimatedMinutes).toBe(2)
  })

  it('can add extra new words beyond the daily limit on request', () => {
    const states = [learned(decide, NOW), learned(decision, NOW), learned(affect, NOW), learned(effect, NOW)]
    const limited = buildDailyPlan(input({ states }))
    expect(limited.newEntryIds).toEqual([])
    const extra = buildExtraNewPlan(input({ states }), 2)
    expect(extra.filter((i) => i.kind === 'introduce')).toHaveLength(2)
  })

  it("introduces the user's own words first, in the order added, regardless of level", () => {
    const own = (lemma: string, day: number): VocabularyEntry => ({
      ...leave,
      id: `en:${lemma}`,
      lemma,
      cefr: 'C2',
      frequencyRank: 99999,
      source: 'user',
      addedAt: daysAgo(day),
    })
    const plan = buildDailyPlan(input({ catalog: [...CATALOG, own('later', 1), own('earlier', 3)] }))
    expect(plan.newEntryIds.slice(0, 2)).toEqual(['en:earlier', 'en:later'])
  })

  it('counts words already introduced today toward the daily limit', () => {
    const earlier = new Date(NOW.getTime() - 3600_000)
    const states = [learned(improve, earlier), learned(decide, earlier), learned(decision, earlier)]
    const plan = buildDailyPlan(input({ states, settings: { ...settings, newWordsPerDay: 4, dailyMinutes: 60 } }))
    expect(plan.newEntryIds).toHaveLength(1)
  })

  it('never introduces two confusable words together (interference control)', () => {
    const plan = buildDailyPlan(input({ settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 60 } }))
    const both = ['en:affect', 'en:effect'].filter((id) => plan.newEntryIds.includes(id))
    expect(both.length).toBe(1)
  })

  it('waits for the interference window after a related word was introduced', () => {
    const recent = buildDailyPlan(input({ states: [learned(effect, daysAgo(1))], settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 60 } }))
    expect(recent.newEntryIds).not.toContain('en:affect')
    const later = buildDailyPlan(input({ states: [learned(effect, daysAgo(5))], settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 60 } }))
    expect(later.newEntryIds).toContain('en:affect')
  })

  it('each new word gets an introduction before its first exercise, with a gap', () => {
    const plan = buildDailyPlan(input({ settings: { ...settings, dailyMinutes: 30 } }))
    for (const id of plan.newEntryIds) {
      const intro = plan.items.findIndex((i) => i.entryId === id && i.kind === 'introduce')
      const test = plan.items.findIndex((i) => i.entryId === id && i.kind === 'exercise')
      expect(intro).toBeGreaterThanOrEqual(0)
      expect(test).toBeGreaterThan(intro)
    }
  })
})

describe('reviews', () => {
  it('puts forgotten words first and labels reasons', () => {
    const forgotten = learned(decision, daysAgo(30))
    const plan = buildDailyPlan(input({ states: [forgotten], settings: { ...settings, newWordsPerDay: 0 } }))
    expect(plan.items[0]).toMatchObject({ entryId: 'en:decision', reason: 'forgotten', kind: 'exercise' })
    expect(plan.counts.forgotten).toBe(1)
  })

  it('adds words with open mistakes even when not due', () => {
    // Met three days ago (a word met yesterday is also asked in a sentence; see "the day after").
    const s = learned(decide, daysAgo(3))
    const fresh = { ...s, skills: { recognition: { ...s.skills.recognition!, due: daysAgo(-5) } } }
    const mistakes = recordMistake([], {
      entryId: 'en:decide',
      errorType: 'meaning',
      exerciseType: 'mc_meaning',
      given: 'x',
      expected: 'karar vermek',
      at: daysAgo(1),
    })
    const plan = buildDailyPlan(input({ states: [fresh], mistakes, settings: { ...settings, newWordsPerDay: 0 } }))
    expect(plan.items).toEqual([expect.objectContaining({ entryId: 'en:decide', reason: 'mistake' })])
  })

  it('a review backlog larger than the budget blocks new words and is trimmed to fit', () => {
    const states = EN_CATALOG.map((e) => learned(e, daysAgo(20)))
    const plan = buildDailyPlan(input({ states, settings: { ...settings, dailyMinutes: 1 } }))
    expect(plan.newEntryIds).toEqual([])
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(1)
    expect(plan.items.length).toBeLessThan(states.length)
  })

  it('is deterministic for the same seed', () => {
    const states = [abandon, affect, improve, leave].map((e) => learned(e, daysAgo(4)))
    expect(buildDailyPlan(input({ states }))).toEqual(buildDailyPlan(input({ states })))
  })
})

describe('interleave', () => {
  it('avoids the same exercise type or word back to back when possible', () => {
    const items: PlanItem[] = [
      ...['a', 'b', 'c'].map((e) => ({ kind: 'exercise' as const, entryId: e, reason: 'due' as const, skill: 'recognition' as const, exerciseType: 'mc_meaning' as const })),
      ...['d', 'e', 'f'].map((e) => ({ kind: 'exercise' as const, entryId: e, reason: 'due' as const, skill: 'recall' as const, exerciseType: 'typed_translation' as const })),
    ]
    const out = interleave(items, () => 0.5)
    for (let i = 1; i < out.length; i++) expect(out[i].exerciseType).not.toBe(out[i - 1].exerciseType)
  })
})

describe('habits', () => {
  it('with frequency first, own words come most frequent first, unknown frequency last', async () => {
    const { newWordCandidates } = await import('../dailyPlan')
    const own = (e: VocabularyEntry, rank: number, addedDay: number): VocabularyEntry => ({ ...e, source: 'user', frequencyRank: rank, addedAt: daysAgo(addedDay) })
    // (abandon and leave are synonyms and would not be introduced together.)
    const catalog = [own(abandon, 6000, 3), own(improve, 0, 2), own(decision, 500, 1)]
    const byAdded = newWordCandidates(input({ catalog }), 3).map((e) => e.id)
    expect(byAdded).toEqual(['en:abandon', 'en:improve', 'en:decision'])
    const byFreq = newWordCandidates(input({ catalog, settings: { ...settings, frequencyFirst: true } }), 3).map((e) => e.id)
    expect(byFreq).toEqual(['en:decision', 'en:abandon', 'en:improve'])
  })

  it('words met yesterday come first among equally due reviews', () => {
    const old = learned(decide, daysAgo(3))
    const fresh = learned(improve, daysAgo(1))
    // Same retrievability situation: both due now with the same reason.
    const states = [
      { ...old, skills: { recognition: { ...old.skills.recognition!, due: daysAgo(0.1) } } },
      { ...fresh, skills: { recognition: { ...fresh.skills.recognition!, due: daysAgo(0.1) } } },
    ]
    const plan = buildDailyPlan(input({ catalog: EN_CATALOG, states, settings: { ...settings, newWordsPerDay: 0 } }))
    const reviews = plan.items.filter((i) => i.kind === 'exercise' && i.reason !== 'new').map((i) => i.entryId)
    expect(reviews.indexOf('en:improve')).toBeLessThan(reviews.indexOf('en:decide'))
  })
})

describe('the day after', () => {
  it('a word met yesterday is also asked inside a sentence, one met earlier is not', () => {
    const states = [learned(decide, daysAgo(1)), learned(affect, daysAgo(4))].map((s) => ({
      ...s,
      skills: { recognition: { ...s.skills.recognition!, due: daysAgo(0.1) } },
    }))
    const plan = buildDailyPlan(input({ states, settings: { ...settings, newWordsPerDay: 0, dailyMinutes: 30 } }))
    const of = (id: string) => plan.items.filter((i) => i.entryId === id).map((i) => i.exerciseType)
    expect(of('en:decide')).toContain('mc_context')
    expect(of('en:affect')).not.toContain('mc_context')
  })
})

describe('a word list in focus', () => {
  const own = (lemma: string, day: number, listId?: string): VocabularyEntry => ({
    ...leave,
    id: `en:${lemma}`,
    lemma,
    frequencyRank: 99999,
    source: 'user',
    addedAt: daysAgo(day),
    relations: [],
    ...(listId ? { listId } : {}),
  })
  const catalog = [own('airport', 5, 'travel'), own('salary', 6, 'work'), own('ticket', 4, 'travel'), own('meeting', 7, 'work'), own('gate', 3, 'travel')]

  it('takes new words only from that list, in its order', () => {
    const plan = buildDailyPlan(input({ catalog, settings: { ...settings, newWordsPerDay: 5, dailyMinutes: 60, focusListId: 'travel' } }))
    expect(plan.newEntryIds).toEqual(['en:airport', 'en:ticket', 'en:gate'])
    expect(plan.focusDone).toBe(true)
  })

  it('follows the list’s levels in the learner’s order', () => {
    const leveled = [own('airport', 5, 'travel'), own('ticket', 4, 'travel'), own('gate', 3, 'travel')].map((e, i) => ({ ...e, levelId: ['b', 'a', 'b'][i] }))
    const plan = buildDailyPlan(input({ catalog: leveled, settings: { ...settings, newWordsPerDay: 5, dailyMinutes: 60, focusListId: 'travel', focusLevels: ['a', 'b'] } }))
    expect(plan.newEntryIds).toEqual(['en:ticket', 'en:airport', 'en:gate'])
  })

  it('still reviews words of other lists', () => {
    const states = [learned(catalog[1], daysAgo(20))]
    const plan = buildDailyPlan(input({ catalog, states, settings: { ...settings, newWordsPerDay: 1, dailyMinutes: 60, focusListId: 'travel' } }))
    expect(plan.items.some((i) => i.entryId === 'en:salary' && i.kind === 'exercise')).toBe(true)
    expect(plan.newEntryIds).toEqual(['en:airport'])
    expect(plan.focusDone).toBeUndefined()
  })
})

describe('verb lab forms in the day', () => {
  const item = (id: string): PlanItem => ({ kind: 'exercise', entryId: id, reason: 'due', skill: 'recognition', exerciseType: 'mc_meaning' })
  const form = (verb: string) => ({ language: 'fr' as const, verb, tense: 'present', person: 1 })

  it('spreads up to three forms through the session, never first or last', () => {
    const items = Array.from({ length: 12 }, (_, i) => item(`en:w${i}`))
    const mixed = mixForms(items, [form('aller'), form('faire'), form('venir'), form('dire')])
    const at = mixed.flatMap((it, i) => (it.form ? [i] : []))
    expect(at).toHaveLength(MAX_DAY_FORMS)
    expect(at[0]).toBeGreaterThan(0)
    expect(at.at(-1)!).toBeLessThan(mixed.length - 1)
    expect(at[1] - at[0]).toBeGreaterThan(1)
    expect(mixed.find((it) => it.form)).toMatchObject({ entryId: 'form:aller|present', exerciseType: 'conjugation' })
    expect(isFormId(mixed[at[0]].entryId)).toBe(true)
  })

  it('leaves the day as it is with no forms or no items', () => {
    const items = [item('en:a')]
    expect(mixForms(items, [])).toEqual(items)
    expect(mixForms([], [form('aller')])).toEqual([])
  })
})

describe('a pile of reviews', () => {
  const item = (id: string, reason: PlanItem['reason']): PlanItem => ({ kind: 'exercise', entryId: id, reason, skill: 'recognition', exerciseType: 'mc_meaning' })

  it('counts every review due, also what the day\'s minutes leave out', () => {
    const states = EN_CATALOG.map((e) => learned(e, daysAgo(30)))
    const cut = buildDailyPlan(input({ states, settings: { ...settings, dailyMinutes: 0.5 } }))
    const full = buildDailyPlan(input({ states, settings: { ...settings, dailyMinutes: 60 } }))
    expect(cut.items.length).toBeLessThan(full.items.length)
    expect(cut.dueTotal).toBe(full.dueTotal)
    expect(cut.dueTotal).toBeGreaterThanOrEqual(EN_CATALOG.length)
    expect(buildDailyPlan(input()).dueTotal).toBe(0)
    expect(BACKLOG_AT).toBeGreaterThan(SHORT_ROUND)
  })

  it('a short round takes the most urgent questions, in the plan\'s own order', () => {
    const items = [item('a', 'due'), item('b', 'forgotten'), item('c', 'weak'), item('d', 'forgotten'), item('e', 'mistake'), item('f', 'due')]
    expect(shortRound(items, 3).map((i) => i.entryId)).toEqual(['b', 'd', 'e'])
    expect(shortRound(items, 4).map((i) => i.entryId)).toEqual(['b', 'c', 'd', 'e'])
    expect(shortRound(items, 99)).toEqual(items)
    expect(shortRound([], 5)).toEqual([])
  })

  it('introductions are not part of a short round', () => {
    const intro: PlanItem = { kind: 'introduce', entryId: 'n', reason: 'new', skill: 'recognition' }
    expect(shortRound([intro, item('a', 'due')], 5).map((i) => i.entryId)).toEqual(['a'])
  })
})
