import { useEffect, useRef, useState } from 'react'
import { db } from '../data/instance'
import { downloadBackup } from './backup'
import { DELETE_PHRASE, phraseMatches } from './deletePhrase'
import { AlertIcon, CheckIcon, CloseIcon, DownloadIcon } from './icons'

const GOES = ['Sunucuda eşitlenen kelimelerin, ilerlemen ve ayarların', 'Arkadaş kartın, takip ettiklerin ve gelen kutun', 'Mail ve bildirim hatırlatmaların', 'Giriş hesabın: bu e-postayla yeniden girmek için baştan hesap açman gerekir']
const STAYS = ['Bu cihazdaki kelimelerin ve ilerlemen', 'Paylaştığın listeler (istersen önce liste sayfasından paylaşımı geri al)']

type Step = 'review' | 'confirm'

/**
 * Deleting the account, in order: what goes and what stays (with a way to take a backup first), then
 * typing the phrase, then the work itself. Cancel has the focus at the start, Esc and a click outside
 * close it, and nothing closes it while the deletion runs.
 */
export function AccountDeleteDialog({ onDelete, onClose }: { onDelete: () => Promise<void>; onClose: () => void }) {
  const [step, setStep] = useState<Step>('review')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const firstRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ready = phraseMatches(typed)

  useEffect(() => {
    if (step === 'review') firstRef.current?.focus()
    else inputRef.current?.focus()
  }, [step])

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

  const backup = async () => {
    try {
      await downloadBackup(db)
      setSaved(true)
    } catch {
      setError('Yedek indirilemedi; biraz sonra tekrar dene.')
    }
  }

  const remove = async () => {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      await onDelete()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Hesap silinemedi; biraz sonra tekrar dene.')
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-busy={busy}>
        <div className="dialog-head">
          <span className="dialog-badge is-danger" aria-hidden>
            <AlertIcon size={20} />
          </span>
          <h2 id="delete-title" className="section-title">
            {step === 'review' ? 'Hesabını silmek üzeresin' : 'Son adım'}
          </h2>
        </div>

        {step === 'review' && (
          <>
            <div className="dialog-body delete-body">
              <p className="muted">Bu işlem geri alınamaz. Silmeden önce neyin gideceğine, neyin kalacağına bak.</p>
              <div className="delete-box delete-box-gone">
                <h3 className="delete-box-title">Silinecekler</h3>
                <ul>
                  {GOES.map((t) => (
                    <li key={t}>
                      <CloseIcon size={14} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="delete-box">
                <h3 className="delete-box-title">Kalacaklar</h3>
                <ul>
                  {STAYS.map((t) => (
                    <li key={t}>
                      <CheckIcon size={14} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" className="btn btn-sm btn-quiet delete-backup" onClick={() => void backup()}>
                {saved ? <CheckIcon size={16} /> : <DownloadIcon size={16} />}
                {saved ? 'Yedek indirildi' : 'Önce yedeğimi indir'}
              </button>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button ref={firstRef} type="button" className="btn btn-quiet" onClick={onClose}>
                Vazgeç
              </button>
              <button type="button" className="btn" onClick={() => setStep('confirm')}>
                Devam et
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void remove()
            }}
          >
            <div className="dialog-body delete-body">
              {busy ? (
                <p className="delete-working" role="status">
                  <span className="delete-spinner" aria-hidden />
                  Hesabın siliniyor… Bu birkaç saniye sürer, sayfayı kapatma.
                </p>
              ) : (
                <>
                  <p className="muted">
                    Onaylamak için aşağıya <strong className="delete-phrase">{DELETE_PHRASE}</strong> yaz.
                  </p>
                  <label className="field">
                    <span className="field-label">Onay yazısı</span>
                    <input
                      ref={inputRef}
                      className="input"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder={DELETE_PHRASE}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-describedby={error ? 'delete-error' : undefined}
                    />
                  </label>
                </>
              )}
              {error && (
                <p id="delete-error" className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
            {!busy && (
              <div className="dialog-actions">
                <button type="button" className="btn btn-quiet" onClick={() => setStep('review')}>
                  Geri
                </button>
                <button type="submit" className="btn btn-bad" disabled={!ready}>
                  Hesabımı kalıcı olarak sil
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
