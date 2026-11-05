import { useEffect, useMemo, useState } from 'react'
import { createRng } from '../engine/rng'
import { SCOPE_NAME, STUDY_SIZES, selectStudyWords, type StudyDirection, type StudyOptions, type StudyScope } from '../engine/studySet'
import type { TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../engine/types'
import { db, scheduler } from '../data/instance'
import { BoltIcon, BookIcon, CalendarIcon, SproutIcon, TagIcon, TargetIcon } from './icons'
import { Select } from './Select'
import { Chips } from './settingsWidgets'

const SCOPES: StudyScope[] = ['weak', 'today', 'all', 'hard', 'unlearned', 'list']
const DIRECTION_NAME: Record<StudyDirection, string> = { forward: 'Kelime', reverse: 'Anlam', mixed: 'Karışık' }
const SCOPE_ICON: Record<StudyScope, React.ReactNode> = {
  weak: <BoltIcon size={20} />,
  today: <CalendarIcon size={20} />,
  all: <BookIcon size={20} />,
  hard: <TargetIcon size={20} />,
  unlearned: <SproutIcon size={20} />,
  list: <TagIcon size={20} />,
}
const SIZE_NAME = (n: number) => (n === 0 ? 'Hepsi' : String(n))

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
  children,
}: {
  value: StudyOptions
  onChange: (o: StudyOptions) => void
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  /** Offer the side that shows first (flashcards): a test asks both ways on its own. */
  directions?: boolean
  children?: React.ReactNode
}) {
  const [lists, setLists] = useState<WordList[]>([])
  // Until the lists are read, a saved list choice would look empty and be moved off.
  const [listsRead, setListsRead] = useState(false)
  useEffect(() => {
    let live = true
    void db.getLists(language).then((l) => {
      if (!live) return
      setLists(l)
      setListsRead(true)
    })
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
    if (!listsRead || counts[value.scope] > 0) return
    const fallback = (['weak', 'all', 'today', 'unlearned', 'hard', 'list'] as const).find((s) => counts[s] > 0 && (s !== 'list' || lists.length > 0))
    if (fallback) onChange({ ...value, scope: fallback, listId: fallback === 'list' ? lists.find((l) => vocabulary.some((e) => e.listId === l.id))?.id : value.listId })
  }, [counts, value, lists, listsRead, vocabulary, onChange])
  const listId = value.listId && lists.some((l) => l.id === value.listId) ? value.listId : (lists.find((l) => vocabulary.some((w) => w.listId === l.id)) ?? lists[0])?.id
  useEffect(() => {
    if (listsRead && value.scope === 'list' && listId && listId !== value.listId) onChange({ ...value, listId })
  }, [listsRead, listId, value, onChange])
  const set = (patch: Partial<StudyOptions>) => onChange({ ...value, ...patch })
  const listCount = (id?: string) => (id ? vocabulary.filter((e) => e.listId === id).length : 0)
  return (
    <div className="study-options" role="group" aria-label="Çalışma seçenekleri">
      <section className="study-group">
        <h2 className="study-label">Hangi kelimeler?</h2>
        {/* One tile per set: its name and how many words are in it; an empty set can't be picked. */}
        <div className="study-scopes" role="group" aria-label="Hangi kelimeler">
          {SCOPES.filter((s) => s !== 'list' || lists.length > 0).map((s) => (
            <button key={s} type="button" className="study-scope" aria-pressed={value.scope === s} disabled={counts[s] === 0 && value.scope !== s} onClick={() => set({ scope: s, listId: s === 'list' ? listId : value.listId })}>
              <span className="study-scope-icon" aria-hidden="true">{SCOPE_ICON[s]}</span>
              <span className="study-scope-name">{s === 'list' ? 'Bir listeden' : SCOPE_NAME[s]}</span>
              <span className="study-scope-count">{s === 'list' ? listCount(listId) : counts[s]} kelime</span>
            </button>
          ))}
        </div>
        {value.scope === 'list' && lists.length > 0 && (
          <div className="study-row">
            <span className="study-row-label">Liste</span>
            <div className="study-list-pick">
              <Select
                label="Liste"
                value={listId}
                onChange={(id) => set({ listId: id })}
                options={lists.map((l) => ({ value: l.id, label: l.name, hint: `${listCount(l.id)} kelime` }))}
              />
            </div>
          </div>
        )}
      </section>
      <section className="study-group">
        <div className="study-row">
          <span className="study-row-label">Kaç kart?</span>
          <Chips label="Kart sayısı" options={STUDY_SIZES} value={value.size} onChange={(n) => set({ size: n })} format={SIZE_NAME} />
        </div>
        {directions && (
          <div className="study-row">
            <span className="study-row-label">Önce ne görünsün?</span>
            <Chips<StudyDirection> label="Önce ne görünsün" options={['forward', 'reverse', 'mixed']} value={value.direction} onChange={(d) => set({ direction: d })} format={(d) => DIRECTION_NAME[d]} />
          </div>
        )}
        <label className="study-row study-shuffle">
          <span className="study-row-label">Karıştır</span>
          <button type="button" role="switch" aria-checked={value.shuffle} aria-label="Karıştır" className="switch" onClick={() => set({ shuffle: !value.shuffle })}>
            <span />
          </button>
        </label>
      </section>
      {children}
    </div>
  )
}
