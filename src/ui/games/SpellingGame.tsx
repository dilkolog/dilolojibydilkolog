import { useEffect, useRef, useState } from 'react'
import { checkSpelling, spellingRound, spellOut } from '../../engine/spelling'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { SlowIcon, SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { speak, speechPrefs } from '../speech'
import { GameResult } from './GameResult'

/** How "how is it spelled?" is asked, shown on the start screen. */
const ASK: Record<TargetLanguage, string> = { fr: 'Comment ça s’écrit ?', es: '¿Cómo se escribe?', en: 'How do you spell that?' }

/**
 * Spelling aloud: a word or a name is said letter by letter (bé, o, enne…) and the learner types it. Half the words are
 * the learner's own, half names and places people are asked to spell. Only the best result is kept.
 */
export function SpellingGame({ language, lemmas, best, recordKey, onExit }: { language: TargetLanguage; lemmas: readonly string[]; best?: number; recordKey: string; onExit: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<'right' | 'near' | 'wrong' | null>(null)
  const [results, setResults] = useState<{ word: string; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  // The best so far: `best` is read once when the games screen opens, and a replay must not lower it.
  const [top, setTop] = useState(best)
  const input = useRef<HTMLInputElement>(null)
  const word = round[index]

  const start = () => {
    setRound(spellingRound(language, lemmas, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setText('')
    setVerdict(null)
    setRecord(false)
    setPhase('play')
  }

  const say = (slow = false) => word && speak(spellOut(language, word), language, speechPrefs.rate * (slow ? 0.65 : 0.85))

  // Each new word is spelled at once.
  useEffect(() => {
    if (phase === 'play' && word) speak(spellOut(language, word), language, speechPrefs.rate * 0.85)
  }, [phase, word, language])

  useEffect(() => {
    if (!verdict) input.current?.focus()
  }, [verdict, index])

  const check = () => {
    if (!word || verdict || !text.trim()) return
    const v = checkSpelling(word, text)
    // A missed accent or ñ/ç is a letter missed: shown as near, not counted right.
    const ok = v === 'right'
    if (v !== 'wrong') sfx.correct()
    else sfx.wrong()
    setVerdict(v)
    setResults((r) => [...r, { word, ok }])
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setText('')
      setVerdict(null)
      return
    }
    const right = results.filter((r) => r.ok).length
    const pct = Math.round((right / Math.max(1, results.length)) * 100)
    if (pct > (top ?? 0)) {
      setRecord(top !== undefined)
      setTop(pct)
      void db.saveRecord(recordKey, pct)
    }
    setPhase('over')
  }

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack numbers-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted" />
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Harf harf</h1>
          <p className="muted">
            Otelde, telefonda, bir formda: “<span lang={language}>{ASK[language]}</span>” Bir kelime ya da ad {LANGUAGE_NAME[language]} harf adlarıyla tek tek söylenir; sen yazarsın. Harflerin adı sesleriyle aynı değildir, aksanlar ve çift harfler de ayrıca söylenir.
          </p>
          <p className="small muted">Yarısı senin kelimelerin, yarısı sık sorulan adlar ve yerler.</p>
          {top !== undefined && <p className="small muted">Rekorun: %{top}</p>}
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus>
              10 kelimelik tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && word && (
        <div className="stack">
          <p className="prompt-label">Harf harf söylenen kelimeyi yaz</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => say()}>
              <SpeakerIcon size={18} /> Dinle
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => say(true)}>
              <SlowIcon size={18} /> Yavaş
            </button>
          </div>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              if (verdict) next()
              else check()
            }}
          >
            <input
              ref={input}
              className={`answer-input${verdict === 'right' ? ' is-correct' : verdict === 'near' ? ' is-near' : verdict === 'wrong' ? ' is-wrong' : ''}`}
              lang={language}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              readOnly={!!verdict}
              placeholder="Kelimeyi yaz"
              aria-label="Kelime"
              value={text}
              onChange={accentChange(language, setText)}
            />
            {!verdict && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
            {verdict ? (
              <div className="stack gap-2" role="status">
                <p className={verdict === 'wrong' ? 'error' : 'notice'}>{verdict === 'right' ? 'Doğru' : verdict === 'near' ? 'Neredeyse: aksana bak' : 'Yanlış'}</p>
                <p className="numbers-answer">
                  <strong lang={language}>{word}</strong> = <span lang={language}>{spellOut(language, word)}</span>
                  <button type="button" className="icon-btn icon-btn-sm" aria-label="Kelimeyi dinle" onClick={() => speak(word, language)}>
                    <SpeakerIcon size={15} />
                  </button>
                </p>
                <div className="row">
                  <button type="submit" className="btn">
                    {index + 1 < round.length ? 'Devam' : 'Sonucu gör'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="row">
                <button type="submit" className="btn" disabled={!text.trim()}>
                  Kontrol et
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          record={record}
          title="Tur bitti"
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => m.word)}
          missedLabel="Tekrar bakmaya değer"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
