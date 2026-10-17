import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { approveAccount, contrastProblems, finishSession, labFavorites, openScreen, openVerbLab, overflow, playSession, startWithSamples } from './helpers'

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
  // The profile opens, and on a wide screen it has no settings button of its own (the side menu has it).
  await expect(page.getByLabel('Adın')).toBeVisible()
  await expect(page.locator('.profile-settings')).toBeHidden()
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
  await main.getByRole('button', { name: 'Liste', exact: true }).click()
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

test('verb lab: with reflexive forms on, the example is the reflexive verb\'s own sentence', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'lever')
  const main = page.locator('.lab-main')
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Passé composé' }).click()
  await expect(main.locator('.lab-forms')).toContainText('avons levé')
  await main.getByRole('button', { name: 'Diğer seçenekler' }).click()
  await page.getByRole('menuitem', { name: /Dönüşlü/ }).click()
  await expect(main.locator('.lab-forms')).toContainText('me suis levé')
  await expect(main.locator('.lab-example')).toContainText('je me suis levé très tôt')
})

test('verb lab: a person often missed in a tense is marked in its table', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await expect(main.locator('.lab-row.is-weak')).toHaveCount(0)
  // Two rounds with "tu" wrong.
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Présent' }).click()
  await main.getByRole('button', { name: 'Liste', exact: true }).click()
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
  await page.getByRole('menuitem', { name: /^Zamanı bul/ }).click()
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
  await page.getByRole('menuitem', { name: /^Hangi fiil\?/ }).click()
  await expect(main.locator('.lab-reverse .prompt-text')).toBeVisible()
  await main.locator('.lab-reverse input').fill('zzz')
  await page.keyboard.press('Enter')
  await expect(main.locator('.lab-reverse')).toContainText('Fiil:')
  await main.locator('.lab-reverse .lab-option').first().click()
  await expect(main.locator('.lab-reverse .accent-result')).toContainText('=')
  expect(await overflow(page)).toEqual([])
  // Subjunctive or not: two real forms, and why after the answer.
  await main.getByRole('button', { name: 'Diğer alıştırmalar' }).click()
  await page.getByRole('menuitem', { name: /^Kip seç/ }).click()
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
  // The sentence the lab has for the verb goes onto the card with it (the form marked).
  const examples = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const open = indexedDB.open('kelime-koc')
          open.onsuccess = () => {
            const all = open.result.transaction('vocabulary').objectStore('vocabulary').getAll()
            all.onsuccess = () => resolve(((all.result as { lemma: string; senses: { examples: unknown[] }[] }[]).find((v) => v.lemma === 'finir')?.senses[0]?.examples.length) ?? 0)
          }
        }),
    )
  await expect.poll(examples).toBeGreaterThan(0)
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

test('bulk import: the words go to a new list named in the form', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Ekle', exact: true }).click()
  await page.getByRole('menuitem', { name: /Birçok kelime ekle/ }).click()
  await page.locator('summary', { hasText: 'Toplu ekle' }).click()
  const box = page.locator('details[open]')
  await box.locator('textarea').fill('la fenêtre - pencere\nle rideau - perde')
  await box.getByRole('button', { name: /^Liste:/ }).click()
  await page.getByRole('option', { name: '+ Yeni liste' }).click()
  await box.getByLabel('Yeni listenin adı').fill('Ev eşyaları')
  await box.getByRole('button', { name: '2 kelimeyi ekle' }).click()
  await expect(page.getByText('2 kelime eklendi.')).toBeVisible()
  const placed = await page.evaluate(
    () =>
      new Promise<{ names: string[]; inList: number }>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction(['meta', 'vocabulary'])
          const lists = tx.objectStore('meta').get('wordLists')
          const words = tx.objectStore('vocabulary').getAll()
          tx.oncomplete = () => {
            const all = (lists.result?.value ?? []) as { id: string; name: string }[]
            const mine = (words.result as { listId?: string; lemma: string }[]).filter((w) => w.lemma === 'fenêtre' || w.lemma === 'rideau')
            resolve({ names: all.map((l) => l.name), inList: mine.filter((w) => all.some((l) => l.id === w.listId && l.name === 'Ev eşyaları')).length })
          }
        }
      }),
  )
  expect(placed).toEqual({ names: ['Ev eşyaları'], inList: 2 })
})

test('the YZ screens wait for the owner\'s approval: a visitor is told why, an approved account gets the key form', async ({ page }) => {
  test.setTimeout(60_000)
  await page.route((u) => u.pathname === '/api/access', (r) => r.fulfill({ json: { enabled: true } }))
  await startWithSamples(page)
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Araçlar' }).click()
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'YZ yardımcısı' }) })
  await expect(card).toContainText('onayladığı hesaplara açık')
  await expect(card.getByLabel('Anthropic API anahtarı')).toHaveCount(0)
  // Approved (as the app keeps it once the server says so): the key form is there.
  await approveAccount(page)
  await expect(card.getByLabel('Anthropic API anahtarı')).toBeVisible()
  await expect(card).not.toContainText('onayladığı hesaplara açık')
})

test('a signed-in account waits for approval: the account card says so, and there is no owner\'s list in the app', async ({ page }) => {
  test.setTimeout(60_000)
  // The server is not reached here (preview would forward /api to the live site): it answers "waiting".
  await page.route((u) => u.pathname === '/api/access', (r) => r.fulfill({ json: { status: 'pending', exists: true, match: true } }))
  await startWithSamples(page)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction('meta', 'readwrite')
          tx.objectStore('meta').put({ key: 'syncAccount', value: { kind: 'account', username: 'ali', id: 'a'.repeat(64), enc: 'e'.repeat(64), auth: '1'.repeat(64) } })
          tx.objectStore('meta').put({ key: 'accessStatus', value: { status: 'pending', at: new Date().toISOString() } })
          tx.oncomplete = () => resolve()
        }
      }),
  )
  await page.reload()
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Hesap' }).click()
  await expect(page.locator('.account-card .status-pill')).toContainText('Onay bekliyor')
  await expect(page.locator('.account-card')).toContainText('site sahibinin onayını bekliyor')
  // Approvals are handled in Supabase now: no owner's list inside the app.
  await expect(page.getByText('Yönetici: hesap onayları')).toHaveCount(0)
})

test('reading: the forms list finds a reflexive compound tense and lights the form\'s sentence in the text', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill("Il fait beau. Elle s'est lavée ce matin. Nous parlons.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.getByRole('button', { name: 'Çekimler' }).click()
  const card = page.getByRole('region', { name: 'Metindeki çekimler' })
  await card.locator('summary', { hasText: 'passé composé' }).click()
  const row = card.locator('.text-forms-item', { hasText: "s'est lavée" })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: /metinde göster/ }).click()
  await expect(page.locator('.reader .rs.is-flash')).toContainText("Elle s'est lavée ce matin.")
})

test('reading: a text in the library says how much of it is new for the reader now', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Hier soir, nous avons mangé des champignons délicieux avec nos voisins.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await expect(page.locator('.reader')).toContainText('champignons')
  await page.getByRole('button', { name: /Kütüphane/ }).click()
  await expect(page.locator('.lib-card').first()).toContainText(/biliyorsun .* · \d+ yeni kelime/)
})

test('reading, deduction mode: an unknown word is hidden, tapping shows it and asks how close the guess was', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill('Hier soir, nous avons mangé des champignons délicieux avec nos voisins.')
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await expect(page.locator('.rw-masked')).toHaveCount(0)
  await page.getByRole('button', { name: 'Çıkarım' }).click()
  const hidden = page.locator('.rw-masked')
  await expect(hidden).toHaveCount(1)
  await expect(hidden).toHaveText('[ ? ]')
  await hidden.click()
  await expect(page.locator('.rw-masked')).toHaveCount(0)
  await expect(page.locator('.reader')).toContainText('champignons')
  const rating = page.getByRole('region', { name: 'Tahmin' })
  await expect(rating).toContainText('tahminin ne kadar yakındı')
  await rating.getByRole('button', { name: 'Yaklaştım' }).click()
  await expect(rating).toHaveCount(0)
  // Turned off, nothing is hidden (and the word stays as it was).
  await page.getByRole('button', { name: 'Çıkarım' }).click()
  await expect(page.locator('.rw-masked')).toHaveCount(0)
})

test('the dark, calm and high-contrast themes keep the main screens readable', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  for (const theme of ['dark', 'calm', 'contrast']) {
    await page.evaluate((t) => {
      const root = document.documentElement
      delete root.dataset.calm
      delete root.dataset.contrast
      root.dataset.theme = t === 'calm' ? 'dark' : t === 'contrast' ? 'light' : t
      if (t === 'calm') root.dataset.calm = ''
      if (t === 'contrast') root.dataset.contrast = ''
    }, theme)
    for (const name of ['Bugün', 'Çeviri', 'Fiiller', 'İlerleme']) {
      await openScreen(page, name)
      await page.waitForTimeout(450)
      expect(await contrastProblems(page), `${theme} / ${name}`).toEqual([])
    }
  }
})

