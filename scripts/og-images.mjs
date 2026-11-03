// The pictures a shared link shows (WhatsApp, X, Telegram…): one for the site, one for each language's page
// (/fransizca, /ispanyolca, /ingilizce, see scripts/lang-pages.mjs). Drawn once with the app's own fonts, colours and
// Monki pictures, then kept in public/og/. Run again when the look changes:
//   node scripts/og-images.mjs   (CHROMIUM_PATH=… when Playwright's own browser is not installed)
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const asData = (file, type) => `data:${type};base64,${readFileSync(join(root, file)).toString('base64')}`
const FONT_400 = asData('public/fonts/lexend-latin-400-normal.woff2', 'font/woff2')
const FONT_700 = asData('public/fonts/lexend-latin-700-normal.woff2', 'font/woff2')
const FONT_EXT_400 = asData('public/fonts/lexend-latin-ext-400-normal.woff2', 'font/woff2')
const FONT_EXT_700 = asData('public/fonts/lexend-latin-ext-700-normal.woff2', 'font/woff2')
const LOGO = asData('public/favicon.svg', 'image/svg+xml')
const MONKI = { fr: asData('src/assets/art/lang-monki-fr.webp', 'image/webp'), es: asData('src/assets/art/lang-monki-es.webp', 'image/webp'), en: asData('src/assets/art/lang-monki-en.webp', 'image/webp') }
// The app's language colours (src/index.css, light theme).
const COLOUR = {
  fr: { lang: '#c6317c', soft: '#ffe8f1', text: '#9a2f62' },
  es: { lang: '#e6a313', soft: '#fceed9', text: '#844b00' },
  en: { lang: '#2f6de6', soft: '#e5f1ff', text: '#2b58b1' },
}
const HELLO = { fr: 'Bonjour !', es: '¡Hola!', en: 'Hello!' }

const PAGES = [
  { file: 'og.jpg', lang: 'fr', title: 'Fransızca, İspanyolca, İngilizce.', accent: 'Türkçe anlatımla, A1’den C1’e.', monkis: ['fr', 'es', 'en'] },
  { file: 'og-fr.jpg', lang: 'fr', title: 'Fransızca öğren.', accent: 'Türkçe anlatımla, A1’den C1’e.', monkis: ['fr'] },
  { file: 'og-es.jpg', lang: 'es', title: 'İspanyolca öğren.', accent: 'Türkçe anlatımla, A1’den C1’e.', monkis: ['es'] },
  { file: 'og-en.jpg', lang: 'en', title: 'İngilizce öğren.', accent: 'Türkçe anlatımla, A1’den C1’e.', monkis: ['en'] },
]

const page = (p) => {
  const c = COLOUR[p.lang]
  const many = p.monkis.length > 1
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@font-face { font-family: Lexend; font-weight: 400; src: url(${FONT_400}) format('woff2'); }
@font-face { font-family: Lexend; font-weight: 700; src: url(${FONT_700}) format('woff2'); }
@font-face { font-family: Lexend; font-weight: 400; src: url(${FONT_EXT_400}) format('woff2'); unicode-range: U+0100-024F; }
@font-face { font-family: Lexend; font-weight: 700; src: url(${FONT_EXT_700}) format('woff2'); unicode-range: U+0100-024F; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; font-family: Lexend, sans-serif; color: #0f172a;
  background: radial-gradient(ellipse 70% 90% at 85% 10%, ${c.soft} 0%, #f8fafc 70%); position: relative; }
.stripe { position: absolute; inset: auto 0 0; height: 14px; display: flex; }
.stripe i { flex: 1; } .stripe i:nth-child(1) { background: #c6317c; } .stripe i:nth-child(2) { background: #e6a313; } .stripe i:nth-child(3) { background: #2f6de6; }
.brand { position: absolute; top: 56px; left: 72px; display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 700; }
.brand img { width: 64px; height: 64px; }
.text { position: absolute; left: 72px; top: ${many ? 170 : 200}px; width: ${many ? 560 : 740}px; }
h1 { font-size: ${many ? 56 : 68}px; line-height: 1.08; letter-spacing: -0.015em; font-weight: 700; }
h1 span { color: ${c.text}; display: block; margin-top: 12px; font-size: ${many ? 36 : 48}px; white-space: nowrap; }
p { margin-top: 28px; font-size: ${many ? 24 : 27}px; line-height: 1.4; color: #475569; }
.art { position: absolute; right: ${many ? 28 : 56}px; bottom: ${many ? 50 : 60}px; display: flex; align-items: flex-end; gap: 8px; }
.art img { height: ${many ? 180 : 380}px; }
.hello { position: absolute; right: ${many ? 120 : 300}px; top: ${many ? 120 : 92}px; padding: 14px 24px; border-radius: 22px; background: #fff;
  box-shadow: 0 12px 32px rgb(15 23 42 / 0.14); font-family: Georgia, serif; font-size: 38px; color: ${c.text}; }
</style></head><body>
<div class="brand"><img src="${LOGO}" alt="">Diloloji</div>
<div class="text"><h1>${p.title}<span>${p.accent}</span></h1>
<p>Kelime, dilbilgisi, okuma, dinleme ve konuşma tek bir yolda.</p></div>
${many ? '' : `<div class="hello">${HELLO[p.lang]}</div>`}
<div class="art">${p.monkis.map((l) => `<img src="${MONKI[l]}" alt="">`).join('')}</div>
<div class="stripe"><i></i><i></i><i></i></div>
</body></html>`
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
for (const p of PAGES) {
  await tab.setContent(page(p), { waitUntil: 'load' })
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: join(root, 'public/og', p.file), type: 'jpeg', quality: 86 })
  console.log('saved', p.file)
}
await browser.close()
