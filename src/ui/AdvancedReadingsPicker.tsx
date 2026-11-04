import { useMemo, useState } from 'react'
import { analyzeText, coverageLine } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { ADVANCED_CATEGORY_LABELS, advancedFor, type AdvancedLevel } from '../data/advancedReadings'
import { SourceTitle } from './SourceTitle'
import { ADVANCED_CATEGORY_ART } from './drawnArt'

/**
 * Original B2–C1 texts (essays, features, short stories) written for the app, available offline, with the share of
 * known words shown so a learner can pick a text that stretches but does not drown them.
 */
export function AdvancedReadingsPicker({
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
  onRead: (title: string, text: string, source: string) => void
}) {
  const [level, setLevel] = useState<AdvancedLevel | 'all'>('all')
  const items = useMemo(() => advancedFor(language, level === 'all' ? undefined : level), [language, level])
  const rated = useMemo(
    () => items.map((r) => ({ r, words: r.text.split(/\s+/).filter(Boolean).length, cov: analyzeText(r.text, language, vocabulary, states, known) })),
    [items, language, vocabulary, states, known],
  )
  if (!advancedFor(language).length) return null
  return (
    <section className="section stack">
      <SourceTitle kind="classic">İleri düzey okumalar (B2–C1)</SourceTitle>
      <p className="small muted">Bu uygulama için yazılmış özgün denemeler, haber yazıları ve öyküler. İnternet gerektirmez; seviyene ve kelimelerine göre seç.</p>
      <div className="choice-row" role="group" aria-label="Okuma seviyesi">
        <button type="button" className="chip chip-sm" aria-pressed={level === 'all'} onClick={() => setLevel('all')}>
          Tümü ({advancedFor(language).length})
        </button>
        {(['B2', 'C1'] as const).map((l) => {
          const count = advancedFor(language, l).length
          if (!count) return null
          return (
            <button key={l} type="button" className="chip chip-sm" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l} ({count})
            </button>
          )
        })}
      </div>
      <ul className="library">
        {rated.map(({ r, words, cov }) => (
          <li key={r.id}>
            <button type="button" className="word-link library-open" onClick={() => onRead(r.title, r.text, `Özgün metin (${r.level})`)}>
              <div className="row justify-between items-baseline gap-2">
                <div className="row items-center gap-2">
                  <img src={ADVANCED_CATEGORY_ART[r.category]} width={22} height={22} alt="" draggable={false} className="inline-art" />
                  <strong>{r.title}</strong>
                </div>
                <span className="badge badge-sm">{r.level}</span>
              </div>
              <span className="small muted">{r.summary}</span>
              <span className="small muted">
                {ADVANCED_CATEGORY_LABELS[r.category]} · {words} kelime · {coverageLine(cov)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
