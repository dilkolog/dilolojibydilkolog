import { useCallback, useRef } from 'react'
import type { ReadingText } from '../data/db'

export function highlight(sentence: string, word: string) {
  const i = sentence.toLowerCase().indexOf(word.toLowerCase())
  if (i < 0) return sentence
  return (
    <>
      {sentence.slice(0, i)}
      <mark>{sentence.slice(i, i + word.length)}</mark>
      {sentence.slice(i + word.length)}
    </>
  )
}

export type LibraryGroup = ReadingText | { id: string; title: string; chapters: ReadingText[] }

/** Books (chapters sharing a book id) become one entry, placed where their first chapter was. */
export function groupBooks(library: readonly ReadingText[]): LibraryGroup[] {
  const out: LibraryGroup[] = []
  const books = new Map<string, { id: string; title: string; chapters: ReadingText[] }>()
  for (const t of library) {
    if (!t.book) {
      out.push(t)
      continue
    }
    let b = books.get(t.book.id)
    if (!b) {
      b = { id: t.book.id, title: t.book.title, chapters: [] }
      books.set(t.book.id, b)
      out.push(b)
    }
    b.chapters.push(t)
  }
  for (const b of books.values()) b.chapters.sort((x, y) => x.book!.index - y.book!.index)
  return out
}

/** A text open for less than this has been glanced at, not read: its meetings aren't saved on their own. */
export const MIN_READ_MS = 20_000

/** A callback ref that runs `onSeen` the first time its element comes into view (again for a new `key`). */
export function useSeen(key: unknown, onSeen: () => void) {
  const latest = useRef(onSeen)
  latest.current = onSeen
  const observer = useRef<IntersectionObserver | null>(null)
  return useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node || typeof IntersectionObserver === 'undefined') return
    observer.current = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.current?.disconnect()
      latest.current()
    })
    observer.current.observe(node)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
