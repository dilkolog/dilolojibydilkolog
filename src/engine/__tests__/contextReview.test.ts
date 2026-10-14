import { describe, expect, it } from 'vitest'
import { checkSlots, contextBank, contextItems, contextParts, contextRound, type ContextItem } from '../contextReview'
import { newWordState } from '../review'
import { createRng } from '../rng'
import { createEntry } from '../../data/wordInput'
import type { UserWordState, VocabularyEntry } from '../types'

const NOW = new Date('2026-10-14T10:00:00Z')
const word = (w: string, meaning = 'x'): VocabularyEntry => createEntry({ word: w, meaning }, 'fr', NOW)
const met = (e: VocabularyEntry, due?: Date): UserWordState => ({ ...newWordState(e, NOW), skills: due ? ({ recognition: { due } } as unknown as UserWordState['skills']) : {} })

const arbre = word("l'arbre")
const jardin = word('le jardin')
const decider = word('décider')
const fleur = word('la fleur')
const vocab = [arbre, jardin, decider, fleur]
const past = new Date('2026-10-13T10:00:00Z')
const later = new Date('2026-10-20T10:00:00Z')
const states = [met(arbre, past), met(jardin, later), met(decider, later)] // fleur never met

describe('sentences for review in context', () => {
  it('keeps sentences with two met words or more, blanks only the word (not the article), and counts the due ones', () => {
    const items = contextItems(
      [
        { text: "Dans le jardin, l'arbre était très grand cette année. La fleur est belle ici.", from: 'Mon texte' },
        { text: 'Le jardin est trop petit pour une fleur aussi belle.', translation: 'x', from: 'Çevirdiklerin' },
      ],
      'fr',
      vocab,
      states,
      NOW,
    )
    expect(items).toHaveLength(1)
    const [item] = items
    expect(item.from).toBe('Mon texte')
    expect(item.translation).toBeUndefined()
    expect(item.slots.map((s) => s.form)).toEqual(['jardin', 'arbre'])
    expect(item.text.slice(item.slots[1].start, item.slots[1].end)).toBe('arbre')
    expect(item.due).toBe(1)
    expect(contextParts(item).map((p) => ('slot' in p ? `[${p.slot}]` : p.text)).join('')).toBe("Dans le [0], l'[1] était très grand cette année.")
  })

  it('keeps a single translated sentence with its Turkish, finds an inflected form, and skips sentences too short', () => {
    const items = contextItems(
      [
        { text: 'Hier, nous avons décidé de planter un arbre dans le jardin.', translation: 'Dün bahçeye ağaç dikmeye karar verdik.', from: 'Çevirdiklerin' },
        { text: 'Le jardin, un arbre.', from: 'Kısa' },
      ],
      'fr',
      vocab,
      states,
      NOW,
    )
    expect(items).toHaveLength(1)
    expect(items[0].translation).toBe('Dün bahçeye ağaç dikmeye karar verdik.')
    expect(items[0].slots.map((s) => s.form)).toEqual(['décidé', 'arbre', 'jardin'])
  })

  it('makes a round with due sentences first, no word in more than two sentences', () => {
    const item = (id: string, due: number, words: string[]): ContextItem => ({ text: id, from: '', due, slots: words.map((w) => ({ entryId: w, form: w, start: 0, end: 0 })) })
    const items = [item('a', 0, ['x', 'y']), item('b', 2, ['x', 'z']), item('c', 1, ['x', 'w']), item('d', 0, ['y', 'w'])]
    const round = contextRound(items, createRng(3), 6)
    expect(round.map((r) => r.text).sort()).toEqual(['b', 'c', 'd'])
  })

  it('offers the sentence words plus a couple of others in the bank, and checks each blank', () => {
    const a: ContextItem = { text: 'a', from: '', due: 0, slots: [{ entryId: '1', form: 'jardin', start: 0, end: 0 }, { entryId: '2', form: 'arbre', start: 0, end: 0 }] }
    const b: ContextItem = { text: 'b', from: '', due: 0, slots: [{ entryId: '3', form: 'fleurs', start: 0, end: 0 }, { entryId: '1', form: 'Jardin', start: 0, end: 0 }] }
    const bank = contextBank(a, [a, b], createRng(1))
    expect([...bank].sort()).toEqual(['arbre', 'fleurs', 'jardin'])
    expect(checkSlots(a, ['Jardin', 'fleurs'])).toEqual([true, false])
    expect(checkSlots(a, [null, 'arbre'])).toEqual([false, true])
  })
})
