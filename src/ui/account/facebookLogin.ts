import { useEffect, useState } from 'react'
import { supabaseConfigured } from '../../data/supabase'

let asked: Promise<boolean> | null = null

/** Whether the owner turned Facebook sign-in on (admin screen); asked once a visit, false when the server cannot say. */
export function facebookLoginOn(): Promise<boolean> {
  if (!supabaseConfigured()) return Promise.resolve(false)
  asked ??= fetch('/api/access?signin=1')
    .then((r): Promise<{ facebook?: boolean }> | { facebook?: boolean } => (r.ok ? r.json() : {}))
    .then((r) => r.facebook === true)
    .catch(() => false)
  return asked
}

export function useFacebookLogin(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let live = true
    void facebookLoginOn().then((v) => live && setOn(v))
    return () => {
      live = false
    }
  }, [])
  return on
}
