// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { KEY, MAX_AGE, sentencesNow } from './dictSentences'

describe('dictSentences caching and retrieval', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exposes cache constants', () => {
    expect(KEY('fr', 'maison')).toBe('kelime-koc:dict-sentences:fr:maison')
    expect(MAX_AGE).toBe(30 * 86_400_000)
  })

  it('falls back to bundled pack records when no cache exists', () => {
    // PackRecord['c']: string[][] where each entry is [target, turkish, parallel1?, parallel2?]
    const bundled: [string, string][] = [
      ['Je vais à la maison.', 'Eve gidiyorum.'],
    ]

    const sentences = sentencesNow('fr', 'maison', bundled)
    expect(sentences).toHaveLength(1)
    expect(sentences[0].text).toBe('Je vais à la maison.')
    expect(sentences[0].translation).toBe('Eve gidiyorum.')
  })

  it('returns cached sentences if within MAX_AGE', () => {
    const cachedData = {
      at: Date.now() - 5 * 86_400_000, // 5 days old
      examples: [
        { text: 'Ceci est une maison.', translation: 'Bu bir evdir.', form: '' },
      ],
    }
    localStorage.setItem(KEY('fr', 'maison'), JSON.stringify(cachedData))

    const sentences = sentencesNow('fr', 'maison', [])
    expect(sentences).toHaveLength(1)
    expect(sentences[0].text).toBe('Ceci est une maison.')
  })

  it('ignores expired cache (> 30 days old) and falls back to pack', () => {
    const expiredData = {
      at: Date.now() - 35 * 86_400_000, // 35 days old
      examples: [
        { text: 'Vieux exemple.', translation: 'Eski örnek.', form: '' },
      ],
    }
    localStorage.setItem(KEY('fr', 'maison'), JSON.stringify(expiredData))

    const bundled: [string, string][] = [
      ['Nouvel exemple.', 'Yeni örnek.'],
    ]

    const sentences = sentencesNow('fr', 'maison', bundled)
    expect(sentences).toHaveLength(1)
    expect(sentences[0].text).toBe('Nouvel exemple.')
  })

  it('handles damaged localStorage data gracefully', () => {
    localStorage.setItem(KEY('fr', 'maison'), 'not-valid-json{')
    const sentences = sentencesNow('fr', 'maison', undefined)
    expect(sentences).toEqual([])
  })
})
