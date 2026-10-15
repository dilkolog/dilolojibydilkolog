// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from '../aiContext'

const monkiTurn = vi.fn()
vi.mock('../../ai', async (orig) => ({ ...(await orig<typeof import('../../ai')>()), monkiTurn: (...a: unknown[]) => monkiTurn(...a) }))
import Monki from './Monki'
import { askMonki } from './monkiBus'

describe('Monki', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const onSettings = vi.fn()

  const render = (apiKey: string | null, needsApproval = false, extra: { inSession?: boolean; showButton?: boolean } = {}) =>
    act(() =>
      root.render(
        <AiContext.Provider value={{ apiKey, needsApproval, setApiKey: async () => {} }}>
          <Monki language="fr" name="Ali" weakWords={['maison']} mistakes={[{ word: 'maison', given: 'maisson', expected: 'maison' }]} onSettings={onSettings} {...extra} />
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

  const modeChip = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('.monki-modes .chip')].find((b) => b.textContent === label)!

  it('has four modes; a quiz is asked with the mode and its own starters', async () => {
    monkiTurn.mockResolvedValue({ reply: 'Soru 1', suggestions: [] })
    render('sk-test')
    openPanel()
    act(() => modeChip('Sınav').click())
    expect(container.textContent).toContain('Sınav zamanı')
    act(() => container.querySelector<HTMLButtonElement>('.monki-chips .chip')!.click())
    await flush()
    expect(monkiTurn.mock.calls[0][1].mode).toBe('quiz')
  })

  it('a role-play starts by choosing the scene, which goes along with every turn', async () => {
    monkiTurn.mockResolvedValue({ reply: 'Bonjour!', suggestions: ['Un café, s’il vous plaît'] })
    render('sk-test')
    openPanel()
    act(() => modeChip('Rol yap').click())
    act(() => [...container.querySelectorAll<HTMLButtonElement>('.monki-scene')].find((b) => b.textContent === 'Kafede sipariş vermek')!.click())
    await flush()
    const req = monkiTurn.mock.calls[0][1]
    expect(req.mode).toBe('roleplay')
    expect(req.scenario).toBe('Kafede sipariş vermek')
    // The suggestions are things to say back; tapping one is a plain turn of the same scene.
    act(() => container.querySelector<HTMLButtonElement>('.monki-chips .chip')!.click())
    await flush()
    expect(monkiTurn.mock.calls[1][1].scenario).toBe('Kafede sipariş vermek')
  })

  it('the mistakes mode sends the recent mistakes', async () => {
    monkiTurn.mockResolvedValue({ reply: 'Bakalım', suggestions: [] })
    render('sk-test')
    openPanel()
    act(() => modeChip('Hatalarım').click())
    act(() => container.querySelector<HTMLButtonElement>('.monki-chips .chip')!.click())
    await flush()
    expect(monkiTurn.mock.calls[0][1].mistakes).toEqual([{ word: 'maison', given: 'maisson', expected: 'maison' }])
  })

  it('a question from the screen opens the chat and is sent at once', async () => {
    monkiTurn.mockResolvedValue({ reply: 'Şöyle…', suggestions: [] })
    render('sk-test')
    await act(async () => askMonki({ text: '“maison” kelimesini anlat', send: true }))
    await flush()
    expect(container.querySelector('.monki-panel')).toBeTruthy()
    expect(monkiTurn).toHaveBeenCalledTimes(1)
    expect(monkiTurn.mock.calls[0][1].history.at(-1).text).toBe('“maison” kelimesini anlat')
  })

  it('a question without "send" waits in the box for the learner to read and change', async () => {
    render('sk-test')
    await act(async () => askMonki({ text: 'Bu cümleyi açıkla' }))
    expect(container.querySelector<HTMLTextAreaElement>('.monki-form textarea')!.value).toBe('Bu cümleyi açıkla')
    expect(monkiTurn).not.toHaveBeenCalled()
  })

  it('in a session there is no button, the chat pauses the shortcuts, and closing hands the focus back', async () => {
    render('sk-test', false, { inSession: true, showButton: false })
    expect(container.querySelector('.monki-fab')).toBeNull()
    const keep = document.createElement('button')
    document.body.appendChild(keep)
    keep.focus()
    await act(async () => askMonki({ text: 'x' }))
    expect(container.querySelector('.monki-panel')!.getAttribute('aria-modal')).toBe('true')
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('.monki-panel')).toBeNull()
    expect(document.activeElement).toBe(keep)
    keep.remove()
  })
})
