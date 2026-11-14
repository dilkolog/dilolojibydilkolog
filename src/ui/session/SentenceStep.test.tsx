// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addExample, createEntry } from '../../data/wordInput'
import type { SessionSummary } from '../../engine/session'
import { SentenceStep, sentenceWord } from './SentenceStep'
import { Summary } from './SessionSummary'

const a = createEntry({ word: 'attendre', meaning: 'beklemek', partOfSpeech: 'verb' }, 'fr', new Date())
const b = createEntry({ word: 'viser', meaning: 'hedeflemek', partOfSpeech: 'verb' }, 'fr', new Date())
const c = createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date())
const base: SessionSummary = { words: [], answered: 6, correct: 5, strengthened: [], struggling: [], errors: {}, introduced: [], xp: 20 }
const word = (id: string) => ({ entryId: id, correct: 2, wrong: 0 })

describe('the word of the sentence step', () => {
  const byId = new Map([a, b, c].map((e) => [e.id, e]))
  it('takes a word met for the first time, before one that grew or was only studied', () => {
    expect(sentenceWord({ ...base, words: [word(c.id), word(b.id)], strengthened: [b.id], introduced: [a.id] }, byId)?.id).toBe(a.id)
    expect(sentenceWord({ ...base, words: [word(c.id), word(b.id)], strengthened: [b.id] }, byId)?.id).toBe(b.id)
    expect(sentenceWord({ ...base, words: [word(c.id)] }, byId)?.id).toBe(c.id)
  })
  it('skips a word that already has the learner’s own sentence, and words it does not know (verb forms)', () => {
    const written = addExample(a, 'J’attends le bus.', '', true)
    const withOwn = new Map([written, b].map((e) => [e.id, e]))
    expect(sentenceWord({ ...base, introduced: [a.id, b.id], words: [word(a.id), word(b.id)] }, withOwn)?.id).toBe(b.id)
    expect(sentenceWord({ ...base, words: [word('form:attendre|present')] }, withOwn)).toBeUndefined()
  })
})

describe('the summary shows the step only after a daily round', () => {
  const byId = new Map([a, b].map((e) => [e.id, e]))
  const summary = { ...base, introduced: [a.id], words: [word(a.id)] }
  const render = (extra: Partial<Parameters<typeof Summary>[0]>) =>
    renderToStaticMarkup(<Summary summary={summary} byId={byId} before={null} after={null} onDone={() => {}} onOwnSentence={async () => {}} {...extra} />)
  it('is there for a daily round, with the word and its meaning', () => {
    const html = render({})
    expect(html).toContain('Bir cümle yaz')
    expect(html).toContain('attendre')
    expect(html).toContain('(beklemek)')
  })
  it('is not there in free practice, a hard-words round, or without a way to save', () => {
    expect(render({ practice: true })).not.toContain('Bir cümle yaz')
    expect(render({ topic: 'difficult' })).not.toContain('Bir cümle yaz')
    expect(render({ onOwnSentence: undefined })).not.toContain('Bir cümle yaz')
  })
})

describe('SentenceStep', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })
  const type = (text: string) => {
    const input = container.querySelector('input') as HTMLInputElement
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      set.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const button = (name: string) => [...container.querySelectorAll('button')].find((x) => x.textContent === name) as HTMLButtonElement

  it('saves the sentence and says so', async () => {
    const onSave = vi.fn(async () => {})
    act(() => root.render(<SentenceStep entry={a} onSave={onSave} />))
    expect(button('Kaydet').disabled).toBe(true)
    type('J’attends mon frère.')
    await act(async () => button('Kaydet').click())
    expect(onSave).toHaveBeenCalledWith(a.id, 'J’attends mon frère.')
    expect(container.textContent).toContain('Cümlen kaydedildi')
  })
  it('shows why a sentence was refused and keeps the form', async () => {
    const onSave = vi.fn(async (_id: string, text: string) => {
      addExample(a, text, '', true)
    })
    act(() => root.render(<SentenceStep entry={a} onSave={onSave} />))
    type('Je suis là.')
    await act(async () => button('Kaydet').click())
    expect(container.textContent).toContain('Cümlede "attendre" bulunamadı')
    expect(container.querySelector('input')).not.toBeNull()
  })
  it('goes away with "Geç", saving nothing', () => {
    const onSave = vi.fn(async () => {})
    act(() => root.render(<SentenceStep entry={a} onSave={onSave} />))
    act(() => button('Geç').click())
    expect(container.textContent).toBe('')
    expect(onSave).not.toHaveBeenCalled()
  })
})
