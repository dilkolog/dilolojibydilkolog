// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { EpubError, parseEpub, splitLong } from './epub'

const para = (n: number, w = 'mot') => Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ')
const xhtml = (body: string) => `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head><body>${body}</body></html>`

function epub(files: Record<string, string>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])))
}

const BOOK = {
  mimetype: 'application/epub+zip',
  'META-INF/container.xml': `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  'OEBPS/content.opf': `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Le Petit Livre</dc:title><dc:language>fr-FR</dc:language></metadata>
    <manifest><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="text/ch%201.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/><item id="css" href="s.css" media-type="text/css"/></manifest>
    <spine><itemref idref="cover"/><itemref idref="c2"/><itemref idref="c1"/></spine></package>`,
  'OEBPS/cover.xhtml': xhtml('<p>Couverture</p>'),
  'OEBPS/text/ch 1.xhtml': xhtml(`<h1>Le départ</h1><div><p>${para(60)}</p><p>${para(60, 'mer')}</p></div><script>alert(1)</script>`),
  'OEBPS/text/ch2.xhtml': xhtml(`<h2>Avant</h2><blockquote><p>${para(100, 'nuit')}</p></blockquote>`),
}

describe('EPUB import', () => {
  it('reads chapters in spine order with titles, skipping short pages and scripts', () => {
    const book = parseEpub(epub(BOOK))
    expect(book.title).toBe('Le Petit Livre')
    expect(book.language).toBe('fr')
    expect(book.chapters.map((c) => c.title)).toEqual(['Avant', 'Le départ'])
    expect(book.chapters[1].text.split('\n\n')).toHaveLength(3)
    expect(book.chapters[1].text).not.toContain('alert')
    // A nested paragraph is not read twice.
    expect(book.chapters[0].text.match(/nuit0 /g)).toHaveLength(1)
  })

  it('splits very long chapters at paragraph boundaries', () => {
    const text = Array.from({ length: 30 }, () => para(500)).join('\n\n')
    const parts = splitLong(text)
    expect(parts.length).toBe(4)
    expect(parts.join('\n\n')).toBe(text)
  })

  it('explains what is wrong with a bad file', () => {
    expect(() => parseEpub(new Uint8Array([1, 2, 3]))).toThrow(EpubError)
    expect(() => parseEpub(epub({ mimetype: 'x' }))).toThrow('içindekiler')
  })
})
