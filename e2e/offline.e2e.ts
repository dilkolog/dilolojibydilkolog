import { expect, test } from '@playwright/test'
import { openScreen, packApplied, startWithSamples } from './helpers'

// The only suite that lets the service worker run: the app is opened online once, the network is then really cut
// (the browser refuses every request), and the app must still start from its cache and work on the device's data.
test.use({ serviceWorkers: 'allow' })

test('with the network cut the app reloads from its cache and works on the words on the device', async ({ page, context }) => {
  await startWithSamples(page)
  // The first visit installs the worker; it is ready when it is active and the cache holds the shell.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).length > 0 && (await Promise.all((await caches.keys()).map(async (k) => (await (await caches.open(k)).keys()).length))).some((n) => n > 20)), { timeout: 30_000 })
    .toBe(true)
  // Reload once online so the worker controls the page, as it does on every later visit.
  await page.reload()
  await expect(page.getByRole('button', { name: /^(Başla|Devam et)$/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  // The shell came from the cache, the words from the device.
  await expect(page.getByRole('button', { name: /^(Başla|Devam et)$/ })).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.offline-badge')).toBeVisible()

  // A screen opened for the first time offline (its code is a separate chunk) still comes up.
  await openScreen(page, 'Kelimeler')
  await expect(page.locator('.word-list li').first()).toBeVisible()
  await openScreen(page, 'Oyunlar')
  await expect(page.getByRole('heading', { name: /Oyunlar/ }).first()).toBeVisible()

  // And a session runs: the first question is on screen and can be answered.
  await openScreen(page, 'Bugün')
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.locator('.session, .session-stage').first()).toBeVisible()

  // Back online, the badge goes and the data is still there.
  await context.setOffline(false)
  await expect(page.locator('.offline-badge')).toBeHidden()
  await packApplied(page)
})
