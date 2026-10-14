import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { listCover } from './drawnArt'
import { displayForm } from '../engine/exercises'
import { currentLevel, dueCount, levelGroups, listWords, newLevelId, progressOf, unlistedWords } from '../engine/lists'
import type { ListLevel, TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { ConfirmDialog } from './Dialog'
import { EmptyState } from './EmptyState'
import { ChevronDownIcon, MoreIcon, PlusIcon, TargetIcon } from './icons'
import { showToast } from './toastFeed'
import { ShareList } from './ShareList'
import { getCollabs, syncCollab, ShareError } from '../data/share'
import { MenuItem, Popover } from './Popover'
import { GameIcon } from './GameIcon'
import { GAME_LIST, type GameId } from './gameList'
import { presetList } from './studyOptionsStore'
import { rememberPlacement } from './listMemory'
import { Bar } from './WordLists'
import { progressLine as meta } from './listOptions'
import { lastListTest } from './listTests'
import { AskMonki } from './monki/AskMonki'
import { talkWords } from './monki/monkiWords'

/** The rounds that can take one list: the game, and the name its study choices are kept under. */
const LIST_GAMES: { id: GameId; use: string; label: string }[] = [
  { id: 'swipe', use: 'flashcards', label: 'Kartlar' },
  { id: 'test', use: 'test', label: 'Sınav ol' },
  { id: 'truefalse', use: 'truefalse', label: 'Doğru mu?' },
  { id: 'gravity', use: 'gravity', label: 'Yerçekimi' },
]
const emojiOf = (id: GameId) => GAME_LIST.find((g) => g.id === id)?.emoji ?? ''

/** How long ago, in days: "bugün", "dün", "3 gün önce". */
function daysAgo(iso: string, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const n = Math.round((day(now) - day(new Date(iso))) / 86_400_000)
  return n <= 0 ? 'bugün' : n === 1 ? 'dün' : `${n} gün önce`
}

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
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onCancel()} aria-label={label} maxLength={60} autoFocus />
      <button className="btn btn-sm" type="submit">
        Kaydet
      </button>
    </form>
  )
}

interface Props {
  db: KelimeDB
  language: TargetLanguage
  /** The list shown; null for the words in no list. */
  list: WordList | null
  lists: WordList[]
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  focusListId?: string
  onFocus: (listId: string | null) => void
  onListsChanged: () => void
  onOpen: (id: string) => void
  onStudy: (entries: VocabularyEntry[]) => void
  /** Opens a game set to this list. */
  onPlay?: (game: GameId) => void
  /** Opens the form to add a word (which goes to this list). */
  onAdd: () => void
  /** Back to the shelf of lists (after the list is deleted, too). */
  onBack: () => void
  /** The list's words, searchable and selectable (the words screen's own list). */
  children: ReactNode
}

/**
 * One list's own page, like a set on Quizlet: how far along it is, the ways to study it (the
 * spaced sessions, and the card rounds set to this list), its levels, and its words.
 */
