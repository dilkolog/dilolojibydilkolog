// Refuses to deploy a build without the sign-in settings: Vite inlines VITE_* values when it builds, so a
// build made without them silently falls back to the old username sign-in and drops the required account.
// It also refuses a key that is cut short or that Supabase itself turns away (every sign-in would fail with
// "Invalid API key"); when Supabase cannot be reached from here that last test is skipped with a warning.
import { keyAnswer, keyShapeProblem, signInSettings } from './supabase-key.mjs'

const NEED = { VITE_SUPABASE_URL: 'url', VITE_SUPABASE_PUBLISHABLE_KEY: 'key' }
const settings = signInSettings()
const missing = Object.keys(NEED).filter((name) => !settings[NEED[name]])
if (!/^https:\/\//.test(settings.url) && !missing.includes('VITE_SUPABASE_URL')) missing.push('VITE_SUPABASE_URL (https:// ile başlamalı)')

if (missing.length) {
  console.error(`\nDağıtım durduruldu: giriş ayarları yok (${missing.join(', ')}).`)
  console.error('Bu değerler olmadan site eski kullanıcı adı girişiyle yayına çıkar ve zorunlu hesap devre dışı kalır.')
  console.error('Proje klasöründe .env.local dosyasına şunları yaz, sonra yeniden dene:')
  for (const name of Object.keys(NEED)) console.error(`  ${name}=...`)
  console.error('(Değerler Supabase panelinde Project Settings → API Keys sayfasında: Project URL ve Publishable key.)\n')
  process.exit(1)
}

const shape = keyShapeProblem(settings.key)
if (shape && !process.env.SKIP_KEY_CHECK) {
  console.error(`\nDağıtım durduruldu: VITE_SUPABASE_PUBLISHABLE_KEY geçersiz görünüyor: ${shape}.`)
  console.error('Supabase → Project Settings → API Keys → Publishable key değerini kopyala düğmesiyle yeniden al.')
  console.error('(Yine de devam etmek için: SKIP_KEY_CHECK=1)\n')
  process.exit(1)
}

const answer = process.env.SKIP_KEY_CHECK ? 'unreachable' : await keyAnswer(settings)
if (answer === 'invalid') {
  console.error('\nDağıtım durduruldu: Supabase bu anahtarı reddetti (Invalid API key). Anahtar yenilenmiş ya da yanlış kopyalanmış olabilir.')
  console.error('Supabase → Project Settings → API Keys → Publishable key değerini yeniden al.\n')
  process.exit(1)
}
console.log(answer === 'ok' ? 'Giriş ayarları tamam: Supabase anahtarı doğrulandı.' : 'Giriş ayarları var (Supabase\'e bu makineden ulaşılamadı, anahtar canlıda sınanacak).')
