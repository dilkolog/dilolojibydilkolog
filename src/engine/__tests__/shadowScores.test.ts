import { describe, expect, it } from 'vitest'
import { addShadowTry, cleanShadowLog, compareWeek, KEEP_SENTENCES, KEEP_TRIES, lastTry, progressLine, shadowKey } from '../shadowScores'

const at = (d: number) => new Date(Date.UTC(2026, 9, d, 12))

describe('shadow scores', () => {
  it('keys a sentence regardless of case, punctuation and apostrophe style', () => {
    expect(shadowKey('fr', "J’ai faim, Marie !")).toBe(shadowKey('fr', "j'ai faim marie"))
    expect(shadowKey('fr', 'Bonjour')).not.toBe(shadowKey('es', 'Bonjour'))
  })

  it('compares the latest try with the most recent one a week or more before', () => {
    let log = addShadowTry({}, 'k', 70, at(1))
    log = addShadowTry(log, 'k', 74, at(5))
    expect(compareWeek(log.k)).toBeNull()
    log = addShadowTry(log, 'k', 82, at(10))
    const week = compareWeek(log.k)!
    // The try five days before is too recent: the first one, nine days before, is "the week before".
    expect(week.before.score).toBe(70)
    expect(week.days).toBe(9)
  })

  it('needs the earlier try to be at least six days older', () => {
    let log = addShadowTry({}, 'k', 60, at(1))
    log = addShadowTry(log, 'k', 75, at(8))
    const week = compareWeek(log.k)!
    expect(week).toMatchObject({ delta: 15, days: 7 })
    expect(progressLine(log.k)).toBe('Aynı cümle 7 gün önce: %60. Şimdi %75: 15 puan yükseldin.')
  })

  it('words a drop and a tie', () => {
    const down = addShadowTry(addShadowTry({}, 'k', 80, at(1)), 'k', 70, at(9))
    expect(progressLine(down.k)).toContain('10 puan düştün')
    const same = addShadowTry(addShadowTry({}, 'k', 80, at(1)), 'k', 80, at(9))
    expect(progressLine(same.k)).toContain('aynı kaldın')
    expect(progressLine(undefined)).toBe('')
  })

  it('tells how long ago the last try was', () => {
    const log = addShadowTry({}, 'k', 66, at(3))
    expect(lastTry(log.k, at(6))).toMatchObject({ days: 3 })
    expect(lastTry(undefined, at(6))).toBeNull()
  })

  it('keeps few tries per sentence and few sentences', () => {
    let log = {}
    for (let i = 0; i < KEEP_TRIES + 4; i++) log = addShadowTry(log, 'k', 50 + i, at(1 + i))
    expect((log as Record<string, unknown[]>).k).toHaveLength(KEEP_TRIES)
    let many = {}
    for (let i = 0; i < KEEP_SENTENCES + 5; i++) many = addShadowTry(many, `s${i}`, 50, new Date(Date.UTC(2026, 0, 1, 0, i)))
    expect(Object.keys(many)).toHaveLength(KEEP_SENTENCES)
    expect(many).not.toHaveProperty('s0')
  })

  it('drops damaged entries', () => {
    expect(cleanShadowLog({ a: [{ at: '2026-10-01T00:00:00Z', score: 80 }, { at: 'x', score: 5 }, { at: '2026-10-02T00:00:00Z', score: 300 }], b: 'no' })).toEqual({ a: [{ at: '2026-10-01T00:00:00Z', score: 80 }] })
    expect(cleanShadowLog(null)).toEqual({})
  })
})
