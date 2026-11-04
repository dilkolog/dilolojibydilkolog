// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { KelimeDB } from '../data/db'
import { importDocument, importEpub, isYoutubeLink, pageText, textOfFile, youtubeText } from './readingImport'

const xhtml = (body: string) => `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head><body>${body}</body></html>`
const words = (n: number, w: string) => Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ')
const epubFile = (language: string) =>
  new File(
    [
      zipSync(
        Object.fromEntries(
          Object.entries({
            mimetype: 'application/epub+zip',
            'META-INF/container.xml': `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="c.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
            'c.opf': `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Le Livre</dc:title><dc:language>${language}</dc:language></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>`,
            'a.xhtml': xhtml(`<h1>Début</h1><p>${words(90, 'mot')}</p>`),
          }).map(([k, v]) => [k, strToU8(v)]),
        ),
      ),
    ],
    'livre.epub',
  )

afterEach(() => vi.unstubAllGlobals())

describe('a text from a file', () => {
  it('plain text is kept as it is, titled by the file name', () => {
    expect(textOfFile('mon_texte.v2.txt', 'Bonjour le monde.')).toEqual({ text: 'Bonjour le monde.', title: 'mon texte v2' })
  })

  it('subtitles lose their numbers and timings', () => {
    const srt = '1\n00:00:01,000 --> 00:00:03,000\nBonjour.\n\n2\n00:00:04,000 --> 00:00:06,000\nÇa va ?\n'
    const { text, title } = textOfFile('episode.srt', srt)
    expect(text).toContain('Bonjour.')
    expect(text).not.toContain('-->')
    expect(title).toBe('episode')
  })
})

describe('an EPUB', () => {
  it('goes in as one text a chapter, said in words', async () => {
    const db = new KelimeDB(`t-epub-${Math.random()}`)
    const got = await importEpub(db, epubFile('fr'), 'fr')
    expect(got.note).toEqual({ ok: true, text: 'Le Livre: 1 bölüm kütüphanene eklendi.' })
    expect(got.forThisLanguage).toBe(true)
    expect((await db.getLibrary('fr')).map((t) => t.title)).toEqual(['Début'])
  })

  it('a book in another language goes to that language’s library, and says so', async () => {
    const db = new KelimeDB(`t-epub-es-${Math.random()}`)
    const got = await importEpub(db, epubFile('es'), 'fr')
    expect(got.forThisLanguage).toBe(false)
    expect(got.note.text).toContain('İspanyolca')
    expect(await db.getLibrary('fr')).toEqual([])
    expect(await db.getLibrary('es')).toHaveLength(1)
  })

  it('a file that is no book is explained, and nothing is saved', async () => {
    const db = new KelimeDB(`t-epub-bad-${Math.random()}`)
    const got = await importEpub(db, new File(['not a zip'], 'x.epub'), 'fr')
    expect(got.note.ok).toBe(false)
    expect(got.note.text).toBeTruthy()
    expect(await db.texts.count()).toBe(0)
  })
})

describe('YouTube subtitles', () => {
  const answer = (status: number, body: unknown) => vi.stubGlobal('fetch', async () => Response.json(body, { status }))

  it('become a text with a link back to the video (not saved here)', async () => {
    answer(200, { id: 'abc123', title: 'Un jour', auto: true, text: 'Bonjour à tous.' })
    const got = await youtubeText(' https://youtu.be/abc123 ', 'fr')
    expect('item' in got && got.item).toMatchObject({ language: 'fr', title: 'Un jour (otomatik altyazı)', text: 'Bonjour à tous.', source: 'https://www.youtube.com/watch?v=abc123' })
  })

  it('say why there are none: no captions (and which exist), a link that is no video, approval', async () => {
    answer(404, { error: 'no captions', available: ['en', 'es'] })
    expect(await youtubeText('x', 'fr')).toEqual({ note: { ok: false, text: 'Bu videoda Fransızca altyazı yok (olanlar: en, es).' } })
    answer(400, { error: 'bad request' })
    expect(await youtubeText('x', 'fr')).toMatchObject({ note: { text: 'Bağlantı bir YouTube videosu gibi görünmüyor.' } })
    answer(403, { error: 'approval_required' })
    expect(await youtubeText('x', 'fr')).toMatchObject({ note: { text: expect.stringContaining('onayladığı hesaplara') } })
    answer(502, { error: 'youtube blocked', status: 'LOGIN_REQUIRED' })
    expect(await youtubeText('x', 'fr')).toMatchObject({ note: { text: expect.stringContaining('sunucumuza vermiyor') }, paste: true })
    // A "none" without the video's own list of tracks is YouTube not telling, not a video without captions.
    answer(404, { error: 'no captions', available: [] })
    expect(await youtubeText('x', 'fr')).toMatchObject({ paste: true, note: { text: expect.not.stringContaining('altyazı yok') } })
    answer(404, { error: 'no captions', available: ['en'] })
    expect(await youtubeText('x', 'fr')).not.toHaveProperty('paste')
  })

  it('no network is said as such', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    expect(await youtubeText('x', 'fr')).toEqual({ note: { ok: false, text: 'Altyazı alınamadı; internet bağlantını kontrol et.' } })
  })
})

const docxFile = (paragraphs: string[], name = 'notes.docx') =>
  new File([zipSync({ 'word/document.xml': strToU8(`<w:document xmlns:w="w"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`) })], name)

describe('a Word or PDF file', () => {
  it('a short one goes into the draft, titled by the file', async () => {
    const db = new KelimeDB(`doc-${crypto.randomUUID()}`)
    const got = await importDocument(db, docxFile(['Premier paragraphe.', 'Deuxième paragraphe.'], 'mon_cours.docx'), 'fr')
    expect(got).toEqual({ draft: { text: 'Premier paragraphe.\n\nDeuxième paragraphe.', title: 'mon cours' } })
    expect(await db.getLibrary('fr')).toEqual([])
  })

  it('a long one becomes a book in parts, saved in order', async () => {
    const db = new KelimeDB(`doc-${crypto.randomUUID()}`)
    const got = await importDocument(db, docxFile(Array.from({ length: 12 }, (_, i) => words(500, `p${i}m`)), 'roman.docx'), 'fr')
    if (!('texts' in got)) throw new Error('expected a book')
    expect(got.note.ok).toBe(true)
    expect(got.texts.length).toBe(3)
    expect(got.texts.map((t) => t.book?.index)).toEqual([0, 1, 2])
    expect(got.texts[0].title).toBe('roman (1/3)')
    expect((await db.getLibrary('fr')).length).toBe(3)
  })

  it('a file it cannot read says so', async () => {
    const db = new KelimeDB(`doc-${crypto.randomUUID()}`)
    const got = await importDocument(db, new File(['pas un zip'], 'cassé.docx'), 'fr')
    expect(got).toEqual({ texts: [], note: { ok: false, text: 'Dosya okunamadı.' } })
  })
})

describe('a link', () => {
  it('tells a YouTube video from a page', () => {
    for (const v of ['https://www.youtube.com/watch?v=abcdefghijk', 'https://youtu.be/abcdefghijk', 'm.youtube.com/watch?v=x', 'abcdefghijk']) expect(isYoutubeLink(v), v).toBe(true)
    for (const p of ['https://www.lemonde.fr/article', 'https://notyoutube.example/x', 'https://blog.fr/youtube-astuces']) expect(isYoutubeLink(p), p).toBe(false)
  })

  it('a page becomes a reading text with a link back to it', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      expect(url).toBe('/api/news?url=https%3A%2F%2Fblog.fr%2Fa')
      return Response.json({ title: 'Un billet', text: 'Le texte du billet.', url: 'https://blog.fr/a' })
    })
    const got = await pageText(' https://blog.fr/a ', 'fr')
    if (!('item' in got)) throw new Error(got.note.text)
    expect(got.item).toMatchObject({ language: 'fr', title: 'Un billet', text: 'Le texte du billet.', source: 'https://blog.fr/a' })
  })

  it('says in words why a page could not be brought', async () => {
    const cases: [string, RegExp][] = [['not html', /web sayfası değil/], ['no text', /okunacak bir yazı/], ['bad url', /https/], ['approval_required', /onay/i], ['unavailable', /site izin vermiyor/]]
    for (const [error, text] of cases) {
      vi.stubGlobal('fetch', async () => Response.json({ error }, { status: 400 }))
      const got = await pageText('https://blog.fr/a', 'fr')
      expect('note' in got && got.note.text, error).toMatch(text)
    }
  })
})
