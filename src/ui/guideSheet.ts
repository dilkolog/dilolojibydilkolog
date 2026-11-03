import type { TopicLesson } from '../data/guide/lessonTypes'
import type { TargetLanguage } from '../engine/types'
import { LANGUAGE_NAME } from './labels'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The language's colours as in the app (index.css): the accent, its soft tint, text on white, and text on the accent. */
const COLOURS: Record<TargetLanguage, { lang: string; soft: string; text: string; on: string }> = {
  en: { lang: '#2f6de6', soft: '#e5f1ff', text: '#2b58b1', on: '#fff' },
  fr: { lang: '#c6317c', soft: '#ffe8f1', text: '#9a2f62', on: '#fff' },
  es: { lang: '#e6a313', soft: '#fceed9', text: '#844b00', on: '#451a03' },
}

/** The rule text's quoted pieces («…», `…`, '…') as code chips, the way the lesson shows them (Guide.tsx formatRuleText). */
function ruleHtml(text: string): string {
  const regex = /(?:«([^»]+)»|`([^`]+)`|(?:(?<=\s|^)'([^']+)'(?=[\s,.:;!?]|$)))/g
  let out = ''
  let last = 0
  for (const m of text.matchAll(regex)) {
    out += esc(text.slice(last, m.index)) + `<code>${esc(m[1] ?? m[2] ?? m[3])}</code>`
    last = m.index + m[0].length
  }
  return out + esc(text.slice(last))
}

const font = (origin: string, family: string, file: string, weight: number, range: string) =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;src:url(${origin}/fonts/${file}) format('woff2');unicode-range:${range}}`
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212'
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2C60-2C7F,U+A720-A7FF'

/**
 * A lesson as an A4 page to print or save as a PDF (a cheat sheet), in the app's own look (DESIGN.md): Lexend, the three
 * language colours as a thin stripe, the lesson's language as the accent, the rules as numbered cards, the examples in
 * Literata with their Turkish, the warnings in a box, without the app around it.
 */
