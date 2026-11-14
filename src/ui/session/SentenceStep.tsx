import { useState } from 'react'
import type { SessionSummary } from '../../engine/session'
import type { VocabularyEntry } from '../../engine/types'
import { WordInputError } from '../../data/wordInput'
import { PenIcon } from '../shared/icons'
import { WordLabel } from '../words/WordLabel'

/**
 * The word the summary asks a sentence with: a word met for the first time in this session, else one that grew or was
 * studied, and not one that already has the learner's own sentence. Undefined when no word fits (a verb-form round,
 * every word already written).
 */
export function sentenceWord(summary: Pick<SessionSummary, 'introduced' | 'strengthened' | 'words'>, byId: ReadonlyMap<string, VocabularyEntry>): VocabularyEntry | undefined {
  const ids = [...summary.introduced, ...summary.strengthened, ...summary.words.map((w) => w.entryId)]
  for (const id of ids) {
    const e = byId.get(id)
    if (e && !e.senses[0]?.examples.some((x) => x.personal)) return e
  }
  return undefined
}

/**
 * The end of a daily round: one sentence of the learner's own with a word of the round. Producing a word is harder
 * than recognising it, and a self-made sentence about one's own life is remembered far better than a given one; the
 * sentence becomes an example later exercises use. Shown, not required: "Geç" puts it away.
 */
export function SentenceStep({ entry, onSave }: { entry: VocabularyEntry; onSave: (entryId: string, text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<'open' | 'saved' | 'skipped'>('open')
  const [busy, setBusy] = useState(false)
  if (state === 'skipped') return null
  if (state === 'saved')
    return (
      <p className="note sentence-step-done" role="status">
        <PenIcon size={16} className="inline-icon" />
        Cümlen kaydedildi: <strong>{entry.lemma}</strong> alıştırmalarda senin cümlenle karşına çıkacak.
      </p>
    )
  return (
    <section className="card stack sentence-step" aria-labelledby="sentence-step-title">
      <h2 className="section-title" id="sentence-step-title">
        <PenIcon size={18} className="inline-icon" />
        Bir cümle yaz
      </h2>
      <p className="small">
        <WordLabel entry={entry} /> <span className="muted">({entry.senses[0]?.gloss})</span> ile kendi hayatından bir cümle. Kelimeyi kullanmak, tanımaktan çok daha kalıcı öğretir.
      </p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!text.trim() || busy) return
          setError('')
          setBusy(true)
          try {
            await onSave(entry.id, text)
            setState('saved')
          } catch (err) {
            setError(err instanceof WordInputError ? err.message : 'Kaydedilemedi.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <input
          className="input"
          lang={entry.language}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${entry.lemma} ile, kendinle ilgili bir cümle…`}
          autoCorrect="off"
          enterKeyHint="done"
          maxLength={300}
          aria-label={`${entry.lemma} ile kendi cümlen`}
        />
        <div className="row">
          <button className="btn" type="submit" disabled={!text.trim() || busy}>
            Kaydet
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => setState('skipped')}>
            Geç
          </button>
        </div>
        {error && <p className="error small">{error}</p>}
      </form>
    </section>
  )
}
