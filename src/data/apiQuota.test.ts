import { beforeEach, describe, expect, it } from 'vitest'
import { quotaLeft, resetQuota, spendQuota, type QuotaStore } from '../../api/_quota'

/** An in-memory store, like the Blob files. */
function memory(fail = false): QuotaStore & { files: Map<string, string> } {
  const files = new Map<string, string>()
  return {
    files,
    read: async (path) => {
      if (fail) throw new Error('down')
      return files.get(path) ?? null
    },
    write: async (path, value) => {
      if (fail) throw new Error('down')
      files.set(path, JSON.stringify(value))
    },
  }
}

const ID = 'a'.repeat(64)
const NOON = Date.parse('2026-10-22T12:00:00Z')

describe('daily quota', () => {
  beforeEach(() => resetQuota())

  it('counts what was spent and refuses what would go over', async () => {
    const store = memory()
    expect(await quotaLeft('translate', ID, 600, 1000, store, NOON)).toBe(true)
    await spendQuota('translate', ID, 600, store, NOON)
    expect(store.files.get(`quota/translate/2026-10-22/${ID}.json`)).toBe('{"used":600}')
    expect(await quotaLeft('translate', ID, 400, 1000, store, NOON)).toBe(true)
    expect(await quotaLeft('translate', ID, 401, 1000, store, NOON)).toBe(false)
  })

  it('a new day starts again; another account has its own count', async () => {
    const store = memory()
    await spendQuota('translate', ID, 1000, store, NOON)
    expect(await quotaLeft('translate', ID, 1, 1000, store, NOON)).toBe(false)
    expect(await quotaLeft('translate', 'b'.repeat(64), 1, 1000, store, NOON)).toBe(true)
    expect(await quotaLeft('translate', ID, 1, 1000, store, NOON + 24 * 3600_000)).toBe(true)
  })

  it('sees what other instances counted once its own copy is a minute old', async () => {
    const store = memory()
    expect(await quotaLeft('translate', ID, 1, 1000, store, NOON)).toBe(true)
    store.files.set(`quota/translate/2026-10-22/${ID}.json`, '{"used":1000}')
    expect(await quotaLeft('translate', ID, 1, 1000, store, NOON + 1000)).toBe(true)
    expect(await quotaLeft('translate', ID, 1, 1000, store, NOON + 61_000)).toBe(false)
  })

  it('a failing store never stops a translation', async () => {
    const store = memory(true)
    expect(await quotaLeft('translate', ID, 600, 1000, store, NOON)).toBe(true)
    await expect(spendQuota('translate', ID, 600, store, NOON)).resolves.toBeUndefined()
  })
})

describe('daily calls per account', () => {
  it('without an account (local development) nothing is counted', async () => {
    const { overDaily } = await import('../../api/_quota')
    const store = memory()
    expect(await overDaily(new Request('https://diloloji.com/api/clips'), 'clips', store, NOON)).toBe(false)
    expect(store.files.size).toBe(0)
  })
})
