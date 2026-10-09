import { expect, test, type Page } from '@playwright/test'
import { contrastProblems, finishSession, labFavorites, openScreen, openVerbLab, overflow, playSession, startWithSamples } from './helpers'

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
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /^Detaylı/ }).click()
  await expect(main.locator('.lab-card', { hasText: 'Plus-que-parfait' })).toContainText('avions parlé')
  await expect(main.locator('.lab-card', { hasText: 'Subjonctif passé' })).toContainText('aie parlé')
  await main.getByRole('button', { name: '← Basit görünüm' }).click()
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
  await main.getByRole('tab', { name: 'İlerleme' }).click()
  // Both rounds count (one form in six missed is still a right round): 20 of 60 points.
  await expect(main.getByRole('button', { name: /^Présent:/ })).toContainText('Öğreniliyor (20/60)')
  // Choosing among forms, and the pairs.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Seç', exact: true }).click()
  await expect(main.locator('.lab-option')).toHaveCount(4)
  await main.getByRole('button', { name: 'Diğer alıştırmalar' }).click()
  await page.getByRole('menuitem', { name: /^Eşleştir/ }).click()
  await expect(main.locator('.lab-match-btn')).toHaveCount(12)
  // Time against the clock is a practice mode with three levels; compare (a learn view) shows three tenses at once.
  await main.getByRole('button', { name: 'Zamana karşı' }).click()
  await expect(main.locator('.lab-levelcard')).toHaveCount(3)
  await main.getByRole('tab', { name: 'Öğren' }).click()
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /^Kıyasla/ }).click()
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
  await main.getByRole('tab', { name: 'Öğren' }).click()
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
  // One list with a filter, folded until asked for: favourites come first when there are any; recent is a tap away.
  await expect(page.locator('.lab-lists')).toHaveCount(0)
  await page.getByRole('button', { name: /Fiil listeleri/ }).click()
  const lists = page.locator('.lab-lists')
  await expect(lists.getByRole('button', { name: /Favori/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(lists.locator('.lab-chips .chip')).toHaveCount(1)
  await lists.getByRole('button', { name: /Son bakılan/ }).click()
  await expect(lists.locator('.lab-chips .chip').first()).toBeVisible()
  // Picking a verb there folds the lists away again.
  await lists.locator('.lab-chips .chip').first().click()
  await expect(page.locator('.lab-lists')).toHaveCount(0)
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
  await main.getByRole('tab', { name: 'İlerleme' }).click()
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
  await main.getByRole('button', { name: 'Diğer alıştırmalar' }).click()
  await page.getByRole('menuitem', { name: /^Zamanı\ bul/ }).click()
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
  await main.getByRole('tab', { name: 'İlerleme' }).click()
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
  await main.getByRole('button', { name: 'Diğer alıştırmalar' }).click()
  await page.getByRole('menuitem', { name: /^Hangi\ fiil\?/ }).click()
  await expect(main.locator('.lab-reverse .prompt-text')).toBeVisible()
  await main.locator('.lab-reverse input').fill('zzz')
  await page.keyboard.press('Enter')
  await expect(main.locator('.lab-reverse')).toContainText('Fiil:')
  await main.locator('.lab-reverse .lab-option').first().click()
  await expect(main.locator('.lab-reverse .accent-result')).toContainText('=')
  expect(await overflow(page)).toEqual([])
  // Subjunctive or not: two real forms, and why after the answer.
  await main.getByRole('button', { name: 'Diğer alıştırmalar' }).click()
  await page.getByRole('menuitem', { name: /^Kip\ seç/ }).click()
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
  await page.getByRole('button', { name: /Fiil listeleri/ }).click()
  const lists = page.locator('.lab-lists')
  // Not in the list yet: one tap adds it, with the meaning shown in the heading.
  await expect(main.locator('.lab-gloss')).not.toBeEmpty()
  const own = async () => Number((await lists.getByRole('button', { name: /Listemde/ }).textContent())?.match(/\d+/)?.[0] ?? 0)
  const before = await own()
  await main.getByRole('button', { name: /Kelimelerime ekle/ }).click()
  await expect(main.getByRole('button', { name: /Kelimelerime ekle/ })).toHaveCount(0)
  await expect.poll(own).toBe(before + 1)
  // E covers the forms (memorise), E again shows them; A goes on to practice.
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await expect(page.getByRole('menuitem', { name: /^Altısını dinle/ })).toBeVisible()
  await page.keyboard.press('Escape')
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

test('reading: a conjugated form opens the verb lab at its verb and tense', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Nous parlions souvent de la mer.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.locator('.rw', { hasText: /^parlions$/ }).click()
  await expect(page.locator('.form-analysis')).toContainText('parler')
  await page.locator('.form-analysis').getByRole('button', { name: 'fiil laboratuvarında aç' }).first().click()
  const main = page.locator('.lab-main')
  await expect(main.locator('.lab-forms')).toContainText('parlions')
  await expect(main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Imparfait' })).toHaveAttribute('aria-pressed', 'true')
})

test('verb lab: the Turkish of each form beside it, in the core tenses, never when unsure', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await expect(main.locator('.lab-tr')).toHaveText(['konuşuyorum', 'konuşuyorsun', 'konuşuyor', 'konuşuyoruz', 'konuşuyorsunuz', 'konuşuyorlar'])
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Passé composé' }).click()
  await expect(main.locator('.lab-tr').first()).toHaveText('konuştum')
  // "être" is "olmak": "oluyorum" would be wrong, so nothing is shown.
  await openVerbLab(page, 'être')
  await expect(main.locator('.lab-forms')).toContainText('avons été')
  await expect(main.locator('.lab-tr')).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('Today: the verb of the day opens its table in the verb lab', async ({ page }) => {
  await startWithSamples(page)
  const tile = page.locator('.tile', { hasText: 'Günün fiili' })
  await expect(tile).toBeVisible()
  const verb = (await tile.locator('strong [lang]').textContent())!.trim()
  await tile.click()
  await expect(page.getByRole('heading', { name: 'Fiil laboratuvarı' })).toBeVisible()
  await expect(page.locator('.lab-main .lab-verb').first()).toHaveText(new RegExp(`^${verb}$`, 'i'))
  await expect(page.locator('.lab-main .lab-forms')).toBeVisible()
})

test('verb lab: the tabs and modes used are counted in Settings → Kullanım', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('button', { name: 'Seç', exact: true }).click()
  await openScreen(page, 'Ayarlar')
  await page.getByRole('searchbox', { name: 'Ayar ara' }).fill('Kullanım')
  const card = page.locator('section.card', { has: page.getByRole('heading', { name: 'Kullanım', exact: true }) })
  await expect(card.getByRole('heading', { name: 'Fiil laboratuvarı' })).toBeVisible()
  await expect(card.locator('.hour-list').last()).toContainText('Alıştırma · Seç')
  await expect(card.locator('.hour-list').last()).toContainText('Öğren')
  await expect(card.locator('.hour-list').first()).not.toContainText('Alıştırma')
})

test('verb lab: Ustalık shows the share of right answers week by week', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Présent' }).click()
  const answers = ['parle', 'parlais', 'parle', 'parlons', 'parlez', 'parlent']
  for (const [i, a] of answers.entries()) await page.locator(`#lab-in-${i}`).fill(a)
  await main.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(main.locator('.lab-result')).toContainText('5 / 6 doğru')
  await main.getByRole('tab', { name: 'İlerleme' }).click()
  const weeks = main.getByRole('region', { name: 'Haftalar' })
  await expect(weeks).toContainText('Bu hafta 6 cevap, %83 doğru')
  await expect(weeks.locator('.bar-row').first()).toContainText('Bu hafta')
  await expect(weeks.locator('.bar-row').first()).toContainText('%83 · 6')
  await expect(weeks.locator('.bar-row')).toHaveCount(6)
})

test('verb lab: memorise mode asks knew it or not, and a marked-through table counts toward mastery', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('button', { name: 'Ezber' }).click()
  const table = main.locator('.lab-forms')
  await expect(table.locator('.lab-cover')).toHaveCount(6)
  for (let i = 0; i < 6; i++) {
    await table.locator('.lab-cover').first().click()
    await table.locator('.lab-grade').first().getByRole('button', { name: i === 2 ? 'Bilemedim' : 'Bildim' }).click()
  }
  await expect(table.locator('.lab-graded.is-ok')).toHaveCount(5)
  await expect(table.locator('.lab-graded.is-no')).toHaveCount(1)
  await expect(main.locator('.lab-memo-result')).toContainText('5/6 bildin')
  await main.locator('.lab-memo-result').getByRole('button', { name: 'Yeniden kapat' }).click()
  await expect(table.locator('.lab-cover')).toHaveCount(6)
  await main.getByRole('tab', { name: 'İlerleme' }).click()
  await expect(main.getByRole('button', { name: /^Présent:/ })).toContainText('Öğreniliyor (10/60)')
})

test("Games: the day's reviews come first, with a start button", async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  // Nothing due yet: only new words wait, no note.
  await expect(page.locator('.games-day-first')).toHaveCount(0)
  await openScreen(page, 'Bugün')
  await finishSession(page)
  // Two days on, the words met today are due.
  await page.clock.setFixedTime(new Date('2026-03-06T10:00:00'))
  await page.reload()
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').click()
  await openScreen(page, 'Oyunlar')
  const note = page.locator('.games-day-first')
  await expect(note).toContainText(/Önce bugünkü görevin: \d+ tekrar/)
  await note.getByRole('button', { name: 'Başlat' }).click()
  await expect(page.locator('.session-stage')).toBeVisible()
})

