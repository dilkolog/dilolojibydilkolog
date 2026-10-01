import { describe, expect, it } from 'vitest'
import { createEntry, findForm, importWords, parseCollocations, parseDelimited, WordInputError } from './wordInput'

const NOW = new Date('2026-10-01T10:00:00Z')

describe('findForm', () => {
  it('finds exact and inflected forms', () => {
    expect(findForm('She decided to stay.', 'decide')).toBe('decided')
    expect(findForm('It was a difficult decision.', 'decision')).toBe('decision')
    expect(findForm("J'essaie de comprendre.", 'essayer')).toBe('essaie')
  })
  it('prefers a word marked with asterisks', () => {
    expect(findForm('No *sé* dónde está.', 'saber')).toBe('sé')
  })
  it('returns undefined when the word cannot be found', () => {
    expect(findForm('No sé dónde está.', 'saber')).toBeUndefined()
  })
})

describe('createEntry', () => {
  it('builds a minimal entry from word + meaning', () => {
    const e = createEntry({ word: 'abandon', meaning: 'terk etmek, bırakmak' }, 'en', NOW)
    expect(e).toMatchObject({ id: 'en:abandon', lemma: 'abandon', source: 'user', addedAt: NOW })
    expect(e.senses[0]).toMatchObject({ gloss: 'terk etmek', altGlosses: ['bırakmak'], examples: [] })
  })

  it('takes article and gender from "la décision"', () => {
    const e = createEntry({ word: 'La décision', meaning: 'karar' }, 'fr', NOW)
    expect(e).toMatchObject({ id: 'fr:décision', lemma: 'décision', article: 'la', gender: 'f', partOfSpeech: 'noun' })
  })

  it("needs the gender explicitly for l'", () => {
    const e = createEntry({ word: "l'arbre", meaning: 'ağaç', gender: 'm' }, 'fr', NOW)
    expect(e).toMatchObject({ lemma: 'arbre', article: "l'", gender: 'm' })
  })

  it('drops English articles / "to"', () => {
    expect(createEntry({ word: 'to abandon', meaning: 'terk etmek' }, 'en', NOW).lemma).toBe('abandon')
  })

  it('stores the example with the detected form, without asterisks', () => {
    const e = createEntry(
      { word: 'saber', meaning: 'bilmek', example: 'No *sé* dónde está.', exampleTranslation: 'Nerede olduğunu bilmiyorum.' },
      'es',
      NOW,
    )
    expect(e.senses[0].examples[0]).toEqual({ text: 'No sé dónde está.', translation: 'Nerede olduğunu bilmiyorum.', form: 'sé' })
  })

  it('explains how to fix an example where the word is missing', () => {
    expect(() => createEntry({ word: 'saber', meaning: 'bilmek', example: 'No sé.' }, 'es', NOW)).toThrow(WordInputError)
  })

  it('requires word and meaning', () => {
    expect(() => createEntry({ word: '', meaning: 'x' }, 'en', NOW)).toThrow('Kelime')
    expect(() => createEntry({ word: 'x', meaning: ' ' }, 'en', NOW)).toThrow('anlam')
  })

  it('links confusables by id', () => {
    const e = createEntry({ word: 'affect', meaning: 'etkilemek', confusables: 'effect' }, 'en', NOW)
    expect(e.relations).toEqual([{ type: 'confusable', targetId: 'en:effect' }])
  })
})

describe('parseCollocations', () => {
  it('parses phrase, translation and wrong variants', () => {
    expect(parseCollocations('make a decision = karar vermek (do a decision, give a decision); final decision = nihai karar')).toEqual([
      { phrase: 'make a decision', translation: 'karar vermek', wrongVariants: ['do a decision', 'give a decision'] },
      { phrase: 'final decision', translation: 'nihai karar', wrongVariants: undefined },
    ])
  })
})

describe('parseDelimited', () => {
  it('detects tabs (pasted from a spreadsheet)', () => {
    expect(parseDelimited('a\tb\nc\td')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('handles quotes, embedded delimiters and CRLF', () => {
    expect(parseDelimited('"x, y",z\r\n"say ""hi""",w\n')).toEqual([['x, y', 'z'], ['say "hi"', 'w']])
  })
})

describe('importWords', () => {
  it('imports rows, skips the header and duplicates, and reports bad lines', () => {
    const text = [
      'kelime\tanlam\törnek cümle\törnek çevirisi',
      'decision\tkarar\tIt was a hard decision.\tZor bir karardı.',
      'decide\tkarar vermek',
      'decision\tkarar',
      'oops\t',
      'improve\tgeliştirmek',
    ].join('\n')
    const r = importWords(text, 'en', new Set(['en:improve']), NOW)
    expect(r.entries.map((e) => e.lemma)).toEqual(['decision', 'decide'])
    expect(r.entries.every((e) => e.source === 'import')).toBe(true)
    expect(r.duplicates).toEqual(['decision', 'improve'])
    expect(r.errors).toEqual([{ line: 5, message: 'Türkçe anlamı yaz.' }])
    // File order is kept as introduction order.
    expect(r.entries[0].addedAt!.getTime()).toBeLessThan(r.entries[1].addedAt!.getTime())
  })
})
