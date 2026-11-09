// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { HelpSettings } from './HelpSettings'
import { SUPPORT_MAIL, supportMailto } from './helpInfo'

describe('support mail', () => {
  it('opens a mail to support with the version, browser and connection already in it', () => {
    const url = new URL(supportMailto('Bu ekran açılamadı (today)'))
    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe(SUPPORT_MAIL)
    expect(url.searchParams.get('subject')).toBe('Diloloji: Bu ekran açılamadı (today)')
    const body = url.searchParams.get('body') ?? ''
    expect(body).toContain('Sürüm:')
    expect(body).toContain('Tarayıcı:')
    expect(body).toContain('Bağlantı:')
  })
})

describe('HelpSettings', () => {
  it('has the support address, the policies and the usual questions', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => root.render(<HelpSettings />))
    expect(host.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')?.href).toContain(SUPPORT_MAIL)
    expect([...host.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(expect.arrayContaining(['/gizlilik.html', '/kosullar.html']))
    // Each question is a settings row, so Settings search finds it.
    expect(host.querySelectorAll('.setting-row.help-q').length).toBeGreaterThanOrEqual(6)
    await act(() => root.unmount())
  })
})
