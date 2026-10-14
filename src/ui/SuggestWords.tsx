import { useEffect, useState } from 'react'
import { AiError, suggestNewWords, wordInfoToInput, type WordInfo } from '../ai'
import type { KelimeDB, Settings } from '../data/db'
import { createEntry, wordId } from '../data/wordInput'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { suggestCount, suggestionDue } from '../engine/wordSuggest'
import { useAi } from './aiContext'
import { interestsOf } from './personalInterests'
import { SparkleIcon } from './icons'
import { placeNew } from './listMemory'

type Row = { info: WordInfo; selected: boolean }

/**
 * New words from the AI: as many as the learner takes in a day (their setting), chosen for their
 * level and interests, never words already in the list. Shown for review (nothing is added unasked).
 * On Today it appears only on a day no word was added (`onlyWhenDue`); on the Words screen always.
 */
export function SuggestWords({
  db,
  language,
  vocabulary,
  settings,
  onAdded,
  onlyWhenDue = false,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  settings: Settings | undefined
  onAdded: () => void
  onlyWhenDue?: boolean
}) {
  const { apiKey, needsApproval } = useAi()
  // On the Words screen the settings aren't at hand: read them (the daily count and the interests).
  const [loaded, setLoaded] = useState<Settings | undefined>()
  useEffect(() => {
    if (!settings) void db.getSettings().then(setLoaded, () => undefined)
  }, [db, settings])
  settings = settings ?? loaded
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(0)
  const [doneList, setDoneList] = useState<string>()
  const count = suggestCount(settings?.newWordsPerDay)
  const mine = vocabulary.filter((v) => v.language === language && v.source !== 'sample')
  if (onlyWhenDue && (!apiKey || (!rows && !done && !suggestionDue(vocabulary.filter((v) => v.language === language), new Date())))) return null

  const ask = async () => {
    if (!apiKey) return
    setBusy(true)
    setError('')
    try {
      const have = vocabulary.filter((v) => v.language === language).map((v) => v.lemma)
      const sample = [...mine].sort(() => 0.5 - Math.random()).slice(0, 30).map((v) => v.lemma)
      const words = await suggestNewWords(apiKey, { language, count, interests: interestsOf(settings), have, sample })
      setRows(words.map((info) => ({ info, selected: true })))
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Öneriler alınamadı.')
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    if (!rows) return
    const now = Date.now()
    const entries: VocabularyEntry[] = []
    const keys = new Set(vocabulary.map((v) => v.id))
    rows
      .filter((r) => r.selected)
      .forEach((r, i) => {
        try {
          const entry = createEntry(wordInfoToInput(r.info), language, new Date(now + i), 'import')
          if (keys.has(entry.id) || keys.has(wordId(language, entry.lemma))) return
          keys.add(entry.id)
          entries.push(entry)
        } catch {
          // A card the AI built badly (no meaning): left out.
        }
      })
    const placed = await placeNew(db, language, entries)
    if (entries.length) await db.vocabulary.bulkPut(placed.entries)
    setDone(entries.length)
    setDoneList(placed.listName)
    setRows(null)
    onAdded()
  }

  const chosen = rows?.filter((r) => r.selected).length ?? 0
  return (
    <section className="card stack suggest-words" aria-label="YZ kelime önerisi">
      <h2 className="section-title row gap-2">
        <SparkleIcon size={18} className="icon-star" /> {onlyWhenDue ? 'Bugün yeni kelime eklemedin' : 'YZ’dan kelime iste'}
      </h2>
      {done > 0 && !rows && (
        <p className="small" role="status">
          {done} kelime eklendi{doneList ? ` (“${doneList}” listesine)` : ''}. Yarınki görevlerinde karşına çıkarlar.
        </p>
      )}
      {!rows && (
        <>
          <p className="small muted">
            {mine.length ? `YZ, listene ve ilgi alanlarına bakıp ${count} yeni kelime önerir` : `YZ sana ${count} kelime önerir`}; beğendiklerini sen seçersin.
          </p>
          {!apiKey && <p className="small muted">{needsApproval ? 'YZ özellikleri hesabının onaylanmasını bekliyor.' : 'Bunun için Ayarlar → YZ yardımcısı bölümünde bir anahtar gerekiyor.'}</p>}
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={ask} disabled={!apiKey || busy}>
              {busy ? 'Düşünüyor…' : done > 0 ? `${count} kelime daha öner` : `${count} kelime öner`}
            </button>
          </div>
        </>
      )}
      {rows && (
        <>
          <ul className="plain stack gap-2">
            {rows.map((r, i) => (
              <li key={r.info.lemma} className="suggest-row">
                <label className="row gap-2">
                  <input type="checkbox" checked={r.selected} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))} aria-label={`${r.info.lemma} ekle`} />
                  <span>
                    <strong lang={language}>{r.info.lemma}</strong> <span className="small muted">{r.info.meanings.join(', ')}</span>
                    <br />
                    <span className="small muted" lang={language}>
                      {r.info.example.replace(/\*/g, '')}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={add} disabled={!chosen}>
              Seçilenleri ekle ({chosen})
            </button>
            <button type="button" className="btn btn-sm btn-quiet" onClick={ask} disabled={busy}>
              {busy ? 'Düşünüyor…' : 'Başka öner'}
            </button>
            <button type="button" className="link small" onClick={() => setRows(null)}>
              Kapat
            </button>
          </div>
        </>
      )}
    </section>
  )
}
