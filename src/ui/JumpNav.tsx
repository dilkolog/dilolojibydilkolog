import type { ReactNode } from 'react'

/** A long page in groups: a sticky row of shortcuts that jumps to each group's title. */
export function JumpNav({ groups, label }: { groups: readonly (readonly [string, string])[]; label: string }) {
  return (
    <nav className="settings-nav" aria-label={label}>
      {groups.map(([id, name]) => (
        <button key={id} className="chip chip-sm" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
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
