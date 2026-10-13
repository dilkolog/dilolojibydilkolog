// Looks through the files git tracks for things that look like keys or tokens, so a key pasted
// into the code by mistake is found before it is pushed. Run: `npm run scan:secrets`.
// A match is a reason to look, not proof: the patterns are deliberately specific to cut noise.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PATTERNS = [
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9]{32,}\b/],
  ['Resend key', /\bre_[A-Za-z0-9]{20,}\b/],
  ['Vercel Blob token', /vercel_blob_rw_[A-Za-z0-9_]{10,}/],
  ['DeepL key', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:fx\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{30,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Azure speech key (32 hex after a key name)', /(?:speech|azure)[A-Za-z_]*key['"]?\s*[:=]\s*['"][0-9a-f]{32}['"]/i],
  ['VAPID private key', /VAPID_PRIVATE_KEY\s*=\s*['"]?[A-Za-z0-9_-]{40,}/],
]
// Files that quote key shapes on purpose (this scanner, its tests, docs that show examples).
const SKIP = [/^scripts\/scan-secrets\.mjs$/, /^package-lock\.json$/, /\.(png|jpe?g|webp|gif|ico|woff2?|mp3|ogg|wav|zip|xlsx|docx|pdf|bin|db|sqlite|wasm)$/i]

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean)
let found = 0
for (const file of files) {
  if (SKIP.some((re) => re.test(file))) continue
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (text.length > 5_000_000) continue
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const [name, re] of PATTERNS) {
      if (re.test(lines[i])) {
        found++
        console.log(`${file}:${i + 1}  ${name}`)
      }
    }
  }
}
console.log(found ? `\n${found} possible secret(s). Look at each; if real, rotate the key (docs/GUVENLIK.md) before anything else.` : `No key-shaped strings in ${files.length} tracked files.`)
process.exit(found ? 1 : 0)
