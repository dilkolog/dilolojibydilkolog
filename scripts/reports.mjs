// The owner's look at what people reported and at how much the social side is used. Read-only, except --unpublish.
//
//   REPORTS_TOKEN=…  node scripts/reports.mjs [days]            reports of the last days (default 7) and the use counters
//   REPORTS_TOKEN=…  node scripts/reports.mjs --unpublish <id>  take a community-library list off the library
//
// REPORTS_TOKEN is a long random secret set as a Worker secret of the same name (Cloudflare → Settings → Variables and
// Secrets) and kept by the owner; without it set on the Worker the endpoint does not exist. BASE_URL defaults to the live site.
const BASE = (process.env.BASE_URL ?? 'https://diloloji.com').replace(/\/$/, '')
const token = process.env.REPORTS_TOKEN?.trim()
if (!token) {
  console.error('REPORTS_TOKEN is not set.')
  process.exit(1)
}
const headers = { authorization: `Bearer ${token}`, origin: BASE, 'content-type': 'application/json' }
const args = process.argv.slice(2)

if (args[0] === '--unpublish') {
  const id = args[1]
  if (!id) {
    console.error('A list id is needed: --unpublish <id>')
    process.exit(1)
  }
  const res = await fetch(`${BASE}/api/access`, { method: 'POST', headers, body: JSON.stringify({ action: 'owner-unpublish', id }) })
  console.log(res.ok ? `List ${id} is off the library (the list itself stays).` : `Not done: ${res.status} ${await res.text()}`)
  process.exit(res.ok ? 0 : 1)
}

const days = Math.min(30, Math.max(1, Number(args[0]) || 7))
const res = await fetch(`${BASE}/api/access?owner=reports&days=${days}`, { headers })
if (!res.ok) {
  console.error(`Not allowed or not set up (${res.status}). Is REPORTS_TOKEN set on the Worker and the same here?`)
  process.exit(1)
}
const { reports, usage } = await res.json()

console.log(`\n== Reports, last ${days} days: ${reports.length} ==`)
for (const r of reports) {
  console.log(`\n[${r.at.replace('T', ' ').slice(0, 16)}] ${r.kind} · ${r.reason}${r.hidden ? ' · LIST HIDDEN' : ''}  (id ${r.id})`)
  console.log(`  target ${r.target}${r.about?.name ? ` · ${r.about.name}` : ''}${r.about?.owner ? ` · account ${r.about.owner}` : ''} · reporter ${r.reporter}`)
  if (r.note) console.log(`  note: ${r.note}`)
  console.log(`  ${String(r.content).split('\n').join('\n  ')}`)
}

console.log(`\n== Social use per day (whole site, rough) ==`)
for (const [name, byDay] of Object.entries(usage)) {
  const total = Object.values(byDay).reduce((a, b) => a + b, 0)
  const line = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([d, n]) => `${d.slice(5)}: ${n}`)
    .join('  ')
  console.log(`${name.padEnd(16)} total ${String(total).padStart(4)}   ${line}`)
}
console.log('')
