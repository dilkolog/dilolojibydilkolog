import { useMemo, useState } from 'react'
import { AiError, enrichWords, wordInfoToInput } from '../ai'
import { displayForm } from '../engine/exercises'
import type { TargetLanguage } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { AnkiFileError } from '../data/ankiImport'
import { listFileText } from '../data/officeImport'
import { createEntry, DEFAULT_FORMAT, importWords, parseWordList, type ListFormat, type RowSeparator, type TermSeparator } from '../data/wordInput'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'
import { ImportPlacement } from './ImportPlacement'
import { useImportList } from './useImportList'

const TERM_OPTIONS: [TermSeparator, string][] = [
  ['auto', 'Otomatik'],
  ['tab', 'Sekme'],
  ['comma', 'Virgül'],
  ['dash', 'Tire ( - )'],
  ['equals', 'Eşittir (=)'],
  ['colon', 'İki nokta (:)'],
  ['semicolon', 'Noktalı virgül'],
  ['custom', 'Özel'],
]
const ROW_OPTIONS: [RowSeparator, string][] = [
  ['newline', 'Yeni satır'],
  ['semicolon', 'Noktalı virgül'],
  ['custom', 'Özel'],
]

const EXAMPLE: Record<TargetLanguage, string> = {
  en: 'decision - karar - It was a hard decision.\nthrive - gelişmek, büyümek\nabandon - terk etmek',
  fr: 'la décision - karar - Elle a pris une décision difficile.\népuisé - bitkin\nla librairie - kitapçı',
  es: 'la decisión - karar - Fue una decisión difícil.\nagotado - bitkin\nla librería - kitapçı',
}

