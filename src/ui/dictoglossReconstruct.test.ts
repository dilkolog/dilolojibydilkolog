import { describe, expect, it } from 'vitest'
import {
  glossParagraphs,
  recallCheck,
  sentenceWith,
} from './dictoglossReconstruct'

describe('dictoglossReconstruct', () => {
  describe('glossParagraphs', () => {
    it('filters out paragraphs with fewer than 30 or more than 90 words', () => {
      const short = 'This is a short paragraph with only nine words total.'
      const justRight = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ')
      const tooLong = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ')

      const texts = [`${short}\n\n${justRight}\n\n${tooLong}`]
      const result = glossParagraphs(texts)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(justRight)
    })

    it('normalizes internal whitespace and trims whitespace', () => {
      const words = Array.from({ length: 35 }, (_, i) => `term${i}`).join('   \n  ')
      const result = glossParagraphs([words])
      expect(result).toHaveLength(1)
      expect(result[0].includes('   ')).toBe(false)
    })
  })

  describe('recallCheck', () => {
    it('identifies content words and marks whether they were recalled in the attempt', () => {
      const original = 'The large elephant walked slowly through the dark jungle.'
      const attempt = 'An elephant walked through the jungle yesterday.'

      const check = recallCheck(original, attempt, 'en')

      // Elephant, walked, jungle are in attempt
      const elephantToken = check.find((t) => t.word.toLowerCase() === 'elephant')
      expect(elephantToken?.content).toBe(true)
      expect(elephantToken?.recalled).toBe(true)

      // Large was not in attempt
      const largeToken = check.find((t) => t.word.toLowerCase() === 'large')
      expect(largeToken?.content).toBe(true)
      expect(largeToken?.recalled).toBe(false)

      // "the" is a stop word in English
      const theToken = check.find((t) => t.word.toLowerCase() === 'the')
      expect(theToken?.content).toBe(false)
      expect(theToken?.recalled).toBe(false)
    })
  })

  describe('sentenceWith', () => {
    it('returns the specific sentence containing the target word', () => {
      const paragraph =
        'Yesterday was very sunny. We decided to visit the local library. Afterwards we ate dinner together.'
      const found = sentenceWith(paragraph, 'library')
      expect(found).toBe('We decided to visit the local library.')
    })

    it('falls back to the entire paragraph if word is not isolated in a single split', () => {
      const paragraph = 'Short text without punctuation'
      expect(sentenceWith(paragraph, 'nonexistent')).toBe(paragraph)
    })
  })
})
