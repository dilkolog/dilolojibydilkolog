import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { RESTORABLE, type Screen } from '../appNav'

/** Where a screen is: its name and, for those that have one, the thing it shows (a game, a verb, a word, a list). */
export const routeKey = (s: Screen) => {
  const extra = (s as { game?: string; verb?: string; entryId?: string; list?: string; lesson?: string }).game ?? (s as { verb?: string }).verb ?? (s as { entryId?: string }).entryId ?? (s as { list?: string }).list ?? (s as { lesson?: string }).lesson ?? ''
  return `${s.name}:${extra}`
}

/**
 * The browser's (and Android's) Back button walks back through the screens, instead of leaving the
 * app: each move to another screen adds a history entry, and Back brings the screen before it
 * back. A study session is not left by Back (its own button asks first); sessions and summaries are
 * not returned to afterwards. With nothing left to go back to, Back leaves the app as it always did.
 */
export function useScreenHistory(screen: Screen, setScreen: Dispatch<SetStateAction<Screen>>) {
  const earlier = useRef<Screen[]>([])
  const shown = useRef(screen)
  const popped = useRef(false)

  useEffect(() => {
    if (popped.current) {
      // This change is the Back button's own: nothing to add.
      popped.current = false
      shown.current = screen
      return
    }
    if (routeKey(shown.current) === routeKey(screen)) {
      shown.current = screen
      return
    }
    if (RESTORABLE.has(shown.current.name)) {
      earlier.current.push(shown.current)
      try {
        history.pushState({ screens: earlier.current.length }, '')
      } catch {
        // No history to add to (a sandboxed frame): Back just works as before.
      }
    }
    shown.current = screen
  }, [screen])

  useEffect(() => {
    const onPop = () => {
      if (shown.current.name === 'session') {
        // Stay in the session: the entry Back took is put back.
        try {
          history.pushState({ screens: earlier.current.length }, '')
        } catch {
          // Nothing to do.
        }
        return
      }
      const back = earlier.current.pop()
      if (!back) return
      popped.current = true
      setScreen(back)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [setScreen])
}
