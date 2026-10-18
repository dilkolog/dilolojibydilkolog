import { useEffect, useState } from 'react'
import { ACCOUNT_EVENT } from '../data/access'
import { hasStoredSession, supabaseConfigured } from '../data/supabase'
import { getAccount } from './syncRunner'

/**
 * Whether this device is signed in. With Supabase set up an account is required: the app waits at the
 * sign-in page until there is one (a device still on the old username account counts as signed out; its
 * words and progress stay and merge into the new account). Without Supabase (local development, tests)
 * there is no sign-in to ask for. `undefined` while the device is being checked.
 */
export function useSignedIn(): boolean | undefined {
  const [signedIn, setSignedIn] = useState<boolean | undefined>(supabaseConfigured() ? undefined : true)
  useEffect(() => {
    if (!supabaseConfigured()) return
    let live = true
    const check = () => {
      void getAccount()
        .catch(() => null)
        .then((account) => {
          if (live) setSignedIn(!!account && hasStoredSession())
        })
    }
    check()
    window.addEventListener(ACCOUNT_EVENT, check)
    return () => {
      live = false
      window.removeEventListener(ACCOUNT_EVENT, check)
    }
  }, [])
  return signedIn
}
