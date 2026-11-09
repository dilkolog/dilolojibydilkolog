// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VerifiedMark } from './VerifiedMark'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('VerifiedMark', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('renders with accessible role and default label', () => {
    act(() => root.render(<VerifiedMark />))
    const svg = host.querySelector('svg.verified-mark')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('aria-label')).toBe('Onaylı hesap')
    expect(svg?.querySelector('title')?.textContent).toBe('Onaylı hesap')
  })

  it('renders custom label when provided', () => {
    act(() => root.render(<VerifiedMark label="Doğrulanmış yazar" />))
    const svg = host.querySelector('svg.verified-mark')
    expect(svg?.getAttribute('aria-label')).toBe('Doğrulanmış yazar')
    expect(svg?.querySelector('title')?.textContent).toBe('Doğrulanmış yazar')
  })

  it('contains the organic emerald blossom seal and check path', () => {
    act(() => root.render(<VerifiedMark />))
    const seal = host.querySelector('.verified-mark-seal')
    const check = host.querySelector('.verified-mark-check')
    expect(seal).toBeTruthy()
    expect(check).toBeTruthy()
    expect(seal?.getAttribute('d')).toContain('M 12 2.2')
  })
})
