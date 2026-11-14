import { expect, type Page, type Route } from '@playwright/test'

/** First run in a fresh browser: French, the sample words, then Today. */
export async function startWithSamples(page: Page) {
  // The preview passes /api on to the live site: translation would call the real DeepL (and use
  // the month's characters). Off by default; a test about translation stubs it after this.
  await page.route((u) => u.pathname === '/api/translate', (r) => r.fulfill({ status: 503, json: { error: 'not configured' } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  await page.locator('.lang-card', { hasText: 'Fransızca' }).click()
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await page.getByRole('button', { name: /Fransızca ile başlayalım/ }).click()
  await page.getByRole('button', { name: /örnek kelime yükle/ }).click()
  await page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Bugün\d*$/ }).first().click()
  await expect(page.getByRole('button', { name: /^(Başla|Devam et)$/ })).toBeVisible()
  await packApplied(page)
}

/**
 * Waits until the word pack has reached every word (each records the version it got): pronunciations,
 * recordings and the other languages arrive in the background, and a screenshot or a check taken
 * before that would depend on how fast the machine was.
 */
export async function packApplied(page: Page) {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => resolve(false)
        open.onsuccess = () => {
          const all = open.result.transaction('vocabulary').objectStore('vocabulary').getAll()
          all.onsuccess = () => resolve(all.result.length > 0 && all.result.every((v: { packV?: string }) => !!v.packV))
          all.onerror = () => resolve(false)
        }
      }),
    undefined,
    { polling: 250, timeout: 15_000 },
  )
  // The screen re-reads the words once the pack is in.
  await page.waitForTimeout(300)
}

/** Opens the verb lab (Öğren → Fiiller) and picks a verb by typing it. */
export async function openVerbLab(page: Page, verb?: string) {
  await page.locator(':is(.nav-btn, .tab):visible').filter({ hasText: /^Öğren\d*$/ }).first().click()
  await page.locator('.hub-tab').filter({ hasText: /^Fiiller$/ }).click()
  await expect(page.getByRole('heading', { name: 'Fiil laboratuvarı' })).toBeVisible()
  if (verb) {
    const input = page.getByRole('combobox')
    await input.fill(verb)
    await input.press('Enter')
    await expect(page.locator('.lab-main .lab-verb').first()).toHaveText(new RegExp(`^${verb}$`, 'i'))
  }
}

/** Where each screen lives: a menu place, then (for grouped screens) a tab at the top. */
const ROUTE: Record<string, [string, string?]> = {
  Bugün: ['Bugün'],
  Kelimeler: ['Kelimeler', 'Kelimeler'],
  Sözlük: ['Kelimeler', 'Sözlük'],
  Hatalar: ['İlerleme', 'Hatalar'],
  Çeviri: ['Kelimeler', 'Çeviri'],
  Okuma: ['Okuma', 'Metinler'],
  Hikaye: ['Okuma', 'Hikaye'],
  Oyunlar: ['Öğren', 'Oyunlar'],
  Sınavlar: ['Öğren', 'Sınavlar'],
  Fiiller: ['Öğren', 'Fiiller'],
  'Yaz & konuş': ['Öğren', 'Yaz & konuş'],
  Rehber: ['Öğren', 'Rehber'],
  Topluluk: ['İlerleme', 'Topluluk'],
  İlerleme: ['İlerleme', 'Genel'],
}

