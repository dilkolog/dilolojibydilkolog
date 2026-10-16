import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { saveSentence } from './saveSentence'

vi.mock('../data/instance', () => ({
  db: {
    getSentences: vi.fn(),
    saveSentence: vi.fn(),
  },
  scheduler: {
    newCard: vi.fn(() => ({
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: undefined,
    })),
  },
}))

describe('saveSentence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false for empty or whitespace-only sentence text', async () => {
    vi.mocked(db.getSentences).mockResolvedValue([])

    const r1 = await saveSentence({ language: 'en', text: '' })
    expect(r1).toBe(false)

    const r2 = await saveSentence({ language: 'en', text: '    ' })
    expect(r2).toBe(false)
    expect(db.saveSentence).not.toHaveBeenCalled()
  })

  it('returns false when identical sentence already exists for the same language', async () => {
    vi.mocked(db.getSentences).mockResolvedValue([
      {
        id: 's1',
        language: 'en',
        text: 'This is an existing sentence.',
        translation: '',
        addedAt: new Date().toISOString(),
        card: {} as never,
      },
    ])

    const res = await saveSentence({
      language: 'en',
      text: 'This   is an existing sentence.', // normalized whitespace matches
    })
    expect(res).toBe(false)
    expect(db.saveSentence).not.toHaveBeenCalled()
  })

  it('normalizes whitespace, saves new sentence and returns true', async () => {
    vi.mocked(db.getSentences).mockResolvedValue([])
    vi.mocked(db.saveSentence).mockResolvedValue()

    const res = await saveSentence({
      language: 'fr',
      text: '  C\'est   une   phrase   nouvelle.  ',
      translation: 'Bu yeni bir cümle.',
    })

    expect(res).toBe(true)
    expect(db.saveSentence).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(db.saveSentence).mock.calls[0][0]
    expect(saved.language).toBe('fr')
    expect(saved.text).toBe("C'est une phrase nouvelle.")
    expect(saved.translation).toBe('Bu yeni bir cümle.')
  })
})
