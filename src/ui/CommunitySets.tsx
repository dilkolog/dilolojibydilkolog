import { lazy, Suspense, useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { libraryList, ShareError, type LibraryItem } from '../data/share'

const IncomingSet = lazy(() => import('./IncomingSet'))

/** The lists approved accounts have put in the library, for this language: open one to see it and add it. */
export function CommunitySets({ language, onAdded }: { language: TargetLanguage; onAdded: () => void }) {
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const load = async () => {
    setBusy(true)
    setError('')
    try {
      setItems(await libraryList(language))
    } catch (e) {
      setError(e instanceof ShareError ? e.message : 'Kütüphane açılamadı.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="card" onToggle={(e) => e.currentTarget.open && !items && !busy && void load()}>
      <summary>Topluluk listeleri</summary>
      <div className="stack">
        <p className="small muted">Onaylı hesapların kütüphanede yayınladığı listeler. Birini açıp içine bak, beğenirsen kendi kelimelerine ekle. Kendi listeni yayınlamak için Kelimeler → Listeler → Paylaş.</p>
        {busy && <p className="small muted">Yükleniyor…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {items && items.length === 0 && <p className="small muted">Bu dilde yayınlanmış liste yok.</p>}
        {items && items.length > 0 && (
          <ul className="stack gap-2">
            {items.map((i) => (
              <li key={i.id} className="row">
                <div className="grow">
                  <strong>{i.name}</strong>
                  <p className="small muted">
                    {i.count} kelime{i.by ? ` · ${i.by}` : ''} · {new Date(i.at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-quiet" onClick={() => setOpen(i.id)}>
                  Aç
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && (
        <Suspense fallback={null}>
          <IncomingSet id={open} onClose={() => setOpen(null)} onDone={onAdded} />
        </Suspense>
      )}
    </details>
  )
}
