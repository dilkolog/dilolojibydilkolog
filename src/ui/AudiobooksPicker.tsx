import { useEffect, useMemo, useState } from 'react'
import { cleanChapterText, loadAudiobookChapters, type AudiobookChapter } from '../data/audiobooks'
import { analyzeText, coverageLine, type ReadingAnalysis } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { HeadphonesIcon } from './icons'
import { SourceTitle } from './SourceTitle'


/**
 * Chapters of public domain books with the LibriVox recording of the same text (French and
 * Spanish, B1–B2): read along while it plays, the heard sentence lit. Chapters are grouped by book.
 */
export function AudiobooksPicker({
  language,
  vocabulary,
  states,
  known,
  onRead,
}: {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: ReadonlySet<string>
  onRead: (chapter: AudiobookChapter) => void
}) {
  const [chapters, setChapters] = useState<AudiobookChapter[]>([])
  const [level, setLevel] = useState<'all' | 'B1' | 'B2'>('all')
  useEffect(() => {
    let live = true
    void loadAudiobookChapters(language).then((c) => live && setChapters(c.filter((x) => x.textAudioMatch)))
    return () => {
      live = false
    }
  }, [language])
  const books = useMemo(() => {
    const byBook = new Map<string, { title: string; author: string; chapters: { c: AudiobookChapter; cov: ReadingAnalysis }[] }>()
    for (const c of chapters) {
      if (level !== 'all' && c.cefr !== level) continue
      const book = byBook.get(c.bookId) ?? { title: c.bookTitle, author: c.author, chapters: [] }
      book.chapters.push({ c, cov: analyzeText(cleanChapterText(c.text), language, vocabulary, states, known) })
      byBook.set(c.bookId, book)
    }
    for (const b of byBook.values()) b.chapters.sort((x, y) => x.c.chapterIndex - y.c.chapterIndex)
    return [...byBook.entries()]
  }, [chapters, level, language, vocabulary, states, known])
  if (!chapters.length) return null

  return (
    <section className="section stack">
      <SourceTitle kind="audiobook">Sesli kitaplar</SourceTitle>
      <p className="small muted">Kamu malı kitaplardan bölümler ve aynı metnin LibriVox okuması (B1–B2). Dinlerken okunan cümle aydınlanır.</p>
      <div className="choice-row" role="group" aria-label="Sesli kitap seviyesi">
        {(['all', 'B1', 'B2'] as const).map((l) => (
          <button key={l} type="button" className="chip chip-sm" aria-pressed={level === l} onClick={() => setLevel(l)}>
            {l === 'all' ? `Tümü (${chapters.length})` : l}
          </button>
        ))}
      </div>
      {books.map(([id, book]) => (
        <div key={id} className="stack">
          <h3 className="subhead">
            <span lang={language}>{book.title}</span> <span className="small muted">· {book.author}</span>
          </h3>
          <ul className="library">
            {book.chapters.map(({ c, cov }) => (
              <li key={c.id}>
                <button type="button" className="word-link library-open" onClick={() => onRead(c)}>
                  <div className="row justify-between items-baseline gap-2">
                    <strong lang={language}>{c.title}</strong>
                    <span className="badge badge-sm">{c.cefr}</span>
                  </div>
                  <span className="small muted">
                    <HeadphonesIcon size={14} className="inline-icon" /> {c.durationMinutes} dk · {coverageLine(cov)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
