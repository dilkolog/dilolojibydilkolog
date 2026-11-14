import type { PteAsq, PteBlank, PteTask } from '../data/pte'
import { normalize, stripDiacritics } from './answerCheck'
import { xpForAnswer } from './gamification'
import { timeOf, type ExerciseType, type Verdict } from './types'
import { diffScore, wordDiff } from './wordDiff'

/** Points of one answer: `got` of `of`. The share (got / of) is all the screen shows; no 10–90 score is worked out. */
export interface PteScore {
  got: number
  of: number
}

export const shareOf = (s: PteScore): number => (s.of > 0 ? Math.min(1, Math.max(0, s.got / s.of)) : 0)
export const percent = (s: PteScore): number => Math.round(shareOf(s) * 100)

const wordsIn = (text: string) => text.split(/\s+/).filter(Boolean)

/** Write from dictation: the words of the sentence written (the dictation games' own comparison; an accent slip counts). */
export function scoreDictation(given: string, text: string): PteScore {
  if (!given.trim()) return { got: 0, of: wordsIn(text).length }
  const { right, total } = diffScore(wordDiff(given, text))
  return { got: right, of: total }
}

/** Read aloud by recognition: how much of the text's words were said, in order (the same comparison). */
export const scoreSpoken = scoreDictation

/**
 * Repeat sentence, content only (0–3, as the exam scores it): 3 every word in order with nothing replaced, left out or
 * put in between; 2 at least half of the words in order; 1 fewer than half; 0 none. Words before the sentence starts
 * or after it ends do not count against it.
 */
export function scoreRepeat(said: string, text: string): PteScore {
  if (!said.trim()) return { got: 0, of: 3 }
  const parts = wordDiff(said, text)
  let from = 0
  let to = parts.length
  while (from < to && parts[from].status === 'extra') from++
  while (to > from && parts[to - 1].status === 'extra') to--
  const inner = parts.slice(from, to)
  const { right, total } = diffScore(parts)
  const share = total ? right / total : 0
  const all = share === 1 && !inner.some((p) => p.status === 'extra')
  return { got: all ? 3 : share >= 0.5 ? 2 : share > 0 ? 1 : 0, of: 3 }
}

/** Read aloud: the pronunciation check's score when it ran (0–100), otherwise the words said. */
export function scoreReadAloud(text: string, said: { pronunciation?: number; heard?: string }): PteScore {
  if (said.pronunciation !== undefined && Number.isFinite(said.pronunciation)) return { got: Math.round(Math.min(100, Math.max(0, said.pronunciation))), of: 100 }
  return scoreSpoken(said.heard ?? '', text)
}

/** Fill in the blanks: a point for each blank with its answer chosen. */
export function scoreBlanks(chosen: readonly (string | undefined)[], blanks: readonly PteBlank[]): PteScore {
  return { got: blanks.filter((b, i) => chosen[i] === b.answer).length, of: blanks.length }
}

