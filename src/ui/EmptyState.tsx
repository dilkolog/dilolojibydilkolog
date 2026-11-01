import type { ReactNode } from 'react'
import { EmptyArt, EmptyPicture, type ArtKind, type PictureKind } from './EmptyArt'
import { STICKER } from './drawnArt'
import type { StickerName } from './Sticker'

const PICTURES = new Set<string>(['shelf', 'nothing-found', 'offline', 'rest', 'clean', 'cardbox', 'labels', 'together'])

/**
 * An empty screen as an invitation: a small picture of what belongs here, what this place is
 * for in a sentence, and the one thing to do next.
 */
export function EmptyState({
  art,
  sticker,
  title,
  children,
  action,
}: {
  /** A drawn line picture or a picture of the place; or, instead, one of Monki's stickers. */
  art?: ArtKind | PictureKind
  sticker?: StickerName
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="empty-state">
      <span className="empty-art" aria-hidden>
        {sticker ? (
          <img className="empty-picture" src={STICKER[sticker]} alt="" draggable={false} />
        ) : art && PICTURES.has(art) ? (
          <EmptyPicture kind={art as PictureKind} />
        ) : (
          <EmptyArt kind={(art ?? 'library') as ArtKind} />
        )}
      </span>
      <div className="empty-body">
        <h2 className="section-title">{title}</h2>
        <p className="muted">{children}</p>
        {action && <div className="empty-action">{action}</div>}
      </div>
    </section>
  )
}
