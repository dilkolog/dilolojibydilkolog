import { describe, expect, it } from 'vitest'
import { checkGrammar, sentenceTokens, TOPIC_NAME } from '../engine/grammar'
import { grammarExercises } from './grammar'

describe('the grammar questions', () => {
  const langs = ['fr', 'es', 'en'] as const
  const all = langs.flatMap((l) => grammarExercises(l))

  it('are there in each language, with unique ids', () => {
    for (const l of langs) expect(grammarExercises(l).length).toBeGreaterThanOrEqual(20)
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    expect(all.every((e) => e.id.startsWith(`${e.language}-`))).toBe(true)
  })

  it('each have a known topic, a rule in Turkish and a source', () => {
    for (const e of all) {
      expect(TOPIC_NAME[e.topic], e.id).toBeTruthy()
      expect(e.explanation.length, e.id).toBeGreaterThan(20)
      expect(e.source, e.id).toBeTruthy()
    }
  })

  it('are well formed for their type, and their own answer is right', () => {
    for (const e of all) {
      if (e.type === 'error') {
        expect(e.fix, e.id).toBeTruthy()
        expect(sentenceTokens(e).filter((t) => t.wrong), e.id).toHaveLength(1)
        // The wrong word is in the sentence once only: tapping the same word elsewhere would be "wrong" though it reads right.
        expect(sentenceTokens(e).filter((t) => t.word && t.text.toLowerCase() === e.answer.toLowerCase()), e.id).toHaveLength(1)
      } else {
        expect(e.prompt, e.id).toContain('___')
        expect(checkGrammar(e, e.answer), e.id).toBe('correct')
      }
      if (e.type === 'choice') {
        expect(e.options, e.id).toContain(e.answer)
        // A choice has one right option only.
        expect(e.options!.filter((o) => checkGrammar(e, o) !== 'wrong'), e.id).toHaveLength(1)
      }
    }
  })

  it('every topic has questions of the language it belongs to', () => {
    const by = new Map<string, Set<string>>()
    for (const e of all) by.set(e.topic, (by.get(e.topic) ?? new Set()).add(e.language))
    for (const [topic, set] of by) expect(set.size, topic).toBe(1)
  })
})
