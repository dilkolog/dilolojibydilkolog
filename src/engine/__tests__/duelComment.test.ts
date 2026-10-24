import { describe, expect, it } from 'vitest'
import { duelComment } from '../duelComment'

const r = (score: number, ms = 1000) => ({ score, ms })

describe('Monki on a duel', () => {
  it('praises a full score and names a narrow win', () => {
    expect(duelComment(r(10), r(7), 10, true, 'Şule').text).toContain('tam puan')
    expect(duelComment(r(8), r(7), 10, true, 'Şule').text).toMatch(/Kıl payı|yakındı/)
  })

  it('says a win on time alone was on time', () => {
    const c = duelComment(r(7, 800), r(7, 1200), 10, true, 'Şule')
    expect(c.text).toContain('daha çabuk düşündüğün için')
    expect(c.face).toBe('happy')
  })

  it('names the gap on a clear win and suggests a rematch on a loss', () => {
    expect(duelComment(r(9), r(5), 10, true, 'Şule').text).toMatch(/9 - 5|4 soru/)
    const loss = duelComment(r(4), r(9), 10, false, 'Şule')
    expect(loss.text).toMatch(/rövanş/i)
    expect(loss.face).toBe('think')
  })

  it('a close loss is about one question; a tie is about a rematch', () => {
    expect(duelComment(r(6), r(7), 10, false, 'Şule').text).toMatch(/tek bir soru|Bir soru/)
    const tie = duelComment(r(7), r(7), 10, null, 'Şule')
    expect(tie.text).toMatch(/rövanş/i)
    expect(tie.face).toBe('surprised')
  })

  it('does not say the same line for every pair of scores', () => {
    const lines = new Set([4, 5, 6, 7].map((s) => duelComment(r(s), r(s + 4), 10, false, 'Şule').text))
    expect(lines.size).toBeGreaterThan(1)
  })
})
