// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DictionaryScreen } from './Dictionary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))

vi.mock('../data/wordpack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/wordpack')>()
  return {
    ...actual,
    loadPack: vi.fn(async (lang: string) => {
      if (lang === 'fr') {
        return {
          w: {
            chat: {
              t: ['kedi'],
              x: {
                en: ['cat'],
                es: ['gato'],
              },
              c: [['Le chat dort.', 'Kedi uyuyor.']],
            },
          },
        }
      }
      return undefined
    }),
  }
})

describe('DictionaryScreen cross-language links', () => {
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

  it('calls onSwitchLanguage when clicking cross-language translations', async () => {
    const onSwitchLanguage = vi.fn()

    await act(async () => {
      root.render(
        <DictionaryScreen
          language="fr"
          vocabulary={[]}
          initialQuery="chat"
          onOpenWord={() => {}}
          onAdd={() => {}}
          onSwitchLanguage={onSwitchLanguage}
        />,
      )
    })

    // Wait for the index build and render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const buttons = rootEl.querySelectorAll('button')
    const catBtn = Array.from(buttons).find((b) => b.textContent?.trim() === 'cat')
    expect(catBtn).toBeDefined()

    act(() => {
      catBtn?.click()
    })

    expect(onSwitchLanguage).toHaveBeenCalledWith('en', 'cat')
  })

  it('renders pen icon on meaning correction button and toggles editing form', async () => {
    await act(async () => {
      root.render(
        <DictionaryScreen
          language="fr"
          vocabulary={[]}
          initialQuery="chat"
          onOpenWord={() => {}}
          onAdd={() => {}}
        />,
      )
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const buttons = rootEl.querySelectorAll('button')
    const fixBtn = Array.from(buttons).find((b) => b.textContent?.includes('Anlamı düzelt'))
    expect(fixBtn).toBeDefined()
    // Verify pen icon is present inside button
    expect(fixBtn?.querySelector('svg')).not.toBeNull()

    // Clicking opens the edit form with an input
    act(() => {
      fixBtn?.click()
    })

    const input = rootEl.querySelector<HTMLInputElement>('#dict-fix')
    expect(input).not.toBeNull()
    expect(input?.value).toBe('kedi')
  })
})
