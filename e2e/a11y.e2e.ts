import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openScreen, playSession, SCREENS, startWithSamples } from './helpers'

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

test('onboarding passes the automated accessibility check at every step', async ({ page }) => {
  await page.goto('/')
  const problems = await scan(page, 'onboarding-step-1-welcome')

  // Step 2: Language
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hangi dille başlayalım?' })).toBeVisible()
  problems.push(...(await scan(page, 'onboarding-step-2-language')))

  // Step 3: Goal
  await page.locator('.lang-card', { hasText: 'İspanyolca' }).click()
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await expect(page.getByPlaceholder('Adın')).toBeVisible()
  problems.push(...(await scan(page, 'onboarding-step-3-goal')))

  // Step 4: Ready recap
  await page.getByPlaceholder('Adın').fill('Ayşe')
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hazırsın, Ayşe!' })).toBeVisible()
  problems.push(...(await scan(page, 'onboarding-step-4-ready')))

  expect(problems).toEqual([])
})

test('reading passes accessibility checks with verb forms card and mobile bottom sheet open', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill("Nous parlions souvent. Je parle bien. J'ai mangé.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()

  // 1. Verb forms card open
  await page.getByRole('button', { name: 'Çekimler' }).click()
  await expect(page.getByRole('region', { name: 'Metindeki çekimler' })).toBeVisible()
  const problems = await scan(page, 'reading-verb-forms-card')

  // 2. Mobile word bottom sheet open
  await page.setViewportSize({ width: 375, height: 667 })
  const targetWord = page.locator('.rw', { hasText: 'parle' }).first()
  await targetWord.click()
  await expect(page.locator('.word-pop')).toBeVisible()
  problems.push(...(await scan(page, 'phone-word-bottom-sheet')))

  expect(problems).toEqual([])
})

test('session summary passes the automated accessibility check', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await playSession(page)
  // Close any celebration modal or badge moment overlay if present
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) {
    await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').first().click()
  }
  for (let i = 0; i < 6 && (await page.locator('.badge-moment').count()); i++) {
    await page.locator('.badge-moment button').first().click()
  }
  await expect(page.locator('.summary-grid')).toBeVisible()
  const problems = await scan(page, 'session-summary')
  expect(problems).toEqual([])
})
