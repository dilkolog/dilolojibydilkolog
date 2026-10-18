import { useEffect, useMemo, useState } from 'react'
import { missingFrequent } from '../engine/reading'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { frequencyWords } from '../data/frequency'
import { wordKeys } from '../data/wordInput'
import { loadPack } from '../data/wordpack'
import type { Pack } from '../data/wordpackBuild'
import { addKeyList, keyEntries, packItem } from './keyWordsList'
import { defaultPlacement, placeNew } from './listMemory'
import { parsePlacement } from './listOptions'
import { showToast } from './toastFeed'
import { WordForm } from './Words'
import { wordsAt } from '../engine/cefrLevels'
import type { CefrLevel } from '../engine/types'
import { useCefr } from './useCefr'
import { TagIcon } from './icons'

const RANGES = [1000, 3000, 10000] as const
/** Levels offered when the language has graded word levels (C1 and up are thin and specialised). */
const LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2']
const PAGE = 15

/**
 * Frequent words that are neither in the list nor known yet. Marking "I know it" grows the
 * known-word set (used by reading mode too); "Add" puts the word into study.
 */
export function MissingWords({ db, language, vocabulary, onAdded }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<string[] | null>(null)
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [targetListName, setTargetListName] = useState<string>('')
  // The first so many frequent words, or a level's words (French, Spanish).
  const [range, setRange] = useState<(typeof RANGES)[number] | CefrLevel>(3000)
  const cefr = useCefr(language)
  const [shown, setShown] = useState(PAGE)
  const [adding, setAdding] = useState<string | null>(null)
  const [pack, setPack] = useState<Pack | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([frequencyWords(language), db.getKnownWords(language), db.getLists(language), db.getSettings()]).then(([l, k, allLists, s]) => {
      setList(l)
      setKnown(k)
      const placement = defaultPlacement(language, allLists, s?.focusList?.[language])
      if (!placement || placement === '__none') {
        setTargetListName('Listesiz')
        return
      }
      const { listId, levelId } = parsePlacement(placement)
      const list = allLists.find((it) => it.id === listId)
      if (list) {
        if (levelId) {
          const lv = list.levels?.find((lvl) => lvl.id === levelId)
          setTargetListName(lv ? `${list.name} › ${lv.name}` : list.name)
        } else {
          setTargetListName(list.name)
        }
      } else {
        setTargetListName('Listesiz')
      }
    })
    void loadPack(language).then(setPack)
  }, [open, language, db])

  const missing = useMemo(() => {
    if (typeof range === 'string') return cefr ? missingFrequent(wordsAt(cefr, range), language, vocabulary, known, Infinity) : []
    return list ? missingFrequent(list, language, vocabulary, known, range) : []
  }, [list, cefr, language, vocabulary, known, range])
  const page = useMemo(() => missing.slice(0, shown), [missing, shown])
  const existing = useMemo(() => wordKeys(vocabulary), [vocabulary])

  // The pack's meaning (and a sentence) for each word shown: what lets a word be added in one tap.
  const items = useMemo(() => new Map(page.map((m) => [m.key, packItem(pack, m.word, language)])), [page, pack, language])
  const listable = page.flatMap((m) => items.get(m.key) ?? [])
  const rangeName = typeof range === 'string' ? `${range} kelimeleri` : `Sık kelimeler: ilk ${range.toLocaleString('tr-TR')}`

  /** One tap: the word with the pack's meaning and sentence, where new words go; without a meaning, the form. */
  const add = async (word: string, key: string) => {
    const item = items.get(key)
    const [entry] = item ? keyEntries([item], language, new Date()) : []
    if (!entry) return setAdding(word)
    if (await db.vocabulary.get(entry.id)) return showToast(`“${entry.lemma}” zaten kelimelerinde.`, undefined, 3000, 'info')
    const placed = await placeNew(db, language, [entry])
    await db.vocabulary.put(placed.entries[0])
    onAdded()
    showToast(placed.listName ? `“${entry.lemma}” “${placed.listName}” listesine eklendi.` : `“${entry.lemma}” kelimelerine eklendi.`, undefined, 4000, 'success')
  }

  /** The words shown, as a list named after the range ("A2 kelimeleri"). */
  const addAll = async () => {
    setBusy(true)
    try {
      const { list: made, added } = await addKeyList(db, language, rangeName, listable, undefined)
      onAdded()
      showToast(added.length ? `${added.length} kelime “${made.name}” listesine eklendi.` : 'Bu kelimeler zaten kelimelerinde.', undefined, 4000, 'success')
    } catch {
      showToast('Liste kurulamadı.', undefined, 4000, 'info')
    } finally {
      setBusy(false)
    }
  }

  const markKnown = async (keys: string[]) => {
    await db.addKnownWords(language, keys)
    setKnown((k) => new Set([...k, ...keys]))
  }

  return (
    <details className="card" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Eksik sık kelimeler</summary>
      {open && list && (
        <div className="stack">
          <p className="small muted">
            Sıklık listesinde üst sıralarda olup ne listende ne de bildiğin kelimeler arasında olanlar. Sık kelimeler en çok işe yarar; bildiklerini
            işaretle, bilmediklerini ekle. Okuma modunda ve kelime testinde bildiğin kelimeler buradan otomatik düşer.
          </p>
          {targetListName && (
            <p className="small muted">
              <TagIcon size={12} className="inline-icon" /> Tek dokunuşla eklenen kelimeler <strong>{targetListName}</strong> listesine gider.
            </p>
          )}
          <div className="choice-row">
            {RANGES.map((r) => (
              <button key={r} className="chip chip-sm" aria-pressed={range === r} onClick={() => (setRange(r), setShown(PAGE))}>
                İlk {r.toLocaleString('tr-TR')}
              </button>
            ))}
            {cefr &&
              LEVELS.map((l) => (
                <button key={l} className="chip chip-sm" aria-pressed={range === l} onClick={() => (setRange(l), setShown(PAGE))} title={`Ders kitaplarında ${l} seviyesinde kullanılmaya başlanan kelimeler`}>
                  {l}
                </button>
              ))}
            <span className="small muted">{missing.length} eksik kelime</span>
          </div>
          {missing.length === 0 ? (
            <p className="notice">{typeof range === 'string' ? `${range} kelimelerinin` : `İlk ${range.toLocaleString('tr-TR')} kelimenin`} hepsini biliyor ya da çalışıyorsun.</p>
          ) : (
            <>
              <ul className="missing-list">
                {page.map((m) => (
                  <li key={m.key}>
                    <span className="missing-word" lang={language}>
                      {m.word}
                    </span>
                    {typeof range === 'number' && <span className="small muted">#{m.rank}</span>}
                    {items.get(m.key) && <span className="small muted missing-meaning">{items.get(m.key)!.turkish.slice(0, 2).join(', ')}</span>}
                    <span className="row missing-word-actions">
                      <button className="btn btn-quiet btn-sm" onClick={() => markKnown([m.key])}>
                        Biliyorum
                      </button>
                      <button className="btn btn-sm" onClick={() => void add(m.word, m.key)}>
                        Ekle
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="row">
                <button className="link small" onClick={() => markKnown(page.map((m) => m.key))}>
                  Bu {page.length} kelimenin hepsini biliyorum
                </button>
                {listable.length >= 3 && (
                  <button className="link small" onClick={() => void addAll()} disabled={busy} title="Anlamı bulunan kelimeler, örnek cümleleriyle">
                    Bunları “{rangeName}” listesine ekle ({listable.length})
                  </button>
                )}
                {missing.length > shown && (
                  <button className="link small" onClick={() => setShown((n) => n + PAGE)}>
                    Daha fazla göster
                  </button>
                )}
              </div>
            </>
          )}
          {adding && (
            <section className="card stack">
              <h3 className="section-title">“{adding}” ekle</h3>
              <WordForm
                db={db}
                language={language}
                existing={existing}
                initial={{ word: adding, meaning: '', example: '', exampleTranslation: '' }}
                onSaved={() => {
                  setAdding(null)
                  onAdded()
                }}
                onCancel={() => setAdding(null)}
              />
            </section>
          )}
        </div>
      )}
    </details>
  )
}
