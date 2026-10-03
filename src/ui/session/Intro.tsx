import { useEffect, useRef, useState } from 'react'
import { buildPretest, displayForm } from '../../engine/exercises'
import type { Rng } from '../../engine/rng'
import type { VocabularyEntry } from '../../engine/types'
import { WordInputError } from '../../data/wordInput'
import { POS_NAME } from '../labels'
import { CrossLanguageNotes } from '../CrossLanguage'
import { SpeakerIcon } from '../icons'
import { prefs } from '../prefs'
import { sfx } from '../sounds'
import { canSpeak, speak, speechPrefs } from '../speech'
import { useMediaUrl } from '../useMedia'
import { SpeakButton, Word, Sentence, KeyLegend } from './shared'
import { Choices } from './Answers'
import { modalOpen } from './keys'

/**
 * First encounter: only the word, its sound, the core meaning and one strong example.
 * Collocations and word family are revealed in later encounters, not all at once.
 *
 * With pretesting on, the learner first guesses the meaning. Even a wrong guess makes the answer
 * that follows stick better (pretesting effect; Kornell, Hays & Bjork 2009). The guess is not
 * graded and leaves no trace in the schedule.
 */
export function Intro({
  entry,
  catalog,
  rng,
  onContinue,
  onKnown,
  onOwnSentence,
}: {
  entry: VocabularyEntry
  catalog: VocabularyEntry[]
  rng: Rng
  onContinue: () => void
  onKnown: () => void
  /** Saves a sentence the learner wrote about their own life as an example. */
  onOwnSentence: (text: string) => Promise<void>
}) {
  const sense = entry.senses[0]
  const example = sense.examples[0]
  const btn = useRef<HTMLButtonElement>(null)
  const imageUrl = useMediaUrl(entry.imageId)
  const [pretest] = useState(() => (prefs.pretest ? buildPretest(entry, catalog, rng) : null))
  const [guess, setGuess] = useState<{ label: string; correct: boolean } | 'skipped' | null>(null)
  const guessing = pretest !== null && guess === null
  useEffect(() => {
    if (!guessing) btn.current?.focus()
  }, [guessing])
  // 0: no idea while guessing; B: already known on the card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen() || e.altKey || e.metaKey || e.ctrlKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (guessing && /^(Digit|Numpad)0$/.test(e.code)) setGuess('skipped')
      else if (!guessing && e.code === 'KeyB') onKnown()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guessing, onKnown])

  if (guessing) {
    return (
      <div>
        <p className="prompt-label">
          <span className="badge">Yeni kelime</span> <span className="small muted">Bilmiyorsan da bir tahmin yap</span>
        </p>
        <div className="row">
          <Word entry={entry} />
          {entry.ipa && <span className="ipa ipa-intro">{entry.ipa}</span>}
          <SpeakButton text={displayForm(entry)} entry={entry} auto />
        </div>
        <p className="muted">Sence ne anlama geliyor?</p>
        <Choices
          exercise={pretest}
          answered={false}
          onChoose={(id) => {
            const label = pretest.options.find((o) => o.id === id)!.label
            if (id === pretest.correctOptionId) sfx.correct()
            setGuess({ label, correct: id === pretest.correctOptionId })
          }}
        />
        <div className="session-actions">
          <button className="link small" onClick={() => setGuess('skipped')}>
            Hiç fikrim yok, göster
          </button>
        </div>
        <KeyLegend mode="guess" />
      </div>
    )
  }

  return (
    <div>
      <p className="prompt-label">
        <span className="badge">Yeni kelime</span>
        {entry.partOfSpeech !== 'other' && <span className="small muted"> {POS_NAME[entry.partOfSpeech]}</span>}
      </p>
      {guess && guess !== 'skipped' && (
        <p className={`guess-result ${guess.correct ? 'is-right' : 'is-wrong'}`} role="status">
          {guess.correct
            ? 'Doğru tahmin! Zaten biliyorsan aşağıdan "Zaten biliyorum"u seç.'
            : `Tahminin "${guess.label}" idi. Doğrusunu şimdi gör: tahmin ettiğin için daha iyi aklında kalacak.`}
        </p>
      )}
      <div className="intro-card stack">
        <div className="row justify-between nowrap">
          <div className="stack gap-1">
            <Word entry={entry} />
            {entry.ipa && (
              <span className="ipa ipa-intro" title="Okunuşu (IPA)">
                {entry.ipa}
              </span>
            )}
          </div>
          <SpeakButton text={displayForm(entry)} entry={entry} auto={!pretest} />
        </div>
        {imageUrl && <img className="word-image" src={imageUrl} alt="" />}
        <p className="gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
        {sense.definition && (
          <p className="definition" lang={entry.language}>
            {sense.definition}
          </p>
        )}
        <CrossLanguageNotes entry={entry} compact />
        {entry.literal && <p className="small muted">Kelimesi kelimesine: {entry.literal}</p>}
        {entry.notes && <p className="note">💡 {entry.notes}</p>}
        {example && (
          <div className="row items-start nowrap">
            <Sentence text={example.text} translation={example.translation} />
            {canSpeak() && (
              <button className="icon-btn" onClick={() => speak(example.text, entry.language, speechPrefs.rate * 0.95)} aria-label="Cümleyi dinle">
                <SpeakerIcon size={20} />
              </button>
            )}
          </div>
        )}
        <OwnSentence entry={entry} onSave={onOwnSentence} />
      </div>
      <div className="session-actions">
        <button ref={btn} className="btn btn-lg grow" onClick={onContinue}>
          Öğrendim, devam
        </button>
        <button className="btn btn-lg btn-quiet" onClick={onKnown}>
          Zaten biliyorum
        </button>
      </div>
      <KeyLegend mode="intro" />
    </div>
  )
}

/**
 * Optional: a sentence about the learner's own life with the new word. Self-referenced,
 * self-generated sentences are remembered far better than given ones; it becomes an example
 * that later exercises use.
 */
function OwnSentence({ entry, onSave }: { entry: VocabularyEntry; onSave: (text: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  if (saved) return <p className="small notice">✍️ Cümlen kaydedildi; alıştırmalarda karşına çıkacak.</p>
  if (!open) {
    return (
      <button className="link small own-link" onClick={() => setOpen(true)}>
        ✍️ Bu kelimeyle kendi hayatından bir cümle yaz (isteğe bağlı)
      </button>
    )
  }
  return (
    <form
      className="stack own-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        try {
          await onSave(text)
          setSaved(true)
        } catch (err) {
          setError(err instanceof WordInputError ? err.message : 'Kaydedilemedi.')
        }
      }}
    >
      <input
        className="input"
        lang={entry.language}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`${entry.lemma} ile, kendinle ilgili bir cümle…`}
        autoCorrect="off"
        enterKeyHint="done"
        autoFocus
        aria-label="Kendi cümlen"
      />
      <div className="row">
        <button className="btn btn-quiet" type="submit" disabled={!text.trim()}>
          Kaydet
        </button>
        <button className="link small" type="button" onClick={() => setOpen(false)}>
          Vazgeç
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  )
}
