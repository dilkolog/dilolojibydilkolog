import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

/** The build's date and commit, shown in Settings → Yardım so a bug report says which version it came from. */
function buildId(): string {
  const day = new Date().toISOString().slice(0, 10)
  try {
    return `${day} · ${execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`
  } catch {
    return day
  }
}

/**
 * Everyone has an account: a production build without the Supabase sign-in settings would open the app to people with none
 * (the gate is built in only when they are there). So such a build fails, instead of being deployed by mistake. The builds the
 * tests use (no sign-in on purpose) say so with VITE_ALLOW_GUEST=1.
 */
function requireSignIn(): import('vite').Plugin {
  return {
    name: 'require-sign-in',
    apply: 'build',
    configResolved(config) {
      if (config.mode !== 'production' || process.env.VITE_ALLOW_GUEST === '1') return
      const url = String(config.env.VITE_SUPABASE_URL ?? '').trim()
      const key = String(config.env.VITE_SUPABASE_PUBLISHABLE_KEY || config.env.VITE_SUPABASE_ANON_KEY || '').trim()
      if (!/^https:\/\//.test(url) || !key) {
        throw new Error('Giriş ayarı yok: derleme için VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY gerekli (herkesin hesabı olmak zorunda). Hesapsız test derlemesi: VITE_ALLOW_GUEST=1.')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  // The tests assume a build without the sign-in gate; a developer's .env.local (needed by deploy:cf) must not leak in.
  test: { env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_SUPABASE_ANON_KEY: '' } },
  // Drawings are never inlined into the scripts: a small one would otherwise ride in the start-up
  // bundle as base64 (larger, not cacheable on its own) even when its screen is never opened.
  build: {
    assetsInlineLimit: (file) => (file.endsWith('.webp') ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/guide/lessons-fr')) return 'guide-lessons-fr'
          if (id.includes('src/data/guide/lessons-es')) return 'guide-lessons-es'
          if (id.includes('src/data/guide/lessons-en')) return 'guide-lessons-en'
          if (id.includes('src/data/grammar/fr-') || id.includes('src/data/grammar/basics-fr')) return 'grammar-fr'
          if (id.includes('src/data/grammar/es-') || id.includes('src/data/grammar/basics-es')) return 'grammar-es'
          if (id.includes('src/data/grammar/en-') || id.includes('src/data/grammar/basics-en')) return 'grammar-en'
        },
      },
    },
  },
  // Server functions (api/) run on Vercel; in local development they are reached on the live site.
  server: { proxy: { '/api': { target: 'https://diloloji.com', changeOrigin: true } } },
  plugins: [
    requireSignIn(),
    react(),
    // Precaches the built app (JS, CSS, fonts, icons) so it opens and works without internet.
    // All data already lives in IndexedDB on the device.
    VitePWA({
      // A new version waits for the learner's "Yenile" (src/ui/update.ts) instead of replacing the app mid-session.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The static pages (about, privacy, terms, account deletion) and /.well-known (the Android app's
        // assetlinks.json) are files, not app screens: never answer them with the app's index.html.
        navigateFallbackDenylist: [/^\/hakkinda/, /^\/gizlilik/, /^\/kosullar/, /^\/hesap-silme/, /^\/\.well-known\//, /^\/api\//],
        // Only Latin glyphs are needed for TR/EN/FR/ES; the browser never requests the other subsets.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*', 'fonts/**', 'mail/**'],
        // The static pages' fonts (public/fonts) and the mails' pictures (public/mail) are served to those who open them, not stored on every device.
        // Server push reminders (public/push-sw.js).
        importScripts: ['push-sw.js'],
        // Word packs (src/data/wordpack.ts) are fetched when a language first needs one, then kept
        // for offline use; their names change with their content, so a kept one is never stale.
        runtimeCaching: [
          { urlPattern: /\/assets\/(en|fr|es)-[\w-]+\.json$/, handler: 'CacheFirst', options: { cacheName: 'word-packs', expiration: { maxEntries: 6 } } },
          // Drawings (src/assets/art, ~2.5 MB in all) are kept once seen rather than precached:
          // their names change with their content too, and most screens show only a few.
          { urlPattern: /\/assets\/[\w-]+\.webp$/, handler: 'CacheFirst', options: { cacheName: 'art', expiration: { maxEntries: 250 } } },
        ],
      },
      manifest: {
        name: 'Diloloji',
        short_name: 'Diloloji',
        description: 'Kişisel, adaptif kelime öğrenme',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#f1f5f9',
        theme_color: '#f1f5f9',
        orientation: 'portrait',
        id: '/',
        // The Android app (android/twa-manifest.json) opens this site full screen; what it may show is this scope.
        scope: '/',
        categories: ['education'],
        // Home-screen long-press menu.
        shortcuts: [
          { name: 'Hızlı tekrar (3 dakika)', short_name: 'Hızlı', url: '/?go=quick' },
          { name: 'Bugünkü çalışma', short_name: 'Çalış', url: '/?go=home' },
          { name: 'Kelime ekle', short_name: 'Ekle', url: '/?go=add' },
          { name: 'Okuma', short_name: 'Okuma', url: '/?go=reading' },
        ],
        // Android: "Share → Diloloji" from any app sends the selected text here.
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
