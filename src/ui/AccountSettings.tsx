import { useEffect, useState } from 'react'
import { showToast } from './toast'
import { ChartIcon, CheckIcon, GlobeIcon, LockIcon, UserIcon } from './icons'
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
      showToast('Eşitlendi.')
    } catch (e) {
      setMessage({ ok: false, text: e instanceof SyncAuthError ? 'Hesap şifresi bu cihazda geçersiz; çıkış yapıp yeniden gir.' : 'Eşitlenemedi; internet bağlantını kontrol et.' })
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  if (account === undefined) return null
  return (
    <section className={`card account-card ${account ? 'is-in' : 'is-out'}`}>
      <header className="account-head">
        <span className="account-mark" aria-hidden>
          {account ? <span className="account-initial">{account.username.slice(0, 1).toUpperCase()}</span> : <GlobeIcon size={24} />}
        </span>
        <div className="account-title">
          <h2 className="section-title">Giriş ve eşitleme</h2>
          {account ? (
            <span className="status-pill is-on" role="status">
              <i aria-hidden /> Giriş yapıldı
            </span>
          ) : (
            <span className="status-pill is-off">
              <i aria-hidden /> {hasCode ? 'Eşitleme koduyla' : 'Bu cihazda, hesapsız'}
            </span>
          )}
        </div>
      </header>
      {account ? (
        <>
          <dl className="account-facts">
            <div>
              <dt className="small muted">Hesap</dt>
              <dd>
                <UserIcon size={16} /> {account.username}
              </dd>
              <p className="small muted">Aynı kullanıcı adı ve şifreyle girdiğin her cihazda ilerlemen aynı olur.</p>
            </div>
            <div>
              <dt className="small muted">Eşitleme</dt>
              <dd>{at ? `Son kayıt ${relativeTime(at)}` : 'Henüz kaydedilmedi'}</dd>
              <p className="small muted">Uygulamayı açtığında ve her oturumdan sonra kendiliğinden.</p>
            </div>
          </dl>
          <div className="account-actions">
            <button className="btn btn-sm" onClick={syncNowClick} disabled={busy}>
              {busy ? 'Eşitleniyor…' : 'Şimdi eşitle'}
            </button>
            <button
              className="btn btn-sm btn-quiet btn-text-danger"
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
          <p className="small muted account-foot">Çıkış yapınca verilerin bu cihazda kalır; istediğinde yeniden girersin.</p>
        </>
      ) : (
        <>
          <p className="muted account-lead">Bir hesapla ilerlemen sunucuda şifreli saklanır; her cihazda aynı kullanıcı adı ve şifreyle girersin.</p>
          <ul className="account-perks">
            <li>
              <span className="perk-icon" aria-hidden>
                <ChartIcon size={18} />
              </span>
              <div>
                <strong>Her cihazda aynı ilerleme</strong>
                <p className="small muted">Telefon, tablet, bilgisayar: kelimelerin, serin ve bahçen yanında.</p>
              </div>
            </li>
            <li>
              <span className="perk-icon" aria-hidden>
                <LockIcon size={18} />
              </span>
              <div>
                <strong>Sunucu içeriği göremez</strong>
                <p className="small muted">Veriler cihazında şifrenle şifrelenir; şifren hiçbir yere gönderilmez.</p>
              </div>
            </li>
            <li>
              <span className="perk-icon" aria-hidden>
                <CheckIcon size={18} />
              </span>
              <div>
                <strong>Hesap şart değil</strong>
                <p className="small muted">Hesapsız da kullanabilirsin; her şey bu cihazda durur.</p>
              </div>
            </li>
          </ul>
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
        <details className="account-advanced">
          <summary className="small">Hesapsız: eşitleme koduyla eşitle (gelişmiş)</summary>
          <SyncSettings />
        </details>
      )}
    </section>
  )
}
