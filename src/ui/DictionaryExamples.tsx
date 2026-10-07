import { useEffect, useMemo, useState } from 'react'
import { fetchCorpus } from '../data/corpus'
import { TARGET_LANGUAGES, type Example, type TargetLanguage } from '../engine/types'
import { SpeakerIcon } from './icons'
import { LANGUAGE_SHORT } from './labels'
import { usePatterns } from './usePatterns'
import { LinesSkeleton } from './Skeleton'
import { canSpeak, speak } from './speech'

/** Fetched once per word and kept on the device for a month, so a word looked up before works offline. */
const KEY = (language: TargetLanguage, word: string) => `kelime-koc:dict-sentences:${language}:${word}`
const MAX_AGE = 30 * 86_400_000
const SHOWN = 4

function useSentences(language: TargetLanguage, word: string): Example[] | null | 'loading' {
  const [value, setValue] = useState<Example[] | null | 'loading'>('loading')
  useEffect(() => {
    let live = true
    try {
      const cached = JSON.parse(localStorage.getItem(KEY(language, word)) ?? 'null') as { at: number; examples: Example[] } | null
      if (cached && Date.now() - cached.at < MAX_AGE) {
        setValue(cached.examples)
        return
      }
    } catch {
      // Unreadable cache: fetch again.
    }
    setValue('loading')
    fetchCorpus({ language, lemma: word })
      .then((found) => {
        // The ones with a Turkish translation first: they say what the word means in use.
        const examples = [...found.filter((x) => x.translation), ...found.filter((x) => !x.translation)].slice(0, SHOWN)
        if (!live) return
        setValue(examples)
        try {
          localStorage.setItem(KEY(language, word), JSON.stringify({ at: Date.now(), examples }))
        } catch {
          // Not kept; fine.
        }
      })
      .catch(() => live && setValue(null))
    return () => {
      live = false
    }
  }, [language, word])
  return value
}

/**
 * The word in use, under its dictionary card: a few real sentences (with their Turkish and the
 * other languages) and the word's most frequent neighbours. Read-only: adding them is for words in the list.
 */
export function DictionaryExamples({ language, word }: { language: TargetLanguage; word: string }) {
  const sentences = useSentences(language, word)
  const entry = useMemo(() => ({ language, lemma: word }), [language, word])
  const patterns = usePatterns(entry)
  const hasSentences = Array.isArray(sentences) && sentences.length > 0
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0
  if (sentences === 'loading') return <LinesSkeleton lines={2} label="Örnek cümleler getiriliyor" />
  if (!hasSentences && !hasPatterns) return null
  return (
    <>
      {hasSentences && (
        <section className="section stack">
          <h2 className="section-title">Cümlede</h2>
          <ul className="example-list">
            {sentences.map((ex) => (
              <li key={ex.text}>
                <div>
                  <p className="sentence" lang={language}>
                    {ex.text}
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
      <p className="small muted">
        Kaynak: <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> (CC BY 2.0 FR)
      </p>
    </>
  )
}
