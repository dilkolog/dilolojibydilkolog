import { describe, expect, it } from 'vitest'
import { MIN_MISTAKES, sessionDigest } from '../sessionNote'
import type { SessionSummary } from '../session'
import type { VocabularyEntry } from '../types'

const entry = (id: string, lemma: string, language = 'fr') => ({ id, lemma, language, senses: [{ id: `${id}#1`, gloss: `${lemma}-tr`, examples: [] }] }) as unknown as VocabularyEntry
const byId = new Map([entry('fr:a', 'chat'), entry('fr:b', 'chien'), entry('fr:c', 'maison')].map((e) => [e.id, e]))
const summary = (words: SessionSummary['words'], over: Partial<SessionSummary> = {}): SessionSummary => ({
  words,
  answered: words.reduce((n, w) => n + w.correct + w.wrong, 0),
  correct: words.reduce((n, w) => n + w.correct, 0),
  strengthened: [],
  struggling: [],
  errors: {},
  introduced: [],
  xp: 0,
  ...over,
})

describe('sessionDigest', () => {
  it('is null below the mistake threshold', () => {
    expect(sessionDigest(summary([{ entryId: 'fr:a', correct: 5, wrong: MIN_MISTAKES - 1 }]), byId, (t) => t)).toBeNull()
  })

  it('names the kinds of error and the words missed, most missed first', () => {
    const d = sessionDigest(
      summary([{ entryId: 'fr:a', correct: 4, wrong: 1 }, { entryId: 'fr:b', correct: 0, wrong: 3 }, { entryId: 'fr:c', correct: 2, wrong: 0 }], { errors: { gender: 3, typo: 1 } }),
      byId,
      (t) => t.toUpperCase(),
    )!
    expect(d).toMatchObject({ language: 'fr', answers: 10, wrong: 4 })
    expect(d.lines).toEqual(['Error kinds: GENDER ×3, TYPO ×1', 'Words missed:', 'chien (chien-tr): 3 wrong', 'chat (chat-tr): 1 wrong'])
  })

  it('leaves out words that are not in the list (a verb form mixed in) and is null when none are', () => {
    expect(sessionDigest(summary([{ entryId: 'form:parler|Présent', correct: 0, wrong: 5 }]), byId, (t) => t)).toBeNull()
  })
})
