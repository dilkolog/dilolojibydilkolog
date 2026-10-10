// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAccess } from '../data/access'
import { db } from '../data/instance'
import type { AccessState } from './accessContext'
import { useAccessStatus } from './useAccessStatus'

const ACCOUNT = { kind: 'account', username: 'ali', id: 'a'.repeat(64), enc: 'e'.repeat(64), auth: '1'.repeat(64) }
let root: ReturnType<typeof createRoot> | undefined
let state: AccessState
let server: { status: string; exists: boolean; match: boolean } | 'offline'
const posted: unknown[] = []

function Probe({ onState }: { onState: (s: AccessState) => void }) {
  const current = useAccessStatus()
  useEffect(() => {
    onState(current)
  })
  return null
}
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 80))))

beforeEach(async () => {
  await db.meta.bulkDelete(['syncAccount', 'accessStatus'])
  posted.length = 0
  server = { status: 'none', exists: true, match: true }
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit = {}) => {
    if (server === 'offline') throw new TypeError('offline')
    if (init.method === 'POST') {
      posted.push(JSON.parse(init.body as string))
      server = { ...server, status: 'pending' }
      return Response.json({ status: 'pending' })
    }
    return Response.json(server)
  })
})
afterEach(() => {
  act(() => root?.unmount())
  vi.unstubAllGlobals()
})

async function mount() {
  root = createRoot(document.createElement('div'))
  await act(async () => root!.render(<Probe onState={(s) => (state = s)} />))
  await wait()
}

describe('useAccessStatus', () => {
  it('signed out without an account; nothing is asked of the server', async () => {
    const ask = vi.fn()
    vi.stubGlobal('fetch', ask)
    await mount()
    expect(state).toMatchObject({ status: 'signedOut', approved: false })
    expect(ask).not.toHaveBeenCalled()
  })

  it('takes the server\'s word and keeps it for next time', async () => {
    await db.meta.put({ key: 'syncAccount', value: ACCOUNT })
    server = { status: 'approved', exists: true, match: true }
    await mount()
    expect(state).toMatchObject({ status: 'approved', approved: true })
    expect((await db.meta.get('accessStatus'))?.value).toMatchObject({ status: 'approved' })
  })

  it('files the request itself for an account the owner has not heard of (one from before approvals)', async () => {
    await db.meta.put({ key: 'syncAccount', value: ACCOUNT })
    await mount()
    expect(posted).toEqual([{ username: 'ali', note: '' }])
    expect(state).toMatchObject({ status: 'pending', approved: false })
  })

  it('a token the server does not recognise is not approval', async () => {
    await db.meta.put({ key: 'syncAccount', value: ACCOUNT })
    server = { status: 'none', exists: true, match: false }
    await mount()
    expect(state.approved).toBe(false)
  })

  it('offline, what the device last heard stands', async () => {
    await db.meta.put({ key: 'syncAccount', value: ACCOUNT })
    await saveAccess('approved')
    server = 'offline'
    await mount()
    expect(state).toMatchObject({ status: 'approved', approved: true })
  })
})
