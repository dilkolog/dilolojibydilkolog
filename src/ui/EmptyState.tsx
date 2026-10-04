import type { ReactNode } from 'react'
import { EmptyArt, type ArtKind } from './EmptyArt'

/**
 * An empty screen as an invitation: a small picture of what belongs here, what this place is
 * for in a sentence, and the one thing to do next.
 */
export function EmptyState({ art, title, children, action }: { art: ArtKind; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="empty-state">
      <span className="empty-art" aria-hidden>
        <EmptyArt kind={art} />
      </span>
      <div className="empty-body">
        <h2 className="section-title">{title}</h2>
        <p className="muted">{children}</p>
        {action && <div className="empty-action">{action}</div>}
      </div>
    </section>
  )
}
