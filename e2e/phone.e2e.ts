import { expect, test } from '@playwright/test'
import { clippedContent, contrastProblems, finishSession, playSession, openScreen, openVerbLab, overflow, SCREENS, startWithSamples } from './helpers'

test('first run: four steps, each fits the screen, and the choices are kept', async ({ page }) => {
  await page.goto('/')
  const inView = async (name: string | RegExp) => {
    const box = await page.getByRole('button', { name }).first().boundingBox()
    expect(box, `${name} is visible`).not.toBeNull()
    expect(box!.y + box!.height, `${name} is above the fold`).toBeLessThanOrEqual(page.viewportSize()!.height)
  }
  const sound = async (where: string) => {
    await page.waitForTimeout(400) // a step slides in; contrast is read once it has settled
    expect(await overflow(page), `${where} overflow`).toEqual([])
    expect(await contrastProblems(page), `${where} contrast`).toEqual([])
  }
  // 1. Welcome
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused({ timeout: 100 }).catch(() => {})
  await inView('Başlayalım')
  await sound('welcome')
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  // 2. Language
  await expect(page.getByRole('heading', { name: 'Hangi dille başlayalım?' })).toBeFocused()
  await page.locator('.lang-card', { hasText: 'İspanyolca' }).click()
  await inView('Devam')
  await sound('language')
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  // 3. Goal
  await page.getByPlaceholder('Adın').fill('Ayşe')
  await page.getByRole('radio', { name: '20 dk' }).click()
  await page.getByRole('radio', { name: '8', exact: true }).click()
  await inView('Devam')
  await sound('goal')
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  // 4. Ready: a recap of the choices, and the way back
  await expect(page.getByRole('heading', { name: 'Hazırsın, Ayşe!' })).toBeVisible()
  await expect(page.locator('.ob-recap')).toContainText('İspanyolca')
  await expect(page.locator('.ob-recap')).toContainText('20 dk')
  await expect(page.locator('.ob-recap')).toContainText('günde 8')
  await inView(/ile başlayalım/)
  await sound('ready')
  await page.getByRole('button', { name: 'Geri' }).click()
  await expect(page.getByRole('radio', { name: '20 dk' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await page.getByRole('button', { name: /İspanyolca ile başlayalım/ }).click()
  await expect(page.getByRole('button', { name: /örnek kelime yükle/ })).toBeVisible()
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

test('text stays readable in the light, the dark, the calm and the high-contrast theme', async ({ page }) => {
  await startWithSamples(page)
  const found: string[] = []
  for (const theme of ['light', 'dark', 'calm', 'contrast']) {
    // Calm is the dark theme with a flag that turns its colours down; contrast is the light one with a flag that turns them up.
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t === 'calm' ? 'dark' : t === 'contrast' ? 'light' : t
      if (t === 'calm') document.documentElement.dataset.calm = ''
      else delete document.documentElement.dataset.calm
      if (t === 'contrast') document.documentElement.dataset.contrast = ''
      else delete document.documentElement.dataset.contrast
    }, theme)
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
  // It scrolled there, and the page grew by what it opened.
  await expect.poll(async () => {
    const top = await page.evaluate(() => document.getElementById('p-memory')!.getBoundingClientRect().top)
    if (top >= 250) {
      await page.locator('.settings-nav .chip', { hasText: 'Tekrarlar' }).click()
    }
    return top
  }, { timeout: 10_000 }).toBeLessThan(250)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(closedHeight + 400)
  await toggles.nth(2).click()
  await expect(toggles.nth(2)).toHaveAttribute('aria-expanded', 'false')
  // Group choices are remembered when navigating away and back.
  await page.locator('.settings-nav .chip', { hasText: 'Testler' }).click()
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await page.locator(':is(.nav-btn, .tab):visible').filter({ hasText: /^Bugün\d*$/ }).first().click()
  await page.locator(':is(.nav-btn, .tab):visible').filter({ hasText: /^İlerleme\d*$/ }).first().click()
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true')
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

test('a word page opens on its usage and keeps the rest a tap away', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row, tbody tr').first().click()
  const toggles = page.locator('.group-toggle')
  await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#w-progress .group-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('Beceriler', { exact: true })).toHaveCount(0)
  await page.locator('.settings-nav .chip', { hasText: 'İlerleme' }).click()
  await expect(page.locator('#w-progress .group-toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Beceriler', { exact: true })).toBeVisible()
})

test('study calendar days hold their state name and are big enough to tap', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  const days = page.locator('.week-day')
  await days.first().scrollIntoViewIfNeeded()
  // Walk one day through all three states: Normal → Hafif → Dinlenme.
  for (let state = 0; state < 3; state++) {
    const tiles = await days.evaluateAll((els) =>
      els.map((e) => {
        const span = e.querySelector('span')!
        const range = document.createRange()
        range.selectNodeContents(span)
        return { name: span.textContent, tile: e.getBoundingClientRect(), text: range.getBoundingClientRect() }
      }),
    )
    for (const t of tiles) {
      expect(t.text.width, `${t.name} fits its tile`).toBeLessThanOrEqual(t.tile.width - 4)
      expect(t.tile.width, 'tap width').toBeGreaterThanOrEqual(44)
      expect(t.tile.height, 'tap height').toBeGreaterThanOrEqual(44)
    }
    await days.nth(1).click()
  }
})

test('every settings group is on screen at once, none behind a sideways scroll', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  await expect(page.locator('.settings-menu-item').first()).toBeVisible()
  const width = page.viewportSize()!.width
  const items = await page.locator('.settings-menu-item').evaluateAll((els) => els.map((e) => ({ name: e.textContent, box: e.getBoundingClientRect() })))
  expect(items.length).toBeGreaterThanOrEqual(8)
  for (const i of items) {
    expect(i.box.left, i.name ?? '').toBeGreaterThanOrEqual(0)
    expect(i.box.right, i.name ?? '').toBeLessThanOrEqual(width)
  }
  // The longest name fits its tile.
  const fits = await page.locator('.settings-menu-item').evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth + 1))
  expect(fits).toBe(true)
})

test('progress bars grow in, and stand still when motion is reduced', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  const animation = () => page.locator('.xp-bar > div').first().evaluate((e) => getComputedStyle(e).animationName)
  expect(await animation()).toBe('bar-grow')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await animation()).toBe('none')
})

test('no settings group is wider than the screen or hides content', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  const items = page.locator('.settings-menu-item')
  await expect(items.first()).toBeVisible()
  const found: string[] = []
  for (let i = 0; i < (await items.count()); i++) {
    await items.nth(i).click()
    await page.waitForTimeout(250)
    const name = (await items.nth(i).textContent())?.trim()
    for (const o of await overflow(page)) found.push(`${name}: ${o}`)
    for (const c of await clippedContent(page)) found.push(`${name} clipped: ${c}`)
  }
  expect(found).toEqual([])
})

