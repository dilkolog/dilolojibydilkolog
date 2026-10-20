import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ gate: null as null | { resolve: () => void; reject: (e: Error) => void }, target: vi.fn() }))
vi.mock('../data/instance', () => ({ db: { meta: { get: async (key: string) => (key === 'syncAccount' ? { value: { kind: 'account', username: 'a', id: 'a', enc: 'b', auth: 'c' } } : undefined), put: async () => undefined, bulkDelete: async () => undefined } } }))
vi.mock('../data/access', () => ({ ACCOUNT_EVENT: 'account', forgetAccess: async () => undefined }))
vi.mock('../data/supabase', () => ({ hasStoredSession: () => true, supabaseConfigured: () => true }))
vi.mock('../data/errorReport', () => ({ reportError: () => undefined }))
vi.mock('./toastFeed', () => ({ showToast: () => undefined }))
vi.mock('./noticeCenter', () => ({ notify: async () => undefined }))
vi.mock('./noticeTexts', () => ({ syncNotice: () => ({}) }))
vi.mock('./syncTarget', () => ({ syncTarget: state.target }))
vi.mock('../data/sync', () => ({ syncNow: async () => ({ received: 0, sent: 0, skipped: 0, incoming: { words: 0, removed: 0, texts: 0, settings: 0 }, changed: false }) }))

const { runSync, isSyncing } = await import('./syncRunner')

beforeEach(() => {
  state.target.mockReset()
})

describe('runSync', () => {
  it('a caller that wants errors does not take a background sync\'s silent failure for a success', async () => {
    let fail!: (e: Error) => void
    state.target.mockImplementationOnce(() => new Promise((_resolve, reject) => void (fail = reject)))
    const background = runSync()
    await vi.waitFor(() => expect(isSyncing()).toBe(true))
    const asked = runSync(true)
    await vi.waitFor(() => expect(state.target).toHaveBeenCalled())
    fail(new Error('offline'))
    expect(await background).toBeNull()
    await expect(asked).rejects.toThrow('offline')
    expect(isSyncing()).toBe(false)
  })

  it('shares one sync, and the next one starts fresh', async () => {
    state.target.mockResolvedValue({})
    const [a, b] = await Promise.all([runSync(true), runSync(true)])
    expect(a).toBe(b)
    expect(state.target).toHaveBeenCalledTimes(1)
    await runSync(true)
    expect(state.target).toHaveBeenCalledTimes(2)
  })
})
