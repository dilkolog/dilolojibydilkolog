import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { POS_CODE, type Pack } from '../../data/wordpackBuild'
import { derivedWords, familyOf, joined, rootOf, AFFIXES, type FamilyNode, type WordLookup } from '../derive'
import type { PartOfSpeech, TargetLanguage } from '../types'

const lexicon = (entries: Record<string, PartOfSpeech>): WordLookup => (w) => (entries[w] ? { pos: entries[w] } : undefined)

const EN = lexicon({
  comfort: 'noun', comfortable: 'adjective', uncomfortable: 'adjective', comfortably: 'adverb', discomfort: 'noun', comforting: 'adjective',
  happy: 'adjective', happily: 'adverb', happiness: 'noun', unhappy: 'adjective', refine: 'verb', fine: 'adjective', morning: 'noun', morn: 'noun', walking: 'noun', walk: 'verb',
})

const words = (nodes: FamilyNode[]): string[] => nodes.flatMap((n) => [n.word, ...words(n.children)])

describe('derivedWords', () => {
  it('builds only words the dictionary has, with the part of speech the ending makes', () => {
    const found = derivedWords('comfort', 'en', EN).map((d) => d.word)
    expect(found).toEqual(expect.arrayContaining(['comfortable', 'uncomfortable', 'comfortably', 'discomfort', 'comforting']))
    expect(found).not.toContain('uncomfort')
    // "fine" is an adjective and "refine" a verb: re- keeps the part of speech, so not this one.
    expect(derivedWords('fine', 'en', EN).map((d) => d.word)).not.toContain('refine')
  })

  it('handles the seams: y → i, a dropped "e", -able + -ly → -ably', () => {
    expect(derivedWords('happy', 'en', EN).map((d) => d.word)).toEqual(expect.arrayContaining(['happily', 'happiness', 'unhappy']))
    expect(joined('comfortable', AFFIXES.en.find((a) => a.form === 'ly')!, 'en')).toContain('comfortably')
  })

  it('records the pieces of every word', () => {
    const d = derivedWords('comfort', 'en', EN).find((x) => x.word === 'uncomfortable')!
    expect(d.morphs).toEqual([{ text: 'un', kind: 'prefix' }, { text: 'comfort', kind: 'root' }, { text: 'able', kind: 'suffix' }])
    expect(d.parent).toBe('comfortable')
  })

  it('says nothing for a word the dictionary lacks', () => {
    expect(derivedWords('zzzz', 'en', EN)).toEqual([])
  })
})

describe('rootOf and familyOf', () => {
  it('takes the endings off one after another down to the root', () => {
    expect(rootOf('uncomfortable', 'en', EN)).toMatchObject({ root: 'comfort' })
    expect(rootOf('uncomfortable', 'en', EN).steps.map((s) => s.form)).toEqual(['un', 'able'])
  })

  it('does not take "morn" for the root of "morning" (a coincidence of spelling) nor the verb form of a verb', () => {
    const ranked: WordLookup = (w) => (w === 'morning' ? { pos: 'noun', rank: 800 } : w === 'morn' ? { pos: 'noun', rank: 30000 } : EN(w))
    expect(rootOf('morning', 'en', ranked).root).toBe('morning')
    expect(rootOf('walking', 'en', EN).root).toBe('walking')
  })

  it('makes a tree from the root, with the word asked about inside it', () => {
    const f = familyOf('comfortable', 'en', EN)!
    expect(f.root.word).toBe('comfort')
    expect(f.current).toBe('comfortable')
    expect(words([f.root])).toEqual(expect.arrayContaining(['comfort', 'comfortable', 'uncomfortable', 'comfortably']))
    expect(f.root.children.find((c) => c.word === 'comfortable')!.children.map((c) => c.word).sort()).toEqual(['comfortably', 'uncomfortable'])
    expect(f.affixes.map((a) => a.form)).toEqual(expect.arrayContaining(['able', 'un', 'ly']))
  })

  it('has no family when nothing is built on the word', () => {
    expect(familyOf('morning', 'en', EN)).toBeUndefined()
  })
})

/** The real dictionary: the families it has, and the coincidences it must not make. */
describe('with the word pack', () => {
  const lookups: Partial<Record<TargetLanguage, WordLookup>> = {}
  const lookup = (language: TargetLanguage): WordLookup => {
    if (!lookups[language]) {
      const pack = JSON.parse(readFileSync(`src/data/wordpack/${language}.json`, 'utf8')) as Pack
      const rank = new Map<string, number>()
      readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split('\n').forEach((w, i) => w && !rank.has(w) && rank.set(w, i + 1))
      lookups[language] = (w) => {
        const r = pack.w[w]
        const pos = r?.p ? POS_CODE[r.p] : undefined
        return pos ? { pos, gloss: r.t?.[0], rank: rank.get(w) } : undefined
      }
    }
    return lookups[language]!
  }

  it('English: comfort, happy, interest', () => {
    const comfort = words([familyOf('comfort', 'en', lookup('en'))!.root])
    expect(comfort).toEqual(expect.arrayContaining(['comfortable', 'uncomfortable', 'comfortably', 'discomfort']))
    expect(words([familyOf('happy', 'en', lookup('en'))!.root])).toEqual(expect.arrayContaining(['happily', 'happiness', 'unhappy', 'unhappiness']))
    expect(rootOf('interesting', 'en', lookup('en')).root).toBe('interest')
    expect(rootOf('impossible', 'en', lookup('en')).root).toBe('possible')
  })

  it('French: the adverb takes the feminine (heureusement), the negative prefix follows the sound (impossible)', () => {
    expect(words([familyOf('confortable', 'fr', lookup('fr'))!.root])).toEqual(expect.arrayContaining(['confortablement', 'inconfortable']))
    expect(words([familyOf('heureux', 'fr', lookup('fr'))!.root])).toEqual(expect.arrayContaining(['heureusement', 'malheureux']))
    expect(rootOf('impossible', 'fr', lookup('fr')).root).toBe('possible')
    // heure + -eux fits the spelling but is not a family.
    expect(rootOf('heureux', 'fr', lookup('fr')).root).toBe('heureux')
  })

  it('Spanish: -mente on the feminine, z → c before -idad', () => {
    expect(words([familyOf('rápido', 'es', lookup('es'))!.root])).toContain('rápidamente')
    expect(words([familyOf('feliz', 'es', lookup('es'))!.root])).toEqual(expect.arrayContaining(['felicidad', 'infeliz']))
    expect(rootOf('imposible', 'es', lookup('es')).root).toBe('posible')
  })

  it('does not make families out of coincidences', () => {
    expect(rootOf('mission', 'en', lookup('en')).root).toBe('mission')
    expect(rootOf('business', 'en', lookup('en')).root).toBe('business')
    expect(rootOf('presentar', 'es', lookup('es')).root).toBe('presentar')
    expect(rootOf('début', 'fr', lookup('fr')).root).toBe('début')
  })
})
