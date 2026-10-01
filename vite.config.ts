import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Precaches the built app (JS, CSS, fonts, icons) so it opens and works without internet.
    // All data already lives in IndexedDB on the device.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Only Latin glyphs are needed for TR/EN/FR/ES; the browser never requests the other subsets.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*'],
      },
      manifest: {
        name: 'Kelime Koçu',
        short_name: 'Kelime Koçu',
        description: 'Kişisel, adaptif kelime öğrenme',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#f2f4f6',
        theme_color: '#2b5ba6',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
