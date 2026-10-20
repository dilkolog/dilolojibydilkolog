# Cloudflare'e taşınma (Vercel Hobby kotası dolduğu için)

Uygulama tek bir Cloudflare Worker olarak çalışır: statik dosyalar (`dist/`) Workers Static Assets ile
(ücretsiz, sınırsız), `/api/*` ise `api/*.ts` işleyicileriyle (`worker/index.ts`). Vercel yapılandırması
(`vercel.json`, `api/`) olduğu gibi duruyor; ikisi birlikte çalışabilir.

## Nasıl çalışıyor
- `worker/index.ts`: `/api/<ad>` isteğini `api/<ad>.ts` dosyasındaki `GET/POST/PUT/DELETE` işleyicisine verir;
  saatlik cron (`scheduled`) `api/cron-reminder.ts`yi çağırır (Vercel'deki 24 günlük cron yerine tek `0 * * * *`).
- `wrangler.jsonc` `alias`: `@vercel/blob` → `worker/blob.ts` (R2), `web-push` → `worker/webpush.ts` (Web Crypto).
  `api/` kodu değişmedi; birim testleri hâlâ `@vercel/blob`u taklit eder.
- `scripts/cf-headers.mjs`: `vercel.json`daki güvenlik başlıklarından `dist/_headers` üretir (statik dosyalar için).
- Yerelde: `npm run dev:cf` (derler, `.dev.vars` dosyasındaki gizlilerle `wrangler dev`).

## Sahibinin yapacakları (bir kez)
1. Cloudflare hesabı aç (ücretsiz). `npx wrangler login`.
2. R2 kovası: `npx wrangler r2 bucket create diloloji-blobs` (R2 için kart bilgisi istenebilir; ücretsiz kota içinde ücret çıkmaz).
3. Gizlileri ekle (Vercel'deki ortam değişkenlerinin aynıları), her biri için `npx wrangler secret put <AD>`:
   `CRON_SECRET` (yeni, rastgele uzun), `ADMIN_TOKEN`, `SYNC_ALLOWED`, `DEEPL_AUTH_KEY`, `VAPID_PRIVATE_KEY`,
   `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` (varsa), `SUPABASE_URL` (ya da `VITE_SUPABASE_URL`),
   `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY` (varsa). Düz değişkenler: `APP_URL` (ana adres:
   `https://diloloji.com`) ve `APP_HOSTS` (izinli adresler, virgülle: `diloloji.<hesap>.workers.dev,diloloji.com,www.diloloji.com`).
   Vercel panelindeki Environment Variables listesine bakıp hepsini aynı adlarla gir.
4. Dağıt: `npm run deploy:cf` (ilk dağıtım `https://diloloji.<hesap>.workers.dev` adresini verir).
5. Alan adı: `diloloji.com`un DNS'i Cloudflare'de olmalı (Cloudflare → Add a site → alan adını ekle, kayıt
   şirketinde ad sunucularını Cloudflare'inkilere çevir). Sonra Workers → diloloji → Settings → Domains &
   Routes → Add → Custom domain: `diloloji.com` (ve `www.diloloji.com`).
6. İsteğe bağlı otomatik dağıtım: Workers → diloloji → Settings → Builds → GitHub deposunu bağla;
   build komutu `npm run build:cf`, deploy komutu `npx wrangler deploy`.
7. Supabase → Authentication → URL Configuration: yeni adresi (Site URL / Redirect URLs) ekle; Google girişi
   kullanıyorsan Google Cloud'daki yetkili kaynaklara da ekle.
8. Eski Blob verisi (isteğe bağlı, gerekmez): `BLOB_READ_WRITE_TOKEN=... node scripts/migrate-blob-to-r2.mjs`
   (Vercel kotası okumaya izin verirken). Taşımazsan: cihazlar verisini bir sonraki eşitlemede yeniden yükler,
   hesaplar kimliklerini yeniden alır, hatırlatma kayıtları uygulama açılınca yeniden yazılır.

## Ücretsiz plan sınırları (Cloudflare Workers Free)
- Günde 100 bin Worker isteği (statik dosyalar sayılmaz), kota her gün 00:00 UTC'de sıfırlanır.
- İstek başına 10 ms CPU ve 50 alt istek (fetch, R2, Supabase çağrıları dahil). Haber/altyazı çekme ya da çok
  cihazlı saatlik cron bunu aşarsa günlükte "Exceeded CPU/subrequest limit" görünür; çözüm Workers Paid (ayda 5 dolar).
- R2: 10 GB, ayda 1 milyon yazma, 10 milyon okuma işlemi, çıkış ücretsiz.

## Günlükler ve hata izleme
Worker ve istemci hatalarını canlı veya geçmişe dönük izlemek için Cloudflare iki araç sunar:

1. **Canlı Akış (Wrangler Tail):**
   Terminalden anlık olarak tüm istek ve günlük akışını izlemek için:
   ```bash
   npx wrangler tail diloloji
   ```
   Filtreleme örnekleri:
   ```bash
   # Yalnızca hataları izle
   npx wrangler tail diloloji --status error
   # Yalnızca belirli bir arama kelimesini içeren günlükler
   npx wrangler tail diloloji --search "[client-error]"
   ```

2. **Cloudflare Dashboard (Workers Logs):**
   - **Konum:** Cloudflare Dashboard → Workers & Pages → `diloloji` → **Logs** (veya **Metrics**).
   - "Begin log stream" düğmesine basıldığında tarayıcı üzerinden anlık JSON log akışı açılır.
   - Workers Logs açık tutulduğunda geriye dönük son logları filtreleme imkanı sağlar.

3. **Log Etiketleri ve Arama:**
   - `[client-error]`: İstemcide (`src/main.tsx`, `RootBoundary.tsx` vb.) yakalanan ve `/api/log` ucuna `POST` edilen React ve JS çalışma zamanı hataları.
   - `[worker-error]`: `worker/index.ts` içindeki genel try/catch mekanizması tarafından yakalanan sunucu uç noktası hataları (500 Internal Server Error durumları).
   - `[csp-report]`: Tarayıcının Content Security Policy Report-Only ihlallerini `/api/log?csp=1` ucuna gönderdiği raporlar.


## Otomatik dağıtım (Workers Builds)

Her dağıtımı elle yapmak yerine Cloudflare, GitHub'daki `main` dalına birleştirme olunca siteyi kendisi derleyip yayınlayabilir (GitHub Actions dakikası harcamaz). Tek seferlik kurulum, sahibi tarafından Cloudflare panelinde yapılır:

1. Cloudflare Dashboard → Workers & Pages → **diloloji** → Settings → **Builds** → *Connect* → GitHub'da `nigalingobydilkolog` deposunu seç, üretim dalı `main`.
2. **Build command:** `npm ci && node scripts/check-deploy-env.mjs && npm run build:cf`
3. **Deploy command:** `npx wrangler deploy`
4. **Build variables and secrets** bölümüne (Worker'ın çalışma zamanı gizlilerinden AYRI bir liste): `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API Keys → Publishable key; kopyala düğmesiyle al, eksik karakter olmasın). Ayrıca `NODE_VERSION` = `24`.
5. Kaydet; sonraki her birleştirme otomatik dağıtılır. Yanlış kopyalanmış bir anahtar `check-deploy-env.mjs` ile derleme aşamasında durdurulur (yayına çıkmaz).

Dağıtımdan sonra canlıyı denetlemek için: `npm run verify:deploy` (ana sayfa, HSTS, canlı paketteki Supabase anahtarı, Supabase'in anahtara cevabı, birkaç uç). `npm run deploy:cf` bunu kendisi de çalıştırır.

## Canlı düello odaları (Durable Object)

`worker/duelRoom.ts` oda başına bir Durable Object'tir (`DUEL` bağlaması, `wrangler.jsonc` `durable_objects` + `migrations`). Kullanıcı `/?oda=KOD` bağlantısıyla ya da kodla girer; tarayıcı `wss://…/api/room?code=KOD` adresine bağlanır, Worker bağlantıyı koda göre adlandırılmış nesneye verir. Oda yalnızca bellektedir (kimse bağlı değilken nesne boşalır, hiçbir şey saklanmaz). Ücretsiz plan SQLite tabanlı Durable Object'lere izin verir (`new_sqlite_classes`); ilk dağıtımda `v1` göçü kendiliğinden uygulanır. Yerelde denemek: `npx wrangler dev --local` ve `ws` paketiyle iki bağlantı (Origin başlığı uygulamanın adresi olmalı).
