import { chromium, type Page } from '@playwright/test'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { readingKey } from '../src/engine/reading'
import type { TargetLanguage } from '../src/engine/types'

/**
 * The landing page's phone screenshots, one set per language: Today, Reading, Verbs (French and Spanish only), the
 * Guide (a lesson, and the learning path from A1), and a dialogue with its first turn answered.
 * Run against a preview of a build WITHOUT Supabase (so the app opens without a sign-in):
 *   VITE_ALLOW_GUEST=1 env -u VITE_SUPABASE_URL -u VITE_SUPABASE_PUBLISHABLE_KEY npx vite build && npx vite preview --port 4196 --strictPort
 *   npx rolldown scripts/capture-landing-shots.ts -o capture.tmp.mjs -p node --external @playwright/test --external sharp && PORT=4196 node capture.tmp.mjs [fr|es|en …]   (delete capture.tmp.mjs after)
 * Needs a Chromium (CHROMIUM_PATH=… when Playwright's own is not installed; in the Claude cloud /opt/pw-browsers/chromium).
 * Output: src/assets/landing/<screen>-<lang>.webp.
 * Reading shows an easy text (97,5% known: "öğrenmek için ideal"): the sample words are new to a fresh install, so
 * the text avoids them except the one tapped, and every other word of it is marked known first.
 */
const PORT = process.env.PORT ?? '4179'
const OUT_DIR = join(process.cwd(), 'src/assets/landing')
const CHROMIUM = process.env.CHROMIUM_PATH

const CARD: Record<TargetLanguage, string> = { fr: 'Fransızca', es: 'İspanyolca', en: 'İngilizce' }
const START: Record<TargetLanguage, RegExp> = { fr: /Fransızca ile başlayalım/, es: /İspanyolca ile başlayalım/, en: /İngilizce ile başlayalım/ }

interface Plan {
  /** The reading text: no sample word in it but `tap`. */
  text: string
  tap: string
  /** A verb for the lab (none for English). */
  verb?: string
  /** The guide lesson to open. */
  lesson: RegExp
  /** The first lessons of the path, shown as learned (the rest stay ahead). */
  learned: string[]
}
const PLANS: Record<TargetLanguage, Plan> = {
  fr: {
    text: 'Chaque matin, nous marchons ensemble près de la maison. Ensuite, nous retournons chez nous et nous préparons le repas avec nos amis. Le soir, mes parents parlent un peu, puis ils lisent un livre pendant que je regarde la télé.',
    tap: 'maison',
    verb: 'attendre',
    lesson: /Artikeller/,
    learned: ['basics_fr_articles', 'basics_fr_etre_avoir', 'basics_fr_present'],
  },
  es: {
    text: 'Cada mañana, caminamos juntos por la ciudad. Luego volvemos al hogar y preparamos el almuerzo con nuestros vecinos. Por la tarde, mis padres hablan un poco y después leen un periódico mientras yo miro la tele.',
    tap: 'ciudad',
    verb: 'hablar',
    lesson: /Artikeller/,
    learned: ['basics_es_articulos', 'basics_es_presente', 'basics_es_gustar'],
  },
  en: {
    text: 'Every morning, we walk together near the park. Then we go back home and prepare lunch with our friends. In the evening, my parents talk for a while, and then they read a book while I watch a movie about a long journey.',
    tap: 'journey',
    lesson: /Artikeller/,
    learned: ['basics_en_to_be', 'basics_en_present_simple', 'articles_en'],
  },
}

