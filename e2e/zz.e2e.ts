import { test } from '@playwright/test'
import { startWithSamples, playSession } from './helpers'
const OUT = '/tmp/claude-0/-home-user-kelime-koc/f43f24fe-c108-520b-9e59-1f42a2da1ee1/scratchpad/ay'
test('sum', async ({ page }, info) => {
  test.setTimeout(120000)
  await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))
  await startWithSamples(page)
  await playSession(page)
  for (let i = 0; i < 4 && (await page.locator('.milestone-backdrop').count()); i++) await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/${info.project.name}-summary.png`, fullPage: true })
})
