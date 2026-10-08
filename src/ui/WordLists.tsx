import { useMemo, useState, type FormEvent } from 'react'
import { displayForm } from '../engine/exercises'
import { currentLevel, levelGroups, listWords, newLevelId, progressOf, type GroupProgress } from '../engine/lists'
import type { ListLevel, TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { ConfirmDialog } from './Dialog'
import { EmptyState } from './EmptyState'
import { ChevronDownIcon, PlusIcon, TargetIcon } from './icons'
import { showToast } from './toast'
import { newListId } from './wordListId'

/** Met and learned as one bar: the learned part solid, the met part lighter. */
function Bar({ p }: { p: GroupProgress }) {
  const pct = (n: number) => (p.total ? (n / p.total) * 100 : 0)
  return (
    <div className="wl-bar" role="img" aria-label={`${p.total} kelimeden ${p.met} tanıştı, ${p.learned} öğrenildi`}>
      <span className="wl-bar-met" style={{ width: `${pct(p.met)}%` }} />
      <span className="wl-bar-learned" style={{ width: `${pct(p.learned)}%` }} />
    </div>
  )
}

const meta = (p: GroupProgress) => `${p.total} kelime · ${p.met} tanıştı · ${p.learned} öğrenildi`

/** A name typed in place: Enter saves, Esc or an empty name cancels. */
function NameForm({ initial, label, onSave, onCancel }: { initial: string; label: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial)
  return (
    <form
      className="row nowrap grow"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSave(name.trim())
        else onCancel()
      }}
    >
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onCancel()} aria-label={label} autoFocus />
      <button className="btn btn-sm" type="submit">
        Kaydet
      </button>
    </form>
  )
}

/**
 * Lists, like courses on Memrise, each with the learner's own levels (named categories in their
 * own order). A list in focus is where the daily plan takes its new words from, level by level;
 * reviews keep coming from every list.
 */
