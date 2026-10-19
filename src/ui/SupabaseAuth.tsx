import { ACCOUNT_ART } from './drawnArt'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { approvalEnabled } from '../data/access'
import { reportError } from '../data/errorReport'
import { VaultError } from '../data/vault'
import { clearReturn, currentSession, isRecoveryReturn, returnError, sendMagicLink, sendPasswordReset, setNewPassword, signIn, signInWithGoogle, signUp, supabase, authErrorText } from '../data/supabase'
import { ChevronLeftIcon, LockIcon } from './icons'
import { BrandLogo } from './BrandLogo'
import { completeSignIn, vaultErrorText, type SignInOutcome } from './signInFlow'
import { showToast } from './toastFeed'

export type SupabaseMode = 'login' | 'create' | 'return'
/** The keyboard opens by itself only where there is one at hand: on a phone it would cover the sign-in buttons. */
const FINE_POINTER = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches

type Step = 'login' | 'create' | 'magic' | 'reset' | 'sent' | 'recovery' | 'working'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Google's "G", in its colours (a sign-in button people recognise). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/**
 * Signing in with Supabase: email and password, a link by email, or Google; a password forgotten is
 * reset by email. The first time, the person's progress on this device (or their old username
 * account) is tied to them; after that any device needs only the sign-in.
 */
