import { describe, expect, it } from 'vitest'
import { API_CSP, hardened, PAGE_CSP } from '../../worker/hardened'

describe('what every API answer carries', () => {
  it('no sniffing, no framing, and a policy that runs nothing', () => {
    const res = hardened(Response.json({ ok: 1 }), false)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('content-security-policy')).toBe(API_CSP)
  })

  it('the reminder pages (HTML) keep their styles, pictures and button, and cannot be framed', async () => {
    const res = hardened(new Response('<p>x</p>', { headers: { 'content-type': 'text/html; charset=utf-8' } }), false)
    expect(res.headers.get('content-security-policy')).toBe(PAGE_CSP)
    expect(PAGE_CSP).toContain("frame-ancestors 'none'")
    expect(PAGE_CSP).not.toContain('script-src')
    expect(await res.text()).toBe('<p>x</p>')
  })

  it('a handler’s own policy stands, and HEAD drops the body', async () => {
    const res = hardened(new Response('x', { headers: { 'content-security-policy': "default-src 'self'" } }), true)
    expect(res.headers.get('content-security-policy')).toBe("default-src 'self'")
    expect(await res.text()).toBe('')
  })
})