test('reading: reaching the end saves the meetings with list words on its own; finishing is up top too', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill("L'arbre est grand. Cette année, l'arbre a beaucoup grandi.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  const met = page.getByRole('status').filter({ hasText: 'karşılaşman kaydedildi' })
  await page.getByRole('button', { name: 'Okumayı bitir' }).last().scrollIntoViewIfNeeded()
  // A glance is not a reading: nothing for the first seconds.
  await page.waitForTimeout(3000)
  await expect(met).toHaveCount(0)
  await expect(met).toContainText(/Kelimelerindeki \d+ kelimeyle karşılaşman kaydedildi/, { timeout: 25_000 })
  const saved = await page.evaluate(
    () =>
      new Promise<number>((done) => {
        const req = indexedDB.open('kelime-koc')
        req.onsuccess = () => {
          const get = req.result.transaction('meta').objectStore('meta').get('encounters')
          get.onsuccess = () => done(Object.keys((get.result?.value as Record<string, number>) ?? {}).length)
        }
      }),
  )
  expect(saved).toBeGreaterThan(0)
  // The finish button at the top opens the same confirmation.
  await page.locator('.reader-tools').getByRole('button', { name: 'Okumayı bitir' }).click()
  await expect(page.getByRole('alertdialog', { name: 'Okumayı bitir' })).toBeVisible()
})

