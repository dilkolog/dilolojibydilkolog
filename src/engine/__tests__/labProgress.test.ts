import { describe, expect, it } from 'vitest'
import { addToReview, adoptCards, difficultItems, dueItems, emptyLab, gardenVerbs, labKey, masteredForms, masteryLevel, MASTERY_MAX, plantStage, pushRecent, recordCheck, recordRound, toggleFavorite, verbMastery } from '../labProgress'
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