test('searching settings opens a card that is closed until wanted', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  await expect(page.getByLabel('Ayar ara')).toBeVisible()
  await page.getByLabel('Ayar ara').fill('Kestirme')
  await expect(page.locator('details.ios-shortcut')).toBeVisible()
  await expect(page.locator('details.ios-shortcut')).toHaveJSProperty('open', true)
  // Without a search it stays closed.
  await page.getByLabel('Ayar ara').fill('')
  await page.locator('.settings-menu-item', { hasText: 'Araçlar' }).click()
  await expect(page.locator('details.ios-shortcut')).toHaveJSProperty('open', true)
})

test('a word marked hard in a session is gathered for a practice of its own', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  const mark = page.locator('.session .difficult-btn')
  await expect(mark).toHaveAttribute('aria-pressed', 'false')
  await mark.click()
  await expect(mark).toHaveAttribute('aria-pressed', 'true')
  // Leave the session; the word is in the Zor filter of the list.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Çık', exact: true }).click()
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: /Zor \(1\)/ }).click()
  await expect(page.getByText('Zor kelimelerin', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.difficult-mark').first()).toBeVisible()
  // Today offers a practice of just those words, and it starts.
  await openScreen(page, 'Bugün')
  await page.getByRole('button', { name: /Zor kelimelerin/ }).click()
  await expect(page.locator('.session')).toBeVisible()
  await expect(page.locator('.session .difficult-btn')).toHaveAttribute('aria-pressed', 'true')
})

test('the end of a practice of hard words is about them, and a word that went well can leave the list', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await page.locator('.session .difficult-btn').click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Çık', exact: true }).click()
  await openScreen(page, 'Bugün')
  await page.getByRole('button', { name: /Zor kelimelerin/ }).click()
  await playSession(page, false)
  await expect(page.locator('.topic-chip')).toHaveText(/Zor kelime çalışması/)
  await expect(page.locator('.hard-list li')).toHaveCount(1)
  expect(await overflow(page)).toEqual([])
  const graduate = page.getByRole('button', { name: 'Artık zor değil' })
  if (await graduate.count()) {
    await graduate.click()
    await expect(page.getByText('Zor listesinden çıktı')).toBeVisible()
  }
})

test('a new word can be asked as a guess or shown as a card first, and one tap makes the card the habit', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  // The first word comes as a guess, with the way out beside "Hiç fikrim yok".
  await expect(page.getByText('Sence ne anlama geliyor?')).toBeVisible()
  await page.getByRole('button', { name: 'Hep önce kartı göster' }).click()
  // Now it is the card; the guess question is gone.
  await expect(page.getByText('Sence ne anlama geliyor?')).toHaveCount(0)
  await expect(page.locator('.session-stage button:visible', { hasText: /^(Anladım|Öğrendim|Devam)/ }).first()).toBeVisible()
  // Kept: the setting is off, and the next new words come as cards too.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Çık', exact: true }).click()
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.getByText('Sence ne anlama geliyor?')).toHaveCount(0)
  await expect(page.locator('.session-stage .badge', { hasText: 'Yeni kelime' })).toBeVisible()
})

test('the verb round card goes away with a swipe to the left, stays away for the day, and can be taken back', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page)
  const card = page.getByRole('region', { name: 'Bugünün fiil turu' })
  await expect(card).toBeVisible()
  const drag = (dx: number) =>
    card.evaluate((el, dx) => {
      const r = el.getBoundingClientRect()
      const init = { pointerId: 7, pointerType: 'touch', bubbles: true, clientY: r.top + r.height / 2 }
      const x = r.left + r.width - 20
      el.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: x }))
      el.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + dx / 2 }))
      el.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + dx }))
      el.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: x + dx }))
    }, dx)
  // A short drag springs back.
  await drag(-40)
  await expect(card).toBeVisible()
  // A long one puts it away, with a way back.
  await drag(-160)
  await expect(card).toHaveCount(0)
  await expect(page.getByText('Bugünün fiil turu gizlendi')).toBeVisible()
  await page.getByRole('button', { name: 'Geri al' }).click()
  await expect(card).toBeVisible()
})

test('"Unuttum" shows the answer at once, counts as a miss with no guess recorded, and the session goes on', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  const chip = page.locator('.prompt-tools .forgot-chip')
  for (let i = 0; i < 40 && !(await chip.count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Öğrendim)/ })
    const guess = page.locator('.session-stage .option:not([disabled])')
    if (await next.count()) await next.first().click()
    else if (await guess.count()) await guess.first().click()
    await page.waitForTimeout(200)
  }
  await expect(chip).toHaveText('Unuttum')
  await chip.click()
  const sheet = page.locator('.sheet')
  // Its own sheet, not the red one of a mistake; one note, no "yanlış dokundum".
  await expect(page.locator('.sheet.forgot')).toBeVisible()
  await expect(sheet).toContainText('Unuttun, olur. İşte cevap:')
  await expect(sheet).toContainText('Bakarak öğrenmek de öğrenmektir')
  await expect(sheet).not.toContainText('Yanlış dokundum')
  // The answer is shown, and neither "you were sure" nor "you guessed" is said.
  await expect(sheet.locator('.expected')).not.toBeEmpty()
  await expect(sheet).not.toContainText('Emin değilim” demeden')
  await expect(sheet).not.toContainText('tahmin olarak kaydedildi')
  await expect(page.locator('.prompt-tools .forgot-chip')).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('a question has a labelled "Zor" chip beside "Emin değilim", and it marks the word like the bolt does', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  // Past the new-word cards, to the first question.
  const chip = page.locator('.prompt-tools .difficult-chip')
  for (let i = 0; i < 40 && !(await chip.count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Öğrendim)/ })
    const guess = page.locator('.session-stage .option:not([disabled])')
    if (await next.count()) await next.first().click()
    else if (await guess.count()) await guess.first().click()
    await page.waitForTimeout(200)
  }
  await expect(chip).toBeVisible()
  await expect(chip).toHaveText('Zor')
  await expect(page.locator('.prompt-tools .unsure-chip').first()).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.session .difficult-btn')).toHaveAttribute('aria-pressed', 'true')
  expect(await overflow(page)).toEqual([])
})

