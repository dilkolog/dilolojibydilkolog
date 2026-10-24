// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from '../aiContext'

const monkiTurn = vi.fn()
const speech = vi.hoisted(() => ({ canSpeak: vi.fn(() => false), speak: vi.fn(), stopSpeaking: vi.fn() }))
const input = vi.hoisted(() => ({ canListen: vi.fn(() => false), listen: vi.fn() }))
vi.mock('../speech', () => speech)
vi.mock('../speechInput', () => input)
vi.mock('../../ai', async (orig) => ({ ...(await orig<typeof import('../../ai')>()), monkiTurn: (...a: unknown[]) => monkiTurn(...a) }))
const saveSentence = vi.fn()
vi.mock('../saveSentence', () => ({ saveSentence: (...a: unknown[]) => saveSentence(...a) }))
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
    saveSentence.mockReset()
    speech.canSpeak.mockReturnValue(false)
    speech.speak.mockReset()
    input.canListen.mockReturnValue(false)
    input.listen.mockReset()
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

  it('a correction can be kept as a sentence card, with the word that changed blanked first', async () => {
    saveSentence.mockResolvedValueOnce(true)
    localStorage.setItem(
      'diloloji:monki:fr',
      JSON.stringify([
        { role: 'user', text: 'Je veux un café' },
        { role: 'assistant', text: 'Très bien !\n✏️ Düzeltme: “Je voudrais un café” — kibar istek için.' },
      ]),
    )
    render('sk-test')
    openPanel()
    const button = [...container.querySelectorAll<HTMLButtonElement>('.monki-save button')].find((b) => b.textContent?.includes('karta ekle'))!
    await act(async () => button.click())
    expect(saveSentence).toHaveBeenCalledWith({ language: 'fr', text: 'Je voudrais un café', focus: 'voudrais', source: 'Monki düzeltmesi', note: 'Monki: kibar istek için.' })
    expect(container.querySelector('.monki-save')?.textContent).toContain('eklendi')
  })

  it('shows no save button on a message without a correction', () => {
    localStorage.setItem('diloloji:monki:fr', JSON.stringify([{ role: 'user', text: 'salut' }, { role: 'assistant', text: 'coucou' }]))
    render('sk-test')
    openPanel()
    expect(container.querySelector('.monki-save')).toBeNull()
  })

  it('in a role-play with voice on, the other person\'s line is spoken; the microphone sends what was heard', async () => {
    speech.canSpeak.mockReturnValue(true)
    input.canListen.mockReturnValue(true)
    const finish = vi.fn()
    let handlers: { onFinal: (a: string[]) => void; onEnd?: () => void } | undefined
    input.listen.mockImplementation((_l: string, h: typeof handlers) => {
      handlers = h
      return Object.assign(() => {}, { finish })
    })
    monkiTurn.mockResolvedValue({ reply: 'Le serveur: Bonjour ! Que désirez-vous ?', say: 'Bonjour ! Que désirez-vous ?', suggestions: [] })
    render('sk-test')
    openPanel()
    act(() => [...container.querySelectorAll<HTMLButtonElement>('.monki-modes .chip')].find((b) => b.textContent?.includes('Rol yap'))!.click())
    expect(container.textContent).toContain('Sesli: açık')
    await act(async () => container.querySelector<HTMLButtonElement>('.monki-scene')!.click())
    await flush()
    expect(speech.speak).toHaveBeenCalledWith('Bonjour ! Que désirez-vous ?', 'fr')
    // The learner answers by voice: the heard sentence goes to Monki as a message.
    monkiTurn.mockResolvedValue({ reply: 'Très bien.', say: 'Très bien.', suggestions: [] })
    act(() => container.querySelector<HTMLButtonElement>('.monki-mic')!.click())
    expect(input.listen).toHaveBeenCalledTimes(1)
    await act(async () => handlers!.onFinal(['Je voudrais un café']))
    await flush()
    expect(monkiTurn.mock.calls.at(-1)![1].history.at(-1)).toEqual({ role: 'user', text: 'Je voudrais un café' })
  })

  it('with voice off nothing is spoken', async () => {
    speech.canSpeak.mockReturnValue(true)
    localStorage.setItem('diloloji:monki-voice', 'off')
    monkiTurn.mockResolvedValue({ reply: 'Bonjour', say: 'Bonjour', suggestions: [] })
    render('sk-test')
    openPanel()
    act(() => [...container.querySelectorAll<HTMLButtonElement>('.monki-modes .chip')].find((b) => b.textContent?.includes('Rol yap'))!.click())
    await act(async () => container.querySelector<HTMLButtonElement>('.monki-scene')!.click())
    await flush()
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('offers all the corrections of a scene as cards at once', async () => {
    saveSentence.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    localStorage.setItem(
      'diloloji:monki:fr',
      JSON.stringify([
        { role: 'user', text: 'Je veux un café' },
        { role: 'assistant', text: '✏️ Düzeltme: “Je voudrais un café” — kibar.' },
        { role: 'user', text: 'Il y a un table' },
        { role: 'assistant', text: '✏️ Düzeltme: “Il y a une table” — table dişil.' },
      ]),
    )
    render('sk-test')
    openPanel()
    const all = container.querySelector<HTMLButtonElement>('.monki-save-all button')!
    expect(all.textContent).toContain('2 düzeltmesini')
    await act(async () => all.click())
    expect(saveSentence).toHaveBeenCalledTimes(2)
    expect(container.querySelector('.monki-save-all')?.textContent).toContain('1 cümle kartlarına eklendi (1 zaten vardı)')
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

  it('does not show clear button when there is no key even if history exists in storage', () => {
    localStorage.setItem('diloloji:monki:fr', JSON.stringify([{ role: 'user', text: 'salut' }]))
    render(null)
    openPanel()
    const clear = [...container.querySelectorAll<HTMLButtonElement>('.monki-head .btn')].find((b) => b.textContent === 'Temizle')
    expect(clear).toBeUndefined()
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

  it('in a session the small button opens the chat and closing does not hand it the focus', () => {
    render('sk-test', false, { inSession: true })
    const fab = container.querySelector<HTMLButtonElement>('.monki-fab')!
    expect(fab.classList.contains('monki-fab-session')).toBe(true)
    fab.focus()
    act(() => fab.click())
    expect(container.querySelector('.monki-panel')!.getAttribute('aria-modal')).toBe('true')
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('.monki-panel')).toBeNull()
    expect(document.activeElement).not.toBe(container.querySelector('.monki-fab'))
  })

  it('animates Monki on the opening screen and cycles poses when tapped', () => {
    render(null)
    openPanel()
    const stage = container.querySelector<HTMLElement>('.monki-stage')!
    const bubble = container.querySelector<HTMLElement>('.monki-bubble')!
    expect(stage).toBeTruthy()
    expect(bubble.getAttribute('data-bubble')).toBe('Salut !')
    act(() => stage.click())
    expect(bubble.getAttribute('data-bubble')).toBe('On y va !')
  })

  describe('memory', () => {
    const starter = () => act(() => container.querySelector<HTMLButtonElement>('.monki-chips .chip')!.click())
    const memoryButton = () => [...container.querySelectorAll<HTMLButtonElement>('.monki-head button')].find((b) => b.textContent?.includes('Hatırladıkları'))!

    it('keeps the notes Monki returns and hands them back on the next turn', async () => {
      monkiTurn.mockResolvedValueOnce({ reply: 'Tamam', suggestions: [], remember: ['passé composé ile imparfait karışıyor'] })
      monkiTurn.mockResolvedValueOnce({ reply: 'Devam', suggestions: [] })
      render('sk-test')
      openPanel()
      starter()
      await flush()
      expect(JSON.parse(localStorage.getItem('diloloji:monki-memory:fr')!)).toMatchObject([{ text: 'passé composé ile imparfait karışıyor' }])
      expect(monkiTurn.mock.calls[0][1].memory).toBeUndefined()
      const field = container.querySelector<HTMLTextAreaElement>('textarea')!
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'devam')
        field.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () => container.querySelector<HTMLButtonElement>('.monki-send')!.click())
      await flush()
      expect(monkiTurn.mock.calls[1][1].memory).toEqual(['passé composé ile imparfait karışıyor'])
    })

    it('lists the notes, and one can be deleted or all of them', async () => {
      localStorage.setItem('diloloji:monki-memory:fr', JSON.stringify([{ id: 'a', text: 'bir', at: '2026-10-20' }, { id: 'b', text: 'iki', at: '2026-10-21' }]))
      render('sk-test')
      openPanel()
      expect(memoryButton().textContent).toContain('(2)')
      act(() => memoryButton().click())
      expect(container.querySelector('.monki-memory')?.textContent).toContain('bir')
      act(() => container.querySelector<HTMLButtonElement>('.monki-memory-list .icon-btn')!.click())
      expect(JSON.parse(localStorage.getItem('diloloji:monki-memory:fr')!)).toEqual([{ id: 'b', text: 'iki', at: '2026-10-21' }])
      act(() => [...container.querySelectorAll<HTMLButtonElement>('.monki-memory-actions button')].find((b) => b.textContent === 'Hepsini sil')!.click())
      expect(localStorage.getItem('diloloji:monki-memory:fr')).toBeNull()
    })

    it('with remembering off nothing is handed over or kept', async () => {
      localStorage.setItem('diloloji:monki-memory:fr', JSON.stringify([{ id: 'a', text: 'bir', at: '2026-10-20' }]))
      monkiTurn.mockResolvedValue({ reply: 'Tamam', suggestions: [], remember: ['yeni not'] })
      render('sk-test')
      openPanel()
      act(() => memoryButton().click())
      act(() => container.querySelector<HTMLButtonElement>('.monki-memory-actions .chip')!.click())
      expect(localStorage.getItem('diloloji:monki-memory-off')).toBe('1')
      starter()
      await flush()
      expect(monkiTurn.mock.calls[0][1].memory).toBeUndefined()
      expect(JSON.parse(localStorage.getItem('diloloji:monki-memory:fr')!)).toHaveLength(1)
    })
  })
})

