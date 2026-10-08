import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SessionSummary, WordResult } from '../engine/session'
import { SummaryGarden } from './SummaryGarden'
import { sceneWords } from './summaryGardenWords'

const word = (id: string, before: WordResult['stageBefore'], after: WordResult['stageAfter']): WordResult => ({ entryId: id, correct: 1, wrong: 0, stageBefore: before, stageAfter: after })
const summary = (words: WordResult[]): SessionSummary => ({ words, answered: words.length, correct: words.length, strengthened: [], struggling: [], errors: {}, introduced: [], xp: 10 })

describe('the garden at the end of a session', () => {
  it('shows the words that grew first and no more than fit', () => {
    const many = [...Array.from({ length: 10 }, (_, i) => word(`s${i}`, 'introduced', 'introduced')), word('grew', 'introduced', 'familiar')]
    const shown = sceneWords(many)
    expect(shown).toHaveLength(9)
    expect(shown[0].entryId).toBe('grew')
  })

  it('says how many grew, or that the garden was watered', () => {
    expect(renderToStaticMarkup(<SummaryGarden summary={summary([word('a', 'introduced', 'familiar'), word('b', 'introduced', 'introduced')])} now={new Date(2026, 2, 4, 10)} />)).toContain('1 kelime büyüdü')
    expect(renderToStaticMarkup(<SummaryGarden summary={summary([word('a', 'introduced', 'introduced')])} now={new Date(2026, 2, 4, 10)} />)).toContain('1 kelime sulandı')
  })

  it('draws nothing for a session with no words', () => {
    expect(renderToStaticMarkup(<SummaryGarden summary={summary([])} />)).toBe('')
  })
})
