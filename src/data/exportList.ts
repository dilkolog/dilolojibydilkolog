import { workbook } from './xlsx'
import { richHtml } from '../engine/richText'
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
export function listRows(entries: readonly VocabularyEntry[], states: readonly UserWordState[]): string[][] {
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

/**
 * The list as a real Excel workbook (.xlsx): opens in Excel, Numbers, Google Sheets and
 * LibreOffice with every accent in place and one word per row, whatever the computer's region
 * (a CSV depends on its separator). A bold, frozen header row and sensible column widths.
 */
export function toXlsx(entries: readonly VocabularyEntry[], states: readonly UserWordState[]): Uint8Array {
  return workbook([{ name: 'Kelimeler', rows: listRows(entries, states), widths: LIST_WIDTHS }])
}

/** Column widths of the word list, in characters. */
export const LIST_WIDTHS = [11, 18, 8, 10, 24, 22, 40, 16, 40, 32, 30, 18, 24, 12, 14, 12]

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

/** Cards per sheet: 2 across, 4 down. */
export const CARDS_PER_SHEET = 8

/**
 * Flashcards to print and cut: a sheet of fronts (the word) and behind it a sheet of backs (the meaning,
 * its sentence). The backs are in mirrored order within each row, so printed on both sides of one
 * sheet (flip on the long edge) every back lands behind its own front.
 */
export function flashcardsHtml(entries: readonly VocabularyEntry[], language: TargetLanguage, title: string): string {
  const front = (e: VocabularyEntry) =>
    `<div class="c"><b lang="${language}">${esc(displayForm(e))}</b>${e.ipa ? `<span class="ipa">${esc(e.ipa)}</span>` : ''}</div>`
  const back = (e: VocabularyEntry) => {
    const sense = senseOf(e)
    const ex = sense.examples[0] ?? e.corpus?.find((x) => x.translation)
    return `<div class="c"><b>${esc([sense.gloss, ...(sense.altGlosses ?? [])].join(', '))}</b>${
      ex ? `<span class="x" lang="${language}">${esc(ex.text.replace(/\*/g, ''))}</span>${ex.translation ? `<span class="t">${esc(ex.translation)}</span>` : ''}` : ''
    }${e.notes ? `<span class="t">${richHtml(e.notes)}</span>` : ''}${(e.extras ?? []).map((x) => `<span class="t"><b>${esc(x.label)}:</b> ${richHtml(x.text)}</span>`).join('')}</div>`
  }
  const empty = '<div class="c blank"></div>'
  let sheets = ''
  for (let i = 0; i < entries.length; i += CARDS_PER_SHEET) {
    const group = entries.slice(i, i + CARDS_PER_SHEET)
    const cells = Array.from({ length: CARDS_PER_SHEET }, (_, k) => group[k])
    const mirrored = cells.flatMap((_, k) => (k % 2 === 0 ? [cells[k + 1], cells[k]] : []))
    sheets += `<section class="sheet">${cells.map((e) => (e ? front(e) : empty)).join('')}</section>`
    sheets += `<section class="sheet">${mirrored.map((e) => (e ? back(e) : empty)).join('')}</section>`
  }
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: A4; margin: 0; }
    body { margin: 0; font: 14pt/1.35 Georgia, 'Times New Roman', serif; color: #111; }
    .sheet { box-sizing: border-box; width: 210mm; height: 297mm; padding: 8mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); break-after: page; }
    .c { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3mm; padding: 6mm; border: 0.3mm dashed #999; text-align: center; overflow: hidden; }
    .c.blank { border-style: dotted; border-color: #ddd; }
    .c b { font-size: 20pt; font-weight: 600; }
    .ipa { color: #555; font-size: 11pt; font-family: 'Charis SIL', 'Lucida Sans Unicode', serif; }
    .x { font-size: 11pt; } .t { font-size: 10pt; color: #555; }
    .note { font: 9pt system-ui, sans-serif; color: #666; padding: 4mm 8mm 0; }
    @media screen { body { background: #eee; } .sheet { margin: 6mm auto; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.2); } }
    @media print { .note { display: none; } }
  </style></head><body><p class="note">${esc(title)} · ${entries.length} kart · çift taraflı yazdırırken “uzun kenardan çevir” seç; her arka yüz kendi ön yüzünün arkasına düşer.</p>${sheets}</body></html>`
}
