import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { docxToText, xlsxToText } from './officeImport'
import { toXlsx } from './exportList'
import { createEntry } from './wordInput'

const zip = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([n, x]) => [n, strToU8(x)])))
const NOW = new Date('2026-10-02T10:00:00Z')

describe('reading Excel files', () => {
  it('reads what the app writes itself, headings and all', () => {
    const text = xlsxToText(toXlsx([createEntry({ word: 'la maison', meaning: 'ev, yuva' }, 'fr', NOW), createEntry({ word: "l'arbre", meaning: 'ağaç' }, 'fr', NOW)], []))
    const lines = text.split('\n')
    expect(lines[0].split('\t').slice(0, 3)).toEqual(['Dil', 'Kelime', 'Artikel'])
    expect(lines[1]).toContain('maison\tla')
    expect(lines[1]).toContain('ev\tyuva')
    expect(lines[2]).toContain("arbre\tl'")
  })

  it("reads Excel's own layout: shared strings, numbers, empty cells in the middle, rich text, entities", () => {
    const text = xlsxToText(
      zip({
        'xl/sharedStrings.xml': '<sst><si><t>maison</t></si><si><r><t>le </t></r><r><t>chat</t></r></si><si><t>Tom &amp; Jerry</t></si><si><t>ev</t></si></sst>',
        'xl/worksheets/sheet1.xml':
          '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>3</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>42</v></c></row><row r="3"><c r="B3" t="s"><v>2</v></c></row><row r="4"/></sheetData></worksheet>',
      }),
    )
    expect(text).toBe('maison\t\tev\nle chat\t42\n\tTom & Jerry')
  })

  it('says so when there is no sheet', () => {
    expect(() => xlsxToText(zip({ 'a.txt': 'x' }))).toThrow(/sayfa/)
  })
})

describe('reading Word files', () => {
  const doc = (body: string) => zip({ 'word/document.xml': `<w:document><w:body>${body}</w:body></w:document>` })
  const p = (t: string) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`

  it('a table row is a line of tab-separated cells; a paragraph is a line', () => {
    const text = docxToText(doc(p('Kelimelerim') + '<w:tbl><w:tr><w:tc>' + p('la maison') + '</w:tc><w:tc>' + p('ev') + p('yuva') + '</w:tc></w:tr><w:tr><w:tc>' + p('le chat') + '</w:tc><w:tc>' + p('kedi') + '</w:tc></w:tr></w:tbl>' + p('chien - köpek')))
    expect(text).toBe('Kelimelerim\nla maison\tev yuva\nle chat\tkedi\nchien - köpek')
  })

  it('tabs inside a paragraph stay tabs, entities are decoded, runs are joined', () => {
    const text = docxToText(doc('<w:p><w:r><w:t>manger</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>yemek &amp; içmek</w:t></w:r></w:p>'))
    expect(text).toBe('manger\tyemek & içmek')
  })

  it('says so when there is no text', () => {
    expect(() => docxToText(zip({ 'a.txt': 'x' }))).toThrow(/metin/)
  })
})
