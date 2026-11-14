// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let asker: (() => Promise<boolean>) | null = null
vi.mock('../../data/adminApi', () => ({ setOwnerCodeAsker: (fn: typeof asker) => void (asker = fn) }))
const prove = vi.fn()
const mfa = vi.hoisted(() => ({ factors: vi.fn(), startEnroll: vi.fn(), confirm: vi.fn(), level: vi.fn(), cancelEnroll: vi.fn(), remove: vi.fn() }))
vi.mock('../../data/ownerMfa', () => {
  class MfaError extends Error {}
  return { ...mfa, prove: (...a: unknown[]) => prove(...a), MfaError }
})
vi.mock('../shared/toastFeed', () => ({ showToast: () => undefined }))

const { OwnerCodeDialog, SecurityCard } = await import('./OwnerMfa')
const { MfaError } = await import('../../data/ownerMfa')

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  prove.mockReset()
  for (const f of Object.values(mfa)) f.mockReset()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)))
const type = (value: string) => {
  const input = host.querySelector('input')!
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const button = (label: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === label)!

describe('OwnerCodeDialog', () => {
  it('checks the code; a wrong one says so and asks again, a right one lets the request go', async () => {
    act(() => root.render(<OwnerCodeDialog />))
    let answer!: Promise<boolean>
    act(() => void (answer = asker!()))
    prove.mockRejectedValueOnce(new MfaError('Kod yanlış ya da süresi geçti; uygulamadaki yeni kodu yaz.'))
    type('12 34 56')
    await act(async () => host.querySelector('form')!.requestSubmit())
    expect(prove).toHaveBeenCalledWith('123456')
    expect(host.textContent).toContain('Kod yanlış')
    prove.mockResolvedValueOnce(undefined)
    type('654321')
    await act(async () => host.querySelector('form')!.requestSubmit())
    expect(await answer).toBe(true)
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('SecurityCard', () => {
  it('turns two-step on: a QR code and its secret, finished by a code from the app', async () => {
    mfa.factors.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'f1', name: 'Diloloji yönetim', createdAt: '2026-11-13' }])
    mfa.startEnroll.mockResolvedValue({ id: 'f1', qr: 'data:image/svg+xml;utf8,<svg/>', secret: 'ABCDEF' })
    mfa.confirm.mockResolvedValue(undefined)
    act(() => root.render(<SecurityCard />))
    await flush()
    expect(host.textContent).toContain('İki adımlı doğrulama kapalı')
    await act(async () => button('İki adımlı doğrulamayı aç').click())
    expect(host.querySelector('img.qr')?.getAttribute('src')).toContain('data:image/svg+xml')
    expect(host.textContent).toContain('ABCDEF')
    type('111222')
    await act(async () => host.querySelector('form')!.requestSubmit())
    await flush()
    expect(mfa.confirm).toHaveBeenCalledWith('f1', '111222')
    expect(host.textContent).toContain('İki adımlı doğrulama açık')
    expect(host.textContent).toContain('Yedek uygulama ekle')
  })

  it('adding a second app wants this session to have given its code', async () => {
    mfa.factors.mockResolvedValue([{ id: 'f1', name: 'Diloloji yönetim', createdAt: '2026-11-13' }])
    mfa.level.mockResolvedValue({ proven: false, needed: true })
    act(() => root.render(<SecurityCard />))
    await flush()
    await act(async () => button('Yedek uygulama ekle').click())
    expect(mfa.startEnroll).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Önce mevcut uygulamanın koduyla doğrula')
  })
})
