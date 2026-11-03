import type { TopicLesson } from '../data/guide/lessonTypes'
import { esc, printBase, printFoot, printOrigin, printPage, printTop } from '../data/printSheet'
import { LANGUAGE_NAME } from './labels'

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

const CSS = `
    ol.rules { list-style: none; margin: 0; padding: 0; display: grid; gap: 2mm; counter-reset: r; }
    ol.rules li { counter-increment: r; position: relative; padding: 2.4mm 3mm 2.4mm 10.5mm; border: 0.25mm solid var(--rule); border-radius: 2.5mm; background: var(--box); break-inside: avoid; }
    ol.rules li::before { content: counter(r); position: absolute; left: 2.8mm; top: 2.4mm; width: 5.2mm; height: 5.2mm; border-radius: 50%; background: var(--lang); color: var(--on); font-size: 7.5pt; font-weight: 700; line-height: 5.2mm; text-align: center; }
    code { font: 600 0.92em 'Lexend', system-ui, sans-serif; padding: 0.1mm 1.2mm; border-radius: 1mm; background: var(--soft); color: var(--text); }
    td:first-child { font-weight: 700; }
    ul.ex { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
    ul.ex li { display: grid; gap: 0.6mm; padding: 2.2mm 3mm; border: 0.25mm solid var(--rule); border-left: 1.1mm solid var(--lang); border-radius: 2.5mm; background: var(--box); break-inside: avoid; }
    ul.ex .t { font: 400 11.5pt/1.35 var(--serif); }
    ul.ex .tr { font-size: 9pt; color: var(--ink-soft); }
    .watch { padding: 2.6mm 3.5mm; border: 0.25mm solid #fed7aa; border-left: 1.1mm solid #f97316; border-radius: 2.5mm; background: #fff7ed; break-inside: avoid; }
    .watch h2 { color: #c2410c; }
    .watch ul { margin: 0; padding-left: 4.5mm; display: grid; gap: 1.2mm; }
    .tip { padding: 2.6mm 3.5mm; border-radius: 2.5mm; background: var(--soft); break-inside: avoid; }
    .tip b { color: var(--text); }
    .note { padding: 2.6mm 3.5mm; border: 0.3mm dashed var(--ink-soft); border-radius: 2.5mm; white-space: pre-wrap; break-inside: avoid; }
    @media screen and (max-width: 220mm) { ul.ex { grid-template-columns: 1fr; } }`

/**
 * A lesson as an A4 page to print or save as a PDF (a cheat sheet), in the app's own look (data/printSheet.ts): the rules
 * as numbered cards, the examples in Literata with their Turkish, the warnings in a box, without the app around it.
 */
export function lessonSheetHtml(lesson: TopicLesson, title: string, now = new Date(), note?: string, origin = printOrigin()): string {
  const rules = lesson.rules.map((r) => `<li>${ruleHtml(r)}</li>`).join('')
  const table = lesson.table
    ? `<section><h2>${esc(lesson.table.caption || 'Özet tablo')}</h2><table><thead><tr>${lesson.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${lesson.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`
    : ''
  const examples = lesson.examples.map((x) => `<li><span class="t" lang="${lesson.language}">${esc(x.text)}</span><span class="tr">${esc(x.tr)}</span></li>`).join('')
  const watch = lesson.watch.map((w) => `<li>${esc(w)}</li>`).join('')
  const cleanNote = note?.trim()
  const language = LANGUAGE_NAME[lesson.language]
  return printPage(
    title,
    printBase(lesson.language, origin) + CSS,
    `<main>${printTop(origin, 'Diloloji · Rehber', now.toLocaleDateString('tr-TR'))}`
      + `<header class="head"><div class="chips"><span class="chip">${esc(lesson.level)}</span><span class="chip">${esc(language)}</span></div><h1>${esc(title)}</h1><p class="sum">${esc(lesson.summary)}</p></header>`
      + `<section><h2>Kurallar</h2><ol class="rules">${rules}</ol></section>`
      + table
      + (examples ? `<section><h2>Örnekler</h2><ul class="ex">${examples}</ul></section>` : '')
      + (watch ? `<section class="watch"><h2>Dikkat</h2><ul>${watch}</ul></section>` : '')
      + (lesson.tip ? `<section class="tip"><b>İpucu:</b> ${esc(lesson.tip)}</section>` : '')
      + (cleanNote ? `<section><h2>Kendi notun</h2><div class="note">${esc(cleanNote)}</div></section>` : '')
      + `${printFoot('diloloji.com', `${language} · ${lesson.level}`)}</main>`,
  )
}
