import { useState } from 'react'
import { currentSession, setNewPassword, signOutSupabase, authErrorText, providersText, supabaseConfigured, type Identity } from '../data/supabase'
import type { Account } from '../data/sync'
import { deleteAccount } from '../data/vault'
import { ConfirmDialog } from './Dialog'
import { AccountDeleteDialog } from './AccountDeleteDialog'
import { PasswordInput } from './PasswordInput'
import { setAccount } from './syncRunner'
import { showToast } from './toastFeed'

/**
 * The signed-in account's main controls: sign-in provider and password (new or first),
 * and signing out on this device.
 */
export function AccountManage({
  identity,
  onSignOut,
  onSignOutAndWipe,
}: {
  account?: Account
  identity: Identity | null
  onSignOut: () => void
  /** Syncs, signs out and clears this device's data (a shared device). */
  onSignOutAndWipe?: () => Promise<void>
  onGone?: () => void
}) {
  const [wiping, setWiping] = useState(false)
  const [changing, setChanging] = useState(false)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [shown, setShown] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const hasPassword = !identity || identity.providers.includes('email')

  const savePassword = async () => {
    setError('')
    if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.')
    if (password !== repeat) return setError('Şifreler aynı değil.')
    setBusy(true)
    try {
      await setNewPassword(password)
      showToast(hasPassword ? 'Yeni şifren kaydedildi.' : 'Şifren kaydedildi; artık e-posta ve şifreyle de girebilirsin.')
      setChanging(false)
      setPassword('')
      setRepeat('')
    } catch (e) {
      setError(e instanceof Error ? authErrorText(e.message) : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {identity && (
        <div className="account-group">
          <h3 className="account-group-title">Giriş ve Güvenlik</h3>
          <div className="account-row">
            <div className="account-row-text">
              <strong>Giriş Yöntemi</strong>
              <span className="small muted">{providersText(identity.providers)}</span>
            </div>
            <span className="account-status-badge">Bağlı</span>
          </div>
          <div className="account-row">
            <div className="account-row-text">
              <strong>Şifre</strong>
              <span className="small muted">
                {hasPassword ? '••••••••••••' : 'Belirlenmedi'}
              </span>
            </div>
            {!changing && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => setChanging(true)}>
                {hasPassword ? 'Değiştir' : 'Şifre belirle'}
              </button>
            )}
          </div>
          {changing && (
            <form
              className="account-password"
              onSubmit={(e) => {
                e.preventDefault()
                void savePassword()
              }}
            >
              <label className="field">
                <span className="field-label">Yeni şifre</span>
                <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" autoFocus shown={shown} onShownChange={setShown} />
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
          )}
        </div>
      )}

      <div className="account-group">
        <h3 className="account-group-title">Oturum</h3>
        <div className="account-row">
          <div className="account-row-text">
            <strong>Mevcut Oturum</strong>
            <span className="small muted">Bu cihazdaki oturumu kapatır; yerel kelimelerin korunur.</span>
          </div>
          <button type="button" className="btn btn-sm btn-quiet" disabled={busy} onClick={onSignOut}>
            Çıkış yap
          </button>
        </div>
        {onSignOutAndWipe && (
          <div className="account-row">
            <div className="account-row-text">
              <strong>Ortak cihaz</strong>
              <span className="small muted">Çıkış yapar ve bu cihazdaki kelime ve ilerleme kopyasını siler. Hepsi hesabında durur.</span>
            </div>
            <button type="button" className="btn btn-sm btn-quiet" disabled={busy} onClick={() => setWiping(true)}>
              Çıkış yap ve sil
            </button>
          </div>
        )}
      </div>
      {wiping && onSignOutAndWipe && (
        <ConfirmDialog
          title="Çıkış yapılıp bu cihaz temizlensin mi?"
          confirmLabel="Çıkış yap ve sil"
          danger
          onConfirm={() => {
            setWiping(false)
            void onSignOutAndWipe()
          }}
          onCancel={() => setWiping(false)}
        >
          Önce hesabınla eşitlenir; eşitlenemezse hiçbir şey silinmez. Sonra bu cihazdaki kelimelerin, cevapların, metinlerin ve ayarların silinir. Hesabına tekrar girince hepsi geri gelir. Yalnızca başkasıyla ortak kullandığın bir cihazdaysan seç.
        </ConfirmDialog>
      )}
    </>
  )
}

/**
 * Deleting the account: a quiet row in the account's settings. It opens a dialog that walks through what goes and
 * what stays, asks for a typed phrase, then deletes (AccountDeleteDialog); the screen below the dialog stays as it is.
 */
export function AccountDelete({
  account,
  identity,
  onGone,
}: {
  account: Account
  identity: Identity | null
  onGone: () => void
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
      <div className="account-group">
        <div className="account-row">
          <div className="account-row-text">
            <strong>Hesabı sil</strong>
            <span className="small muted">Hesabını ve sunucudaki verilerini kalıcı olarak siler.</span>
          </div>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setOpen(true)}>
            Hesabı sil…
          </button>
        </div>
      </div>
      {open && <AccountDeleteDialog onDelete={remove} onClose={() => setOpen(false)} />}
    </>
  )
}
