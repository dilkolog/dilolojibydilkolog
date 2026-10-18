// A short check of the deployed site against the real services (Vercel Blob, Resend), which the
// unit tests only imitate. Run by the owner from their own machine: `node scripts/smoke-live.mjs`.
//
//   BASE_URL     the site (default https://diloloji.com)
//   SMOKE_USER / SMOKE_PASS   a DEDICATED test account (never your own): listed in SYNC_ALLOWED
//                or approved by you. Without them only the open checks run.
//   ADMIN_TOKEN  optional: after the run the test account's files are deleted (the "release" action).
//
// The sync checks write a few small files under the test account and leave nothing else behind.
const BASE = (process.env.BASE_URL ?? 'https://diloloji.com').replace(/\/$/, '')
const APP = { origin: BASE }
let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`)
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const normalize = (u) => u.trim().normalize('NFC').replace(/[İIı]/g, 'i').toLowerCase()

// The same derivation as the app (src/data/sync.ts deriveAccount): id and access token.
async function derive(username, password) {
  const u = normalize(username)
  const id = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kelime-koc-account:${u}`)))
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(`kelime-koc-account-v1:${u}`), iterations: 310_000, hash: 'SHA-256' }, base, 512))
  return { id, auth: hex(bits.slice(32).buffer) }
}

const json = async (res) => res.json().catch(() => ({}))

// 1. Open checks.
{
  const res = await fetch(`${BASE}/api/access`, { headers: APP })
  const body = await json(res)
  check('/api/access answers', res.ok && typeof body.enabled === 'boolean', `approval ${body.enabled ? 'on' : 'off'}`)
}
{
  const res = await fetch(`${BASE}/api/push?mail=status`)
  const body = await json(res)
  check('mail reminders: Resend is configured on the server', res.ok && body.available === true, body.available ? '' : 'RESEND_API_KEY missing or not seen by this deployment (redeploy after setting it)')
}
{
  const res = await fetch(`${BASE}/api/log`, { method: 'POST', body: JSON.stringify({ name: 'smoke-test', message: 'live smoke check (scripts/smoke-live.mjs)' }) })
  check('/api/log takes a report', res.status === 204, String(res.status))
}

// 2. The sync store against the real Blob.
const user = process.env.SMOKE_USER
const pass = process.env.SMOKE_PASS
if (user && pass) {
  const acc = await derive(user, pass)
  const headers = { 'x-sync-id': acc.id, 'x-sync-auth': acc.auth, ...APP }
  const url = (part) => `${BASE}/api/sync?id=${acc.id}&part=${part}`
  const part = `tx-${hex(crypto.getRandomValues(new Uint8Array(20)))}`
  const put = (extra, body = 'smoke') => fetch(url(part), { method: 'PUT', headers: { ...headers, ...extra }, body })

  const status = await json(await fetch(`${BASE}/api/access`, { headers }))
  check('the test account is approved', status.status === 'approved', `status: ${status.status}`)

  const created = await put({ 'if-none-match': '*' })
  check('create-only write of a new file', created.status === 204, String(created.status))
  const again = await put({ 'if-none-match': '*' })
  check('create-only write onto an existing file is 412 (not 500)', again.status === 412, String(again.status))

  const read = await fetch(url(part), { headers })
  const etag = read.headers.get('etag')
  check('the file reads back with an ETag', read.ok && !!etag && (await read.text()) === 'smoke')
  const stale = await put({ 'if-match': '"not-the-etag"' })
  check('write with a stale ETag is 412', stale.status === 412, String(stale.status))
  const fresh = await put({ 'if-match': etag ?? '' }, 'smoke2')
  check('write with the current ETag goes through', fresh.status === 204, String(fresh.status))

  if (process.env.ADMIN_TOKEN) {
    const res = await fetch(`${BASE}/api/admin`, { method: 'POST', headers: { authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'release', username: user }) })
    const body = await json(res)
    check('the test account was cleaned up', res.ok, `${body.removed ?? 0} files removed`)
  } else {
    console.log('(ADMIN_TOKEN not given: the test account keeps a few small files)')
  }
} else {
  console.log('(SMOKE_USER / SMOKE_PASS not given: the sync checks were skipped)')
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
