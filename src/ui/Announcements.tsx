import { useEffect } from 'react'
import { notify } from './noticeCenter'
import { announceNotice } from './noticeTexts'
import { showToast } from './toastFeed'

/** Asked once a visit (a dev-mode double effect asks once too). */
let asked = false

/**
 * The owner's announcement (admin screen → Duyuru) reaches every signed-in person once: it goes into the bell, and a
 * toast says it when it is new. Nothing when there is none, offline, or the server cannot say. Renders nothing.
 */
export function Announcements({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if (!signedIn || asked) return
    asked = true
    void (async () => {
      try {
        const res = await fetch('/api/access?news=1')
        if (!res.ok) return
        const { announcement } = (await res.json()) as { announcement?: { id: string; text: string; at: string } | null }
        if (!announcement?.id || !announcement.text) return
        const key = `diloloji:announce-seen`
        let seen = ''
        try {
          seen = localStorage.getItem(key) ?? ''
        } catch {
          // No storage: the bell keeps it once anyway.
        }
        await notify(announceNotice(announcement.id, announcement.text, announcement.at))
        if (seen !== announcement.id) {
          showToast(`Duyuru: ${announcement.text}`, undefined, 8000, 'info')
          try {
            localStorage.setItem(key, announcement.id)
          } catch {
            // Shown again next visit; harmless.
          }
        }
      } catch {
        // Offline or no server: next visit.
      }
    })()
  }, [signedIn])
  return null
}
