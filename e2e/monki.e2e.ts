import { expect, test } from '@playwright/test'
import { approveAccount, overflow, startWithSamples } from './helpers'

test('Monki: the button opens a chat that explains the key when there is none', async ({ page }) => {
  await startWithSamples(page)
  await page.getByRole('button', { name: 'Monki ile konuş' }).click()
  const panel = page.getByRole('dialog', { name: 'Monki' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('YZ anahtarı')
  expect(await overflow(page)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: 'Monki ile konuş' })).toBeFocused()
})

test('Monki: talks with a key, keeps the chat across a reload', async ({ page }) => {
  await startWithSamples(page)
  await approveAccount(page)
  await page.evaluate(() => {
    const open = indexedDB.open('kelime-koc')
    open.onsuccess = () => {
      const tx = open.result.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key: 'aiKey', value: 'sk-ant-test-key-123' })
      tx.oncomplete = () => window.dispatchEvent(new Event('diloloji:account'))
    }
  })
  await page.reload()
  let asked = ''
  await page.route(/api\.anthropic\.com/, async (r) => {
    asked = r.request().postData() ?? ''
    await r.fulfill({
      json: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-5-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify({ reply: 'Bien sûr! **la maison** = ev', say: '', suggestions: ['Bir örnek daha', 'Beni sına'] }) }],
        usage: { input_tokens: 50, output_tokens: 80 },
      },
    })
  })
  await page.getByRole('button', { name: 'Monki ile konuş' }).click()
  const panel = page.getByRole('dialog', { name: 'Monki' })
  await panel.getByRole('textbox', { name: /mesaj/ }).fill('maison ne demek?')
  await page.keyboard.press('Enter')
  await expect(panel.locator('.monki-msg.from-monki strong')).toHaveText('la maison')
  await expect(panel.getByRole('button', { name: 'Bir örnek daha' })).toBeVisible()
  expect(asked).toContain('maison ne demek?')
  await page.screenshot({ path: process.env.MONKI_SHOT ?? 'test-results/monki.png' })
  expect(await overflow(page)).toEqual([])
  await page.reload()
  await page.getByRole('button', { name: 'Monki ile konuş' }).click()
  await expect(page.getByRole('dialog', { name: 'Monki' })).toContainText('maison ne demek?')
})
