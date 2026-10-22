import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelRoom, JOIN_WITHIN_MS, roomKind, type Socket } from './duelRoom'
import worker from './index'

/** A stand-in for a connection: what the room sends is kept, and the test plays the browser's part. */
class FakeSocket implements Socket {
  sent: { t: string; room?: { phase: string; you: number; players: { name: string; connected: boolean; answered: number; score?: number }[]; winner?: string }; reason?: string }[] = []
  closed?: { code?: number; reason?: string }
  private on: Record<string, ((e: { data: unknown }) => void)[]> = {}
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close(code?: number, reason?: string) {
    this.closed = { code, reason }
  }
  addEventListener(type: string, listener: (e: { data: unknown }) => void) {
    ;(this.on[type] ??= []).push(listener)
  }
  say(message: unknown) {
    for (const l of this.on.message ?? []) l({ data: typeof message === 'string' ? message : JSON.stringify(message) })
  }
  hangUp() {
    for (const l of this.on.close ?? []) l({ data: undefined })
  }
  get last() {
    return this.sent[this.sent.length - 1]
  }
}

const IDS = ['q1', 'q2', 'q3']
const seat = (room: DuelRoom, name: string) => {
  const s = new FakeSocket()
  room.attach(s)
  s.say({ t: 'join', name })
  return s
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('a live duel room', () => {
  it('seats two players, tells each their own seat, and refuses a third', () => {
    const room = new DuelRoom()
    const ali = seat(room, 'Ali')
    expect(ali.last).toMatchObject({ t: 'state', room: { phase: 'lobby', you: 0 } })
    const veli = seat(room, 'Veli')
    expect(veli.last.room?.you).toBe(1)
    expect(ali.last.room?.players.map((p) => p.name)).toEqual(['Ali', 'Veli'])
    const ayse = seat(room, 'Ayşe')
    expect(ayse.last).toEqual({ t: 'error', reason: 'full' })
  })

  it('plays a game: the host starts, answers come in, the other only sees how far, and the end shows both', () => {
    const room = new DuelRoom()
    const ali = seat(room, 'Ali')
    const veli = seat(room, 'Veli')
    veli.say({ t: 'start', language: 'fr', ids: IDS })
    expect(veli.last).toEqual({ t: 'error', reason: 'not_host' })
    ali.say({ t: 'start', language: 'fr', ids: IDS })
    expect(ali.last.room).toMatchObject({ phase: 'playing' })
    ali.say({ t: 'answer', i: 0, ok: true, ms: 1000 })
    expect(veli.last.room?.players[0]).toEqual({ name: 'Ali', connected: true, answered: 1 })
    expect(ali.last.room?.players[0]).toMatchObject({ answered: 1, score: 1 })
    for (let i = 1; i < 3; i++) ali.say({ t: 'answer', i, ok: true, ms: 1000 })
    for (let i = 0; i < 3; i++) veli.say({ t: 'answer', i, ok: false, ms: 500 })
    expect(ali.last.room).toMatchObject({ phase: 'over', winner: 'you' })
    expect(veli.last.room).toMatchObject({ phase: 'over', winner: 'them' })
    expect(veli.last.room?.players.every((p) => p.score !== undefined)).toBe(true)
    ali.say({ t: 'again' })
    expect(veli.last.room).toMatchObject({ phase: 'lobby' })
  })

  it('a dropped player is shown as gone and takes the same seat again by name', () => {
    const room = new DuelRoom()
    const ali = seat(room, 'Ali')
    const veli = seat(room, 'Veli')
    ali.say({ t: 'start', language: 'es', ids: IDS })
    veli.hangUp()
    expect(ali.last.room?.players[1].connected).toBe(false)
    const back = seat(room, 'veli')
    expect(back.last.room).toMatchObject({ you: 1, phase: 'playing' })
    expect(ali.last.room?.players[1].connected).toBe(true)
  })

  it('a name that is already seated and still connected is not a free seat', () => {
    const room = new DuelRoom()
    seat(room, 'Ali')
    const first = seat(room, 'Veli')
    // Veli's connection is still open (a phone that went to sleep) when the same name comes back: that is not a free seat.
    const again = seat(room, 'Veli')
    expect(again.last).toEqual({ t: 'error', reason: 'full' })
    expect(first.closed).toBeUndefined()
  })

  it('answers to nonsense with an error and changes nothing; keep-alive pings are ignored', () => {
    const room = new DuelRoom()
    const ali = seat(room, 'Ali')
    const before = ali.sent.length
    ali.say('not json')
    expect(ali.last).toEqual({ t: 'error', reason: 'bad_message' })
    ali.say('x'.repeat(2001))
    expect(ali.last).toEqual({ t: 'error', reason: 'bad_message' })
    ali.say({ t: 'wat' })
    expect(ali.last).toEqual({ t: 'error', reason: 'bad_message' })
    const errors = ali.sent.length
    ali.say({ t: 'ping' })
    expect(ali.sent.length).toBe(errors)
    expect(errors).toBe(before + 3)
  })

  it('closes a connection that never joins, and refuses more than a few at once', () => {
    const room = new DuelRoom()
    const idle = new FakeSocket()
    room.attach(idle)
    vi.advanceTimersByTime(JOIN_WITHIN_MS + 1)
    expect(idle.closed?.code).toBe(1008)
    const sockets = Array.from({ length: 5 }, () => {
      const s = new FakeSocket()
      room.attach(s)
      return s
    })
    expect(sockets[4].closed?.code).toBe(1013)
  })
})

describe('a reading club room', () => {
  const clubSeat = (room: DuelRoom, name: string) => {
    const s = new FakeSocket()
    room.attach(s, 'club')
    s.say({ t: 'join', name })
    return s
  }
  const BODY = 'Le petit prince habitait une planète à peine plus grande que lui.'
  type ClubLast = { room?: { you: number; text?: { title: string; body: string }; readers: { name: string; looks: string[] }[] } }

  it('takes a long text in one message, gives it to whoever joins, and shares the words each looked up', () => {
    const room = new DuelRoom()
    const ali = clubSeat(room, 'Ali')
    ali.say({ t: 'share', text: { language: 'fr', title: 'Le Petit Prince', body: BODY.repeat(200) } })
    const veli = clubSeat(room, 'Veli')
    const seen = (veli.last as ClubLast).room!
    expect(seen.you).toBe(1)
    expect(seen.text?.title).toBe('Le Petit Prince')
    veli.say({ t: 'look', key: 'planèt' })
    expect((ali.last as ClubLast).room!.readers[1]!.looks).toEqual(['planèt'])
    // Four readers fit; a fifth is turned away.
    clubSeat(room, 'Ayşe')
    clubSeat(room, 'Can')
    expect(clubSeat(room, 'Ece').last).toEqual({ t: 'error', reason: 'full' })
  })

  it('a room keeps the kind of its first connection; the kind comes from the address', () => {
    expect(roomKind('https://diloloji.com/api/room?code=ABC234&kind=club')).toBe('club')
    expect(roomKind('https://diloloji.com/api/room?code=ABC234')).toBe('duel')
    const room = new DuelRoom()
    const ali = clubSeat(room, 'Ali')
    const late = new FakeSocket()
    room.attach(late, 'duel')
    late.say({ t: 'join', name: 'Veli' })
    expect((late.last as ClubLast).room!.readers).toHaveLength(2)
    expect(ali.sent.length).toBeGreaterThan(0)
  })
})

describe('the Worker route for rooms', () => {
  const room = vi.fn(async (_req: Request) => new Response('room', { status: 200 }))
  const env = {
    BLOBS: {} as never,
    ASSETS: { fetch: async () => new Response('assets') } as never,
    DUEL: { idFromName: (n: string) => n, get: () => ({ fetch: room }) } as never,
  }
  const ws = (code: string, headers: Record<string, string> = {}) => new Request(`https://diloloji.com/api/room?code=${code}`, { headers: { upgrade: 'websocket', origin: 'https://diloloji.com', ...headers } })

  it('hands a WebSocket from the app to the room named by the code', async () => {
    const res = await worker.fetch(ws('abc-234'), env)
    expect(res.status).toBe(200)
    expect(room).toHaveBeenCalled()
  })

  it('a club with the same code is another room', async () => {
    const names: string[] = []
    const named = { ...env, DUEL: { idFromName: (n: string) => (names.push(n), n), get: () => ({ fetch: room }) } as never }
    await worker.fetch(ws('ABC234'), named)
    await worker.fetch(new Request('https://diloloji.com/api/room?code=ABC234&kind=club', { headers: { upgrade: 'websocket', origin: 'https://diloloji.com' } }), named)
    expect(names).toEqual(['ABC234', 'club:ABC234'])
  })

  it('turns away a bad code, a plain request, a stranger\'s page and a Worker with no rooms', async () => {
    expect((await worker.fetch(ws('NOPE'), env)).status).toBe(400)
    expect((await worker.fetch(new Request('https://diloloji.com/api/room?code=ABC234'), env)).status).toBe(426)
    expect((await worker.fetch(ws('ABC234', { origin: 'https://evil.example' }), env)).status).toBe(403)
    expect((await worker.fetch(ws('ABC234'), { ...env, DUEL: undefined })).status).toBe(503)
  })
})
