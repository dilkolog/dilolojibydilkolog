import { useState } from 'react'
import { currentSession, setNewPassword, signOutSupabase, authErrorText, supabaseConfigured, CURRENT_PASSWORD_NEEDED, CURRENT_PASSWORD_WRONG, type Identity } from '../../data/supabase'
import type { Account } from '../../data/sync'
import { PASSWORD_HINT, passwordProblem } from '../../data/passwordRule'
import { deleteAccount } from '../../data/vault'
import { AccountDeleteDialog } from './AccountDeleteDialog'
import { PasswordInput } from './PasswordInput'
import { setAccount } from './syncRunner'
import { showToast } from '../shared/toastFeed'
import { ChevronRightIcon, LockIcon, LogoutIcon } from '../shared/icons'

/**
 * The signed-in account's own controls, one row each: the password (set or change it) and signing out on this device.
 * (How the person signs in shows as a mark beside the email in the header: AccountSettings.)
 */
export function AccountManage({
  identity,
  onSignOut,
}: {
  account?: Account
  identity: Identity | null
  onSignOut: () => void
  onGone?: () => void
}) {
  const [changing, setChanging] = useState(false)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [shown, setShown] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // A password set just now counts at once; the saved account says so from the next load on (`has_password`).
  // (also when the server says the account has one already: set on another device, or before the flag existed)
  const [justSet, setJustSet] = useState(false)
  const [current, setCurrent] = useState('')
  const [needsCurrent, setNeedsCurrent] = useState(false)
  const hasPassword = !identity || identity.providers.includes('email') || justSet || needsCurrent

  const savePassword = async () => {
    setError('')
    const weak = passwordProblem(password)
    if (weak) return setError(weak)
    if (password !== repeat) return setError('Şifreler aynı değil.')
    if (needsCurrent && !current) return setError(CURRENT_PASSWORD_NEEDED)
    setBusy(true)
    try {
      await setNewPassword(password, needsCurrent ? current : undefined)
      showToast(hasPassword ? 'Yeni şifren kaydedildi.' : 'Şifren kaydedildi; artık e-posta ve şifreyle de girebilirsin.')
      setJustSet(true)
      setChanging(false)
      setPassword('')
      setRepeat('')
      setCurrent('')
      setNeedsCurrent(false)
    } catch (e) {
      const text = e instanceof Error ? authErrorText(e.message) : String(e)
      // The account has a password already: ask for it (and the row says so from now on).
      if (text === CURRENT_PASSWORD_NEEDED || text === CURRENT_PASSWORD_WRONG) setNeedsCurrent(true)
      setError(text)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-group account-actions">
      {identity &&
        (changing ? (
          <form
            className="account-password"
            onSubmit={(e) => {
              e.preventDefault()
              void savePassword()
            }}
          >
            {needsCurrent && (
              <label className="field">
                <span className="field-label">Mevcut şifre</span>
                <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" autoFocus shown={shown} onShownChange={setShown} />
                <span className="help">Hatırlamıyorsan çıkış yapıp giriş ekranındaki “Şifremi unuttum” bağlantısını kullan.</span>
              </label>
            )}
            <label className="field">
              <span className="field-label">Yeni şifre</span>
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" autoFocus={!needsCurrent} shown={shown} onShownChange={setShown} />
              <span className="help">{PASSWORD_HINT}</span>
            </label>
            <label className="field">
              <span className="field-label">Yeni şifre (tekrar)</span>
              <PasswordInput value={repeat} onChange={setRepeat} autoComplete="new-password" shown={shown} onShownChange={setShown} />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="row">
              <button className="btn btn-sm" type="submit" disabled={busy || !password}>
                {busy ? 'Bekle…' : 'Kaydet'}
              </button>
              <button className="btn btn-sm btn-quiet" type="button" onClick={() => setChanging(false)}>
                Vazgeç
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="account-row account-action" onClick={() => setChanging(true)}>
            <LockIcon size={18} />
            <span>{hasPassword ? 'Şifre değiştir' : 'Şifre belirle'}</span>
            <ChevronRightIcon size={18} />
          </button>
        ))}
      <button type="button" className="account-row account-action" disabled={busy} onClick={onSignOut}>
        <LogoutIcon size={18} />
        <span>Çıkış yap</span>
      </button>
    </div>
  )
}

/**
 * Deleting the account: a quiet red link under the account's controls (hard to press by mistake). It opens a dialog that walks through what goes and
 * what stays, asks for a typed phrase, then deletes (AccountDeleteDialog); the screen below the dialog stays as it is.
 */
export function AccountDelete({
  account,
  identity,
  onGone,
  label = 'Hesabı sil…',
  className = 'account-delete-link',
}: {
  account: Account
  identity: Identity | null
  onGone: () => void
  /** The trigger's words and look (a quiet link under the account card; a small danger button in Veriler). */
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const remove = async () => {
    const session = identity ? await currentSession() : null
    // The sign-in is what deletes the person's Supabase data too: without it only half would go, and the screen would say all did.
    if (supabaseConfigured() && !session) throw new Error('Oturumun düşmüş görünüyor. Çıkış yapıp yeniden giriş yaptıktan sonra hesabı silmeyi tekrar dene.')
    try {
      await deleteAccount(session?.access_token ?? null, account)
    } catch {
      throw new Error('Hesap silinemedi; biraz sonra tekrar dene.')
    }
    await setAccount(null)
    await signOutSupabase()
    setOpen(false)
    showToast('Hesabın ve sunucudaki verilerin silindi. Bu cihazdaki kelimelerin ve ilerlemen duruyor.', undefined, 6000)
    onGone()
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <AccountDeleteDialog onDelete={remove} onClose={() => setOpen(false)} />}
    </>
  )
}
