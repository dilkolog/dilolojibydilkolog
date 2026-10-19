import { currentIdentity, signInWithGoogle, signOutSupabase, supabaseConfigured, type Identity } from '../data/supabase'
import { AccountManage, AccountDelete } from './AccountManage'
import { useEffect, useState } from 'react'
import { showToast } from './toastFeed'
import { ChartIcon, CheckIcon, LockIcon } from './icons'
import { db } from '../data/instance'
import { BackupVersionError } from '../data/db'
import { SyncAuthError, SyncConflictError, SyncMovedError, SyncApprovalError, SyncNotAllowedError, SyncTooLargeError, type Account } from '../data/sync'
import { relativeTime } from './format'
import type { AuthMode } from './AuthScreen'
import { CONFLICT, MOVED, getAccount, getSyncCode, NEWER_VERSION, NOT_ALLOWED, PENDING_APPROVAL, TOO_LARGE, runSync, setAccount } from './syncRunner'
import { RestorePoints } from './RestorePoints'
import { ACCOUNT_ART } from './drawnArt'
import { StatusPicture } from './StatusArt'
import { SyncSettings } from './SyncSettings'
import { useAccess } from './accessContext'
import { undoable } from './toastFeed'
import { GoogleMark } from './GoogleMark'

const STATUS_TEXT = { approved: 'Onaylı', rejected: 'Onaylanmadı', pending: 'Onay bekliyor' } as const

/**
 * Account in Settings. Signed in: who (name, email, how they sign in, the owner's approval), the sync
 * (when it last ran, a button to run it now), then the account's own controls (password, sign out,
 * delete). Signed out: the way in (Google in one tap, or the sign-in page) and what an account gives.
 */
