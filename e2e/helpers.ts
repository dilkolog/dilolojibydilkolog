import { expect, type Page } from '@playwright/test'

/** First run in a fresh browser: French, the sample words, then Today. */
export async function startWithSamples(page: Page) {
  await page.goto('/')
  await page.locator('.lang-card', { hasText: 'Fransızca' }).click()
  await page.getByRole('button', { name: /Fransızca ile başlayalım/ }).click()
  await page.getByRole('button', { name: /örnek kelime yükle/ }).click()
  await page.locator('button:visible', { hasText: /^Bugün\d*$/ }).first().click()
  await expect(page.getByRole('button', { name: /^(Başla|Devam et)$/ })).toBeVisible()
}

/** Opens a main screen from the menu (side menu on desktop, tab bar or "Daha" on phones). */
export async function openScreen(page: Page, name: string) {
  const visible = page.locator('button:visible').filter({ hasText: new RegExp(`^${name}\\d*$`) })
  if (await visible.count()) await visible.first().click()
  else {
    await page.locator('button:visible', { hasText: /^Daha\d*$/ }).first().click()
    await page.locator(':is(button,a):visible', { hasText: new RegExp(`^${name}`) }).first().click()
  }
  await page.waitForTimeout(400)
}

export const SCREENS = ['Bugün', 'Kelimeler', 'Okuma', 'Yaz & konuş', 'Hikaye', 'Oyunlar', 'Hatalar', 'İlerleme', 'Profil', 'Ayarlar']

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
export const contrastProblems = (page: Page) =>
  page.evaluate(() => {
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
