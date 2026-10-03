import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import { accountStatus, deriveAccount, SyncAuthError, type Account } from '../data/sync'
import { relativeTime } from './format'
import { getAccount, getSyncCode, runSync, setAccount, setSyncCode } from './syncRunner'
import { SyncSettings } from './SyncSettings'
import { undoable } from './toast'

/**
 * Account: sign in with a username and password and your progress is kept on the server and on
 * every device you sign in on. Everything is encrypted on the device with a key from the
 * password, so the server can't read it, and nobody without the password can read or replace it.
 */
export function AccountSettings() {
  const [account, setAcc] = useState<Account | null | undefined>(undefined)
  const [hasCode, setHasCode] = useState(false)
  const [mode, setMode] = useState<'login' | 'create'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [at, setAt] = useState<Date | null>(null)

  const refresh = async () => {
    setAcc(await getAccount())
    setHasCode(!!(await getSyncCode()))
    const v = (await db.meta.get('syncAt'))?.value as string | undefined
    setAt(v ? new Date(v) : null)
  }
  useEffect(() => {
    void refresh()
  }, [])

  const submit = async () => {
    setMessage(null)
    const name = username.trim()
    if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(name)) return setMessage({ ok: false, text: 'Kullanıcı adı 3–32 karakter olmalı (harf, rakam, nokta, tire).' })
    if (password.length < 8) return setMessage({ ok: false, text: 'Şifre en az 8 karakter olmalı.' })
    if (mode === 'create' && password !== repeat) return setMessage({ ok: false, text: 'Şifreler aynı değil.' })
    setBusy(true)
    try {
      const acc = await deriveAccount(name, password)
      const status = await accountStatus(acc)
      if (mode === 'login' && status === 'new') return setMessage({ ok: false, text: 'Bu kullanıcı adıyla hesap yok. Yeni hesap mı açmak istiyorsun? "Hesap oluştur"a geç.' })
      if (status === 'wrong') {
        return setMessage({ ok: false, text: mode === 'login' ? 'Şifre yanlış.' : 'Bu kullanıcı adı alınmış; başka bir ad seç.' })
      }
      // Signed in (or created): merge this device's progress with the account's and upload.
      await setAccount(acc)
      if (hasCode) await setSyncCode(null)
      await runSync(true)
      setPassword('')
      setRepeat('')
      setMessage({ ok: true, text: status === 'new' ? 'Hesabın oluşturuldu; ilerlemen kaydedildi.' : 'Giriş yapıldı; ilerlemen bu cihazla birleştirildi.' })
    } catch (e) {
      await setAccount(null)
      setMessage({ ok: false, text: e instanceof SyncAuthError ? 'Şifre yanlış.' : 'Bağlanılamadı; internet bağlantını kontrol et.' })
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  const syncNowClick = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await runSync(true)
      setMessage({ ok: true, text: 'Eşitlendi.' })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof SyncAuthError ? 'Hesap şifresi bu cihazda geçersiz; çıkış yapıp yeniden gir.' : 'Eşitlenemedi; internet bağlantını kontrol et.' })
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  if (account === undefined) return null
  return (
    <section className="card stack">
      <h2 className="section-title">Hesap</h2>
      {account ? (
        <>
          <p>
            👤 <strong>{account.username}</strong> olarak giriş yaptın. İlerlemen uygulamayı açtığında ve her oturumdan sonra kaydedilir; aynı hesapla
            girdiğin her cihazda aynısı olur.
          </p>
          <div className="row">
            <button className="btn btn-sm" onClick={syncNowClick} disabled={busy}>
              {busy ? 'Eşitleniyor…' : 'Şimdi eşitle'}
            </button>
            <span className="small muted">{at ? `Son kayıt ${relativeTime(at)}` : 'Henüz kaydedilmedi'}</span>
          </div>
          <div>
            <button
              className="link small"
              onClick={async () => {
                const previous = await getAccount()
                await setAccount(null)
                void refresh()
                undoable('Bu cihazda çıkış yapıldı; verilerin cihazda duruyor', async () => {
                  await setAccount(previous)
                  void refresh()
                })
              }}
            >
              Bu cihazda çıkış yap
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="small muted">
            Bir hesapla ilerlemen sunucuda saklanır: telefonda, bilgisayarda, yeni bir cihazda aynı kullanıcı adı ve şifreyle girersin, her şey gelir. Veriler
            cihazında şifrenle şifrelenir; sunucu içeriği göremez, şifren hiçbir yere gönderilmez.
          </p>
          <div className="segmented" role="tablist" aria-label="Hesap">
            <button role="tab" className="segmented-btn" aria-selected={mode === 'login'} onClick={() => (setMode('login'), setMessage(null))}>
              Giriş yap
            </button>
            <button role="tab" className="segmented-btn" aria-selected={mode === 'create'} onClick={() => (setMode('create'), setMessage(null))}>
              Hesap oluştur
            </button>
          </div>
          <form
            className="stack account-form"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <label className="field">
              <span className="small">Kullanıcı adı</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </label>
            <label className="field">
              <span className="small">Şifre</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} />
            </label>
            {mode === 'create' && (
              <label className="field">
                <span className="small">Şifre (tekrar)</span>
                <input className="input" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
              </label>
            )}
            <div>
              <button className="btn" type="submit" disabled={busy || !username.trim() || !password}>
                {busy ? 'Bekle…' : mode === 'create' ? 'Hesap oluştur' : 'Giriş yap'}
              </button>
            </div>
          </form>
          {mode === 'create' && (
            <p className="small muted">
              ⚠️ Şifreni unutursan veriler kurtarılamaz: şifre olmadan kimse (biz dahil) açamaz. Şifreni bir parola yöneticisine kaydet; ara sıra "Yedeği indir"
              ile ayrıca yedek al.
            </p>
          )}
          {hasCode && <p className="small muted">Şu an eşitleme koduyla eşitliyorsun; hesaba geçince bu cihazdaki ilerleme hesaba taşınır.</p>}
        </>
      )}
      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}
      {!account && (
        <details>
          <summary className="small">Hesapsız: eşitleme koduyla eşitle (gelişmiş)</summary>
          <SyncSettings />
        </details>
      )}
    </section>
  )
}
