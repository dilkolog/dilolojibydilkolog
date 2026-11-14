import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { advanceLearning, attemptMode, completeItem, currentItem, isFinished, learningSteps, MAX_RETRIES, startSession, type Session } from '../session'
import { newWordState, processAttempt, type AttemptInput } from '../review'
import { createScheduler } from '../scheduler'
import { createRng } from '../rng'
import { independentAnswer, learningDebts } from '../learningProgress'
import { stageProgress } from '../growth'
import type { UserWordState, Verdict } from '../types'
import { decision } from './fixtures'

const intro: PlanItem = { entryId: decision.id, kind: 'introduce', reason: 'new', skill: 'recognition' }

interface Step {
  /** What was on screen. */
  what: string
  /** The growth ring (stageProgress) once the step is done. */
  ring: number
  /** In-session steps while the question is on screen, and once it is answered (feedback). */
  asked?: ReturnType<typeof learningSteps>
  after: ReturnType<typeof learningSteps>
}

/**
 * One new guided word, answered as SessionScreen does: introduction, then each question graded,
 * saved with processAttempt and moved on with advanceLearning (the session's own checkpoint).
 */
function learn(verdicts: Verdict[], responseMs = 5000): Step[] {
  const scheduler = createScheduler({ fuzz: false })
  let s: Session = startSession([intro, { ...intro, kind: 'exercise', exerciseType: 'mc_meaning' }])
  let state: UserWordState | undefined
  let t = new Date('2026-11-04T12:00:00Z').getTime()
  const out: Step[] = []
  let k = 0
  while (!isFinished(s)) {
    const it = currentItem(s)!
    const at = new Date((t += 20_000))
    if (it.kind === 'introduce') {
      state = { ...newWordState(decision, at), learning: { recognition: { remaining: 0, delayed: false, at: at.toISOString(), sequence: 0 } } }
      s = completeItem(s, { entryId: it.entryId })
      out.push({ what: 'intro', ring: stageProgress(state), after: learningSteps(s, decision.id, learningDebts(state).length > 0) })
      continue
    }
    const asked = learningSteps(s, decision.id, learningDebts(state!).length > 0)
    const verdict = verdicts[k++] ?? 'correct'
    const input: AttemptInput = { exerciseType: it.exerciseType!, verdict, responseMs, hintsUsed: 0, maxHints: 0, at, guided: true, recallExpected: true, mode: attemptMode(it, 'normal', state!, { verdict, hintsUsed: 0, maxHints: 0 }) }
    state = processAttempt(state!, input, [], scheduler).state
    s = advanceLearning(s, { entryId: it.entryId, verdict, independent: independentAnswer(input), responseMs }, decision, state, createRng(1))
    out.push({ what: `${it.exerciseType} ${verdict}`, ring: stageProgress(state), asked, after: learningSteps(s, decision.id, learningDebts(state).length > 0) })
  }
  return out
}

const counts = (steps: Step[]) => steps.map((x) => x.after && `${x.after.done}/${x.after.total}${x.after.carriesOver ? ' next time' : ''}`)

describe('the growth ring during a new word’s first learning', () => {
  it('moves once, on the first meaning answer, then stands still through the bridge step and typed recall', () => {
    // A slow first answer (5 s, the meaning question's usual time is 4 s): the bridge picks the word from its meaning.
    const steps = learn([])
    expect(steps.map((x) => x.what)).toEqual(['intro', 'mc_meaning correct', 'mc_reverse correct', 'typed_translation correct'])
    // The verified finding: repetitions leave the FSRS card as it is, so the ring cannot show them.
    expect(steps.map((x) => x.ring)).toEqual([0, 0.5, 0.5, 0.5])
  })
})

describe('in-session learning steps', () => {
  it('fills step by step along the full ladder and ends complete', () => {
    const steps = learn([])
    expect(counts(steps)).toEqual(['1/4', '2/4', '3/4', '4/4'])
    // While a question is on screen, the answer is not counted yet.
    expect(steps.slice(1).map((x) => x.asked && `${x.asked.done}/${x.asked.total}`)).toEqual(['1/4', '2/4', '3/4'])
    expect(steps.at(-1)!.after?.carriesOver).toBe(false)
  })

  it('needs one step fewer when the first answer is fast and unaided (reinforcement skipped)', () => {
    const steps = learn([], 1000)
    expect(steps.map((x) => x.what)).toEqual(['intro', 'mc_meaning correct', 'typed_translation correct'])
    expect(counts(steps)).toEqual(['1/4', '2/3', '3/3'])
  })

  it('adds the retries a miss brings and never moves forward on it; once recovered the word builds itself and is typed', () => {
    const steps = learn(['wrong'])
    // bridge-v1: two recoveries, then the bridge (built from its pieces: it has just been recognised twice) and the
    // typed recall, in this session. (heuristic-v1 stopped after the recoveries and left the typed recall to next time.)
    expect(steps.map((x) => x.what)).toEqual(['intro', 'mc_meaning wrong', 'mc_meaning correct', 'mc_meaning correct', 'assemble correct', 'typed_translation correct'])
    expect(counts(steps)).toEqual(['1/4', '1/5', '2/5', '3/5', '4/5', '5/5'])
    expect(steps.at(-1)!.after?.carriesOver).toBe(false)
  })

  it('goes on to the next session when the miss is not recovered (the retries run out)', () => {
    const steps = learn(['wrong', 'wrong', 'wrong'])
    const last = steps.at(-1)!.after!
    expect(steps.some((x) => x.what.startsWith('typed_translation'))).toBe(false)
    expect(last.done).toBeLessThan(last.total)
  })

  it('never reads complete when the retry cap is reached with debt left', () => {
    const steps = learn(['wrong', 'wrong', 'wrong', 'wrong', 'wrong'])
    expect(steps).toHaveLength(2 + MAX_RETRIES)
    const last = steps.at(-1)!.after!
    expect(last.carriesOver).toBe(true)
    expect(last.done).toBeLessThan(last.total)
    // Each miss only adds to what is left; the done count never moves on a miss.
    expect(steps.slice(1).every((x) => x.after!.done === 1)).toBe(true)
  })

  it('reads complete when the debt is paid even after a miss', () => {
    // Typed recall missed, then recalled twice: nothing is owed any more.
    const steps = learn(['correct', 'correct', 'wrong'])
    const last = steps.at(-1)!.after!
    expect(last).toEqual({ done: last.total, total: last.total, carriesOver: false })
  })

  it('is only for words guided in this session', () => {
    const review: PlanItem = { entryId: decision.id, kind: 'exercise', reason: 'due', skill: 'recognition', exerciseType: 'mc_meaning' }
    expect(learningSteps(startSession([review]), decision.id)).toBeUndefined()
  })
})
