import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EarLog } from '../../engine/earMisses'
import type { DiffPart } from '../../engine/wordDiff'
import { db } from '../instance'
import { noteDictation } from '../earLog'

vi.mock('../instance', () => ({
  db: {
    getEarLog: vi.fn(),
    saveEarLog: vi.fn(),
  },
}))

describe('earLog noteDictation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records dictation misses and passes updated log to db.saveEarLog', async () => {
    const initialLog: EarLog = {}
    vi.mocked(db.getEarLog).mockResolvedValue(initialLog)
    vi.mocked(db.saveEarLog).mockResolvedValue('earMisses')

    const parts: DiffPart[] = [
      { word: 'I', status: 'ok' },
      { word: 'saw', status: 'missed' },
      { word: 'the', status: 'ok' },
      { word: 'cat', status: 'ok' },
    ]

    await noteDictation('en', 'I saw the cat.', parts)

    expect(db.getEarLog).toHaveBeenCalledTimes(1)
    expect(db.saveEarLog).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(db.saveEarLog).mock.calls[0][0]
    expect(saved).toBeDefined()
    expect(saved.en?.saw).toBeDefined()
    expect(saved.en?.saw.n).toBe(1)
  })

  it('queues multiple writes sequentially without race conditions', async () => {
    const initialLog: EarLog = {}
    vi.mocked(db.getEarLog).mockResolvedValue(initialLog)
    vi.mocked(db.saveEarLog).mockResolvedValue('earMisses')

    const parts: DiffPart[] = [{ word: 'bonjour', status: 'ok' }]

    const p1 = noteDictation('fr', 'Bonjour', parts)
    const p2 = noteDictation('fr', 'Bonjour', parts)

    await Promise.all([p1, p2])

    expect(db.getEarLog).toHaveBeenCalledTimes(2)
    expect(db.saveEarLog).toHaveBeenCalledTimes(2)
  })
})
