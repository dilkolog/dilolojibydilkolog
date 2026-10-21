import { useEffect, useState, type CSSProperties } from 'react'
import { fold, search, wiktionaryUrl } from '../data/dictionary'
import { loadLexicon, lookUpLexicon, type LexiconEntry } from '../data/lexicon'
import { loadTenses } from '../data/tenseData'
import { cleanEtymology, genderOfCode, POS_CODE } from '../data/wordpackBuild'
import { parseMeanings } from '../engine/dictionaryNotes'
import { labTensesOf } from '../engine/tenses'
import { verbFormsOf } from '../engine/verbLookup'
import { LevelChip } from './LevelChip'
import { TrapChip } from './TrapChip'
import { CollocationChip } from './CollocationChip'
import { TARGET_LANGUAGES, type Example, type Gender, type PartOfSpeech, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { BookIcon, CheckIcon, ConjugationsIcon, PenIcon, PlusIcon, SpeakerIcon, TagIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { DictionaryExamples } from './DictionaryExamples'
import { sentencesNow } from './dictSentences'
import { PosTag } from './PosTag'
import { speak, unlockedAudio } from './speech'
import { MeaningLookupButtons } from './MeaningLookupButtons'
import { useMeaningLookup } from './useMeaningLookup'

export function WordCard({
  language,
  form,
  formNote,
  alsoFormOf,
  baseOf,
  word,
  rec,
  rank,
  own,
  listOnly,
  fix,
  deeplOn = false,
  targetListName,
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
  /** The word is not in the pack: `rec` is made from the learner's own word (`own`), so its meaning is the word list's. */
  listOnly?: boolean
  /** The learner's own meanings of the word, shown in place of the pack's. */
  fix?: string[]
  /** Whether the server can translate: a word without a Turkish meaning offers DeepL then. */
  deeplOn?: boolean
  /** Name of the list the word will go to when added. */
  targetListName?: string
  /** Saves the learner's meanings; none goes back to the pack's. */
  onFix: (meanings: string[]) => void
  onOpenWord: (id: string) => void
  /** What was typed, when it is an inflected form of the word. */
  form?: string
  /** Which form it is (presente, yo), when the verb tables said. */
  formNote?: string
  /** The word this one is also a form of (allons: aller). */
  alsoFormOf?: string
  /** The word a form without a Turkish meaning belongs to, with that word's meanings (puede: poder). */
  baseOf?: { word: string; t: string[]; note?: string }
  /** `written`: the word as the add form wants it (a French noun with its article when the gender is known); with what the card knows of it. */
  onAdd: (written: string, meaning: string, extra: { pos?: PartOfSpeech; gender?: Gender; examples?: Example[] }) => void
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

  // `rec.t`: the pack's meanings, or the word list's for a word the pack lacks (`listOnly`).
  const packMeanings = (rec.t ?? []).filter((m) => m.trim())
  const meanings = fix ?? packMeanings
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // A meaning DeepL or the AI found: put in the field for the learner to check, never saved by itself.
  const [suggested, setSuggested] = useState<'deepl' | 'ai' | null>(null)
  const lookup = useMeaningLookup(language, word)
  const edit = (text: string, from: 'deepl' | 'ai' | null = null) => {
    setDraft(text)
    setSuggested(from)
    setEditing(true)
  }
  const stopEditing = () => {
    setEditing(false)
    setSuggested(null)
  }
  const askDeepl = async () => {
    const out = await lookup.askDeepl()
    if (out) edit(out, 'deepl')
  }
  const askAi = async () => {
    const found = await lookup.askAi()
    if (found) edit(found.meanings.join(', '), 'ai')
  }
  // DeepL and the AI are offered for a pack word with no Turkish meaning (a word list word is fixed on its own page).
  const canLookUp = !listOnly && !packMeanings.length && (deeplOn || !!lookup.apiKey)
  const lookupButtons = canLookUp && <MeaningLookupButtons deeplOn={deeplOn} aiOn={!!lookup.apiKey} busy={lookup.busy} onDeepl={() => void askDeepl()} onAi={() => void askAi()} />
  // Taking the learner's meaning back: to the pack's, to the word list's, or to none.
  const resetLabel = !packMeanings.length ? 'Anlamımı kaldır' : listOnly ? 'Kelimelerindeki anlama dön' : 'Paketteki anlama dön'
  const reset = () => {
    onFix([])
    stopEditing()
  }
  // The meaning the learner's study card has, when none of it is what the dictionary shows (the card is edited on the word page).
  const ownMeanings = own ? own.senses.flatMap((x) => [x.gloss, ...(x.altGlosses ?? [])]).map((m) => m.trim()).filter(Boolean) : []
  const shown = new Set(meanings.map(fold))
  const ownDiffers = !listOnly && ownMeanings.length > 0 && !ownMeanings.some((m) => shown.has(fold(m)))
  // The pack's part of speech and gender (any language), Lexique's for French words the pack lacks them for.
  const pos = (rec.p && POS_CODE[rec.p]) || lexicon?.pos[0]
  const gender = pos === 'noun' ? (genderOfCode(rec.g) ?? lexicon?.gender) : undefined
  // French only: Spanish feminine nouns starting with a stressed a- take "el" (el agua), which the pack can't tell.
  const written = language === 'fr' && (gender === 'm' || gender === 'f') ? (/^[aeiouyéèêàâîôûh]/i.test(word) ? `l'${word}` : `${gender === 'f' ? 'la' : 'le'} ${word}`) : word
  const others = TARGET_LANGUAGES.filter((l) => l !== language && rec.x?.[l]?.length)
  const etymology = cleanEtymology(rec.e)
  const play = () => {
    if (!rec.a) return speak(word, language)
    void unlockedAudio(rec.a)
      .then((a) => a.play())
      .catch(() => speak(word, language))
  }

  return (
    <>
      <section className="section word-hero dict-hero" aria-label={`${word} sözlükte`}>
        <div className="word-hero-main">
          <ul className="chip-list" aria-label="Kelime bilgisi">
            {form && (
              <li>
                “<span lang={language}>{form}</span>” biçiminden{formNote && <span className="muted"> · {formNote}</span>}
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
              className="stack gap-2 dict-fix-form"
              onSubmit={(e) => {
                e.preventDefault()
                onFix(parseMeanings(draft))
                stopEditing()
              }}
            >
              <label className="small" htmlFor="dict-fix">
                <strong>Kendi Türkçe anlamın veya hafıza notun</strong>
                <span className="muted block">
                  Birden çok anlamı virgülle ayırabilirsin. Sözlükte bu anlam görünür; kelimeyi buradan eklersen kartı da bu anlamla kurulur.
                  {own && ' Kelimelerindeki kartın anlamını kelime sayfasında düzeltirsin.'}
                  {fix && ' Kutuyu boşaltıp kaydetmek de anlamını kaldırır.'}
                </span>
              </label>
              {suggested && (
                <p className="small muted">
                  {suggested === 'deepl' ? 'DeepL' : 'YZ'} önerisi: tek kelimede yanılabilir, kontrol edip kaydet.
                </p>
              )}
              <input
                id="dict-fix"
                className="input"
                lang="tr"
                autoFocus
                placeholder={packMeanings.join(', ') || 'Kendi anlamını yaz…'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="row wrap gap-2">
                <button type="submit" className="btn btn-sm">
                  Kaydet
                </button>
                <button type="button" className="btn btn-sm btn-quiet" onClick={stopEditing}>
                  Vazgeç
                </button>
                {lookupButtons}
                {fix && (
                  <button type="button" className="link small" onClick={reset}>
                    {resetLabel}
                  </button>
                )}
              </div>
              {lookup.error && <p className="error small">{lookup.error}</p>}
            </form>
          ) : (
            <div className="dict-meaning-box">
              <div className="dict-meaning-head">
                {meanings.length > 0 ? (
                  <p className="gloss">{meanings.join(', ')}</p>
                ) : baseOf ? (
                  <p className="gloss dict-base-of">
                    <span className="muted" aria-hidden="true">
                      ←{' '}
                    </span>
                    <button type="button" className="link" lang={language} onClick={() => onPick(baseOf.word)} title={`${baseOf.word} kelimesini aç`}>
                      {baseOf.word}
                    </button>
                    : {baseOf.t.slice(0, 4).join(', ')}
                  </p>
                ) : (
                  <p className="gloss muted">{listOnly ? 'Kelimelerinde Türkçe anlamı yok.' : 'Türkçe karşılığı pakette yok.'}</p>
                )}
                {listOnly && own && !fix ? (
                  <button
                    type="button"
                    className="chip chip-sm dict-fix-btn"
                    onClick={() => onOpenWord(own.id)}
                    title="Bu kelimenin anlamı kelimelerindeki kartından geliyor: kelime sayfasında düzelt"
                  >
                    <PenIcon size={13} className="inline-icon" /> Kelime sayfasında düzelt
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chip chip-sm dict-fix-btn"
                    onClick={() => edit(meanings.join(', '))}
                    aria-label={fix ? 'Kendi anlamını düzenle' : 'Kendi anlamını veya notunu ekle'}
                    title="Bu kelimeye kendi Türkçe karşılığını veya hafıza notunu belirle"
                  >
                    <PenIcon size={13} className="inline-icon" /> {meanings.length ? 'Anlamı düzelt' : 'Kendi anlamını ekle'}
                  </button>
                )}
              </div>
              {!meanings.length && baseOf && (
                <p className="small muted">
                  “<span lang={language}>{word}</span>”, <span lang={language}>{baseOf.word}</span> kelimesinin bir biçimi{baseOf.note ? ` (${baseOf.note})` : ''}; kendi Türkçe karşılığı pakette yok.
                </p>
              )}
              {!meanings.length && !baseOf && lookupButtons && <div className="row wrap gap-2">{lookupButtons}</div>}
              {lookup.error && <p className="error small">{lookup.error}</p>}
              {fix && (
                <div className="dict-fix-meta small">
                  <span className="chip chip-sm dict-custom-badge">✏️ Senin anlamın</span>
                  {packMeanings.length > 0 && (
                    <span className="muted">
                      {listOnly ? 'Kelimelerinde' : 'Pakette'}: {packMeanings.join(', ')}
                    </span>
                  )}
                  <button type="button" className="link small" onClick={reset}>
                    {resetLabel}
                  </button>
                </div>
              )}
              {listOnly && own && !fix && <p className="small muted">Bu kelime sözlük paketinde yok; anlamı kelimelerindeki kartından geliyor.</p>}
              {ownDiffers && own && (
                <p className="small">
                  <span className="muted">Kelimelerindeki kartta:</span> {ownMeanings.join(', ')} ·{' '}
                  <button type="button" className="link small" onClick={() => onOpenWord(own.id)}>
                    Kelime sayfasında düzelt
                  </button>
                </p>
              )}
              {own?.notes && (
                <div className="dict-own-note note note-soft small">
                  💡 <strong>Hafıza ipucun:</strong> {own.notes}
                </div>
              )}
            </div>
          )}
          {alsoFormOf && alsoFormOf !== baseOf?.word && (
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
            <div className="word-hero-add-wrap">
              <button
                className="btn btn-sm"
                onClick={() => onAdd(written, meanings.slice(0, 2).join(', '), { pos, gender: gender === 'm' || gender === 'f' ? gender : undefined, examples: sentencesNow(language, word, rec.c) })}
              >
                <PlusIcon size={15} /> Kelimelerime ekle
              </button>
              {targetListName && (
                <span className="word-hero-target-tag" title={`Bu kelime “${targetListName}” listesine eklenecek`}>
                  <TagIcon size={12} className="inline-icon" />
                  {targetListName}
                </span>
              )}
            </div>
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

      <div className="dict-below">
      <div className="dict-below-main">
        <DictionaryExamples
          language={language}
          word={word}
          bundled={rec.c}
          meaning={meanings.join(', ')}
          onPick={onPick}
        />
      </div>

      {(etymology || rec.s?.length || rec.n?.length) && (
        <section className="section stack dict-below-side">
          {etymology && (
            <div className="stack gap-2">
              <h3 className="section-title">Kökeni</h3>
              <p className="small">{etymology}</p>
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
      </div>
    </>
  )
}

export function Related({ title, words, language, onPick }: { title: string; words: string[]; language: TargetLanguage; onPick: (w: string) => void }) {
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
/**
 * A word missing here that is a conjugated form in the other language learned ("renuncio" typed on
 * the French dictionary): says so, with the verb, so the search is one language switch away.
 */
export function OtherLanguageVerb({ language, word }: { language: TargetLanguage; word: string }) {
  const [found, setFound] = useState<{ language: 'fr' | 'es'; lemma: string; note: string } | null>(null)
  useEffect(() => {
    let live = true
    setFound(null)
    const others = (['fr', 'es'] as const).filter((l) => l !== language)
    void Promise.all(others.map((l) => loadTenses(l))).then(() => {
      if (!live) return
      for (const l of others) {
        const [v] = verbFormsOf(l, word)
        if (v) return setFound({ language: l, ...v })
      }
    })
    return () => {
      live = false
    }
  }, [language, word])
  if (!found) return null
  return (
    <p className="note">
      “<span lang={found.language}>{word}</span>” {LANGUAGE_NAME[found.language]} <strong lang={found.language}>{found.lemma}</strong> fiilinin çekimine benziyor ({found.note}). Üstten {LANGUAGE_NAME[found.language]}’yı seçip arayabilirsin.
    </p>
  )
}
