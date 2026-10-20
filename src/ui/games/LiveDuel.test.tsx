// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { grammarExercises } from '../../data/grammar'
import { duelOptions, duelPool } from '../../engine/duel'
import { checkGrammar } from '../../engine/grammar'
import type { RoomView } from '../../engine/liveDuel'
import { LiveDuel } from './LiveDuel'
import { roomUrl } from './useLiveRoom'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** A stand-in for the room's WebSocket: the test plays the server. */
class FakeWebSocket {
  static all: FakeWebSocket[] = []
  readyState = 0
  sent: Record<string, unknown>[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  url: string
  constructor(url: string) {
    this.url = url
    FakeWebSocket.all.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  push(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

let root: Root
let host: HTMLDivElement
const ws = () => FakeWebSocket.all[FakeWebSocket.all.length - 1]
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 20))))
const mount = async (code = 'ABC234') => {
  await act(async () => root.render(<LiveDuel language="fr" name="Ali" code={code} onExit={() => {}} />))
  await act(async () => ws().open())
}
const view = (over: Partial<RoomView> = {}): RoomView => ({ phase: 'lobby', ids: [], you: 0, players: [{ name: 'Ali', connected: true, answered: 0, score: 0, ms: 0 }], ...over })
const state = async (room: RoomView) => {
  await act(async () => ws().push({ t: 'state', room }))
  await flush()
}
const text = () => host.textContent ?? ''
const button = (re: RegExp) => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => re.test(b.textContent ?? ''))

beforeEach(() => {
  FakeWebSocket.all = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('the live duel screen', () => {
  it('joins the room by name when the connection opens, and shows the code, the link and who is there', async () => {
    await mount()
    expect(ws().url).toBe('ws://localhost:3000/api/room?code=ABC234'.replace('localhost:3000', location.host))
    expect(ws().sent).toEqual([{ t: 'join', name: 'Ali' }])
    expect(text()).toContain('Odaya girildi')
    await state(view())
    expect(text()).toContain('ABC-234')
    expect(text()).toContain('/?oda=ABC234')
    expect(text()).toContain('Arkadaşın bekleniyor')
    expect(button(/düellosunu başlat/)?.disabled).toBe(true)
  })

  it('the host starts the game with questions of their language once both are there', async () => {
    await mount()
    await state(view({ players: [{ name: 'Ali', connected: true, answered: 0 }, { name: 'Veli', connected: true, answered: 0 }] }))
    const start = button(/düellosunu başlat/)!
    expect(start.disabled).toBe(false)
    await act(async () => start.click())
    const message = ws().sent.find((m) => m.t === 'start') as { language: string; ids: string[] }
    expect(message.language).toBe('fr')
    expect(message.ids).toHaveLength(10)
    const pool = new Set(duelPool(grammarExercises('fr')).map((e) => e.id))
    expect(message.ids.every((id) => pool.has(id))).toBe(true)
  })

  it('a guest waits for the host', async () => {
    await mount()
    await state(view({ you: 1, players: [{ name: 'Ali', connected: true, answered: 0 }, { name: 'Veli', connected: true, answered: 0 }] }))
    expect(text()).toContain('Oda sahibi başlatınca')
    expect(button(/düellosunu başlat/)).toBeUndefined()
  })

  it('plays the questions: each answer is sent in order, the other\'s progress is shown, and it waits for them at the end', async () => {
    const exercises = duelPool(grammarExercises('fr')).slice(0, 3)
    await mount()
    const room = (me: number, them: number): RoomView =>
      view({ phase: 'playing', language: 'fr', ids: exercises.map((e) => e.id), players: [{ name: 'Ali', connected: true, answered: me, score: me }, { name: 'Veli', connected: true, answered: them }] })
    await state(room(0, 1))
    expect(text()).toContain('Veli: 1/3 soruda')
    for (let i = 0; i < 3; i++) {
      const ex = exercises[i]
      const options = [...host.querySelectorAll<HTMLButtonElement>('.options .option')]
      const right = duelOptions(ex).findIndex((o) => checkGrammar(ex, o) !== 'wrong')
      await act(async () => options[right].click())
      await act(async () => button(/^(Devam|Bitir)$/)!.click())
    }
    const answers = ws().sent.filter((m) => m.t === 'answer')
    expect(answers.map((a) => [a.i, a.ok])).toEqual([[0, true], [1, true], [2, true]])
    expect(text()).toContain('bitirmesi bekleniyor')
  })

  it('keeps the last question\'s explanation until the player goes on, even when their answer ended the game', async () => {
    const exercises = duelPool(grammarExercises('fr')).slice(0, 3)
    const ids = exercises.map((e) => e.id)
    await mount()
    const players = (me: number) => [{ name: 'Ali', connected: true, answered: me, score: me }, { name: 'Veli', connected: true, answered: 3, score: 2 }]
    await state(view({ phase: 'playing', language: 'fr', ids, players: players(2) }))
    // The first two questions are answered, then the last.
    for (let i = 0; i < 2; i++) {
      await act(async () => host.querySelectorAll<HTMLButtonElement>('.options .option')[0].click())
      await act(async () => button(/^Devam$/)!.click())
    }
    await act(async () => host.querySelectorAll<HTMLButtonElement>('.options .option')[0].click())
    // The room says the game is over (Veli was done): the result waits for the player's "Bitir".
    await state(view({ phase: 'over', language: 'fr', ids, winner: 'them', players: [{ name: 'Ali', connected: true, answered: 3, score: 1, ms: 5000 }, { name: 'Veli', connected: true, answered: 3, score: 2, ms: 4000 }] }))
    expect(text()).not.toContain('kazandı')
    expect(button(/^Bitir$/)).toBeTruthy()
    await act(async () => button(/^Bitir$/)!.click())
    expect(text()).toContain('Veli kazandı')
  })

  it('shows both results and who won, and can ask for another game', async () => {
    await mount()
    await state(view({ phase: 'over', language: 'fr', ids: ['a', 'b', 'c'], winner: 'you', players: [{ name: 'Ali', connected: true, answered: 3, score: 3, ms: 4000 }, { name: 'Veli', connected: true, answered: 3, score: 1, ms: 6000 }] }))
    expect(text()).toContain('Kazandın!')
    expect(text()).toContain('3/3')
    expect(text()).toContain('1/3')
    await act(async () => button(/Tekrar oyna/)!.click())
    expect(ws().sent.at(-1)).toEqual({ t: 'again' })
  })

  it('says so when the room is full, and does not keep trying', async () => {
    await mount()
    await act(async () => ws().push({ t: 'error', reason: 'full' }))
    await flush()
    expect(text()).toContain('Bu oda dolu')
    expect(FakeWebSocket.all).toHaveLength(1)
  })

  it('reconnects when the connection drops, and joins again by the same name', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    await mount()
    await act(async () => ws().push({ t: 'state', room: view() }))
    await act(async () => ws().close())
    await act(async () => void vi.advanceTimersByTime(900))
    expect(FakeWebSocket.all).toHaveLength(2)
    await act(async () => ws().open())
    expect(ws().sent).toEqual([{ t: 'join', name: 'Ali' }])
    vi.useRealTimers()
  })
})

describe('the room address', () => {
  it('follows the page: wss on https, ws otherwise', () => {
    expect(roomUrl('ABC234', { protocol: 'https:', host: 'diloloji.com' })).toBe('wss://diloloji.com/api/room?code=ABC234')
    expect(roomUrl('ABC234', { protocol: 'http:', host: 'localhost:4180' })).toBe('ws://localhost:4180/api/room?code=ABC234')
  })
})
