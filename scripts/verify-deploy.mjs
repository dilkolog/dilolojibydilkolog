// Run right after a deploy or as a live smoke test: checks the live site the way a visitor meets it,
// verifies bundles, headers and the API endpoints. Exits non-zero on failure.
//
//   BASE_URL      the site (default https://diloloji.com)
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

const logRes = await fetch(`${BASE}/api/log`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ name: 'smoke-test', message: 'live deploy verification' }) })
check('/api/log takes a report', logRes.status === 204, String(logRes.status))

for (const p of ['/hakkinda', '/gizlilik', '/kosullar', '/hesap-silme']) check(`${p} answers 200`, (await fetch(`${BASE}${p}`)).status === 200)
// The Android app opens full screen only if this file names it (android/README.md).
// The outside monitor's address: the Worker, Supabase and R2 answer.
const health = await fetch(`${BASE}/api/health`).catch(() => null)
const healthBody = health ? await health.json().catch(() => null) : null
check('/api/health answers 200 (Supabase and R2 reachable)', health?.status === 200 && healthBody?.ok === true, healthBody ? `supabase ${healthBody.supabase}, storage ${healthBody.storage}` : '')
const links = await fetch(`${BASE}/.well-known/assetlinks.json`)
const linksBody = await json(links)
check('/.well-known/assetlinks.json names the Android app', links.ok && /json/.test(links.headers.get('content-type') ?? '') && Array.isArray(linksBody) && linksBody.some((l) => l?.target?.package_name === 'com.diloloji.app'))

// (The old account sync roundtrip against /api/sync went with R2 sync: the data is in Supabase since 2026-11-09.)

if (failed) {
  console.error(`\n${failed} kontrol başarısız: canlı siteyi hemen kontrol et.`)
  process.exit(1)
}
console.log('\nCanlı duman kontrolleri tamam.')
