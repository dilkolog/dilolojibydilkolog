import { useEffect, useState } from 'react'

/**
 * On a phone browser, a one-time card about installing the app: on Android a real install
 * button, on iPhone the Share → Add to Home Screen steps (Safari has no install prompt). The
 * installed app opens full screen and is the only way to get reminders on iPhone.
 */
const DISMISS_KEY = 'kelime-koc:install-hint'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// The browser offers this once, early; keep it until the card asks for it.
let deferred: InstallPrompt | null = null
const waiting = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPrompt
    waiting.forEach((fn) => fn())
  })
}

const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isPhone = () => matchMedia('(pointer: coarse)').matches

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function InstallHint() {
  const [hidden, setHidden] = useState(() => dismissed() || standalone() || !isPhone())
  const [canPrompt, setCanPrompt] = useState(() => !!deferred)
  useEffect(() => {
    const fn = () => setCanPrompt(true)
    waiting.add(fn)
    return () => {
      waiting.delete(fn)
    }
  }, [])
  const ios = isIos()
  if (hidden || (!ios && !canPrompt)) return null

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage blocked: the card comes back next time, nothing worse.
    }
    setHidden(true)
  }

  return (
    <section className="card stack install-hint">
      <div className="row justify-between">
        <strong>Uygulama olarak yükle</strong>
        <button className="link small" onClick={close}>
          Gizle
        </button>
      </div>
      {ios ? (
        <p className="small">
          Safari'de alttaki <strong>Paylaş</strong> düğmesine (kare ve yukarı ok) dokun, <strong>Ana Ekrana Ekle</strong>'yi seç. Kelime Koçu tam ekran açılır,
          internet olmadan da çalışır ve akşam hatırlatma bildirimi alabilirsin.
        </p>
      ) : (
        <>
          <p className="small">Ana ekranından tam ekran açılır, internet olmadan da çalışır.</p>
          <div>
            <button
              className="btn"
              onClick={async () => {
                if (!deferred) return
                await deferred.prompt()
                const { outcome } = await deferred.userChoice
                deferred = null
                if (outcome === 'accepted') close()
                else setCanPrompt(false)
              }}
            >
              Yükle
            </button>
          </div>
        </>
      )}
    </section>
  )
}