test('Games: against the clock can be played by writing the word from its meaning', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.getByRole('button', { name: /^Zamana karşı 60 saniyede/ }).click()
  await page.getByRole('button', { name: 'Kelimeyi yaz' }).click()
  await expect(page.getByRole('button', { name: 'Kelimeyi yaz' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Başla', exact: true }).click()
  const meaning = page.locator('.blitz-meaning')
  await expect(meaning).toBeVisible()
  // Find the word for the meaning shown, from the app's own list.
  const gloss = (await meaning.textContent())!.trim()
  const word = await page.evaluate(
    (g) =>
      new Promise<string>((done) => {
        const req = indexedDB.open('kelime-koc')
        req.onsuccess = () => {
          const all = req.result.transaction('vocabulary').objectStore('vocabulary').getAll()
          all.onsuccess = () => {
            const e = (all.result as { lemma: string; article?: string; senses: { gloss: string }[] }[]).find((v) => v.senses[0].gloss === g)
            done(e ? `${e.article ? (e.article.endsWith("'") ? e.article : `${e.article} `) : ''}${e.lemma}` : '')
          }
        }
      }),
    gloss,
  )
  const input = page.getByRole('textbox', { name: 'Kelimeyi yaz' })
  expect(word).not.toBe('')
  await input.fill(word)
  await input.press('Enter')
  await expect(page.locator('.game-score')).toHaveText('25 puan')
  await expect(input).toHaveValue('')
  // A wrong one shows the right form.
  await input.fill('zzzz')
  await input.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Doğrusu:' })).toBeVisible()
})

test('tabs: one indicator slides to the chosen tab; reading lights the sentence of the chosen word', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const tabs = page.locator('.lab-main .lab-tabs')
  const placed = () => tabs.evaluate((el) => [parseFloat(getComputedStyle(el).getPropertyValue('--ind-x')), (el.querySelector('[aria-selected="true"]') as HTMLElement).offsetLeft])
  await expect(tabs).toHaveClass(/has-ind/)
  await tabs.getByRole('tab', { name: 'İlerleme' }).click()
  await expect.poll(async () => { const [x, left] = await placed(); return x === left && left > 0 }).toBe(true)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill("L'arbre est grand. Le chat dort.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.locator('.rw', { hasText: /^chat$/ }).first().click()
  await expect(page.locator('.rs.is-lit')).toHaveText('Le chat dort.')
})

test("verb lab: the day's round, one button: questions picked for you, then done for today", async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page)
  const card = page.getByRole('region', { name: 'Bugünün fiil turu' })
  await expect(card).toContainText(/\d+ soru · yaklaşık \d+ dk/)
  await card.getByRole('button', { name: /Başla/ }).click()
  const run = page.getByRole('region', { name: 'Fiil turu' })
  await expect(run).toBeVisible()
  // The rest of the lab steps aside while the round runs.
  await expect(page.locator('.lab-grid')).toHaveCount(0)
  for (let i = 0; i < 20 && (await run.count()); i++) {
    const option = run.locator('.option:not([disabled])')
    const input = run.locator('input.answer-input:not([disabled])')
    if (await option.count()) await option.first().click()
    else if (await input.count()) {
      await input.fill('x')
      await input.press('Enter')
    }
    await run.getByRole('button', { name: /^(Devam|Bitir)$/ }).click()
  }
  const done = page.getByRole('status').filter({ hasText: 'Bugünkü fiil turun bitti' })
  await expect(done).toContainText(/\d+ çekim, \d+ doğru/)
  await done.getByRole('button', { name: 'Laboratuvara dön' }).click()
  await expect(page.getByRole('region', { name: 'Bugünün fiil turu' })).toContainText('Bugünkü fiil turun bitti')
  await expect(page.getByRole('region', { name: 'Bugünün fiil turu' }).getByRole('button', { name: /Bir tur daha/ })).toBeVisible()
  // The answers went to the lab: the forms are in its review queue now.
  await page.locator('.lab-main').getByRole('tab', { name: 'İlerleme' }).click()
  await expect(page.locator('.lab-main .lab-weeks')).toContainText('Bu hafta')
})

