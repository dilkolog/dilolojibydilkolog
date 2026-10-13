import { describe, expect, it } from 'vitest'
import { clientKey, overLimit, resetRate } from '../../api/_rate'

const from = (ip?: string) => new Request('https://app.test/api/x', { headers: ip ? { 'x-forwarded-for': ip } : {} })

describe('the rate brake', () => {
  it('lets `max` calls through per window and refuses the rest, then recovers', () => {
    resetRate()
    const r = from('1.2.3.4')
    for (let i = 0; i < 3; i++) expect(overLimit(r, 'a', 3, 1000, 100 + i)).toBe(false)
    expect(overLimit(r, 'a', 3, 1000, 200)).toBe(true)
    expect(overLimit(r, 'a', 3, 1000, 1200)).toBe(false)
  })

  it('counts each address and each endpoint on its own', () => {
    resetRate()
    expect(overLimit(from('1.1.1.1'), 'a', 1, 1000, 0)).toBe(false)
    expect(overLimit(from('1.1.1.1'), 'a', 1, 1000, 1)).toBe(true)
    expect(overLimit(from('2.2.2.2'), 'a', 1, 1000, 2)).toBe(false)
    expect(overLimit(from('1.1.1.1'), 'b', 1, 1000, 3)).toBe(false)
  })

  it('takes the first address of a forwarded chain', () => {
    expect(clientKey(from('9.9.9.9, 10.0.0.1'))).toBe('9.9.9.9')
    expect(clientKey(from())).toBe('unknown')
  })

  it('does not grow without end under many addresses', () => {
    resetRate()
    for (let i = 0; i < 6000; i++) overLimit(from(`10.0.${Math.floor(i / 250)}.${i % 250}`), 'a', 5, 60_000, i)
    // The oldest were forgotten: the first address is counted afresh.
    for (let i = 0; i < 5; i++) expect(overLimit(from('10.0.0.0'), 'a', 5, 60_000, 7000 + i)).toBe(false)
  })
})
