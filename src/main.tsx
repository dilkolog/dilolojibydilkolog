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
import App from './App.tsx'
import { applyDensity } from './ui/density'
import { watchForUpdates } from './ui/update'

applyDensity()
watchForUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
