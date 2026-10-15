import { useEffect, useState, type CSSProperties } from 'react'
import { search, wiktionaryUrl } from '../data/dictionary'
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
import { BookIcon, CheckIcon, ConjugationsIcon, PenIcon, PlusIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { DictionaryExamples } from './DictionaryExamples'
import { sentencesNow } from './dictSentences'
import { PosTag } from './PosTag'
import { speak, unlockedAudio } from './speech'

export function WordCard({
  language,
  form,
  formNote,
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
  /** Which form it is (presente, yo), when the verb tables said. */
  formNote?: string
  /** The word this one is also a form of (allons: aller). */
  alsoFormOf?: string
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
  const etymology = cleanEtymology(rec.e)
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
            <button
              className="btn btn-sm"
              onClick={() => onAdd(written, meanings.slice(0, 2).join(', '), { pos, gender: gender === 'm' || gender === 'f' ? gender : undefined, examples: sentencesNow(language, word, rec.c) })}
            >
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

      {(etymology || rec.s?.length || rec.n?.length) && (
        <section className="section stack">
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
