import { describe, expect, it, vi } from 'vitest'
import { POST } from '../../api/log'

describe('/api/log', () => {
  it('logs a CSP violation by directive and blocked origin only, no paths or queries', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const body = JSON.stringify({ 'csp-report': { 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://evil.example/x.js?token=1', 'document-uri': 'https://nigalingo.online/okuma?id=42' } })
    const res = await POST(new Request('https://x/api/log?csp=1', { method: 'POST', body, headers: { 'content-type': 'application/csp-report' } }))
    expect(res.status).toBe(204)
    expect(warn).toHaveBeenCalledWith('[csp-report]', JSON.stringify({ directive: 'script-src-elem', blocked: 'https://evil.example', page: '/okuma' }))
    warn.mockRestore()
  })
})
