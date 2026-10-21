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
const inviterOf = vi.fn()
const toasts: string[] = []
vi.mock('../data/friends', () => ({
  addFriend: (...a: unknown[]) => addFriend(...a),
  sendToFriend: (...a: unknown[]) => sendToFriend(...a),
  inviterOf: (...a: unknown[]) => inviterOf(...a),
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
const keep = (name?: string) => localStorage.setItem('diloloji:invite-in', JSON.stringify({ code: 'ABCD2345', at: Date.now(), ...(name ? { name } : {}) }))
const AYSE = { name: 'Ayşe', avatar: 'owl', color: '#10b981', level: 2 }
const button = (label: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === label)
const press = async (label: string) => {
  await act(async () => button(label)!.click())
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
}

beforeEach(() => {
  addFriend.mockReset()
  sendToFriend.mockReset()
  sendToFriend.mockResolvedValue(undefined)
  inviterOf.mockReset()
  inviterOf.mockResolvedValue(AYSE)
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
  it('asks first, showing whose code it really is; accepted, adds the inviter, says who, and forgets the link', async () => {
    keep()
    addFriend.mockResolvedValue(undefined)
    const done = vi.fn()
    await mount(true, done)
    expect(inviterOf).toHaveBeenCalledWith('ABCD2345')
    // Nothing is added before the answer.
    expect(addFriend).not.toHaveBeenCalled()
    expect(document.querySelector('[role=alertdialog]')?.textContent).toContain('Ayşe')
    await press('Arkadaş ekle')
    // The bonus is written to the (fake) database before the toast: wait for the toast, not a fixed time.
    await act(() => vi.waitFor(() => expect(toasts).toEqual(['Ayşe ile arkadaş oldun. Davet bonusu: +20 XP.']), { timeout: 3000 }))
    expect(addFriend).toHaveBeenCalledWith('ABCD2345')
    // The inviter is told, and the one who came gets the small bonus, once ever.
    expect(sendToFriend).toHaveBeenCalledWith('ABCD2345', 'joined')
    expect(pendingInvite()).toBeNull()
    expect(done).toHaveBeenCalled()
    expect(document.querySelector('[role=alertdialog]')).toBeNull()
  })

  it('turned down, adds nobody and forgets the link', async () => {
    keep()
    await mount(true)
    await press('Ekleme')
    expect(addFriend).not.toHaveBeenCalled()
    expect(sendToFriend).not.toHaveBeenCalled()
    expect(pendingInvite()).toBeNull()
    expect(document.querySelector('[role=alertdialog]')).toBeNull()
  })

  it('warns when the name in the link is not the name on the code', async () => {
    keep('Annem')
    await mount(true)
    const text = document.querySelector('[role=alertdialog]')?.textContent ?? ''
    expect(text).toContain('Bağlantıda “Annem” yazıyordu')
    expect(text).toContain('Tanımıyorsan ekleme')
  })

  it('says nothing about the link name when it matches', async () => {
    keep('ayşe')
    await mount(true)
    expect(document.querySelector('[role=alertdialog]')?.textContent).not.toContain('Bağlantıda')
  })

  it('waits while the account is not approved', async () => {
    keep()
    await mount(false)
    expect(inviterOf).not.toHaveBeenCalled()
    expect(addFriend).not.toHaveBeenCalled()
    expect(pendingInvite()).toBe('ABCD2345')
  })

  it('does nothing without a kept link', async () => {
    await mount(true)
    expect(inviterOf).not.toHaveBeenCalled()
    expect(document.querySelector('[role=alertdialog]')).toBeNull()
  })

  it('lets a link go that can never work, and says so unless it was the own code', async () => {
    keep()
    inviterOf.mockResolvedValue(null)
    await mount(true)
    expect(toasts).toEqual(['Davet bağlantısı geçerli değil.'])
    expect(pendingInvite()).toBeNull()

    keep()
    toasts.length = 0
    inviterOf.mockRejectedValue(new FriendsError('self'))
    act(() => root.unmount())
    root = createRoot(host)
    await mount(true)
    expect(toasts).toEqual([])
    expect(pendingInvite()).toBeNull()
  })

  it('keeps the link when the failure may pass (offline, not approved yet)', async () => {
    keep()
    inviterOf.mockRejectedValue(new FriendsError('http 503'))
    await mount(true)
    expect(toasts).toEqual([])
    expect(pendingInvite()).toBe('ABCD2345')
  })
})
