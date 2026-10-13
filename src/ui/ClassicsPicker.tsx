import { useMemo, useState } from 'react'
import { analyzeText, coverageLine } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { CATEGORY_LABELS, classicsFor, type ClassicCategory, type ClassicReading } from '../data/classicReadings'
import { BookIcon } from './icons'
import { SourceTitle } from './SourceTitle'


/**
 * Offline reading collection: timeless fables, fairy tales, and short stories with coverage
 * analysis so learners can pick readings right at their level without needing an internet connection.
 */
export function ClassicsPicker({
  language,
  vocabulary,
  states,
  known,
  onRead,
  onAddAll,
}: {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: ReadonlySet<string>
  onRead: (title: string, text: string, source?: string) => void
  onAddAll?: (items: readonly ClassicReading[]) => void
}) {
  const [category, setCategory] = useState<ClassicCategory | 'all'>('all')

  const items = useMemo(() => {
    return classicsFor(language, category === 'all' ? undefined : category)
  }, [language, category])

  const rated = useMemo(() => {
    return items.map((c) => {
      const words = c.text.split(/\s+/).filter(Boolean).length
      const analysis = analyzeText(c.text, language, vocabulary, states, known)
      return {
        c,
        words,
        cov: analysis,
      }
    })
  }, [items, language, vocabulary, states, known])

  if (!items.length) return null

  return (
    <section className="section stack">
      <div className="row justify-between items-center wrap gap-2">
        <SourceTitle kind="classic">Klasik masallar ve öyküler</SourceTitle>
        {onAddAll && (
          <button
            type="button"
            className="btn btn-sm btn-quiet"
            onClick={() => onAddAll(items)}
            title="Bu dildeki tüm klasikleri kütüphanene ekler"
          >
            <BookIcon size={14} className="inline-icon" />
            Tümünü kütüphaneye ekle
          </button>
        )}
      </div>

      <p className="small muted">
        İnternet gerektirmeyen çevrimdışı koleksiyon: kamu malı fabllar, masallar ve öyküler. Seviyene ve kelimelerine göre seç.
      </p>

      <div className="choice-row" role="group" aria-label="Klasik türü">
        <button
          type="button"
          className="chip chip-sm"
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          Tümü ({classicsFor(language).length})
        </button>
        {(['fable', 'fairy-tale', 'story'] as const).map((cat) => {
          const count = classicsFor(language, cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              type="button"
              className="chip chip-sm"
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          )
        })}
      </div>

      <ul className="library">
        {rated.map(({ c, words, cov }) => (
          <li key={c.id}>
            <button
              type="button"
              className="word-link library-open"
              onClick={() => onRead(c.title, c.text, `Klasik Koleksiyon: ${c.author}`)}
            >
              <div className="row justify-between items-baseline gap-2">
                <strong>{c.title}</strong>
                <span className="badge badge-sm">{c.level}</span>
              </div>
              <span className="small muted">{c.summary}</span>
              <span className="small muted">
                {c.author} · {words} kelime · {coverageLine(cov)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
