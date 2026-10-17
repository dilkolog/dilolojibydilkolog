import { expect, test } from '@playwright/test'
import { approveAccount, openScreen, overflow, startWithSamples } from './helpers'

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

test('photo words: a photo brings back words to choose from, and the chosen ones are added', async ({ page }) => {
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
  const word = (lemma: string, meaning: string) => ({
    input: lemma,
    lemma,
    partOfSpeech: 'noun',
    gender: 'm',
    meanings: [meaning],
    example: `Un *${lemma}*, s'il vous plaît.`,
    exampleTranslation: 'Lütfen.',
    collocations: [],
    confusables: [],
    frequencyBand: 'top3000',
    literal: '',
  })
  let sentImage = false
  await page.route(/api\.anthropic\.com/, async (r) => {
    sentImage = (r.request().postData() ?? '').includes('"type":"image"')
    await r.fulfill({
      json: {
        id: 'msg_2',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-5-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify({ words: [word('fromage', 'peynir'), word('addition', 'hesap')] }) }],
        usage: { input_tokens: 80, output_tokens: 120 },
      },
    })
  })
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Ekle', exact: true }).click()
  await page.getByRole('menuitem', { name: /Birçok kelime ekle/ }).click()
  await page.locator('summary', { hasText: 'Fotoğraftan kelime' }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64')
  await page.locator('details[open] input[type=file]:not([capture])').setInputFiles({ name: 'menu.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByLabel('fromage ekle')).toBeChecked()
  expect(sentImage).toBe(true)
  await page.getByLabel('addition ekle').uncheck()
  await page.getByRole('button', { name: /Seçilenleri ekle \(1\)/ }).click()
  await expect(page.getByText('1 kelime eklendi')).toBeVisible()
  expect(await overflow(page)).toEqual([])
})
