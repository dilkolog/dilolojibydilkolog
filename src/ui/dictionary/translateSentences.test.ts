import { describe, expect, it } from 'vitest'
import { sentencesOf, stripLabel, uniquePairs } from './translateSentences'

describe('sentencesOf', () => {
  it('cuts a text into sentences and keeps lines apart', () => {
    expect(sentencesOf('Le chat dort. Il fait beau.\nNous partons ?')).toEqual(['Le chat dort.', 'Il fait beau.', 'Nous partons ?'])
  })
})

describe('stripLabel', () => {
  it('drops a pasted label before a sentence, in any of the app languages', () => {
    expect(stripLabel('Örnek: Je lis le livre.')).toBe('Je lis le livre.')
    expect(stripLabel('Example : I read.')).toBe('I read.')
    expect(stripLabel('Exemple:Il pleut.')).toBe('Il pleut.')
  })
  it('leaves a sentence that only contains the word alone', () => {
    expect(stripLabel('Bu bir örnek: iyi.')).toBe('Bu bir örnek: iyi.')
    expect(stripLabel('Je lis.')).toBe('Je lis.')
  })
})

describe('uniquePairs', () => {
  const e = (text: string, translation: string) => ({ text, translation })
  it('keeps one of a pair translated both ways, the newest first', () => {
    const list = [e('Kedi uyuyor.', 'Le chat dort.'), e('Le chat dort.', 'Kedi uyuyor.'), e('Il fait beau.', 'Hava güzel.')]
    expect(uniquePairs(list)).toEqual([list[0], list[2]])
  })
  it('sees through a different full stop, case and a pasted label', () => {
    const list = [e('Örnek: Je lis.', 'Örnek: Okuyorum.'), e('je lis', 'okuyorum')]
    expect(uniquePairs(list)).toEqual([list[0]])
  })
  it('keeps different sentences', () => {
    expect(uniquePairs([e('a b', 'x'), e('a c', 'x')])).toHaveLength(2)
  })
})
