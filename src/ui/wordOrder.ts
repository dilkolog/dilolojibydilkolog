/**
 * The order of the word list as last shown (search, filters, sort), so the word page can step to
 * the previous and next word in that same order. Per tab, like the list itself.
 */
import { addedTime } from '../engine/types'

const KEY = 'kelime-koc:word-order'

export function saveWordOrder(ids: readonly string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Only a convenience: without it the word page falls back to the order words were added.
  }
}

function loadWordOrder(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** The word before and after `id`: in the saved list order when it holds the word, else by date added. */
export function neighbours<T extends { id: string; addedAt?: Date }>(id: string, vocabulary: readonly T[], saved: readonly string[] = loadWordOrder()) {
  const known = new Set(vocabulary.map((v) => v.id))
  let order = saved.filter((x) => known.has(x))
  if (!order.includes(id)) order = [...vocabulary].sort((a, b) => addedTime(b) - addedTime(a)).map((v) => v.id)
  const i = order.indexOf(id)
  return { prev: i > 0 ? order[i - 1] : undefined, next: i >= 0 && i < order.length - 1 ? order[i + 1] : undefined, index: i, total: order.length }
}
