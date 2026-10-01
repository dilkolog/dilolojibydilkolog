import { useMemo, useState, type FormEvent } from 'react'
import { displayForm } from '../engine/exercises'
import { normalize, splitArticle } from '../engine/answerCheck'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import type { Gender, Mistake, PartOfSpeech, TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { createEntry, entryToInput, updateEntry, wordId, WordInputError, wordKeys, type WordInput } from '../data/wordInput'
import { AiError, enrichWords, wordInfoToInput } from '../ai'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'
import { ImagePicker, type PickedImage } from './ImagePicker'
import { BulkImport } from './BulkImport'
import { Select } from './Select'
import { useMediaUrl } from './useMedia'
import { TextImport } from './TextImport'
import type { IncomingWord } from './incoming'
import { WordGraph } from './WordGraph'
import { LANGUAGE_NAME, POS_NAME, STAGE_NAME } from './labels'

interface Props {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  onChanged: () => void
  onOpen: (entryId: string) => void
  /** Study a filtered list (deck) right now. */
  onStudy: (entries: VocabularyEntry[]) => void
  /** A word sent from another site via the bookmarklet. */
  incoming?: IncomingWord | null
  onIncomingDone?: () => void
}

export function WordsScreen({ db, language, vocabulary, states, mistakes, onChanged, onOpen, onStudy, incoming, onIncomingDone }: Props) {
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const ids = useMemo(() => new Set(vocabulary.map((v) => v.id)), [vocabulary])
  const keys = useMemo(() => wordKeys(vocabulary), [vocabulary])
  const [view, setView] = useState<'list' | 'graph'>('list')
  const hasSamples = vocabulary.some((v) => v.source === 'sample')


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
        {incoming && (
          <div className="card stack incoming">
            <p className="small muted">
              🌐 Web'den geldi{incoming.src && (
                <>
                  : <a href={incoming.src} target="_blank" rel="noreferrer">{new URL(incoming.src).hostname}</a>
                </>
              )}
            </p>
            <WordForm
              key={incoming.word + incoming.context}
              db={db}
              language={language}
              existing={keys}
              initial={{
                word: incoming.word,
                meaning: '',
                example: markWord(incoming.context, incoming.word),
                exampleTranslation: '',
                notes: incoming.src ? `Kaynak: ${incoming.src}` : '',
              }}
              onSaved={() => {
                onChanged()
                onIncomingDone?.()
              }}
              onCancel={onIncomingDone}
            />
          </div>
        )}
        <details open={!incoming} className="card">
          <summary>Kelime ekle</summary>
          <WordForm db={db} language={language} existing={keys} onSaved={onChanged} />
        </details>
        <TextImport db={db} language={language} vocabulary={vocabulary} existing={keys} onAdded={onChanged} />
        <BulkImport db={db} language={language} existing={keys} onImported={onChanged} />
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
        <div className="segmented" role="tablist" aria-label="Görünüm">
          <button role="tab" className="segmented-btn" aria-selected={view === 'list'} onClick={() => setView('list')}>
            Liste
          </button>
          <button role="tab" className="segmented-btn" aria-selected={view === 'graph'} onClick={() => setView('graph')}>
            Kelime ağı
          </button>
        </div>
      </section>
      {view === 'list' ? (
        <WordList vocabulary={vocabulary} stateById={stateById} mistakes={mistakes} onOpen={onOpen} onStudy={onStudy} />
      ) : (
        <section className="stack" style={{ marginTop: '1rem' }}>
          <WordGraph vocabulary={vocabulary} states={states} onOpen={onOpen} />
        </section>
      )}
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

const POS_OPTIONS: PartOfSpeech[] = ['other', 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'phrase']

/**
 * Adds a new word, or edits `entry` when given. `existing` holds the keys of the other words
 * (see `wordKeys`) for the duplicate check.
 */
