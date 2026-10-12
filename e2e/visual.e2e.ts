import { expect, test } from '@playwright/test'
import { openScreen, packApplied, startWithSamples } from './helpers'

// A screenshot must not depend on the network: what Wiktionary or Tatoeba send (a word's patterns,
// its real sentences) came in before the shot or not, so the page was taller one time than the next.
// Every request off this machine is cut, and each screen is taken as it looks offline.
test.beforeEach(async ({ page }) => {
  await page.route((url) => !['localhost', '127.0.0.1'].includes(url.hostname), (route) => route.abort())
})

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
    await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))   // the sky follows the clock
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
        await packApplied(page)
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

/**
 * The long screens of a phone, top to bottom: Progress (groups closed, as it opens), Settings and a
 * word page. The tab bar is hidden (a fixed bar would sit in the middle of a full-page shot) and
 * the clock is fixed so dates and the week strip do not move.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`long phone screens look the same: ${theme}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'the long screens are a phone matter')
    await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))
    await startWithSamples(page)
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    const shot = { fullPage: true, scale: 'css', animations: 'disabled', maxDiffPixelRatio: 0.01 } as const
    // The bar is hidden only for the shot: the walk between screens needs it.
    const snap = async (name: string) => {
      const hide = await page.addStyleTag({ content: '.tabbar { display: none !important }' })
      await expect(page).toHaveScreenshot(name, shot)
      await hide.evaluate((e) => (e as Element).remove())
    }

    await page.locator(':is(.nav-btn, .tab):visible').filter({ hasText: /^İlerleme\d*$/ }).first().click()
    await page.waitForTimeout(600)
    await snap(`long-progress-${theme}.png`)

    await openScreen(page, 'Profil')
    await page.locator('.profile-settings').click()
    await expect(page.locator('.settings-menu-item').first()).toBeVisible()
    await page.waitForTimeout(400)
    await snap(`long-settings-${theme}.png`)

    await openScreen(page, 'Kelimeler')
    await page.locator('.word-row, tbody tr').first().click()
    await page.waitForTimeout(600)
    await snap(`long-word-${theme}.png`)
  })
}
