// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

const tick = vi.hoisted(() => vi.fn())
vi.mock('./sounds', () => ({ sfx: { tick } }))
const { useCountdownTicks } = await import('./useCountdownTicks')

function Clock({ left, running }: { left: number; running: boolean }) {
  useCountdownTicks(left, running)
  return null
}

describe('the last seconds tick', () => {
  it('once for each of 3, 2, 1, the last one firmer, and not while the clock is stopped', () => {
    const el = document.createElement('div')
    const root = createRoot(el)
    for (const left of [5, 4.2, 3, 2.9, 2.4, 1.5, 0.6, 0.1]) act(() => root.render(<Clock left={left} running />))
    expect(tick.mock.calls).toEqual([[false], [false], [true]])
    tick.mockClear()
    act(() => root.render(<Clock left={2} running={false} />))
    expect(tick).not.toHaveBeenCalled()
    act(() => root.unmount())
  })
})
