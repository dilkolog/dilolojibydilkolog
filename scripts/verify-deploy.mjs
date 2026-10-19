// Run right after a deploy: checks the live site the way a visitor meets it, so a bad build is seen at once
// and not when the first person cannot sign in. Exits non-zero on a failure.
//
//   BASE_URL  the site (default https://diloloji.com)
import { keyAnswer, signInSettings } from './supabase-key.mjs'

const BASE = (process.env.BASE_URL ?? 'https://diloloji.com').replace(/\/$/, '')
const { url, key } = signInSettings()
let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`)
}

const home = await fetch(`${BASE}/`, { headers: { 'cache-control': 'no-cache' } })
const html = await home.text()
check('/ answers 200', home.status === 200)
check('HSTS header present', /max-age=\d+/.test(home.headers.get('strict-transport-security') ?? ''))

// The sign-in settings are inlined in the script bundles: the live site must carry exactly the key this build used.
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

const access = await fetch(`${BASE}/api/access`, { headers: { origin: BASE } })
check('/api/access answers', access.ok)
const mail = await fetch(`${BASE}/api/push?mail=status`, { method: 'HEAD' })
check('HEAD /api/push answers 200 (not 405)', mail.status === 200)
for (const p of ['/hakkinda', '/gizlilik', '/kosullar']) check(`${p} answers 200`, (await fetch(`${BASE}${p}`)).status === 200)

if (failed) {
  console.error(`\n${failed} kontrol başarısız: canlı siteyi hemen kontrol et.`)
  process.exit(1)
}
console.log('\nCanlı kontroller tamam.')
