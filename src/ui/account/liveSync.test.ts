import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiveSync } from './liveSync'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const make = (canRun = () => true) => {
  const run = vi.fn(async () => undefined)
  return { run, live: createLiveSync({ run, canRun, debounceMs: 4000, maxWaitMs: 30_000, minGapMs: 20_000, retryMs: 10_000 }) }
}

describe('live sync', () => {
  it('a change goes up once it has been quiet for a few seconds, a burst as one sync', async () => {
    const { run, live } = make()
    live.touch()
    await vi.advanceTimersByTimeAsync(3000)
    live.touch()
    await vi.advanceTimersByTimeAsync(3000)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1500)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('a change that keeps coming still goes up within the longest wait', async () => {
    const { run, live } = make()
    for (let i = 0; i < 20; i++) {
      live.touch()
      await vi.advanceTimersByTimeAsync(2000)
    }
    expect(run).toHaveBeenCalled()
  })

  it('waits while a session is on and syncs when it ends', async () => {
    let allowed = false
    const { run, live } = make(() => allowed)
    live.touch()
    await vi.advanceTimersByTimeAsync(25_000)
    expect(run).not.toHaveBeenCalled()
    allowed = true
    await vi.advanceTimersByTimeAsync(10_000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('a pull is skipped right after a sync and goes through later, and never over a change that is waiting', async () => {
    const { run, live } = make()
    live.pull()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    live.pull()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(21_000)
    live.pull()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(2)
    live.touch()
    live.pull()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('a failed sync is silent and the next change tries again; a disposed one does nothing', async () => {
    const run = vi.fn(async () => {
      throw new Error('offline')
    })
    const live = createLiveSync({ run, canRun: () => true })
    live.touch()
    await vi.advanceTimersByTimeAsync(5000)
    live.touch()
    await vi.advanceTimersByTimeAsync(5000)
    expect(run).toHaveBeenCalledTimes(2)
    live.touch()
    live.dispose()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(run).toHaveBeenCalledTimes(2)
  })
})
