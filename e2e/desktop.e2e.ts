import { expect, test } from '@playwright/test'
import { contrastProblems, labFavorites, openScreen, openVerbLab, overflow, playSession, startWithSamples } from './helpers'

test('the first Tab offers a jump past the menu to the screen', async ({ page }) => {
  await startWithSamples(page)
  await page.mouse.click(5, 5)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Tab')
  const skip = page.locator('.skip-link')
  await expect(skip).toBeFocused()
  const box = await skip.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
})

test('a dialog keeps keyboard focus while it is open', async ({ page }) => {
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  await expect(page.locator('.session')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)
  const dialog = page.locator('[role=alertdialog]')
  await expect(dialog).toBeVisible()
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=alertdialog]'))).toBe(true)
  // Tab wraps inside it.
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=alertdialog]'))).toBe(true)
})

test('settings on a wide screen: title row, group strip and cards end on one line, every tab inside the strip', async ({ page }) => {
  await startWithSamples(page)
  await page.locator('.sidebar-settings').click()
  await expect(page.locator('.settings-menu-item').first()).toBeVisible()
  const right = (sel: string) => page.locator(sel).first().evaluate((e) => Math.round(e.getBoundingClientRect().right))
  const edges = [await right('.page-header .settings-search'), await right('.settings-menu'), await right('.settings-pane:not([hidden]) .card')]
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(2)
  const strip = await page.locator('.settings-menu').boundingBox()
  const tabs = await page.locator('.settings-menu-item').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  expect(tabs).toHaveLength(8)
  for (const t of tabs) {
    expect(t.left).toBeGreaterThanOrEqual(strip!.x - 1)
    expect(t.right).toBeLessThanOrEqual(strip!.x + strip!.width + 1)
  }
  // Even: the tabs are the same width, within a pixel.
  const widths = tabs.map((t) => Math.round(t.width))
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
})

test('tablet width: one top bar row, the word list in two columns, the profile numbers in one row', async ({ page }) => {
  await startWithSamples(page)
  await page.setViewportSize({ width: 820, height: 900 })
  await page.waitForTimeout(300)
  // Brand, languages, places and profile share one row; the brand name stays on one line.
  const top = await page.evaluate(() => {
    const y = (sel: string) => Math.round(document.querySelector(sel)!.getBoundingClientRect().top)
    return { brand: y('.brand-row'), langs: y('.langs'), nav: y('.sidebar .nav'), profile: y('.top-profile'), brandHeight: Math.round(document.querySelector('.brand-row')!.getBoundingClientRect().height) }
  })
  expect(Math.abs(top.langs - top.brand)).toBeLessThan(20)
  expect(Math.abs(top.nav - top.brand)).toBeLessThan(20)
  expect(Math.abs(top.profile - top.brand)).toBeLessThan(20)
  expect(top.brandHeight).toBeLessThan(50)
  // The word list: two columns.
  await page.locator('.nav-btn:visible', { hasText: /^Kelimeler/ }).first().click()
  const rows = page.locator('.word-list .word-row')
  await expect(rows.first()).toBeVisible()
  const lefts = await rows.evaluateAll((els) => els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().left)))
  expect(new Set(lefts).size).toBe(2)
  // The profile: four numbers across.
  await page.locator('.top-profile').click()
  await expect(page.locator('.profile-stats .stat').first()).toBeVisible()
  const tops = await page.locator('.profile-stats .stat').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(new Set(tops).size).toBe(1)
})

test('tablet width: Today in two columns, the mission beside the numbers', async ({ page }) => {
  await startWithSamples(page)
  await page.setViewportSize({ width: 820, height: 900 })
  await page.waitForTimeout(300)
  const boxes = await page.evaluate(() => {
    const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect()
    return { main: r('.home-main'), side: r('.home-side') }
  })
  // Side by side: the side column starts where the main one ends, and both start at the same height.
  expect(boxes.side.left).toBeGreaterThanOrEqual(boxes.main.right - 1)
  expect(Math.abs(boxes.side.top - boxes.main.top)).toBeLessThan(40)
  // And nothing runs past the screen.
  expect(boxes.side.right).toBeLessThanOrEqual(820)
})

test('Settings has no second way to the profile: the side menu already has it', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Hesap' }).click()
  await expect(page.locator('.settings-profile')).toHaveCount(0)
  await expect(page.locator('.sidebar-foot:visible')).toHaveCount(1)
  await page.locator('.sidebar-foot:visible').click()
  await expect(page.locator('.profile-settings')).toBeVisible()
})

