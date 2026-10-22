import { emptyRoom, handle, leave, viewFor } from '../src/engine/liveDuel.js'
import { clubViewFor, emptyClub, handleClub, leaveClub, MAX_READERS } from '../src/engine/readingClub.js'

/**
 * One live duel room (src/engine/liveDuel.ts holds every rule): a Durable Object named by the room's code, so both
 * players' browsers reach the same instance. It keeps the room in memory only, as long as someone is connected, and
 * passes messages: each message goes through `handle`, and the new state is sent to both seats as that seat may see it.
 */

/** The part of a WebSocket the room uses (the real one in the Worker, a stand-in in the tests). */
export interface Socket {
  send(data: string): void
  close(code?: number, reason?: string): void
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void
  addEventListener(type: 'close' | 'error', listener: () => void): void
}

/** The rules a room plays by: a live duel or a reading club (each in src/engine). */
interface RoomRules {
  empty(): unknown
  handle(state: unknown, slot: number | undefined, raw: unknown): { state: unknown; slot?: number; error?: string }
  leave(state: unknown, slot: number): unknown
  view(state: unknown, slot: number): unknown
  /** A message longer than this is not one of ours. */
  maxMessage: number
  /** Connections at once: the seats, and a few that are still joining or reconnecting. */
  maxSockets: number
}

const RULES: Record<'duel' | 'club', RoomRules> = {
  duel: { empty: emptyRoom, handle: handle as RoomRules['handle'], leave: leave as RoomRules['leave'], view: viewFor as RoomRules['view'], maxMessage: 2000, maxSockets: 4 },
  // A club's text comes in one message (escaped, up to twice its length).
  club: { empty: emptyClub, handle: handleClub as RoomRules['handle'], leave: leaveClub as RoomRules['leave'], view: clubViewFor as RoomRules['view'], maxMessage: 64_000, maxSockets: MAX_READERS + 2 },
}

/** Which rules a room was asked for (`?kind=club`); a duel when nothing is said. */
export const roomKind = (url: string): 'duel' | 'club' => (new URL(url).searchParams.get('kind') === 'club' ? 'club' : 'duel')
/** A connection that has not taken a seat by then is closed. */
export const JOIN_WITHIN_MS = 10_000

export class DuelRoom {
  /** Set by the first connection: a room keeps its kind (its name in the Worker carries the kind too). */
  private rules: RoomRules | null = null
  private room: unknown = null
  /** Each connection and its seat (undefined until it has joined). */
  private seats = new Map<Socket, number | undefined>()

  /** A browser connects: the WebSocket is accepted and attached. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('expected a websocket', { status: 426 })
    const pair = new WebSocketPair()
    const server = pair[1] as unknown as Socket & { accept(): void }
    server.accept()
    this.attach(server, roomKind(request.url))
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  attach(socket: Socket, kind: 'duel' | 'club' = 'duel'): void {
    if (!this.rules) {
      this.rules = RULES[kind]
      this.room = this.rules.empty()
    }
    if (this.seats.size >= this.rules.maxSockets) {
      this.send(socket, { t: 'error', reason: 'full' })
      socket.close(1013, 'room full')
      return
    }
    this.seats.set(socket, undefined)
    const late = setTimeout(() => {
      if (this.seats.get(socket) === undefined && this.seats.has(socket)) socket.close(1008, 'join first')
    }, JOIN_WITHIN_MS)
    socket.addEventListener('message', (event) => this.onMessage(socket, event.data))
    const gone = () => {
      clearTimeout(late)
      this.drop(socket)
    }
    socket.addEventListener('close', gone)
    socket.addEventListener('error', gone)
  }

  private onMessage(socket: Socket, data: unknown): void {
    if (!this.seats.has(socket)) return
    const rules = this.rules!
    if (typeof data !== 'string' || data.length > rules.maxMessage) return this.send(socket, { t: 'error', reason: 'bad_message' })
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return this.send(socket, { t: 'error', reason: 'bad_message' })
    }
    // Keep-alive pings are not game messages.
    if (parsed && typeof parsed === 'object' && (parsed as { t?: unknown }).t === 'ping') return
    const result = rules.handle(this.room, this.seats.get(socket), parsed)
    if (result.error) return this.send(socket, { t: 'error', reason: result.error })
    this.room = result.state
    if (result.slot !== undefined && this.seats.get(socket) === undefined) {
      // A seat taken again after a dropped connection: the old connection of that seat, if it is still around, is let go.
      for (const [other, slot] of this.seats) if (other !== socket && slot === result.slot) this.drop(other, true)
      this.seats.set(socket, result.slot)
    }
    this.broadcast()
  }

  private drop(socket: Socket, close = false): void {
    const slot = this.seats.get(socket)
    this.seats.delete(socket)
    if (close) socket.close(1000, 'replaced')
    if (slot === undefined || [...this.seats.values()].includes(slot)) return
    this.room = this.rules!.leave(this.room, slot)
    this.broadcast()
  }

  private send(socket: Socket, message: { t: 'state'; room: unknown } | { t: 'error'; reason: string }): void {
    try {
      socket.send(JSON.stringify(message))
    } catch {
      // A connection that cannot be written to is on its way out; its close event cleans up.
    }
  }

  private broadcast(): void {
    for (const [socket, slot] of this.seats) if (slot !== undefined) this.send(socket, { t: 'state', room: this.rules!.view(this.room, slot) })
  }
}
