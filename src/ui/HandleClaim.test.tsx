// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const friends = vi.hoisted(() => ({ saveHandle: vi.fn(async () => ({ handle: 'veli_1', findable: true })) }))
class FriendsError extends Error {
  reason: string
  constructor(reason: string) {
    super(reason)
    this.reason = reason
  }
}
vi.mock('../data/friends', () => ({ saveHandle: friends.saveHandle, FriendsError }))
const access = vi.hoisted(() => ({ approved: true }))
vi.mock('./accessContext', () => ({ useAccess: () => ({ approved: access.approved }) }))
const toast = vi.hoisted(() => vi.fn())
vi.mock('./toastFeed', () => ({ showToast: toast }))

const { HandleClaim } = await import('./HandleClaim')
const { clearPendingHandle, pendingHandle, setPendingHandle } = await import('./pendingHandle')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
const mount = async () => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<HandleClaim />))
  await act(() => new Promise((r) => setTimeout(r, 0)))
}

beforeEach(() => {
  vi.clearAllMocks()
  clearPendingHandle()
  access.approved = true
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('HandleClaim', () => {
  it('makes the name picked at sign-up the findable name, once', async () => {
    setPendingHandle('veli_1')
    await mount()
    expect(friends.saveHandle).toHaveBeenCalledWith('veli_1', true)
    expect(pendingHandle()).toBeNull()
  })

  it('waits for an account the server accepts', async () => {
    setPendingHandle('veli_1')
    access.approved = false
    await mount()
    expect(friends.saveHandle).not.toHaveBeenCalled()
    expect(pendingHandle()).toBe('veli_1')
  })

  it('a name someone else holds is let go and said so; a passing failure keeps it for next time', async () => {
    setPendingHandle('veli_1')
    friends.saveHandle.mockRejectedValueOnce(new FriendsError('taken'))
    await mount()
    expect(pendingHandle()).toBeNull()
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('başkasında'), undefined, 6000, 'info')

    setPendingHandle('veli_2')
    friends.saveHandle.mockRejectedValueOnce(new Error('offline'))
    act(() => root?.unmount())
    await mount()
    expect(pendingHandle()).toBe('veli_2')
  })
})
