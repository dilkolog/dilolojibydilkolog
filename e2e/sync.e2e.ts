import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { openScreen } from './helpers'

// In-memory sync store shared across contexts
const blobs = new Map<string, { body: Buffer; etag: string }>()
let version = 0

function setupSyncMock(context: BrowserContext) {
  // Stub translations to prevent external API calls
  context.route((u) => u.pathname === '/api/translate', (r) => r.fulfill({ status: 503, json: { error: 'not configured' } }))

  // Mock /api/sync with in-memory store and precondition (ETag/If-Match) checking
  context.route((u) => u.pathname.startsWith('/api/sync'), async (route, req) => {
    const url = new URL(req.url())
    const id = url.searchParams.get('id') ?? ''
    const part = url.searchParams.get('part') ?? ''
    const key = `${id}:${part}`

    if (req.method() === 'GET') {
      const found = blobs.get(key)
      if (!found) {
        return route.fulfill({ status: 404, body: 'not found' })
      }
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'cache-control': 'no-store',
          etag: found.etag,
        },
        body: found.body,
      })
    }

    if (req.method() === 'PUT') {
      const ifMatch = req.headers()['if-match']
      const existing = blobs.get(key)
      if ((ifMatch && existing && existing.etag !== ifMatch) || (req.headers()['if-none-match'] === '*' && existing)) {
        return route.fulfill({ status: 412, body: 'changed' })
      }
      version++
      const etag = `"v${version}"`
      const body = req.postDataBuffer() ?? Buffer.alloc(0)
      blobs.set(key, { body, etag })
      return route.fulfill({ status: 204 })
    }

    return route.fulfill({ status: 405, body: 'method not allowed' })
  })
}

async function startDevice(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  await page.locator('.lang-card', { hasText: 'Fransızca' }).click()
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await page.getByRole('button', { name: /Fransızca ile başlayalım/ }).click()
  await expect(page.getByRole('button', { name: 'Ayarlar', exact: true })).toBeVisible({ timeout: 10_000 })
}

async function openSettingsGroup(page: Page, group: string) {
  await openScreen(page, 'Ayarlar')
  const groupBtn = page.locator('nav[aria-label="Ayar grupları"] button', { hasText: group })
  if (await groupBtn.count()) {
    await groupBtn.click()
    await page.waitForTimeout(200)
  }
}

async function openSyncCodeSettings(page: Page) {
  await openSettingsGroup(page, 'Hesap')
  const summary = page.locator('summary', { hasText: /Hesapsız: eşitleme koduyla eşitle/ })
  await expect(summary).toBeVisible()
  const isOpen = await summary.evaluate((el) => (el.parentElement as HTMLDetailsElement)?.open)
  if (!isOpen) {
    await summary.click()
  }
  await expect(page.locator('details.account-advanced[open]')).toBeVisible()
}

async function clickSyncNow(page: Page) {
  await openSyncCodeSettings(page)
  const syncBtn = page.getByRole('button', { name: 'Şimdi eşitle' })
  await expect(syncBtn).toBeVisible()
  await syncBtn.click()
  await expect(page.getByRole('button', { name: 'Şimdi eşitle' })).toBeEnabled({ timeout: 15_000 })
  await page.waitForTimeout(400)
}

async function addWord(page: Page, word: string, meaning: string) {
  await openScreen(page, 'Kelimeler')
  const newBtn = page.getByRole('button', { name: 'Yeni kelime' })
  if (await newBtn.isVisible()) {
    await newBtn.click()
  }
  await page.locator('#w-word').fill(word)
  await page.locator('#w-meaning').fill(meaning)
  await page.getByRole('button', { name: 'Kelimeyi ekle' }).click()
  await expect(page.locator('.added-row .notice, .notice[role="status"]')).toContainText(`"${word}" eklendi`, { timeout: 8_000 })
}

