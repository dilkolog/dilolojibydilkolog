import { afterEach, describe, expect, it, vi } from 'vitest'
import { badgeSupported, updateAppBadge } from './appBadge'

const nav = navigator as Navigator & { setAppBadge?: unknown; clearAppBadge?: unknown }

afterEach(() => {
  Reflect.deleteProperty(nav, 'setAppBadge')
  Reflect.deleteProperty(nav, 'clearAppBadge')
})

describe('app icon badge', () => {
  it('does nothing where the browser has no Badging API', () => {
    expect(badgeSupported()).toBe(false)
    expect(() => updateAppBadge(3, true)).not.toThrow()
  })

  it('shows the reviews waiting (at most 99) and clears it when none are due or it is turned off', () => {
    const set = vi.fn(() => Promise.resolve())
    const clear = vi.fn(() => Promise.resolve())
    Object.assign(nav, { setAppBadge: set, clearAppBadge: clear })
    updateAppBadge(12, true)
    updateAppBadge(250, true)
    expect(set.mock.calls).toEqual([[12], [99]])
    updateAppBadge(0, true)
    updateAppBadge(5, false)
    expect(clear).toHaveBeenCalledTimes(2)
  })

  it('swallows a refusal (not installed)', async () => {
    Object.assign(nav, { setAppBadge: () => Promise.reject(new DOMException('no', 'NotAllowedError')), clearAppBadge: vi.fn() })
    updateAppBadge(1, true)
    await new Promise((r) => setTimeout(r))
  })
})
