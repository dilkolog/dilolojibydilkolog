import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { KelimeDB } from '../data/db'
import type { TargetLanguage } from '../engine/types'
import { showToast } from './toastFeed'

/**
 * Several words of a text picked at once (⌘/Ctrl+click, or the multi-select mode) and marked in one
 * go as known, left open, or ignored. Esc clears the picks.
 */
export function useMultiSelect({
  db,
  language,
  setKnown,
  setSkipped,
  setIgnored,
}: {
  db: KelimeDB
  language: TargetLanguage
  setKnown: Dispatch<SetStateAction<Set<string>>>
  setSkipped: Dispatch<SetStateAction<Set<string>>>
  setIgnored: Dispatch<SetStateAction<Set<string>>>
}) {
  const [multi, setMulti] = useState<Set<string>>(new Set())
  const [multiMode, setMultiMode] = useState(false)
  const toggleMulti = (key: string) =>
    setMulti((m) => {
      const next = new Set(m)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const markMulti = async (how: 'known' | 'skip' | 'ignore') => {
    const keys = [...multi]
    if (how === 'known') {
      await db.addKnownWords(language, keys)
      setKnown((k) => new Set([...k, ...keys]))
    } else if (how === 'skip') setSkipped((s) => new Set([...s, ...keys]))
    else {
      for (const k of keys) await db.setIgnored(language, k, true)
      setIgnored((s) => new Set([...s, ...keys]))
    }
    showToast(`${keys.length} kelime işaretlendi`)
    setMulti(new Set())
  }
  useEffect(() => {
    if (!multi.size) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMulti(new Set())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [multi.size])
  return { multi, setMulti, multiMode, setMultiMode, toggleMulti, markMulti }
}
