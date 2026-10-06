import type { ReactNode } from 'react'

/**
 * The top of every main screen, in one pattern: its name, one line on what it is for, and its main
 * action on the right (on phones, below).
 */
/** `inline`: the action stays beside the title even on a phone (a small button, not a wide one). */
export function PageHeader({ title, sub, action, inline = false }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; inline?: boolean }) {
  return (
    <header className={`page-header${inline ? ' is-inline' : ''}`}>
      <div className="page-header-text">
        <h1 className="greeting">{title}</h1>
        {sub && <p className="greeting-sub">{sub}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  )
}
