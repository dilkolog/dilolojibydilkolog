import { describe, expect, it } from 'vitest'
import { ACTION_PALETTE_ART, SCREEN_PALETTE_ART, commandArtIcon } from './paletteArt'
import { GAME_LIST } from './gameList'
import { ALL_SCREENS } from '../appNav'

describe('command palette art', () => {
  it('maps every screen in ALL_SCREENS to an illustrated icon', () => {
    for (const s of ALL_SCREENS) {
      expect(SCREEN_PALETTE_ART[s.screen]).toBeTruthy()
      expect(commandArtIcon(s.screen)).toBeTruthy()
    }
  })

  it('maps key palette actions to illustrated icons', () => {
    const actions = ['start', 'add', 'practice', 'mistakes-practice', 'vocabtest', 'exam', 'add-typed', 'look-up']
    for (const a of actions) {
      expect(ACTION_PALETTE_ART[a]).toBeTruthy()
      expect(commandArtIcon(a)).toBeTruthy()
    }
  })

  it('maps every game in GAME_LIST to an illustrated game art icon', () => {
    for (const g of GAME_LIST) {
      const icon = commandArtIcon(`game-${g.id}`)
      expect(icon).toBeTruthy()
    }
  })

  it('falls back gracefully to given node if id is unknown', () => {
    expect(commandArtIcon('unknown-id', 'fallback-node')).toBe('fallback-node')
  })
})
