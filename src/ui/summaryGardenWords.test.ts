import { describe, expect, it } from 'vitest'
import type { WordResult } from '../engine/session'
import { sceneWords } from './summaryGardenWords'

describe('sceneWords', () => {
  it('prioritises words whose mastery stage advanced', () => {
    const list: WordResult[] = [
      { entryId: '1', correct: 1, wrong: 0, stageBefore: 'familiar', stageAfter: 'familiar' },
      { entryId: '2', correct: 2, wrong: 0, stageBefore: 'introduced', stageAfter: 'familiar' },
      { entryId: '3', correct: 1, wrong: 0, stageBefore: 'recallable', stageAfter: 'recallable' },
      { entryId: '4', correct: 3, wrong: 0, stageBefore: 'familiar', stageAfter: 'recallable' },
    ]

    const sorted = sceneWords(list)
    expect(sorted.map((w) => w.entryId)).toEqual(['2', '4', '1', '3'])
  })

  it('limits the returned results to at most 9 plants', () => {
    const list: WordResult[] = Array.from({ length: 15 }, (_, i) => ({
      entryId: `word-${i}`,
      correct: 1,
      wrong: 0,
      stageBefore: 'familiar',
      stageAfter: 'familiar',
    }))

    const result = sceneWords(list)
    expect(result).toHaveLength(9)
  })

  it('handles words without stage changes or empty list', () => {
    expect(sceneWords([])).toEqual([])
  })
})
