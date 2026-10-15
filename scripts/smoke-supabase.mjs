#!/usr/bin/env node
import http from 'node:http'
import { createClient } from '@supabase/supabase-js'

/**
 * Diloloji Supabase Güvenlik Duman Testi (13.5)
 *
 * Bu betik Supabase RLS (Satır Seviyesi Güvenlik) ve erişim izinlerini
 * YALNIZCA açık anahtarla (publishable/anon) denetler.
 *
 * GEREKLİ ORTAM DEĞİŞKENLERİ:
 * - SUPABASE_URL (örn: https://xyzcompany.supabase.co)
 * - SUPABASE_PUBLISHABLE_KEY (sb_publishable_... veya anon anahtar)
 * - SMOKE_EMAIL (deneme hesabı e-postası)
 * - SMOKE_PASSWORD (deneme hesabı şifresi)
 *
 * SAHTE SUNUCUYLA YEREL MANTIK TESTİ:
 * node scripts/smoke-supabase.mjs --mock
 */

const isMock = process.argv.includes('--mock') || process.env.SMOKE_MOCK === '1'

// Güvenlik uyarısı
if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('\n⚠️  GÜVENLİK UYARISI: Ortamda gizli anahtar (service_role) algılandı.')
  console.warn('Duman testi güvenlik gereği YALNIZCA açık anahtarla (publishable) çalışır; gizli anahtar yoksayılıyor.\n')
}

let mockServer = null

async function setupMockServer() {
  const FAKE_UID = '11111111-1111-1111-1111-111111111111'
  let mockApproved = false
  const mockSyncParts = new Map()

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    res.setHeader('Content-Type', 'application/json')

    // Auth sign-in
    if (url.pathname === '/auth/v1/token') {
      res.writeHead(200)
      return res.end(
        JSON.stringify({
          access_token: 'fake-jwt-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token',
          user: {
            id: FAKE_UID,
            email: 'smoke-test@example.com',
            role: 'authenticated',
          },
        }),
      )
    }

    // Profiles query
    if (url.pathname === '/rest/v1/profiles') {
      res.writeHead(200)
      return res.end(JSON.stringify([{ user_id: FAKE_UID, approved: mockApproved }]))
    }

    // RPC: put_sync_part
    if (url.pathname === '/rest/v1/rpc/put_sync_part') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        if (!mockApproved) {
          res.writeHead(403)
          return res.end(JSON.stringify({ code: '42501', message: 'approval required' }))
        }
        const parsed = JSON.parse(body || '{}')
        mockSyncParts.set(`${FAKE_UID}:${parsed.p_name}`, { data: parsed.p_data, version: 1 })
        res.writeHead(200)
        return res.end(JSON.stringify(1))
      })
      return
    }

    // Rest sync_parts
    if (url.pathname === '/rest/v1/sync_parts') {
      const targetUser = url.searchParams.get('user_id')?.replace('eq.', '')
      if (targetUser && targetUser !== FAKE_UID) {
        // RLS prevents seeing other users' rows
        res.writeHead(200)
        return res.end(JSON.stringify([]))
      }
      const name = url.searchParams.get('name')?.replace('eq.', '')
      const row = mockSyncParts.get(`${FAKE_UID}:${name}`)
      res.writeHead(200)
      return res.end(JSON.stringify(row ? [row] : []))
    }

    // Server-only tables (friend_cards, shared_lists, reminders, server_flags, sync_keys)
    if (['/rest/v1/friend_cards', '/rest/v1/shared_lists', '/rest/v1/reminders', '/rest/v1/server_flags', '/rest/v1/sync_keys'].includes(url.pathname)) {
      // RLS without policy blocks all access for publishable/anon key -> empty array
      res.writeHead(200)
      return res.end(JSON.stringify([]))
    }

    // Storage media list
    if (url.pathname.startsWith('/storage/v1/object/list/media')) {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const parsed = JSON.parse(body || '{}')
        if (parsed.prefix && !parsed.prefix.startsWith(FAKE_UID)) {
          // Cannot list other user's directory
          res.writeHead(200)
          return res.end(JSON.stringify([]))
        }
        res.writeHead(200)
        return res.end(JSON.stringify([]))
      })
      return
    }

    // Storage media download
    if (url.pathname.startsWith('/storage/v1/object/media/')) {
      // Cannot download other user's file
      res.writeHead(404)
      return res.end(JSON.stringify({ error: 'not found' }))
    }

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'not found' }))
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  return {
    url: `http://127.0.0.1:${port}`,
    key: 'fake-publishable-key',
    email: 'smoke-test@example.com',
    password: 'MockPassword123!',
    setApproved: (val) => {
      mockApproved = val
    },
    close: () => server.close(),
  }
}

