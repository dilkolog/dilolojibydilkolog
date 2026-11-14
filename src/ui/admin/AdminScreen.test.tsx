// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  loadPeople: vi.fn(),
  changePerson: vi.fn(async () => ({ ok: true })),
  deletePerson: vi.fn(async () => ({ ok: true })),
  loadReports: vi.fn(),
  unpublishSet: vi.fn(async () => ({ ok: true })),
  loadSystem: vi.fn(),
  loadStats: vi.fn(),
  loadUsage: vi.fn(),
  loadPerson: vi.fn(),
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  announce: vi.fn(),
  approveAll: vi.fn(async () => ({ ok: true, approved: 2 })),
  loadBlocks: vi.fn(),
  block: vi.fn(async () => ({ ok: true })),
  unblock: vi.fn(async () => ({ ok: true })),
}))
vi.mock('../../data/adminApi', async () => {
  const real = await vi.importActual<typeof import('../../data/adminApi')>('../../data/adminApi')
  return { ...real, ...api }
})
vi.mock('../shared/toastFeed', () => ({ showToast: () => undefined }))

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

const VIEW = {
  settings: { aiDailyCalls: 100 },
  effective: { aiDailyCalls: 100, aiDailyBudgetUsd: 0.75, aiSiteBudgetUsd: 5, translateChars: 20000, ttsChars: 8000 },
  defaults: { aiDailyCalls: 150, aiDailyBudgetUsd: 0.75, aiSiteBudgetUsd: 5, translateChars: 20000, ttsChars: 8000 },
  ranges: { aiDailyCalls: { min: 1, max: 2000 }, aiDailyBudgetUsd: { min: 0.01, max: 50 }, aiSiteBudgetUsd: { min: 0.5, max: 500 }, translateChars: { min: 500, max: 500000 }, ttsChars: { min: 500, max: 500000 } },
}
const TOTALS = { aiCalls: 12, aiUsd: 0.4, translateChars: 900, ttsChars: 0, assessCalls: 1, people: 2 }

const typeInto = (input: HTMLInputElement | HTMLTextAreaElement, value: string) =>
  act(async () => {
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })

