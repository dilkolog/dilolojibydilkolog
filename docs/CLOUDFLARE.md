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
   `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY` (varsa). Düz değişkenler: `APP_URL` (ana adres, örn.
   `https://nigalingo.online`) ve `APP_HOSTS` (izinli adresler, virgülle: `diloloji.<hesap>.workers.dev,nigalingo.online`).
   Vercel panelindeki Environment Variables listesine bakıp hepsini aynı adlarla gir.
4. Dağıt: `npm run deploy:cf` (ilk dağıtım `https://diloloji.<hesap>.workers.dev` adresini verir).
5. Alan adı: `nigalingo.online`ın DNS'i Cloudflare'de olmalı (Cloudflare → Add a site → alan adını ekle, kayıt
   şirketinde ad sunucularını Cloudflare'inkilere çevir). Sonra Workers → diloloji → Settings → Domains &
   Routes → Add → Custom domain: `nigalingo.online`.
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
