import { describe, expect, it } from 'vitest'
import {
  LANG_MONKI,
  CEFR_MONKI,
  STICKER,
  listCover,
  BOSS_ART,
  TILE_ART,
} from './drawnArt'

describe('New Visual Art Assets', () => {
  it('registers all cultural language mascots', () => {
    expect(LANG_MONKI.en).toBeTruthy()
    expect(LANG_MONKI.fr).toBeTruthy()
    expect(LANG_MONKI.es).toBeTruthy()
  })

  it('registers CEFR level Monki mascots', () => {
    expect(CEFR_MONKI.A1).toBeTruthy()
    expect(CEFR_MONKI.B1).toBeTruthy()
    expect(CEFR_MONKI.C1).toBeTruthy()
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
})
