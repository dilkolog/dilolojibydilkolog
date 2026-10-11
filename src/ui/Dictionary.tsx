import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AiError, enrichWords } from '../ai'
import { buildIndex, fold, search, wiktionaryUrl } from '../data/dictionary'
import { loadLexicon, lookUpLexicon, type LexiconEntry } from '../data/lexicon'
import { loadTenses } from '../data/tenseData'
import { loadPack } from '../data/wordpack'
import { translate, translationReady } from '../data/translate'
import type { Pack } from '../data/wordpackBuild'
import { db } from '../data/instance'
import { genderOfCode, POS_CODE } from '../data/wordpackBuild'
import { addEntry, emptyNotes, findAdded, noteLookup, parseMeanings, removeEntry, setFix, type DictionaryNotes } from '../engine/dictionaryNotes'
import { normalize, splitArticle } from '../engine/answerCheck'
import { labTensesOf } from '../engine/tenses'
import { LevelChip } from './LevelChip'
import { TrapChip } from './TrapChip'
import { CollocationChip } from './CollocationChip'
import { TARGET_LANGUAGES, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { BookIcon, CheckIcon, CloseIcon, ConjugationsIcon, PenIcon, PlusIcon, SearchIcon, SpeakerIcon, WandIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { DictionaryExamples } from './DictionaryExamples'
import { PageHeader } from './PageHeader'
import { PosTag } from './PosTag'
import { speak, unlockedAudio } from './speech'

/**
 * Any word, in the list or not: what it means in Turkish, how it sounds, where it comes from and
 * what it is in the other two languages, from the word pack (offline once downloaded). Typing
 * Turkish finds the foreign words for it. A word not in the list is one tap from the add form,
 * its meaning already filled in.
 */
interface Props {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  initialQuery?: string
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  onOpenLab?: (verb: string) => void
  onSwitchLanguage?: (lang: TargetLanguage, query?: string) => void
}

const RECENT_KEY = (l: TargetLanguage) => `kelime-koc:dictionary:${l}`
const RECENT_MAX = 8

function loadRecent(language: TargetLanguage): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY(language)) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveRecent(language: TargetLanguage, word: string): string[] {
  const next = [word, ...loadRecent(language).filter((w) => w !== word)].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY(language), JSON.stringify(next))
  } catch {
    // Private window or blocked storage: the list just isn't kept.
  }
  return next
}

/** The word the learner already has, matched without its article and accents. */
const ownEntry = (vocabulary: readonly VocabularyEntry[], word: string, language: TargetLanguage) => {
  const key = fold(splitArticle(normalize(word).toLocaleLowerCase(language), language).rest)
  return vocabulary.find((v) => fold(splitArticle(normalize(v.lemma).toLocaleLowerCase(language), language).rest) === key)
}

