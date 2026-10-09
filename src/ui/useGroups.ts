import { useState } from 'react'

/**
 * Which groups of a long page are open. On a phone only `starting` ones are (the page is long); a
 * wide screen shows everything.
 */
export function useGroups(ids: readonly string[], starting: readonly string[]) {
  const [opened, setOpened] = useState<Set<string>>(() => new Set(window.matchMedia('(min-width: 64rem)').matches ? ids : starting))
  return {
    isOpen: (id: string) => opened.has(id),
    open: (id: string) => setOpened((s) => new Set(s).add(id)),
    toggle: (id: string) => setOpened((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set(s).add(id))),
  }
}
