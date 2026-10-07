import { useState } from 'react'
import { accountStatus, deriveAccount, SyncAuthError, SyncNotAllowedError } from '../data/sync'
import { BrandMark, ChevronLeftIcon, LockIcon } from './icons'
import { getSyncCode, NOT_ALLOWED, runSync, setAccount, setSyncCode } from './syncRunner'
import { showToast } from './toast'

export type AuthMode = 'login' | 'create'

/**
 * Signing in and creating an account on a page of their own: one form, one decision. Everything is
 * encrypted on the device with a key from the password, so the server can't read it and the
 * password never leaves the device.
 */
export function AuthScreen({ initialMode = 'login', onDone, onBack }: { initialMode?: AuthMode; onDone: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const creating = mode === 'create'

  const switchTo = (m: AuthMode) => {
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
      const status = await accountStatus(acc)
      if (!creating && status === 'new') return setError('Bu kullanıcı adıyla hesap yok. Yeni hesap açmak için "Hesap oluştur"a geç.')
      if (status === 'wrong') return setError(creating ? 'Bu kullanıcı adı alınmış; başka bir ad seç.' : 'Şifre yanlış.')
      // Signed in (or created): merge this device's progress with the account's and upload.
      await setAccount(acc)
      if (await getSyncCode()) await setSyncCode(null)
      await runSync(true)
      showToast(status === 'new' ? 'Hesabın oluşturuldu; ilerlemen kaydedildi.' : 'Giriş yapıldı; ilerlemen bu cihazla birleştirildi.')
      onDone()
    } catch (e) {
      await setAccount(null)
      setError(e instanceof SyncNotAllowedError ? NOT_ALLOWED : e instanceof SyncAuthError ? 'Şifre yanlış.' : 'Bağlanılamadı; internet bağlantını kontrol et.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <button className="link auth-back" onClick={onBack}>
        <ChevronLeftIcon size={16} /> Ayarlar
      </button>
      <div className="auth-card card">
        <div className="auth-head">
          <span className="brand-mark auth-mark">
            <BrandMark size={30} />
          </span>
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
