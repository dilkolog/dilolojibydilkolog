import { useEffect, useRef, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { fetchImage } from '../data/imageSearch'
import { imageCandidates, skipImage, skippedImages, suggestImages, type ImageSuggestion } from '../data/imageQueue'
import { withSources } from '../data/provenance'
import { displayForm } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'
import { CloseIcon, ImageIcon } from './icons'
import { shrinkImage } from './imageTools'

/**
 * Pictures for the words that have none, one word at a time: a few suggestions to tap, or "Atla".
 * Picking saves the picture (shrunk, with its credit and where it came from) and moves on.
 */
export function ImageQueue({ db, vocabulary, onClose, onChanged }: { db: KelimeDB; vocabulary: readonly VocabularyEntry[]; onClose: () => void; onChanged: () => void }) {
  // The words in the order they were when this opened, so the list doesn't shift under a tap.
  const [queue] = useState(() => imageCandidates(vocabulary, skippedImages()))
  const [index, setIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<ImageSuggestion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(0)
  const current = queue[index] as VocabularyEntry | undefined
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!current) return
    let live = true
    setSuggestions(null)
    setError('')
    void suggestImages(current).then((s) => live && setSuggestions(s))
    return () => {
      live = false
    }
  }, [current])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const next = () => setIndex((i) => i + 1)

  const pick = async (s: ImageSuggestion) => {
    if (!current) return
    setBusy(true)
    setError('')
    try {
      const imageId = await db.addMedia('image', await shrinkImage(await fetchImage(s.thumbUrl)))
      const fresh = (await db.vocabulary.get(current.id)) ?? current
      await db.vocabulary.put(withSources({ ...fresh, imageId, imageCredit: s.credit }, { image: s.from === 'wikidata' ? 'wikidata' : 'commons' }))
      setAdded((n) => n + 1)
      onChanged()
      next()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görsel alınamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide image-queue" role="dialog" aria-modal="true" aria-labelledby="iq-title">
        <div className="dialog-head">
          <h2 id="iq-title" className="section-title grow">
            Görsel öner
          </h2>
          <span className="small muted">{current ? `${index + 1} / ${queue.length}` : ''}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </div>
        {!current ? (
          <div className="stack">
            <p>{added ? `Bitti: ${added} kelimeye görsel eklendi.` : 'Görsel önerilecek kelime kalmadı.'}</p>
            <button className="btn" onClick={onClose}>
              Kapat
            </button>
          </div>
        ) : (
          <div className="stack">
            <p className="iq-word">
              <strong lang={current.language}>{displayForm(current)}</strong> <span className="muted">{current.senses[0].gloss}</span>
            </p>
            {suggestions === null && <p className="small muted">Görseller aranıyor…</p>}
            {suggestions?.length === 0 && <p className="small muted">Bu kelime için görsel bulunamadı.</p>}
            {suggestions && suggestions.length > 0 && (
              <ul className="iq-grid">
                {suggestions.map((s) => (
                  <li key={s.thumbUrl}>
                    <button type="button" className="iq-pick" disabled={busy} onClick={() => pick(s)} title={s.credit}>
                      <img src={s.thumbUrl} alt={s.title} loading="lazy" />
                      {s.from === 'wikidata' && <span className="iq-badge small">Önerilen</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="error small">{error}</p>}
            <div className="row">
              <button
                className="btn btn-quiet"
                disabled={busy}
                onClick={() => {
                  skipImage(current.id)
                  next()
                }}
              >
                Atla
              </button>
              <span className="small muted grow">Bir görsele dokununca kelimeye eklenir. Atladığın kelime bir daha sorulmaz.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ImageQueueChip({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button type="button" className="chip chip-sm" onClick={onOpen} title="Görseli olmayan somut isimlere görsel öner">
      <ImageIcon size={14} className="inline-icon" />
      Görsel öner ({count})
    </button>
  )
}
