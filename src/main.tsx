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

applyDensity()
watchForUpdates()
installFocusTrap()
installErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootBoundary>
      <App />
    </RootBoundary>
  </StrictMode>,
)
