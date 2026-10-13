// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from '../aiContext'

const monkiTurn = vi.fn()
vi.mock('../../ai', async (orig) => ({ ...(await orig<typeof import('../../ai')>()), monkiTurn: (...a: unknown[]) => monkiTurn(...a) }))
import Monki from './Monki'

describe('Monki', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const onSettings = vi.fn()

  const render = (apiKey: string | null, needsApproval = false) =>
    act(() =>
      root.render(
        <AiContext.Provider value={{ apiKey, needsApproval, setApiKey: async () => {} }}>
          <Monki language="fr" name="Ali" weakWords={['maison']} onSettings={onSettings} />
        </AiContext.Provider>,
      ),
    )
  const openPanel = () => act(() => container.querySelector<HTMLButtonElement>('.monki-fab')!.click())
  const flush = () => act(async () => { await Promise.resolve() })

  beforeEach(() => {
    localStorage.clear()
    monkiTurn.mockReset()
    onSettings.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('without a key it explains what is needed and goes to the settings', () => {
    render(null)
    openPanel()
    expect(container.textContent).toContain('Anthropic anahtarını')
    act(() => container.querySelector<HTMLButtonElement>('.monki-setup .btn')!.click())
    expect(onSettings).toHaveBeenCalled()
    expect(container.querySelector('.monki-panel')).toBeNull()
  })

  it('says the account must be approved first when it is not', () => {
    render('sk-test', true)
    // A stored key stays unused until the approval: the provider hands null then, as App does.
    render(null, true)
    openPanel()
    expect(container.textContent).toContain('onaylanması')
  })

  it('greets, sends a message with the weak words and shows the reply and its suggestions', async () => {
    monkiTurn.mockResolvedValue({ reply: 'Bonjour! **la maison** = ev', suggestions: ['Bir örnek daha'] })
    render('sk-test')
    openPanel()
    expect(container.textContent).toContain('Merhaba Ali!')
    const starter = container.querySelector<HTMLButtonElement>('.monki-chips .chip')!
    act(() => starter.click())
    await flush()
    expect(monkiTurn).toHaveBeenCalledTimes(1)
    const [key, req] = monkiTurn.mock.calls[0]
    expect(key).toBe('sk-test')
    expect(req.language).toBe('fr')
    expect(req.weakWords).toEqual(['maison'])
    expect(req.history.at(-1).role).toBe('user')
    expect(container.querySelector('.monki-msg.from-monki strong')?.textContent).toBe('la maison')
    expect(container.querySelector('.monki-chips')?.textContent).toContain('Bir örnek daha')
    expect(JSON.parse(localStorage.getItem('diloloji:monki:fr')!)).toHaveLength(2)
  })

  it('keeps the chat of each language apart and can clear it', async () => {
    localStorage.setItem('diloloji:monki:fr', JSON.stringify([{ role: 'user', text: 'salut' }, { role: 'assistant', text: 'coucou' }]))
    render('sk-test')
    openPanel()
    expect(container.textContent).toContain('coucou')
    const clear = [...container.querySelectorAll<HTMLButtonElement>('.monki-head .btn')].find((b) => b.textContent === 'Temizle')!
    act(() => clear.click())
    expect(container.textContent).not.toContain('coucou')
    expect(localStorage.getItem('diloloji:monki:fr')).toBeNull()
  })

  it('shows an error without losing the question when the reply fails', async () => {
    monkiTurn.mockRejectedValue(new Error('boom'))
    render('sk-test')
    openPanel()
    act(() => container.querySelector<HTMLButtonElement>('.monki-chips .chip')!.click())
    await flush()
    expect(container.querySelector('.monki-error')?.textContent).toContain('cevap veremedi')
    expect(container.querySelectorAll('.monki-msg.from-user')).toHaveLength(1)
  })

  it('closes with Escape', () => {
    render('sk-test')
    openPanel()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('.monki-panel')).toBeNull()
    expect(container.querySelector('.monki-fab')).toBeTruthy()
  })
})
