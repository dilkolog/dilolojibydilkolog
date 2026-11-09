// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { RootBoundary } from './RootBoundary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Boom(): never {
  throw new Error('render failed')
}

describe('RootBoundary', () => {
  it('shows a way out instead of a blank page when something outside any screen breaks', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    act(() => root.render(<RootBoundary><Boom /></RootBoundary>))
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Uygulama açılamadı')
    expect([...el.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Sayfayı yenile', 'Yedeği indir'])
    act(() => root.unmount())
    el.remove()
    vi.restoreAllMocks()
  })
  it('renders the app when nothing is wrong', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    act(() => root.render(<RootBoundary><p>ok</p></RootBoundary>))
    expect(el.textContent).toBe('ok')
    act(() => root.unmount())
    el.remove()
  })
})
