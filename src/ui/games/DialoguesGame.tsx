import { useEffect, useMemo, useState } from 'react'
import { dialogueOrder, recordDialogue, type Dialogue, type DialogueLevel, type DialogueScores } from '../../engine/dialogues'
import type { TargetLanguage } from '../../engine/types'
import { dialogues } from '../../data/dialogues'
import { BulbIcon, SpeakerIcon } from '../icons'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { GameResult } from './GameResult'

const LEVELS: DialogueLevel[] = ['A1', 'A2', 'B1', 'B2']
/** "in French" with Turkish vowel harmony (İngilizce → İngilizcede). */
const IN_LANGUAGE: Record<TargetLanguage, string> = { fr: 'Fransızcada', es: 'İspanyolcada', en: 'İngilizcede' }
const scoresKey = (language: TargetLanguage) => `diloloji:dialogues:${language}`

function loadScores(language: TargetLanguage): DialogueScores {
  try {
    const raw = JSON.parse(localStorage.getItem(scoresKey(language)) ?? '{}') as unknown
    if (!raw || typeof raw !== 'object') return {}
    // Only shares 0–1: a bad value (an old or synced copy) would show %NaN and upset the order.
    return Object.fromEntries(Object.entries(raw).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= 0 && e[1] <= 1))
  } catch {
    return {}
  }
}
function saveScores(language: TargetLanguage, scores: DialogueScores) {
  try {
    localStorage.setItem(scoresKey(language), JSON.stringify(scores))
  } catch {
    // Not kept.
  }
}

/**
 * Everyday dialogues: pick one (a café, a hotel, the doctor…), and at each turn choose the fitting reply of three. The
 * best result of each is kept on the device (and goes with the account as a device preference).
 */
export function DialoguesGame({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [scores, setScores] = useState(() => loadScores(language))
  const [level, setLevel] = useState<DialogueLevel | ''>('')
  const [open, setOpen] = useState<Dialogue | null>(null)
  const list = useMemo(() => dialogueOrder(dialogues, scores, language, level || undefined), [scores, language, level])

  if (open)
    return (
      <Conversation
        key={open.id}
        dialogue={open}
        onDone={(share) => {
          const next = recordDialogue(scores, open.id, share)
          setScores(next)
          saveScores(language, next)
        }}
        onBack={() => setOpen(null)}
      />
    )

  return (
    <div className="stack examtask">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <span className="small muted" />
        <span className="small muted" />
      </div>
      <h1 className="greeting">Diyaloglar</h1>
      <p className="muted">
        {IN_LANGUAGE[language]} gündelik konuşmalar: kafede, otelde, doktorda, telefonda. Karşındaki konuşur, sen üç cevaptan uygun olanı seçersin; her cevapta neden o olduğunu ve öbürünün neden olmadığını görürsün. İnternet ve YZ gerekmez.
      </p>
      <div className="choice-row" role="group" aria-label="Seviye">
        <button type="button" className="chip" aria-pressed={level === ''} onClick={() => setLevel('')}>
          Hepsi
        </button>
        {LEVELS.filter((l) => dialogues.some((d) => d.language === language && d.level === l)).map((l) => (
          <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>
      <ul className="plain stack examtask-list">
        {list.map((d) => (
          <li key={d.id}>
            <button type="button" className="card examtask-item" onClick={() => setOpen(d)}>
              <span className="examtask-level">{d.level}</span>
              <span className="examtask-title">
                <strong>{d.title}</strong>
                <span className="small muted">
                  {d.scene}
                  {scores[d.id] !== undefined ? ` · en iyi sonuç %${Math.round(scores[d.id]! * 100)}` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="muted">Bu seviyede diyalog yok.</p>}
    </div>
  )
}

/** One dialogue, turn by turn: the other person's line (heard and read), three replies, then why. */
function Conversation({ dialogue, onDone, onBack }: { dialogue: Dialogue; onDone: (share: number) => void; onBack: () => void }) {
  const { language, turns } = dialogue
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [right, setRight] = useState<boolean[]>([])
  const [showTr, setShowTr] = useState(false)
  const [over, setOver] = useState(false)
  const turn = turns[index]

  // The other person's line is heard as it comes.
  useEffect(() => {
    if (!over && turn && canSpeak()) speak(turn.say, language)
  }, [turn, over, language])

  const choose = (i: number) => {
    if (chosen !== null || !turn) return
    const ok = i === turn.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen(i)
    setRight((r) => [...r, ok])
  }

  const next = () => {
    if (chosen === null) return
    if (index + 1 < turns.length) {
      setIndex(index + 1)
      setChosen(null)
      return
    }
    onDone(right.filter(Boolean).length / turns.length)
    setOver(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (over || !turn || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable)) return
      const n = Number(e.key)
      if (chosen === null && n >= 1 && n <= 3) choose(n - 1)
      else if (chosen !== null && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (over) {
    const missed = turns.filter((_, i) => !right[i])
    return (
      <GameResult
        title={dialogue.title}
        headline={`${turns.length - missed.length} / ${turns.length} uygun cevap`}
        accuracy={(turns.length - missed.length) / turns.length}
        missed={missed.map((t) => t.options[t.answer])}
        missedLabel="Doğru cevaplar"
        language={language}
        onAgain={() => {
          setIndex(0)
          setChosen(null)
          setRight([])
          setOver(false)
        }}
        onExit={onBack}
      />
    )
  }

  // What was said so far: each finished turn, the other person's line and the right reply.
  const done = turns.slice(0, chosen === null ? index : index + 1)
  return (
    <div className="stack dialogue-game">
      <div className="game-top">
        <button className="link" onClick={onBack}>
          ← Diyaloglar
        </button>
        <span className="game-timer">
          {index + 1} / {turns.length}
        </span>
        <button type="button" className="link small" aria-pressed={showTr} onClick={() => setShowTr(!showTr)}>
          {showTr ? 'Türkçesini gizle' : 'Türkçesini göster'}
        </button>
      </div>
      <p className="small muted">{dialogue.scene}</p>
      <ol className="plain dialogue-lines" aria-label="Konuşma">
        {turns.slice(0, index + 1).map((t, i) => (
          <li key={i} className="stack dialogue-pair">
            <div className="dialogue-line dialogue-other">
              <span lang={language}>{t.say}</span>
              {canSpeak() && (
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(t.say, language)}>
                  <SpeakerIcon size={15} />
                </button>
              )}
              {(showTr || i < index || chosen !== null) && <span className="small muted dialogue-tr">{t.tr}</span>}
            </div>
            {i < done.length && (
              <div className="dialogue-line dialogue-you">
                <span lang={language}>{t.options[t.answer]}</span>
                {(showTr || i < index || chosen !== null) && <span className="small muted dialogue-tr">{t.replyTr}</span>}
              </div>
            )}
          </li>
        ))}
      </ol>
      {turn && (
        <>
          <div className="options" role="group" aria-label="Cevabın">
            {turn.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${chosen !== null ? (i === turn.answer ? ' is-correct' : chosen === i ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={chosen !== null}
                onClick={() => choose(i)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          {chosen !== null && (
            <div className="stack" role="status">
              <div className={`formative-tip${chosen === turn.answer ? '' : ' formative-warning'}`}>
                <div className="formative-tip-head">
                  <BulbIcon size={14} /> <strong>{chosen === turn.answer ? 'Uygun cevap' : 'Bu cevap uymaz'}</strong>
                </div>
                <p className="small">{turn.why}</p>
              </div>
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  {index + 1 < turns.length ? 'Devam' : 'Sonucu gör'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
