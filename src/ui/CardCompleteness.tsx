import { useState } from 'react'
import { AiError, suggestFields } from '../ai'
import type { KelimeDB } from '../data/db'
import { addExample } from '../data/wordInput'
import { aiFillable, cardCompleteness, CARD_PARTS, type CardPart } from '../engine/completeness'
import type { VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'
import { showToast } from './toastFeed'
import { changeWordsWithUndo } from './undo'

/** Where each missing part is added on the word page (an element id; the note is a field to type in). */
const TARGET: Record<CardPart, string> = { image: 'word-media', audio: 'word-media', example: 'word-examples', note: 'w-notes' }

/** A thin bar for how full the card is, a chip for each thing still missing (it scrolls to where it is added), and the AI to fill what it can. */
export function CardCompleteness({ entry, db, onChanged }: { entry: VocabularyEntry; db?: KelimeDB; onChanged?: () => void }) {
  const { percent, missing } = cardCompleteness(entry)
  const { apiKey } = useAi()
  const [busy, setBusy] = useState(false)
  const fields = aiFillable(entry)
  const go = (part: CardPart) => {
    const el = document.getElementById(TARGET[part])
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) el.focus({ preventScroll: true })
  }
  const fill = async () => {
    if (!apiKey || !db || !onChanged || !fields.length) return
    setBusy(true)
    try {
      const out = await suggestFields(apiKey, {
        language: entry.language,
        word: entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma,
        meaning: entry.senses[0].gloss,
        fields,
        existingTags: [],
      })
      // The word as it is now (the page may have changed it meanwhile), with only the empty parts filled.
      let next = (await db.vocabulary.get(entry.id)) ?? entry
      const filled: string[] = []
      if (fields.includes('example') && out.example?.trim() && !next.senses[0].examples.length) {
        try {
          next = addExample(next, out.example, out.exampleTranslation ?? '')
          filled.push('örnek cümle')
        } catch {
          // A sentence without the word: left out.
        }
      }
      if (fields.includes('notes') && out.note?.trim() && !next.notes?.trim()) {
        next = { ...next, notes: out.note.trim() }
        filled.push('hafıza ipucu')
      }
      if (fields.includes('collocations') && out.collocations?.length && !next.collocations.length) {
        next = { ...next, collocations: out.collocations.map((c) => ({ phrase: c.phrase, translation: c.translation, wrongVariants: c.wrongVariants.length ? c.wrongVariants : undefined })) }
        filled.push('kalıplar')
      }
      if (!filled.length) {
        showToast('YZ bu kelime için uygun bir şey bulamadı.', undefined, 4000, 'info')
        return
      }
      const done = next
      await changeWordsWithUndo([entry.id], `YZ ekledi: ${filled.join(', ')}.`, () => db.vocabulary.put(done), onChanged)
    } catch (e) {
      showToast(e instanceof AiError ? e.message : 'YZ şu an dolduramadı.', undefined, 5000, 'info')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card-fill">
      <div className="card-fill-head">
        <span className="small">Kart doluluğu</span>
        <strong className="small">%{percent}</strong>
      </div>
      <div className="card-fill-track" role="progressbar" aria-label="Kart doluluğu" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {missing.length > 0 && (
        <ul className="card-fill-chips">
          {apiKey && db && onChanged && fields.length > 0 && (
            <li>
              <button type="button" className="ai-suggest" onClick={() => void fill()} disabled={busy} title="Eksik örnek cümle, hafıza ipucu ve kalıpları YZ yazsın">
                <SparkleIcon size={14} className="icon-star" />
                {busy ? 'Dolduruluyor…' : 'YZ ile doldur'}
              </button>
            </li>
          )}
          {CARD_PARTS.filter(({ part }) => missing.includes(part)).map(({ part, add }) => (
            <li key={part}>
              <button type="button" className="chip chip-sm" onClick={() => go(part)}>
                {add}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