async function saveDictionaryWord(page: Page, word: string, meaning: string) {
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill(word)
  const input = page.getByPlaceholder('Türkçe anlamını yaz…')
  await expect(input).toBeVisible()
  await input.fill(meaning)
  await page.getByRole('button', { name: 'Sözlüğe kaydet' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toBeVisible()
}

async function removeDictionaryWord(page: Page, word: string) {
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill(word)
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toBeVisible()
  await page.getByRole('button', { name: 'Sözlükten kaldır' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toHaveCount(0)
}

async function expectDictionaryWord(page: Page, word: string, expectedMeaning?: string) {
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill(word)
  const card = page.getByRole('region', { name: 'Kaydettiğin kelime' })
  if (expectedMeaning) {
    await expect(card).toBeVisible({ timeout: 8_000 })
    await expect(card).toContainText(expectedMeaning)
  } else {
    await expect(card).toHaveCount(0)
  }
}


async function setupTwoSyncedDevices(browser: Browser) {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  setupSyncMock(contextA)
  setupSyncMock(contextB)

  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await startDevice(pageA)
  await startDevice(pageB)

  // Device A initiates sync under Hesap -> details
  await openSyncCodeSettings(pageA)
  await pageA.getByRole('button', { name: 'Eşitlemeyi başlat' }).click()
  await expect(pageA.getByRole('button', { name: 'Şimdi eşitle' })).toBeVisible({ timeout: 10_000 })
  const syncCode = (await pageA.locator('.sync-code').textContent())?.trim() ?? ''

  // Device B enters code under Hesap -> details
  await openSyncCodeSettings(pageB)
  await pageB.getByLabel('Eşitleme kodu').fill(syncCode)
  await pageB.getByRole('button', { name: 'Kodumu gir' }).click()
  await expect(pageB.getByRole('button', { name: 'Şimdi eşitle' })).toBeVisible({ timeout: 10_000 })

  return { contextA, contextB, pageA, pageB }
}

test.describe.serial('Two devices encrypted sync', () => {
  test.beforeEach(() => {
    blobs.clear()
    version = 0
  })

  test('scenario 1: device A adds a word, device B syncs and sees it', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupTwoSyncedDevices(browser)
    try {
      await addWord(pageA, 'pomme', 'elma')
      await clickSyncNow(pageA)
      await clickSyncNow(pageB)

      await openScreen(pageB, 'Kelimeler')
      await expect(pageB.locator('.word-row, .card', { hasText: 'pomme' }).first()).toBeVisible({ timeout: 8_000 })
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('scenario 2: concurrent additions on both devices merge without data loss', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupTwoSyncedDevices(browser)
    try {
      await addWord(pageA, 'chat', 'kedi')
      await addWord(pageB, 'chien', 'köpek')

      // Device A syncs first
      await clickSyncNow(pageA)

      // Device B syncs (conflicts/merges with device A)
      await clickSyncNow(pageB)

      // Device A syncs again to fetch device B's merged state
      await clickSyncNow(pageA)

      // Both words must be visible on both devices
      await openScreen(pageA, 'Kelimeler')
      await expect(pageA.locator('.word-row, .card', { hasText: 'chat' }).first()).toBeVisible()
      await expect(pageA.locator('.word-row, .card', { hasText: 'chien' }).first()).toBeVisible()

      await openScreen(pageB, 'Kelimeler')
      await expect(pageB.locator('.word-row, .card', { hasText: 'chat' }).first()).toBeVisible()
      await expect(pageB.locator('.word-row, .card', { hasText: 'chien' }).first()).toBeVisible()
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('scenario 3: deleting a word on device A removes it from device B upon sync', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupTwoSyncedDevices(browser)
    try {
      await addWord(pageA, 'livre', 'kitap')
      await clickSyncNow(pageA)
      await clickSyncNow(pageB)

      await openScreen(pageB, 'Kelimeler')
      await expect(pageB.locator('.word-row, .card', { hasText: 'livre' }).first()).toBeVisible()

      // Device A deletes the word
      await openScreen(pageA, 'Kelimeler')
      await pageA.locator('.word-row', { hasText: 'livre' }).first().click()
      await pageA.getByRole('button', { name: 'Kelimeyi sil' }).click()
      await expect(pageA.locator('.word-row, .card', { hasText: 'livre' })).toHaveCount(0)

      await clickSyncNow(pageA)
      await clickSyncNow(pageB)

      await openScreen(pageB, 'Kelimeler')
      await expect(pageB.locator('.word-row, .card', { hasText: 'livre' })).toHaveCount(0)
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('scenario 4: changing settings on device B propagates to device A upon sync', async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } = await setupTwoSyncedDevices(browser)
    try {
      await openSettingsGroup(pageB, 'Çalışma')
      // Select 12 new words per day on device B
      const radio12B = pageB.getByRole('radio', { name: '12' })
      await expect(radio12B).toBeVisible()
      await radio12B.click()
      await expect(radio12B).toBeChecked()

      await clickSyncNow(pageB)
      await clickSyncNow(pageA)

      // Device A must reflect the synced setting under Çalışma
      await openSettingsGroup(pageA, 'Çalışma')
      const radio12A = pageA.getByRole('radio', { name: '12' })
      await expect(radio12A).toBeChecked({ timeout: 8_000 })
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('scenario 5: words saved to the dictionary sync across devices, deletions propagate, and updates/re-adds take effect', async ({ browser }) => {
    test.setTimeout(90_000)
    const { contextA, contextB, pageA, pageB } = await setupTwoSyncedDevices(browser)
    try {
      // 1. Device A saves a word not in the pack to the dictionary
      await saveDictionaryWord(pageA, 'farfadet', 'küçük peri, cin')
      await clickSyncNow(pageA)
      await clickSyncNow(pageB)

      // Device B sees it under dictionary search
      await expectDictionaryWord(pageB, 'farfadet', 'küçük peri, cin')

      // 2. Device A removes the word from dictionary -> tombstone propagates upon sync
      await removeDictionaryWord(pageA, 'farfadet')
      await clickSyncNow(pageA)
      await clickSyncNow(pageB)

      // Device B no longer sees it in the saved list or exact card
      await expectDictionaryWord(pageB, 'farfadet')

      // 3. Re-adding the word later resurrects it with fresh timestamp
      await pageA.waitForTimeout(200)
      await saveDictionaryWord(pageA, 'farfadet', 'orman perisi')
      await clickSyncNow(pageA)
      await clickSyncNow(pageB)

      // Device B sees resurrected word with updated meaning
      await expectDictionaryWord(pageB, 'farfadet', 'orman perisi')

      // 4. Updating meaning on Device B overrides older meaning on Device A
      await removeDictionaryWord(pageB, 'farfadet')
      await pageB.waitForTimeout(200)
      await saveDictionaryWord(pageB, 'farfadet', 'şakacı peri')
      await clickSyncNow(pageB)
      await clickSyncNow(pageA)

      // Device A has updated newer meaning
      await expectDictionaryWord(pageA, 'farfadet', 'şakacı peri')
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })
})
