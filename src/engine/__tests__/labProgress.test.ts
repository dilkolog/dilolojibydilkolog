import { describe, expect, it } from 'vitest'
import { difficultItems, dueItems, emptyLab, labKey, masteryLevel, MASTERY_MAX, pushRecent, recordAnswer, toggleFavorite, verbMastery } from '../labProgress'

const DAY = 86_400_000
const t0 = 20_000 * DAY

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

describe('practice records', () => {
  it('a right answer moves the box up and the due day out; a wrong one back down', () => {
    let lab = recordAnswer(emptyLab(), 'comer', 'presente', true, t0)
    expect(lab.records[labKey('comer', 'presente')]).toMatchObject({ ok: 1, wrong: 0, box: 1, due: 20_001, points: 10 })
    lab = recordAnswer(lab, 'comer', 'presente', true, t0 + DAY)
    expect(lab.records[labKey('comer', 'presente')]).toMatchObject({ box: 2, due: 20_004, points: 20 })
    lab = recordAnswer(lab, 'comer', 'presente', false, t0 + 2 * DAY)
    expect(lab.records[labKey('comer', 'presente')]).toMatchObject({ ok: 2, wrong: 1, box: 0, due: 20_002, points: 10 })
  })

  it('points stay between 0 and the maximum', () => {
    let lab = emptyLab()
    for (let i = 0; i < 9; i++) lab = recordAnswer(lab, 'ir', 'preterito', true, t0)
    expect(lab.records[labKey('ir', 'preterito')].points).toBe(MASTERY_MAX)
    lab = recordAnswer(emptyLab(), 'ir', 'preterito', false, t0)
    expect(lab.records[labKey('ir', 'preterito')].points).toBe(0)
  })

  it('what is due today comes back, the most overdue first', () => {
    let lab = recordAnswer(emptyLab(), 'comer', 'presente', true, t0) // due t0 + 1 day
    lab = recordAnswer(lab, 'ir', 'presente', false, t0 - 3 * DAY) // due 3 days before t0
    expect(dueItems(lab, t0).map((i) => i.verb)).toEqual(['ir'])
    expect(dueItems(lab, t0 + DAY).map((i) => i.verb)).toEqual(['ir', 'comer'])
  })

  it('difficult ones: missed more than they are right, not yet known', () => {
    let lab = recordAnswer(emptyLab(), 'ser', 'preterito', false, t0)
    lab = recordAnswer(lab, 'ser', 'preterito', false, t0)
    for (let i = 0; i < 4; i++) lab = recordAnswer(lab, 'comer', 'presente', true, t0)
    lab = recordAnswer(lab, 'comer', 'presente', false, t0)
    expect(difficultItems(lab).map((i) => `${i.verb}|${i.tense}`)).toEqual(['ser|preterito'])
  })
})

describe('mastery', () => {
  it('levels from the record', () => {
    expect(masteryLevel(undefined)).toBe('new')
    const lab = recordAnswer(emptyLab(), 'a', 'presente', true, t0)
    expect(masteryLevel(lab.records[labKey('a', 'presente')])).toBe('learning')
    const missed = recordAnswer(emptyLab(), 'a', 'presente', false, t0)
    expect(masteryLevel(missed.records[labKey('a', 'presente')])).toBe('learning')
    let full = emptyLab()
    for (let i = 0; i < 6; i++) full = recordAnswer(full, 'a', 'presente', true, t0)
    expect(masteryLevel(full.records[labKey('a', 'presente')])).toBe('master')
  })

  it('a verb is as known as its tenses are: share of the possible points', () => {
    let lab = emptyLab()
    for (let i = 0; i < 6; i++) lab = recordAnswer(lab, 'comer', 'presente', true, t0)
    expect(verbMastery(lab, 'comer', ['presente', 'preterito'])).toBe(50)
    expect(verbMastery(lab, 'comer', ['presente'])).toBe(100)
    expect(verbMastery(lab, 'comer', [])).toBe(0)
  })
})
