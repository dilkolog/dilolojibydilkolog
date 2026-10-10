import { useCallback, useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import type { TargetLanguage, VocabularyEntry, WordList } from '../engine/types'
import { parsePlacement } from './listOptions'

/** The value of "a new list" among the list choices. */
export const NEW_LIST = '__new'

export interface ImportList {
  lists: WordList[]
  value: string
  setValue: (v: string) => void
  name: string
  setName: (n: string) => void
  /**
   * Puts the entries in the chosen list (and level), creating the new list first if that was chosen
   * (named `name`, else `fallbackName`). Returns the entries ready to save; without a choice, unchanged.
   */
  place: (entries: VocabularyEntry[], fallbackName?: string) => Promise<VocabularyEntry[]>
}

/** The list the words of an import go to: none, an existing list or level, or a new list. */
export function useImportList(db: KelimeDB, language: TargetLanguage): ImportList {
  const [lists, setLists] = useState<WordList[]>([])
  const [value, setValue] = useState('__none')
  const [name, setName] = useState('')
  useEffect(() => {
    let live = true
    void db.getLists(language).then((all) => live && setLists(all))
    return () => {
      live = false
    }
  }, [db, language])

  const place = useCallback(
    async (entries: VocabularyEntry[], fallbackName = '') => {
      let at = parsePlacement(value === NEW_LIST ? '' : value)
      if (value === NEW_LIST) {
        const title = (name.trim() || fallbackName.trim()).slice(0, 60)
        if (title) {
          const now = new Date().toISOString()
          const list: WordList = { id: crypto.randomUUID(), language, name: title, createdAt: now, updatedAt: now }
          await db.saveList(list)
          setLists((all) => [...all, list])
          setValue(list.id)
          setName('')
          at = { listId: list.id, levelId: null }
        }
      }
      if (!at.listId) return entries
      return entries.map((e) => ({ ...e, listId: at.listId!, ...(at.levelId ? { levelId: at.levelId } : {}) }))
    },
    [db, language, value, name],
  )
  return { lists, value, setValue, name, setName, place }
}
