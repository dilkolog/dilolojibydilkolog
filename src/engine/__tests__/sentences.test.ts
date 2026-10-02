import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import { clozeWord, dueSentences, gradeSentence, newSentence, sentenceExercise, sentenceScore } from '../sentences'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-02T10:00:00Z')

describe('sentence cards', () => {
  const s = newSentence({ language: 'fr', text: '  Il a  pris une décision difficile. ', translation: 'Zor bir karar verdi.', focus: 'décision' }, scheduler, NOW)

  it('cleans the text and is due straight away', () => {
    expect(s.text).toBe('Il a pris une décision difficile.')
    expect(dueSentences([s], 'fr', NOW)).toHaveLength(1)
    expect(dueSentences([s], 'es', NOW)).toHaveLength(0)
    const later = { ...s, card: scheduler.review(s.card, Rating.Good, NOW) }
    expect(dueSentences([later], 'fr', NOW)).toHaveLength(0)
  })

  it('blanks the focus word, otherwise a long content word', () => {
    expect(clozeWord(s, createRng(1))).toBe('décision')
    const w = clozeWord({ ...s, focus: undefined }, createRng(1))
    expect(['décision', 'difficile']).toContain(w)
  })

  it('only offers exercises it can run', () => {
    const kinds = new Set(Array.from({ length: 40 }, (_, i) => sentenceExercise({ ...s, translation: '' }, createRng(i), false).kind))
    expect([...kinds]).toEqual(['cloze'])
    const all = new Set(Array.from({ length: 40 }, (_, i) => sentenceExercise(s, createRng(i), true).kind))
    expect(all).toEqual(new Set(['cloze', 'dictation', 'translate']))
  })

  it('grades whole sentences leniently on accents and punctuation, strictly on words', () => {
    expect(sentenceScore('il a pris une decision difficile', s.text)).toBe(1)
    expect(gradeSentence({ kind: 'dictation', answer: s.text }, 'Il a pris une décision difficile')).toBe('correct')
    expect(gradeSentence({ kind: 'dictation', answer: s.text }, 'Il a pris une désision dificile')).toBe('near')
    expect(gradeSentence({ kind: 'dictation', answer: s.text }, 'Il prend une chose')).toBe('wrong')
    expect(gradeSentence({ kind: 'cloze', shown: '', answer: 'décision' }, 'decision')).toBe('near')
  })
})
