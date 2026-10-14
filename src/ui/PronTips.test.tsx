// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiContext } from './aiContext'
import type { PronResult } from './pronunciation'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const asked = vi.fn(async () => [{ word: 'rue', tip: '“u” sesi Türkçedeki “ü” gibi: dudakları yuvarla.' }])
vi.mock('../ai', () => ({ pronTips: (...a: unknown[]) => asked(...(a as [])), AiError: class extends Error {} }))
const { PronTips } = await import('./PronunciationCheck')

const result = (accuracy: number): PronResult => ({ score: accuracy, accuracy, fluency: 80, completeness: 100, heard: 'la ri', words: [{ word: 'la', accuracy: 95, error: 'None' }, { word: 'rue', accuracy, error: 'Mispronunciation' }] })

describe('pronunciation tips', () => {
  let el: HTMLDivElement
  let root: Root
  beforeEach(() => {
    asked.mockClear()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })
  const show = (apiKey: string | null, r: PronResult) =>
    act(() =>
      root.render(
        <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
          <PronTips text="la rue" language="fr" result={r} />
        </AiContext.Provider>,
      ),
    )

  it('offers nothing without a key or when every word was good', () => {
    show(null, result(50))
    expect(el.textContent).toBe('')
    show('k', result(92))
    expect(el.textContent).toBe('')
  })

  it('names the weak words and asks only on a tap', async () => {
    show('k', result(55))
    const btn = el.querySelector('button')!
    expect(btn.textContent).toContain('rue nasıl söylenir?')
    expect(asked).not.toHaveBeenCalled()
    await act(async () => btn.click())
    expect(asked).toHaveBeenCalledWith('k', { language: 'fr', text: 'la rue', heard: 'la ri', words: [{ word: 'rue', accuracy: 55 }] })
    expect(el.querySelector('.pron-tips')?.textContent).toContain('dudakları yuvarla')
  })
})
