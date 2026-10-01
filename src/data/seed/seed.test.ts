import { describe, expect, it } from 'vitest'
import { exerciseTypesFor } from '../../engine/exercises'
import { SKILLS } from '../../engine/types'
import { SAMPLE_WORDS } from './index'

describe.each(Object.entries(SAMPLE_WORDS))('sample words: %s', (language, words) => {
  it('have unique ids', () => {
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length)
  })
  it('mark a form that actually occurs in every example', () => {
    for (const w of words)
      for (const ex of w.senses[0].examples) expect(ex.text.toLowerCase(), w.id).toContain(ex.form.toLowerCase())
  })
  it('only relate to words in the same set', () => {
    const ids = new Set(words.map((w) => w.id))
    for (const w of words) for (const r of w.relations) expect(ids.has(r.targetId), `${w.id} → ${r.targetId}`).toBe(true)
  })
  it('give FR/ES nouns an article and gender', () => {
    if (language === 'en') return
    for (const w of words.filter((w) => w.partOfSpeech === 'noun')) {
      expect(w.article, w.id).toBeTruthy()
      expect(w.gender, w.id).toBeTruthy()
    }
  })
  it('support at least one exercise for recognition, recall and listening', () => {
    for (const w of words)
      for (const s of SKILLS.filter((s) => ['recognition', 'recall', 'listening'].includes(s)))
        expect(exerciseTypesFor(s, w).length, `${w.id} ${s}`).toBeGreaterThan(0)
  })
})
