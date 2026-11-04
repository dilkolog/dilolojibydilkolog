import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'
import { openScreen, overflow, settleTransitions } from './helpers'

/**
 * With Supabase set up an account is required: until the device is signed in, the app is the sign-in page.
 * Runs against the gated build (playwright.gate.config.ts: a fake Supabase address), where every
 * request to Supabase and to /api is answered here.
 */

const SUPABASE = 'https://gate.supabase.test'

/**
 * The account's `sync_parts` rows as Supabase keeps them (what the SQL function put_sync_part does: a version check, create-only
 * writes), shared by the devices of one test; the app talks to it through its real Supabase client.
 */
class FakeParts {
  rows = new Map<string, { data: unknown; version: number }>()
  private cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS', 'access-control-expose-headers': '*' }

  async handle(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    const json = (status: number, body: unknown) => route.fulfill({ status, headers: this.cors, json: body })
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: this.cors })
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: this.cors })
    if (url.pathname.startsWith('/storage/')) return json(404, { message: 'not found' })
    if (url.pathname === '/rest/v1/rpc/put_sync_part') {
      const a = req.postDataJSON() as { p_name: string; p_data: unknown; p_expect: number | null; p_create: boolean }
      const was = this.rows.get(a.p_name)
      if ((a.p_create && was) || (a.p_expect !== null && was?.version !== a.p_expect)) return json(409, { code: '40001', message: 'conflict' })
      const version = (was?.version ?? 0) + 1
      this.rows.set(a.p_name, { data: a.p_data, version })
      return json(200, version)
    }
    if (url.pathname === '/rest/v1/sync_parts') {
      const name = url.searchParams.get('name') ?? ''
      const wanted = name.startsWith('eq.') ? (n: string) => n === name.slice(3) : (n: string) => n.startsWith(name.replace(/^like\./, '').replace('%', ''))
      const columns = (url.searchParams.get('select') ?? '').split(',')
      const out = [...this.rows.entries()]
        .filter(([n]) => wanted(n))
        .map(([n, r]) => Object.fromEntries(columns.map((c) => [c, c === 'name' ? n : c === 'data' ? r.data : r.version])))
      if ((req.headers().accept ?? '').includes('pgrst.object+json')) return out[0] ? json(200, out[0]) : json(406, { code: 'PGRST116', message: 'no rows' })
      return json(200, out)
    }
    return json(503, { error: 'stubbed' })
  }
}

