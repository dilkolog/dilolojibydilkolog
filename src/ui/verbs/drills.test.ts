import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import '../../engine/conjugationData'
import type { LabData, LabRecord } from '../../engine/labProgress'
import { addTenses, conjugateTense, irregularForms } from '../../engine/tenses'
import { drillQueue, DRILL_SIZE } from './drills'
import { CORE_TENSES } from './labShared'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

const record = { points: 10, ok: 2, wrong: 1 } as unknown as LabRecord
const lab = (over: Partial<LabData> = {}): LabData => ({
  favorites: [],
  recent: [],
  records: { 'hablar|presente': record, 'comer|presente': record, 'vivir|preterito': record, 'tener|presente': record },
  ...over,
})
const common = ['ser', 'estar', 'tener', 'hacer', 'ir', 'poder', 'decir', 'hablar']
const v = (lemma: string) => ({ language: 'es' as const, lemma, partOfSpeech: 'verb' as const })
const form = (a: { verb: string; tense: Parameters<typeof conjugateTense>[1]; person: number }) => conjugateTense(v(a.verb), a.tense)![a.person]

describe('focused rounds by kind of slip', () => {
  it('person: asks the persons missed most, in their tenses', () => {
    const q = drillQueue('person', lab({ tally: { 'presente|1': { ok: 1, wrong: 4 }, 'presente|0': { ok: 9, wrong: 0 } } }), 'es', common, 1)
    expect(q.length).toBeGreaterThan(0)
    expect(q.every((a) => a.tense === 'presente' && a.person === 1)).toBe(true)
    // Nothing missed yet: no round.
    expect(drillQueue('person', lab(), 'es', common, 1)).toEqual([])
  })

  it('tense: the practised verbs across the core tenses, one table at a time', () => {
    const q = drillQueue('tense', lab(), 'es', common, 2)
    expect(q).toHaveLength(DRILL_SIZE)
    expect(q.every((a) => CORE_TENSES.es.includes(a.tense))).toBe(true)
    expect(new Set(q.map((a) => a.tense)).size).toBeGreaterThan(1)
    expect(new Set(q.map((a) => `${a.verb}|${a.tense}`)).size).toBe(q.length)
  })

  it('accent: only forms that carry an accent', () => {
    const q = drillQueue('accent', lab(), 'es', common, 3)
    expect(q.length).toBeGreaterThan(0)
    expect(q.every((a) => /[^\u0000-\u007f]/.test(form(a)))).toBe(true)
  })

  it('irregular: only forms that break the rule', () => {
    const q = drillQueue('irregular', lab(), 'es', common, 4)
    expect(q).toHaveLength(DRILL_SIZE)
    expect(q.every((a) => irregularForms(v(a.verb), a.tense)[a.person])).toBe(true)
  })

  it('works for French too, and has nothing to drill for a typo', () => {
    const frLab: LabData = { favorites: [], recent: [], records: { 'parler|present': record, 'finir|present': record, 'aller|futur': record } }
    expect(drillQueue('irregular', frLab, 'fr', ['être', 'avoir', 'aller', 'faire'], 5).length).toBeGreaterThan(0)
    expect(drillQueue('typo', frLab, 'fr', [], 5)).toEqual([])
  })
})
