import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BLANK, buildExercise, displayForm, evaluateTyped, exerciseTypesFor, type Exercise } from '../../engine/exercises'
import { BOSS_XP, DAMAGE, findBosses, PLAYER_HEARTS, type Boss, type BossWin } from '../../engine/bosses'
import { unlockedSkills } from '../../engine/selection'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { createRng, pick } from '../../engine/rng'
import type { ExerciseType, TargetLanguage, UserWordState, VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { SAMPLE_WORDS } from '../../data/seed'
import { SpeakerIcon } from '../icons'
import { LANGUAGE_NAME, PROMPT_TEXT } from '../labels'
import { sfx } from '../sounds'
import { speak } from '../speech'
import { type Props, recordPractice } from './shared'

const BOSS_FACES = ['👹', '👺', '🐉', '🦖', '👾', '🧟', '🦑', '🐙']
const BATTLE_TYPES = new Set<ExerciseType>([
  'mc_meaning',
  'mc_context',
  'discriminate',
  'collocation_choice',
  'picture_choice',
  'listen_choose',
  'typed_translation',
  'cloze_typed',
  'listen_type',
  'article_choice',
  'conjugation',
  'word_form',
  'idiom_complete',
])
const faceOf = (id: string) => BOSS_FACES[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % BOSS_FACES.length]

/** Words that keep slipping become bosses, beaten with varied questions before losing three hearts. */
export function BossArena({ language, vocabulary, states, mistakes = [], onChanged, onExit }: Props & { onExit: () => void }) {
  const [wins, setWins] = useState<BossWin[] | null>(null)
  const [fighting, setFighting] = useState<Boss | null>(null)
  useEffect(() => {
    db.getBossWins().then(setWins)
  }, [fighting])
  const bosses = useMemo(() => (wins ? findBosses(vocabulary, states, mistakes, wins) : []), [vocabulary, states, mistakes, wins])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])

  if (fighting)
    return (
      <BossBattle
        boss={fighting}
        language={language}
        vocabulary={vocabulary}
        state={states.find((s) => s.entryId === fighting.entry.id)}
        onDone={() => {
          setFighting(null)
          onChanged()
        }}
      />
    )
  if (!wins) return null
  const beaten = wins.filter((w) => w.entryId.startsWith(`${language}:`))
  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <span />
        <span className="small muted">{beaten.length} zafer</span>
      </div>
      <h1 className="greeting">Boss savaşları</h1>
      {bosses.length === 0 ? (
        <p className="muted">Şu an boss yok: sürekli yanlış yaptığın bir kelime olmadığında burası sakin kalır. Hata yaptıkça bosslar ortaya çıkar.</p>
      ) : (
        <ul className="boss-list">
          {bosses.map((b) => (
            <li key={b.entry.id}>
              <span className="boss-face" aria-hidden>
                {faceOf(b.entry.id)}
              </span>
              <span className="boss-info">
                <strong lang={language}>{displayForm(b.entry)}</strong>
                <span className="small muted">
                  {b.wrong} yanlış · {b.hp} can{b.rematch ? ' · rövanş' : ''}
                </span>
              </span>
              <button className="btn" onClick={() => setFighting(b)}>
                Savaş
              </button>
            </li>
          ))}
        </ul>
      )}
      {beaten.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Yendiğin bosslar</h2>
          <p className="small">
            {[...new Set(beaten.map((w) => w.entryId))]
              .map((id) => byId.get(id))
              .filter((e): e is VocabularyEntry => !!e)
              .map((e) => displayForm(e))
              .join(', ')}
          </p>
        </section>
      )}
    </div>
  )
}

