// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from '../aiContext'
import { MonkiNudge } from './MonkiNudge'
import { markDailyTalkDone } from './dailyTalkStore'

const asked = vi.hoisted(() => vi.fn())
vi.mock('./monkiBus', () => ({ askMonki: (...a: unknown[]) => asked(...a) }))

describe('MonkiNudge', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const render = (props: { openMistakes: number; dailyWords?: string[] }, apiKey: string | null = 'sk-test') =>
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
    render({ openMistakes: 3, dailyWords: ['a', 'b', 'c'] })
    expect(container.textContent).toContain('3 açık hatan var')
  })

  it('offers the day\'s talk with its words when nothing is open, and starts it', () => {
    render({ openMistakes: 0, dailyWords: ['la maison', 'le chat', 'arbre'] })
    expect(container.textContent).toContain('Günün sohbeti hazır')
    act(() => container.querySelector<HTMLButtonElement>('.btn')!.click())
    expect(asked).toHaveBeenCalledWith({ text: 'Başlayalım', mode: 'words', targets: ['la maison', 'le chat', 'arbre'], daily: true, send: true })
  })

  it('falls back to the small quiz once the day\'s talk is done, or with too few words', () => {
    markDailyTalkDone()
    render({ openMistakes: 0, dailyWords: ['a', 'b', 'c'] })
    expect(container.textContent).toContain('Küçük bir sınav')
    act(() => root.unmount())
    root = createRoot(container)
    localStorage.clear()
    render({ openMistakes: 0, dailyWords: ['a', 'b'] })
    expect(container.textContent).toContain('Küçük bir sınav')
  })

  it('shows nothing without a key', () => {
    render({ openMistakes: 2 }, null)
    expect(container.textContent).toBe('')
  })
})
