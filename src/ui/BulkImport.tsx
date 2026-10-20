import { useEffect, useMemo, useState } from 'react'
import { AiError, enrichWords, wordInfoToInput } from '../ai'
import { displayForm } from '../engine/exercises'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { AnkiFileError } from '../data/ankiImport'
import { listFileText } from '../data/officeImport'
import {
  autoDetectColumns,
  createEntry,
  DEFAULT_FORMAT,
  detectSource,
  importWords,
  isHeaderRow,
  parseRawGrid,
  type ColumnRole,
  type ListFormat,
  type RowSeparator,
  type TermSeparator,
} from '../data/wordInput'
import { toMemriseTsv, toQuizletText } from '../data/exportList'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'
import { ImportPlacement } from './ImportPlacement'
import { useImportList } from './useImportList'
import { showToast } from './toastFeed'

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
  en: 'decision\tkarar\tIt was a hard decision.\nthrive\tgelişmek, büyümek\nabandon\tterk etmek',
  fr: 'la décision\tkarar\tElle a pris une décision difficile.\népuisé\tbitkin\nla librairie\tkitapçı',
  es: 'la decisión\tkarar\tFue una decisión difícil.\nagotado\tbitkin\nla librería\tkitapçı',
}

type WizardTab = 'import' | 'export'
type ExportFormat = 'quizlet' | 'memrise' | 'anki'