/** Opens a screen the way a user would: the menu (side menu or tab bar), then its tab; Profile and Settings via the avatar or the side menu. */
export async function openScreen(page: Page, name: string) {
  if (name === 'Profil' || name === 'Ayarlar') {
    const side = page.locator(name === 'Profil' ? '.sidebar-foot-btn:visible' : '.sidebar-settings:visible')
    // Right after a reload neither exists yet: wait for the menu before choosing the way.
    await page.locator(':is(.sidebar-foot-btn, .sidebar-settings, .top-profile-btn):visible').first().waitFor()
    if (await side.count()) {
      await side.click()
      // On a wide screen the profile is the first item of the account menu the avatar card opens.
      if (name === 'Profil') await page.getByRole('menuitem', { name: /^Profil/ }).click()
    } else {
      // On a phone and a tablet the avatar in the top bar opens the same account menu.
      await page.locator('.top-profile-btn:visible').click()
      await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
    }
  } else {
    const [place, tab] = ROUTE[name]
    const menu = page.locator(':is(.nav-btn, .tab):visible').filter({ hasText: new RegExp(`^${place}\\d*$`) }).first()
    // Under a full parallel run the phone's tab bar now and then fails Playwright's hit test (the page under it is
    // reported as covering it) for minutes on end, though nothing covers it on screen and it never happens alone.
    // A normal click first; if it is held up, the tab's own click: the navigation is still the app's.
    await menu.click({ timeout: 5000 }).catch(() => menu.dispatchEvent('click'))
    if (tab) await page.locator('.hub-tab').filter({ hasText: new RegExp(`^${tab}\\d*$`) }).click()
  }
  await page.waitForTimeout(400)
  // A long page keeps its groups closed on a phone; the checks that walk a screen need all of it.
  for (let n = await page.locator('.group-toggle[aria-expanded=false]').count(); n > 0; n--) await page.locator('.group-toggle[aria-expanded=false]').first().click()
}

export const SCREENS = ['Bugün', 'Kelimeler', 'Hatalar', 'Çeviri', 'Okuma', 'Hikaye', 'Oyunlar', 'Sınavlar', 'Fiiller', 'Yaz & konuş', 'Rehber', 'Topluluk', 'İlerleme', 'Profil', 'Ayarlar']

/** Elements wider than the screen that make the page scroll sideways. */
export const overflow = (page: Page) =>
  // Against the device width: a phone browser widens its layout to fit content that overflows,
  // so innerWidth itself grows and would hide the problem.
  page.evaluate((width) => {
    if (document.documentElement.scrollWidth <= width + 1) return []
    const fixed = (e: Element) => {
      for (let x: Element | null = e; x; x = x.parentElement) if (getComputedStyle(x).position === 'fixed') return true
      return false
    }
    const wide = [...document.querySelectorAll<HTMLElement>('body *')].filter((e) => !e.closest('svg') && !fixed(e) && e.getBoundingClientRect().right > width + 1)
    // The innermost ones are the cause; their ancestors only grow with them.
    return wide
      .filter((e) => !wide.some((o) => o !== e && e.contains(o)))
      .slice(0, 5)
      .map((e) => `${e.tagName}.${String(e.className).split(' ')[0]} "${(e.textContent ?? '').trim().slice(0, 20)}" ${Math.round(e.getBoundingClientRect().width)}px`)
  }, page.viewportSize()!.width)

/**
 * Text below WCAG AA contrast as rendered (colour, opacity and background layers blended).
 * Skips text on gradients/images and text a design hides on purpose (transparent blanks).
 */
export const settleTransitions = (page: Page) => page.evaluate(async () => {
  await Promise.race([
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    new Promise((resolve) => setTimeout(resolve, 100)),
  ])
  const finite = document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
  await Promise.race([
    Promise.allSettled(finite.map((animation) => animation.finished)),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ])
})

export const contrastProblems = async (page: Page) => {
  await settleTransitions(page)
  return page.evaluate(() => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
    }
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const blend = (t: number[], b: number[]) => [t[0] * t[3] + b[0] * (1 - t[3]), t[1] * t[3] + b[1] * (1 - t[3]), t[2] * t[3] + b[2] * (1 - t[3]), 1]
    const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
    const bgOf = (el: Element): number[] | null => {
      const layers: number[][] = []
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.backgroundImage !== 'none' && !/url/.test(cs.backgroundImage)) return null
        const c = parse(cs.backgroundColor)
        if (c && c[3] > 0) {
          layers.push(c)
          if (c[3] >= 1) break
        }
      }
      let bg = parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1]
      for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg)
      return bg
    }
    const out: string[] = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[aria-hidden=true],[hidden],:disabled,[aria-disabled=true],.blank,.lang-btn,.swipe-stamp')) continue
      const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join('')
      if (!text) continue
      let fg = parse(cs.color)
      const bg = bgOf(el)
      if (!fg || !bg) continue
      let op = 1
      for (let e: Element | null = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity)
      if (fg[3] * op === 0) continue
      fg = blend([fg[0], fg[1], fg[2], fg[3] * op], bg)
      const size = parseFloat(cs.fontSize)
      const need = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66) ? 3 : 4.5
      const got = ratio(fg, bg)
      if (got < need) out.push(`${got.toFixed(2)} "${text.slice(0, 30)}"`)
    }
    return [...new Set(out)]
  })
}

