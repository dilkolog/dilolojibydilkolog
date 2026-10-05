import { expect, test } from '@playwright/test'
import { openScreen, startWithSamples } from './helpers'

/**
 * Screenshots of the screens whose look matters most, in both themes. Baselines live next to this
 * file per project and platform; after a deliberate design change, refresh them with
 *   npx playwright test visual --update-snapshots
 */
for (const theme of ['light', 'dark'] as const) {
  test(`word list and word page look the same: ${theme}`, async ({ page }) => {
    await startWithSamples(page)
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    await openScreen(page, 'Kelimeler')
    const shot = { animations: 'disabled', maxDiffPixelRatio: 0.01 } as const
    await expect(page).toHaveScreenshot(`words-${theme}.png`, shot)

    // The article carries the gender: feminine and masculine differ, and both differ from the word.
    const colours = await page.locator('.word-list .article').evaluateAll((els) => els.map((e) => ({ cls: e.className, colour: getComputedStyle(e).color })))
    const of = (g: string) => new Set(colours.filter((c) => c.cls.includes(`gender-${g}`)).map((c) => c.colour))
    expect(of('m').size).toBe(1)
    expect(of('f').size).toBe(1)
    expect([...of('m')][0]).not.toBe([...of('f')][0])

    await page.locator('.word-row, tbody tr').first().click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot(`word-page-${theme}.png`, shot)
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`garden beds look the same: ${theme}`, async ({ page }) => {
    await startWithSamples(page)
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    await openScreen(page, 'Kelimeler')
    await page.getByRole('button', { name: /^Bahçe$/ }).or(page.getByRole('tab', { name: /Bahçe/ })).first().click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot(`garden-${theme}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.01 })
  })
}

/**
 * Each language tints the whole app, so each is checked: Today, the word list and the first thing a
 * session shows. The clock is fixed so the date, the greeting and the day's plan do not move.
 */
const LANGUAGES = [
  { short: 'FR', name: 'fr' },
  { short: 'EN', name: 'en' },
  { short: 'ES', name: 'es' },
] as const

for (const lang of LANGUAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Today, words and a session look the same: ${lang.name} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))
      await startWithSamples(page)
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
      if (lang.name !== 'fr') {
        await page.locator('.lang-btn:visible', { hasText: lang.short }).first().click()
        await openScreen(page, 'Kelimeler')
        await page.getByRole('button', { name: /örnek kelime yükle/ }).click()
      }
      const shot = { animations: 'disabled', maxDiffPixelRatio: 0.01 } as const
      await openScreen(page, 'Kelimeler')
      await expect(page).toHaveScreenshot(`${lang.name}-words-${theme}.png`, shot)
      await openScreen(page, 'Bugün')
      await expect(page).toHaveScreenshot(`${lang.name}-today-${theme}.png`, shot)
      await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
      await expect(page.locator('.session-stage')).toBeVisible()
      await page.waitForTimeout(600)
      await expect(page).toHaveScreenshot(`${lang.name}-session-${theme}.png`, shot)
    })
  }
}
