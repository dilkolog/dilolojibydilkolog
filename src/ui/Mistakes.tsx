import { useMemo } from 'react'
import { displayForm } from '../engine/exercises'
import type { ErrorType, Mistake, VocabularyEntry } from '../engine/types'
import { ERROR_NAME } from './labels'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'

const ERROR_ORDER: ErrorType[] = ['collocation', 'gender', 'article', 'cross_language', 'false_friend', 'confusion', 'form', 'accent', 'typo', 'meaning']

/**
 * The Personal Mistake Bank: the learner's own errors, grouped by kind. A mistake closes after
 * the word is answered correctly a few times in a row, and reopens if it happens again.
 */
export function MistakesScreen({
  mistakes,
  vocabulary,
  onPractice,
  onOpen,
}: {
  mistakes: Mistake[]
  vocabulary: VocabularyEntry[]
  onPractice: () => void
  onOpen: (entryId: string) => void
}) {
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const open = mistakes.filter((m) => !m.resolved && byId.has(m.entryId))
  const resolved = mistakes.filter((m) => m.resolved && byId.has(m.entryId))
  const words = new Set(open.map((m) => m.entryId)).size

  const groups = ERROR_ORDER.map((type) => ({
    type,
    items: open.filter((m) => m.errorType === type).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()),
  })).filter((g) => g.items.length)

  return (
    <div>
      <section className="section stack">
        <PageHeader
          title="Hatalar"
          sub={open.length ? `${words} kelimede ${open.length} açık hata; üst üste 3 doğru cevap bir hatayı kapatır.` : 'Hataların türüne göre burada toplanır.'}
          action={
            open.length > 0 && (
              <button className="btn" onClick={onPractice}>
                Bu kelimeleri çalış
              </button>
            )
          }
        />
        {open.length === 0 ? (
          <EmptyState stage={5} title="Açık hata yok">
            Yaptığın hatalar burada türüne göre toplanır ve tekrarlarına özel olarak eklenir. Bir kelimeyi üst üste 3 kez doğru bilince hatası kapanır.
          </EmptyState>
        ) : (
          null
        )}
      </section>

      {groups.map((g) => (
        <section className="section stack" key={g.type}>
          <h2 className="section-title">
            {ERROR_NAME[g.type]} <span className="muted small">({g.items.length})</span>
          </h2>
          <MistakeList items={g.items} byId={byId} onOpen={onOpen} />
        </section>
      ))}

      {resolved.length > 0 && (
        <section className="section">
          <details>
            <summary>Kapanan hatalar ({resolved.length})</summary>
            <MistakeList items={resolved} byId={byId} onOpen={onOpen} />
          </details>
        </section>
      )}
    </div>
  )
}

function MistakeList({
  items,
  byId,
  onOpen,
}: {
  items: Mistake[]
  byId: Map<string, VocabularyEntry>
  onOpen: (entryId: string) => void
}) {
  return (
    <ul className="word-list is-columns">
      {items.map((m) => {
        const entry = byId.get(m.entryId)!
        return (
          <li key={m.id}>
            <span>
              {m.given ? <span className="strike">{m.given}</span> : <span className="muted">(boş)</span>} →{' '}
              <span className="target">{m.expected}</span>
            </span>
            <span className="small muted">
              {m.highConfidence && <span className="pill confident-pill">emindin</span>} {m.count > 1 ? `${m.count} kez` : ''}
            </span>
            <span className="meta">
              <button className="link" onClick={() => onOpen(entry.id)}>
                {displayForm(entry)}
              </button>
              , {entry.senses[0].gloss}
              {m.resolved ? '. Kapandı' : m.correctSince > 0 ? `. ${m.correctSince}/3 doğru` : ''}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
