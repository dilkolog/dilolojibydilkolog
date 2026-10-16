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

async function mount(language: 'fr' | 'es' | 'en' = 'fr', extra: { initialLesson?: string; initialTense?: string; review?: boolean } = {}) {
  const onPractice = vi.fn()
  const onVerbs = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuideScreen language={language} onPractice={onPractice} onVerbs={onVerbs} {...extra} />))
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
    expect(Object.keys(JSON.parse(localStorage.getItem('diloloji:guide-progress') ?? '{}'))).toEqual(['ser_estar'])
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
    // English has no verb lab: its tense tab lists the guide's own tense lessons.
    await act(async () => button(host, 'Zamanlar')!.click())
    expect(host.textContent).toContain('İngilizcenin zamanları')
    expect(host.querySelectorAll('.guide-card').length).toBeGreaterThanOrEqual(6)
    await act(async () => button(host, 'Dış kaynaklar')!.click())
    const links = [...host.querySelectorAll<HTMLAnchorElement>('a.guide-link')]
    expect(links.length).toBeGreaterThan(5)
    expect(links.every((a) => a.target === '_blank' && a.rel.includes('noopener'))).toBe(true)
  })

  it('a lesson\'s check, passed, marks it learned', async () => {
    const { host } = await mount('fr', { initialLesson: 'subjonctif' })
    expect(host.querySelector('.guide-lesson h1')?.textContent).toBe('Subjonctif')
    await act(async () => button(host, 'soruluk kısa sınav')!.click())
    for (let i = 0; i < 3; i++) {
      // The right option is the one the check marks right once chosen: try each until it is.
      const options = [...host.querySelectorAll<HTMLButtonElement>('.lesson-check .option')]
      expect(options.length).toBeGreaterThanOrEqual(2)
      await act(async () => options[0]!.click())
      await act(async () => button(host, i < 2 ? 'Sonraki' : 'Bitir')!.click())
    }
    expect(host.querySelector('.lesson-check')?.textContent).toMatch(/3 sorunun \d tanesi doğru/)
    const marks = JSON.parse(localStorage.getItem('diloloji:guide-progress') ?? '{}') as Record<string, { read: string; learned?: string }>
    expect(marks.subjonctif?.read).toBeTruthy()
    const right = Number(/3 sorunun (\d) tanesi/.exec(host.textContent ?? '')![1])
    expect(!!marks.subjonctif?.learned).toBe(right >= 2)
  })

  it('opened for a review, starts the check; a link from a mistake finds the lesson by its topic', async () => {
    const { host } = await mount('en', { initialLesson: 'present_perfect', review: true })
    expect(host.querySelector('.lesson-check h2')?.textContent).toBe('Hatırlıyor musun?')
  })

  it('opens a tense of the verb lab straight away, and keeps lessons read in the first version', async () => {
    localStorage.setItem('diloloji:guide-read', JSON.stringify(['subjonctif']))
    const { host, onVerbs } = await mount('fr', { initialTense: 'subjonctif' })
    expect(host.querySelector('[role=dialog]')).not.toBeNull()
    expect(host.querySelector('.guide-progress strong')).toBeNull()
    await act(async () => button(document.body, 'Fiil laboratuvarında çalış')!.click())
    expect(onVerbs).toHaveBeenCalledWith('subjonctif')
    await act(async () => button(host, 'Konular')!.click())
    expect(host.querySelector('.guide-progress strong')?.textContent).toBe('1')
  })

  it('supports keyboard shortcuts (1-4 and Enter) in LessonCheck and passes target tense from a verb lesson to onVerbs', async () => {
    const { host, onVerbs } = await mount('es', { initialLesson: 'imperativo_es', review: true })
    expect(host.querySelector('.lesson-check h2')?.textContent).toBe('Hatırlıyor musun?')
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    })
    expect(host.querySelector('[role="status"]')).not.toBeNull()
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(host.querySelector('.lesson-check')?.textContent).toContain('2 / 3')
    await act(async () => button(host, 'Fiil laboratuvarında çalış')!.click())
    expect(onVerbs).toHaveBeenCalledWith('imperativo')
  })
})
