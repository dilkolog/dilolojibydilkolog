import { lazy, Suspense, useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { libraryList, ShareError, type LibraryItem } from '../data/share'
import { Sticker } from './Sticker'
import { FlagIcon } from './icons'

const IncomingSet = lazy(() => import('./IncomingSet'))
const ReportDialog = lazy(() => import('./ReportDialog'))

/** Lists this device reported: not shown again here (the owner decides on the list itself). */
const REPORTED_KEY = 'diloloji:reported-sets'
function reportedSets(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(REPORTED_KEY) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
function rememberReported(id: string) {
  try {
    localStorage.setItem(REPORTED_KEY, JSON.stringify([id, ...reportedSets().filter((x) => x !== id)].slice(0, 200)))
  } catch {
    // Storage blocked: the list just shows again next time.
  }
}

/** The lists approved accounts have put in the library, for this language: open one to see it and add it. */
export function CommunitySets({ language, onAdded }: { language: TargetLanguage; onAdded: () => void }) {
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [reporting, setReporting] = useState<LibraryItem | null>(null)
  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const hidden = new Set(reportedSets())
      setItems((await libraryList(language)).filter((i) => !hidden.has(i.id)))
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
        <p className="small muted">Onaylı hesapların kütüphanede yayınladığı listeler. Birini açıp içine bak, beğenirsen kendi kelimelerine ekle. Kendi listeni yayınlamak için Kelimeler → Listeler → Paylaş. Uygunsuz bir liste görürsen bayrakla şikâyet et.</p>
        {busy && <p className="small muted">Yükleniyor…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {items && items.length === 0 && (
          <p className="small muted sticker-note">
            <Sticker name="hello" size={32} />
            <span>Bu dilde yayınlanmış liste yok. İlk sen yayınlayabilirsin: Kelimeler → Listeler → Paylaş.</span>
          </p>
        )}
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
                <button type="button" className="icon-btn icon-btn-sm" aria-label={`“${i.name}” listesini şikâyet et`} title="Şikâyet et" onClick={() => setReporting(i)}>
                  <FlagIcon size={14} />
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
      {reporting && (
        <Suspense fallback={null}>
          <ReportDialog
            title={`“${reporting.name}” listesini şikâyet et`}
            report={{ kind: 'set', target: reporting.id }}
            onClose={() => setReporting(null)}
            onDone={() => {
              rememberReported(reporting.id)
              setItems((cur) => cur?.filter((x) => x.id !== reporting.id) ?? null)
            }}
          />
        </Suspense>
      )}
    </details>
  )
}
