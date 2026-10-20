import { useEffect, useState } from 'react'
import { ACCOUNT_EVENT } from '../data/access'
import { getAccount } from './syncRunner'

/** Whether this device has an account (so there is something to sign out of); follows signing in and out. */
export function useHasAccount(): boolean {
  const [has, setHas] = useState(false)
  useEffect(() => {
    let live = true
    const check = () => {
      void getAccount()
        .catch(() => null)
        .then((account) => live && setHas(!!account))
    }
    check()
    window.addEventListener(ACCOUNT_EVENT, check)
    return () => {
      live = false
      window.removeEventListener(ACCOUNT_EVENT, check)
    }
  }, [])
  return has
}