test('the key legend stays at the bottom of the screen while a question eases in', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  // Slow every animation down, so the moment the legend used to sit inside the card lasts long enough to see.
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 4s !important; animation-delay: 0s !important; }' })
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  const legend = page.locator('.kbd-legend')
  await expect(legend).toBeVisible()
  for (let i = 0; i < 4; i++) {
    const box = await legend.boundingBox()
    const view = page.viewportSize()!
    expect(view.height - (box!.y + box!.height)).toBeLessThan(40)
    await page.waitForTimeout(150)
  }
})

test('verb lab: pick a verb and a tense, learn, practise, compare, and the practice shows in mastery', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  // The whole table is in view once the verb is chosen: no scrolling past explanations to reach it.
  const table = await main.locator('.lab-forms').boundingBox()
  expect(table!.y + table!.height).toBeLessThan(page.viewportSize()!.height)
  // Learn: the present table with the endings, then another tense from the chips above the table,
  // one from the "Diğer" menu, and back with the arrow keys.
  await expect(main.locator('.lab-forms')).toContainText('parlons')
  const bar = main.getByRole('group', { name: 'Zaman' })
  await bar.getByRole('button', { name: 'Passé composé' }).click()
  await expect(main.locator('.lab-forms')).toContainText('avons parlé')
  await bar.getByRole('button', { name: /Diğer/ }).click()
  await page.getByRole('menuitem', { name: /Plus-que-parfait/ }).click()
  await expect(main.locator('.lab-forms')).toContainText('avions parlé')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('ArrowLeft')
  await expect(main.locator('.lab-forms')).not.toContainText('avions parlé')
  await bar.getByRole('button', { name: 'Passé composé' }).click()
  await expect(main.locator('.lab-forms')).toContainText('avons parlé')
  // Detailed: every tense by mood, the compound ones included.
  await main.getByRole('button', { name: 'Detaylı' }).click()
  await expect(main.locator('.lab-card', { hasText: 'Plus-que-parfait' })).toContainText('avions parlé')
  await expect(main.locator('.lab-card', { hasText: 'Subjonctif passé' })).toContainText('aie parlé')
  await main.getByRole('button', { name: 'Basit' }).click()
  // The alternatives (negative, reflexive) in the "⋯" menu.
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /Olumsuz/ }).click()
  await expect(main.locator('.lab-forms')).toContainText("n'ai pas parlé")
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /Olumsuz/ }).click()
  // Practice, all six at once: a wrong form is marked and costs a life.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Présent' }).click()
  const answers = ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent']
  for (const [i, a] of answers.entries()) await page.locator(`#lab-in-${i}`).fill(i === 1 ? 'parlais' : a)
  await main.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(main.locator('.lab-answer-row.is-bad')).toHaveCount(1)
  await expect(main.locator('.lab-result')).toContainText('5 / 6 doğru')
  // Again, all right: the round is marked and lands in mastery.
  await main.getByRole('button', { name: 'Tekrar' }).click()
  for (const [i, a] of answers.entries()) await page.locator(`#lab-in-${i}`).fill(a)
  await main.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(main.locator('.lab-result')).toContainText('Hepsi doğru!')
  await main.getByRole('tab', { name: 'Ustalık' }).click()
  // Both rounds count (one form in six missed is still a right round): 20 of 60 points.
  await expect(main.getByRole('button', { name: /^Présent:/ })).toContainText('Öğreniliyor (20/60)')
  // Choosing among forms, and the pairs.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Seç', exact: true }).click()
  await expect(main.locator('.lab-option')).toHaveCount(4)
  await main.getByRole('button', { name: 'Eşleştir' }).click()
  await expect(main.locator('.lab-match-btn')).toHaveCount(12)
  // Time against the clock is a practice mode with three levels; compare (a learn view) shows three tenses at once.
  await main.getByRole('button', { name: 'Zamana karşı' }).click()
  await expect(main.locator('.lab-levelcard')).toHaveCount(3)
  await main.getByRole('tab', { name: 'Öğrenme' }).click()
  await main.getByRole('button', { name: 'Kıyasla' }).click()
  await expect(main.locator('.lab-compare-cards .lab-card')).toHaveCount(3)
  expect(await overflow(page)).toEqual([])
  expect(await contrastProblems(page)).toEqual([])
})

