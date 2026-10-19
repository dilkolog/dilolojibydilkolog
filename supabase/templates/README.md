# Supabase e-posta şablonları (Türkçe)

Supabase → **Authentication → Emails → Templates**. Her sekmede **Subject** alanına aşağıdaki konuyu, **Body** (Source/HTML) alanına dosyanın içeriğini yapıştır, **Save**.

| Supabase sekmesi | Konu (Subject) | Dosya |
| --- | --- | --- |
| Confirm signup | Diloloji hesabını onayla | `confirm-signup.html` |
| Invite user | Diloloji'ye davet edildin | `invite.html` |
| Magic Link | Diloloji giriş bağlantın | `magic-link.html` |
| Change Email Address | Diloloji: yeni e-posta adresini onayla | `change-email.html` |
| Reset Password | Diloloji şifreni yenile | `reset-password.html` |
| Reauthentication | Diloloji doğrulama kodun | `reauthentication.html` |

## Güvenlik bildirimleri

Supabase → **Authentication → Emails** sayfasının "Security" (güvenlik bildirimleri) bölümü. Her birini önce **açık** (Enabled) yap, sonra konuyu ve gövdeyi yapıştır. Bunlar hesapta bir değişiklik olunca kişiye haber verir; bağlantı ya da düğme taşımaz.

| Supabase'teki ad | Konu (Subject) | Dosya |
| --- | --- | --- |
| Password changed | Diloloji şifren değişti | `password-changed.html` |
| Email address changed | Diloloji hesabının e-postası değişti | `email-changed.html` |
| Phone number changed | Diloloji hesabının telefon numarası değişti | `phone-changed.html` |
| Identity linked | Diloloji hesabına yeni bir giriş yolu eklendi | `identity-linked.html` |
| Identity unlinked | Diloloji hesabından bir giriş yolu kaldırıldı | `identity-unlinked.html` |
| Multi-factor authentication method added | Diloloji hesabına iki adımlı doğrulama eklendi | `mfa-enrolled.html` |
| Multi-factor authentication method removed | Diloloji hesabından iki adımlı doğrulama kaldırıldı | `mfa-unenrolled.html` |

Telefon ve iki adımlı doğrulama Diloloji'de kullanılmıyor; şablonları yine de hazır, açman şart değil. Önerilen: **Password changed**, **Email address changed**, **Identity linked**, **Identity unlinked** açık olsun.

Notlar:
- `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Provider }}`, `{{ .FactorType }}`, `{{ .Token }}` Supabase'in kendi değişkenleri; olduğu gibi kalmalı.
- **Bu dosyalar elle yazılmaz, üretilir.** Kaynak `api/_mailTemplates.ts` (metinler) ve `api/_mailLayout.ts` (görünüm; uygulamanın hatırlatma mailleri de aynısını kullanır). Değiştirdikten sonra `WRITE_MAIL_TEMPLATES=1 npx vitest run src/data/mailTemplates.test.ts` dosyaları yeniden yazar; test, dosyalar kaynaktan farklıysa düşer.
- Tasarım `DESIGN.md`'yi izler: slate-100 zemin, beyaz kart, üstte üç dil renginin ince şeridi, dokunsal düğme (koyu alt kenar), logonun çivit rengi, Monki. Koyu tema `prefers-color-scheme` ile (Apple Mail, Outlook.com); Gmail renkleri kendi yöntemiyle çevirir.
- **Resimler `diloloji.com/mail/` altından gelir** (`public/mail/logo.png`, `monki-wave|cheer|think.png`; küçük PNG, çünkü Outlook WebP açmaz). Bunlar siteyle birlikte dağıtılır: şablonları Supabase'e yapıştırmadan önce site dağıtılmış olmalı. Resim engellenirse mail yine okunur (ad metin).
- Uzun doğrulama adresi mailde yazılmaz; düğmenin altında "Bağlantıyı tarayıcında aç" kısa bağlantısı olarak durur (adres yalnızca `href`te).
- Konu satırlarında emoji ve büyük harf yok (spam filtreleri sever).
- GitHub'da dosyayı açıp **Raw**'a basarsan içeriği kolayca kopyalarsın.
