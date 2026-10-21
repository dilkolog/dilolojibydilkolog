import { currentIdentity, signInWithGoogle, supabaseConfigured, type Identity } from '../data/supabase'
import { AccountManage, AccountDelete } from './AccountManage'
import { useEffect, useState } from 'react'
import { showToast } from './toastFeed'
import { ChartIcon, LockIcon } from './icons'
import { db } from '../data/instance'
import { syncUsage, type Account } from '../data/sync'
import type { AuthMode } from './AuthScreen'
import { getAccount } from './syncRunner'
import { HandleForm, HandleTag } from './AccountHandle'
import { useAccountHandle } from './useAccountHandle'
import { ACCOUNT_ART } from './drawnArt'
import { StatusPicture } from './StatusArt'
import { useAccess } from './accessContext'
import { GoogleMark } from './GoogleMark'
import { signOutThisDevice } from './signOut'

const STATUS_TEXT = { approved: 'Onaylı', rejected: 'Onaylanmadı', pending: 'Onay bekliyor' } as const

/**
 * Account in Settings. Signed in: who (name, @name, email, the owner's approval), then the account's own
 * controls (how they sign in, password, sign out, delete). Syncing runs by itself (useLiveSync) and needs no
 * button; only a problem it left behind (files too big to take along, the data nearing the limit) is shown. Signed out: the way in (Google in one tap, or the sign-in page) and what an account gives.
 */
export function AccountSettings({ onOpenAuth }: { onOpenAuth?: (mode: AuthMode) => void }) {
  const [account, setAcc] = useState<Account | null | undefined>(undefined)
  const [size, setSize] = useState<number | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const { status: access } = useAccess()
  const modern = supabaseConfigured()
  const handle = useAccountHandle(access === 'approved')

  const refresh = async () => {
    const acc = await getAccount()
    setAcc(acc)
    setIdentity(acc ? await currentIdentity().catch(() => null) : null)
    const bytes = (await db.meta.get('syncSize'))?.value
    setSize(typeof bytes === 'number' ? bytes : null)
    const left = (await db.meta.get('syncSkipped'))?.value
    setSkipped(typeof left === 'number' ? left : 0)
  }
  useEffect(() => {
    void refresh()
  }, [])

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
            <HandleTag handle={handle} />
            <span className={`status-pill ${status === 'approved' ? 'is-on' : 'is-off'}`} role="status">
              <i aria-hidden /> {STATUS_TEXT[status]}
            </span>
          </div>
          {identity?.email && <p className="account-email">{identity.email}</p>}
          <HandleForm handle={handle} />
        </div>
      </header>

      {status !== 'approved' && access !== 'unknown' && (
        <p className="note account-wait" role="status">
          {status === 'rejected'
            ? 'Hesabın onaylanmadı. Kelime ekleme ve çalışma bu cihazda sürer; eşitleme, çeviri, videolar, haberler ve yapay zekâ kapalı kalır.'
            : 'Hesabın site sahibinin onayını bekliyor. O zamana kadar kelime ekleyip çalışabilirsin; onay gelince eşitleme, çeviri, videolar, haberler ve yapay zekâ kendiliğinden açılır.'}
        </p>
      )}

      {skipped > 0 && (
        <p className="note" role="status">
          {skipped} görsel/ses kaydı eşitlenemedi (çok büyük ya da yüklenemedi). Kelimelerin ve ilerlemen eşitlendi; o dosyalar bu cihazda duruyor.
        </p>
      )}
      {size !== null && syncUsage(size).warn && (
        <div className="status-note">
          <StatusPicture kind="full" small />
          <p className="note">
            Eşitlenen veri: {syncUsage(size).label} (%{syncUsage(size).percent}). En büyük eşitleme dosyası sunucunun sınırına yaklaşıyor; kullanmadığın okuma metinlerini ya da eski çeviri belleğini azaltmak yer açar.
          </p>
        </div>
      )}

      <AccountManage account={account} identity={identity} onSignOut={() => void signOut()} />
      <AccountDelete account={account} identity={identity} onGone={() => void refresh()} />
    </section>
  )
}
