// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { markRepairTried, repairTried } from './repairTry'

describe('repairTry', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false when no streak repair has been tried', () => {
    expect(repairTried('2026-10-16')).toBe(false)
  })

  it('records streak repair attempt and returns true for matching key', () => {
    markRepairTried('2026-10-16')
    expect(repairTried('2026-10-16')).toBe(true)
    expect(repairTried('2026-10-17')).toBe(false)
  })

  it('overwrites previous repair try key', () => {
    markRepairTried('2026-10-15')
    expect(repairTried('2026-10-15')).toBe(true)

    markRepairTried('2026-10-16')
    expect(repairTried('2026-10-15')).toBe(false)
    expect(repairTried('2026-10-16')).toBe(true)
  })
})
