import { useMemo, useState, type FormEvent } from 'react'
import { displayForm } from '../engine/exercises'
import { currentSection, LEVELS, levelOf, listWords, progressOf, sections, SECTION_SIZE, type GroupProgress } from '../engine/lists'
import type { CefrLevel, TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { ConfirmDialog } from './Dialog'
import { EmptyState } from './EmptyState'
import { PlusIcon, TargetIcon } from './icons'
import { showToast } from './toast'

export const newListId = () => `list:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

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

/** The words of a group as small links, then a button to study them. */
function GroupWords({ words, onOpen, onStudy, label }: { words: VocabularyEntry[]; onOpen: (id: string) => void; onStudy: () => void; label: string }) {
  return (
    <div className="stack gap-2 wl-words">
      <ul className="wl-chips">
        {words.map((w) => (
          <li key={w.id}>
            <button type="button" className="link" lang={w.language} onClick={() => onOpen(w.id)}>
              {displayForm(w)}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-quiet btn-sm justify-self-start" onClick={onStudy}>
        {label}
      </button>
    </div>
  )
}

/**
 * Lists (Memrise-style courses, studied section by section) and levels. A list in focus is where
 * the daily plan takes its new words from; reviews keep coming from every list.
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
  const [mode, setMode] = useState<'lists' | 'levels'>('lists')
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<WordList | null>(null)
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const own = useMemo(() => vocabulary.filter((v) => v.source !== 'sample'), [vocabulary])
  const listIds = useMemo(() => new Set(lists.map((l) => l.id)), [lists])
  const unlisted = useMemo(() => own.filter((v) => !v.listId || !listIds.has(v.listId)), [own, listIds])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const at = new Date().toISOString()
    await db.saveList({ id: newListId(), language, name: n, createdAt: at, updatedAt: at })
    setName('')
    onListsChanged()
    showToast(`"${n}" listesi oluşturuldu.`)
  }
  const rename = async (list: WordList) => {
    const n = newName.trim()
    if (n && n !== list.name) await db.saveList({ ...list, name: n, updatedAt: new Date().toISOString() })
    setRenaming(null)
    onListsChanged()
  }

  return (
    <section className="stack mt-4 word-lists">
      <div className="row wl-head">
        <div className="seg-group" role="radiogroup" aria-label="Gruplama">
          <button type="button" role="radio" className="seg-btn" aria-checked={mode === 'lists'} onClick={() => setMode('lists')}>
            Listeler
          </button>
          <button type="button" role="radio" className="seg-btn" aria-checked={mode === 'levels'} onClick={() => setMode('levels')}>
            Seviyeler
          </button>
        </div>
      </div>

      {mode === 'lists' ? (
        <>
          <form className="row nowrap wl-create" onSubmit={create}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Yeni liste: Seyahat, İş, bir kitap…" aria-label="Yeni listenin adı" />
            <button className="btn" type="submit" disabled={!name.trim()}>
              <PlusIcon size={16} className="inline-icon" />
              Oluştur
            </button>
          </form>
          {lists.length === 0 && (
            <EmptyState art="library" title="Henüz liste yok">
              Kelimelerini konulara ayır: her liste {SECTION_SIZE} kelimelik bölümlerle çalışılır. Bir listeye odaklanınca yeni kelimeler yalnızca ondan gelir, konular birbirine
              karışmaz. Kelimeleri "Tümü" görünümünde seçip <strong>Listeye taşı</strong> ile yerleştirebilirsin.
            </EmptyState>
          )}
          {lists.map((list) => {
            const words = listWords(list, vocabulary)
            const p = progressOf(words, stateById)
            const now = currentSection(words, stateById)
            const focused = list.id === focusListId
            return (
              <article key={list.id} className={`card stack gap-3 wl-card${focused ? ' is-focus' : ''}`}>
                <header className="wl-card-head">
                  {renaming === list.id ? (
                    <form
                      className="row nowrap grow"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void rename(list)
                      }}
                    >
                      <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Listenin yeni adı" autoFocus />
                      <button className="btn btn-sm" type="submit">
                        Kaydet
                      </button>
                    </form>
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
                {words.length === 0 && <p className="small muted">Boş liste. "Tümü" görünümünde kelimeleri seçip <strong>Listeye taşı</strong> ile ekle ya da kelime eklerken bu listeyi seç.</p>}
                {focused && (
                  <p className="small muted">
                    {now ? `Yeni kelimeler bu listeden geliyor: ${now.index}. bölüm (${now.count} bölümden).` : 'Bu listedeki bütün kelimelerle tanıştın; yeni kelimeler için başka bir listeye odaklan.'}
                  </p>
                )}
                {words.length > 0 && (
                  <ol className="wl-sections">
                    {sections(words).map((sec, i) => {
                      const sp = progressOf(sec, stateById)
                      return (
                        <li key={i}>
                          <details open={focused && now?.index === i + 1}>
                            <summary>
                              <span>{i + 1}. bölüm</span>
                              <span className="small muted">
                                {sp.met}/{sp.total} tanıştı
                              </span>
                              {now?.index === i + 1 && <span className="wl-next">sıradaki</span>}
                            </summary>
                            <GroupWords words={sec} onOpen={onOpen} onStudy={() => onStudy(sec)} label="Bu bölümü çalış" />
                          </details>
                        </li>
                      )
                    })}
                  </ol>
                )}
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
                  <button
                    type="button"
                    className="link small"
                    onClick={() => {
                      setNewName(list.name)
                      setRenaming(list.id)
                    }}
                  >
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
                "Tümü" görünümünde <strong>Seç</strong> ile işaretleyip <strong>Listeye taşı</strong> ile bir listeye yerleştirebilirsin. Odak açıkken yeni kelimeler bunlardan gelmez.
              </p>
            </article>
          )}
        </>
      ) : (
        <>
          <p className="small muted">
            Seviye, kelimenin dildeki kullanım sıklığından yaklaşık olarak çıkarılır (en sık 1000 kelime A1, sonraki 1000 A2…). Kelime sayfasından değiştirebilirsin.
          </p>
          {[...LEVELS, null].map((level: CefrLevel | null) => {
            const words = vocabulary.filter((v) => levelOf(v) === level)
            if (!words.length) return null
            const p = progressOf(words, stateById)
            return (
              <article key={level ?? 'none'} className="card stack gap-3 wl-card">
                <header className="wl-card-head">
                  <h3 className="wl-name">{level ?? 'Seviyesiz'}</h3>
                  <span className="small muted">{meta(p)}</span>
                </header>
                <Bar p={p} />
                <details>
                  <summary className="small">Kelimeleri göster</summary>
                  <GroupWords words={words} onOpen={onOpen} onStudy={() => onStudy(words)} label={`${level ?? 'Seviyesiz'} kelimelerini çalış`} />
                </details>
              </article>
            )
          })}
        </>
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
          Liste silinir, içindeki kelimeler ve öğrendiklerin kalır; listesiz olurlar.
        </ConfirmDialog>
      )}
    </section>
  )
}
