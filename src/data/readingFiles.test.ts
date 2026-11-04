// @vitest-environment node
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'

// In the browser Vite serves the worker from the build; here it is loaded straight from the package.
vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url', () => ({ default: new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href }))
import { docxReadingText, itemsToLines, linesToParagraphs, pdfReadingText, splitIntoParts, wordCount } from './readingFiles'

/** A small one-page PDF with the given lines (Helvetica, 14 pt apart; `null` leaves a wider gap). */
function pdf(lines: (string | null)[], title?: string): Uint8Array {
  let y = 750
  const ops: string[] = ['BT', '/F1 12 Tf']
  for (const line of lines) {
    if (line === null) {
      y -= 14
      continue
    }
    ops.push(`1 0 0 1 72 ${y} Tm (${line.replace(/[()\\]/g, (c) => `\\${c}`)}) Tj`)
    y -= 14
  }
  ops.push('ET')
  const stream = ops.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Title (${title ?? ''}) >>`,
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${title ? ' /Info 6 0 R' : ''} >>\nstartxref\n${xref}\n%%EOF`
  return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff)
}

const docx = (body: string) =>
  zipSync({ 'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${body}</w:body></w:document>`) })
const para = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`

describe('Word files for reading', () => {
  it('keeps each paragraph and leaves out empty ones', () => {
    expect(docxReadingText(docx(para('Il était une fois un roi.') + '<w:p/>' + para('Il avait trois filles.')))).toBe('Il était une fois un roi.\n\nIl avait trois filles.')
  })
  it('says when there is nothing to read', () => {
    expect(() => docxReadingText(docx('<w:p/>'))).toThrow(/okunacak metin/)
  })
})

describe('PDF lines back into paragraphs', () => {
  it('joins the lines of a paragraph and ends it at a short closing line', () => {
    const page = ['Le petit prince habitait une planète à peine plus', 'grande que lui, et il avait besoin d’un ami pour', 'parler.', 'Un jour, il partit voyager parmi les étoiles et les', 'planètes voisines.']
    expect(linesToParagraphs([page])).toBe('Le petit prince habitait une planète à peine plus grande que lui, et il avait besoin d’un ami pour parler.\n\nUn jour, il partit voyager parmi les étoiles et les planètes voisines.')
  })
  it('mends a word broken at the end of a line, drops page numbers and runs on across pages', () => {
    expect(linesToParagraphs([['Une très longue phrase qui conti-', 'nue sur la ligne suivante et', '12'], ['encore sur la page suivante.']])).toBe('Une très longue phrase qui continue sur la ligne suivante et encore sur la page suivante.')
  })
  it('a wider gap between lines starts a new paragraph', () => {
    const items = [
      { str: 'Première ligne', hasEOL: true, transform: [1, 0, 0, 1, 72, 700], height: 12 },
      { str: 'deuxième ligne', hasEOL: true, transform: [1, 0, 0, 1, 72, 686], height: 12 },
      { str: 'Nouveau paragraphe', hasEOL: true, transform: [1, 0, 0, 1, 72, 658], height: 12 },
    ]
    expect(itemsToLines(items)).toEqual(['Première ligne', 'deuxième ligne', '', 'Nouveau paragraphe'])
  })
})

describe('reading a PDF', () => {
  it('brings back its text in paragraphs, and its title', async () => {
    const got = await pdfReadingText(pdf(['Le chat dort sur le canape depuis le matin et ne', 'veut pas se lever.', null, 'Dehors, il pleut sans arret.'], 'Le chat'))
    expect(got.title).toBe('Le chat')
    expect(got.text).toBe('Le chat dort sur le canape depuis le matin et ne veut pas se lever.\n\nDehors, il pleut sans arret.')
  })
  it('says so when a PDF has no text (a scan)', async () => {
    await expect(pdfReadingText(pdf([]))).rejects.toThrow(/seçilebilir metin yok/)
  })
  it('says so when the file is not a PDF', async () => {
    await expect(pdfReadingText(strToU8('pas un pdf'))).rejects.toThrow(/açılamadı/)
  })
})

describe('a long file in parts', () => {
  it('cuts at paragraphs, each part about the size asked', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragraphe ${i} ${'mot '.repeat(48)}`.trim()).join('\n\n')
    const parts = splitIntoParts(text, 120)
    expect(parts.length).toBe(5)
    expect(parts.every((p) => wordCount(p) <= 120)).toBe(true)
    expect(parts.join('\n\n')).toBe(text)
  })
})
