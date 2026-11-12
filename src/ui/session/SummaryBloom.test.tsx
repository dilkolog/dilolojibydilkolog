import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import type { SessionSummary } from '../../engine/session'
import { EARLY_ANSWERS, Summary } from './SessionSummary'

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


it('distinguishes a completed round from independent recall and remaining learning work', () => {
  const html = render({ ...base, words: [], independentCorrect: 2, pendingLearning: [a.id] })
  expect(html).toContain('Tur bitti')
  expect(html).toContain('2 cevabı yardımsız hatırladın')
  // What comes next, without "completed" beside "not learned".
  expect(html).toContain('1 kelimenin pekiştirmesi sırada')
  expect(html).not.toContain('Kelime turun tamamlandı')
  expect(html).not.toContain('öğrenildiği anlamına gelmez')
})

describe('the coach note after a hard session', () => {
  const hard = { ...base, answered: 20, correct: 10, independentCorrect: 10, words: [] }
  const withHistory = (totalAnswers: number) =>
    renderToStaticMarkup(<Summary summary={{ ...hard, introduced: [] }} byId={byId} before={{ stats: { totalAnswers } } as never} after={null} onDone={() => {}} />)
  it('stays quiet while the learner is just starting: low scores on new words are how learning begins', () => {
    expect(withHistory(EARLY_ANSWERS - 1)).not.toContain('zorlayıcıydı')
    // A session of mostly new words, later on: still no "slow down".
    expect(renderToStaticMarkup(<Summary summary={{ ...hard, introduced: [a.id, b.id, 'x', 'y'] }} byId={byId} before={{ stats: { totalAnswers: 5000 } } as never} after={null} onDone={() => {}} />)).not.toContain('zorlayıcıydı')
  })
  it('speaks up once there is a history and the words were not new', () => {
    expect(withHistory(EARLY_ANSWERS)).toContain('zorlayıcıydı')
  })
})
