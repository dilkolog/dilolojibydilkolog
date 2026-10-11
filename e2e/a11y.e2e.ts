import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { approveAccount, clippedContent, contrastProblems, openScreen, playSession, SCREENS, startWithSamples } from './helpers'

/**
 * Automated accessibility check (axe-core, WCAG 2.2 A/AA) on every main screen, a session question
 * and the first-run welcome. Serious and critical problems fail the test; contrast has its own,
 * stricter check in the phone tests (contrastProblems), so it isn't counted twice here.
 */
const scan = async (page: Page, where: string) => {
  await page.waitForTimeout(400) // screens ease in
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(['color-contrast']).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} (${v.help}) → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`)
}

test('every main screen passes the automated accessibility check', async ({ page }) => {
  await page.goto('/')
  const problems = await scan(page, 'welcome')
  await startWithSamples(page)
  for (const screen of SCREENS) {
    await openScreen(page, screen)
    problems.push(...(await scan(page, screen)))
  }
  await openScreen(page, 'Bugün')
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.locator('.session')).toBeVisible()
  problems.push(...(await scan(page, 'session')))
  expect(problems).toEqual([])
})

test('a column chart is one keyboard stop: arrows read the days out', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'İlerleme')
  const chart = page.getByRole('group', { name: /Önümüzdeki günlerin tekrarları/ })
  const readout = page.locator('.chart-readout').filter({ hasText: /kelime/ }).first()
  await chart.focus()
  const last = await readout.textContent()
  await chart.press('Home')
  await expect(readout).toContainText(/: \d+ kelime/)
  const first = await readout.textContent()
  expect(first).not.toBe(last)
  await chart.press('ArrowRight')
  await expect(readout).not.toHaveText(first!)
})

test('onboarding passes the automated accessibility check at every step', async ({ page }) => {
  await page.goto('/')
  const problems = await scan(page, 'onboarding-step-1-welcome')

  // Step 2: Language
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hangi dille başlayalım?' })).toBeVisible()
  problems.push(...(await scan(page, 'onboarding-step-2-language')))

  // Step 3: Goal
  await page.locator('.lang-card', { hasText: 'İspanyolca' }).click()
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await expect(page.getByPlaceholder('Adın')).toBeVisible()
  problems.push(...(await scan(page, 'onboarding-step-3-goal')))

  // Step 4: Ready recap
  await page.getByPlaceholder('Adın').fill('Ayşe')
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hazırsın, Ayşe!' })).toBeVisible()
  problems.push(...(await scan(page, 'onboarding-step-4-ready')))

  expect(problems).toEqual([])
})

test('reading passes accessibility checks with verb forms card and mobile bottom sheet open', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill("Nous parlions souvent. Je parle bien. J'ai mangé.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()

  // 1. Verb forms card open
  await page.getByRole('button', { name: 'Çekimler' }).click()
  await expect(page.getByRole('region', { name: 'Metindeki çekimler' })).toBeVisible()
  const problems = await scan(page, 'reading-verb-forms-card')

  // 2. Mobile word bottom sheet open
  await page.setViewportSize({ width: 375, height: 667 })
  const targetWord = page.locator('.rw', { hasText: 'parle' }).first()
  await targetWord.click()
  await expect(page.locator('.word-pop')).toBeVisible()
  problems.push(...(await scan(page, 'phone-word-bottom-sheet')))

  expect(problems).toEqual([])
})

test('reading in deduction mode passes accessibility checks: a hidden word and the guess rating, in light and dark', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Hier soir, nous avons mangé des champignons délicieux avec nos voisins.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.getByRole('button', { name: 'Çıkarım' }).click()
  await expect(page.locator('.rw-masked')).toHaveCount(1)
  const problems = await scan(page, 'deduction-hidden-word')
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    await page.waitForTimeout(600) // colours ease between themes
    for (const c of await contrastProblems(page)) problems.push(`${theme} hidden word: ${c}`)
  }
  await page.locator('.rw-masked').click()
  await expect(page.getByRole('region', { name: 'Tahmin' })).toBeVisible()
  problems.push(...(await scan(page, 'deduction-guess-rating')))
  expect(problems).toEqual([])
})

test('session summary passes the automated accessibility check', async ({ page }) => {
  test.setTimeout(90_000)
  await page.route((u) => u.pathname === '/api/translate', (r) => r.fulfill({ status: 503, json: { error: 'not configured' } }))
  await startWithSamples(page)
  // Seed AI key so SessionNote appears on mistake digests
  await page.evaluate(() => {
    const req = indexedDB.open('kelime-koc')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key: 'aiKey', value: 'sk-ant-test' })
    }
  })
  await approveAccount(page)
  await playSession(page)
  // Close any celebration modal or badge moment overlay if present
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) {
    await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').first().click()
  }
  for (let i = 0; i < 6 && (await page.locator('.badge-moment').count()); i++) {
    await page.locator('.badge-moment button').first().click()
  }
  await expect(page.locator('.summary-grid')).toBeVisible()
  const problems = await scan(page, 'session-summary')

  const coachNote = page.locator('.coach-note')
  if (await coachNote.count()) {
    problems.push(...(await scan(page, 'session-coach-note')))
  }

  expect(problems).toEqual([])
})

test('translation screen passes accessibility checks with empty input and with results across light, dark, and calm themes', async ({ page }) => {
  await startWithSamples(page)
  // Mock translation endpoint and reload so translationReady picks up the mock
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 500000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => r.fulfill({ json: { translation: 'Merhaba dünya.' } }))
  await page.reload()
  await openScreen(page, 'Çeviri')

  const setTheme = (t: 'light' | 'dark' | 'calm') =>
    page.evaluate((theme) => {
      const root = document.documentElement
      root.dataset.theme = theme === 'calm' ? 'dark' : theme
      if (theme === 'calm') root.dataset.calm = ''
      else delete root.dataset.calm
    }, t)

  const problems: string[] = []

  // 1. Empty state across themes
  for (const theme of ['light', 'dark', 'calm'] as const) {
    await setTheme(theme)
    problems.push(...(await scan(page, `translate-empty-${theme}`)))
  }

  // 2. With translation result across themes
  await page.getByPlaceholder(/metni yaz ya da yapıştır/).fill('Bonjour le monde.')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  await expect(page.locator('.translate-result')).toBeVisible()

  for (const theme of ['light', 'dark', 'calm'] as const) {
    await setTheme(theme)
    problems.push(...(await scan(page, `translate-result-${theme}`)))
  }

  // Reset theme
  await setTheme('light')
  expect(problems).toEqual([])
})

test('reading outside-study card and session "Unuttum" question state pass accessibility checks', async ({ page }) => {
  await startWithSamples(page)
  const problems: string[] = []

  // 1. Outside study card on reading screen
  await openScreen(page, 'Okuma')
  const outsideCard = page.getByRole('region', { name: 'Dışarıda çalış' })
  await expect(outsideCard).toBeVisible()
  problems.push(...(await scan(page, 'reading-outside-study-card')))

  // 2. Open a text with verb forms card
  await page.getByLabel('Metin', { exact: true }).fill('Nous parlons souvent.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.getByRole('button', { name: 'Çekimler' }).click()
  await expect(page.getByRole('region', { name: 'Metindeki çekimler' })).toBeVisible()

  // 3. Question screen with "Unuttum" button and after "Unuttum" is clicked
  await openScreen(page, 'Bugün')
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.locator('.session')).toBeVisible()
  const forgotBtn = page.locator('button.forgot-chip')
  if (await forgotBtn.isVisible()) {
    problems.push(...(await scan(page, 'session-question-with-forgot-chip')))
    await forgotBtn.click()
    await expect(page.getByText(/Bakarak öğrenmek de öğrenmektir/)).toBeVisible()
    problems.push(...(await scan(page, 'session-question-after-forgot-clicked')))
  }

  expect(problems).toEqual([])
})

test('offline badge passes accessibility check and small icon containers have no clipped content', async ({ page, context }) => {
  await startWithSamples(page)
  const problems: string[] = []

  // Offline badge scan
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  const offlineBadge = page.getByRole('status', { name: 'İnternet bağlantısı yok' })
  await expect(offlineBadge).toBeVisible()
  problems.push(...(await scan(page, 'offline-badge')))
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(offlineBadge).toBeHidden()

  // Clipped content check on badges and small icon containers
  await openScreen(page, 'Profil')
  const clipped = await clippedContent(page)
  expect(clipped).toEqual([])

  expect(problems).toEqual([])
})

test('settings data screen passes accessibility check with safety snapshot undo row and confirmation dialog', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Veriler' }).click()

  const problems: string[] = []

  // Perform a restore with a valid empty backup to produce the safety snapshot undo row
  const file = page.locator('input[type=file]')
  const empty = { app: 'kelime-koc', version: 3, exportedAt: '2026-10-01T10:00:00.000Z', vocabulary: [], wordStates: [], events: [], mistakes: [] }
  await file.setInputFiles({ name: 'bos.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(empty)) })
  await page.getByRole('alertdialog').getByRole('button', { name: 'Geri yükle' }).click()
  await expect(page.getByText('Yedek geri yüklendi: 0 kelime.')).toBeVisible()

  // 1. "Önceki hâle dön" row is now visible on the DataSettings section
  const undoBtn = page.getByRole('button', { name: 'Önceki hâle dön' })
  await expect(undoBtn).toBeVisible()
  problems.push(...(await scan(page, 'settings-data-undo-row')))

  // 2. Open confirmation dialog
  await undoBtn.click()
  const undoDialog = page.getByRole('alertdialog')
  await expect(undoDialog).toBeVisible()
  problems.push(...(await scan(page, 'settings-data-undo-dialog')))

  // Dismiss dialog safely
  await undoDialog.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(undoDialog).toBeHidden()

  expect(problems).toEqual([])
})

test('new features pass accessibility check in dark and calm themes (audiobooks, pron practice, personal sentences, import placement, sync size)', async ({ page }) => {
  // Many scans in two themes: about half a minute alone, longer when workers share the machine.
  test.setTimeout(150_000)
  await startWithSamples(page)

  const setTheme = (t: 'light' | 'dark' | 'calm') =>
    page.evaluate((theme) => {
      const root = document.documentElement
      root.dataset.theme = theme === 'calm' ? 'dark' : theme
      if (theme === 'calm') root.dataset.calm = ''
      else delete root.dataset.calm
    }, t)

  const problems: string[] = []

  // 1. Okuma → Sesli kitaplar (liste, seviye çipleri ve açık bölüm)
  await openScreen(page, 'Okuma')
  const audiobooksCard = page.locator('section:has(h2:has-text("Sesli kitaplar"))')
  if (await audiobooksCard.count()) {
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `audiobooks-picker-${theme}`)))
    }
    // Filter by B1 level chip
    const b1Chip = audiobooksCard.getByRole('button', { name: 'B1', exact: true })
    if (await b1Chip.count()) {
      await b1Chip.click()
      for (const theme of ['dark', 'calm'] as const) {
        await setTheme(theme)
        problems.push(...(await scan(page, `audiobooks-b1-chip-${theme}`)))
      }
    }
    // Open first audiobook chapter
    const firstChapter = audiobooksCard.locator('.lib-open').first()
    if (await firstChapter.count()) {
      await firstChapter.click()
      await expect(page.locator('.reading-surface, .reader-text')).toBeVisible()
      for (const theme of ['dark', 'calm'] as const) {
        await setTheme(theme)
        problems.push(...(await scan(page, `audiobook-chapter-open-${theme}`)))
      }
    }
  }

  // 2. Oyunlar → Telaffuz çalışması (boş ve kelimeli durumlar)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.open('kelime-koc')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({ key: 'azureSpeech', value: { key: 'fake-key', region: 'francecentral' } })
        tx.oncomplete = () => resolve()
      }
    })
  })
  await page.reload()
  await openScreen(page, 'Oyunlar')
  const pronBtn = page.locator('button:has-text("Telaffuz çalışması"), a:has-text("Telaffuz çalışması")').first()
  if (await pronBtn.count()) {
    // Empty state: no word is weak yet, so the card is there but closed (a disabled card cannot be opened).
    await expect(pronBtn).toBeDisabled()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `pron-practice-card-closed-${theme}`)))
    }
    // Seed pronScores to test populated state
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.open('kelime-koc')
        req.onsuccess = () => {
          const db = req.result
          // A word the list really has: the weak list only holds words of the learner's list.
          const words = db.transaction('vocabulary').objectStore('vocabulary').getAll()
          words.onsuccess = () => {
            const id = (words.result as { id: string; language: string }[]).find((w) => w.language === 'fr')!.id
            const tx = db.transaction('meta', 'readwrite')
            tx.objectStore('meta').put({ key: 'pronScores', value: { [id]: [{ at: new Date().toISOString(), score: 40 }] } })
            tx.oncomplete = () => resolve()
          }
        }
      })
    })
    await page.reload()
    await openScreen(page, 'Oyunlar')
    await page.locator('button:has-text("Telaffuz çalışması"), a:has-text("Telaffuz çalışması")').first().click()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `pron-practice-populated-${theme}`)))
    }
  }

  // 3. Kelime sayfasında "Bana özel cümleler" (öneri listesi açıkken)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.open('kelime-koc')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({ key: 'aiKey', value: 'sk-ant-test' })
        tx.oncomplete = () => resolve()
      }
    })
  })
  await approveAccount(page)
  await page.route('https://api.anthropic.com/**', (route) => {
    route.fulfill({
      status: 200,
      json: {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { text: 'J’aime manger une pomme après le sport.', translation: 'Spordan sonra elma yemeyi severim.' },
              { text: 'La pomme est un fruit délicieux pour voyager.', translation: 'Elma seyahat etmek için lezzetli bir meyvedir.' },
            ]),
          },
        ],
      },
    })
  })
  await page.reload()
  await openScreen(page, 'Kelimeler')
  const firstWord = page.locator('.word-row, .card-word, .word-btn').first()
  if (await firstWord.count()) {
    await firstWord.click()
    const personalBtn = page.locator('button', { hasText: /Bana özel cümleler/ })
    if (await personalBtn.count()) {
      await personalBtn.click()
      await expect(page.locator('.coach-sentences, .personal-sentences, .personal-item')).toBeVisible({ timeout: 8_000 })
      for (const theme of ['dark', 'calm'] as const) {
        await setTheme(theme)
        problems.push(...(await scan(page, `personal-sentences-${theme}`)))
      }
    }
  }

  // 4. İçe aktarmada "Hangi listeye eklensin?" (+ Yeni liste seçilince ad alanı açıkken)
  await openScreen(page, 'Kelimeler')
  const addPopoverBtn = page.getByRole('button', { name: 'Ekle', exact: true })
  if (await addPopoverBtn.count()) {
    await addPopoverBtn.click()
    await page.getByRole('menuitem', { name: 'Birçok kelime ekle' }).click()
    const selectTrigger = page.locator('.import-list button[role="combobox"], .import-list select').first()
    if (await selectTrigger.count()) {
      await selectTrigger.click()
      const newOption = page.getByRole('option', { name: '+ Yeni liste' })
      if (await newOption.count()) {
        await newOption.click()
      }
      await expect(page.locator('input[aria-label="Yeni listenin adı"]')).toBeVisible()
      for (const theme of ['dark', 'calm'] as const) {
        await setTheme(theme)
        problems.push(...(await scan(page, `import-placement-new-list-${theme}`)))
      }
    }
  }

  // 5. Ayarlar → Eşitleme'de "Eşitlenen veri" satırı (%50 ve %85 kota uyarısı için)
  for (const size of [2_200_000, 3_740_000]) {
    await page.evaluate((s) => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.open('kelime-koc')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('meta', 'readwrite')
          tx.objectStore('meta').delete('syncAccount')
          tx.objectStore('meta').put({ key: 'syncCode', value: 'ABCDE-FGHIJ-KLMNO-PQRST' })
          tx.objectStore('meta').put({ key: 'syncSize', value: s })
          tx.oncomplete = () => resolve()
        }
      })
    }, size)
    await page.reload()
    await openScreen(page, 'Ayarlar')
    await page.locator('.settings-menu-item', { hasText: 'Hesap' }).click()
    const summary = page.locator('summary', { hasText: /Hesapsız: eşitleme koduyla eşitle/ })
    if (await summary.count()) {
      const isOpen = await summary.evaluate((el) => (el.parentElement as HTMLDetailsElement)?.open)
      if (!isOpen) await summary.click()
    }
    await expect(page.locator('p:has-text("Eşitlenen veri:")')).toBeVisible()
    const label = size === 2_200_000 ? 'sync-size-50' : 'sync-size-85-warning'
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `${label}-${theme}`)))
    }
  }

  await setTheme('light')
  expect(problems).toEqual([])
})

test('new games and insight cards pass accessibility check across dark and calm themes (grammar, reflex, traps, pairs, mind seed, blind spots)', async ({ page }) => {
  test.setTimeout(180_000)
  await startWithSamples(page)

  const setTheme = (t: 'light' | 'dark' | 'calm') =>
    page.evaluate((theme) => {
      const root = document.documentElement
      root.dataset.theme = theme === 'calm' ? 'dark' : theme
      if (theme === 'calm') root.dataset.calm = ''
      else delete root.dataset.calm
    }, t)

  const problems: string[] = []

  // 1. Bugün → MindSeed (Zihin tohumu kartı ve tamamlandı durumu)
  await openScreen(page, 'Bugün')
  // Make MindSeed the first child of .home-nudges so it is visible (.home-nudges > :nth-child(n+2) is hidden by design)
  await page.evaluate(() => {
    const seed = document.querySelector('.mind-seed') as HTMLElement | null
    if (seed?.parentElement) seed.parentElement.prepend(seed)
  })
  const mindSeedCard = page.locator('.mind-seed')
  await expect(mindSeedCard).toBeVisible()
  for (const theme of ['dark', 'calm'] as const) {
    await setTheme(theme)
    problems.push(...(await scan(page, `mind-seed-${theme}`)))
  }
  const doneBtn = page.getByRole('button', { name: 'Düşündüm' })
  if (await doneBtn.count()) {
    await doneBtn.click()
    await page.evaluate(() => {
      const done = document.querySelector('.mind-seed-done') as HTMLElement | null
      if (done?.parentElement) done.parentElement.prepend(done)
    })
    await expect(page.locator('.mind-seed-done')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `mind-seed-done-${theme}`)))
    }
  }

  // 2. Oyunlar → Dilbilgisi soruları (intro ve soru ekranı)
  await openScreen(page, 'Oyunlar')
  const grammarCard = page.locator('.game-card', { hasText: 'Dilbilgisi soruları' })
  if (await grammarCard.count()) {
    await grammarCard.click()
    await expect(page.locator('.greeting', { hasText: 'Dilbilgisi soruları' })).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-grammar-intro-${theme}`)))
    }
    // Start round
    await page.getByRole('button', { name: /soruluk tura başla/ }).click()
    await expect(page.locator('.prompt-label')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-grammar-play-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 3. Oyunlar → Refleks turu (intro ve soru ekranı)
  const reflexCard = page.locator('.game-card', { hasText: 'Refleks turu' })
  if (await reflexCard.count()) {
    await reflexCard.click()
    await expect(page.locator('.greeting', { hasText: 'Refleks turu' })).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-reflex-intro-${theme}`)))
    }
    await page.getByRole('button', { name: /başla/ }).first().click()
    await expect(page.locator('.game-stage')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-reflex-play-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 4. Oyunlar → Tuzak kelimeler (intro ve soru ekranı)
  const trapsCard = page.locator('.game-card', { hasText: 'Tuzak kelimeler' })
  if (await trapsCard.count()) {
    await trapsCard.click()
    await expect(page.locator('.greeting', { hasText: 'Tuzak kelimeler' })).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-traps-intro-${theme}`)))
    }
    await page.getByRole('button', { name: /soruluk tura başla/ }).click()
    await expect(page.locator('.game-stage')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-traps-play-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 4b. Oyunlar → Kayıt farkı (intro, soru ve cevap sonrası üç söyleyiş)
  const registerCard = page.locator('.game-card', { hasText: 'Kayıt farkı' })
  if (await registerCard.count()) {
    await registerCard.click()
    await expect(page.locator('.greeting', { hasText: 'Kayıt farkı' })).toBeVisible()
    await page.getByRole('button', { name: /soruluk tura başla/ }).click()
    await expect(page.locator('.option')).toHaveCount(3)
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-register-play-${theme}`)))
    }
    await page.locator('.option').first().click()
    await expect(page.locator('.register-ladder')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-register-answer-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 4c. Oyunlar → Metin akışı (açık boşluk, cevaplanmış boşluk ve Türkçesi)
  const flowCard = page.locator('.game-card', { hasText: 'Metin akışı' })
  if (await flowCard.count()) {
    await flowCard.click()
    await page.getByRole('button', { name: /paragraflık tura başla/ }).click()
    await expect(page.locator('.flow-gap.is-open')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-flow-play-${theme}`)))
    }
    await page.locator('.option').first().click()
    await expect(page.locator('[role=status]')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-flow-answer-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 4d. Oyunlar → Ek avı (soru ve cevap sonrası ek açıklaması)
  const affixCard = page.locator('.game-card', { hasText: 'Ek avı' })
  if (await affixCard.count()) {
    await affixCard.click()
    await page.getByRole('button', { name: /soruluk tura başla/ }).click()
    await expect(page.locator('.option')).toHaveCount(3)
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-affix-play-${theme}`)))
    }
    await page.locator('.option').first().click()
    await expect(page.locator('[role=status]')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-affix-answer-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 5. Oyunlar → Ses ayırt etme (oyun ekranı)
  const pairsCard = page.locator('.game-card', { hasText: 'Ses ayırt etme' })
  if (await pairsCard.count()) {
    await pairsCard.click()
    await expect(page.locator('.game-stage')).toBeVisible()
    for (const theme of ['dark', 'calm'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `game-pairs-play-${theme}`)))
    }
    await page.locator('button.link', { hasText: '← Oyunlar' }).click()
  }

  // 6. İlerleme → Kör noktalar kartı (BlindSpotsCard)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.open('kelime-koc')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({
          key: 'traps',
          value: {
            'fr-actuellement': { ok: 0, wrong: 2, last: new Date().toISOString() },
            'fr-attendre': { ok: 0, wrong: 2, last: new Date().toISOString() },
          },
        })
        tx.oncomplete = () => resolve()
      }
    })
  })
  await page.reload()
  await openScreen(page, 'İlerleme')
  const blindSpotsSection = page.locator('.blind-spots')
  await expect(blindSpotsSection).toBeVisible()
  for (const theme of ['dark', 'calm'] as const) {
    await setTheme(theme)
    problems.push(...(await scan(page, `blind-spots-${theme}`)))
  }

  await setTheme('light')
  expect(problems).toEqual([])
})

test('round 11 interactive states and new cards pass accessibility checks on phone in light and dark themes', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 375, height: 667 })
  await startWithSamples(page)
  await approveAccount(page)

  // Seed translations for back-translation loop chips, traps for blind spots card, aiKey, and 5 own words for suggest words
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const open = indexedDB.open('kelime-koc')
      open.onsuccess = () => {
        const tx = open.result.transaction(['meta', 'vocabulary'], 'readwrite')
        const meta = tx.objectStore('meta')
        meta.put({ key: 'aiKey', value: 'sk-ant-test-key' })
        meta.put({
          key: 'traps',
          value: {
            'fr-actuellement': { ok: 0, wrong: 2, last: new Date().toISOString() },
            'fr-attendre': { ok: 0, wrong: 2, last: new Date().toISOString() },
          },
        })
        meta.put({
          key: 'translations',
          value: [
            {
              from: 'fr',
              to: 'tr',
              text: 'Je parle français très bien.',
              translation: 'Çok iyi Fransızca konuşuyorum.',
              at: '2026-10-09T10:00:00.000Z',
            },
          ],
        })

        // Make at least 5 words "own" words added yesterday so suggestionDue is true
        const vocabStore = tx.objectStore('vocabulary')
        const cursorReq = vocabStore.openCursor()
        let count = 0
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result
          if (cursor && count < 6) {
            cursor.update({ ...cursor.value, source: 'user', addedAt: new Date(Date.now() - 86_400_000) })
            count++
            cursor.continue()
          }
        }

        tx.oncomplete = () => {
          window.dispatchEvent(new Event('diloloji:account'))
          resolve()
        }
      }
    })
  })
  await page.reload()

  const setTheme = (t: 'light' | 'dark') =>
    page.evaluate((theme) => {
      const root = document.documentElement
      root.dataset.theme = theme
      delete root.dataset.calm
    }, t)

  const problems: string[] = []

  const scanBoth = async (where: string) => {
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(theme)
      problems.push(...(await scan(page, `${where}-${theme}`)))
    }
  }

  // 1. Bugün → MindSeed ve SuggestWords (Kelime öner)
  await openScreen(page, 'Bugün')
  await page.evaluate(() => {
    const seed = document.querySelector('.mind-seed') as HTMLElement | null
    if (seed?.parentElement) seed.parentElement.prepend(seed)
  })
  await expect(page.locator('.mind-seed')).toBeVisible()
  await scanBoth('phone-mind-seed')

  await page.evaluate(() => {
    const suggest = document.querySelector('.suggest-words') as HTMLElement | null
    if (suggest?.parentElement) suggest.parentElement.prepend(suggest)
  })
  await expect(page.locator('.suggest-words')).toBeVisible()
  await scanBoth('phone-suggest-words')

  // 2. İlerleme → Kör nokta röntgeni (BlindSpotsCard)
  await openScreen(page, 'İlerleme')
  await expect(page.locator('.blind-spots')).toBeVisible()
  await scanBoth('phone-blind-spots')

  // 3. Okuma → Bileşik zaman kartı
  await openScreen(page, 'Okuma')
  const details = page.locator('details.add-text')
  await details.evaluate((el: HTMLDetailsElement) => {
    el.open = true
  })
  await page.getByLabel('Metin', { exact: true }).fill("J'ai mangé une pomme.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  const aiWord = page.locator('.rw').filter({ hasText: /ai/ }).first()
  await aiWord.click()
  await expect(page.locator('.word-pop')).toBeVisible()
  await expect(page.locator('.form-analysis')).toBeVisible()
  await scanBoth('phone-reading-compound-card')
  await page.getByRole('button', { name: 'Kapat' }).click()

  // 4. Oyunlar → Dilbilgisi soruları (soru ve cevap sonrası)
  await openScreen(page, 'Oyunlar')
  const grammarCard = page.locator('.game-card', { hasText: 'Dilbilgisi soruları' })
  await grammarCard.click()
  await expect(page.locator('.greeting', { hasText: 'Dilbilgisi soruları' })).toBeVisible()
  await page.getByRole('button', { name: /soruluk tura başla/ }).click()
  await expect(page.locator('.prompt-label')).toBeVisible()
  await scanBoth('phone-grammar-question')
  // Answer question
  const opt = page.locator('.option').first()
  const cloze = page.locator('input.answer-input')
  const grammarWord = page.locator('.grammar-word').first()
  if (await opt.isVisible()) {
    await opt.click()
  } else if (await cloze.isVisible()) {
    await cloze.fill('test')
    await page.getByRole('button', { name: 'Kontrol et' }).click()
  } else if (await grammarWord.isVisible()) {
    await grammarWord.click()
  }
  await expect(page.locator('.grammar-feedback')).toBeVisible()
  await scanBoth('phone-grammar-answer')
  await page.locator('button.link', { hasText: '← Oyunlar' }).click()

  // 5. Oyunlar → Refleks turu (süreli ve süresiz)
  const reflexCard = page.locator('.game-card', { hasText: 'Refleks turu' })
  await reflexCard.click()
  await expect(page.locator('.greeting', { hasText: 'Refleks turu' })).toBeVisible()
  // 5a. Süreli (timed - with progress bar animation)
  await page.getByRole('button', { name: /soruluk tura başla/ }).click()
  await expect(page.locator('.options')).toBeVisible()
  await expect(page.locator('.reflex-bar')).toHaveCount(1)
  await scanBoth('phone-reflex-timed-play')
  await page.locator('button.link', { hasText: '← Oyunlar' }).click()

  // 5b. Süresiz (untimed)
  await reflexCard.click()
  await page.getByRole('button', { name: 'Süre yok (ilk deneme)' }).click()
  await page.getByRole('button', { name: /soruluk tura başla/ }).click()
  await expect(page.locator('.options')).toBeVisible()
  await expect(page.locator('.reflex-bar')).toHaveCount(0)
  await scanBoth('phone-reflex-untimed-play')
  await page.locator('button.link', { hasText: '← Oyunlar' }).click()

  // 6. Oyunlar → Tuzak kelimeler (soru ve cevap)
  const trapsCard = page.locator('.game-card', { hasText: 'Tuzak kelimeler' })
  await trapsCard.click()
  await expect(page.locator('.greeting', { hasText: 'Tuzak kelimeler' })).toBeVisible()
  await page.getByRole('button', { name: /soruluk tura başla/ }).click()
  await expect(page.locator('.options')).toBeVisible()
  await scanBoth('phone-traps-question')
  await page.locator('.option').first().click()
  await expect(page.getByRole('button', { name: 'Devam' })).toBeVisible()
  await scanBoth('phone-traps-answer')
  await page.locator('button.link', { hasText: '← Oyunlar' }).click()

  // 7. Oyunlar → Ses ayırt etme (oyun ekranı)
  const pairsCard = page.locator('.game-card', { hasText: 'Ses ayırt etme' })
  await pairsCard.click()
  await expect(page.locator('.game-stage')).toBeVisible()
  await scanBoth('phone-pairs-play')
  await page.locator('button.link', { hasText: '← Oyunlar' }).click()

  // 8. Oyunlar → Geri çeviri (döngü çipleri görünürken)
  const backCard = page.locator('.game-card', { hasText: 'Geri çeviri' })
  await backCard.click()
  await expect(page.locator('.choice-row[aria-label="Hangi cümleler"]')).toBeVisible()
  await scanBoth('phone-back-translation-loop-chips')
  await page.locator('button.link', { hasText: '← Bitir' }).click()

  // 9. Oyunlar → Kayıt farkı (İspanyolca, bölgesel not görünürken)
  await page.setViewportSize({ width: 900, height: 700 })
  await page.getByRole('button', { name: /^İspanyolca/ }).click()
  await page.setViewportSize({ width: 375, height: 667 })
  await openScreen(page, 'Oyunlar')
  const registerCard = page.locator('.game-card', { hasText: 'Kayıt farkı' })
  await registerCard.click()
  await expect(page.locator('.greeting', { hasText: 'Kayıt farkı' })).toBeVisible()
  await page.getByRole('button', { name: /soruluk tura başla/ }).click()
  let scannedNote = false
  for (let i = 0; i < 8; i++) {
    await page.locator('.option').first().click()
    await expect(page.locator('.register-ladder')).toBeVisible()
    const noteLoc = page.locator('.stack[role="status"] p.small.muted')
    if (await noteLoc.count()) {
      await expect(noteLoc).toBeVisible()
      await scanBoth('phone-register-answer-with-note')
      scannedNote = true
      break
    }
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
  }
  expect(scannedNote).toBe(true)
  await page.locator('button.link', { hasText: '← Oyunlar' }).click()

  await setTheme('light')
  expect(problems).toEqual([])
})

test('dictionary states and collocation chip accessibility check (phone, light and dark themes)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await startWithSamples(page)
  await approveAccount(page)

  const setTheme = (t: 'light' | 'dark') =>
    page.evaluate((theme) => {
      const root = document.documentElement
      root.dataset.theme = theme
      delete root.dataset.calm
    }, t)

  const problems: string[] = []
  const allViolations: { state: string; theme: string; id: string; impact: string | null | undefined; help: string; target: string; html: string }[] = []

  const scanBoth = async (where: string) => {
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(theme)
      await page.waitForTimeout(400)
      const res = await new AxeBuilder({ page }).analyze()
      for (const v of res.violations) {
        for (const node of v.nodes) {
          allViolations.push({
            state: where,
            theme,
            id: v.id,
            impact: v.impact,
            help: v.help,
            target: node.target.join(' '),
            html: node.html,
          })
        }
      }
      problems.push(...(await scan(page, `${where}-${theme}`)))
    }
  }

  // Set up translation mock for DeepL (usage check + translation)
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 500000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => r.fulfill({ json: { translation: 'karalamak' } }))
  await page.reload()

  // 1. Sözlük boş hâl ("Kaydettiklerin" listesi dolu)
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill('farfadet')
  await page.getByPlaceholder('Türkçe anlamını yaz…').fill('küçük peri, cin')
  await page.getByRole('button', { name: 'Sözlüğe kaydet' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toBeVisible()
  await search.fill('')
  await expect(page.locator('.word-list .word-row', { hasText: 'farfadet' })).toBeVisible()
  await scanBoth('phone-dictionary-saved-list-state')

  // 2. Bulunamayan kelime kartı (DeepL düğmesi görünürken)
  await search.fill('gribouiller')
  const deeplBtn = page.getByRole('button', { name: 'DeepL ile çevir' })
  await expect(deeplBtn).toBeVisible()
  await scanBoth('phone-dictionary-not-found-deepl-visible')

  // 3. DeepL sonucu açıkken (giriş + iki düğme)
  await deeplBtn.click()
  const customInput = page.getByLabel('Türkçe anlamı')
  await expect(customInput).toBeVisible()
  const saveDictBtn = page.getByRole('button', { name: 'Sözlüğe kaydet' })
  const addWordBtn = page.getByRole('button', { name: 'Kelimelerime ekle' })
  await expect(saveDictBtn).toBeVisible()
  await expect(addWordBtn).toBeVisible()
  await scanBoth('phone-dictionary-deepl-result-open')

  // 4. Kayıtlı kelime kartı (aria-label="Kaydettiğin kelime")
  await saveDictBtn.click()
  const savedCard = page.getByRole('region', { name: 'Kaydettiğin kelime' })
  await expect(savedCard).toBeVisible()
  await scanBoth('phone-dictionary-saved-word-card')

  // 5. Kelime sayfasında eşdizim çipi
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row', { hasText: 'décider' }).click()
  const chip = page.locator('.colloc-chip', { hasText: 'décider de + infinitif' })
  await expect(chip).toBeVisible()
  await expect(chip.locator('.sr-only')).toBeVisible()
  await scanBoth('phone-word-detail-collocation-chip')

  await setTheme('light')

  if (allViolations.length > 0) {
    console.log('[A11Y AUDIT VIOLATIONS]', JSON.stringify(allViolations, null, 2))
  }

  expect(problems).toEqual([])
})





