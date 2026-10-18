import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../engine/gamification'
import { NEW_QUEST_ART, QUEST_ART, STAT_ART, drawnMedal } from './drawnArt'

describe('drawn medals', () => {
  it('give every badge a picture of its own kind', () => {
    const missing = [...new Set(ACHIEVEMENTS.map((a) => a.stat))].filter((stat) => !drawnMedal(stat))
    expect(missing).toEqual([])
  })

  it('exports matching kawaii stat mascot artwork', () => {
    expect(STAT_ART.sprout).toBeTruthy()
    expect(STAT_ART.star).toBeTruthy()
    expect(STAT_ART.book).toBeTruthy()
    expect(STAT_ART.flame).toBeTruthy()
    expect(STAT_ART.check).toBeTruthy()
  })

  it('provides dedicated artwork for daily quests and weekly challenges', () => {
    expect(QUEST_ART.studyDays).toBeTruthy()
    expect(QUEST_ART.bossWins).toBeTruthy()
    expect(QUEST_ART.journalEntries).toBeTruthy()
    expect(QUEST_ART.textsRead).toBeTruthy()
    expect(QUEST_ART.newWords).toBeTruthy()
    expect(QUEST_ART.answers).toBeTruthy()
  })

  it('exports complete 9-piece new quest artwork set', () => {
    const keys = ['sprout', 'target', 'chain', 'recall', 'dictation', 'ear', 'dialogue', 'speed', 'trophy'] as const
    for (const key of keys) {
      expect(NEW_QUEST_ART[key]).toBeTruthy()
      expect(typeof NEW_QUEST_ART[key]).toBe('string')
      expect(NEW_QUEST_ART[key]).toMatch(/\.webp$/)
    }
  })
})

