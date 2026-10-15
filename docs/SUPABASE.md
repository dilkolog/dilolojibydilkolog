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
   - Site URL: `https://nigalingo.online`
   - Redirect URLs:
     - `https://nigalingo.online/**`
     - `https://kelime-koc.vercel.app/**`
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
      - App domain / Application home page: `https://nigalingo.online`.
      - Authorized domains: `nigalingo.online` ve `supabase.co`.
      - **Logo yükleme**: logo Google'ın uygulama incelemesini başlatır ve günler sürebilir. Şimdilik boş bırak.
   4. **Audience → Publish app** ("In production"). Yalnızca e-posta/profil istendiği için Google incelemesi gerekmez; yayınlanmazsa yalnızca "test kullanıcıları" girebilir.
   5. **Clients → Create client** → Application type **Web application**, ad `Diloloji web`:
      - Authorized JavaScript origins: `https://nigalingo.online`, `https://kelime-koc.vercel.app`
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
   - Gönderici adresi doğrulanmış alan adından olmalı (`giris@nigalingo.online`); `onboarding@resend.dev` yalnızca Resend hesabının kendi adresine teslim eder.
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
- **Geçiş kendiliğinden:** Supabase ile girişli bir cihaz, `sync_parts` tablosu varsa ve kişinin henüz verisi yoksa ilk eşitlemede şunları yapar (`src/ui/syncTarget.ts`, `syncData.ts`):
  1. Eski depodan son hâli çeker (diğer cihazların son değişiklikleri).
  2. Hepsini Supabase'e yükler.
  3. Eski depodaki çekirdeğe `movedTo: 'supabase'` yazar.

  Hâlâ eski yolla girişli bir cihaz eşitlemeye kalkınca durur ve "çıkış yapıp e-posta ya da Google ile gir" der (`SyncMovedError`). Tablo yoksa (SQL çalıştırılmadıysa) her şey eskisi gibi Blob'la sürer.
- **Onay:** veritabanı yalnızca `profiles.approved` olan kişiye yazdırır. Yönetici kartından verilen onay, `SYNC_ALLOWED` ve `ADMIN_TOKEN` yokken herkesin onaylı sayılması profile kendiliğinden yansır:
  - girişte (`/api/access?vault=1`),
  - bağlarken,
  - Yönetici kartında onayla/reddet anında.
- **Hesap silme:** kişiyi siler; `sync_parts` satırları zincirleme gider, `media` dosyaları da silinir.

### Sahibinin yapacağı
1. **Supabase → SQL Editor:** `supabase/migrations/0002_sync_data.sql` içeriğini yapıştır, Run. Tablo, işlev, kova ve görünümler kurulur.
2. **Denemek için:** uygulamada Ayarlar → Hesap → **Şimdi eşitle**. Sonra Supabase → Table Editor → `sync_parts`'ta satırları, Views altında `people` ve `words`'ü gör.
3. Diğer cihazlarda da Supabase ile (e-posta ya da Google) bir kez giriş yap. Eski yolla girişli kalan cihaz eşitlemeyi durdurur ve bunu söyler.

## 2b. aşama: arkadaşlar, paylaşılan listeler, hatırlatmalar

Sunucunun eşitleme dışında tuttuğu üç şey de tablolara geçebilir (`supabase/migrations/0003_server_tables.sql`):
- `friend_cards` (hesap başına bir kart, arkadaş kodu benzersiz), `friend_follows` (kim kimi takip ediyor);
- `shared_lists` (bağlantıyla paylaşılan listeler; `published` = topluluk kütüphanesinde, `version` = ortak listenin ETag'i);
- `reminders` (tarayıcı bildirimi aboneliği `push`, mail adresi `mail`; cihazın bildirdiği her şey `record` jsonb'de);
- `server_flags` (`tables` satırı = taşındı).

Hepsinde RLS açık ve hiç politika yok: uygulamanın açık anahtarı bu tabloları göremez, yalnızca sunucu (gizli anahtar) okur/yazar. Panel için görünümler: `friend_overview`, `shared_overview`, `reminder_overview`.

**Nasıl geçer:** sunucu, `server_flags`ta `tables` satırı olana kadar her şeyi eskisi gibi Blob'da tutar (`api/_tables.ts` `tablesOn`, 15 sn önbellek). Yönetici kartındaki **Supabase'e taşı** düğmesi (`POST /api/admin {action:'move-tables'}`, `api/_moveTables.ts`):
1. önce işareti yazar (bundan sonraki her yazma tablolara gider; diğer sunucu örnekleri en geç 15 sn içinde geçer),
2. sonra Blob'daki kartları, takipleri, listeleri (kütüphane bilgisiyle) ve hatırlatmaları kopyalar; tabloda zaten olan satırın üzerine yazmaz.

Yeniden çalıştırmak güvenlidir (yarım kalanı tamamlar). Blob dosyaları silinmez ama artık okunmaz. Taşımadan önce açık kalmış bir ortak listenin eski etiketi (`If-Match`) reddedilir (412); uygulama yeniden okuyup birleştirir. Hesap silme her iki yerdeki kaydı da siler. Sunucu kodu: `api/_friends.ts` `FriendStore`, `api/share.ts` `ShareStore`, `api/_reminders.ts` `ReminderStore` (her biri Blob ve tablo uygulamasıyla). Testler `src/data/apiTables.test.ts` (sahte PostgREST).

### Sahibinin yapacağı
1. **Supabase → SQL Editor:** `supabase/migrations/0003_server_tables.sql` içeriğini yapıştır, Run.
2. **Uygulamada:** Ayarlar → Hesap → Yönetici → anahtarla Listele → "Sunucu verileri" altında **Supabase'e taşı**. Sonuç satırı kaç kart, takip, liste ve hatırlatmanın tablolarda olduğunu söyler.
3. **Denetle:** Table Editor → `friend_cards`, `shared_lists`, `reminders`; Views → `friend_overview`, `reminder_overview`.

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
