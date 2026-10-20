// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessContext } from './accessContext'
import { InviteAccept } from './InviteAccept'
import { pendingInvite } from './invite'

const addFriend = vi.fn()
const sendToFriend = vi.fn()
const loadFriends = vi.fn()
const toasts: string[] = []
vi.mock('../data/friends', () => ({
  addFriend: (...a: unknown[]) => addFriend(...a),
  sendToFriend: (...a: unknown[]) => sendToFriend(...a),
  loadFriends: (...a: unknown[]) => loadFriends(...a),
  FriendsError: class FriendsError extends Error {
    reason: string
    constructor(reason: string) {
      super(reason)
      this.reason = reason
    }
  },
}))
vi.mock('./toastFeed', () => ({ showToast: (t: string) => toasts.push(t) }))

import { FriendsError } from '../data/friends'

let root: Root
let host: HTMLDivElement
const mount = async (approved: boolean, onDone?: () => void) => {
  await act(async () => {
    root.render(
      <AccessContext.Provider value={{ status: approved ? 'approved' : 'pending', approved, refresh: async () => {} }}>
        <InviteAccept onDone={onDone} />
      </AccessContext.Provider>,
    )
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 120))
  })
}
const keep = () => localStorage.setItem('diloloji:invite-in', JSON.stringify({ code: 'ABCD2345', at: Date.now() }))

beforeEach(() => {
  addFriend.mockReset()
  sendToFriend.mockReset()
  sendToFriend.mockResolvedValue(undefined)
  loadFriends.mockReset()
  toasts.length = 0
  localStorage.clear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('InviteAccept', () => {
  it('adds the inviter as a friend once the account is approved, says who, and forgets the link', async () => {
    keep()
    addFriend.mockResolvedValue(undefined)
    loadFriends.mockResolvedValue({ me: {}, friends: [{ code: 'ABCD2345', name: 'Ayşe' }] })
    const done = vi.fn()
    await mount(true, done)
    expect(addFriend).toHaveBeenCalledWith('ABCD2345')
    // The inviter is told, and the one who came gets the small bonus, once ever.
    expect(sendToFriend).toHaveBeenCalledWith('ABCD2345', 'joined')
    expect(toasts).toEqual(['Ayşe ile arkadaş oldun. Davet bonusu: +20 XP.'])
    expect(pendingInvite()).toBeNull()
    expect(done).toHaveBeenCalled()
  })

  it('waits while the account is not approved', async () => {
    keep()
    await mount(false)
    expect(addFriend).not.toHaveBeenCalled()
    expect(pendingInvite()).toBe('ABCD2345')
  })

  it('does nothing without a kept link', async () => {
    await mount(true)
    expect(addFriend).not.toHaveBeenCalled()
  })

  it('lets a link go that can never work, and says so unless it was the own code', async () => {
    keep()
    addFriend.mockRejectedValue(new FriendsError('unknown'))
    await mount(true)
    expect(toasts).toEqual(['Davet bağlantısı geçerli değil.'])
    expect(pendingInvite()).toBeNull()

    keep()
    toasts.length = 0
    addFriend.mockRejectedValue(new FriendsError('self'))
    act(() => root.unmount())
    root = createRoot(host)
    await mount(true)
    expect(toasts).toEqual([])
    expect(pendingInvite()).toBeNull()
  })

  it('keeps the link when the failure may pass (offline, not approved yet)', async () => {
    keep()
    addFriend.mockRejectedValue(new FriendsError('http 503'))
    await mount(true)
    expect(toasts).toEqual([])
    expect(pendingInvite()).toBe('ABCD2345')
  })
})
