import { describe, expect, it } from 'vitest'
import { addReport, cleanReports, MAX_REPORTS, removeReport, reportsText, type GuideReport } from './guideReports'

const report = (over: Partial<GuideReport> = {}): GuideReport => ({ id: 'a', at: '2026-10-18T10:00:00.000Z', language: 'fr', topic: 'subjonctif', kind: 'lesson', note: 'Örnek yanlış', ...over })

describe('guide reports', () => {
  it('puts the newest first and keeps the same report once', () => {
    const first = report({ id: 'a' })
    const list = addReport(addReport([], first), report({ id: 'b', note: 'başka' }))
    expect(list.map((r) => r.id)).toEqual(['b', 'a'])
    expect(addReport(list, report({ id: 'c' })).map((r) => r.id)).toEqual(['c', 'b'])
  })

  it('keeps a limited number', () => {
    let list: GuideReport[] = []
    for (let i = 0; i < MAX_REPORTS + 5; i++) list = addReport(list, report({ id: String(i), note: `n${i}` }))
    expect(list).toHaveLength(MAX_REPORTS)
    expect(list[0]!.id).toBe(String(MAX_REPORTS + 4))
  })

  it('removes one by id', () => {
    expect(removeReport([report({ id: 'a' }), report({ id: 'b' })], 'a').map((r) => r.id)).toEqual(['b'])
  })

  it('drops what is not shaped like a report', () => {
    expect(cleanReports([report(), { id: 1 }, null, { ...report(), kind: 'x' }])).toHaveLength(1)
    expect(cleanReports('nope')).toEqual([])
  })

  it('writes the reports as a list to paste, with the question quoted', () => {
    const text = reportsText([report({ kind: 'question', prompt: 'Il faut que tu ___', note: 'iki cevap doğru' }), report({ note: '' })])
    expect(text).toBe('- [fr] soru (subjonctif): iki cevap doğru\n  Soru: Il faut que tu ___\n- [fr] ders (subjonctif): (not yok)')
  })
})
