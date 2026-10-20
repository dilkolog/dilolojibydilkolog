import type { KelimeDB } from '../data/db'
import { markWord } from '../data/wordInput'
import type { TargetLanguage } from '../engine/types'
import { WordForm } from './Words'

/** The bar over several selected words: mark them all at once. */
export function MultiBar({ count, onMark, onClear }: { count: number; onMark: (how: 'known' | 'skip' | 'ignore') => void; onClear: () => void }) {
  return (
    <section className="card multi-bar" role="toolbar" aria-label="Seçili kelimeler">
      <strong>{count} kelime seçili</strong>
      <button className="btn btn-sm" onClick={() => onMark('known')}>
        Biliyorum
      </button>
      <button className="btn btn-sm btn-quiet" onClick={() => onMark('skip')}>
        Bilmiyorum
      </button>
      <button className="btn btn-sm btn-quiet" onClick={() => onMark('ignore')}>
        Yok say
      </button>
      <button className="link small" onClick={onClear}>
        Temizle
      </button>
    </section>
  )
}

/** "Kelimelerime ekle" beside the text: the word form with the sentence it was met in; where it was met is kept. */
export function AddingCard({
  db,
  language,
  existing,
  adding,
  title,
  onSaved,
  onCancel,
}: {
  db: KelimeDB
  language: TargetLanguage
  existing: Set<string>
  adding: { word: string; sentence: string }
  /** The title of the text being read. */
  title?: string
  onSaved: () => void
  onCancel: () => void
}) {
  return (
    <section className="card stack">
      <h2 className="section-title">Kelimelerime ekle</h2>
      <WordForm
        db={db}
        language={language}
        existing={existing}
        initial={{ word: adding.word, meaning: '', example: markWord(adding.sentence, adding.word), exampleTranslation: '', exampleMetIn: title }}
        onSaved={async () => {
          if (title && adding.word) {
            const entryId = `${language}:${adding.word.trim().toLowerCase()}`
            await db.addFirstEncounters({ [entryId]: { title, sentence: adding.sentence, at: new Date().toISOString() } })
          }
          onSaved()
        }}
        onCancel={onCancel}
      />
    </section>
  )
}
