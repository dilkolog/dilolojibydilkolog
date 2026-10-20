import { currentIdentity, signInWithGoogle, supabaseConfigured, type Identity } from '../data/supabase'
import { AccountManage, AccountDelete } from './AccountManage'
import { useEffect, useState } from 'react'
import { showToast } from './toastFeed'
import { ChartIcon, LockIcon } from './icons'
import { db } from '../data/instance'
import { BackupVersionError } from '../data/db'
import { SyncAuthError, SyncConflictError, SyncMovedError, SyncApprovalError, SyncNotAllowedError, SyncTooLargeError, type Account } from '../data/sync'
import { relativeTime } from './format'
import type { AuthMode } from './AuthScreen'
import { CONFLICT, MOVED, getAccount, NEWER_VERSION, NOT_ALLOWED, PENDING_APPROVAL, TOO_LARGE, runSync } from './syncRunner'
import { RestorePoints } from './RestorePoints'
import { ACCOUNT_ART } from './drawnArt'
import { StatusPicture } from './StatusArt'
import { useAccess } from './accessContext'
import { GoogleMark } from './GoogleMark'
import { signOutThisDevice } from './signOut'

const STATUS_TEXT = { approved: 'Onaylı', rejected: 'Onaylanmadı', pending: 'Onay bekliyor' } as const

/**
 * Account in Settings. Signed in: who (name, email, how they sign in, the owner's approval), the sync
 * (when it last ran, a button to run it now), then the account's own controls (password, sign out,
 * delete). Signed out: the way in (Google in one tap, or the sign-in page) and what an account gives.
 */
export function AccountSettings({ onOpenAuth }: { onOpenAuth?: (mode: AuthMode) => void }) {
  const [account, setAcc] = useState<Account | null | undefined>(undefined)
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
    await signOutThisDevice(identity)
    void refresh()
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
        </ul>
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
          <strong>Verilerin hesabında</strong>
          <span className="small muted">
            {busy ? 'Eşitleniyor…' : at ? `Değişiklikler kendiliğinden gider · son eşitleme ${relativeTime(at)}` : 'Değişiklikler kendiliğinden gider · henüz eşitlenmedi'}
          </span>
        </div>
        <button className="link small" onClick={syncNowClick} disabled={busy}>
          Şimdi eşitle
        </button>
      </div>
      {message?.conflict && <StatusPicture kind="conflict" />}
      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}

      <AccountManage account={account} identity={identity} onSignOut={() => void signOut()} />
      <RestorePoints />
      <AccountDelete account={account} identity={identity} onGone={() => void refresh()} />
    </section>
  )
}
