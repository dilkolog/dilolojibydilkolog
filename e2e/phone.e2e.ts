import { expect, test } from '@playwright/test'
import { contrastProblems, openScreen, overflow, SCREENS, startWithSamples } from './helpers'

test('first run: the language choice comes right after the welcome', async ({ page }) => {
  await page.goto('/')
  const form = await page.locator('.onboarding-form').boundingBox()
  const steps = await page.locator('.onboarding-steps').boundingBox()
  expect(form!.y).toBeLessThan(steps!.y)
})

test('no screen scrolls sideways, even at the largest text size', async ({ page }) => {
  await startWithSamples(page)
  const found: string[] = []
  for (const scale of ['', '125%']) {
    await page.evaluate((s) => (document.documentElement.style.fontSize = s), scale)
    for (const name of SCREENS) {
      await openScreen(page, name)
      for (const o of await overflow(page)) found.push(`${name} ${scale || '100%'}: ${o}`)
    }
  }
  expect(found).toEqual([])
})

test('text stays readable in the light and the dark theme', async ({ page }) => {
  await startWithSamples(page)
  const found: string[] = []
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    for (const name of SCREENS) {
      await openScreen(page, name)
      for (const p of await contrastProblems(page)) found.push(`${theme} ${name}: ${p}`)
    }
  }
  expect(found).toEqual([])
})

test('in a session the answer choices sit within thumb reach', async ({ page }) => {
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  // Introductions first; then a question with choices.
  for (let i = 0; i < 20 && !(await page.locator('.session-stage > div > .options .option:not([disabled])').count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Öğrendim)/ })
    const guess = page.locator('.session-stage .option:not([disabled])')
    if (await next.count()) await next.first().click()
    else if (await guess.count()) await guess.first().click()
    else await page.waitForTimeout(200)
  }
  const options = page.locator('.session-stage > div > .options .option')
  const last = await options.last().boundingBox()
  const height = page.viewportSize()!.height
  expect(last!.y + last!.height).toBeGreaterThan(height * 0.8)
  expect(last!.y + last!.height).toBeLessThanOrEqual(height)
})
