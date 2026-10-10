// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionSummary } from '../engine/session'
import type { VocabularyEntry } from '../engine/types'
import { AiContext } from './aiContext'

const asked = vi.fn(async () => 'Dişil sonlara dikkat: -ette ile biten kelimeler hep "la".')
vi.mock('../ai', () => ({ sessionNote: (...a: unknown[]) => asked(...(a as [])), AiError: class extends Error {} }))
const { SessionNote } = await import('./SessionNote')

const entry = (id: string, lemma: string) => ({ id, lemma, language: 'fr', senses: [{ id: `${id}#1`, gloss: 'x', examples: [] }] }) as unknown as VocabularyEntry
const byId = new Map([entry('fr:a', 'baguette'), entry('fr:b', 'cigarette')].map((e) => [e.id, e]))
const summary = (wrong: number): SessionSummary => ({
  words: [
    { entryId: 'fr:a', correct: 1, wrong },
    { entryId: 'fr:b', correct: 1, wrong: 1 },
  ],
  answered: 10,
  correct: 10 - wrong - 1,
  strengthened: [],
  struggling: ['fr:a', 'fr:b'],
  errors: { gender: wrong + 1 },
  introduced: [],
  xp: 5,
})

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  asked.mockClear()
})

const render = (apiKey: string | null, s: SessionSummary) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(<AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}><SessionNote summary={s} byId={byId} /></AiContext.Provider>))
  return host
}

describe('SessionNote', () => {
  it('shows nothing without an AI key or with too few mistakes', () => {
    expect(render(null, summary(3)).innerHTML).toBe('')
    act(() => root?.unmount())
    expect(render('key', summary(0)).innerHTML).toBe('')
  })

  it('asks only on a tap, sends the digest of the mistakes, and shows the remark', async () => {
    const host = render('key', summary(3))
    expect(asked).not.toHaveBeenCalled()
    await act(async () => host.querySelector('button')!.click())
    expect(asked).toHaveBeenCalledTimes(1)
    const [key, req] = asked.mock.calls[0] as unknown as [string, { language: string; answers: number; wrong: number; lines: string[] }]
    expect(key).toBe('key')
    expect(req).toMatchObject({ language: 'fr', answers: 10, wrong: 4 })
    expect(req.lines.join('\n')).toContain('baguette (x): 3 wrong')
    expect(host.textContent).toContain('Dişil sonlara dikkat')
    expect(host.querySelector('button')).toBeNull()
  })
})
