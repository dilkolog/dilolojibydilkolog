import { useEffect, useState } from 'react'
import { showToast } from './toastFeed'
import { ChartIcon, CheckIcon, GlobeIcon, LockIcon, UserIcon } from './icons'
import { db } from '../data/instance'
import { BackupVersionError } from '../data/db'
import { SyncAuthError, SyncConflictError, SyncApprovalError, SyncNotAllowedError, SyncTooLargeError, type Account } from '../data/sync'
import { relativeTime } from './format'
import type { AuthMode } from './AuthScreen'
import { CONFLICT, getAccount, getSyncCode, NEWER_VERSION, NOT_ALLOWED, PENDING_APPROVAL, TOO_LARGE, runSync, setAccount } from './syncRunner'
import { RestorePoints } from './RestorePoints'
import { StatusPicture } from './StatusArt'
import { SyncSettings } from './SyncSettings'
import { AdminAccess } from './AdminAccess'
import { useAccess } from './accessContext'
import { undoable } from './toastFeed'

/**
 * Account in Settings: who is signed in and syncing, or the way to the sign-in page (AuthScreen),
 * where signing in and creating an account have a page of their own. Everything is encrypted on
 * the device with a key from the password, so the server can't read it.
 */
export function AccountSettings({ onOpenAuth }: { onOpenAuth?: (mode: AuthMode) => void }) {
  const [account, setAcc] = useState<Account | null | undefined>(undefined)
  const [hasCode, setHasCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string; conflict?: boolean } | null>(null)
  const [at, setAt] = useState<Date | null>(null)
  const { status: access } = useAccess()

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
      setMessage({ ok: false, conflict: e instanceof SyncConflictError, text: e instanceof SyncConflictError ? CONFLICT : e instanceof SyncApprovalError ? PENDING_APPROVAL : e instanceof SyncNotAllowedError ? NOT_ALLOWED : e instanceof BackupVersionError ? NEWER_VERSION : e instanceof SyncTooLargeError ? TOO_LARGE : e instanceof SyncAuthError ? 'Hesap şifresi bu cihazda geçersiz; çıkış yapıp yeniden gir.' : 'Eşitlenemedi; internet bağlantını kontrol et.' })
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
          <GlobeIcon size={22} />
        </span>
        <div className="account-title">
          <h2 className="section-title">Giriş ve eşitleme</h2>
          {account ? (
            <span className={`status-pill ${access === 'approved' ? 'is-on' : 'is-off'}`} role="status">
              <i aria-hidden /> {access === 'approved' ? 'Giriş yapıldı, onaylı' : access === 'rejected' ? 'Giriş yapıldı, onaylanmadı' : 'Giriş yapıldı, onay bekliyor'}
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
          {access !== 'approved' && access !== 'unknown' && (
            <p className="note" role="status">
              {access === 'rejected'
                ? 'Hesabın onaylanmadı. Kelime ekleme ve çalışma bu cihazda çalışmaya devam eder; eşitleme, çeviri, videolar, haber ve dinleme kaynakları, yapay zekâ kapalı kalır.'
                : 'Hesabın site sahibinin onayını bekliyor. O zamana kadar kelime ekleme ve çalışma çalışır; eşitleme, çeviri, videolar, haber ve dinleme kaynakları, yapay zekâ onaydan sonra açılır.'}
            </p>
          )}
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
          <p className="small muted account-foot">Çıkış yapınca yalnızca eşitleme kapanır: profilin, ilerlemen ve kelimelerin bu cihazda kalır; istediğinde yeniden girersin.</p>
          <RestorePoints />
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
                <p className="small muted">Hesapsız da kelime ekleyip çalışabilirsin; profilin, ilerlemen ve kelimelerin bu cihazda durur (çıkış yapsan da silinmez). Eşitleme, çeviri ve yapay zekâ gibi özellikler site sahibinin onayladığı hesaplara açık.</p>
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
      {message?.conflict && <StatusPicture kind="conflict" />}
      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}
      <AdminAccess />
      {!account && (
        <details className="account-advanced">
          <summary className="small">Hesapsız: eşitleme koduyla eşitle (gelişmiş)</summary>
          <SyncSettings />
        </details>
      )}
    </section>
  )
}
