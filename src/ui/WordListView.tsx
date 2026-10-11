import { useEffect, useMemo, useRef, useState } from 'react'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import { addedTime, type CefrLevel, type Mistake, type TargetLanguage, type UserWordState, type VocabularyEntry, type WordList as WordListRow } from '../engine/types'
import { bandOf } from '../data/wordInput'
import { BoltIcon, CheckIcon, ImageIcon, MicIcon, PlusIcon, SlidersIcon, SearchIcon } from './icons'
import { Plant } from './Plant'
import { growthStage, plantHealth } from '../engine/growth'
import { scheduler } from '../data/instance'
import { Select } from './Select'
import { useMediaUrl } from './useMedia'
import { STAGE_NAME } from './labels'
import { EmptyState } from './EmptyState'
import { nextReviewAt } from '../engine/review'
import { relativeTime } from './format'
import { getDensity, setDensity } from './density'
import { saveWordOrder } from './wordOrder'
import { placementOptions, parsePlacement } from './listOptions'
import { PosTag } from './PosTag'
import { WordLabel } from './WordLabel'
import { displayForm } from '../engine/exercises'
import { isDifficult } from '../engine/difficult'
import { imageCandidates, skippedImages } from '../data/imageQueue'
import { Popover } from './Popover'
import { useCefr } from './useCefr'
import { cefrOf } from '../engine/cefrLevels'
import { levelFromRank } from '../engine/wordLevel'
import { CULL_GROUPS, cullIds } from '../engine/cullGroups'

type StageFilter = 'all' | 'waiting' | 'learning' | 'strong' | 'mastered' | 'mistakes' | 'difficult' | 'review'
type Sort = 'newest' | 'alpha' | 'weakest' | 'strongest' | 'frequent' | 'due'
const VIEW_MODE_KEY = 'kelime-koc:words-table'
const GALLERY_KEY = 'kelime-koc:words-gallery'

const STAGE_FILTERS: [StageFilter, string][] = [
  ['all', 'Hepsi'],
  ['waiting', 'Sırada'],
  ['learning', 'Öğreniliyor'],
  ['strong', 'Sağlam'],
  ['mastered', 'Oturdu'],
  ['mistakes', 'Hatalı'],
  ['difficult', 'Zor'],
  ['review', 'İşaretlenenler'],
]

const CEFR_LEVELS_LIST: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Sort key for frequency: known ranks first, then words rarer than the list, then unknown. */
const freqKey = (e: VocabularyEntry) => (e.frequencyRank > 0 ? e.frequencyRank : e.frequencyRank < 0 ? 1e6 : 2e6)

function WordThumb({ id }: { id?: string }) {
  const url = useMediaUrl(id)
  return url ? <img className="thumb" src={url} alt="" /> : null
}

/** The picture of a word in the gallery, or its first letter on a tile in the colour of its part of speech. */
function GalleryArt({ entry }: { entry: VocabularyEntry }) {
  const url = useMediaUrl(entry.imageId)
  if (url) return <img className="gallery-art" src={url} alt="" loading="lazy" />
  return (
    <span className="gallery-art gallery-letter" data-pos={entry.partOfSpeech} lang={entry.language} aria-hidden>
      {displayForm(entry).charAt(0).toLocaleUpperCase(entry.language)}
    </span>
  )
}

/** Searchable, filterable word list. */
/** The "new list" choice among the lists a selection can be added to. */
const NEW_LIST_CHOICE = '__new'

