import { describe, expect, it } from 'vitest'
import { recordMistake } from '../mistakes'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import { parseStoryText, pickStoryWords } from '../story'
import type { VocabularyEntry } from '../types'
import { abandon, affect, decide, decision, EN_CATALOG, improve } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00Z')

const learned = (e: VocabularyEntry, daysAgo: number) =>
  processAttempt(
    newWordState(e, NOW),
    { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 3000, hintsUsed: 0, maxHints: 0, at: new Date(NOW.getTime() - daysAgo * 86_400_000) },
    [],
    scheduler,
    () => 'x',
  ).state

describe('pickStoryWords', () => {
  const states = [learned(decision, 1), learned(decide, 20), learned(abandon, 10), learned(improve, 2), learned(affect, 3)]
  const base = { language: 'en' as const, catalog: EN_CATALOG, states, mistakes: [], scheduler, now: NOW }

  it('prefers the weakest words', () => {
    expect(pickStoryWords({ ...base, count: 2 }).map((e) => e.id)).toEqual(['en:decide', 'en:abandon'])
  })
  it('boosts words with open mistakes and skips recently used ones', () => {
    const mistakes = recordMistake([], { entryId: 'en:decision', errorType: 'meaning', exerciseType: 'mc_meaning', given: 'x', expected: 'y', at: NOW })
    const picked = pickStoryWords({ ...base, mistakes, recentlyUsed: new Set(['en:decide']), count: 2 }).map((e) => e.id)
    expect(picked).toContain('en:decision')
    expect(picked).not.toContain('en:decide')
  })
})

describe('parseStoryText', () => {
  it('turns markers of episode words (any inflection) into numbered blanks', () => {
    const { parts, next } = parseStoryText('She {{abandoned}} the ship and {{decided}} to swim.', [abandon, decide])
    expect(parts.filter((p) => p.kind === 'blank').map((p) => p.kind === 'blank' && [p.blank.entryId, p.blank.answer, p.blank.index])).toEqual([
      ['en:abandon', 'abandoned', 0],
      ['en:decide', 'decided', 1],
    ])
    expect(next).toBe(2)
    expect(parts[0]).toEqual({ kind: 'text', text: 'She ' })
  })
  it('keeps unknown markers as plain text', () => {
    const { parts } = parseStoryText('It was {{dark}}.', [abandon])
    expect(parts).toEqual([{ kind: 'text', text: 'It was ' }, { kind: 'text', text: 'dark' }, { kind: 'text', text: '.' }])
  })
})
