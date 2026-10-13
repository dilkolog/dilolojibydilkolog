// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStudyClock } from './useStudyClock'

function Probe({ active, needsActivity, record }: { active: boolean; needsActivity: boolean; record: (s: number) => void }) {
  useStudyClock({ active, needsActivity, record })
  return null
}

let root: ReturnType<typeof createRoot>
let el: HTMLDivElement
const mount = (props: { active: boolean; needsActivity: boolean; record: (s: number) => void }) => act(() => root.render(<Probe {...props} />))
beforeEach(() => {
  vi.useFakeTimers()
  el = document.createElement('div')
  document.body.appendChild(el)
  root = createRoot(el)
})
afterEach(() => {
  act(() => root.unmount())
  el.remove()
  vi.useRealTimers()
})

describe('the study clock', () => {
  it('hands over the seconds in batches and the rest when it stops', () => {
    const record = vi.fn()
    mount({ active: true, needsActivity: false, record })
    act(() => void vi.advanceTimersByTime(25_000))
    expect(record).toHaveBeenCalledWith(20)
    mount({ active: false, needsActivity: false, record })
    expect(record).toHaveBeenLastCalledWith(5)
  })

  it('counts nothing while not active', () => {
    const record = vi.fn()
    mount({ active: false, needsActivity: false, record })
    act(() => void vi.advanceTimersByTime(60_000))
    expect(record).not.toHaveBeenCalled()
  })

  it('stops counting after a quiet minute until the reader touches the screen again', () => {
    const record = vi.fn()
    mount({ active: true, needsActivity: true, record })
    act(() => void vi.advanceTimersByTime(90_000))
    // 60 quiet-free seconds counted (3 batches of 20), nothing after.
    expect(record.mock.calls.reduce((n, c) => n + c[0], 0)).toBe(60)
    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
      vi.advanceTimersByTime(10_000)
    })
    mount({ active: false, needsActivity: true, record })
    expect(record.mock.calls.reduce((n, c) => n + c[0], 0)).toBe(70)
  })

  it('flushes what it has when the component goes away', () => {
    const record = vi.fn()
    mount({ active: true, needsActivity: false, record })
    act(() => void vi.advanceTimersByTime(7_000))
    act(() => root.unmount())
    expect(record).toHaveBeenCalledWith(7)
    root = createRoot(el)
  })
})