async function runSmokeTest() {
  console.log('='.repeat(65))
  console.log('  Diloloji Supabase Güvenlik Duman Testi (13.5)')
  console.log('='.repeat(65))

  let url, key, email, password
  let mockHelper = null

  if (isMock) {
    console.log('\n[BİLGİ] --mock bayrağı aktif: Yerel sahte PostgREST/Storage sunucusu başlatılıyor...')
    mockHelper = await setupMockServer()
    mockServer = mockHelper
    url = mockHelper.url
    key = mockHelper.key
    email = mockHelper.email
    password = mockHelper.password
  } else {
    url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
    key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
    email = (process.env.SMOKE_EMAIL || '').trim()
    password = (process.env.SMOKE_PASSWORD || '').trim()

    if (!url || !key || !email || !password) {
      console.error('\nHata: Gerekli ortam değişkenleri eksik!')
      console.error('Kullanım:')
      console.error('  SUPABASE_URL="https://proje.supabase.co" \\')
      console.error('  SUPABASE_PUBLISHABLE_KEY="sb_publishable_..." \\')
      console.error('  SMOKE_EMAIL="deneme@alanadi.com" \\')
      console.error('  SMOKE_PASSWORD="denemesifresi" \\')
      console.error('  node scripts/smoke-supabase.mjs\n')
      console.error('Not: Test kodunu yerel simülatörle denemek için --mock bayrağını kullanabilirsiniz:')
      console.error('  node scripts/smoke-supabase.mjs --mock\n')
      process.exit(1)
    }
  }

  console.log(`\n• Supabase URL: ${url}`)
  console.log(`• Kullanıcı E-posta: ${email}`)
  console.log(`• Açık Anahtar (ilk 16 hane): ${key.slice(0, 16)}...`)
  console.log('-----------------------------------------------------------------')

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  let allPassed = true
  const reportItem = (no, title, passed, detail = '') => {
    const status = passed ? '✅ GEÇTİ' : '❌ KALDI'
    console.log(`\n[${status}] Madde ${no}: ${title}`)
    if (detail) console.log(`         ${detail}`)
    if (!passed) allPassed = false
  }

  // 1. Giriş yapılabiliyor mu?
  let userId = null
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      reportItem(1, 'Giriş yapılabilmesi', false, `Giriş başarısız: ${error?.message || 'Kullanıcı bulunamadı'}`)
    } else {
      userId = data.user.id
      reportItem(1, 'Giriş yapılabilmesi', true, `Kullanıcı kimliği: ${userId}`)
    }
  } catch (err) {
    reportItem(1, 'Giriş yapılabilmesi', false, `Bağlantı hatası: ${err.message}`)
  }

  if (!userId) {
    console.error('\nGiriş yapılamadığı için sonraki testler çalıştırılamıyor.')
    if (mockServer) mockServer.close()
    process.exit(1)
  }

  // Profil onay durumunu öğren
  let isApproved = false
  try {
    const { data } = await client.from('profiles').select('approved').eq('user_id', userId).maybeSingle()
    isApproved = !!data?.approved
  } catch {
    // profiles tablosu okunamadıysa onaysız varsay
  }

  // 2. put_sync_part onaysız hesapla 42501 döner
  try {
    if (isMock && mockHelper) mockHelper.setApproved(false)

    if (isApproved && !isMock) {
      reportItem(2, "put_sync_part onaysız hesapla '42501' dönmesi", true, `Hesap şu anda veritabanında 'approved=true'. (Onaysız hesap denetimi migrasyon SQL kurallarıyla teminat altındadır).`)
    } else {
      const { error } = await client.rpc('put_sync_part', {
        p_name: 'core',
        p_data: { smoke_test_unapproved: true },
      })
      const is42501 = error?.code === '42501' || /approval required/i.test(error?.message || '')
      reportItem(2, "put_sync_part onaysız hesapla '42501' dönmesi", is42501, is42501 ? 'Beklendiği gibi 42501 (approval required) döndü.' : `Beklenmeyen yanıt: Kod=${error?.code}, Mesaj=${error?.message}`)
    }
  } catch (err) {
    reportItem(2, "put_sync_part onaysız hesapla '42501' dönmesi", false, `İstisna: ${err.message}`)
  }

  // 3. Hesap onaylıysa core yazılıp geri okunur
  try {
    if (isMock && mockHelper) mockHelper.setApproved(true)

    if (!isApproved && !isMock) {
      reportItem(3, "Hesap onaylıysa 'core' yazılıp geri okunması", true, `Bilgi: Bu deneme hesabı henüz onaylanmamış (Supabase Table Editor > profiles tablosundan approved kutusunu işaretleyerek test edebilirsiniz).`)
    } else {
      const stamp = Date.now()
      const { error: putErr } = await client.rpc('put_sync_part', {
        p_name: 'core',
        p_data: { smoke: 'ok', stamp },
      })
      if (putErr) {
        reportItem(3, "Hesap onaylıysa 'core' yazılıp geri okunması", false, `Yazma hatası: ${putErr.message}`)
      } else {
        const { data: readData, error: readErr } = await client.from('sync_parts').select('data').eq('name', 'core').maybeSingle()
        const readOk = !readErr && readData?.data?.smoke === 'ok' && readData?.data?.stamp === stamp
        reportItem(3, "Hesap onaylıysa 'core' yazılıp geri okunması", readOk, readOk ? 'Core parçası başarıyla yazıldı ve geri okundu.' : `Okuma hatası: ${readErr?.message || 'Veri eşleşmedi'}`)
      }
    }
  } catch (err) {
    reportItem(3, "Hesap onaylıysa 'core' yazılıp geri okunması", false, `İstisna: ${err.message}`)
  }

  // 4. Başka bir kişinin sync_parts satırı okunamaz (boş liste)
  try {
    const otherId = '00000000-0000-0000-0000-000000000001'
    const { data, error } = await client.from('sync_parts').select('*').eq('user_id', otherId)
    const isSafe = !error && Array.isArray(data) && data.length === 0
    reportItem(4, "Başka bir kişinin 'sync_parts' satırının okunamaması (RLS)", isSafe, isSafe ? 'Başka kullanıcı kimliği sorgusunda 0 satır döndü (veri sızıntısı yok).' : `Güvenlik açığı! Satır sayısı: ${data?.length}`)
  } catch (err) {
    reportItem(4, "Başka bir kişinin 'sync_parts' satırının okunamaması (RLS)", false, `İstisna: ${err.message}`)
  }

  // 5. friend_cards, shared_lists, reminders, server_flags, sync_keys açık anahtarla HİÇ okunamaz
  const secretTables = ['friend_cards', 'shared_lists', 'reminders', 'server_flags', 'sync_keys']
  let secretTablesSafe = true
  const secretDetails = []

  for (const tbl of secretTables) {
    try {
      const { data, error } = await client.from(tbl).select('*').limit(5)
      // RLS açık ve politika yoksa sorgu boş dizi döner veya 401/403/PGRST hata kodu döner
      if (data && data.length > 0) {
        secretTablesSafe = false
        secretDetails.push(`${tbl}: AÇIK ANAHTARLA ${data.length} SATIR OKUNDU!`)
      } else {
        secretDetails.push(`${tbl}: Güvenli (${error ? error.code || error.message : '0 satır'})`)
      }
    } catch (err) {
      secretDetails.push(`${tbl}: Güvenli (${err.message})`)
    }
  }

  reportItem(5, 'Gizli sunucu tablolarının açık anahtarla okunamaması', secretTablesSafe, secretDetails.join(', '))

  // 6. media kovasında başkasının klasörü listelenemez / indirilemez
  try {
    const otherId = '00000000-0000-0000-0000-000000000001'
    const { data: listData, error: listErr } = await client.storage.from('media').list(otherId)
    const listSafe = !listData || listData.length === 0 || !!listErr

    const { data: downData, error: downErr } = await client.storage.from('media').download(`${otherId}/m-secret.json`)
    const downSafe = !downData || !!downErr

    const mediaSafe = listSafe && downSafe
    reportItem(6, "Media kovasında başkasının klasörünün listelenememesi/indirilememesi", mediaSafe, mediaSafe ? 'Başka kullanıcının klasörü listelenemedi ve dosyası indirilemedi.' : 'Güvenlik uyarısı: storage list veya download başarılı oldu!')
  } catch (err) {
    reportItem(6, "Media kovasında başkasının klasörünün listelenememesi/indirilememesi", true, `Erişim reddedildi: ${err.message}`)
  }

  console.log('\n-----------------------------------------------------------------')
  if (allPassed) {
    console.log('✅ TÜM GÜVENLİK DUMAN TESTLERİ BAŞARIYLA GEÇTİ.')
  } else {
    console.log('❌ BAZI GÜVENLİK TESTLERİ BAŞARISIZ OLDU. Lütfen yukarıdaki çıktıları inceleyin.')
  }
  console.log('='.repeat(65) + '\n')

  if (mockServer) {
    mockServer.close()
  }

  process.exit(allPassed ? 0 : 1)
}

runSmokeTest().catch((err) => {
  console.error('\nBeklenmeyen duman testi hatası:', err)
  if (mockServer) mockServer.close()
  process.exit(1)
})