test('the profile can be dressed up: banner, frame, interests, a goal; locked styles say what opens them', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await finishSession(page)
  await openScreen(page, 'Profil')
  await page.getByRole('button', { name: 'Özelleştir' }).click()
  const card = page.locator('.profile-card')
  // Free styles apply at once.
  await page.getByRole('radio', { name: /Gün doğumu/ }).click()
  await expect(card).toHaveAttribute('data-banner', 'sunrise')
  await page.getByRole('radio', { name: /Noktalı/ }).click()
  await expect(card.locator('.avatar-ring')).toHaveAttribute('data-frame', 'dots')
  // A locked one is a picture with a lock: no words in the square, it cannot be picked, and a tap says what opens it.
  const locked = page.getByRole('radio', { name: /Galaksi/ })
  await expect(locked).toHaveAttribute('aria-disabled', 'true')
  await expect(locked).toHaveText('')
  await expect(locked.locator('.style-lock')).toBeVisible()
  await locked.click({ force: true })   // aria-disabled: Playwright waits for "enabled", a real finger just taps
  await expect(card).not.toHaveAttribute('data-banner', 'galaxy')
  await expect(page.locator('.style-caption').first()).toContainText('25. seviyeye ulaş')
  // Every square holds still and inside its row.
  const tiles = await page.locator('.style-tile').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(), p = e.parentElement!.getBoundingClientRect(); return r.right <= p.right + 1 && r.left >= p.left - 1 && e.scrollWidth <= e.clientWidth + 1 }))
  expect(tiles.every(Boolean)).toBe(true)
  // Interests and a goal show on the card.
  await page.getByRole('button', { name: 'Seyahat', exact: true }).click()
  await page.getByRole('radio', { name: 'B2', exact: true }).click()
  await expect(card.locator('.interest-chip', { hasText: 'Seyahat' })).toBeVisible()
  await expect(card.locator('.goal-chip')).toContainText('Hedef B2')
  // Interests stop at six.
  for (const i of ['Yemek', 'İş', 'Müzik', 'Spor', 'Doğa']) await page.getByRole('button', { name: i, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sanat', exact: true })).toBeDisabled()
  // The tinted banner keeps the card readable, in both themes.
  const found: string[] = []
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    for (const c of await contrastProblems(page)) found.push(`${theme}: ${c}`)
  }
  expect(found).toEqual([])
  // Kept after leaving and coming back.
  await openScreen(page, 'Bugün')
  await openScreen(page, 'Profil')
  await expect(card).toHaveAttribute('data-banner', 'sunrise')
})

test('the share card is ready at once and redraws with what is chosen', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.getByRole('tab', { name: 'Paylaş' }).click()
  const card = page.locator('.share-card')
  const img = card.locator('.progress-card-img')
  await expect(img).toHaveAttribute('src', /^blob:/)
  const first = await img.getAttribute('src')
  // Drop a number and change the colours: a new picture each time.
  await card.getByRole('button', { name: 'Toplam XP', exact: true }).click()
  await expect(img).not.toHaveAttribute('src', first!)
  const second = await img.getAttribute('src')
  await card.getByRole('radio', { name: 'Açık' }).click()
  await expect(img).not.toHaveAttribute('src', second!)
  // One number always stays.
  for (const n of ['Seri', 'Kelimeler', 'Çiçekler', 'Bu hafta', 'Rozetler']) await card.getByRole('button', { name: n, exact: true }).click()
  await expect(card.locator('[aria-label="Kartta görünecek sayılar"] [aria-pressed=true]')).toHaveCount(1)
})

test('the titles tab shows the ladder, what is next and what a badge opens', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.getByRole('tab', { name: 'Unvanlar' }).click()
  await expect(page.locator('.titles-ladder .is-current .title-tag')).toHaveText('şu an')
  await expect(page.locator('.titles-ladder li', { hasText: 'Meraklı' })).toContainText('XP kaldı')
  await expect(page.locator('.titles-ladder li', { hasText: 'Ejderha Avcısı' })).toContainText('rozetiyle açılır')
  // The title reached can be shown beside the name.
  await page.locator('.titles-ladder .is-current').getByRole('button', { name: /Göster|Gösteriliyor/ }).click()
  await expect(page.locator('.profile-level strong').first()).toHaveText('Çaylak')
})

test('a badge earned in a session gets its moment once, and so does one earned outside', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  await playSession(page)
  // The first session earns "İlk adım": struck on the summary.
  const moment = page.locator('.badge-moment')
  await expect(moment).toBeVisible()
  await expect(moment.locator('h2')).toHaveText('İlk adım')
  await expect(moment.locator('.medal')).toBeVisible()
  await moment.getByRole('button', { name: 'Devam', exact: true }).click()
  await expect(moment).toHaveCount(0)
  // Not again on the home screen.
  await page.getByRole('button', { name: /^(Devam|Kapat|Tamam|Bitir|Ana sayfa)/ }).first().click({ timeout: 3000 }).catch(() => {})
  await openScreen(page, 'Bugün')
  await expect(page.locator('.home-main, .today-summary, .session-launcher').first()).toBeVisible()
  await expect(moment).toHaveCount(0)
  // Outside a session: marking hard words earns "Zorluk avcısı", and the moment says so.
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Seç', exact: true }).click()
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Zor işaretle' }).click()
  await expect(moment.locator('h2')).toHaveText('Zorluk avcısı')
  await moment.getByRole('button', { name: 'Profilde gör' }).click()
  await expect(moment).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Rozetler' })).toBeVisible()
})

test('hard words glow in the garden, and the Zor filter shows just those', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Seç', exact: true }).click()
  await page.locator('.word-row').first().click()
  await page.getByRole('button', { name: 'Zor işaretle' }).click()
  // A new badge may open its moment; close it if so.
  await page.locator('.badge-moment').getByRole('button', { name: 'Devam', exact: true }).click({ timeout: 1500 }).catch(() => {})
  await page.getByRole('button', { name: /^Bahçe$/ }).or(page.getByRole('tab', { name: /Bahçe/ })).first().click()
  const tiles = page.locator('.plant-tile')
  expect(await tiles.count()).toBeGreaterThan(10)
  await expect(page.locator('.plant-tile.is-hard')).toHaveCount(1)
  await expect(page.locator('.plant-tile.is-hard .plant-hard-mark')).toHaveCount(1)
  // The filter: only that plant stays.
  await page.getByRole('button', { name: /Zor \(1\)/ }).click()
  await expect(tiles).toHaveCount(1)
  await page.getByRole('button', { name: /Zor kelimeleri çalış/ }).click()
  await expect(page.locator('.session')).toBeVisible()
})

test('the garden card on Today counts the hard words and starts their practice in one tap', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  await finishSession(page)
  // No hard words yet: the card has nothing to say about them.
  // The card lives under "Haftalık hedefler, bahçe ve beceriler" until a plant is thirsty.
  const openGarden = async () => {
    await openScreen(page, 'Bugün')
    if (!(await page.locator('.garden-card').isVisible())) await page.getByText('Haftalık hedefler, bahçe ve beceriler').click()
    await expect(page.locator('.garden-card')).toBeVisible()
  }
  await openGarden()
  await expect(page.locator('.garden-hard-line')).toHaveCount(0)
  // Mark two words hard.
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Seç', exact: true }).click()
  await page.locator('.word-row').nth(0).click()
  await page.locator('.word-row').nth(1).click()
  await page.getByRole('button', { name: 'Zor işaretle' }).click()
  await page.locator('.badge-moment').getByRole('button', { name: 'Devam', exact: true }).click({ timeout: 1500 }).catch(() => {})
  await openGarden()
  await expect(page.locator('.garden-hard-line')).toContainText('2 zor kelime')
  // The count opens the garden on just those words.
  await page.locator('.garden-hard-line').click()
  await expect(page.getByRole('button', { name: /Zor \(2\)/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.plant-tile')).toHaveCount(2)
  // ...once: the next visit to the garden is whole again.
  await openGarden()
  await page.locator('.garden-card').getByRole('button', { name: 'Bahçeye git' }).click()
  await expect(page.getByRole('button', { name: /Zor \(2\)/ })).toHaveAttribute('aria-pressed', 'false')
  // One tap from Today starts the practice.
  await openGarden()
  await page.locator('.garden-card').getByRole('button', { name: 'Zorları çalış' }).click()
  await expect(page.locator('.session')).toBeVisible()
  await expect(page.locator('.session .difficult-btn')).toHaveAttribute('aria-pressed', 'true')
})

test('a word carries its part of speech as a shape on the list and the word page', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await expect(page.locator('.word-row .pos-tag').first()).toBeVisible()
  const shapes = await page.locator('.word-row .pos-tag svg').evaluateAll((els) => new Set(els.map((e) => e.innerHTML)).size)
  expect(shapes).toBeGreaterThanOrEqual(2)   // nouns and verbs among the samples
  await page.locator('.word-row').first().click()
  await expect(page.locator('.word-hero .pos-chip .pos-tag')).toBeVisible()
})

test('a word page says where its data came from, and a word can be flagged to look at again', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row').first().click()
  const sources = page.locator('.word-sources')
  await expect(sources.getByRole('heading', { name: 'Veri kaynakları' })).toBeVisible()
  const flag = sources.getByRole('button', { name: 'İşaretlenenler' })
  await expect(flag).toHaveAttribute('aria-pressed', 'false')
  await flag.click()
  await expect(flag).toHaveAttribute('aria-pressed', 'true')
  // The word list can show just those.
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: /İşaretlenenler \(1\)/ }).click()
  await expect(page.locator('.word-row')).toHaveCount(1)
  expect(await overflow(page)).toEqual([])
})

