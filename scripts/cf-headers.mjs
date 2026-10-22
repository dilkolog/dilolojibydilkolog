// Writes dist/_headers from vercel.json, so the app's files get the same security headers on Cloudflare
// (the Worker adds none to files: the assets layer serves them without running it).
// The Content-Security-Policy's script hashes are taken from the built index.html, so a change to its inline
// scripts can never ship a policy that blocks them (the app would stay on a blank page).
import { readFileSync, writeFileSync } from 'node:fs'
import { inlineScriptHashes, withScriptHashes } from './cspHashes.mjs'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const hashes = inlineScriptHashes(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'))
const lines = []
for (const rule of config.headers ?? []) {
  lines.push(rule.source === '/(.*)' ? '/*' : rule.source)
  for (const h of rule.headers) {
    const csp = h.key.startsWith('Content-Security-Policy')
    const value = csp ? withScriptHashes(h.value, hashes) : h.value
    if (csp && value !== h.value) console.warn('vercel.json script hashes differ from dist/index.html: the built ones are used (update vercel.json)')
    lines.push(`  ${h.key}: ${value}`)
  }
}
// Cloudflare adds no HSTS by itself (Vercel did): the app is https only, so browsers are told to keep it so.
lines.push('/*', '  Strict-Transport-Security: max-age=31536000; includeSubDomains')
writeFileSync(new URL('../dist/_headers', import.meta.url), `${lines.join('\n')}\n`)
console.log('dist/_headers written')