function BossBattle({ boss, language, vocabulary, state, onDone }: { boss: Boss; language: TargetLanguage; vocabulary: VocabularyEntry[]; state?: UserWordState; onDone: () => void }) {
  const entry = boss.entry
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const types = useMemo(() => {
    const t = unlockedSkills(state, entry)
      .flatMap((sk) => exerciseTypesFor(sk, entry))
      .filter((x) => BATTLE_TYPES.has(x))
    return t.length ? t : (['mc_meaning', 'typed_translation'] as ExerciseType[])
  }, [state, entry])
  const rng = useRef(createRng(Date.now()))
  const next = useCallback(
    (prev?: ExerciseType): Exercise => {
      const options = types.length > 1 ? types.filter((t) => t !== prev) : types
      return buildExercise(pick(options, rng.current), entry, pool, rng.current)
    },
    [types, entry, pool],
  )
  const [ex, setEx] = useState<Exercise>(() => next())
  const [hp, setHp] = useState(boss.hp)
  const [hearts, setHearts] = useState(PLAYER_HEARTS)
  const [result, setResult] = useState<{ ok: boolean; expected: string; damage: number } | null>(null)
  const [text, setText] = useState('')
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null)
  const shownAt = useRef(performance.now())
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ex.audioText) speak(ex.audioText, language, undefined, true)
  }, [ex, language])

  const settle = async (ok: boolean, expected: string, near = false) => {
    if (result || outcome) return
    void recordPractice(entry, state, ex.type, ok || near, performance.now() - shownAt.current)
    const damage = ok ? DAMAGE[ex.kind] : near ? 1 : 0
    if (ok || near) sfx.correct()
    else sfx.wrong()
    setResult({ ok: ok || near, expected, damage })
    const nextHp = Math.max(0, hp - damage)
    const nextHearts = ok || near ? hearts : hearts - 1
    setHp(nextHp)
    setHearts(nextHearts)
    if (nextHp === 0) {
      await db.addBossWin({ entryId: entry.id, at: new Date().toISOString(), wrongAtWin: state?.stats.wrong ?? boss.wrong })
      sfx.levelUp()
      setOutcome('won')
    } else if (nextHearts === 0) setOutcome('lost')
  }

  const advance = () => {
    setResult(null)
    setText('')
    setEx(next(ex.type))
    shownAt.current = performance.now()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (outcome) return
      if (result && e.key === 'Enter') return advance()
      if (!result && ex.kind === 'choice') {
        const i = Number(e.key) - 1
        if (i >= 0 && i < ex.options.length) {
          const o = ex.options[i]
          void settle(o.id === ex.correctOptionId, ex.options.find((x) => x.id === ex.correctOptionId)!.label)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const face = faceOf(entry.id)
  return (
    <div className="stack battle">
      <div className="battle-top">
        <span className="boss-face boss-face-big" aria-hidden>
          {outcome === 'won' ? '💥' : face}
        </span>
        <div className="stack" style={{ gap: '0.375rem', flex: 1 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{outcome === 'won' ? displayForm(entry) : 'Gizemli kelime'}</strong>
            <span className="hearts" aria-label={`${hearts} can`}>
              {'❤️'.repeat(hearts)}
              {'🤍'.repeat(PLAYER_HEARTS - hearts)}
            </span>
          </div>
          <div className="boss-hp" role="progressbar" aria-label="Boss canı" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={boss.hp}>
            <div style={{ width: `${(hp / boss.hp) * 100}%` }} />
          </div>
          <span className="small muted">
            {hp} / {boss.hp} can{result?.damage ? ` · -${result.damage}!` : ''}
          </span>
        </div>
      </div>

      {outcome ? (
        <div className="celebrate stack">
          <h1>{outcome === 'won' ? 'Boss yenildi! ⚔️' : 'Boss kazandı'}</h1>
          {outcome === 'won' ? (
            <p className="xp-gain">+{BOSS_XP} XP</p>
          ) : (
            <p className="muted">Bir dahaki sefere hazır ol:</p>
          )}
          <p>
            <span className="target" lang={language}>
              {displayForm(entry)}
            </span>{' '}
            = {entry.senses[0].gloss}
          </p>
          {entry.senses[0].examples[0] && (
            <p className="small muted" lang={language}>
              {entry.senses[0].examples[0].text}
            </p>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={onDone} autoFocus>
              {outcome === 'won' ? 'Zaferi topla' : 'Geri dön'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <BattlePrompt ex={ex} entry={entry} language={language} />
          {ex.kind === 'choice' ? (
            <div className="options">
              {ex.options.map((o, i) => (
                <button
                  key={o.id}
                  className={`option${result ? (o.id === ex.correctOptionId ? ' is-correct' : ' is-dim') : ''}`}
                  disabled={!!result}
                  onClick={() => settle(o.id === ex.correctOptionId, ex.options.find((x) => x.id === ex.correctOptionId)!.label)}
                >
                  <span className="key">{i + 1}</span>
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!text.trim() || result) return
                const ev = evaluateTyped(ex, text, entry, pool)
                void settle(ev.verdict === 'correct', ex.accepted[0], ev.verdict === 'near')
              }}
            >
              <input
                ref={input}
                className="answer-input"
                value={text}
                onChange={accentChange(language, setText)}
                disabled={!!result}
                autoFocus
                placeholder="Cevabını yaz"
                lang={language}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
              />
              {!result && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
            </form>
          )}
          {result && (
            <div className="row">
              <p className={result.ok ? 'notice' : 'error'}>{result.ok ? `İsabet! -${result.damage} can` : `Iska! Doğrusu: ${result.expected}`}</p>
              <button className="btn" onClick={advance} autoFocus>
                Devam
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** The question part of a battle round, in the same form as in a session. */
function BattlePrompt({ ex, entry, language }: { ex: Exercise; entry: VocabularyEntry; language: TargetLanguage }) {
  const label = PROMPT_TEXT[ex.type] ?? ''
  if (ex.audioText && (ex.type === 'listen_choose' || ex.type === 'listen_type')) {
    return (
      <div className="row">
        <button className="speak speak-big" onClick={() => speak(ex.audioText!, language, undefined, true)} aria-label="Tekrar dinle">
          <SpeakerIcon size={36} />
        </button>
        <span className="muted">{label}</span>
      </div>
    )
  }
  if (ex.type === 'article_choice')
    return (
      <h2 className="word" lang={language}>
        <span className="blank">____</span> {ex.prompt}
      </h2>
    )
  if (ex.type === 'idiom_complete')
    return (
      <div className="stack" style={{ gap: '0.25rem' }}>
        <p className="muted small">{label}</p>
        <p className="prompt-text" lang={language}>
          {ex.prompt.split(BLANK).map((part, i, all) => (
            <span key={i}>
              {part}
              {i < all.length - 1 && <span className="blank">____</span>}
            </span>
          ))}
        </p>
        <p className="muted small">{ex.context}</p>
      </div>
    )
  if (ex.context && ex.type !== 'conjugation')
    return (
      <div className="stack" style={{ gap: '0.25rem' }}>
        <p className="muted small">{label}</p>
        <p className="sentence" lang={language}>
          {ex.context.split(BLANK).map((part, i, all) => (
            <span key={i}>
              {part}
              {i < all.length - 1 && <span className="blank">____</span>}
            </span>
          ))}
        </p>
      </div>
    )
  return (
    <div className="stack" style={{ gap: '0.25rem' }}>
      <p className="muted small">{ex.type === 'typed_translation' ? `${LANGUAGE_NAME[language]} karşılığını yaz` : label}</p>
      <p className="prompt-text" lang={ex.type === 'mc_meaning' ? language : undefined}>
        {ex.type === 'mc_meaning' ? displayForm(entry) : ex.prompt}
      </p>
      {ex.type === 'conjugation' && <p className="muted small">{ex.context}</p>}
    </div>
  )
}
