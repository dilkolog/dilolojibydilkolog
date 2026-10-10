import { describe, expect, it } from 'vitest'
import { PRON_GOOD, weakPronWords } from '../pronWeak'
import type { VocabularyEntry } from '../types'

const word = (id: string, language = 'fr') => ({ id, lemma: id.split(':')[1], language, senses: [{ id: `${id}#1`, gloss: 'x', examples: [] }] }) as unknown as VocabularyEntry
const tries = (...scores: number[]) => scores.map((score, i) => ({ at: `2026-10-0${i + 1}T09:00:00Z`, score }))

describe('weakPronWords', () => {
  const vocabulary = [word('fr:rue'), word('fr:oeuf'), word('fr:chat'), word('es:calle', 'es'), word('fr:sans-score')]

  it('lists the words averaging under the bar over the latest tries, weakest first', () => {
    const weak = weakPronWords({ 'fr:rue': tries(50, 60), 'fr:oeuf': tries(40), 'fr:chat': tries(90, 95), 'es:calle': tries(10) }, vocabulary, 'fr')
    expect(weak.map((w) => w.entry.id)).toEqual(['fr:oeuf', 'fr:rue'])
    expect(weak[1]).toMatchObject({ latest: 60, recent: 55, tries: 2 })
  })

  it('drops a word once its latest tries are good again, even after bad early ones', () => {
    const history = tries(30, 40, PRON_GOOD + 5, 90, 92)
    expect(weakPronWords({ 'fr:rue': history }, vocabulary, 'fr')).toEqual([])
    // Two good tries after a bad one: the average of the last three is still under the bar.
    expect(weakPronWords({ 'fr:rue': tries(20, 90, 90) }, vocabulary, 'fr').map((w) => w.entry.id)).toEqual(['fr:rue'])
  })

  it('ignores words never scored, other languages, and honours the limit', () => {
    expect(weakPronWords({}, vocabulary, 'fr')).toEqual([])
    const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`fr:w${i}`, tries(10 + i)]))
    expect(weakPronWords(many, Array.from({ length: 20 }, (_, i) => word(`fr:w${i}`)), 'fr', 5)).toHaveLength(5)
  })
})
