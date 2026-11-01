// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { VerifiedBadge } from './VerifiedBadge'

describe('VerifiedBadge', () => {
  it('is one image with the approved account as its name and a seal with a check inside', () => {
    const html = renderToStaticMarkup(<VerifiedBadge />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Onaylı hesap"')
    expect(html).toContain('<polygon')
    expect(html).toContain('<path')
  })
})
