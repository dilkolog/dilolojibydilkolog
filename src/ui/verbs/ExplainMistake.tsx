import { useState } from 'react'
import { AiError, explainConjugation } from '../../ai'
import { explainKey, explainRequest } from '../../engine/conjugationExplain'
import type { Tense } from '../../engine/tenses'
import { useAi } from '../aiContext'
import { SparkleIcon } from '../icons'
import type { LabLanguage } from './labShared'

type Explained = { explanation: string; tip: string }

/** Explanations already paid for in this visit: the same mistake again is shown, not asked again. */
const asked = new Map<string, Explained>()

/**
 * After a wrong conjugation, with an AI key: a tap asks for a teacher's explanation of what was
 * confused and how the right form is built. Nothing is sent unasked; slips the app already names
 * in full (an accent, a letter) offer no button.
 */
export function ExplainMistake({ language, verb, tense, person, typed }: { language: LabLanguage; verb: string; tense: Tense; person: number; typed: string }) {
  const { apiKey } = useAi()
  const req = explainRequest(language, verb, tense, person, typed)
  const key = req ? explainKey(req) : ''
  const [shown, setShown] = useState<Explained | undefined>(() => asked.get(key))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!apiKey || !req) return null
  const ask = async () => {
    setBusy(true)
    setError('')
    try {
      const out = await explainConjugation(apiKey, req)
      asked.set(key, out)
      setShown(out)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Açıklama hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }
  if (shown)
    return (
      <div className="small explain-mistake" role="status">
        <p>{shown.explanation}</p>
        {shown.tip && <p className="muted">{shown.tip}</p>}
      </div>
    )
  return (
    <div className="explain-mistake">
      <button type="button" className="ai-suggest" onClick={() => void ask()} disabled={busy}>
        <SparkleIcon size={14} className="icon-star" />
        {busy ? 'Açıklanıyor…' : 'YZ hatamı açıklasın'}
      </button>
      {error && (
        <p className="small muted" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
