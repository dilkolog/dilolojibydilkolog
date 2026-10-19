import { strFromU8, unzipSync } from 'fflate'
import { apkgToText } from './ankiImport'

/**
 * Word lists from Excel (.xlsx) and Word (.docx) files, as the tab-separated text the list importer
 * already reads: a row of cells becomes a line, a Word table row the same, a Word paragraph a line.
 * Google Sheets and Docs give these formats too (File → Download), so one reader covers all four.
 */

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

/** The text of every <t …>…</t> in a piece of XML, joined (a rich-text cell is several runs). */
const texts = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => decode(m[1])).join('')

/** "C" → 2, "AA" → 26. */
const columnIndex = (letters: string) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

export function xlsxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes)
  const get = (name: string) => (files[name] ? strFromU8(files[name]) : undefined)
  const sheetName = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0]
  const sheet = sheetName && get(sheetName)
  if (!sheet) throw new Error('Excel dosyasında sayfa bulunamadı.')
  const shared = [...(get('xl/sharedStrings.xml') ?? '').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1], 't'))
  const lines: string[] = []
  for (const row of sheet.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = []
    for (const c of row[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1]
      const type = /\bt="(\w+)"/.exec(attrs)?.[1]
      const body = c[2] ?? ''
      const raw = type === 'inlineStr' ? texts(body, 't') : decode(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '')
      const value = type === 's' ? (shared[Number(raw)] ?? '') : raw
      const at = ref ? columnIndex(ref) : cells.length
      while (cells.length < at) cells.push('')
      cells[at] = value.replace(/[\t\r\n]+/g, ' ')
    }
    while (cells.length && cells[cells.length - 1] === '') cells.pop()
    lines.push(cells.join('\t'))
  }
  return lines.join('\n').trimEnd()
}

/** A paragraph's text: runs, tabs as tabs, line breaks as spaces. */
const paragraph = (xml: string) =>
  decode([...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g)].map((m) => (m[1] !== undefined ? m[1] : m[0].startsWith('<w:tab') ? '\t' : ' ')).join(''))

export function docxToText(bytes: Uint8Array): string {
  const doc = unzipSync(bytes)['word/document.xml']
  if (!doc) throw new Error('Word dosyasında metin bulunamadı.')
  const xml = strFromU8(doc)
  const lines: string[] = []
  for (const block of xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >/][\s\S]*?<\/w:p>/g)) {
    if (block[0].startsWith('<w:tbl>')) {
      for (const row of block[0].matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
        const cells = [...row[0].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((c) => [...c[1].matchAll(/<w:p[ >/][\s\S]*?<\/w:p>/g)].map((p) => paragraph(p[0]).trim()).filter(Boolean).join(' '))
        lines.push(cells.join('\t'))
      }
    } else lines.push(paragraph(block[0]))
  }
  return lines.join('\n').trimEnd()
}

/** The text of a list file: Excel, Word and Anki packages are read as above, anything else as plain text. */
export async function listFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) return xlsxToText(new Uint8Array(await file.arrayBuffer()))
  if (name.endsWith('.docx')) return docxToText(new Uint8Array(await file.arrayBuffer()))
  if (name.endsWith('.apkg')) return apkgToText(new Uint8Array(await file.arrayBuffer()))
  return file.text()
}
