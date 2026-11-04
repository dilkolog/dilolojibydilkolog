import { describe, expect, it } from 'vitest'
import {
  LANG_MONKI,
  CEFR_MONKI,
  STICKER,
  listCover,
  BOSS_ART,
  TILE_ART,
  AMBIENT_SKY,
  GARDEN_POTS,
  ANIMATED_MONKI,
} from './drawnArt'
import { readerStyle } from './readerSettings'

describe('New Visual Art Assets', () => {
  it('registers all cultural language mascots', () => {
    expect(LANG_MONKI.en).toBeTruthy()
    expect(LANG_MONKI.fr).toBeTruthy()
    expect(LANG_MONKI.es).toBeTruthy()
  })

  it('registers CEFR level Monki mascots for all levels with distinct art', () => {
    expect(CEFR_MONKI.A1).toBeTruthy()
    expect(CEFR_MONKI.A2).toBeTruthy()
    expect(CEFR_MONKI.B1).toBeTruthy()
    expect(CEFR_MONKI.B2).toBeTruthy()
    expect(CEFR_MONKI.C1).toBeTruthy()
    expect(CEFR_MONKI.C2).toBeTruthy()
    const uniqueIcons = new Set(Object.values(CEFR_MONKI))
    expect(uniqueIcons.size).toBe(6)
  })

  it('registers all 6 new Monki stickers', () => {
    expect(STICKER.idea).toBeTruthy()
    expect(STICKER.star).toBeTruthy()
    expect(STICKER.speed).toBeTruthy()
    expect(STICKER.detective).toBeTruthy()
    expect(STICKER.magic).toBeTruthy()
    expect(STICKER.shy).toBeTruthy()
  })

  it('maps new topic keywords to new category covers', () => {
    expect(listCover('Yazılım ve Teknoloji')).toBeTruthy()
    expect(listCover('Sanat ve Müzik')).toBeTruthy()
    expect(listCover('Spor ve Fitness')).toBeTruthy()
    expect(listCover('Dünya Edebiyatı')).toBeTruthy()
    expect(listCover('Hukuk Terimleri')).toBeTruthy()
    expect(listCover('Tarih ve Coğrafya')).toBeTruthy()
  })

  it('registers new boss monsters in boss arena', () => {
    expect(BOSS_ART.length).toBe(10)
  })

  it('registers speed duel and shadowing in tile art', () => {
    expect(TILE_ART.duel).toBeTruthy()
    expect(TILE_ART.shadowing).toBeTruthy()
  })

  it('registers ambient sky illustrations for all day parts', () => {
    expect(AMBIENT_SKY.dawn).toBeTruthy()
    expect(AMBIENT_SKY.day).toBeTruthy()
    expect(AMBIENT_SKY.dusk).toBeTruthy()
    expect(AMBIENT_SKY.night).toBeTruthy()
  })

  it('registers high-res botanical terracotta garden pots for all 6 stages', () => {
    expect(GARDEN_POTS.length).toBe(6)
    for (let i = 0; i < 6; i++) {
      expect(GARDEN_POTS[i]).toBeTruthy()
    }
  })

  it('enables reader-zen class in readerStyle when zen is active', () => {
    const normal = readerStyle({ size: 1, airy: false, sepia: false, sans: false, width: 1, zen: false })
    expect(normal.className).not.toContain('reader-zen')

    const zen = readerStyle({ size: 1, airy: false, sepia: false, sans: false, width: 1, zen: true })
    expect(zen.className).toContain('reader-zen')
  })

  it('registers all 3 animated Monki WebP mascots', () => {
    expect(ANIMATED_MONKI.wave).toBeTruthy()
    expect(ANIMATED_MONKI.celebrate).toBeTruthy()
    expect(ANIMATED_MONKI.wink).toBeTruthy()
  })
})
