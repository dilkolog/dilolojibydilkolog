import { chromium, type Page } from '@playwright/test'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import type { TargetLanguage } from '../src/engine/types'

/**
 * The landing page's phone screenshots, one set per language: Today and a session played through (a new word, the
 * right answer, the summary) for the hero's phone, Verbs (French and Spanish only), the Guide (a lesson, and the
 * learning path from A1), and a dialogue with its first turn answered.
 * Run against a preview of a build WITHOUT Supabase (so the app opens without a sign-in):
 *   VITE_ALLOW_GUEST=1 env -u VITE_SUPABASE_URL -u VITE_SUPABASE_PUBLISHABLE_KEY npx vite build && npx vite preview --port 4196 --strictPort
 *   npx rolldown scripts/capture-landing-shots.ts -o capture.tmp.mjs -p node --external @playwright/test --external sharp && PORT=4196 node capture.tmp.mjs [fr|es|en …]   (delete capture.tmp.mjs after)
 * Needs a Chromium (CHROMIUM_PATH=… when Playwright's own is not installed; in the Claude cloud /opt/pw-browsers/chromium).
 * Output: src/assets/landing/<screen>-<lang>.webp.
 */
const PORT = process.env.PORT ?? '4179'
const OUT_DIR = join(process.cwd(), 'src/assets/landing')
const CHROMIUM = process.env.CHROMIUM_PATH

const CARD: Record<TargetLanguage, string> = { fr: 'Fransızca', es: 'İspanyolca', en: 'İngilizce' }
const START: Record<TargetLanguage, RegExp> = { fr: /Fransızca ile başlayalım/, es: /İspanyolca ile başlayalım/, en: /İngilizce ile başlayalım/ }

