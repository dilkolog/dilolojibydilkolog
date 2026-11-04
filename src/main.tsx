import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/literata/400.css'
import '@fontsource/literata/400-italic.css'
import '@fontsource/literata/600.css'
import '@fontsource/lexend/400.css'
import '@fontsource/lexend/500.css'
import '@fontsource/lexend/600.css'
import '@fontsource/lexend/700.css'
import './index.css'
import './engine/conjugationData'
import App from './App.tsx'
import { RootBoundary } from './ui/RootBoundary'
import { applyDensity } from './ui/density'
import { watchForUpdates } from './ui/update'
import { installFocusTrap } from './ui/focusTrap'
import { installErrorReporting } from './data/errorReport'
import { dropBootHero } from './ui/bootHero'
import { reloadForNewVersion } from './ui/chunkError'

applyDensity()
watchForUpdates()
installFocusTrap()
installErrorReporting()
// A safety net: the landing page's first lines from index.html never stay over the app for long.
setTimeout(dropBootHero, 15_000)
// A screen's files from before a deploy are gone: Vite says so here before the import fails; the page reloads
// once to the new version (see chunkError.ts).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootBoundary>
      <App />
    </RootBoundary>
  </StrictMode>,
)
