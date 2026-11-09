import { BrandMark } from './icons'

/** The app's mark: the leaf that is also a speech bubble, on its coloured square. */
export function BrandLogo({ className = '', size }: { className?: string; size?: number }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden>
      <BrandMark size={size} />
    </span>
  )
}
