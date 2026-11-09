import { useState } from 'react'

/**
 * Which groups of a long page are open. On a phone only `starting` ones are (the page is long); a
 * wide screen shows everything. When `storageKey` is provided, user choices are remembered across
 * visits and reloads.
 */
export function useGroups(ids: readonly string[], starting: readonly string[], storageKey?: string) {
  const [opened, setOpened] = useState<Set<string>>(() => {
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((x): x is string => typeof x === 'string' && ids.includes(x))
            return new Set(valid)
          }
        }
      } catch {
        // Fall back to default
      }
    }
    const wide = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 64rem)').matches
    return new Set(wide ? ids : starting)
  })

  const persist = (next: Set<string>) => {
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]))
      } catch {
        // Ignore quota/storage restrictions
      }
    }
    return next
  }

  return {
    isOpen: (id: string) => opened.has(id),
    open: (id: string) => setOpened((s) => persist(new Set(s).add(id))),
    toggle: (id: string) =>
      setOpened((s) => persist(s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set(s).add(id))),
  }
}