export function WordForm({
  db,
  language,
  existing,
  entry,
  initial,
  onSaved,
  onCancel,
}: {
  db: KelimeDB
  language: TargetLanguage
  existing: Set<string>
  entry?: VocabularyEntry
  /** Prefilled values for a new word. */
  initial?: WordInput
  onSaved: (entry: VocabularyEntry) => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<WordInput>(() => (entry ? entryToInput(entry) : (initial ?? EMPTY)))
  const [error, setError] = useState('')
  const [added, setAdded] = useState('')
  const set = (k: keyof WordInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const needsGender = language === 'fr' && /^l['’]/i.test(form.word.trim())
  const { apiKey } = useAi()
  const [filling, setFilling] = useState(false)
  // A picture chosen before the word is saved (new words only; existing words edit it in detail).
  const [image, setImage] = useState<(PickedImage & { url: string }) | null>(null)
  const [picking, setPicking] = useState(false)

  /** Asks the AI for the word's data and fills only the fields the user left empty. */
  const fillWithAi = async () => {
    if (!apiKey || !form.word.trim()) return
    setFilling(true)
    setError('')
    try {
      const result = await enrichWords(apiKey, language, [{ word: form.word.trim() }])
      const info = result.values().next().value
      if (!info) throw new WordInputError('AI bu kelime için sonuç döndürmedi.')
      const ai = wordInfoToInput(info)
      setForm((f) => ({
        ...f,
        word: ai.word || f.word,
        meaning: f.meaning?.trim() ? f.meaning : ai.meaning,
        partOfSpeech: f.partOfSpeech ?? ai.partOfSpeech,
        gender: f.gender ?? ai.gender,
        example: f.example?.trim() ? f.example : ai.example,
        exampleTranslation: f.exampleTranslation?.trim() ? f.exampleTranslation : ai.exampleTranslation,
        collocations: f.collocations?.trim() ? f.collocations : ai.collocations,
        confusables: f.confusables?.trim() ? f.confusables : ai.confusables,
      }))
    } catch (err) {
      setError(err instanceof AiError || err instanceof WordInputError ? err.message : 'AI ile doldurulamadı.')
    } finally {
      setFilling(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const saved = entry ? updateEntry(entry, form) : createEntry(form, language, new Date())
      if (existing.has(wordId(language, saved.lemma)) || (!entry && existing.has(saved.id))) {
        throw new WordInputError(`"${saved.lemma}" zaten listende.`)
      }
      if (image) {
        saved.imageId = await db.addMedia('image', image.blob)
        saved.imageCredit = image.credit
      }
      await db.vocabulary.put(saved)
      if (!entry) {
        setAdded(saved.lemma)
        setForm(EMPTY)
        setImage(null)
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
            <Select
              id="w-pos"
              label="Tür"
              value={form.partOfSpeech ?? 'other'}
              options={POS_OPTIONS.map((p) => ({ value: p, label: p === 'other' ? 'Belirtme' : POS_NAME[p] }))}
              onChange={(v) => setForm((f) => ({ ...f, partOfSpeech: v === 'other' ? undefined : v }))}
            />
          </div>
          {needsGender && (
            <div className="field">
              <label htmlFor="w-gender">Cinsiyet</label>
              <Select
                id="w-gender"
                label="Cinsiyet"
                value={form.gender}
                options={[
                  { value: 'm', label: 'Eril (le)' },
                  { value: 'f', label: 'Dişil (la)' },
                ]}
                onChange={(v) => setForm((f) => ({ ...f, gender: v as Gender }))}
              />
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
        {!entry && (
          <div className="row">
            {image ? (
              <>
                <img className="thumb" src={image.url} alt="" />
                <button type="button" className="link small" onClick={() => setPicking(true)}>
                  Görseli değiştir
                </button>
                <button type="button" className="link small" onClick={() => setImage(null)}>
                  Kaldır
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setPicking(true)} disabled={!form.word.trim()}>
                🖼️ Görsel ekle
              </button>
            )}
          </div>
        )}
        {picking && (
          <ImagePicker
            initialQuery={splitArticle(normalize(form.word), language).rest}
            suggestions={form.meaning.split(/,|\//).map((m) => m.trim()).filter(Boolean)}
            onClose={() => setPicking(false)}
            onPick={(img) => {
              setImage({ ...img, url: URL.createObjectURL(img.blob) })
              setPicking(false)
            }}
          />
        )}
        <details>
          <summary className="small">Daha fazla: not, etiketler, kalıplar ve karıştırılan kelimeler</summary>
          <div className="stack">
            <div className="field">
              <label htmlFor="w-note">Not / hafıza ipucu</label>
              <input id="w-note" className="input" value={form.notes ?? ''} onChange={set('notes')} placeholder="Nerede gördün, neye benziyor…" />
            </div>
            <div className="field">
              <label htmlFor="w-tags">Etiketler</label>
              <input id="w-tags" className="input" value={form.tags ?? ''} onChange={set('tags')} placeholder="iş, seyahat, dizi" />
              <span className="help">Virgülle ayır; kelime listesinde etikete göre filtreleyebilirsin.</span>
            </div>
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
          {apiKey && (
            <button className="btn btn-quiet" type="button" onClick={fillWithAi} disabled={filling || !form.word.trim()}>
              <SparkleIcon size={18} className="icon-star" />
              {filling ? 'Dolduruluyor…' : 'AI ile doldur'}
            </button>
          )}
          {onCancel && (
            <button className="btn btn-quiet" type="button" onClick={onCancel}>
              Vazgeç
            </button>
          )}
        </div>
    </form>
  )
}

// ---------------------------------------------------------------------------

type StageFilter = 'all' | 'waiting' | 'learning' | 'strong' | 'mastered' | 'mistakes'
type Sort = 'newest' | 'alpha' | 'weakest' | 'strongest'

const STAGE_FILTERS: [StageFilter, string][] = [
  ['all', 'Hepsi'],
  ['waiting', 'Sırada'],
  ['learning', 'Öğreniliyor'],
  ['strong', 'Sağlam'],
  ['mastered', 'Oturdu'],
  ['mistakes', 'Hatalı'],
]

function WordThumb({ id }: { id?: string }) {
  const url = useMediaUrl(id)
  return url ? <img className="thumb" src={url} alt="" /> : null
}

/** Searchable, filterable word list. */
function WordList({
  vocabulary,
  stateById,
  mistakes,
  onOpen,
  onStudy,
}: {
  vocabulary: VocabularyEntry[]
  stateById: Map<string, UserWordState>
  mistakes: Mistake[]
  onOpen: (id: string) => void
  onStudy: (entries: VocabularyEntry[]) => void
}) {
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<StageFilter>('all')
  const [flags, setFlags] = useState<{ picture?: boolean; audio?: boolean; noExample?: boolean }>({})
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  const withMistakes = useMemo(() => new Set(mistakes.filter((m) => !m.resolved).map((m) => m.entryId)), [mistakes])
  const tags = useMemo(() => [...new Set(vocabulary.flatMap((v) => v.tags))].sort((a, b) => a.localeCompare(b, 'tr')), [vocabulary])
  const stageIndex = (v: VocabularyEntry) => {
    const st = stateById.get(v.id)
    return st ? MASTERY_STAGES.indexOf(masteryStage(st)) : -1
  }

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    const match = (v: VocabularyEntry) => {
      if (q && ![v.lemma, v.senses[0].gloss, ...(v.senses[0].altGlosses ?? []), v.notes ?? ''].some((t) => t.toLocaleLowerCase('tr').includes(q))) return false
      const i = stageIndex(v)
      if (stage === 'waiting' && i !== -1) return false
      if (stage === 'learning' && !(i >= 0 && i <= 2)) return false
      if (stage === 'strong' && !(i === 3 || i === 4)) return false
      if (stage === 'mastered' && i !== 5) return false
      if (stage === 'mistakes' && !withMistakes.has(v.id)) return false
      if (flags.picture && !v.imageId) return false
      if (flags.audio && !v.audioId) return false
      if (flags.noExample && v.senses[0].examples.length > 0) return false
      if (tag && !v.tags.includes(tag)) return false
      return true
    }
    const by: Record<Sort, (a: VocabularyEntry, b: VocabularyEntry) => number> = {
      newest: (a, b) => (b.addedAt?.getTime() ?? 0) - (a.addedAt?.getTime() ?? 0) || a.lemma.localeCompare(b.lemma),
      alpha: (a, b) => a.lemma.localeCompare(b.lemma, 'tr'),
      weakest: (a, b) => stageIndex(a) - stageIndex(b) || (stateById.get(b.id)?.stats.wrong ?? 0) - (stateById.get(a.id)?.stats.wrong ?? 0),
      strongest: (a, b) => stageIndex(b) - stageIndex(a),
    }
    return vocabulary.filter(match).sort(by[sort])
  }, [vocabulary, query, stage, flags, tag, sort, stateById, withMistakes])

  const toggle = (k: keyof typeof flags) => setFlags((f) => ({ ...f, [k]: !f[k] }))

  return (
    <section className="section stack">
      <h2 className="section-title">
        Liste <span className="muted small">({list.length === vocabulary.length ? vocabulary.length : `${list.length} / ${vocabulary.length}`})</span>
      </h2>
      {vocabulary.length === 0 ? (
        <p className="muted">Henüz kelime yok. Yukarıdan ekleyebilir ya da bir liste yapıştırabilirsin.</p>
      ) : (
        <>
          <div className="toolbar">
            <div className="search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input className="input" placeholder="Kelime, anlam ya da not ara" aria-label="Kelime ara" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="toolbar-sort">
              <Select<Sort>
                label="Sırala"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'newest', label: 'En yeni' },
                  { value: 'alpha', label: 'Alfabetik' },
                  { value: 'weakest', label: 'En zayıf önce' },
                  { value: 'strongest', label: 'En güçlü önce' },
                ]}
              />
            </div>
          </div>
          <div className="choice-row">
            {STAGE_FILTERS.map(([v, label]) => (
              <button key={v} className="chip chip-sm" aria-pressed={stage === v} onClick={() => setStage(v)}>
                {label}
              </button>
            ))}
            <span className="chip-sep" aria-hidden />
            <button className="chip chip-sm" aria-pressed={!!flags.picture} onClick={() => toggle('picture')}>
              🖼️ Resimli
            </button>
            <button className="chip chip-sm" aria-pressed={!!flags.audio} onClick={() => toggle('audio')}>
              🎙️ Sesli
            </button>
            <button className="chip chip-sm" aria-pressed={!!flags.noExample} onClick={() => toggle('noExample')}>
              Örneksiz
            </button>
            {tags.length > 0 && (
              <div style={{ minWidth: '10rem' }}>
                <Select
                  label="Etiket"
                  value={tag || '__all'}
                  onChange={(v) => setTag(v === '__all' ? '' : v)}
                  options={[{ value: '__all', label: 'Tüm etiketler' }, ...tags.map((t) => ({ value: t, label: `#${t}` }))]}
                />
              </div>
            )}
          </div>
          {list.length > 0 && list.length < vocabulary.length && (
            <div className="deck-bar">
              <span>
                {tag ? <strong>#{tag}</strong> : 'Filtrelenmiş liste'}: {list.length} kelime
              </span>
              <button className="btn" onClick={() => onStudy(list)}>
                Bu listeyi çalış
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <p className="muted">Bu filtrelere uyan kelime yok.</p>
          ) : (
            <ul className="word-list">
              {list.map((v) => {
                const st = stateById.get(v.id)
                return (
                  <li key={v.id}>
                    <button className="word-row" onClick={() => onOpen(v.id)}>
                      <WordThumb id={v.imageId} />
                      <span className="word-row-text">
                        <span className="w">{displayForm(v)}</span>
                        <span className="meta">
                          {v.senses[0].gloss}
                          {v.partOfSpeech !== 'other' && `, ${POS_NAME[v.partOfSpeech]}`}
                          {v.source === 'sample' && ' (örnek)'}
                          {v.audioId && ' · 🎙️'}
                          {v.tags.length > 0 && ` · ${v.tags.map((t) => `#${t}`).join(' ')}`}
                        </span>
                      </span>
                      {withMistakes.has(v.id) && <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad-text)' }}>hata</span>}
                      {st ? (
                        <span className={`pill stage-${MASTERY_STAGES.indexOf(masteryStage(st))}`}>{STAGE_NAME[masteryStage(st)]}</span>
                      ) : (
                        <span className="pill">Sırada</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

/** Marks the word in its sentence (*word*) so the example's form is unambiguous. */
function markWord(sentence: string, word: string): string {
  const i = sentence.toLowerCase().indexOf(word.toLowerCase())
  return i < 0 ? sentence : `${sentence.slice(0, i)}*${sentence.slice(i, i + word.length)}*${sentence.slice(i + word.length)}`
}
