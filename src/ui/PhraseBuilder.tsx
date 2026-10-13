import { useState } from 'react'
import { phraseAround, wordIndex } from '../engine/phrase'
import type { TargetLanguage } from '../engine/types'

/**
 * "Add as a phrase": the tapped word widened to the words around it, one at a time, then put on the
 * list as one card with the sentence as its example. Closed until asked for.
 */
export function PhraseBuilder({ sentence, word, language, onAdd }: { sentence: string; word: string; language: TargetLanguage; onAdd: (phrase: string, sentence: string) => void }) {
  const [open, setOpen] = useState(false)
  const [before, setBefore] = useState(0)
  const [after, setAfter] = useState(0)
  const index = wordIndex(sentence, word, language)
  const window = index >= 0 ? phraseAround(sentence, index, before, after) : null
  if (!window) return null
  if (!open) {
    return (
      <button type="button" className="link small" onClick={() => setOpen(true)}>
        Kalıp olarak ekle…
      </button>
    )
  }
  return (
    <div className="stack phrase-builder">
      <p className="small muted">Yanındaki sözcükleri ekleyerek kalıbı kur, sonra bir kart olarak ekle.</p>
      <p className="phrase-text" lang={language} aria-live="polite">
        {window.text}
      </p>
      <div className="row">
        <button type="button" className="btn btn-sm btn-quiet" disabled={window.left === 0} onClick={() => setBefore(before + 1)}>
          ‹ Önceki sözcük
        </button>
        <button type="button" className="btn btn-sm btn-quiet" disabled={window.right === 0} onClick={() => setAfter(after + 1)}>
          Sonraki sözcük ›
        </button>
      </div>
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => onAdd(window.text, sentence)}>
          Kalıbı kelimelerime ekle
        </button>
        <button type="button" className="link small" onClick={() => setOpen(false)}>
          Vazgeç
        </button>
      </div>
    </div>
  )
}
