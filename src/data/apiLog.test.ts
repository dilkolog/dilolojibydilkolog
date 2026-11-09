import { describe, expect, it, vi } from 'vitest'
import { POST } from '../../api/log'

describe('/api/log', () => {
  it('logs a CSP violation by directive and blocked origin only, no paths or queries', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const body = JSON.stringify({ 'csp-report': { 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://evil.example/x.js?token=1', 'document-uri': 'https://diloloji.com/okuma?id=42' } })
    const res = await POST(new Request('https://x/api/log?csp=1', { method: 'POST', body, headers: { 'content-type': 'application/csp-report' } }))
    expect(res.status).toBe(204)
    expect(warn).toHaveBeenCalledWith('[csp-report]', JSON.stringify({ directive: 'script-src-elem', blocked: 'https://evil.example', page: '/okuma' }))
    warn.mockRestore()
  })

  it("the deploy check's test report is answered but neither logged nor counted for the weekly digest", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const post = (name: string) => POST(new Request('https://diloloji.com/api/log', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ name, message: 'live deploy verification' }) }))
    expect((await post('smoke-test')).status).toBe(204)
    expect(error).not.toHaveBeenCalled()
    expect((await post('Error')).status).toBe(204)
    expect(error).toHaveBeenCalledWith('[client-error]', expect.stringContaining('"name":"Error"'))
    error.mockRestore()
  })
})