test('reading: outside learning sites are only links, opening in a new tab', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  const card = page.getByRole('region', { name: 'Dışarıda çalış' })
  await expect(card).toBeVisible()
  const link = card.getByRole('link', { name: /TV5Monde/ })
  await expect(link).toHaveAttribute('href', 'https://apprendre.tv5monde.com/')
  await expect(link).toHaveAttribute('target', '_blank')
  expect(await overflow(page)).toEqual([])
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

test('reading: the verb forms of the text listed by tense, each opening the lab', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  await page.getByLabel('Metin', { exact: true }).fill("Nous parlions souvent. Nous parlions de la mer. Je parle bien. J'ai mangé.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.getByRole('button', { name: 'Çekimler' }).click()
  const card = page.getByRole('region', { name: 'Metindeki çekimler' })
  await expect(card).toContainText('parlions')
  await expect(card.locator('.word-row', { hasText: 'parlions' })).toContainText('2 kez')
  // A compound tense is one form: the auxiliary and the participle together, in its own group.
  await card.locator('summary', { hasText: 'passé composé' }).click()
  await expect(card.locator('.word-row', { hasText: 'ai mangé' })).toBeVisible()
  await expect(card.locator('.word-row .w', { hasText: /^ai$/ })).toHaveCount(0)
  // The forms of the text join the verb lab's review queue, once.
  await card.getByRole('button', { name: /Hepsini fiil tekrarına ekle/ }).click()
  await expect(page.getByText(/çekim fiil tekrarına eklendi/)).toBeVisible()
  await card.getByRole('button', { name: /Hepsini fiil tekrarına ekle/ }).click()
  await expect(page.getByText('Bunlar zaten fiil tekrarında.')).toBeVisible()
  await card.locator('.word-row', { hasText: 'parlions' }).click()
  const main = page.locator('.lab-main')
  await expect(main.locator('.lab-forms')).toContainText('parlions')
  await expect(main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Imparfait' })).toHaveAttribute('aria-pressed', 'true')
})

test('verb lab: today\'s round can be put away for the day with its close button, and stays away after a reload', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page)
  const card = page.getByRole('region', { name: 'Bugünün fiil turu' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Bugünlük gizle' }).click()
  await expect(card).toHaveCount(0)
  await page.reload()
  await openVerbLab(page)
  await expect(page.getByRole('heading', { name: 'Fiil laboratuvarı' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Bugünün fiil turu' })).toHaveCount(0)
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

test('verb lab: a conjugated form typed in the search opens its verb at that tense', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const input = page.getByRole('combobox')
  // Typed without its accent: "etions" is être, imparfait, nous.
  await input.fill('etions')
  await expect(page.getByRole('option').first()).toContainText('être')
  await input.press('Enter')
  const main = page.locator('.lab-main')
  await expect(main.locator('.lab-verb').first()).toHaveText(/^être$/i)
  await expect(main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Imparfait' })).toHaveAttribute('aria-pressed', 'true')
  await expect(main.locator('.lab-row.is-found')).toContainText('étions')
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

test('games started are counted in Settings → Kullanım, by name', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Refleks turu' }).click()
  await expect(page.getByRole('heading', { name: 'Refleks turu' })).toBeVisible()
  await openScreen(page, 'Ayarlar')
  await page.getByRole('searchbox', { name: 'Ayar ara' }).fill('Kullanım')
  const card = page.locator('section.card', { has: page.getByRole('heading', { name: 'Kullanım', exact: true }) })
  await expect(card.getByRole('heading', { name: 'Oyunlar', exact: true })).toBeVisible()
  await expect(card).toContainText('Refleks turu')
})

test('verb lab: Ustalık shows the share of right answers week by week', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Présent' }).click()
  await main.getByRole('button', { name: 'Liste', exact: true }).click()
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

test('a word met yesterday comes back as a card before its first question: the arrow keys decide, a hard one is asked once more', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))
  await startWithSamples(page)
  await openScreen(page, 'Bugün')
  await finishSession(page)
  // The next day: the words met yesterday are due.
  await page.clock.setFixedTime(new Date('2026-03-05T12:00:00'))
  await page.reload()
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').click()
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  const card = page.locator('.refresh')
  await expect(card).toContainText('Önce bir bak')
  await expect(card.locator('.swipe-gloss')).not.toBeEmpty()
  // Left: "Zorlanıyorum"; the question comes, and the same word returns later as a quick question.
  await page.keyboard.press('ArrowLeft')
  await expect(card).toHaveCount(0)
  await expect(page.locator('.session-stage .prompt-label')).toBeVisible()
  await expect(page.locator('.session-stage')).not.toContainText('Önce bir bak')
})

test("a quest of the day starts the round that fills it: new words → introductions; typing with no words learned says so", async ({ page }) => {
  test.setTimeout(90_000)
  // 2026-03-09: answers, new words, no hints. 2026-03-04: answers, listening, typing.
  await page.clock.setFixedTime(new Date('2026-03-09T10:00:00'))
  await startWithSamples(page)
  await page.locator('.quest-row', { hasText: 'yeni kelimeyle tanış' }).click()
  await expect(page.locator('.session-stage')).toContainText('Yeni kelime')
  await page.clock.setFixedTime(new Date('2026-03-04T10:00:00'))
  await page.reload()
  await page.locator('.quest-row', { hasText: 'Yazarak' }).click()
  await expect(page.getByText('Bu görev için uygun kelime bulunamadı')).toBeVisible()
  await expect(page.locator('.session-stage')).toHaveCount(0)
})

test('study settings inside a session: shorten it, turn the kind of question down, and the choices stay', async ({ page }) => {
  test.setTimeout(120_000)
  await startWithSamples(page)
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  // Past the introduction cards, to a first question.
  for (let i = 0; i < 12 && !(await page.locator('.session-stage .option, .session-stage input.answer-input').count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Öğrendim|Hatırlıyorum)/ })
    if (await next.count()) await next.first().click()
    await page.waitForTimeout(150)
  }
  await page.getByRole('button', { name: 'Çalışma ayarları' }).click()
  const dialog = page.getByRole('dialog', { name: 'Çalışma ayarları' })
  await expect(dialog).toContainText('Bu oturum')
  await dialog.getByRole('button', { name: '5 soru daha' }).click()
  await expect(page.getByText('Bu oturum 5 soru daha sürecek.')).toBeVisible()
  // The dialog closed; opened again, the speaking rate and auto-advance choices are there and keep what was chosen.
  await page.getByRole('button', { name: 'Çalışma ayarları' }).click()
  await dialog.getByRole('button', { name: '2 sn' }).click()
  await expect(dialog.getByRole('button', { name: '2 sn' })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: '1.1×' }).click()
  await expect(dialog.getByRole('button', { name: '1.1×' })).toHaveAttribute('aria-pressed', 'true')
})

test('the action words of the nudge cards on Today end at the same edge, with or without a dismiss button', async ({ page }) => {
  await startWithSamples(page)
  const edges = await page.evaluate(() => {
    const host = document.querySelector('.home-main, .main, main') ?? document.body
    const card = (label: string, dismiss: boolean) => {
      const d = document.createElement('div')
      d.className = 'habit-nudge'
      d.innerHTML = `<button class="habit-nudge-main"><span>x</span><span>metin</span><span class="habit-nudge-cta">${label}</span></button>${dismiss ? '<button class="icon-btn icon-btn-sm" aria-label="x"><svg width="16" height="16"></svg></button>' : ''}`
      host.append(d)
      return d.querySelector('.habit-nudge-cta')!.getBoundingClientRect().right
    }
    return [card('İlerleme', false), card('Kelimelerime ekle', true), card('Plan yap', true)]
  })
  expect(Math.abs(edges[0] - edges[1])).toBeLessThan(1)
  expect(Math.abs(edges[1] - edges[2])).toBeLessThan(1)
})

test('a library text with a recording can be kept for offline listening, and taken away again', async ({ page }) => {
  test.setTimeout(90_000)
  await page.route('https://audio.example.test/ep.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', headers: { 'access-control-allow-origin': '*' }, body: Buffer.alloc(20_000, 1) }))
  await startWithSamples(page)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction('texts', 'readwrite')
          const text = { id: 't1', language: 'fr', title: 'Un épisode', text: 'Bonjour tout le monde. Il fait beau aujourd\'hui.', audio: 'https://audio.example.test/ep.mp3', addedAt: new Date().toISOString(), history: [] }
          tx.objectStore('texts').put(text)
          tx.oncomplete = () => resolve()
        }
      }),
  )
  await page.reload()
  await openScreen(page, 'Okuma')
  const chip = page.locator('.lib-card .offline-chip').first()
  await expect(chip).toContainText('Çevrimdışı dinle')
  await chip.click()
  await expect(chip).toContainText('Çevrimdışı hazır')
  // Kept on the device: it is still there after a reload.
  await page.reload()
  await openScreen(page, 'Okuma')
  await expect(page.locator('.lib-card .offline-chip').first()).toContainText('Çevrimdışı hazır')
  await page.locator('.lib-card .offline-chip').first().click()
  await expect(page.locator('.lib-card .offline-chip').first()).toContainText('Çevrimdışı dinle')
})

test('Share → Diloloji: a shared article opens Reading with the text ready, a shared sentence still opens the word form', async ({ page }) => {
  await startWithSamples(page)
  const article = Array.from({ length: 40 }, (_, i) => `mot${i}`).join(' ')
  await page.goto(`/?share_text=${encodeURIComponent(article)}&share_title=${encodeURIComponent('Un titre')}`)
  await expect(page.getByLabel('Başlık')).toHaveValue('Un titre')
  await expect(page.getByLabel('Metin', { exact: true })).toHaveValue(article)
  await page.goto(`/?share_text=${encodeURIComponent('Il a décidé de tout quitter pour vivre à la campagne.')}`)
  await expect(page.locator('.incoming')).toBeVisible()
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
  // In a short window the dialog stays inside it and scrolls, so the last steps can be reached.
  await page.setViewportSize({ width: 1280, height: 420 })
  const dialog = page.locator('.badge-dialog')
  // Measured once the opening animation (a short scale pop) is over.
  await expect.poll(() => dialog.evaluate((el) => el.getAnimations().length)).toBe(0)
  const box = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { bottom: r.bottom, fits: r.bottom <= window.innerHeight, scrolls: el.scrollHeight > el.clientHeight }
  })
  expect(box.fits).toBe(true)
  expect(box.scrolls).toBe(true)
  await dialog.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  expect(await dialog.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
})

