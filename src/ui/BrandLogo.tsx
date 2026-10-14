import brandMonki from '../assets/art/brand-monki.webp'

/** The app's mark: Monki's head on its orange square, as on the home-screen icon. */
export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-mark brand-mark-monki ${className}`.trim()} aria-hidden>
      <img className="brand-monki" src={brandMonki} alt="" draggable={false} />
    </span>
  )
}
