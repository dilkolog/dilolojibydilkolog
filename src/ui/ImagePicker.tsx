import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { fetchImage, getPixabayKey, searchImages, setPixabayKey } from '../data/imageSearch'
import { suggestImages, type ImageSuggestion } from '../data/imageQueue'
import type { TargetLanguage } from '../engine/types'
import { imageFromClipboard, imageUrlFromClipboard, isLikelyImageUrl, shrinkImage } from './imageTools'
import { CloseIcon, SearchIcon } from './icons'
import { showToast } from './toastFeed'

export interface PickedImage {
  blob: Blob
  credit?: string
  /** 'wikidata': the picture Wikidata keeps for the thing; otherwise a search result or the learner's own. */
  from?: 'wikidata' | 'search' | 'pixabay' | 'paste' | 'upload'
}

type Tab = 'search' | 'upload' | 'paste'

/**
 * Pick a picture for a word, Quizlet-style: search free curated images,
 * jump to Google Images with 1-click clipboard paste, or upload/paste a direct link.
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
  const [pixabayActive, setPixabayActive] = useState(() => !!getPixabayKey())
  const [showPixConfig, setShowPixConfig] = useState(false)
  const [pixDraft, setPixDraft] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const searched = useRef(false)

  const search = async (e?: FormEvent, q = query) => {
    e?.preventDefault()
    const targetQ = q.trim()
    if (!targetQ) return
    setBusy(true)
    setError('')
    try {
      // With the word's language, Wikidata's own picture for the thing comes first; the word itself is looked up
      // in its language, the Turkish meaning chips in Turkish.
      const found = language
        ? await suggestImages({ language: targetQ === initialQuery.trim() ? language : ('tr' as TargetLanguage), lemma: targetQ }, 18)
        : (await searchImages(targetQ)).map((r) => ({ ...r, from: 'search' as const }))
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
      try {
        const shrunk = await shrinkImage(blob)
        onPick({ blob: shrunk, credit, from })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Görsel işlenemedi.')
        setBusy(false)
      }
    },
    [onPick],
  )

  const loadFromUrl = useCallback(
    async (url: string) => {
      if (!isLikelyImageUrl(url)) {
        setError('Geçerli bir görsel bağlantısı (URL) giriniz.')
        return
      }
      setBusy(true)
      setError('')
      try {
        const blob = await fetchImage(url.trim())
        await choose(blob, 'Web bağlantısından eklendi', 'paste')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bağlantıdaki görsel indirilemedi. Sağ tıklayıp "Resmi Kopyala" ile yapıştırmayı deneyin.')
        setBusy(false)
      }
    },
    [choose],
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
        void choose(img, 'Panodan yapıştırıldı', 'paste')
        return
      }
      const url = imageUrlFromClipboard(e)
      if (url) {
        e.preventDefault()
        void loadFromUrl(url)
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
  }, [onClose, choose, loadFromUrl])

  const savePixKey = (e: FormEvent) => {
    e.preventDefault()
    if (!pixDraft.trim()) return
    setPixabayKey(pixDraft.trim())
    setPixabayActive(true)
    setShowPixConfig(false)
    setPixDraft('')
    void search()
  }

  const removePixKey = () => {
    setPixabayKey(null)
    setPixabayActive(false)
    void search()
  }

  // Smart suggestions: base word, meaning chips, plus quick visual modifiers
  const cleanBaseQuery = initialQuery.trim()
  const baseChips = [cleanBaseQuery, ...suggestions].filter((x, i, a) => x && a.indexOf(x) === i)
  const modifierChips = [
    { label: '+ İllüstrasyon', term: `${cleanBaseQuery} illustration` },
    { label: '+ Çizim', term: `${cleanBaseQuery} clipart` },
    { label: '+ Sade Nesne', term: `${cleanBaseQuery} object` },
  ]

  const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query.trim() || initialQuery.trim())}&safe=active`

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
              ['paste', 'Kopyala & Yapıştır'],
              ['upload', 'Dosya Yükle'],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} className="segmented-btn" onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'search' && (
          <div className="stack gap-3">
            <form className="row gap-2" onSubmit={search}>
              <input
                className="input grow"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ne arıyorsun? (Kelime, anlam veya görsel linki)"
                aria-label="Görsel ara"
                autoFocus
              />
              <button className="btn" type="submit" disabled={busy || !query.trim()}>
                <SearchIcon size={16} className="inline-icon" />
                Ara
              </button>
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="google-bridge-btn"
                title="Google Görseller'de yeni sekmede ara ve resmi doğrudan kopyala"
              >
                <span>Google'da Ara ↗</span>
              </a>
            </form>

            {/* Quick URL detection banner */}
            {isLikelyImageUrl(query) && (
              <div className="url-action-banner row items-center justify-between">
                <span className="small muted">Yapıştırılan web görsel adresi algılandı.</span>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => loadFromUrl(query)}
                  disabled={busy}
                >
                  Bu URL'deki Görseli Kullan
                </button>
              </div>
            )}

            {/* Google Pro-Tip Callout Banner */}
            <div className="img-tip-card">
              <div className="row items-center gap-2">
                <span className="img-tip-icon" aria-hidden="true">💡</span>
                <span className="small">
                  <strong>İpucu:</strong> Aradığın görseli Google'da bulduysan, görsele sağ tıkla → <strong>"Resmi Kopyala"</strong> de ve burada doğrudan <strong>⌘V / Ctrl+V</strong> ile yapıştır! Anında kartına kaydedilir.
                </span>
              </div>
            </div>

            {/* Smart query & style chips */}
            <div className="stack gap-1">
              {baseChips.length > 0 && (
                <div className="choice-row">
                  {baseChips.map((sug) => (
                    <button
                      key={sug}
                      type="button"
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
                  {cleanBaseQuery && modifierChips.map((mod) => (
                    <button
                      key={mod.label}
                      type="button"
                      className="chip chip-sm"
                      onClick={() => {
                        setQuery(mod.term)
                        void search(undefined, mod.term)
                      }}
                    >
                      {mod.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {results && results.length === 0 && (
              <div className="card text-center p-3 muted">
                <p>Açık kütüphanelerde sonuç bulunamadı.</p>
                <p className="small">
                  Yukarıdaki <strong>"Google'da Ara ↗"</strong> butonuna tıklayarak görseli bulup sağ tık ile kopyalayabilir ve buraya <strong>⌘V</strong> ile yapıştırabilirsiniz!
                </p>
              </div>
            )}

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

            {/* Pixabay API Key toggle */}
            <div className="pixabay-bar row justify-between items-center">
              {pixabayActive ? (
                <div className="row items-center gap-2">
                  <span className="badge-chip">✨ Pixabay HD Aktif</span>
                  <button type="button" className="btn-quiet text-xs" onClick={removePixKey}>
                    Kaldır
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-quiet text-xs"
                  onClick={() => setShowPixConfig(!showPixConfig)}
                >
                  ⚙️ Pixabay HD Anahtarı Ekle (Ücretsiz 1M+ fotoğraf & illüstrasyon)
                </button>
              )}
            </div>

            {showPixConfig && (
              <form className="pixabay-config-card stack gap-2 p-2" onSubmit={savePixKey}>
                <label className="small">
                  <strong>Pixabay API Anahtarı:</strong>
                  <span className="muted block">
                    pixabay.com/api/docs adresinden ücretsiz alınır. Girildiğinde tüm aramalarda kristal netliğinde modern fotoğraflar önceliklendirilir.
                  </span>
                </label>
                <div className="row gap-2">
                  <input
                    className="input grow"
                    type="password"
                    placeholder="API anahtarınızı yapıştırın..."
                    value={pixDraft}
                    onChange={(e) => setPixDraft(e.target.value)}
                  />
                  <button type="submit" className="btn btn-sm" disabled={!pixDraft.trim()}>
                    Kaydet
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === 'paste' && (
          <div className="stack gap-3">
            <div
              className="drop-zone"
              onClick={() => {
                showToast('Görsel kopyaladıktan sonra klavyeden ⌘V (veya Ctrl+V) yapınız.')
              }}
            >
              <strong>
                <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>V</kbd> ile Yapıştır
              </strong>
              <span className="small muted">
                Google Görseller'de veya herhangi bir web sayfasında beğendiğin görsele sağ tıklayıp <strong>Resmi Kopyala</strong> dedikten sonra bu ekranda yapıştır.
              </span>
            </div>

            <div className="stack gap-1">
              <label className="small muted">Veya doğrudan bir görsel adresi (URL) yapıştır:</label>
              <div className="row gap-2">
                <input
                  className="input grow"
                  placeholder="https://... (JPG, PNG, WebP)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={busy || !urlInput.trim()}
                  onClick={() => loadFromUrl(urlInput)}
                >
                  Yükle
                </button>
              </div>
            </div>

            <div className="card row items-center justify-between p-2">
              <span className="small">Hemen Google'da görsel aramak ister misin?</span>
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="google-bridge-btn"
              >
                <span>Google Görseller'i Aç ↗</span>
              </a>
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <label
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
              if (file) void choose(file, 'Dosyadan yüklendi', 'upload')
            }}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && choose(e.target.files[0], 'Dosyadan yüklendi', 'upload')}
            />
            <strong>Bir fotoğraf seç</strong>
            <span className="small muted">ya da buraya sürükle (JPG, PNG, WebP…)</span>
          </label>
        )}

        {busy && <p className="small muted">Görsel hazırlanıyor ve optimize ediliyor…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
