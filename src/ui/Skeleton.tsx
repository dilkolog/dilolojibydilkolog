import type { SkeletonKind } from './skeletonFor'
export type { SkeletonKind } from './skeletonFor'

/**
 * Placeholder while a screen loads, in the layout of that screen (soft blocks with a gentle
 * shimmer), so the page doesn't jump when the content arrives.
 */
export function ScreenSkeleton({ kind = 'grid' }: { kind?: SkeletonKind }) {
  return (
    <div className={`skeleton sk-${kind}`} role="status" aria-label="Yükleniyor">
      {kind !== 'session' && kind !== 'detail' && (
        <>
          <span className="sk sk-title" />
          <span className="sk sk-line" />
        </>
      )}
      {kind === 'home' && (
        <div className="sk-cols">
          <div className="sk-col">
            <span className="sk sk-card sk-hero" />
            <span className="sk sk-card" />
            <div className="sk-grid">
              <span className="sk sk-card sk-small" />
              <span className="sk sk-card sk-small" />
            </div>
          </div>
          <div className="sk-col">
            <span className="sk sk-card" />
            <span className="sk sk-card sk-list" />
          </div>
        </div>
      )}
      {kind === 'list' && (
        <>
          <span className="sk sk-tabs" />
          <span className="sk sk-toolbar" />
          <div className="sk-rows">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="sk sk-row" />
            ))}
          </div>
        </>
      )}
      {kind === 'detail' && (
        <>
          <span className="sk sk-back" />
          <span className="sk sk-card sk-hero" />
          <span className="sk sk-tabs" />
          <div className="sk-grid">
            <span className="sk sk-card" />
            <span className="sk sk-card" />
          </div>
        </>
      )}
      {kind === 'settings' && (
        <div className="sk-settings">
          <div className="sk-menu">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="sk sk-menu-item" />
            ))}
          </div>
          <div className="sk-col">
            <span className="sk sk-line" />
            <span className="sk sk-card sk-list" />
          </div>
        </div>
      )}
      {kind === 'session' && (
        <div className="sk-session">
          <span className="sk sk-progress" />
          <span className="sk sk-card sk-question" />
        </div>
      )}
      {kind === 'grid' && (
        <div className="sk-grid">
          <span className="sk sk-card sk-card-tall" />
          <span className="sk sk-card" />
          <span className="sk sk-card" />
        </div>
      )}
    </div>
  )
}

/** Placeholder lines for a small block that is loading (instead of a line of text saying so). `label` is what a screen reader hears. */
export function LinesSkeleton({ lines = 3, label = 'Yükleniyor' }: { lines?: number; label?: string }) {
  return (
    <div className="sk-inline" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="sk sk-line" style={{ width: `${100 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  )
}

/** Placeholder pictures for a grid that is loading. */
export function TilesSkeleton({ count = 4, label = 'Yükleniyor' }: { count?: number; label?: string }) {
  return (
    <div className="sk-tiles" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="sk sk-tile" />
      ))}
    </div>
  )
}
