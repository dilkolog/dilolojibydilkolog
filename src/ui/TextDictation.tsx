import { useEffect, useMemo, useRef, useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { diffScore, wordDiff } from '../engine/wordDiff'
import { AccentBar, accentChange, insertAt } from './AccentBar'
import { MessageIcon, SpeakerIcon } from './icons'
import { saveSentence } from './Sentences'
import { sfx } from './sounds'

interface Result {
  right: number
  total: number
  missed: string[]
}

/** A missed word as a learner would look it up: no punctuation, lower case. */
const bare = (w: string, language: TargetLanguage) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLocaleLowerCase(language)

/**
 * Dictation of the text being read, sentence by sentence: hear one, write it, see word by word
 * what was missed. With timed subtitles the text's own recording plays each sentence; otherwise
 * the device reads it. Writing what you hear forces the small words and endings that skimming
 * lets slip (the ones a listener most often misses), so the end lists them.
 */
export function TextDictation({
  sentences,
  language,
  start = 0,
  voice,
  play,
  onClose,
}: {
  sentences: string[]
  language: TargetLanguage
  /** The sentence to begin with (the one heard or looked at last). */
  start?: number
  /** Whose voice: the recording's or the device's. */
  voice: 'recording' | 'device'
  play: (index: number, slow: boolean) => void
  onClose: () => void
}) {
  // One-word sentences ("Oui.") are left out: nothing to write down.
  const order = useMemo(() => sentences.map((s, i) => [s, i] as const).filter(([s, i]) => i >= start && s.split(/\s+/).filter(Boolean).length >= 2).map(([, i]) => i), [sentences, start])
  const [step, setStep] = useState(0)
  const [text, setText] = useState('')
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [saved, setSaved] = useState(false)
  const [done, setDone] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const index = order[step]
  const sentence = index === undefined ? '' : sentences[index]

  useEffect(() => {
    if (index === undefined || done) return
    setText('')
    setChecked(false)
    setSaved(false)
    play(index, false)
    input.current?.focus()
  }, [index, done]) // eslint-disable-line react-hooks/exhaustive-deps

  const diff = useMemo(() => (checked ? (text.trim() ? wordDiff(text, sentence) : sentence.split(/\s+/).map((w) => ({ word: w, status: 'missed' as const }))) : []), [checked, text, sentence])

  const check = () => {
    if (checked) return
    const parts = text.trim() ? wordDiff(text, sentence) : []
    const score = text.trim() ? diffScore(parts) : { right: 0, total: sentence.split(/\s+/).length, missed: sentence.split(/\s+/) }
    setResults((r) => [...r, score])
    setChecked(true)
    if (score.right === score.total && parts.every((p) => p.status === 'ok')) sfx.correct()
    else if (score.right === score.total) sfx.near()
    else sfx.wrong()
  }
  const next = () => (step + 1 < order.length ? setStep((s) => s + 1) : setDone(true))

  if (done || index === undefined) {
    const right = results.reduce((n, r) => n + r.right, 0)
    const total = results.reduce((n, r) => n + r.total, 0)
    const missed = [...new Set(results.flatMap((r) => r.missed.map((w) => bare(w, language))).filter(Boolean))]
    return (
      <section className="card stack" aria-label="Dikte">
        <h2 className="section-title">Dikte bitti</h2>
        {results.length ? (
          <p>
            {results.length} cümlede kelimelerin %{total ? Math.round((right / total) * 100) : 0}’ini doğru yazdın.
          </p>
        ) : (
          <p className="muted">Hiç cümle yazmadın.</p>
        )}
        {missed.length > 0 && (
          <div className="stack gap-2">
            <span className="small muted">Kaçırdıkların (çoğu zaman kısa kelimeler ve ekler: kulak onları atlar):</span>
            <p className="dictation-diff" lang={language}>
              {missed.slice(0, 30).map((w) => (
                <span key={w}>
                  <span className="dd-missed">{w}</span>{' '}
                </span>
              ))}
            </p>
          </div>
        )}
        <div className="row">
          <button className="btn" onClick={onClose} autoFocus>
            Metne dön
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card stack text-dictation" aria-label="Dikte">
      <div className="row justify-between">
        <strong>
          Dikte · {step + 1} / {order.length}
        </strong>
        <button className="link small" onClick={() => setDone(true)}>
          Bitir
        </button>
      </div>
      <div className="row">
        <button className="speak speak-big" onClick={() => play(index, false)} aria-label="Tekrar dinle">
          <SpeakerIcon size={32} />
        </button>
        <button className="link small" onClick={() => play(index, true)}>
          Yavaş
        </button>
        <span className="small muted">{voice === 'recording' ? 'Metnin kendi kaydından' : 'Cihazın sesiyle'}</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (checked) next()
          else check()
        }}
      >
        <input
          ref={input}
          className="answer-input"
          lang={language}
          value={text}
          onChange={accentChange(language, setText)}
          disabled={checked}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Duyduğun cümleyi yaz"
          aria-label="Duyduğun cümle"
        />
        {!checked && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
      </form>
      {!checked ? (
        <div className="row">
          <button className="btn" onClick={check} disabled={!text.trim()}>
            Kontrol et
          </button>
          <button className="link small" onClick={check}>
            Göster
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="dictation-diff" lang={language}>
            {diff.map((p, i) => (
              <span key={i} className={`dd-${p.status}`}>
                {p.word}{' '}
              </span>
            ))}
          </p>
          <div className="row">
            <button className="btn" onClick={next} autoFocus>
              {step + 1 < order.length ? 'Devam' : 'Bitir'}
            </button>
            <button
              className="link small"
              disabled={saved}
              onClick={async () => {
                await saveSentence({ language, text: sentence, source: 'Dikte' })
                setSaved(true)
              }}
            >
              <MessageIcon size={16} className="inline-icon" /> {saved ? 'Kaydedildi' : 'Cümle kartı yap'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
