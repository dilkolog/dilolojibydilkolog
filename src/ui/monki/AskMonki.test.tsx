// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from '../aiContext'
import { AskMonki } from './AskMonki'
import { MonkiNudge } from './MonkiNudge'
import { askMonki, setMonkiListener } from './monkiBus'

describe('asking Monki from a screen', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const heard = vi.fn()
  const withKey = (apiKey: string | null, ui: React.ReactNode) => act(() => root.render(<AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>{ui}</AiContext.Provider>))

  beforeEach(() => {
    localStorage.clear()
    heard.mockClear()
    setMonkiListener(heard)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    setMonkiListener(null)
    act(() => root.unmount())
    container.remove()
  })

  it('the button is not there without a YZ key', () => {
    withKey(null, <AskMonki ask={() => ({ text: 'x' })} />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('with a key it sends its question to the chat', () => {
    withKey('sk', <AskMonki ask={() => ({ text: 'Bunu anlat', send: true })} label="Monki açıklasın" />)
    act(() => container.querySelector('button')!.click())
    expect(heard).toHaveBeenCalledWith({ text: 'Bunu anlat', send: true })
    expect(container.textContent).toContain('Monki açıklasın')
  })

  it('a question asked before the chat is there waits for it', () => {
    setMonkiListener(null)
    askMonki({ text: 'erken' })
    setMonkiListener(heard)
    expect(heard).toHaveBeenCalledWith({ text: 'erken' })
  })

  it('Today: offers the open mistakes when there are some, a quiz when not, once a day', () => {
    withKey('sk', <MonkiNudge openMistakes={3} />)
    expect(container.textContent).toContain('3 açık hatan var')
    act(() => container.querySelector<HTMLButtonElement>('.btn')!.click())
    expect(heard).toHaveBeenLastCalledWith({ text: 'Hatalarımı sırayla inceleyelim', mode: 'mistakes', send: true })
    // Taking it up puts it away for the day.
    expect(container.querySelector('.monki-nudge')).toBeNull()
    localStorage.clear()
    withKey('sk', <div />)
    withKey('sk', <MonkiNudge openMistakes={0} />)
    expect(container.textContent).toContain('Küçük bir sınav')
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Bugünlük kapat"]')!.click())
    expect(container.querySelector('.monki-nudge')).toBeNull()
  })

  it('Today: nothing without a key', () => {
    withKey(null, <MonkiNudge openMistakes={2} />)
    expect(container.querySelector('.monki-nudge')).toBeNull()
  })
})