export function WordList({
  language,
  vocabulary,
  stateById,
  mistakes,
  onOpen,
  onStudy,
  onDelete,
  onAdd,
  lists = [],
  onMove,
  onNewList,
  onMark,
  onSuggestImages,
  pictureTick = 0,
  onRemoveSamples,
}: {
  language?: TargetLanguage
  vocabulary: VocabularyEntry[]
  stateById: Map<string, UserWordState>
  mistakes: Mistake[]
  onOpen: (id: string) => void
  onStudy: (entries: VocabularyEntry[]) => void
  onDelete: (ids: string[]) => Promise<void>
  onAdd: () => void
  lists?: WordListRow[]
  /** Moves words to a list or one of its levels ("list|level"), or out of any ('__none'). */
  onMove?: (ids: string[], placement: string) => Promise<void>
  /** Makes a new list with this name and puts the words in it. */
  onNewList?: (ids: string[], name: string) => Promise<void>
  /** Marks words as hard (or clears the mark). */
  onMark?: (ids: string[], difficult: boolean) => Promise<void>
  /** Opens the picture suggestions for words without one. */
  onSuggestImages?: () => void
  /** Changes when the picture suggestions closed, so words passed over are counted out. */
  pictureTick?: number
  /** Removes the bundled sample words. */
  onRemoveSamples?: () => void
}) {
  // "Now" moves on whenever the words change (after a review), not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [stateById])
  const [query, setQuery] = useState('')
  // Selection mode: rows toggle instead of opening; shift-click selects a range.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** The name being typed for a new list made from the selection (null: not asking). */
  const [naming, setNaming] = useState<string | null>(null)
  const [stage, setStage] = useState<StageFilter>('all')
  const [flags, setFlags] = useState<{ picture?: boolean; audio?: boolean; noExample?: boolean; idiom?: boolean }>({})
  const [tag, setTag] = useState('')
  // '' all, '__none' words in no list, a list id, or "list|level".
  const [inList, setInList] = useState('')
  const [levels, setLevels] = useState<Set<CefrLevel>>(new Set())
  const cefr = useCefr(language ?? 'en')

  const toggleLevel = (lvl: CefrLevel) =>
    setLevels((prev) => {
      const next = new Set(prev)
      if (next.has(lvl)) next.delete(lvl)
      else next.add(lvl)
      return next
    })
  const [sort, setSort] = useState<Sort>('newest')
  const [dense, setDense] = useState(() => getDensity() === 'compact')
  // Table view (wide screens): every word on one line with its numbers, sortable by column.
  const [asTable, setAsTable] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === '1'
    } catch {
      return false
    }
  })
  // Gallery: a grid of pictures (or letters) instead of rows; it works on a phone too.
  const [gallery, setGallery] = useState(() => {
    try {
      return localStorage.getItem(GALLERY_KEY) === '1'
    } catch {
      return false
    }
  })
  // List, gallery or table: one choice, remembered.
  const layout: 'list' | 'gallery' | 'table' = gallery ? 'gallery' : asTable ? 'table' : 'list'
  const setLayout = (l: typeof layout) => {
    try {
      localStorage.setItem(GALLERY_KEY, l === 'gallery' ? '1' : '0')
      localStorage.setItem(VIEW_MODE_KEY, l === 'table' ? '1' : '0')
    } catch {
      // Not remembered; fine.
    }
    setGallery(l === 'gallery')
    setAsTable(l === 'table')
  }

  const difficultCount = useMemo(() => vocabulary.filter(isDifficult).length, [vocabulary])
  const reviewCount = useMemo(() => vocabulary.filter((v) => v.review).length, [vocabulary])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pictureCandidates = useMemo(() => imageCandidates(vocabulary, skippedImages()).length, [vocabulary, pictureTick])
  const withMistakes = useMemo(() => new Set(mistakes.filter((m) => !m.resolved).map((m) => m.entryId)), [mistakes])
  const tags = useMemo(() => [...new Set(vocabulary.flatMap((v) => v.tags))].sort((a, b) => a.localeCompare(b, 'tr')), [vocabulary])
  const list = useMemo(() => {
    const stageIndex = (v: VocabularyEntry) => {
      const st = stateById.get(v.id)
      return st ? MASTERY_STAGES.indexOf(masteryStage(st)) : -1
    }
    const q = query.trim().toLocaleLowerCase('tr')
    const match = (v: VocabularyEntry) => {
      if (q && ![v.lemma, v.senses[0].gloss, ...(v.senses[0].altGlosses ?? []), v.notes ?? ''].some((t) => t.toLocaleLowerCase('tr').includes(q))) return false
      const i = stageIndex(v)
      if (stage === 'waiting' && i !== -1) return false
      if (stage === 'learning' && !(i >= 0 && i <= 2)) return false
      if (stage === 'strong' && !(i === 3 || i === 4)) return false
      if (stage === 'mastered' && i !== 5) return false
      if (stage === 'mistakes' && !withMistakes.has(v.id)) return false
      if (stage === 'difficult' && !v.difficult) return false
      if (stage === 'review' && !v.review) return false
      if (flags.picture && !v.imageId) return false
      if (flags.audio && !v.audioId) return false
      if (flags.noExample && v.senses[0].examples.length > 0) return false
      if (flags.idiom && v.partOfSpeech !== 'phrase') return false
      if (levels.size > 0) {
        const lvl = (cefr && language ? cefrOf({ language, lemma: v.lemma }, cefr) : undefined) ?? levelFromRank(v.frequencyRank)
        if (!lvl || !levels.has(lvl)) return false
      }
      if (tag && !v.tags.includes(tag)) return false
      if (inList === '__none') {
        if (v.listId && lists.some((l) => l.id === v.listId)) return false
      } else if (inList) {
        const at = parsePlacement(inList)
        if (v.listId !== at.listId || (at.levelId && v.levelId !== at.levelId)) return false
      }
      return true
    }
    const dueKey = (v: VocabularyEntry) => {
      const st = stateById.get(v.id)
      return st ? (nextReviewAt(st)?.getTime() ?? Infinity) : Infinity
    }
    const by: Record<Sort, (a: VocabularyEntry, b: VocabularyEntry) => number> = {
      newest: (a, b) => addedTime(b) - addedTime(a) || a.lemma.localeCompare(b.lemma),
      alpha: (a, b) => a.lemma.localeCompare(b.lemma, 'tr'),
      weakest: (a, b) => stageIndex(a) - stageIndex(b) || (stateById.get(b.id)?.stats.wrong ?? 0) - (stateById.get(a.id)?.stats.wrong ?? 0),
      strongest: (a, b) => stageIndex(b) - stageIndex(a),
      frequent: (a, b) => freqKey(a) - freqKey(b) || a.lemma.localeCompare(b.lemma, 'tr'),
      due: (a, b) => dueKey(a) - dueKey(b) || a.lemma.localeCompare(b.lemma, 'tr'),
    }
    return vocabulary.filter(match).sort(by[sort])
  }, [vocabulary, query, stage, flags, levels, cefr, language, tag, inList, lists, sort, stateById, withMistakes])
  // The word page steps through the list in the order it was last shown here (filters and sort).
  useEffect(() => saveWordOrder(list.map((v) => v.id)), [list])
  // A long list is drawn in pages as it scrolls into view: thousands of rows at once make the
  // page slow to open, and nobody reads past the first few hundred without searching.
  const [limit, setLimit] = useState(ROW_PAGE)
  useEffect(() => setLimit(ROW_PAGE), [list])
  const shown = list.length > limit ? list.slice(0, limit) : list

  const toggle = (k: keyof typeof flags) => setFlags((f) => ({ ...f, [k]: !f[k] }))
  // What the filter panel has set apart from its defaults, for the badge on its button.
  const flagCount = Object.values(flags).filter(Boolean).length
  const activeCount = flagCount + (levels.size > 0 ? 1 : 0) + (sort !== 'newest' ? 1 : 0) + (layout !== 'list' ? 1 : 0) + (dense ? 1 : 0) + (tag ? 1 : 0) + (inList ? 1 : 0)
  const clearView = () => {
    setFlags({})
    setLevels(new Set())
    setSort('newest')
    setLayout('list')
    setTag('')
    setInList('')
    if (dense) {
      setDensity('comfortable')
      setDense(false)
    }
  }

  // Words that disappeared (deleted elsewhere) drop out of the selection.
  const selectedVisible = list.filter((v) => selected.has(v.id))
  // Quick groups for sorting a long list out (among the words shown, so a filter narrows them).
  const quick = useMemo(() => (selecting ? cullIds(list, stateById, new Date()) : null), [selecting, list, stateById])
  const pickGroup = (ids: string[]) =>
    setSelected((cur) => {
      // All of the group already selected: a second tap takes them out again.
      const all = ids.every((id) => cur.has(id))
      const next = new Set(cur)
      for (const id of ids) all ? next.delete(id) : next.add(id)
      return next
    })
  const allVisibleSelected = list.length > 0 && selectedVisible.length === list.length

  const exitSelection = () => {
    setSelecting(false)
    setSelected(new Set())
    setAnchor(null)
    setNaming(null)
  }

  const clickRow = (index: number, id: string, shift: boolean) => {
    if (!selecting) return onOpen(id)
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && anchor !== null) {
        // Range follows the state of the anchor row: select or deselect the whole span.
        const on = prev.has(list[anchor].id)
        const [a, b] = anchor < index ? [anchor, index] : [index, anchor]
        for (let i = a; i <= b; i++) {
          if (on) next.add(list[i].id)
          else next.delete(list[i].id)
        }
      } else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setAnchor(index)
  }

  useEffect(() => {
    if (!selecting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) exitSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecting])

  return (
    <section className="section stack">
      {vocabulary.length === 0 ? (
        <EmptyState
          art="garden"
          title="Bahçen ekilmeyi bekliyor"
          action={
            <button className="btn" onClick={onAdd}>
              <PlusIcon size={18} /> İlk kelimeni ekle
            </button>
          }
        >
          Her kelime bir tohum: çalıştıkça büyür, çiçek açar. Tek tek ekleyebilir ya da bir listeyi yapıştırabilirsin.
        </EmptyState>
      ) : (
        <>
          <div className="words-bar">
            <div className="search">
              <SearchIcon size={18} />
              <input type="search" enterKeyHint="search" autoCapitalize="off" autoCorrect="off" className="input" placeholder="Kelime, anlam ya da not ara" aria-label="Kelime ara" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className={`btn ${selecting ? '' : 'btn-quiet'}`} onClick={() => (selecting ? exitSelection() : setSelecting(true))}>
              {selecting ? 'Bitti' : 'Seç'}
            </button>
            <Popover
              label="Filtrele ve görünüm"
              align="end"
              buttonClassName={`btn btn-quiet filter-btn${activeCount ? ' has-active' : ''}`}
              buttonProps={{ 'aria-label': activeCount ? `Filtrele ve görünüm, ${activeCount} etkin` : 'Filtrele ve görünüm' }}
              button={
                <>
                  <SlidersIcon size={18} />
                  <span className="filter-btn-text">Filtrele</span>
                  {activeCount > 0 && <span className="filter-count" aria-hidden>{activeCount}</span>}
                </>
              }
            >
              {(close) => (
                <>
                  <div className="panel-group">
                    <span className="panel-label">Görünüm</span>
                    <div className="segmented" role="group" aria-label="Görünüm biçimi">
                      <button className="segmented-btn" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>
                        Liste
                      </button>
                      <button className="segmented-btn" aria-pressed={layout === 'gallery'} onClick={() => setLayout('gallery')}>
                        Galeri
                      </button>
                      <button className="segmented-btn desktop-only" aria-pressed={layout === 'table'} onClick={() => setLayout('table')}>
                        Tablo
                      </button>
                    </div>
                    <button
                      type="button"
                      className="chip chip-sm density-toggle"
                      aria-pressed={dense}
                      onClick={() => {
                        setDensity(dense ? 'comfortable' : 'compact')
                        setDense(!dense)
                      }}
                      title="Satırları sıklaştır"
                    >
                      Yoğun satırlar
                    </button>
                  </div>
                  <div className="panel-group">
                    <span className="panel-label">Sırala</span>
                    <Select<Sort>
                      label="Sırala"
                      value={sort}
                      onChange={setSort}
                      options={[
                        { value: 'newest', label: 'En yeni' },
                        { value: 'alpha', label: 'Alfabetik' },
                        { value: 'weakest', label: 'En zayıf önce' },
                        { value: 'strongest', label: 'En güçlü önce' },
                        { value: 'frequent', label: 'En sık önce' },
                        { value: 'due', label: 'Tekrarı en yakın' },
                      ]}
                    />
                  </div>
                  <div className="panel-group">
                    <span className="panel-label">Seviye (CEFR)</span>
                    <div className="panel-choices" role="group" aria-label="Seviye (CEFR)">
                      {CEFR_LEVELS_LIST.map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className="chip chip-sm"
                          aria-pressed={levels.has(lvl)}
                          onClick={() => toggleLevel(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(lists.length > 0 || tags.length > 0) && (
                    <div className="panel-group">
                      <span className="panel-label">Liste ve etiket</span>
                      {lists.length > 0 && (
                        <Select
                          label="Liste"
                          value={inList || '__all'}
                          onChange={(v) => setInList(v === '__all' ? '' : v)}
                          options={[{ value: '__all', label: 'Tüm listeler' }, ...placementOptions(lists)]}
                        />
                      )}
                      {tags.length > 0 && (
                        <Select
                          label="Etiket"
                          value={tag || '__all'}
                          onChange={(v) => setTag(v === '__all' ? '' : v)}
                          options={[{ value: '__all', label: 'Tüm etiketler' }, ...tags.map((t) => ({ value: t, label: `#${t}` }))]}
                        />
                      )}
                    </div>
                  )}
                  <div className="panel-group">
                    <span className="panel-label">Sadece olanlar</span>
                    <div className="panel-choices">
                      <button className="chip chip-sm" aria-pressed={!!flags.picture} onClick={() => toggle('picture')}>
                        <ImageIcon size={14} className="inline-icon" />Resimli
                      </button>
                      <button className="chip chip-sm" aria-pressed={!!flags.audio} onClick={() => toggle('audio')}>
                        <MicIcon size={14} className="inline-icon" />Sesli
                      </button>
                      <button className="chip chip-sm" aria-pressed={!!flags.noExample} onClick={() => toggle('noExample')}>
                        Örneksiz
                      </button>
                      <button className="chip chip-sm" aria-pressed={!!flags.idiom} onClick={() => toggle('idiom')}>
                        Deyimler
                      </button>
                    </div>
                  </div>
                  {(onSuggestImages && pictureCandidates > 0) || activeCount > 0 ? (
                    <div className="panel-group panel-actions">
                      {onSuggestImages && pictureCandidates > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-quiet"
                          onClick={() => {
                            close()
                            onSuggestImages()
                          }}
                        >
                          <ImageIcon size={14} className="inline-icon" />Görsel öner ({pictureCandidates})
                        </button>
                      )}
                      {activeCount > 0 && (
                        <button type="button" className="link small" onClick={clearView}>
                          Hepsini sıfırla
                        </button>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </Popover>
          </div>
          <div className="choice-row filter-row stage-row" role="group" aria-label="Aşama">
            {STAGE_FILTERS.filter(([v]) => (v !== 'difficult' || difficultCount > 0 || stage === 'difficult') && (v !== 'review' || reviewCount > 0 || stage === 'review')).map(([v, label]) => (
              <button key={v} className="chip chip-sm" aria-pressed={stage === v} onClick={() => setStage(v)}>
                {v === 'difficult' && <BoltIcon size={14} className="inline-icon" />}
                {label}
                {v === 'difficult' && ` (${difficultCount})`}
                {v === 'review' && ` (${reviewCount})`}
              </button>
            ))}
          </div>
          {onRemoveSamples && !selecting && stage === 'all' && !query && activeCount === 0 && (
            <p className="small muted sample-note">
              Bunlar denemek için yüklenen örnek kelimeler.{' '}
              <button type="button" className="link small" onClick={onRemoveSamples}>
                Örnekleri kaldır
              </button>
            </p>
          )}
          {selecting && (
            <div className="select-bar" role="toolbar" aria-label="Seçim">
              <label className="row gap-2 pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedVisible.length > 0 && !allVisibleSelected
                  }}
                  onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(list.map((v) => v.id)))}
                />
                <strong>{selectedVisible.length} seçili</strong>
              </label>
              <span className="small muted">Shift + tık: aralık seç</span>
              <span className="grow" />
              <button className="btn btn-quiet" disabled={!selectedVisible.length} onClick={() => onStudy(selectedVisible)}>
                Seçilenleri çalış
              </button>
              {onMark && (
                <button
                  className="btn btn-quiet"
                  disabled={!selectedVisible.length}
                  onClick={async () => {
                    // All marked already: this unmarks them; otherwise it marks the rest.
                    const on = selectedVisible.some((v) => !v.difficult)
                    await onMark(selectedVisible.map((v) => v.id), on)
                    exitSelection()
                  }}
                >
                  <BoltIcon size={16} className="inline-icon" />
                  {selectedVisible.length && selectedVisible.every((v) => v.difficult) ? 'Zor işaretini kaldır' : 'Zor işaretle'}
                </button>
              )}
              {onMove && (
                <div className="select-bar-move">
                  <Select
                    label="Listeye ekle"
                    value={undefined}
                    placeholder="Listeye ekle"
                    onChange={async (v) => {
                      if (!selectedVisible.length) return
                      if (v === NEW_LIST_CHOICE) {
                        setNaming('')
                        return
                      }
                      await onMove(selectedVisible.map((x) => x.id), v)
                      exitSelection()
                    }}
                    options={[
                      ...(onNewList ? [{ value: NEW_LIST_CHOICE, label: '+ Yeni liste…' }] : []),
                      ...placementOptions(lists, 'Listeden çıkar').filter((o) => lists.length > 0 || o.value !== '__none'),
                    ]}
                  />
                </div>
              )}
              <button
                className="btn btn-bad"
                disabled={!selectedVisible.length || deleting}
                onClick={async () => {
                  setDeleting(true)
                  await onDelete(selectedVisible.map((v) => v.id))
                  setDeleting(false)
                  exitSelection()
                }}
              >
                Sil ({selectedVisible.length})
              </button>
            </div>
          )}
          {selecting && quick && (
            <div className="select-quick" role="group" aria-label="Hızlı seç">
              <span className="small muted">Hızlı seç:</span>
              {CULL_GROUPS.map((g) => {
                const ids = quick[g.id]
                const on = ids.length > 0 && ids.every((id) => selected.has(id))
                return (
                  <button key={g.id} type="button" className="chip chip-sm" aria-pressed={on} disabled={ids.length === 0} title={g.hint} onClick={() => pickGroup(ids)}>
                    {g.label} ({ids.length})
                  </button>
                )
              })}
              <button type="button" className="link small" disabled={list.length === 0} onClick={() => setSelected(new Set(list.filter((v) => !selected.has(v.id)).map((v) => v.id)))}>
                Seçimi ters çevir
              </button>
            </div>
          )}
          {selecting && naming !== null && onNewList && (
            <form
              className="row gap-2 select-bar-new"
              onSubmit={async (e) => {
                e.preventDefault()
                const name = naming.trim().slice(0, 60)
                if (!name || !selectedVisible.length) return
                await onNewList(selectedVisible.map((x) => x.id), name)
                setNaming(null)
                exitSelection()
              }}
            >
              <input className="input grow" autoFocus aria-label="Yeni listenin adı" placeholder={`Yeni liste adı (${selectedVisible.length} kelime eklenecek)`} value={naming} maxLength={60} onChange={(e) => setNaming(e.target.value)} />
              <button type="submit" className="btn" disabled={!naming.trim() || !selectedVisible.length}>
                Oluştur ve ekle
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setNaming(null)}>
                Vazgeç
              </button>
            </form>
          )}
          {!selecting && list.length > 0 && list.length < vocabulary.length && (
            <div className="deck-bar">
              <span>
                {stage === 'difficult' ? <strong>Zor kelimelerin</strong> : tag ? <strong>#{tag}</strong> : inList && inList !== '__none' ? <strong>{placementOptions(lists).find((o) => o.value === inList)?.label}</strong> : 'Filtrelenmiş liste'}: {list.length} kelime
              </span>
              <button className="btn" onClick={() => onStudy(list)}>
                Bu listeyi çalış
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <EmptyState
              art="search"
              title="Bu aramaya uyan kelime yok"
              action={
                <button
                  className="btn btn-quiet"
                  onClick={() => {
                    setQuery('')
                    setStage('all')
                    setFlags({})
                    setTag('')
                  }}
                >
                  Filtreleri temizle
                </button>
              }
            >
              Aramayı kısalt ya da filtrelerden birini kaldır.
            </EmptyState>
          ) : gallery ? (
            <ul className="word-gallery">
              {shown.map((v, index) => {
                const isSel = selected.has(v.id)
                return (
                  <li key={v.id}>
                    <button className={`gallery-tile${isSel ? ' is-selected' : ''}`} onClick={(e) => clickRow(index, v.id, e.shiftKey)} aria-pressed={selecting ? isSel : undefined}>
                      <GalleryArt entry={v} />
                      {selecting && <span className={`row-check gallery-check${isSel ? ' is-on' : ''}`} aria-hidden>{isSel && <CheckIcon size={14} />}</span>}
                      <span className="w">
                        <WordLabel entry={v} />
                      </span>
                      <span className="meta">{v.senses[0].gloss}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            asTable ? (
              <div className="table-wrap">
                <table className="word-table">
                  <thead>
                    <tr>
                      {selecting && <th aria-label="Seç" />}
                      <SortTh label="Kelime" active={sort === 'alpha'} onClick={() => setSort('alpha')} />
                      <th scope="col">Anlam</th>
                      <SortTh label="Aşama" active={sort === 'strongest' || sort === 'weakest'} onClick={() => setSort(sort === 'strongest' ? 'weakest' : 'strongest')} />
                      <SortTh label="Sıradaki tekrar" active={sort === 'due'} onClick={() => setSort('due')} />
                      <th scope="col" className="num">Doğru / yanlış</th>
                      <SortTh label="Sıklık" active={sort === 'frequent'} onClick={() => setSort('frequent')} />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((v, index) => {
                      const st = stateById.get(v.id)
                      const isSel = selected.has(v.id)
                      const due = st && nextReviewAt(st)
                      return (
                        <tr key={v.id} className={isSel ? 'is-selected' : ''} onClick={(e) => clickRow(index, v.id, e.shiftKey)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && clickRow(index, v.id, e.shiftKey)}>
                          {selecting && (
                            <td>
                              <span className={`row-check${isSel ? ' is-on' : ''}`} aria-hidden>
                                {isSel && <CheckIcon size={14} />}
                              </span>
                            </td>
                          )}
                          <td className="w">
                            <WordLabel entry={v} />
                            {withMistakes.has(v.id) && <span className="pill pill-bad">hata</span>}
                          </td>
                          <td className="muted">{v.senses[0].gloss}</td>
                          <td>
                            <span className="table-stage">
                              <Plant stage={growthStage(st)} health={plantHealth(st, scheduler, now)} size={22} />
                              {st ? STAGE_NAME[masteryStage(st)] : 'Sırada'}
                            </span>
                          </td>
                          <td className="muted">{due ? relativeTime(due) : '—'}</td>
                          <td className="num">{st ? `${st.stats.correct} / ${st.stats.wrong}` : '—'}</td>
                          <td className="muted">{v.source !== 'sample' && bandOf(v.frequencyRank) ? bandOf(v.frequencyRank)!.short : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
            <ul className="word-list is-columns">
              {shown.map((v, index) => {
                const st = stateById.get(v.id)
                const isSel = selected.has(v.id)
                const due = st && !st.retired ? nextReviewAt(st) : undefined
                return (
                  <li key={v.id} className={isSel ? 'is-selected' : ''}>
                    <button
                      className="word-row"
                      onClick={(e) => clickRow(index, v.id, e.shiftKey)}
                      aria-pressed={selecting ? isSel : undefined}
                    >
                      {selecting && <span className={`row-check${isSel ? ' is-on' : ''}`} aria-hidden>{isSel && <CheckIcon size={14} />}</span>}
                      <span className="word-row-plant" title={st ? STAGE_NAME[masteryStage(st)] : 'Sırada'}>
                        <Plant stage={growthStage(st)} health={plantHealth(st, scheduler, now)} size={30} />
                      </span>
                      <WordThumb id={v.imageId} />
                      <span className="word-row-text">
                        <span className="w">
                          <WordLabel entry={v} />
                        </span>
                        <span className="meta">
                          {v.senses[0].gloss}
                          {v.partOfSpeech !== 'other' && (
                            <>
                              {' · '}
                              <PosTag pos={v.partOfSpeech} label />
                            </>
                          )}
                          {v.source !== 'sample' && bandOf(v.frequencyRank) && `, ${bandOf(v.frequencyRank)!.short}`}
                          {v.audioId && <MicIcon size={14} className="inline-icon is-end" />}
                          {v.tags.length > 0 && ` · ${v.tags.map((t) => `#${t}`).join(' ')}`}
                        </span>
                      </span>
                      {withMistakes.has(v.id) && <span className="pill pill-bad">hata</span>}
                      {/* When the word comes back: the one thing a list row can't otherwise tell. */}
                      {st && <span className={`word-row-due${due && due.getTime() <= now.getTime() ? ' is-due' : ''}`}>{due ? dueShort(due, now) : 'emekli'}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            )
          )}
          {list.length > limit && <MoreRows left={list.length - limit} onMore={() => setLimit((l) => l + ROW_PAGE)} />}
        </>
      )}
    </section>
  )
}

const ROW_PAGE = 300

/** The rest of a long list: loads by itself when it scrolls into view, or with a click. */
function MoreRows({ left, onMore }: { left: number; onMore: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onMore(), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [onMore])
  return (
    <button ref={ref} type="button" className="btn btn-quiet btn-block more-rows" onClick={onMore}>
      {left} kelime daha göster
    </button>
  )
}

/** "bugün", "yarın", "5 gün", "12 Kas": short enough for the end of a list row. */
function dueShort(d: Date, now: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86_400_000)
  if (diff <= 0) return 'bugün'
  if (diff === 1) return 'yarın'
  if (diff < 30) return `${diff} gün`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

/** A table header that sorts by its column. */
function SortTh({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th scope="col" aria-sort={active ? 'ascending' : undefined}>
      <button type="button" className={`th-sort${active ? ' is-active' : ''}`} onClick={onClick}>
        {label}
        {active && <span aria-hidden> ↓</span>}
      </button>
    </th>
  )
}
