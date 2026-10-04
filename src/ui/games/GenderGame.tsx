import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrophyIcon } from '../icons'
import { createRng } from '../../engine/rng'
import { GENDER_RULES, ruleQuiz, troubleRules, type RuleQuestion } from '../../engine/genderRules'
import { db } from '../../data/instance'
import { sfx } from '../sounds'
import type { Props } from './shared'

const GENDER_ROUND = 15

/**
 * Gender rules drill: each noun is answered by its ending, then the rule (or the exception) is
 * shown. Rules behind the learner's own gender mistakes come up more often.
 */
export function GenderGame({
  language,
  vocabulary,
  mistakes = [],
  best,
  recordKey,
  onExit,
}: Props & { language: 'fr' | 'es'; best?: number; recordKey: string; onExit: () => void }) {
  const trouble = useMemo(() => troubleRules(mistakes, vocabulary).filter((t) => t.rule.language === language), [mistakes, vocabulary, language])
  const newRound = useCallback(
    () => ruleQuiz(language, GENDER_ROUND, createRng(Date.now()), trouble.map((t) => t.rule.id), vocabulary),
    [language, trouble, vocabulary],
  )
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<RuleQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<'m' | 'f' | null>(null)
  const [results, setResults] = useState<{ q: RuleQuestion; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const art = { m: language === 'fr' ? 'le' : 'el', f: 'la' }
  const q = round[index]

  const start = () => {
    setRound(newRound())
    setIndex(0)
    setResults([])
    setChosen(null)
    setRecord(false)
    setPhase('play')
  }

  const choose = (g: 'm' | 'f') => {
    if (!q || chosen) return
    const ok = g === q.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen(g)
    setResults((r) => [...r, { q, ok }])
  }

  const next = async () => {
    setChosen(null)
    if (index + 1 < round.length) return setIndex(index + 1)
    const pct = Math.round((results.filter((r) => r.ok).length / round.length) * 100)
    if (pct > (best ?? 0)) {
      await db.saveRecord(recordKey, pct)
      setRecord(true)
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play') return
      if (!chosen && (e.key === '1' || e.key === '2')) choose(e.key === '1' ? 'm' : 'f')
      else if (chosen && e.key === 'Enter') void next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rules = GENDER_RULES.filter((g) => g.language === language)
  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: %${best}` : ''}</span>
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Cinsiyet kuralları</h1>
          {trouble.length > 0 && (
            <p className="notice">
              En çok takıldığın: {trouble.slice(0, 3).map((t) => `-${t.rule.suffix} (${t.mistakes} hata)`).join(', ')}. Bu turda daha sık gelecekler.
            </p>
          )}
          <ul className="rule-list">
            {rules.map((g) => (
              <li key={g.id}>
                <span className={`rule-suffix ${g.gender}`}>-{g.suffix}</span>
                <span>
                  <strong>{g.gender === 'f' ? 'dişil' : 'eril'}</strong> <span className="small muted">{g.examples.slice(0, 3).join(', ')}</span>
                  {g.exceptions.length > 0 && <span className="small rule-exc"> · istisna: {g.exceptions.join(', ')}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus>
              {GENDER_ROUND} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">Artikeli hangisi? Kelimenin sonuna bak.</p>
          <h1 className="word" lang={language}>
            <span className="blank">____</span> {q.noun}
          </h1>
          <div className="options">
            {(['m', 'f'] as const).map((g, i) => (
              <button
                key={g}
                className={`option${chosen ? (g === q.answer ? ' is-correct' : g === chosen ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={!!chosen}
                onClick={() => choose(g)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif">{art[g]}</span>
              </button>
            ))}
          </div>
          {chosen && (
            <div className="stack">
              <p className={q.exception ? 'cross-warn' : 'small'}>
                {q.exception
                  ? `İstisna! -${q.rule.suffix} ile bitenler genelde ${q.rule.gender === 'f' ? 'dişil' : 'eril'}, ama ${art[q.answer]} ${q.noun}.`
                  : `-${q.rule.suffix} → ${q.rule.gender === 'f' ? 'dişil' : 'eril'}: ${art[q.answer]} ${q.noun}.`}
              </p>
              <div className="row">
                <button className="btn" onClick={next} autoFocus>
                  Devam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <div className="celebrate stack">
          <h1>{record && <TrophyIcon size={26} className="inline-icon record-icon" />}{record ? 'Yeni rekor!' : 'Tur bitti'}</h1>
          <p className="xp-gain">
            {round.length - missed.length} / {round.length} doğru
          </p>
          {missed.length > 0 && (
            <p className="muted">Kaçırdıkların: {missed.map((m) => `${art[m.q.answer]} ${m.q.noun}${m.q.exception ? ' (istisna)' : ''}`).join(', ')}</p>
          )}
          <div className="row justify-center">
            <button className="btn btn-lg" onClick={start} autoFocus>
              Tekrar oyna
            </button>
            <button className="btn btn-lg btn-quiet" onClick={onExit}>
              Oyunlara dön
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
