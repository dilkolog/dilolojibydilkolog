// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { AccessBadge } from './AccessBadge'
import { AccessContext, type AccessState } from './accessContext'

function render(status: AccessState['status'], onOpen = () => {}) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => {
    root.render(
      <AccessContext.Provider value={{ status, approved: status === 'approved', refresh: async () => {} }}>
        <AccessBadge onOpen={onOpen} />
      </AccessContext.Provider>,
    )
  })
  return { el, done: () => { act(() => root.unmount()); el.remove() } }
}

describe('AccessBadge', () => {
  it('shows only while the account waits for or lacks approval', () => {
    for (const status of ['approved', 'none', 'signedOut', 'unknown'] as const) {
      const { el, done } = render(status)
      expect(el.querySelector('.access-badge')).toBeNull()
      done()
    }
    const pending = render('pending')
    expect(pending.el.textContent).toBe('Onay bekliyor')
    pending.done()
    const rejected = render('rejected')
    expect(rejected.el.textContent).toBe('Onaylanmadı')
    rejected.done()
  })

  it('opens the settings on click', () => {
    const open = vi.fn()
    const { el, done } = render('pending', open)
    act(() => el.querySelector<HTMLButtonElement>('.access-badge')!.click())
    expect(open).toHaveBeenCalledOnce()
    done()
  })
})
