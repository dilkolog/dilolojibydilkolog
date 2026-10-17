import type { TopicLesson } from '../data/guide/lessonTypes'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * A lesson as a clean A4 page to print or save as a PDF (a cheat sheet): its rules, examples with their Turkish and
 * warnings, without the app around it.
 */
export function lessonSheetHtml(lesson: TopicLesson, title: string, now = new Date(), note?: string): string {
  const rules = lesson.rules.map((r) => `<li>${esc(r)}</li>`).join('')
  const table = lesson.table
    ? `<h2>${esc(lesson.table.caption || 'Özet tablo')}</h2><table><thead><tr>${lesson.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${lesson.table.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : ''
  const examples = lesson.examples.map((x) => `<li><span lang="${lesson.language}">${esc(x.text)}</span><small>${esc(x.tr)}</small></li>`).join('')
  const watch = lesson.watch.map((w) => `<li>${esc(w)}</li>`).join('')
  const cleanNote = note?.trim()
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: A4; margin: 15mm 16mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 11pt/1.45 Georgia, 'Times New Roman', serif; color: #111; }
    header { border-bottom: 0.4mm solid #222; padding-bottom: 3mm; margin-bottom: 4mm; }
    h1 { margin: 0; font-size: 22pt; }
    .lv { font: 700 9pt system-ui, sans-serif; border: 0.3mm solid #444; border-radius: 1.2mm; padding: 0.4mm 1.6mm; margin-right: 2.5mm; vertical-align: middle; }
    .s { margin: 1.5mm 0 0; color: #333; }
    h2 { font: 700 10pt system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #444; margin: 5mm 0 2mm; break-after: avoid; }
    ol, ul { margin: 0; padding-left: 5mm; display: grid; gap: 1.4mm; }
    table { width: 100%; border-collapse: collapse; font: 9.5pt/1.35 system-ui, sans-serif; break-inside: avoid; }
    th, td { border: 0.25mm solid #bbb; padding: 1.5mm 2.2mm; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; font-weight: 700; }
    .ex { list-style: none; padding: 0; }
    .ex li { break-inside: avoid; border-left: 0.8mm solid #bbb; padding-left: 3mm; }
    .ex small { display: block; color: #555; font: 9.5pt system-ui, sans-serif; }
    .w { border: 0.3mm solid #888; border-radius: 1.5mm; padding: 2.5mm 3mm 2.5mm 7mm; break-inside: avoid; }
    .tip { margin-top: 4mm; font: 10pt system-ui, sans-serif; }
    .note-box { border: 0.3mm dashed #666; border-radius: 1.5mm; padding: 2.5mm 3mm; font: 10pt/1.4 system-ui, sans-serif; white-space: pre-wrap; break-inside: avoid; }
    footer { margin-top: 6mm; font: 8pt system-ui, sans-serif; color: #777; display: flex; justify-content: space-between; }
    @media screen { body { background: #eee; } main { width: 210mm; margin: 6mm auto; padding: 15mm; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.2); } }
  </style></head><body><main><header><h1><span class="lv">${esc(lesson.level)}</span>${esc(title)}</h1><p class="s">${esc(lesson.summary)}</p></header>`
    + `<h2>Kurallar</h2><ol>${rules}</ol>`
    + table
    + (examples ? `<h2>Örnekler</h2><ul class="ex">${examples}</ul>` : '')
    + (watch ? `<h2>Dikkat</h2><ul class="w">${watch}</ul>` : '')
    + (lesson.tip ? `<p class="tip"><b>İpucu:</b> ${esc(lesson.tip)}</p>` : '')
    + (cleanNote ? `<h2>Kendi notun</h2><div class="note-box">${esc(cleanNote)}</div>` : '')
    + `<footer><span>Diloloji · Rehber</span><span>${esc(now.toLocaleDateString('tr-TR'))}</span></footer></main></body></html>`
}