async function stubNetwork(page: Page, signIn?: { status: number; body: unknown }, parts?: FakeParts) {
  await page.route((u) => u.origin === SUPABASE, (r) => {
    if (signIn && r.request().url().includes('/auth/v1/token')) return r.fulfill({ status: signIn.status, json: signIn.body })
    if (parts) return parts.handle(r)
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
const landing = (page: Page) => page.getByRole('heading', { level: 1, name: /Türkçe anlatımla, A1’den C1’e/ })
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
  // No "back" link: the logo on the site's bar goes back to the landing page.
  await expect(page.locator('.auth-back')).toHaveCount(0)
  await page.locator('.lp-brand').click()
  await expect(landing(page)).toBeVisible()
})

test('the landing page shows the app in the language chosen, and keeps French verbs for English', async ({ page }) => {
  await page.goto('/')
  await expect(landing(page)).toBeVisible()
  const shot = (screen: string) => page.locator(`.lp-shot img[src*="${screen}-"]`)
  const card = (name: string) => page.locator('.lp-langs .lang-card', { hasText: name })
  await expect(card('Fransızca')).toHaveAttribute('aria-pressed', 'true')
  await expect(shot('today')).toHaveAttribute('src', /today-fr/)
  await card('İspanyolca').click()
  await expect(card('İspanyolca')).toHaveAttribute('aria-pressed', 'true')
  // The whole page takes the language's light, as the app does.
  await expect(page.locator('html')).toHaveAttribute('data-lang', 'es')
  await expect(shot('today')).toHaveAttribute('src', /today-es/)
  await expect(shot('verbs')).toHaveAttribute('src', /verbs-es/)
  await expect(shot('dialogue')).toHaveAttribute('src', /dialogue-es/)
  await expect(page.getByRole('button', { name: 'İspanyolca öğrenmeye başla' })).toBeVisible()
  await card('İngilizce').click()
  await expect(shot('today')).toHaveAttribute('src', /today-en/)
  await expect(shot('path')).toHaveAttribute('src', /path-en/)
  // There is no conjugation table for English: that picture stays French.
  await expect(shot('verbs')).toHaveAttribute('src', /verbs-fr/)
  await expect(shot('guide')).toHaveAttribute('src', /guide-en/)
  await expect(page.locator('.lp-native-card')).toContainText('magazine')
  // The language picked is already chosen on the first-run screen.
  expect(await page.evaluate(() => localStorage.getItem('diloloji:start-lang'))).toBe('en')
})

test('the landing page can be tried: a word to tap, the forgetting curve, the levels, and a page for each language', async ({ page, isMobile }) => {
  await stubNetwork(page)
  await page.goto('/ispanyolca')
  await expect(landing(page)).toBeVisible()
  // A shared language page opens on its language.
  await expect(page.locator('.lp-langs .lang-card', { hasText: 'İspanyolca' })).toHaveAttribute('aria-pressed', 'true')
  // index.html's first lines are gone once the page itself shows.
  await expect(page.locator('#boot-hero')).toHaveCount(0)
  // A word of the short text: its Turkish below.
  await page.locator('.lp-word', { hasText: 'periódico' }).click()
  await expect(page.locator('.lp-live-card')).toContainText('gazete')
  // The forgetting curve: three reviews, then back to the start.
  const curve = page.locator('.lp-curve')
  await expect(curve).toContainText('Tekrar etmeden hatırlama hızla düşer.')
  for (let i = 0; i < 3; i++) await curve.locator('.btn').click()
  await expect(curve.locator('.lp-curve-dot')).toHaveCount(3)
  await curve.getByRole('button', { name: 'Baştan' }).click()
  await expect(curve.locator('.lp-curve-dot')).toHaveCount(0)
  // A level band opens to its lessons and an example.
  await page.locator('.lp-band summary').first().click()
  await expect(page.locator('.lp-band[open] .lp-band-titles li').first()).toBeVisible()
  // The numbers follow the language tabs, and the tabs the page's language.
  await page.locator('.lp-facts-tabs').getByRole('button', { name: 'İngilizce' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-lang', 'en')
  await expect(page.locator('.lp-live-text')).toHaveAttribute('lang', 'en')
  // The hero's phone can be stepped through.
  await page.getByRole('button', { name: 'Doğru cevap' }).click()
  await expect(page.locator('.lp-phone img.lp-frame-on')).toHaveAttribute('src', /correct-en/)
  if (isMobile) {
    // Scrolled past the hero's button, a thin bar keeps the way in; near the end it goes.
    await page.evaluate(() => window.scrollTo(0, 2500))
    await expect(page.locator('.lp-sticky')).toBeVisible()
    await page.locator('.lp-final').scrollIntoViewIfNeeded()
    await expect(page.locator('.lp-sticky')).toHaveCount(0)
  } else {
    await expect(page.locator('.lp-nav a', { hasText: 'Seviyeler' })).toBeVisible()
  }
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

/** The rows that make a device an account's: its sync account and, once its data lives in Supabase, whose store it uses. */
const accountRows = (withStore: boolean) => [
  { table: 'meta' as const, value: { key: 'syncAccount', value: { kind: 'account', username: 'biri', id: 'a'.repeat(32), enc: 'b'.repeat(64), auth: 'c'.repeat(64) } } },
  ...(withStore ? [{ table: 'meta' as const, value: { key: 'syncStore', value: 'u1' } }] : []),
]
const AUTH = JSON.stringify({ access_token: 'stub', refresh_token: 'stub', expires_at: 4102444800, user: { id: 'u1', email: 'biri@example.com' } })

/** How many words the device's own database holds (0 when it has none yet). */
const wordCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => resolve(0)
        open.onsuccess = () => {
          try {
            const req = open.result.transaction('vocabulary').objectStore('vocabulary').count()
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => resolve(0)
          } catch {
            resolve(0)
          }
          open.result.close()
        }
      }),
  )

/** A device signed in with an account (the servers answer errors), past the first-run steps, on Today with the sample words. */
async function signedInWithWords(page: Page, parts?: FakeParts) {
  await stubNetwork(page, undefined, parts)
  await page.goto('/')
  await expect(landing(page)).toBeVisible()
  await page.evaluate(() => localStorage.setItem('diloloji-auth', JSON.stringify({ access_token: 'stub', refresh_token: 'stub', expires_at: 4102444800, user: { id: 'u1', email: 'biri@example.com' } })))
  await seed(page, accountRows(!!parts))
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  await page.locator('.lang-card', { hasText: 'Fransızca' }).click()
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await page.getByRole('button', { name: /Fransızca ile başlayalım/ }).click()
  await page.getByRole('button', { name: /örnek kelime yükle/ }).click()
  await expect(appChrome(page).first()).toBeVisible()
  expect(await wordCount(page)).toBeGreaterThan(0)
}

/** Signing out from the account menu in the side bar. */
async function signOutFromMenu(page: Page) {
  await page.locator('.sidebar-foot-btn:visible').click()
  await page.getByRole('menuitem', { name: 'Çıkış yap' }).click()
}

test('signing out while the last changes cannot go up keeps the device as it is, and says why', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the account menu of the side bar is a wide-screen way out')
  await signedInWithWords(page)
  const before = await wordCount(page)
  await signOutFromMenu(page)
  // The sync that must come first fails (the servers answer errors here): nothing is signed out or deleted.
  await expect(page.getByText(/Çıkış yapılmadı/)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Yine de çık' })).toBeVisible()
  await expect(signInPage(page)).toHaveCount(0)
  await expect(landing(page)).toHaveCount(0)
  expect(await wordCount(page)).toBe(before)
  expect(await page.evaluate(() => localStorage.getItem('diloloji-auth') !== null)).toBe(true)
})

test('leaving anyway signs out and empties the device: the landing page, no words, no session', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the account menu of the side bar is a wide-screen way out')
  await signedInWithWords(page)
  await signOutFromMenu(page)
  await page.getByRole('button', { name: 'Yine de çık' }).click()
  await expect(landing(page)).toBeVisible()
  await expect(appChrome(page)).toHaveCount(0)
  expect(await wordCount(page)).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('diloloji-auth'))).toBeNull()
})

