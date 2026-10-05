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
