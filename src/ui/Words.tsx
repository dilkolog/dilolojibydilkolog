import { useMemo, useState, type FormEvent } from 'react'
import { displayForm } from '../engine/exercises'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import type { Gender, PartOfSpeech, TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { createEntry, entryToInput, IMPORT_COLUMNS, importWords, updateEntry, wordId, WordInputError, wordKeys, type WordInput } from '../data/wordInput'
import { LANGUAGE_NAME, POS_NAME, STAGE_NAME } from './labels'

interface Props {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onChanged: () => void
  onOpen: (entryId: string) => void
}

export function WordsScreen({ db, language, vocabulary, states, onChanged, onOpen }: Props) {
  const [query, setQuery] = useState('')
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const ids = useMemo(() => new Set(vocabulary.map((v) => v.id)), [vocabulary])
  const keys = useMemo(() => wordKeys(vocabulary), [vocabulary])
  const hasSamples = vocabulary.some((v) => v.source === 'sample')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...vocabulary]
      .filter((v) => !q || v.lemma.toLowerCase().includes(q) || v.senses[0].gloss.toLowerCase().includes(q))
      .sort((a, b) => (b.addedAt?.getTime() ?? 0) - (a.addedAt?.getTime() ?? 0) || a.lemma.localeCompare(b.lemma))
  }, [vocabulary, query])

  const loadSamples = async () => {
    await db.vocabulary.bulkPut(SAMPLE_WORDS[language].filter((w) => !ids.has(w.id)))
    onChanged()
  }

  const removeSamples = async () => {
    const samples = vocabulary.filter((v) => v.source === 'sample')
    if (!confirm(`${samples.length} örnek kelime ve bunlardaki ilerlemen silinecek. Devam edilsin mi?`)) return
    for (const s of samples) await db.deleteWord(s.id)
    onChanged()
  }

  return (
    <div>
      <section className="section stack">
        <h1 className="greeting">{LANGUAGE_NAME[language]} kelimelerin</h1>
        <details open className="card">
          <summary>Kelime ekle</summary>
          <WordForm db={db} language={language} existing={keys} onSaved={onChanged} />
        </details>
        <ImportPanel db={db} language={language} existing={keys} onImported={onChanged} />
        <div className="row small">
          {hasSamples ? (
            <button className="link" onClick={removeSamples}>
              Örnek kelimeleri kaldır
            </button>
          ) : (
            <button className="link" onClick={loadSamples}>
              Denemek için {SAMPLE_WORDS[language].length} örnek kelime yükle
            </button>
          )}
        </div>
      </section>

      <section className="section stack">
        <div className="row">
          <h2 className="section-title" style={{ marginRight: 'auto' }}>
            Liste <span className="muted small">({vocabulary.length})</span>
          </h2>
          <input
            className="input"
            style={{ maxWidth: '16rem' }}
            placeholder="Ara"
            aria-label="Kelime ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {vocabulary.length === 0 ? (
          <p className="muted">Henüz kelime yok. Yukarıdan ekleyebilir ya da bir liste yapıştırabilirsin.</p>
        ) : (
          <ul className="word-list">
            {list.map((v) => {
              const st = stateById.get(v.id)
              return (
                <li key={v.id}>
                  <button className="w word-link" onClick={() => onOpen(v.id)}>
                    {displayForm(v)}
                  </button>
                  {st ? (
                    <span className={`pill stage-${MASTERY_STAGES.indexOf(masteryStage(st))}`}>{STAGE_NAME[masteryStage(st)]}</span>
                  ) : (
                    <span className="pill">Sırada</span>
                  )}
                  <span className="meta">
                    {v.senses[0].gloss}
                    {v.partOfSpeech !== 'other' && `, ${POS_NAME[v.partOfSpeech]}`}
                    {v.source === 'sample' && ' (örnek)'}
                    {v.senses[0].examples.length === 0 && '. Örnek cümle yok'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Placeholders in the language being edited, so the expected format is obvious. */
const EXAMPLES: Record<TargetLanguage, { collocation: string; confusable: string; row: string; marked: string }> = {
  en: {
    collocation: 'make a decision = karar vermek (do a decision, give a decision)',
    confusable: 'effect',
    row: 'decision\tkarar\tIt was a hard decision.\tZor bir karardı.',
    marked: 'She *abandoned* it.',
  },
  fr: {
    collocation: 'prendre une décision = karar vermek (faire une décision)',
    confusable: 'journée',
    row: 'la décision\tkarar\tC’est une décision difficile.\tBu zor bir karar.',
    marked: 'Je *sais* nager.',
  },
  es: {
    collocation: 'tomar una decisión = karar vermek (hacer una decisión)',
    confusable: 'conocer',
    row: 'la decisión\tkarar\tFue una decisión difícil.\tZor bir karardı.',
    marked: 'No *sé* nadar.',
  },
}

const EMPTY: WordInput = { word: '', meaning: '', example: '', exampleTranslation: '', collocations: '', confusables: '' }

const POS_OPTIONS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'phrase', 'other']

/**
 * Adds a new word, or edits `entry` when given. `existing` holds the keys of the other words
 * (see `wordKeys`) for the duplicate check.
 */
export function WordForm({
  db,
  language,
  existing,
  entry,
  onSaved,
  onCancel,
}: {
  db: KelimeDB
  language: TargetLanguage
  existing: Set<string>
  entry?: VocabularyEntry
  onSaved: (entry: VocabularyEntry) => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<WordInput>(() => (entry ? entryToInput(entry) : EMPTY))
  const [error, setError] = useState('')
  const [added, setAdded] = useState('')
  const set = (k: keyof WordInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const needsGender = language === 'fr' && /^l['’]/i.test(form.word.trim())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const saved = entry ? updateEntry(entry, form) : createEntry(form, language, new Date())
      if (existing.has(wordId(language, saved.lemma)) || (!entry && existing.has(saved.id))) {
        throw new WordInputError(`"${saved.lemma}" zaten listende.`)
      }
      await db.vocabulary.put(saved)
      if (!entry) {
        setAdded(saved.lemma)
        setForm(EMPTY)
        document.getElementById('w-word')?.focus()
      }
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const articleHelp =
    language === 'en' ? 'Örn. decision' : language === 'fr' ? 'İsimleri artikeliyle yaz: la décision' : 'İsimleri artikeliyle yaz: el año'

  return (
    <form className="stack" onSubmit={submit}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="w-word">Kelime</label>
            <input id="w-word" className="input" value={form.word} onChange={set('word')} lang={language} autoComplete="off" />
            <span className="help">{articleHelp}</span>
          </div>
          <div className="field">
            <label htmlFor="w-meaning">Türkçe anlamı</label>
            <input id="w-meaning" className="input" value={form.meaning} onChange={set('meaning')} autoComplete="off" />
            <span className="help">Birden fazlaysa virgülle ayır</span>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="w-pos">Tür</label>
            <select
              id="w-pos"
              className="select"
              value={form.partOfSpeech ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, partOfSpeech: (e.target.value || undefined) as PartOfSpeech | undefined }))}
            >
              <option value="">Belirtme</option>
              {POS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {POS_NAME[p]}
                </option>
              ))}
            </select>
          </div>
          {needsGender && (
            <div className="field">
              <label htmlFor="w-gender">Cinsiyet</label>
              <select
                id="w-gender"
                className="select"
                value={form.gender ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, gender: (e.target.value || undefined) as Gender | undefined }))}
              >
                <option value="">Seç</option>
                <option value="m">Eril (le)</option>
                <option value="f">Dişil (la)</option>
              </select>
              <span className="help">l' cinsiyeti göstermediği için gerekli</span>
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="w-ex">Örnek cümle (isteğe bağlı)</label>
          <input id="w-ex" className="input" value={form.example ?? ''} onChange={set('example')} lang={language} />
          <span className="help">
            Bağlam ve boşluk doldurma alıştırmalarını açar. Kelime cümlede farklı biçimdeyse yıldızla işaretle: {EXAMPLES[language].marked}
          </span>
        </div>
        <div className="field">
          <label htmlFor="w-ext">Örnek cümlenin çevirisi</label>
          <input id="w-ext" className="input" value={form.exampleTranslation ?? ''} onChange={set('exampleTranslation')} />
        </div>
        <details>
          <summary className="small">Daha fazla: kalıplar ve karıştırılan kelimeler</summary>
          <div className="stack">
            <div className="field">
              <label htmlFor="w-col">Kalıplar (collocation)</label>
              <textarea
                id="w-col"
                className="textarea"
                value={form.collocations ?? ''}
                onChange={set('collocations')}
                lang={language}
                placeholder={EXAMPLES[language].collocation}
              />
              <span className="help">Her satıra bir kalıp. Parantez içine sık yapılan yanlışları yazarsan kalıp alıştırması açılır.</span>
            </div>
            <div className="field">
              <label htmlFor="w-conf">Karıştırılan kelimeler</label>
              <input id="w-conf" className="input" value={form.confusables ?? ''} onChange={set('confusables')} lang={language} placeholder={EXAMPLES[language].confusable} />
              <span className="help">Listende varsa ayırt etme alıştırması açılır ve ikisi aynı günlerde tanıtılmaz.</span>
            </div>
          </div>
        </details>
        {error && <p className="error" role="alert">{error}</p>}
        {added && !error && <p className="notice" role="status">"{added}" eklendi.</p>}
        <div className="row">
          <button className="btn" type="submit">
            {entry ? 'Değişiklikleri kaydet' : 'Kelimeyi ekle'}
          </button>
          {onCancel && (
            <button className="btn btn-quiet" type="button" onClick={onCancel}>
              Vazgeç
            </button>
          )}
        </div>
    </form>
  )
}

function ImportPanel({
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
  const [text, setText] = useState('')
  const [report, setReport] = useState<ReturnType<typeof importWords> | null>(null)
  const [added, setAdded] = useState(0)

  const preview = () => {
    setAdded(0)
    setReport(importWords(text, language, existing, new Date()))
  }

  const save = async () => {
    if (!report) return
    await db.vocabulary.bulkPut(report.entries)
    setAdded(report.entries.length)
    setText('')
    setReport(null)
    onImported()
  }

  const readFile = async (file: File) => {
    setText(await file.text())
    setReport(null)
  }

  return (
    <details className="card">
      <summary>Toplu ekle</summary>
      <div className="stack">
        <p className="small muted">
          Excel ya da Google Sheets'ten satırları kopyalayıp yapıştır, veya bir CSV dosyası seç. Sütun sırası:
        </p>
        <p className="code">{IMPORT_COLUMNS.join('\t')}</p>
        <p className="small muted">Yalnızca ilk iki sütun zorunlu. Kalıpları ";" ile ayır.</p>
        <textarea
          className="textarea"
          value={text}
          lang={language}
          aria-label="Kelime listesi"
          placeholder={EXAMPLES[language].row}
          onChange={(e) => {
            setText(e.target.value)
            setReport(null)
          }}
        />
        <div className="row">
          <button className="btn btn-quiet" type="button" onClick={preview} disabled={!text.trim()}>
            Önizle
          </button>
          <label className="link small">
            Dosya seç
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            />
          </label>
        </div>
        {added > 0 && <p className="notice" role="status">{added} kelime eklendi.</p>}
        {report && (
          <div className="stack small" role="status">
            <p>
              {report.entries.length} kelime eklenmeye hazır
              {report.duplicates.length > 0 && `, ${report.duplicates.length} tanesi zaten var (atlanacak)`}
              {report.errors.length > 0 && `, ${report.errors.length} satırda sorun var`}.
            </p>
            {report.errors.length > 0 && (
              <ul className="error">
                {report.errors.map((e) => (
                  <li key={e.line}>
                    Satır {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            {report.entries.length > 0 && (
              <div>
                <button className="btn" type="button" onClick={save}>
                  {report.entries.length} kelimeyi ekle
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
