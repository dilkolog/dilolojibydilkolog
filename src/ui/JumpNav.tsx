import { type ReactNode, useState } from 'react'
import { ChevronDownIcon } from './icons'

/** A long page in groups: a sticky row of shortcuts that jumps to each group's title. */
export function JumpNav({ groups, label, onPick }: { groups: readonly (readonly [string, string])[]; label: string; /** Called first, so a collapsed group can open before the page scrolls to it. */ onPick?: (id: string) => void }) {
  return (
    <nav className="settings-nav" aria-label={label}>
      {groups.map(([id, name]) => (
        <button key={id} className="chip chip-sm" onClick={() => {
            onPick?.(id)
            // After the click's render, so a group that just opened is there to scroll to.
            requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
          }}>
          {name}
        </button>
      ))}
    </nav>
  )
}

/** A group title that opens and closes its group (the page keeps the group's content out of the DOM while closed). */
export function GroupToggle({ id, icon, open, onToggle, children }: { id: string; icon?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <h2 id={id} className="settings-group-title">
      <button type="button" className="group-toggle" aria-expanded={open} onClick={onToggle}>
        {icon && <span className="group-icon">{icon}</span>}
        {children}
        <ChevronDownIcon size={18} className="group-chevron" />
      </button>
    </h2>
  )
}

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
