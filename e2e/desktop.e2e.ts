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