test('verb lab: a person often missed in a tense is marked in its table', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await expect(main.locator('.lab-row.is-weak')).toHaveCount(0)
  // Two rounds with "tu" wrong.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Présent' }).click()
  const answers = ['parle', 'parlais', 'parle', 'parlons', 'parlez', 'parlent']
  for (let round = 0; round < 2; round++) {
    if (round) await main.getByRole('button', { name: 'Tekrar' }).click()
    for (const [i, a] of answers.entries()) await page.locator(`#lab-in-${i}`).fill(a)
    await main.getByRole('button', { name: 'Kontrol et' }).click()
    await expect(main.locator('.lab-result')).toContainText('5 / 6 doğru')
  }
  // Back in the table, "tu" has the orange edge and says why; the other tenses are clean.
  await main.getByRole('tab', { name: 'Öğrenme' }).click()
  await expect(main.locator('.lab-row.is-weak')).toHaveCount(1)
  await expect(main.locator('.lab-row.is-weak')).toHaveAttribute('title', /2\/2 yanlış/)
  await expect(main.locator('.lab-weak-note')).toBeVisible()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Imparfait' }).click()
  await expect(main.locator('.lab-row.is-weak')).toHaveCount(0)
})

test('verb lab: a verb the tables lack is said so, the shuffle picks another, favourites and recent are kept', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'finir')
  const input = page.getByRole('combobox')
  await input.fill('zzzzz')
  await input.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'tablolarda yok' })).toBeVisible()
  await page.getByRole('button', { name: 'Rastgele fiil' }).click()
  await expect(page.locator('.lab-main .lab-verb').first()).not.toHaveText(/^Finir$/)
  await page.locator('.lab-main').getByRole('button', { name: 'Favorilere ekle' }).click()
  // The favourite is written to the database in the background: wait for it before reloading.
  await expect.poll(() => labFavorites(page, 'fr')).toHaveLength(1)
  await page.reload()
  await openVerbLab(page)
  // One list with a filter: favourites come first when there are any; recent is a tap away.
  const lists = page.locator('.lab-lists')
  await expect(lists.getByRole('button', { name: /Favori/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(lists.locator('.lab-chips .chip')).toHaveCount(1)
  await lists.getByRole('button', { name: /Son bakılan/ }).click()
  await expect(lists.locator('.lab-chips .chip').first()).toBeVisible()
})

test('verb lab: forms put in the review queue come back on Today and in the review, and the garden shows them', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('button', { name: 'Tekrar listeme ekle' }).click()
  await expect(main.getByRole('button', { name: 'Tekrar listende' })).toBeDisabled()
  // Today: three of the six join the day's session; the tile offers the other three.
  await page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Bugün\d*$/ }).first().click()
  await expect(page.locator('.tile', { hasText: 'Fiil çekimi tekrarı' })).toContainText('3 çekim')
  await page.locator('.tile', { hasText: 'Fiil çekimi tekrarı' }).click()
  // The review asks one person of each form; a wrong answer is corrected and goes to the garden as shaky.
  for (let i = 0; i < 6; i++) {
    await page.locator('.lab-review-run input.answer-input').fill('x')
    await page.keyboard.press('Enter')
    await expect(page.locator('.lab-review-run .accent-result')).toContainText('Doğrusu')
    await page.keyboard.press('Enter')
  }
  await expect(main.getByRole('status')).toContainText('Tekrar bitti')
  await main.getByRole('tab', { name: 'Ustalık' }).click()
  await expect(main.locator('.lab-garden')).toContainText('parler')
  // The old conjugation game card is gone from Games: one place for verbs.
  await openScreen(page, 'Oyunlar')
  await expect(page.locator('.game-card', { hasText: 'Çekim antrenmanı' })).toHaveCount(0)
  await page.locator('.game-card', { hasText: 'Fiil laboratuvarı' }).click()
  await expect(page.getByRole('heading', { name: 'Fiil laboratuvarı' })).toBeVisible()
})

