import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SentenceCard } from '../../engine/sentences'
import type { TranslationEntry } from '../../engine/translationMemory'
import { loadBackItems } from '../backItems'
import { db } from '../instance'

vi.mock('../instance', () => ({
  db: {
    getTranslations: vi.fn(),
    getSentences: vi.fn(),
  },
}))

describe('backItems loadBackItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads back items by combining translations and sentences', async () => {
    const translations: TranslationEntry[] = [
      {
        from: 'en',
        to: 'tr',
        text: 'The weather is very nice today',
        translation: 'Bugün hava çok güzel',
        at: '2026-10-15T10:00:00.000Z',
      },
      {
        from: 'en',
        to: 'tr',
        text: 'I already have a card for this',
        translation: 'Bunun için kartım var',
        at: '2026-10-15T11:00:00.000Z',
      },
    ]

    const cards = [
      {
        id: 'c1',
        language: 'en',
        text: 'I already have a card for this',
        translation: 'Bunun için kartım var',
        addedAt: '2026-10-16T10:00:00.000Z',
        card: {},
      },
    ] as SentenceCard[]

    vi.mocked(db.getTranslations).mockResolvedValue(translations)
    vi.mocked(db.getSentences).mockResolvedValue(cards)

    const items = await loadBackItems('en')

    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('The weather is very nice today')
    expect(items[0].turkish).toBe('Bugün hava çok güzel')
  })

  it('handles getTranslations error gracefully by falling back to empty list', async () => {
    vi.mocked(db.getTranslations).mockRejectedValue(new Error('db error'))
    vi.mocked(db.getSentences).mockResolvedValue([])

    const items = await loadBackItems('en')
    expect(items).toEqual([])
  })
})
