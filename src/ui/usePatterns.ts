import { useEffect, useState } from 'react'
import { fetchSentences, isInflection } from '../data/corpus'
import { minePatterns, type Pattern } from '../engine/patterns'
import type { VocabularyEntry } from '../engine/types'

/** Mined once per word and kept on the device for a month. */
const KEY = (e: Pick<VocabularyEntry, 'language' | 'lemma'>) => `kelime-koc:patterns:${e.language}:${e.lemma}`
const MAX_AGE = 30 * 86_400_000

/** The word's patterns (pass a stable object: it is the effect's dependency); also for a word not in the list. */
export function usePatterns(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): Pattern[] | null | 'loading' {
  const [value, setValue] = useState<Pattern[] | null | 'loading'>('loading')
  useEffect(() => {
    let live = true
    try {
      const cached = JSON.parse(localStorage.getItem(KEY(entry)) ?? 'null') as { at: number; patterns: Pattern[] } | null
      if (cached && Date.now() - cached.at < MAX_AGE) {
        setValue(cached.patterns)
        return
      }
    } catch {
      // Unreadable cache: mine again.
    }
    setValue('loading')
    fetchSentences(entry)
      .then((sentences) => {
        const patterns = minePatterns(sentences, entry.language, (t) => isInflection(t, entry.lemma, entry.language))
        if (!live) return
        setValue(patterns)
        try {
          localStorage.setItem(KEY(entry), JSON.stringify({ at: Date.now(), patterns }))
        } catch {
          // Not cached; fine.
        }
      })
      .catch(() => live && setValue(null))
    return () => {
      live = false
    }
  }, [entry])
  return value
}
