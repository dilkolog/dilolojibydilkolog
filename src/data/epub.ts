import { strFromU8, unzipSync } from 'fflate'

/**
 * EPUB books for reading mode. An EPUB is a zip: container.xml points to the package file,
 * whose spine lists the chapters in reading order (XHTML). Only the text is kept, paragraph by
 * paragraph; covers, contents pages and other short pages are dropped, very long chapters split.
 */

export interface BookChapter {
  title: string
  text: string
}

export interface Book {
  title: string
  /** Two-letter language code from the book's metadata, if given. */
  language?: string
  chapters: BookChapter[]
}

export class EpubError extends Error {
  override name = 'EpubError'
}

/** Pages shorter than this are covers, contents, copyright notices… */
const MIN_WORDS = 80
/** Longer chapters are split into parts of about this many words. */
const PART_WORDS = 4000

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

function xml(text: string, type: DOMParserSupportedType = 'application/xml'): Document {
  const doc = new DOMParser().parseFromString(text, type)
  if (type !== 'text/html' && doc.getElementsByTagName('parsererror').length) return new DOMParser().parseFromString(text, 'text/html')
  return doc
}

/** Elements by local name, whatever their namespace prefix (dc:title, opf:item…). */
const byTag = (root: Document | Element, tag: string) =>
  [...root.getElementsByTagName('*')].filter((e) => (e.localName || e.tagName).split(':').pop()!.toLowerCase() === tag.toLowerCase())

function resolve(base: string, href: string): string {
  const parts = (base ? `${base}/${href}` : href).split('/')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p && p !== '.') out.push(p)
  }
  return decodeURIComponent(out.join('/'))
}

const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,dt,dd'

/** The chapter's text, a paragraph per line pair, without nested duplicates. */
export function chapterText(doc: Document): { title: string; text: string } {
  const body = doc.body ?? byTag(doc, 'body')[0]
  if (!body) return { title: '', text: '' }
  for (const junk of body.querySelectorAll('script,style,nav,aside.footnote,sup')) junk.remove()
  const blocks = [...body.querySelectorAll(BLOCKS)].filter((el) => !el.parentElement?.closest(BLOCKS))
  const clean = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()
  const paragraphs = (blocks.length ? blocks.map((b) => clean(b.textContent)) : [clean(body.textContent)]).filter(Boolean)
  const heading = clean(body.querySelector('h1,h2,h3')?.textContent ?? null)
  return { title: heading.length <= 80 ? heading : '', text: paragraphs.join('\n\n') }
}

/** Splits a long chapter at paragraph boundaries into parts of about PART_WORDS words. */
export function splitLong(text: string, max = PART_WORDS): string[] {
  if (words(text) <= max * 1.5) return [text]
  const parts: string[] = []
  let current: string[] = []
  let count = 0
  for (const p of text.split('\n\n')) {
    current.push(p)
    count += words(p)
    if (count >= max) {
      parts.push(current.join('\n\n'))
      current = []
      count = 0
    }
  }
  if (current.length) {
    // A short tail joins the previous part rather than standing alone.
    if (count < max / 3 && parts.length) parts[parts.length - 1] += `\n\n${current.join('\n\n')}`
    else parts.push(current.join('\n\n'))
  }
  return parts
}

export function parseEpub(bytes: Uint8Array): Book {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new EpubError('Dosya açılamadı: geçerli bir EPUB değil.')
  }
  const container = files['META-INF/container.xml']
  const opfPath = container && byTag(xml(strFromU8(container)), 'rootfile')[0]?.getAttribute('full-path')
  if (!opfPath || !files[opfPath]) throw new EpubError('Kitabın içindekiler bilgisi bulunamadı.')
  if (Object.keys(files).some((f) => f === 'META-INF/encryption.xml') && byTag(xml(strFromU8(files['META-INF/encryption.xml'])), 'EncryptedData').length) {
    throw new EpubError('Bu kitap kopya korumalı (DRM); korumasız EPUB dosyaları açılabiliyor.')
  }
  const opf = xml(strFromU8(files[opfPath]))
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : ''
  const items = new Map(byTag(opf, 'item').map((i) => [i.getAttribute('id') ?? '', { href: i.getAttribute('href') ?? '', type: i.getAttribute('media-type') ?? '' }]))
  const title = byTag(opf, 'title')[0]?.textContent?.trim() || 'Adsız kitap'
  const language = byTag(opf, 'language')[0]?.textContent?.trim().slice(0, 2).toLowerCase() || undefined

  const chapters: BookChapter[] = []
  for (const ref of byTag(opf, 'itemref')) {
    const item = items.get(ref.getAttribute('idref') ?? '')
    if (!item || !/html/.test(item.type)) continue
    const data = files[resolve(base, item.href)]
    if (!data) continue
    const { title: heading, text } = chapterText(xml(strFromU8(data), 'application/xhtml+xml'))
    if (words(text) < MIN_WORDS) continue
    const name = heading || `Bölüm ${chapters.length + 1}`
    const parts = splitLong(text)
    parts.forEach((p, i) => chapters.push({ title: parts.length > 1 ? `${name} (${i + 1}/${parts.length})` : name, text: p }))
  }
  if (!chapters.length) throw new EpubError('Kitapta okunacak metin bulunamadı.')
  return { title, language, chapters }
}