test('badges: earned with a date, shown newest first on the profile, one card per series', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithSamples(page)
  await finishSession(page)
  await openScreen(page, 'Profil')
  const today = await page.evaluate(() => new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))
  const timeline = page.locator('.badge-timeline')
  await expect(timeline).toContainText('İlk adım')
  await expect(timeline).toContainText(today)
  // The words series is one card: its first step earned, the rest as stars.
  await expect(page.locator('.badge-summary-count')).toContainText(/\/ \d+ rozet · \d+\/\d+ kademe/)
  await page.locator('.badge-case .badge-card', { hasText: 'İlk adım' }).click()
  await expect(page.locator('.badge-steps li.is-done').first()).toContainText(today)
})

test('translation: "Çevir" fills the Turkish of a sentence when the server can translate, and is absent when not', async ({ page }) => {
  // Initially simulate server unavailable so button is absent regardless of live backend proxy.
  await page.route('**/api/translate?usage=1', (r) => r.fulfill({ status: 503, json: { error: 'unavailable' } }))
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Ekle', exact: true }).click()
  await page.getByRole('menuitem').first().click()
  // When the server has no translation function, the button stays absent.
  await page.getByLabel('Cümle', { exact: true }).first().fill('Le chat dort.')
  await expect(page.getByRole('button', { name: 'Çevir', exact: true })).toHaveCount(0)
  // With the server answering (stubbed here), the button appears and fills the field.
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 500000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => r.fulfill({ json: { translation: 'Kedi uyuyor.' } }))
  await page.reload()
  await openScreen(page, 'Kelimeler')
  // The words screen remembers it was on the add form.
  await expect(page.getByLabel('Cümle', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Cümle', { exact: true }).first().fill('Le chat dort.')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  await expect(page.getByLabel('Türkçesi', { exact: true })).toHaveValue('Kedi uyuyor.')
})

test('translation screen: a short text translated sentence by sentence, side by side; a pair kept as a sentence card', async ({ page }) => {
  await startWithSamples(page)
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 1000000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => {
    const text = new URL(r.request().url()).searchParams.get('text')!
    return r.fulfill({ json: { translation: { 'Le chat dort.': 'Kedi uyuyor.', 'Il fait beau.': 'Hava güzel.' }[text] ?? '?' } })
  })
  await openScreen(page, 'Çeviri')
  await page.getByLabel('Çevrilecek metin').fill('Le chat dort. Il fait beau.')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  const pairs = page.locator('.translate-pairs li')
  await expect(pairs).toHaveCount(2)
  await expect(pairs.nth(0)).toContainText('Kedi uyuyor.')
  await expect(pairs.nth(1)).toContainText('Hava güzel.')
  await pairs.nth(0).getByRole('button', { name: /Kart yap/ }).click()
  await expect(pairs.nth(0).getByRole('button', { name: /Kaydedildi/ })).toBeDisabled()
  expect(await overflow(page)).toEqual([])
})

