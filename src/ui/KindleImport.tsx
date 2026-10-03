import { useState } from 'react'
import { AiError, enrichWords, wordInfoToInput } from '../ai'
import { parseClippings, vocabRowsToWords, type KindleWord } from '../engine/kindle'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { readVocabDb } from '../data/kindleDb'
import { createEntry, markWord, wordId, type WordInput } from '../data/wordInput'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'

interface Row extends KindleWord {
  selected: boolean
  meaning: string
  ai?: WordInput
}

const AI_BATCH = 15

/** Words looked up or highlighted on a Kindle, brought in with the sentence they came from. */
export function KindleImport({ db, language, existing, onAdded }: { db: KelimeDB; language: TargetLanguage; existing: Set<string>; onAdded: () => void }) {
  const { apiKey } = useAi()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async (file: File) => {
    setMessage(null)
    setBusy('Dosya okunuyor…')
    try {
      const words = /\.db$/i.test(file.name) ? vocabRowsToWords(await readVocabDb(file), language) : parseClippings(await file.text())
      const fresh = words.filter((w) => !existing.has(wordId(language, w.word)))
      setRows(fresh.map((w, i) => ({ ...w, selected: i < 20, meaning: '' })))
      if (!fresh.length) setMessage({ ok: false, text: words.length ? 'Bu dosyadaki kelimelerin hepsi zaten listende.' : 'Bu dosyada bu dile ait kelime bulunamadı.' })
    } catch {
      setMessage({ ok: false, text: 'Dosya okunamadı. Kindle\'daki "documents/My Clippings.txt" ya da "system/vocabulary/vocab.db" dosyasını seç.' })
    } finally {
      setBusy('')
    }
  }

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  const selected = rows?.filter((r) => r.selected) ?? []

  const fill = async () => {
    if (!apiKey || !rows) return
    const targets = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.selected && !r.ai)
    try {
      for (let b = 0; b < targets.length; b += AI_BATCH) {
        const batch = targets.slice(b, b + AI_BATCH)
        setBusy(`AI dolduruyor… ${Math.min(b + AI_BATCH, targets.length)}/${targets.length}`)
        const result = await enrichWords(apiKey, language, batch.map(({ r }) => ({ word: r.word, context: r.context })))
        setRows((prev) =>
          prev!.map((row, j) => {
            const info = batch.some((x) => x.i === j) ? result.get(row.word.toLocaleLowerCase()) : undefined
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
    const now = Date.now()
    const keys = new Set(existing)
    const entries: VocabularyEntry[] = []
    const problems: string[] = []
    selected.forEach((r, i) => {
      if (!r.meaning.trim()) return problems.push(`${r.word}: anlam yok`)
      const fromBook = r.context && r.context.toLocaleLowerCase().includes(r.word.toLocaleLowerCase()) ? markWord(r.context, r.word) : ''
      const base: WordInput = r.ai ? { ...r.ai, word: r.word, meaning: r.meaning } : { word: r.word, meaning: r.meaning, example: fromBook, exampleTranslation: '' }
      try {
        let entry: VocabularyEntry
        try {
          entry = createEntry({ ...base, notes: r.book ? `Kindle: ${r.book}` : base.notes }, language, new Date(now + i), 'import')
        } catch {
          // The sentence may hold the word in a form that isn't found: keep the word without it.
          entry = createEntry({ ...base, example: '', exampleTranslation: '' }, language, new Date(now + i), 'import')
        }
        if (keys.has(entry.id)) return problems.push(`${entry.lemma}: zaten listende`)
        keys.add(entry.id)
        entries.push(entry)
      } catch (e) {
        problems.push(`${r.word}: ${e instanceof Error ? e.message : 'eklenemedi'}`)
      }
    })
    if (entries.length) await db.vocabulary.bulkPut(entries)
    const added = new Set(entries.map((e) => e.lemma.toLocaleLowerCase()))
    setRows((prev) => prev!.filter((r) => !(r.selected && added.has(r.word.toLocaleLowerCase()))))
    setMessage({ ok: !problems.length, text: `${entries.length} kelime eklendi.${problems.length ? ` Eklenemeyenler: ${problems.join('; ')}.` : ''}` })
    onAdded()
  }

  return (
    <details className="card">
      <summary>Kindle'dan aktar</summary>
      <div className="stack">
        <p className="small muted">
          Kindle'ı bilgisayara bağla ve dosyalardan birini seç: <strong>system/vocabulary/vocab.db</strong> (sözlükte baktığın kelimeler, geçtikleri
          cümleyle) ya da <strong>documents/My Clippings.txt</strong> (vurguladıkların; en fazla üç kelimelik vurgular alınır).
        </p>
        <label className="btn btn-quiet file-btn justify-self-start">
          {busy || 'Kindle dosyası seç'}
          <input type="file" accept=".db,.txt" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
        {rows && rows.length > 0 && (
          <>
            <div className="row">
              <span className="small muted mr-auto">
                {rows.length} yeni kelime, {selected.length} seçili.
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
                <li key={`${r.word}-${i}`} className={r.selected ? 'is-selected' : ''}>
                  <input type="checkbox" checked={r.selected} aria-label={`${r.word} seç`} onChange={(e) => update(i, { selected: e.target.checked })} />
                  <input className="input cand-word" lang={language} value={r.word} aria-label="Kelime" onChange={(e) => update(i, { word: e.target.value, ai: undefined })} />
                  <input className="input cand-meaning" placeholder="Türkçe anlamı" aria-label={`${r.word} anlamı`} value={r.meaning} onChange={(e) => update(i, { meaning: e.target.value, selected: true })} />
                  <span className="cand-context small muted">{r.context ?? r.book}</span>
                </li>
              ))}
            </ul>
            <div className="row">
              {apiKey && (
                <button className="btn btn-quiet" onClick={fill} disabled={!!busy || !selected.length}>
                  <SparkleIcon size={18} className="icon-star" />
                  {busy || `Seçilenleri AI ile doldur (${selected.filter((r) => !r.ai).length})`}
                </button>
              )}
              <button className="btn" onClick={add} disabled={!!busy || !selected.length}>
                Seçilenleri ekle ({selected.length})
              </button>
            </div>
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
