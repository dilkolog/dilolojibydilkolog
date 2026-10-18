import { LessonLink } from '../LessonLink'
import { useEffect, useState } from 'react'
import { GameResult } from './GameResult'
import type { GrammarLog } from '../../engine/grammar'
import { REGISTER_NAME, REGISTER_ROUND, registerRound, type Register, type RegisterQuestion } from '../../engine/register'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { registerItems } from '../../data/register'
import { SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'

import { isPctRecord } from './shared'

const note = noteIn(() => db.getRegisterLog(), (log) => db.saveRegisterLog(log))

const REGISTER_TIERS: Record<Register, { emoji: string; title: string; hint: string }> = {
  informal: { emoji: '💬', title: 'Sokak / Günlük', hint: 'Arkadaş ortamı, mesajlaşma, argo' },
  standard: { emoji: '🎙️', title: 'Standart', hint: 'Günlük hayat, mağaza, tanımadığın biri' },
  formal: { emoji: '👔', title: 'Resmî / Kurumsal', hint: 'İş mülakatı, resmî e-posta, kurumlar' },
}

const REGISTER_PREVIEWS: Record<TargetLanguage, { informal: string; standard: string; formal: string; tr: string }> = {
  fr: { informal: 'la bouffe', standard: 'la nourriture', formal: 'les mets', tr: 'yemek / yiyecek' },
  es: { informal: 'la pasta', standard: 'el dinero', formal: 'los fondos', tr: 'para' },
  en: { informal: 'booze', standard: 'alcohol', formal: 'alcoholic beverages', tr: 'alkol / içki' },
}

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

  const recordKey = `register:${language}`
  const [best, setBest] = useState<number | undefined>(undefined)
  const [record, setRecord] = useState(false)

  useEffect(() => {
    void db.getRecords().then((r) => setBest(r[recordKey]))
  }, [recordKey])

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
    setRecord(false)
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

  const next = async () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setGiven(null)
      return
    }
    const correctCount = round.length - missed.length
    const pct = Math.round((correctCount / round.length) * 100)
    if (isPctRecord(pct, best)) {
      await db.saveRecord(recordKey, pct)
      setRecord(best !== undefined)
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
        void next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)
  const nameOf = (q: RegisterQuestion, text: string) => REGISTER_NAME[(['informal', 'standard', 'formal'] as const).find((r) => q.item[r] === text)!]
  const preview = REGISTER_PREVIEWS[language]

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
        <div className="card register-card stack gap-2">
          <h1 className="greeting">Kayıt farkı</h1>
          <p className="muted">
            Aynı şey {LANGUAGE_NAME[language]} üç ortamda üç türlü söylenir: sokakta, standart ve resmî. Bir durum ve bir düşünce görürsün; o ortama uyan söyleyişi seçersin. Doğru kelimeyi yanlış yerde kullanmamak için.
          </p>

          {preview && (
            <div className="register-preview-card stack gap-1">
              <span className="small muted">Örnek dil düzeyi merdiveni ({preview.tr}):</span>
              <div className="row flex-wrap gap-2 items-center">
                <span className="chip chip-sm">💬 {preview.informal} <span className="muted">(sokak)</span></span>
                <span className="muted">→</span>
                <span className="chip chip-sm">🎙️ {preview.standard} <span className="muted">(standart)</span></span>
                <span className="muted">→</span>
                <span className="chip chip-sm">👔 {preview.formal} <span className="muted">(resmî)</span></span>
              </div>
            </div>
          )}

          <p className="small muted">{total} düşünce, her biri üç ortamda.</p>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!log || total === 0}>
              {Math.min(REGISTER_ROUND, total)} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="card register-card stack gap-2">
          <div className="register-situation-banner">
            <span aria-hidden="true">{REGISTER_TIERS[q.register].emoji}</span>
            <p className="prompt-label" style={{ margin: 0 }}>{q.situation}</p>
          </div>
          <div className="stack gap-1">
            <span className="small muted">İfade etmek istediğin düşünce:</span>
            <h1 className="word" lang="tr">
              “{q.item.tr}” demek istiyorsun
            </h1>
          </div>
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
            <div className="stack gap-2" role="status">
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
              <div className="stack gap-1">
                <span className="small muted">Üç düzeyin karşılaştırması:</span>
                <ul className="register-ladder small" aria-label="Sosyal dil düzeyleri">
                  {(['informal', 'standard', 'formal'] as const).map((r) => {
                    const isTarget = r === q.register
                    const isWrongPick = given !== q.answer && q.item[r] === given
                    const tierMeta = REGISTER_TIERS[r]
                    return (
                      <li
                        key={r}
                        className={`register-tier-item${isTarget ? ' is-target' : ''}${isWrongPick ? ' is-wrong-pick' : ''}`}
                      >
                        <div className="register-tier-head">
                          <span className="register-tier-title">
                            <span aria-hidden="true">{tierMeta.emoji}</span> <strong>{tierMeta.title}</strong>
                          </span>
                          {isTarget && <span className="chip chip-sm register-target-badge">🎯 Hedef ton</span>}
                          {isWrongPick && <span className="chip chip-sm register-wrong-badge">⚠️ Seçtiğin</span>}
                        </div>
                        <div className="register-tier-body">
                          <span className="register-tier-text" lang={language}>
                            {q.item[r]}
                          </span>
                          {canSpeak() && (
                            <button
                              type="button"
                              className="icon-btn icon-btn-sm"
                              aria-label={`${q.item[r]} dinle`}
                              onClick={() => speak(q.item[r], language)}
                            >
                              <SpeakerIcon size={14} />
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
              {q.item.note && <p className="small muted">{q.item.note}</p>}
              <div className="row">
                <button type="button" className="btn" onClick={() => void next()} autoFocus>
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
          record={record}
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