/**
 * Real content a box hides instead of showing: text or a control, in the flow of the page, that
 * reaches past the edge of an ancestor with overflow hidden and no ellipsis. Decoration (aria-hidden,
 * absolutely positioned: the big faint greeting, a watermark icon) is meant to bleed and is skipped.
 * Such a box never scrolls the page, so `overflow` cannot see it.
 */
export const clippedContent = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = []
    for (const box of document.querySelectorAll<HTMLElement>('main *')) {
      const s = getComputedStyle(box)
      if (box.clientWidth < 2 || !/hidden|clip/.test(s.overflowX) || s.textOverflow === 'ellipsis' || box.closest('svg, [aria-hidden=true]')) continue
      const edge = box.getBoundingClientRect().right
      const cut = [...box.querySelectorAll<HTMLElement>('*')].find((e) => {
        if (e.closest('svg, [aria-hidden=true]') || getComputedStyle(e).textOverflow === 'ellipsis') return false
        for (let x: HTMLElement | null = e; x && x !== box; x = x.parentElement) if (/absolute|fixed/.test(getComputedStyle(x).position)) return false
        const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim())
        return (hasText || e instanceof HTMLInputElement) && e.getBoundingClientRect().right > edge + 2
      })
      if (cut) found.push(`${box.tagName}.${String(box.className).split(' ')[0]} cuts ${cut.tagName}.${String(cut.className).split(' ')[0]} "${(cut.textContent ?? '').trim().slice(0, 24)}"`)
    }
    return found.slice(0, 6)
  })

/** Plays today's session to its summary, answering whatever comes first, and stops there. */
export async function playSession(page: Page, start = true) {
  if (start) await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).click()
  for (let i = 0; i < 150 && !(await page.locator('.celebrate-card, .summary-grid').count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Tanıdım|Hatırlıyorum)/ })
    const guess = page.locator('.session-stage .option:not([disabled])')
    const typed = page.locator('.session-stage input.answer-input:visible')
    // A word built from its pieces (the input is read-only): one piece is an answer, right or not.
    const piece = page.locator('.session-stage .piece-bank .chip:not([disabled])')
    // A question to say aloud: a test has no microphone, so it is answered by typing.
    const instead = page.getByRole('button', { name: 'Yazarak cevapla' })
    // An answer is saved before the screen moves on: the option counted a moment ago can be disabled (or the
    // button gone) by the time it is clicked. A short try, and the loop looks again, instead of a click that
    // waits out the whole test on an element that will never be enabled.
    const tap = (l: typeof next) => l.first().click({ timeout: 3000 }).catch(() => {})
    if (await next.count()) await tap(next)
    else if (await guess.count()) await tap(guess)
    else if (await piece.count()) {
      await tap(piece)
      await tap(page.locator('.session-stage button[type=submit]:not([disabled])'))
    } else if (await typed.count()) {
      await typed.first().fill('x')
      await page.keyboard.press('Enter')
    } else if (await instead.count()) await instead.click()
    else await page.waitForTimeout(150)
    await page.waitForTimeout(80)
  }
}

