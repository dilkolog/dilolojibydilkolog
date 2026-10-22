import { useEffect, useRef, useState } from 'react'

/**
 * Cloudflare Turnstile, the "are you a person" check in front of the sign-in forms (a bot opening accounts by the
 * hundred, or trying passwords, stops here). Most people see nothing or one box to tick. The script comes from
 * challenges.cloudflare.com (allowed in the CSP) only when the form shows it; the token goes to Supabase with the call,
 * which checks it with Turnstile's secret. A token is good for one call: the form changes `round` after each try and
 * the widget hands out a new one.
 */
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')))
    script.onerror = () => {
      loading = null
      reject(new Error('turnstile unavailable'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export function Turnstile({ siteKey, round, onToken }: { siteKey: string; round: number; onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const api = useRef<TurnstileApi | null>(null)
  const report = useRef(onToken)
  report.current = onToken
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    // A token from an earlier widget (the form was left and opened again) is not this one's.
    report.current(null)
    loadTurnstile()
      .then((t) => {
        if (!alive || !box.current) return
        api.current = t
        widget.current = t.render(box.current, {
          sitekey: siteKey,
          language: 'tr',
          theme: 'auto',
          size: 'flexible',
          callback: (token: string) => report.current(token),
          'expired-callback': () => report.current(null),
          'error-callback': () => report.current(null),
        })
      })
      .catch(() => {
        if (!alive) return
        report.current(null)
        setFailed(true)
      })
    return () => {
      alive = false
      if (widget.current && api.current) api.current.remove(widget.current)
      widget.current = null
    }
  }, [siteKey])

  // After a try the token is spent: a fresh check.
  useEffect(() => {
    if (round === 0 || !widget.current || !api.current) return
    report.current(null)
    api.current.reset(widget.current)
  }, [round])

  return (
    <div className="auth-captcha">
      <div ref={box} />
      {failed && <p className="small muted">Robot kontrolü yüklenemedi; bağlantını kontrol edip sayfayı yenile ya da Google ile devam et.</p>}
    </div>
  )
}
