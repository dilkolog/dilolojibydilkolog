/**
 * A grey outline of a screen while its code or data loads: the layout appears at once instead of
 * an empty page with "Yükleniyor…", so opening a screen feels immediate.
 */
export function ScreenSkeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Yükleniyor">
      <span className="sk sk-title" />
      <span className="sk sk-line" />
      <div className="sk-grid">
        <span className="sk sk-card sk-card-tall" />
        <span className="sk sk-card" />
        <span className="sk sk-card" />
      </div>
    </div>
  )
}
