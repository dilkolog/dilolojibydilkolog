import { overLimit, tooMany } from './_rate.js'
/**
 * Client error reports (src/data/errorReport.ts): one line each in the Vercel logs, searchable as
 * `[client-error]`. The device already scrubbed them; here they are only checked for shape and size.
 * Nothing is stored, and the request's address and browser aren't written.
 *
 * POST /api/log  { name, message, stack: string[], where }
 * POST /api/log?csp=1  a browser's Content-Security-Policy violation report ({ "csp-report": … }):
 * one `[csp-report]` line with the directive and the blocked origin (no paths or queries), to see
 * what the report-only policy would block before enforcing it.
 */
const MAX_BODY = 4096

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export async function POST(request: Request): Promise<Response> {
  if (overLimit(request, 'log', 60)) return tooMany()
  const text = await request.text().catch(() => '')
  if (!text || text.length > MAX_BODY) return new Response(null, { status: 413 })
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    return new Response(null, { status: 400 })
  }
  const csp = body['csp-report']
  if (csp && typeof csp === 'object') {
    const r = csp as Record<string, unknown>
    const origin = (v: unknown) => {
      const raw = str(v, 300)
      try {
        return new URL(raw).origin
      } catch {
        return raw.slice(0, 40)
      }
    }
    console.warn('[csp-report]', JSON.stringify({ directive: str(r['effective-directive'] ?? r['violated-directive'], 60), blocked: origin(r['blocked-uri']), page: str(r['document-uri'], 300).replace(/[?#].*$/, '').replace(/^https?:\/\/[^/]+/, '') }))
    return new Response(null, { status: 204 })
  }
  const report = {
    name: str(body.name, 40),
    message: str(body.message, 200),
    stack: Array.isArray(body.stack) ? body.stack.slice(0, 8).map((f) => str(f, 160)) : [],
    where: str(body.where, 30),
  }
  if (!report.name && !report.message) return new Response(null, { status: 400 })
  console.error('[client-error]', JSON.stringify(report))
  return new Response(null, { status: 204 })
}
