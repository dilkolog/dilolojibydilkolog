import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Server functions (api/) run on Vercel; in local development they are reached on the live site.
  server: { proxy: { '/api': { target: 'https://kelime-koc.vercel.app', changeOrigin: true } } },
  plugins: [
    react(),
    // Precaches the built app (JS, CSS, fonts, icons) so it opens and works without internet.
    // All data already lives in IndexedDB on the device.
    VitePWA({
      // A new version waits for the learner's "Yenile" (src/ui/update.ts) instead of replacing the app mid-session.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Only Latin glyphs are needed for TR/EN/FR/ES; the browser never requests the other subsets.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*'],
        // Server push reminders (public/push-sw.js).
        importScripts: ['push-sw.js'],
        // Word packs (src/data/wordpack.ts) are fetched when a language first needs one, then kept
        // for offline use; their names change with their content, so a kept one is never stale.
        runtimeCaching: [{ urlPattern: /\/assets\/(en|fr|es)-[\w-]+\.json$/, handler: 'CacheFirst', options: { cacheName: 'word-packs', expiration: { maxEntries: 6 } } }],
      },
      manifest: {
        name: 'Kelime Koçu',
        short_name: 'Kelime Koçu',
        description: 'Kişisel, adaptif kelime öğrenme',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#f1f5f9',
        theme_color: '#f1f5f9',
        orientation: 'portrait',
        id: '/',
        // Home-screen long-press menu.
        shortcuts: [
          { name: 'Hızlı tekrar (3 dakika)', short_name: 'Hızlı', url: '/?go=quick' },
          { name: 'Bugünkü çalışma', short_name: 'Çalış', url: '/?go=home' },
          { name: 'Kelime ekle', short_name: 'Ekle', url: '/?go=add' },
          { name: 'Okuma', short_name: 'Okuma', url: '/?go=reading' },
        ],
        // Android: "Share → Kelime Koçu" from any app sends the selected text here.
        share_target: { action: '/', method: 'GET', params: { title: 'share_title', text: 'share_text', url: 'share_url' } },
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
