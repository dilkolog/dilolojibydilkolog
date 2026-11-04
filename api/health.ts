import { checkHealth } from './_health.js'
import { overLimit, tooMany } from './_rate.js'

/**
 * GET /api/health: for an outside monitor (UptimeRobot or similar): 200 when the Worker, Supabase and R2 answer, 503
 * when one of them does not. Says nothing more than ok/down per part (no settings, no secrets). Open to anyone, a
 * minute's limit per address.
 */
export async function GET(request: Request): Promise<Response> {
  if (overLimit(request, 'health', 30)) return tooMany()
  const health = await checkHealth()
  return Response.json({ ...health, at: new Date().toISOString() }, { status: health.ok ? 200 : 503, headers: { 'cache-control': 'no-store' } })
}
