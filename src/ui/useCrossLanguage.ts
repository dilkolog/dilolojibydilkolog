import { useEffect, useState } from 'react'
import { crossLanguageLinks, type CrossLink } from '../engine/crossLanguage'
import { TARGET_LANGUAGES, type VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { findEquivalents, type Equivalents } from '../data/wiktionary'
import { equivalentsFromPack } from '../data/wordpack'

/** The same concept in the learner's other languages, read from their own word list. */
export function useCrossLinks(entry: VocabularyEntry): CrossLink[] {
  const [links, setLinks] = useState<CrossLink[]>([])
  useEffect(() => {
    let live = true
    const others = TARGET_LANGUAGES.filter((l) => l !== entry.language)
    db.vocabulary
      .where('language')
      .anyOf(others)
      .toArray()
      .then((all) => live && setLinks(crossLanguageLinks(entry, all)))
    return () => {
      live = false
    }
  }, [entry])
  return links
}

const EQUIV_KEY = (e: VocabularyEntry) => `kelime-koc:equiv:${e.language}:${e.lemma}`

/** The word in all three languages: from the word pack, else Wiktionary (cached on the device). */
export function useEquivalents(entry: VocabularyEntry): Equivalents | null | 'loading' {
  const [value, setValue] = useState<Equivalents | null | 'loading'>('loading')
  useEffect(() => {
    let live = true
    // The word pack already knows them: no network, no waiting.
    const packed = equivalentsFromPack(entry)
    if (packed) {
      setValue(packed)
      return
    }
    try {
      const cached = localStorage.getItem(EQUIV_KEY(entry))
      if (cached) {
        setValue(JSON.parse(cached) as Equivalents)
        return
      }
    } catch {
      // No storage: just ask again.
    }
    setValue('loading')
    void findEquivalents(entry.lemma, entry.language).then((r) => {
      if (!live) return
      setValue(r)
      try {
        if (r) localStorage.setItem(EQUIV_KEY(entry), JSON.stringify(r))
      } catch {
        // Not cached; fine.
      }
    })
    return () => {
      live = false
    }
  }, [entry])
  return value
}