/** Bulk add from a pasted list or a file, with Quizlet-style separator options and a preview. */
export function BulkImport({
  db,
  language,
  existing,
  onImported,
}: {
  db: KelimeDB
  language: TargetLanguage
  existing: Set<string>
  onImported: () => void
}) {
  const { apiKey } = useAi()
  const importList = useImportList(db, language)
  const [text, setText] = useState('')
  const [fmt, setFmt] = useState<ListFormat>(DEFAULT_FORMAT)
  const [aiFill, setAiFill] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const result = useMemo(() => (text.trim() ? importWords(text, language, existing, new Date(), fmt) : null), [text, language, existing, fmt])
  const rows = useMemo(() => (text.trim() ? parseWordList(text, fmt) : []), [text, fmt])

  const readFile = async (file: File) => {
    try {
      setText(await listFileText(file))
      setMessage(null)
    } catch (e) {
      setMessage({ ok: false, text: e instanceof AnkiFileError || (e instanceof Error && /bulunamadı/.test(e.message)) ? (e as Error).message : 'Dosya okunamadı: bozuk ya da desteklenmeyen bir dosya olabilir.' })
    }
  }

  const save = async () => {
    if (!result?.entries.length) return
    let entries = result.entries
    setMessage(null)
    // Optionally complete words that came without an example, using the AI in batches.
    if (apiKey && aiFill) {
      const missing = entries.filter((e) => e.senses[0].examples.length === 0)
      try {
        for (let i = 0; i < missing.length; i += 15) {
          setBusy(`YZ dolduruyor… ${Math.min(i + 15, missing.length)}/${missing.length}`)
          const batch = missing.slice(i, i + 15)
          const info = await enrichWords(apiKey, language, batch.map((e) => ({ word: displayForm(e) })))
          entries = entries.map((e) => {
            const w = batch.includes(e) && info.get(displayForm(e).toLocaleLowerCase())
            if (!w) return e
            try {
              const ai = wordInfoToInput(w)
              // Keep the user's own word and meaning; take only the missing parts from the AI.
              const filled = createEntry({ ...ai, word: displayForm(e), meaning: [e.senses[0].gloss, ...(e.senses[0].altGlosses ?? [])].join(', '), tags: fmt.tags }, language, e.addedAt!, 'import')
              return { ...filled, id: e.id }
            } catch {
              return e
            }
          })
        }
      } catch (err) {
        setMessage({ ok: false, text: `${err instanceof AiError ? err.message : 'YZ ile doldurulamadı.'} Kelimeler YZ olmadan eklendi.` })
      }
    }
    setBusy('')
    await db.vocabulary.bulkPut(await importList.place(entries))
    setText('')
    setMessage((m) => m ?? { ok: true, text: `${entries.length} kelime eklendi.` })
    onImported()
  }

  const statusOf = (cells: string[], row: number) => {
    const word = cells[0]?.trim()
    if (!word || (row === 0 && ['kelime', 'word', 'term', 'anlam', 'meaning'].includes(word.toLocaleLowerCase('tr')))) return null
    // Errors are numbered by row, the same rows the preview shows.
    const error = result?.errors.find((e) => e.line === row + 1)
    if (error) {
      const label = cells[1]?.trim() ? 'eklenemiyor' : 'anlam yok'
      return (
        <>
          <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad-text)' }}>
            {label}
          </span>
          {cells[1]?.trim() && <span className="small muted import-reason">{error.message}</span>}
        </>
      )
    }
    if (result?.duplicates.some((d) => word.toLowerCase().endsWith(d.toLowerCase()))) return <span className="pill">zaten var</span>
    if (!result?.entries.length) return null
    const warning = result.warnings.find((w) => w.line === row + 1)
    return (
      <>
        <span className="pill stage-5">eklenecek</span>
        {warning && <span className="small muted import-reason">{warning.message}</span>}
      </>
    )
  }

  return (
    <details className="card">
      <summary>Toplu ekle</summary>
      <div className="stack">
        <p className="small muted">
          Bir liste yapıştır (Excel, Word ve Google Docs'tan kopyalanan tablo olduğu gibi çalışır) ya da dosya seç (Excel, Word, CSV, TSV, TXT, JSON, Anki paketi (.apkg) ya da Quizlet dışa aktarımı). Her satır bir kelime: önce
          kelime, sonra anlam; istersen üçüncü olarak geçtiği cümle (örnek cümle olur), dördüncü olarak da cümlenin çevirisi.
        </p>
        <textarea
          className="textarea bulk-import-textarea"
          lang={language}
          aria-label="Kelime listesi"
          placeholder={EXAMPLE[language]}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setMessage(null)
          }}
        />
        <div className="row">
          <label className="btn btn-quiet">
            Dosya seç
            <input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.docx,.apkg" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </label>
          <label className="row small gap-2 pointer">
            <input type="checkbox" checked={!!fmt.swap} onChange={(e) => setFmt({ ...fmt, swap: e.target.checked })} />
            Önce anlam yazılmış
          </label>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Kelime ile anlam arasında</label>
            <div className="choice-row">
              {TERM_OPTIONS.map(([v, label]) => (
                <button key={v} type="button" className="chip chip-sm" aria-pressed={fmt.term === v} onClick={() => setFmt({ ...fmt, term: v })}>
                  {label}
                </button>
              ))}
            </div>
            {fmt.term === 'custom' && (
              <input className="input" placeholder="Örn. |" value={fmt.customTerm ?? ''} onChange={(e) => setFmt({ ...fmt, customTerm: e.target.value })} aria-label="Özel ayraç" />
            )}
          </div>
          <div className="field">
            <label>Satırlar arasında</label>
            <div className="choice-row">
              {ROW_OPTIONS.map(([v, label]) => (
                <button key={v} type="button" className="chip chip-sm" aria-pressed={fmt.row === v} onClick={() => setFmt({ ...fmt, row: v })}>
                  {label}
                </button>
              ))}
            </div>
            {fmt.row === 'custom' && (
              <input className="input" placeholder="Örn. //" value={fmt.customRow ?? ''} onChange={(e) => setFmt({ ...fmt, customRow: e.target.value })} aria-label="Özel satır ayracı" />
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="bulk-tags">Hepsine etiket ekle</label>
            <input id="bulk-tags" className="input" placeholder="Örn. dizi, sezon 1" value={fmt.tags ?? ''} onChange={(e) => setFmt({ ...fmt, tags: e.target.value })} />
          </div>
          {apiKey && (
            <label className="row small gap-2 self-end pointer">
              <input type="checkbox" checked={aiFill} onChange={(e) => setAiFill(e.target.checked)} />
              <SparkleIcon size={16} className="icon-star" /> Örnek cümle, kalıp ve türü YZ ile tamamla
            </label>
          )}
        </div>

        <ImportPlacement list={importList} id="bulk-list" />

        {rows.length > 0 && (
          <div className="preview">
            <table className="data-table preview-table">
              <thead>
                <tr>
                  <th scope="col">Kelime</th>
                  <th scope="col">Anlam</th>
                  <th scope="col">Örnek</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((cells, i) => (
                  <tr key={i}>
                    <td className="target">{cells[0]}</td>
                    <td>{cells[1]}</td>
                    <td className="small muted">{cells[2]}</td>
                    <td>{statusOf(cells, i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && <p className="small muted">…ve {rows.length - 50} satır daha.</p>}
          </div>
        )}

        {result && (
          <div className="row">
            <button className="btn" onClick={save} disabled={!!busy || result.entries.length === 0}>
              {busy || `${result.entries.length} kelimeyi ekle`}
            </button>
            <span className="small muted">
              {result.duplicates.length > 0 && `${result.duplicates.length} zaten listende. `}
              {result.errors.length > 0 && `${result.errors.length} satır eklenemiyor; sebebi tabloda yazıyor.`}
            </span>
          </div>
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
