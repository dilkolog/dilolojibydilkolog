/** An API answer is never a page to put in a frame or run scripts in; the reminder pages (HTML) get their styles and pictures only. */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
export const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"

/**
 * What an API answer carries beyond its handler's: the headers the assets layer adds to the app's files (dist/_headers)
 * do not reach /api/* (the Worker answers those), and the mail reminders' confirmation pages are HTML.
 * `bodyless`: a HEAD answer (the handler's GET without its body).
 */
export function hardened(res: Response, bodyless: boolean): Response {
  const headers = new Headers(res.headers)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  if (!headers.has('content-security-policy')) headers.set('content-security-policy', /^text\/html/i.test(headers.get('content-type') ?? '') ? PAGE_CSP : API_CSP)
  return new Response(bodyless ? null : res.body, { status: res.status, statusText: res.statusText, headers })
}
