// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuideScreen } from './Guide'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

async function mount(language: 'fr' | 'es' | 'en' = 'fr') {
  const onPractice = vi.fn()
  const onVerbs = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuideScreen language={language} onPractice={onPractice} onVerbs={onVerbs} />))
  await act(() => new Promise((r) => setTimeout(r, 20)))
  return { host, onPractice, onVerbs }
}

const button = (host: HTMLElement, text: string | RegExp) =>
  [...host.querySelectorAll('button')].find((b) => (typeof text === 'string' ? b.textContent?.includes(text) : text.test(b.textContent ?? '')))

describe('GuideScreen', () => {
  it('opens a lesson and leads to its questions', async () => {
    const { host, onPractice } = await mount('fr')
    const card = button(host, 'Subjonctif')!
    await act(async () => card.click())
    expect(host.querySelector('.guide-lesson h1')?.textContent).toBe('Subjonctif')
    await act(async () => button(host, /Bu konuda \d+ soru çöz/)!.click())
    expect(onPractice).toHaveBeenCalledWith('subjonctif')
  })

  it('remembers a lesson marked as read', async () => {
    const { host } = await mount('es')
    await act(async () => button(host, 'Ser ve estar')!.click())
    await act(async () => button(host, 'Okudum olarak işaretle')!.click())
    await act(async () => button(host, 'Rehber')!.click())
    expect(host.querySelector('.guide-progress strong')?.textContent).toBe('1')
    expect(JSON.parse(localStorage.getItem('diloloji:guide-read') ?? '[]')).toEqual(['ser_estar'])
  })

  it('filters by search and shows the outside links', async () => {
    const { host } = await mount('en')
    const search = host.querySelector<HTMLInputElement>('.guide-search')!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(search, 'zzzz-nothing')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.textContent).toContain('Bu aramaya uyan konu yok.')
    // English has no tense tab (the verb lab is French and Spanish).
    expect(button(host, 'Zamanlar')).toBeUndefined()
    await act(async () => button(host, 'Dış kaynaklar')!.click())
    const links = [...host.querySelectorAll<HTMLAnchorElement>('a.guide-link')]
    expect(links.length).toBeGreaterThan(5)
    expect(links.every((a) => a.target === '_blank' && a.rel.includes('noopener'))).toBe(true)
  })
})
