import { useEffect, useMemo, useState } from 'react'
import { displayForm } from '../../engine/exercises'
import { pickGameWords } from '../../engine/practice'
import { createRng, shuffle } from '../../engine/rng'
import { db } from '../../data/instance'
import { sfx } from '../sounds'
import { type Props, recordPractice, fmt } from './shared'

interface Tile {
  id: string
  entryId: string
  label: string
  side: 'word' | 'meaning'
}

const PAIRS = 6
const MISMATCH_PENALTY_MS = 1000

/** Match six words to their meanings as fast as possible; a wrong pair costs a second. */
export function MatchGame({ language, vocabulary, states, best, recordKey, onExit, onChanged }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const [round, setRound] = useState(0)
  const words = useMemo(() => pickGameWords(vocabulary, states, PAIRS, createRng(Date.now() + round)), [vocabulary, states, round])
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        words.flatMap((w) => [
          { id: `${w.id}:w`, entryId: w.id, label: displayForm(w), side: 'word' as const },
          { id: `${w.id}:m`, entryId: w.id, label: w.senses[0].gloss, side: 'meaning' as const },
        ]),
        createRng(Date.now() + round + 7),
      ),
    [words, round],
  )
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const [selected, setSelected] = useState<Tile | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string[]>([])
  const [start, setStart] = useState<number | null>(null)
  const [penalty, setPenalty] = useState(0)
  const [now, setNow] = useState(0)
  const [done, setDone] = useState<{ ms: number; record: boolean } | null>(null)

  useEffect(() => {
    if (start === null || done) return
    const t = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(t)
  }, [start, done])

  const elapsed = start === null ? 0 : (done ? done.ms : now - start + penalty)

  const click = async (t: Tile) => {
    if (done || matched.has(t.entryId)) return
    const s = start ?? performance.now()
    if (start === null) setStart(s)
    if (!selected || selected.side === t.side) return setSelected(t)
    if (selected.entryId === t.entryId) {
      sfx.correct()
      const next = new Set(matched).add(t.entryId)
      setMatched(next)
      setSelected(null)
      const entry = vocabulary.find((v) => v.id === t.entryId)!
      void recordPractice(entry, stateById.get(entry.id), 'mc_meaning', true, 2000)
      if (next.size === words.length) {
        const ms = performance.now() - s + penalty
        const record = !best || ms < best
        if (record) await db.saveRecord(recordKey, Math.round(ms))
        setDone({ ms, record })
        sfx.levelUp()
        onChanged()
      }
    } else {
      sfx.wrong()
      setPenalty((x) => x + MISMATCH_PENALTY_MS)
      setWrong([selected.id, t.id])
      setSelected(null)
      setTimeout(() => setWrong([]), 400)
    }
  }

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <span className="game-timer">{fmt(elapsed)}</span>
        <span className="small muted">{best ? `Rekor: ${fmt(best)}` : ''}</span>
      </div>
      {done ? (
        <div className="celebrate stack">
          <h1>{done.record ? 'Yeni rekor! 🏆' : 'Tamamlandı!'}</h1>
          <p className="xp-gain">{fmt(done.ms)}</p>
          {penalty > 0 && <p className="muted">{penalty / 1000} saniyesi yanlış eşleşme cezası.</p>}
          <div className="row justify-center">
            <button
              className="btn btn-lg"
              onClick={() => {
                setRound((r) => r + 1)
                setMatched(new Set())
                setStart(null)
                setPenalty(0)
                setDone(null)
              }}
              autoFocus
            >
              Tekrar oyna
            </button>
            <button className="btn btn-lg btn-quiet" onClick={onExit}>
              Oyunlara dön
            </button>
          </div>
        </div>
      ) : (
        <div className="match-grid" lang={language}>
          {tiles.map((t) => (
            <button
              key={t.id}
              className={`match-tile ${t.side}${selected?.id === t.id ? ' is-selected' : ''}${matched.has(t.entryId) ? ' is-matched' : ''}${wrong.includes(t.id) ? ' is-wrong' : ''}`}
              onClick={() => click(t)}
              disabled={matched.has(t.entryId)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
