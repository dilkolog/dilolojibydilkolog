import { useEffect, type RefObject } from 'react'
import { modalOpen } from './session/keys'

/**
 * Number keys pick an option: 1 presses the group's first button, 2 the second… (up to 9), as in the study session.
 * Nothing happens while typing in a field, with a modifier held, over an open dialog, or on a button already used.
 */
export function useNumberKeys(group: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || !/^[1-9]$/.test(e.key)) return
      const t = e.target
      if (t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable)) return
      if (modalOpen()) return
      const button = group.current?.querySelectorAll<HTMLButtonElement>(':scope > button')[Number(e.key) - 1]
      if (!button || button.disabled) return
      e.preventDefault()
      button.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [group])
}
