import type { TargetLanguage } from '../engine/types'

/**
 * What every printed page shares (a lesson, a verb's conjugation, flashcards, the dictionary, the progress report): the
 * app's own look (DESIGN.md) on paper. Lexend for the interface, Literata for target-language words (both from the
 * site's /fonts/), the three language colours as a thin stripe, the logo, the page's language as its accent, and a
 * preview on screen that looks like the sheet.
 */

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The language's colours as in the app (index.css): the accent, its soft tint, text on white, and text on the accent. */
export const PRINT_COLOURS: Record<TargetLanguage, { lang: string; soft: string; text: string; on: string }> = {
  en: { lang: '#2f6de6', soft: '#e5f1ff', text: '#2b58b1', on: '#fff' },
  fr: { lang: '#c6317c', soft: '#ffe8f1', text: '#9a2f62', on: '#fff' },
  es: { lang: '#e6a313', soft: '#fceed9', text: '#844b00', on: '#451a03' },
}

/** The languages' Turkish names (as ui/labels.ts LANGUAGE_NAME; data code does not import the interface). */
export const PRINT_LANGUAGE: Record<TargetLanguage, string> = { en: 'İngilizce', fr: 'Fransızca', es: 'İspanyolca' }

/** The site's address, for the fonts and the logo: a print window is a new document and needs it in full. */
export const printOrigin = () => (typeof location === 'undefined' ? '' : location.origin)

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212'
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2C60-2C7F,U+A720-A7FF'
const FONTS: [string, string, number, string][] = [
  ['Lexend', 'lexend-latin-400-normal.woff2', 400, LATIN],
  ['Lexend', 'lexend-latin-ext-400-normal.woff2', 400, LATIN_EXT],
  ['Lexend', 'lexend-latin-700-normal.woff2', 700, LATIN],
  ['Lexend', 'lexend-latin-ext-700-normal.woff2', 700, LATIN_EXT],
  ['Literata', 'literata-latin-400-normal.woff2', 400, LATIN],
  ['Literata', 'literata-latin-ext-400-normal.woff2', 400, LATIN_EXT],
]

/** The @font-face rules (none without an address: the fallbacks are system fonts). */
export function printFonts(origin: string): string {
  if (!origin) return ''
  return FONTS.map(([family, file, weight, range]) => `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;src:url(${origin}/fonts/${file}) format('woff2');unicode-range:${range}}`).join('')
}

/**
 * The shared stylesheet: tokens (with the page's language as --lang), the body, the stripe and top bar, chips, headings,
 * the footer and the screen preview. `margin` is the page margin; `page: false` leaves the preview to the caller (the
 * flashcards are whole sheets).
 */
export function printBase(language: TargetLanguage, origin: string, opts: { margin?: string; page?: boolean } = {}): string {
  const c = PRINT_COLOURS[language]
  const margin = opts.margin ?? '13mm 14mm 14mm'
  return `${printFonts(origin)}
    @page { size: A4; margin: ${margin}; }
    :root { --lang: ${c.lang}; --soft: ${c.soft}; --text: ${c.text}; --on: ${c.on}; --ink: #0f172a; --ink-soft: #57677e; --rule: #e2e8f0; --box: #f8fafc; --serif: 'Literata', Georgia, serif; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font: 400 10.5pt/1.5 'Lexend', system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--ink); background: #fff; }
    .stripe { display: flex; height: 1.2mm; border-radius: 1mm; overflow: hidden; margin-bottom: 4mm; }
    .stripe i { flex: 1; } .stripe i:nth-child(1) { background: #2f6de6; } .stripe i:nth-child(2) { background: #c6317c; } .stripe i:nth-child(3) { background: #e6a313; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 4mm; font-size: 8.5pt; color: var(--ink-soft); margin-bottom: 5mm; }
    .brand { display: inline-flex; align-items: center; gap: 2mm; font-weight: 700; font-size: 10pt; color: var(--ink); }
    .brand img { width: 6mm; height: 6mm; border-radius: 1.5mm; }
    header.head { padding-bottom: 4mm; margin-bottom: 1mm; border-bottom: 0.3mm solid var(--rule); }
    .chips { display: flex; flex-wrap: wrap; gap: 2mm; margin-bottom: 2mm; }
    .chip { font-size: 8pt; font-weight: 700; padding: 0.6mm 2.4mm; border-radius: 10mm; background: var(--soft); color: var(--text); }
    h1 { margin: 0; font-size: 21pt; line-height: 1.2; letter-spacing: -0.01em; }
    .sum { margin: 2mm 0 0; color: var(--ink-soft); font-size: 10.5pt; }
    section { margin-top: 5mm; }
    h2 { margin: 0 0 2.2mm; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text); break-after: avoid; }
    .t-serif { font-family: var(--serif); }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 0.25mm solid var(--rule); border-radius: 2.5mm; overflow: hidden; font-size: 9.5pt; line-height: 1.4; break-inside: avoid; }
    th, td { padding: 1.8mm 2.6mm; text-align: left; vertical-align: top; border-bottom: 0.25mm solid var(--rule); }
    tr:last-child td { border-bottom: 0; }
    th { background: var(--soft); color: var(--ink); font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    footer.foot { margin-top: 6mm; padding-top: 2.5mm; border-top: 0.3mm solid var(--rule); display: flex; justify-content: space-between; font-size: 8pt; color: var(--ink-soft); }
    ${opts.page === false ? '' : `@media screen { body { background: #f1f5f9; } main { width: 210mm; min-height: 297mm; margin: 6mm auto; padding: ${margin}; background: #fff; border-radius: 4mm; box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12); } }
    @media screen and (max-width: 220mm) { main { width: auto; min-height: 0; margin: 0; border-radius: 0; padding: 6mm 5mm; } }`}`
}

/** The stripe and the bar over the page: the logo with what the page is ("Diloloji · Rehber"), and on the right the date. */
export function printTop(origin: string, label: string, right: string): string {
  return `<div class="stripe" aria-hidden="true"><i></i><i></i><i></i></div>`
    + `<div class="top"><span class="brand">${origin ? `<img src="${origin}/favicon.svg" alt="">` : ''}${esc(label)}</span><span>${esc(right)}</span></div>`
}

export const printFoot = (left: string, right: string) => `<footer class="foot"><span>${esc(left)}</span><span>${esc(right)}</span></footer>`

/** A whole page: head with title and styles, body as given. */
export function printPage(title: string, css: string, body: string): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Diloloji</title><style>${css}</style></head><body>${body}</body></html>`
}
