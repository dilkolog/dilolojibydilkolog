import { useCallback, useEffect, useState } from 'react'
import { setOwnerCodeAsker } from '../../data/adminApi'
import { cancelEnroll, confirm, factors, level, MfaError, prove, remove, startEnroll, type Factor } from '../../data/ownerMfa'
import { ConfirmDialog } from '../shared/Dialog'
import { LockIcon } from '../shared/icons'
import { showToast } from '../shared/toastFeed'

const failText = (e: unknown) => (e instanceof MfaError ? e.message : 'Olmadı; birazdan yeniden dene.')

/** Six digits from the authenticator app, as typed (spaces dropped, nothing else kept). */
const digits = (raw: string) => raw.replace(/\D/g, '').slice(0, 6)

function CodeField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="field">
      <span className="field-label">Doğrulama kodu</span>
      <input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={value} onChange={(e) => onChange(digits(e.target.value))} autoFocus={autoFocus} />
    </label>
  )
}

/**
 * Asks the owner for the authenticator code when the admin endpoint wants a session that gave it (api/_owner.ts): checks
 * it with Supabase, which refreshes the session, and lets the waiting request go again.
 */
export function OwnerCodeDialog() {
  const [asking, setAsking] = useState<((ok: boolean) => void) | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const close = useCallback(
    (ok: boolean) => {
      asking?.(ok)
      setAsking(null)
      setCode('')
      setError('')
    },
    [asking],
  )
  useEffect(() => {
    setOwnerCodeAsker(() => new Promise((answer) => setAsking(() => answer)))
    return () => setOwnerCodeAsker(null)
  }, [])
  useEffect(() => {
    if (!asking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      close(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [asking, close])
  if (!asking) return null
  const submit = async () => {
    if (code.length !== 6 || busy) return
    setBusy(true)
    setError('')
    try {
      await prove(code)
      close(true)
    } catch (e) {
      setError(failText(e))
      setCode('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-code-title"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="dialog-head">
          <span className="dialog-badge" aria-hidden>
            <LockIcon size={20} />
          </span>
          <h2 id="owner-code-title" className="section-title">
            Doğrulama kodu
          </h2>
        </div>
        <div className="muted dialog-body stack">
          <p>Yönetim ekranı iki adımlı doğrulamayla korunuyor: doğrulama uygulamandaki 6 haneli kodu yaz.</p>
          <CodeField value={code} onChange={setCode} autoFocus />
          {error && (
            <p className="note" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={() => close(false)}>
            Vazgeç
          </button>
          <button type="submit" className="btn" disabled={code.length !== 6 || busy}>
            {busy ? 'Bakılıyor…' : 'Doğrula'}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * The admin screen's "Güvenlik" card: the owner's authenticator apps. Adding one shows a QR code (and its secret for
 * typing in) and is finished by a code from the app; a second app is the way back when a phone is lost.
 */
export function SecurityCard() {
  const [list, setList] = useState<Factor[] | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<Factor | null>(null)

  const load = useCallback(() => {
    factors()
      .then(setList)
      .catch((e: unknown) => setError(failText(e)))
  }, [])
  useEffect(load, [load])

  const add = async () => {
    setBusy(true)
    setError('')
    try {
      // A later app needs this session to have given its code (Supabase asks for aal2 to add one more).
      if (list?.length && !(await level()).proven) throw new MfaError('Önce mevcut uygulamanın koduyla doğrula (sayfayı yenileyip kodu gir).')
      setAdding(await startEnroll(list?.length ? `Diloloji yönetim ${list.length + 1}` : 'Diloloji yönetim'))
      setCode('')
    } catch (e) {
      setError(failText(e))
    } finally {
      setBusy(false)
    }
  }
  const finish = async () => {
    if (!adding || code.length !== 6) return
    setBusy(true)
    setError('')
    try {
      await confirm(adding.id, code)
      setAdding(null)
      showToast(list?.length ? 'Yedek doğrulama uygulaması eklendi.' : 'İki adımlı doğrulama açık: yönetim ekranı artık kod da istiyor.')
      load()
    } catch (e) {
      setError(failText(e))
      setCode('')
    } finally {
      setBusy(false)
    }
  }
  const stop = async () => {
    if (adding) await cancelEnroll(adding.id)
    setAdding(null)
    setError('')
  }
  const drop = async (f: Factor) => {
    setRemoving(null)
    try {
      await remove(f.id)
      showToast('Doğrulama uygulaması kaldırıldı.')
      load()
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    }
  }

  return (
    <section className="card stack admin-card" aria-labelledby="admin-security" id="admin-security-card">
      <h2 className="section-title" id="admin-security">
        Güvenlik
      </h2>
      {list === null && !error && <p className="small muted">Yükleniyor…</p>}
      {list && (
        <p className="small muted">
          {list.length
            ? 'İki adımlı doğrulama açık: yönetim ekranı e-posta ya da Google girişinin yanında doğrulama uygulamasındaki kodu da istiyor.'
            : 'İki adımlı doğrulama kapalı: yönetim ekranı yalnızca hesabınla açılıyor. Posta kutun ya da Google hesabın ele geçirilirse burası da açılır.'}
        </p>
      )}
      {list && list.length > 0 && (
        <ul className="plain account-group admin-checks">
          {list.map((f) => (
            <li key={f.id} className="admin-check">
              <span className="admin-dot" data-state="ok" aria-hidden />
              <span>{f.name || 'Doğrulama uygulaması'}</span>
              <button type="button" className="btn btn-sm btn-quiet admin-check-state" onClick={() => setRemoving(f)}>
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            void finish()
          }}
        >
          <p className="small">Doğrulama uygulamanla (Google Authenticator, 1Password, Apple Parolalar…) bu kodu tara, sonra uygulamanın gösterdiği 6 haneli kodu yaz.</p>
          <img className="qr" src={adding.qr} alt="Doğrulama uygulaması için QR kodu" width={176} height={176} />
          <p className="small muted">
            Tarayamıyorsan bu anahtarı elle gir: <code>{adding.secret}</code>
          </p>
          <CodeField value={code} onChange={setCode} autoFocus />
          <div className="row">
            <button type="submit" className="btn" disabled={code.length !== 6 || busy}>
              {busy ? 'Bakılıyor…' : 'Etkinleştir'}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => void stop()}>
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        list && (
          <div>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void add()}>
              {list.length ? 'Yedek uygulama ekle' : 'İki adımlı doğrulamayı aç'}
            </button>
          </div>
        )
      )}
      {error && (
        <p className="note" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs muted">
        Telefonunu kaybedersen: yedek uygulamayla gir; o da yoksa Supabase → Authentication → Users → kendi hesabın → doğrulama uygulamasını sil. Bu yüzden bir yedek eklemen iyi olur.
      </p>
      {removing && (
        <ConfirmDialog title="Doğrulama uygulaması kaldırılsın mı?" confirmLabel="Kaldır" danger onConfirm={() => void drop(removing)} onCancel={() => setRemoving(null)}>
          {list && list.length <= 1 ? 'Son uygulama bu: kaldırınca yönetim ekranı yeniden yalnızca hesabınla açılır.' : 'Bu uygulamanın kodları artık geçmez; diğer uygulaman çalışmaya devam eder.'}
        </ConfirmDialog>
      )}
    </section>
  )
}
