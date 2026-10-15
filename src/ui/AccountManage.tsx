import { useState } from 'react'
import { currentSession, setNewPassword, signOutSupabase, authErrorText, type Identity } from '../data/supabase'
import type { Account } from '../data/sync'
import { deleteAccount } from '../data/vault'
import { ConfirmDialog } from './Dialog'
import { setAccount } from './syncRunner'
import { showToast } from './toastFeed'

/**
 * The signed-in account's own controls: a new password (or a first one, for someone who signs in with
 * Google) and deleting the account. Deleting takes the account and what the server keeps for it; the
 * device keeps its copy, so nothing studied here is lost by accident.
 */
export function AccountManage({ account, identity, onGone }: { account: Account; identity: Identity | null; onGone: () => void }) {
  const [changing, setChanging] = useState(false)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
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

  const remove = async () => {
    setConfirming(false)
    setBusy(true)
    try {
      const session = identity ? await currentSession() : null
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
    <div className="account-manage">
      {identity && (
        <>
          {!changing ? (
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => setChanging(true)}>
              {hasPassword ? 'Şifreni değiştir' : 'Şifre belirle'}
            </button>
          ) : (
            <form
              className="account-password"
              onSubmit={(e) => {
                e.preventDefault()
                void savePassword()
              }}
            >
              {!hasPassword && <p className="small muted">Google'la giriyorsun. Bir şifre belirlersen e-postan ve bu şifreyle de girebilirsin.</p>}
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
        </>
      )}
      <button type="button" className="btn btn-sm btn-quiet btn-text-danger" disabled={busy} onClick={() => setConfirming(true)}>
        Hesabımı sil
      </button>
      {confirming && (
        <ConfirmDialog title="Hesabın silinsin mi?" confirmLabel="Hesabımı sil" danger onConfirm={() => void remove()} onCancel={() => setConfirming(false)}>
          Hesabın, sunucuda eşitlenen verilerin, arkadaş kartın ve mail hatırlatmaların kalıcı olarak silinir; geri alınamaz. Bu cihazdaki kelimelerin ve ilerlemen silinmez, hesapsız kullanmaya devam edebilirsin. Paylaştığın listeler kalır: istersen önce liste sayfasından paylaşımı geri al.
        </ConfirmDialog>
      )}
    </div>
  )
}
