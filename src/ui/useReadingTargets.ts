import { useEffect, useState } from 'react'

import type { KelimeDB } from '../data/db'
import { loadFrequency } from '../data/frequency'
import { type TargetLanguage } from '../engine/types'
import { defaultPlacement } from './listMemory'
import { parsePlacement } from './listOptions'

/** The name of the list (and level) a word added while reading goes to, for the add card ("Listesiz" when none). */
export function useTargetListName(db: KelimeDB, language: TargetLanguage): string {
  const [name, setName] = useState<string>('Listesiz')
  useEffect(() => {
    let live = true
    void Promise.all([db.getLists(language), db.getSettings()]).then(([allLists, s]) => {
      if (!live) return
      const placement = defaultPlacement(language, allLists, s?.focusList?.[language])
      if (!placement || placement === '__none') {
        setName('Listesiz')
        return
      }
      const { listId, levelId } = parsePlacement(placement)
      const list = allLists.find((l) => l.id === listId)
      if (!list) {
        setName('Listesiz')
        return
      }
      if (levelId) {
        const level = list.levels?.find((lv) => lv.id === levelId)
        if (level) {
          setName(`${list.name} › ${level.name}`)
          return
        }
      }
      setName(list.name)
    })
    return () => {
      live = false
    }
  }, [db, language])
  return name
}

/** Word frequency of the language, to put the likely verb first for a conjugated form (allions: aller before allier). */
export function useWordFrequency(language: TargetLanguage): ReadonlyMap<string, number> {
  const [freq, setFreq] = useState<ReadonlyMap<string, number>>(new Map())
  useEffect(() => {
    let live = true
    void loadFrequency(language).then((m) => live && setFreq(m))
    return () => {
      live = false
    }
  }, [language])
  return freq
}
