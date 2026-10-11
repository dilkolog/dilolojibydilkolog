import { describe, expect, it } from 'vitest'
import { addSeenForms, mergeSeen, seenVerbs, errorBreakdown, recordForm, tallyCells, weakestCell, weakPersons, weeklyProgress, addFormsToReview, addToReview, adoptCards, difficultItems, dueItems, emptyLab, gardenVerbs, labKey, masteredForms, masteryLevel, MASTERY_MAX, plantStage, pushRecent, recordCheck, recordRound, toggleFavorite, verbMastery } from '../labProgress'
import { createScheduler } from '../scheduler'

const DAY = 86_400_000
const t0 = new Date('2026-03-02T10:00:00Z')
const later = (days: number) => new Date(t0.getTime() + days * DAY)
const scheduler = createScheduler({ fuzz: false })

describe('favourites and recent verbs', () => {
  it('toggles a favourite, newest first', () => {
    let lab = toggleFavorite(emptyLab(), 'comer')
    lab = toggleFavorite(lab, 'hablar')
    expect(lab.favorites).toEqual(['hablar', 'comer'])
    expect(toggleFavorite(lab, 'comer').favorites).toEqual(['hablar'])
  })

  it('keeps the last verbs looked at, without repeats', () => {
    let lab = emptyLab()
    for (const v of ['a', 'b', 'c', 'a']) lab = pushRecent(lab, v)
    expect(lab.recent).toEqual(['a', 'c', 'b'])
    for (let i = 0; i < 20; i++) lab = pushRecent(lab, `v${i}`)
    expect(lab.recent).toHaveLength(12)
    expect(lab.recent[0]).toBe('v19')
  })
})

