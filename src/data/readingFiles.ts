import { docxToText } from './officeImport'

/**
 * PDF and Word files as reading texts. Word's own paragraphs are kept; a PDF only knows lines on a page,
 * so its lines are put back into paragraphs (`linesToParagraphs`). Long files become a book in parts.
 */

export class ReadingFileError extends Error {
  name = 'ReadingFileError'
}

/** A Word document's text, one paragraph per block (table cells side by side, as in the list importer). */
export function docxReadingText(bytes: Uint8Array): string {
  const text = docxToText(bytes)
    .split('\n')
    .map((l) => l.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
  if (!text) throw new ReadingFileError('Bu Word dosyasında okunacak metin bulunamadı.')
  return text
}

const ENDS_SENTENCE = /[.!?…:;»"”)\]]$/
/** A line made only of a number (a page number) or a running header repeated on many pages. */
const PAGE_NUMBER = /^[\s\-–—]*\d{1,4}[\s\-–—]*$/

/**
 * The lines of one or more PDF pages put back into paragraphs. A line ends a paragraph when the next one
 * is a gap (`''`), or when it closes a sentence and is clearly shorter than the page's usual line; a word
 * broken with a hyphen at the end of a line is joined again. Page numbers are dropped.
 */
export function linesToParagraphs(pages: string[][]): string {
  const paragraphs: string[] = []
  let current = ''
  const flush = () => {
    const p = current.replace(/\s+/g, ' ').trim()
    if (p) paragraphs.push(p)
    current = ''
  }
  for (const lines of pages) {
    const kept = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => !PAGE_NUMBER.test(l) || l === '')
    const lengths = kept.filter(Boolean).map((l) => l.length).sort((a, b) => a - b)
    // The usual full line of this page: most lines of running text are about this long.
    const full = lengths.length ? lengths[Math.floor(lengths.length * 0.75)] : 0
    for (const line of kept) {
      if (!line) {
        flush()
        continue
      }
      if (current.endsWith('-') && /^\p{Ll}/u.test(line)) current = current.slice(0, -1) + line
      else current = current ? `${current} ${line}` : line
      if (ENDS_SENTENCE.test(line) && line.length < full * 0.8) flush()
    }
    // A page break ends the paragraph only when its last line closed a sentence: text runs on to the next page.
    if (ENDS_SENTENCE.test(current)) flush()
  }
  flush()
  return paragraphs.join('\n\n')
}

interface PdfItem {
  str: string
  hasEOL?: boolean
  transform?: number[]
  height?: number
}

/** One page's text items as lines, with an empty line where the gap to the next line is wider than usual. */
export function itemsToLines(items: PdfItem[]): string[] {
  const lines: { text: string; y: number; h: number }[] = []
  let text = ''
  let y: number | undefined
  let h = 0
  const push = () => {
    if (text.trim()) lines.push({ text, y: y ?? 0, h })
    text = ''
    y = undefined
  }
  for (const item of items) {
    const itemY = item.transform?.[5]
    // A new baseline (more than half a line away) starts a new line even without an end-of-line mark.
    if (y !== undefined && itemY !== undefined && text && Math.abs(itemY - y) > Math.max(2, (item.height || h || 10) * 0.5)) push()
    if (y === undefined && itemY !== undefined) y = itemY
    if (item.height) h = Math.max(h, item.height)
    text += item.str
    if (item.hasEOL) push()
  }
  push()
  const gaps = lines.slice(1).map((l, i) => Math.abs(lines[i].y - l.y)).filter((g) => g > 0)
  const usual = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)] : 0
  const out: string[] = []
  lines.forEach((l, i) => {
    if (i > 0 && usual > 0 && Math.abs(lines[i - 1].y - l.y) > usual * 1.45) out.push('')
    out.push(l.text)
  })
  return out
}

/** The most pages read from one PDF: a long book is better added as EPUB. */
const MAX_PAGES = 400

/**
 * A PDF's text. pdf.js is loaded only here (it is large) and runs in its own worker. Its legacy build: the modern one
 * needs browser features older Safari versions lack (Promise.try), and a reading app is opened on older phones too.
 */
export async function pdfReadingText(bytes: Uint8Array): Promise<{ text: string; title?: string }> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  // Only the text is wanted: no fonts, no WebAssembly image decoders (the page's CSP has no wasm either).
  const task = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, useWasm: false, verbosity: 0 })
  let doc
  try {
    doc = await task.promise
  } catch (e) {
    throw new ReadingFileError(e instanceof Error && e.name === 'PasswordException' ? 'Bu PDF şifreli; şifresiz bir kopyasını dene.' : 'PDF dosyası açılamadı.')
  }
  try {
    const pages: string[][] = []
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      pages.push(itemsToLines(content.items.flatMap((i) => ('str' in i ? [{ str: i.str, hasEOL: i.hasEOL, transform: i.transform as number[], height: i.height }] : []))))
      page.cleanup()
    }
    const text = linesToParagraphs(pages)
    if (text.replace(/\s/g, '').length < 20) throw new ReadingFileError('Bu PDF’te seçilebilir metin yok (taranmış sayfalar olabilir). Sayfanın fotoğrafını “Fotoğraftan metin” ile ekleyebilirsin.')
    const meta = await doc.getMetadata().catch(() => null)
    const title = (meta?.info as { Title?: unknown } | undefined)?.Title
    return { text, title: typeof title === 'string' && title.trim() ? title.trim() : undefined }
  } finally {
    void task.destroy()
  }
}

/** About this many words make one part of a long file. */
export const PART_WORDS = 2500
/** A file longer than this becomes a book in parts instead of one text. */
export const BOOK_WORDS = 4000

/** A long text cut into parts at paragraph boundaries, each about `PART_WORDS` long. */
export function splitIntoParts(text: string, size = PART_WORDS): string[] {
  const parts: string[] = []
  let current: string[] = []
  let words = 0
  for (const p of text.split(/\n\s*\n/)) {
    const n = p.split(/\s+/).filter(Boolean).length
    if (words > 0 && words + n > size) {
      parts.push(current.join('\n\n'))
      current = []
      words = 0
    }
    current.push(p)
    words += n
  }
  if (current.length) parts.push(current.join('\n\n'))
  return parts
}

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length
