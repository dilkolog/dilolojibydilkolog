import { describe, expect, it } from 'vitest'
import type { GrammarIssue } from '../grammarIssues'
import { classifyIssue, recordWriting, repairFor, writingRows, type WritingLog } from '../writingErrors'

const issue = (over: Partial<GrammarIssue> & { offset?: number; length?: number } = {}): GrammarIssue => ({ offset: 0, length: 4, message: '', replacements: [], kind: 'grammar', ...over })

describe('what kind of mistake a finding is', () => {
  it('leaves style hints out: they are not errors', () => {
    expect(classifyIssue(issue({ kind: 'style' }), 'en', 'Some text here')).toBeNull()
  })

  it('reads the kind from the rule id and category', () => {
    const kind = (ruleId: string, category = 'GRAMMAR', language: 'en' | 'fr' | 'es' = 'fr') => classifyIssue(issue({ ruleId, category }), language, 'texte exemple')
    expect(kind('AGREEMENT_POSTPONED_ADJ')).toBe('agreement')
    expect(kind('HE_VERB_AGR', 'GRAMMAR', 'en')).toBe('agreement')
    expect(kind('CONCORDANCIA_DET_SUST', 'GRAMMAR', 'es')).toBe('agreement')
    expect(kind('EN_A_VS_AN', 'GRAMMAR', 'en')).toBe('article')
    expect(kind('DET_MASC_FEM')).toBe('agreement')
    expect(kind('PREPOSITION_VERB', 'GRAMMAR', 'en')).toBe('preposition')
    expect(kind('PARTICIPE_PASSE')).toBe('verb')
    expect(kind('DID_BASEFORM', 'GRAMMAR', 'en')).toBe('verb')
    expect(kind('THEIR_THERE', 'CONFUSED_WORDS', 'en')).toBe('confusion')
    expect(kind('SOMETHING_ELSE')).toBe('other')
  })

  it('puts punctuation and capitals apart from grammar', () => {
    expect(classifyIssue(issue({ ruleId: 'COMMA_PARENTHESIS_WHITESPACE', category: 'TYPOGRAPHY' }), 'en', 'a b')).toBe('punctuation')
    expect(classifyIssue(issue({ ruleId: 'UPPERCASE_SENTENCE_START', category: 'CASING' }), 'en', 'a b')).toBe('punctuation')
  })

  it('tells an accent slip from a misspelling, but not in English', () => {
    const text = 'Il a mange un gateau'
    const mange = issue({ kind: 'spelling', offset: 5, length: 5, replacements: ['mangé'] })
    expect(classifyIssue(mange, 'fr', text)).toBe('accent')
    expect(classifyIssue(mange, 'en', text)).toBe('spelling')
    expect(classifyIssue(issue({ kind: 'spelling', offset: 0, length: 2, replacements: ['Elle'] }), 'fr', text)).toBe('spelling')
    expect(classifyIssue(issue({ kind: 'spelling', offset: 5, length: 5, replacements: [] }), 'fr', text)).toBe('spelling')
  })
})

describe('the notebook', () => {
  const text = 'la problème est grand'
  const agree = issue({ ruleId: 'AGREEMENT_DET', category: 'GRAMMAR', offset: 0, length: 11, replacements: ['le problème'] })

  it('counts a finding, with its example', () => {
    const log = recordWriting({}, 'fr', text, [agree], '2026-10-19')
    expect(log.fr?.agreement).toMatchObject({ n: 1, last: '2026-10-19', samples: [{ wrong: 'la problème', fix: 'le problème' }] })
  })

  it('does not count the same slip twice the same day (a text checked again after a fix)', () => {
    const once = recordWriting({}, 'fr', text, [agree], '2026-10-19')
    expect(recordWriting(once, 'fr', text, [agree], '2026-10-19').fr?.agreement?.n).toBe(1)
  })

  it('counts the same slip again on another day: that is the pattern it looks for', () => {
    const day1 = recordWriting({}, 'fr', text, [agree], '2026-10-19')
    const day2 = recordWriting(day1, 'fr', text, [agree], '2026-10-20')
    expect(day2.fr?.agreement).toMatchObject({ n: 2, last: '2026-10-20' })
    // The example is kept once, not twice.
    expect(day2.fr?.agreement?.samples).toHaveLength(1)
  })

  it('keeps the languages apart and leaves the old log as it was', () => {
    const before: WritingLog = {}
    const after = recordWriting(before, 'es', 'el casa', [issue({ ruleId: 'CONCORDANCIA', offset: 0, length: 7, replacements: ['la casa'] })], '2026-10-19')
    expect(before).toEqual({})
    expect(after.fr).toBeUndefined()
    expect(after.es?.agreement?.n).toBe(1)
  })

  it('keeps only a few recent examples, newest first', () => {
    let log: WritingLog = {}
    for (let i = 0; i < 6; i++) log = recordWriting(log, 'fr', `x${i}`, [issue({ ruleId: 'AGREEMENT', offset: 0, length: 2, replacements: [`y${i}`] })], `2026-10-${10 + i}`)
    expect(log.fr?.agreement?.n).toBe(6)
    expect(log.fr?.agreement?.samples.map((s) => s.wrong)).toEqual(['x5', 'x4', 'x3', 'x2'])
  })

  it('lists the kinds most frequent first', () => {
    let log: WritingLog = {}
    log = recordWriting(log, 'fr', 'ab', [issue({ ruleId: 'PREP', offset: 0, length: 2, replacements: ['cd'] })], '2026-10-01')
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-03']) log = recordWriting(log, 'fr', 'ef', [issue({ ruleId: 'AGREEMENT', offset: 0, length: 2, replacements: ['gh'] })], day)
    expect(writingRows(log, 'fr').map((r) => [r.kind, r.n])).toEqual([
      ['agreement', 3],
      ['preposition', 1],
    ])
    expect(writingRows(log, 'en')).toEqual([])
  })
})

describe('where a kind is worked on', () => {
  it('points at a practice and the guide lesson of the language', () => {
    expect(repairFor('agreement', 'fr')).toMatchObject({ target: 'grammar', lesson: 'basics_fr_adjectifs' })
    expect(repairFor('article', 'es')).toMatchObject({ target: 'article', lesson: 'basics_es_articulos' })
    expect(repairFor('article', 'en')).toMatchObject({ target: 'grammar', lesson: 'articles_en' })
    expect(repairFor('verb', 'fr')).toMatchObject({ target: 'verbs' })
    expect(repairFor('verb', 'en')).toMatchObject({ target: 'grammar' })
  })

  it('has nothing for spelling and punctuation, nor accents in English', () => {
    expect(repairFor('spelling', 'fr')).toBeUndefined()
    expect(repairFor('punctuation', 'es')).toBeUndefined()
    expect(repairFor('accent', 'en')).toBeUndefined()
    expect(repairFor('accent', 'fr')).toMatchObject({ target: 'accent' })
  })
})
