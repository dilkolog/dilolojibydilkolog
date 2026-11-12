import { describe, expect, it } from 'vitest'

describe('the width of a place', () => {
  it('is the same for every tab of it, so switching tabs does not make the page jump', async () => {
    const { GROUPS, WIDE_SCREENS } = await import('./appNav')
    for (const tabs of Object.values(GROUPS)) {
      const wide = new Set(tabs!.map((t) => WIDE_SCREENS.has(t.screen)))
      expect(wide.size).toBe(1)
    }
  })
})

describe('the menu', () => {
  it('learns in one place (the lessons first) and keeps mistakes and friends with the progress', async () => {
    const { GROUPS, NAV, placeOf } = await import('./appNav')
    expect(NAV.find((n) => n.screen === 'practice')?.label).toBe('Öğren')
    expect(GROUPS.practice?.map((g) => g.screen)).toEqual(['guide', 'verbs', 'produce', 'games'])
    expect(placeOf('mistakes')).toBe('progress')
    expect(placeOf('community')).toBe('progress')
    expect(placeOf('progress')).toBe('progress')
    expect(NAV).toHaveLength(5)
  })
})
