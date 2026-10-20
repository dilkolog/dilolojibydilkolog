import { useState } from 'react'
import { db } from '../data/instance'
import { syncTarget } from './syncTarget'
import { restoreFrom, restorePoints, SyncApprovalError, SyncNotAllowedError } from '../data/sync'
import { ConfirmDialog } from './Dialog'
import { getCredential, NOT_ALLOWED, PENDING_APPROVAL, runSync } from './syncRunner'
import { showToast } from './toastFeed'
import { Sticker } from './Sticker'
import { ChevronDownIcon } from './icons'

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
      setDays(cred ? await restorePoints(await syncTarget(cred)) : [])
    } catch (e) {
      setDays(null)
      setError(e instanceof SyncApprovalError ? PENDING_APPROVAL : e instanceof SyncNotAllowedError ? NOT_ALLOWED : 'Geri dönüş noktaları alınamadı; internet bağlantını kontrol et.')
    }
  }

  const restore = async (day: string) => {
    setPending(null)
    setBusy(true)
    setError(null)
    try {
      const cred = await getCredential()
      if (!cred) return
      const back = await restoreFrom(db, await syncTarget(cred), day)
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
      <summary className="account-accordion-summary small">
        <span className="account-accordion-title">
          <span>Geçmiş: önceki bir güne dön</span>
          <span className="small muted font-normal">(Son 7 gün)</span>
        </span>
        <ChevronDownIcon size={16} className="account-accordion-arrow" />
      </summary>
      <div className="stack account-accordion-body">
        <p className="small muted">
          Hesabın, verilerinin son 7 günlük hâlini saklar. Bir güne dönünce o gün olan kelimeler, listeler ve ayarlar (yanlışlıkla silinenler dahil) geri gelir;
          sonradan eklediklerin kalır. Cevap geçmişin ve okuma metinlerin bu özellikle geri getirilmez, hiç silinmez.
        </p>
        {days === 'loading' && <p className="small muted">Yükleniyor…</p>}
        {Array.isArray(days) && !days.length && (
          <p className="small muted sticker-note">
            <Sticker name="sleep" size={32} />
            <span>Henüz geri dönüş noktası yok; ilk eşitlemeden bir gün sonra oluşur.</span>
          </p>
        )}
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
