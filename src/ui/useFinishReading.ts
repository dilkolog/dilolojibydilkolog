import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { KelimeDB, ReadingText } from '../data/db'
import { finishReading, type analyzeText } from '../engine/reading'
import { addSeenForms } from '../engine/labProgress'
import { loadTenses } from '../data/tenseData'
import { textForms } from '../engine/textForms'
import type { TargetLanguage } from '../engine/types'
import { MIN_READ_MS, useSeen } from './readingHelpers'

type Analysis = ReturnType<typeof analyzeText>

/**
 * The end of a reading. Reaching the end of a text saves its meetings with list words on its own
 * (once per opened text, after at least MIN_READ_MS with it open: "Okumayı bitir", which also marks
 * the rest as known, was often never pressed and the reading then counted for nothing); finishing
 * marks the open words known, stamps the text as read, and doesn't count the meetings twice.
 */
export function useFinishReading({
  db,
  language,
  analysis,
  current,
  readKey,
  skipped,
  startCoverage,
  setKnown,
  setCurrent,
  setLibrary,
  setConfirmFinish,
  setMessage,
  onChanged,
}: {
  db: KelimeDB
  language: TargetLanguage
  analysis: Analysis | null
  current: ReadingText | null
  readKey: string
  skipped: Set<string>
  startCoverage: number | null
  setKnown: Dispatch<SetStateAction<Set<string>>>
  setCurrent: (t: ReadingText) => void
  setLibrary: Dispatch<SetStateAction<ReadingText[] | null>>
  setConfirmFinish: (on: boolean) => void
  setMessage: (m: string) => void
  onChanged: () => void
}) {
  /** The text (by id) whose meetings with list words are saved already. */
  const metSaved = useRef<string | null>(null)
  const [metNote, setMetNote] = useState('')
  /** When the text on screen was opened, and which it is: a glance at a short text is not a reading. */
  const opened = useRef<{ key: string | null; at: number }>({ key: null, at: 0 })

  /** The verb forms of the text, for the verb lab's "seen in texts" (the reading's real usage). */
  const keepSeenForms = async (lang: 'fr' | 'es') => {
    if (!analysis) return
    await loadTenses(lang)
    const found = textForms(lang, analysis)
    if (found.length) await db.saveLab(lang, addSeenForms(await db.getLab(lang), found, current?.title, new Date().toISOString()))
  }

  /** The list words met in this text, and the verb forms in it, saved once per opened text. */
  const saveMet = async () => {
    if (!analysis || !readKey || metSaved.current === readKey) return 0
    metSaved.current = readKey
    const { encounters, firstEncounters } = finishReading(analysis, skipped)
    await db.addEncounters(encounters)
    if (current?.title) {
      const now = new Date().toISOString()
      const add: Record<string, { title: string; sentence?: string; at: string }> = {}
      for (const [id, ctx] of Object.entries(firstEncounters)) {
        add[id] = { title: current.title, sentence: ctx.sentence, at: now }
      }
      await db.addFirstEncounters(add)
    }
    if (language !== 'en') await keepSeenForms(language)
    return Object.keys(encounters).length
  }

  if (readKey && opened.current.key !== readKey) opened.current = { key: readKey, at: Date.now() }
  const endSeen = useSeen(readKey, () => {
    const key = readKey
    // At the end, after at least MIN_READ_MS with the text open (and still the same text then).
    setTimeout(async () => {
      if (opened.current.key !== key) return
      const met = await saveMet()
      if (met) {
        setMetNote(`Kelimelerindeki ${met} kelimeyle karşılaşman kaydedildi.`)
        onChanged()
      }
    }, Math.max(0, opened.current.at + MIN_READ_MS - Date.now()))
  })

  const finish = async () => {
    if (!analysis) return
    const { knownKeys, encounters } = finishReading(analysis, skipped)
    await db.addKnownWords(language, knownKeys)
    await saveMet()
    setKnown(await db.getKnownWords(language))
    if (current) {
      const updated: ReadingText = {
        ...current,
        readAt: new Date().toISOString(),
        history: [...current.history, { at: new Date().toISOString(), coverage: startCoverage ?? analysis.coverage }],
      }
      await db.saveText(updated)
      setCurrent(updated)
      setLibrary((lib) => (lib ?? []).map((t) => (t.id === updated.id ? updated : t)))
    }
    setConfirmFinish(false)
    const met = Object.keys(encounters).length
    setMessage(`${knownKeys.length} kelime bilinen kelimelerine eklendi${met ? `, kelimelerindeki ${met} kelimeyle bir kez daha karşılaştın` : ''}.`)
    onChanged()
  }

  return { endSeen, metNote, finish }
}
