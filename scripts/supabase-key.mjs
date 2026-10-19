// Shared by the deploy checks: reads the sign-in settings the way Vite will (environment first, then the .env files)
// and tests the publishable key against Supabase itself.
import { existsSync, readFileSync } from 'node:fs'

const FILES = ['.env.production.local', '.env.local', '.env.production', '.env']

export function signInSettings() {
  const fromFiles = {}
  for (const file of FILES) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (m && !(m[1] in fromFiles)) fromFiles[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  const value = (name) => (process.env[name] || fromFiles[name] || '').trim()
  return { url: value('VITE_SUPABASE_URL').replace(/\/+$/, ''), key: value('VITE_SUPABASE_PUBLISHABLE_KEY') }
}

/**
 * A key that was cut short or padded when it was pasted is the commonest way sign-in breaks: the site builds and
 * deploys fine and then every sign-in answers "Invalid API key". New-style keys are `sb_publishable_` + 22 characters
 * + `_` + 8; the older JWT keys start with `eyJ` and have three dot-separated parts.
 */
export function keyShapeProblem(key) {
  if (/\s/.test(key)) return 'anahtarda boşluk ya da satır sonu var'
  if (key.startsWith('sb_publishable_')) return /^sb_publishable_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{8}$/.test(key) ? null : `anahtar beklenen biçimde değil (uzunluk ${key.length}, olması gereken 46): eksik ya da fazla karakter olabilir`
  if (key.startsWith('eyJ')) return key.split('.').length === 3 ? null : 'eski (JWT) anahtar eksik kopyalanmış'
  if (key.startsWith('sb_secret_')) return 'bu bir SECRET anahtar; tarayıcıya gömülmemeli (Publishable key kullan)'
  return 'anahtar sb_publishable_ ile başlamıyor'
}

/** 'ok' | 'invalid' | 'unreachable': Supabase's own answer to this key (its public auth settings endpoint). */
export async function keyAnswer({ url, key }) {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(8000) })
    if (res.ok) return 'ok'
    if (res.status === 401 || res.status === 403) return 'invalid'
    return 'unreachable'
  } catch {
    return 'unreachable'
  }
}
