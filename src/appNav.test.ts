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
