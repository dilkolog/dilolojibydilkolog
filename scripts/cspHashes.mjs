import { createHash } from 'node:crypto'

/** The sha256 source of every inline <script> of a page (the ones without src), as CSP writes them. */
export function inlineScriptHashes(html) {
  const out = []
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (m[1].trim()) out.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`)
  }
  return out
}

/** The policy with its script-src hashes replaced by these (the other script sources kept). */
export function withScriptHashes(policy, hashes) {
  return policy.replace(/script-src([^;]*)/, (_, sources) => `script-src ${[...sources.trim().split(/\s+/).filter((s) => s && !s.startsWith("'sha256-")), ...hashes].join(' ')}`)
}
