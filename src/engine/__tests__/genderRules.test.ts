import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import { GENDER_RULES, ruleFor, ruleForNoun, ruleQuiz, troubleRules } from '../genderRules'
import { createRng } from '../rng'
import type { Mistake } from '../types'

const NOW = new Date('2026-10-02T10:00:00')
/** "l'été (m)": the marked gender is passed on, since l' doesn't show it. */
const noun = (lang: 'fr' | 'es', w: string) => {
  const g = /\((m|f)\)$/.exec(w)?.[1] as 'm' | 'f' | undefined
  return createEntry({ word: w.replace(/\s*\((m|f)\)$/, ''), meaning: 'x', partOfSpeech: 'noun', gender: g }, lang, NOW)
}

describe('gender rules', () => {
  it('every listed example follows its rule and every exception breaks it', () => {
    for (const rule of GENDER_RULES) {
      for (const ex of rule.examples) expect(ruleFor(noun(rule.language, ex))?.exception, `${rule.id} ${ex}`).toBe(false)
      for (const ex of rule.exceptions) expect(ruleFor(noun(rule.language, ex))?.exception, `${rule.id} ${ex}`).toBe(true)
    }
  })

  it('picks the most specific ending and flags exceptions', () => {
    expect(ruleForNoun('la décision', 'fr')?.suffix).toBe('sion')
    expect(ruleFor(noun('fr', 'la plage'))).toMatchObject({ rule: { id: 'fr:age' }, exception: true })
    expect(ruleFor(noun('fr', 'le fromage'))).toMatchObject({ exception: false })
    expect(ruleFor(noun('es', 'el problema'))).toMatchObject({ rule: { id: 'es:a' }, exception: true })
    expect(ruleFor(noun('es', 'la canción'))?.rule.id).toBe('es:ción')
    expect(ruleFor(noun('fr', 'le chat'))).toBeUndefined()
  })

  it('groups gender mistakes by rule', () => {
    const plage = noun('fr', 'la plage')
    const page = noun('fr', 'la page')
    const m = (entryId: string, count: number) => ({ entryId, errorType: 'gender', count }) as Mistake
    expect(troubleRules([m(plage.id, 2), m(page.id, 1)], [plage, page])).toEqual([{ rule: expect.objectContaining({ id: 'fr:age' }), mistakes: 3 }])
  })

  it('a drill mixes in exceptions and leans on the rules in focus', () => {
    const quiz = ruleQuiz('fr', 12, createRng(3), ['fr:age'])
    expect(quiz).toHaveLength(12)
    expect(quiz.filter((q) => q.exception).length).toBeGreaterThanOrEqual(3)
    expect(new Set(quiz.map((q) => q.noun)).size).toBe(12)
    for (const q of quiz) expect(q.noun).not.toMatch(/^(le|la|l')\s?/)
  })
})
