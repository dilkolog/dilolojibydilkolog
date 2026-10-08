import { defineConfig, devices } from '@playwright/test'

/**
 * Real-browser checks of what happy-dom can't see: layout (overflow, where buttons sit on a
 * phone), contrast as rendered, keyboard focus. Runs against the production build.
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  fullyParallel: true,
  // CI machines are slower: tests that wait on animations and background writes stay reliable one at a time.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4179', serviceWorkers: 'block' },
  webServer: { command: 'npx vite preview --port 4179 --strictPort', url: 'http://localhost:4179', reuseExistingServer: true },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } }, testMatch: ['**/phone.e2e.ts', '**/visual.e2e.ts', '**/a11y.e2e.ts'] },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testMatch: ['**/desktop.e2e.ts', '**/visual.e2e.ts', '**/a11y.e2e.ts'] },
  ],
})
