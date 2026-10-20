import { duelWinner, type DuelWinner } from './duel'
import type { TargetLanguage } from './types'

/**
 * A live duel: two friends in one room (a short code), the same questions at the same time, each seeing how
 * far the other is. The room itself is a Durable Object (worker/duelRoom.ts) that only keeps this state and
 * passes messages; every rule is here, so the browser and the room agree and the rules are tested without a server.
 * Like the duel by link it is a game between friends: the room trusts the answers a player reports.
 */

/** Where a room link opened in the app (`/?oda=CODE`) leaves its code (sessionStorage) for the duel game to pick up. */
export const ROOM_INBOX = 'diloloji:room-in'

/** A room's code: six letters and digits from the friend code's alphabet (no 0, 1, I, L, O). */
export const ROOM_CODE = /^[2-9A-HJKMNP-Z]{6}$/
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** The link that opens the app on a room. */
export const roomLink = (code: string, origin: string) => `${origin}/?oda=${code}`

/** A fresh code. `random` gives a number in [0, 1). */
export function newRoomCode(random: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('')
}

/** A typed or pasted code (lower case, a dash or a space in it) as the code itself, or null. */
export function cleanRoomCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').replace(/[\s-]/g, '').toUpperCase()
  return ROOM_CODE.test(code) ? code : null
}

export const MIN_QUESTIONS = 3
export const MAX_QUESTIONS = 10
/** A question's answer time is kept within this (ms): a stalled tab must not write an hour. */
export const MAX_ANSWER_MS = 120_000
const MAX_NAME = 20
const QUESTION_ID = /^[\w.-]{1,60}$/

export type LivePhase = 'lobby' | 'playing' | 'over'

export interface LivePlayer {
  name: string
  connected: boolean
  /** Questions answered so far. */
  answered: number
  /** Right answers so far, and the time they took in all (ms). */
  score: number
  ms: number
}

export interface RoomState {
  phase: LivePhase
  language?: TargetLanguage
  ids: string[]
  /** Slot 0 is the one who made the room (and starts the game). */
  players: LivePlayer[]
}

export const emptyRoom = (): RoomState => ({ phase: 'lobby', ids: [], players: [] })

/** What a player sends. */
export type ClientMessage =
  | { t: 'join'; name: string }
  | { t: 'start'; language: TargetLanguage; ids: string[] }
  | { t: 'answer'; i: number; ok: boolean; ms: number }
  | { t: 'again' }

/** What a player is shown of the room: the other's score and time stay hidden until the game is over. */
export interface RoomView {
  phase: LivePhase
  language?: TargetLanguage
  ids: string[]
  you: number
  players: { name: string; connected: boolean; answered: number; score?: number; ms?: number }[]
  /** Once it is over: who won, by slot (or a tie). */
  winner?: 'you' | 'them' | 'tie'
}

export type ServerMessage = { t: 'state'; room: RoomView } | { t: 'error'; reason: LiveError }

export type LiveError = 'full' | 'bad_message' | 'not_host' | 'need_two' | 'bad_questions' | 'not_playing' | 'bad_answer' | 'not_joined'