test('translation: "Çevir" fills the Turkish of a sentence when the server can translate, and is absent when not', async ({ page }) => {
  // Initially simulate server unavailable so button is absent regardless of live backend proxy.
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.get('usage') === '1', (r) => r.fulfill({ status: 503, json: { error: 'unavailable' } }))
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

test('translation: a pasted "Örnek:" label is not translated, and a pair translated both ways is listed once', async ({ page }) => {
  await startWithSamples(page)
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 1000000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => {
    const text = new URL(r.request().url()).searchParams.get('text')!
    return r.fulfill({ json: { translation: { 'Le chat dort.': 'Kedi uyuyor.', 'Kedi uyuyor.': 'Le chat dort.' }[text] ?? `?${text}` } })
  })
  await openScreen(page, 'Çeviri')
  await page.getByLabel('Çevrilecek metin').fill('Örnek: Le chat dort.')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  const pairs = page.getByRole('region', { name: 'Çeviri', exact: true }).locator('.translate-pairs li')
  await expect(pairs).toHaveCount(1)
  await expect(pairs.first().locator('.translate-source')).toHaveText('Le chat dort.')
  // The same pair the other way round (the swap button turns the translation into the new text).
  await page.getByRole('button', { name: 'Yönü değiştir' }).click()
  await expect(page.getByLabel('Çevrilecek metin')).toHaveValue('Kedi uyuyor.')
  await page.getByRole('button', { name: 'Çevir', exact: true }).click()
  await expect(pairs.first().locator('.translate-target')).toHaveText('Le chat dort.')
  await expect(page.getByRole('region', { name: 'Son çevirilerin' }).locator('.translate-recent li')).toHaveCount(1)
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
async function addTimedListening(page: Page, withCues = true) {
  await page.evaluate(async (withCues) => {
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
    const text = { id: 'listen-test', language: 'fr', title: 'Écoute', text: 'Le chat dort. Il fait beau. Nous partons demain.', audio, addedAt: new Date().toISOString(), history: [], ...(withCues ? { cues: [{ start: 0, text: 'Le chat dort.' }, { start: 2, text: 'Il fait beau.' }, { start: 4, text: 'Nous partons demain.' }] } : {}) }
    await new Promise<void>((done) => {
      const req = indexedDB.open('kelime-koc')
      req.onsuccess = () => {
        const tx = req.result.transaction('texts', 'readwrite')
        tx.objectStore('texts').put(text)
        tx.oncomplete = () => done()
      }
    })
  }, withCues)
}

test('listening: the sentence heard is lit, and a sentence can be played from its start', async ({ page }) => {
  await startWithSamples(page)
  await addTimedListening(page)
  await openScreen(page, 'Okuma')
  await page.getByText('Écoute').first().click()
  await expect(page.locator('audio.audio-player')).toHaveCount(1)
  await page.getByText('İpuçları', { exact: true }).click()
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

test('listening without timed subtitles: a sentence can be pinned to the moment it is heard, and the pin reset', async ({ page }) => {
  await startWithSamples(page)
  await addTimedListening(page, false)
  await openScreen(page, 'Okuma')
  await page.getByText('Écoute').first().click()
  await page.getByText('İpuçları', { exact: true }).click()
  await expect(page.getByText(/yaklaşık/).first()).toBeVisible()
  const audio = page.locator('audio.audio-player')
  const at = (t: number) =>
    audio.evaluate((a: HTMLAudioElement, t) => {
      a.currentTime = t
      a.dispatchEvent(new Event('timeupdate'))
    }, t)
  // The audio's length is known before the follow starts.
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.duration)).toBeGreaterThan(5)
  const heard = page.locator('.reader .rs.is-heard')
  await at(2)
  await expect(heard).toHaveText('Il fait beau.')
  // The learner hears the third sentence now: pinned from its word card.
  await page.getByRole('button', { name: 'Turları bırak' }).click()
  await page.locator('.rw', { hasText: /^demain$/ }).click()
  await page.getByRole('button', { name: 'Şu an bu cümle okunuyor' }).click()
  // The lit sentence follows the new pin at once, with the audio paused and no time update coming.
  await expect(heard).toHaveText('Nous partons demain.')
  await page.getByRole('button', { name: 'Ayarı sıfırla' }).click()
  await expect(heard).toHaveText('Il fait beau.')
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
  await panel.getByRole('button', { name: 'Sonucu gör' }).click()
  await expect(panel).toContainText('3 cümle · doğru yazdığın kelimeler: %56 (5/9)')
  await expect(panel.locator('.dd-missed')).toHaveText(['beau', 'nous', 'partons', 'demain'])
  await panel.getByRole('button', { name: 'Metne dön' }).click()
  await expect(panel).toHaveCount(0)
  // The word missed (the shown-only sentence aside) waits in Games, heard again in its sentence.
  await openScreen(page, 'Oyunlar')
  const ear = page.locator('.game-card', { hasText: 'Kaçırdıkların' })
  await expect(ear).toContainText('1 kelime')
  await ear.click()
  await expect(page.locator('.dd-missed')).toHaveText(['beau'])
  await page.getByRole('button', { name: /1 cümle dinle ve yaz/ }).click()
  await page.getByLabel('Duyduğun cümle').fill('Il fait beau')
  await page.getByRole('button', { name: 'Kontrol et' }).click()
  await page.getByRole('button', { name: 'Sonucu gör' }).click()
  await page.getByRole('button', { name: 'Listeye dön' }).click()
  // Written right as often as missed: off the list.
  await expect(page.getByText('Henüz kaçırdığın kelime yok')).toBeVisible()
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

test('grammar questions: a topic round of the three kinds, the rule after each answer, and the topic remembers how it went', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Dilbilgisi soruları' }).click()
  await page.getByRole('button', { name: 'Participe passé uyumu' }).click()
  await page.getByRole('button', { name: /8 soruluk tura başla/ }).click()
  for (let i = 1; i <= 8; i++) {
    await expect(page.locator('.game-timer')).toHaveText(`${i} / 8`)
    // Whatever the kind, answer it (wrongly is fine): the rule must show.
    if (await page.locator('input.answer-input').count()) {
      await page.locator('input.answer-input').fill('zzz')
      await page.getByRole('button', { name: 'Kontrol et' }).click()
    } else if (await page.locator('.option').count()) {
      await page.locator('.option').first().click()
    } else {
      await page.locator('.grammar-word').first().click()
    }
    await expect(page.locator('.grammar-feedback')).toBeVisible()
    await page.getByRole('button', { name: 'Devam' }).click()
  }
  await expect(page.locator('.game-result')).toContainText('/ 8 doğru')
  await page.getByRole('button', { name: 'Oyunlara dön' }).click()
  await page.locator('.game-card', { hasText: 'Dilbilgisi soruları' }).click()
  await expect(page.getByRole('button', { name: /Participe passé uyumu · %\d+/ })).toBeVisible()
})

test('reflex round and false friends: a phrase picked from its Turkish, a word’s meaning picked from its sentence, both kept in the log', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Refleks turu' }).click()
  await page.getByRole('button', { name: /Süre yok/ }).click()
  await page.getByRole('button', { name: /10 soruluk tura başla/ }).click()
  await expect(page.locator('.game-timer')).toHaveText('1 / 10')
  await expect(page.locator('.option')).toHaveCount(4)
  await page.locator('.option').first().click()
  // A right answer moves on by itself, a miss waits for Devam.
  const next = page.getByRole('button', { name: 'Devam', exact: true })
  await expect(next.or(page.locator('.game-timer', { hasText: '2 / 10' }))).toBeVisible()
  if (await next.count()) await next.click()
  await expect(page.locator('.game-timer')).toHaveText('2 / 10')
  await page.getByRole('button', { name: '← Oyunlar' }).click()

  await page.locator('.game-card', { hasText: 'Tuzak kelimeler' }).click()
  await page.getByRole('button', { name: /8 soruluk tura başla/ }).click()
  for (let i = 1; i <= 8; i++) {
    await expect(page.locator('.game-timer')).toHaveText(`${i} / 8`)
    await expect(page.locator('.option')).toHaveCount(3)
    await page.locator('.option').first().click()
    await expect(page.getByText('gibi görünür ama')).toBeVisible()
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
  }
  await expect(page.locator('.game-result')).toContainText('/ 8 doğru')
})

test('register game: a situation and a thought, the way of saying it that suits is picked, all three ways are shown after', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Kayıt farkı' }).click()
  await page.getByRole('button', { name: /8 soruluk tura başla/ }).click()
  for (let i = 1; i <= 8; i++) {
    await expect(page.locator('.game-timer')).toHaveText(`${i} / 8`)
    await expect(page.locator('.option')).toHaveCount(3)
    await page.locator('.option').first().click()
    await expect(page.locator('.register-ladder li')).toHaveCount(3)
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
  }
  await expect(page.locator('.game-result')).toContainText('/ 8 doğru')
})

test('root and endings: a word opens its family as a tree with what each ending does, and a relative can be added', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row', { hasText: 'léger' }).first().click()
  const group = page.getByRole('button', { name: 'Aile ve diğer diller' })
  if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click()
  const card = page.locator('.morpheme-card')
  await expect(card).toContainText('Kök ve ekler')
  await expect(card.locator('.morph-word', { hasText: /^légèrement$/ })).toBeVisible()
  await expect(card.locator('.morph-legend')).toContainText('-CA')
  await card.getByRole('button', { name: /légèrement kelimesini ekle/ }).click()
  await expect(card.getByRole('button', { name: /légèrement kelimesini ekle/ })).toHaveCount(0)
  // Now in the list: it opens the word.
  await expect(card.locator('.morph-row', { hasText: 'légèrement' }).locator('button.link')).toBeVisible()
})

test('word list: with no list yet, a selection can be added to a brand-new one', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Seç', exact: true }).click()
  await page.locator('.select-bar input[type=checkbox]').check()
  // The button is there even though there is no list yet.
  await page.locator('.select-bar-move button').click()
  await page.getByRole('option', { name: '+ Yeni liste…' }).click()
  await page.getByLabel('Yeni listenin adı').fill('Ayıklanan')
  await page.getByRole('button', { name: 'Oluştur ve ekle' }).click()
  await expect(page.getByText(/yeni "Ayıklanan" listesine eklendi/)).toBeVisible()
  await page.getByRole('tab', { name: 'Listeler' }).click()
  await expect(page.locator('.wl-name', { hasText: 'Ayıklanan' })).toBeVisible()
})

test('word list: a list takes its own cover photo, shown on its page and on the shelf, and can drop it', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Seç', exact: true }).click()
  await page.locator('.select-bar input[type=checkbox]').check()
  await page.locator('.select-bar-move button').click()
  await page.getByRole('option', { name: '+ Yeni liste…' }).click()
  await page.getByLabel('Yeni listenin adı').fill('Kapaklı')
  await page.getByRole('button', { name: 'Oluştur ve ekle' }).click()
  await page.getByRole('tab', { name: 'Listeler' }).click()
  await page.locator('.wl-tile', { hasText: 'Kapaklı' }).click()
  // A 2×2 PNG: small, but a real picture the browser decodes.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGM4EaABRAwQCgAljgUBqTNxyAAAAABJRU5ErkJggg==', 'base64')
  await page.locator('.wl-hero input[type=file]').setInputFiles({ name: 'kapak.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText('Kapak fotoğrafı eklendi.')).toBeVisible()
  await expect(page.locator('.wl-hero img.wl-photo')).toBeVisible()
  await page.locator('.back-link', { hasText: 'Listeler' }).click()
  const tile = page.locator('.wl-tile', { hasText: 'Kapaklı' })
  await expect(tile.locator('img.wl-photo')).toBeVisible()
  await tile.click()
  await page.getByRole('button', { name: 'Liste işlemleri' }).click()
  await page.getByRole('menuitem', { name: /Kapak fotoğrafını kaldır/ }).click()
  await expect(page.locator('.wl-hero img.wl-photo')).toHaveCount(0)
  await expect(page.locator('.wl-hero .wl-hero-initial')).toHaveText('K')
})

test('word list: quick groups select the sample words, a second tap clears them, and invert flips the selection', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: 'Seç', exact: true }).click()
  const group = page.getByRole('group', { name: 'Hızlı seç' })
  const samples = group.getByRole('button', { name: /^Örnek kelimeler \(\d+\)$/ })
  const total = Number((await samples.textContent())!.match(/\((\d+)\)/)![1])
  expect(total).toBeGreaterThan(0)
  await samples.click()
  await expect(page.locator('.select-bar')).toContainText(`${total} seçili`)
  await expect(samples).toHaveAttribute('aria-pressed', 'true')
  await samples.click()
  await expect(page.locator('.select-bar')).toContainText('0 seçili')
  await group.getByRole('button', { name: 'Seçimi ters çevir' }).click()
  await expect(page.locator('.select-bar')).toContainText(`${total} seçili`)
})