export function SupabaseAuth({ initialMode = 'login', onDone, onBack }: { initialMode?: SupabaseMode; onDone: () => void; onBack?: () => void }) {
  const [step, setStep] = useState<Step>(initialMode === 'return' ? 'working' : initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [username, setUsername] = useState('')
  const [note, setNote] = useState('')
  const [sentWhat, setSentWhat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Whether the owner approves accounts at all: the sign-up text about it is only true then (until known, it is left out).
  const [approvalOn, setApprovalOn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const session = useRef<Session | null>(null)

  useEffect(() => {
    let alive = true
    void approvalEnabled().then((on) => alive && setApprovalOn(on === true))
    return () => {
      alive = false
    }
  }, [])

  const finish = (outcome: SignInOutcome) => {
    showToast(outcome.waiting ? 'Giriş yapıldı. Hesabın site sahibinin onayını bekliyor; onaylanınca eşitleme ve diğer özellikler açılır.' : outcome.fresh ? 'Hoş geldin! Hesabın hazır.' : 'Giriş yapıldı; ilerlemen bu cihazla birleştirildi.')
    onDone()
  }

  const attempt = async (work: () => Promise<void>) => {
    setError('')
    setBusy(true)
    try {
      await work()
    } catch (e) {
      setError(vaultErrorText(e) ?? (e instanceof Error ? authErrorText(e.message) : String(e)))
      // The server or the merge failing is worth a look; a wrong password or a typo is not.
      if (e instanceof VaultError ? e.reason === 'unavailable' : !(e instanceof Error) || e.name !== 'Error') reportError(e, 'supabase-sign-in')
    } finally {
      setBusy(false)
    }
  }

  // Back from an email link or Google: the library reads the address, then the sign-in completes.
  useEffect(() => {
    if (initialMode !== 'return') return
    const failed = returnError()
    const recovery = isRecoveryReturn()
    void (async () => {
      if (failed) {
        clearReturn()
        setStep('login')
        setError(authErrorText(failed))
        return
      }
      await supabase()
      const s = await currentSession().catch(() => null)
      clearReturn()
      if (!s) {
        setStep('login')
        setError('Bağlantının süresi dolmuş ya da kullanılmış; yeniden giriş yap.')
        return
      }
      session.current = s
      if (recovery) return setStep('recovery')
      await attempt(async () => finish(await completeSignIn(s)))
    })()
  }, [initialMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Step) => {
    setStep(s)
    setError('')
    setRepeat('')
  }

  const submit = () =>
    attempt(async () => {
      const mail = email.trim()
      if (!EMAIL.test(mail)) throw new Error('Geçerli bir e-posta adresi yaz.')
      if (step === 'magic') {
        await sendMagicLink(mail)
        setSentWhat('Giriş bağlantısını gönderdik. E-postandaki bağlantıya dokun; uygulama girişi tamamlar.')
        return setStep('sent')
      }
      if (step === 'reset') {
        await sendPasswordReset(mail)
        setSentWhat('Şifre yenileme bağlantısını gönderdik. E-postandaki bağlantıya dokun, yeni şifreni yaz.')
        return setStep('sent')
      }
      if (password.length < 8) throw new Error('Şifre en az 8 karakter olmalı.')
      if (step === 'create') {
        if (password !== repeat) throw new Error('Şifreler aynı değil.')
        const name = username.trim()
        if (name && !/^[\p{L}\p{N}._-]{3,32}$/u.test(name)) throw new Error('Ad 3–32 karakter olmalı (harf, rakam, nokta, tire).')
        const ready = await signUp(mail, password, { username: name || undefined, note: note.trim() || undefined })
        if (!ready) {
          setSentWhat('Hesabın oluşturuldu. E-postana gelen onay bağlantısına dokun; uygulama girişi tamamlar.')
          return setStep('sent')
        }
      } else await signIn(mail, password)
      const s = await currentSession()
      if (!s) throw new Error('Giriş tamamlanamadı; tekrar dene.')
      session.current = s
      finish(await completeSignIn(s))
    })

  const title: Record<Step, string> = {
    login: 'Hesabına giriş yap',
    create: 'Hesap oluştur',
    magic: 'E-postayla giriş',
    reset: 'Şifreni yenile',
    sent: 'E-postana bak',
    recovery: 'Yeni şifre',
    working: 'Giriş yapılıyor…',
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
          {step === 'login' || step === 'create' ? <img className="account-art auth-art" src={ACCOUNT_ART.out} alt="" height={84} draggable={false} /> : <BrandLogo className="auth-mark" size={30} />}
          <h1 className="auth-title">{title[step]}</h1>
          {step === 'login' && <p className="muted">Giriş yap: ilerlemen her cihazda aynı olur.</p>}
          {step === 'create' && <p className="muted">E-postanla bir hesap aç; her cihazda aynı ilerlemeyle devam et.</p>}
        </div>

        {(step === 'login' || step === 'create') && (
          <div className="segmented auth-tabs" role="tablist" aria-label="Hesap">
            <button role="tab" className="segmented-btn" aria-selected={step === 'login'} onClick={() => go('login')}>
              Giriş yap
            </button>
            <button role="tab" className="segmented-btn" aria-selected={step === 'create'} onClick={() => go('create')}>
              Hesap oluştur
            </button>
          </div>
        )}

        {(step === 'login' || step === 'create') && (
          <>
            <button type="button" className="btn btn-quiet auth-google" disabled={busy} onClick={() => void attempt(() => signInWithGoogle())}>
              <GoogleMark /> Google ile devam et
            </button>
            <p className="auth-or small muted">ya da e-postayla</p>
          </>
        )}

        {(step === 'login' || step === 'create' || step === 'magic' || step === 'reset') && (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <label className="field">
              <span className="field-label">E-posta</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="off" spellCheck={false} autoFocus={FINE_POINTER} />
            </label>
            {(step === 'login' || step === 'create') && (
              <label className="field">
                <span className="field-label">Şifre</span>
                <input className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={step === 'create' ? 'new-password' : 'current-password'} />
                {step === 'create' && <span className="help">En az 8 karakter</span>}
              </label>
            )}
            {(step === 'login' || step === 'create') && (
              <button type="button" className="link small" aria-pressed={showPassword} onClick={() => setShowPassword((on) => !on)}>
                {showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              </button>
            )}
            {step === 'create' && (
              <>
                <label className="field">
                  <span className="field-label">Şifre (tekrar)</span>
                  <input className="input" type={showPassword ? 'text' : 'password'} value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
                </label>
                <label className="field">
                  <span className="field-label">Adın (isteğe bağlı)</span>
                  <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="nickname" maxLength={32} />
                </label>
                {approvalOn && (
                  <label className="field">
                    <span className="field-label">Kendini kısaca tanıt (isteğe bağlı)</span>
                    <input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Kimsin, uygulamayı ne için kullanacaksın?" />
                    <span className="help">Hesaplar site sahibinin onayından geçer; adın, e-postan ve bu not ona görünür.</span>
                  </label>
                )}
              </>
            )}
            {step === 'magic' && <p className="small muted">Şifre gerekmez: e-postana bir giriş bağlantısı göndeririz. Hesabın yoksa o bağlantı hesabını da açar.</p>}
            {step === 'reset' && <p className="small muted">E-postana bir bağlantı göndeririz; ona dokunup yeni şifreni yazarsın. Verilerin olduğu gibi kalır.</p>}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="btn auth-submit" type="submit" disabled={busy || !email.trim() || ((step === 'login' || step === 'create') && !password)}>
              {busy ? 'Bekle…' : step === 'create' ? 'Hesap oluştur' : step === 'login' ? 'Giriş yap' : 'Bağlantı gönder'}
            </button>
            {step === 'login' && (
              <div className="auth-links small">
                <button type="button" className="link" onClick={() => go('magic')}>
                  Şifresiz giriş: bağlantı gönder
                </button>
                <button type="button" className="link" onClick={() => go('reset')}>
                  Şifremi unuttum
                </button>
              </div>
            )}
            {(step === 'magic' || step === 'reset') && (
              <button type="button" className="link small" onClick={() => go('login')}>
                Şifreyle giriş yap
              </button>
            )}
          </form>
        )}

        {step === 'sent' && (
          <div className="stack gap-2">
            <p>{sentWhat}</p>
            <p className="small muted">Gelmediyse istenmeyen (spam) klasörüne bak. Bağlantıyı bu cihazda aç.</p>
            <p className="small muted">Uygulamayı telefonda ana ekrana eklediysen bağlantı tarayıcıda açılır ve uygulamaya geçmez: uygulamada Google ile ya da şifreyle giriş yap.</p>
            <button type="button" className="link small" onClick={() => go('login')}>
              Giriş ekranına dön
            </button>
          </div>
        )}

        {step === 'working' && (
          <div className="auth-working" role="status">
            {!error && <span className="auth-spinner" aria-hidden />}
            <p className="muted">{error ? 'Giriş tamamlanamadı.' : 'Hesabın hazırlanıyor…'}</p>
          </div>
        )}
        {step === 'working' && error && (
          <>
            <p className="error auth-error" role="alert">
              {error}
            </p>
            <div className="stack gap-2">
              {session.current && (
                <button type="button" className="btn auth-submit" disabled={busy} onClick={() => void attempt(async () => finish(await completeSignIn(session.current!)))}>
                  {busy ? 'Bekle…' : 'Tekrar dene'}
                </button>
              )}
              <button type="button" className="link small" onClick={() => go('login')}>
                Giriş ekranına dön
              </button>
            </div>
          </>
        )}

        {step === 'recovery' && <Recovery onSaved={() => session.current && void attempt(async () => finish(await completeSignIn(session.current!)))} />}


        <div className="auth-note">
          <LockIcon size={16} />
          <p className="small muted">Şifreni unutsan da verilerin kaybolmaz: e-postanla yenilersin.</p>
          <p className="small muted auth-legal">
            Devam edersen <a href="/kosullar.html" target="_blank" rel="noopener">Kullanım koşulları</a> ve <a href="/gizlilik.html" target="_blank" rel="noopener">Gizlilik politikası</a> geçerli olur.
          </p>
        </div>
      </div>
    </div>
  )
}

function Recovery({ onSaved }: { onSaved: () => void }) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="auth-form"
      onSubmit={(e) => {
        e.preventDefault()
        setError('')
        if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.')
        if (password !== repeat) return setError('Şifreler aynı değil.')
        setBusy(true)
        setNewPassword(password)
          .then(() => {
            showToast('Yeni şifren kaydedildi.')
            onSaved()
          })
          .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
          .finally(() => setBusy(false))
      }}
    >
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
      <button className="btn auth-submit" type="submit" disabled={busy || !password}>
        {busy ? 'Bekle…' : 'Şifreyi kaydet'}
      </button>
    </form>
  )
}
