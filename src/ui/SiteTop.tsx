import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'

/**
 * The bar on top of the pages a visitor sees before signing in (the landing page, the sign-in page): the logo on the
 * left takes them to the landing page, as on most sites; what else the page offers sits on the right.
 */
export function SiteTop({ onHome, children }: { onHome?: () => void; children?: ReactNode }) {
  return (
    <header className="lp-top">
      <a
        className="lp-brand"
        href="/"
        aria-label="Diloloji ana sayfa"
        onClick={(e) => {
          if (!onHome) return
          e.preventDefault()
          onHome()
        }}
      >
        <BrandLogo />
        <span>Diloloji</span>
      </a>
      {children && <div className="lp-top-actions">{children}</div>}
    </header>
  )
}
