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

## 2. aşama (sonra)

- Kelimeler, cevaplar, listeler ve ayarlar Supabase tablolarına taşınacak (satır güvenliğiyle yalnızca sahibine açık).
- Arkadaşlar, paylaşılan listeler ve mail hatırlatmaları Blob JSON dosyalarından tablolara geçecek.
- Eşitleme parçaları yerine satır satır eşitleme yapılacak.
