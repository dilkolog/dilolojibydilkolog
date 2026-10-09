import { useState } from 'react'
import { AiError, enrichWords, wordInfoToInput } from '../ai'
import { displayForm } from '../engine/exercises'
import { extractCandidates, findExampleSentences, type Candidate, type FoundExample } from '../engine/extract'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { addExample, createEntry, markWord, wordId, type WordInput } from '../data/wordInput'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'

interface Row {
  candidate: Candidate
  selected: boolean
  word: string
  meaning: string
  /** Full card data from the AI, when it was used. */
  ai?: WordInput
}

/** How many candidates are pre-selected: enough to be useful, few enough to review. */
const PRESELECT = 12
/** Words per AI request; one request per batch keeps cost and latency low. */
const AI_BATCH = 15

/** Learning from real content: paste a text, pick the unknown words, add them with their sentence. */
export function TextImport({
  db,
  language,
  vocabulary,
  existing,
  onAdded,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  existing: Set<string>
  onAdded: () => void
}) {
  const { apiKey } = useAi()
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState<string>('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // Sentences with words already in the list: new, authentic contexts for them.
  const [found, setFound] = useState<(FoundExample & { selected: boolean })[]>([])

  const find = () => {
    const candidates = extractCandidates(text, language, vocabulary)
    const examples = findExampleSentences(text, language, vocabulary)
    setRows(candidates.map((c, i) => ({ candidate: c, selected: i < PRESELECT, word: c.surface, meaning: '' })))
    setFound(examples.map((f) => ({ ...f, selected: true })))
    setMessage(candidates.length || examples.length ? null : { ok: false, text: 'Bu metinde kelimelerinde olmayan yeni kelime bulunamadı.' })
  }

  const addFoundExamples = async () => {
    const byId = new Map(vocabulary.map((v) => [v.id, v]))
    const updated: VocabularyEntry[] = []
    for (const f of found.filter((x) => x.selected)) {
      const entry = byId.get(f.entryId)
      if (!entry) continue
      try {
        updated.push(addExample(entry, markWord(f.text, f.form)))
      } catch {
        // Already has it, or is full: nothing to add.
      }
    }
    if (updated.length) await db.vocabulary.bulkPut(updated)
    setFound([])
    setMessage({ ok: true, text: `${updated.length} kelimeye yeni örnek cümle eklendi.` })
    onAdded()
  }

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  const selected = rows?.filter((r) => r.selected) ?? []

  const fillWithAi = async () => {
    if (!apiKey || !rows) return
    const targets = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.selected && !r.ai)
    setMessage(null)
    try {
      for (let b = 0; b < targets.length; b += AI_BATCH) {
        const batch = targets.slice(b, b + AI_BATCH)
        setBusy(`AI dolduruyor… ${Math.min(b + AI_BATCH, targets.length)}/${targets.length}`)
        const result = await enrichWords(
          apiKey,
          language,
          batch.map(({ r }) => ({ word: r.word, context: r.candidate.context })),
        )
        setRows((prev) =>
          prev!.map((row, j) => {
            const t = batch.find((x) => x.i === j)
            const info = t && result.get(row.word.toLocaleLowerCase())
            if (!info) return row
            const ai = wordInfoToInput(info)
            return { ...row, ai, word: ai.word, meaning: row.meaning || ai.meaning }
          }),
        )
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof AiError ? e.message : 'AI ile doldurulamadı.' })
    } finally {
      setBusy('')
    }
  }

  const add = async () => {
    if (!rows) return
    const now = Date.now()
    const keys = new Set(existing)
    const entries: VocabularyEntry[] = []
    const problems: string[] = []
    selected.forEach((r, i) => {
      if (!r.meaning.trim()) return problems.push(`${r.word}: anlam yok`)
      const input: WordInput = r.ai
        ? { ...r.ai, word: r.word, meaning: r.meaning }
        : { word: r.word, meaning: r.meaning, example: markWord(r.candidate.context, r.candidate.surface), exampleTranslation: '' }
      try {
        // The AI example may not contain the word in a detectable form; fall back to the source sentence.
        let entry: VocabularyEntry
        try {
          entry = createEntry(input, language, new Date(now + i), 'import')
        } catch {
          entry = createEntry({ ...input, example: markWord(r.candidate.context, r.candidate.surface), exampleTranslation: '' }, language, new Date(now + i), 'import')
        }
        if (keys.has(entry.id) || keys.has(wordId(language, entry.lemma))) return problems.push(`${entry.lemma}: zaten kelimelerinde`)
        keys.add(entry.id)
        entries.push(entry)
      } catch (e) {
        problems.push(`${r.word}: ${e instanceof Error ? e.message : 'eklenemedi'}`)
      }
    })
    if (entries.length) await db.vocabulary.bulkPut(entries)
    const addedWords = new Set(entries.map((e) => e.lemma))
    setRows((prev) => prev!.filter((r) => !(r.selected && (addedWords.has(r.word) || addedWords.has(createLemma(r.word, language))))))
    setMessage({
      ok: problems.length === 0,
      text: `${entries.length} kelime eklendi.${problems.length ? ` Eklenemeyenler: ${problems.join('; ')}.` : ''}`,
    })
    onAdded()
  }

  return (
    <details className="card">
      <summary>Metinden kelime çıkar</summary>
      <div className="stack">
        <p className="small muted">
          Okuduğun bir makaleyi, şarkı sözünü ya da ders notunu yapıştır. Kelimelerinde olmayan kelimeler, geçtikleri cümleyle
          birlikte çıkarılır. Cümle, kelimenin örnek cümlesi olur.
        </p>
        <textarea
          className="textarea text-import-textarea"
          lang={language}
          aria-label="Metin"
          placeholder="Metni buraya yapıştır…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row">
          <button className="btn btn-quiet" onClick={find} disabled={!text.trim()}>
            Kelimeleri bul
          </button>
        </div>

        {found.length > 0 && (
          <div className="card stack found-examples">
            <p className="small">
              <strong>Kelimelerindeki {found.length} kelime bu metinde de geçiyor.</strong> Cümlelerini örnek olarak eklersen kelimeleri yeni bağlamlarda
              da görürsün.
            </p>
            <ul className="plain stack gap-2">
              {found.map((f, i) => {
                const entry = vocabulary.find((v) => v.id === f.entryId)
                return (
                  <li key={f.entryId}>
                    <label className="row items-start nowrap gap-2">
                      <input
                        type="checkbox"
                        checked={f.selected}
                        onChange={(e) => setFound(found.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))}
                      />
                      <span>
                        <span className="target">{entry ? displayForm(entry) : f.form}</span>{' '}
                        <span className="small muted">{f.text}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <div className="row">
              <button className="btn btn-quiet" onClick={addFoundExamples} disabled={!found.some((f) => f.selected)}>
                Örnek cümle olarak ekle ({found.filter((f) => f.selected).length})
              </button>
            </div>
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="row">
              <span className="small muted mr-auto">
                {rows.length} aday, {selected.length} seçili. Kelimeyi sözlük biçimine düzeltebilirsin (
                {language === 'en' ? 'decided → decide' : language === 'fr' ? 'encouragé → encourager' : 'hablando → hablar'})
                {language !== 'en' && !apiKey && '. İsimleri artikeliyle yaz ki cinsiyeti de öğrenilsin (la librairie)'}.
              </span>
              <button className="link small" onClick={() => setRows(rows.map((r) => ({ ...r, selected: true })))}>
                Tümünü seç
              </button>
              <button className="link small" onClick={() => setRows(rows.map((r) => ({ ...r, selected: false })))}>
                Hiçbiri
              </button>
            </div>
            <ul className="candidate-list">
              {rows.map((r, i) => (
                <li key={r.candidate.surface} className={r.selected ? 'is-selected' : ''}>
                  <input
                    type="checkbox"
                    checked={r.selected}
                    aria-label={`${r.word} seç`}
                    onChange={(e) => update(i, { selected: e.target.checked })}
                  />
                  <input className="input cand-word" lang={language} value={r.word} aria-label="Kelime" onChange={(e) => update(i, { word: e.target.value, ai: undefined })} />
                  <input
                    className="input cand-meaning"
                    placeholder="Türkçe anlamı"
                    aria-label={`${r.word} anlamı`}
                    value={r.meaning}
                    onChange={(e) => update(i, { meaning: e.target.value, selected: true })}
                  />
                  <span className="cand-context small muted">
                    {r.candidate.count > 1 && <span className="pill">{r.candidate.count}×</span>} {r.candidate.context}
                  </span>
                </li>
              ))}
            </ul>
            <div className="row">
              {apiKey && (
                <button className="btn btn-quiet" onClick={fillWithAi} disabled={!!busy || selected.length === 0}>
                  <SparkleIcon size={18} className="icon-star" />
                  {busy || `Seçilenleri AI ile doldur (${selected.filter((r) => !r.ai).length})`}
                </button>
              )}
              <button className="btn" onClick={add} disabled={!!busy || selected.length === 0}>
                Seçilenleri ekle ({selected.length})
              </button>
            </div>
            {!apiKey && <p className="small muted">Anlamları tek tek yazabilir ya da Ayarlar'dan AI'ı açıp toplu doldurabilirsin.</p>}
          </>
        )}
        {message && (
          <p className={message.ok ? 'notice' : 'error'} role="status">
            {message.text}
          </p>
        )}
      </div>
    </details>
  )
}

/** Same lemma normalisation createEntry applies (article stripped). */
function createLemma(word: string, language: TargetLanguage): string {
  try {
    return createEntry({ word, meaning: '-' }, language, new Date()).lemma
  } catch {
    return word
  }
}
