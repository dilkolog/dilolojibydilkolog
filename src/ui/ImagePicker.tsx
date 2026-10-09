import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { fetchImage, searchImages } from '../data/imageSearch'
import { suggestImages, type ImageSuggestion } from '../data/imageQueue'
import type { TargetLanguage } from '../engine/types'
import { imageFromClipboard, shrinkImage } from './imageTools'
import { CloseIcon } from './icons'

export interface PickedImage {
  blob: Blob
  credit?: string
  /** 'wikidata': the picture Wikidata keeps for the thing; otherwise a search result or the learner's own. */
  from?: 'wikidata' | 'search'
}

type Tab = 'search' | 'upload' | 'paste'

/**
 * Pick a picture for a word, Quizlet-style: search free images, upload a file, or paste one.
 * The picture is downscaled and stored locally so it works offline.
 */
export function ImagePicker({
  initialQuery,
  language,
  suggestions = [],
  onPick,
  onClose,
}: {
  initialQuery: string
  /** The word's language: with it, the picture Wikidata keeps for the thing comes first. */
  language?: TargetLanguage
  /** Other queries worth one click, e.g. the Turkish meaning for abstract words. */
  suggestions?: string[]
  onPick: (img: PickedImage) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<ImageSuggestion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const searched = useRef(false)

  const search = async (e?: FormEvent, q = query) => {
    e?.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    setError('')
    try {
      // With the word's language, Wikidata's own picture for the thing comes first; the word itself is looked up
      // in its language, the Turkish meaning chips in Turkish.
      const found = language ? await suggestImages({ language: q.trim() === initialQuery.trim() ? language : ('tr' as TargetLanguage), lemma: q.trim() }, 18) : (await searchImages(q.trim())).map((r) => ({ ...r, from: 'search' as const }))
      setResults(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama başarısız oldu.')
    } finally {
      setBusy(false)
    }
  }

  // Search once right away with the word itself.
  useEffect(() => {
    if (!searched.current && initialQuery.trim()) {
      searched.current = true
      void search()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = useCallback(
    async (blob: Blob, credit?: string, from?: PickedImage['from']) => {
      setBusy(true)
      onPick({ blob: await shrinkImage(blob), credit, from })
    },
    [onPick],
  )

  const chooseResult = async (r: ImageSuggestion) => {
    setBusy(true)
    setError('')
    try {
      await choose(await fetchImage(r.thumbUrl), r.credit, r.from)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görsel alınamadı.')
      setBusy(false)
    }
  }

  // Paste works from any tab.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const img = imageFromClipboard(e)
      if (img) {
        e.preventDefault()
        void choose(img)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onClose, choose])

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="img-title">
        <div className="dialog-head">
          <h2 id="img-title" className="section-title grow">
            Görsel ekle
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="segmented" role="tablist">
          {(
            [
              ['search', 'İnternette ara'],
              ['upload', 'Yükle'],
              ['paste', 'Yapıştır'],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} className="segmented-btn" onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'search' && (
          <div className="stack">
            <form className="row" onSubmit={search}>
              <input
                className="input grow"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ne arıyorsun?"
                aria-label="Görsel ara"
                autoFocus
              />
              <button className="btn" type="submit" disabled={busy || !query.trim()}>
                Ara
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="choice-row">
                {[initialQuery, ...suggestions].filter((x, i, a) => x && a.indexOf(x) === i).map((sug) => (
                  <button
                    key={sug}
                    className="chip chip-sm"
                    aria-pressed={query === sug}
                    onClick={() => {
                      setQuery(sug)
                      void search(undefined, sug)
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
            <p className="small muted">
              Wikimedia Commons ve Openverse'teki açık lisanslı görseller. Soyut kelimelerde Türkçe anlamla ya da İngilizce aramak daha iyi sonuç verir.
            </p>
            {results && results.length === 0 && <p className="muted">Sonuç yok. Başka bir kelimeyle dene.</p>}
            {results && results.length > 0 && (
              <div className="image-grid">
                {results.map((r) => (
                  <button key={r.thumbUrl} className="image-cell" onClick={() => chooseResult(r)} disabled={busy} title={r.credit} aria-label={r.title || 'Görsel seç'}>
                    <img
                      src={r.thumbUrl}
                      alt={r.title || 'Arama sonucu görseli'}
                      loading="lazy"
                      onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')}
                    />
                    {r.from === 'wikidata' && <span className="iq-badge small">Önerilen</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'upload' && (
          <label
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
              if (file) void choose(file)
            }}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])}
            />
            <strong>Bir fotoğraf seç</strong>
            <span className="small muted">ya da buraya sürükle (JPG, PNG, WebP…)</span>
          </label>
        )}

        {tab === 'paste' && (
          <div className="drop-zone">
            <strong>
              <kbd>⌘</kbd> + <kbd>V</kbd> ile yapıştır
            </strong>
            <span className="small muted">Bir görseli kopyala (ekran görüntüsü, web'den) ve burada yapıştır.</span>
          </div>
        )}

        {busy && <p className="small muted">Hazırlanıyor…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
