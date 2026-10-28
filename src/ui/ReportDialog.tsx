import { useEffect, useRef, useState } from 'react'
import '../lazy.css'
import { blockFriend, FriendsError, sendReport, type ReportInput, type ReportReason } from '../data/friends'
import { AlertIcon } from './icons'

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam ya da reklam' },
  { id: 'harassment', label: 'Taciz, zorbalık ya da nefret söylemi' },
  { id: 'sexual', label: 'Cinsel ya da müstehcen içerik' },
  { id: 'violence', label: 'Şiddet ya da tehdit' },
  {
    id: 'personal',
    label: 'Kişisel bilgilerimi ya da başkasınınkini paylaşıyor',
  },
  { id: 'copyright', label: 'Telif hakkını çiğniyor' },
  { id: 'other', label: 'Başka bir sorun' },
]

const ERRORS: Record<string, string> = {
  not_found: 'Bu içerik artık yok; şikâyet edilemedi.',
  too_many: 'Bugün için şikâyet sınırına ulaştın. Acil bir durumsa destek@diloloji.com adresine yaz.',
}

/**
 * A report to the site's owner on what someone sent (api/_reports.ts): a reason, an optional note and, for a
 * person, a way to block them in the same step. Cancel has the focus at the start, Esc and a click outside close it,
 * nothing closes it while it is sending.
 */
export default function ReportDialog({
  title,
  report,
  block,
  onClose,
  onDone,
}: {
  title: string
  report: Omit<ReportInput, 'reason' | 'note'>
  /** Someone who can be blocked with the report: their friend code and name. */
  block?: { code: string; name: string }
  onClose: () => void
  /** After a report went: whether they were blocked too. */
  onDone?: (blocked: boolean) => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(!!block)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    ;(sent ? doneRef : cancelRef).current?.focus()
  }, [sent])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      if (!busy) onClose()
    }
    // Capture phase, so the dialog handles Esc before any screen-level shortcut.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [busy, onClose])

  const send = async () => {
    if (!reason || busy) return
    setBusy(true)
    setError('')
    try {
      await sendReport({ ...report, reason, note: note.trim() || undefined })
      const blocked = !!block && alsoBlock
      // The report is in even if the block fails; the person can still be blocked from their page.
      if (blocked) await blockFriend(block.code).catch(() => undefined)
      setSent(true)
      onDone?.(blocked)
    } catch (e) {
      setError(ERRORS[e instanceof FriendsError ? e.reason : ''] ?? 'Gönderilemedi, biraz sonra yine dene.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dialog report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title" aria-busy={busy}>
        <div className="dialog-head">
          <span className="dialog-badge is-danger" aria-hidden>
            <AlertIcon size={20} />
          </span>
          <h2 id="report-title" className="section-title">
            {sent ? 'Şikâyetin iletildi' : title}
          </h2>
        </div>
        {sent ? (
          <>
            <p className="muted dialog-body" role="status">
              Teşekkürler. Şikâyetin site sahibine iletildi ve incelenecek; kurallara aykırı içerik kaldırılır, hesap kapatılabilir.
              {block && alsoBlock && ` ${block.name} engellendi: seni bulamaz, sana bir şey gönderemez.`}
            </p>
            <div className="dialog-actions">
              <button ref={doneRef} type="button" className="btn" onClick={onClose}>
                Tamam
              </button>
            </div>
          </>
        ) : (
          <form
            className="stack gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <div className="dialog-body stack gap-3">
              <div className="field">
                <span id="report-reason" className="field-label">
                  Sorun ne?
                </span>
                <div className="seg-group report-reasons" role="radiogroup" aria-labelledby="report-reason">
                  {REASONS.map((r) => (
                    <button key={r.id} type="button" role="radio" className="seg-btn" aria-checked={reason === r.id} onClick={() => setReason(r.id)} disabled={busy}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span className="small">Eklemek istediğin bir şey var mı? (isteğe bağlı)</span>
                <textarea className="textarea report-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} disabled={busy} />
              </label>
              {block && (
                <label className="report-block">
                  <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} disabled={busy} />
                  <span>
                    {block.name} adlı kişiyi ayrıca engelle
                    <span className="small muted block">Arkadaşlarından çıkar; seni bulamaz, sana istek ya da ileti gönderemez.</span>
                  </span>
                </label>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button ref={cancelRef} type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
                Vazgeç
              </button>
              <button type="submit" className="btn btn-bad" disabled={!reason || busy}>
                {busy ? 'Gönderiliyor…' : 'Şikâyet et'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
