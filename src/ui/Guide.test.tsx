// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import * as lessonOfModule from '../data/guide/lessonOf'
import { checkPool, lessonFor, lessonsOf } from '../data/guide/lessonOf'
import { GuideScreen } from './Guide'

let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
  await db.meta.clear()
  await db.texts.clear()
})

async function mount(language: 'fr' | 'es' | 'en' = 'fr', extra: { initialLesson?: string; initialTense?: string; review?: boolean; placement?: boolean } = {}) {
  const onPractice = vi.fn()
  const onVerbs = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuideScreen language={language} onPractice={onPractice} onVerbs={onVerbs} {...extra} />))
  await act(() => new Promise((r) => setTimeout(r, 50)))
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

  it('a review from Today earns +10 XP once for its step, and says so', async () => {
    const lesson = lessonsOf('en').find((l) => l.check && l.check.length >= 3)!
    const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
    await db.saveGuideMarks({ [lesson.topic]: { read: day(5), learned: day(5), reviewed: day(5), step: 0 } })
    const { host } = await mount('en', { initialLesson: lesson.topic, review: true })
    expect(lessonFor('en', lesson.topic)?.topic).toBe(lesson.topic)
    for (let i = 0; i < 3; i++) {
      // Each question answered right: the item is found by its options.
      const options = [...host.querySelectorAll<HTMLButtonElement>('.lesson-check .option')]
      const shown = options.map((o) => o.textContent ?? '')
      const pool = checkPool(lesson)
      const item = pool.find((c) => c.options.every((o) => shown.some((t) => t.includes(o))))!
      const at = shown.findIndex((t) => t.includes(item.options[item.answer]))
      await act(async () => options[at]!.click())
      await act(async () => button(host, i < 2 ? 'Sonraki' : 'Bitir')!.click())
    }
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(host.querySelector('.lesson-check-xp')?.textContent).toContain('+10 XP')
    expect(await db.getXpLedger()).toMatchObject({ [`review|${lesson.topic}|1`]: { xp: 10 } })
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

  it('remembers on this device which questions of a check were answered, to ask the missed ones first next time', async () => {
    const { host } = await mount('es', { initialLesson: 'imperativo_es', review: true })
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
      })
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      })
    }
    expect(host.querySelector('.lesson-check-done')).not.toBeNull()
    const log = JSON.parse(localStorage.getItem('diloloji:guide-questions:es') ?? '{}') as Record<string, { n: number }>
    expect(Object.keys(log)).toHaveLength(3)
    expect(Object.values(log).every((r) => r.n === 1)).toBe(true)
  })

  it('the placement test finds a level, marks the easier lessons known on request, and undoes it', async () => {
    const { host } = await mount('fr')
    await act(async () => button(host, 'Teste başla')!.click())
    await act(async () => button(host, 'Teste başla')!.click())
    // Answer every question right: the options of a question are shuffled, so the right one is found by its text.
    const { placementFor } = await import('../data/guide/placementData')
    const questions = placementFor('fr')
    for (let i = 0; i < questions.length; i++) {
      const prompt = host.querySelector('.lesson-check-prompt')!.textContent!
      const q = questions.find((x) => x.prompt === prompt)!
      const right = [...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.textContent?.endsWith(q.options[q.answer]!))!
      await act(async () => right.click())
      await act(async () => button(host, /Sonraki|Sonucu gör/)!.click())
    }
    expect(host.querySelector('.lesson-check-done h2')?.textContent).toBe('Her seviyeyi geçtin')
    expect(JSON.parse(localStorage.getItem('diloloji:guide-placement:fr')!).start).toBe('C1')
    await act(async () => button(host, /derslerini biliyorum say/)!.click())
    await act(() => new Promise((r) => setTimeout(r, 30)))
    const marked = await db.getGuideMarks()
    expect(Object.values(marked).filter((m) => m.read === '2000-01-01').length).toBeGreaterThan(20)
    await act(async () => button(host, 'Geri al')!.click())
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(Object.values(await db.getGuideMarks()).filter((m) => m.read === '2000-01-01')).toHaveLength(0)
  })

  it('a lesson and a question of its check can be reported, and the list shows in the guide', async () => {
    const { host } = await mount('fr', { initialLesson: 'subjonctif' })
    await act(async () => button(host, 'Derste hata var')!.click())
    await act(async () => {
      const t = host.querySelector('.report-issue textarea')!
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(t, 'Tablo yanlış')
      t.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => host.querySelector<HTMLButtonElement>('.report-issue button[type="submit"]')!.click())
    const stored = JSON.parse(localStorage.getItem('diloloji:guide-reports')!)
    expect(stored[0]).toMatchObject({ topic: 'subjonctif', kind: 'lesson', note: 'Tablo yanlış' })
    // Back to the topics: the card lists it.
    await act(async () => host.querySelector<HTMLButtonElement>('.guide-back-btn')!.click())
    expect(host.querySelector('.guide-reports summary')?.textContent).toContain('Bildirdiklerin (1)')
  })

  it('opened for the placement test it starts there', async () => {
    const { host } = await mount('fr', { placement: true })
    expect(host.querySelector('.lesson-check h2')?.textContent).toBe('Seviyeni bul')
    expect(button(host, 'Teste başla')).toBeDefined()
  })

  it('a failed level ends the placement test and starts the learner there', async () => {
    const { host } = await mount('fr')
    await act(async () => button(host, 'Teste başla')!.click())
    await act(async () => button(host, 'Teste başla')!.click())
    // "Bilmiyorum" to everything: the first level is not passed, so the test ends after its last question.
    let guard = 0
    while (!host.querySelector('.lesson-check-done') && guard++ < 40) {
      await act(async () => button(host, 'Bilmiyorum')!.click())
      await act(async () => button(host, /Sonraki|Sonucu gör/)!.click())
    }
    expect(guard).toBe(6)
    expect(host.querySelector('.lesson-check-done h2')?.textContent).toBe('A1 seviyesinden başla')
    expect(host.querySelector('.placement-scores')?.textContent).toContain('0/6')
  })

  it('a lesson offers the grammar terms it uses', async () => {
    const { host } = await mount('fr', { initialLesson: 'basics_fr_articles' })
    const chips = [...host.querySelectorAll('.lesson-terms .chip')]
    expect(chips.length).toBeGreaterThan(0)
    await act(async () => (chips[0] as HTMLButtonElement).click())
    expect(host.querySelector('.lesson-term-card')?.textContent?.length).toBeGreaterThan(20)
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
    // A basic lesson with only its own three questions has nothing to try; one with more in its pool tries the spare ones.
    const trySpy = vi.spyOn(lessonOfModule, 'tryFor').mockReturnValueOnce([])
    const basic = await mount('en', { initialLesson: 'basics_en_third_conditional' })
    expect(basic.host.querySelector('.lesson-try')).toBeNull()
    trySpy.mockRestore()
    const grown = await mount('fr', { initialLesson: 'basics_fr_articles' })
    expect(grown.host.querySelector('.lesson-try h2')?.textContent).toBe('Hemen dene')
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

  it('shows the progress of each level, and a finished level as a certificate that can be shared', async () => {
    const nav = navigator as unknown as { share?: unknown }
    const share = vi.fn(async () => {})
    nav.share = share
    const a1 = lessonsOf('fr').filter((l) => l.level === 'A1')
    const marks = Object.fromEntries(a1.map((l) => [l.topic, { read: '2026-10-01', learned: '2026-10-02' }]))
    marks[a1[0]!.topic] = { read: '2026-10-01', learned: '2026-10-09' }
    await db.saveGuideMarks(marks)
    const { host } = await mount('fr')
    const certs = [...host.querySelectorAll<HTMLElement>('.guide-cert')]
    const first = certs.find((c) => c.querySelector('.guide-level-badge')?.textContent === 'A1')!
    expect(first.classList.contains('cert-done')).toBe(true)
    expect(first.textContent).toContain('Tamamlandı · 9 Ekim 2026')
    // The next level is under way, with a count and no card to share.
    const next = certs.find((c) => c.querySelector('.guide-level-badge')?.textContent === 'A2')!
    expect(next.textContent).toMatch(/0 \/ \d+ ders öğrenildi/)
    expect(next.querySelector('button')).toBeNull()
    await act(async () => button(first, 'Paylaş')!.click())
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(share).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(share.mock.calls[0])).toContain('Rehber sertifikası')
    expect(JSON.stringify(share.mock.calls[0])).toContain('Fransızca · A1')
    delete nav.share
  })

  it('shows no certificates before a lesson is learned, nor while searching', async () => {
    const { host } = await mount('fr')
    expect(host.querySelector('.guide-certs')).toBeNull()
    await db.saveGuideMarks({ basics_fr_articles: { read: '2026-10-01', learned: '2026-10-01' } })
    root?.unmount()
    const again = await mount('fr')
    expect(again.host.querySelector('.guide-certs')).not.toBeNull()
    const search = again.host.querySelector<HTMLInputElement>('.guide-search')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'subjonctif')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(again.host.querySelector('.guide-certs')).toBeNull()
  })

  it('renders per-level progress badges and reference tables inside lessons and printed sheets', async () => {
    const { host } = await mount('fr')
    const badges = [...host.querySelectorAll('.guide-level-progress')]
    expect(badges.length).toBe(5)
    expect(badges[0]?.textContent).toMatch(/^\d+ \/ \d+$/)

    const written: string[] = []
    const w = { document: { write: (h: string) => written.push(h), close: () => {} }, focus: () => {}, print: () => {} }
    const open = vi.spyOn(window, 'open').mockReturnValue(w as unknown as Window)
    const lessonMount = await mount('fr', { initialLesson: 'basics_fr_savoir_connaitre' })
    const table = lessonMount.host.querySelector('.guide-table')
    expect(table).not.toBeNull()
    expect(table?.textContent).toContain('Savoir (Bilmek)')
    await act(async () => button(lessonMount.host, 'Yazdır')!.click())
    expect(written[0]).toContain('<table>')
    expect(written[0]).toContain('Savoir (Bilmek)')
    open.mockRestore()
  })

  it('creates a sentence card from an example with "+ Kart" button', async () => {
    const { host } = await mount('fr', { initialLesson: 'basics_fr_articles' })
    const saveBtn = host.querySelector<HTMLButtonElement>('.guide-ex-save')
    expect(saveBtn).not.toBeNull()
    expect(saveBtn?.textContent).toBe('+ Kart')

    await act(async () => {
      saveBtn?.click()
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(saveBtn?.textContent).toBe('✓ Kart')

    const sentences = await db.getSentences()
    expect(sentences.length).toBe(1)
    expect(sentences[0]?.language).toBe('fr')
    expect(sentences[0]?.source).toContain('Rehber')
  })

  it('saves a personal lesson note and shows the note tag in list and path', async () => {
    const { host } = await mount('fr', { initialLesson: 'basics_fr_articles' })
    const noteTextarea = host.querySelector<HTMLTextAreaElement>('.guide-note-input')
    expect(noteTextarea).not.toBeNull()

    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      set.call(noteTextarea, 'Le masculin, la féminin')
      noteTextarea?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const saveNoteBtn = button(host, 'Kaydet')
    expect(saveNoteBtn).not.toBeNull()
    await act(async () => {
      saveNoteBtn?.click()
      await new Promise((r) => setTimeout(r, 30))
    })

    const marks = await db.getGuideMarks()
    expect(marks.basics_fr_articles?.note).toBe('Le masculin, la féminin')

    // Navigate back to the guide list
    await act(async () => button(host, 'Rehber')!.click())
    const noteTag = host.querySelector('.guide-tag-note')
    expect(noteTag).not.toBeNull()
    expect(noteTag?.textContent).toContain('Not')
  })

  it('launches and completes a 10-question level mixed quiz', async () => {
    const { host } = await mount('fr')
    const quizBtn = host.querySelector<HTMLButtonElement>('.guide-level-quiz-btn')
    expect(quizBtn).not.toBeNull()
    expect(quizBtn?.textContent).toContain('Seviyeyi sına')

    await act(async () => quizBtn?.click())
    expect(host.querySelector('.guide-level-quiz')).not.toBeNull()
    expect(host.textContent).toContain('1 /')

    // Answer questions
    for (let i = 0; i < 10; i++) {
      const choice = host.querySelector<HTMLButtonElement>('.lesson-check .option')
      if (!choice) break
      await act(async () => choice.click())

      const nextBtn = button(host, i < 9 ? 'Sonraki soru' : 'Sınavı bitir')
      if (!nextBtn) break
      await act(async () => nextBtn.click())
    }

    expect(host.textContent).toContain('Seviyesi')

    const backBtn = button(host, /Rehber/)
    await act(async () => backBtn?.click())
    expect(host.querySelector('.guide-level-quiz')).toBeNull()
  })

  it('shows follow-up topic links and navigates between them', async () => {
    const { host } = await mount('fr', { initialLesson: 'basics_fr_articles' })
    const followUps = host.querySelector('.guide-followups')
    expect(followUps).not.toBeNull()
    expect(followUps?.textContent).toContain('Bu konunun devamı')

    const chip = followUps?.querySelector<HTMLButtonElement>('.guide-followup-chip')
    expect(chip).not.toBeNull()
    const nextTitle = chip?.querySelector('strong')?.textContent
    expect(nextTitle).toBeTruthy()

    await act(async () => chip?.click())
    expect(host.querySelector('.guide-lesson h1')?.textContent).toBe(nextTitle)
  })

  it('groups tenses by mood and renders sample conjugation tables in sheet', async () => {
    const { host } = await mount('fr')
    await act(async () => button(host, 'Zamanlar')!.click())
    expect(host.textContent).toContain('Haber Kipleri')
    expect(host.textContent).toContain('Dilek / İstek Kipi')

    // Open subjonctif sheet
    const subBtn = button(host, /subjonctif présent/i)
    expect(subBtn).not.toBeNull()
    await act(async () => {
      subBtn?.click()
      await new Promise((r) => setTimeout(r, 50))
    })

    // Check sample conjugation table
    const conjTable = host.querySelector('.tense-sample-table') ?? document.querySelector('.tense-sample-table')
    expect(conjTable).not.toBeNull()
    expect(conjTable?.textContent).toContain('parler')
    expect(conjTable?.textContent).toContain('parle')
  })
})
