// Run right after a deploy or as a live smoke test: checks the live site the way a visitor meets it,
// verifies bundles, headers, API endpoints, and if test credentials are supplied (SMOKE_USER / SMOKE_PASS),
// tests a real live account sync and conditional write roundtrip. Exits non-zero on failure.
//
//   BASE_URL      the site (default https://diloloji.com)
//   SMOKE_USER / SMOKE_PASS   a dedicated test account to verify live sync roundtrips
//   ADMIN_TOKEN   optional: after the run the test account's temporary files are cleaned up
import { keyAnswer, signInSettings } from './supabase-key.mjs'

const BASE = (process.env.BASE_URL ?? 'https://diloloji.com').replace(/\/$/, '')
const APP = { origin: BASE }
const { url, key } = signInSettings()
let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`)
}
const json = async (res) => res.json().catch(() => ({}))
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const normalize = (u) => u.trim().normalize('NFC').replace(/[İIı]/g, 'i').toLowerCase()

// 1. Visitor experience & HTTP headers
const home = await fetch(`${BASE}/`, { headers: { 'cache-control': 'no-cache' } })
const html = await home.text()
check('/ answers 200', home.status === 200)
check('HSTS header present', /max-age=\d+/.test(home.headers.get('strict-transport-security') ?? ''))

// 2. Client script bundles & Supabase authentication keys
const scripts = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])
let live = new Set()
let liveUrl = new Set()
for (const path of scripts) {
  const js = await (await fetch(`${BASE}${path}`)).text()
  for (const m of js.matchAll(/sb_publishable_[A-Za-z0-9_-]+/g)) live.add(m[0])
  for (const m of js.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co/g)) liveUrl.add(m[0])
}
if (key) {
  check('live bundle carries this build\'s Supabase key', live.has(key), live.size ? `live has ${[...live].map((k) => `${k.length} chars …${k.slice(-4)}`).join(', ')}` : 'no Supabase key in the bundle: sign-in gate is off')
  check('live bundle carries this build\'s Supabase URL', !url || liveUrl.has(url))
}
const sinks = [...live]
for (const k of sinks) {
  const answer = await keyAnswer({ url: url || [...liveUrl][0], key: k })
  if (answer === 'unreachable') console.log('– Supabase could not be reached from here; its answer to the key was not checked')
  else check(`Supabase accepts the live key (…${k.slice(-4)})`, answer === 'ok', answer)
}

// 3. API endpoints & server services
const access = await fetch(`${BASE}/api/access`, { headers: APP })
const accessBody = await json(access)
check('/api/access answers', access.ok, typeof accessBody.enabled === 'boolean' ? `approval ${accessBody.enabled ? 'on' : 'off'}` : '')

const mailHead = await fetch(`${BASE}/api/push?mail=status`, { method: 'HEAD' })
check('HEAD /api/push answers 200 (not 405)', mailHead.status === 200)

const mailStatus = await fetch(`${BASE}/api/push?mail=status`)
const mailBody = await json(mailStatus)
check('mail reminders: Resend is configured on the server', mailStatus.ok && mailBody.available === true, mailBody.available ? '' : 'RESEND_API_KEY missing')

const logRes = await fetch(`${BASE}/api/log`, { method: 'POST', body: JSON.stringify({ name: 'smoke-test', message: 'live deploy verification' }) })
check('/api/log takes a report', logRes.status === 204, String(logRes.status))

for (const p of ['/hakkinda', '/gizlilik', '/kosullar']) check(`${p} answers 200`, (await fetch(`${BASE}${p}`)).status === 200)

// 4. Live account sync roundtrip (if credentials are provided)
const user = process.env.SMOKE_USER
const pass = process.env.SMOKE_PASS
if (user && pass) {
  async function derive(username, password) {
    const u = normalize(username)
    const id = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kelime-koc-account:${u}`)))
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(`kelime-koc-account-v1:${u}`), iterations: 310_000, hash: 'SHA-256' }, base, 512))
    return { id, auth: hex(bits.slice(32).buffer) }
  }

  const acc = await derive(user, pass)
  const headers = { 'x-sync-id': acc.id, 'x-sync-auth': acc.auth, ...APP }
  const urlFor = (part) => `${BASE}/api/sync?id=${acc.id}&part=${part}`
  const part = `tx-${hex(crypto.getRandomValues(new Uint8Array(20)))}`
  const put = (extra, body = 'smoke') => fetch(urlFor(part), { method: 'PUT', headers: { ...headers, ...extra }, body })

  const status = await json(await fetch(`${BASE}/api/access`, { headers }))
  check('test account is approved', status.status === 'approved', `status: ${status.status}`)

  const created = await put({ 'if-none-match': '*' })
  check('create-only write of a new file', created.status === 204, String(created.status))
  const again = await put({ 'if-none-match': '*' })
  check('create-only write onto existing file is 412 (not 500)', again.status === 412, String(again.status))

  const read = await fetch(urlFor(part), { headers })
  const etag = read.headers.get('etag')
  check('file reads back with an ETag', read.ok && !!etag && (await read.text()) === 'smoke')
  const stale = await put({ 'if-match': '"not-the-etag"' })
  check('write with stale ETag is 412', stale.status === 412, String(stale.status))
  const fresh = await put({ 'if-match': etag ?? '' }, 'smoke2')
  check('write with current ETag succeeds (204)', fresh.status === 204, String(fresh.status))

  if (process.env.ADMIN_TOKEN) {
    const res = await fetch(`${BASE}/api/admin`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'release', username: user }),
    })
    const body = await json(res)
    check('test account was cleaned up', res.ok, `${body.removed ?? 0} files removed`)
  } else {
    console.log('– (ADMIN_TOKEN not given: test account keeps a small smoke file)')
  }
} else {
  console.log('– (SMOKE_USER / SMOKE_PASS not given: live account sync check skipped)')
}

if (failed) {
  console.error(`\n${failed} kontrol başarısız: canlı siteyi hemen kontrol et.`)
  process.exit(1)
}
console.log('\nCanlı duman kontrolleri tamam.')
