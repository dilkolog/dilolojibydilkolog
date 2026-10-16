import { describe, expect, it } from 'vitest'
import {
  isRewriteAnswerCorrect,
  normalizeRewriteAnswer,
  SENTENCE_REWRITES,
  sentenceRewriteRound,
} from './sentenceRewrites'
import { createRng } from '../engine/rng'

describe('sentenceRewrites data integrity and matching', () => {
  it('every item has valid properties and non-empty accepted answers', () => {
    for (const item of SENTENCE_REWRITES) {
      expect(item.id).toBeTruthy()
      expect(item.sourceSentence).toBeTruthy()
      expect(item.sourceTr).toBeTruthy()
      expect(item.keyword).toBe(item.keyword.toUpperCase())
      expect(item.acceptedAnswers.length).toBeGreaterThan(0)
      expect(item.explanation.length).toBeGreaterThan(20)
    }
  })

  it('covers French, Spanish, and English with at least 15 items each', () => {
    const fr = SENTENCE_REWRITES.filter((i) => i.language === 'fr')
    const es = SENTENCE_REWRITES.filter((i) => i.language === 'es')
    const en = SENTENCE_REWRITES.filter((i) => i.language === 'en')

    expect(fr.length).toBeGreaterThanOrEqual(15)
    expect(es.length).toBeGreaterThanOrEqual(15)
    expect(en.length).toBeGreaterThanOrEqual(15)
  })

  it('normalizes answers properly handling curly apostrophes and extra spaces', () => {
    expect(normalizeRewriteAnswer("  à   cause  d’elle ")).toBe("à cause d'elle")
    expect(normalizeRewriteAnswer("DOIS  terminer")).toBe("dois terminer")
  })

  it('isRewriteAnswerCorrect validates answers fuzzily', () => {
    const accepted = ["malgré le grand froid", "malgré le froid"]
    expect(isRewriteAnswerCorrect("malgré le grand froid", accepted)).toBe(true)
    expect(isRewriteAnswerCorrect("  Malgré Le Grand Froid  ", accepted)).toBe(true)
    expect(isRewriteAnswerCorrect("malgré le froid", accepted)).toBe(true)
    expect(isRewriteAnswerCorrect("parce qu'il fait froid", accepted)).toBe(false)
    expect(isRewriteAnswerCorrect("", accepted)).toBe(false)
  })

  it('sentenceRewriteRound draws items and prioritizes past misses', () => {
    const rng = createRng(100)
    const round = sentenceRewriteRound('en', 5, rng)
    expect(round.length).toBe(5)

    const biased = sentenceRewriteRound('en', 3, rng, {
      'en-rw-01': { ok: 0, wrong: 20, last: '2026-10-16T12:00:00Z' },
    })
    expect(biased.map((b) => b.id)).toContain('en-rw-01')
  })
})