describe('practice records on the FSRS scheduler', () => {
  it('a right form schedules the card out, and it comes back when due', () => {
    const lab = recordCheck(emptyLab(), scheduler, 'comer', 'presente', true, t0)
    const r = lab.records[labKey('comer', 'presente')]
    expect(r).toMatchObject({ ok: 1, wrong: 0, points: 10 })
    expect(new Date(r.card.due).getTime()).toBeGreaterThan(t0.getTime())
    expect(dueItems(lab, t0)).toEqual([])
    expect(dueItems(lab, later(30)).map((i) => i.verb)).toEqual(['comer'])
  })

  it('a wrong form comes back soon, a right one later', () => {
    const wrong = recordCheck(emptyLab(), scheduler, 'ir', 'presente', false, t0).records[labKey('ir', 'presente')]
    const right = recordCheck(emptyLab(), scheduler, 'ir', 'presente', true, t0).records[labKey('ir', 'presente')]
    expect(new Date(wrong.card.due).getTime()).toBeLessThan(new Date(right.card.due).getTime())
    expect(wrong).toMatchObject({ ok: 0, wrong: 1, points: 0 })
  })

  it('a round grades by how many forms were missed', () => {
    const grade = (correct: number) => recordRound(emptyLab(), scheduler, 'comer', 'presente', { correct, total: 6 }, t0).records[labKey('comer', 'presente')]
    const all = grade(6)
    const one = grade(5)
    const many = grade(2)
    expect(new Date(all.card.due).getTime()).toBeGreaterThan(new Date(one.card.due).getTime())
    expect(new Date(one.card.due).getTime()).toBeGreaterThanOrEqual(new Date(many.card.due).getTime())
    expect(all).toMatchObject({ ok: 6, wrong: 0, points: 10 })
    expect(one).toMatchObject({ ok: 5, wrong: 1, points: 10 })
    expect(many).toMatchObject({ ok: 2, wrong: 4, points: 0 })
  })

  it('points stay between 0 and the maximum', () => {
    let lab = emptyLab()
    for (let i = 0; i < 9; i++) lab = recordCheck(lab, scheduler, 'ir', 'preterito', true, later(i * 30))
    expect(lab.records[labKey('ir', 'preterito')].points).toBe(MASTERY_MAX)
    lab = recordCheck(emptyLab(), scheduler, 'ir', 'preterito', false, t0)
    expect(lab.records[labKey('ir', 'preterito')].points).toBe(0)
  })

  it('forms can be put in the queue unpractised: new cards, due at once, never overwritten', () => {
    let lab = recordCheck(emptyLab(), scheduler, 'comer', 'presente', true, t0)
    lab = addToReview(lab, scheduler, 'comer', ['presente', 'preterito'], t0)
    expect(dueItems(lab, t0).map((i) => i.tense)).toEqual(['preterito'])
    expect(lab.records[labKey('comer', 'presente')].ok).toBe(1)
  })

  it('the forms of a text join the queue once each, and what is already there stays as it is', () => {
    const lab = recordCheck(emptyLab(), scheduler, 'parler', 'present', true, t0)
    const pairs = [
      { lemma: 'parler', tense: 'present' as const },
      { lemma: 'parler', tense: 'imparfait' as const },
      { lemma: 'parler', tense: 'imparfait' as const },
      { lemma: 'aller', tense: 'passe-compose' as const },
    ]
    const { lab: next, added } = addFormsToReview(lab, scheduler, pairs, t0)
    expect(added).toBe(2)
    expect(next.records[labKey('parler', 'present')].ok).toBe(1)
    expect(dueItems(next, t0).map((i) => labKey(i.verb, i.tense)).sort()).toEqual(['aller|passe-compose', 'parler|imparfait'])
    // Nothing new: the same lab comes back.
    expect(addFormsToReview(next, scheduler, pairs, t0)).toEqual({ lab: next, added: 0 })
  })

  it('forms with no person (après avoir mangé) never join the queue, and one already saved is not due', () => {
    const { lab, added } = addFormsToReview(emptyLab(), scheduler, [{ lemma: 'manger', tense: 'infinitif-passe' }, { lemma: 'manger', tense: 'participe-compose' }], t0)
    expect(added).toBe(0)
    expect(Object.keys(lab.records)).toEqual([])
    const saved = { ...emptyLab(), records: { 'manger|infinitif-passe': { ok: 0, wrong: 0, points: 0, card: scheduler.newCard(t0) } } }
    expect(dueItems(saved, t0)).toEqual([])
  })

  it('what is due comes the most overdue first; JSON-saved dates still work', () => {
    let lab = recordCheck(emptyLab(), scheduler, 'comer', 'presente', false, t0)
    lab = recordCheck(lab, scheduler, 'ir', 'presente', false, later(-3))
    const saved = JSON.parse(JSON.stringify(lab))
    expect(dueItems(saved, later(1)).map((i) => i.verb)).toEqual(['ir', 'comer'])
  })

  it('records from before cards existed are adopted, due now', () => {
    const old = { ...emptyLab(), records: { 'ser|presente': { ok: 3, wrong: 1, points: 20 } as never } }
    const lab = adoptCards(old, scheduler, t0)
    expect(dueItems(lab, t0).map((i) => i.verb)).toEqual(['ser'])
    expect(adoptCards(lab, scheduler, t0)).toBe(lab)
  })

  it('difficult ones: missed more than they are right, not yet known', () => {
    let lab = recordCheck(emptyLab(), scheduler, 'ser', 'preterito', false, t0)
    lab = recordCheck(lab, scheduler, 'ser', 'preterito', false, t0)
    for (let i = 0; i < 4; i++) lab = recordCheck(lab, scheduler, 'comer', 'presente', true, later(i))
    lab = recordCheck(lab, scheduler, 'comer', 'presente', false, later(5))
    expect(difficultItems(lab).map((i) => `${i.verb}|${i.tense}`)).toEqual(['ser|preterito'])
  })
})

