// Builds the app icons from one drawing: public/favicon.svg and the PNGs (any, maskable, Apple).
// The mark: a speech bubble in the shape of a D (Diloloji) with a leaf in it (words that grow).
// Run: CHROME=/path/to/chromium node scripts/build-icons.mjs   (CHROME is optional)
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BUBBLE = 'M144 108H258C362 108 420 176 420 250C420 324 362 392 258 392H222L140 456C132 462 124 456 126 447L138 392H144A34 34 0 0 1 110 358V142A34 34 0 0 1 144 108Z'
const LEAF = 'M176 336C172 240 224 176 332 168C340 266 288 332 176 336Z'
const VEIN = 'M194 322C232 276 272 232 312 192'

const defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#312e81"/></linearGradient>
    <linearGradient id="leaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#6ee7b7"/></linearGradient>
  </defs>`
const mark = (transform) => `<g transform="${transform}">
    <path d="${BUBBLE}" fill="#fff"/>
    <path d="${LEAF}" fill="url(#leaf)"/>
    <path d="${VEIN}" stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none" opacity=".8"/>
  </g>`
// The bubble's middle is (265, 282): moved to the middle of the 512 square (scaled around it for the maskable safe zone).
const centre = (scale) => `translate(256 256) scale(${scale}) translate(-265 -282)`
const svg = (rx, scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  <rect width="512" height="512"${rx ? ` rx="${rx}"` : ''} fill="url(#bg)"/>
  ${mark(centre(scale))}
</svg>`

const favicon = svg(116, 0.92).replace('<svg ', '<!-- Diloloji: a speech bubble shaped like a D, with a leaf in it: words that grow. Built by scripts/build-icons.mjs -->\n<svg ')
writeFileSync('public/favicon.svg', favicon + '\n')

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const render = async (markup, size, file, transparent) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`)
  await page.screenshot({ path: `public/${file}`, omitBackground: transparent })
  await page.close()
}
await render(svg(116, 0.92), 512, 'pwa-512.png', true)
await render(svg(116, 0.92), 192, 'pwa-192.png', true)
await render(svg(0, 0.8), 512, 'pwa-maskable-512.png', false)
await render(svg(0, 0.9), 180, 'apple-touch-icon.png', false)
await browser.close()
console.log('icons written')
