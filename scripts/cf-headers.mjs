// Writes dist/_headers from vercel.json, so the app's files get the same security headers on Cloudflare
// (the Worker adds none to files: the assets layer serves them without running it).
import { readFileSync, writeFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const lines = []
for (const rule of config.headers ?? []) {
  lines.push(rule.source === '/(.*)' ? '/*' : rule.source)
  for (const h of rule.headers) lines.push(`  ${h.key}: ${h.value}`)
}
writeFileSync(new URL('../dist/_headers', import.meta.url), `${lines.join('\n')}\n`)
console.log('dist/_headers written')
