/**
 * Live sync: the account holds the data, a device only keeps a copy, so a change goes up a moment after it is made and
 * what other devices did comes down when the app is looked at again (and now and then while it stays open).
 * Pure scheduling: what runs, and when it may, is handed in.
 */
export interface LiveSyncOptions {
  /** Does one sync (a failure is its own business: it is silent). */
  run: () => Promise<unknown>
  /** False while a sync must not start (a session is on: it ends with its own sync). */
  canRun: () => boolean
  /** A change waits this long for more changes before it goes up. */
  debounceMs?: number
  /** …but never longer than this since the first of them. */
  maxWaitMs?: number
  /** A pull (looking at the app again, coming back online, the timer) is skipped if a sync ran this recently. */
  minGapMs?: number
  /** While a sync is not allowed, the wait before looking again. */
  retryMs?: number
}

export interface LiveSync {
  /** The device's data changed: it goes up soon. */
  touch(): void
  /** Time to look for what other devices did (skipped if a sync just ran). */
  pull(): void
  dispose(): void
}

export function createLiveSync(options: LiveSyncOptions): LiveSync {
  const { run, canRun, debounceMs = 4000, maxWaitMs = 30_000, minGapMs = 20_000, retryMs = 10_000 } = options
  let timer: ReturnType<typeof setTimeout> | null = null
  let firstTouch = 0
  let lastRun = Number.NEGATIVE_INFINITY
  let dirty = false
  let dead = false

  const go = async () => {
    timer = null
    if (dead) return
    if (!canRun()) {
      timer = setTimeout(() => void go(), retryMs)
      return
    }
    dirty = false
    firstTouch = 0
    lastRun = Date.now()
    try {
      await run()
    } catch {
      // Silent: the next change or pull tries again.
    }
    lastRun = Date.now()
  }

  return {
    touch() {
      if (dead) return
      const now = Date.now()
      dirty = true
      if (!firstTouch) firstTouch = now
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void go(), Math.max(0, Math.min(debounceMs, firstTouch + maxWaitMs - now)))
    },
    pull() {
      if (dead || timer || dirty) return
      if (Date.now() - lastRun < minGapMs) return
      void go()
    },
    dispose() {
      dead = true
      if (timer) clearTimeout(timer)
      timer = null
    },
  }
}
