import { useEffect, type ReactNode } from 'react'
import { SiteTop } from '../home/SiteTop'
import { startLanguage } from '../home/startLanguage'

/**
 * Around the sign-in page: before signing in it is a page of the site, with the landing page's bar on top (the logo
 * goes back there); inside the app (Settings) it is just the page.
 */
export function AuthFrame({ onHome, children }: { onHome?: () => void; children: ReactNode }) {
  // Opened straight from a mail link: the language picked on the landing page before still colours the page.
  useEffect(() => {
    const root = document.documentElement
    const picked = startLanguage()
    if (onHome && picked && !root.dataset.lang) root.dataset.lang = picked
  }, [onHome])
  if (!onHome) return <>{children}</>
  return (
    <div className="auth-site">
      <SiteTop onHome={onHome} />
      <main className="auth-main">{children}</main>
    </div>
  )
}
