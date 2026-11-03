// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { useNumberKeys } from './useNumberKeys'

function Options({ onPick, used }: { onPick: (i: number) => void; used?: number }) {
  const group = useRef<HTMLDivElement>(null)
  useNumberKeys(group)
  return (
    <>
      <input aria-label="field" />
      <div ref={group}>
        {['a', 'b', 'c', 'd'].map((o, i) => (
          <button key={o} type="button" disabled={used === i} onClick={() => onPick(i)}>
            {o}
          </button>
        ))}
      </div>
    </>
  )
}

const press = (key: string, target: EventTarget = window, extra: KeyboardEventInit = {}) =>
  act(() => void target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra })))

describe('number keys pick an option', () => {
  it('1–4 press the first to fourth button, other keys and used buttons do nothing', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    const onPick = vi.fn()
    act(() => root.render(<Options onPick={onPick} used={2} />))
    press('1')
    press('4')
    press('3')
    press('5')
    press('x')
    press('2', window, { metaKey: true })
    press('2', el.querySelector('input')!)
    expect(onPick.mock.calls.map((c) => c[0])).toEqual([0, 3])
    act(() => root.unmount())
    el.remove()
  })
})
