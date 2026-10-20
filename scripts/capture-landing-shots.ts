import { chromium } from '@playwright/test'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'src/assets/landing')
const TMP_DIR = '/tmp/landing_capture'

if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })

async function capture() {
  console.log('🚀 Starting master landing shots capture...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await context.newPage()

  await page.route((u) => u.pathname === '/api/translate', (r) => r.fulfill({ status: 503, json: { error: 'mocked' } }))

  console.log('📱 Loading initial page...')
  await page.goto('http://localhost:4179')

  // Seed session
  await page.evaluate(() => {
    localStorage.setItem(
      'diloloji-auth',
      JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: 4102444800,
        user: { id: 'u1', email: 'ogrenci@diloloji.com' },
      }),
    )
  })

  // Seed IndexedDB meta
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('kelime-koc')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const stores = [...db.objectStoreNames]
        if (!stores.includes('meta')) {
          db.close()
          return resolve()
        }
        const tx = db.transaction(['meta'], 'readwrite')
        tx.objectStore('meta').put({
          key: 'syncAccount',
          value: { kind: 'account', username: 'ogrenci', id: 'a'.repeat(32), enc: 'b'.repeat(64), auth: 'c'.repeat(64) },
        })
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  })

  await page.reload()
  await page.waitForTimeout(500)

  // Onboarding
  const onboardingBtn = page.getByRole('button', { name: 'Başlayalım', exact: true })
  if (await onboardingBtn.count()) {
    console.log('✨ Onboarding...')
    await onboardingBtn.click()
    await page.locator('.lang-card', { hasText: 'Fransızca' }).click()
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
    await page.getByRole('button', { name: 'Devam', exact: true }).click()
    await page.getByRole('button', { name: /Fransızca ile başlayalım/ }).click()
    await page.getByRole('button', { name: /örnek kelime yükle/ }).click()
    await page.waitForTimeout(1000)
  }

  // 1. TODAY SCREEN (today.png)
  console.log('📸 1. Capturing Today screen...')
  const todayNav = page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Bugün\d*$/ }).first()
  if (await todayNav.count()) await todayNav.click()
  await page.waitForTimeout(500)

  await page.evaluate(() => {
    const nudge = document.querySelector('.habit-nudge, [class*="habit"]')
    if (nudge) (nudge as HTMLElement).style.display = 'none'
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
  const todayPng = join(TMP_DIR, 'today.png')
  await page.screenshot({ path: todayPng })

  // 2. READING SCREEN (reading.png)
  console.log('📸 2. Capturing Reading screen...')
  const okumaNav = page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Okuma\d*$/ }).first()
  await okumaNav.click()
  await page.waitForTimeout(500)

  const metinlerTab = page.locator('.hub-tab', { hasText: /^Metinler$/ })
  if (await metinlerTab.count()) await metinlerTab.click()
  await page.waitForTimeout(400)

  // Open add text form
  await page.evaluate(() => {
    const d = document.querySelector('details.add-text') as HTMLDetailsElement
    if (d) d.open = true
  })

  const textarea = page.getByLabel('Metin', { exact: true })
  if (await textarea.count()) {
    const storyText =
      'Nous marchons souvent près de la maison. L’arbre ancien devant le jardin est grand et beau. Chaque matin, le soleil brille doucement sur les collines.'
    await textarea.fill(storyText)
    const submitBtn = page.getByRole('button', { name: 'Okumaya başla' })
    if (await submitBtn.count()) {
      await submitBtn.click()
      await page.waitForTimeout(800)
    }
  }

  // Dismiss "Okumadan önce: anahtar kelimeler" card by clicking "Gizle"
  const gizleBtn = page.locator('button, a', { hasText: /^Gizle$/ }).first()
  if (await gizleBtn.count()) {
    await gizleBtn.click()
    await page.waitForTimeout(500)
  }

  // Click on "jardin" or "maison" to open word bottom sheet
  const wordBtn = page.locator('.rw', { hasText: 'maison' }).first()
  if (await wordBtn.count()) {
    console.log('👉 Clicking word "maison"...')
    await wordBtn.click()
    await page.waitForTimeout(700)
  }

  // Clean up long English etymology and topbar overlapping
  await page.evaluate(() => {
    // Ensure all paragraphs in word-pop with English Wiktionary text are hidden
    document.querySelectorAll('.word-pop p').forEach((p) => {
      if (p.textContent && (p.textContent.includes('Inherited') || p.textContent.includes('Latin') || p.textContent.includes('Old French'))) {
        ;(p as HTMLElement).style.display = 'none'
      }
    })
    const extras = document.querySelector('.word-pop-extras')
    if (extras) (extras as HTMLElement).style.display = 'none'
    const readerHead = document.querySelector('.reader-legend')
    if (readerHead) (readerHead as HTMLElement).style.display = 'none'
    const main = document.querySelector('.main')
    if (main) main.scrollTop = 0
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)

  const readingPng = join(TMP_DIR, 'reading.png')
  await page.screenshot({ path: readingPng })

  // 3. VERBS SCREEN (verbs.png)
  console.log('📸 3. Capturing Verbs screen...')
  const pratikNav = page.locator(':is(.nav-btn, .tab):visible', { hasText: /^Pratik\d*$/ }).first()
  await pratikNav.click()
  await page.waitForTimeout(400)
  const fiillerTab = page.locator('.hub-tab', { hasText: /^Fiiller$/ })
  if (await fiillerTab.count()) await fiillerTab.click()
  await page.waitForTimeout(500)

  // Dismiss daily verb tour card
  await page.evaluate(() => {
    const tourCard = document.querySelector('.lab-tour-card, [class*="tour"]')
    if (tourCard) (tourCard as HTMLElement).style.display = 'none'
  })

  const verbInput = page.getByRole('combobox')
  if (await verbInput.count()) {
    await verbInput.fill('attendre')
    await verbInput.press('Enter')
    await page.waitForTimeout(700)
  }

  // Hide the hub-tabs and search bar so Attendre table is completely at top without ghosting
  await page.evaluate(() => {
    const hubTabs = document.querySelector('.hub-tabs')
    if (hubTabs) (hubTabs as HTMLElement).style.display = 'none'
    const labSearch = document.querySelector('.lab-search, .combobox-wrap, [role="combobox"]')
    if (labSearch) {
      const parent = labSearch.closest('.row, .card, form')
      if (parent) (parent as HTMLElement).style.display = 'none'
    }
    const labMain = document.querySelector('.lab-main, .main')
    if (labMain) {
      labMain.scrollTop = 0
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  const verbsPng = join(TMP_DIR, 'verbs.png')
  await page.screenshot({ path: verbsPng })

  // 4. GUIDE SCREEN (guide.png)
  console.log('📸 4. Capturing Guide screen...')
  await page.evaluate(() => {
    const hubTabs = document.querySelector('.hub-tabs')
    if (hubTabs) (hubTabs as HTMLElement).style.display = ''
  })
  await pratikNav.click()
  await page.waitForTimeout(400)
  const rehberTab = page.locator('.hub-tab', { hasText: /^Rehber$/ })
  if (await rehberTab.count()) await rehberTab.click()
  await page.waitForTimeout(500)

  const firstLesson = page.locator('.guide-tile, .lesson-item, .card').filter({ hasText: /Cinsiyet|Artikel|Zaman/i }).first()
  if (await firstLesson.count()) {
    await firstLesson.click()
    await page.waitForTimeout(600)
  }

  await page.evaluate(() => {
    const rules = document.querySelectorAll('.guide-rules li, .rule-item, .guide-section li')
    if (rules.length > 2) {
      for (let i = 2; i < rules.length; i++) {
        (rules[i] as HTMLElement).style.display = 'none'
      }
    }
    const main = document.querySelector('.main, .guide-lesson')
    if (main) {
      main.scrollTop = 0
    } else {
      window.scrollTo(0, 0)
    }
  })
  await page.waitForTimeout(400)

  const guidePng = join(TMP_DIR, 'guide.png')
  await page.screenshot({ path: guidePng })

  await browser.close()
  console.log('🎉 Screenshots captured! Converting to WebP with cwebp...')

  const shots = [
    { name: 'today', src: todayPng },
    { name: 'reading', src: readingPng },
    { name: 'verbs', src: verbsPng },
    { name: 'guide', src: guidePng },
  ]

  for (const s of shots) {
    const destWebp = join(OUT_DIR, `${s.name}.webp`)
    execSync(`cwebp -q 92 -resize 560 1213 "${s.src}" -o "${destWebp}"`)
    console.log(`✅ Saved ${destWebp}`)
  }
  console.log('🌟 All landing shots successfully updated!')
}

capture().catch((err) => {
  console.error('❌ Error capturing shots:', err)
  process.exit(1)
})