describe('mastery and the garden', () => {
  it('levels from the record', () => {
    expect(masteryLevel(undefined)).toBe('new')
    const lab = recordCheck(emptyLab(), scheduler, 'a', 'presente', true, t0)
    expect(masteryLevel(lab.records[labKey('a', 'presente')])).toBe('learning')
    const missed = recordCheck(emptyLab(), scheduler, 'a', 'presente', false, t0)
    expect(masteryLevel(missed.records[labKey('a', 'presente')])).toBe('learning')
    let full = emptyLab()
    for (let i = 0; i < 6; i++) full = recordCheck(full, scheduler, 'a', 'presente', true, later(i * 30))
    expect(masteryLevel(full.records[labKey('a', 'presente')])).toBe('master')
    expect(masteredForms(full)).toBe(1)
  })

  it('a verb is as known as its tenses are: share of the possible points', () => {
    let lab = emptyLab()
    for (let i = 0; i < 6; i++) lab = recordCheck(lab, scheduler, 'comer', 'presente', true, later(i * 30))
    expect(verbMastery(lab, 'comer', ['presente', 'preterito'])).toBe(50)
    expect(verbMastery(lab, 'comer', ['presente'])).toBe(100)
    expect(verbMastery(lab, 'comer', [])).toBe(0)
  })

  it('plants grow with the points', () => {
    expect([0, 10, 20, 30, 40, 50, 60].map(plantStage)).toEqual([0, 0, 1, 2, 3, 4, 5])
  })

  it('the garden lists each verb with its share and what is due', () => {
    let lab = recordCheck(emptyLab(), scheduler, 'comer', 'presente', true, t0)
    lab = recordCheck(lab, scheduler, 'comer', 'preterito', true, t0)
    lab = recordCheck(lab, scheduler, 'ir', 'presente', false, t0)
    const garden = gardenVerbs(lab, later(30))
    expect(garden.map((g) => g.verb)).toEqual(['comer', 'ir'])
    expect(garden[0]).toMatchObject({ forms: 2, percent: 17, due: 2 })
    expect(garden[1]).toMatchObject({ forms: 1, percent: 0 })
  })
})

describe('where the slips are', () => {
  it('counts answers per tense and person, wrong ones by kind', () => {
    let lab = emptyLab()
    lab = recordForm(lab, 'preterito', 5, true)
    lab = recordForm(lab, 'preterito', 5, false, 'person')
    lab = recordForm(lab, 'preterito', 5, false, 'person')
    lab = recordForm(lab, 'presente', 0, false, 'accent')
    expect(tallyCells(lab).find((c) => c.tense === 'preterito' && c.person === 5)).toMatchObject({ ok: 1, wrong: 2 })
    expect(errorBreakdown(lab)).toEqual([
      { kind: 'person', count: 2, share: 2 / 3 },
      { kind: 'accent', count: 1, share: 1 / 3 },
    ])
  })

  it('names the worst place only with enough answers and some wrong', () => {
    let lab = emptyLab()
    lab = recordForm(lab, 'preterito', 5, false, 'tense')
    lab = recordForm(lab, 'preterito', 5, false, 'tense')
    expect(weakestCell(lab)).toBeUndefined()
    lab = recordForm(lab, 'preterito', 5, true)
    lab = recordForm(lab, 'presente', 0, true)
    lab = recordForm(lab, 'presente', 0, true)
    lab = recordForm(lab, 'presente', 0, true)
    expect(weakestCell(lab)).toMatchObject({ tense: 'preterito', person: 5, wrong: 2 })
    expect(weakestCell(emptyLab())).toBeUndefined()
  })

  it('marks the persons of a tense that often go wrong, with the count', () => {
    let lab = emptyLab()
    lab = recordForm(lab, 'presente', 3, false)
    expect(weakPersons(lab, 'presente')).toEqual({})
    lab = recordForm(lab, 'presente', 3, false)
    lab = recordForm(lab, 'presente', 3, true)
    lab = recordForm(lab, 'presente', 0, false)
    for (let i = 0; i < 6; i++) lab = recordForm(lab, 'presente', 0, i > 0)
    lab = recordForm(lab, 'preterito', 1, false)
    lab = recordForm(lab, 'preterito', 1, false)
    expect(weakPersons(lab, 'presente')).toEqual({ 3: '2/3 yanlış' })
    expect(weakPersons(lab, 'preterito')).toEqual({ 1: '2/2 yanlış' })
    expect(weakPersons(emptyLab(), 'presente')).toEqual({})
  })

  it('old data without a tally still reads', () => {
    expect(tallyCells(emptyLab())).toEqual([])
    expect(errorBreakdown(emptyLab())).toEqual([])
  })
})

