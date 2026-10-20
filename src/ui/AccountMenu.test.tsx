// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from '../data/db'

let hasAccount = true
const signOut = vi.fn(async () => {})
vi.mock('./useHasAccount', () => ({ useHasAccount: () => hasAccount }))
vi.mock('./signOut', () => ({ signOutThisDevice: () => signOut() }))
const { Sidebar } = await import('./AppSidebar')

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  signOut.mockClear()
})

const mount = (go: (s: { name: string }) => () => void = () => () => {}) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() =>
    root!.render(
      <Sidebar
        settings={{ activeLanguage: 'fr', profile: { name: 'Ali' } } as Settings}
        game={null}
        rail={false}
        onToggleRail={() => {}}
        dueByLanguage={{}}
        onLanguage={() => {}}
        onOpenPalette={() => {}}
        navRef={{ current: null }}
        navMark={null}
        navBadge={{}}
        badgeLabel={{}}
        current={() => false}
        goPlace={() => vi.fn()}
        go={go as never}
        inSettings={false}
        onProfilePage={false}
      />,
    ),
  )
  return host
}
const open = (host: HTMLElement) => act(() => host.querySelector<HTMLButtonElement>('.sidebar-foot-btn')!.click())
const titles = (host: HTMLElement) => [...host.querySelectorAll('[role=menuitem] strong')].map((s) => s.textContent)

describe('the account menu in the side bar', () => {
  it('lists profile, settings and sign out, and opens each place', () => {
    const goSettings = vi.fn()
    const host = mount(vi.fn((s: { name: string }) => (s.name === 'settings' ? goSettings : vi.fn())))
    const trigger = host.querySelector<HTMLButtonElement>('.sidebar-foot-btn')!
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    open(host)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(titles(host)).toEqual(['Profil', 'Ayarlar', 'Çıkış yap'])
    act(() => host.querySelectorAll<HTMLElement>('[role=menuitem]')[1].click())
    expect(goSettings).toHaveBeenCalled()
    expect(host.querySelector('[role=menu]')).toBeNull()
  })

  it('signs out from the menu and closes it', () => {
    const host = mount()
    open(host)
    act(() => host.querySelectorAll<HTMLElement>('[role=menuitem]')[2].click())
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[role=menu]')).toBeNull()
  })

  it('has no sign out when the device has no account, and Escape closes the menu', () => {
    hasAccount = false
    const host = mount()
    open(host)
    expect(titles(host)).toEqual(['Profil', 'Ayarlar'])
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(host.querySelector('[role=menu]')).toBeNull()
    hasAccount = true
  })
})
