import type { VocabRow } from '../engine/kindle'

/**
 * Reads Kindle's Vocabulary Builder database (vocab.db, SQLite) in the browser. The SQLite
 * engine is a separate chunk, loaded only when such a file is opened.
 */
export async function readVocabDb(file: File): Promise<VocabRow[]> {
  const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm.wasm?url')])
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()))
  try {
    const res = db.exec(
      'SELECT w.word, w.stem, w.lang, l.usage, b.title, l.timestamp FROM LOOKUPS l JOIN WORDS w ON l.word_key = w.id LEFT JOIN BOOK_INFO b ON l.book_key = b.id',
    )
    return (res[0]?.values ?? []).map(([word, stem, lang, usage, book, timestamp]) => ({
      word: String(word ?? ''),
      stem: stem == null ? null : String(stem),
      lang: String(lang ?? ''),
      usage: usage == null ? null : String(usage),
      book: book == null ? null : String(book),
      timestamp: Number(timestamp ?? 0),
    }))
  } finally {
    db.close()
  }
}
