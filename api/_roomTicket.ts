import { supabaseOn } from './_supabase.js'

/**
 * A ticket for a live room (a duel or a reading club, worker/duelRoom.ts). A browser cannot send the account's
 * headers with a WebSocket, and the Origin a room used to go by is whatever a script says it is: without a ticket
 * anyone could open rooms and pass text through them without an account. So the app first asks /api/access for a
 * ticket (an approved account, like every other feature that costs the owner something) and names it when it connects.
 *
 * The ticket is `<expiry in seconds>.<HMAC-SHA256 of it>`: nothing is stored, any instance can check it, and it is
 * good for a couple of minutes (a reconnect asks for a new one). It says "an approved account asked a moment ago",
 * not who: rooms know their players only by the name they give.
 *
 * The key is ROOM_SECRET, else a secret the server already has (signed under a label of its own, so a ticket is of no
 * use anywhere else). Without accounts (local development, no Supabase) or without any secret, rooms need no ticket.
 */
export const TICKET_SECONDS = 120

const secret = () => (process.env.ROOM_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

/** Whether a room asks for a ticket: accounts are in use and there is something to sign with. */
export const roomTicketsOn = () => supabaseOn() && !!secret()

async function sign(expiry: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`diloloji-room-ticket:${expiry}`))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** A ticket good for TICKET_SECONDS from now. */
export async function issueRoomTicket(now = Date.now()): Promise<string> {
  const expiry = Math.floor(now / 1000) + TICKET_SECONDS
  return `${expiry}.${await sign(expiry)}`
}

/** Whether the ticket is one of ours and still good (compared without leaking where it differs). */
export async function validRoomTicket(ticket: string | null | undefined, now = Date.now()): Promise<boolean> {
  const m = /^(\d{10})\.([0-9a-f]{64})$/.exec(ticket ?? '')
  if (!m) return false
  const expiry = Number(m[1])
  const seconds = Math.floor(now / 1000)
  // Not expired, and not dated further ahead than a ticket can be.
  if (expiry < seconds || expiry > seconds + TICKET_SECONDS) return false
  const expected = await sign(expiry)
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ m[2].charCodeAt(i)
  return diff === 0
}
