import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { openScreen, overflow, startWithSamples } from './helpers'


async function stateCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('kelime-koc')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const count = db.transaction('wordStates').objectStore('wordStates').count()
      count.onsuccess = () => { resolve(count.result); db.close() }
      count.onerror = () => { reject(count.error); db.close() }
    }
  }))
}

test.beforeEach(async ({ page }) => {
  await page.route(u => u.pathname.startsWith('/api/') || !['localhost', '127.0.0.1'].includes(u.hostname), r => r.fulfill({ status: 503, json: { error: 'offline test' } }))
  await startWithSamples(page)
  await openScreen(page, 'Sözlük')
})

test('dictionary learns from typos, keeps morphology ambiguity and splits attached pronouns', async ({ page }) => {
  const query = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await query.fill('maiosn')
  await page.getByRole('region', { name: 'Yazım önerileri' }).getByRole('button', { name: 'maison', exact: true }).click()
  await expect(page.locator('.dict-hero h2')).toContainText('maison')
  await query.fill('suis')
  const analysis = page.getByRole('region', { name: 'Çekimli biçim çözümlemesi' })
  await expect(analysis).toContainText('être')
  await expect(analysis).toContainText('suivre')
  await page.locator('.lang-btn:visible').filter({ hasText: /^ES$/ }).click()
  await expect(page.locator('#main .page-header .greeting-sub')).toContainText('İspanyolca')
  await query.fill('dímelo')
  await expect(analysis).toContainText('decir')
  await expect(analysis).toContainText('di + me + lo')
  await page.locator('.lang-btn:visible').filter({ hasText: /^EN$/ }).click()
  await expect(page.locator('#main .page-header .greeting-sub')).toContainText('İngilizce')
  await query.fill('went')
  await expect(analysis).toContainText('go')
  await expect(analysis).toContainText('Past simple')
  expect(await overflow(page)).toEqual([])
})

test('dictionary saves a personal example, shows learning status and tests recent lookups without creating SRS states', async ({ page }) => {
  const query = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await query.fill('chat')
  await page.getByLabel('Kendi cümleni yaz', { exact: true }).fill('Mon chat dort ce soir.')
  await page.locator('.dict-personal-sentence').getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(page.locator('.dict-personal-sentence [role=status]')).toContainText('kaydedildi')
  await expect(page.getByLabel('Öğrenme durumu')).toBeVisible()
  await page.waitForTimeout(1600)
  await query.fill('chien')
  await expect(page.locator('.dict-hero h2')).toContainText('chien')
  await page.waitForTimeout(1600)
  await query.fill('')
  const run = page.getByRole('button', { name: /Son aradığın \d+ kelimeyi test et/ })
  await expect(run).toBeVisible()
  const before = await stateCount(page)
  await run.click()
  const review = page.getByRole('region', { name: 'Son aramalardan hızlı tekrar' })
  await expect(review).toContainText('tekrar takvimini değiştirmez')
  const word = (await review.locator('h3').textContent())?.trim()
  const answer = word === 'chat' ? 'kedi' : 'köpek'
  await review.getByRole('button', { name: answer, exact: true }).click()
  await expect(review.getByRole('status')).toHaveText('Doğru!')
  await review.getByRole('button', { name: 'Tekrarı bırak' }).click()
  expect(await stateCount(page)).toBe(before)
  await query.fill('chat')
  const accessibility = await new AxeBuilder({ page }).include('#main').analyze()
  expect(accessibility.violations).toEqual([])
  expect(await overflow(page)).toEqual([])
})
