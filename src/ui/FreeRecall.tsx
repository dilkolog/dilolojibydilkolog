import { useState } from 'react'
import { WordLabel } from './WordLabel'
import { freeRecall } from '../engine/freeRecall'
import type { VocabularyEntry } from '../engine/types'
import { BrainIcon, CheckIcon, SparkleIcon, SproutIcon } from './icons'

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
            <strong>Aklında kalanları yaz</strong>{' '}
            <span className="muted">Bakmadan, yarım dakika. Kendi başına hatırlamak kelimeyi kalıcılaştırır.</span>
          </span>
          <span className="habit-nudge-cta">Başla</span>
        </button>
      </div>
    )

  if (phase === 'writing') {
    const lang = entries[0]?.language
    const placeholder =
      lang === 'fr'
        ? 'Örn: maison, livre, soleil...'
        : lang === 'es'
        ? 'Örn: casa, libro, sol...'
        : 'Örn: house, book, sun...'
    const wordCount = text
      .split(/[\n,;\s]+/)
      .map((w) => w.trim())
      .filter(Boolean).length

    return (
      <section className="card stack gap-3 free-recall is-writing">
        <header className="free-recall-head">
          <div className="free-recall-title-row">
            <span className="free-recall-badge-icon" aria-hidden="true">
              <BrainIcon size={18} />
            </span>
            <label htmlFor="free-recall-text" className="free-recall-title">
              Bu oturumda çalıştığın kelimelerden hangileri aklında?
            </label>
            <span className="free-recall-pill" title="Bu oturumda çalışılan toplam kelime sayısı">
              {entries.length} kelime
            </span>
          </div>
          <p className="free-recall-hint small muted">
            Virgülle ya da alt alta yaz; artikel ve aksan önemli değil.
          </p>
        </header>

        <div className="free-recall-input-wrap">
          <textarea
            id="free-recall-text"
            className="textarea free-recall-textarea"
            rows={4}
            lang={lang}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim()) {
                e.preventDefault()
                set('done')
              }
            }}
            placeholder={placeholder}
            autoFocus
          />
          <div className="free-recall-meta">
            <span className="small muted">
              {wordCount > 0 ? `${wordCount} kelime yazıldı` : 'İpucu olmadan aklına gelenleri yaz'}
            </span>
            <span className="small muted free-recall-kbd" aria-hidden="true" title="Karşılaştırmak için kısayol">
              ⌘ / Ctrl + Enter
            </span>
          </div>
        </div>

        <div className="free-recall-actions row">
          <button
            type="button"
            className="btn free-recall-btn-submit"
            onClick={() => set('done')}
            disabled={!text.trim()}
          >
            Karşılaştır
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => set('idle')}
          >
            Vazgeç
          </button>
        </div>
      </section>
    )
  }

  const { recalled, missed } = freeRecall(entries, text)
  const allRecalled = recalled.length === entries.length && entries.length > 0

  return (
    <section className="card stack gap-3 free-recall is-done" aria-live="polite">
      <header className="free-recall-result-head">
        <span
          className={`free-recall-result-icon ${allRecalled ? 'is-perfect' : recalled.length > 0 ? 'is-good' : 'is-none'}`}
          aria-hidden="true"
        >
          {allRecalled ? <SparkleIcon size={20} /> : recalled.length > 0 ? <CheckIcon size={20} /> : <SproutIcon size={20} />}
        </span>
        <div className="free-recall-result-text">
          <strong className="free-recall-result-title">
            {entries.length} kelimeden {recalled.length} tanesini ipucu olmadan hatırladın.
          </strong>
          <p className="small muted free-recall-result-subtitle">
            {allRecalled
              ? 'Mükemmel! Oturumdaki tüm kelimeleri aklında tuttun.'
              : recalled.length > 0
              ? 'Kendi başına hatırlamak kalıcılığı en çok artıran yöntemdir.'
              : 'İlk turda gayet normal; tekrar ettikçe aklında kalıcılığı artacak.'}
          </p>
        </div>
      </header>

      {recalled.length > 0 && (
        <div className="stack gap-1">
          <span className="eyebrow">Hatırladıkların</span>
          <ul className="recall-chips" aria-label="Hatırladıkların">
            {recalled.map((e) => (
              <li key={e.id} className="is-recalled">
                <WordLabel entry={e} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {missed.length > 0 && (
        <div className="stack gap-1">
          <span className="eyebrow muted">Aklına gelmeyenler ({missed.length})</span>
          <ul className="recall-chips is-missed" aria-label="Aklına gelmeyenler">
            {missed.map((e) => (
              <li key={e.id}>
                <WordLabel entry={e} /> <span className="muted">{e.senses[0].gloss}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="free-recall-actions row">
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => set('writing')}>
          Düzenle / Ekle
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => set('idle')}>
          Tamam
        </button>
      </div>
    </section>
  )
}
