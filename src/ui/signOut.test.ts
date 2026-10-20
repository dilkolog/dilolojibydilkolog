import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  account: { id: 'a' } as unknown,
  runSync: vi.fn(async () => null as unknown),
  setAccount: vi.fn(async () => undefined),
  signOutSupabase: vi.fn(async () => undefined),
  wipe: vi.fn(async () => undefined),
  toast: vi.fn(),
  undoable: vi.fn(),
  reload: vi.fn(),
}))
vi.mock('../data/supabase', () => ({ currentIdentity: async () => ({ email: 'a@b.c', name: 'A', providers: ['email'] }), signOutSupabase: state.signOutSupabase }))
vi.mock('./syncRunner', () => ({ getAccount: async () => state.account, runSync: state.runSync, setAccount: state.setAccount }))
vi.mock('./toastFeed', () => ({ showToast: state.toast, undoable: state.undoable }))
vi.mock('./pushReminders', () => ({ forgetPushRecord: async () => undefined }))
vi.mock('../data/deviceWipe', () => ({ wipeDevice: state.wipe }))

const { signOutThisDevice } = await import('./signOut')

beforeEach(() => {
  vi.clearAllMocks()
  state.account = { id: 'a' }
  vi.stubGlobal('location', { reload: state.reload })
})

describe('signing out of an account', () => {
  it('sends the last changes first, then signs out and empties the device', async () => {
    const order: string[] = []
    state.runSync.mockImplementationOnce(async () => (order.push('sync'), null))
    state.setAccount.mockImplementationOnce(async () => void order.push('account'))
    state.signOutSupabase.mockImplementationOnce(async () => void order.push('supabase'))
    state.wipe.mockImplementationOnce(async () => void order.push('wipe'))
    expect(await signOutThisDevice()).toBe(true)
    expect(order).toEqual(['sync', 'account', 'supabase', 'wipe'])
    expect(state.reload).toHaveBeenCalled()
  })

  it('does nothing when the changes cannot be sent, and offers a way to leave anyway', async () => {
    state.runSync.mockRejectedValueOnce(new Error('offline'))
    expect(await signOutThisDevice()).toBe(false)
    expect(state.setAccount).not.toHaveBeenCalled()
    expect(state.wipe).not.toHaveBeenCalled()
    const action = state.toast.mock.calls[0]![1] as { label: string; run: () => void }
    expect(action.label).toBe('Yine de çık')
    action.run()
    await vi.waitFor(() => expect(state.wipe).toHaveBeenCalled())
  })
})