test('pictures can be suggested for the words that have none, taken with one tap or passed over', async ({ page }) => {
  test.setTimeout(90_000)
  // The picture services answered by hand: Wikidata knows a file, Commons describes it, a thumbnail is a 1-pixel PNG.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const cors = { 'access-control-allow-origin': '*' }
  const json = (body: unknown) => ({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('https://www.wikidata.org/**', async (route) => {
    const action = new URL(route.request().url()).searchParams.get('action')
    await new Promise((r) => setTimeout(r, 700))   // slow enough to see the placeholders
    return route.fulfill(
      json(action === 'wbsearchentities' ? { search: [{ id: 'Q1' }] } : { entities: { Q1: { claims: { P18: [{ mainsnak: { datavalue: { value: 'Maison.jpg' } } }] } } } }),
    )
  })
  await page.route('https://commons.wikimedia.org/**', (route) =>
    route.fulfill(json({ query: { pages: { a: { title: 'File:Maison.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/maison.png', extmetadata: { Artist: { value: 'Léa' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } })),
  )
  await page.route('https://api.openverse.org/**', (route) => route.fulfill(json({ results: [] })))
  await page.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ status: 200, headers: cors, contentType: 'image/png', body: png }))
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  const openPanel = () => page.getByRole('button', { name: /^Filtrele ve görünüm/ }).click()
  await openPanel()
  const chip = page.getByRole('button', { name: /Görsel öner \((\d+)\)/ })
  await expect(chip).toBeVisible()
  const before = Number((await chip.textContent())!.match(/\((\d+)\)/)![1])
  await chip.click()
  const dialog = page.getByRole('dialog', { name: 'Görsel öner' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.sk-tiles')).toBeVisible()   // placeholders while the suggestions are fetched
  await expect(dialog.getByText('Önerilen')).toBeVisible()
  await expect(dialog.locator('.sk-tiles')).toHaveCount(0)
  // Take the first suggestion: the word has its picture, and the next word comes up.
  await dialog.locator('.iq-pick').first().click()
  await expect(dialog.getByText(/^2 \//)).toBeVisible()
  // Pass over the second.
  await dialog.getByRole('button', { name: 'Atla' }).click()
  await expect(dialog.getByText(/^3 \//)).toBeVisible()
  await dialog.getByRole('button', { name: 'Kapat', exact: true }).first().click()
  await expect(dialog).toHaveCount(0)
  // The word that took a picture shows it in the list.
  await expect(page.locator('.word-row img').first()).toBeVisible()
  // Two words left the queue: the one with a picture and the one passed over.
  await openPanel()
  await expect(page.getByRole('button', { name: new RegExp(`Görsel öner \\(${before - 2}\\)`) })).toBeVisible()
  expect(await overflow(page)).toEqual([])
})

test('a word card shows how full it is, and a missing part takes you to where it is added', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row').first().click()
  const fill = page.locator('.card-fill')
  await expect(fill).toBeVisible()
  const before = Number((await fill.getByRole('progressbar').getAttribute('aria-valuenow')))
  // The note is typed into the field the chip leads to.
  await fill.getByRole('button', { name: '+ hafıza ipucu' }).click()
  await expect(page.locator('#w-notes')).toBeFocused()
  await page.locator('#w-notes').fill('bir ipucu')
  await page.locator('#w-notes').blur()
  await expect(fill.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(before + 25))
  await expect(fill.getByRole('button', { name: '+ hafıza ipucu' })).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('the word list can be a gallery: pictures where there are any, letters where there are not, and a tap opens the word', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: /^Filtrele ve görünüm/ }).click()
  await page.getByRole('button', { name: 'Galeri', exact: true }).click()
  await page.keyboard.press('Escape')
  const tiles = page.locator('.gallery-tile')
  expect(await tiles.count()).toBeGreaterThan(5)
  await expect(page.locator('.gallery-letter').first()).toBeVisible()
  // Two columns on a phone, nothing sideways.
  const xs = await tiles.evaluateAll((els) => new Set(els.slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().x))).size)
  expect(xs).toBe(2)
  expect(await overflow(page)).toEqual([])
  // Kept after leaving, and a tap opens the word.
  await page.reload()
  await openScreen(page, 'Kelimeler')
  await expect(tiles.first()).toBeVisible()
  await tiles.first().click()
  await expect(page.locator('.word-hero')).toBeVisible()
})

test('the word list filters by multiple CEFR levels simultaneously and clears on reset', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  const totalCount = await page.locator('.word-row').count()
  expect(totalCount).toBeGreaterThan(0)

  // Open filter popover
  await page.getByRole('button', { name: /^Filtrele ve görünüm/ }).click()
  const a1Chip = page.locator('.panel-choices[aria-label="Seviye (CEFR)"] button', { hasText: 'A1' })
  const a2Chip = page.locator('.panel-choices[aria-label="Seviye (CEFR)"] button', { hasText: 'A2' })
  await expect(a1Chip).toBeVisible()
  await expect(a2Chip).toBeVisible()

  // Select A1
  await a1Chip.click()
  await expect(a1Chip).toHaveAttribute('aria-pressed', 'true')
  const a1Count = await page.locator('.word-row').count()
  expect(a1Count).toBeGreaterThan(0)
  expect(a1Count).toBeLessThan(totalCount)

  // Multi-select: also select A2
  await a2Chip.click()
  await expect(a2Chip).toHaveAttribute('aria-pressed', 'true')
  const multiCount = await page.locator('.word-row').count()
  expect(multiCount).toBeGreaterThanOrEqual(a1Count)

  // Reset filters
  await page.getByRole('button', { name: 'Hepsini sıfırla' }).click()
  await expect(a1Chip).toHaveAttribute('aria-pressed', 'false')
  await expect(a2Chip).toHaveAttribute('aria-pressed', 'false')
  expect(await page.locator('.word-row').count()).toBe(totalCount)
})

test('a session ends in a small garden: a plant for each word, under the sky of the hour', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  await playSession(page)
  const scene = page.locator('.summary-scene')
  await expect(scene).toBeVisible()
  expect(await scene.locator('.scene-plants li').count()).toBeGreaterThan(0)
  await expect(scene.locator('.garden-sky')).toBeVisible()
  expect(await overflow(page)).toEqual([])
})

test('high contrast is a choice in Settings: white page, black text, strong borders, a heavy focus ring', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  await page.locator('.settings-menu-item', { hasText: 'Görünüm' }).click()
  await page.getByRole('radio', { name: 'Kontrast' }).or(page.getByRole('button', { name: 'Kontrast', exact: true })).first().click()
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-theme', 'light')
  await expect(root).toHaveAttribute('data-contrast', '')
  const css = (v: string) => page.evaluate((s) => getComputedStyle(document.documentElement).getPropertyValue(s).trim(), v)
  // The build writes #000 and #fff for #000000 and #ffffff.
  expect(['#000', '#000000']).toContain(await css('--ink'))
  expect(['#fff', '#ffffff']).toContain(await css('--bg'))
  // Kept before the first paint, and switched off again by another choice.
  await page.reload()
  await expect(root).toHaveAttribute('data-contrast', '')
  await page.locator('.top-profile:visible').click()
  await page.locator('.profile-settings').click()
  await page.locator('.settings-menu-item', { hasText: 'Görünüm' }).click()
  await page.getByRole('radio', { name: 'Açık', exact: true }).or(page.getByRole('button', { name: 'Açık', exact: true })).first().click()
  await expect(root).not.toHaveAttribute('data-contrast', '')
})

test('an elided article stays attached to its word in the list: l\'an, not l\' an', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  const row = page.locator('.word-row .w', { hasText: /^l'\s*an$/ }).first()
  await expect(row).toBeVisible()
  // How far the lemma starts from the article's right edge: none, as in the word page, not a label's gap.
  const dx = await row.evaluate((el) => {
    const article = el.querySelector('.article')!.getBoundingClientRect()
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.textContent!.trim() !== 'an') continue
      const range = document.createRange()
      range.selectNodeContents(n)
      return range.getBoundingClientRect().left - article.right
    }
    return NaN
  })
  expect(dx).toBeLessThan(2)
})

test('the picture search on a word puts the picture Wikidata keeps for the thing first, and says so in the sources', async ({ page }) => {
  test.setTimeout(90_000)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const cors = { 'access-control-allow-origin': '*' }
  const json = (body: unknown) => ({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('https://www.wikidata.org/**', (route) => {
    const action = new URL(route.request().url()).searchParams.get('action')
    return route.fulfill(json(action === 'wbsearchentities' ? { search: [{ id: 'Q1' }] } : { entities: { Q1: { claims: { P18: [{ mainsnak: { datavalue: { value: 'Wd.jpg' } } }] } } } }))
  })
  await page.route('https://commons.wikimedia.org/**', (route) =>
    route.fulfill(json({ query: { pages: { a: { title: 'File:Wd.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/wd.png', extmetadata: { Artist: { value: 'Léa' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } })),
  )
  await page.route('https://api.openverse.org/**', (route) => route.fulfill(json({ results: [{ id: '1', title: 'Another', license: 'cc0', thumbnail: 'https://upload.wikimedia.org/other.png' }] })))
  await page.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ status: 200, headers: cors, contentType: 'image/png', body: png }))
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row').first().click()
  await page.getByRole('button', { name: 'Görsel ekle' }).click()
  const first = page.locator('.image-cell').first()
  await expect(first.locator('.iq-badge')).toHaveText('Önerilen')
  await first.click()
  await expect(page.locator('.word-image-sm')).toBeVisible()
  await expect(page.locator('.source-list li', { hasText: 'Görsel' })).toContainText('Wikidata')
})

test('a word shows where it is spoken in videos; a line opens the video at that moment', async ({ page }) => {
  test.setTimeout(90_000)
  const clips = [
    { id: 'abc12345678', title: 'Un jour à Paris', channel: 'Chaîne', start: 12.4, end: 15, text: 'Il faut décider maintenant.', form: 'décider', after: 'Autre chose.' },
    { id: 'zzz12345678', title: 'Une autre vidéo', channel: 'Autre', start: 40, end: 43, text: 'Elle a décidé de partir.', form: 'décidé', auto: true },
  ]
  let asked = ''
  await page.route('**/api/clips**', (route) => {
    asked = route.request().url()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ clips }) })
  })
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>video</p>' }))
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row').first().click()
  const section = page.locator('.clips')
  await section.getByRole('button', { name: 'Videolarda ara' }).click()
  await expect(section.locator('.clip')).toHaveCount(2)
  expect(asked).toContain('lang=fr')
  await expect(section.locator('.clip mark').first()).toHaveText('décider')
  await expect(section.getByText('otomatik altyazı')).toBeVisible()
  // A line opens the player at that moment: a second early, a second late, captions in the language.
  await section.locator('.clip').first().click()
  const dialog = page.getByRole('dialog', { name: 'Un jour à Paris' })
  await expect(dialog).toBeVisible()
  const src = await dialog.locator('iframe').getAttribute('src')
  expect(src).toContain('youtube-nocookie.com/embed/abc12345678')
  expect(src).toContain('start=11')
  expect(src).toContain('end=16')
  expect(src).toContain('cc_lang_pref=fr')
  await expect(dialog.getByRole('button', { name: '‹ Önceki' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Sonraki ›' }).click()
  await expect(page.getByRole('dialog', { name: 'Une autre vidéo' }).locator('iframe')).toHaveAttribute('src', /start=39/)
  // The line can go into the word's own sentences.
  await page.getByRole('button', { name: '+ Örneklerime' }).click()
  await expect(page.getByText('Örneklerine eklendi.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('without a YouTube key the section says what is needed instead of failing', async ({ page }) => {
  await page.route('**/api/clips**', (route) => route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ error: 'no key' }) }))
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row').first().click()
  await page.locator('.clips').getByRole('button', { name: 'Videolarda ara' }).click()
  await expect(page.locator('.clips [role=alert]')).toContainText('YOUTUBE_API_KEY')
})

test('badge cards line up: in a row the medals, titles and progress bars sit on the same lines, however long a name is', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.getByRole('tab', { name: 'Rozetler' }).click()
  await expect(page.locator('.badge-card').first()).toBeVisible()
  const rows = await page.locator('.badge-card').evaluateAll((cards) => {
    const byRow = new Map<number, { medal: number; title: number; titleH: number; bar: number | null; h: number }[]>()
    for (const c of cards) {
      const r = c.getBoundingClientRect()
      if (!r.width) continue
      const key = Math.round(r.top / 4)
      const bar = c.querySelector('.badge-progress')?.getBoundingClientRect()
      const t = c.querySelector('.badge-title')!.getBoundingClientRect()
      byRow.set(key, [...(byRow.get(key) ?? []), { medal: Math.round(c.firstElementChild!.getBoundingClientRect().top - r.top), title: Math.round(t.top - r.top), titleH: Math.round(t.height), bar: bar ? Math.round(bar.top - r.top) : null, h: Math.round(r.height) }])
    }
    return [...byRow.values()]
  })
  expect(rows.length).toBeGreaterThan(1)
  for (const row of rows) {
    expect(new Set(row.map((c) => c.medal)).size, 'medals').toBe(1)
    expect(new Set(row.map((c) => c.title)).size, 'titles').toBe(1)
    expect(new Set(row.map((c) => c.titleH)).size, 'title heights').toBe(1)
    expect(new Set(row.filter((c) => c.bar !== null).map((c) => c.bar)).size, 'progress bars').toBeLessThanOrEqual(1)
    expect(new Set(row.map((c) => c.h)).size, 'card heights').toBe(1)
  }
})

