import { describe, expect, it } from 'vitest'
import { CONFUSABLE_RULES, confusableRuleFor, buildConfusableQuestions, confusableRound } from './confusableRules'
import { createRng } from '../engine/rng'

describe('confusableRules', () => {
  it('covers core confusable pairs across languages', () => {
    expect(CONFUSABLE_RULES.length).toBeGreaterThanOrEqual(15)
    for (const r of CONFUSABLE_RULES) {
      expect(r.words).toHaveLength(2)
      expect(r.meanings).toHaveLength(2)
      expect(r.distinction).toBeTruthy()
    }
  })

  it('finds rule by single word or pair', () => {
    const frRule = confusableRuleFor('jour', 'fr', 'journée')
    expect(frRule).toBeDefined()
    expect(frRule?.id).toBe('fr:jour-journee')

    const esRule = confusableRuleFor('ser', 'es')
    expect(esRule).toBeDefined()
    expect(esRule?.words).toContain('estar')

    const enRule = confusableRuleFor('affect', 'en', 'effect')
    expect(enRule).toBeDefined()
    expect(enRule?.distinction).toContain('fiildir')
  })

  it('builds questions for all supported languages', () => {
    const frQs = buildConfusableQuestions('fr')
    const esQs = buildConfusableQuestions('es')
    const enQs = buildConfusableQuestions('en')

    expect(frQs.length).toBeGreaterThan(0)
    expect(esQs.length).toBeGreaterThan(0)
    expect(enQs.length).toBeGreaterThan(0)

    for (const q of [...frQs, ...esQs, ...enQs]) {
      expect(q.prompt).toBeTruthy()
      expect(q.correct).toBeTruthy()
      expect(q.wrong).toBeTruthy()
      expect(q.distinction).toBeTruthy()
    }
  })

  it('ids are unique and every drill is well formed: one gap, two different forms, a Turkish sentence', () => {
    expect(new Set(CONFUSABLE_RULES.map((r) => r.id)).size).toBe(CONFUSABLE_RULES.length)
    for (const r of CONFUSABLE_RULES) {
      expect(r.id.startsWith(`${r.language}:`), r.id).toBe(true)
      expect(r.words[0], r.id).not.toBe(r.words[1])
      for (const d of r.drills ?? []) {
        const where = `${r.id}: ${d.text}`
        expect(d.text.split('___').length, where).toBe(2)
        expect(d.right.trim(), where).toBeTruthy()
        expect(d.wrong.trim(), where).toBeTruthy()
        expect(d.right.toLowerCase(), where).not.toBe(d.wrong.toLowerCase())
        expect(d.tr.length, where).toBeGreaterThan(5)
        // The gap is the word only: no stray spaces inside the options.
        expect(d.right, where).toBe(d.right.trim())
        expect(d.wrong, where).toBe(d.wrong.trim())
      }
    }
  })

  it('every rule has drills, and they ask for both twins', () => {
    for (const r of CONFUSABLE_RULES) {
      const drills = r.drills ?? []
      expect(drills.length, r.id).toBeGreaterThanOrEqual(4)
      const rights = new Set(drills.map((d) => d.right.toLowerCase()))
      expect(rights.size, r.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('a drill becomes a question with its Turkish', () => {
    const rule = CONFUSABLE_RULES.find((r) => r.drills?.length)!
    const q = buildConfusableQuestions(rule.language).find((x) => x.id === `${rule.id}:d0`)!
    expect(q.prompt).toBe(rule.drills![0]!.text)
    expect(q.tr).toBe(rule.drills![0]!.tr)
  })

  it('a round is mostly sentences, spread over the pairs, with at most two meaning questions', () => {
    for (const language of ['fr', 'es', 'en'] as const) {
      const round = confusableRound(buildConfusableQuestions(language), createRng(5))
      expect(round).toHaveLength(10)
      expect(new Set(round.map((q) => q.id)).size).toBe(10)
      expect(round.filter((q) => !q.tr).length).toBeLessThanOrEqual(2)
      const pairs = CONFUSABLE_RULES.filter((r) => r.language === language).length
      expect(new Set(round.map((q) => q.rule.id)).size).toBeGreaterThanOrEqual(Math.min(pairs, 8))
    }
  })
})
