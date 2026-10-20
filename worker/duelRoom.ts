import { emptyRoom, handle, leave, viewFor, type RoomState, type ServerMessage } from '../src/engine/liveDuel.js'

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

/** A message longer than this is not one of ours. */
const MAX_MESSAGE = 2000
/** Connections at once: two players, and a few that are still joining or reconnecting. */
const MAX_SOCKETS = 4
/** A connection that has not taken a seat by then is closed. */
export const JOIN_WITHIN_MS = 10_000

export class DuelRoom {
  private room: RoomState = emptyRoom()
  /** Each connection and its seat (undefined until it has joined). */
  private seats = new Map<Socket, number | undefined>()

  /** A browser connects: the WebSocket is accepted and attached. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('expected a websocket', { status: 426 })
    const pair = new WebSocketPair()
    const server = pair[1] as unknown as Socket & { accept(): void }
    server.accept()
    this.attach(server)
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  attach(socket: Socket): void {
    if (this.seats.size >= MAX_SOCKETS) {
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
    if (typeof data !== 'string' || data.length > MAX_MESSAGE) return this.send(socket, { t: 'error', reason: 'bad_message' })
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return this.send(socket, { t: 'error', reason: 'bad_message' })
    }
    // Keep-alive pings are not game messages.
    if (parsed && typeof parsed === 'object' && (parsed as { t?: unknown }).t === 'ping') return
    const result = handle(this.room, this.seats.get(socket), parsed)
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
    this.room = leave(this.room, slot)
    this.broadcast()
  }

  private send(socket: Socket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message))
    } catch {
      // A connection that cannot be written to is on its way out; its close event cleans up.
    }
  }

  private broadcast(): void {
    for (const [socket, slot] of this.seats) if (slot !== undefined) this.send(socket, { t: 'state', room: viewFor(this.room, slot) })
  }
}
