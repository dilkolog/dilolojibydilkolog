// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  loadPeople: vi.fn(),
  changePerson: vi.fn(async () => ({ ok: true })),
  loadReports: vi.fn(),
  unpublishSet: vi.fn(async () => ({ ok: true })),
  loadSystem: vi.fn(),
  moveStep: vi.fn(),
}))
vi.mock('../data/adminApi', async () => {
  const real = await vi.importActual<typeof import('../data/adminApi')>('../data/adminApi')
  return { ...real, ...api }
})
vi.mock('./toastFeed', () => ({ showToast: () => undefined }))

const { AdminScreen } = await import('./AdminScreen')
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PENDING = { id: 'a', email: 'ayse@example.com', username: 'ayse', approved: false, rejected: false, createdAt: '2026-11-04T10:00:00Z', aiLevel: null }
const APPROVED = { id: 'b', email: 'veli@example.com', username: 'veli', approved: true, rejected: false, createdAt: '2026-11-01T10:00:00Z', aiLevel: 'tam' }

let root: Root | null = null
let host: HTMLElement
const flush = () => act(() => new Promise((r) => setTimeout(r, 0)))
const mount = async () => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AdminScreen />))
  await flush()
  await flush()
}
const button = (text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!

beforeEach(() => {
  vi.clearAllMocks()
  api.loadPeople.mockImplementation(async (filter: string) => ({ people: filter === 'approved' ? [APPROVED] : [PENDING], levels: true, pending: 1 }))
  api.loadReports.mockResolvedValue({ reports: [{ id: 'r1', at: '2026-11-04T09:00:00Z', kind: 'set', reason: 'spam', note: '', target: 'f'.repeat(32), content: 'Liste: kötü', about: { name: 'Biri' } }] })
  api.loadSystem.mockResolvedValue({ health: { ok: true, supabase: 'ok', storage: 'ok' }, problems: ['DEEPL_AUTH_KEY tanımlı değil (çeviri).'], docs: 'ready', tables: 'off' })
  api.moveStep.mockResolvedValueOnce({ copied: 30, next: { prefix: 0, cursor: '30' }, at: 'friends/handle/' }).mockResolvedValueOnce({ copied: 4, next: { prefix: 1 }, at: 'friends/handle/' }).mockResolvedValueOnce({ copied: 0, next: null, at: '' })
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('AdminScreen', () => {
  it('shows who waits and approves them', async () => {
    await mount()
    expect(host.querySelector('.admin-figure')!.textContent).toContain('1')
    expect(host.textContent).toContain('ayse@example.com')
    await act(async () => button('Onayla').click())
    await flush()
    expect(api.changePerson).toHaveBeenCalledWith('a', { change: 'approve' })
    expect(api.loadPeople).toHaveBeenCalledTimes(2)
  })

  it('sets an approved person\'s AI level', async () => {
    await mount()
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('.seg-btn')].find((b) => b.textContent === 'Onaylılar')!.click())
    await flush()
    expect(host.textContent).toContain('veli@example.com')
    await act(async () => host.querySelector<HTMLButtonElement>('.admin-level .select-trigger')!.click())
    await flush()
    const option = [...host.querySelectorAll<HTMLElement>('.admin-level [role="option"]')].find((o) => o.textContent?.startsWith('Kelime'))!
    await act(async () => void option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
    await flush()
    expect(api.changePerson).toHaveBeenCalledWith('b', { level: 'kelime' })
  })

  it('takes a reported list off the library', async () => {
    await mount()
    expect(host.querySelector('.admin-report')!.textContent).toContain('Spam ya da reklam')
    await act(async () => button('Kütüphaneden kaldır').click())
    await flush()
    expect(api.unpublishSet).toHaveBeenCalledWith('f'.repeat(32))
    expect(host.textContent).toContain('Kütüphaneden kaldırıldı.')
  })

  it('names what needs attention and runs the move step by step to the end', async () => {
    await mount()
    expect(host.textContent).toContain('DEEPL_AUTH_KEY tanımlı değil')
    await act(async () => button('Eski dosyaları taşı').click())
    for (let i = 0; i < 6; i++) await flush()
    expect(api.moveStep).toHaveBeenCalledTimes(3)
    expect(api.moveStep.mock.calls[1][0]).toEqual({ prefix: 0, cursor: '30' })
    expect(api.loadSystem).toHaveBeenCalledTimes(2)
  })
})