test('translation memory: a reading sentence translated on request, the recent ones listed, a single word one tap from the add form', async ({ page }) => {
  await startWithSamples(page)
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 1000000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => {
    const text = new URL(r.request().url()).searchParams.get('text')!
    return r.fulfill({ json: { translation: { 'Le chat dort.': 'Kedi uyuyor.', maison: 'ev' }[text] ?? '?' } })
  })
  // Reading: the sentence of the word looked up, in Turkish on one tap.
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Le chat dort.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.locator('.rw', { hasText: /^chat$/ }).first().click()
  await page.getByRole('button', { name: /Cümlenin Türkçesi/ }).click()
  await expect(page.locator('.sentence-tr', { hasText: 'Kedi uyuyor.' })).toBeVisible()
  // Translation screen: that sentence is in the memory; a single word goes to the add form.
  await openScreen(page, 'Çeviri')
  await expect(page.getByRole('region', { name: 'Son çevirilerin' })).toContainText('Kedi uyuyor.')
  await page.getByLabel('Çevrilecek metin').fill('maison')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  await page.getByRole('button', { name: /Kelimelerime ekle/ }).click()
  await expect(page.locator('#w-word, input[name="word"]').first()).toHaveValue(/maison/)
})

/** A short listening text with timed cues and a few seconds of silence as its audio. */
async function addTimedListening(page: Page) {
  await page.evaluate(async () => {
    const rate = 8000
    const seconds = 6
    const samples = rate * seconds
    const buf = new ArrayBuffer(44 + samples)
    const v = new DataView(buf)
    const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
    str(0, 'RIFF'); v.setUint32(4, 36 + samples, true); str(8, 'WAVE'); str(12, 'fmt ')
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
    str(36, 'data'); v.setUint32(40, samples, true)
    for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128)
    const audio = await new Promise<string>((done) => { const r = new FileReader(); r.onload = () => done(r.result as string); r.readAsDataURL(new Blob([buf], { type: 'audio/wav' })) })
    const text = { id: 'listen-test', language: 'fr', title: 'Écoute', text: 'Le chat dort. Il fait beau. Nous partons demain.', audio, addedAt: new Date().toISOString(), history: [], cues: [{ start: 0, text: 'Le chat dort.' }, { start: 2, text: 'Il fait beau.' }, { start: 4, text: 'Nous partons demain.' }] }
    await new Promise<void>((done) => {
      const req = indexedDB.open('kelime-koc')
      req.onsuccess = () => {
        const tx = req.result.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({ key: 'library', value: [text] })
        tx.oncomplete = () => done()
      }
    })
  })
}

