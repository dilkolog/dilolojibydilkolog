import { useState } from 'react'
import type { VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { addExample, MAX_EXAMPLES, removeExample, WordInputError } from '../data/wordInput'
import { AiError, suggestFields } from '../ai'
import { useAi } from './aiContext'
import { SparkleIcon, SpeakerIcon } from './icons'
import { ShadowButton } from './Shadow'
import { canSpeak, speak, speechPrefs } from './speech'

/**
 * A word's example sentences. Several varied contexts make the word usable beyond one sentence
 * (encoding variability); exercises pick one at random each time.
 */
export function WordExamples({ db, entry, onChanged }: { db: KelimeDB; entry: VocabularyEntry; onChanged: () => void }) {
  const examples = entry.senses[0].examples
  const { apiKey } = useAi()
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // The AI's sentence, to tell it apart from one the learner wrote themselves.
  const [aiText, setAiText] = useState('')

  const save = async (next: VocabularyEntry) => {
    await db.vocabulary.put(next)
    onChanged()
  }

  const add = async () => {
    setError('')
    try {
      await save(addExample(entry, text, translation, text.trim() !== aiText.trim()))
      setText('')
      setTranslation('')
      setAdding(false)
    } catch (e) {
      setError(e instanceof WordInputError ? e.message : 'Cümle eklenemedi.')
    }
  }

  /** The AI writes a sentence in a new context; it lands in the fields for review, not saved directly. */
  const suggest = async () => {
    setError('')
    if (!apiKey) {
      setError('AI önerileri için Ayarlar → AI yardımcısı bölümünden API anahtarını gir.')
      return
    }
    setBusy(true)
    try {
      const out = await suggestFields(apiKey, {
        language: entry.language,
        word: entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma,
        meaning: entry.senses[0].gloss,
        fields: ['example'],
        existingTags: [],
        currentExample: examples.map((e) => e.text).join(' / '),
      })
      setText(out.example ?? '')
      setAiText(out.example ?? '')
      setTranslation(out.exampleTranslation ?? '')
      setAdding(true)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'AI önerisi alınamadı.')
    } finally {
      setBusy(false)
    }
  }

  const full = examples.length >= MAX_EXAMPLES

  return (
    <section className="section stack">
      <div className="field-head">
        <h2 className="section-title">Örnek cümleler{examples.length > 0 && <span className="muted"> ({examples.length})</span>}</h2>
        {!full && (
          <div className="row" style={{ gap: '0.5rem' }}>
            <button type="button" className="ai-suggest" onClick={suggest} disabled={busy}>
              <SparkleIcon size={14} className="icon-star" />
              {busy ? 'Yazılıyor…' : 'AI ile yeni cümle'}
            </button>
            {!adding && (
              <button type="button" className="link small" onClick={() => setAdding(true)}>
                + Cümle ekle
              </button>
            )}
          </div>
        )}
      </div>
      <p className="small muted">
        Kelimeyi farklı cümlelerde görmek onu tek bir kalıba bağlı kalmadan öğrenmeni sağlar. Alıştırmalarda her seferinde bunlardan biri seçilir.
        {examples.length < 3 && ' En az 3 farklı cümle iyi bir hedef.'}
      </p>
      {examples.length > 0 && (
        <ul className="example-list">
          {examples.map((ex, i) => (
            <li key={ex.text}>
              <div>
                <p className="sentence">
                  {ex.text}
                  {ex.personal && <span className="personal-tag">senin cümlen</span>}
                </p>
                {ex.translation && <p className="sentence-tr">{ex.translation}</p>}
                <ShadowButton text={ex.text} language={entry.language} />
              </div>
              <div className="row" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
                {canSpeak() && (
                  <button className="icon-btn" onClick={() => speak(ex.text, entry.language, speechPrefs.rate * 0.95)} aria-label="Cümleyi dinle">
                    <SpeakerIcon size={18} />
                  </button>
                )}
                <button className="icon-btn" onClick={() => save(removeExample(entry, i))} aria-label="Cümleyi sil">
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form
          className="stack card"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <div className="field">
            <label htmlFor="ex-text">Cümle</label>
            {!aiText && <span className="help">En iyisi kendi hayatından bir cümle: kendinle ilgili cümleler çok daha iyi akılda kalır.</span>}
            <input id="ex-text" className="input" value={text} onChange={(e) => setText(e.target.value)} lang={entry.language} autoFocus />
            <span className="help">Kelime cümlede farklı biçimdeyse yıldızla işaretle: She *abandoned* it.</span>
          </div>
          <div className="field">
            <label htmlFor="ex-tr">Çevirisi (isteğe bağlı)</label>
            <input id="ex-tr" className="input" value={translation} onChange={(e) => setTranslation(e.target.value)} />
          </div>
          <div className="row">
            <button className="btn" type="submit" disabled={!text.trim()}>
              Cümleyi ekle
            </button>
            <button
              className="btn btn-quiet"
              type="button"
              onClick={() => {
                setAdding(false)
                setText('')
                setTranslation('')
                setError('')
              }}
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
