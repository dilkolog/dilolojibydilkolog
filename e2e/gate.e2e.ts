import { expect, test, type Page } from '@playwright/test'

/**
 * With Supabase set up an account is required: until the device is signed in, the app is the sign-in page.
 * Runs against the gated build (playwright.gate.config.ts: a fake Supabase address), where every
 * request to Supabase and to /api is answered here.
 */

const SUPABASE = 'https://gate.supabase.test'

async function stubNetwork(page: Page, signIn?: { status: number; body: unknown }) {
  await page.route((u) => u.origin === SUPABASE, (r) => {
    if (signIn && r.request().url().includes('/auth/v1/token')) return r.fulfill({ status: signIn.status, json: signIn.body })
    return r.fulfill({ status: 503, json: { error: 'stubbed' } })
  })
  await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ status: 503, json: { error: 'stubbed' } }))
}

/** Writes into the app's own IndexedDB (the app has opened it, so it exists), then reloads. */
async function seed(page: Page, rows: { table: 'meta' | 'vocabulary'; value: unknown }[]) {
  await page.evaluate(
    (all) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction([...new Set(all.map((r) => r.table))], 'readwrite')
          for (const r of all) tx.objectStore(r.table).put(r.value)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    rows,
  )
  await page.reload()
}

const signInPage = (page: Page) => page.getByRole('heading', { name: 'Hesabına giriş yap' })
const appChrome = (page: Page) => page.locator('.tabbar, .sidebar, .nav-btn')

test('a signed-out visit shows only the sign-in page', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/')
  await expect(signInPage(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Google ile devam et' })).toBeVisible()
  await expect(page.getByLabel('E-posta')).toBeVisible()
  // Nothing of the app around it: no menu, no tab bar, nowhere to go back to.
  await expect(appChrome(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Başlayalım', exact: true })).toHaveCount(0)
  await expect(page.locator('.auth-back')).toHaveCount(0)
})

test('words kept on a signed-out device stay put and stay behind the gate', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/')
  await expect(signInPage(page)).toBeVisible()
  await seed(page, [{ table: 'vocabulary', value: { id: 'gate-1', language: 'fr', source: 'user', word: 'maison', senses: [], createdAt: new Date().toISOString() } }])
  await expect(signInPage(page)).toBeVisible()
  await expect(appChrome(page)).toHaveCount(0)
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const req = open.result.transaction('vocabulary').objectStore('vocabulary').count()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        }
      }),
  )
  expect(count).toBe(1)
})

test('a wrong password says so in Turkish and stays on the sign-in page', async ({ page }) => {
  await stubNetwork(page, { status: 400, body: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' } })
  await page.goto('/')
  await page.getByLabel('E-posta').fill('biri@example.com')
  await page.getByLabel('Şifre', { exact: true }).fill('yanlis-sifre-1')
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).last().click()
  await expect(page.getByRole('alert')).toHaveText('E-posta ya da şifre yanlış.')
  await expect(signInPage(page)).toBeVisible()
  await expect(appChrome(page)).toHaveCount(0)
})

test('a signed-in device gets past the gate while the servers answer errors', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/')
  await expect(signInPage(page)).toBeVisible()
  await page.evaluate(() => localStorage.setItem('diloloji-auth', JSON.stringify({ access_token: 'stub', refresh_token: 'stub', expires_at: 4102444800, user: { id: 'u1', email: 'biri@example.com' } })))
  await seed(page, [{ table: 'meta', value: { key: 'syncAccount', value: { kind: 'account', username: 'biri', id: 'a'.repeat(32), enc: 'b'.repeat(64), auth: 'c'.repeat(64) } } }])
  // Past the gate: the first-run welcome of the app itself, not the sign-in page.
  await expect(page.getByRole('button', { name: 'Başlayalım', exact: true })).toBeVisible()
  await expect(signInPage(page)).toHaveCount(0)
  // Supabase and /api answer 503 here: a device that is signed in doesn't need them to open the app.
  await page.reload()
  await expect(signInPage(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Başlayalım', exact: true })).toBeVisible()
})