export function lessonSheetHtml(lesson: TopicLesson, title: string, now = new Date(), note?: string, origin = typeof location === 'undefined' ? '' : location.origin): string {
  const c = COLOURS[lesson.language]
  const rules = lesson.rules.map((r) => `<li>${ruleHtml(r)}</li>`).join('')
  const table = lesson.table
    ? `<section><h2>${esc(lesson.table.caption || 'Özet tablo')}</h2><table><thead><tr>${lesson.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${lesson.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`
    : ''
  const examples = lesson.examples.map((x) => `<li><span class="t" lang="${lesson.language}">${esc(x.text)}</span><span class="tr">${esc(x.tr)}</span></li>`).join('')
  const watch = lesson.watch.map((w) => `<li>${esc(w)}</li>`).join('')
  const cleanNote = note?.trim()
  const fonts = origin
    ? [
        font(origin, 'Lexend', 'lexend-latin-400-normal.woff2', 400, LATIN),
        font(origin, 'Lexend', 'lexend-latin-ext-400-normal.woff2', 400, LATIN_EXT),
        font(origin, 'Lexend', 'lexend-latin-700-normal.woff2', 700, LATIN),
        font(origin, 'Lexend', 'lexend-latin-ext-700-normal.woff2', 700, LATIN_EXT),
        font(origin, 'Literata', 'literata-latin-400-normal.woff2', 400, LATIN),
        font(origin, 'Literata', 'literata-latin-ext-400-normal.woff2', 400, LATIN_EXT),
      ].join('')
    : ''
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Diloloji</title><style>${fonts}
    @page { size: A4; margin: 13mm 14mm 14mm; }
    :root { --lang: ${c.lang}; --soft: ${c.soft}; --text: ${c.text}; --on: ${c.on}; --ink: #0f172a; --ink-soft: #57677e; --rule: #e2e8f0; --box: #f8fafc; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font: 400 10.5pt/1.5 'Lexend', system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--ink); background: #fff; }
    .stripe { display: flex; height: 1.2mm; border-radius: 1mm; overflow: hidden; margin-bottom: 4mm; }
    .stripe i { flex: 1; } .stripe i:nth-child(1) { background: #2f6de6; } .stripe i:nth-child(2) { background: #c6317c; } .stripe i:nth-child(3) { background: #e6a313; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 4mm; font-size: 8.5pt; color: var(--ink-soft); margin-bottom: 5mm; }
    .brand { display: inline-flex; align-items: center; gap: 2mm; font-weight: 700; font-size: 10pt; color: var(--ink); }
    .brand img { width: 6mm; height: 6mm; border-radius: 1.5mm; }
    header { padding-bottom: 4mm; margin-bottom: 1mm; border-bottom: 0.3mm solid var(--rule); }
    .chips { display: flex; gap: 2mm; margin-bottom: 2mm; }
    .chip { font-size: 8pt; font-weight: 700; padding: 0.6mm 2.4mm; border-radius: 10mm; background: var(--soft); color: var(--text); }
    h1 { margin: 0; font-size: 21pt; line-height: 1.2; letter-spacing: -0.01em; }
    .sum { margin: 2mm 0 0; color: var(--ink-soft); font-size: 10.5pt; }
    section { margin-top: 5mm; }
    h2 { margin: 0 0 2.2mm; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text); break-after: avoid; }
    ol.rules { list-style: none; margin: 0; padding: 0; display: grid; gap: 2mm; counter-reset: r; }
    ol.rules li { counter-increment: r; position: relative; padding: 2.4mm 3mm 2.4mm 10.5mm; border: 0.25mm solid var(--rule); border-radius: 2.5mm; background: var(--box); break-inside: avoid; }
    ol.rules li::before { content: counter(r); position: absolute; left: 2.8mm; top: 2.4mm; width: 5.2mm; height: 5.2mm; border-radius: 50%; background: var(--lang); color: var(--on); font-size: 7.5pt; font-weight: 700; line-height: 5.2mm; text-align: center; }
    code { font: 600 0.92em 'Lexend', system-ui, sans-serif; padding: 0.1mm 1.2mm; border-radius: 1mm; background: var(--soft); color: var(--text); }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 0.25mm solid var(--rule); border-radius: 2.5mm; overflow: hidden; font-size: 9.5pt; line-height: 1.4; break-inside: avoid; }
    th, td { padding: 1.8mm 2.6mm; text-align: left; vertical-align: top; border-bottom: 0.25mm solid var(--rule); }
    tr:last-child td { border-bottom: 0; }
    th { background: var(--soft); color: var(--ink); font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    td:first-child { font-weight: 700; }
    ul.ex { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
    ul.ex li { display: grid; gap: 0.6mm; padding: 2.2mm 3mm; border: 0.25mm solid var(--rule); border-left: 1.1mm solid var(--lang); border-radius: 2.5mm; background: var(--box); break-inside: avoid; }
    ul.ex .t { font: 400 11.5pt/1.35 'Literata', Georgia, serif; }
    ul.ex .tr { font-size: 9pt; color: var(--ink-soft); }
    .watch { padding: 2.6mm 3.5mm; border: 0.25mm solid #fed7aa; border-left: 1.1mm solid #f97316; border-radius: 2.5mm; background: #fff7ed; break-inside: avoid; }
    .watch h2 { color: #c2410c; }
    .watch ul { margin: 0; padding-left: 4.5mm; display: grid; gap: 1.2mm; }
    .tip { padding: 2.6mm 3.5mm; border-radius: 2.5mm; background: var(--soft); break-inside: avoid; }
    .tip b { color: var(--text); }
    .note { padding: 2.6mm 3.5mm; border: 0.3mm dashed var(--ink-soft); border-radius: 2.5mm; white-space: pre-wrap; break-inside: avoid; }
    footer { margin-top: 6mm; padding-top: 2.5mm; border-top: 0.3mm solid var(--rule); display: flex; justify-content: space-between; font-size: 8pt; color: var(--ink-soft); }
    @media screen { body { background: #f1f5f9; } main { width: 210mm; min-height: 297mm; margin: 6mm auto; padding: 13mm 14mm 14mm; background: #fff; border-radius: 4mm; box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12); } }
    @media screen and (max-width: 220mm) { main { width: auto; min-height: 0; margin: 0; border-radius: 0; padding: 6mm 5mm; } ul.ex { grid-template-columns: 1fr; } }
  </style></head><body><main>`
    + `<div class="stripe" aria-hidden="true"><i></i><i></i><i></i></div>`
    + `<div class="top"><span class="brand">${origin ? `<img src="${origin}/favicon.svg" alt="">` : ''}Diloloji · Rehber</span><span>${esc(now.toLocaleDateString('tr-TR'))}</span></div>`
    + `<header><div class="chips"><span class="chip">${esc(lesson.level)}</span><span class="chip">${esc(LANGUAGE_NAME[lesson.language])}</span></div><h1>${esc(title)}</h1><p class="sum">${esc(lesson.summary)}</p></header>`
    + `<section><h2>Kurallar</h2><ol class="rules">${rules}</ol></section>`
    + table
    + (examples ? `<section><h2>Örnekler</h2><ul class="ex">${examples}</ul></section>` : '')
    + (watch ? `<section class="watch"><h2>Dikkat</h2><ul>${watch}</ul></section>` : '')
    + (lesson.tip ? `<section class="tip"><b>İpucu:</b> ${esc(lesson.tip)}</section>` : '')
    + (cleanNote ? `<section><h2>Kendi notun</h2><div class="note">${esc(cleanNote)}</div></section>` : '')
    + `<footer><span>diloloji.com</span><span>${esc(LANGUAGE_NAME[lesson.language])} · ${esc(lesson.level)}</span></footer></main></body></html>`
}
