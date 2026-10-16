// Builds the app icons from one drawing: public/favicon.svg and the PNGs (any, maskable, Apple).
// The mark: a D-shaped speech bubble with a twin-leaf sprout, open book pages, and a golden spark.
// Run: CHROME=/path/to/chromium node scripts/build-icons.mjs   (CHROME is optional)
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

// Single seamless D-bubble path (top-left rounded corner, outer right arch, split bottom for sprout stem, inner counter, and tail)
const BUBBLE =
  'M168 112H256C338 112 400 174 400 256C400 338 338 400 256 400H234C250 386 258 368 260 348C312 346 348 308 348 256C348 204 310 164 256 164H188V348H236C234 368 222 388 202 400H188L148 432C140 438 134 433 134 423V146A34 34 0 0 1 168 112Z'

// Open book page arcs rising from the center of the sprout
const PAGES_OUTER = 'M194 214C220 220 242 236 256 262C270 236 292 220 318 214'
const PAGES_INNER = 'M208 202C228 210 244 224 256 244C268 224 284 210 304 202'

// Twin-leaf sprout & stem
const STEM_AND_LOWER_LEAVES =
  'M210 402C236 392 248 364 248 324C204 312 172 278 170 224C210 232 242 252 256 284C270 252 302 232 342 224C340 278 308 312 262 324C262 364 244 394 210 402Z'
// Upper facets of left and right leaves with curved central veins
const LEFT_LEAF_TOP = 'M170 224C210 232 242 252 256 284C254 294 251 304 248 312C232 276 204 248 170 224Z'
const RIGHT_LEAF_TOP = 'M342 224C302 232 270 252 256 284C258 294 261 304 264 312C280 276 308 248 342 224Z'

// Golden four-point spark at the crown
const SPARK = 'M256 162Q256 184 278 184Q256 184 256 206Q256 184 234 184Q256 184 256 162Z'

const defs = `<defs>
    <linearGradient id="bg" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="0.55" stop-color="#4338ca"/><stop offset="1" stop-color="#272466"/></linearGradient>
    <linearGradient id="leaf-base" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#059669"/><stop offset="1" stop-color="#34d399"/></linearGradient>
    <linearGradient id="leaf-hi" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#86efac"/></linearGradient>
    <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
  </defs>`

const mark = (transform) => `<g transform="${transform}">
    <path d="${BUBBLE}" fill="#fff"/>
    <path d="${PAGES_OUTER}" stroke="#6ee7b7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${PAGES_INNER}" stroke="#a7f3d0" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${STEM_AND_LOWER_LEAVES}" fill="url(#leaf-base)"/>
    <path d="${LEFT_LEAF_TOP}" fill="url(#leaf-hi)"/>
    <path d="${RIGHT_LEAF_TOP}" fill="url(#leaf-hi)"/>
    <path d="${SPARK}" fill="url(#spark)"/>
  </g>`

const centre = (scale) => `translate(256 256) scale(${scale}) translate(-262 -268)`
const svg = (rx, scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  <rect width="512" height="512"${rx ? ` rx="${rx}"` : ''} fill="url(#bg)"/>
  ${mark(centre(scale))}
</svg>`

const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g transform="${centre(1.08)}">
    <path d="${BUBBLE}" fill="#fff"/>
    <path d="${PAGES_OUTER}" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${PAGES_INNER}" stroke="#fff" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${STEM_AND_LOWER_LEAVES}" fill="#fff"/>
    <path d="${SPARK}" fill="#fff"/>
  </g>
</svg>`

const favicon = svg(116, 0.94).replace('<svg ', '<!-- Diloloji: a D-shaped speech bubble with a sprouting leaf, open book pages, and a golden spark. Built by scripts/build-icons.mjs -->\n<svg ')
writeFileSync('public/favicon.svg', favicon + '\n')

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const render = async (markup, size, file, transparent) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`)
  await page.screenshot({ path: `public/${file}`, omitBackground: transparent })
  await page.close()
}
await render(svg(116, 0.94), 512, 'pwa-512.png', true)
await render(svg(116, 0.94), 192, 'pwa-192.png', true)
await render(svg(0, 0.82), 512, 'pwa-maskable-512.png', false)
await render(svg(0, 0.92), 180, 'apple-touch-icon.png', false)
await render(badgeSvg, 96, 'notification-badge.png', true)
await browser.close()
console.log('icons written')
