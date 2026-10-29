import { defineConfig, devices } from '@playwright/test'

/**
 * Real-browser checks of what happy-dom can't see: layout (overflow, where buttons sit on a
 * phone), contrast as rendered, keyboard focus. Runs against the production build.
 *   npm run test:e2e
 */
/**
 * The preview server's port. Two checkouts testing at once (two agents, two git worktrees) must not
 * share one: with reuseExistingServer the second run would test the first one's build. E2E_PORT=4180.
 */
const PORT = process.env.E2E_PORT ?? '4179'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  fullyParallel: true,
  // Under load (several workers on one machine) a wait of five seconds is too tight for animations and background
  // writes; a real failure still fails, just a little later. One retry: a test that passes on it is reported as
  // "flaky" in the summary (it stays visible), and a click stuck on an element that went away fails after 15 s
  // instead of using up the whole test's time.
  expect: { timeout: 10_000 },
  retries: 1,
  // Parallel runs on CI to finish full test suite within timeout.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: 'block', actionTimeout: 15_000 },
  webServer: { command: `npx vite preview --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: true },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } }, testMatch: ['**/phone.e2e.ts', '**/visual.e2e.ts', '**/a11y.e2e.ts', '**/monki.e2e.ts'] },
    // Safari's engine on a phone: iPhone users meet WebKit only (every iOS browser is WebKit). Runs
    // phone.e2e.ts for mobile engine compatibility, gestures and layout checks; axe accessibility
    // is already comprehensively verified on phone and desktop projects.
    { name: 'iPhone (WebKit)', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } }, testMatch: ['**/phone.e2e.ts'], timeout: 120_000 },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testMatch: ['**/desktop.e2e.ts', '**/visual.e2e.ts', '**/a11y.e2e.ts', '**/monki.e2e.ts', '**/offline.e2e.ts'] },
  ],
})