/** Plays the session through and leaves the summary: a moment on top (a new badge) is closed first. */
export async function finishSession(page: Page) {
  await playSession(page)
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) await page.locator('.milestone-backdrop .btn:not(.btn-quiet)').click()
  await page.getByRole('button', { name: /^(Devam|Kapat|Tamam|Bitir|Ana sayfa)/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(600)
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) {
    await page.locator('.milestone-backdrop .milestone-close').click()
    await page.waitForTimeout(200)
  }
}

/** The verb lab favourites saved in the app's database (to wait for a background write). */
export function labFavorites(page: Page, language: string): Promise<string[]> {
  return page.evaluate(
    (key) =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const get = open.result.transaction('meta').objectStore('meta').get(key)
          get.onsuccess = () => resolve((get.result?.value?.favorites as string[] | undefined) ?? [])
          get.onerror = () => resolve([])
        }
        open.onerror = () => resolve([])
      }),
    `lab:${language}`,
  )
}

/**
 * Marks the device's account as approved by the site's owner, as the app keeps it after the server
 * says so: the AI screens open (no server is asked: with no account there is nothing to ask).
 */
export async function approveAccount(page: Page) {
  await page.route((u) => u.pathname === '/api/access', (r) => r.fulfill({ json: { status: 'approved', exists: true, match: true, enabled: true } }))
  // The server has the owner's AI key (a test that wants answers adds its own with aiRoute).
  await aiRoute(page, (r) => r.fulfill({ status: 503, json: { error: 'not configured' } }))
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction('meta', 'readwrite')
          tx.objectStore('meta').put({ key: 'syncAccount', value: { kind: 'account', username: 'testuser', id: 'a'.repeat(64), enc: 'e'.repeat(64), auth: '1'.repeat(64) } })
          tx.objectStore('meta').put({ key: 'accessStatus', value: { status: 'approved', at: new Date().toISOString() } })
          tx.oncomplete = () => {
            window.dispatchEvent(new Event('diloloji:account'))
            resolve()
          }
        }
      }),
  )
}

/** Puts marks on the guide's lessons in the app's database (as the guide keeps them), for the Today review card. */
export async function seedGuideMarks(page: Page, marks: Record<string, { read: string; learned?: string; reviewed?: string; step?: number }>) {
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction('meta', 'readwrite')
          tx.objectStore('meta').put({ key: 'guideMarks', value })
          tx.oncomplete = () => resolve()
        }
      }),
    marks,
  )
}

/**
 * Answers in the app's database, as rounds leave them: `n` per language that has words (spread over the last hour), then
 * a reload so the app reads them. For the checks of screens that show a learner's data: with no answers at all, Progress
 * and Profile show one invitation instead (src/ui/progress/progressUnlocks.ts); 30 answers open every section.
 */
export async function seedAnswers(page: Page, n = 30) {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const read = db.transaction('vocabulary').objectStore('vocabulary').getAll()
          read.onsuccess = () => {
            const words = read.result as { id: string; language: string }[]
            const tx = db.transaction('events', 'readwrite')
            const now = Date.now()
            for (const language of new Set(words.map((w) => w.language))) {
              const mine = words.filter((w) => w.language === language)
              for (let i = 0; i < count; i++) {
                const correct = i % 4 !== 0
                tx.objectStore('events').put({
                  id: `seed-${language}-${i}`,
                  entryId: mine[i % mine.length]!.id,
                  language,
                  skill: 'recognition',
                  exerciseType: 'mc_meaning',
                  direction: 'target_to_native',
                  verdict: correct ? 'correct' : 'wrong',
                  correct,
                  ...(correct ? {} : { errorType: 'meaning' }),
                  rating: correct ? 3 : 1,
                  responseMs: 3000,
                  hintsUsed: 0,
                  retrievabilityBefore: 0.9,
                  stabilityAfter: 2,
                  scheduledDays: 1,
                  mode: 'normal',
                  timestamp: new Date(now - (count - i) * 60_000),
                })
              }
            }
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
          }
        }
      }),
    n,
  )
  await page.reload()
  // The answers earn a badge or a level: its moment opens on top once the app has read them. Closed, as after a round.
  await page.locator(':is(.nav-btn, .tab):visible').first().waitFor()
  await page.waitForTimeout(800)
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) {
    await page.locator('.milestone-backdrop .milestone-close').first().click()
    await page.waitForTimeout(250)
  }
}

