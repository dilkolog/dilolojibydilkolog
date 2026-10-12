import '../../lazy.css'
import { useEffect, useState } from 'react'
import { db } from '../../data/instance'
import { entryToInput, updateEntry, WordInputError } from '../../data/wordInput'
import type { VocabularyEntry } from '../../engine/types'
import { CloseIcon, PenIcon } from '../icons'

/**
 * Fixing a word without leaving the session: a typo in the meaning, a wrong article, an example
 * sentence. The word keeps its id, so its learning history stays; the change shows from the
 * next question. Everything else is edited on the word's page.
 */
export function QuickEditDialog({ entry, onSaved, onClose }: { entry: VocabularyEntry; onSaved: (updated: VocabularyEntry) => void; onClose: () => void }) {
  const initial = entryToInput(entry)
  const [word, setWord] = useState(initial.word)
  const [meaning, setMeaning] = useState(initial.meaning)
  const [example, setExample] = useState(initial.example ?? '')
  const [translation, setTranslation] = useState(initial.exampleTranslation ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const save = async () => {
    setError('')
    if (!word.trim() || !meaning.trim()) return setError('Kelime ve anlamı boş olamaz.')
    setBusy(true)
    try {
      const updated = updateEntry(entry, { ...initial, word, meaning, example, exampleTranslation: translation })
      await db.vocabulary.put(updated)
      onSaved(updated)
    } catch (e) {
      setError(e instanceof WordInputError ? e.message : 'Kaydedilemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="dialog quick-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qe-title"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <header className="ss-head">
          <span className="ss-head-icon" aria-hidden>
            <PenIcon size={18} />
          </span>
          <div className="grow">
            <h2 id="qe-title" className="ss-title">
              Kelimeyi düzelt
            </h2>
            <p className="small muted">Öğrenme geçmişi korunur; değişiklik sonraki sorudan itibaren görünür.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="ss-body">
          <label className="field">
            <span className="field-label">Kelime</span>
            <input className="input" value={word} onChange={(e) => setWord(e.target.value)} lang={entry.language} autoComplete="off" autoCapitalize="off" spellCheck={false} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Türkçe anlamı</span>
            <input className="input" value={meaning} onChange={(e) => setMeaning(e.target.value)} autoComplete="off" />
            <span className="help">Birden fazlaysa virgülle ayır</span>
          </label>
          <label className="field">
            <span className="field-label">Örnek cümle</span>
            <textarea className="textarea textarea-sm" value={example} onChange={(e) => setExample(e.target.value)} lang={entry.language} rows={2} />
          </label>
          <label className="field">
            <span className="field-label">Cümlenin Türkçesi</span>
            <input className="input" value={translation} onChange={(e) => setTranslation(e.target.value)} autoComplete="off" />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="ss-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </footer>
      </form>
    </div>
  )
}
