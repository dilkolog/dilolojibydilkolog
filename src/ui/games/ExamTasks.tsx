import '../../lazy.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { examPassages } from '../../data/examReading'
import { db } from '../../data/instance'
import { examQuestionId, MAX_PLAYS, passageOrder, passageShare, shuffledQuestion, wordCount, type ExamMode, type ExamPassage } from '../../engine/examReading'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { noteIn } from './logNote'
import { Ring } from '../Ring'
import { SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { canSpeak, speakAsync, stopSpeaking } from '../speech'

const note = noteIn(() => db.getExamLog(), (log) => db.saveExamLog(log))
const MODE_KEY = 'diloloji:exam-mode'
const LEVELS = ['A2', 'B1', 'B2', 'C1'] as const

const readMode = (): ExamMode => {
  try {
    // Listening needs a voice: on a device without one the saved choice falls back to reading.
    return localStorage.getItem(MODE_KEY) === 'listen' && canSpeak() ? 'listen' : 'read'
  } catch {
    return 'read'
  }
}

/**
 * Exam-style reading and listening tasks: a text of the kind DELF, DELE or Cambridge gives and three questions
 * on it. In listening mode the text is only heard (device voice, twice at most) and shown with its Turkish after
 * the answers. Original texts; the screen says it is not an official paper.
 */
export function ExamTasks({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [mode, setModeState] = useState<ExamMode>(readMode)
  const [level, setLevel] = useState<(typeof LEVELS)[number] | ''>('')
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [open, setOpen] = useState<ExamPassage | null>(null)
  const setMode = (m: ExamMode) => {
    setModeState(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // Without storage the choice just is not kept.
    }
  }

  useEffect(() => {
    let live = true
    void db.getExamLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [open])

  const list = useMemo(() => (log ? passageOrder(examPassages, log, language, createRng(1), level || undefined) : []), [log, language, level])

  if (open) return <Task key={open.id} passage={open} mode={mode} onBack={() => setOpen(null)} onNext={(p) => setOpen(p)} next={list.find((p) => p.id !== open.id)} />

  return (
    <div className="stack examtask">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <span className="small muted" />
        <span className="small muted" />
      </div>
      <h1 className="greeting">Sınav tarzı görevler</h1>
      <p className="muted">
        {LANGUAGE_NAME[language]}da sınavların verdiği türden kısa metinler (mesaj, anons, haber, röportaj) ve üçer soru. <strong>Okuma</strong>da metin önünde durur; <strong>Dinleme</strong>de metni yalnızca duyarsın (en çok {MAX_PLAYS} kez) ve cevaplardan sonra görürsün. Özgün metinlerdir; resmî sınav soruları değildir.
      </p>
      <div className="choice-row" role="group" aria-label="Görev türü">
        <button type="button" className="chip" aria-pressed={mode === 'read'} onClick={() => setMode('read')}>
          Okuma
        </button>
        <button type="button" className="chip" aria-pressed={mode === 'listen'} onClick={() => setMode('listen')} disabled={!canSpeak()}>
          Dinleme
        </button>
      </div>
      <div className="choice-row" role="group" aria-label="Seviye">
        <button type="button" className="chip" aria-pressed={level === ''} onClick={() => setLevel('')}>
          Hepsi
        </button>
        {LEVELS.map((l) => (
          <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>
      <ul className="plain stack examtask-list">
        {list.map((p) => {
          const share = log ? passageShare(p, log) : undefined
          return (
            <li key={p.id}>
              <button type="button" className="card examtask-item" onClick={() => setOpen(p)}>
                <span className="examtask-level">{p.level}</span>
                <span className="examtask-title">
                  <strong>{p.title}</strong>
                  <span className="small muted">
                    {p.exam} tarzı · {wordCount(p.text)} kelime · {p.questions.length} soru
                    {share !== undefined ? ` · son sonuç %${Math.round(share * 100)}` : ''}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {list.length === 0 && log && <p className="muted">Bu seviyede görev yok.</p>}
    </div>
  )
}

function Task({ passage, mode, onBack, onNext, next }: { passage: ExamPassage; mode: ExamMode; onBack: () => void; onNext: (p: ExamPassage) => void; next?: ExamPassage }) {
  const shuffled = useMemo(() => {
    const rng = createRng(Date.now())
    return passage.questions.map((q) => shuffledQuestion(q, rng))
  }, [passage])
  const [picked, setPicked] = useState<(number | null)[]>(() => passage.questions.map(() => null))
  const [checked, setChecked] = useState(false)
  const [plays, setPlays] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [showTr, setShowTr] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      stopSpeaking()
    }
  }, [])

  const play = async () => {
    if (speaking || plays >= MAX_PLAYS) return
    setPlays((n) => n + 1)
    setSpeaking(true)
    try {
      await speakAsync(passage.text, passage.language)
    } finally {
      if (alive.current) setSpeaking(false)
    }
  }

  const right = picked.filter((p, i) => p === shuffled[i].answer).length
  const check = () => {
    setChecked(true)
    picked.forEach((p, i) => void note(examQuestionId(passage, i), p === shuffled[i].answer))
    if (right === passage.questions.length) sfx.levelUp()
    else sfx.correct()
  }
  const showText = mode === 'read' || checked

  return (
    <div className="stack examtask">
      <div className="game-top">
        <button className="link" onClick={onBack}>
          ← Görevler
        </button>
        <span className="small muted">
          {passage.exam} tarzı · {passage.level} · {mode === 'read' ? 'Okuma' : 'Dinleme'}
        </span>
        <span className="small muted" />
      </div>
      <section className="card stack">
        <h2 className="section-title">{passage.title}</h2>
        {mode === 'listen' && !checked && (
          <div className="row">
            <button type="button" className="btn" onClick={play} disabled={speaking || plays >= MAX_PLAYS}>
              <SpeakerIcon size={18} /> {speaking ? 'Çalıyor…' : plays === 0 ? 'Dinle' : 'Bir daha dinle'}
            </button>
            <span className="small muted">{MAX_PLAYS - plays} dinleme hakkın kaldı</span>
          </div>
        )}
        {showText && (
          <p className="examtask-text" lang={passage.language}>
            {passage.text}
          </p>
        )}
        {showText && (
          <div>
            <button type="button" className="link small" aria-expanded={showTr} onClick={() => setShowTr((v) => !v)}>
              {showTr ? 'Türkçesini gizle' : 'Türkçesini göster'}
            </button>
            {showTr && (
              <p className="small muted" lang="tr">
                {passage.tr}
              </p>
            )}
          </div>
        )}
      </section>
      {passage.questions.map((q, qi) => {
        const s = shuffled[qi]
        const given = picked[qi]
        return (
          <section key={q.prompt} className="card stack" aria-label={`Soru ${qi + 1}`}>
            <p className="prompt-label" lang={passage.language}>
              {qi + 1}. {q.prompt}
            </p>
            <div className="options" role="group" aria-label="Seçenekler">
              {s.options.map((o, oi) => {
                const state = checked ? (oi === s.answer ? ' is-correct' : given === oi ? ' is-wrong' : ' is-dim') : ''
                return (
                  <button key={o} type="button" className={`option${state}`} aria-pressed={given === oi} disabled={checked} onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}>
                    <span className="key">{String.fromCharCode(65 + oi)}</span>
                    <span className="option-serif" lang={passage.language}>
                      {o}
                    </span>
                  </button>
                )
              })}
            </div>
            {checked && (
              <p className={`small ${given === s.answer ? 'notice' : 'cross-warn'}`} role="status">
                {given === s.answer ? 'Doğru. ' : given === null ? 'Boş bıraktın. ' : 'Yanlış. '}
                {q.why}
              </p>
            )}
          </section>
        )
      })}
      {!checked ? (
        <div className="row">
          <button type="button" className="btn btn-lg" onClick={check} disabled={picked.some((p) => p === null)}>
            Kontrol et
          </button>
        </div>
      ) : (
        <section className="card examtask-result" aria-label="Sonuç">
          <Ring value={right / passage.questions.length} size={96} stroke={9} label={`${right}/${passage.questions.length}`} doneLabel={`${right}/${passage.questions.length}`} />
          <div className="stack">
            <p>
              <strong>
                {right} / {passage.questions.length} doğru
              </strong>
            </p>
            <div className="row">
              {next && (
                <button type="button" className="btn" onClick={() => onNext(next)}>
                  Sıradaki görev
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={onBack}>
                Görevlere dön
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
