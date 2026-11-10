# Supabase ile giriş (1. aşama)

Hesaplar artık Supabase'ten açılır: **e-posta + şifre**, **e-postaya giriş bağlantısı** (şifresiz) ve **Google ile giriş**. Şifre unutulursa e-postayla yenilenir, veri kaybolmaz.

## Nasıl çalışıyor

- Supabase yalnızca "bu kim?" sorusunu cevaplar. Kişinin eşitleme hesabı (eskiden kullanıcı adı ve şifreden türeyen kimlik, şifreleme anahtarı ve erişim belirteci) Supabase'te `sync_keys` tablosunda saklanır.
  - Bu tabloyu yalnızca uygulamanın sunucusu (gizli anahtarla) okur ve yazar.
  - Yeni bir cihazda yalnızca giriş yetiyor.
- Eşitlenen veriler şimdilik eskisi gibi Vercel Blob'da kalır; 2. aşamada Supabase tablolarına taşınacak.
- **İlk girişte:**
  - Cihaz eski yolla (kullanıcı adı/şifre) girişliyse, o hesap kendiliğinden yeni girişe bağlanır.
  - Değilse uygulama sorar: "Eski kullanıcı adını bağla" ya da "Yeni başla".
- **Onay:**
  - `profiles.approved` (Supabase → Table Editor → profiles → `approved` kutusu) ya da eskisi gibi uygulamadaki Yönetici kartı.
  - Yeni kişiler Yönetici kartında da "bekleyen" olarak görünür (ad + e-posta).
  - `rejected` kutusu reddeder.
- Ortam değişkenleri yoksa her şey eskisi gibidir (kullanıcı adı/şifre).

## Sahibinin yapacakları

1. **Vercel → Settings → Environment Variables** (Production + Preview):
   - `VITE_SUPABASE_URL` = `https://<proje-kimliği>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_…`. Herkese açık olmak üzere tasarlanmıştır.
   - `SUPABASE_SECRET_KEY` = Project Settings → API Keys → Secret key (`sb_secret_…`). **Yalnızca Vercel'e; sohbete ya da koda asla.**
   - Sonra **Redeploy**. `VITE_` değişkenleri derlemede okunur.
2. **Supabase → SQL Editor**: `supabase/migrations/0001_accounts.sql` dosyasının içeriğini yapıştır, Run.
3. **Authentication → URL Configuration**:
   - Site URL: `https://diloloji.com`
   - Redirect URLs:
     - `https://diloloji.com/**`
     - `https://www.diloloji.com/**`
     - Cloudflare Workers adresi: `https://diloloji.<hesap>.workers.dev/**`
     - önizlemeler için `https://*.vercel.app/**`
4. **Authentication → Sign In / Providers**:
   - **Email** açık, "Confirm email" açık.
   - **Google**: Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application).
     - Authorized redirect URI: `https://<proje-kimliği>.supabase.co/auth/v1/callback`.
     - Client ID ve Secret'ı Supabase'te Google sağlayıcısına yapıştır.
