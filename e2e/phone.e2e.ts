import { expect, test } from '@playwright/test'
import { clippedContent, contrastProblems, finishSession, openScreen, overflow, SCREENS, startWithSamples } from './helpers'

test('first run: the language choice comes right after the welcome', async ({ page }) => {
  await page.goto('/')
  const form = await page.locator('.onboarding-form').boundingBox()
  const steps = await page.locator('.onboarding-steps').boundingBox()
  expect(form!.y).toBeLessThan(steps!.y)
})

test('no screen scrolls sideways, even at the largest text size', async ({ page }) => {
  await startWithSamples(page)
  const found: string[] = []
  for (const scale of ['', '125%']) {
    await page.evaluate((s) => (document.documentElement.style.fontSize = s), scale)
    for (const name of SCREENS) {
      await openScreen(page, name)
      for (const o of await overflow(page)) found.push(`${name} ${scale || '100%'}: ${o}`)
      for (const c of await clippedContent(page)) found.push(`${name} ${scale || '100%'} clipped: ${c}`)
    }
  }
  expect(found).toEqual([])
})

test('text stays readable in the light and the dark theme', async ({ page }) => {
  await startWithSamples(page)
  const found: string[] = []
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    for (const name of SCREENS) {
      await openScreen(page, name)
      for (const p of await contrastProblems(page)) found.push(`${theme} ${name}: ${p}`)
    }
  }
  expect(found).toEqual([])
})

test('in a session the answer choices sit within thumb reach', async ({ page }) => {
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  // Introductions first; then a question with choices.
  for (let i = 0; i < 20 && !(await page.locator('.session-stage > div > .options .option:not([disabled])').count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Öğrendim)/ })
    const guess = page.locator('.session-stage .option:not([disabled])')
    if (await next.count()) await next.first().click()
    else if (await guess.count()) await guess.first().click()
    else await page.waitForTimeout(200)
  }
  const options = page.locator('.session-stage > div > .options .option')
  const last = await options.last().boundingBox()
  const height = page.viewportSize()!.height
  expect(last!.y + last!.height).toBeGreaterThan(height * 0.8)
  expect(last!.y + last!.height).toBeLessThanOrEqual(height)
})

test('a long word shrinks smoothly and stays inside the screen', async ({ page }) => {
  await startWithSamples(page)
  const words = ['an', 'la maison', 'contrat de location', "l'assurance maladie complémentaire", 'abstraction-déterminisme-incompréhensible-extraordinairement']
  const sizes = await page.evaluate((list) => {
    return list.map((text) => {
      const h = document.createElement('h1')
      h.className = 'word'
      h.style.setProperty('--len', String(text.length))
      h.textContent = text
      document.querySelector('main')!.append(h)
      const size = parseFloat(getComputedStyle(h).fontSize)
      const fits = h.scrollWidth <= h.clientWidth + 1
      h.remove()
      return { text, size, fits }
    })
  }, words)
  for (const s of sizes) expect(s.fits, s.text).toBe(true)
  // Never bigger for a longer word; never smaller than the floor.
  for (let i = 1; i < sizes.length; i++) expect(sizes[i].size).toBeLessThanOrEqual(sizes[i - 1].size)
  expect(Math.min(...sizes.map((s) => s.size))).toBeGreaterThanOrEqual(26)
  expect(sizes[0].size).toBeGreaterThan(sizes[3].size)
})

test('the bedtime card keeps a readable text column on a phone', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.setFixedTime(new Date('2026-03-04T21:30:00'))
  await startWithSamples(page)
  await finishSession(page)
  await openScreen(page, 'Bugün')
  const text = page.locator('.habit > .stack', { hasText: 'Yatmadan önce' })
  await expect(text).toBeVisible()
  expect((await text.boundingBox())!.width).toBeGreaterThan(200)
})

test('Progress starts with the overview and opens a group from the shortcut row', async ({ page }) => {
  await startWithSamples(page)
  await page.locator(':is(.nav-btn, .tab):visible').filter({ hasText: /^İlerleme\d*$/ }).first().click()
  const toggles = page.locator('.group-toggle')
  await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true')
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'false')
  const closedHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.locator('.settings-nav .chip', { hasText: 'Tekrarlar' }).click()
  await expect(toggles.nth(2)).toHaveAttribute('aria-expanded', 'true')
  await page.waitForTimeout(600)
  // It scrolled there, and the page grew by what it opened.
  expect(await page.evaluate(() => document.getElementById('p-memory')!.getBoundingClientRect().top)).toBeLessThan(250)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(closedHeight + 400)
  await toggles.nth(2).click()
  await expect(toggles.nth(2)).toHaveAttribute('aria-expanded', 'false')
})

test('an empty reading library has one way in: the open form, not three buttons', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await expect(page.locator('details.add-text')).toHaveJSProperty('open', true)
  await expect(page.getByRole('button', { name: /Metin ekle|İlk metnini ekle/ })).toHaveCount(0)
  // The other sources sit as tiles of one width; the YouTube link has a line of its own.
  const tiles = await page.locator('.add-sources .btn').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
  expect(new Set(tiles).size).toBe(1)
  const field = await page.getByLabel('YouTube bağlantısı').boundingBox()
  const form = await page.locator('.add-youtube').boundingBox()
  expect(field!.width).toBeGreaterThan(form!.width * 0.9)
})