export function WordListsView({
  db,
  language,
  lists,
  vocabulary,
  states,
  focusListId,
  onFocus,
  onListsChanged,
  onOpen,
  onStudy,
}: {
  db: KelimeDB
  language: TargetLanguage
  lists: WordList[]
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  focusListId?: string
  onFocus: (listId: string | null) => void
  onListsChanged: () => void
  onOpen: (id: string) => void
  onStudy: (entries: VocabularyEntry[]) => void
}) {
  const [name, setName] = useState('')
  // What is being renamed: a list id, or "list|level".
  const [renaming, setRenaming] = useState<string | null>(null)
  const [levelName, setLevelName] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<WordList | null>(null)
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const listIds = useMemo(() => new Set(lists.map((l) => l.id)), [lists])
  const unlisted = useMemo(() => vocabulary.filter((v) => v.source !== 'sample' && (!v.listId || !listIds.has(v.listId))), [vocabulary, listIds])

  const stamp = () => new Date().toISOString()
  const save = async (list: WordList) => {
    await db.saveList({ ...list, updatedAt: stamp() })
    onListsChanged()
  }
  const create = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    await db.saveList({ id: newListId(), language, name: n, levels: [], createdAt: stamp(), updatedAt: stamp() })
    setName('')
    onListsChanged()
    showToast(`"${n}" listesi oluşturuldu.`)
  }
  const addLevel = async (list: WordList) => {
    const n = (levelName[list.id] ?? '').trim()
    if (!n) return
    await save({ ...list, levels: [...(list.levels ?? []), { id: newLevelId(), name: n }] })
    setLevelName((m) => ({ ...m, [list.id]: '' }))
  }
  const moveLevel = (list: WordList, i: number, by: -1 | 1) => {
    const levels = [...(list.levels ?? [])]
    const j = i + by
    if (j < 0 || j >= levels.length) return
    ;[levels[i], levels[j]] = [levels[j], levels[i]]
    void save({ ...list, levels })
  }
  const renameLevel = (list: WordList, level: ListLevel, n: string) => {
    setRenaming(null)
    void save({ ...list, levels: (list.levels ?? []).map((l) => (l.id === level.id ? { ...l, name: n } : l)) })
  }
  const deleteLevel = async (list: WordList, level: ListLevel) => {
    await db.deleteLevel(list, level.id)
    onListsChanged()
    showToast(`"${level.name}" seviyesi silindi; kelimeleri listede kaldı.`)
  }

  return (
    <section className="stack mt-4 word-lists">
      <form className="row nowrap wl-create" onSubmit={create}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Yeni liste: Seyahat, İş, bir kitap…" aria-label="Yeni listenin adı" />
        <button className="btn" type="submit" disabled={!name.trim()}>
          <PlusIcon size={16} className="inline-icon" />
          Oluştur
        </button>
      </form>
      {lists.length === 0 && (
        <EmptyState art="library" title="Henüz liste yok">
          Kelimelerini Memrise'daki gibi listelere ve kendi adlandırdığın seviyelere ayır (ör. Seyahat › 1. Havalimanı, 2. Otel). Bir listeye odaklanınca yeni kelimeler yalnızca ondan,
          seviye seviye gelir; konular birbirine karışmaz.
        </EmptyState>
      )}
      {lists.map((list) => {
        const words = listWords(list, vocabulary)
        const groups = levelGroups(list, vocabulary)
        const p = progressOf(words, stateById)
        const now = currentLevel(groups, stateById)
        const focused = list.id === focusListId
        const levels = list.levels ?? []
        return (
          <article key={list.id} className={`card stack gap-3 wl-card${focused ? ' is-focus' : ''}`}>
            <header className="wl-card-head">
              {renaming === list.id ? (
                <NameForm
                  initial={list.name}
                  label="Listenin yeni adı"
                  onCancel={() => setRenaming(null)}
                  onSave={(n) => {
                    setRenaming(null)
                    void save({ ...list, name: n })
                  }}
                />
              ) : (
                <h3 className="wl-name">
                  {list.name}
                  {focused && (
                    <span className="badge wl-focus-badge">
                      <TargetIcon size={13} className="inline-icon" />
                      Odakta
                    </span>
                  )}
                </h3>
              )}
              <span className="small muted">{meta(p)}</span>
            </header>
            <Bar p={p} />
            {words.length === 0 && (
              <p className="small muted">
                Boş liste. Kelime eklerken bu listeyi seç ya da "Tümü" görünümünde kelimeleri seçip <strong>Listeye taşı</strong> ile ekle.
              </p>
            )}
            {focused && words.length > 0 && (
              <p className="small muted">
                {now
                  ? `Yeni kelimeler bu listeden geliyor, şu an: ${now.level ? `“${now.level.name}” seviyesi` : 'seviyesiz kelimeler'}.`
                  : 'Bu listedeki bütün kelimelerle tanıştın; yeni kelimeler için başka bir listeye odaklan.'}
              </p>
            )}
            {groups.length > 0 && (
              <ol className="wl-sections">
                {groups.map((g, i) => {
                  const gp = progressOf(g.words, stateById)
                  const key = g.level ? `${list.id}|${g.level.id}` : `${list.id}|none`
                  const at = g.level ? levels.findIndex((l) => l.id === g.level!.id) : -1
                  return (
                    <li key={key}>
                      <details open={focused && now?.index === i}>
                        <summary>
                          <span>{g.level ? `${at + 1}. ${g.level.name}` : 'Seviyesiz'}</span>
                          <span className="small muted">
                            {gp.met}/{gp.total} tanıştı
                          </span>
                          {now?.index === i && focused && <span className="wl-next">sıradaki</span>}
                        </summary>
                        <div className="stack gap-2 wl-words">
                          {renaming === key && g.level ? (
                            <NameForm initial={g.level.name} label="Seviyenin yeni adı" onCancel={() => setRenaming(null)} onSave={(n) => renameLevel(list, g.level!, n)} />
                          ) : null}
                          {g.words.length > 0 ? (
                            <ul className="wl-chips">
                              {g.words.map((w) => (
                                <li key={w.id}>
                                  <button type="button" className="link" lang={w.language} onClick={() => onOpen(w.id)}>
                                    {displayForm(w)}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="small muted">Bu seviyede henüz kelime yok.</p>
                          )}
                          <div className="row wl-level-actions">
                            {g.words.length > 0 && (
                              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStudy(g.words)}>
                                Bu seviyeyi çalış
                              </button>
                            )}
                            {g.level && (
                              <>
                                <span className="grow" />
                                <button type="button" className="icon-btn icon-btn-sm wl-up" aria-label="Yukarı taşı" title="Yukarı taşı" disabled={at === 0} onClick={() => moveLevel(list, at, -1)}>
                                  <ChevronDownIcon size={16} />
                                </button>
                                <button type="button" className="icon-btn icon-btn-sm" aria-label="Aşağı taşı" title="Aşağı taşı" disabled={at === levels.length - 1} onClick={() => moveLevel(list, at, 1)}>
                                  <ChevronDownIcon size={16} />
                                </button>
                                <button type="button" className="link small" onClick={() => setRenaming(key)}>
                                  Yeniden adlandır
                                </button>
                                <button type="button" className="link small wl-delete" onClick={() => void deleteLevel(list, g.level!)}>
                                  Sil
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ol>
            )}
            <form
              className="row nowrap wl-add-level"
              onSubmit={(e) => {
                e.preventDefault()
                void addLevel(list)
              }}
            >
              <input
                className="input"
                value={levelName[list.id] ?? ''}
                onChange={(e) => setLevelName((m) => ({ ...m, [list.id]: e.target.value }))}
                placeholder={levels.length ? 'Yeni seviye' : 'İlk seviye: Selamlaşma, Yiyecekler…'}
                aria-label={`${list.name} listesine yeni seviye`}
              />
              <button className="btn btn-quiet btn-sm" type="submit" disabled={!(levelName[list.id] ?? '').trim()}>
                Seviye ekle
              </button>
            </form>
            <div className="row wl-actions">
              <button type="button" className={focused ? 'btn btn-quiet btn-sm' : 'btn btn-sm'} onClick={() => onFocus(focused ? null : list.id)} disabled={!focused && words.length === 0}>
                {focused ? 'Odaktan çık' : 'Odaklan'}
              </button>
              {words.length > 0 && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStudy(words)}>
                  Listeyi çalış
                </button>
              )}
              <span className="grow" />
              <button type="button" className="link small" onClick={() => setRenaming(list.id)}>
                Yeniden adlandır
              </button>
              <button type="button" className="link small wl-delete" onClick={() => setDeleting(list)}>
                Sil
              </button>
            </div>
          </article>
        )
      })}
      {lists.length > 0 && unlisted.length > 0 && (
        <article className="card stack gap-2 wl-card is-unlisted">
          <header className="wl-card-head">
            <h3 className="wl-name">Listesiz</h3>
            <span className="small muted">{unlisted.length} kelime</span>
          </header>
          <p className="small muted">
            "Tümü" görünümünde <strong>Seç</strong> ile işaretleyip <strong>Listeye taşı</strong> ile bir listeye ya da seviyesine yerleştirebilirsin. Odak açıkken yeni kelimeler
            bunlardan gelmez.
          </p>
        </article>
      )}

      {deleting && (
        <ConfirmDialog
          title={`"${deleting.name}" silinsin mi?`}
          confirmLabel="Listeyi sil"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const list = deleting
            setDeleting(null)
            await db.deleteList(list.id)
            if (list.id === focusListId) onFocus(null)
            onListsChanged()
            showToast(`"${list.name}" silindi; kelimeleri yerinde.`)
          }}
        >
          Liste ve seviyeleri silinir; içindeki kelimeler ve öğrendiklerin kalır, listesiz olurlar.
        </ConfirmDialog>
      )}
    </section>
  )
}