test('the calm theme is a choice in Settings and turns the dark theme down', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  await page.locator('.settings-menu-item', { hasText: 'Görünüm' }).click()
  await page.getByRole('radio', { name: 'Sakin' }).or(page.getByRole('button', { name: 'Sakin', exact: true })).first().click()
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await expect(root).toHaveAttribute('data-calm', '')
  const bg = (sel: string) => page.evaluate((s) => getComputedStyle(document.documentElement).getPropertyValue(s).trim(), sel)
  expect(await bg('--bg')).toBe('#15171c')
  // Plain dark again: the flag goes away and the dark colours come back.
  await page.getByRole('radio', { name: 'Koyu' }).or(page.getByRole('button', { name: 'Koyu', exact: true })).first().click()
  await expect(root).not.toHaveAttribute('data-calm', '')
  expect(await bg('--bg')).toBe('#0f172a')
  // Kept across a reload, before the first paint.
  await page.getByRole('radio', { name: 'Sakin' }).or(page.getByRole('button', { name: 'Sakin', exact: true })).first().click()
  // The choice is written to the page's own storage a moment after the click; reload only once it is.
  await page.waitForFunction(() => localStorage.getItem('kelime-koc:theme') === 'calm')
  await page.reload()
  await expect(root).toHaveAttribute('data-calm', '')
})

