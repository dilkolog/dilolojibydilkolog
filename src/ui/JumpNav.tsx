import type { ReactNode } from 'react'
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

export function GroupTitle({ id, icon, children }: { id: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <h2 id={id} className="settings-group-title">
      {icon && <span className="group-icon">{icon}</span>}
      {children}
    </h2>
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