export function ListPage({ db, language, list, lists, vocabulary, states, focusListId, onFocus, onListsChanged, onOpen, onStudy, onPlay, onAdd, onBack, children }: Props) {
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const words = useMemo(() => (list ? listWords(list, vocabulary) : unlistedWords(vocabulary, lists)), [list, vocabulary, lists])
  const groups = useMemo(() => (list ? levelGroups(list, vocabulary) : []), [list, vocabulary])
  const p = progressOf(words, stateById)
  // "Now" moves on with the answers, not on every render.
  const now = useMemo(() => new Date(), [states]) // eslint-disable-line react-hooks/exhaustive-deps
  const due = dueCount(words, stateById, now)
  const at = currentLevel(groups, stateById)
  const focused = !!list && list.id === focusListId
  const levels = list?.levels ?? []

  // What is being renamed: the list ("list"), or a level by its id.
  const [renaming, setRenaming] = useState<string | null>(null)
  const [levelName, setLevelName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [collab, setCollab] = useState(false)
  const [syncing, setSyncing] = useState(false)
  useEffect(() => {
    if (!list) return
    // The list opened is where words added next go (the form can still pick another).
    rememberPlacement(language, list.id)
    let live = true
    void getCollabs(db)
      .then((links) => live && setCollab(links.some((l) => l.listId === list.id)))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [db, language, list, sharing])

  const save = async (next: WordList) => {
    await db.saveList({ ...next, updatedAt: new Date().toISOString() })
    onListsChanged()
  }
  const addLevel = async () => {
    const n = levelName.trim()
    if (!list || !n) return
    await save({ ...list, levels: [...levels, { id: newLevelId(), name: n }] })
    setLevelName('')
  }
  const moveLevel = (i: number, by: -1 | 1) => {
    const j = i + by
    if (!list || j < 0 || j >= levels.length) return
    const next = [...levels]
    ;[next[i], next[j]] = [next[j], next[i]]
    void save({ ...list, levels: next })
  }
  const renameLevel = (level: ListLevel, n: string) => {
    setRenaming(null)
    if (list) void save({ ...list, levels: levels.map((l) => (l.id === level.id ? { ...l, name: n } : l)) })
  }
  const deleteLevel = async (level: ListLevel) => {
    if (!list) return
    await db.deleteLevel(list, level.id)
    onListsChanged()
    showToast(`"${level.name}" seviyesi silindi; kelimeleri listede kaldı.`)
  }
  const syncNow = async () => {
    if (!list) return
    setSyncing(true)
    try {
      const link = (await getCollabs(db)).find((l) => l.listId === list.id)
      if (link) {
        const r = await syncCollab(db, link)
        onListsChanged()
        showToast(r.added + r.updated + r.removed || r.pushed ? `Ortak liste eşitlendi: ${r.added} yeni, ${r.updated} değişen, ${r.removed} silinen kelime.` : 'Ortak liste güncel.')
      }
    } catch (e) {
      showToast(e instanceof ShareError ? e.message : 'Eşitlenemedi.', undefined, 5000, 'info')
    } finally {
      setSyncing(false)
    }
  }
  const play = (g: (typeof LIST_GAMES)[number]) => {
    if (!list || !onPlay) return
    presetList(g.use, list.id)
    onPlay(g.id)
  }
  const cover = list ? listCover(list.name) : undefined
  const lastTest = list ? lastListTest(list.id) : undefined

  return (
    <section className="stack mt-4 list-page">
      <article className={`card stack gap-3 wl-card wl-hero${focused ? ' is-focus' : ''}`}>
        <header className="wl-hero-top">
          {cover ? (
            <img className="wl-cover wl-hero-cover" src={cover} alt="" width={72} height={72} />
          ) : (
            <span className="wl-hero-cover wl-hero-initial" aria-hidden>
              {(list?.name ?? '?').charAt(0).toLocaleUpperCase('tr')}
            </span>
          )}
          <div className="wl-hero-title">
            {list && renaming === 'list' ? (
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
              <h2 className="wl-name wl-page-name">{list ? list.name : 'Listesiz kelimeler'}</h2>
            )}
            {(focused || collab || levels.length > 0) && (
              <span className="row wl-badges">
                {focused && (
                  <span className="badge wl-focus-badge">
                    <TargetIcon size={14} className="inline-icon" />
                    Odakta
                  </span>
                )}
                {collab && <span className="badge wl-focus-badge">Ortak</span>}
                {levels.length > 0 && <span className="badge wl-focus-badge">{levels.length} seviye</span>}
              </span>
            )}
          </div>
          {list && (
            <div className="wl-hero-tools">
              <button type="button" className="icon-btn" onClick={onAdd} aria-label="Bu listeye kelime ekle" title="Bu listeye kelime ekle">
                <PlusIcon size={18} />
              </button>
              <Popover kind="menu" align="end" label="Liste işlemleri" buttonClassName="icon-btn" buttonProps={{ 'aria-label': 'Liste işlemleri', title: 'Liste işlemleri' }} button={<MoreIcon size={18} />}>
                {(close) => (
                  <>
                    <MenuItem
                      title="Yeniden adlandır"
                      onSelect={() => {
                        close()
                        setRenaming('list')
                      }}
                    />
                    <MenuItem
                      title="Paylaş"
                      hint="Bağlantı, QR ya da ortak liste"
                      onSelect={() => {
                        close()
                        setSharing(true)
                      }}
                    />
                    {collab && (
                      <MenuItem
                        title={syncing ? 'Eşitleniyor…' : 'Ortak listeyi eşitle'}
                        onSelect={() => {
                          close()
                          void syncNow()
                        }}
                      />
                    )}
                    <MenuItem
                      title="Listeyi sil"
                      hint="Kelimeler ve öğrendiklerin kalır"
                      onSelect={() => {
                        close()
                        setDeleting(true)
                      }}
                    />
                  </>
                )}
              </Popover>
            </div>
          )}
        </header>
        {words.length > 0 && (
          <>
            <dl className="wl-figures" aria-label={meta(p)}>
              <div>
                <dd>{p.total}</dd>
                <dt>kelime</dt>
              </div>
              <div>
                <dd>{p.met}</dd>
                <dt>tanıştın</dt>
              </div>
              <div>
                <dd>{p.learned}</dd>
                <dt>öğrendin</dt>
              </div>
              <div className={due > 0 ? 'wl-figure-due' : undefined}>
                <dd>{due}</dd>
                <dt>tekrar bekliyor</dt>
              </div>
            </dl>
            <Bar p={p} />
          </>
        )}
        {!list && (
          <p className="small muted">
            Bunlar hiçbir listede değil. Aşağıda <strong>Seç</strong> ile işaretleyip <strong>Listeye ekle</strong> ile bir listeye ya da seviyesine taşı.
          </p>
        )}
        {words.length > 0 ? (
          <>
            <div className="row wl-study">
              <button type="button" className="btn btn-lg" onClick={() => onStudy(words)}>
                {list ? 'Listeyi çalış' : 'Bunları çalış'}
              </button>
              <span className="small muted">Aralıklı tekrarla: unutmak üzere olanlar önce.</span>
            </div>
            {list && onPlay && (
              <div className="wl-games" role="group" aria-label="Bu listeyle oyna">
                {LIST_GAMES.map((g) => (
                  <button key={g.id} type="button" className="btn btn-quiet btn-sm wl-game" onClick={() => play(g)}>
                    <GameIcon id={g.id} emoji={emojiOf(g.id)} size={20} />
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {list && (
              <AskMonki
                label="Monki'yle bu kelimelerle konuş"
                ask={() => {
                  const targets = talkWords(words, stateById)
                  return { text: `Şu kelimeleri kullanacağım kısa bir sohbet yapalım: ${targets.join(', ')}. Sen başlat.`, mode: 'words', targets, send: true }
                }}
              />
            )}
            {lastTest && (
              <p className="small muted wl-last-test">
                Son sınav: <strong>%{lastTest.percent}</strong> · {daysAgo(lastTest.at)}
              </p>
            )}
          </>
        ) : (
          list && (
            <EmptyState
              art={collab ? 'together' : 'library'}
              title="Bu liste boş"
              action={
                <button type="button" className="btn" onClick={onAdd}>
                  <PlusIcon size={16} className="inline-icon" />
                  Kelime ekle
                </button>
              }
            >
              Eklediğin kelimeler bu listeye girer. Var olan kelimeleri taşımak için "Tümü"nde <strong>Seç</strong> ve <strong>Listeye ekle</strong>.
            </EmptyState>
          )
        )}
        {list && (
          <div className="wl-focus-row">
            <button type="button" className="chip" aria-pressed={focused} onClick={() => onFocus(focused ? null : list.id)} disabled={!focused && words.length === 0}>
              <TargetIcon size={16} className="inline-icon" />
              {focused ? 'Odakta' : 'Odaklan'}
            </button>
            <span className="small muted">
              {focused
                ? at
                  ? `Bugün’ün yeni kelimeleri bu listeden geliyor${at.level ? `, şu an “${at.level.name}” seviyesi` : ''}.`
                  : 'Bu listedeki bütün kelimelerle tanıştın; yeni kelimeler için başka bir listeye odaklan.'
                : 'Odaklanınca Bugün’ün yeni kelimeleri yalnızca bu listeden gelir.'}
            </span>
          </div>
        )}
        {list && sharing && <ShareList db={db} list={list} vocabulary={vocabulary} onChanged={onListsChanged} />}
      </article>

      {list && (
        <details className="card wl-levels" open={levels.length > 0}>
          <summary className="wl-levels-summary">
            <span className="section-title">Seviyeler</span>
            <span className="small muted">{levels.length ? `${levels.length} seviye` : 'isteğe bağlı'}</span>
            <ChevronDownIcon size={18} className="wl-levels-chev" />
          </summary>
          <div className="stack gap-3 wl-levels-body">
          {levels.length === 0 && <p className="small muted">İstersen listeyi sıralı seviyelere böl (ör. 1. Havalimanı, 2. Otel): odaklanınca yeni kelimeler seviye seviye gelir.</p>}
          {levels.length > 0 && groups.length > 0 && (
            <ol className="wl-sections">
              {groups.map((g, i) => {
                const gp = progressOf(g.words, stateById)
                const index = g.level ? levels.findIndex((l) => l.id === g.level!.id) : -1
                return (
                  <li key={g.level?.id ?? 'none'}>
                    <details open={focused && at?.index === i}>
                      <summary>
                        <span>{g.level ? `${index + 1}. ${g.level.name}` : 'Seviyesiz'}</span>
                        <span className="small muted">
                          {gp.met}/{gp.total} tanıştı
                        </span>
                        {at?.index === i && focused && <span className="wl-next">sıradaki</span>}
                      </summary>
                      <div className="stack gap-2 wl-words">
                        {renaming === g.level?.id && g.level ? <NameForm initial={g.level.name} label="Seviyenin yeni adı" onCancel={() => setRenaming(null)} onSave={(n) => renameLevel(g.level!, n)} /> : null}
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
                              <button type="button" className="icon-btn icon-btn-sm wl-up" aria-label="Yukarı taşı" title="Yukarı taşı" disabled={index === 0} onClick={() => moveLevel(index, -1)}>
                                <ChevronDownIcon size={16} />
                              </button>
                              <button type="button" className="icon-btn icon-btn-sm" aria-label="Aşağı taşı" title="Aşağı taşı" disabled={index === levels.length - 1} onClick={() => moveLevel(index, 1)}>
                                <ChevronDownIcon size={16} />
                              </button>
                              <button type="button" className="link small" onClick={() => setRenaming(g.level!.id)}>
                                Yeniden adlandır
                              </button>
                              <button type="button" className="link small wl-delete" onClick={() => void deleteLevel(g.level!)}>
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
              void addLevel()
            }}
          >
            <input
              className="input"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              placeholder={levels.length ? 'Yeni seviye' : 'İlk seviye: Selamlaşma, Yiyecekler…'}
              aria-label={`${list.name} listesine yeni seviye`}
              maxLength={60}
            />
            <button className="btn btn-quiet btn-sm" type="submit" disabled={!levelName.trim()}>
              Seviye ekle
            </button>
          </form>
          </div>
        </details>
      )}

      {words.length > 0 && children}

      {list && deleting && (
        <ConfirmDialog
          title={`"${list.name}" silinsin mi?`}
          confirmLabel="Listeyi sil"
          danger
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false)
            await db.deleteList(list.id)
            if (focused) onFocus(null)
            onListsChanged()
            onBack()
            showToast(`"${list.name}" silindi; kelimeleri yerinde.`)
          }}
        >
          Liste ve seviyeleri silinir; içindeki kelimeler ve öğrendiklerin kalır, listesiz olurlar.
        </ConfirmDialog>
      )}
    </section>
  )
}
