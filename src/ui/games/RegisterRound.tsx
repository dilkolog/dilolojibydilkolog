import { LessonLink } from '../LessonLink'
import { useEffect, useState } from 'react'
import { GameResult } from './GameResult'
import type { GrammarLog } from '../../engine/grammar'
import { REGISTER_NAME, REGISTER_ROUND, registerRound, type RegisterQuestion } from '../../engine/register'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { registerItems } from '../../data/register'
import { SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'

const note = noteIn(() => db.getRegisterLog(), (log) => db.saveRegisterLog(log))

/**
 * Register: a situation (a friend, a stranger, a job interview) and a thought; the way of saying it
 * that suits the situation is picked among the street's, the standard and the formal words.
 */
/** The guide's lesson on register, by language. */
const REGISTER_LESSON: Record<TargetLanguage, string> = { fr: 'basics_fr_registres', es: 'basics_es_registro_formal', en: 'basics_en_register' }

export function RegisterRound({ language, onExit, onLesson }: { language: TargetLanguage; onExit: () => void; /** Opens the guide's lesson on a topic. */ onLesson?: (topic: string) => void }) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<RegisterQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: RegisterQuestion; ok: boolean }[]>([])

  useEffect(() => {
    let live = true
    void db.getRegisterLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const q = round[index]
  const total = registerItems.filter((i) => i.language === language).length

  const start = () => {
    setRound(registerRound(registerItems, log ?? {}, language, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setGiven(null)
    setPhase('play')
  }

  const choose = (option: string) => {
    if (!q || given) return
    const ok = option === q.answer
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
  const nameOf = (q: RegisterQuestion, text: string) => REGISTER_NAME[(['informal', 'standard', 'formal'] as const).find((r) => q.item[r] === text)!]

  return (
    <div className="stack register-game">
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
          <h1 className="greeting">Kayıt farkı</h1>
          <p className="muted">
            Aynı şey {LANGUAGE_NAME[language]} üç ortamda üç türlü söylenir: sokakta, standart ve resmî. Bir durum ve bir düşünce görürsün; o ortama uyan söyleyişi seçersin. Doğru kelimeyi yanlış yerde kullanmamak için.
          </p>
          <p className="small muted">{total} düşünce, her biri üç ortamda.</p>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!log || total === 0}>
              {Math.min(REGISTER_ROUND, total)} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">{q.situation}</p>
          <h1 className="word" lang="tr">
            “{q.item.tr}” demek istiyorsun
          </h1>
          <p className="prompt-text">Hangisini söylersin?</p>
          <div className="options" role="group" aria-label="Seçenekler">
            {q.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${given ? (o === q.answer ? ' is-correct' : given === o ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={!!given}
                onClick={() => choose(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          {given && (
            <div className="stack" role="status">
              <p className={given === q.answer ? 'small' : 'cross-warn'}>
                {given === q.answer ? 'Doğru: ' : 'Bu ortama uymaz. '}
                <strong lang={language}>{q.answer}</strong> ({REGISTER_NAME[q.register]}).
                {given !== q.answer && (
                  <>
                    {' '}
                    Seçtiğin <span lang={language}>“{given}”</span> {nameOf(q, given)} bir söyleyiş.
                  </>
                )}
              </p>
              <ul className="register-ladder small">
                {(['informal', 'standard', 'formal'] as const).map((r) => (
                  <li key={r}>
                    <span className="muted">{REGISTER_NAME[r]}:</span> <span lang={language}>{q.item[r]}</span>
                    {canSpeak() && (
                      <button type="button" className="icon-btn icon-btn-sm" aria-label={`${q.item[r]} dinle`} onClick={() => speak(q.item[r], language)}>
                        <SpeakerIcon size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {q.item.note && <p className="small muted">{q.item.note}</p>}
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
          missed={missed.map((m) => `${m.q.answer} (${REGISTER_NAME[m.q.register]})`)}
          missedLabel="Ortama uymayanlar"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
      {phase === 'over' && missed.length > 0 && onLesson && <LessonLink language={language} topic={REGISTER_LESSON[language]} onOpen={onLesson} />}
    </div>
  )
}