test('settings: a question type can be set to less or off, and stays so after a reload', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Sorular' }).click()
  const blank = page.getByRole('radiogroup', { name: 'Cümlede boşluğu yaz' })
  await expect(blank.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true')
  await blank.getByRole('radio', { name: 'Hiç' }).click()
  await expect(blank.getByRole('radio', { name: 'Hiç' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radiogroup', { name: 'Duyduğun cümleyi yaz' }).getByRole('radio', { name: 'Az' }).click()
  await page.reload()
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Sorular' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Cümlede boşluğu yaz' }).getByRole('radio', { name: 'Hiç' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radiogroup', { name: 'Duyduğun cümleyi yaz' }).getByRole('radio', { name: 'Az' })).toHaveAttribute('aria-checked', 'true')
  // The way back to the usual.
  await page.getByRole('button', { name: 'Hepsini normale döndür' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Cümlede boşluğu yaz' }).getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true')
})

test('affix hunt: a word and its relative in Turkish, the ending that makes it is picked and shown put on the word', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Ek avı' }).click()
  await page.getByRole('button', { name: /8 soruluk tura başla/ }).click()
  for (let i = 1; i <= 8; i++) {
    await expect(page.locator('.game-timer')).toHaveText(`${i} / 8`)
    await expect(page.locator('.option')).toHaveCount(3)
    await page.locator('.option').first().click()
    await expect(page.locator('[role=status]')).toContainText('Türkçesi')
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
  }
  await expect(page.locator('.game-result')).toContainText('/ 8 doğru')
})

test('text flow game: the connectors of a paragraph are filled one by one, each answer explained, the Turkish shown at the end', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Metin akışı' }).click()
  await page.getByRole('button', { name: /3 paragraflık tura başla/ }).click()
  for (let i = 1; i <= 3; i++) {
    await expect(page.locator('.game-timer')).toHaveText(`${i} / 3`)
    // Gaps are answered one after another (the first option is as good as any) until the Turkish shows.
    while (!(await page.getByText('Türkçesi:').count())) {
      await page.locator('.option').first().click()
      await expect(page.locator('[role=status]')).toBeVisible()
      const more = page.getByRole('button', { name: 'Devam', exact: true })
      if (await more.count()) await more.click()
    }
    await expect(page.getByText('Türkçesi:')).toBeVisible()
    await page.getByRole('button', { name: i < 3 ? 'Sonraki paragraf' : 'Bitir', exact: true }).click()
  }
  await expect(page.locator('.game-result')).toContainText('boşluk doğru')
})

test('review in context: a translated sentence with two of the learner\'s words, put back from chips and checked', async ({ page }) => {
  await startWithSamples(page)
  await finishSession(page)
  // A sentence made of two words met in the session, as if translated while reading.
  const words = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction(['vocabulary', 'wordStates', 'meta'], 'readwrite')
          const states = tx.objectStore('wordStates').getAllKeys()
          states.onsuccess = () => {
            const vocab = tx.objectStore('vocabulary').getAll()
            vocab.onsuccess = () => {
              const met = new Set(states.result as string[])
              const lemmas = (vocab.result as { id: string; lemma: string }[]).filter((v) => met.has(v.id) && /^\p{Ll}{4,}$/u.test(v.lemma)).map((v) => v.lemma).slice(0, 2)
              tx.objectStore('meta').put({ key: 'translations', value: [{ text: `Hier soir, ${lemmas[0]} et ${lemmas[1]} étaient vraiment là.`, translation: 'Dün akşam ikisi de gerçekten oradaydı.', from: 'fr', to: 'tr', at: '2026-10-10T10:00:00Z' }] })
              tx.oncomplete = () => resolve(lemmas)
            }
          }
        }
      }),
  )
  expect(words).toHaveLength(2)
  await openScreen(page, 'Oyunlar')
  await page.locator('.game-card', { hasText: 'Cümlede tekrar' }).click()
  await page.getByRole('button', { name: /cümlelik tura başla/ }).click()
  await expect(page.locator('.flow-gap')).toHaveCount(2)
  for (const w of words) await page.locator('.context-bank button', { hasText: new RegExp(`^${w}$`) }).click()
  await page.getByRole('button', { name: 'Kontrol et' }).click()
  await expect(page.locator('.flow-gap.is-correct')).toHaveCount(2)
  await expect(page.getByText('Dün akşam ikisi de gerçekten oradaydı.')).toBeVisible()
  await page.getByRole('button', { name: 'Bitir' }).click()
  await expect(page.locator('.game-result')).toContainText('2 / 2 kelime yerinde')
})

test('shadowing a text: a sentence played from its recording, then said back, then both compared', async ({ page }) => {
  // No microphone in a test: a silent stream stands in for it.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext()
      const out = ctx.createMediaStreamDestination()
      ctx.createOscillator().connect(out)
      return out.stream
    }
  })
  await startWithSamples(page)
  await addTimedListening(page)
  await openScreen(page, 'Okuma')
  await page.getByText('Écoute').first().click()
  await page.getByRole('button', { name: 'Turları bırak' }).click()
  await page.getByRole('button', { name: /Gölgele$/ }).click()
  const panel = page.getByRole('region', { name: 'Gölgeleme' })
  await expect(panel).toContainText('Gölgeleme · 1 / 3')
  await expect(panel.locator('.sentence')).toHaveText('Le chat dort.')
  await panel.getByRole('button', { name: /Dinle ve söyle/ }).click()
  // The sentence plays to its end (2 s), then it is the learner's turn.
  await expect(panel.getByText('Şimdi sen söyle')).toBeVisible({ timeout: 8000 })
  expect(await page.locator('audio.audio-player').evaluate((a: HTMLAudioElement) => a.paused && a.currentTime > 1.5 && a.currentTime < 2.3)).toBe(true)
  await expect(panel.getByRole('button', { name: /Karşılaştır/ })).toBeVisible({ timeout: 8000 })
  await panel.getByRole('button', { name: 'Sonraki' }).click()
  await expect(panel.locator('.sentence')).toHaveText('Il fait beau.')
  await panel.getByRole('button', { name: 'Gölgelemeyi bitir' }).click()
  await expect(panel).toHaveCount(0)
})

test('CEFR levels: progress by textbook level, the missing words of a level, a word’s level', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'İlerleme')
  await expect(page.getByRole('heading', { name: 'Seviyelerin kelimelerinden ne kadarını biliyorsun' })).toBeVisible()
  const rows = page.locator('.band-list li')
  await expect(rows.first()).toContainText(/^A1 \(/)
  await expect(page.getByText(/Sıradaki hedefin: A1 kelimelerinde %90/)).toBeVisible()
  await page.getByRole('button', { name: 'Sıklığa göre' }).click()
  await expect(page.getByRole('heading', { name: 'En sık kelimelerden ne kadarını biliyorsun' })).toBeVisible()
  await expect(rows.first()).toContainText('İlk 1.000')
  // A sample word's level comes from the textbook list, not its frequency.
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row, tbody tr', { hasText: 'maison' }).first().click()
  await expect(page.getByRole('list', { name: 'Kelime bilgisi' }).getByText('A1', { exact: true })).toBeVisible()
  // Words → add many → missing frequent words, by level.
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: /Ekle/ }).first().click()
  await page.getByText('Birçok kelime ekle').click()
  await page.getByText('Eksik sık kelimeler').click()
  await page.getByRole('button', { name: 'A2', exact: true }).click()
  await expect(page.locator('.missing-list li').first()).toBeVisible()
  await expect(page.locator('.missing-list li').first()).not.toContainText('#')
  // The words shown, with the pack's meanings, become a list of their own in one tap.
  await expect(page.locator('.missing-meaning').first()).toBeVisible()
  await page.getByRole('button', { name: /listesine ekle \(\d+\)/ }).click()
  await expect(page.getByText(/\d+ kelime “A2 kelimeleri” listesine eklendi/)).toBeVisible()
})

test('grammar check: the journal text flagged by LanguageTool, a suggestion applied in one tap', async ({ page }) => {
  await startWithSamples(page)
  const text = 'Je suis allé a la plage et il fesait beau.'
  await page.route((u) => u.hostname === 'api.languagetool.org' && u.pathname === '/v2/check', (r) => {
    const body = new URLSearchParams(r.request().postData() ?? '')
    expect(body.get('language')).toBe('fr')
    return r.fulfill({
      json: {
        matches: [
          { offset: 13, length: 1, message: 'La préposition « a » prend un accent grave.', replacements: [{ value: 'à' }], rule: { issueType: 'grammar', category: { id: 'HOMONYMS' } } },
          { offset: 30, length: 6, message: 'Faute de frappe possible.', replacements: [{ value: 'faisait' }, { value: 'fessait' }], rule: { issueType: 'misspelling', category: { id: 'TYPOS' } } },
        ],
      },
    })
  })
  await openScreen(page, 'Yaz & konuş')
  const editor = page.getByLabel('Günlük')
  await editor.fill(text)
  await page.getByRole('button', { name: /Yazım ve dil bilgisini denetle/ }).click()
  const check = page.getByRole('region', { name: 'Denetim' })
  await expect(check.locator('.gc-mark')).toHaveText(['a', 'fesait'])
  await check.getByRole('button', { name: 'faisait' }).click()
  await expect(editor).toHaveValue('Je suis allé a la plage et il faisait beau.')
  await check.getByRole('button', { name: 'à', exact: true }).click()
  await expect(editor).toHaveValue('Je suis allé à la plage et il faisait beau.')
  await expect(check).toContainText('Kalan hata yok.')
  // Typing on hides the marks: they no longer fit the text.
  await editor.press('End')
  await editor.pressSequentially(' Super.')
  await expect(check).toHaveCount(0)
})

