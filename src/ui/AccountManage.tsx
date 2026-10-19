import { useState } from 'react'
import { currentSession, setNewPassword, signOutSupabase, authErrorText, providersText, supabaseConfigured, type Identity } from '../data/supabase'
import type { Account } from '../data/sync'
import { deleteAccount } from '../data/vault'
import { ConfirmDialog } from './Dialog'
import { ChevronDownIcon } from './icons'
import { setAccount } from './syncRunner'
import { showToast } from './toastFeed'

/**
 * The signed-in account's main controls: sign-in provider and password (new or first),
 * and signing out on this device.
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
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
              </label>
              <label className="field">
                <span className="field-label">Yeni şifre (tekrar)</span>
                <input className="input" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
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
      </div>
    </>
  )
}

/**
 * Account deletion placed safely at the very bottom or in Data settings.
 * Hidden inside a collapsible details section so it is never in the way or accidentally pressed.
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
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    setConfirming(false)
    setBusy(true)
    try {
      const session = identity ? await currentSession() : null
      // The sign-in is what deletes the person's Supabase data too: without it only half would go, and the screen would say all did.
      if (supabaseConfigured() && !session) {
        showToast('Oturumun düşmüş görünüyor. Çıkış yapıp yeniden giriş yaptıktan sonra hesabı silmeyi tekrar dene.', undefined, 7000, 'info')
        return
      }
      await deleteAccount(session?.access_token ?? null, account)
      await setAccount(null)
      await signOutSupabase()
      showToast('Hesabın ve sunucudaki verilerin silindi. Bu cihazdaki kelimelerin ve ilerlemen duruyor.', undefined, 6000)
      onGone()
    } catch {
      showToast('Hesap silinemedi; biraz sonra tekrar dene.', undefined, 5000, 'info')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="account-advanced account-danger-details">
      <summary className="account-danger-summary small">
        <span className="account-danger-title">
          <span>⚠️ Hesabı sil</span>
          <span className="small muted font-normal">(Tehlikeli bölge)</span>
        </span>
        <ChevronDownIcon size={16} className="account-accordion-arrow" />
      </summary>
      <div className="account-danger-body">
        <p className="small muted">
          Hesabın ve bulutta eşitlenen tüm verilerin kalıcı olarak silinir. Bu cihazdaki yerel kelimelerin ve ilerlemen korunur.
        </p>
        <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => setConfirming(true)}>
          Hesabımı kalıcı olarak sil
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          title="Hesabın silinsin mi?"
          confirmLabel="Hesabımı sil"
          danger
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        >
          Hesabın, sunucuda eşitlenen verilerin, arkadaş kartın ve mail hatırlatmaların kalıcı olarak silinir; geri alınamaz. Bu cihazdaki kelimelerin ve ilerlemen silinmez, hesapsız kullanmaya devam edebilirsin. Paylaştığın listeler kalır: istersen önce liste sayfasından paylaşımı geri al.
        </ConfirmDialog>
      )}
    </details>
  )
}