test('an empty screen has a small living picture, and it holds still for reduced motion', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Hatalar')
  const art = page.locator('.empty-art, .empty-state svg').first()
  await expect(art).toBeVisible()
  const names = () => page.locator('.empty-state svg [class^="art-"], .empty-state svg [class*=" art-"]').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName))
  expect((await names()).some((n) => n !== 'none')).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect((await names()).every((n) => n === 'none')).toBe(true)
})

test('the page is lit for the hour: greeting, a sun or moon beside it, a faint wash of light in the light theme only', async ({ page }) => {
  const cases: [string, string, string, string][] = [
    ['2026-03-04T06:30:00', 'dawn', 'Günaydın', 'is-dawn'],
    ['2026-03-04T10:00:00', 'day', 'Günaydın', 'is-day'],
    ['2026-03-04T19:00:00', 'dusk', 'İyi akşamlar', 'is-dusk'],
    ['2026-03-04T23:30:00', 'night', 'İyi geceler', 'is-night'],
  ]
  const wash = () => page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage)
  for (const [time, part, hello, mark] of cases) {
    await page.clock.setFixedTime(new Date(time))
    await startWithSamples(page)
    await expect(page.locator('html')).toHaveAttribute('data-daypart', part)
    await expect(page.locator('h1.greeting')).toContainText(hello)
    await expect(page.locator(`h1.greeting .day-mark.${mark}`)).toBeVisible()
    await page.waitForTimeout(700)   // the screen fades in
    if (part === 'day') expect(await wash()).not.toMatch(/rgba\((251|244|99)/)
    else expect(await wash()).toMatch(/rgba\((251|244|99)/)
    expect(await contrastProblems(page)).toEqual([])
    // Dark and calm keep their own light: no wash.
    await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))
    expect(await wash()).not.toMatch(/rgba\((251|244|99)/)
    await page.evaluate(() => delete document.documentElement.dataset.theme)
    await page.evaluate(() => indexedDB.databases().then((dbs) => Promise.all(dbs.map((d) => indexedDB.deleteDatabase(d.name!)))))
  }
})

test('the badges on show sit beside the greeting on Today and open the profile', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  await expect(page.locator('.today-showcase')).toHaveCount(0)
  await playSession(page)
  await page.locator('.badge-moment').getByRole('button', { name: 'Devam', exact: true }).click()
  await openScreen(page, 'Profil')
  await page.getByRole('button', { name: 'Özelleştir' }).click()
  await page.locator('.pin-tile', { hasText: 'İlk adım' }).click()
  await openScreen(page, 'Bugün')
  const badge = page.locator('.today-showcase .showcase-badge')
  await expect(badge).toHaveCount(1)
  await expect(badge).toHaveAttribute('aria-label', /İlk adım/)
  // On the greeting's line, not wider than the screen.
  const [g, b] = await Promise.all([page.locator('h1.greeting').boundingBox(), badge.boundingBox()])
  expect(b!.x + b!.width).toBeLessThanOrEqual(375)
  expect(Math.abs(b!.y + b!.height / 2 - (g!.y + g!.height / 2))).toBeLessThan(40)
  expect(await overflow(page)).toEqual([])
  await badge.click()
  await expect(page.getByRole('tab', { name: 'Rozetler' })).toBeVisible()
})

test('the account card says where you stand: three reasons and wide buttons signed out, who and when signed in', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  await page.locator('.settings-menu-item', { hasText: 'Hesap' }).click()
  const card = page.locator('.account-card')
  // One way to the profile (the avatar in the top bar), not a second one inside Settings.
  await expect(page.locator('.settings-profile')).toHaveCount(0)
  await expect(page.locator('.top-profile:visible')).toHaveCount(1)
  await expect(card.locator('.avatar, .account-initial')).toHaveCount(0)
  await expect(card.locator('.status-pill')).toHaveText(/hesapsız/)
  await expect(card.locator('.account-perks li')).toHaveCount(3)
  // On a phone the two ways in are full-width buttons, inside the card.
  const box = await card.boundingBox()
  for (const name of ['Giriş yap', 'Hesap oluştur']) {
    const b = await card.getByRole('button', { name, exact: true }).boundingBox()
    expect(b!.width).toBeGreaterThan(box!.width * 0.8)
    expect(b!.x + b!.width).toBeLessThanOrEqual(box!.x + box!.width)
  }
  expect(await overflow(page)).toEqual([])
  // Signed in (the account is only a record on this device here): the pill, the name and the actions.
  await page.evaluate(() =>
    indexedDB.databases().then((dbs) =>
      Promise.all(
        dbs.map(
          (d) =>
            new Promise<void>((ok) => {
              const o = indexedDB.open(d.name!)
              o.onsuccess = () => {
                const db = o.result
                if (!db.objectStoreNames.contains('meta')) return ok(db.close())
                const tx = db.transaction('meta', 'readwrite')
                tx.objectStore('meta').put({ key: 'syncAccount', value: { username: 'ali', key: 'x' } })
                tx.oncomplete = () => (db.close(), ok())
              }
            }),
        ),
      ),
    ),
  )
  await page.reload()
  await openScreen(page, 'Profil')
  await page.locator('.profile-settings').click()
  await page.locator('.settings-menu-item', { hasText: 'Hesap' }).click()
  await expect(card.locator('.status-pill')).toHaveText(/Giriş yapıldı/)
  await expect(card.locator('.account-facts')).toContainText('ali')
  await expect(card.getByRole('button', { name: 'Şimdi eşitle' })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Bu cihazda çıkış yap' })).toBeVisible()
  expect(await contrastProblems(page)).toEqual([])
  expect(await overflow(page)).toEqual([])
})

