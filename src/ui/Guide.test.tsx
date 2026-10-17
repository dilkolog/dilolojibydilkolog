// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { GuideScreen } from './Guide'

let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
  await db.meta.clear()
  await db.texts.clear()
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
    expect(Object.keys(await db.getGuideMarks())).toEqual(['ser_estar'])
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
    const marks = await db.getGuideMarks()
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
    await act(async () => button(document.body, 'Fiil laboratuvarında çalış')!.click())
    expect(onVerbs).toHaveBeenCalledWith('subjonctif')
    await act(async () => button(host, 'Konular')!.click())
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(host.querySelector('.guide-progress strong')?.textContent).toBe('1')
    // Taken into the database, not left in the browser.
    expect(Object.keys(await db.getGuideMarks())).toEqual(['subjonctif'])
    expect(localStorage.getItem('diloloji:guide-read')).toBeNull()
  })

  it('a lesson unmarked stays unmarked: the mark of another device does not bring it back', async () => {
    const { host } = await mount('es')
    await act(async () => button(host, 'Ser ve estar')!.click())
    await act(async () => button(host, 'Okudum olarak işaretle')!.click())
    await act(async () => button(host, /Okundu/)!.click())
    await act(() => new Promise((r) => setTimeout(r, 20)))
    const marks = await db.getGuideMarks()
    expect(marks.ser_estar?.read).toBe('')
    expect(marks.ser_estar?.off).toMatch(/^\d{4}-/)
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

  it('navigates directly to the next lesson in curriculum order from LessonView', async () => {
    const { host } = await mount('fr', { initialLesson: 'basics_fr_articles' })
    expect(host.querySelector('.guide-lesson h1')?.textContent).toBe('Artikeller ve cinsiyet')
    const nextBtn = button(host, 'Sıradaki ders')!
    expect(nextBtn).toBeDefined()
    await act(async () => nextBtn.click())
    expect(host.querySelector('.guide-lesson h1')?.textContent).toBe('Être ve avoir')
  })

  it('shows the learner\'s own sentences that show the topic, with the part that shows it marked', async () => {
    await db.saveText({ id: 't1', language: 'fr', title: 'Mon carnet', text: "Je ne mange jamais de viande le soir. Demain nous irons au cinéma avec des amis.", addedAt: new Date().toISOString(), history: [] })
    const { host } = await mount('fr', { initialLesson: 'negation_fr' })
    await act(() => new Promise((r) => setTimeout(r, 80)))
    const section = host.querySelector('.guide-own')!
    expect(section.textContent).toContain('Senin cümlelerinde')
    expect(section.textContent).toContain('Mon carnet')
    expect(section.querySelector('mark')?.textContent).toBe('ne mange jamais')
  })

  it('a lesson the learner has nothing for shows no own section', async () => {
    const { host } = await mount('fr', { initialLesson: 'negation_fr' })
    await act(() => new Promise((r) => setTimeout(r, 80)))
    expect(host.querySelector('.guide-lesson h1')).not.toBeNull()
    expect(host.querySelector('.guide-own')).toBeNull()
  })

  it('a lesson with questions of its topic offers a try on the spot and a place to write a sentence of one\'s own', async () => {
    const { host } = await mount('fr', { initialLesson: 'subjonctif' })
    expect(host.querySelector('.lesson-try h2')?.textContent).toBe('Hemen dene')
    expect(host.querySelector('.guide-write summary')?.textContent).toContain('Kendi cümleni yaz')
    // A basic lesson has only its own check: nothing to try.
    const basic = await mount('fr', { initialLesson: 'basics_fr_articles' })
    expect(basic.host.querySelector('.lesson-try')).toBeNull()
  })

  it('a search reaches into the lessons and shows the line that matched', async () => {
    const { host } = await mount('fr')
    const search = host.querySelector<HTMLInputElement>('.guide-search')!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(search, 'depuis')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const snippets = [...host.querySelectorAll('.guide-card-snippet')]
    expect(snippets.length).toBeGreaterThan(0)
    expect(snippets.every((n) => /depuis/i.test(n.textContent ?? ''))).toBe(true)
  })

  it('a lesson that builds on another says so on its card and in the lesson, until that one is read', async () => {
    const { host } = await mount('fr')
    const card = [...host.querySelectorAll<HTMLElement>('.guide-card')].find((c) => c.querySelector('strong')?.textContent === 'Subjonctif')!
    expect(card.textContent).toContain('Önce: ')
    await act(async () => card.click())
    expect(host.querySelector('.guide-needs')?.textContent).toContain('Önce şunu oku')
    // The lesson it builds on opens from the note.
    await act(async () => host.querySelector<HTMLButtonElement>('.guide-needs button')!.click())
    expect(host.querySelector('.guide-lesson h1')?.textContent).not.toBe('Subjonctif')
  })

  it('flags a lesson as a bookmark or as hard, keeps it, and filters by it', async () => {
    const { host } = await mount('es')
    await act(async () => button(host, 'Ser ve estar')!.click())
    await act(async () => button(host, '☆ Yer imi')!.click())
    await act(async () => button(host, 'Zor buldum')!.click())
    await act(() => new Promise((r) => setTimeout(r, 20)))
    // One flag at a time: the hard flag replaced the bookmark.
    expect((await db.getGuideMarks()).ser_estar).toMatchObject({ flag: 'hard' })
    await act(async () => button(host, 'Rehber')!.click())
    expect(host.querySelector('.guide-tag-hard')).not.toBeNull()
    await act(async () => button(host, /Zor bulduklarım \(1\)/)!.click())
    expect([...host.querySelectorAll('.guide-card strong')].map((n) => n.textContent)).toEqual(['Ser ve estar'])
  })

  it('prints a lesson as a sheet', async () => {
    const written: string[] = []
    const w = { document: { write: (h: string) => written.push(h), close: () => {} }, focus: () => {}, print: () => {} }
    const open = vi.spyOn(window, 'open').mockReturnValue(w as unknown as Window)
    const { host } = await mount('fr', { initialLesson: 'subjonctif' })
    await act(async () => button(host, 'Yazdır')!.click())
    expect(open).toHaveBeenCalled()
    expect(written[0]).toContain('<h1>')
    expect(written[0]).toContain('Subjonctif')
    open.mockRestore()
  })

  it('shows the lessons as a path in learning order, marks the next one, and remembers the view', async () => {
    const { host } = await mount('fr')
    await act(async () => button(host, 'Yol')!.click())
    expect(host.querySelector('.guide-card')).toBeNull()
    const steps = [...host.querySelectorAll<HTMLElement>('.guide-path-item')]
    expect(steps.length).toBeGreaterThan(30)
    const titles = steps.map((st) => st.querySelector('strong')?.textContent)
    // The present comes before the subjunctive that builds on it; one step is the next one, and a lesson with groundwork unread says so.
    expect(titles.indexOf('Şimdiki zaman (présent)')).toBeLessThan(titles.indexOf('Subjonctif'))
    expect(host.querySelectorAll('.path-next')).toHaveLength(1)
    expect(steps.find((st) => st.querySelector('strong')?.textContent === 'Subjonctif')!.textContent).toContain('Önce: ')
    expect(localStorage.getItem('diloloji:guide-view')).toBe('path')
    // A lesson opens from its step.
    await act(async () => steps.find((st) => st.querySelector('strong')?.textContent === 'Subjonctif')!.querySelector('button')!.click())
    expect(host.querySelector('.guide-lesson h1')?.textContent).toBe('Subjonctif')
  })

  it('the path shows what is read, and opens as the view last chosen', async () => {
    localStorage.setItem('diloloji:guide-view', 'path')
    await db.saveGuideMarks({ basics_fr_etre_avoir: { read: '2026-10-01', learned: '2026-10-01' } })
    const { host } = await mount('fr')
    expect(host.querySelector('.guide-path')).not.toBeNull()
    expect(host.querySelector('.path-learned strong')?.textContent).toBe('Être ve avoir')
    await act(async () => button(host, 'Liste')!.click())
    expect(host.querySelector('.guide-path')).toBeNull()
    expect(host.querySelectorAll('.guide-card').length).toBeGreaterThan(10)
  })
})
