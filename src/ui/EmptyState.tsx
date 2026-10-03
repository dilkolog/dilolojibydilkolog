import type { ReactNode } from 'react'
import { Plant } from './Plant'

/**
 * An empty screen as an invitation: the garden's plant at the stage that fits (a seedling for
 * "nothing here yet", a flower for "all clear"), what this place is for, and what to do next.
 */
export function EmptyState({ stage = 1, title, children, action }: { stage?: number; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="empty-state">
      <span className="empty-art" aria-hidden>
        <Plant stage={stage} size={64} />
      </span>
      <div className="stack gap-2">
        <h2 className="section-title">{title}</h2>
        <p className="muted">{children}</p>
        {action && <div className="row mt-2">{action}</div>}
      </div>
    </section>
  )
}
