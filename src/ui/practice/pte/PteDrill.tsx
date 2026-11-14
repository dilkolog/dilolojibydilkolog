import { useEffect, useMemo, useState } from 'react'
import { db } from '../../../data/instance'
import { PTE_RULES, PTE_TASK_NAME, type PteAsq, type PteFib, type PteItem, type PtePack, type PteRa, type PteRs, type PteTask, type PteWfd } from '../../../data/pte'
import { localDate } from '../../../engine/progress'
import { percent, pteAwardKey, pteRound, pteXp, recordPteItem, recordPteRound, shareOf, type PteLog, type PteScore } from '../../../engine/pteScore'
import { Ring } from '../../home/Ring'
import { sfx } from '../../shared/sounds'
import { PteBlanks, PteBlanksAnswer, PteDictation, PteReadAloud, PteRepeat, PteShort } from './PteItems'
import type { PteAnswer, PteMode } from './pteMode'
import { PteDiff, PteFeedback } from './pteShared'

/** Writes are queued: two answers in quick succession must not read the same log and lose one. */
let writing: Promise<unknown> = Promise.resolve()
function saveAnswer(task: PteTask, id: string, score: PteScore) {
  writing = writing.then(async () => {
    const now = new Date()
    await db.savePteLog(recordPteItem(await db.getPteLog(), task, id, score, now))
    // The free-practice XP of an answer, once an item a day (see engine/pteScore). No word's schedule changes.
    const xp = pteXp(task, score)
    const day = localDate(now)
    if (xp > 0) await db.awardXp([{ key: pteAwardKey(task, id, day), day, xp }])
  })
  return writing
}
function saveRound(task: PteTask, scores: readonly PteScore[]) {
  writing = writing.then(async () => db.savePteLog(recordPteRound(await db.getPteLog(), task, scores, new Date())))
  return writing
}

/**
 * A round of one PTE-style task: a few items (never-done ones first), each scored as soon as it is answered and
 * shown with its right answer and Turkish. At the end, the round's accuracy. No 10–90 score.
 */
export function PteDrill({ task, pack, log, mode, onExit }: { task: PteTask; pack: PtePack; log: PteLog; mode: PteMode; onExit: () => void }) {
  const [seed, setSeed] = useState(0)
  // The round is chosen when the task opens (and again for a new round), not on every answer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => pteRound(task, pack[task] as PteItem[], log, PTE_RULES.roundSize), [task, pack, seed])
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<PteAnswer | null>(null)
  const [scores, setScores] = useState<PteScore[]>([])
  const [done, setDone] = useState(false)
  const item = items[step]

  useEffect(() => {
    if (done && scores.length) void saveRound(task, scores)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  // Each item (and the result) starts at the top of the page, not where the card list was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step, done, seed])

  const answered = (a: PteAnswer) => {
    setAnswer(a)
    setScores((s) => [...s, a.score])
    void saveAnswer(task, item.id, a.score)
    const share = shareOf(a.score)
    if (share >= 0.9) sfx.correct()
    else if (share >= 0.5) sfx.near()
    else sfx.wrong()
  }
  const next = () => {
    setAnswer(null)
    if (step + 1 < items.length) setStep((n) => n + 1)
    else setDone(true)
  }
  const again = () => {
    setSeed((n) => n + 1)
    setStep(0)
    setScores([])
    setAnswer(null)
    setDone(false)
  }

  const top = (
    <div className="game-top">
      <button type="button" className="link" onClick={onExit}>
        ← Sınavlar
      </button>
      <span className="small muted">
        PTE tarzı · {PTE_TASK_NAME[task]} · {mode === 'exam' ? 'Sınav modu' : 'Alıştırma modu'}
      </span>
      <span className="small muted">{done ? '' : `${step + 1} / ${items.length}`}</span>
    </div>
  )

  if (done || !item) {
    const total = { got: scores.reduce((n, s) => n + shareOf(s), 0), of: scores.length }
    return (
      <div className="stack examtask pte-drill">
        {top}
        <section className="card examtask-result" aria-label="Sonuç">
          <Ring value={shareOf(total)} size={96} stroke={9} label={`%${percent(total)}`} doneLabel={`%${percent(total)}`} />
          <div className="stack">
            <p>
              <strong>
                {PTE_TASK_NAME[task]}: %{percent(total)} doğruluk
              </strong>
              <span className="small muted"> · {scores.length} öğe</span>
            </p>
            <p className="small muted">Bu yüzde yalnızca bu görevdeki doğruluğundur; PTE puanı değildir.</p>
            <div className="row">
              <button type="button" className="btn" onClick={again}>
                Yeni tur
              </button>
              <button type="button" className="btn btn-quiet" onClick={onExit}>
                Sınavlara dön
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const key = `${task}:${item.id}:${seed}`
  const props = { mode, onAnswer: answered, onSkip: next }
  return (
    <div className="stack examtask pte-drill">
      {top}
      <section className="card stack" aria-label={PTE_TASK_NAME[task]}>
        <h2 className="section-title">{PTE_TASK_NAME[task]}</h2>
        {!answer ? (
          task === 'wfd' ? (
            <PteDictation key={key} item={item as PteWfd} {...props} />
          ) : task === 'rs' ? (
            <PteRepeat key={key} item={item as PteRs} {...props} />
          ) : task === 'ra' ? (
            <PteReadAloud key={key} item={item as PteRa} {...props} />
          ) : task === 'fib' ? (
            <PteBlanks key={key} item={item as PteFib} {...props} />
          ) : (
            <PteShort key={key} item={item as PteAsq} {...props} />
          )
        ) : (
          <PteFeedback task={task} score={answer.score} pronunciation={answer.pronunciation} tr={item.tr}>
            {task === 'fib' ? (
              <PteBlanksAnswer item={item as PteFib} chosen={answer.chosen ?? []} />
            ) : task === 'asq' ? (
              <p className="small">
                {answer.given?.trim() ? (
                  <>
                    Senin cevabın: <span lang="en">{answer.given}</span> ·{' '}
                  </>
                ) : (
                  'Cevap vermedin · '
                )}
                Doğru cevap: <strong lang="en">{(item as PteAsq).answers[0]}</strong>
              </p>
            ) : (
              <>
                {task !== 'wfd' && answer.given !== undefined && (
                  <p className="small muted">
                    Duyulan: <span lang="en">{answer.given || '—'}</span>
                  </p>
                )}
                {answer.pronunciation ? (
                  <p className="examtask-text pte-text" lang="en">
                    {(item as PteRa).text}
                  </p>
                ) : (
                  <PteDiff given={answer.given ?? ''} text={(item as PteWfd).text} />
                )}
              </>
            )}
          </PteFeedback>
        )}
        {answer && (
          <div className="row">
            <button type="button" className="btn" onClick={next} autoFocus>
              {step + 1 < items.length ? 'Devam' : 'Sonucu gör'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