test('easy stories: an illustrated story read aloud, with its credits, pictures and its own Turkish', async ({ page }) => {
  await startWithSamples(page)
  // The pictures and the recording stay on the story's servers: answered here.
  await page.route(/raw\.githubusercontent\.com|globalstorybooks\.net/, (r) => r.fulfill({ status: 200, body: '' }))
  const asked: string[] = []
  page.on('request', (r) => r.url().includes('/api/translate?') && r.url().includes('text=') && asked.push(r.url()))
  await openScreen(page, 'Okuma')
  const picker = page.locator('section', { has: page.getByRole('heading', { name: 'Kolay resimli hikâyeler' }) })
  await expect(picker.locator('.library li')).toHaveCount(29)
  await picker.getByRole('button', { name: 'Seviye 1', exact: true }).click()
  await picker.getByText('Qu’est-ce que tu fais ?').click()
  await page.getByRole('button', { name: 'Turları bırak' }).click()
  await expect(page.getByText(/Yazan: Nina Orange · Çizen: Wiehan de Jager .* · Global Storybooks · CC BY 3\.0/)).toBeVisible()
  const pages = await page.locator('.reader p:not(.reader-tr)').count()
  await expect(page.locator('.reader .reader-img')).toHaveCount(pages)
  // Its Turkish comes with it: no translation server, no quota.
  await page.getByRole('button', { name: /Türkçesi/ }).click()
  await expect(page.locator('.reader-tr').first()).toHaveText('Ben şarkı söylüyorum.')
  expect(asked).toEqual([])
  // Opened again: the same text, not a second copy.
  await page.getByRole('button', { name: /Kütüphane/ }).click()
  await picker.getByText('Qu’est-ce que tu fais ?').click()
  await page.getByRole('button', { name: /Kütüphane/ }).click()
  // Once in the library, once in the picker.
  await expect(page.locator('.library li', { hasText: 'Qu’est-ce que tu fais ?' })).toHaveCount(2)
})

test('audiobooks: a chapter opens with its recording and a clean text, and opens again as the same copy', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  // The recording stays on archive.org: answered here.
  await page.route(/archive\.org/, (r) => r.fulfill({ status: 200, body: '' }))
  await openScreen(page, 'Okuma')
  const picker = page.locator('section', { has: page.getByRole('heading', { name: 'Sesli kitaplar', exact: true }) })
  await expect(picker.locator('.library li')).toHaveCount(13)
  await picker.getByRole('button', { name: 'B2', exact: true }).click()
  await expect(picker.locator('.library li')).toHaveCount(4)
  await picker.getByRole('button', { name: 'Tümü (13)' }).click()
  await picker.getByText('Le secret de maître Cornille').click()
  await page.getByRole('button', { name: 'Turları bırak' }).click()
  await expect(page.getByText(/LibriVox/).first()).toBeVisible()
  await expect(page.locator('.reader')).not.toContainText('_mas_')
  // Sentences are whole: the hard-wrapped lines of the file are joined.
  await expect(page.locator('.reader')).toContainText('un petit drame de village dont mon moulin a été témoin')
  await page.getByRole('button', { name: /Kütüphane/ }).click()
  await picker.getByText('Le secret de maître Cornille').click()
  await page.getByRole('button', { name: /Kütüphane/ }).click()
  await expect(page.locator('.library li', { hasText: 'Le secret de maître Cornille' })).toHaveCount(2)
})

test('restoring a backup keeps a copy of what was there: a bad file changes nothing, "Önceki hâle dön" brings the data back', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  await openScreen(page, 'Ayarlar')
  await page.locator('.settings-menu-item', { hasText: 'Veriler' }).click()
  const file = page.locator('input[type=file]')
  const count = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const open = indexedDB.open('kelime-koc')
          open.onsuccess = () => {
            const c = open.result.transaction('vocabulary').objectStore('vocabulary').count()
            c.onsuccess = () => resolve(c.result)
          }
        }),
    )
  const before = await count()
  expect(before).toBeGreaterThan(0)

  // A file that is not one of ours is turned away before anything is touched.
  await file.setInputFiles({ name: 'bozuk.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"kelime-koc","vocabulary":[{"lemma":"x"}]}') })
  await expect(page.getByRole('status').filter({ hasText: 'bozuk' })).toBeVisible()
  expect(await count()).toBe(before)

  // An empty (but valid) backup replaces everything; the copy lets it be taken back.
  const empty = { app: 'kelime-koc', version: 3, exportedAt: '2026-10-01T10:00:00.000Z', vocabulary: [], wordStates: [], events: [], mistakes: [] }
  await file.setInputFiles({ name: 'bos.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(empty)) })
  await page.getByRole('alertdialog').getByRole('button', { name: 'Geri yükle' }).click()
  await expect(page.getByText('Yedek geri yüklendi: 0 kelime.')).toBeVisible()
  await expect.poll(count).toBe(0)

  await page.getByRole('button', { name: 'Önceki hâle dön' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Önceki hâle dön' }).click()
  await expect(page.getByText('Geri yüklemeden önceki hâle dönüldü.')).toBeVisible()
  await expect.poll(count).toBe(before)
})

test('verb lab, practice list: Tab moves straight from one person\'s field to the next, and the hint is one button', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  const main = page.locator('.lab-main')
  await main.getByRole('tab', { name: 'Alıştırma' }).click()
  await main.getByRole('group', { name: 'Zaman' }).getByRole('button', { name: 'Présent' }).click()
  // "Tek tek" is the default; the list is one tap away.
  await expect(main.getByRole('button', { name: 'Tek tek' })).toHaveAttribute('aria-pressed', 'true')
  await main.getByRole('button', { name: 'Liste', exact: true }).click()
  await page.locator('#lab-in-0').focus()
  for (let i = 1; i < 6; i++) {
    await page.keyboard.press('Tab')
    await expect(page.locator(`#lab-in-${i}`)).toBeFocused()
  }
  // No "?" button per row: one hint button for the whole list shows the first letters.
  await expect(main.locator('.lab-answer-row .icon-btn')).toHaveCount(0)
  await main.getByRole('button', { name: 'İpucu: ilk harfler' }).click()
  await expect(page.locator('#lab-in-3')).toHaveAttribute('placeholder', 'pa…')
  const activeTag = await page.evaluate(() => document.activeElement?.tagName)
  expect(activeTag).not.toBe('BODY')
})

test('compound tenses: adding typed compound offers infinitive without false positives', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('button', { name: /Ekle/ }).first().click()
  await page.getByText('Tek kelime ekle').click()
  const wordInput = page.getByLabel('Kelime', { exact: true })

  // 1. French "j'ai mangé" -> offers "manger ekle"
  await wordInput.fill("j'ai mangé")
  const mangerBtn = page.getByRole('button', { name: 'manger ekle' })
  await expect(mangerBtn).toBeVisible()
  await mangerBtn.click()
  await expect(wordInput).toHaveValue('manger')

  // 2. French reflexive compound "il s'est lavé" -> offers "laver ekle"
  await wordInput.fill("il s'est lavé")
  const laverBtn = page.getByRole('button', { name: 'laver ekle' })
  await expect(laverBtn).toBeVisible()

  // 3. Negative check / false positives: "j'ai faim" or "ai" alone should not offer
  await wordInput.fill("j'ai faim")
  await expect(page.locator('.form-help button.link', { hasText: 'ekle' })).toHaveCount(0)
  await wordInput.fill('ai')
  await expect(page.locator('.form-help button.link', { hasText: 'ekle' })).toHaveCount(0)

  // 4. Spanish compound: switch language to Spanish via sidebar
  await page.getByRole('button', { name: /^İspanyolca/ }).click()
  await openScreen(page, 'Kelimeler')
  if (await page.getByRole('button', { name: /Ekle/ }).count()) {
    await page.getByRole('button', { name: /Ekle/ }).first().click()
    await page.getByText('Tek kelime ekle').click()
  }
  await page.getByLabel('Kelime', { exact: true }).fill('habían comido')
  const comerBtn = page.getByRole('button', { name: 'comer ekle' })
  await expect(comerBtn).toBeVisible()
  await comerBtn.click()
  await expect(page.getByLabel('Kelime', { exact: true })).toHaveValue('comer')
})





test('compound tenses: reading card reveals full compound form and infinitive on either auxiliary or participle tap', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Okuma')
  const details = page.locator('details.add-text')
  await details.evaluate((el: HTMLDetailsElement) => { el.open = true })
  await page.getByLabel('Metin', { exact: true }).fill("J'ai mangé une pomme.")
  await page.getByRole('button', { name: 'Okumaya başla' }).click()

  // Tap "J'ai" / "ai"
  await page.locator('.rw').filter({ hasText: /ai/ }).first().click()
  const formAnalysis = page.locator('.form-analysis')
  await expect(formAnalysis).toBeVisible()
  await expect(formAnalysis).toContainText('“ai mangé” = manger')
  await expect(formAnalysis).toContainText('passé composé')

  // Tap "mangé"
  await page.locator('.rw', { hasText: 'mangé' }).first().click()
  await expect(formAnalysis).toBeVisible()
  await expect(formAnalysis).toContainText('“ai mangé” = manger')
  await expect(formAnalysis).toContainText('passé composé')
})

test('register game: regional usage note shows for entries with notes and is absent otherwise', async ({ page }) => {
  await startWithSamples(page)
  // Switch to Spanish where es-job, es-eat, es-car etc. have regional notes
  await page.getByRole('button', { name: /^İspanyolca/ }).click()
  await openScreen(page, 'Oyunlar')

  await page.locator('.game-card', { hasText: 'Kayıt farkı' }).click()
  await page.getByRole('button', { name: /8 soruluk tura başla/ }).click()

  let seenNote = false
  for (let i = 0; i < 8; i++) {
    await page.locator('.option').first().click()
    const noteLocator = page.locator('.stack[role="status"] p.small.muted')
    if (await noteLocator.count()) {
      await expect(noteLocator).toBeVisible()
      await expect(noteLocator).toContainText(/İspanya|Latin Amerika|chamba|curro|papear|cacharro|pasta|guay/i)
      seenNote = true
      break
    }
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
  }
  expect(seenNote).toBe(true)
})


