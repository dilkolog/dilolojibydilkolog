import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { undoable } from './toastFeed'
import { changeWordsWithUndo, deleteWordsWithUndo } from './undo'

vi.mock('../data/instance', () => ({
  db: {
    snapshotWords: vi.fn(),
    deleteWords: vi.fn(),
    restoreWords: vi.fn(),
  },
}))

vi.mock('./toastFeed', () => ({
  undoable: vi.fn(),
}))

describe('undo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('changeWordsWithUndo snapshots, executes change, calls onChanged and registers undoable action', async () => {
    const mockSnap = [{ id: 'word-1', lemma: 'test' }]
    vi.mocked(db.snapshotWords).mockResolvedValue(mockSnap as never)
    vi.mocked(db.restoreWords).mockResolvedValue()

    const changeFn = vi.fn().mockResolvedValue('ok')
    const onChanged = vi.fn()

    await changeWordsWithUndo(['word-1'], 'Kelime silindi', changeFn, onChanged)

    expect(db.snapshotWords).toHaveBeenCalledWith(['word-1'])
    expect(changeFn).toHaveBeenCalledTimes(1)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(undoable).toHaveBeenCalledWith('Kelime silindi', expect.any(Function))

    // Test the registered undo callback
    const undoCallback = vi.mocked(undoable).mock.calls[0][1]
    await undoCallback()

    expect(db.restoreWords).toHaveBeenCalledWith(mockSnap)
    expect(onChanged).toHaveBeenCalledTimes(2)
  })

  it('deleteWordsWithUndo executes db.deleteWords with ids', async () => {
    vi.mocked(db.snapshotWords).mockResolvedValue([] as never)
    vi.mocked(db.deleteWords).mockResolvedValue()
    const onChanged = vi.fn()

    await deleteWordsWithUndo(['word-1', 'word-2'], '2 kelime silindi', onChanged)

    expect(db.snapshotWords).toHaveBeenCalledWith(['word-1', 'word-2'])
    expect(db.deleteWords).toHaveBeenCalledWith(['word-1', 'word-2'])
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(undoable).toHaveBeenCalledWith('2 kelime silindi', expect.any(Function))
  })
})
