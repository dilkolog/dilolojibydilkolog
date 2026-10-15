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

## 2b. aşama (sonra)

Arkadaşlar, paylaşılan listeler ve mail hatırlatmaları hâlâ Vercel Blob'da (JSON dosyaları). Bunlar da tablolara taşınabilir:
- `friend_cards`, `friend_follows`;
- `shared_lists`;
- `mail_reminders`.

Taşınınca panelden görülür ve sunucu uçları REST ile okuyup yazar.
