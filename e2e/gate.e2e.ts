import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { overflow } from './helpers'

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
const landing = (page: Page) => page.getByRole('heading', { level: 1, name: /Kelimeleri unutmadan önce tekrar et/ })
/** A signed-out visit opens the landing page; this takes the way in it offers. */
async function pastLanding(page: Page, way: 'Giriş yap' | 'Hesap aç ve başla' = 'Giriş yap') {
  await expect(landing(page)).toBeVisible()
  await page.getByRole('button', { name: way, exact: true }).first().click()
}
const appChrome = (page: Page) => page.locator('.tabbar, .sidebar, .nav-btn')

test('a signed-out visit opens the landing page, and the sign-in page is one step on', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/')
  // The landing page: what Diloloji is and two ways in, with nothing of the app and no sign-in form yet.
  await expect(landing(page)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gizlilik politikası' })).toHaveAttribute('href', '/gizlilik')
  await expect(page.getByLabel('E-posta')).toHaveCount(0)
  await expect(appChrome(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Başlayalım', exact: true })).toHaveCount(0)
  // Sign in: the sign-in page, with a way back to the landing page.
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).first().click()
  await expect(signInPage(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Google ile devam et' })).toBeVisible()
  await expect(page.getByLabel('E-posta')).toBeVisible()
  await expect(appChrome(page)).toHaveCount(0)
  await expect(landing(page)).toHaveCount(0)
  await page.locator('.auth-back').click()
  await expect(landing(page)).toBeVisible()
})

test('the landing page shows the app in the language chosen, and keeps French verbs for English', async ({ page }) => {
  await page.goto('/')
  await expect(landing(page)).toBeVisible()
  const shot = (n: number) => page.locator('.lp-shot img').nth(n)
  await expect(shot(0)).toHaveAttribute('src', /today-fr/)
  await page.getByRole('button', { name: 'İspanyolca', exact: true }).click()
  await expect(shot(0)).toHaveAttribute('src', /today-es/)
  await expect(shot(2)).toHaveAttribute('src', /verbs-es/)
  await page.getByRole('button', { name: 'İngilizce', exact: true }).click()
  await expect(shot(0)).toHaveAttribute('src', /today-en/)
  await expect(shot(1)).toHaveAttribute('src', /reading-en/)
  // There is no verb lab for English: that picture stays French.
  await expect(shot(2)).toHaveAttribute('src', /verbs-fr/)
  await expect(shot(3)).toHaveAttribute('src', /guide-en/)
})

test('"Hesap aç ve başla" opens the sign-up form', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/')
  await pastLanding(page, 'Hesap aç ve başla')
  await expect(signInPage(page)).toHaveCount(0)
  await expect(page.getByLabel('E-posta')).toBeVisible()
  await expect(page.getByRole('button', { name: /Hesap oluştur/ })).toBeVisible()
})

test('words kept on a signed-out device stay put and stay behind the gate', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/')
  await pastLanding(page)
  await expect(signInPage(page)).toBeVisible()
  await seed(page, [{ table: 'vocabulary', value: { id: 'gate-1', language: 'fr', source: 'user', word: 'maison', senses: [], createdAt: new Date().toISOString() } }])
  // After the reload the landing page is the first thing again: still nothing of the app.
  await expect(landing(page)).toBeVisible()
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
  await pastLanding(page)
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
  await expect(landing(page)).toBeVisible()
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

test('the landing page fits the screen and passes the accessibility check in light and dark', async ({ page }) => {
  await stubNetwork(page)
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/')
    await expect(landing(page)).toBeVisible()
    // A new device has no theme setting yet, so the page is light until told: set it as the app does.
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), scheme)
    // Every section and picture loaded before the page is judged.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 60))
      }
      window.scrollTo(0, 0)
    })
    expect(await overflow(page)).toEqual([])
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(violations.map((v) => `${scheme}: ${v.id} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  }
})

test('an invite link is kept off the address, named on the landing page, and kept through the sign-in', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/?davet=abcd-2345')
  await expect(landing(page)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Bir arkadaşın seni davet etti' })).toBeVisible()
  expect(new URL(page.url()).search).toBe('')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('diloloji:invite-in') ?? 'null')?.code)).toBe('ABCD2345')
  // Through the sign-up page and a reload (a Google or mail sign-in leaves the page and comes back): still waiting.
  await page.getByRole('button', { name: 'Hesap aç ve başla' }).first().click()
  await expect(page.getByLabel('E-posta')).toBeVisible()
  await page.reload()
  await expect(landing(page)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Bir arkadaşın seni davet etti' })).toBeVisible()
  // Not named without one.
  await page.evaluate(() => localStorage.removeItem('diloloji:invite-in'))
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'Bir arkadaşın seni davet etti' })).toHaveCount(0)
})