describe('forms seen in texts', () => {
  const T1 = '2026-10-01T10:00:00Z'
  const T2 = '2026-10-07T10:00:00Z'

  it('adds up a finished reading\'s forms per verb, most met first, with the latest text', () => {
    let lab = addSeenForms(emptyLab(), [{ form: 'est', lemma: 'être', tense: 'present' }, { form: 'était', lemma: 'être', tense: 'imparfait' }, { form: 'est', lemma: 'être', tense: 'present' }], 'Le Petit Prince', T1)
    lab = addSeenForms(lab, [{ form: 'était', lemma: 'être', tense: 'imparfait' }, { form: 'était', lemma: 'être', tense: 'imparfait' }, { form: 'fut', lemma: 'être', tense: 'passe-simple' }, { form: 'allons', lemma: 'aller', tense: 'present' }], 'Le Monde', T2)
    expect(lab.seen!['être']).toEqual([
      { form: 'était', tense: 'imparfait', count: 3, title: 'Le Monde', at: T2 },
      { form: 'est', tense: 'present', count: 2, title: 'Le Petit Prince', at: T1 },
      { form: 'fut', tense: 'passe-simple', count: 1, title: 'Le Monde', at: T2 },
    ])
    expect(seenVerbs(lab)).toEqual([
      { verb: 'être', count: 6 },
      { verb: 'aller', count: 1 },
    ])
  })

  it('leaves the lab as it is when the text had no verb forms', () => {
    const lab = emptyLab()
    expect(addSeenForms(lab, [], 'x', T1)).toBe(lab)
  })

  it('merges two devices: the larger count, the latest place, no doubles', () => {
    const a = [{ form: 'est', tense: 'present' as const, count: 4, title: 'A', at: T1 }]
    const b = [
      { form: 'est', tense: 'present' as const, count: 2, title: 'B', at: T2 },
      { form: 'fut', tense: 'passe-simple' as const, count: 1, at: T1 },
    ]
    expect(mergeSeen(a, b)).toEqual([
      { form: 'est', tense: 'present', count: 4, title: 'B', at: T2 },
      { form: 'fut', tense: 'passe-simple', count: 1, at: T1 },
    ])
  })
})

describe('progress over time', () => {
  it('counts answers per day and sums them per week, Monday first, this week last', () => {
    const wed = new Date(2026, 9, 7, 12) // Wednesday 7 October 2026
    let lab = emptyLab()
    lab = recordForm(lab, 'present', 0, true, undefined, wed)
    lab = recordForm(lab, 'present', 1, false, 'person', wed)
    lab = recordForm(lab, 'present', 1, true, undefined, new Date(2026, 9, 5, 9)) // Monday
    lab = recordForm(lab, 'present', 1, true, undefined, new Date(2026, 9, 4, 9)) // the Sunday before
    expect(lab.days?.['2026-10-07']).toEqual({ ok: 1, wrong: 1 })
    expect(weeklyProgress(lab, wed, 3)).toEqual([
      { start: '2026-09-21', ok: 0, wrong: 0 },
      { start: '2026-09-28', ok: 1, wrong: 0 },
      { start: '2026-10-05', ok: 2, wrong: 1 },
    ])
  })

  it('keeps four months of days', () => {
    let lab = recordForm(emptyLab(), 'present', 0, true, undefined, new Date(2026, 0, 10))
    lab = recordForm(lab, 'present', 0, true, undefined, new Date(2026, 9, 7))
    expect(Object.keys(lab.days ?? {})).toEqual(['2026-10-07'])
    expect(weeklyProgress(emptyLab(), new Date(2026, 9, 7), 2).every((w) => w.ok + w.wrong === 0)).toBe(true)
  })
})
