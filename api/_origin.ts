/**
 * Who may call the endpoints that cost something (a key's quota, a paid or limited service): only
 * the app's own pages. A same-origin fetch, or a request whose Origin or Referer is the app's.
 * Browsers always send these; it keeps a stranger's script from using up the owner's quota.
 */

/** More hosts of the app besides the built-in ones (the Cloudflare address, a new domain): APP_HOSTS, comma separated. */
export const extraHosts = (): string[] => (process.env.APP_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)

/** The app's own pages: production, its Vercel previews, and development on this machine. */
export function fromApp(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true
  const from = request.headers.get('origin') ?? request.headers.get('referer')
  if (!from) return false
  try {
    const host = new URL(from).hostname
    return host === 'nigalingo.online' || host === 'www.nigalingo.online' || host === 'kelime-koc.vercel.app' || host === 'diloloji.vercel.app' || /^(?:kelime-koc|diloloji)-[a-z0-9-]+\.vercel\.app$/.test(host) || extraHosts().includes(host) || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  } catch {
    return false
  }
}
