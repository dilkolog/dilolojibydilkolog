import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import { crossLanguageLinks, falseFriendsOf, trapGlosses } from '../crossLanguage'
import { buildExercise, evaluateChoice, type ChoiceExercise } from '../exercises'
import { createRng } from '../rng'
import type { TargetLanguage } from '../types'
import { CATALOG } from './fixtures'

const NOW = new Date('2026-10-01T10:00:00')
const word = (language: TargetLanguage, w: string, meaning: string) => createEntry({ word: w, meaning }, language, NOW)

describe('false friends', () => {
  it('finds look-alikes in the other languages, articles ignored', () => {
    expect(falseFriendsOf(word('fr', 'actuellement', 'şu anda'))).toEqual([{ lang: 'en', word: 'actually', gloss: 'aslında' }])
    expect(falseFriendsOf(word('fr', 'la librairie', 'kitapçı')).map((f) => f.word)).toEqual(['library'])
    expect(falseFriendsOf(word('es', 'embarazada', 'hamile')).map((f) => f.lang).sort()).toEqual(['en', 'fr'])
    expect(falseFriendsOf(word('fr', 'maison', 'ev'))).toEqual([])
  })

  it('a trap is never one of the word’s own meanings', () => {
    expect(trapGlosses(word('fr', 'actuellement', 'şu anda'))).toEqual(['aslında'])
    expect(trapGlosses(word('fr', 'actuellement', 'şu anda, aslında'))).toEqual([])
  })

  it('the trap meaning is offered in meaning questions and picking it is a false-friend error', () => {
    const entry = word('fr', 'actuellement', 'şu anda')
    for (let seed = 0; seed < 10; seed++) {
      const ex = buildExercise('mc_meaning', entry, CATALOG, createRng(seed)) as ChoiceExercise
      const trap = ex.options.find((o) => o.label === 'aslında')
      expect(trap).toBeDefined()
      expect(evaluateChoice(ex, trap!.id)).toMatchObject({ verdict: 'wrong', errorType: 'false_friend' })
    }
  })
})

describe('crossLanguageLinks', () => {
  it('links words with a shared Turkish meaning and marks look-alikes as cognates', () => {
    const fr = word('fr', 'la décision', 'karar')
    const others = [word('en', 'decision', 'karar'), word('es', 'la decisión', 'karar, kararlılık'), word('en', 'verdict', 'karar'), word('en', 'house', 'ev')]
    const links = crossLanguageLinks(fr, others)
    expect(links.map((l) => [l.entry.lemma, l.cognate])).toEqual([
      ['decision', true],
      ['decisión', true],
      ['verdict', false],
    ])
  })
})

describe('conceptGroups', () => {
  it('joins words across languages through shared meanings and skips single-language groups', async () => {
    const { conceptGroups } = await import('../crossLanguage')
    const all = [
      word('en', 'advice', 'tavsiye, öğüt'),
      word('fr', 'le conseil', 'öğüt, konsey'),
      word('es', 'el consejo', 'tavsiye'),
      word('en', 'decision', 'karar'),
      word('fr', 'la décision', 'karar'),
      word('en', 'house', 'ev'),
      word('en', 'home', 'ev'),
    ]
    const groups = conceptGroups(all)
    expect(groups.map((g) => [g.languages, Object.values(g.words).flat().map((w) => w.lemma).sort()])).toEqual([
      [3, ['advice', 'conseil', 'consejo']],
      [2, ['decision', 'décision']],
    ])
    expect(groups[1]).toMatchObject({ gloss: 'karar', cognate: true })
  })
})
