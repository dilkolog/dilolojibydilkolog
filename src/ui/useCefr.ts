import { useEffect, useState } from 'react'
import { loadCefr } from '../data/cefr'
import type { CefrList } from '../engine/cefrLevels'
import type { TargetLanguage } from '../engine/types'

/** The language's CEFR word levels once loaded; null while loading or when there are none. */
export function useCefr(language: TargetLanguage): CefrList | null {
  const [list, setList] = useState<{ language: TargetLanguage; list: CefrList | null } | null>(null)
  useEffect(() => {
    let live = true
    void loadCefr(language).then((l) => live && setList({ language, list: l }))
    return () => {
      live = false
    }
  }, [language])
  return list?.language === language ? list.list : null
}
