import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEntry } from '../data/wordInput'
import type { SessionSummary } from '../engine/session'
import { Summary } from './Screens'

const a = createEntry({ word: 'attendre', meaning: 'beklemek', partOfSpeech: 'verb' }, 'fr', new Date())
const b = createEntry({ word: 'viser', meaning: 'hedeflemek', partOfSpeech: 'verb' }, 'fr', new Date())
const byId = new Map([a, b].map((e) => [e.id, e]))
const summary: SessionSummary = {
  words: [
    { entryId: a.id, correct: 2, wrong: 0 },
    { entryId: b.id, correct: 1, wrong: 1 },
  ],
  answered: 4,
  correct: 3,
  strengthened: [],
  struggling: [b.id],
  errors: {},
  introduced: [],
  xp: 20,
}
const render = (topic?: 'difficult') => renderToStaticMarkup(<Summary summary={summary} byId={byId} topic={topic} onUnmarkDifficult={() => {}} before={null} after={null} onDone={() => {}} />)

describe('the summary of a practice of hard words', () => {
  it('is about the hard words, and only a word that went all right can leave the list', () => {
    const html = render('difficult')
    expect(html).toContain('Zor kelime çalışması')
    expect(html).toContain('2 zor kelimeyle çalıştın')
    expect(html).toContain('Zor kelimelerin')
    expect(html).toContain('Bu sefer hepsi doğru')
    expect(html).toContain('Zor kalıyor')
    expect(html.match(/Artık zor değil/g)).toHaveLength(1)
  })
  it('an ordinary session has none of that', () => {
    const html = render()
    expect(html).not.toContain('Zor kelime çalışması')
    expect(html).not.toContain('Artık zor değil')
  })
})
