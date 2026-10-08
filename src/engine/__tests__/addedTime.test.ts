import { describe, expect, it } from 'vitest'
import { addedTime } from '../types'

describe('when a word was added', () => {
  it('reads a Date, an ISO string or a number, and anything else as unknown (0)', () => {
    expect(addedTime({ addedAt: new Date('2026-03-04T10:00:00Z') })).toBe(Date.UTC(2026, 2, 4, 10))
    expect(addedTime({ addedAt: '2026-03-04T10:00:00.000Z' })).toBe(Date.UTC(2026, 2, 4, 10))
    expect(addedTime({ addedAt: 5 })).toBe(5)
    // What a structured clone of a fake Date (a test clock) leaves behind: no getTime to call.
    expect(addedTime({ addedAt: {} })).toBe(0)
    expect(addedTime({ addedAt: 'yesterday' })).toBe(0)
    expect(addedTime({})).toBe(0)
  })

  it('lets a list with an odd entry still sort', () => {
    const words = [{ id: 'a', addedAt: {} }, { id: 'b', addedAt: new Date(2) }, { id: 'c', addedAt: new Date(1) }]
    expect([...words].sort((x, y) => addedTime(y) - addedTime(x)).map((w) => w.id)).toEqual(['b', 'c', 'a'])
  })
})
