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
5. **Authentication → Emails → SMTP Settings** (önerilir; Supabase'in kendi göndericisi saatte birkaç mail ile sınırlı):
   - Host `smtp.resend.com`, Port `465`
   - Username `resend`, Password = Resend API anahtarı
   - Sender: `hatirlatma@<doğrulanmış alan adın>`
   - İstersen e-posta şablonlarını Türkçeleştir.
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
