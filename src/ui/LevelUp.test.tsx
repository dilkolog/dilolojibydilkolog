// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GainCount, LevelUpBadge } from './SessionSummary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => vi.useRealTimers())

describe('the summary moment', () => {
  it('shows the old level, then strikes the new one with a ring', async () => {
    vi.useFakeTimers()
    const el = document.createElement('div')
    const root = createRoot(el)
    await act(async () => root.render(<LevelUpBadge from={2} to={3} />))
    expect(el.textContent).toBe('2')
    expect(el.querySelector('.is-up')).toBeNull()
    await act(async () => void vi.advanceTimersByTime(850))
    expect(el.textContent).toBe('3')
    expect(el.querySelector('.level-strike.is-up')).not.toBeNull()
    await act(async () => root.unmount())
  })

  it('counts the session XP up from zero to what was earned', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const el = document.createElement('div')
    const root = createRoot(el)
    await act(async () => root.render(<GainCount value={36} />))
    expect(el.textContent).toBe('0')
    await act(async () => void vi.advanceTimersByTime(2000))
    expect(el.textContent).toBe('36')
    await act(async () => root.unmount())
  })
})
