// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClickableSentence, DictionaryExamples } from './DictionaryExamples'
import { AiContext } from './aiContext'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))

describe('ClickableSentence', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })

  it('renders plain text when onPick is not provided', () => {
    act(() => {
      root.render(<ClickableSentence text="Bonjour le monde!" language="fr" />)
    })

    expect(rootEl.textContent).toBe('Bonjour le monde!')
    expect(rootEl.querySelectorAll('button').length).toBe(0)
  })

  it('renders clickable buttons for each word and triggers onPick on click', () => {
    const onPick = vi.fn()

    act(() => {
      root.render(
        <ClickableSentence
          text="Bonjour le monde!"
          language="fr"
          activeWord="monde"
          onPick={onPick}
        />,
      )
    })

    const buttons = rootEl.querySelectorAll('button')
    expect(buttons.length).toBe(3)
    expect(buttons[0].textContent).toBe('Bonjour')
    expect(buttons[1].textContent).toBe('le')
    expect(buttons[2].textContent).toBe('monde')

    // Active word should have is-active class
    expect(buttons[2].classList.contains('is-active')).toBe(true)
    expect(buttons[0].classList.contains('is-active')).toBe(false)

    act(() => {
      buttons[0].click()
    })
    expect(onPick).toHaveBeenCalledWith('Bonjour')
  })
})

describe('DictionaryExamples', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })

  it('renders bundled sentences with clickable words', async () => {
    const onPick = vi.fn()

    await act(async () => {
      root.render(
        <AiContext.Provider value={{ apiKey: null, setApiKey: async () => {} }}>
          <DictionaryExamples
            language="fr"
            word="pomme"
            bundled={[['J’aime la pomme.', 'Elmayı seviyorum.']]}
            meaning="elma"
            onPick={onPick}
          />
        </AiContext.Provider>,
      )
    })

    expect(rootEl.textContent).toContain('J’aime la pomme.')
    expect(rootEl.textContent).toContain('Elmayı seviyorum.')

    // The sentence contains clickable buttons
    const buttons = rootEl.querySelectorAll('.sentence-word-btn')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders empty state when there are no sentences and no patterns', async () => {
    await act(async () => {
      root.render(
        <AiContext.Provider value={{ apiKey: null, setApiKey: async () => {} }}>
          <DictionaryExamples language="fr" word="introuvable" bundled={[]} />
        </AiContext.Provider>,
      )
    })

    expect(rootEl.textContent).toContain('Bu kelime için kayıtlı örnek cümle bulunamadı.')
    // With no apiKey, AI button is not shown
    expect(rootEl.textContent).not.toContain('YZ ile örnek cümle üret')
  })

  it('shows YZ button when apiKey is provided', async () => {
    await act(async () => {
      root.render(
        <AiContext.Provider value={{ apiKey: 'test-key', setApiKey: async () => {} }}>
          <DictionaryExamples language="fr" word="pomme" bundled={[]} />
        </AiContext.Provider>,
      )
    })

    expect(rootEl.textContent).toContain('YZ ile örnek cümle üret')
  })
})
