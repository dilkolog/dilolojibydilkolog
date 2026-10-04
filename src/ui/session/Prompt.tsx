import { useState } from 'react'
import { BLANK, displayForm, type Exercise } from '../../engine/exercises'
import type { VocabularyEntry } from '../../engine/types'
import { LANGUAGE_NAME } from '../labels'
import { prefs } from '../prefs'
import { canSpeak, speechPrefs } from '../speech'
import { useMediaUrl } from '../useMedia'
import { SpeakButton, Word, Sentence, wordSize } from './shared'

/** What the question shows: the word, its meaning, a sentence with a blank, audio or a picture. */
export function Prompt({ exercise, entry, listenRate }: { exercise: Exercise; entry: VocabularyEntry; listenRate: number }) {
  switch (exercise.type) {
    case 'mc_meaning':
      return (
        <div className="row">
          <Word entry={entry} />
          <SpeakButton text={displayForm(entry)} entry={entry} />
        </div>
      )
    case 'listen_choose':
    case 'listen_type':
      return canSpeak() ? (
        <div className="row">
          <SpeakButton text={exercise.audioText!} entry={entry} big auto vary rate={listenRate} />
          <RateNote rate={listenRate} />
        </div>
      ) : (
        <p className="muted">Bu tarayıcıda sesli okuma yok. Kelime: {exercise.audioText}</p>
      )
    case 'mc_context':
    case 'discriminate':
    case 'cloze_typed':
      return <Sentence text={exercise.context!} translation={exercise.contextTranslation} source={exercise.contextSource} blankStart={exercise.blankStart} />
    case 'picture_choice':
      return <PictureFrame id={exercise.imageId} />
    case 'dictation':
      // The slow replay sits beside "Emin değilim" as a small icon (see Session).
      return <SpeakButton text={exercise.audioText!} entry={entry} big auto vary rate={listenRate} />
    case 'speak_word':
      return <MeaningPrompt exercise={exercise} entry={entry} />
    case 'back_translation':
      return (
        <div className="stack gap-xs">
          <p className="prompt-text">{exercise.prompt}</p>
          <p className="muted">
            {LANGUAGE_NAME[entry.language]} yaz; <span lang={entry.language}>“{displayForm(entry)}”</span> kelimesini kullan. Birebir aynısı gerekmez, anlamı
            doğru aktarman yeter.
          </p>
        </div>
      )
    case 'family_choice':
      return (
        <div className="stack gap-xs">
          <p className="prompt-text">{exercise.prompt}</p>
          <p className="muted" lang={entry.language}>
            {exercise.context}
          </p>
        </div>
      )
    case 'idiom_complete':
      return (
        <div className="stack gap-xs">
          <p className="prompt-text idiom-prompt" lang={entry.language}>
            {exercise.prompt.split(BLANK).map((part, i, all) => (
              <span key={i}>
                {part}
                {i < all.length - 1 && <span className="blank">____</span>}
              </span>
            ))}
          </p>
          <p className="muted">
            {exercise.context}
            {entry.literal && <span className="small"> · kelimesi kelimesine: {entry.literal}</span>}
          </p>
        </div>
      )
    case 'conjugation':
      return exercise.context?.includes(BLANK) ? (
        <div className="stack gap-xs">
          <p className="muted" lang={entry.language}>
            {exercise.prompt}
          </p>
          <Sentence text={exercise.context} translation={exercise.contextTranslation} blankStart={exercise.blankStart} />
        </div>
      ) : (
        <div className="stack gap-xs">
          <p className="prompt-text" lang={entry.language}>
            {exercise.prompt}
          </p>
          <p className="muted">{exercise.context}</p>
        </div>
      )
    case 'article_choice':
      // Before a vowel the article is written l' (l'eau), so the blank would mislead: the question
      // is the gender, shown with the word as it is written.
      return entry.article?.endsWith("'") ? (
        <div className="stack gap-2">
          <h1 className={`word${wordSize(displayForm(entry))}`} lang={entry.language}>
            {displayForm(entry)}
          </h1>
          <p className="gloss muted">
            {exercise.context} · l’ ile yazılır; eril mi (le), dişil mi (la)?
          </p>
        </div>
      ) : (
        <div className="stack gap-2">
          <h1 className={`word${wordSize(`____ ${exercise.prompt}`)}`} lang={entry.language}>
            <span className="blank" aria-label="artikel">
              ____
            </span>{' '}
            {exercise.prompt}
          </h1>
          <p className="gloss muted">{exercise.context}</p>
        </div>
      )
    case 'free_sentence':
      return (
        <div className="stack">
          <div className="row">
            <Word entry={entry} />
            <SpeakButton text={displayForm(entry)} entry={entry} />
          </div>
          <p className="muted">
            {entry.senses[0].gloss}. {exercise.context}
          </p>
        </div>
      )
    default:
      return <MeaningPrompt exercise={exercise} entry={entry} />
  }
}

/**
 * The Turkish meaning as the cue, or, in target-language mode, the word's definition in its own
 * language (thinking in the language instead of translating); the Turkish stays one tap away.
 */
function MeaningPrompt({ exercise, entry }: { exercise: Exercise; entry: VocabularyEntry }) {
  const [showTurkish, setShowTurkish] = useState(false)
  const definition = entry.senses[0].definition
  if (!prefs.targetDefinitions || !definition || exercise.prompt !== entry.senses[0].gloss) return <p className="prompt-text">{exercise.prompt}</p>
  return (
    <div className="stack gap-xs">
      <p className="prompt-text definition-prompt" lang={entry.language}>
        {definition}
      </p>
      {showTurkish ? (
        <p className="muted">Türkçesi: {exercise.prompt}</p>
      ) : (
        <button type="button" className="link small" onClick={() => setShowTurkish(true)}>
          Türkçesini göster
        </button>
      )}
    </div>
  )
}

/** Shown when listening speed differs from the base setting, so a faster voice isn't a surprise. */
function RateNote({ rate }: { rate: number }) {
  if (Math.abs(rate - speechPrefs.rate) < 0.01) return null
  return (
    <span className="small muted">
      {rate > speechPrefs.rate ? 'Bu kelimeyi iyi tanıyorsun: daha hızlı konuşuyor' : 'Yeni kelime: biraz yavaş konuşuyor'} ({rate.toFixed(2).replace('.', ',')}×)
    </span>
  )
}

function PictureFrame({ id }: { id?: string }) {
  const url = useMediaUrl(id)
  return url ? <img className="word-image" src={url} alt="Kelimenin görseli" /> : <div className="word-image" style={{ height: '12rem', background: 'var(--surface-2)' }} />
}
