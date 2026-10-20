// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KelimeDB } from '../data/db'

const state = vi.hoisted(() => ({ db: null as unknown as KelimeDB, syncing: false, runSync: vi.fn(async (): Promise<unknown> => null) }))
vi.mock('../data/instance', () => ({
  get db() {
    return state.db
  },
}))
vi.mock('./syncRunner', () => ({ isSyncing: () => state.syncing, runSync: state.runSync }))

const { useLiveSync } = await import('./useLiveSync')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
let n = 0
function Probe({ inSession }: { inSession: boolean }) {
  useLiveSync(inSession)
  return null
}
const mount = async (inSession = false) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<Probe inSession={inSession} />))
}
const settle = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  state.db = new KelimeDB(`t-live-${++n}`)
  state.syncing = false
  state.runSync.mockClear()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('useLiveSync', () => {
  it('a write goes up a few seconds later, once, however many writes came', async () => {
    await mount()
    await state.db.meta.put({ key: 'journal', value: [] })
    await state.db.meta.put({ key: 'bossWins', value: [] })
    await settle(1000)
    expect(state.runSync).not.toHaveBeenCalled()
    await settle(4000)
    expect(state.runSync).toHaveBeenCalledTimes(1)
    expect(state.runSync).toHaveBeenCalledWith(false, true)
  })

  it('the writes a sync makes itself are not changes of the learner\'s: no sync follows them', async () => {
    await mount()
    state.syncing = true
    await state.db.meta.put({ key: 'journal', value: [] })
    state.syncing = false
    await settle(10_000)
    expect(state.runSync).not.toHaveBeenCalled()
  })

  it('the sync bookkeeping alone is no change either', async () => {
    await mount()
    await state.db.meta.put({ key: 'syncAt', value: new Date().toISOString() })
    await settle(10_000)
    expect(state.runSync).not.toHaveBeenCalled()
  })

  it('waits while a session is on and looks for other devices\' changes now and then', async () => {
    await mount(true)
    await state.db.meta.put({ key: 'journal', value: [] })
    await settle(25_000)
    expect(state.runSync).not.toHaveBeenCalled()
    act(() => root?.render(<Probe inSession={false} />))
    await settle(12_000)
    expect(state.runSync).toHaveBeenCalledTimes(1)
    state.runSync.mockClear()
    // Nothing written: the timer asks the account now and then (while the page is visible).
    await settle(130_000)
    expect(state.runSync.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('stops listening when the app closes', async () => {
    await mount()
    act(() => root?.unmount())
    root = null
    await state.db.meta.put({ key: 'journal', value: [] })
    await settle(10_000)
    expect(state.runSync).not.toHaveBeenCalled()
  })
})