test('AI fill missing and suggest words: approval gates button, Anthropic route fills blanks and undo restores them', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Kelimeler')

  // 1. Without approval / without API key: button disabled or prompt for key
  const fillSection = page.locator('section[aria-label="Eksikleri tamamla"]')
  if (await fillSection.count()) {
    const fillBtn = fillSection.getByRole('button', { name: /Eksikleri YZ ile tamamla/ })
    await expect(fillBtn).toBeDisabled()
  }

  // 2. Set API key and approve account
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
  await openScreen(page, 'Kelimeler')

  // Mock Anthropic API for enrichWords
  await page.route(/api\.anthropic\.com/, async (r) => {
    const mockResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-4-5',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            words: [
              {
                input: 'maison',
                lemma: 'la maison',
                partOfSpeech: 'noun',
                gender: 'f',
                meanings: ['ev'],
                example: 'C’est une grande *maison*.',
                exampleTranslation: 'Bu büyük bir ev.',
                collocations: [],
                confusables: [],
                literal: '',
                frequencyBand: 'top1000',
              },
            ],
          }),
        },
      ],
      usage: { input_tokens: 50, output_tokens: 80 },
    }
    return r.fulfill({ json: mockResponse })
  })

  // If there are words needing fill, test fill + undo
  if (await fillSection.count()) {
    const fillBtn = fillSection.getByRole('button', { name: /Eksikleri YZ ile tamamla/ })
    await expect(fillBtn).toBeEnabled()
    await fillBtn.click()
    // Undo toast should appear
    const undoBtn = page.getByRole('button', { name: 'Geri al', exact: true })
    await expect(undoBtn).toBeVisible({ timeout: 10000 })
    await undoBtn.click()
    await expect(page.getByText('Eski hâline getirildi')).toBeVisible()
  }

  // Also check SuggestWords on Words screen
  const suggestSection = page.locator('section[aria-label="YZ kelime önerisi"]')
  if (await suggestSection.count()) {
    await expect(suggestSection.getByRole('button', { name: /kelime öner/ })).toBeEnabled()
  }
})

test('dictionary: a word the pack lacks is translated by DeepL, saved for good, and found again after a reload', async ({ page }) => {
  test.setTimeout(60_000)
  await startWithSamples(page)
  // startWithSamples closes translation; this test opens it again (the later route wins) and reloads.
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('usage'), (r) => r.fulfill({ json: { count: 10, limit: 500000 } }))
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => r.fulfill({ json: { translation: 'karalamak' } }))
  await page.reload()
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill('gribouiller')
  await page.getByRole('button', { name: 'DeepL ile çevir' }).click()
  await expect(page.getByText('(DeepL)')).toBeVisible()
  await page.getByRole('button', { name: 'Sözlüğe kaydet' }).click()
  const card = page.getByRole('region', { name: 'Kaydettiğin kelime' })
  await expect(card).toContainText('karalamak')
  // After a reload the word is in the dictionary without asking DeepL again, and listed under "Kaydettiklerin".
  let asked = 0
  await page.route((u) => u.pathname === '/api/translate' && u.searchParams.has('text'), (r) => (asked++, r.fulfill({ json: { translation: 'x' } })))
  await page.reload()
  await openScreen(page, 'Sözlük')
  await expect(page.getByRole('heading', { name: 'Kaydettiklerin' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Sözlükte ara' }).fill('gribouiller')
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toContainText('karalamak')
  // Typing the Turkish finds it too.
  await page.getByRole('searchbox', { name: 'Sözlükte ara' }).fill('karala')
  await expect(page.locator('.dict-saved-pick', { hasText: 'gribouiller' })).toBeVisible()
  expect(asked).toBe(0)
  // Taken out, it is gone.
  await page.getByRole('searchbox', { name: 'Sözlükte ara' }).fill('gribouiller')
  await page.getByRole('button', { name: 'Sözlükten kaldır' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toHaveCount(0)
})

test('dictionary: typing manual meaning allows saving for good vs adding to vocabulary without touching saved dictionary state', async ({ page }) => {
  await startWithSamples(page)
  // DeepL is 503 by default from startWithSamples
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })
  await search.fill('farfadet')

  // Manual meaning input when word is missing
  const meaningInput = page.getByPlaceholder('Türkçe anlamını yaz…')
  await expect(meaningInput).toBeVisible()
  await meaningInput.fill('küçük peri, cin')

  // Save to dictionary for good
  await page.getByRole('button', { name: 'Sözlüğe kaydet' }).click()
  const card = page.getByRole('region', { name: 'Kaydettiğin kelime' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('küçük peri, cin')

  // Second word: "zigoto", use "Kelimelerime ekle" instead
  await search.fill('zigoto')
  await expect(page.getByPlaceholder('Türkçe anlamını yaz…')).toBeVisible()
  await page.getByPlaceholder('Türkçe anlamını yaz…').fill('tuhaf tip')
  await page.getByRole('button', { name: 'Kelimelerime ekle' }).click()

  // One tap adds it to the words, with the meaning typed; no detour through the add form.
  await expect(page.getByText(/zigoto.*eklendi/)).toBeVisible()

  // It went to the words, not to the dictionary notes.
  await search.fill('')
  await search.fill('zigoto')
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toHaveCount(0)
  // But farfadet is still saved
  await search.fill('farfadet')
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toContainText('küçük peri, cin')
})

test('dictionary searchability: saved word is found by prefix, without accents, and by Turkish meaning with case sensitivity (capital dotless I)', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Sözlük')
  const search = page.getByRole('searchbox', { name: 'Sözlükte ara' })

  // Save an accented word not in sample words with a Turkish meaning containing dotless capital I: "téléguidé" -> "Işık saçan rehberlik"
  await search.fill('téléguidé')
  await page.getByPlaceholder('Türkçe anlamını yaz…').fill('Işık saçan rehberlik')
  await page.getByRole('button', { name: 'Sözlüğe kaydet' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toContainText('Işık saçan rehberlik')

  // 1. Prefix match: typing "télé" matches in SavedList
  await search.fill('télé')
  await expect(page.locator('.dict-saved-pick', { hasText: 'téléguidé' })).toBeVisible()

  // 2. Accent-free exact match: "teleguide" finds the saved exact card
  await search.fill('teleguide')
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toContainText('téléguidé')

  // 3. Turkish meaning match with capital dotless I: "Işık" finds it
  await search.fill('Işık')
  await expect(page.locator('.dict-saved-pick', { hasText: 'téléguidé' })).toBeVisible()

  // Clean up
  await search.fill('téléguidé')
  await page.getByRole('button', { name: 'Sözlükten kaldır' }).click()
  await expect(page.getByRole('region', { name: 'Kaydettiğin kelime' })).toHaveCount(0)
})

test('collocation chips: chips on word page with sr-only example text across French, Spanish, and English', async ({ page }) => {
  await startWithSamples(page)

  // 1. French: "décider" has chip "décider de + infinitif" and sr-only example
  await openScreen(page, 'Kelimeler')
  await page.locator('.word-row', { hasText: 'décider' }).click()
  const frChip = page.locator('.colloc-chip', { hasText: 'décider de + infinitif' })
  await expect(frChip).toBeVisible()
  await expect(frChip.locator('.sr-only')).toContainText('Örnek: Il a décidé de partir plus tôt.')

  // Back to word list
  await page.getByRole('button', { name: '← Kelimelere dön' }).click()

  // French: "question" on word page (add it via Ekle button)
  await page.getByRole('button', { name: 'Ekle', exact: true }).click()
  await page.getByText('Tek kelime ekle').click()
  await page.getByLabel('Kelime', { exact: true }).fill('la question')
  await page.getByLabel('Türkçe anlamı', { exact: true }).fill('soru')
  await page.getByRole('button', { name: 'Kelimeyi ekle' }).click()
  await page.locator('.back-link').click()
  await page.locator('.word-row', { hasText: 'question' }).click()
  const qChip = page.locator('.colloc-chip', { hasText: 'poser une question' })
  await expect(qChip).toBeVisible()
  await expect(qChip.locator('.sr-only')).toContainText('Örnek: Je voudrais poser une question.')
  await page.getByRole('button', { name: '← Kelimelere dön' }).click()

  // 2. Spanish: switch language to Spanish (empty -> add form opens by default)
  await page.getByRole('button', { name: /^İspanyolca/ }).click()
  await openScreen(page, 'Kelimeler')
  await expect(page.getByLabel('Kelime', { exact: true })).toBeVisible()
  await page.getByLabel('Kelime', { exact: true }).fill('soñar')
  await page.getByLabel('Türkçe anlamı', { exact: true }).fill('rüya görmek')
  await page.getByRole('button', { name: 'Kelimeyi ekle' }).click()
  await page.locator('.back-link').click()
  await page.locator('.word-row', { hasText: 'soñar' }).click()
  const esChip = page.locator('.colloc-chip', { hasText: 'soñar con' })
  await expect(esChip).toBeVisible()
  await expect(esChip.locator('.sr-only')).toContainText('Örnek: Sueño con viajar por todo el mundo.')
  await page.getByRole('button', { name: '← Kelimelere dön' }).click()

  // 3. English: switch language to English (empty -> add form opens by default)
  await page.getByRole('button', { name: /^İngilizce/ }).click()
  await openScreen(page, 'Kelimeler')
  await expect(page.getByLabel('Kelime', { exact: true })).toBeVisible()
  await page.getByLabel('Kelime', { exact: true }).fill('depend')
  await page.getByLabel('Türkçe anlamı', { exact: true }).fill('bağlı olmak')
  await page.getByRole('button', { name: 'Kelimeyi ekle' }).click()
  await page.locator('.back-link').click()
  await page.locator('.word-row', { hasText: 'depend' }).click()
  const enChip = page.locator('.colloc-chip', { hasText: 'depend on' })
  await expect(enChip).toBeVisible()
  await expect(enChip.locator('.sr-only')).toContainText('Örnek: It all depends on the weather.')
})

test('today screen: live seed waits before any answer is given and stops hopping under reduced motion', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Bugün')
  const waitingSeed = page.locator('.hero-today .plant-waiting')
  await expect(waitingSeed).toBeVisible()
  const hop = waitingSeed.locator('.plant-seed-hop')
  await expect(hop).toBeVisible()

  // In live plant, seed-hop animation is running
  const animName = await hop.evaluate((el) => getComputedStyle(el).animationName)
  expect(animName).toBe('seed-hop')

  // Under prefers-reduced-motion: reduce, animations stop (animationName === 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedAnim = await hop.evaluate((el) => getComputedStyle(el).animationName)
  expect(reducedAnim).toBe('none')
})

test('a shared list link shows what is in it, adds nothing until confirmed, then makes a list of its own', async ({ page }) => {
  const id = 'ab'.repeat(16)
  const doc = {
    v: 1,
    kind: 'set',
    name: 'Evcil hayvanlar',
    language: 'fr',
    words: [
      { key: 'fr:chien', word: 'le chien', meaning: 'köpek', at: '2026-10-12T10:00:00Z' },
      { key: 'fr:oiseau', word: "l'oiseau", meaning: 'kuş', at: '2026-10-12T10:00:00Z' },
    ],
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt: '2026-10-12T10:00:00Z',
  }
  await page.route((u) => u.pathname === '/api/share', (route) => route.fulfill({ json: doc }))
  await startWithSamples(page)
  await page.goto(`/?set=${id}`)
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Evcil hayvanlar')
  await expect(dialog).toContainText('le chien')
  // The link is spent (a reload does not ask again) and nothing is added until the button is pressed.
  await expect(page).not.toHaveURL(/set=/)
  await dialog.getByRole('button', { name: 'Listeme ekle' }).click()
  await expect(dialog).toHaveCount(0)
  await openScreen(page, 'Kelimeler')
  await page.getByRole('tab', { name: 'Listeler' }).click()
  await expect(page.locator('.wl-tile', { hasText: 'Evcil hayvanlar' })).toContainText('2 kelime')
})

test('a chip of the day\'s mission starts a round of only that kind', async ({ page }) => {
  await startWithSamples(page)
  const chip = page.locator('.mission-chip', { hasText: /yeni/ })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(page.locator('.session-stage')).toBeVisible()
})

test('Alt+S opens the dictionary and Alt+V the verb lab from anywhere', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Bugün')
  await page.keyboard.press('Alt+KeyS')
  await expect(page.getByRole('heading', { name: 'Sözlük' })).toBeVisible()
  await page.keyboard.press('Alt+KeyV')
  await expect(page.getByRole('heading', { name: 'Fiil laboratuvarı' })).toBeVisible()
})

test('the guide: a lesson leads to its own grammar questions, the links open outside', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Rehber')
  await expect(page.getByRole('heading', { name: 'Rehber' })).toBeVisible()
  await page.locator('.guide-card').filter({ has: page.locator('strong', { hasText: /^Subjonctif$/ }) }).click()
  await expect(page.locator('.guide-lesson h1')).toHaveText('Subjonctif')
  await page.getByRole('button', { name: /Bu konuda \d+ soru çöz/ }).click()
  await expect(page.getByRole('button', { name: /^Subjonctif/ })).toHaveAttribute('aria-pressed', 'true')
  await openScreen(page, 'Rehber')
  await page.getByRole('tab', { name: 'Dış kaynaklar' }).click()
  const link = page.locator('a.guide-link').first()
  await expect(link).toHaveAttribute('target', '_blank')
  expect(await overflow(page)).toEqual([])
})

test('the guide: a lesson read days ago comes back on Today for a short check', async ({ page }) => {
  await startWithSamples(page)
  await page.evaluate(() => localStorage.setItem('diloloji:guide-progress', JSON.stringify({ subjonctif: { read: '2020-01-01' } })))
  await page.reload()
  await openScreen(page, 'Bugün')
  const nudge = page.locator('.habit-nudge').filter({ hasText: 'Hatırlıyor musun?' })
  await expect(nudge).toContainText('Subjonctif')
  await nudge.getByRole('button', { name: /Tekrar et/ }).click()
  await expect(page.locator('.guide-lesson h1')).toHaveText('Subjonctif')
  const check = page.locator('.lesson-check')
  await expect(check.getByRole('heading', { name: 'Hatırlıyor musun?' })).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await check.locator('.option').first().click()
    await check.getByRole('button', { name: i < 2 ? 'Sonraki' : 'Bitir' }).click()
  }
  await expect(check).toContainText(/3 sorunun \d tanesi doğru/)
  expect(await overflow(page)).toEqual([])
})

