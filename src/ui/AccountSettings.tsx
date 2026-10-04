import { useEffect, useState } from 'react'
import { UserIcon } from './icons'
import { db } from '../data/instance'
import { SyncAuthError, type Account } from '../data/sync'
import { relativeTime } from './format'
import type { AuthMode } from './AuthScreen'
import { getAccount, getSyncCode, runSync, setAccount } from './syncRunner'
import { SyncSettings } from './SyncSettings'
import { undoable } from './toast'

/**
 * Account in Settings: who is signed in and syncing, or the way to the sign-in page (AuthScreen),
 * where signing in and creating an account have a page of their own. Everything is encrypted on
 * the device with a key from the password, so the server can't read it.
 */
export function AccountSettings({ onOpenAuth }: { onOpenAuth?: (mode: AuthMode) => void }) {
  const [account, setAcc] = useState<Account | null | undefined>(undefined)
  const [hasCode, setHasCode] = useState(false)
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
      <h2 className="section-title">Giriş ve eşitleme</h2>
      {account ? (
        <>
          <p>
            <UserIcon size={16} className="inline-icon" />
            <strong>{account.username}</strong> olarak giriş yaptın. İlerlemen uygulamayı açtığında ve her oturumdan sonra kaydedilir; aynı hesapla
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
            Bir hesapla ilerlemen sunucuda şifreli saklanır: telefonda, bilgisayarda, yeni bir cihazda aynı kullanıcı adı ve şifreyle girersin, her şey gelir.
          </p>
          {onOpenAuth && (
            <div className="account-cta">
              <button className="btn" onClick={() => onOpenAuth('login')}>
                Giriş yap
              </button>
              <button className="btn btn-quiet" onClick={() => onOpenAuth('create')}>
                Hesap oluştur
              </button>
            </div>
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
