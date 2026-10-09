import { useState } from 'react'
import { db } from '../data/instance'
import { restoreFrom, restorePoints, SyncNotAllowedError } from '../data/sync'
import { ConfirmDialog } from './Dialog'
import { getCredential, NOT_ALLOWED, runSync } from './syncRunner'
import { showToast } from './toastFeed'

const dayLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * The server keeps the synced copy as it was on each of the last seven days (still encrypted).
 * Going back to a day brings back what was there then, deleted words included, and keeps what came later.
 */
export function RestorePoints() {
  const [days, setDays] = useState<string[] | null | 'loading'>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (days !== null) return
    setDays('loading')
    setError(null)
    try {
      const cred = await getCredential()
      setDays(cred ? await restorePoints(cred) : [])
    } catch (e) {
      setDays(null)
      setError(e instanceof SyncNotAllowedError ? NOT_ALLOWED : 'Geri dönüş noktaları alınamadı; internet bağlantını kontrol et.')
    }
  }

  const restore = async (day: string) => {
    setPending(null)
    setBusy(true)
    setError(null)
    try {
      const cred = await getCredential()
      if (!cred) return
      const back = await restoreFrom(db, cred, day)
      await runSync()
      showToast(back ? `${dayLabel(day)} hâline dönüldü; ${back} kelime geri geldi.` : `${dayLabel(day)} hâline dönüldü.`)
    } catch {
      setError('Geri dönülemedi; internet bağlantını kontrol et.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="account-advanced" onToggle={(e) => e.currentTarget.open && void load()}>
      <summary className="small">Geri dönüş noktaları</summary>
      <div className="stack">
        <p className="small muted">
          Sunucu, eşitlenen verilerinin son 7 günlük hâlini şifreli saklar. Bir güne dönünce o gün olan kelimeler (yanlışlıkla silinenler dahil) geri gelir; sonradan
          eklediklerin ve ilerlemen kalır.
        </p>
        {days === 'loading' && <p className="small muted">Yükleniyor…</p>}
        {Array.isArray(days) && !days.length && <p className="small muted">Henüz geri dönüş noktası yok; ilk eşitlemeden bir gün sonra oluşur.</p>}
        {Array.isArray(days) &&
          days.map((day) => (
            <div className="row" key={day}>
              <span className="small">{dayLabel(day)}</span>
              <button className="btn btn-sm btn-quiet" disabled={busy} onClick={() => setPending(day)}>
                Bu güne dön
              </button>
            </div>
          ))}
        {error && (
          <p className="error" role="status">
            {error}
          </p>
        )}
      </div>
      {pending && (
        <ConfirmDialog title={`${dayLabel(pending)} hâline dönülsün mü?`} confirmLabel="Geri dön" onConfirm={() => void restore(pending)} onCancel={() => setPending(null)}>
          O gün olan kelimeler ve cümleler geri gelir, diğer cihazlarına da gider. Sonradan eklediklerin silinmez.
        </ConfirmDialog>
      )}
    </details>
  )
}