test('two devices of one account meet through it: a word added on one reaches the other, and signing out empties only that device', async ({ browser, baseURL, isMobile }) => {
  test.skip(isMobile, 'the account menu of the side bar is a wide-screen way out')
  test.setTimeout(180_000)
  const parts = new FakeParts()
  const coreWords = () => ((parts.rows.get('core')?.data as { vocabulary?: unknown[] } | undefined)?.vocabulary ?? []).length

  // Device A: signed in, the sample words; the changes go up on their own a few seconds after they are made.
  const a = await (await browser.newContext({ baseURL })).newPage()
  await signedInWithWords(a, parts)
  const first = await wordCount(a)
  await expect.poll(coreWords, { timeout: 30_000 }).toBe(first)

  // Device B: the same account on a device that has nothing; what A put there comes down by itself.
  const b = await (await browser.newContext({ baseURL })).newPage()
  await stubNetwork(b, undefined, parts)
  await b.goto('/')
  await expect(landing(b)).toBeVisible()
  await b.evaluate((auth) => localStorage.setItem('diloloji-auth', auth), AUTH)
  await seed(b, accountRows(true))
  await expect.poll(() => wordCount(b), { timeout: 40_000 }).toBe(first)
  await expect(appChrome(b).first()).toBeVisible({ timeout: 20_000 })

  // A adds a word; it goes up, and B finds it when the app is looked at again (after the pause between pulls).
  await openScreen(a, 'Kelimeler')
  await a.locator('#w-word').fill('chaussure')
  await a.locator('#w-meaning').fill('ayakkabı')
  await a.getByRole('button', { name: 'Kelimeyi ekle' }).click()
  await expect.poll(coreWords, { timeout: 30_000 }).toBe(first + 1)
  await b.waitForTimeout(21_000)
  await b.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => wordCount(b), { timeout: 40_000 }).toBe(first + 1)

  // Signing out of B: its last changes go up (nothing is lost), then only B is emptied; A and the account keep everything.
  await signOutFromMenu(b)
  await expect(landing(b)).toBeVisible({ timeout: 30_000 })
  expect(await wordCount(b)).toBe(0)
  expect(await wordCount(a)).toBe(first + 1)
  expect(coreWords()).toBe(first + 1)
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

test('an invite link with name mentions the inviter on the landing page', async ({ page }) => {
  await stubNetwork(page)
  await page.goto('/?davet=abcd-2345&kimden=Zeynep')
  await expect(landing(page)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Zeynep seni davet etti' })).toBeVisible()
  expect(new URL(page.url()).search).toBe('')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('diloloji:invite-in') ?? 'null')?.name)).toBe('Zeynep')
})

