import { useEffect, useMemo, useState } from 'react'
import { createRng } from '../engine/rng'
import { SCOPE_NAME, STUDY_SIZES, selectStudyWords, type StudyDirection, type StudyOptions, type StudyScope } from '../engine/studySet'
import type { TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../engine/types'
import { db, scheduler } from '../data/instance'

const SCOPES: StudyScope[] = ['weak', 'today', 'all', 'hard', 'unlearned', 'list']
const DIRECTION_NAME: Record<StudyDirection, string> = { forward: 'Kelime önce', reverse: 'Anlam önce', mixed: 'Karışık' }

/**
 * The choices before a round of cards: which words, shuffled or not, which side first, how many.
 * Each set says how many words it has, and the ones with none can't be chosen.
 */
export function StudyOptionsPanel({
  value,
  onChange,
  language,
  vocabulary,
  states,
  directions = true,
}: {
  value: StudyOptions
  onChange: (o: StudyOptions) => void
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  /** Offer the side that shows first (flashcards): a test asks both ways on its own. */
  directions?: boolean
}) {
  const [lists, setLists] = useState<WordList[]>([])
  useEffect(() => {
    let live = true
    void db.getLists(language).then((l) => live && setLists(l))
    return () => {
      live = false
    }
  }, [language])
  const counts = useMemo(() => {
    const now = new Date()
    const rng = createRng(1)
    const of = (scope: StudyScope, listId?: string) => selectStudyWords(vocabulary, states, scheduler, now, { ...value, scope, listId, size: 0 }, rng).length
    return { ...Object.fromEntries(SCOPES.filter((s) => s !== 'list').map((s) => [s, of(s)])), list: lists.reduce((n, l) => n + of('list', l.id), 0) } as Record<StudyScope, number>
  }, [vocabulary, states, lists, value])
  // A saved choice whose set has no words now (nothing learned yet, the list emptied) moves to the first set that has some.
  useEffect(() => {
    if (counts[value.scope] > 0) return
    const fallback = (['weak', 'all', 'today', 'unlearned', 'hard', 'list'] as const).find((s) => counts[s] > 0 && (s !== 'list' || lists.length > 0))
    if (fallback) onChange({ ...value, scope: fallback, listId: fallback === 'list' ? lists.find((l) => vocabulary.some((e) => e.listId === l.id))?.id : value.listId })
  }, [counts, value, lists, vocabulary, onChange])
  const listId = value.listId && lists.some((l) => l.id === value.listId) ? value.listId : lists[0]?.id
  const set = (patch: Partial<StudyOptions>) => onChange({ ...value, ...patch })
  const listCount = (id?: string) => (id ? vocabulary.filter((e) => e.listId === id).length : 0)
  return (
    <div className="stack gap-2 study-options">
      <div className="choice-row" role="group" aria-label="Hangi kelimeler">
        {SCOPES.filter((s) => s !== 'list' || lists.length > 0).map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={value.scope === s} disabled={counts[s] === 0 && value.scope !== s} onClick={() => set({ scope: s, listId: s === 'list' ? listId : value.listId })}>
            {SCOPE_NAME[s]} <span className="muted small">{counts[s]}</span>
          </button>
        ))}
      </div>
      {value.scope === 'list' && lists.length > 0 && (
        <div className="choice-row" role="group" aria-label="Hangi liste">
          {lists.map((l) => (
            <button key={l.id} type="button" className="chip chip-sm" aria-pressed={listId === l.id} onClick={() => set({ listId: l.id })}>
              {l.name} <span className="muted small">{listCount(l.id)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="choice-row" role="group" aria-label="Sıra ve kart sayısı">
        <button type="button" className="chip" aria-pressed={value.shuffle} onClick={() => set({ shuffle: !value.shuffle })}>
          Karıştır
        </button>
        {STUDY_SIZES.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={value.size === n} onClick={() => set({ size: n })}>
            {n === 0 ? 'Hepsi' : `${n} kart`}
          </button>
        ))}
      </div>
      {directions && (
        <div className="choice-row" role="group" aria-label="Önce hangi yüz">
          {(['forward', 'reverse', 'mixed'] as const).map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={value.direction === d} onClick={() => set({ direction: d })}>
              {DIRECTION_NAME[d]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
