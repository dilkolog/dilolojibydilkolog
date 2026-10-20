import { describe, expect, it } from 'vitest'
import type { ContextSource } from '../contextReview'
import { createRng } from '../rng'
import { addRun, advice, askable, canClimb, change, cleanRuns, comfortable, KEEP_RUNS, LADDER_RATES, LADDER_SENTENCES, ladder, scoreByRate } from '../speedLadder'

const SOURCES: ContextSource[] = [
  { text: 'Les enfants jouent dans le jardin pendant que les parents préparent le déjeuner.', from: 'Texte', translation: 'Çocuklar bahçede oynuyor.' },
  { text: 'Le professeur explique la leçon difficile aux étudiants fatigués ce matin.', from: 'Texte', translation: 'x' },
  { text: 'Nous voulons visiter la grande cathédrale avant que le soleil disparaisse derrière les montagnes.', from: 'Texte', translation: 'x' },
  { text: 'Ma voisine cultive des tomates magnifiques dans son petit potager derrière la maison.', from: 'Texte', translation: 'x' },
  { text: 'Trop court.', from: 'Texte', translation: 'x' },
  { text: 'Le train arrive. Il est vraiment très tard ce soir pour voyager seul.', from: 'Texte' },
]

describe('askable words', () => {
  it('are the longer content words, each once, lower case, without function words or numbers', () => {
    const words = askable('Le Professeur explique la leçon; la leçon 2024 est difficile pour tous.', 'fr')
    expect(words).toEqual(['professeur', 'explique', 'leçon', 'difficile'])
  })
})

describe('the ladder', () => {
  it('has a few sentences, each with a step per speed in order, and four distinct options holding the word that was heard', () => {
    const items = ladder(SOURCES, 'fr', createRng(1))
    expect(items).toHaveLength(LADDER_SENTENCES)
    for (const item of items) {
      expect(item.steps.map((s) => s.rate)).toEqual([...LADDER_RATES])
      expect(new Set(item.steps.map((s) => s.target)).size).toBe(3)
      for (const step of item.steps) {
        expect(step.options).toHaveLength(4)
        expect(new Set(step.options).size).toBe(4)
        expect(step.options).toContain(step.target)
        expect(item.text.toLocaleLowerCase('fr')).toContain(step.target)
        // The wrong ones were not in the sentence.
        for (const o of step.options.filter((x) => x !== step.target)) expect(item.text.toLocaleLowerCase('fr')).not.toContain(o)
      }
    }
  })

  it('leaves out sentences that are too short or too long, and says whether there are enough', () => {
    expect(canClimb(SOURCES, 'fr')).toBe(true)
    expect(canClimb(SOURCES.slice(0, 3), 'fr')).toBe(false)
    expect(ladder(SOURCES, 'fr', createRng(2)).every((i) => i.text !== 'Trop court.')).toBe(true)
  })

  it('cuts a text into its sentences, but keeps a sentence with its translation whole', () => {
    const items = ladder([...SOURCES], 'fr', createRng(3))
    expect(items.every((i) => i.text.length > 20)).toBe(true)
  })

  it('is the same for the same seed', () => {
    expect(ladder(SOURCES, 'fr', createRng(5))).toEqual(ladder(SOURCES, 'fr', createRng(5)))
  })
})

describe('scores and advice', () => {
  const answers = (n075: boolean[], n1: boolean[], n125: boolean[]) => [
    ...n075.map((ok) => ({ rate: 0.75 as const, ok })),
    ...n1.map((ok) => ({ rate: 1 as const, ok })),
    ...n125.map((ok) => ({ rate: 1.25 as const, ok })),
  ]
  it('counts right answers by speed and finds the fastest speed the ear held', () => {
    const scores = scoreByRate(answers([true, true, true, true], [true, true, true, false], [true, false, false, false]))
    expect(scores.map((s) => [s.n, s.right])).toEqual([[4, 4], [4, 3], [4, 1]])
    expect(comfortable(scores)).toBe(1)
    expect(advice(scores)).toContain('Normal hızda rahatsın')
  })

  it('says something fitting for each outcome, and nothing for no answers', () => {
    expect(advice(scoreByRate(answers([true, true, true, true], [true, true, true, true], [true, true, true, false])))).toContain('1,25×')
    expect(advice(scoreByRate(answers([true, true, true, true], [true, false, false, false], [false, false, false, false])))).toContain('Yavaşta tamam')
    expect(advice(scoreByRate(answers([false, false, false, true], [false, false, false, false], [false, false, false, false])))).toContain('Yavaşta bile kaçırdın')
    expect(advice(scoreByRate([]))).toBe('')
  })
})

describe('runs kept on the device', () => {
  const scores = scoreByRate([{ rate: 0.75, ok: true }, { rate: 1, ok: false }, { rate: 1.25, ok: false }])
  it('are kept newest last, at most a dozen, and the shape is checked when read back', () => {
    let runs = addRun([], scores, new Date('2026-10-20T10:00:00Z'))
    expect(runs[0]).toEqual({ at: '2026-10-20T10:00:00.000Z', right: [1, 0, 0], asked: [1, 1, 1] })
    for (let i = 0; i < 20; i++) runs = addRun(runs, scores, new Date(2026, 9, 21 + i))
    expect(runs).toHaveLength(KEEP_RUNS)
    expect(cleanRuns([...runs, { at: 5 }, null, { at: 'x', right: [1], asked: [1] }])).toHaveLength(KEEP_RUNS)
    expect(cleanRuns('nope')).toEqual([])
  })

  it('compares the last run with the one before, in points, per speed', () => {
    expect(change([])).toBeNull()
    const a = addRun([], scoreByRate([{ rate: 0.75, ok: true }, { rate: 1, ok: false }, { rate: 1.25, ok: false }]), new Date())
    const b = addRun(a, scoreByRate([{ rate: 0.75, ok: true }, { rate: 1, ok: true }, { rate: 1.25, ok: false }]), new Date())
    expect(change(b)).toEqual([0, 100, 0])
  })
})
