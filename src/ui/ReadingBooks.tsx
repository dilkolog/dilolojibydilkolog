import { useMemo, useState } from 'react'
import { analyzeText, coverageZone } from '../engine/reading'
import type { ReadingText } from '../data/db'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { CheckCircleIcon, CheckIcon } from './icons'

/**
 * An imported book: progress, the next chapter to read, and (opened) every chapter with how
 * much of it you already know, so you can see the book getting easier as you go.
 */
export function BookItem({
  title,
  chapters,
  language,
  vocabulary,
  states,
  known,
  onOpen,
  onRemove,
}: {
  title: string
  chapters: ReadingText[]
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: Set<string>
  onOpen: (t: ReadingText) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const read = chapters.filter((c) => c.readAt).length
  const next = chapters.find((c) => !c.readAt)
  const coverage = useMemo(
    () => (expanded ? new Map(chapters.map((c) => [c.id, analyzeText(c.text, language, vocabulary, states, known)])) : null),
    [expanded, chapters, language, vocabulary, states, known],
  )
  return (
    <li className="book-item">
      <div className="book-head">
        <Cover title={title} book />
        <span className="book-meta">
          <strong>{title}</strong>
          <span className="small muted">
            {chapters.length} bölüm · {read} okundu
          </span>
          <span className="book-progress" aria-hidden>
            <span style={{ width: `${(read / chapters.length) * 100}%` }} />
          </span>
        </span>
      </div>
      <div className="row">
        {next ? (
          <button className="btn btn-sm" onClick={() => onOpen(next)}>
            {read ? 'Sıradaki' : 'Başla'}: {next.title}
          </button>
        ) : (
          <span className="small notice"><CheckCircleIcon size={15} className="inline-icon" />Kitabı bitirdin</span>
        )}
        <button className="link small" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? 'Bölümleri gizle' : 'Bölümler'}
        </button>
        <button className="link small" onClick={onRemove}>
          Kitabı sil
        </button>
      </div>
      {expanded && coverage && (
        <ol className="book-chapters">
          {chapters.map((c) => {
            const a = coverage.get(c.id)!
            return (
              <li key={c.id}>
                <button className="word-link" onClick={() => onOpen(c)}>
                  {c.title}
                </button>
                <span className={`small chapter-cov zone-${coverageZone(a.coverage)}`}>%{Math.round(a.coverage * 100)}</span>
                <span className="small muted">{a.counts.unseen} yeni</span>
                {c.readAt && <CheckIcon size={14} className="muted" />}
              </li>
            )
          })}
        </ol>
      )}
    </li>
  )
}

const COVER_HUES = [12, 32, 150, 190, 215, 262, 290, 340]

/** A cover for a text or book: a colour picked from its title and its first letter. */
export function Cover({ title, book = false }: { title: string; book?: boolean }) {
  const hue = COVER_HUES[[...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COVER_HUES.length]
  return (
    <span className={`cover${book ? ' is-book' : ''}`} style={{ ['--hue' as string]: hue }} aria-hidden>
      {title.trim().charAt(0).toLocaleUpperCase() || '·'}
    </span>
  )
}

