import { strToU8, zipSync } from 'fflate'
import { displayForm } from '../engine/exercises'
import { masteryStage } from '../engine/mastery'
import { nextReviewAt } from '../engine/review'
import { timeOf, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'

/**
 * The word list outside the app: a CSV for spreadsheets and a printable dictionary (the
 * browser's print dialog saves it as PDF).
 */

const STAGE: Record<string, string> = {
  introduced: 'Tohum',
  familiar: 'Filiz',
  recallable: 'Fide',
  strong: 'Genç bitki',
  production_ready: 'Tomurcuk',
  mastered: 'Çiçek',
}
const LANG: Record<TargetLanguage, string> = { en: 'İngilizce', fr: 'Fransızca', es: 'İspanyolca' }

/** A date read defensively (data from a backup or another device may hold a string, a Date or something else). */
const day = (d?: unknown) => {
  const t = timeOf(d)
  return t ? new Date(t).toISOString().slice(0, 10) : ''
}

/** A word without a meaning (an edit or an import gone wrong) must not stop the whole export. */
const senseOf = (e: VocabularyEntry) => e.senses[0] ?? { id: '', gloss: '', examples: [] }

/** The sheet's columns, in order. */
const HEAD = ['Dil', 'Kelime', 'Artikel', 'Tür', 'Anlam', 'Diğer anlamlar', 'Tanım', 'IPA', 'Örnek', 'Örnek çevirisi', 'Kalıplar', 'Etiketler', 'Not', 'Aşama', 'Sıradaki tekrar', 'Eklenme']

/** The next review, or nothing when the card's date is unreadable. */
const safeNextReview = (s: UserWordState) => {
  try {
    return nextReviewAt(s)
  } catch {
    return undefined
  }
}

/** Header and one row per word: what both the CSV and the Excel file hold. */
function listRows(entries: readonly VocabularyEntry[], states: readonly UserWordState[]): string[][] {
  const byId = new Map(states.map((s) => [s.entryId, s]))
  const rows = entries.map((e) => {
    const s = byId.get(e.id)
    const sense = senseOf(e)
    const ex = sense.examples[0]
    return [
      LANG[e.language],
      e.lemma,
      e.article ?? '',
      e.partOfSpeech === 'other' ? '' : e.partOfSpeech,
      sense.gloss,
      (sense.altGlosses ?? []).join(', '),
      sense.definition ?? '',
      e.ipa ?? '',
      ex?.text ?? '',
      ex?.translation ?? '',
      e.collocations.map((c) => (c.translation ? `${c.phrase} = ${c.translation}` : c.phrase)).join(' | '),
      e.tags.join(', '),
      e.notes ?? '',
      s ? STAGE[masteryStage(s)] : 'Başlanmadı',
      s ? day(safeNextReview(s)) : '',
      day(e.addedAt),
    ]
  })
  return [HEAD, ...rows]
}

/**
 * Comma-separated with a byte-order mark so accents open correctly. A comma is what spreadsheets
 * expect unless the computer's region uses a decimal comma (then Excel wants a semicolon, which is
 * why the Excel file below is the safer choice there).
 */
export function toCsv(entries: readonly VocabularyEntry[], states: readonly UserWordState[], separator = ','): string {
  // A cell that begins with = + - @ (or a tab) is read as a formula by spreadsheets: a word or meaning that came from an
  // import, the web or the AI must not run as one, so it gets a leading apostrophe (shown as text).
  const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v)
  const cell = (raw: string) => {
    const v = safe(raw)
    return v.includes(separator) || /["\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
  return '\uFEFF' + listRows(entries, states).map((r) => r.map(cell).join(separator)).join('\r\n')
}

/** Characters XML cannot hold are left out. */
const xmlText = (v: string) =>
  v
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const columnName = (i: number) => String.fromCharCode(65 + i)

/**
 * The list as a real Excel workbook (.xlsx): opens in Excel, Numbers, Google Sheets and
 * LibreOffice with every accent in place and one word per row, whatever the computer's region
 * (a CSV depends on its separator). A bold, frozen header row and sensible column widths.
 */
export function toXlsx(entries: readonly VocabularyEntry[], states: readonly UserWordState[]): Uint8Array {
  const rows = listRows(entries, states)
  const sheetRows = rows
    .map((r, y) => `<row r="${y + 1}">${r.map((v, x) => (v === '' ? '' : `<c r="${columnName(x)}${y + 1}" t="inlineStr"${y === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlText(v)}</t></is></c>`)).join('')}</row>`)
    .join('')
  const widths = [11, 18, 8, 10, 24, 22, 40, 16, 40, 32, 30, 18, 24, 12, 14, 12]
  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${sheetRows}</sheetData></worksheet>`
  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
    '</styleSheet>'
  const files = {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Kelimeler" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': styles,
    'xl/worksheets/sheet1.xml': sheet,
  }
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, xml]) => [name, strToU8(xml)])))
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A two-column, alphabetical dictionary page ready to print. */
export function dictionaryHtml(entries: readonly VocabularyEntry[], language: TargetLanguage, title: string): string {
  const sorted = [...entries].sort((a, b) => a.lemma.localeCompare(b.lemma, language))
  let letter = ''
  const body = sorted
    .map((e) => {
      const first = e.lemma.charAt(0).toLocaleUpperCase(language).normalize('NFD').charAt(0)
      const head = first !== letter ? `<h2>${esc((letter = first))}</h2>` : ''
      const sense = senseOf(e)
      const ex = sense.examples[0] ?? e.corpus?.find((x) => x.translation)
      return `${head}<div class="e"><b lang="${language}">${esc(displayForm(e))}</b>${e.ipa ? ` <span class="ipa">${esc(e.ipa)}</span>` : ''} — ${esc([sense.gloss, ...(sense.altGlosses ?? [])].join(', '))}${
        sense.definition ? `<div class="d" lang="${language}">${esc(sense.definition)}</div>` : ''
      }${ex ? `<div class="x" lang="${language}">${esc(ex.text.replace(/\*/g, ''))}${ex.translation ? ` <span>— ${esc(ex.translation)}</span>` : ''}</div>` : ''}</div>`
    })
    .join('')
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { margin: 16mm 14mm; }
    body { font: 10.5pt/1.45 Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
    header { margin-bottom: 8mm; } header h1 { font-size: 20pt; margin: 0; } header p { margin: 2mm 0 0; color: #555; font: 9pt system-ui, sans-serif; }
    main { columns: 2; column-gap: 8mm; }
    h2 { font: 700 13pt system-ui, sans-serif; margin: 4mm 0 1.5mm; border-bottom: 1px solid #999; break-after: avoid; }
    .e { margin: 0 0 2.2mm; break-inside: avoid; }
    .ipa { color: #555; font-family: 'Charis SIL', 'Lucida Sans Unicode', serif; }
    .d { font-style: italic; color: #333; } .x { color: #333; font-size: 9.5pt; } .x span { color: #666; }
    @media screen { body { max-width: 190mm; margin: 10mm auto; padding: 0 6mm; } }
  </style></head><body><header><h1>${esc(title)}</h1><p>${sorted.length} kelime · Diloloji · ${new Date().toLocaleDateString('tr-TR')}</p></header><main>${body}</main></body></html>`
}