/**
 * Quizlet, Memrise and Bulk Word Import / Export Wizard.
 * Allows importing from pasted text, spreadsheets, flashcard decks, and exporting to Quizlet & Memrise.
 */
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
  const [tab, setTab] = useState<WizardTab>('import')
  const [text, setText] = useState('')
  const [fmt, setFmt] = useState<ListFormat>(DEFAULT_FORMAT)
  const [customColumns, setCustomColumns] = useState<ColumnRole[] | null>(null)
  const [skipHeader, setSkipHeader] = useState<boolean | null>(null)
  const [aiFill, setAiFill] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Export mode state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('quizlet')
  const [includeExamples, setIncludeExamples] = useState(true)
  const [exportWords, setExportWords] = useState<VocabularyEntry[]>([])

  useEffect(() => {
    if (tab === 'export') {
      void db.vocabulary
        .where('language')
        .equals(language)
        .toArray()
        .then((items) => setExportWords(items.filter((w) => w.source !== 'sample')))
    }
  }, [db, language, tab])

  // Detect format & columns from text
  const detected = useMemo(() => (text.trim() ? detectSource(text, language) : null), [text, language])
  const rawRows = useMemo(() => (text.trim() ? parseRawGrid(text, fmt) : []), [text, fmt])
  const colCount = useMemo(() => (rawRows.length > 0 ? Math.max(...rawRows.slice(0, 10).map((r) => r.length)) : 0), [rawRows])

  const effectiveSkipHeader = skipHeader ?? (rawRows.length > 0 && isHeaderRow(rawRows[0]))

  const effectiveColumns = useMemo<ColumnRole[]>(() => {
    if (customColumns && customColumns.length >= colCount) return customColumns
    if (rawRows.length > 0) {
      return autoDetectColumns(rawRows[0], effectiveSkipHeader, language)
    }
    return detected?.columns ?? ['word', 'meaning']
  }, [customColumns, colCount, rawRows, effectiveSkipHeader, language, detected])

  const effectiveFmt = useMemo<ListFormat>(
    () => ({
      ...fmt,
      columns: effectiveColumns,
      skipHeader: effectiveSkipHeader,
    }),
    [fmt, effectiveColumns, effectiveSkipHeader],
  )

  const result = useMemo(() => (text.trim() ? importWords(text, language, existing, new Date(), effectiveFmt) : null), [text, language, existing, effectiveFmt])

  const readFile = async (file: File) => {
    try {
      setText(await listFileText(file))
      setCustomColumns(null)
      setSkipHeader(null)
      setMessage(null)
    } catch (e) {
      setMessage({
        ok: false,
        text:
          e instanceof AnkiFileError || (e instanceof Error && /bulunamadı/.test(e.message))
            ? (e as Error).message
            : 'Dosya okunamadı: bozuk ya da desteklenmeyen bir dosya olabilir.',
      })
    }
  }

  const applyPreset = (preset: 'quizlet' | 'memrise' | 'csv' | 'auto') => {
    setMessage(null)
    if (preset === 'quizlet') {
      setFmt((f) => ({ ...f, term: 'tab', row: 'newline', customTerm: undefined }))
      setCustomColumns(['word', 'meaning'])
      setSkipHeader(false)
    } else if (preset === 'memrise') {
      setFmt((f) => ({ ...f, term: 'tab', row: 'newline', customTerm: undefined }))
      setCustomColumns(['word', 'meaning', 'ignore', 'example'])
    } else if (preset === 'csv') {
      setFmt((f) => ({ ...f, term: 'comma', row: 'newline', customTerm: undefined }))
      setCustomColumns(null)
    } else {
      setFmt((f) => ({ ...f, term: 'auto', row: 'newline', customTerm: undefined }))
      setCustomColumns(null)
      setSkipHeader(null)
    }
  }

  const swapWordMeaning = () => {
    const next = [...effectiveColumns]
    const wordIdx = next.indexOf('word')
    const meaningIdx = next.indexOf('meaning')
    if (wordIdx >= 0 && meaningIdx >= 0) {
      next[wordIdx] = 'meaning'
      next[meaningIdx] = 'word'
    } else if (wordIdx >= 0) {
      next[wordIdx] = 'meaning'
    } else if (meaningIdx >= 0) {
      next[meaningIdx] = 'word'
    }
    setCustomColumns(next)
  }

  const save = async () => {
    if (!result?.entries.length) return
    let entries = result.entries
    setMessage(null)
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
              const filled = createEntry(
                {
                  ...ai,
                  word: displayForm(e),
                  meaning: [e.senses[0].gloss, ...(e.senses[0].altGlosses ?? [])].join(', '),
                  tags: effectiveFmt.tags,
                },
                language,
                e.addedAt!,
                'import',
              )
              return { ...filled, id: e.id }
            } catch {
              return e
            }
          })
        }
      } catch (err) {
        setMessage({
          ok: false,
          text: `${err instanceof AiError ? err.message : 'YZ ile doldurulamadı.'} Kelimeler YZ olmadan eklendi.`,
        })
      }
    }
    setBusy('')
    await db.vocabulary.bulkPut(await importList.place(entries))
    setText('')
    setCustomColumns(null)
    setSkipHeader(null)
    setMessage((m) => m ?? { ok: true, text: `${entries.length} kelime eklendi.` })
    onImported()
  }

  const statusOf = (row: number) => {
    const error = result?.errors.find((e) => e.line === row + 1)
    if (error) {
      return (
        <>
          <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad-text)' }} title={error.message}>
            hata
          </span>{' '}
          <span className="small muted">{error.message}</span>
        </>
      )
    }
    const cells = rawRows[row]
    const wordIdx = effectiveColumns.indexOf('word')
    const word = (wordIdx >= 0 ? cells?.[wordIdx] : cells?.[0])?.trim()
    if (!word) return null
    if (result?.duplicates.some((d) => word.toLowerCase().endsWith(d.toLowerCase()))) {
      return <span className="pill">zaten var</span>
    }
    if (!result?.entries.length) return null
    const warning = result.warnings.find((w) => w.line === row + 1)
    return (
      <>
        <span className="pill stage-5">eklenecek</span>
        {warning && <span className="small muted import-reason">{warning.message}</span>}
      </>
    )
  }

  // Export text generation
  const exportText = useMemo(() => {
    if (exportFormat === 'quizlet') return toQuizletText(exportWords, { includeExample: includeExamples })
    if (exportFormat === 'memrise') return toMemriseTsv(exportWords)
    return `#separator:tab\n#html:true\n${toQuizletText(exportWords, { includeExample: includeExamples })}`
  }, [exportWords, exportFormat, includeExamples])

  const copyExport = async () => {
    await navigator.clipboard.writeText(exportText)
    showToast(
      exportFormat === 'quizlet'
        ? 'Quizlet formatında panoya kopyalandı! Quizlet > İçe Aktar alanına yapıştırabilirsin.'
        : 'Panoya kopyalandı!',
    )
  }

  const downloadExport = () => {
    const ext = exportFormat === 'memrise' ? 'tsv' : 'txt'
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diloloji-${language}-${exportFormat}-${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Dosya indirildi.')
  }

  return (
    <details className="card bulk-import-card">
      <summary>Toplu ekle (Quizlet, Memrise, Excel)</summary>
      <div className="stack">
        <div className="wizard-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'import'}
            className="wizard-tab"
            onClick={() => setTab('import')}
          >
            📥 İçe Aktar (Quizlet, Memrise, Dosya)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'export'}
            className="wizard-tab"
            onClick={() => setTab('export')}
          >
            📤 Quizlet & Memrise'a Gönder (Dışa Aktar)
          </button>
        </div>

        {tab === 'import' ? (
          <>
            <p className="small muted">
              Quizlet, Memrise, Excel, Word ve Anki (.apkg/.txt) listelerini yapıştırabilir ya da dosya seçebilirsin. Format ve sütunlar otomatik algılanır.
            </p>

            <div className="row wrap gap-2 align-center">
              <span className="small muted">Hızlı şablon:</span>
              <button
                type="button"
                className="chip chip-sm"
                onClick={() => applyPreset('auto')}
                title="Formatı otomatik tahmin et"
              >
                ✨ Otomatik
              </button>
              <button
                type="button"
                className="chip chip-sm"
                onClick={() => applyPreset('quizlet')}
                title="Sekme (Tab) ile ayrılmış Quizlet listesi"
              >
                🎯 Quizlet
              </button>
              <button
                type="button"
                className="chip chip-sm"
                onClick={() => applyPreset('memrise')}
                title="Kelime, anlam ve örnek içeren Memrise TSV tablosu"
              >
                🧠 Memrise
              </button>
              <button
                type="button"
                className="chip chip-sm"
                onClick={() => applyPreset('csv')}
                title="Virgülle ayrılmış CSV"
              >
                📊 Excel / CSV
              </button>
            </div>

            <textarea
              className="textarea bulk-import-textarea"
              lang={language}
              aria-label="Kelime listesi"
              placeholder={EXAMPLE[language]}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setCustomColumns(null)
                setSkipHeader(null)
                setMessage(null)
              }}
            />

            <div className="row justify-between align-center wrap gap-2">
              <label className="btn btn-quiet">
                Dosya seç
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json,.xlsx,.docx,.apkg"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
                />
              </label>

              {colCount >= 2 && (
                <button type="button" className="btn btn-sm btn-quiet" onClick={swapWordMeaning}>
                  ⇄ Kelime ⇄ Anlam Takas Et
                </button>
              )}
            </div>

            {detected && text.trim() && (
              <div className="detect-banner" role="status">
                <div>
                  <strong>🎯 {detected.label}:</strong> {detected.description}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-quiet"
                  onClick={() => {
                    setFmt((f) => ({ ...f, term: detected.delimiter, customTerm: detected.customDelimiter }))
                    setCustomColumns(detected.columns)
                    setSkipHeader(detected.hasHeader)
                  }}
                >
                  Önerilen Ayarları Uygula
                </button>
              </div>
            )}

            <details className="small muted">
              <summary>Gelişmiş ayraç seçenekleri</summary>
              <div className="stack" style={{ marginTop: '0.5rem' }}>
                <div className="grid-2">
                  <div className="field">
                    <label>Kelime ile anlam arasında</label>
                    <div className="choice-row">
                      {TERM_OPTIONS.map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          className="chip chip-sm"
                          aria-pressed={fmt.term === v}
                          onClick={() => setFmt({ ...fmt, term: v })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {fmt.term === 'custom' && (
                      <input
                        className="input"
                        placeholder="Örn. |"
                        value={fmt.customTerm ?? ''}
                        onChange={(e) => setFmt({ ...fmt, customTerm: e.target.value })}
                        aria-label="Özel ayraç"
                      />
                    )}
                  </div>
                  <div className="field">
                    <label>Satırlar arasında</label>
                    <div className="choice-row">
                      {ROW_OPTIONS.map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          className="chip chip-sm"
                          aria-pressed={fmt.row === v}
                          onClick={() => setFmt({ ...fmt, row: v })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {fmt.row === 'custom' && (
                      <input
                        className="input"
                        placeholder="Örn. //"
                        value={fmt.customRow ?? ''}
                        onChange={(e) => setFmt({ ...fmt, customRow: e.target.value })}
                        aria-label="Özel satır ayracı"
                      />
                    )}
                  </div>
                </div>
              </div>
            </details>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="bulk-tags">Hepsine etiket ekle</label>
                <input
                  id="bulk-tags"
                  className="input"
                  placeholder="Örn. dizi, sezon 1"
                  value={fmt.tags ?? ''}
                  onChange={(e) => setFmt({ ...fmt, tags: e.target.value })}
                />
              </div>
              {apiKey && (
                <label className="row small gap-2 self-end pointer">
                  <input type="checkbox" checked={aiFill} onChange={(e) => setAiFill(e.target.checked)} />
                  <SparkleIcon size={16} className="icon-star" /> Örnek cümle, kalıp ve türü YZ ile tamamla
                </label>
              )}
            </div>

            <ImportPlacement list={importList} id="bulk-list" />

            {rawRows.length > 0 && (
              <div className="stack gap-2">
                <div className="row justify-between align-center wrap gap-2">
                  <span className="small muted">
                    Sütun rollerini kontrol et (başlıktan her sütunun türünü belirleyebilirsin):
                  </span>
                  <label className="row small gap-2 pointer">
                    <input
                      type="checkbox"
                      checked={effectiveSkipHeader}
                      onChange={(e) => setSkipHeader(e.target.checked)}
                    />
                    İlk satır başlık (atla)
                  </label>
                </div>

                <div className="preview">
                  <table className="data-table preview-table">
                    <thead>
                      <tr>
                        {Array.from({ length: colCount }, (_, cIdx) => (
                          <th key={cIdx} className="col-mapping-th">
                            <label className="sr-only" htmlFor={`col-role-${cIdx}`}>
                              Sütun {cIdx + 1} rolü
                            </label>
                            <select
                              id={`col-role-${cIdx}`}
                              className="col-select"
                              value={effectiveColumns[cIdx] ?? 'ignore'}
                              onChange={(e) => {
                                const next = Array.from({ length: colCount }, (_, k) => effectiveColumns[k] ?? 'ignore')
                                next[cIdx] = e.target.value as ColumnRole
                                setCustomColumns(next)
                              }}
                            >
                              <option value="word">🔤 Kelime</option>
                              <option value="meaning">🇹🇷 Anlam</option>
                              <option value="example">💬 Örnek</option>
                              <option value="exampleTranslation">🌐 Çeviri</option>
                              <option value="notes">📝 Not</option>
                              <option value="tags">🏷️ Etiket</option>
                              <option value="ignore">🚫 Yoksay</option>
                            </select>
                          </th>
                        ))}
                        <th scope="col" style={{ width: '6rem' }}>
                          Durum
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(effectiveSkipHeader ? 1 : 0, (effectiveSkipHeader ? 1 : 0) + 50).map((cells, i) => {
                        const actualRowIdx = i + (effectiveSkipHeader ? 1 : 0)
                        return (
                          <tr key={i}>
                            {Array.from({ length: colCount }, (_, cIdx) => {
                              const role = effectiveColumns[cIdx]
                              const isWord = role === 'word'
                              const isIgnore = role === 'ignore'
                              return (
                                <td key={cIdx} className={isWord ? 'target' : isIgnore ? 'muted' : ''}>
                                  {cells[cIdx] ?? ''}
                                </td>
                              )
                            })}
                            <td>{statusOf(actualRowIdx)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {rawRows.length > 50 && <p className="small muted">…ve {rawRows.length - 50} satır daha.</p>}
                </div>
              </div>
            )}

            {result && (
              <div className="row wrap gap-2 align-center">
                <button className="btn" onClick={save} disabled={!!busy || result.entries.length === 0}>
                  {busy || `${result.entries.length} kelimeyi ekle`}
                </button>
                <span className="small muted">
                  {result.duplicates.length > 0 && `${result.duplicates.length} zaten listende. `}
                  {result.errors.length > 0 && `${result.errors.length} satır eklenemiyor.`}
                </span>
              </div>
            )}

            {message && (
              <p className={message.ok ? 'notice' : 'error'} role="status">
                {message.text}
              </p>
            )}
          </>
        ) : (
          /* Export Mode */
          <div className="stack gap-3">
            <p className="small muted">
              Diloloji'deki {exportWords.length} kelimeni Quizlet veya Memrise'a aktarmak için formatı seçip tek dokunuşla kopyala veya dosya olarak indir.
            </p>

            <div className="row wrap gap-2 align-center">
              <span className="small muted">Hedef platform:</span>
              <button
                type="button"
                className="chip"
                aria-pressed={exportFormat === 'quizlet'}
                onClick={() => setExportFormat('quizlet')}
              >
                🎯 Quizlet (Sekme + Satır)
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={exportFormat === 'memrise'}
                onClick={() => setExportFormat('memrise')}
              >
                🧠 Memrise (TSV Tablosu)
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={exportFormat === 'anki'}
                onClick={() => setExportFormat('anki')}
              >
                🗂️ Anki (Düz Metin)
              </button>
            </div>

            {exportFormat === 'quizlet' && (
              <label className="row small gap-2 pointer">
                <input
                  type="checkbox"
                  checked={includeExamples}
                  onChange={(e) => setIncludeExamples(e.target.checked)}
                />
                Örnek cümleleri de dahil et (3. sütun olarak eklenir)
              </label>
            )}

            <div className="row gap-2 wrap">
              <button type="button" className="btn" onClick={copyExport} disabled={exportWords.length === 0}>
                📋 Panoya Kopyala
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={downloadExport}
                disabled={exportWords.length === 0}
              >
                ⬇️ Dosya Olarak İndir (.{exportFormat === 'memrise' ? 'tsv' : 'txt'})
              </button>
            </div>

            <div className="field">
              <label className="small muted">Dışa aktarım önizlemesi ({exportWords.length} kelime):</label>
              <textarea
                className="textarea"
                readOnly
                value={exportText.split('\n').slice(0, 30).join('\n') + (exportWords.length > 30 ? '\n…' : '')}
                rows={8}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>

            <div className="notice small">
              <strong>💡 Quizlet'e Nasıl Aktarılır?</strong>
              <ol style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                <li>Yukarıdaki <strong>"Panoya Kopyala"</strong> butonuna bas.</li>
                <li>Quizlet web sitesinde yeni bir çalışma seti oluştur.</li>
                <li><strong>"Word, Excel veya Google Docs'tan içe aktar"</strong> bağlantısına tıkla.</li>
                <li>Kopyalanan metni yapıştır ve seti kaydet!</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
