import '../lazy.css'
import { useState } from 'react'
import { BackupVersionError, DEFAULT_SETTINGS } from '../data/db'
import { db } from '../data/instance'
import { probeAccount, requestAccess } from '../data/access'
import { deriveAccount, SyncAuthError, SyncApprovalError, SyncConflictError, SyncNotAllowedError, SyncTooLargeError } from '../data/sync'
import { reportError } from '../data/errorReport'
import { ChevronLeftIcon, LockIcon } from './icons'
import { CONFLICT, getSyncCode, NEWER_VERSION, NOT_ALLOWED, PENDING_APPROVAL, runSync, setAccount, setSyncCode, TOO_LARGE } from './syncRunner'
import { showToast } from './toastFeed'
import { BrandLogo } from './BrandLogo'
import { supabaseConfigured } from '../data/supabase'
import { SupabaseAuth } from './SupabaseAuth'

export type AuthMode = 'login' | 'create' | 'return'

/**
 * A failed sign-in said "check your connection" for every cause. Only a failed fetch (TypeError) is a
 * connection problem; anything else shows what the server or the merge answered, so it can be told apart.
 */
function failureText(e: unknown): string {
  if (e instanceof TypeError) return 'Sunucuya bağlanılamadı; internet bağlantını kontrol et.'
  const detail = e instanceof Error ? e.message : String(e)
  return `Giriş tamamlanamadı (${detail}). Biraz sonra tekrar dene; sürerse bu kodu site sahibine ilet.`
}

/**
 * Signing in and creating an account on a page of their own: one form, one decision. Everything is
 * encrypted on the device with a key from the password, so the server can't read it and the
 * password never leaves the device.
 */
/** `onBack` is left out where an account is required (nothing to go back to). */
export function AuthScreen(props: { initialMode?: AuthMode; onDone: () => void; onBack?: () => void }) {
  // With Supabase set up, people sign in there (email, a link, Google); the username form is the old way.
  if (supabaseConfigured()) return <SupabaseAuth {...props} />
  return <UsernameAuth {...props} initialMode={props.initialMode === 'create' ? 'create' : 'login'} />
}

function UsernameAuth({ initialMode = 'login', onDone, onBack }: { initialMode?: 'login' | 'create'; onDone: () => void; onBack?: () => void }) {
  const [mode, setMode] = useState<'login' | 'create'>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const creating = mode === 'create'

  const switchTo = (m: 'login' | 'create') => {
    setMode(m)
    setError('')
    setRepeat('')
  }

  const submit = async () => {
    setError('')
    const name = username.trim()
    if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(name)) return setError('Kullanıcı adı 3–32 karakter olmalı (harf, rakam, nokta, tire).')
    if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.')
    if (creating && password !== repeat) return setError('Şifreler aynı değil.')
    setBusy(true)
    try {
      const acc = await deriveAccount(name, password)
      // Whether the name is taken and the password fits: the access check says so without needing approval.
      const probe = await probeAccount(acc)
      const status = !probe.exists ? 'new' : probe.match ? 'ok' : 'wrong'
      if (!creating && status === 'new') return setError('Bu kullanıcı adıyla hesap yok. Yeni hesap açmak için "Hesap oluştur"a geç.')
      if (status === 'wrong') return setError(creating ? 'Bu kullanıcı adı alınmış; başka bir ad seç.' : 'Şifre yanlış.')
      await setAccount(acc)
      if (await getSyncCode()) await setSyncCode(null)
      // A new account goes to the site owner for approval, with its username and the note.
      if (status === 'new') await requestAccess(acc, name, note)
      // Signed in (or created): merge this device's progress with the account's and upload, once approved.
      let waiting = false
      try {
        await runSync(true)
      } catch (e) {
        if (!(e instanceof SyncApprovalError)) throw e
        waiting = true
      }
      try {
        const settings = (await db.getSettings()) ?? DEFAULT_SETTINGS
        if (!settings.profile.name.trim()) {
          await db.saveSettings({ ...settings, profile: { ...settings.profile, name } })
        }
      } catch {
        // ignore
      }
      showToast(waiting ? 'Hesabın site sahibinin onayını bekliyor; onaylanınca eşitleme ve diğer özellikler açılır.' : status === 'new' ? 'Hesabın oluşturuldu; ilerlemen kaydedildi.' : 'Giriş yapıldı; ilerlemen bu cihazla birleştirildi.')
      onDone()
    } catch (e) {
      await setAccount(null)
      setError(e instanceof SyncApprovalError ? PENDING_APPROVAL : e instanceof SyncNotAllowedError ? NOT_ALLOWED : e instanceof BackupVersionError ? NEWER_VERSION : e instanceof SyncAuthError ? 'Şifre yanlış.' : e instanceof SyncConflictError ? CONFLICT : e instanceof SyncTooLargeError ? TOO_LARGE : failureText(e))
      if (!(e instanceof SyncApprovalError || e instanceof SyncAuthError)) reportError(e, 'sign-in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {onBack && (
        <button className="link auth-back" onClick={onBack}>
          <ChevronLeftIcon size={16} /> Ayarlar
        </button>
      )}
      <div className="auth-card card">
        <div className="auth-head">
          <BrandLogo className="auth-mark" size={30} />
          <h1 className="auth-title">{creating ? 'Hesap oluştur' : 'Hesabına giriş yap'}</h1>
          <p className="muted">{creating ? 'İlerlemen sunucuda şifreli saklanır; her cihazda aynı kullanıcı adı ve şifreyle devam edersin.' : 'İlerlemen bu cihazdakiyle birleşir ve her cihazda aynı olur.'}</p>
        </div>

        <div className="segmented auth-tabs" role="tablist" aria-label="Hesap">
          <button role="tab" className="segmented-btn" aria-selected={!creating} onClick={() => switchTo('login')}>
            Giriş yap
          </button>
          <button role="tab" className="segmented-btn" aria-selected={creating} onClick={() => switchTo('create')}>
            Hesap oluştur
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <label className="field">
            <span className="field-label">Kullanıcı adı</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Şifre</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={creating ? 'new-password' : 'current-password'} />
            {creating && <span className="help">En az 8 karakter</span>}
          </label>
          {creating && (
            <label className="field">
              <span className="field-label">Şifre (tekrar)</span>
              <input className="input" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
            </label>
          )}
          {creating && (
            <label className="field">
              <span className="field-label">Kendini kısaca tanıt (isteğe bağlı)</span>
              <input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Kimsin, uygulamayı ne için kullanacaksın?" />
              <span className="help">Hesaplar site sahibinin onayından geçer. Kullanıcı adın ve bu not ona gönderilir; şifren ve verilerin gönderilmez.</span>
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn auth-submit" type="submit" disabled={busy || !username.trim() || !password}>
            {busy ? 'Bekle…' : creating ? 'Hesap oluştur' : 'Giriş yap'}
          </button>
        </form>

        <div className="auth-note">
          <LockIcon size={16} />
          <p className="small muted">
            Veriler cihazında şifrenle şifrelenir; sunucu içeriği göremez, şifren hiçbir yere gönderilmez.
            {creating && ' Şifreni unutursan veriler kurtarılamaz: bir parola yöneticisine kaydet.'}
          </p>
        </div>
      </div>
    </div>
  )
}
