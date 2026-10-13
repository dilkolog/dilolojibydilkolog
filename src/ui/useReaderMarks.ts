import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { cleanToken } from '../engine/extract'
import type { KelimeDB } from '../data/db'
import type { TargetLanguage } from '../engine/types'
import { analyzeForm } from '../engine/tenses'
import type { Selected } from './WordCard'

/**
 * Deciding about the words of a text: known, left open (skipped), ignored, or put back; after each
 * decision the next open word is shown, as in LingQ. While a word card is open the keys work too:
 * B biliyorum, E ekle, Y yok say, G geç, ←/→ previous/next word, Esc closes.
 */
export function useReaderMarks({
  db,
  language,
  openTokens,
  skipped,
  ignored,
  selected,
  adding,
  setKnown,
  setIgnored,
  setSkipped,
  setSelected,
  setAdding,
}: {
  db: KelimeDB
  language: TargetLanguage
  openTokens: Selected[]
  skipped: Set<string>
  ignored: Set<string>
  selected: Selected | null
  adding: { word: string; sentence: string } | null
  setKnown: Dispatch<SetStateAction<Set<string>>>
  setIgnored: Dispatch<SetStateAction<Set<string>>>
  setSkipped: Dispatch<SetStateAction<Set<string>>>
  setSelected: (s: Selected | null) => void
  setAdding: (a: { word: string; sentence: string } | null) => void
}) {
  /** After deciding about a word, move on to the next open one. */
  const advance = (fromKey: string, step = 1) => {
    const keys = openTokens.map((x) => x.token.key)
    const i = keys.indexOf(fromKey)
    const pool = openTokens.filter((x) => x.token.key !== fromKey && !skipped.has(x.token.key!))
    if (!pool.length) return setSelected(null)
    const next = step > 0 ? (openTokens.slice(i + 1).find((x) => pool.includes(x)) ?? pool[0]) : ([...openTokens.slice(0, Math.max(0, i))].reverse().find((x) => pool.includes(x)) ?? pool.at(-1)!)
    setSelected(next)
    document.querySelector(`[data-key="${CSS.escape(next.token.key!)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const markKnown = async (key: string) => {
    await db.addKnownWords(language, [key])
    setKnown((k) => new Set(k).add(key))
    advance(key)
  }

  const toggleIgnored = async (key: string, on: boolean) => {
    await db.setIgnored(language, key, on)
    setIgnored((s) => {
      const next = new Set(s)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
    if (on) advance(key)
    else setSelected(null)
  }

  const skip = (key: string) => {
    setSkipped((s) => new Set(s).add(key))
    advance(key)
  }

  const markUnknown = async (key: string) => {
    await db.removeKnownWord(language, key)
    setKnown((k) => {
      const next = new Set(k)
      next.delete(key)
      return next
    })
    setSkipped((s) => new Set(s).add(key))
    setSelected(null)
  }

  useEffect(() => {
    if (!selected?.token.key || adding) return
    const key = selected.token.key
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return
      const listed = !!selected.token.entryId
      const k = e.key.toLocaleLowerCase('tr')
      if (k === 'escape') setSelected(null)
      else if (k === 'arrowright') advance(key)
      else if (k === 'arrowleft') advance(key, -1)
      else if (listed) return
      else if (k === 'b' && selected.token.status !== 'known') void markKnown(key)
      else if (k === 'e') {
        // A conjugated verb goes on the list as its infinitive.
        const w = cleanToken(selected.token.text, language)
        setAdding({ word: analyzeForm(language, w)[0]?.lemma ?? w.toLocaleLowerCase(language), sentence: selected.sentence })
      } else if (k === 'y') void toggleIgnored(key, !ignored.has(key))
      else if (k === 'g' && selected.token.status === 'unseen') skip(key)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return { advance, markKnown, toggleIgnored, skip, markUnknown }
}
