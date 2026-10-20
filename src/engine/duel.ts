import type { GrammarExercise } from './grammar'
import { createRng, shuffle, type Rng } from './rng'
import { TARGET_LANGUAGES, type TargetLanguage } from './types'

/**
 * A duel with a friend, without a server: ten grammar questions picked by the challenger travel in a
 * link together with the challenger's score. The friend plays the same questions in the same order
 * (options shuffled the same way) and sees the two results side by side; their own result goes back
 * in a link the same way. Nothing is stored anywhere but in the link, so a duel needs no account
 * (and can be bent by whoever edits the link: it is a game between friends).
 */
export const DUEL_ROUNDS = 10

/** Where a duel link opened in the app leaves its code (sessionStorage) for the game to pick up. */
export const DUEL_INBOX = 'diloloji:duel-in'

export interface DuelResult {
  name: string
  /** Right answers. */
  score: number
  /** Thinking time over all the questions, milliseconds. */
  ms: number
}

export interface DuelChallenge {
  language: TargetLanguage
  /** The questions, by id. */
  ids: string[]
  /** The challenger. */
  from: DuelResult
  /** The friend who played it, once they have. */
  reply?: DuelResult
}

/** What a duel may be narrowed to: one topic, one level. */
export interface DuelFilter {
  topic?: string
  level?: GrammarExercise['level']
}

/** The A1–A2 basics are for the lesson's own practice: a duel with no level chosen is made of B1 and up. */
const BASIC_LEVELS = new Set<GrammarExercise['level']>(['A1', 'A2'])

/** The questions a duel can be made from. */
export const duelPool = (pool: readonly GrammarExercise[], filter: DuelFilter = {}) =>
  pool.filter((e) => e.type === 'choice' && (e.options?.length ?? 0) >= 3 && (!filter.topic || e.topic === filter.topic) && (filter.level ? e.level === filter.level : !BASIC_LEVELS.has(e.level)))

/** Ten different questions: choice questions only, one per topic first so a duel is not ten of the same rule. */
export function pickDuelIds(pool: readonly GrammarExercise[], rng: Rng, count = DUEL_ROUNDS, filter: DuelFilter = {}): string[] {
  const choices = shuffle(duelPool(pool, filter), rng)
  const seen = new Set<string>()
  const firsts = choices.filter((e) => !seen.has(e.topic) && !!seen.add(e.topic))
  const rest = choices.filter((e) => !firsts.includes(e))
  return [...firsts, ...rest].slice(0, count).map((e) => e.id)
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** The options in the order both players see them (a function of the question's id). */
export const duelOptions = (ex: GrammarExercise): string[] => shuffle(ex.options ?? [], createRng(hash(ex.id)))

/** The questions of a challenge found in `pool`, in order (one a newer version dropped is skipped). */
export function duelQuestions(challenge: DuelChallenge, pool: readonly GrammarExercise[]): GrammarExercise[] {
  const byId = new Map(pool.map((e) => [e.id, e]))
  return challenge.ids.flatMap((id) => {
    const ex = byId.get(id)
    return ex && ex.type === 'choice' && ex.options?.includes(ex.answer) ? [ex] : []
  })
}

export type DuelWinner = 'from' | 'reply' | 'tie'

/** More right answers wins; the same number, the one who took less time. */
export function duelWinner(from: DuelResult, reply: DuelResult): DuelWinner {
  if (from.score !== reply.score) return from.score > reply.score ? 'from' : 'reply'
  if (from.ms === reply.ms) return 'tie'
  return from.ms < reply.ms ? 'from' : 'reply'
}

const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\p{Cc}<>]/gu, '').trim().slice(0, max) : '')

const result = (raw: unknown): DuelResult | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = text(r.n, 24)
  return name ? { name, score: int(r.s, 50), ms: int(r.t, 3_600_000) } : null
}

const ID = /^[a-z]{2}-[A-Za-z0-9_.-]{1,60}$/

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64 = (code: string) => {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** The challenge as the short code that goes in a link. */
export function encodeDuel(c: DuelChallenge): string {
  const pack = (r: DuelResult) => ({ n: r.name, s: r.score, t: r.ms })
  return b64(JSON.stringify({ v: 1, l: c.language, q: c.ids, f: pack(c.from), ...(c.reply ? { r: pack(c.reply) } : {}) }))
}

/** A code, or a whole link that carries one (?duel=…), read back; null when it is not a duel. */
export function decodeDuel(input: string): DuelChallenge | null {
  try {
    let code = input.trim()
    const at = code.indexOf('duel=')
    if (at >= 0) code = code.slice(at + 5).split(/[&#\s]/)[0]
    if (!code) return null
    const raw = JSON.parse(unb64(code)) as Record<string, unknown>
    if (raw.v !== 1 || !(TARGET_LANGUAGES as readonly string[]).includes(raw.l as string) || !Array.isArray(raw.q)) return null
    const ids = raw.q.filter((x): x is string => typeof x === 'string' && ID.test(x)).slice(0, DUEL_ROUNDS)
    const from = result(raw.f)
    if (!ids.length || !from) return null
    const reply = result(raw.r)
    return { language: raw.l as TargetLanguage, ids, from, ...(reply ? { reply } : {}) }
  } catch {
    return null
  }
}

/** "8/10 · 41 sn" */
export const duelLine = (r: DuelResult, of: number) => `${r.score}/${of} · ${Math.round(r.ms / 1000)} sn`
