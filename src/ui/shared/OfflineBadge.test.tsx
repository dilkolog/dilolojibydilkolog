// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { OfflineBadge } from './OfflineBadge'

describe('OfflineBadge', () => {
  it('is hidden when online, visible when offline, and disappears when online returns', () => {
    const rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    const root = createRoot(rootEl)

    act(() => {
      root.render(<OfflineBadge />)
    })
    expect(rootEl.querySelector('.offline-badge')).toBeNull()

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(rootEl.querySelector('.offline-badge')).not.toBeNull()
    expect(rootEl.textContent).toContain('Çevrimdışı')

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(rootEl.querySelector('.offline-badge')).toBeNull()

    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })
})