export function AccountSettings({ onOpenAuth }: { onOpenAuth?: (mode: AuthMode) => void }) {
  const [account, setAcc] = useState<Account | null | undefined>(undefined)
  const [hasCode, setHasCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string; conflict?: boolean } | null>(null)
  const [at, setAt] = useState<Date | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const { status: access } = useAccess()
  const modern = supabaseConfigured()

  const refresh = async () => {
    const acc = await getAccount()
    setAcc(acc)
    setIdentity(acc ? await currentIdentity().catch(() => null) : null)
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
      setMessage({ ok: false, conflict: e instanceof SyncConflictError, text: e instanceof SyncMovedError ? MOVED : e instanceof SyncConflictError ? CONFLICT : e instanceof SyncApprovalError ? PENDING_APPROVAL : e instanceof SyncNotAllowedError ? NOT_ALLOWED : e instanceof BackupVersionError ? NEWER_VERSION : e instanceof SyncTooLargeError ? TOO_LARGE : e instanceof SyncAuthError ? 'Oturumun bu cihazda geçersiz; çıkış yapıp yeniden gir.' : 'Eşitlenemedi; internet bağlantını kontrol et.' })
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  const signOut = async () => {
    const previous = await getAccount()
    // This device's push reminders belong to the account that leaves: its record goes, the device stays subscribed.
    void import('./pushReminders').then((m) => m.forgetPushRecord())
    await setAccount(null)
    void refresh()
    if (identity) {
      await signOutSupabase()
      showToast('Bu cihazda çıkış yapıldı; kelimelerin ve ilerlemen cihazda duruyor.')
    } else
      undoable('Bu cihazda çıkış yapıldı; verilerin cihazda duruyor', async () => {
        await setAccount(previous)
        void refresh()
      })
  }

  /** A shared device: sync first (nothing is lost), then sign out and clear what this device holds. */
  const signOutAndWipe = async () => {
    try {
      await runSync(true)
    } catch {
      showToast('Önce hesabınla eşitlenemedi; verilerin silinmesin diye bir şey yapılmadı. İnternetini kontrol edip tekrar dene.', undefined, 7000, 'info')
      return
    }
    await import('./pushReminders').then((m) => m.forgetPushRecord())
    await setAccount(null)
    await signOutSupabase()
    await (await import('../data/deviceWipe')).wipeDevice()
    location.reload()
  }

  const google = async () => {
    try {
      await signInWithGoogle()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Google ile giriş açılamadı.', undefined, 5000, 'info')
    }
  }

  if (account === undefined) return null

  if (!account)
    return (
      <section className="card account-card is-out">
        <header className="account-intro">
          <img className="account-art" src={ACCOUNT_ART.out} alt="" height={72} />
          <div className="account-title">
            <h2 className="section-title">Hesabınla her cihazda</h2>
            <p className="small muted">{modern ? 'E-postanla ya da Google ile gir; kelimelerin, serin ve bahçen her cihazda seninle olsun.' : 'Bir hesapla ilerlemen sunucuda şifreli saklanır; her cihazda aynı kullanıcı adı ve şifreyle girersin.'}</p>
          </div>
        </header>
        {onOpenAuth && (
          <div className="account-cta">
            {modern && (
              <button className="btn account-google" onClick={() => void google()}>
                <GoogleMark /> Google ile devam et
              </button>
            )}
            <button className={modern ? 'btn btn-quiet' : 'btn'} onClick={() => onOpenAuth('login')}>
              {modern ? 'E-postayla giriş yap' : 'Giriş yap'}
            </button>
            <button className="btn btn-quiet" onClick={() => onOpenAuth('create')}>
              Hesap oluştur
            </button>
          </div>
        )}
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
              <strong>{modern ? 'Şifreni unutsan da kaybolmaz' : 'Sunucu içeriği göremez'}</strong>
              <p className="small muted">{modern ? 'Verilerin hesabına bağlı saklanır; şifreni unutursan e-postanla yenilersin.' : 'Veriler cihazında şifrenle şifrelenir; şifren hiçbir yere gönderilmez.'}</p>
            </div>
          </li>
          {!modern && (
            <li>
              <span className="perk-icon" aria-hidden>
                <CheckIcon size={18} />
              </span>
              <div>
                <strong>Hesap şart değil</strong>
                <p className="small muted">Hesapsız da kelime ekleyip çalışabilirsin; her şey bu cihazda durur. Eşitleme, çeviri ve yapay zekâ onaylı hesaplara açık.</p>
              </div>
            </li>
          )}
        </ul>
        {hasCode && <p className="small muted">Şu an eşitleme koduyla eşitliyorsun; hesaba geçince bu cihazdaki ilerleme hesaba taşınır.</p>}
        {!modern && (
          <details className="account-advanced">
            <summary className="small">Hesapsız: eşitleme koduyla eşitle (gelişmiş)</summary>
            <SyncSettings />
          </details>
        )}
      </section>
    )

  const status = access === 'approved' ? 'approved' : access === 'rejected' ? 'rejected' : 'pending'
  const name = identity?.name || identity?.email.split('@')[0] || account.username
  return (
    <section className="card account-card is-in">
      <header className="account-profile">
        {identity?.avatar ? (
          <img className="account-avatar" src={identity.avatar} alt="" width={64} height={64} referrerPolicy="no-referrer" />
        ) : (
          <img className="account-art" src={status === 'approved' ? ACCOUNT_ART.approved : status === 'rejected' ? ACCOUNT_ART.rejected : ACCOUNT_ART.pending} alt="" height={64} />
        )}
        <div className="account-who">
          <div className="account-who-header">
            <h2 className="account-name">{name}</h2>
            <span className={`status-pill ${status === 'approved' ? 'is-on' : 'is-off'}`} role="status">
              <i aria-hidden /> {STATUS_TEXT[status]}
            </span>
          </div>
          {identity?.email && <p className="account-email">{identity.email}</p>}
        </div>
      </header>

      {status !== 'approved' && access !== 'unknown' && (
        <p className="note account-wait" role="status">
          {status === 'rejected'
            ? 'Hesabın onaylanmadı. Kelime ekleme ve çalışma bu cihazda sürer; eşitleme, çeviri, videolar, haberler ve yapay zekâ kapalı kalır.'
            : 'Hesabın site sahibinin onayını bekliyor. O zamana kadar kelime ekleyip çalışabilirsin; onay gelince eşitleme, çeviri, videolar, haberler ve yapay zekâ kendiliğinden açılır.'}
        </p>
      )}

      <div className="account-sync">
        <div className="account-row-text">
          <strong>Bulut Eşitleme</strong>
          <span className="small muted">
            {at ? `Otomatik eşitleme aktif · Son: ${relativeTime(at)}` : 'Otomatik eşitleme aktif · Henüz eşitlenmedi'}
          </span>
        </div>
        <button className="btn btn-sm" onClick={syncNowClick} disabled={busy}>
          {busy ? 'Eşitleniyor…' : 'Şimdi eşitle'}
        </button>
      </div>
      {message?.conflict && <StatusPicture kind="conflict" />}
      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}

      <AccountManage account={account} identity={identity} onSignOut={() => void signOut()} onSignOutAndWipe={signOutAndWipe} />
      <RestorePoints />
      <AccountDelete account={account} identity={identity} onGone={() => void refresh()} />
    </section>
  )
}
