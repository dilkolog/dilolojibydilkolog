import { useEffect, useState } from 'react'
import { loadTenses } from '../data/tenseData'
import { tensesLoaded, type Tense } from '../engine/tenses'
import type { VocabularyEntry } from '../engine/types'

/** Re-renders once the language's tense table has arrived (it is fetched on first need). */
export function useTenses(language: VocabularyEntry['language']): boolean {
  const [ready, setReady] = useState(() => language === 'en' || tensesLoaded(language))
  useEffect(() => {
    let live = true
    if (language !== 'en') void loadTenses(language).then(() => live && setReady(tensesLoaded(language)))
    return () => {
      live = false
    }
  }, [language])
  return ready
}

/** Tenses in four groups, so the choice fits a phone: the group first, then the tense within it. */
export const TENSE_GROUPS: { label: string; tenses: Tense[] }[] = [
  { label: 'Şimdi', tenses: ['present', 'presente'] },
  { label: 'Geçmiş', tenses: ['passe-compose', 'imparfait', 'preterito', 'perfecto', 'imperfecto'] },
  { label: 'Gelecek', tenses: ['futur', 'futuro'] },
  { label: 'Kipler', tenses: ['conditionnel', 'subjonctif', 'condicional', 'subjuntivo'] },
]
