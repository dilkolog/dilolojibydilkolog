import { describe, expect, it } from 'vitest'
import { cardMatches, fold, MAX_SUGGESTIONS, suggestGames, type GameSignals } from '../gameSuggest'

const NONE: GameSignals = { accent: 0, article: 0, openMistakes: 0, dueSentences: 0, dueGrammar: 0, earMisses: 0, backSentences: 0, weakPron: 0, fluencyWords: 0, fluencyNeeds: 30 }
const any = () => true

describe('suggestGames', () => {
  it('falls back to a warm-up and everyday work when nothing in the data points anywhere: always three', () => {
    expect(suggestGames(NONE, any).map((g) => g.id)).toEqual(['match', 'dialogues', 'grammar'])
  })

  it('fills from the everyday ones past a game that cannot start', () => {
    expect(suggestGames(NONE, (id) => id !== 'match' && id !== 'grammar').map((g) => g.id)).toEqual(['dialogues', 'truefalse', 'numbers'])
  })

  it('names up to three games, the most pressing first, each with its reason', () => {
    const out = suggestGames({ ...NONE, accent: 4, dueSentences: 2, dueGrammar: 5, earMisses: 6, openMistakes: 9 }, any)
    expect(out.map((g) => g.id)).toEqual(['accent', 'sentences', 'grammar'])
    expect(out).toHaveLength(MAX_SUGGESTIONS)
    expect(out[0].why).toContain('4 kelimede aksan')
  })

  it('skips a game that cannot be played now and takes the next one', () => {
    const out = suggestGames({ ...NONE, dueSentences: 2, earMisses: 5 }, (id) => id !== 'sentences')
    expect(out.map((g) => g.id)).toEqual(['ear', 'match', 'dialogues'])
  })

  it('wants enough evidence: one open accent mistake is not a suggestion', () => {
    expect(suggestGames({ ...NONE, accent: 1, openMistakes: 2, weakPron: 2 }, any).map((g) => g.id)).toEqual(['match', 'dialogues', 'grammar'])
  })
})

describe('game search', () => {
  it('ignores case, accents and the Turkish dotted i', () => {
    expect(fold('ÇİFT Ağaç Işık')).toBe('cift agac isik')
  })

  it('needs every word typed to be in the name or the description', () => {
    const card = { name: 'Gerçek seslerle dikte', text: 'Farklı insanların sesinden gerçek cümleleri dinle ve yaz.' }
    expect(cardMatches(card, 'dikte')).toBe(true)
    expect(cardMatches(card, 'GERCEK dinle')).toBe(true)
    expect(cardMatches(card, 'dikte eşleştirme')).toBe(false)
    expect(cardMatches(card, '   ')).toBe(true)
  })
})
