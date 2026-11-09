// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Landing, type LandingStart } from './Landing'

function mount(props: { onStart?: (m: LandingStart) => void; invited?: boolean; inviterName?: string }) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => {
    root.render(<Landing onStart={props.onStart ?? vi.fn()} invited={props.invited} inviterName={props.inviterName} />)
  })
  return {
    el,
    done: () => {
      act(() => root.unmount())
      el.remove()
    },
  }
}

describe('Landing', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.lang
  })

  it('renders standard hero without invite note by default', () => {
    const { el, done } = mount({})
    expect(el.querySelector('h1')?.textContent).toBe('Fransızca, İspanyolca, İngilizce. Türkçe anlatımla, A1’den C1’e.')
    expect(el.querySelector('.lp-invite')).toBeNull()
    done()
  })

  it('lights the page in the language picked, shows its examples and carries it to the first run', () => {
    const onStart = vi.fn()
    const { el, done } = mount({ onStart })
    const card = (name: string) => [...el.querySelectorAll<HTMLButtonElement>('.lp-langs .lang-card')].find((b) => b.textContent?.includes(name))!
    // French by default, on the page and on the root (the colour of the whole page).
    expect(card('Fransızca').getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.dataset.lang).toBe('fr')
    expect(el.textContent).toContain('Fransızca öğrenmeye başla')
    act(() => card('İspanyolca').click())
    expect(card('İspanyolca').getAttribute('aria-pressed')).toBe('true')
    expect(card('Fransızca').getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.dataset.lang).toBe('es')
    expect(el.querySelector('.lp')?.getAttribute('data-lang')).toBe('es')
    expect(el.querySelector('.lp-native-card')?.textContent).toContain('pero · perro')
    expect(el.querySelector('.lp-bubble-you')?.getAttribute('lang')).toBe('es')
    const start = [...el.querySelectorAll('button')].find((b) => b.textContent === 'İspanyolca öğrenmeye başla')!
    act(() => start.click())
    expect(onStart).toHaveBeenCalledWith('create')
    expect(localStorage.getItem('diloloji:start-lang')).toBe('es')
    done()
    // The language stays on through the sign-in page.
    expect(document.documentElement.dataset.lang).toBe('es')
  })

  it('opens on the language picked before', () => {
    localStorage.setItem('diloloji:start-lang', 'en')
    const { el, done } = mount({})
    expect(el.querySelector('.lp-langs [aria-pressed="true"]')?.textContent).toContain('İngilizce')
    expect(el.querySelector('.lp-native-card')?.textContent).toContain('magazine')
    done()
  })

  it('renders generic invite note when invited without name', () => {
    const { el, done } = mount({ invited: true })
    const inviteNote = el.querySelector('.lp-invite')
    expect(inviteNote).not.toBeNull()
    expect(inviteNote?.textContent).toContain('Bir arkadaşın seni davet etti.')
    done()
  })

  it('renders personalized invite note when inviterName is provided', () => {
    const { el, done } = mount({ invited: true, inviterName: 'Zeynep' })
    const inviteNote = el.querySelector('.lp-invite')
    expect(inviteNote).not.toBeNull()
    expect(inviteNote?.textContent).toContain('Zeynep seni davet etti.')
    expect(inviteNote?.querySelector('strong')?.textContent).toBe('Zeynep')
    done()
  })

  it('calls onStart with login and create actions', () => {
    const onStart = vi.fn()
    const { el, done } = mount({ onStart })

    const buttons = el.querySelectorAll<HTMLButtonElement>('button')
    const loginBtn = Array.from(buttons).find((b) => b.textContent?.trim() === 'Giriş yap')
    const createBtn = Array.from(buttons).find((b) => b.textContent?.trim() === 'Hesap aç')

    expect(loginBtn).toBeDefined()
    expect(createBtn).toBeDefined()

    act(() => {
      loginBtn?.click()
    })
    expect(onStart).toHaveBeenCalledWith('login')

    act(() => {
      createBtn?.click()
    })
    expect(onStart).toHaveBeenCalledWith('create')

    done()
  })
})