/** Every stem of the text but the tapped word's: those are "known" before the screenshot. */
function knownKeys(language: TargetLanguage, plan: Plan): string[] {
  const words = [...new Set(plan.text.match(/[\p{L}'’-]+/gu) ?? [])]
  const tapKey = readingKey(plan.tap, language)
  return [...new Set(words.map((w) => readingKey(w, language)).filter((k) => k && k !== tapKey))]
}

async function seedMeta(page: Page, key: string, value: unknown) {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['meta'], 'readwrite')
          tx.objectStore('meta').put({ key: k, value: v })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    [key, value] as const,
  )
}

/** The lessons a learner a few days in would have learned: read and passed some days ago. */
function guideMarks(topics: string[]) {
  const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)
  return Object.fromEntries(topics.map((t, i) => [t, { read: day(6 - i), learned: day(6 - i) }]))
}

/** The right reply of each turn of a dialogue, by its title (the app lists the easiest untried one first). */
function answersOf(language: TargetLanguage, title: string): number[] {
  const dir = join(process.cwd(), 'src/data/dialogues')
  for (const file of readdirSync(dir).filter((f) => f.startsWith(`${language}-`) && f.endsWith('.json'))) {
    const set = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { dialogues: { title: string; turns: { answer: number }[] }[] }
    const found = set.dialogues.find((d) => d.title === title)
    if (found) return found.turns.map((t) => t.answer)
  }
  throw new Error(`no dialogue "${title}" in ${language}`)
}

const tab = (page: Page, name: string) => page.locator(':is(.nav-btn, .tab):visible', { hasText: new RegExp(`^${name}\\d*$`) }).first()

async function capture(language: TargetLanguage) {
  const plan = PLANS[language]
  const browser = await chromium.launch({ headless: true, ...(CHROMIUM ? { executablePath: CHROMIUM } : {}) })
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await context.newPage()
  await page.route((u) => u.pathname === '/api/translate', (r) => r.fulfill({ status: 503, json: { error: 'mocked' } }))
  const shots: Record<string, Buffer> = {}
  const snap = async (name: string) => void (shots[name] = await page.screenshot())

  await page.goto(`http://localhost:${PORT}`)
  await page.getByRole('button', { name: 'Başlayalım', exact: true }).click()
  await page.locator('.lang-card', { hasText: CARD[language] }).click()
  await page.getByRole('button', { name: 'Devam', exact: true }).click()
  await page.getByRole('button', { name: START[language] }).click()
  await page.getByRole('button', { name: /örnek kelime yükle/ }).click()
  await page.waitForTimeout(1500)
  await seedMeta(page, `known:${language}`, knownKeys(language, plan))
  await seedMeta(page, 'guideMarks', guideMarks(plan.learned))
  await page.reload()
  await page.waitForTimeout(1500)

  // 1. Today
  await tab(page, 'Bugün').click()
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const nudge = document.querySelector('.habit-nudge, [class*="habit"]')
    if (nudge) (nudge as HTMLElement).style.display = 'none'
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
  await snap('today')

  // 2. Reading: an easy text, one word tapped, the sheet cut down to what shows the idea.
  await tab(page, 'Okuma').click()
  await page.waitForTimeout(500)
  const texts = page.locator('.hub-tab', { hasText: /^Metinler$/ })
  if (await texts.count()) await texts.click()
  await page.evaluate(() => {
    const d = document.querySelector('details.add-text') as HTMLDetailsElement | null
    if (d) d.open = true
  })
  await page.getByLabel('Metin', { exact: true }).fill(plan.text)
  await page.getByRole('button', { name: 'Okumaya başla' }).click()
  await page.waitForTimeout(900)
  const hide = page.locator('button, a', { hasText: /^Gizle$/ }).first()
  if (await hide.count()) {
    await hide.click()
    await page.waitForTimeout(400)
  }
  await page.locator('.rw', { hasText: plan.tap }).first().click()
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    for (const label of ['Seyrek satır', 'Dar']) {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim().includes(label))
      const row = b?.closest('.reader-tools') as HTMLElement | null
      if (row) row.style.display = 'none'
    }
    const legend = document.querySelector('.reader-legend') as HTMLElement | null
    if (legend) legend.style.display = 'none'
    const pop = document.querySelector('.word-pop')
    pop?.querySelectorAll('.word-pop-extras, .origin-notes').forEach((el) => ((el as HTMLElement).style.display = 'none'))
    pop?.querySelectorAll('p, a, button, li, div, span').forEach((el) => {
      const t = (el.textContent ?? '').trim()
      if (/^(Eş anlamlılar|Sözlükte aç|Kelimelerinde, henüz|Kalıp olarak ekle)/.test(t) && el.children.length < 3) (el as HTMLElement).style.display = 'none'
    })
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  await snap('reading')

  // 3. Verbs (French and Spanish)
  if (plan.verb) {
    await tab(page, 'Pratik').click()
    await page.waitForTimeout(400)
    const verbs = page.locator('.hub-tab', { hasText: /^Fiiller$/ })
    if (await verbs.count()) await verbs.click()
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      const tour = document.querySelector('.lab-tour-card, [class*="tour"]') as HTMLElement | null
      if (tour) tour.style.display = 'none'
    })
    const input = page.getByRole('combobox')
    if (await input.count()) {
      await input.fill(plan.verb)
      await input.press('Enter')
      await page.waitForTimeout(700)
    }
    await page.evaluate(() => {
      const hubTabs = document.querySelector('.hub-tabs') as HTMLElement | null
      if (hubTabs) hubTabs.style.display = 'none'
      const search = document.querySelector('.lab-search, .combobox-wrap, [role="combobox"]')
      const parent = search?.closest('.row, .card, form') as HTMLElement | null
      if (parent) parent.style.display = 'none'
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(400)
    await snap('verbs')
    await page.evaluate(() => {
      const hubTabs = document.querySelector('.hub-tabs') as HTMLElement | null
      if (hubTabs) hubTabs.style.display = ''
    })
  }

  // 4. Guide
  await tab(page, 'Pratik').click()
  await page.waitForTimeout(400)
  const guide = page.locator('.hub-tab', { hasText: /^Rehber$/ })
  if (await guide.count()) await guide.click()
  await page.waitForTimeout(500)
  const lesson = page.locator('.guide-card').filter({ hasText: plan.lesson }).first()
  if (await lesson.count()) {
    await lesson.click()
    await page.waitForTimeout(600)
  }
  await page.evaluate(() => {
    const rules = document.querySelectorAll('.guide-rules li, .rule-item, .guide-section li')
    for (let i = 2; i < rules.length; i++) (rules[i] as HTMLElement).style.display = 'none'
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  await snap('guide')

  // 5. The guide's learning path: a few lessons learned, the next one ahead.
  await page.evaluate(() => localStorage.setItem('diloloji:guide-view', 'path'))
  await tab(page, 'Pratik').click()
  await page.waitForTimeout(300)
  await page.locator('.hub-tab', { hasText: /^Oyunlar$/ }).click()
  await page.waitForTimeout(300)
  await page.locator('.hub-tab', { hasText: /^Rehber$/ }).click()
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    const note = document.querySelector('.guide-path-note') as HTMLElement | null
    if (note) note.style.visibility = 'hidden'
    const first = document.querySelector('.guide-path-note + section .guide-level')
    const top = first ? first.getBoundingClientRect().top + window.scrollY - 60 : 0
    window.scrollTo(0, top)
  })
  await page.waitForTimeout(400)
  await snap('path')

  // 6. A dialogue: the first turn answered well, with the reason under it.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('.hub-tab', { hasText: /^Oyunlar$/ }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Diyaloglar/ }).first().click()
  await page.waitForTimeout(500)
  const first = page.locator('.examtask-item').first()
  const title = (await first.locator('.examtask-title > :first-child').textContent())?.trim() ?? ''
  const answers = answersOf(language, title)
  await first.click()
  await page.waitForTimeout(500)
  await page.locator('.options .option').nth(answers[0]!).click()
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await snap('dialogue')

  await browser.close()
  mkdirSync(OUT_DIR, { recursive: true })
  for (const [name, png] of Object.entries(shots)) {
    const dest = join(OUT_DIR, `${name}-${language}.webp`)
    await sharp(png).resize(560, 1213).webp({ quality: 92 }).toFile(dest)
    console.log('saved', dest)
  }
}

const wanted = (process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'es', 'en']) as TargetLanguage[]
for (const language of wanted) await capture(language)
