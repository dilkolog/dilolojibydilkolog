// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { AdminAccess } from './AdminAccess'

let root: ReturnType<typeof createRoot> | undefined
let lists: { pending: unknown[]; approved: unknown[]; rejected: unknown[]; tables?: string }
const calls: { method: string; auth: string | null; body?: string }[] = []
let answerStatus = 200

beforeEach(async () => {
  await db.meta.delete('adminToken')
  calls.length = 0
  answerStatus = 200
  lists = {
    pending: [{ id: 'a'.repeat(64), username: 'ali', note: 'arkadaşım', at: '2026-10-10T10:00:00Z' }],
    approved: [{ id: 'b'.repeat(64), username: 'veli', at: '2026-10-09T10:00:00Z' }],
    rejected: [],
  }
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit = {}) => {
    calls.push({ method: init.method ?? 'GET', auth: new Headers(init.headers).get('authorization'), body: init.body as string | undefined })
    if (init.method === 'POST' && String(init.body).includes('move-tables')) {
      lists = { ...lists, tables: 'on' }
      return Response.json({ ok: true, cards: 2, follows: 3, shares: 1, reminders: 4 })
    }
    return answerStatus === 200 ? Response.json(lists) : new Response('{}', { status: answerStatus })
  })
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AdminAccess />))
  return host
}
async function enterKey(host: HTMLElement, key = 'owner-secret') {
  const input = host.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, key)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => host.querySelector<HTMLButtonElement>('form button')!.click())
  await wait()
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === text)

describe('AdminAccess', () => {
  it('lists who waits with their username and note, using the key as a bearer token', async () => {
    const host = await mount()
    await enterKey(host)
    expect(calls[0]).toMatchObject({ method: 'GET', auth: 'Bearer owner-secret' })
    expect(host.textContent).toContain('Onay bekleyenler (1)')
    expect(host.textContent).toContain('ali')
    expect(host.textContent).toContain('arkadaşım')
    expect(host.textContent).toContain('Onaylılar (1)')
    expect(host.textContent).toContain('veli')
    // The key stays on this device for next time.
    expect((await db.meta.get('adminToken'))?.value).toBe('owner-secret')
  })

  it('approves with one tap and reads the lists again', async () => {
    const host = await mount()
    await enterKey(host)
    calls.length = 0
    await act(async () => button(host, 'Onayla')!.click())
    await wait()
    expect(calls[0]).toMatchObject({ method: 'POST', auth: 'Bearer owner-secret' })
    expect(JSON.parse(calls[0].body!)).toEqual({ action: 'approve', id: 'a'.repeat(64) })
    expect(calls[1].method).toBe('GET')
  })

  it('says what is wrong with a wrong key or a server without ADMIN_TOKEN', async () => {
    const host = await mount()
    answerStatus = 403
    await enterKey(host, 'nope')
    expect(host.querySelector('[role=alert]')?.textContent).toContain('anahtarı yanlış')
    expect(host.textContent).not.toContain('Onay bekleyenler')
    answerStatus = 503
    await enterKey(host)
    expect(host.querySelector('[role=alert]')?.textContent).toContain('ADMIN_TOKEN')
  })

  it('moves the server data to Supabase with one tap once the tables are there', async () => {
    lists.tables = 'ready'
    const host = await mount()
    await enterKey(host)
    expect(host.textContent).toContain('hâlâ Vercel Blob’da')
    calls.length = 0
    await act(async () => button(host, 'Supabase’e taşı')!.click())
    await wait()
    expect(JSON.parse(calls[0].body!)).toEqual({ action: 'move-tables' })
    expect(host.textContent).toContain('Tablolarda: 2 arkadaş kartı, 3 takip, 1 paylaşılan liste, 4 hatırlatma.')
    expect(host.textContent).toContain('Supabase tablolarında')
  })

  it('asks for 0003 first, and says nothing about it when Supabase is not set up', async () => {
    lists.tables = 'missing'
    const host = await mount()
    await enterKey(host)
    expect(host.textContent).toContain('0003_server_tables.sql')
    expect(button(host, 'Supabase’e taşı')).toBeUndefined()
    lists.tables = 'off'
    await enterKey(host)
    expect(host.textContent).not.toContain('Sunucu verileri')
  })
})
