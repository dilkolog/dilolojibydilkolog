// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { VerifiedBadge } from './VerifiedBadge'

describe('VerifiedBadge', () => {
  it('renders Diloloji organic emerald blossom seal with accessible name and balanced check', () => {
    const html = renderToStaticMarkup(<VerifiedBadge />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Onaylı hesap"')
    expect(html).toContain('verified-mark-seal')
    expect(html).toContain('verified-mark-check')
  })
})