test('listening: the sentence heard is lit, and a sentence can be played from its start', async ({ page }) => {
  await startWithSamples(page)
  await addTimedListening(page)
  await openScreen(page, 'Okuma')
  await page.getByText('Écoute').first().click()
  await expect(page.locator('audio.audio-player')).toHaveCount(1)
  await expect(page.getByText('Dinlerken duyduğun cümle metinde aydınlanır.')).toBeVisible()
  const heard = page.locator('.reader .rs.is-heard')
  await page.locator('audio.audio-player').evaluate((a: HTMLAudioElement) => {
    a.currentTime = 2.5
    a.dispatchEvent(new Event('timeupdate'))
  })
  await expect(heard).toHaveText('Il fait beau.')
  // From the word panel: play from the third sentence's start.
  // A text with audio starts hidden (listen first); leaving the rounds shows it.
  await page.getByRole('button', { name: 'Turları bırak' }).click()
  await page.locator('.rw', { hasText: /^demain$/ }).click()
  await page.getByRole('button', { name: /Bu cümleden dinle/ }).click()
  await expect.poll(() => page.locator('audio.audio-player').evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(3.7)
})

test('reading: the whole text in Turkish under each paragraph, each sentence translated once', async ({ page }) => {
  await startWithSamples(page)
  const asked: string[] = []
  const tr: Record<string, string> = { 'Le chat dort.': 'Kedi uyuyor.', 'Il fait beau.': 'Hava güzel.', 'Nous partons.': 'Gidiyoruz.' }
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 1000000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => {
    const text = new URL(r.request().url()).searchParams.get('text')!
    asked.push(text)
    return r.fulfill({ json: { translation: tr[text] ?? '?' } })
  })
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Le chat dort. Il fait beau.\n\nNous partons.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  const turkish = page.getByRole('button', { name: /Türkçesi/ })
  await turkish.click()
  await expect(page.locator('.reader-tr')).toHaveText(['Kedi uyuyor. Hava güzel.', 'Gidiyoruz.'])
  // Off and on again: answered from memory, nothing asked twice.
  await turkish.click()
  await expect(page.locator('.reader-tr')).toHaveCount(0)
  await turkish.click()
  await expect(page.locator('.reader-tr')).toHaveText(['Kedi uyuyor. Hava güzel.', 'Gidiyoruz.'])
  expect(asked.sort()).toEqual(['Il fait beau.', 'Le chat dort.', 'Nous partons.'])
})

