// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ExternalResources } from './ExternalResources'

describe('ExternalResources', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })
  afterEach(() => {
    act(() => root.unmount())
    rootEl.remove()
  })
  const show = (language: 'en' | 'fr' | 'es') => act(() => root.render(<ExternalResources language={language} />))

  it('lists the outside site of the language as a link that opens in a new tab without leaking the opener', () => {
    show('fr')
    const link = rootEl.querySelector('a')!
    expect(link.textContent).toContain('TV5Monde')
    expect(link.getAttribute('href')).toBe('https://apprendre.tv5monde.com/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('has a site for each learned language and says the content is not copied', () => {
    for (const language of ['en', 'fr', 'es'] as const) {
      show(language)
      expect(rootEl.querySelectorAll('a').length).toBeGreaterThan(0)
    }
    show('es')
    expect(rootEl.textContent).toContain('kopyalamıyoruz')
    expect(rootEl.querySelector('a')!.textContent).toContain('DELE Ahora')
  })
})
