import { useEffect, useState } from 'react'
import { GameResult } from './GameResult'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import { TRAP_ROUND, trapRound, type TrapQuestion } from '../../engine/traps'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { trapWords } from '../../data/traps'
import { AlertIcon, SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'

const note = noteIn(() => db.getTrapLog(), (log) => db.saveTrapLog(log))

/**
 * False friends: a sentence with a word that looks like one the learner knows and means something
 * else; its meaning is picked among three, one of them what the look-alike suggests. The answer
 * tells which look-alike misleads and gives the sentence in Turkish.
 */
export function TrapRound({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<TrapQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: TrapQuestion; ok: boolean }[]>([])

  useEffect(() => {
    let live = true
    void db.getTrapLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const q = round[index]
  const total = trapWords.filter((t) => t.language === language).length

  const start = () => {
    setRound(trapRound(trapWords, log ?? {}, language, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setGiven(null)
    setPhase('play')
  }

  const choose = (option: string) => {
    if (!q || given) return
    const ok = option === q.word.meaning
    if (ok) sfx.correct()
    else sfx.wrong()
    setGiven(option)
    setResults((r) => [...r, { q, ok }])
    void note(q.id, ok)
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setGiven(null)
      return
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      const n = Number(e.key)
      if (!given && n >= 1 && n <= q.options.length) choose(q.options[n - 1])
      else if (given && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack trap-game">
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
          <h1 className="greeting">Tuzak kelimeler</h1>
          <p className="muted">
            {LANGUAGE_NAME[language]}da başka bir kelimeye benzeyen ama başka şey diyen kelimeler: bir cümle görürsün, anlamını üç seçenekten seçersin. Seçeneklerden biri benzeyen kelimenin düşündürdüğü yanlış anlamdır; yanılırsan hangisine kanıldığını görürsün. Bu kelimeler kelime sayfasında ve sözlükte “Tuzak kelime” çipiyle işaretlidir.
          </p>
          <p className="small muted">{total} tuzak kelime var.</p>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!log || total === 0}>
              {Math.min(TRAP_ROUND, total)} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">
            <span lang={language}>“{q.word.lemma}”</span> ne demek?
          </p>
          <p className="grammar-sentence" lang={language}>
            {q.word.text}
          </p>
          <div className="options" role="group" aria-label="Seçenekler">
            {q.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${given ? (o === q.word.meaning ? ' is-correct' : given === o ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={!!given}
                onClick={() => choose(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang="tr">
                  {o}
                </span>
              </button>
            ))}
          </div>
          {given && (
            <div className="stack" role="status">
              <p className={given === q.word.meaning ? 'small' : 'cross-warn'}>
                <AlertIcon size={15} className="inline-icon" /> <strong lang={language}>{q.word.lemma}</strong>, “{q.word.looks}” gibi görünür ama{' '}
                <strong>“{q.word.meaning}”</strong> demektir; “{q.word.trap}” değil.
              </p>
              <p className="small muted">
                {q.word.tr}
                {canSpeak() && (
                  <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(q.word.text, language)}>
                    <SpeakerIcon size={15} />
                  </button>
                )}
              </p>
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  Devam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Tur bitti"
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => `${m.q.word.lemma} = ${m.q.word.meaning}`)}
          missedLabel="Tuzağa düştüklerin"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
