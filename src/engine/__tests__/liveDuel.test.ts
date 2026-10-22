import { describe, expect, it } from 'vitest'
import { again, answer, cleanRoomCode, emptyRoom, handle, join, leave, newRoomCode, ROOM_CODE, SERIES_LENGTH, start, viewFor, type RoomState } from '../liveDuel'

const IDS = ['q1', 'q2', 'q3']
const twoPlayers = (): RoomState => {
  let s = join(emptyRoom(), 'Ali').state
  s = join(s, 'Veli').state
  return s
}
const playing = (): RoomState => start(twoPlayers(), 0, 'fr', IDS).state

describe('room codes', () => {
  it('are six letters and digits without the look-alikes, and typed ones are read forgivingly', () => {
    for (let i = 0; i < 50; i++) expect(newRoomCode()).toMatch(ROOM_CODE)
    expect(newRoomCode(() => 0)).toBe('222222')
    expect(cleanRoomCode('abc-234')).toBe('ABC234')
    expect(cleanRoomCode(' k7m p9r ')).toBe('K7MP9R')
    expect(cleanRoomCode('ABC10O')).toBeNull()
    expect(cleanRoomCode('ABC')).toBeNull()
    expect(cleanRoomCode(null)).toBeNull()
  })
})

describe('taking a seat', () => {
  it('the first is the host, the second the guest, a third is turned away', () => {
    const a = join(emptyRoom(), 'Ali')
    expect(a.slot).toBe(0)
    const b = join(a.state, 'Veli')
    expect(b.slot).toBe(1)
    expect(join(b.state, 'Ayşe')).toMatchObject({ error: 'full' })
  })

  it('names are cleaned: no markup, a limit, a default', () => {
    expect(join(emptyRoom(), '<b>Ali</b>“x”').state.players[0].name).toBe('bAli/bx')
    expect(join(emptyRoom(), 'x'.repeat(50)).state.players[0].name).toHaveLength(20)
    expect(join(emptyRoom(), 42).state.players[0].name).toBe('Arkadaş')
  })

  it('a dropped player takes the same seat again by name; in the lobby a leaving guest just goes', () => {
    let s = playing()
    s = leave(s, 1)
    expect(s.players[1].connected).toBe(false)
    const back = join(s, 'veli')
    expect(back.slot).toBe(1)
    expect(back.state.players[1].connected).toBe(true)
    const lobby = leave(twoPlayers(), 1)
    expect(lobby.players).toHaveLength(1)
    expect(join(lobby, 'Ayşe').slot).toBe(1)
  })
})

describe('starting', () => {
  it('only the host, with both there, with 3 to 10 different safe question ids and a known language', () => {
    expect(start(twoPlayers(), 1, 'fr', IDS)).toMatchObject({ error: 'not_host' })
    expect(start(join(emptyRoom(), 'Ali').state, 0, 'fr', IDS)).toMatchObject({ error: 'need_two' })
    expect(start(leave(twoPlayers(), 0), 0, 'fr', IDS)).toMatchObject({ error: 'need_two' })
    expect(start(twoPlayers(), 0, 'de', IDS)).toMatchObject({ error: 'bad_message' })
    expect(start(twoPlayers(), 0, 'fr', ['a', 'b'])).toMatchObject({ error: 'bad_questions' })
    expect(start(twoPlayers(), 0, 'fr', ['a', 'a', 'b'])).toMatchObject({ error: 'bad_questions' })
    expect(start(twoPlayers(), 0, 'fr', ['a', 'b', '<x>'])).toMatchObject({ error: 'bad_questions' })
    expect(start(twoPlayers(), 0, 'fr', Array.from({ length: 11 }, (_, i) => `q${i}`))).toMatchObject({ error: 'bad_questions' })
    const ok = start(twoPlayers(), 0, 'fr', IDS)
    expect(ok.error).toBeUndefined()
    expect(ok.state).toMatchObject({ phase: 'playing', language: 'fr', ids: IDS })
  })

  it('not while a game is on', () => {
    expect(start(playing(), 0, 'fr', IDS)).toMatchObject({ error: 'bad_message' })
  })
})

