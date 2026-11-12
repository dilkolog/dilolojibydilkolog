import { useEffect, useState } from 'react'
import { setOwnerSecretAsker } from '../../data/adminApi'
import { PasswordInput } from '../account/PasswordInput'
import { LockIcon } from '../shared/icons'

/**
 * Asks the owner for the second secret (OWNER_STEP_SECRET) when the server wants it for a step that cannot be undone
 * (deleting a person, approving everyone, the limits). The secret stays in this tab's memory only (adminApi.ts).
 */
export function OwnerSecretDialog() {
  const [asking, setAsking] = useState<{ wrong: boolean; answer: (secret: string | null) => void } | null>(null)
  const [value, setValue] = useState('')
  const close = (secret: string | null) => {
    asking?.answer(secret)
    setAsking(null)
    setValue('')
  }
  useEffect(() => {
    setOwnerSecretAsker((wrong) => new Promise((answer) => setAsking({ wrong, answer })))
    return () => setOwnerSecretAsker(null)
  }, [])
  useEffect(() => {
    if (!asking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      close(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })
  if (!asking) return null
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(null)}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-secret-title"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) close(value.trim())
        }}
      >
        <div className="dialog-head">
          <span className="dialog-badge is-danger" aria-hidden>
            <LockIcon size={20} />
          </span>
          <h2 id="owner-secret-title" className="section-title">
            İkinci gizli
          </h2>
        </div>
        <div className="muted dialog-body stack">
          <p>{asking.wrong ? 'Gizli yanlıştı. Yeniden yaz.' : 'Bu adım geri alınamaz ya da para harcatır: Cloudflare’deki OWNER_STEP_SECRET gizlisini yaz. Yalnızca bu sekmede, sayfa kapanana dek tutulur.'}</p>
          <label className="field">
            <span className="field-label">OWNER_STEP_SECRET</span>
            <PasswordInput value={value} onChange={setValue} autoComplete="current-password" autoFocus />
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={() => close(null)}>
            Vazgeç
          </button>
          <button type="submit" className="btn btn-bad" disabled={!value.trim()}>
            Onayla
          </button>
        </div>
      </form>
    </div>
  )
}
