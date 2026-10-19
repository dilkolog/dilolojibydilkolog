// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { HelpSettings } from './HelpSettings'
import { ScreenBoundary } from '../ScreenBoundary'
import { getBuildId } from './buildId'

describe('HelpSettings', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders contact card with correct mailto link and build ID', async () => {
    await act(async () => {
      root.render(<HelpSettings language="fr" />)
    })

    expect(container.textContent).toContain('Destek ve İletişim')
    const mailLink = container.querySelector<HTMLAnchorElement>('a[href^="mailto:destek@diloloji.com"]')
    expect(mailLink).toBeTruthy()
    const href = mailLink?.getAttribute('href') || ''
    expect(href).toContain('mailto:destek@diloloji.com')
    expect(href).toContain('Diloloji%20Destek')
    expect(href).toContain('FR')

    const buildId = getBuildId()
    expect(container.textContent).toContain(buildId)
  })

  it('renders legal links with correct destinations and targets', async () => {
    await act(async () => {
      root.render(<HelpSettings language="es" />)
    })

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('.help-link-row'))
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/gizlilik')
    expect(hrefs).toContain('/kosullar')
    expect(hrefs).toContain('/hakkinda')

    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank')
    }
  })

  it('renders all FAQ items and questions', async () => {
    await act(async () => {
      root.render(<HelpSettings language="en" />)
    })

    expect(container.textContent).toContain('Sıkça Sorulan Sorular')
    const items = container.querySelectorAll<HTMLDetailsElement>('.faq-item')
    expect(items.length).toBeGreaterThanOrEqual(6)

    const firstSummary = container.querySelector('.faq-summary')
    expect(firstSummary?.textContent).toContain('Şifremi unuttum veya şifresiz giriş nasıl çalışır')
  })

  it('passes axe accessibility checks', async () => {
    await act(async () => {
      root.render(<HelpSettings language="fr" />)
    })

    const results = await axe.run(container, {
      rules: {
        // In happy-dom color contrast is not measurable without real layout engine
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})

describe('ScreenBoundary Support Link', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders "Sürerse bize yaz" link in ScreenBoundary when error occurs', async () => {
    function BrokenComponent(): null {
      throw new Error('Simüle edilmiş bileşen hatası')
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      root.render(
        <ScreenBoundary resetKey="test-screen" onHome={() => {}}>
          <BrokenComponent />
        </ScreenBoundary>
      )
    })

    expect(container.textContent).toContain('Bu ekran açılamadı')
    expect(container.textContent).toContain('Simüle edilmiş bileşen hatası')

    const supportLink = container.querySelector<HTMLAnchorElement>('a[href^="mailto:destek@diloloji.com"]')
    expect(supportLink).toBeTruthy()
    expect(supportLink?.textContent).toContain('Sürerse bize yaz')
    const href = supportLink?.getAttribute('href') || ''
    expect(href).toContain('mailto:destek@diloloji.com')
    expect(href).toContain('Sim%C3%BCle%20edilmi%C5%9F%20bile%C5%9Fen%20hatas%C4%B1')

    spy.mockRestore()
  })
})
