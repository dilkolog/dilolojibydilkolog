// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
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
  it('renders standard hero without invite note by default', () => {
    const { el, done } = mount({})
    expect(el.querySelector('h1')?.textContent).toBe('Kelimeleri unutmadan önce tekrar et.')
    expect(el.querySelector('.lp-invite')).toBeNull()
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
