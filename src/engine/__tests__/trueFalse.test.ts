import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { buildStatements } from '../trueFalse'
import type { VocabularyEntry } from '../types'
import { affect, decide, decision, effect } from './fixtures'

describe('buildStatements', () => {
  it('generates one statement per word', () => {
    const words = [decision, decide, affect, effect]
    const rng = createRng(42)
    const statements = buildStatements(words, words, rng)

    expect(statements).toHaveLength(words.length)
    expect(statements.map((s) => s.entry.id)).toEqual(words.map((w) => w.id))
  })

  it('marks truth as the real Turkish gloss in all statements', () => {
    const words = [decision, decide]
    const rng = createRng(1)
    const statements = buildStatements(words, [decision, decide, affect, effect], rng)

    for (const stmt of statements) {
      expect(stmt.truth).toBe(stmt.entry.senses[0].gloss)
    }
  })

  it('sets shown to truth when isTrue is true', () => {
    const words = [decision, decide, affect, effect]
    const rng = createRng(10)
    const statements = buildStatements(words, words, rng)

    const trueStatements = statements.filter((s) => s.isTrue)
    for (const s of trueStatements) {
      expect(s.shown).toBe(s.truth)
    }
  })

  it('sets shown to a distractor gloss when isTrue is false', () => {
    const words = [decision, decide, affect, effect]
    const rng = createRng(10)
    const statements = buildStatements(words, words, rng)

    const falseStatements = statements.filter((s) => !s.isTrue)
    expect(falseStatements.length).toBeGreaterThan(0)
    for (const s of falseStatements) {
      expect(s.shown).not.toBe(s.truth)
      // Shown gloss should never belong to this word's own senses
      const ownGlosses = s.entry.senses.map((sense) => sense.gloss)
      expect(ownGlosses).not.toContain(s.shown)
    }
  })

  it('falls back to true statement when pool offers no valid distractor', () => {
    const singleWord = [decision]
    // Pool only contains the word itself
    const rng = createRng(1)
    const statements = buildStatements(singleWord, [decision], rng)

    expect(statements).toHaveLength(1)
    expect(statements[0].isTrue).toBe(true)
    expect(statements[0].shown).toBe(decision.senses[0].gloss)
  })

  it('prefers distractors of the same part of speech when available', () => {
    const bookNoun: VocabularyEntry = {
      ...decision,
      id: 'en:book',
      lemma: 'book',
      partOfSpeech: 'noun',
      senses: [{ id: '1', gloss: 'kitap', examples: [] }],
    }
    const penNoun: VocabularyEntry = {
      ...decision,
      id: 'en:pen',
      lemma: 'pen',
      partOfSpeech: 'noun',
      senses: [{ id: '2', gloss: 'kalem', examples: [] }],
    }
    const runVerb: VocabularyEntry = {
      ...decision,
      id: 'en:run',
      lemma: 'run',
      partOfSpeech: 'verb',
      senses: [{ id: '3', gloss: 'koşmak', examples: [] }],
    }

    const words = [decision, bookNoun]
    const pool = [decision, effect, bookNoun, penNoun, runVerb]
    const rng = createRng(7)
    const stmts = buildStatements(words, pool, rng)
    const falseStmt = stmts.find((s) => !s.isTrue)
    expect(falseStmt).toBeDefined()
    if (falseStmt) {
      // Because alike has >= 3 candidates, the distractor should be of the same part of speech (noun)
      expect(['etki', 'kitap', 'kalem', 'karar']).toContain(falseStmt.shown)
      expect(falseStmt.shown).not.toBe('koşmak')
    }
  })
})
