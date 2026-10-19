import { strFromU8, unzipSync } from 'fflate'

/**
 * Words from an Anki deck package (.apkg), as the tab-separated text the list importer already reads.
 * A package is a zip with the collection as a SQLite file; only its `notes` table is needed, so this
 * reads just enough of the SQLite format (table b-trees, overflow pages, records) instead of shipping
 * a database engine. Newer Anki versions pack the collection with zstd by default: that form is
 * recognised and explained, not read.
 */

export class AnkiFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnkiFileError'
  }
}

type Value = string | number | bigint | null | Uint8Array

class Sqlite {
  private bytes: Uint8Array
  private view: DataView
  private pageSize: number
  private usable: number

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    if (bytes.length < 100 || strFromU8(bytes.subarray(0, 15)) !== 'SQLite format 3') throw new AnkiFileError('Anki dosyası okunamadı: veritabanı biçimi tanınmadı.')
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const size = this.view.getUint16(16)
    this.pageSize = size === 1 ? 65536 : size
    this.usable = this.pageSize - bytes[20]
  }

  private varint(at: number): [number, number] {
    let value = 0
    for (let i = 0; i < 8; i++) {
      const b = this.bytes[at + i]
      value = value * 128 + (b & 0x7f)
      if (b < 0x80) return [value, at + i + 1]
    }
    return [value * 256 + this.bytes[at + 8], at + 9]
  }

  /** The payload of a table-leaf cell, followed through its overflow pages when it does not fit the page. */
  private payload(at: number, total: number): Uint8Array {
    const max = this.usable - 35
    if (total <= max) return this.bytes.subarray(at, at + total)
    const min = Math.floor(((this.usable - 12) * 32) / 255) - 23
    const k = min + ((total - min) % (this.usable - 4))
    const local = k <= max ? k : min
    const out = new Uint8Array(total)
    out.set(this.bytes.subarray(at, at + local))
    let filled = local
    let page = this.view.getUint32(at + local)
    while (filled < total && page > 0) {
      const base = (page - 1) * this.pageSize
      const take = Math.min(this.usable - 4, total - filled)
      out.set(this.bytes.subarray(base + 4, base + 4 + take), filled)
      filled += take
      page = this.view.getUint32(base)
    }
    return out
  }

  private record(data: Uint8Array): Value[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    const read = (at: number): [number, number] => {
      let value = 0
      for (let i = 0; i < 8; i++) {
        const b = data[at + i]
        value = value * 128 + (b & 0x7f)
        if (b < 0x80) return [value, at + i + 1]
      }
      return [value * 256 + data[at + 8], at + 9]
    }
    const [headerSize, first] = read(0)
    const types: number[] = []
    for (let at = first; at < headerSize; ) {
      const [t, next] = read(at)
      types.push(t)
      at = next
    }
    const values: Value[] = []
    let at = headerSize
    for (const t of types) {
      if (t === 0) values.push(null)
      else if (t === 8) values.push(0)
      else if (t === 9) values.push(1)
      else if (t >= 1 && t <= 6) {
        const n = [0, 1, 2, 3, 4, 6, 8][t]
        let v = BigInt(data[at] & 0x80 ? -1 : 0)
        for (let i = 0; i < n; i++) v = (v << 8n) | BigInt(data[at + i])
        values.push(Number.isSafeInteger(Number(v)) ? Number(v) : v)
        at += n
      } else if (t === 7) {
        values.push(view.getFloat64(at))
        at += 8
      } else if (t >= 12) {
        const n = t % 2 === 0 ? (t - 12) / 2 : (t - 13) / 2
        const chunk = data.subarray(at, at + n)
        values.push(t % 2 === 0 ? chunk : strFromU8(chunk))
        at += n
      } else throw new AnkiFileError('Anki dosyası okunamadı: bozuk kayıt.')
    }
    return values
  }

  /** Every row of the table whose b-tree starts at `root` (a 1-based page number). */
  rows(root: number, visit: (row: Value[]) => void, depth = 0): void {
    if (depth > 12) throw new AnkiFileError('Anki dosyası okunamadı: bozuk veritabanı.')
    const base = (root - 1) * this.pageSize
    const head = base + (root === 1 ? 100 : 0)
    const kind = this.bytes[head]
    const cells = this.view.getUint16(head + 3)
    if (kind === 0x0d) {
      for (let i = 0; i < cells; i++) {
        const cell = base + this.view.getUint16(head + 8 + i * 2)
        const [total, afterSize] = this.varint(cell)
        const [, body] = this.varint(afterSize)
        visit(this.record(this.payload(body, total)))
      }
    } else if (kind === 0x05) {
      for (let i = 0; i < cells; i++) this.rows(this.view.getUint32(base + this.view.getUint16(head + 12 + i * 2)), visit, depth + 1)
      this.rows(this.view.getUint32(head + 8), visit, depth + 1)
    } else throw new AnkiFileError('Anki dosyası okunamadı: bozuk veritabanı.')
  }

  /** The root page of a table, from the schema table on page 1. */
  rootOf(table: string): number | undefined {
    let root: number | undefined
    this.rows(1, (r) => {
      if (r[0] === 'table' && r[1] === table && typeof r[3] === 'number') root = r[3]
    })
    return root
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** A card field as plain text: markup, sound and image tags dropped, entities decoded. */
export function plainField(html: string): string {
  return html
    .replace(/\[sound:[^\]]*\]/g, '')
    .replace(/<br\s*\/?>|<\/(div|p|li)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

const UPDATE_NOTE = /please update to the latest anki/i

/** The front and back of every note in an .apkg, one tab-separated line each. */
export function apkgToText(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new AnkiFileError('Anki dosyası okunamadı: paket bozuk görünüyor.')
  }
  const db = files['collection.anki21'] ?? files['collection.anki2']
  if (files['collection.anki21b'] && !files['collection.anki21']) {
    throw new AnkiFileError('Bu Anki paketi yeni (sıkıştırılmış) biçimde. Anki’de dışa aktarırken “Eski Anki sürümlerini destekle” kutusunu işaretle ya da “Düz metin olarak notlar (.txt)” seç; sonra yine buradan yükle.')
  }
  if (!db) throw new AnkiFileError('Anki paketinde koleksiyon bulunamadı.')
  const sqlite = new Sqlite(db)
  const root = sqlite.rootOf('notes')
  if (!root) throw new AnkiFileError('Anki paketinde not bulunamadı.')
  const lines: string[] = []
  sqlite.rows(root, (row) => {
    const flds = row[6]
    if (typeof flds !== 'string') return
    const [front = '', back = ''] = flds.split('\x1f').map(plainField)
    if (front && back && !UPDATE_NOTE.test(front + back)) lines.push(`${front}\t${back}`)
  })
  if (!lines.length) throw new AnkiFileError('Anki paketinde not bulunamadı.')
  return lines.join('\n')
}