export function DictionaryScreen({ language, vocabulary, initialQuery = '', onOpenWord, onAdd, onOpenLab, onSwitchLanguage }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [pack, setPack] = useState<Pack | null | undefined>(undefined)
  const [recent, setRecent] = useState(() => loadRecent(language))
  const [notes, setNotes] = useState<DictionaryNotes>(emptyNotes)
  const notesRef = useRef(notes)
  const [deeplOn, setDeeplOn] = useState(false)
  useEffect(() => {
    let live = true
    void translationReady().then((yes) => live && setDeeplOn(yes))
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    let live = true
    setPack(undefined)
    setRecent(loadRecent(language))
    void loadPack(language).then((p) => live && setPack(p ?? null))
    void db.getDictionaryNotes(language).then((n) => {
      if (!live) return
      notesRef.current = n
      setNotes(n)
    })
    return () => {
      live = false
    }
  }, [language])

  const index = useMemo(() => {
    if (!pack) return pack
    return buildIndex(pack, language, vocabulary)
  }, [pack, language, vocabulary])

  /**
   * Changes the learner's notes: shown at once, saved as a change to what is stored (a sync may
   * have merged words in while the screen was open), then the stored result is shown.
   */
  const updateNotes = (change: (n: DictionaryNotes) => DictionaryNotes) => {
    notesRef.current = change(notesRef.current)
    setNotes(notesRef.current)
    void db.updateDictionaryNotes(language, change).then((stored) => {
      notesRef.current = stored
      setNotes(stored)
    })
  }

  const result = useMemo(() => (index ? search(index, query) : { similar: [], fromTurkish: [] }), [index, query])
  const typed = query.trim()
  const exactWord = result.exact?.word
  const own = typed ? ownEntry(vocabulary, exactWord ?? typed, language) : undefined
  const saved = useMemo(() => findAdded(notes, typed, language), [notes, typed, language])
  const savedExact = result.exact ? undefined : saved.find((e) => e.exact)
  const savedOthers = saved.filter((e) => e !== savedExact)
  const savedCard = savedExact ? (
    <SavedCard
      key={savedExact.word}
      language={language}
      word={savedExact.word}
      meanings={savedExact.t}
      from={notes.added?.[savedExact.word]?.from}
      own={own}
      onOpenWord={onOpenWord}
      onAdd={onAdd}
      onRemove={() => updateNotes((n) => removeEntry(n, savedExact.word))}
    />
  ) : null
  const save = (word: string, meanings: string[], from: 'deepl' | 'own') => updateNotes((n) => addEntry(n, word, meanings, new Date().toISOString(), from, language))

  // A word whose card stays up a moment was really looked up (not just passed while typing): once a visit.
  const counted = useRef(new Set<string>())
  useEffect(() => {
    if (!exactWord || counted.current.has(exactWord)) return
    const t = setTimeout(() => {
      counted.current.add(exactWord)
      updateNotes((n) => noteLookup(n, exactWord, new Date().toISOString()))
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exactWord])

  /** Look a word up, as if typed, and remember it. */
  const pick = (word: string) => {
    setQuery(word)
    setRecent(saveRecent(language, word))
  }

  return (
    <div>
      <section className="section stack">
        <PageHeader title="Sözlük" sub={`${LANGUAGE_NAME[language]} bir kelime ya da Türkçe karşılığını yaz; listende olmasa da bulur.`} />
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const first = exactWord ?? result.similar[0]?.word ?? result.fromTurkish[0]?.word
            if (first) pick(first)
          }}
        >
          <SearchIcon size={18} />
          <input
            type="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            className="input"
            lang={language}
            placeholder={language === 'fr' ? 'maison, décider… ya da “ev”' : language === 'es' ? 'casa, decidir… ya da “ev”' : 'house, decide… ya da “ev”'}
            aria-label="Sözlükte ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div aria-live="polite">
          {index === undefined && <p className="small muted">Sözlük açılıyor…</p>}
          {index === null && <p className="small muted">Sözlük henüz bu cihaza inmedi; internete bağlanınca bir kez iner, sonra internetsiz de çalışır.</p>}
        </div>
      </section>

      {!typed && Object.keys(notes.added ?? {}).length > 0 && (
        <SavedList
          language={language}
          list={Object.entries(notes.added ?? {}).map(([word, e]) => ({ word, t: e.t, exact: false }))}
          onPick={pick}
          onRemove={(w) => updateNotes((n) => removeEntry(n, w))}
        />
      )}

      {!typed && recent.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Son baktıkların</h2>
          <div className="choice-row" role="group" aria-label="Son baktıkların">
            {recent.map((w) => (
              <button key={w} type="button" className="chip chip-sm" lang={language} onClick={() => pick(w)}>
                {w}
              </button>
            ))}
          </div>
        </section>
      )}

      {typed && !index && (savedCard || savedOthers.length > 0) && (
        <>
          {savedCard}
          {savedOthers.length > 0 && <SavedList language={language} list={savedOthers} onPick={pick} onRemove={(w) => updateNotes((n) => removeEntry(n, w))} />}
        </>
      )}

      {typed && index && (
        <>
          {result.exact ? (
            <WordCard
              key={result.exact.word}
              form={result.form}
              alsoFormOf={result.alsoFormOf}
              language={language}
              word={result.exact.word}
              rec={result.exact.rec}
              rank={result.exact.rank}
              own={own}
              fix={notes.fixes[result.exact.word]?.t}
              onFix={(meanings) => updateNotes((n) => setFix(n, result.exact!.word, meanings, new Date().toISOString()))}
              onOpenWord={onOpenWord}
              onAdd={(written, meaning) => {
                setRecent(saveRecent(language, result.exact!.word))
                onAdd(written, meaning)
              }}
              onOpenLab={onOpenLab}
              onPick={pick}
              onSwitchLanguage={onSwitchLanguage}
            />
          ) : savedCard ?? (
            <NotFound
              key={typed}
              language={language}
              word={typed}
              own={own}
              onOpenWord={onOpenWord}
              onAdd={onAdd}
              onSave={save}
              deeplOn={deeplOn}
              hasOthers={result.fromTurkish.length > 0}
              hasSimilar={result.similar.length > 0}
            />
          )}

          {savedOthers.length > 0 && <SavedList language={language} list={savedOthers} onPick={pick} onRemove={(w) => updateNotes((n) => removeEntry(n, w))} />}

          {result.fromTurkish.length > 0 && (
            <section className="section stack">
              <h2 className="section-title">Türkçesi “{result.turkishAs ?? typed}” olanlar</h2>
              {result.turkishAs && (
                <p className="small muted">
                  “{typed}” → {result.turkishAs}
                </p>
              )}
              <ul className="word-list">
                {result.fromTurkish.map((h) => (
                  <li key={h.word}>
                    <button type="button" className="word-row" onClick={() => pick(h.word)}>
                      <span className="word-row-text">
                        <span className="w" lang={language}>
                          {h.word}
                          {h.isOwn && (
                            <span className="pill stage-5 dict-own">Kelimelerinde</span>
                          )}
                        </span>
                        <span className="meta">{h.rec.t?.join(', ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.similar.length > 0 && (
            <section className="section stack">
              <h2 className="section-title">Böyle başlayanlar</h2>
              <div className="choice-row" role="group" aria-label="Böyle başlayan kelimeler">
                {result.similar.map((h) => (
                  <button key={h.word} type="button" className="chip chip-sm" lang={language} onClick={() => pick(h.word)} title={h.rec.t?.join(', ')}>
                    {h.word}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {index && (
        <section className="section">
          <p className="small muted">
            Kaynak: <a href="https://en.wiktionary.org" target="_blank" rel="noreferrer">Vikisözlük</a> (CC BY-SA), her dilde en sık 14–27 bin kelime. Türkçe karşılıklar Türkçe Vikisözlük’ten ve İngilizce üzerinden gelir; emin olmadığında Vikisözlük sayfasına bak ya da “Anlamı düzelt”.
            {vocabulary.filter((v) => v.language === language).length > 0 && (
              <> Metin okurken ve toplu aktarımla eklediğin <strong>{vocabulary.filter((v) => v.language === language).length} kişisel kelime</strong> de bu sözlükte aranır.</>
            )}
          </p>
        </section>
      )}
    </div>
  )
}

/** The pack's word: the word-page header, made for a word that may not be in the list. */
function WordCard({
  language,
  form,
  alsoFormOf,
  word,
  rec,
  rank,
  own,
  fix,
  onFix,
  onOpenWord,
  onAdd,
  onOpenLab,
  onPick,
  onSwitchLanguage,
}: {
  language: TargetLanguage
  word: string
  rec: NonNullable<ReturnType<typeof search>['exact']>['rec']
  rank: number
  own?: VocabularyEntry
  /** The learner's own meanings of the word, shown in place of the pack's. */
  fix?: string[]
  /** Saves the learner's meanings; none goes back to the pack's. */
  onFix: (meanings: string[]) => void
  onOpenWord: (id: string) => void
  /** What was typed, when it is an inflected form of the word. */
  form?: string
  /** The word this one is also a form of (allons: aller). */
  alsoFormOf?: string
  /** `written`: the word as the add form wants it (a French noun with its article when the gender is known). */
  onAdd: (written: string, meaning: string) => void
  onOpenLab?: (verb: string) => void
  onPick: (word: string) => void
  onSwitchLanguage?: (lang: TargetLanguage, query?: string) => void
}) {
  const [lexicon, setLexicon] = useState<LexiconEntry | undefined>()
  const [isVerb, setIsVerb] = useState(false)
  useEffect(() => {
    let live = true
    if (language === 'fr') void loadLexicon('fr').then((lx) => live && setLexicon(lookUpLexicon(lx, word, 'fr')))
    if (language !== 'en' && onOpenLab) void loadTenses(language).then(() => live && setIsVerb(labTensesOf({ language, lemma: word, partOfSpeech: 'verb' }).length > 0))
    return () => {
      live = false
    }
  }, [word, language, onOpenLab])

  const packMeanings = rec.t ?? []
  const meanings = fix ?? packMeanings
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // The pack's part of speech and gender (any language), Lexique's for French words the pack lacks them for.
  const pos = (rec.p && POS_CODE[rec.p]) || lexicon?.pos[0]
  const gender = pos === 'noun' ? (genderOfCode(rec.g) ?? lexicon?.gender) : undefined
  // French only: Spanish feminine nouns starting with a stressed a- take "el" (el agua), which the pack can't tell.
  const written = language === 'fr' && (gender === 'm' || gender === 'f') ? (/^[aeiouyéèêàâîôûh]/i.test(word) ? `l'${word}` : `${gender === 'f' ? 'la' : 'le'} ${word}`) : word
  const others = TARGET_LANGUAGES.filter((l) => l !== language && rec.x?.[l]?.length)
  const play = () => {
    if (!rec.a) return speak(word, language)
    void unlockedAudio(rec.a)
      .then((a) => a.play())
      .catch(() => speak(word, language))
  }

  return (
    <>
      <section className="section word-hero" aria-label={`${word} sözlükte`}>
        <div className="word-hero-main">
          <ul className="chip-list" aria-label="Kelime bilgisi">
            {form && (
              <li>
                “<span lang={language}>{form}</span>” biçiminden
              </li>
            )}
            {pos && (
              <li className="pos-chip">
                <PosTag pos={pos} label />
              </li>
            )}
            {gender && <li>{gender === 'f' ? 'dişil' : gender === 'm' ? 'eril' : 'eril ya da dişil'}</li>}
            <LevelChip language={language} lemma={word} rank={rank} />
            <TrapChip language={language} lemma={word} />
            <CollocationChip language={language} lemma={word} />
          </ul>
          <div className="word-hero-title">
            <h2 className="word" style={{ '--len': written.length } as CSSProperties} lang={language}>
              {written}
            </h2>
            <button className="speak" onClick={play} aria-label={rec.a ? 'Ana dili konuşan birinden dinle' : 'Sesli dinle'}>
              <SpeakerIcon size={20} />
            </button>
          </div>
          {rec.i && <span className="ipa">{rec.i}</span>}
          {editing ? (
            <form
              className="stack gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                onFix(parseMeanings(draft))
                setEditing(false)
              }}
            >
              <label className="small" htmlFor="dict-fix">
                Türkçe anlamları (virgülle ayır)
              </label>
              <input id="dict-fix" className="input" lang="tr" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="row">
                <button type="submit" className="btn btn-sm">
                  Kaydet
                </button>
                <button type="button" className="btn btn-sm btn-quiet" onClick={() => setEditing(false)}>
                  Vazgeç
                </button>
                {fix && (
                  <button
                    type="button"
                    className="link small"
                    onClick={() => {
                      onFix([])
                      setEditing(false)
                    }}
                  >
                    Paketteki anlama dön
                  </button>
                )}
              </div>
            </form>
          ) : (
            <>
              {meanings.length > 0 ? <p className="gloss">{meanings.join(', ')}</p> : <p className="gloss muted">Türkçe karşılığı pakette yok.</p>}
              <p className="small">
                {fix && <span className="muted">Senin düzeltmen{packMeanings.length > 0 && <> · paketteki: {packMeanings.join(', ')}</>} · </span>}
                <button
                  type="button"
                  className="link small"
                  onClick={() => {
                    setDraft(meanings.join(', '))
                    setEditing(true)
                  }}
                >
                  <PenIcon size={14} className="inline-icon" /> {meanings.length ? 'Anlamı düzelt' : 'Kendi anlamını ekle'}
                </button>
              </p>
            </>
          )}
          {alsoFormOf && (
            <p className="small">
              Aynı zamanda{' '}
              <button type="button" className="link small" lang={language} onClick={() => onPick(alsoFormOf)}>
                {alsoFormOf}
              </button>{' '}
              kelimesinin çekimli biçimi.
            </p>
          )}
        </div>
        <div className="word-hero-actions">
          {own ? (
            <button className="btn btn-sm btn-quiet" onClick={() => onOpenWord(own.id)}>
              <CheckIcon size={15} /> Kelimelerinde: aç
            </button>
          ) : (
            <button className="btn btn-sm" onClick={() => onAdd(written, meanings.slice(0, 2).join(', '))}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
          )}
          {isVerb && onOpenLab && (
            <button className="btn btn-sm btn-quiet" onClick={() => onOpenLab(word)}>
              <ConjugationsIcon size={15} /> Çekimleri
            </button>
          )}
        </div>
        {others.length > 0 && (
          <dl className="word-hero-status">
            {others.map((l) => (
              <div key={l}>
                <dt>{LANGUAGE_NAME[l]}</dt>
                <dd lang={l}>
                  <div className="choice-row dict-x-words">
                    {rec.x![l]!.slice(0, 3).map((w) => (
                      <button
                        key={w}
                        type="button"
                        className="chip chip-sm"
                        onClick={() => (onSwitchLanguage ? onSwitchLanguage(l, w) : onPick(w))}
                        title={`${LANGUAGE_NAME[l]} sözlüğünde aç: ${w}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <DictionaryExamples
        language={language}
        word={word}
        bundled={rec.c}
        meaning={meanings.join(', ')}
        onPick={onPick}
      />

      {(rec.e || rec.s?.length || rec.n?.length) && (
        <section className="section stack">
          {rec.e && (
            <div className="stack gap-2">
              <h3 className="section-title">Kökeni</h3>
              <p className="small">{rec.e}</p>
            </div>
          )}
          {!!rec.s?.length && <Related title="Eş anlamlılar" words={rec.s} language={language} onPick={onPick} />}
          {!!rec.n?.length && <Related title="Zıt anlamlılar" words={rec.n} language={language} onPick={onPick} />}
          <p className="small">
            <a href={wiktionaryUrl(word, language)} target="_blank" rel="noreferrer">
              <BookIcon size={14} className="inline-icon" />
              Vikisözlük'te tam sayfa
            </a>
          </p>
        </section>
      )}
    </>
  )
}

function Related({ title, words, language, onPick }: { title: string; words: string[]; language: TargetLanguage; onPick: (w: string) => void }) {
  return (
    <div className="stack gap-2">
      <h3 className="section-title">{title}</h3>
      <div className="choice-row" role="group" aria-label={title}>
        {words.map((w) => (
          <button key={w} type="button" className="chip chip-sm" lang={language} onClick={() => onPick(w)}>
            {w}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Not in the pack: the learner's own word if it is one, the AI if there is a key, Wiktionary otherwise. */
function NotFound({
  language,
  word,
  own,
  onOpenWord,
  onAdd,
  onSave,
  deeplOn,
  hasOthers,
  hasSimilar,
}: {
  language: TargetLanguage
  word: string
  own?: VocabularyEntry
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  /** Keeps the word in the dictionary for good (not in the study list). */
  onSave: (word: string, meanings: string[], from: 'deepl' | 'own') => void
  /** Whether the server can translate (asked once by the screen, not on every letter typed). */
  deeplOn: boolean
  /** Matches of the Turkish typed, or saved words: they are listed below and make the card unnecessary. */
  hasOthers: boolean
  /** Pack words that start like the query: listed below, but the word itself is still missing (it can be saved). */
  hasSimilar?: boolean
}) {
  const { apiKey } = useAi()
  const [ai, setAi] = useState<{ lemma: string; meanings: string[] } | null>(null)
  const [customMeaning, setCustomMeaning] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // DeepL (through the app's server): offered when it is there; its answer is a guess for one word, so it is shown as such.
  const [deepl, setDeepl] = useState<string | null>(null)

  if (own) {
    return (
      <section className="section card stack">
        <p>
          <strong lang={language}>{own.lemma}</strong> sözlük paketinde yok ama listende: {own.senses[0].gloss}
        </p>
        <div>
          <button className="btn btn-sm btn-quiet" onClick={() => onOpenWord(own.id)}>
            <CheckIcon size={15} /> Kelime sayfasını aç
          </button>
        </div>
      </section>
    )
  }

  // A Turkish word with matches below needs no "not found" card above them.
  if (hasOthers && !ai && deepl === null) return null

  const askDeepl = async () => {
    setBusy(true)
    setError('')
    try {
      const out = (await translate(word, language, 'tr')).trim()
      if (!out || normalize(out) === normalize(word)) setError('DeepL bu kelime için bir karşılık bulamadı.')
      else setDeepl(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Çeviri şu an alınamadı.')
    } finally {
      setBusy(false)
    }
  }

  const askAi = async () => {
    if (!apiKey) return
    setBusy(true)
    setError('')
    try {
      const found = await enrichWords(apiKey, language, [{ word }])
      const info = found.get(word.toLocaleLowerCase()) ?? [...found.values()][0]
      if (info) setAi({ lemma: info.lemma, meanings: info.meanings })
      else setError('YZ bu kelimeyi tanımadı.')
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'YZ şu an cevap vermedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section card stack">
      {deepl !== null && !ai ? (
        <>
          <p>
            <strong lang={language}>{word}</strong>: {deepl} <span className="small muted">(DeepL)</span>
          </p>
          <p className="small muted">Tek kelimede çeviri yanılabilir. “Sözlüğe kaydet” kelimeyi sözlükte hep bulunsun diye saklar (çalışma listene girmez); “Kelimelerime ekle” onu çalışma kartı yapar. Yanlışsa anlamı düzeltip kaydet.</p>
          <input type="text" className="input" placeholder={deepl} value={customMeaning} onChange={(e) => setCustomMeaning(e.target.value)} aria-label="Türkçe anlamı" />
          <div className="row gap-xs">
            <button type="button" className="btn btn-sm" onClick={() => onSave(word, parseMeanings(customMeaning.trim() || deepl), customMeaning.trim() ? 'own' : 'deepl')}>
              <BookIcon size={15} /> Sözlüğe kaydet
            </button>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => onAdd(word, (customMeaning.trim() || deepl).trim())}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
          </div>
        </>
      ) : ai ? (
        <>
          <p>
            <strong lang={language}>{ai.lemma}</strong>: {ai.meanings.join(', ')} <span className="small muted">(YZ)</span>
          </p>
          <div>
            <button className="btn btn-sm" onClick={() => onAdd(ai.lemma, ai.meanings.slice(0, 2).join(', '))}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            “<span lang={language}>{word}</span>” sözlük paketinde veya kelimelerinde henüz yok{hasSimilar ? ' (benzerleri aşağıda)' : ''}. Anlamını biliyorsan yazıp kaydedebilirsin:
          </p>
          <form
            className="row gap-xs"
            onSubmit={(e) => {
              e.preventDefault()
              const m = customMeaning.trim()
              if (m) {
                onAdd(word, m)
                setCustomMeaning('')
              }
            }}
          >
            <input
              type="text"
              className="input"
              placeholder="Türkçe anlamını yaz…"
              value={customMeaning}
              onChange={(e) => setCustomMeaning(e.target.value)}
              aria-label="Türkçe anlamı"
            />
            <button type="submit" className="btn btn-sm" disabled={!customMeaning.trim()}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              disabled={!customMeaning.trim()}
              onClick={() => {
                onSave(word, parseMeanings(customMeaning), 'own')
                setCustomMeaning('')
              }}
            >
              <BookIcon size={15} /> Sözlüğe kaydet
            </button>
          </form>
          <div className="row gap-xs">
            {deeplOn && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={askDeepl} disabled={busy}>
                <WandIcon size={15} /> {busy ? 'Soruluyor…' : 'DeepL ile çevir'}
              </button>
            )}
            {apiKey && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={askAi} disabled={busy}>
                <WandIcon size={15} /> {busy ? 'Soruluyor…' : 'YZ ile anlamını bul'}
              </button>
            )}
            <a className="btn btn-sm btn-quiet" href={wiktionaryUrl(word, language)} target="_blank" rel="noreferrer">
              <BookIcon size={15} /> Vikisözlük'te ara
            </a>
          </div>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  )
}

/** A word the learner saved to the dictionary (the pack lacks it): its meanings, and what can be done with it. */
function SavedCard({
  language,
  word,
  meanings,
  from,
  own,
  onOpenWord,
  onAdd,
  onRemove,
}: {
  language: TargetLanguage
  word: string
  meanings: string[]
  from?: 'deepl' | 'own'
  own?: VocabularyEntry
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  onRemove: () => void
}) {
  return (
    <section className="section card stack" aria-label="Kaydettiğin kelime">
      <p>
        <strong lang={language}>{word}</strong>: {meanings.join(', ')} <span className="small muted">({from === 'deepl' ? 'DeepL, sen kaydettin' : 'sen kaydettin'})</span>
      </p>
      <div className="row gap-xs">
        {own ? (
          <button className="btn btn-sm btn-quiet" onClick={() => onOpenWord(own.id)}>
            <CheckIcon size={15} /> Kelime sayfasını aç
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => onAdd(word, meanings.slice(0, 2).join(', '))}>
            <PlusIcon size={15} /> Kelimelerime ekle
          </button>
        )}
        <button className="btn btn-sm btn-quiet" onClick={onRemove}>
          Sözlükten kaldır
        </button>
      </div>
    </section>
  )
}

/** The saved words (all of them, or those matching the query), each one tap from its card. */
function SavedList({ language, list, onPick, onRemove }: { language: TargetLanguage; list: { word: string; t: string[] }[]; onPick: (word: string) => void; onRemove: (word: string) => void }) {
  return (
    <section className="section stack">
      <h2 className="section-title">Kaydettiklerin</h2>
      <ul className="word-list">
        {list.map((e) => (
          <li key={e.word}>
            <div className="row gap-xs">
              <button type="button" className="word-row" onClick={() => onPick(e.word)}>
                <span className="word-row-text">
                  <span className="w" lang={language}>
                    {e.word}
                  </span>
                  <span className="meta">{e.t.join(', ')}</span>
                </span>
              </button>
              <button type="button" className="icon-btn icon-btn-sm" aria-label={`${e.word} sözlükten kaldır`} onClick={() => onRemove(e.word)}>
                <CloseIcon size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