test('verb lab: the Turkish bridge, the verb families and the find-the-tense quiz', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  // The tense seen from Turkish, with where it misleads.
  await expect(main.locator('.lab-bridge')).toContainText('Türkçedeki karşılığı')
  await expect(main.locator('.lab-bridge')).toContainText('-iyor')
  // A verb shows its family; it opens the patterns tab on that family.
  await expect(main.locator('.lab-families')).toContainText('-er fiilleri')
  await main.locator('.lab-families .chip', { hasText: '-er fiilleri' }).click()
  await expect(main.locator('.lab-family.is-open')).toContainText('kök + -e, -es')
  // Spelling-change families: a drill asks one person for a handful of their verbs.
  await main.locator('.lab-family-head', { hasText: '-cer: ç' }).click()
  await main.getByRole('button', { name: 'Bu kalıpla çalış' }).click()
  await page.locator('.lab-drill input.answer-input').fill('x')
  await page.keyboard.press('Enter')
  await expect(page.locator('.lab-drill .accent-result')).toContainText('çons')
  await main.getByRole('button', { name: 'Çık' }).click()
  await main.getByRole('button', { name: 'Kalıbı tanı' }).click()
  await expect(main.locator('.lab-find-card')).toHaveCount(6)
  await main.locator('.lab-find-card').first().click()
  await main.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(main.getByRole('status')).toContainText('/ 6 doğru')
  // Think in Turkish: a Turkish sentence, choose its tense.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Zamanı bul' }).click()
  await expect(main.locator('.lab-tensequiz .prompt-text')).toBeVisible()
  await expect(main.locator('.lab-tensequiz .lab-option')).toHaveCount(4)
  await main.locator('.lab-tensequiz .lab-option').first().click()
  await expect(main.locator('.lab-tensequiz .accent-result')).toContainText('Türkçede')
  expect(await overflow(page)).toEqual([])
})

test('verb lab: wrong answers are named, they show in the weak-spot map, and "which verb?" traces a form back', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Tek tek' }).click()
  // The form of another person is named as such: "parles" for a question that asks another person.
  for (let i = 0; i < 6; i++) {
    const prompt = await main.locator('.lab-single .prompt-text').textContent()
    // Another person's form, never the right one for the person asked: je and nous → parles, the rest → parlons.
    await main.locator('.lab-single input.answer-input').fill(/^(je|nous)\b/.test(prompt ?? '') ? 'parles' : 'parlons')
    await page.keyboard.press('Enter')
    await expect(main.locator('.lab-diagnosis')).toContainText(/Kişi karıştırma|Zaman karıştırma|Yazım|Düzensiz|Diğer|Aksan/)
    await page.keyboard.press('Enter')
    if (await main.locator('.lab-result').count()) break
  }
  await main.getByRole('tab', { name: 'Ustalık' }).click()
  await expect(main.locator('.lab-weak')).toContainText('Zayıf noktaların')
  await expect(main.locator('.lab-heat')).toBeVisible()
  await expect(main.locator('.lab-kinds')).toContainText('%')
  // A kind of slip opens a round aimed at it: persons missed, typed one by one, then back.
  await main.getByRole('button', { name: 'Kişi karıştırma: hedefli alıştırma' }).click()
  await expect(main.locator('.lab-drill h2')).toContainText('Kişi karıştırma')
  await main.locator('.lab-drill input.answer-input').fill('x')
  await page.keyboard.press('Enter')
  await expect(main.locator('.lab-drill .accent-result')).toContainText('Doğrusu')
  await main.getByRole('button', { name: 'Ustalığa dön' }).click()
  await expect(main.locator('.lab-kinds')).toBeVisible()
  // Which verb? A conjugated word to trace back: the verb, then the tense.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Hangi fiil?' }).click()
  await expect(main.locator('.lab-reverse .prompt-text')).toBeVisible()
  await main.locator('.lab-reverse input').fill('zzz')
  await page.keyboard.press('Enter')
  await expect(main.locator('.lab-reverse')).toContainText('Fiil:')
  await main.locator('.lab-reverse .lab-option').first().click()
  await expect(main.locator('.lab-reverse .accent-result')).toContainText('=')
  expect(await overflow(page)).toEqual([])
  // Subjunctive or not: two real forms, and why after the answer.
  await main.getByRole('button', { name: 'Kip seç' }).click()
  await expect(main.locator('.lab-moodquiz .lab-option')).toHaveCount(2)
  await main.locator('.lab-moodquiz .lab-option').first().click()
  await expect(main.locator('.lab-moodquiz .accent-result')).toBeVisible()
  // With nothing due, Today offers a warm-up on the weakest spot; it opens straight on a round.
  await page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Bugün\d*$/ }).first().click()
  await page.getByRole('button', { name: /Fiil ısınması/ }).click()
  await expect(page.locator('.lab-drill h2')).toContainText('hedefli alıştırma')
})

