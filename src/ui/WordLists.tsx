import { useMemo, useState, type FormEvent } from 'react'
import { listCover } from './drawnArt'
import { UNLISTED, dueCount, listDone, listOrder, listWords, progressOf, unlistedWords, type GroupProgress } from '../engine/lists'
import { progressLine as meta } from './listOptions'
import type { TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { EmptyState } from './EmptyState'
import { CheckIcon, PlusIcon, TargetIcon } from './icons'
import { showToast } from './toastFeed'
import { newListId } from './wordListId'

/** Met and learned as one bar: the learned part solid, the met part lighter. */
export function Bar({ p }: { p: GroupProgress }) {
  const pct = (n: number) => (p.total ? (n / p.total) * 100 : 0)
  return (
    <span className="wl-bar" role="img" aria-label={`${p.total} kelimeden ${p.met} tanıştı, ${p.learned} öğrenildi`}>
      <span className="wl-bar-met" style={{ width: `${pct(p.met)}%` }} />
      <span className="wl-bar-learned" style={{ width: `${pct(p.learned)}%` }} />
    </span>
  )
}

/** A list whose every word is learned. */
export function DoneBadge() {
  return (
    <span className="badge wl-focus-badge wl-done-badge">
      <CheckIcon size={14} className="inline-icon" />
      Tamamlandı
    </span>
  )
}

/**
 * The learner's lists as a shelf, like sets on Quizlet: each opens its own page (study, levels,
 * words). The one in focus and the ones studied lately come first; the words in no list have a
 * tile of their own, to be sorted into lists.
 */
export function WordListsView({
  db,
  language,
  lists,
  vocabulary,
  states,
  focusListId,
  onListsChanged,
  onOpenList,
  collabIds,
}: {
  db: KelimeDB
  language: TargetLanguage
  lists: WordList[]
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  focusListId?: string
  onListsChanged: () => void
  onOpenList: (id: string) => void
  /** Lists this device keeps in step with others. */
  collabIds: ReadonlySet<string>
}) {
  const [name, setName] = useState('')
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const ordered = useMemo(() => listOrder(lists, vocabulary, stateById, focusListId), [lists, vocabulary, stateById, focusListId])
  const unlisted = useMemo(() => unlistedWords(vocabulary, lists), [vocabulary, lists])
  // "Now" moves on with the answers, not on every render.
  const now = useMemo(() => new Date(), [states]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const stamp = new Date().toISOString()
    const list: WordList = { id: newListId(), language, name: n, levels: [], createdAt: stamp, updatedAt: stamp }
    await db.saveList(list)
    setName('')
    onListsChanged()
    showToast(`"${n}" listesi oluşturuldu.`)
    // A new list opens, ready for its words, as a new set does on Quizlet.
    onOpenList(list.id)
  }

  return (
    <section className="stack mt-4 word-lists">
      <form className="row nowrap wl-create" onSubmit={create}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Yeni liste: Seyahat, İş, bir kitap…" aria-label="Yeni listenin adı" maxLength={60} />
        <button className="btn" type="submit" disabled={!name.trim()}>
          <PlusIcon size={16} className="inline-icon" />
          Oluştur
        </button>
      </form>
      {lists.length === 0 && (
        <EmptyState art="library" title="Henüz liste yok">
          Kelimelerini konulara ayır (Seyahat, İş, bir kitap…): her listenin kendi sayfası, çalışma düğmeleri ve isteğe bağlı seviyeleri olur. Bir listeye odaklanınca yeni kelimeler yalnızca
          ondan gelir; konular birbirine karışmaz.
        </EmptyState>
      )}
      {(ordered.length > 0 || unlisted.length > 0) && (
        <ul className="wl-grid">
          {ordered.map((list) => {
            const words = listWords(list, vocabulary)
            const p = progressOf(words, stateById)
            const due = dueCount(words, stateById, now)
            const cover = listCover(list.name)
            const done = listDone(p)
            return (
              <li key={list.id}>
                <button type="button" className="wl-tile" aria-current={list.id === focusListId ? 'true' : undefined} onClick={() => onOpenList(list.id)}>
                  <span className="wl-tile-head">
                    {cover && <img className="wl-cover" src={cover} alt="" width={40} height={40} />}
                    <span className="wl-name">{list.name}</span>
                  </span>
                  {(list.id === focusListId || collabIds.has(list.id) || done) && (
                    <span className="row wl-badges">
                      {done && <DoneBadge />}
                      {list.id === focusListId && (
                        <span className="badge wl-focus-badge">
                          <TargetIcon size={14} className="inline-icon" />
                          Odakta
                        </span>
                      )}
                      {collabIds.has(list.id) && <span className="badge wl-focus-badge">Ortak</span>}
                    </span>
                  )}
                  <span className="small muted">{words.length ? meta(p) : 'Boş liste'}</span>
                  {words.length > 0 && <Bar p={p} />}
                  {due > 0 && <span className="small wl-due">{due} kelime tekrar bekliyor</span>}
                </button>
              </li>
            )
          })}
          {unlisted.length > 0 && (
            <li>
              <button type="button" className="wl-tile wl-tile-unlisted" onClick={() => onOpenList(UNLISTED)}>
                <span className="wl-tile-head">
                  <span className="wl-name">Listesiz</span>
                </span>
                <span className="small muted">{unlisted.length} kelime hiçbir listede değil</span>
                <span className="small wl-due">Listelere dağıt ›</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