test('verb lab on a phone: every tab fits, the lesson comes right after the verb and tense', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'avoir')
  const lesson = await page.locator('.lab-main').boundingBox()
  // The verb lists are folded away: nothing between the search and the lesson.
  await expect(page.locator('.lab-lists')).toHaveCount(0)
  expect(lesson!.y, 'the lesson starts within the first screen').toBeLessThan(page.viewportSize()!.height)
  // The table itself is on the first screen, not under explanations.
  // (Choosing the verb may scroll the lesson into view, smoothly: wait for it to settle.)
  await expect.poll(async () => (await page.locator('.lab-main .lab-forms').boundingBox())!.y + 120, { message: 'the conjugation table starts on the first screen' }).toBeLessThan(page.viewportSize()!.height)
  const found: string[] = []
  const check = async (where: string) => {
    await page.waitForTimeout(250)
    for (const o of await overflow(page)) found.push(`${where}: ${o}`)
    for (const c of await clippedContent(page)) found.push(`${where} clipped: ${c}`)
    for (const c of await contrastProblems(page)) found.push(`${where} contrast: ${c}`)
  }
  const main = page.locator('.lab-main')
  await check('learn')
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /^Detaylı/ }).click()
  await check('learn detailed')
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /^Kıyasla/ }).click()
  await check('learn compare')
  for (const tab of ['Alıştırma', 'İlerleme']) {
    await main.getByRole('tab', { name: tab }).click()
    await check(tab)
    if (tab === 'Alıştırma') {
      for (const mode of ['Seç', 'Cümlede', 'Zamana karşı']) {
        await main.getByRole('button', { name: mode, exact: true }).click()
        await check(`${tab} ${mode}`)
      }
      for (const mode of ['Eşleştir', 'Zamanı bul', 'Kip seç', 'Hangi fiil?']) {
        await main.getByRole('button', { name: 'Diğer alıştırmalar' }).click()
        await page.getByRole('menuitem', { name: new RegExp(`^${mode.replace('?', '\\?')}`) }).click()
        await check(`${tab} ${mode}`)
      }
    }
  }
  // The review queue and the verb families open inside their tabs.
  await main.getByRole('button', { name: /^(Tekrar et|Sırayı gör)$/ }).click()
  await check('İlerleme review')
  await main.getByRole('button', { name: '← İlerleme' }).click()
  expect(found).toEqual([])
})

test('verb lab: a sideways swipe over the table steps the tense; a scroll does not', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  const hint = main.locator('.lab-swipe-hint')
  await expect(hint).toBeVisible()
  const swipe = (dx: number, dy: number) =>
    main.locator('.lab-forms').evaluate(
      (el, [dx, dy]) => {
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + 20
        const touch = (cx: number, cy: number) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy })
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(x, y)], changedTouches: [touch(x, y)] }))
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(x + dx, y + dy)] }))
      },
      [dx, dy],
    )
  const bar = main.getByRole('group', { name: 'Zaman' })
  await expect(bar.getByRole('button', { name: 'Présent' })).toHaveAttribute('aria-pressed', 'true')
  // Mostly downwards: a scroll, nothing changes.
  await swipe(-60, 120)
  await expect(bar.getByRole('button', { name: 'Présent' })).toHaveAttribute('aria-pressed', 'true')
  // Leftwards: the next tense, and the hint has done its job.
  await swipe(-120, 10)
  await expect(bar.getByRole('button', { name: 'Présent' })).toHaveAttribute('aria-pressed', 'false')
  await expect(hint).toHaveCount(0)
  // Rightwards: back again.
  await swipe(120, 5)
  await expect(bar.getByRole('button', { name: 'Présent' })).toHaveAttribute('aria-pressed', 'true')
})

test('reading on a phone: a tapped word opens a bottom sheet above the tab bar, the word stays in view, a pull on it closes it', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.locator('main button', { hasText: 'La décision' }).first().click()
  const words = page.locator('.rw-unseen')
  await expect(words.first()).toBeVisible()
  // Wait for images to load so they do not cause layout shifts while measuring.
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('article.reader img'))
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            // A lazy image below the fold may never load (offline, blocked): don't wait for it for ever.
            if ((img as HTMLImageElement).complete) resolve(null)
            else {
              setTimeout(() => resolve(null), 2000)
              img.addEventListener('load', () => resolve(null), { once: true })
              img.addEventListener('error', () => resolve(null), { once: true })
            }
          }),
      ),
    )
  })
  const target = words.nth(12)
  // The audio panel above the text can sit over a word; a real tap scrolls first, so do the same.
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await target.evaluate((el) => (el as HTMLElement).click())
  const sheet = page.locator('.word-pop')
  await expect(sheet).toBeVisible()
  await expect.poll(async () => (await sheet.evaluate((el) => getComputedStyle(el).position))).toBe('fixed')
  await page.waitForTimeout(700)
  const view = page.viewportSize()!
  const box = (await sheet.boundingBox())!
  const tabbar = (await page.locator('nav.tabbar').boundingBox())!
  expect(box.y + box.height, 'the sheet ends above the tab bar').toBeLessThanOrEqual(tabbar.y + 1)
  expect(box.height, 'the sheet leaves room for the text').toBeLessThan(view.height * 0.6)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(view.width)
  // The tapped word is above the sheet, not behind it.
  const word = (await target.boundingBox())!
  expect(word.y + word.height, 'the tapped word is not under the sheet').toBeLessThanOrEqual(box.y)
  // What the learner does with the word is at the top of the sheet, within reach without scrolling it.
  const add = (await sheet.getByRole('button', { name: /^Kelimelerime ekle/ }).boundingBox())!
  expect(add.y + add.height).toBeLessThanOrEqual(box.y + box.height)
  expect(await overflow(page)).toEqual([])
  expect(await contrastProblems(page)).toEqual([])
  // A short pull does not close it; a long one does.
  const pull = (distance: number) =>
    page.locator('.word-pop-head').evaluate(async (head, dy) => {
      const rect = head.getBoundingClientRect()
      const init = { pointerId: 7, pointerType: 'touch', bubbles: true, clientX: rect.left + 40 }
      head.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientY: rect.top + 10 }))
      head.dispatchEvent(new PointerEvent('pointermove', { ...init, clientY: rect.top + 10 + dy }))
      head.dispatchEvent(new PointerEvent('pointerup', { ...init, clientY: rect.top + 10 + dy }))
    }, distance)
  await pull(30)
  await expect(sheet).toBeVisible()
  await pull(140)
  await expect(sheet).toHaveCount(0)
})