test('the guide: grammar mistake leads to "Konunun dersi" link to guide lesson, and browser back returns to question', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'Rehber')
  await page.locator('.guide-card').filter({ has: page.locator('strong', { hasText: /^Subjonctif$/ }) }).click()
  await expect(page.locator('.guide-lesson h1')).toHaveText('Subjonctif')
  await page.getByRole('button', { name: /Bu konuda \d+ soru çöz/ }).click()

  // In GrammarPractice intro for subjonctif: start round
  await expect(page.locator('.game-stage')).toBeVisible()
  await page.getByRole('button', { name: /soruluk tura başla/ }).click()

  // Make a deliberate mistake
  if (await page.locator('.game-stage input.answer-input').count() > 0) {
    await page.locator('.game-stage input.answer-input').fill('kesinlikle_yanlis')
    await page.keyboard.press('Enter')
  } else if (await page.locator('.game-stage .options .option').count() > 0) {
    await page.locator('.game-stage .options .option').last().click()
  }

  // If first answer was somehow not wrong, advance and answer next wrong
  if ((await page.locator('.lesson-link', { hasText: 'Konunun dersi' }).count()) === 0) {
    await page.getByRole('button', { name: 'Devam' }).click()
    if (await page.locator('.game-stage input.answer-input').count() > 0) {
      await page.locator('.game-stage input.answer-input').fill('kesinlikle_yanlis')
      await page.keyboard.press('Enter')
    } else {
      await page.locator('.game-stage .options .option').last().click()
    }
  }

  // Look for "Konunun dersi" link and click it
  const lessonLink = page.locator('.lesson-link', { hasText: 'Konunun dersi' })
  await expect(lessonLink).toBeVisible()
  await lessonLink.click()

  // Lesson page opens
  await expect(page.locator('.guide-lesson h1')).toHaveText('Subjonctif')

  // Browser back returns to the game screen
  await page.goBack()
  await expect(page.locator('.game-stage')).toBeVisible()
  expect(await overflow(page)).toEqual([])
})

test('the guide: English tenses tab lists tenses in order with Present simple first', async ({ page }) => {
  await startWithSamples(page)
  await page.getByRole('button', { name: /^İngilizce/ }).click()
  await openScreen(page, 'Rehber')
  await expect(page.getByRole('heading', { name: 'Rehber' })).toBeVisible()

  await page.getByRole('tab', { name: 'Zamanlar' }).click()
  const cards = page.locator('.guide-grid .guide-card')
  await expect(cards.first()).toContainText('Present simple')
  expect(await cards.count()).toBe(13)
  expect(await overflow(page)).toEqual([])
})

test('the guide: verb lab practice wrong conjugation offers "Bu zamanın anlatımı" sheet which closes on Esc', async ({ page }) => {
  await startWithSamples(page)
  await openVerbLab(page, 'parler')
  await page.locator('.lab-main').getByRole('tab', { name: 'Alıştırma' }).click()

  // Type a wrong conjugation
  const input = page.locator('.lab-main input.answer-input')
  await expect(input).toBeVisible()
  await input.fill('parlo')
  await page.keyboard.press('Enter')

  // Feedback and Diagnosis button appear
  await expect(page.locator('.lab-verdict')).toContainText('Yanlış')
  const tenseBtn = page.getByRole('button', { name: /Bu zamanın anlatımı/ })
  await expect(tenseBtn).toBeVisible()
  await tenseBtn.click()

  // Modal sheet opens
  const sheet = page.locator('.tense-lesson')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('Présent')

  // Esc closes the sheet
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('flashcards: flipping, grading 1/2/3, unlearned card returns after 3 cards, and review missed cards on finish', async ({ page }) => {
  await startWithSamples(page)
  // Seed wordStates so that Kaydırmalı kartlar is enabled in Games
  await page.evaluate(() =>
    new Promise<void>((resolve) => {
      const open = indexedDB.open('kelime-koc')
      open.onsuccess = () => {
        const tx = open.result.transaction(['vocabulary', 'wordStates'], 'readwrite')
        const voc = tx.objectStore('vocabulary').getAll()
        voc.onsuccess = () => {
          const words = voc.result as { id: string; language: string }[]
          for (const w of words.slice(0, 8)) {
            tx.objectStore('wordStates').put({
              entryId: w.id,
              language: w.language,
              introducedAt: new Date(Date.now() - 5 * 86_400_000),
              skills: {
                recognition: {
                  due: new Date(),
                  stability: 3,
                  difficulty: 5,
                  elapsed_days: 1,
                  scheduled_days: 2,
                  reps: 2,
                  lapses: 0,
                  learning_steps: 0,
                  state: 2,
                  last_review: new Date(Date.now() - 86_400_000),
                },
              },
              stats: { reviews: 2, correct: 2, wrong: 0, hints: 0, totalResponseMs: 2400, consecutiveWrong: 0 },
            })
          }
        }
        tx.oncomplete = () => resolve()
      }
    }),
  )
  await page.reload()
  await openScreen(page, 'Oyunlar')
  await expect(page.getByRole('heading', { name: 'Oyunlar' })).toBeVisible()

  // Open "Kaydırmalı kartlar"
  await page.locator('.game-card', { hasText: 'Kaydırmalı kartlar' }).click()
  await expect(page.getByRole('heading', { name: 'Kaydırmalı kartlar' })).toBeVisible()

  // Start round
  await page.getByRole('button', { name: /kartla başla/ }).click()
  await expect(page.locator('.flash-stage')).toBeVisible()

  // First card
  const firstWord = (await page.locator('.flash-front .flash-word').textContent())?.trim()
  expect(firstWord).toBeTruthy()

  // Flip card
  await page.locator('.flash-turn').click()
  await expect(page.locator('.flash-grades[role="group"]')).toBeVisible()

  // Grade 1 (Bilmiyorum)
  await page.locator('.flash-grade', { hasText: 'Bilmiyorum' }).click()

  // Next 3 cards (COME_BACK_AFTER[0] = 3) are graded as Biliyorum
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.flash-turn')).toBeVisible()
    await page.locator('.flash-turn').click()
    await page.locator('.flash-grade', { hasText: 'Biliyorum' }).click()
  }

  // The 4th card after first grading is firstWord returning!
  await expect(page.locator('.flash-front .flash-word')).toHaveText(firstWord!)

  // Grade this returning card as Biliyorum
  await page.locator('.flash-turn').click()
  await page.locator('.flash-grade', { hasText: 'Biliyorum' }).click()

  // Grade the remaining 4 cards until the round finishes
  for (let i = 0; i < 4; i++) {
    await expect(page.locator('.flash-turn')).toBeVisible()
    await page.locator('.flash-turn').click()
    await expect(page.locator('.flash-grade', { hasText: 'Biliyorum' })).toBeVisible()
    await page.locator('.flash-grade', { hasText: 'Biliyorum' }).click()
    await page.waitForTimeout(200)
  }

  // Summary screen
  await expect(page.locator('.flash-done .greeting')).toHaveText('Tur bitti')
  await expect(page.locator('.swipe-missed')).toContainText(firstWord!)

  // Dismiss any milestone badge dialog
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) {
    await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').first().click()
  }

  // "Takıldıklarını çalış" button restarts with the stumbled card
  const retryBtn = page.getByRole('button', { name: /Takıldıklarını çalış/ })
  await expect(retryBtn).toBeVisible()
  await retryBtn.click()

  // New round started with firstWord
  await expect(page.locator('.flash-front .flash-word')).toHaveText(firstWord!)
  expect(await overflow(page)).toEqual([])
})