const cleanName = (raw: unknown) => (typeof raw === 'string' ? raw.replace(/[\p{Cc}<>"“”]/gu, '').trim().slice(0, MAX_NAME) : '') || 'Arkadaş'
const LANGUAGES: readonly string[] = ['en', 'fr', 'es']

type Result = { state: RoomState; slot?: number; error?: LiveError }

/** Takes a seat (a new one, or the one the same name left when its connection dropped). */
export function join(state: RoomState, rawName: unknown): Result {
  const name = cleanName(rawName)
  const same = state.players.findIndex((p) => p.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr') && !p.connected)
  if (same >= 0) return { state: { ...state, players: state.players.map((p, i) => (i === same ? { ...p, connected: true } : p)) }, slot: same }
  if (state.players.length >= 2) return { state, error: 'full' }
  return { state: { ...state, players: [...state.players, { name, connected: true, answered: 0, score: 0, ms: 0 }] }, slot: state.players.length }
}

/** A connection dropped. The seat is kept (for the same name to take again) once the game has begun. */
export function leave(state: RoomState, slot: number): RoomState {
  if (!state.players[slot]) return state
  // In the lobby the guest simply goes; the host's seat is kept so the room is still theirs.
  if (state.phase === 'lobby' && slot === 1) return { ...state, players: state.players.slice(0, 1) }
  return { ...state, players: state.players.map((p, i) => (i === slot ? { ...p, connected: false } : p)) }
}

/** The host starts (or restarts, after a game) with the questions they picked. */
export function start(state: RoomState, slot: number, language: unknown, ids: unknown): Result {
  if (slot !== 0) return { state, error: 'not_host' }
  if (state.phase === 'playing') return { state, error: 'bad_message' }
  if (state.players.length < 2 || !state.players.every((p) => p.connected)) return { state, error: 'need_two' }
  if (typeof language !== 'string' || !LANGUAGES.includes(language)) return { state, error: 'bad_message' }
  if (!Array.isArray(ids) || ids.length < MIN_QUESTIONS || ids.length > MAX_QUESTIONS || !ids.every((id) => typeof id === 'string' && QUESTION_ID.test(id)) || new Set(ids).size !== ids.length) return { state, error: 'bad_questions' }
  return {
    state: { phase: 'playing', language: language as TargetLanguage, ids: ids as string[], players: state.players.map((p) => ({ ...p, answered: 0, score: 0, ms: 0 })) },
  }
}

/** A player's answer to the next question (in order, once each). */
export function answer(state: RoomState, slot: number, i: unknown, ok: unknown, ms: unknown): Result {
  const me = state.players[slot]
  if (!me) return { state, error: 'not_joined' }
  if (state.phase !== 'playing') return { state, error: 'not_playing' }
  if (i !== me.answered || typeof ok !== 'boolean' || typeof ms !== 'number' || !Number.isFinite(ms)) return { state, error: 'bad_answer' }
  const players = state.players.map((p, k) => (k === slot ? { ...p, answered: p.answered + 1, score: p.score + (ok ? 1 : 0), ms: p.ms + Math.min(MAX_ANSWER_MS, Math.max(0, Math.round(ms))) } : p))
  const over = players.length === 2 && players.every((p) => p.answered >= state.ids.length)
  return { state: { ...state, players, phase: over ? 'over' : 'playing' } }
}

/** After a game, both go back to the lobby for another (the host picks new questions). */
export function again(state: RoomState): RoomState {
  return state.phase === 'over' ? { ...state, phase: 'lobby', ids: [], players: state.players.map((p) => ({ ...p, answered: 0, score: 0, ms: 0 })) } : state
}

/** What the player in `slot` may see. */
export function viewFor(state: RoomState, slot: number): RoomView {
  const over = state.phase === 'over'
  const players = state.players.map((p, i) => ({
    name: p.name,
    connected: p.connected,
    answered: p.answered,
    // Your own score is yours to see; the other's only once the game is over.
    ...(i === slot || over ? { score: p.score, ms: p.ms } : {}),
  }))
  let winner: RoomView['winner']
  if (over && state.players.length === 2) {
    const w: DuelWinner = duelWinner({ name: '', score: state.players[0].score, ms: state.players[0].ms }, { name: '', score: state.players[1].score, ms: state.players[1].ms })
    winner = w === 'tie' ? 'tie' : (w === 'from') === (slot === 0) ? 'you' : 'them'
  }
  return { phase: state.phase, language: state.language, ids: state.ids, you: slot, players, ...(winner ? { winner } : {}) }
}

/** One message from a player, applied to the room. The result says what to send back (an error) and the new state. */
export function handle(state: RoomState, slot: number | undefined, raw: unknown): Result {
  if (!raw || typeof raw !== 'object') return { state, error: 'bad_message' }
  const m = raw as Record<string, unknown>
  if (m.t === 'join') return slot === undefined ? join(state, m.name) : { state, slot }
  if (slot === undefined) return { state, error: 'not_joined' }
  if (m.t === 'start') return { ...start(state, slot, m.language, m.ids), slot }
  if (m.t === 'answer') return { ...answer(state, slot, m.i, m.ok, m.ms), slot }
  if (m.t === 'again') return { state: again(state), slot }
  return { state, error: 'bad_message', slot }
}
