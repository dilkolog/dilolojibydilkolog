import { useCallback, useEffect, useRef, useState } from 'react'
import { AiError, createMnemonic, mnemonicNote, type Mnemonic } from '../ai'
import { displayForm } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { useAi } from './aiContext'
import { BulbIcon, CloseIcon, SparkleIcon } from './icons'

/**
 * Memory-hook intervention for a word the learner keeps missing: the AI proposes a Turkish
 * sound-alike, a vivid scene and (if real) the etymology; without AI the learner writes their own.
 * Whatever is kept is appended to the word's note, which is shown at the next encounters.
 */
export function MnemonicDialog({
  entry,
  reason,
  onSaved,
  onClose,
}: {
  entry: VocabularyEntry
  /** Why it opened, e.g. "3 kez üst üste yanlış". */
  reason?: string
  onSaved: (updated: VocabularyEntry) => void
  onClose: () => void
}) {
  const { apiKey } = useAi()
  const [m, setM] = useState<Mnemonic | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [own, setOwn] = useState('')
  const started = useRef(false)

  const generate = useCallback(async () => {
    if (!apiKey) return
    setBusy(true)
    setError('')
    try {
      setM(await createMnemonic(apiKey, entry))
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'İpucu üretilemedi.')
    } finally {
      setBusy(false)
    }
  }, [apiKey, entry])

  useEffect(() => {
    if (!started.current) {
      started.current = true
      void generate()
    }
  }, [generate])

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

  const save = async (text: string) => {
    const notes = [entry.notes, text.trim()].filter(Boolean).join('\n')
    const updated = { ...entry, notes }
    await db.vocabulary.put(updated)
    onSaved(updated)
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="mn-title">
        <div className="dialog-head">
          <span className="dialog-badge" aria-hidden>
            <BulbIcon size={20} />
          </span>
          <div className="grow">
            <p className="small muted">{reason ?? 'Hafıza ipucu'}</p>
            <h2 id="mn-title" className="section-title">
              <span className="target">{displayForm(entry)}</span> = {entry.senses[0].gloss}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </div>

        {apiKey ? (
          <>
            {busy && <p className="muted">İpucu hazırlanıyor…</p>}
            {m && !busy && (
              <div className="stack">
                <div className="mnemonic-part">
                  <strong>Ses benzerliği</strong>
                  <p>{m.soundAlike}</p>
                </div>
                <div className="mnemonic-part">
                  <strong>Zihninde canlandır</strong>
                  <p>{m.scene}</p>
                </div>
                {m.etymology && (
                  <div className="mnemonic-part">
                    <strong>Köken</strong>
                    <p>{m.etymology}</p>
                  </div>
                )}
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button className="btn btn-quiet" onClick={onClose}>
                Kapat
              </button>
              <button className="btn btn-quiet" onClick={generate} disabled={busy}>
                <SparkleIcon size={16} className="icon-star" /> Başka öner
              </button>
              <button className="btn" onClick={() => m && save(mnemonicNote(m))} disabled={!m || busy}>
                Nota kaydet
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted small">
              Kelimeyi Türkçe bir sese ya da komik bir sahneye bağla. Ne kadar tuhafsa o kadar akılda kalır.
              (YZ açıksa bunu senin yerine önerir.)
            </p>
            <textarea
              className="textarea mnemonic-textarea"
              autoFocus
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder="Örn. abandon → 'a, bandı on'dan bıraktı' – grup sahneyi terk ediyor"
            />
            <div className="dialog-actions">
              <button className="btn btn-quiet" onClick={onClose}>
                Kapat
              </button>
              <button className="btn" onClick={() => save(own)} disabled={!own.trim()}>
                Nota kaydet
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
