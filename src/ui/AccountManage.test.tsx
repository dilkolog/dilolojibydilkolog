// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ setNewPassword: vi.fn(async (_password: string, _current?: string) => undefined) }))
vi.mock('../data/supabase', () => ({
  setNewPassword: state.setNewPassword,
  signOutSupabase: async () => undefined,
  authErrorText: (m: string) => m,
  CURRENT_PASSWORD_NEEDED: 'NEEDED',
  CURRENT_PASSWORD_WRONG: 'WRONG',
  providersText: (p: string[]) => p.map((x) => (x === 'email' ? 'E-posta ve şifre' : x === 'google' ? 'Google' : x)).join(' · '),
  supabaseConfigured: () => true,
  currentSession: async () => null,
}))
vi.mock('../data/vault', () => ({ deleteAccount: async () => undefined }))
vi.mock('./syncRunner', () => ({ setAccount: async () => undefined }))
vi.mock('./toastFeed', () => ({ showToast: () => undefined }))

const { AccountManage } = await import('./AccountManage')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

const set = (el: HTMLInputElement, v: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('AccountManage password row', () => {
  it('a Google account without a password offers "Şifre belirle", and after saving says it has one and offers "Şifre değiştir"', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<AccountManage identity={{ email: 'a@b.c', name: 'A', avatar: '', providers: ['google'] }} onSignOut={() => {}} />))
    expect(host.textContent).toContain('Belirlenmedi')
    const open = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Şifre belirle')!
    await act(async () => open.click())
    const inputs = [...host.querySelectorAll<HTMLInputElement>('input')]
    await act(async () => {
      set(inputs[0], 'Güçlü-Şifre9')
      set(inputs[1], 'Güçlü-Şifre9')
    })
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Kaydet')!.click())
    expect(state.setNewPassword).toHaveBeenCalledWith('Güçlü-Şifre9', undefined)
    expect(host.textContent).not.toContain('Belirlenmedi')
    expect(host.textContent).toContain('••••••••••••')
    expect(host.textContent).toContain('Google · E-posta ve şifre')
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Şifre değiştir')).toBe(true)
  })

  it('an account that already has a password offers "Şifre değiştir" from the start', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<AccountManage identity={{ email: 'a@b.c', name: 'A', avatar: '', providers: ['google', 'email'] }} onSignOut={() => {}} />))
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Şifre değiştir')).toBe(true)
    expect(host.textContent).not.toContain('Şifre belirle')
  })

  it('when the account has a password already, asks for the current one and then saves with it', async () => {
    state.setNewPassword.mockReset()
    state.setNewPassword.mockRejectedValueOnce(new Error('NEEDED')).mockResolvedValueOnce(undefined)
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<AccountManage identity={{ email: 'a@b.c', name: 'A', avatar: '', providers: ['google'] }} onSignOut={() => {}} />))
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Şifre belirle')!.click())
    let inputs = [...host.querySelectorAll<HTMLInputElement>('input')]
    await act(async () => {
      set(inputs[0], 'Güçlü-Şifre9')
      set(inputs[1], 'Güçlü-Şifre9')
    })
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Kaydet')!.click())
    // The row now says there is a password, and the form has the current-password field.
    expect(host.textContent).toContain('Mevcut şifre')
    expect(host.textContent).not.toContain('Belirlenmedi')
    inputs = [...host.querySelectorAll<HTMLInputElement>('input')]
    expect(inputs).toHaveLength(3)
    await act(async () => {
      set(inputs[0], 'Eski-Şifre1')
      set(inputs[1], 'Güçlü-Şifre9')
      set(inputs[2], 'Güçlü-Şifre9')
    })
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Kaydet')!.click())
    expect(state.setNewPassword).toHaveBeenLastCalledWith('Güçlü-Şifre9', 'Eski-Şifre1')
    expect(host.textContent).not.toContain('Mevcut şifre')
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Şifre değiştir')).toBe(true)
  })
})