describe('playing', () => {
  it('answers go in order, once each, and the game is over when both have answered every question', () => {
    let s = playing()
    expect(answer(s, 0, 1, true, 100)).toMatchObject({ error: 'bad_answer' })
    s = answer(s, 0, 0, true, 1500).state
    expect(answer(s, 0, 0, true, 10)).toMatchObject({ error: 'bad_answer' })
    s = answer(s, 0, 1, false, 2000).state
    s = answer(s, 0, 2, true, 1000).state
    expect(s.phase).toBe('playing')
    s = answer(s, 1, 0, true, 900).state
    s = answer(s, 1, 1, true, 900).state
    s = answer(s, 1, 2, true, 900).state
    expect(s.phase).toBe('over')
    expect(s.players.map((p) => [p.score, p.ms])).toEqual([[2, 4500], [3, 2700]])
  })

  it('refuses nonsense and answers outside a game; the time is bounded', () => {
    expect(answer(twoPlayers(), 0, 0, true, 5)).toMatchObject({ error: 'not_playing' })
    expect(answer(playing(), 0, 0, 'yes', 5)).toMatchObject({ error: 'bad_answer' })
    expect(answer(playing(), 0, 0, true, Number.NaN)).toMatchObject({ error: 'bad_answer' })
    expect(answer(playing(), 5, 0, true, 5)).toMatchObject({ error: 'not_joined' })
    expect(answer(playing(), 0, 0, true, 9_999_999).state.players[0].ms).toBe(120_000)
    expect(answer(playing(), 0, 0, true, -50).state.players[0].ms).toBe(0)
  })

  it('shows the other only how far they are, until the game is over', () => {
    let s = playing()
    s = answer(s, 0, 0, true, 1000).state
    s = answer(s, 1, 0, true, 500).state
    const mine = viewFor(s, 0)
    expect(mine.players[0]).toMatchObject({ answered: 1, score: 1, ms: 1000 })
    expect(mine.players[1]).toEqual({ name: 'Veli', connected: true, answered: 1 })
    for (let i = 1; i < 3; i++) {
      s = answer(s, 0, i, true, 1000).state
      s = answer(s, 1, i, false, 500).state
    }
    const over = viewFor(s, 1)
    expect(over.players.every((p) => p.score !== undefined)).toBe(true)
    expect(over.winner).toBe('them')
    expect(viewFor(s, 0).winner).toBe('you')
  })

  it('a tie on right answers goes to the faster, and the same time is a tie', () => {
    let s = playing()
    for (let i = 0; i < 3; i++) {
      s = answer(s, 0, i, true, 1000).state
      s = answer(s, 1, i, true, 1000).state
    }
    expect(viewFor(s, 0).winner).toBe('tie')
  })

  it('"again" brings both back to the lobby with clean scores, only after a game', () => {
    let s = playing()
    expect(handle(s, 0, { t: 'again' }).state.phase).toBe('playing')
    for (let i = 0; i < 3; i++) {
      s = answer(s, 0, i, true, 1).state
      s = answer(s, 1, i, true, 2).state
    }
    const next = handle(s, 1, { t: 'again' }).state
    expect(next).toMatchObject({ phase: 'lobby', ids: [] })
    expect(next.players.map((p) => p.answered)).toEqual([0, 0])
  })
})

describe('rematch series', () => {
  /** One game: each slot's right answers out of 3, each answer taking `ms`. */
  const game = (s: RoomState, rights: [number, number], ms: [number, number] = [1000, 1000]): RoomState => {
    let r = start(s.phase === 'over' ? again(s) : s, 0, 'fr', IDS).state
    for (let i = 0; i < 3; i++) for (const slot of [0, 1]) r = answer(r, slot, i, i < rights[slot]!, ms[slot]!).state
    return r
  }

  it('adds up games won and right answers, from each side, and the best of three wins', () => {
    let s = game(twoPlayers(), [3, 1])
    expect(viewFor(s, 0).series).toMatchObject({ games: 1, of: SERIES_LENGTH, you: 1, them: 0, right: { you: 3, them: 1 } })
    expect(viewFor(s, 0).series?.winner).toBeUndefined()
    s = game(s, [1, 2])
    expect(viewFor(s, 1).series).toMatchObject({ games: 2, you: 1, them: 1, right: { you: 3, them: 4 } })
    s = game(s, [3, 2])
    expect(viewFor(s, 0).series).toMatchObject({ games: 3, you: 2, them: 1, winner: 'you' })
    expect(viewFor(s, 1).series?.winner).toBe('them')
  })

  it('equal wins go to the most right answers over the series; a tie stays a tie', () => {
    let s = game(twoPlayers(), [3, 0])
    s = game(s, [0, 2])
    s = game(s, [2, 2], [1000, 1000])
    expect(viewFor(s, 0).series).toMatchObject({ you: 1, them: 1, ties: 1, right: { you: 5, them: 4 }, winner: 'you' })
    let t = game(twoPlayers(), [3, 0])
    t = game(t, [0, 3])
    t = game(t, [1, 1])
    expect(viewFor(t, 1).series?.winner).toBe('tie')
  })

  it('the game after a whole series opens a new one, and a new guest starts afresh', () => {
    let s = twoPlayers()
    for (let k = 0; k < SERIES_LENGTH; k++) s = game(s, [2, 1])
    s = game(s, [0, 3])
    expect(viewFor(s, 0).series).toMatchObject({ games: 1, you: 0, them: 1 })
    const lobby = leave(again(s), 1)
    const fresh = join(lobby, 'Ayşe').state
    expect(fresh.series.games).toBe(0)
    expect(viewFor(game(fresh, [1, 1]), 0).series?.games).toBe(1)
  })

  it('the same guest dropping out of the lobby and coming back keeps the series', () => {
    let s = game(twoPlayers(), [3, 1])
    s = leave(again(s), 1)
    s = join(s, 'Veli').state
    expect(viewFor(game(s, [1, 2]), 0).series).toMatchObject({ games: 2, you: 1, them: 1 })
  })

  it('is shown only once a game is over', () => {
    expect(viewFor(playing(), 0).series).toBeUndefined()
  })
})

describe('messages', () => {
  it('join first, then the rest; anything else is refused without changing the room', () => {
    const room = emptyRoom()
    expect(handle(room, undefined, { t: 'start' })).toMatchObject({ error: 'not_joined', state: room })
    expect(handle(room, undefined, null)).toMatchObject({ error: 'bad_message' })
    expect(handle(room, undefined, { t: 'wat' })).toMatchObject({ error: 'not_joined' })
    const joined = handle(room, undefined, { t: 'join', name: 'Ali' })
    expect(joined.slot).toBe(0)
    expect(handle(joined.state, 0, { t: 'wat' })).toMatchObject({ error: 'bad_message', slot: 0 })
    // Joining twice on one connection keeps the one seat.
    expect(handle(joined.state, 0, { t: 'join', name: 'Other' })).toMatchObject({ slot: 0 })
  })
})