beforeEach(() => {
  vi.clearAllMocks()
  api.loadStats.mockResolvedValue({ total: 40, pending: 1, active7: 12, active30: 25, newByDay: Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-0${i + 1}`, count: i % 3 })) })
  api.loadUsage.mockResolvedValue({ available: true, today: TOTALS, month: { ...TOTALS, aiCalls: 300, aiUsd: 9.5 }, top: [{ email: 'veli@example.com', aiCalls: 10, aiUsd: 0.3, translateChars: 500 }] })
  api.loadPerson.mockResolvedValue({ words: 320, answers: 1500, texts: 4, lastSync: '2026-11-04T09:00:00Z', bytes: 2_500_000, lastSignIn: '2026-11-04T08:00:00Z', provider: 'google', today: { aiCalls: 3, aiUsd: 0.05, translateChars: 100, ttsChars: 0 } })
  api.loadSettings.mockResolvedValue(VIEW)
  api.saveSettings.mockImplementation(async (change: Record<string, unknown>) => ({ ...VIEW, settings: { ...VIEW.settings, ...change } }))
  api.announce.mockImplementation(async (text: string) => ({ ok: true, announcement: text ? { id: 'a-1', text, at: '2026-11-04T10:00:00Z' } : null }))
  api.loadBlocks.mockResolvedValue({ available: true, blocks: [{ kind: 'domain', value: 'spam.example', note: '', createdAt: '2026-11-03T10:00:00Z' }] })
  api.loadPeople.mockImplementation(async (filter: string) => ({ people: filter === 'approved' ? [APPROVED] : [PENDING], levels: true, pending: 1 }))
  api.loadReports.mockResolvedValue({ reports: [{ id: 'r1', at: '2026-11-04T09:00:00Z', kind: 'set', reason: 'spam', note: '', target: 'f'.repeat(32), content: 'Liste: kötü', about: { name: 'Biri' } }] })
  api.loadSystem.mockResolvedValue({ health: { ok: true, supabase: 'ok', storage: 'ok' }, problems: ['DEEPL_AUTH_KEY tanımlı değil (çeviri).'] })
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

  it('names what needs attention, and offers no move any more (both finished)', async () => {
    await mount()
    expect(host.textContent).toContain('DEEPL_AUTH_KEY tanımlı değil')
    expect(host.textContent).not.toContain('taşı')
  })

  it('deletes an account only after the e-mail is typed', async () => {
    await mount()
    await act(async () => button('Hesabı sil').click())
    const dialog = () => document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')!
    const confirm = () => [...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Hesabı sil')!
    await act(async () => confirm().click())
    expect(dialog().textContent).toContain('E-posta tutmuyor.')
    expect(api.deletePerson).not.toHaveBeenCalled()
    const input = dialog().querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'ayse@example.com')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => confirm().click())
    await flush()
    expect(api.deletePerson).toHaveBeenCalledWith('a', 'ayse@example.com', false)
    expect(api.loadPeople).toHaveBeenCalledTimes(2)
  })

  it('shows the numbers, usage and a person\'s details', async () => {
    await mount()
    expect(host.querySelector('.admin-numbers')!.textContent).toContain('40')
    expect(host.querySelectorAll('.admin-days li')).toHaveLength(7)
    expect(host.querySelector('.admin-usage-cols')!.textContent).toContain('300 istek')
    expect(host.querySelector('.admin-top')!.textContent).toContain('veli@example.com')
    await act(async () => button('Ayrıntı').click())
    await flush()
    expect(api.loadPerson).toHaveBeenCalledWith('a')
    expect(host.querySelector('.admin-person-info')!.textContent).toContain('Google')
    expect(host.querySelector('.admin-person-info')!.textContent).toContain('2,4 MB')
  })

  it('saves a limit, and goes back to the defaults', async () => {
    await mount()
    const input = host.querySelectorAll<HTMLInputElement>('.admin-limit input')[2]
    await typeInto(input, '30000')
    await act(async () => button('Kaydet').click())
    await flush()
    expect(api.saveSettings).toHaveBeenCalledWith({ translateChars: 30000 })
    await act(async () => button('Varsayılanlara dön').click())
    await flush()
    expect(api.saveSettings).toHaveBeenLastCalledWith(expect.objectContaining({ aiDailyCalls: null }))
  })

  it('turns auto-approval on and sends then takes back an announcement', async () => {
    await mount()
    const toggle = [...host.querySelectorAll<HTMLElement>('[role="switch"], input[type="checkbox"]')].find((el) => el.closest('.card')?.id === 'admin-settings-card')!
    await act(async () => toggle.click())
    await flush()
    expect(api.saveSettings).toHaveBeenCalledWith({ autoApprove: true })
    await typeInto(host.querySelector('.admin-announce textarea')!, 'Bu gece bakım var.')
    await act(async () => button('Gönder').click())
    await flush()
    expect(api.announce).toHaveBeenCalledWith('Bu gece bakım var.')
    expect(host.querySelector('.admin-current')!.textContent).toContain('Bu gece bakım var.')
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('.admin-current button')][0].click())
    await flush()
    expect(api.announce).toHaveBeenLastCalledWith('')
    expect(host.querySelector('.admin-current')).toBeNull()
  })

  it('blocks and unblocks an address, and deletes with a block', async () => {
    await mount()
    expect(host.querySelector('.admin-blocks')!.textContent).toContain('spam.example')
    await typeInto(host.querySelector('.admin-block-form input')!, 'kotu@example.com')
    await act(async () => button('Engelle').click())
    await flush()
    expect(api.block).toHaveBeenCalledWith('kotu@example.com')
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('.admin-blocks button')][0].click())
    await flush()
    expect(api.unblock).toHaveBeenCalledWith('domain', 'spam.example')
    await act(async () => button('Hesabı sil').click())
    const dialog = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')!
    await act(async () => dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
    await typeInto(dialog.querySelector<HTMLInputElement>('input[type="email"]')!, 'ayse@example.com')
    await act(async () => [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Hesabı sil')!.click())
    await flush()
    expect(api.deletePerson).toHaveBeenCalledWith('a', 'ayse@example.com', true)
  })

  it('approves everyone waiting after asking', async () => {
    api.loadPeople.mockImplementation(async () => ({ people: [PENDING, { ...PENDING, id: 'c', email: 'can@example.com', username: 'can' }], levels: true, pending: 2 }))
    await mount()
    await act(async () => button('Hepsini onayla (2)').click())
    const dialog = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')!
    await act(async () => [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Hepsini onayla')!.click())
    await flush()
    expect(api.approveAll).toHaveBeenCalledTimes(1)
  })
})
