import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openScreen, SCREENS, startWithSamples } from './helpers'

/**
 * Automated accessibility check (axe-core, WCAG 2.2 A/AA) on every main screen, a session question
 * and the first-run welcome. Serious and critical problems fail the test; contrast has its own,
 * stricter check in the phone tests (contrastProblems), so it isn't counted twice here.
 */
const scan = async (page: Page, where: string) => {
  await page.waitForTimeout(400) // screens ease in
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(['color-contrast']).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} (${v.help}) → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`)
}

test('every main screen passes the automated accessibility check', async ({ page }) => {
  await page.goto('/')
  const problems = await scan(page, 'welcome')
  await startWithSamples(page)
  for (const screen of SCREENS) {
    await openScreen(page, screen)
    problems.push(...(await scan(page, screen)))
  }
  await openScreen(page, 'Bugün')
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.locator('.session')).toBeVisible()
  problems.push(...(await scan(page, 'session')))
  expect(problems).toEqual([])
})

test('a column chart is one keyboard stop: arrows read the days out', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'İlerleme')
  const chart = page.getByRole('group', { name: /Önümüzdeki günlerin tekrarları/ })
  const readout = page.locator('.chart-readout').filter({ hasText: /kelime/ }).first()
  await chart.focus()
  const last = await readout.textContent()
  await chart.press('Home')
  await expect(readout).toContainText(/: \d+ kelime/)
  const first = await readout.textContent()
  expect(first).not.toBe(last)
  await chart.press('ArrowRight')
  await expect(readout).not.toHaveText(first!)
})
