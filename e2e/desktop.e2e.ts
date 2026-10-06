import { expect, test } from '@playwright/test'
import { startWithSamples } from './helpers'

test('the first Tab offers a jump past the menu to the screen', async ({ page }) => {
  await startWithSamples(page)
  await page.mouse.click(5, 5)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Tab')
  const skip = page.locator('.skip-link')
  await expect(skip).toBeFocused()
  const box = await skip.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
})

test('a dialog keeps keyboard focus while it is open', async ({ page }) => {
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.locator('.session')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)
  const dialog = page.locator('[role=alertdialog]')
  await expect(dialog).toBeVisible()
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=alertdialog]'))).toBe(true)
  // Tab wraps inside it.
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=alertdialog]'))).toBe(true)
})

test('settings on a wide screen: title row, group strip and cards end on one line, every tab inside the strip', async ({ page }) => {
  await startWithSamples(page)
  await page.locator('.sidebar-settings').click()
  await expect(page.locator('.settings-menu-item').first()).toBeVisible()
  const right = (sel: string) => page.locator(sel).first().evaluate((e) => Math.round(e.getBoundingClientRect().right))
  const edges = [await right('.page-header .settings-search'), await right('.settings-menu'), await right('.settings-pane:not([hidden]) .card')]
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(2)
  const strip = await page.locator('.settings-menu').boundingBox()
  const tabs = await page.locator('.settings-menu-item').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  expect(tabs).toHaveLength(8)
  for (const t of tabs) {
    expect(t.left).toBeGreaterThanOrEqual(strip!.x - 1)
    expect(t.right).toBeLessThanOrEqual(strip!.x + strip!.width + 1)
  }
  // Even: the tabs are the same width, within a pixel.
  const widths = tabs.map((t) => Math.round(t.width))
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
})

test('tablet width: one top bar row, the word list in two columns, the profile numbers in one row', async ({ page }) => {
  await startWithSamples(page)
  await page.setViewportSize({ width: 820, height: 900 })
  await page.waitForTimeout(300)
  // Brand, languages, places and profile share one row; the brand name stays on one line.
  const top = await page.evaluate(() => {
    const y = (sel: string) => Math.round(document.querySelector(sel)!.getBoundingClientRect().top)
    return { brand: y('.brand-row'), langs: y('.langs'), nav: y('.sidebar .nav'), profile: y('.top-profile'), brandHeight: Math.round(document.querySelector('.brand-row')!.getBoundingClientRect().height) }
  })
  expect(Math.abs(top.langs - top.brand)).toBeLessThan(20)
  expect(Math.abs(top.nav - top.brand)).toBeLessThan(20)
  expect(Math.abs(top.profile - top.brand)).toBeLessThan(20)
  expect(top.brandHeight).toBeLessThan(50)
  // The word list: two columns.
  await page.locator('.nav-btn:visible', { hasText: /^Kelimeler/ }).first().click()
  const rows = page.locator('.word-list .word-row')
  await expect(rows.first()).toBeVisible()
  const lefts = await rows.evaluateAll((els) => els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().left)))
  expect(new Set(lefts).size).toBe(2)
  // The profile: four numbers across.
  await page.locator('.top-profile').click()
  await expect(page.locator('.profile-stats .stat').first()).toBeVisible()
  const tops = await page.locator('.profile-stats .stat').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(new Set(tops).size).toBe(1)
})
