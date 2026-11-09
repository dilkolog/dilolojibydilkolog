// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'
import { forgetStartLanguage, rememberStartLanguage, startLanguage } from './startLanguage'

function mount(onDone = vi.fn()) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => root.render(<Onboarding onDone={onDone} />))
  const button = (name: RegExp) => [...el.querySelectorAll('button')].find((b) => name.test(b.textContent ?? ''))!
  return {
    el,
    button,
    done: () => {
      act(() => root.unmount())
      el.remove()
    },
  }
}

describe('the language picked on the landing page', () => {
  afterEach(() => localStorage.clear())

  it('is kept only when it is one of the languages', () => {
    expect(startLanguage()).toBeNull()
    rememberStartLanguage('es')
    expect(startLanguage()).toBe('es')
    localStorage.setItem('diloloji:start-lang', 'de')
    expect(startLanguage()).toBeNull()
    rememberStartLanguage('fr')
    forgetStartLanguage()
    expect(startLanguage()).toBeNull()
  })

  it('is already chosen on the first-run screen, and forgotten once it is done', () => {
    rememberStartLanguage('es')
    const onDone = vi.fn()
    const { el, button, done } = mount(onDone)
    act(() => button(/^Başlayalım$/).click())
    expect(el.querySelector('.lang-card[aria-pressed="true"]')?.textContent).toContain('İspanyolca')
    act(() => button(/^Devam$/).click())
    act(() => button(/İspanyolca ile başlayalım/).click())
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ activeLanguage: 'es' }))
    expect(startLanguage()).toBeNull()
    done()
  })

  it('without one, the first-run screen starts on English as before', () => {
    const { el, button, done } = mount()
    act(() => button(/^Başlayalım$/).click())
    expect(el.querySelector('.lang-card[aria-pressed="true"]')?.textContent).toContain('İngilizce')
    done()
  })
})
