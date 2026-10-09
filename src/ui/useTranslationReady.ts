import { useEffect, useState } from 'react'
import { translationReady } from '../data/translate'

/** Whether sentence translation is on (the server has a key); false until known. */
export function useTranslationReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    void translationReady().then((r) => live && setReady(r))
    return () => {
      live = false
    }
  }, [])
  return ready
}
