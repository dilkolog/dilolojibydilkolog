import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabaseConfigured } from '../data/supabase'
import { ACCOUNT_EVENT, approvalEnabled, cachedAccess, forgetAccess, getStoredAccount, probeAccount, requestAccess, saveAccess, type AccessStatus } from '../data/access'
import type { AccessState } from './accessContext'
import { notify } from './noticeCenter'
import { accountNotice } from './noticeTexts'

/** How often a waiting account asks whether it has been approved. */
const POLL_MS = 5 * 60_000

/**
 * The approval status of this device's account: the last answer at once (kept on the device), then
 * the server's, again when the app comes back to the front, when the account changes and, while it
 * waits, every few minutes. An account the owner has not heard of (one that existed before approval
 * began, or a failed sign-up) files its request itself.
 */
export function useAccessStatus(): AccessState {
  const [status, setStatus] = useState<AccessState['status']>('unknown')
  // An account that was waiting and has now been decided on: a notice (the badge in the top bar only says "waiting").
  const was = useRef<AccessState['status']>('unknown')
  useEffect(() => {
    if (was.current === 'pending' && (status === 'approved' || status === 'rejected')) void notify(accountNotice(status))
    was.current = status
  }, [status])

  const refresh = useCallback(async () => {
    const account = await getStoredAccount().catch(() => null)
    const cached = await cachedAccess().catch(() => null)
    setStatus(cached ?? (account ? 'none' : 'signedOut'))
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (!account) {
      // A visitor: everything is open until the owner has set approval up; then these screens wait for an account.
      const enabled = await approvalEnabled()
      if (enabled === false) {
        await saveAccess('approved')
        setStatus('approved')
      } else if (enabled === true) {
        await forgetAccess()
        setStatus('signedOut')
      }
      return
    }
    try {
      const probe = await probeAccount(account)
      let next: AccessStatus = probe.match ? probe.status : 'none'
      // With Supabase sign-in the server turns old username requests away (410), every time the app comes to the front: an old account just waits to be replaced by a sign-in.
      if (next === 'none' && !supabaseConfigured()) next = await requestAccess(account, account.username)
      else await saveAccess(next)
      setStatus(next)
    } catch {
      // Offline or the server is busy: what the device last heard stands.
    }
  }, [])

  useEffect(() => {
    void refresh()
    const again = () => void refresh()
    const onVisible = () => document.visibilityState === 'visible' && again()
    window.addEventListener(ACCOUNT_EVENT, again)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, again)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    if (status !== 'pending') return
    const t = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(t)
  }, [status, refresh])

  return useMemo(() => ({ status, approved: status === 'approved', refresh }), [status, refresh])
}
