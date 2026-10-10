import { useMemo, useState } from 'react'
import { AiError, sessionNote } from '../ai'
import type { SessionSummary } from '../engine/session'
import { sessionDigest } from '../engine/sessionNote'
import type { VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { BulbIcon } from './icons'
import { ERROR_NAME } from './labels'

/**
 * One concrete remark on this session's mistakes, asked for with a tap (with an AI key, and only
 * when there were enough mistakes to have a pattern): nothing is sent or paid for unasked.
 */
export function SessionNote({ summary, byId }: { summary: SessionSummary; byId: Map<string, VocabularyEntry> }) {
  const { apiKey } = useAi()
  const digest = useMemo(() => sessionDigest(summary, byId, (t) => ERROR_NAME[t as keyof typeof ERROR_NAME] ?? t), [summary, byId])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!apiKey || !digest) return null

  const ask = async () => {
    setBusy(true)
    setError('')
    try {
      setNote(await sessionNote(apiKey, digest))
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Yorum hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="coach-note">
      <span className="coach-note-icon" aria-hidden>
        <BulbIcon size={18} />
      </span>
      <div className="coach-note-body">
        <strong>Hataların için kısa yorum</strong>
        {note ? (
          <p className="small">{note}</p>
        ) : (
          <>
            <p className="small muted">Bu oturumdaki yanlışlardan ortak bir örüntü var mı, birlikte bakalım.</p>
            <button type="button" className="btn btn-sm btn-quiet" onClick={ask} disabled={busy}>
              {busy ? 'Hazırlanıyor…' : 'Yorum al'}
            </button>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