4b. **Google ile giriş, adım adım**:
   1. [console.cloud.google.com](https://console.cloud.google.com) → üstteki proje seçiciden **New Project** → ad `Diloloji` → Create (ve o projeyi seç).
   2. Sol menü → **APIs & Services → OAuth consent screen** (yeni arayüzde "Google Auth Platform") → **Get started**:
      - App name `Diloloji`, User support email = kendi adresin.
      - Audience: **External**.
      - Contact information: kendi adresin → Create.
   3. **Branding**:
      - App domain / Application home page: `https://diloloji.com`.
      - Authorized domains: `diloloji.com` ve `supabase.co`.
      - **Logo yükleme**: logo Google'ın uygulama incelemesini başlatır ve günler sürebilir. Şimdilik boş bırak.
   4. **Audience → Publish app** ("In production"). Yalnızca e-posta/profil istendiği için Google incelemesi gerekmez; yayınlanmazsa yalnızca "test kullanıcıları" girebilir.
   5. **Clients → Create client** → Application type **Web application**, ad `Diloloji web`:
      - Authorized JavaScript origins: `https://diloloji.com`, `https://www.diloloji.com`
      - Authorized redirect URIs: `https://<proje-kimliği>.supabase.co/auth/v1/callback`
      - Create.
   6. Açılan pencereden **Client ID** ve **Client secret**'ı kopyala. **Client secret'ı sohbete yazma.**
   7. Supabase → **Authentication → Sign In / Providers → Google** → Enable:
      - Client IDs: Client ID'yi yapıştır.
      - Client Secret: secret'ı yapıştır.
      - Save.
      - Bu sayfadaki "Callback URL" 5. adımdaki redirect URI ile birebir aynı olmalı.
   8. Google girişte "…supabase.co'ya devam et" yazar. Kendi alan adını göstermek Supabase'in ücretli "custom domain" özelliği; şimdilik böyle kalabilir.
5. **Authentication → Emails → SMTP Settings** (önerilir; Supabase'in kendi göndericisi saatte birkaç mail ile sınırlı):
   - Host `smtp.resend.com`, Port `465`
   - Username `resend`, Password = Resend API anahtarı
   - Sender: `hatirlatma@<doğrulanmış alan adın>`
   - Gönderici adresi doğrulanmış alan adından olmalı (`hatirlatma@diloloji.com`); `onboarding@resend.dev` yalnızca Resend hesabının kendi adresine teslim eder.
   - **Authentication → Rate Limits**: e-posta sınırını saatte ~30'a çıkar.
   - **Templates**: Türkçe şablonlar `supabase/templates/` (README'de hangi sekmeye hangi konu ve dosya).
6. Dene:
   - Ayarlar → Hesap → Giriş yap.
   - Kendi hesabın için ilk girişi, eski hesabınla girişli olduğun cihazda yap: hesabın kendiliğinden bağlanır.

## Bilerek böyle

- **Akış:** `flowType: 'implicit'`. E-postadaki bağlantı başka bir tarayıcıda (ör. iPhone'da posta uygulamasının açtığı Safari) açılsa da çalışır; PKCE akışı bağlantıyı yalnızca isteyen tarayıcıda kabul eder.
- **Kütüphane yükü:** `@supabase/supabase-js` yalnızca giriş ekranında ya da bir bağlantıdan dönüşte yüklenir; ilk açılış paketine girmez.
- **Şifreleme:** Hesap anahtarlarını Supabase saklar. Supabase'e (ve proje sahibine) erişen biri eşitlenen veriyi çözebilir. Bu, "şifreni unutsan da verin kaybolmasın" isteğinin bedeli; 2. aşamada veriler zaten tablolarda açık olacak.
- **Sunucu:** `api/_supabase.ts`. Yeni Vercel işlevi yok (Hobby'de 12 işlev sınırı dolu): uçlar `/api/access` içinde (`?vault=1`, `action: 'vault-link'`).

## 2. aşama: veriler Supabase'te (2026-10-15)

- **Ne değişti:** Supabase ile giren cihazlar verilerini Supabase'te tutuyor; eski Vercel Blob'a gitmiyorlar. Eşitlemenin birleştirme kuralları aynı kaldı, değişen yalnızca deponun yeri (`src/data/sync.ts` `PartStore`):
  - `blobStore`: eski, şifreli.
  - `supabaseStore` (`src/data/supabaseStore.ts`): açık JSON.
- **Tablo `sync_parts`:** satır güvenliğiyle herkes yalnızca kendi satırlarını görür. Yazma `put_sync_part` işleviyle yapılır; işlev onayı ve sürümü denetler, çakışmada `40001` döner. Satırlar:
  - `core`: kelimeler, durumlar, listeler, ayarlar, oyun günlükleri.
  - `ev-YYYY-MM`: o ayın cevapları.
  - `tx-…`: okuma metinleri.
  - `h-YYYY-MM-DD`: günün geri dönüş noktası; bir hafta saklanır.
- **Resim ve sesler:** Storage'da `media` kovası, `<kişi kimliği>/m-….json`.
- **Panelde görmek için görünümler** (Table Editor → solda "Views" ya da SQL Editor):
  - `people`: kişi, e-posta, onay, kelime ve cevap sayısı, son eşitleme.
  - `words`: kim, hangi dil, kelime, anlam, liste.
  - `answers`: her cevap; doğru/yanlış, tür, zaman.
  - `word_lists`.

  Görünümler salt okunurdur; düzenleme uygulamadan yapılır (bir sonraki eşitleme paneldeki elle düzenlemeyi ezer).
- **Geçiş kendiliğinden:** Supabase ile girişli bir cihaz, `sync_parts` tablosu varsa ve kişinin henüz verisi yoksa ilk eşitlemede şunları yapar (`src/ui/account/syncTarget.ts`, `syncData.ts`):
  1. Eski depodan son hâli çeker (diğer cihazların son değişiklikleri).
  2. Hepsini Supabase'e yükler.
  3. Eski depodaki çekirdeğe `movedTo: 'supabase'` yazar.

  Hâlâ eski yolla girişli bir cihaz eşitlemeye kalkınca durur ve "çıkış yapıp e-posta ya da Google ile gir" der (`SyncMovedError`). Tablo yoksa (SQL çalıştırılmadıysa) her şey eskisi gibi Blob'la sürer.
- **Onay:** veritabanı yalnızca `profiles.approved` olan kişiye yazdırır. Yönetici kartından verilen onay, `SYNC_ALLOWED` ve `ADMIN_TOKEN` yokken herkesin onaylı sayılması profile kendiliğinden yansır:
  - girişte (`/api/access?vault=1`),
  - bağlarken,
  - Yönetici kartında onayla/reddet anında.
- **Hesap silme:** kişiyi siler; `sync_parts` satırları zincirleme gider, `media` dosyaları da silinir.

### Sahibinin yapacağı (canlıda henüz yapılmadı, 2026-11-09)
Canlı projede `0002` hiç çalışmadı ama `0005` çalıştı. **Sıra önemli:** `0002` kişi başı sınırları olmayan `put_sync_part` işlevini ve medya izinlerini kurar; `0005` çalıştığında da `media` kovası henüz yoktu. Bu yüzden:

1. **Supabase → SQL Editor:** `supabase/migrations/0002_sync_data.sql` içeriğini yapıştır, **Run**.
2. Hemen ardından **`supabase/migrations/0005_storage_limits.sql`'i yeniden** yapıştır, **Run** (sınırlar ve kova sınırı geri gelir).
3. **Kontrol sorgusu** (SQL Editor; üç sütun da `true` olmalı):
   ```sql
   select to_regclass('public.sync_parts') is not null as tablo_var,
     (select prosrc like '%5000%' from pg_proc where proname = 'put_sync_part') as sinirlar_var,
     (select file_size_limit = 6000000 from storage.buckets where id = 'media') as kova_siniri_var;
   ```
4. **Uygulamada:** bir cihazda sayfayı yenile ve birkaç saniye bekle (eşitleme kendiliğinden çalışır; ilk Supabase eşitlemesi eski depodan son hâli çekip hepsini yükler). Sonra Table Editor → `sync_parts`'ta satırları, Views altında `people` ve `words`'ü gör. Yönetim → Sayılar'da "son 7/30 günde etkin" satırları da görünmeye başlar (#721).
5. Diğer cihazlar Supabase ile girişli olduğundan (giriş zorunlu) ilk eşitlemelerinde kendiliğinden Supabase'e geçer; cihazdaki değişiklikler birleşir.

Bu sıra `src/data/supabaseMigrations.test.ts` ile denetlenir (göçler PGlite'ta, Supabase'in `auth`/`storage` şemalarının küçük bir taklidiyle çalıştırılır; "yalnız 0002" sınırları siler, "0002 + 0005" doğru sonucu verir). Yeni bir göç eklenince test onu da çalıştırır.

## 2b. aşama: arkadaşlar, paylaşılan listeler, hatırlatmalar

Sunucunun eşitleme dışında tuttuğu üç şey de tablolara geçebilir (`supabase/migrations/0003_server_tables.sql`):
- `friend_cards` (hesap başına bir kart, arkadaş kodu benzersiz), `friend_follows` (kim kimi takip ediyor);
- `shared_lists` (bağlantıyla paylaşılan listeler; `published` = topluluk kütüphanesinde, `version` = ortak listenin ETag'i);
- `reminders` (tarayıcı bildirimi aboneliği `push`, mail adresi `mail`; cihazın bildirdiği her şey `record` jsonb'de);
- `server_flags` (`tables` satırı = taşındı).

Hepsinde RLS açık ve hiç politika yok: uygulamanın açık anahtarı bu tabloları göremez, yalnızca sunucu (gizli anahtar) okur/yazar. Panel için görünümler: `friend_overview`, `shared_overview`, `reminder_overview`.

**Nasıl geçer (2026-11-09'dan beri adım adım):** üç durum, `server_flags`ta (`api/_tables.ts` `tablesMode`, 15 sn önbellek):
- **R2** (işaret yok): her şey eskisi gibi R2 dosyalarında.
- **Taşınıyor** (`tables-moving`, başlangıç zamanıyla): yazmalar tablolara gider; okumalar önce tablodan, yoksa eski dosyadan; listeler (hatırlatmalar, takipler, kütüphane) ikisinin birleşimi; silme iki yerden. R2'de kalmış bir ortak liste ilk değişikliğinde tabloya geçer (eski dosyanın etiketi bir kez kabul edilir, sonra `"v1"`).
- **Tablolar** (`tables`): eski dosyalar artık okunmaz (silinmez).

Yönetim → Sistem → **Taşımayı başlat** (`POST /api/admin {action:'move-tables', from}`, `api/_moveTables.ts` `moveTablesStep`): ilk adım yalnızca "taşınıyor" işaretini yazar ve `SETTLE_MS` (30 sn) bekletir: öbür sunucu örnekleri eski cevabı 15 sn'ye dek tutar, o arada biri dosyaya yazıp kopyayı eskitmesin. Sonraki her adım bir türün bir sayfasını (en çok `MOVE_STEP` = 15 dosya; ücretsiz planda istek başına 50 alt istek) kopyalar: kartlar, takipler (hesap başına tek toplu ekleme), listeler (kütüphane bilgisiyle), hatırlatmalar. Tabloda zaten olan satırın üzerine yazılmaz (o, taşıma başladıktan sonra yazılmıştır, yenidir). Son sayfadan sonra `tables` işareti. Ekran adımları `next` bitene dek sırayla çağırır; yarıda kalırsa "Taşımayı sürdür" kaldığı yerden devam eder, hiçbir şey çift yazılmaz ya da kaybolmaz. (Eskiden tek seferde koşuyordu: önce işareti yazıp sonra kopyaladığı için alt istek sınırına takılınca kopyalanmamış kayıtlar görünmez kalırdı.)

Hesap silme iki yerdeki kaydı da siler (`tablesInUse`). Sunucu kodu: `api/_friendStore.ts` (`blobFriends`, `movingFriends`, `tableFriends`), `api/share.ts` (`blobShares`, `movingShares`, `tableShares`), `api/_reminders.ts` (`blobReminders`, `movingReminders`, `tableReminders`). Testler `src/data/apiTables.test.ts` (sahte PostgREST; yarıda kalan taşıma, bekleme ve sayfalama dahil).

### Sahibinin yapacağı
1. `0003_server_tables.sql` canlıda çalışmış durumda (`server_flags` var). Değilse önce onu çalıştır.
2. **Uygulamada:** Ayarlar → Hesap → Yönetim → Sistem → **Taşımayı başlat**. Önce 30 sn bekler, sonra sayıyı göstererek ilerler; bitince "Taşındı" yazar.
3. **Denetle:** Table Editor → `friend_cards`, `shared_lists`, `reminders`; Views → `friend_overview`, `reminder_overview`.

### Arkadaş gelen kutusu (0004)
`supabase/migrations/0004_friend_inbox.sql` gelen kutusunu (tebrik, dürtme, hediye kelime, metin, katıldı, arkadaşlık isteği) tabloya taşır: `friend_inbox`, ileti başına bir satır (alıcı `sync_id`, tür, gönderenin kodu ve adı, hediye/metin jsonb, `at`); RLS açık, politika yok. **Geçiş düğmesi yok: SQL'i çalıştırmak geçiştir**, çünkü dosyanın son satırı `server_flags`a `inbox` işaretini yazar (`api/_tables.ts` `inboxTableOn`, 15 sn önbellek). Tablo ya da işaret yoksa sunucu Blob'u kullanmaya devam eder (güvenli geri düşüş). Blob'da bekleyen ileti kaybolmaz: kişinin gelen kutusu okunurken Blob dosyasıyla birleştirilir, ilk değişiklikte tabloya yazılır ve dosya silinir (örnek başına 10 dk "Blob'da yok" önbelleği). Satır başına yazma olduğundan iki gönderen birbirini ezmez (Blob'da `If-Match` ile yeniden deniyordu). 30 günden eski satırlar okunmaz, sonraki değişiklikte silinir; hesap silme satırları da siler. Testler `src/data/apiInboxTable.test.ts`.

**Sahibinin yapacağı:** SQL Editor'de `0004_friend_inbox.sql`'i bir kez çalıştırmak (0003'ten sonra).

Hâlâ Blob'da kalanlar: hesap onay işaretleri (`access/…`, Supabase'de `profiles.approved` ile yansıtılıyor) ve eski eşitleme dosyaları (`sync/…`, Supabase'e geçmiş hesaplar için yalnızca `movedTo` işareti).

---

## Güvenlik duman testi (13.5)

Supabase RLS (Satır Düzeyi Güvenlik) ve izin kurallarının doğru çalıştığını, gizli tabloların açık anahtarla sızmadığını ve kullanıcıların yalnızca kendi verilerini okuyup yazabildiğini sahibinin kendi makinesinde doğrulaması için `scripts/smoke-supabase.mjs` betiği hazırlanmıştır.

> [!IMPORTANT]
> **Güvenlik Kuralı:** Duman testi **YALNIZCA** açık (publishable/anon) anahtarla çalışır. Gizli anahtar (`service_role` / `secret key`) kesinlikle girilmemeli ve dosyalara yazılmamalıdır. Ortamda gizli anahtar algılansa dahi betik bunu otomatik olarak yoksayar.

### Denetlenen 6 Madde

1. **Giriş yapılabilmesi:** Deneme hesabıyla e-posta + şifre girişi yapılır, JWT ve kullanıcı kimliği doğrulanır.
2. **`put_sync_part` onaysız hesap denetimi:** Hesap `profiles.approved = false` ise veritabanı fonksiyonu `42501` (`approval required`) hatası döner.
3. **Onaylı hesapla yazma/okuma:** Hesap onaylıysa `core` senkronizasyon verisi başarıyla yazılır ve `sync_parts` tablosundan birebir geri okunur.
4. **Başkalarının verilerini okuyamama (RLS):** Başka bir kullanıcı kimliğine ait `sync_parts` satırları sorgulandığında RLS devreye girer ve boş dizi (`[]`) döner (veri sızıntısı engellenir).
5. **Sunucu tablolarının tam izolasyonu:** `friend_cards`, `shared_lists`, `reminders`, `server_flags`, `sync_keys` tablolarında RLS açık ve genel politika olmadığından açık anahtarla **hiçbir satır** okunamaz (hata veya 0 satır).
6. **Depolama (Storage) kova güvenliği:** `media` kovasında başka bir kullanıcının klasörü listelenemez ve dosyası indirilemez.

### Nasıl Çalıştırılır?

Sahibinin terminalinde ayrı bir deneme hesabı e-postası ve şifresiyle çalıştırılır:

```bash
SUPABASE_URL="https://<proje-kimliği>.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..." \
SMOKE_EMAIL="deneme@alanadi.com" \
SMOKE_PASSWORD="denemesifresi" \
node scripts/smoke-supabase.mjs
```

Her madde için konsolda `[✅ GEÇTİ]` veya `[❌ KALDI]` şeklinde detaylı sonuç raporlanır.

**Yerel Sahte Sunucu ile Mantık Doğrulaması:**
Geliştirme ortamında veya internet erişimi kısıtlıyken betiğin söz dizimini ve denetim mantığını sahte PostgREST/Storage sunucusuyla doğrulamak için:

```bash
node scripts/smoke-supabase.mjs --mock
```

### Depolama sınırları (0005)
`supabase/migrations/0005_storage_limits.sql` kişi başına sınır koyar: eşitleme verisi 100 MB (geri dönüş noktaları hariç) ve en çok 5000 okuma metni; medya dosyası en çok 6 MB, yalnız JSON, kişi başı 3000 dosya / 200 MB. Kayıt açık ve yeni hesap onaylı sayıldığı için tek bir hesabın veritabanını (ücretsiz planda 500 MB) doldurmasını önler. **Sahibinin yapacağı:** SQL Editor'de bir kez çalıştırmak (0002'den sonra). Sınırı aşan eşitleme uygulamada "veri çok büyük" uyarısıyla durur; sayıları değiştirip dosyayı yeniden çalıştırmak yeterli.

### Kota iadesi, medya güncelleme sınırı, kullanıcı adı (0013, 2026-11-10)
`supabase/migrations/0013_quota_media_limits.sql` (güvenlik incelemesi 2026-11-10): (1) `counter_give`: sunucu YZ çağrısının tahmini tutarını (çeviri ve sesli okumanın karakterini) çağrıdan **önce** `counter_take` ile ayırır, sonra kullanılmayanı bununla geri verir; çalışmadan önce geri verme yapılmaz (hesabın o gün biraz daha az hakkı kalır, fazlası değil). (2) Medya: güncelleme politikası (var olan dosyanın `upsert` ile yeniden yüklenmesi) eklemeyle aynı 200 MB sınırına bakar (önce küçük dosya ekleyip her birini 6 MB'a güncellemek sınırı aşıyordu); kişi kendi dosyalarını silebilir. (3) Kayıt tetikleyicisi kullanıcı adını 40 karaktere keser. **Sahibinin yapacağı:** SQL Editor'de bir kez çalıştırmak (0012'den sonra). 0005 de aynı medya politikalarını taşır: 0002'den sonra 0005'i yeniden çalıştırmak sınırı geri almaz (`supabaseMigrations.test.ts`).

### Tek kullanımlık e-postalar (0006)
`supabase/migrations/0006_disposable_emails.sql` (üretilen dosya: `node scripts/build-disposable-sql.mjs`, kaynak `supabase/disposable/domains.txt`, ~9.900 alan adı, [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains), CC0) `blocked_email_domains` tablosunu ve `hook_before_user_created` işlevini kurar; son sorgu bu adreslerle açılmış hesapları listeler. **Sahibinin yapacağı:** (1) SQL Editor'de dosyayı bir kez çalıştırmak, (2) Authentication → Auth Hooks → Add hook → **Before User Created** → Postgres → `public.hook_before_user_created`. Sonra e-posta, bağlantı ve Google ile kayıtta alan adı (ya da alt alan adı) listedeyse kayıt reddedilir; uygulama "Tek kullanımlık (geçici) e-posta adresleriyle hesap açılamıyor" der (`authErrorText`, `disposable_email`). Tek alan adı eklemek: `insert into public.blocked_email_domains (domain) values ('ornek.com') on conflict do nothing;`. Listeyi yenilemek: `domains.txt`i güncelle, betiği çalıştır, dosyayı yeniden çalıştır (var olanlar atlanır). Yerel Postgres 16'da denendi (alt alan adı, büyük harf, `supabase_auth_admin` rolüyle okuma).

### Turnstile (robot kontrolü)
Derlemede `VITE_TURNSTILE_SITE_KEY` varsa giriş formu (giriş, kayıt, bağlantı, şifre yenileme, onay mailini yeniden gönderme) Cloudflare Turnstile kutusunu gösterir (`src/ui/account/Turnstile.tsx`) ve jetonu Supabase çağrısına `captchaToken` olarak ekler; jeton tek kullanımlık, her denemeden sonra kutu yenilenir. Google girişi jeton istemez. Anahtar yoksa hiçbir şey görünmez. CSP `script-src` ve `frame-src` `https://challenges.cloudflare.com`a izin verir. **Açma sırası (yoksa kimse giriş yapamaz):** (1) Cloudflare → Turnstile → Add widget (alan adı `diloloji.com`, mod Managed) → site anahtarı ve gizli anahtar; (2) Workers → diloloji → Settings → Builds → Build variables: `VITE_TURNSTILE_SITE_KEY` = site anahtarı (Diloloji: `0x4AAAAAAFhgkKwu5cL9VZED`, açık bir değer), yeniden derle ve canlıda kutunun göründüğünü gör; (3) ancak sonra Supabase → Authentication → Attack Protection → Enable CAPTCHA protection → sağlayıcı **Turnstile** → gizli anahtar → Save. Geri almak: önce Supabase'te kapat, sonra değişkeni sil.