/** An answer as compared: case, punctuation, accents, an article in front and spaces do not matter. */
const answerForm = (s: string) =>
  stripDiacritics(normalize(s))
    .replace(/^(?:a|an|the)\s+/, '')
    .replace(/[^\p{L}\p{N}' ]/gu, '')
    .trim()

/**
 * Answer short question: right when one of the item's answers is said, alone or within a few words ("it's a bedroom");
 * whole words only, so "seventeen" is not "seven". Extra words earn nothing more, as on the exam.
 */
export function scoreShortAnswer(given: string, item: Pick<PteAsq, 'answers'>): PteScore {
  const said = ` ${answerForm(given)} `
  return { got: said.trim() && item.answers.some((a) => answerForm(a) && said.includes(` ${answerForm(a)} `)) ? 1 : 0, of: 1 }
}

// ---------------------------------------------------------------------------
// What was done: kept on the device, in the backup and the sync (next to the exam-style tasks' log).

export interface PteItemRecord extends PteScore {
  /** When it was last answered (ISO). */
  at: string
  tries: number
}
export interface PteRoundRecord extends PteScore {
  at: string
  /** Items answered in the round. */
  items: number
}
export interface PteLog {
  /** Per item (`task:id`), its last answer. */
  items: Record<string, PteItemRecord>
  /** Per task, its last round. */
  rounds: Partial<Record<PteTask, PteRoundRecord>>
}

export const emptyPteLog = (): PteLog => ({ items: {}, rounds: {} })
export const pteKey = (task: PteTask, id: string) => `${task}:${id}`

export function recordPteItem(log: PteLog, task: PteTask, id: string, score: PteScore, now: Date): PteLog {
  const key = pteKey(task, id)
  return { ...log, items: { ...log.items, [key]: { got: score.got, of: score.of, at: now.toISOString(), tries: (log.items[key]?.tries ?? 0) + 1 } } }
}

export function recordPteRound(log: PteLog, task: PteTask, scores: readonly PteScore[], now: Date): PteLog {
  if (!scores.length) return log
  const got = scores.reduce((n, s) => n + shareOf(s), 0)
  // Each item weighs the same (a 100-point read aloud is one item, as a 1-point short question is).
  return { ...log, rounds: { ...log.rounds, [task]: { got: Math.round(got * 100) / 100, of: scores.length, at: now.toISOString(), items: scores.length } } }
}

const isScore = (v: unknown): v is PteScore & { at: string } => {
  const r = v as Record<string, unknown> | null
  return !!r && typeof r.got === 'number' && typeof r.of === 'number' && Number.isFinite(r.got) && Number.isFinite(r.of) && r.of > 0 && r.got >= 0 && r.got <= r.of && typeof r.at === 'string'
}
const TASK_KEYS = new Set<string>(['wfd', 'rs', 'ra', 'fib', 'asq'])

/** Only well-formed records survive (a damaged or hand-edited backup). */
export function cleanPteLog(raw: unknown): PteLog {
  const r = raw as { items?: unknown; rounds?: unknown } | null
  const out = emptyPteLog()
  if (r?.items && typeof r.items === 'object') {
    for (const [k, v] of Object.entries(r.items)) {
      if (TASK_KEYS.has(k.split(':')[0]) && isScore(v)) out.items[k] = { got: v.got, of: v.of, at: v.at, tries: Math.max(1, Math.round(Number((v as { tries?: unknown }).tries) || 1)) }
    }
  }
  if (r?.rounds && typeof r.rounds === 'object') {
    for (const [k, v] of Object.entries(r.rounds)) {
      if (TASK_KEYS.has(k) && isScore(v)) out.rounds[k as PteTask] = { got: v.got, of: v.of, at: v.at, items: Math.max(1, Math.round(Number((v as { items?: unknown }).items) || v.of)) }
    }
  }
  return out
}

const later = <T extends { at: string }>(a: T | undefined, b: T | undefined): T | undefined => (!a ? b : !b ? a : timeOf(b.at) > timeOf(a.at) ? b : a)

/** Two devices' logs: per item and per task the later answer, and the larger count of tries. */
export function mergePteLogs(a: PteLog | undefined, b: PteLog | undefined): PteLog {
  const x = cleanPteLog(a)
  const y = cleanPteLog(b)
  const items: PteLog['items'] = { ...x.items }
  for (const [k, v] of Object.entries(y.items)) {
    const pick = later(items[k], v)!
    items[k] = { ...pick, tries: Math.max(items[k]?.tries ?? 0, v.tries) }
  }
  const rounds: PteLog['rounds'] = { ...x.rounds }
  for (const [k, v] of Object.entries(y.rounds) as [PteTask, PteRoundRecord][]) rounds[k] = later(rounds[k], v)
  return { items, rounds }
}

/** A task's card: how many of its items were done, and the last round's accuracy (undefined before the first round). */
export function pteTaskSummary(task: PteTask, items: readonly { id: string }[], log: PteLog): { done: number; total: number; last?: number; at?: string } {
  const done = items.filter((i) => log.items[pteKey(task, i.id)]).length
  const round = log.rounds[task]
  return { done, total: items.length, ...(round ? { last: percent(round), at: round.at } : {}) }
}

/** The next round: never-done items first (in the content's order), then the ones done longest ago. */
export function pteRound<T extends { id: string }>(task: PteTask, items: readonly T[], log: PteLog, size: number): T[] {
  const when = (i: T) => {
    const r = log.items[pteKey(task, i.id)]
    return r ? timeOf(r.at) : -1
  }
  return items
    .map((item, order) => ({ item, order, at: when(item) }))
    .sort((a, b) => a.at - b.at || a.order - b.order)
    .slice(0, Math.max(1, size))
    .map((x) => x.item)
}

// ---------------------------------------------------------------------------
// XP: the free-practice rule of the answers (practice mode: a right answer is worth 0.3 of its exercise, a wrong one
// nothing), once per item a day. No word's schedule (FSRS) is touched.

/** The exercise each task is scored like. */
const LIKE: Record<PteTask, ExerciseType> = { wfd: 'dictation', rs: 'speak_word', ra: 'speak_word', fib: 'cloze_typed', asq: 'listen_type' }

/** An answer's share as a verdict: most of it right, about half, or less. */
export const pteVerdict = (s: PteScore): Verdict => (shareOf(s) >= 0.9 ? 'correct' : shareOf(s) >= 0.5 ? 'near' : 'wrong')

export function pteXp(task: PteTask, score: PteScore): number {
  return xpForAnswer({ exerciseType: LIKE[task], verdict: pteVerdict(score), hintsUsed: 0, responseMs: Number.MAX_SAFE_INTEGER, mode: 'practice', combo: 0 })
}

/** The XP ledger key of an item answered on a day: the same item pays once a day. */
export const pteAwardKey = (task: PteTask, id: string, day: string) => `pte|${task}|${id}|${day}`