test('dictation of a text: each sentence played from its recording, written, compared; the missed words listed', async ({ page }) => {
  await startWithSamples(page)
  await addTimedListening(page)
  await openScreen(page, 'Okuma')
  await page.getByText('Écoute').first().click()
  await page.getByRole('button', { name: /Dikte/ }).click()
  const panel = page.getByRole('region', { name: 'Dikte' })
  await expect(panel).toContainText('Dikte · 1 / 3')
  await expect(panel).toContainText('Metnin kendi kaydından')
  await expect(page.locator('.reader')).toHaveClass(/is-hidden/)
  // The first sentence plays and stops where the second begins.
  const audio = page.locator('audio.audio-player')
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => (a.paused && a.currentTime > 1.5 ? a.currentTime : 0)), { timeout: 8000 }).toBeLessThan(2.3)
  const answer = page.getByLabel('Duyduğun cümle')
  await answer.fill('le chat dort')
  await answer.press('Enter')
  await expect(panel.locator('.dd-missed')).toHaveCount(0)
  await answer.press('Enter')
  await expect(panel).toContainText('Dikte · 2 / 3')
  await answer.fill('Il fait')
  await panel.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(panel.locator('.dd-missed')).toHaveText(['beau.'])
  await panel.getByRole('button', { name: 'Devam' }).click()
  await panel.getByRole('button', { name: 'Göster' }).click()
  await panel.getByRole('button', { name: 'Bitir' }).last().click()
  await expect(panel).toContainText('3 cümlede kelimelerin %56’ini doğru yazdın.')
  await expect(panel.locator('.dd-missed')).toHaveText(['beau', 'nous', 'partons', 'demain'])
  await panel.getByRole('button', { name: 'Metne dön' }).click()
  await expect(panel).toHaveCount(0)
})

test('back-translation: sentences translated before come back as their Turkish, written and kept as sentence cards', async ({ page }) => {
  await startWithSamples(page)
  const tr: Record<string, string> = { 'Le chat dort sur le canapé.': 'Kedi kanepede uyuyor.', 'Nous partons tôt demain.': 'Yarın erken yola çıkıyoruz.' }
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 1000000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => r.fulfill({ json: { translation: tr[new URL(r.request().url()).searchParams.get('text')!] ?? '?' } }))
  await openScreen(page, 'Çeviri')
  await page.getByLabel('Çevrilecek metin').fill('Le chat dort sur le canapé. Nous partons tôt demain.')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Çeviri' })).toContainText('Yarın erken yola çıkıyoruz.')
  await openScreen(page, 'Oyunlar')
  const card = page.locator('.game-card', { hasText: 'Geri çeviri' })
  await expect(card).toContainText('2 cümle hazır')
  await card.click()
  // Newest first: the second sentence was translated last.
  await expect(page.locator('.prompt-text')).toHaveText('Yarın erken yola çıkıyoruz.')
  await page.getByLabel('Cevabın').fill('Nous partons tot demain')
  await page.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(page.locator('.sentence-result')).toContainText('Doğru!')
  await page.getByRole('button', { name: 'Devam' }).click()
  await expect(page.locator('.prompt-text')).toHaveText('Kedi kanepede uyuyor.')
  await page.getByLabel('Cevabın').fill('Le chat dort')
  await page.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(page.locator('.sentence-result .dd-missed')).toHaveText(['sur', 'le', 'canapé.'])
  await page.getByRole('button', { name: 'Yanlıştı' }).click()
  await expect(page.getByText('2 cümleden 1 tanesini doğru yazdın.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Oyunlara dön' }).click()
  // Both are sentence cards now: nothing left to write back.
  await expect(card).toContainText('Okurken “Cümlenin Türkçesi”ne bas')
  await page.locator('.game-card', { hasText: 'Cümle kartları' }).click()
  await expect(page.getByRole('region', { name: /Cümlelerin/ }).or(page.locator('.sentence-list'))).toContainText('Nous partons tôt demain.')
})
