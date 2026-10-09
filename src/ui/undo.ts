import { db } from '../data/instance'
import { undoable } from './toastFeed'

/**
 * Changes words (delete, merge, reset) after keeping a copy of everything about them, then offers
 * "Geri al" for a few seconds: one way of deleting across the app, without "are you sure?".
 */
export async function changeWordsWithUndo(ids: readonly string[], message: string, change: () => Promise<unknown>, onChanged: () => void) {
  const snap = await db.snapshotWords(ids)
  await change()
  onChanged()
  undoable(message, async () => {
    await db.restoreWords(snap)
    onChanged()
  })
}

export function deleteWordsWithUndo(ids: readonly string[], message: string, onChanged: () => void) {
  return changeWordsWithUndo(ids, message, () => db.deleteWords(ids), onChanged)
}
