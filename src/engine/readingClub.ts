import type { TargetLanguage } from './types'

/**
 * A reading club: a few friends in one room (a short code, the live duel's rooms) read the same text and see which
 * words the others looked up. The one who opens the room brings the text; whoever joins gets it. The room only keeps
 * this state in memory and passes messages (worker/duelRoom.ts); every rule is here and tested without a server.
 */

/** Where a club link opened in the app (`/?kulup=CODE`) leaves its code (sessionStorage) for the reader to pick up. */
export const CLUB_INBOX = 'diloloji:club-in'

/** The link that opens the app on a club. */
export const clubLink = (code: string, origin: string) => `${origin}/?kulup=${code}`

export const MAX_READERS = 4
/** A text longer than this is not brought into a room (a chapter, not a book). */
export const MAX_CLUB_TEXT = 30_000
const MAX_TITLE = 120
const MAX_NAME = 20
/** Words one reader can have looked up in a text. */
export const MAX_LOOKS = 400
/** A word as the reader keys it: letters, marks, an apostrophe or a hyphen; short. */
const LOOK_KEY = /^[\p{L}\p{M}'’-]{1,40}$/u
const LANGUAGES: readonly string[] = ['en', 'fr', 'es']

export interface ClubText {
  language: TargetLanguage
  title: string
  body: string
}

export interface ClubReader {
  name: string
  connected: boolean
  /** The words this reader looked up, in the order they did. */
  looks: string[]
}

export interface ClubState {
  text?: ClubText
  /** Slot 0 opened the room and brings the text. */
  readers: ClubReader[]
}

export const emptyClub = (): ClubState => ({ readers: [] })

export type ClubMessage = { t: 'join'; name: string } | { t: 'share'; text: ClubText } | { t: 'look'; key: string }

export type ClubError = 'full' | 'bad_message' | 'not_host' | 'bad_text' | 'no_text' | 'bad_look' | 'not_joined'

/** What a reader sees: the text and everyone's looked-up words (there is nothing to hide in reading together). */
export interface ClubView {
  you: number
  text?: ClubText
  readers: ClubReader[]
}

export type ClubServerMessage = { t: 'state'; room: ClubView } | { t: 'error'; reason: ClubError }

type Result = { state: ClubState; slot?: number; error?: ClubError }

const cleanName = (raw: unknown) => (typeof raw === 'string' ? raw.replace(/[\p{Cc}<>"“”]/gu, '').trim().slice(0, MAX_NAME) : '') || 'Arkadaş'

/** A text brought into a room, or null when it is not one: a known language, a title and a body within the limits. */
export function cleanClubText(raw: unknown): ClubText | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.language !== 'string' || !LANGUAGES.includes(t.language)) return null
  if (typeof t.body !== 'string' || typeof t.title !== 'string') return null
  const body = t.body.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\n\t]/gu, '').trim()
  const title = t.title.replace(/[\p{Cc}<>]/gu, '').trim().slice(0, MAX_TITLE)
  if (body.length < 20 || body.length > MAX_CLUB_TEXT) return null
  return { language: t.language as TargetLanguage, title: title || 'Ortak metin', body }
}

/** Takes a seat: a new one, or the one the same name left when its connection dropped. */
export function joinClub(state: ClubState, rawName: unknown): Result {
  const name = cleanName(rawName)
  const same = state.readers.findIndex((r) => r.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr') && !r.connected)
  if (same >= 0) return { state: { ...state, readers: state.readers.map((r, i) => (i === same ? { ...r, connected: true } : r)) }, slot: same }
  if (state.readers.length >= MAX_READERS) return { state, error: 'full' }
  return { state: { ...state, readers: [...state.readers, { name, connected: true, looks: [] }] }, slot: state.readers.length }
}

/** A connection dropped: the seat stays, with its looked-up words, for the same name to take again. */
export function leaveClub(state: ClubState, slot: number): ClubState {
  if (!state.readers[slot]) return state
  return { ...state, readers: state.readers.map((r, i) => (i === slot ? { ...r, connected: false } : r)) }
}

/** The one who opened the room brings the text; bringing another starts the reading afresh (no one's words carry over). */
export function share(state: ClubState, slot: number, raw: unknown): Result {
  if (slot !== 0) return { state, error: 'not_host' }
  const text = cleanClubText(raw)
  if (!text) return { state, error: 'bad_text' }
  return { state: { text, readers: state.readers.map((r) => ({ ...r, looks: [] })) } }
}

/** A reader looked a word up. Looking it up again changes nothing. */
export function look(state: ClubState, slot: number, key: unknown): Result {
  const me = state.readers[slot]
  if (!me) return { state, error: 'not_joined' }
  if (!state.text) return { state, error: 'no_text' }
  if (typeof key !== 'string' || !LOOK_KEY.test(key)) return { state, error: 'bad_look' }
  if (me.looks.includes(key) || me.looks.length >= MAX_LOOKS) return { state }
  return { state: { ...state, readers: state.readers.map((r, i) => (i === slot ? { ...r, looks: [...r.looks, key] } : r)) } }
}

export const clubViewFor = (state: ClubState, slot: number): ClubView => ({ you: slot, ...(state.text ? { text: state.text } : {}), readers: state.readers })

/** One message from a reader, applied to the room. */
export function handleClub(state: ClubState, slot: number | undefined, raw: unknown): Result {
  if (!raw || typeof raw !== 'object') return { state, error: 'bad_message' }
  const m = raw as Record<string, unknown>
  if (m.t === 'join') return slot === undefined ? joinClub(state, m.name) : { state, slot }
  if (slot === undefined) return { state, error: 'not_joined' }
  if (m.t === 'share') return { ...share(state, slot, m.text), slot }
  if (m.t === 'look') return { ...look(state, slot, m.key), slot }
  return { state, error: 'bad_message', slot }
}

/** The other readers' looked-up words: word → who (their names), for the reader in `you`. */
export function othersLooks(view: ClubView): Map<string, string[]> {
  const out = new Map<string, string[]>()
  view.readers.forEach((r, i) => {
    if (i === view.you) return
    for (const key of r.looks) out.set(key, [...(out.get(key) ?? []), r.name])
  })
  return out
}
