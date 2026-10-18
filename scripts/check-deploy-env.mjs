// Refuses to deploy a build without the sign-in settings: Vite inlines VITE_* values when it builds, so a
// build made without them silently falls back to the old username sign-in and drops the required account.
import { existsSync, readFileSync } from 'node:fs'

const NEED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
const FILES = ['.env.production.local', '.env.local', '.env.production', '.env']

const fromFiles = {}
for (const file of FILES) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && !(m[1] in fromFiles)) fromFiles[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

const value = (name) => (process.env[name] || fromFiles[name] || '').trim()
const missing = NEED.filter((name) => !value(name))
if (!/^https:\/\//.test(value('VITE_SUPABASE_URL')) && !missing.includes('VITE_SUPABASE_URL')) missing.push('VITE_SUPABASE_URL (https:// ile başlamalı)')

if (missing.length) {
  console.error(`\nDağıtım durduruldu: giriş ayarları yok (${missing.join(', ')}).`)
  console.error('Bu değerler olmadan site eski kullanıcı adı girişiyle yayına çıkar ve zorunlu hesap devre dışı kalır.')
  console.error('Proje klasöründe .env.local dosyasına şunları yaz, sonra yeniden dene:')
  for (const name of NEED) console.error(`  ${name}=...`)
  console.error('(Değerler Supabase panelinde Project Settings → API Keys sayfasında: Project URL ve Publishable key.)\n')
  process.exit(1)
}
console.log('Giriş ayarları tamam: Supabase değerleri derlemeye girecek.')
