// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from '../aiContext'
import { MonkiNudge } from './MonkiNudge'

const asked = vi.hoisted(() => vi.fn())
vi.mock('./monkiBus', () => ({ askMonki: (...a: unknown[]) => asked(...a) }))

describe('MonkiNudge', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const render = (props: { openMistakes: number }, apiKey: string | null = 'sk-test') =>
    act(() =>
      root.render(
        <AiContext.Provider value={{ apiKey, needsApproval: false, setApiKey: async () => {} }}>
          <MonkiNudge {...props} />
        </AiContext.Provider>,
      ),
    )

  beforeEach(() => {
    localStorage.clear()
    asked.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('offers the open mistakes first', () => {
    render({ openMistakes: 3 })
    expect(container.textContent).toContain('3 açık hatan var')
  })

  it('offers a small quiz when nothing is open, and starts it (speaking practice is in Yaz & konuş)', () => {
    render({ openMistakes: 0 })
    expect(container.textContent).toContain('Küçük bir sınav')
    expect(container.textContent).not.toContain('Günün sohbeti')
    act(() => container.querySelector<HTMLButtonElement>('.btn')!.click())
    expect(asked).toHaveBeenCalledWith({ text: 'Kelimelerimden sor', mode: 'quiz', send: true })
  })

  it('shows nothing without a key', () => {
    render({ openMistakes: 2 }, null)
    expect(container.textContent).toBe('')
  })
})
