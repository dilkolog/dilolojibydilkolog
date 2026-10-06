import { useState } from 'react'
import { WordLabel } from './WordLabel'
import { freeRecall } from '../engine/freeRecall'
import type { VocabularyEntry } from '../engine/types'
import { BrainIcon } from './icons'

/** Below this many words there is too little to recall for the step to be worth it. */
export const FREE_RECALL_MIN = 4

/**
 * After a session, optionally: write the words you remember without looking, then compare.
 * While writing, the summary hides its word lists (onWriting), or it would give them away.
 */
export function FreeRecall({ entries, onWriting }: { entries: VocabularyEntry[]; onWriting: (writing: boolean) => void }) {
  const [phase, setPhase] = useState<'idle' | 'writing' | 'done'>('idle')
  const [text, setText] = useState('')
  const set = (p: typeof phase) => {
    setPhase(p)
    onWriting(p === 'writing')
  }
  if (phase === 'idle')
    return (
      <div className="habit-nudge free-recall-offer">
        <button type="button" className="habit-nudge-main" onClick={() => set('writing')}>
          <BrainIcon size={18} />
          <span>
            <strong>Aklında kalanları yaz</strong> <span className="muted">Bakmadan, yarım dakika. Kendi başına hatırlamak kelimeyi kalıcılaştırır.</span>
          </span>
          <span className="habit-nudge-cta">Başla</span>
        </button>
      </div>
    )
  if (phase === 'writing') {
    const lang = entries[0]?.language
    return (
      <section className="card stack gap-2 free-recall">
        <label htmlFor="free-recall-text">
          <strong>Bu oturumda çalıştığın kelimelerden hangileri aklında?</strong>
        </label>
        <span className="small muted">Virgülle ya da alt alta yaz; artikel ve aksan önemli değil.</span>
        <textarea id="free-recall-text" className="textarea" rows={4} lang={lang} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div className="row">
          <button className="btn" onClick={() => set('done')} disabled={!text.trim()}>
            Karşılaştır
          </button>
          <button className="link small" onClick={() => set('idle')}>
            Vazgeç
          </button>
        </div>
      </section>
    )
  }
  const { recalled, missed } = freeRecall(entries, text)
  return (
    <section className="card stack gap-2 free-recall" aria-live="polite">
      <strong>
        {entries.length} kelimeden {recalled.length} tanesini ipucu olmadan hatırladın.
      </strong>
      {recalled.length > 0 && (
        <ul className="recall-chips" aria-label="Hatırladıkların">
          {recalled.map((e) => (
            <li key={e.id} className="is-recalled">
              <WordLabel entry={e} />
            </li>
          ))}
        </ul>
      )}
      {missed.length > 0 && (
        <>
          <span className="small muted">Aklına gelmeyenler; bir kez daha bak:</span>
          <ul className="recall-chips" aria-label="Aklına gelmeyenler">
            {missed.map((e) => (
              <li key={e.id}>
                <WordLabel entry={e} /> <span className="muted">{e.senses[0].gloss}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
