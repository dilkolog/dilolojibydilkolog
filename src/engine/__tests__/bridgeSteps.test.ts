import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { assembleTiles, buildExercise, canAssemble, displayForm, exerciseTypesFor, wordPieces, type ChoiceExercise, type TypedExercise } from '../exercises'
import { POLICY, newWordState, processAttempt } from '../review'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import { attemptMode, bridgeStep } from '../session'
import { pickExerciseType } from '../selection'
import { CATALOG, decision, elAno, laDecision, lArbre } from './fixtures'

const item: PlanItem = { kind: 'exercise', entryId: decision.id, reason: 'new', skill: 'recognition', exerciseType: 'mc_meaning' }

describe('building a word from its pieces', () => {
  it('cuts words into syllable-like pieces that join back to the answer, never a piece of one letter', () => {
    for (const w of ['decision', 'la décision', "l'arbre", 'el año', 'bread', 'improve', 'abandonner', 'take off']) {
      const pieces = wordPieces(w)
      expect(pieces.join(''), w).toBe(w)
      expect(pieces.length, w).toBeGreaterThanOrEqual(2)
      for (const p of pieces) expect(p.trim().length, `${w}: ${JSON.stringify(pieces)}`).toBeGreaterThanOrEqual(2)
    }
    // A short article stays whole.
    expect(wordPieces('la décision')[0]).toBe('la ')
  })

  it('shuffles the pieces out of order and adds at most two pieces of other words', () => {
    for (let seed = 1; seed < 40; seed++) {
      const tiles = assembleTiles('decision', ['decide', 'improve'], createRng(seed))
      const pieces = wordPieces('decision')
      expect(tiles.slice(0, pieces.length).join('')).not.toBe('decision')
      for (const p of pieces) expect(tiles).toContain(p)
      expect(tiles.length - pieces.length).toBeLessThanOrEqual(2)
    }
  })

  it('is only for words with enough letters and phrases of up to three words', () => {
    expect(canAssemble('a')).toBe(false)
    expect(canAssemble('el')).toBe(false)
    expect(canAssemble('año')).toBe(true)
    expect(canAssemble('a long phrase of many words')).toBe(false)
  })
})

describe('the two bridge questions', () => {
  it('meaning → pick the word: the Turkish gloss asks, the target words answer', () => {
    const ex = buildExercise('mc_reverse', decision, CATALOG, createRng(3)) as ChoiceExercise
    expect(ex.kind).toBe('choice')
    expect(ex.prompt).toBe(decision.senses[0].gloss)
    expect(ex.options.map((o) => o.label)).toContain(displayForm(decision))
    expect(ex.options).toHaveLength(4)
    expect(ex.skill).toBe('recognition')
  })

  it('meaning → build the word: the tiles hold the answer, accents and article as written', () => {
    for (const entry of [decision, laDecision, lArbre, elAno]) {
      const ex = buildExercise('assemble', entry, CATALOG, createRng(5)) as TypedExercise
      const answer = displayForm(entry)
      expect(ex.accepted).toEqual([answer])
      expect(ex.prompt).toBe(entry.senses[0].gloss)
      for (const p of wordPieces(answer)) expect(ex.tiles).toContain(p)
      expect(ex.hints).toEqual([])
    }
  })

  it('are never picked for a skill’s ordinary questions, so reviews ask as before', () => {
    const types = exerciseTypesFor('recognition', decision, {}, undefined)
    expect(types).not.toContain('mc_reverse')
    expect(types).not.toContain('assemble')
    for (let seed = 1; seed < 30; seed++) expect(['mc_reverse', 'assemble']).not.toContain(pickExerciseType('recognition', decision, undefined, createRng(seed)))
  })
})

describe('the bridge step of the ladder', () => {
  it('builds the word after a steady answer, picks it after a slow one', () => {
    expect(bridgeStep(item, decision, true).exerciseType).toBe('assemble')
    expect(bridgeStep(item, decision, false).exerciseType).toBe('mc_reverse')
    expect(bridgeStep(item, decision, false)).toMatchObject({ kind: 'exercise', skill: 'recognition' })
  })

  it('a step switched off in Settings → Sorular falls to the other, both off to the meaning question', () => {
    expect(bridgeStep(item, decision, true, { off: ['assemble'] }).exerciseType).toBe('mc_reverse')
    expect(bridgeStep(item, decision, false, { off: ['mc_reverse'] }).exerciseType).toBe('assemble')
    expect(bridgeStep(item, decision, true, { off: ['assemble', 'mc_reverse'] }).exerciseType).toBe('mc_meaning')
  })

  it('a word too short to build gets the other bridge', () => {
    const short = { ...decision, id: 'en:go', lemma: 'go', senses: [{ ...decision.senses[0], gloss: 'gitmek' }] }
    expect(bridgeStep(item, short, true).exerciseType).toBe('mc_reverse')
  })

  it('is practice for a word already recognised: no card, no interval moves; answers are tagged bridge-v1', () => {
    const scheduler = createScheduler({ fuzz: false })
    const at = new Date('2026-11-14T12:00:00Z')
    const first = processAttempt(newWordState(decision, at), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 5000, hintsUsed: 0, maxHints: 0, at, mode: 'normal', guided: true }, [], scheduler)
    const step: PlanItem = { ...bridgeStep(item, decision, true), reason: 'practice', learningFollowUp: true }
    const mode = attemptMode(step, 'normal', first.state, { verdict: 'correct', hintsUsed: 0, maxHints: 0 })
    expect(mode).toBe('practice')
    const after = processAttempt(first.state, { exerciseType: 'assemble', verdict: 'correct', responseMs: 4000, hintsUsed: 0, maxHints: 0, at: new Date(at.getTime() + 60_000), mode, guided: true }, [], scheduler)
    expect(after.state.skills).toEqual(first.state.skills)
    expect(POLICY).toBe('bridge-v1')
    expect(after.event.ctx?.policy ?? first.event.ctx?.policy).toBe('bridge-v1')
  })
})
