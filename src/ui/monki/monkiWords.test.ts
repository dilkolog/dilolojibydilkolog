import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import type { UserWordState } from '../../engine/types'
import { talkWords, usesWord } from './monkiWords'

describe('Monki words talk', () => {
  it('counts a word as used without its article, accents or case, and in another form of a longer word', () => {
    expect(usesWord('Hier, la Maison était grande.', 'la maison', 'fr')).toBe(true)
    expect(usesWord('Ayer decidí quedarme.', 'decidir', 'es')).toBe(true)
    expect(usesWord('Je pense que oui.', 'la maison', 'fr')).toBe(false)
    expect(usesWord('I read a book.', 'the book', 'en')).toBe(true)
  })

  it('picks the words being learned first, then new ones, then the settled', () => {
    const w = (lemma: string) => createEntry({ word: lemma, meaning: 'x' }, 'fr', new Date())
    const [learning, fresh, settled] = [w('venir'), w('partir'), w('aller')]
    const card = (stability: number) => ({ stability, state: 2, due: new Date(), reps: 9 })
    const state = (id: string, stability: number) =>
      ({ entryId: id, skills: { recognition: card(stability), recall: card(stability), production: card(stability) }, stats: { right: 9, wrong: 0 } }) as unknown as UserWordState
    const states = new Map([
      [learning.id, state(learning.id, 2)],
      [settled.id, state(settled.id, 400)],
    ])
    expect(talkWords([settled, fresh, learning], states, 2)).toEqual(['venir', 'partir'])
  })
})
