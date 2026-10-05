import type { VocabularyEntry, WordList } from '../engine/types'

/** One choice per list and per level in it ("Seyahat › Havalimanı"), then "no list". */
export function placementOptions(lists: readonly WordList[], none = 'Listesiz') {
  return [
    ...lists.flatMap((l) => [{ value: l.id, label: l.name }, ...(l.levels ?? []).map((lv) => ({ value: `${l.id}|${lv.id}`, label: `${l.name} › ${lv.name}` }))]),
    { value: '__none', label: none },
  ]
}

export const placementValue = (e: Pick<VocabularyEntry, 'listId' | 'levelId'>, lists: readonly WordList[]): string => {
  const list = lists.find((l) => l.id === e.listId)
  if (!list) return '__none'
  return e.levelId && list.levels?.some((lv) => lv.id === e.levelId) ? `${list.id}|${e.levelId}` : list.id
}

export const parsePlacement = (v: string): { listId: string | null; levelId: string | null } => {
  if (v === '__none' || !v) return { listId: null, levelId: null }
  const [listId, levelId] = v.split('|')
  return { listId, levelId: levelId ?? null }
}
