import { workbook } from './xlsx'
import { esc, printBase, printFoot, printOrigin, printPage, PRINT_LANGUAGE as LANGUAGE_NAME, printTop } from './printSheet'
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
  const origin = printOrigin()
  const date = new Date().toLocaleDateString('tr-TR')
  return printPage(
    title,
    printBase(language, origin, { margin: '14mm 14mm 15mm' }) + DICTIONARY_CSS,
    `<main>${printTop(origin, 'Diloloji · Sözlük', date)}<header class="head"><div class="chips"><span class="chip">${esc(LANGUAGE_NAME[language])}</span><span class="chip">${sorted.length} kelime</span></div><h1>${esc(title)}</h1></header>`
      + `<div class="dict">${body}</div>${printFoot('diloloji.com', `${LANGUAGE_NAME[language]} · ${sorted.length} kelime`)}</main>`,
  )
}

const DICTIONARY_CSS = `
    .dict { columns: 2; column-gap: 8mm; margin-top: 4mm; }
    .dict h2 { margin: 4mm 0 1.8mm; padding-bottom: 0.8mm; border-bottom: 0.4mm solid var(--lang); font-size: 13pt; letter-spacing: 0; text-transform: none; color: var(--text); break-after: avoid; }
    .dict h2:first-child { margin-top: 0; }
    .e { margin: 0 0 2.2mm; break-inside: avoid; font-size: 9.5pt; }
    .e > b { font: 400 11pt/1.3 var(--serif); color: var(--ink); }
    .ipa { color: var(--ink-soft); font-family: 'Charis SIL', 'Lucida Sans Unicode', serif; font-size: 9pt; }
    .d { font-style: italic; color: var(--ink-soft); }
    .x { font: 400 9.5pt/1.35 var(--serif); color: var(--ink); } .x span { font-family: 'Lexend', system-ui, sans-serif; font-size: 8.5pt; color: var(--ink-soft); }
    @media screen and (max-width: 220mm) { .dict { columns: 1; } }`

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
  const origin = printOrigin()
  return printPage(
    title,
    printBase(language, origin, { margin: '0', page: false }) + FLASHCARD_CSS,
    `<div class="note">${printTop(origin, 'Diloloji · Kartlar', `${entries.length} kart`)}<p>${esc(title)} · çift taraflı yazdırırken “uzun kenardan çevir” seç; her arka yüz kendi ön yüzünün arkasına düşer.</p></div>${sheets}`,
  )
}

const FLASHCARD_CSS = `
    .sheet { width: 210mm; height: 296mm; margin: 0; padding: 8mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); overflow: hidden; }
    .sheet + .sheet { break-before: page; }
    .c { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.5mm; padding: 7mm 6mm 6mm; border: 0.3mm dashed #cbd5e1; text-align: center; overflow: hidden; }
    .c::before { content: ''; position: absolute; top: 3mm; left: 50%; width: 10mm; height: 1mm; margin-left: -5mm; border-radius: 1mm; background: var(--lang); }
    .c.blank { border-style: dotted; border-color: #e2e8f0; }
    .c.blank::before { display: none; }
    .c b { font-size: 15pt; font-weight: 700; color: var(--ink); }
    .c b[lang] { font: 400 22pt/1.2 var(--serif); color: var(--text); }
    .ipa { color: var(--ink-soft); font-size: 10.5pt; font-family: 'Charis SIL', 'Lucida Sans Unicode', serif; }
    .x { font: 400 11pt/1.35 var(--serif); color: var(--ink); } .t { font-size: 9.5pt; color: var(--ink-soft); }
    .t b { font-size: inherit; color: var(--ink); }
    .note { width: 210mm; margin: 6mm auto 0; padding: 0 8mm; font-size: 9pt; color: var(--ink-soft); }
    .note p { margin: 0; }
    @media screen { body { background: #f1f5f9; } .sheet { margin: 6mm auto; background: #fff; border-radius: 4mm; box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12); } }
    @media print { .note { display: none; } }`

/**
 * Quizlet-ready text export: term <TAB> definition [<TAB> example].
 * Ready to paste into Quizlet's "Create / Import" text area or save as .txt.
 */
export function toQuizletText(entries: readonly VocabularyEntry[], options: { includeExample?: boolean } = {}): string {
  return entries
    .map((e) => {
      const sense = senseOf(e)
      const gloss = [sense.gloss, ...(sense.altGlosses ?? [])].join(', ')
      const term = displayForm(e)
      const ex = sense.examples[0]?.text?.replace(/\*/g, '').trim()
      if (options.includeExample && ex) {
        return `${term}\t${gloss}\t${ex}`
      }
      return `${term}\t${gloss}`
    })
    .join('\n')
}

/**
 * Memrise-ready TSV export: Word <TAB> Meaning <TAB> Part of Speech <TAB> Example.
 */
export function toMemriseTsv(entries: readonly VocabularyEntry[]): string {
  const header = 'Word\tMeaning\tPart of Speech\tExample'
  const rows = entries.map((e) => {
    const sense = senseOf(e)
    const gloss = [sense.gloss, ...(sense.altGlosses ?? [])].join(', ')
    const term = displayForm(e)
    const pos = e.partOfSpeech === 'other' ? '' : e.partOfSpeech
    const ex = sense.examples[0]?.text?.replace(/\*/g, '').trim() ?? ''
    return `${term}\t${gloss}\t${pos}\t${ex}`
  })
  return [header, ...rows].join('\n')
}

