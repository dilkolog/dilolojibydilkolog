import '../lazy.css'
import { useMemo } from 'react'
import { WordLabel } from './WordLabel'
import type { ErrorType, Mistake, VocabularyEntry } from '../engine/types'
import { ERROR_HINT, ERROR_NAME } from './labels'
import { PlayIcon } from './icons'
import { charDiff } from '../engine/correctionDiff'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'
import { TenseWeakness } from './TenseWeakness'

/** A sign for each kind of mistake, shown on its group. */
const ERROR_GLYPH: Record<ErrorType, string> = {
  meaning: '≠',
  accent: 'é',
  typo: 'Aa',
  article: 'le',
  gender: 'la',
  form: '-s',
  confusion: '⇄',
  collocation: '+',
  false_friend: '≈',
  cross_language: '↯',
}

/** Letter marks only help when the two forms are close (accent, article, spelling), not for another word. */
function similar(a: string, b: string): boolean {
  const same = charDiff(a, b).filter((p) => p.kind === 'same').reduce((n, p) => n + p.text.length, 0)
  return same / Math.max(a.length, b.length) >= 0.5
}

const ERROR_ORDER: ErrorType[] = ['collocation', 'gender', 'article', 'cross_language', 'false_friend', 'confusion', 'form', 'accent', 'typo', 'meaning']

/**
 * The Personal Mistake Bank: the learner's own errors, grouped by kind. A mistake closes after
 * the word is answered correctly a few times in a row, and reopens if it happens again.
 */
export function MistakesScreen({
  mistakes,
  vocabulary,
  onPractice,
  onPracticeType,
  onOpen,
  onConjugation,
}: {
  /** Opens the conjugation drill. */
  onConjugation?: () => void
  mistakes: Mistake[]
  vocabulary: VocabularyEntry[]
  onPractice: () => void
  /** Study only the words with this kind of mistake. */
  onPracticeType?: (type: ErrorType) => void
  onOpen: (entryId: string) => void
}) {
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const open = mistakes.filter((m) => !m.resolved && byId.has(m.entryId))
  const resolved = mistakes.filter((m) => m.resolved && byId.has(m.entryId))
  const words = new Set(open.map((m) => m.entryId)).size

  const closedOf = (type: ErrorType) => resolved.filter((m) => m.errorType === type).length
  const groups = ERROR_ORDER.map((type) => ({
    type,
    items: open.filter((m) => m.errorType === type).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()),
  })).filter((g) => g.items.length)

  return (
    <div>
      <section className="section stack">
        <PageHeader
          art="mistakes"
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
          <EmptyState art="clean" title="Açık hata yok">
            Hataların burada türüne göre toplanır ve tekrarlarına eklenir. Bir kelimeyi üst üste 3 kez doğru bilince hatası kapanır.
          </EmptyState>
        ) : (
          null
        )}
      </section>

      {vocabulary[0] && <TenseWeakness language={vocabulary[0].language} vocabulary={vocabulary} onPractice={onConjugation} />}

      {groups.map((g) => (
        <section className={`section stack mistake-group tone-${g.type}`} key={g.type}>
          <header className="mistake-group-head">
            <span className="mistake-badge" aria-hidden>
              {ERROR_GLYPH[g.type]}
            </span>
            <div className="mistake-group-text">
              <h2 className="section-title mistake-group-title">
                {ERROR_NAME[g.type]} <span className="bed-count">{g.items.length}</span>
              </h2>
              <p className="small muted">
                {closedOf(g.type) > 0 ? `${closedOf(g.type)} tanesi kapandı. ` : ''}
                {ERROR_HINT[g.type]}
              </p>
            </div>
            {onPracticeType && (
              <button className="btn btn-sm btn-quiet" onClick={() => onPracticeType(g.type)}>
                <PlayIcon size={14} /> Bu türü çalış
              </button>
            )}
          </header>
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
          <li key={m.id} className="mistake-row">
            <span className="mistake-pair">
              {m.given && !similar(m.given, m.expected) ? (
                <>
                  <span className="mistake-given strike" lang={entry.language}>
                    {m.given}
                  </span>
                  <span className="mistake-arrow" aria-hidden>
                    →
                  </span>
                  <span className="mistake-right" lang={entry.language}>
                    {m.expected}
                  </span>
                </>
              ) : m.given ? (
                <span className="mistake-given" lang={entry.language} title="Senin cevabın">
                  {charDiff(m.given, m.expected).map((p, i) => (p.kind === 'added' ? null : <span key={i} className={p.kind === 'removed' ? 'ch-wrong' : undefined}>{p.text}</span>))}
                </span>
              ) : (
                <span className="muted">(boş)</span>
              )}
              {(!m.given || similar(m.given, m.expected)) && (
                <>
                  <span className="mistake-arrow" aria-hidden>
                    →
                  </span>
                  <span className="mistake-right" lang={entry.language} title="Doğrusu">
                    {m.given
                      ? charDiff(m.given, m.expected).map((p, i) => (p.kind === 'removed' ? null : <span key={i} className={p.kind === 'added' ? 'ch-right' : undefined}>{p.text}</span>))
                      : m.expected}
                  </span>
                </>
              )}
            </span>
            <span className="small muted">
              {m.highConfidence && <span className="pill confident-pill">emindin</span>} {m.count > 1 ? `${m.count} kez` : ''}
            </span>
            <span className="meta">
              <button className="link" onClick={() => onOpen(entry.id)}>
                <WordLabel entry={entry} />
              </button>
              {' · '}{entry.senses[0].gloss}
              {m.resolved ? ' · Kapandı' : m.correctSince > 0 ? ` · ${m.correctSince}/3 doğru` : ''}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
