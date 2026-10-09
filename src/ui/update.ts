/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register'
import { showToast } from './toastFeed'

const HOUR = 60 * 60 * 1000

/**
 * A new version is announced ("Yeni sürüm hazır · Yenile") instead of swapping the app out from
 * under the learner mid-session. An installed app left open checks for one every hour and whenever
 * it comes back to the foreground; until it is applied, the notice comes back with it.
 */
export function watchForUpdates() {
  if (!('serviceWorker' in navigator)) return
  let pending = false
  const announce = () => showToast('Yeni sürüm hazır', { label: 'Yenile', run: () => update(true) }, HOUR)
  const update = registerSW({
    onNeedRefresh() {
      pending = true
      announce()
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => {
        if (navigator.onLine) reg.update().catch(() => undefined)
      }
      window.setInterval(check, HOUR)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        if (pending) announce()
        else check()
      })
    },
  })
}
