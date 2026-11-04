import { afterEach, describe, expect, it } from 'vitest'
import { prefs } from './prefs'
import { MOMENTS, notesOf, soundAllowed, type SoundName } from './sounds'

const midiOf = (f: number) => Math.round(69 + 12 * Math.log2(f / 440))
const NAMES: SoundName[] = ['correct', 'near', 'wrong', 'forgot', 'combo', 'pair', 'finish', 'goal', 'badge', 'levelUp']

afterEach(() => {
  prefs.soundEffects = true
  prefs.soundLevel = 'all'
})

describe('the app sounds', () => {
  it('take every note from one scale (C major pentatonic), so sounds that follow each other fit', () => {
    for (const name of NAMES)
      for (let step = 0; step < 8; step++)
        for (const hit of notesOf(name, step)) expect([0, 2, 4, 7, 9]).toContain(((midiOf(hit.f) % 12) + 12) % 12)
  })

  it('a right answer climbs the scale while they come in a row, and stays in a comfortable range', () => {
    const tops = Array.from({ length: 8 }, (_, step) => Math.max(...notesOf('correct', step).map((h) => h.f)))
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThan(tops[i - 1])
    expect(Math.max(...tops)).toBeLessThan(2600)
  })

  it('keep the big moments apart: the level-up is the longest, the wrong answer sits below the right ones', () => {
    const length = (n: SoundName) => Math.max(...notesOf(n).map((h) => h.at + h.ring))
    for (const n of NAMES.filter((x) => x !== 'levelUp')) expect(length('levelUp')).toBeGreaterThan(length(n))
    expect(Math.max(...notesOf('wrong').map((h) => h.f))).toBeLessThan(Math.min(...notesOf('correct').map((h) => h.f)))
    expect(notesOf('forgot')).toHaveLength(1)
  })

  it('stay short for an answer, so the word said after it is heard', () => {
    for (const n of ['correct', 'near', 'wrong'] as const) expect(Math.max(...notesOf(n, 7).map((h) => h.at))).toBeLessThan(0.15)
  })

  it('with "only the big moments", answers are silent and the moments still sound; off means none', () => {
    prefs.soundLevel = 'moments'
    expect(soundAllowed('correct')).toBe(false)
    expect(soundAllowed('wrong')).toBe(false)
    for (const m of MOMENTS) expect(soundAllowed(m)).toBe(true)
    prefs.soundEffects = false
    for (const m of MOMENTS) expect(soundAllowed(m)).toBe(false)
  })
})