test('verb lab: the verb in real sentences, and the same verb in the other language', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'avoir')
  const main = page.locator('.lab-main')
  // Learn: avoir in Spanish (tener), the forms and the tense's name.
  const twin = main.locator('.lab-twin')
  await expect(twin.locator('summary')).toContainText('İspanyolcada')
  await twin.locator('summary').click()
  await expect(twin.locator('.lab-twin-forms li')).toHaveCount(6)
  // In a sentence: a real sentence with the form taken out, the verb and the tense given.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Cümlede' }).click()
  const quiz = main.locator('.lab-sentencequiz')
  await expect(quiz.locator('.lab-blank')).toHaveText('_____')
  await quiz.locator('input.answer-input').fill('zzz')
  await page.keyboard.press('Enter')
  await expect(quiz.locator('.accent-result')).toContainText('Doğrusu')
  await expect(quiz.locator('.lab-blank')).not.toHaveText('_____')
  expect(await overflow(page)).toEqual([])
})

test('verb lab forms due are mixed into the day\'s session, and the answers go to the lab', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  await page.locator('.lab-main').getByRole('button', { name: 'Tekrar listeme ekle' }).click()
  await expect(page.locator('.lab-main').getByRole('button', { name: 'Tekrar listende' })).toBeDisabled()
  await page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Bugün\d*$/ }).first().click()
  // Watch for the form questions while the session is played through (every answer is wrong).
  await page.evaluate(() => {
    ;(window as unknown as { formsSeen: number }).formsSeen = 0
    new MutationObserver(() => {
      if (document.querySelector('.session-form:not([data-seen])')) {
        document.querySelector('.session-form')!.setAttribute('data-seen', '')
        ;(window as unknown as { formsSeen: number }).formsSeen++
      }
    }).observe(document.body, { childList: true, subtree: true })
  })
  await playSession(page)
  expect(await page.evaluate(() => (window as unknown as { formsSeen: number }).formsSeen)).toBe(3)
  const wrong = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const open = indexedDB.open('kelime-koc')
          open.onsuccess = () => {
            const get = open.result.transaction('meta').objectStore('meta').get('lab:fr')
            get.onsuccess = () => resolve(Object.values((get.result?.value?.records ?? {}) as Record<string, { wrong: number }>).reduce((n, r) => n + r.wrong, 0))
          }
        }),
    )
  await expect.poll(wrong).toBe(3)
})

test('verb lab: add a verb to the list, hear all six, the E and A keys', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'finir')
  const main = page.locator('.lab-main')
  const lists = page.locator('.lab-lists')
  // Not in the list yet: one tap adds it, with the meaning shown in the heading.
  await expect(main.locator('.lab-gloss')).not.toBeEmpty()
  const own = async () => Number((await lists.getByRole('button', { name: /Listemde/ }).textContent())?.match(/\d+/)?.[0] ?? 0)
  const before = await own()
  await main.getByRole('button', { name: /Kelimelerime ekle/ }).click()
  await expect(main.getByRole('button', { name: /Kelimelerime ekle/ })).toHaveCount(0)
  await expect.poll(own).toBe(before + 1)
  // E covers the forms (memorise), E again shows them; A goes on to practice.
  await expect(main.getByRole('button', { name: 'Tümünü dinle' })).toBeVisible()
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('e')
  await expect(main.getByRole('button', { name: 'Ezber' })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('e')
  await expect(main.getByRole('button', { name: 'Ezber' })).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('a')
  await expect(main.getByRole('tab', { name: 'Alıştırma' })).toHaveAttribute('aria-selected', 'true')
})

test('bulk import: each row says why it cannot be added, a sentence without the word is kept, a stray apostrophe is forgiven', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Ekle', exact: true }).click()
  await page.getByRole('menuitem', { name: /Birçok kelime ekle/ }).click()
  await page.locator('summary', { hasText: 'Toplu ekle' }).click()
  await page.locator('details[open] textarea').fill(
    [
      "l'aïus\tUzun, sıkıcı konuşma\tLe directeur nous a fait un long laïus sur la ponctualité.",
      'topo\tKısa sunum\tIl a fait un exposé.',
      'causerie\t',
    ].join('\n'),
  )
  const rows = page.locator('.preview-table tbody tr')
  await expect(rows.nth(0)).toContainText('eklenecek')
  // A sentence the word isn't in is still added, with a note; a row without a meaning is not.
  await expect(rows.nth(1)).toContainText('eklenecek')
  await expect(rows.nth(1)).toContainText('"topo" cümlede geçmiyor')
  await expect(rows.nth(2)).toContainText('anlam yok')
  await expect(page.getByRole('button', { name: '2 kelimeyi ekle' })).toBeVisible()
  await expect(page.getByText('1 satır eklenemiyor')).toBeVisible()
})
