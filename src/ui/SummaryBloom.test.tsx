import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEntry } from '../data/wordInput'
import type { SessionSummary } from '../engine/session'
import { Summary } from './SessionSummary'

const a = createEntry({ word: 'attendre', meaning: 'beklemek', partOfSpeech: 'verb' }, 'fr', new Date())
const b = createEntry({ word: 'viser', meaning: 'hedeflemek', partOfSpeech: 'verb' }, 'fr', new Date())
const byId = new Map([a, b].map((e) => [e.id, e]))
const render = (summary: SessionSummary) => renderToStaticMarkup(<Summary summary={summary} byId={byId} before={null} after={null} onDone={() => {}} />)
const base = { answered: 4, correct: 4, strengthened: [], struggling: [], errors: {}, introduced: [], xp: 20 }

describe('the words that grew today', () => {
  it('marks a word that reached its last stage as bloomed, apart from one that only moved up', () => {
    const html = render({ ...base, words: [{ entryId: a.id, correct: 2, wrong: 0, stageBefore: 'strong', stageAfter: 'mastered' }, { entryId: b.id, correct: 2, wrong: 0, stageBefore: 'introduced', stageAfter: 'familiar' }] })
    expect(html).toContain('Bugün büyüyenler (2)')
    expect(html.match(/class="is-bloom"/g)).toHaveLength(1)
    expect(html).toContain('Çiçek açtı')
    expect(html.match(/ oldu</g)).toHaveLength(1)
  })
  it('has no bloom when nothing reached the last stage', () => {
    const html = render({ ...base, words: [{ entryId: b.id, correct: 2, wrong: 0, stageBefore: 'introduced', stageAfter: 'familiar' }] })
    expect(html).not.toContain('is-bloom')
  })
})
