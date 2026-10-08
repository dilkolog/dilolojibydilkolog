import { describe, expect, it } from 'vitest'
import { buildTour, kindFor, tourVerbs, TOUR_SIZE, type TourInput } from '../labTour'
import { emptyLab, labKey, recordCheck, recordForm, type LabData } from '../labProgress'
import { createScheduler } from '../scheduler'
import type { Tense } from '../tenses'

const scheduler = createScheduler({ fuzz: false })
const T0 = new Date('2026-10-01T10:00:00')
const later = new Date('2026-10-20T10:00:00')
const core: Tense[] = ['present', 'passe-compose', 'imparfait', 'futur']
const six = [0, 1, 2, 3, 4, 5]
const input = (lab: LabData, extra: Partial<TourInput> = {}): TourInput => ({
  lab,
  now: later,
  verbOfDay: 'parler',
  core,
  persons: () => six,
  has: () => true,
  day: 20261020,
  ...extra,
})
/** A verb and tense answered right `times` times on day one: in the queue, due by the 20th. */
const practised = (lab: LabData, verb: string, tense: Tense, times: number) => {
  for (let i = 0; i < times; i++) lab = recordCheck(lab, scheduler, verb, tense, true, T0)
  return lab
}

describe('the day\'s verb round', () => {
  it('asks a form as its mastery calls for: picked while new, written, then in a sentence', () => {
    expect(kindFor(undefined)).toBe('choose')
    expect(kindFor(10)).toBe('choose')
    expect(kindFor(20)).toBe('type')
    expect(kindFor(40)).toBe('sentence')
  })

  it('for a newcomer: today\'s verb, two tenses, three persons each, picked twice then written', () => {
    const items = buildTour(input(emptyLab()))
    expect(items).toHaveLength(6)
    expect(tourVerbs(items)).toEqual(['parler'])
    expect([...new Set(items.map((i) => i.tense))]).toEqual(['present', 'passe-compose'])
    expect(items.filter((i) => i.tense === 'present').map((i) => i.kind)).toEqual(['choose', 'choose', 'type'])
    expect(items.every((i) => i.reason === 'new')).toBe(true)
    // The same round all day.
    expect(buildTour(input(emptyLab()))).toEqual(items)
  })

  it('the queue comes first, then the persons missed most (written), at most three verbs and twelve questions', () => {
    let lab = emptyLab()
    for (const v of ['aller', 'finir', 'venir', 'prendre']) lab = practised(lab, v, 'present', 2)
    lab = recordForm(recordForm(recordForm(lab, 'imparfait', 3, false), 'imparfait', 3, false), 'imparfait', 3, true)
    const items = buildTour(input(lab))
    expect(items.length).toBeLessThanOrEqual(TOUR_SIZE)
    expect(tourVerbs(items).length).toBeLessThanOrEqual(3)
    expect(items[0].reason).toBe('due')
    const weak = items.find((i) => i.reason === 'weak')!
    expect(weak).toMatchObject({ tense: 'imparfait', person: 3, kind: 'type' })
    // Known well already (points from two right answers): written, not picked.
    expect(items.filter((i) => i.reason === 'due').every((i) => i.kind === kindFor(lab.records[labKey(i.verb, i.tense)].points))).toBe(true)
  })

  it('skips tenses a verb has no table for, and persons a tense lacks', () => {
    const items = buildTour(input(emptyLab(), { has: (_v, t) => t !== 'present', persons: () => [0, 2, 5] }))
    expect(items.some((i) => i.tense === 'present')).toBe(false)
    expect(items.every((i) => [0, 2, 5].includes(i.person))).toBe(true)
    expect(buildTour(input(emptyLab(), { verbOfDay: undefined }))).toEqual([])
  })
})