interface Plan {
  /** A verb for the lab (none for English). */
  verb?: string
  /** The guide lesson to open. */
  lesson: RegExp
  /** The first lessons of the path, shown as learned (the rest stay ahead). */
  learned: string[]
}
const PLANS: Record<TargetLanguage, Plan> = {
  fr: {
    verb: 'attendre',
    lesson: /Artikeller/,
    learned: ['basics_fr_articles', 'basics_fr_etre_avoir', 'basics_fr_present'],
  },
  es: {
    verb: 'hablar',
    lesson: /Artikeller/,
    learned: ['basics_es_articulos', 'basics_es_presente', 'basics_es_gustar'],
  },
  en: {
    lesson: /Artikeller/,
    learned: ['basics_en_to_be', 'basics_en_present_simple', 'articles_en'],
  },
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

/**
 * Answers the question on the screen right, from the words in the database: a meaning for a word shown, a word for a
 * meaning shown, a sentence's missing form (its Turkish is shown with it), or the word typed. Says whether it could.
 */
async function answerRight(page: Page): Promise<boolean> {
  const answer = await page.evaluate(
    () =>
      new Promise<{ click?: number; type?: string } | null>((resolve) => {
        const open = indexedDB.open('kelime-koc')
        open.onerror = () => resolve(null)
        open.onsuccess = () => {
          const get = open.result.transaction('vocabulary').objectStore('vocabulary').getAll()
          get.onerror = () => resolve(null)
          get.onsuccess = () => {
            type Word = { lemma: string; article?: string; senses: { gloss: string; altGlosses?: string[]; examples?: { text: string; form?: string }[] }[] }
            const words = get.result as Word[]
            const stage = document.querySelector('.session-stage') as HTMLElement | null
            const options = [...(stage?.querySelectorAll<HTMLButtonElement>('.option:not([disabled])') ?? [])]
            const optionText = (o: HTMLElement) => o.innerText.replace(/^\s*\d+\s*/, '').trim().toLowerCase()
            // The prompt only: the stage's text without the options.
            const prompt = options.reduce((text, o) => text.replace(o.innerText, '\n'), stage?.innerText ?? '').toLowerCase()
            const glosses = (w: Word) => w.senses.flatMap((sense) => [sense.gloss, ...(sense.altGlosses ?? [])]).map((g) => g.toLowerCase())
            const lemmas = (w: Word) => [w.lemma, w.article ? `${w.article}${w.article.endsWith("'") ? '' : ' '}${w.lemma}` : ''].filter(Boolean).map((l) => l.toLowerCase())
            const has = (text: string) => new RegExp(`(^|[^\\p{L}])${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(prompt)
            if (options.length) {
              const texts = options.map(optionText)
              for (const w of words) {
                // A word shown: its meaning.
                if (lemmas(w).some(has)) {
                  // "olmak (kalıcı)" is shown as "olmak" with "kalıcı" under it.
                  const i = texts.findIndex((t) => glosses(w).some((g) => t === g || t.startsWith(`${g}\n`) || t.replace('\n', ' (') + ')' === g))
                  if (i >= 0) return resolve({ click: i })
                }
                // A meaning shown: its word.
                if (glosses(w).some(has)) {
                  const i = texts.findIndex((t) => lemmas(w).some((l) => t === l || t.startsWith(`${l}\n`)))
                  if (i >= 0) return resolve({ click: i })
                }
                // A sentence with a gap: the form that fills it.
                for (const ex of w.senses.flatMap((sense) => sense.examples ?? [])) {
                  if (ex.form && prompt.includes(ex.text.replace(ex.form, '____').toLowerCase())) {
                    const i = texts.findIndex((t) => t === ex.form!.toLowerCase())
                    if (i >= 0) return resolve({ click: i })
                  }
                }
              }
              return resolve(null)
            }
            const word = words.find((w) => glosses(w).some(has))
            // A noun with its article, as the app asks for it.
            resolve(word ? { type: lemmas(word).at(-1)! } : null)
          }
        }
      }),
  )
  if (!answer) return false
  if (answer.click !== undefined) await page.locator('.session-stage .option:not([disabled])').nth(answer.click).click({ timeout: 3000 }).catch(() => {})
  else if (answer.type) {
    await page.locator('.session-stage input.answer-input:visible').first().fill(answer.type)
    await page.keyboard.press('Enter')
  }
  return true
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

  // 1b. A session, for the landing page's phone that plays through a day: the first new word (a guess),
  // the guess answered right, then the rest played through to the summary where the words grew.
  await page.getByRole('button', { name: /^(Başla|Devam et)$/ }).first().click()
  await page.waitForTimeout(900)
  await snap('session')
  await answerRight(page)
  await page.waitForTimeout(900)
  await snap('correct')
  for (let i = 0; i < 150 && !(await page.locator('.celebrate-card, .summary-grid').count()); i++) {
    const next = page.locator('.session-stage button:visible', { hasText: /^(Devam|Anladım|Öğrendim|Hatırlıyorum)/ })
    const guess = page.locator('.session-stage .option:not([disabled])')
    const typed = page.locator('.session-stage input.answer-input:visible')
    // A test browser has no microphone: a question to say aloud is answered by typing; the "easy questions" offer is declined.
    const instead = page.getByRole('button', { name: /^(Yazarak cevapla|Gerek yok)$/ })
    const tap = (l: typeof next) => l.first().click({ timeout: 3000 }).catch(() => {})
    if (await instead.count()) await tap(instead)
    else if (await next.count()) await tap(next)
    else if ((await guess.count()) || (await typed.count())) {
      // Answered right, so the summary shows a good day (a picture for the landing page, not a test).
      if (!(await answerRight(page))) {
        if (await guess.count()) await tap(guess)
        else {
          await typed.first().fill('x')
          await page.keyboard.press('Enter')
        }
      }
    } else await page.waitForTimeout(150)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(1500)
  for (let i = 0; i < 6 && (await page.locator('.milestone-backdrop').count()); i++) {
    await page.locator('.milestone-backdrop .milestone-close, .milestone-backdrop .btn').first().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
  // The top of the summary: how the day went, the ring, Monki's picture.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1200)
  await snap('summary')
  await page.getByRole('button', { name: /^(Devam|Kapat|Tamam|Bitir|Ana sayfa)/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(800)

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