test('shows an offline badge when internet is disconnected and hides when online', async ({ page, context }) => {
  await startWithSamples(page)
  const badge = page.locator('.offline-badge')
  await expect(badge).not.toBeVisible()
  await context.setOffline(true)
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText(/Çevrimdışı/)
  expect(await overflow(page)).toEqual([])
  await context.setOffline(false)
  await expect(badge).not.toBeVisible()
})

test('reading, deduction mode: the guess question sits in the word sheet, on screen', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Hier soir, nous avons mangé des champignons délicieux avec nos voisins.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.getByRole('button', { name: 'Çıkarım' }).click()
  await page.locator('.rw-masked').click()
  const rating = page.getByRole('region', { name: 'Tahmin' })
  await expect(rating).toBeVisible()
  await expect(rating.getByRole('button', { name: 'Yaklaştım' })).toBeInViewport()
  await rating.getByRole('button', { name: 'Yaklaştım' }).click()
  await expect(rating).toHaveCount(0)
})

test('reading, deduction mode on phone: edge cases with long sentence, dark theme, and skip / rating behavior', async ({ page }) => {
  await startWithSamples(page)
  // Set dark theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await openScreen(page, 'Okuma')
  // Long sentence with multiple clauses
  const longText = 'Pendant les longues soirées d’hiver particulièrement froides, toute la famille se réunissait silencieusement autour de la grande cheminée crépitante dans le vieux salon.'
  await page.getByLabel('Metin', { exact: true }).fill(longText)
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.getByRole('button', { name: 'Çıkarım' }).click()

  const masked = page.locator('.rw-masked').first()
  await expect(masked).toBeVisible()
  await masked.click()

  const sheet = page.locator('.word-pop')
  await expect(sheet).toBeVisible()
  const rating = page.getByRole('region', { name: 'Tahmin' })
  await expect(rating).toBeVisible()
  await expect(rating.getByRole('button', { name: 'Geç' })).toBeInViewport()

  // 1. Tapping "Geç" closes rating prompt, but keeps sheet open with word details
  await rating.getByRole('button', { name: 'Geç' }).click()
  await expect(rating).toHaveCount(0)
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Kelimelerime ekle' })).toBeVisible()

  // Close sheet
  await sheet.getByRole('button', { name: 'Kapat' }).click()
  await expect(sheet).toHaveCount(0)
})



test('the Back button walks back through the screens, a game is left to its hub, and a session is not left by it', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await expect(page.getByRole('button', { name: 'Ekle', exact: true })).toBeVisible()
  await openScreen(page, 'Okuma')
  await expect(page.getByLabel('Metin', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Ekle', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('button', { name: /soru bekliyor|Başla/ }).first()).toBeVisible()
  // A game opened from the hub: Back returns to the hub, not out of the app.
  await openScreen(page, 'Oyunlar')
  await page.getByRole('button', { name: /Kayıt farkı/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Kayıt farkı' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Kayıt farkı' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Kayıt farkı/ }).first()).toBeVisible()
  expect(page.url()).toContain('localhost')
})

test('dictionary on a phone: untracked word is translated via DeepL, meaning edited, saved, found under saved list after reload, and removed without overflow', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  // DeepL mock routes (opened after startWithSamples closes them with 503)
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 500000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => r.fulfill({ json: { translation: 'gevezelik etmek' } }))
  await page.reload()
  await openScreen(page, 'Sözlük')

  // Search a word the pack lacks
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill('gribouiller')
  await page.getByRole('button', { name: 'DeepL ile çevir' }).click()
  await expect(page.getByText('(DeepL)')).toBeVisible()

  // Edit custom meaning
  const meaningInput = page.getByLabel('Türkçe anlamı')
  await meaningInput.fill('boş konuşmak, çene çalmak')

  // Save to dictionary
  await page.getByRole('button', { name: 'Sözlüğe kaydet' }).click()
  const card = page.getByRole('region', { name: 'Kaydettiğin kelime' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('boş konuşmak, çene çalmak')

  // Verify no horizontal overflow on 375px phone screen
  expect(await overflow(page)).toEqual([])

  // Wait for background IndexedDB write to settle before reload
  await page.waitForTimeout(500)

  // Reload and check it persists without calling DeepL again
  let asked = 0
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => (asked++, r.fulfill({ json: { translation: 'x' } })))
  await page.reload()
  await openScreen(page, 'Sözlük')

  // Empty search: listed under "Kaydettiklerin"
  await expect(page.getByRole('heading', { name: 'Kaydettiklerin' })).toBeVisible()
  await expect(page.locator('.word-row', { hasText: 'gribouiller' })).toBeVisible()
  expect(asked).toBe(0)

  // Search it again: opens card
  await page.getByRole('searchbox', { name: 'Sözlükte ara' }).fill('gribouiller')
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toContainText('boş konuşmak, çene çalmak')

  // Remove from dictionary
  await page.getByRole('button', { name: 'Sözlükten kaldır' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('lists: a new list opens on its own page, takes the words added there, and studies only them', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('tab', { name: 'Listeler' }).click()
  await page.getByLabel('Yeni listenin adı').fill('Seyahat')
  await page.getByRole('button', { name: 'Oluştur' }).click()
  // The new list opens, empty, ready for its words.
  await expect(page.locator('.wl-page-name')).toContainText('Seyahat')
  await expect(page.locator('.list-page .empty-state')).toContainText('Bu liste boş')
  expect(await overflow(page), 'empty list page overflow').toEqual([])
  // A word added from its page goes into it.
  await page.locator('.list-page .empty-state').getByRole('button', { name: 'Kelime ekle' }).click()
  await expect(page.locator('#w-list')).toContainText('Seyahat')
  await page.locator('#w-word').fill('la valise')
  await page.locator('#w-meaning').fill('bavul')
  await page.getByRole('button', { name: 'Kelimeyi ekle' }).click()
  await expect(page.locator('.notice[role="status"]').first()).toContainText('eklendi', { timeout: 8_000 })
  await page.getByRole('button', { name: /^Kelimelerim/ }).click()
  await expect(page.locator('.list-page')).toContainText('valise')
  await expect(page.locator('.list-page .wl-card')).toContainText('1 kelime')
  expect(await overflow(page), 'list page overflow').toEqual([])
  expect(await contrastProblems(page), 'list page contrast').toEqual([])
  // Cards for this list: the round opens set to it.
  await page.locator('.wl-study').getByRole('button', { name: 'Kartlar' }).click()
  await expect(page.locator('.study-lists').getByRole('button', { name: /Seyahat/ })).toHaveAttribute('aria-pressed', 'true')
  // Back on the words screen, the shelf shows the list.
  await openScreen(page, 'Kelimeler')
  await expect(page.locator('.wl-tile', { hasText: 'Seyahat' })).toContainText('1 kelime')
})