/** The topics the guide has marks for, as saved in the app's database (to wait for the save that follows a lesson's check). */
export function guideMarkTopics(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const get = open.result.transaction('meta').objectStore('meta').get('guideMarks')
          get.onsuccess = () => resolve(Object.keys((get.result?.value as Record<string, unknown> | undefined) ?? {}))
          get.onerror = () => resolve([])
        }
        open.onerror = () => resolve([])
      }),
  )
}

/** The guide's marks as saved in the app's database (to wait for the save that a tap on Today starts). */
export function guideMarkValues(page: Page): Promise<Record<string, { reviewed?: string }>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, { reviewed?: string }>>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const get = open.result.transaction('meta').objectStore('meta').get('guideMarks')
          get.onsuccess = () => resolve((get.result?.value as Record<string, { reviewed?: string }> | undefined) ?? {})
          get.onerror = () => resolve({})
        }
        open.onerror = () => resolve({})
      }),
  )
}

/** Puts notices (the bell's list) into the database, newest first, then reloads so the app reads them. */
export async function seedNotices(page: Page, notices: { id: string; kind: string; text: string; read?: boolean; target?: string; minutesAgo?: number }[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onsuccess = () => {
          const tx = open.result.transaction('meta', 'readwrite')
          tx.objectStore('meta').put({ key: 'notices', value: list.map((n) => ({ id: n.id, kind: n.kind, text: n.text, read: !!n.read, ...(n.target ? { target: n.target } : {}), at: new Date(Date.now() - (n.minutesAgo ?? 1) * 60_000).toISOString() })) })
          tx.oncomplete = () => resolve()
        }
      }),
    notices,
  )
  await page.reload()
}

/** Monki lives in the sidebar on desktop and the account menu on phones. */
export async function openMonki(page: Page) {
  const launcher = page.getByRole('button', { name: 'Monki ile konuş', exact: true })
  if (await launcher.isVisible()) return launcher.click()
  await page.getByRole('button', { name: 'Hesap menüsü', exact: true }).click()
  await page.getByRole('menuitem', { name: /Monki ile konuş/ }).click()
}

/** Mobile selection lives with the other list tools to leave room for search. */
export async function selectWords(page: Page) {
  const select = page.getByRole('button', { name: 'Seç', exact: true })
  if (await select.isVisible()) return select.click()
  await page.getByRole('button', { name: /Filtrele ve görünüm/ }).click()
  await page.getByRole('button', { name: 'Kelimeleri seç', exact: true }).click()
}

/**
 * The site's AI proxy (/api/ai): the app asks it whether the AI is on (GET, answered "available" once
 * the account is approved) and sends each request to it (POST, answered by `answer`, in the shape of the Messages API).
 */
export async function aiRoute(page: Page, answer: (route: Route) => Promise<void> | void) {
  await page.route(
    (u) => u.pathname === '/api/ai',
    (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { available: true, level: 'tam', features: ['test', 'word_fill', 'suggest', 'mnemonic', 'family', 'word_suggest', 'personal_sentences', 'prequestions', 'comprehension', 'notes_quiz', 'sentence', 'translation', 'retell', 'story', 'journal', 'report', 'session_note', 'week_note', 'verb_explain', 'pron_tips', 'chat', 'monki', 'photo_words', 'podcast'] } }) : answer(r)),
  )
}

/**
 * A game's card on the Games screen. The hub shows one purpose at a time (Kelime first), so for a card under another
 * purpose it switches to "Tümü", where every game is; the card locator is returned either way.
 */
export async function gameCard(page: Page, name: string) {
  const card = page.locator('.game-card', { hasText: name })
  const all = page.getByRole('radio', { name: 'Tümü', exact: true })
  await all.waitFor()
  if (!(await card.first().isVisible())) await all.click()
  return card
}
