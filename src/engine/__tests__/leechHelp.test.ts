import { describe, expect, it } from 'vitest'
import { leechHelp } from '../leechHelp'
import { newWordState } from '../review'
import { decision } from './fixtures'
import type { UserWordState } from '../types'

const now = new Date('2026-10-10T12:00:00Z')
const state = (stats: Partial<UserWordState['stats']> = {}, lapses = 0): UserWordState => {
  const s = newWordState(decision, now)
  const skill = { ...(s.skills.recognition ?? Object.values(s.skills)[0] ?? {}), lapses } as UserWordState['skills']['recognition']
  return { ...s, stats: { ...s.stats, ...stats }, skills: lapses ? { ...s.skills, recognition: skill } : s.skills }
}
const none = new Set<string>()
const noNote = { notes: undefined }
const withNote = { notes: 'ipucu: kararsızlık' }

describe('help for a word that keeps failing', () => {
  it('stays quiet for a word that is fine', () => {
    expect(leechHelp(state({ reviews: 10, wrong: 1 }), noNote, none)).toBeNull()
  })

  it('offers a memory hook after three wrong in a row, every time', () => {
    const s = state({ consecutiveWrong: 3, reviews: 3, wrong: 3 })
    expect(leechHelp(s, noNote, none)).toBe('mnemonic')
    // The old rule has no cooldown: still offered although this session already did.
    expect(leechHelp(s, noNote, new Set([s.entryId]))).toBe('mnemonic')
  })

  it('catches a chronic leech that never fails three in a row: half wrong over many answers', () => {
    const s = state({ reviews: 8, wrong: 4, consecutiveWrong: 1 })
    expect(leechHelp(s, noNote, none)).toBe('mnemonic')
  })

  it('offers it once a session only for that broader kind', () => {
    const s = state({ reviews: 8, wrong: 4, consecutiveWrong: 1 })
    expect(leechHelp(s, noNote, new Set([s.entryId]))).toBeNull()
  })

  it('suggests starting over when a note is already there and the word still fails', () => {
    const s = state({ reviews: 8, wrong: 4, consecutiveWrong: 1 })
    expect(leechHelp(s, withNote, none)).toBe('relearn')
    expect(leechHelp(s, { notes: '   ' }, none)).toBe('mnemonic')
    expect(leechHelp(s, withNote, new Set([s.entryId]))).toBeNull()
  })

  it('counts many lapses as a leech too', () => {
    expect(leechHelp(state({ reviews: 5, wrong: 1, consecutiveWrong: 1 }, 5), noNote, none)).toBe('mnemonic')
  })
})