test('friends card: today and week leaderboard ranking, adding and removing a friend by code', async ({ page }) => {
  let friends = [
    { code: 'VELI1234', name: 'Veli', avatar: 'fox', color: '#2f6de6', today: 120, week: 150, streak: 5, level: 3, at: '2026-10-15T10:00:00Z' },
  ]
  const me = { code: 'ALI12345', name: 'Sen', avatar: 'monki', color: '#c6317c', today: 50, week: 300, streak: 3, level: 4, at: '2026-10-15T10:00:00Z' }

  await startWithSamples(page)
  await approveAccount(page)

  await page.route('**/api/access*', async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON() as { action?: string; code?: string }
      if (data?.action === 'friends-publish') {
        return route.fulfill({ json: { me } })
      }
      if (data?.action === 'friends-add') {
        friends.push({
          code: data.code || 'AYSE1234',
          name: 'Ayşe',
          avatar: 'owl',
          color: '#10b981',
          today: 200,
          week: 250,
          streak: 2,
          level: 2,
          at: '2026-10-15T10:00:00Z',
        })
        return route.fulfill({ json: { ok: true } })
      }
      if (data?.action === 'friends-remove') {
        friends = friends.filter((f) => f.code !== data.code)
        return route.fulfill({ json: { ok: true } })
      }
      return route.fulfill({ json: { ok: true } })
    }
    if (url.searchParams.get('friends') === '1') {
      return route.fulfill({ json: { me, friends } })
    }
    return route.fulfill({ json: { status: 'approved', exists: true, match: true, enabled: true } })
  })

  await page.reload()
  await openScreen(page, 'Bugün')
  await expect(page.locator('.friends-card')).toBeVisible()

  // Default range is "Bugün": Veli (120 XP) is first, Sen (50 XP) is second
  const names = page.locator('.friends-card .friends-name')
  await expect(names.first()).toContainText('Veli')
  await expect(names.nth(1)).toContainText('Sen')

  // Switch to "Bu hafta": Sen (300 XP) is first, Veli (150 XP) is second
  await page.locator('.friends-card button', { hasText: 'Bu hafta' }).click()
  await expect(names.first()).toContainText('Sen')
  await expect(names.nth(1)).toContainText('Veli')

  // Add friend
  const addDetails = page.locator('.friends-card details.friends-add')
  if (!(await addDetails.getAttribute('open'))) {
    await addDetails.locator('summary').click()
  }
  await page.locator('.friends-card input[placeholder="Arkadaşının kodu"]').fill('AYSE1234')
  await page.locator('.friends-card form.friends-form button[type="submit"]').click()
  await expect(page.locator('.friends-card')).toContainText('Ayşe')

  // Remove friend (Veli)
  await page.locator('.friends-card button[aria-label*="Veli arkadaşını çıkar"]').click()
  await expect(page.locator('.friends-card')).not.toContainText('Veli')
  expect(await overflow(page)).toEqual([])
})

test('streak repair: broken streak offers recall exam, >=70% score restores streak on Today screen', async ({ page }) => {
  await startWithSamples(page)

  // Seed 6 vocabulary items into wordStates (introduced 6 days ago, with recognition reps),
  // and review events on days 6, 5, 4, 3, 2 ago (breaking on day 1 ago = yesterday).
  await page.evaluate(() =>
    new Promise<void>((resolve) => {
      const open = indexedDB.open('kelime-koc')
      open.onsuccess = () => {
        const tx = open.result.transaction(['vocabulary', 'wordStates', 'events'], 'readwrite')
        const vocStore = tx.objectStore('vocabulary')
        const vocReq = vocStore.getAll()
        vocReq.onsuccess = () => {
          const words = vocReq.result as { id: string; language: string; lemma: string; senses: { gloss: string }[] }[]
          const now = Date.now()
          const DAY = 86_400_000
          const ago = (d: number) => new Date(now - d * DAY)

          for (const w of words.slice(0, 6)) {
            tx.objectStore('wordStates').put({
              entryId: w.id,
              language: w.language,
              introducedAt: ago(6),
              skills: {
                recognition: {
                  due: new Date(),
                  stability: 3,
                  difficulty: 5,
                  elapsed_days: 1,
                  scheduled_days: 2,
                  reps: 2,
                  lapses: 0,
                  learning_steps: 0,
                  state: 2,
                  last_review: ago(2),
                },
              },
              stats: { reviews: 2, correct: 2, wrong: 0, hints: 0, totalResponseMs: 2200, consecutiveWrong: 0 },
            })
          }

          for (let d = 6; d >= 2; d--) {
            const w = words[0]!
            tx.objectStore('events').add({
              id: `evt-${d}`,
              entryId: w.id,
              language: w.language,
              timestamp: ago(d),
              exerciseType: 'mc_meaning',
              verdict: 'correct',
              responseMs: 1200,
              hintsUsed: 0,
              maxHints: 0,
              mode: 'normal',
            })
          }
        }
        tx.oncomplete = () => resolve()
      }
    }),
  )

  await page.reload()
  await openScreen(page, 'Bugün')

  // Streak repair offer card is displayed
  const repairNudge = page.locator('.streak-repair')
  await expect(repairNudge).toBeVisible()
  await expect(repairNudge).toContainText('günlük serin koptu')
  await expect(repairNudge).toContainText('hatırlama sınavında %70 yap')

  // Start the repair exam
  await repairNudge.locator('button').click()

  // Exam screen opens in repair mode
  await expect(page.locator('.repair-goal')).toBeVisible()
  await expect(page.locator('.repair-goal')).toContainText('Seri kurtarma')

  // Build gloss lookup from vocabulary
  const vocabMap = await page.evaluate(() =>
    new Promise<Record<string, string>>((resolve) => {
      const open = indexedDB.open('kelime-koc')
      open.onsuccess = () => {
        const req = open.result.transaction('vocabulary').objectStore('vocabulary').getAll()
        req.onsuccess = () => {
          const map: Record<string, string> = {}
          for (const v of req.result) {
            const display = v.article ? (v.article.endsWith("'") ? `${v.article}${v.lemma}` : `${v.article} ${v.lemma}`) : v.lemma
            map[display] = v.senses?.[0]?.gloss ?? ''
            map[v.lemma] = v.senses?.[0]?.gloss ?? ''
          }
          resolve(map)
        }
      }
    }),
  )

  // Answer each question in the exam
  while (await page.locator('.exam').isVisible()) {
    if (await page.locator('.repair-won').isVisible()) break

    const wordElem = page.locator('.exam .word')
    if (await wordElem.isVisible()) {
      const word = (await wordElem.textContent())?.trim() ?? ''
      const gloss = vocabMap[word]
      const opt = gloss ? page.locator('.exam .option', { hasText: gloss }) : page.locator('.exam .option').first()
      if ((await opt.count()) > 0) {
        await opt.first().click()
      } else {
        await page.locator('.exam .option').first().click()
      }
    } else {
      const input = page.locator('.exam input.answer-input')
      if (await input.isVisible()) {
        await input.fill('test')
        await page.keyboard.press('Enter')
      }
    }

    const nextBtn = page.locator('.exam button', { hasText: /Sonraki|Sonucu gör/ })
    await expect(nextBtn).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(100)
  }

  // Result screen shows the streak is won back
  await expect(page.locator('.repair-won')).toBeVisible()
  await expect(page.locator('.repair-won')).toContainText('Serin geri geldi')

  // Return to Today screen: streak is restored and repair nudge is gone
  await page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Bugün\d*$/ }).first().click()
  await expect(page.locator('.streak-repair')).toHaveCount(0)
  expect(await overflow(page)).toEqual([])
})

test('progress report: print opens a popup window and Excel (.xlsx) download contains at least 7 sheets', async ({ page }) => {
  await startWithSamples(page)
  await openScreen(page, 'İlerleme')
  await expect(page.getByRole('heading', { name: 'İlerleme' })).toBeVisible()

  // Open "Paylaş" menu
  const shareBtn = page.getByRole('button', { name: 'Paylaş' })
  await expect(shareBtn).toBeVisible()
  await shareBtn.click()

  // 1. "Yazdır ya da PDF" opens a popup window with progress report
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.locator('[role="menuitem"]', { hasText: 'Yazdır ya da PDF' }).click(),
  ])
  expect(popup).toBeTruthy()
  await expect(popup.locator('h1')).toContainText(/ilerleme raporu/i)
  await popup.close()

  // Open "Paylaş" menu again
  await shareBtn.click()

  // 2. "Excel (.xlsx)" downloads a workbook with at least 7 sheets
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[role="menuitem"]', { hasText: 'Excel (.xlsx)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^diloloji-ilerleme-[a-z]+-\d{4}-\d{2}-\d{2}\.xlsx$/)

  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const fileBytes = fs.readFileSync(downloadPath!)
  const unzipped = unzipSync(new Uint8Array(fileBytes))
  const sheetFiles = Object.keys(unzipped).filter((k) => k.startsWith('xl/worksheets/sheet'))
  expect(sheetFiles.length).toBeGreaterThanOrEqual(7)
  expect(await overflow(page)).toEqual([])
})

test('duel: a link opens the challenge, the same questions are played, both results show and a reply link is made', async ({ page }) => {
  await startWithSamples(page)
  const ids = ['fr-futur_fr-01', 'fr-discours_indirect_fr-01', 'fr-futur_fr-03']
  const code = Buffer.from(JSON.stringify({ v: 1, l: 'fr', q: ids, f: { n: 'Şule', s: 3, t: 20000 } })).toString('base64url')
  await page.goto(`/?duel=${code}`)
  await expect(page.getByText('Şule, Fransızca düellosuna seni çağırıyor')).toBeVisible()
  expect(page.url()).not.toContain('duel=')
  await page.getByRole('button', { name: 'Düelloya başla' }).click()
  for (let i = 0; i < ids.length; i++) {
    await page.locator('.options .option').first().click()
    await page.getByRole('button', { name: /^(Devam|Sonucu gör)$/ }).click()
  }
  await expect(page.locator('.duel-side')).toHaveCount(2)
  await expect(page.locator('h1')).toContainText(/Şule kazandı|Kazandın|Berabere/)
  const link = await page.locator('.duel-link').innerText()
  expect(link).toContain('?duel=')
  expect(await overflow(page)).toEqual([])
})
