import { useEffect, useMemo, useState } from 'react'
import { AiError, suggestFields } from '../ai'
import { fetchCorpus } from '../data/corpus'
import { cleanToken, WORD_SOURCE } from '../engine/extract'
import { TARGET_LANGUAGES, type Example, type TargetLanguage } from '../engine/types'
import { useAi } from './aiContext'
import { WandIcon, SpeakerIcon } from './icons'
import { LANGUAGE_SHORT } from './labels'
import { usePatterns } from './usePatterns'
import { LinesSkeleton } from './Skeleton'
import { canSpeak, speak } from './speech'

/** Fetched once per word and kept on the device for a month, so a word looked up before works offline. */
const KEY = (language: TargetLanguage, word: string) => `kelime-koc:dict-sentences:${language}:${word}`
const MAX_AGE = 30 * 86_400_000
const SHOWN = 4

import { examplesFromPack } from '../data/wordpack'
import type { PackRecord } from '../data/wordpackBuild'

/** Sentences in the word pack (the most frequent words): shown at once and offline. */
const fromPack = (bundled: PackRecord['c'] | undefined): Example[] | undefined =>
  examplesFromPack(bundled)

function useSentences(language: TargetLanguage, word: string, bundled?: PackRecord['c']): Example[] | null | 'loading' {
  const [value, setValue] = useState<Example[] | null | 'loading'>(() => fromPack(bundled) ?? 'loading')
  useEffect(() => {
    let live = true
    const packed = fromPack(bundled)
    try {
      const cached = JSON.parse(localStorage.getItem(KEY(language, word)) ?? 'null') as { at: number; examples: Example[] } | null
      if (cached && Date.now() - cached.at < MAX_AGE) {
        setValue(cached.examples)
        return
      }
    } catch {
      // Unreadable cache: fetch again.
    }
    // The pack's sentences stand until Tatoeba's arrive (with sound and the other languages); offline they stay.
    setValue(packed ?? 'loading')
    fetchCorpus({ language, lemma: word })
      .then((found) => {
        // The ones with a Turkish translation first: they say what the word means in use.
        const examples = [...found.filter((x) => x.translation), ...found.filter((x) => !x.translation)].slice(0, SHOWN)
        if (!live) return
        // Nothing from Tatoeba for it now: the pack's sentences stay.
        if (!examples.length && packed) return setValue(packed)
        setValue(examples)
        try {
          localStorage.setItem(KEY(language, word), JSON.stringify({ at: Date.now(), examples }))
        } catch {
          // Not kept; fine.
        }
      })
      .catch(() => live && setValue(packed ?? null))
    return () => {
      live = false
    }
    // The pack's sentences come with the word; a new word is a new effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, word])
  return value
}

/** Renders sentence tokens as clickable buttons that look up words in the dictionary. */
export function ClickableSentence({
  text,
  language,
  activeWord,
  onPick,
}: {
  text: string
  language: TargetLanguage
  activeWord?: string
  onPick?: (w: string) => void
}) {
  if (!onPick) return <>{text}</>
  const tokens = text.split(new RegExp(`(${WORD_SOURCE})`, 'gu'))
  const normActive = activeWord ? cleanToken(activeWord, language).toLocaleLowerCase(language) : ''

  return (
    <>
      {tokens.map((part, i) => {
        if (!/[\p{L}]/u.test(part)) return <span key={i}>{part}</span>
        const clean = cleanToken(part, language)
        if (!clean) return <span key={i}>{part}</span>
        const isActive = !!normActive && clean.toLocaleLowerCase(language) === normActive
        return (
          <button
            key={i}
            type="button"
            className={`sentence-word-btn${isActive ? ' is-active' : ''}`}
            onClick={() => onPick(clean)}
            title={`Sözlükte bak: ${clean}`}
          >
            {part}
          </button>
        )
      })}
    </>
  )
}

/**
 * The word in use, under its dictionary card: real sentences (with their Turkish and the
 * other languages), clickable words, and the word's most frequent neighbours.
 * Also provides on-demand optional AI sentence generation when requested.
 */
export function DictionaryExamples({
  language,
  word,
  bundled,
  meaning,
  onPick,
}: {
  language: TargetLanguage
  word: string
  bundled?: PackRecord['c']
  meaning?: string
  onPick?: (w: string) => void
}) {
  const sentences = useSentences(language, word, bundled)
  const entry = useMemo(() => ({ language, lemma: word }), [language, word])
  const patterns = usePatterns(entry)
  const { apiKey } = useAi()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [extraExamples, setExtraExamples] = useState<Example[]>([])

  useEffect(() => {
    setExtraExamples([])
    setAiError('')
    setAiLoading(false)
  }, [language, word])

  const allSentences = useMemo(() => {
    const base = Array.isArray(sentences) ? sentences : []
    return [...extraExamples, ...base]
  }, [extraExamples, sentences])

  const hasSentences = allSentences.length > 0
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0

  const askAi = async () => {
    if (!apiKey) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await suggestFields(apiKey, {
        language,
        word,
        meaning: meaning ?? '',
        fields: ['example'],
        existingTags: [],
      })
      if (res.example) {
        const newEx: Example = {
          text: res.example.replace(/\*/g, ''),
          translation: res.exampleTranslation ?? '',
          form: word,
        }
        setExtraExamples((prev) => [newEx, ...prev])
        try {
          const cached = JSON.parse(localStorage.getItem(KEY(language, word)) ?? 'null') as { at: number; examples: Example[] } | null
          const updated = [newEx, ...(cached?.examples ?? [])]
          localStorage.setItem(KEY(language, word), JSON.stringify({ at: Date.now(), examples: updated }))
        } catch {
          // Ignore cache write error
        }
      }
    } catch (err) {
      setAiError(err instanceof AiError ? err.message : 'YZ cümle oluşturamadı.')
    } finally {
      setAiLoading(false)
    }
  }

  if (sentences === 'loading') return <LinesSkeleton lines={2} label="Örnek cümleler getiriliyor" />

  return (
    <>
      {hasSentences ? (
        <section className="section stack">
          <h2 className="section-title">Cümlede</h2>
          <ul className="example-list">
            {allSentences.map((ex) => (
              <li key={ex.text}>
                <div>
                  <p className="sentence" lang={language}>
                    <ClickableSentence text={ex.text} language={language} activeWord={word} onPick={onPick} />
                  </p>
                  {ex.translation && <p className="sentence-tr">{ex.translation}</p>}
                  {TARGET_LANGUAGES.filter((l) => ex.parallel?.[l]).map((l) => (
                    <p key={l} className="sentence-parallel small" lang={l}>
                      <abbr className="parallel-lang" title="Aynı cümle bu dilde">
                        {LANGUAGE_SHORT[l]}
                      </abbr>{' '}
                      {ex.parallel![l]}
                    </p>
                  ))}
                </div>
                {canSpeak() && (
                  <button className="icon-btn" onClick={() => speak(ex.text, language)} aria-label="Cümleyi dinle">
                    <SpeakerIcon size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {apiKey && (
            <div className="row">
              <button type="button" className="btn btn-sm btn-quiet" onClick={askAi} disabled={aiLoading}>
                <WandIcon size={15} /> {aiLoading ? 'Cümle oluşturuluyor…' : 'YZ ile yeni örnek cümle üret'}
              </button>
            </div>
          )}
          {aiError && <p className="error small">{aiError}</p>}
        </section>
      ) : (
        <section className="section stack">
          <h2 className="section-title">Cümlede</h2>
          <div className="card stack">
            <p className="small muted">Bu kelime için kayıtlı örnek cümle bulunamadı.</p>
            {apiKey && (
              <div className="row">
                <button type="button" className="btn btn-sm" onClick={askAi} disabled={aiLoading}>
                  <WandIcon size={15} /> {aiLoading ? 'Cümle oluşturuluyor…' : 'YZ ile örnek cümle üret'}
                </button>
              </div>
            )}
            {aiError && <p className="error small">{aiError}</p>}
          </div>
        </section>
      )}
      {hasPatterns && (
        <section className="section stack">
          <h2 className="section-title">Sık kalıplar</h2>
          <ul className="pattern-list">
            {patterns.map((p) => (
              <li key={p.phrase}>
                <div className="pattern-head">
                  <strong lang={language}>{p.phrase}</strong>
                  <span className="small muted">{p.count} cümlede</span>
                </div>
                <p className="small sentence-sm" lang={language}>
                  {p.example}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {hasSentences && (
        <p className="small muted">
          Kaynak: <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> (CC BY 2.0 FR)
        </p>
      )}
    </>
  )
}