test("the owner's admin screen: only the owner sees the entry; people, reports and system on one page", async ({ page }) => {
  await signedInWithWords(page)
  let owner = false
  const changes: unknown[] = []
  await page.route(
    (u) => u.pathname === '/api/admin',
    async (r) => {
      if (!owner) return r.fulfill({ status: 503, json: { error: 'not configured' } })
      if (r.request().method() === 'POST') {
        changes.push(r.request().postDataJSON())
        return r.fulfill({ json: { ok: true } })
      }
      const view = new URL(r.request().url()).searchParams.get('view')
      if (view === 'me') return r.fulfill({ json: { owner: true } })
      if (view === 'people')
        return r.fulfill({ json: { levels: true, pending: 1, people: [{ id: '11111111-1111-4111-8111-111111111111', email: 'ayse@example.com', username: 'ayse', approved: false, rejected: false, createdAt: '2026-11-04T10:00:00Z', aiLevel: null }] } })
      if (view === 'reports') return r.fulfill({ json: { reports: [{ id: 'r1', at: '2026-11-04T09:00:00Z', kind: 'set', reason: 'spam', note: '', target: 'f'.repeat(32), content: 'Bir liste', about: { name: 'Biri' } }] } })
      return r.fulfill({ json: { health: { ok: true, supabase: 'ok', storage: 'ok' }, problems: [], docs: 'ready', tables: 'off' } })
    },
  )
  const toAccount = async () => {
    await openScreen(page, 'Ayarlar')
    await page.locator('.settings-menu-item', { hasText: 'Hesap' }).click()
    await expect(page.locator('.account-card')).toBeVisible()
  }
  // Not the owner: no entry.
  await toAccount()
  await expect(page.getByText('Onaylar, YZ düzeyleri, şikâyetler')).toHaveCount(0)
  // The owner (a fresh visit asks the server again).
  owner = true
  await page.reload()
  await toAccount()
  await page.locator('.account-action', { hasText: 'Yönetim' }).click()
  await expect(page.getByRole('heading', { name: 'Yönetim', exact: true })).toBeVisible()
  await expect(page.locator('.admin-figure', { hasText: 'Onay bekleyen' })).toContainText('1')
  await expect(page.locator('.admin-figure', { hasText: 'Sistem' })).toContainText('Sağlıklı')
  await expect(page.locator('.admin-report', { hasText: 'Spam ya da reklam' })).toContainText('Topluluk listesi')
  await expect(page.getByRole('button', { name: 'Eski dosyaları taşı' })).toBeVisible()
  expect(await overflow(page)).toEqual([])
  const axe = await new AxeBuilder({ page }).include('.admin-page').analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))
  await settleTransitions(page)
  const dark = await new AxeBuilder({ page }).include('.admin-page').analyze()
  expect(dark.violations.map((v) => v.id)).toEqual([])
  await page.evaluate(() => delete document.documentElement.dataset.theme)
  await page.getByRole('button', { name: 'Onayla' }).click()
  await expect.poll(() => changes).toContainEqual({ action: 'person', user: '11111111-1111-4111-8111-111111111111', change: 'approve' })
  // Deleting asks for the e-mail, typed.
  await page.getByRole('button', { name: 'Hesabı sil' }).click()
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
  await expect(dialog).toContainText('ayse@example.com')
  await expect(dialog).toBeVisible()
  await settleTransitions(page)
  const dialogAxe = await new AxeBuilder({ page }).include('.dialog').analyze()
  expect(dialogAxe.violations.map((v) => v.id)).toEqual([])
  await dialog.getByRole('textbox').fill('ayse@example.com')
  await dialog.getByRole('button', { name: 'Hesabı sil' }).click()
  await expect.poll(() => changes).toContainEqual({ action: 'person-delete', user: '11111111-1111-4111-8111-111111111111', confirm: 'ayse@example.com' })
})
