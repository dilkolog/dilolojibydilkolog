import { describe, expect, it, vi } from 'vitest'
import { POST } from '../../api/log'
import { scrubMessage, scrubStack, toReport } from './errorReport'

describe('error reports carry nothing personal', () => {
  it('cuts quoted text, e-mail addresses, long numbers and URL origins and queries from the message', () => {
    expect(scrubMessage(`Cannot read properties of undefined (reading 'maison')`)).toBe(`Cannot read properties of undefined (reading '…')`)
    expect(scrubMessage('No word "la maison bleue" for ali@example.com')).toBe('No word "…" for …@…')
    expect(scrubMessage('Failed https://diloloji.com/api/sync?id=abc#x code 12345678')).toBe('Failed /api/sync code …')
    expect(scrubMessage('x'.repeat(500))).toHaveLength(200)
  })

  it('keeps only function names and file positions from Chrome and Firefox/Safari stacks', () => {
    const chrome = `TypeError: boom 'secret'\n    at render (https://diloloji.com/assets/index-abc.js?v=1:12:34)\n    at https://diloloji.com/assets/vendor.js:1:2`
    expect(scrubStack(chrome)).toEqual(['render /assets/index-abc.js:12:34', '/assets/vendor.js:1:2'])
    const firefox = `render@https://diloloji.com/assets/index-abc.js:12:34\n@https://diloloji.com/assets/vendor.js:1:2`
    expect(scrubStack(firefox)).toEqual(['render /assets/index-abc.js:12:34', '/assets/vendor.js:1:2'])
    expect(scrubStack(undefined)).toEqual([])
  })

  it('makes a report from anything thrown', () => {
    expect(toReport(new RangeError(`bad "x"`), 'session')).toMatchObject({ name: 'RangeError', message: 'bad "…"', where: 'session' })
    expect(toReport('plain string', 'promise')).toEqual({ name: 'string', message: 'plain string', stack: [], where: 'promise' })
  })
})

describe('/api/log', () => {
  const post = (body: string, headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) => POST(new Request('https://app.test/api/log', { method: 'POST', headers, body }))

  it('writes one checked line to the logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await post(JSON.stringify({ name: 'TypeError', message: 'boom', stack: ['f /a.js:1:2'], where: 'today', extra: 'dropped' }))
    expect(res.status).toBe(204)
    expect(log).toHaveBeenCalledWith('[client-error]', JSON.stringify({ name: 'TypeError', message: 'boom', stack: ['f /a.js:1:2'], where: 'today' }))
    log.mockRestore()
  })

  it('refuses empty, malformed and oversized bodies', async () => {
    expect((await post('not json')).status).toBe(400)
    expect((await post('{}')).status).toBe(400)
    expect((await post('x'.repeat(5000))).status).toBe(413)
  })

  it('takes error reports only from the app\'s own pages (they count toward the weekly digest)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await post(JSON.stringify({ name: 'Fake', message: 'made up' }), { origin: 'https://evil.example' })
    expect(res.status).toBe(403)
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
