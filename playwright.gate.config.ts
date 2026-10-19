import { defineConfig, devices } from '@playwright/test'

/**
 * The sign-in gate, in a real browser. The normal E2E build has no Supabase (so the app opens straight
 * away); this one is built with a fake Supabase address, which turns the mandatory account on. Every
 * request to that address is stubbed by the tests.
 *   npm run test:e2e:gate
 */
const PORT = process.env.E2E_GATE_PORT ?? '4189'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/gate.e2e.ts',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-gate' }]] : [['list']],
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: 'block' },
  webServer: { command: `npx vite preview --outDir dist-gate --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: true },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
})
